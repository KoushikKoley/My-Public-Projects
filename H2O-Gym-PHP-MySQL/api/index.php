<?php
/* ============================================================
   H2O SINGUR FITNESS GYM - REST API (MySQL backend)
   ============================================================
   Single entry point used by the frontend (app.js).

   Endpoints (use ?action=...):
     GET  ?action=ping            - connectivity check
     POST ?action=login           - {username,password,role}
     GET  ?action=session         - current logged-in user
     POST ?action=logout
     GET  ?action=bootstrap       - ALL data for app boot (auth required)
     POST ?action=sync            - {entity, upserts[], deletes[], full[]}
     POST ?action=save_config     - {config:{...}}
     POST ?action=save_backup     - {jsId,name,type,size,date,data?}
     POST ?action=delete_backup   - {id}
     POST ?action=restore         - {data:{clients:...}, config:{...}}
     GET  ?action=users           - list users (admin)
     POST ?action=users_save      - create/update user (admin)
     POST ?action=users_delete    - {id} (admin)
     POST ?action=change_password - {current,new}
   ============================================================ */

require_once __DIR__ . '/../config.php';

/* ============================================================
   OUTPUT HELPERS
   ============================================================ */
function out($payload)
{
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function ok($data = [])
{
    out(array_merge(['ok' => true], $data));
}

function fail($message, $code = 400, $error = 'bad_request')
{
    http_response_code($code);
    out(['ok' => false, 'error' => $error, 'message' => $message]);
}

function body()
{
    static $in = null;
    if ($in === null) {
        $raw = file_get_contents('php://input');
        $in = json_decode($raw, true);
        if (!is_array($in)) $in = [];
    }
    return $in;
}

function requireLogin()
{
    if (empty($_SESSION['user'])) {
        fail('Not logged in.', 401, 'unauthorized');
    }
    return $_SESSION['user'];
}

function requireAdmin()
{
    $u = requireLogin();
    if (($u['role'] ?? '') !== 'admin') {
        fail('Admin access required.', 403, 'forbidden');
    }
    return $u;
}

/* ============================================================
   ENTITY REGISTRY
   Maps frontend collection names to MySQL tables.
   - 'cols'   : JS field => DB column (exact typed columns)
   - 'json'   : JS fields stored as JSON (decoded on read)
   - 'num'    : fields cast back to numbers on read (int)
   - 'float'  : fields cast back to floats on read
   - 'pk'     : primary key column (JS "id" by default)
   - 'ai'     : true when PK is AUTO_INCREMENT (server-assigned)
   ============================================================ */
function entities()
{
    return [
        'clients' => [
            'table' => 'clients',
            'pk' => 'id',
            'cols' => [
                'firstName' => 'firstName', 'lastName' => 'lastName', 'dob' => 'dob',
                'anniversary' => 'anniversary', 'gender' => 'gender', 'bloodGroup' => 'bloodGroup',
                'aadhaar' => 'aadhaar', 'occupation' => 'occupation', 'mobile' => 'mobile',
                'whatsapp' => 'whatsapp', 'email' => 'email', 'address' => 'address',
                'city' => 'city', 'state' => 'state', 'pincode' => 'pincode',
                'emergencyName' => 'emergencyName', 'emergencyPhone' => 'emergencyPhone',
                'goal' => 'goal', 'weight' => 'weight', 'height' => 'height',
                'disease' => 'disease', 'surgery' => 'surgery', 'medications' => 'medications',
                'plan' => 'plan', 'joinDate' => 'joinDate', 'renewalDate' => 'renewalDate',
                'fees' => 'fees', 'discount' => 'discount', 'paymentMode' => 'paymentMode',
                'notes' => 'notes', 'status' => 'status', 'photo' => 'photo',
                'createdAt' => 'createdAt', 'updatedAt' => 'updatedAt',
            ],
            'num' => ['fees', 'discount'],
        ],
        'enquiries' => [
            'table' => 'enquiries',
            'pk' => 'id',
            'cols' => [
                'name' => 'name', 'phone' => 'phone', 'email' => 'email', 'date' => 'date',
                'time' => 'time', 'interest' => 'interest', 'message' => 'message',
                'status' => 'status', 'createdAt' => 'createdAt',
            ],
        ],
        'invoices' => [
            'table' => 'invoices',
            'pk' => 'id',
            'cols' => [
                'number' => 'number', 'date' => 'date', 'color' => 'color',
                'gymName' => 'gymName', 'gymPhone' => 'gymPhone',
                'gymAddress' => 'gymAddress', 'gstNumber' => 'gstNumber',
            ],
            'json' => ['client' => 'clientJson', 'items' => 'itemsJson'],
            'num' => [],
            'float' => ['subtotal', 'discount', 'taxRate', 'taxAmount', 'total'],
        ],
        'templates' => [
            'table' => 'templates',
            'pk' => 'id',
            'cols' => [
                'name' => 'name', 'category' => 'category', 'content' => 'content',
            ],
        ],
        'trainers' => [
            'table' => 'trainers',
            'pk' => 'id',
            'cols' => [
                'firstName' => 'firstName', 'lastName' => 'lastName', 'mobile' => 'mobile',
                'email' => 'email', 'dob' => 'dob', 'specialization' => 'specialization',
                'certifications' => 'certifications', 'shiftStart' => 'shiftStart',
                'shiftEnd' => 'shiftEnd', 'photo' => 'photo',
                'createdAt' => 'createdAt', 'updatedAt' => 'updatedAt',
            ],
            'json' => ['assignedClients' => 'assignedClientsJson'],
            'num' => ['experience'],
            'float' => ['salary', 'rating'],
        ],
        'attendance' => [
            'table' => 'attendance',
            'pk' => 'id',
            'ai' => true,
            'cols' => [
                'clientId' => 'clientId', 'date' => 'date', 'status' => 'status',
                'checkIn' => 'checkIn', 'checkOut' => 'checkOut', 'timestamp' => 'timestamp',
            ],
        ],
        'dietPlans' => [
            'table' => 'diet_plans',
            'pk' => 'id',
            'cols' => [
                'name' => 'name', 'goal' => 'goal', 'description' => 'description',
                'meals' => 'meals', 'assignedTo' => 'assignedTo', 'createdAt' => 'createdAt',
            ],
            'num' => ['calories'],
        ],
        'exercisePlans' => [
            'table' => 'exercise_plans',
            'pk' => 'id',
            'cols' => [
                'name' => 'name', 'goal' => 'goal', 'description' => 'description',
                'workouts' => 'workouts', 'assignedTrainer' => 'assignedTrainer',
                'assignedTo' => 'assignedTo', 'createdAt' => 'createdAt',
            ],
            'num' => ['duration'],
        ],
        'classes' => [
            'table' => 'classes',
            'pk' => 'id',
            'cols' => [
                'name' => 'name', 'type' => 'type', 'trainerId' => 'trainerId',
                'date' => 'date', 'time' => 'time', 'createdAt' => 'createdAt',
            ],
            'json' => ['enrolled' => 'enrolledJson'],
            'num' => ['capacity', 'duration'],
            'float' => ['fee'],
        ],
        'expenses' => [
            'table' => 'expenses',
            'pk' => 'id',
            'cols' => [
                'date' => 'date', 'category' => 'category', 'description' => 'description',
                'vendor' => 'vendor', 'paymentMode' => 'paymentMode', 'createdAt' => 'createdAt',
            ],
            'float' => ['amount'],
        ],
        'bodyMeasurements' => [
            'table' => 'body_measurements',
            'pk' => 'id',
            'cols' => [
                'clientId' => 'clientId', 'date' => 'date',
            ],
            'float' => ['weight', 'bodyFat', 'muscle', 'chest', 'waist', 'hips', 'arms'],
        ],
        'feedback' => [
            'table' => 'feedback',
            'pk' => 'id',
            'cols' => ['clientId' => 'clientId', 'category' => 'category', 'comments' => 'comments', 'date' => 'date'],
            'num' => ['rating'],
        ],
        'referrals' => [
            'table' => 'referrals',
            'pk' => 'id',
            'cols' => ['referrerId' => 'referrerId', 'referredId' => 'referredId', 'date' => 'date'],
            'num' => ['pointsAwarded'],
        ],
        'loyaltyPoints' => [
            'table' => 'loyalty_points',
            'pk' => 'id',
            'cols' => ['clientId' => 'clientId', 'type' => 'type', 'reason' => 'reason', 'date' => 'date'],
            'num' => ['points'],
        ],
        'selfRegistrations' => [
            'table' => 'self_registrations',
            'pk' => 'id',
            'cols' => [
                'firstName' => 'firstName', 'lastName' => 'lastName', 'mobile' => 'mobile',
                'email' => 'email', 'goal' => 'goal', 'plan' => 'plan',
                'status' => 'status', 'date' => 'date',
            ],
        ],
        'freezes' => [
            'table' => 'freezes',
            'pk' => 'id',
            'cols' => [
                'clientId' => 'clientId', 'fromDate' => 'fromDate', 'toDate' => 'toDate',
                'reason' => 'reason', 'date' => 'date',
            ],
            'num' => ['days'],
        ],
        'campaigns' => [
            'table' => 'campaigns',
            'pk' => 'id',
            'cols' => [
                'name' => 'name', 'discount' => 'discount', 'valid' => 'valid',
                'message' => 'message', 'date' => 'date',
            ],
            'num' => ['sentTo'],
        ],
        'backups' => [
            'table' => 'backups',
            'pk' => 'id',
            'ai' => true,
            'cols' => [
                'jsId' => 'jsId', 'name' => 'name', 'type' => 'type',
                'size' => 'size', 'date' => 'date',
            ],
        ],
    ];
}

/* Convert a DB row into the JS-shaped object */
function rowToRecord(array $row, array $def): array
{
    $rec = [];
    // JSON columns first (decoded and merged)
    if (!empty($def['json'])) {
        foreach ($def['json'] as $jsField => $col) {
            if (array_key_exists($col, $row) && $row[$col] !== null && $row[$col] !== '') {
                $decoded = json_decode($row[$col], true);
                $rec[$jsField] = ($decoded === null && $row[$col] !== 'null') ? $row[$col] : $decoded;
            } else {
                $rec[$jsField] = $jsField === 'items' || $jsField === 'enrolled' || $jsField === 'assignedClients'
                    ? [] : null;
            }
        }
    }
    // Floats / ints
    foreach (($def['float'] ?? []) as $f) {
        if (isset($row[$f]) && $row[$f] !== null && $row[$f] !== '') {
            $rec[$f] = (float)$row[$f];
        }
    }
    foreach (($def['num'] ?? []) as $f) {
        if (isset($row[$f]) && $row[$f] !== null && $row[$f] !== '') {
            $rec[$f] = (int)$row[$f];
        }
    }
    // Everything else 1:1
    $skip = array_merge(
        array_values($def['json'] ?? []),
        $def['float'] ?? [],
        $def['num'] ?? []
    );
    foreach ($row as $col => $val) {
        if (in_array($col, $skip, true)) continue;
        $rec[$col] = $val;
    }
    return $rec;
}

/* Convert a JS record into DB columns for writing */
function recordToRow(array $rec, array $def): array
{
    $row = [];
    foreach (($def['cols'] ?? []) as $jsField => $col) {
        $row[$col] = array_key_exists($jsField, $rec) ? $rec[$jsField] : null;
    }
    foreach (($def['json'] ?? []) as $jsField => $col) {
        $val = array_key_exists($jsField, $rec) ? $rec[$jsField] : null;
        $row[$col] = ($val === null) ? null : json_encode($val, JSON_UNESCAPED_UNICODE);
    }
    foreach (($def['float'] ?? []) as $f) {
        $row[$f] = (array_key_exists($f, $rec) && $rec[$f] !== null && $rec[$f] !== '') ? (float)$rec[$f] : 0;
    }
    foreach (($def['num'] ?? []) as $f) {
        $row[$f] = (array_key_exists($f, $rec) && $rec[$f] !== null && $rec[$f] !== '') ? (int)$rec[$f] : 0;
    }
    return $row;
}

/* ============================================================
   SESSION BOOTSTRAP
   ============================================================ */
session_name(SESSION_NAME);
session_start();
$ACTION = $_GET['action'] ?? '';
$DB = db();

/* ============================================================
   ROUTER
   ============================================================ */
try {
    switch ($ACTION) {

        /* ---------- PUBLIC ---------- */
        case 'ping': {
            ok(['server' => 'h2o-gym-api', 'time' => date('c')]);
        }

        case 'login': {
            $in = body();
            $username = trim($in['username'] ?? '');
            $password = (string)($in['password'] ?? '');
            $role = ($in['role'] ?? 'admin') === 'staff' ? 'staff' : 'admin';
            if ($username === '' || $password === '') {
                fail('Please enter both username and password.');
            }
            $stmt = $DB->prepare('SELECT id, username, password, role, name, active FROM users WHERE username = ? LIMIT 1');
            $stmt->execute([$username]);
            $user = $stmt->fetch();
            if (!$user || !(int)$user['active']) {
                fail('Invalid username or password.', 401, 'invalid_credentials');
            }
            $stored = $user['password'];
            $valid = false;
            if (strlen($stored) > 3 && $stored[0] === '$') {
                // Proper bcrypt/argon2 hash
                $valid = password_verify($password, $stored);
            } else {
                // Plain-text fallback (e.g. password edited directly in
                // phpMyAdmin). Verify then auto-upgrade to a secure hash.
                if (hash_equals($stored, $password)) {
                    $valid = true;
                    $up = $DB->prepare('UPDATE users SET password = ? WHERE id = ?');
                    $up->execute([password_hash($password, PASSWORD_DEFAULT), $user['id']]);
                }
            }
            if (!$valid) {
                fail('Invalid username or password.', 401, 'invalid_credentials');
            }
            // Role check: admin tab needs admin; staff tab accepts staff/trainer
            if ($role === 'admin' && $user['role'] !== 'admin') {
                fail('This account is not an administrator.', 403, 'wrong_role');
            }
            if ($role === 'staff' && !in_array($user['role'], ['staff', 'trainer'], true)) {
                fail('This account is not a staff account.', 403, 'wrong_role');
            }
            session_regenerate_id(true);
            $_SESSION['user'] = [
                'id'       => (int)$user['id'],
                'username' => $user['username'],
                'role'     => $user['role'],
                'name'     => $user['name'] ?: $user['username'],
            ];
            ok(['user' => $_SESSION['user']]);
        }

        case 'session': {
            if (!empty($_SESSION['user'])) {
                ok(['user' => $_SESSION['user']]);
            }
            ok(['user' => null]);
        }

        case 'logout': {
            $_SESSION = [];
            if (ini_get('session.use_cookies')) {
                $p = session_get_cookie_params();
                setcookie(session_name(), '', time() - 42000, $p['path'], $p['domain'], $p['secure'], $p['httponly']);
            }
            session_destroy();
            ok();
        }

        /* ---------- PUBLIC SELF-REGISTRATION PORTAL ----------
           No login required: visitors from the shared portal link
           (?portal=selfregister) submit their details here.        */
        case 'public_selfreg': {
            $in = body();
            $rec = [
                'id'        => substr(preg_replace('/[^A-Za-z0-9_]/', '', $in['id'] ?? ('SR' . time())), 0, 24) ?: ('SR' . time()),
                'firstName' => trim($in['firstName'] ?? ''),
                'lastName'  => trim($in['lastName'] ?? ''),
                'mobile'    => trim($in['mobile'] ?? ''),
                'email'     => trim($in['email'] ?? ''),
                'goal'      => $in['goal'] ?? '',
                'plan'      => $in['plan'] ?? 'Monthly',
                'status'    => 'pending',
                'date'      => $in['date'] ?? date('c'),
            ];
            if ($rec['firstName'] === '' || $rec['mobile'] === '') {
                fail('Name and mobile number are required.');
            }
            $stmt = $DB->prepare(
                'INSERT INTO self_registrations (id, firstName, lastName, mobile, email, goal, plan, status, date)
                 VALUES (:id, :firstName, :lastName, :mobile, :email, :goal, :plan, :status, :date)
                 ON DUPLICATE KEY UPDATE firstName=VALUES(firstName), lastName=VALUES(lastName), mobile=VALUES(mobile)'
            );
            $stmt->execute($rec);
            ok(['id' => $rec['id']]);
        }

        /* ---------- AUTH REQUIRED ---------- */
        case 'bootstrap': {
            requireLogin();
            $data = [];
            foreach (entities() as $key => $def) {
                if ($key === 'backups') continue; // handled separately
                $rows = $DB->query('SELECT * FROM `' . $def['table'] . '`')->fetchAll();
                $data[$key] = array_map(function ($r) use ($def) {
                    return rowToRecord($r, $def);
                }, $rows);
            }
            // Config (single JSON row, key = 'app')
            $cfgRow = $DB->query("SELECT v FROM app_config WHERE k = 'app' LIMIT 1")->fetch();
            $config = $cfgRow ? json_decode($cfgRow['v'], true) : null;

            // Server backups (list only — never send the heavy payloads)
            $bDef = entities()['backups'];
            $rows = $DB->query('SELECT id, jsId, name, type, size, date FROM `' . $bDef['table'] . '` ORDER BY id DESC LIMIT 100')->fetchAll();
            $data['backups'] = array_map(function ($r) use ($bDef) {
                return rowToRecord($r, $bDef);
            }, $rows);

            ok([
                'user'    => $_SESSION['user'],
                'data'    => $data,
                'config'  => $config,
                'time'    => date('c'),
            ]);
        }

        case 'sync': {
            requireLogin();
            $in = body();
            $key = $in['entity'] ?? '';
            $defs = entities();
            if (!isset($defs[$key])) fail('Unknown entity: ' . htmlspecialchars($key));
            $def = $defs[$key];
            $table = $def['table'];
            $pk = $def['pk'] ?? 'id';
            $upserts = $in['upserts'] ?? [];
            $deletes = $in['deletes'] ?? [];
            $full    = array_key_exists('full', $in) ? $in['full'] : null;

            $pdo = $DB;
            $pdo->beginTransaction();
            try {
                // ---- FULL REPLACE (restore / id-less entities) ----
                if (is_array($full)) {
                    $pdo->exec("DELETE FROM `$table`");
                    $stmt = null;
                    foreach ($full as $rec) {
                        if (!is_array($rec)) continue;
                        $row = recordToRow($rec, $def);
                        if (empty($row)) continue;
                        $cols = array_keys($row);
                        $ph = array_map(function ($c) { return ":$c"; }, $cols);
                        if ($stmt === null) {
                            $sql = "INSERT INTO `$table` (`" . implode('`,`', $cols) . "`) VALUES (" . implode(',', $ph) . ")";
                            if (empty($def['ai'])) {
                                // String PK tables: upsert semantics so restores are idempotent
                                $updates = array_map(function ($c) { return "`$c`=VALUES(`$c`)"; }, $cols);
                                $sql .= " ON DUPLICATE KEY UPDATE " . implode(',', $updates);
                            }
                            $stmt = $pdo->prepare($sql);
                        }
                        foreach ($row as $c => $v) $row[$c] = ($v === null) ? null : $v;
                        $stmt->execute($row);
                    }
                    $pdo->commit();
                    ok(['entity' => $key, 'mode' => 'full', 'count' => count($full)]);
                }

                // ---- DIFF SYNC: deletes first, then upserts ----
                if (!empty($deletes)) {
                    $stmt = $pdo->prepare("DELETE FROM `$table` WHERE `$pk` = ?");
                    foreach ($deletes as $id) {
                        $stmt->execute([$id]);
                    }
                }
                foreach ($upserts as $rec) {
                    if (!is_array($rec)) continue;
                    $row = recordToRow($rec, $def);
                    if (empty($row)) continue;
                    // strip auto-increment PK if client did not assign one
                    if (!empty($def['ai']) && empty($row[$pk])) unset($row[$pk]);
                    $cols = array_keys($row);
                    $updates = array_map(function ($c) { return "`$c`=VALUES(`$c`)"; }, $cols);
                    $sql = "INSERT INTO `$table` (`" . implode('`,`', $cols) . "`) VALUES (:" . implode(', :', $cols) . ")
                            ON DUPLICATE KEY UPDATE " . implode(',', $updates);
                    $stmt = $pdo->prepare($sql);
                    $stmt->execute($row);
                }
                $pdo->commit();
                ok(['entity' => $key, 'upserts' => count($upserts), 'deletes' => count($deletes)]);
            } catch (Exception $ex) {
                if ($pdo->inTransaction()) $pdo->rollBack();
                throw $ex;
            }
        }

        case 'save_config': {
            requireLogin();
            $in = body();
            if (!isset($in['config']) || !is_array($in['config'])) fail('Missing config object.');
            $stmt = $DB->prepare("INSERT INTO app_config (k, v) VALUES ('app', :v) ON DUPLICATE KEY UPDATE v = :v2");
            $json = json_encode($in['config'], JSON_UNESCAPED_UNICODE);
            $stmt->execute([':v' => $json, ':v2' => $json]);
            ok();
        }

        case 'save_backup': {
            requireLogin();
            $in = body();
            $jsId = $in['jsId'] ?? ('bak_' . time());
            // Upsert by jsId
            $chk = $DB->prepare('SELECT id FROM backups WHERE jsId = ? LIMIT 1');
            $chk->execute([$jsId]);
            $existing = $chk->fetch();
            if ($existing && !empty($in['data'])) {
                $stmt = $DB->prepare('UPDATE backups SET name=?, type=?, size=?, date=?, dataJson=? WHERE id=?');
                $stmt->execute([
                    $in['name'] ?? 'Backup', $in['type'] ?? 'manual', $in['size'] ?? '',
                    $in['date'] ?? date('c'), json_encode($in['data'], JSON_UNESCAPED_UNICODE), $existing['id'],
                ]);
                ok(['id' => (int)$existing['id']]);
            }
            if ($existing) {
                ok(['id' => (int)$existing['id']]);
            }
            $stmt = $DB->prepare('INSERT INTO backups (jsId, name, type, size, date, dataJson) VALUES (?,?,?,?,?,?)');
            $stmt->execute([
                $jsId, $in['name'] ?? 'Backup', $in['type'] ?? 'manual', $in['size'] ?? '',
                $in['date'] ?? date('c'),
                !empty($in['data']) ? json_encode($in['data'], JSON_UNESCAPED_UNICODE) : null,
            ]);
            ok(['id' => (int)$DB->lastInsertId()]);
        }

        case 'get_backup': {
            requireLogin();
            $in = body();
            $id = (int)($in['id'] ?? 0);
            $stmt = $DB->prepare('SELECT * FROM backups WHERE id = ? LIMIT 1');
            $stmt->execute([$id]);
            $row = $stmt->fetch();
            if (!$row) fail('Backup not found.', 404);
            ok(['backup' => $row]);
        }

        case 'delete_backup': {
            requireLogin();
            $in = body();
            $id = (int)($in['id'] ?? 0);
            $stmt = $DB->prepare('DELETE FROM backups WHERE id = ?');
            $stmt->execute([$id]);
            ok();
        }

        case 'restore': {
            requireLogin();
            $in = body();
            if (empty($in['data']) || !is_array($in['data'])) fail('Missing data object.');
            $defs = entities();
            $restored = [];
            $DB->beginTransaction();
            try {
                foreach ($in['data'] as $key => $records) {
                    if (!isset($defs[$key]) || !is_array($records)) continue;
                    $def = $defs[$key];
                    $table = $def['table'];
                    $DB->exec("DELETE FROM `$table`");
                    $count = 0;
                    $stmt = null;
                    foreach ($records as $rec) {
                        if (!is_array($rec)) continue;
                        $row = recordToRow($rec, $def);
                        if (empty($row)) continue;
                        if (!empty($def['ai']) && empty($row[$def['pk']])) unset($row[$def['pk']]);
                        $cols = array_keys($row);
                        if ($stmt === null) {
                            $sql = "INSERT INTO `$table` (`" . implode('`,`', $cols) . "`) VALUES (:" . implode(', :', $cols) . ")";
                            if (empty($def['ai'])) {
                                $updates = array_map(function ($c) { return "`$c`=VALUES(`$c`)"; }, $cols);
                                $sql .= " ON DUPLICATE KEY UPDATE " . implode(',', $updates);
                            }
                            $stmt = $DB->prepare($sql);
                        }
                        $stmt->execute($row);
                        $count++;
                    }
                    $restored[$key] = $count;
                }
                if (!empty($in['config']) && is_array($in['config'])) {
                    $stmt = $DB->prepare("INSERT INTO app_config (k, v) VALUES ('app', :v) ON DUPLICATE KEY UPDATE v = :v2");
                    $json = json_encode($in['config'], JSON_UNESCAPED_UNICODE);
                    $stmt->execute([':v' => $json, ':v2' => $json]);
                }
                $DB->commit();
            } catch (Exception $ex) {
                if ($DB->inTransaction()) $DB->rollBack();
                throw $ex;
            }
            ok(['restored' => $restored]);
        }

        /* ---------- USER MANAGEMENT (ADMIN) ---------- */
        case 'users_list': {
            requireAdmin();
            $rows = $DB->query('SELECT id, username, role, name, active, created_at FROM users ORDER BY id')->fetchAll();
            ok(['users' => $rows]);
        }

        case 'users_save': {
            requireAdmin();
            $in = body();
            $username = trim($in['username'] ?? '');
            $role = in_array($in['role'] ?? '', ['admin', 'staff', 'trainer'], true) ? $in['role'] : 'staff';
            $name = trim($in['name'] ?? '') ?: $username;
            $active = !empty($in['active']) ? 1 : 0;
            $password = (string)($in['password'] ?? '');
            if ($username === '') fail('Username is required.');
            $id = (int)($in['id'] ?? 0);
            if ($id > 0) {
                // Update
                if ($password !== '') {
                    $stmt = $DB->prepare('UPDATE users SET username=?, role=?, name=?, active=?, password=? WHERE id=?');
                    $stmt->execute([$username, $role, $name, $active, password_hash($password, PASSWORD_DEFAULT), $id]);
                } else {
                    $stmt = $DB->prepare('UPDATE users SET username=?, role=?, name=?, active=? WHERE id=?');
                    $stmt->execute([$username, $role, $name, $active, $id]);
                }
                ok(['id' => $id]);
            }
            // Create
            if ($password === '') fail('Password is required for a new user.');
            $chk = $DB->prepare('SELECT id FROM users WHERE username = ?');
            $chk->execute([$username]);
            if ($chk->fetch()) fail('Username already exists.');
            $stmt = $DB->prepare('INSERT INTO users (username, password, role, name, active) VALUES (?,?,?,?,1)');
            $stmt->execute([$username, password_hash($password, PASSWORD_DEFAULT), $role, $name]);
            ok(['id' => (int)$DB->lastInsertId()]);
        }

        case 'users_delete': {
            $me = requireAdmin();
            $in = body();
            $id = (int)($in['id'] ?? 0);
            if ($id === (int)$me['id']) fail('You cannot delete your own account.');
            $stmt = $DB->prepare('DELETE FROM users WHERE id = ?');
            $stmt->execute([$id]);
            ok();
        }

        case 'change_password': {
            $me = requireLogin();
            $in = body();
            $current = (string)($in['current'] ?? '');
            $new = (string)($in['new'] ?? '');
            if (strlen($new) < 6) fail('New password must be at least 6 characters.');
            $stmt = $DB->prepare('SELECT password FROM users WHERE id = ?');
            $stmt->execute([$me['id']]);
            $row = $stmt->fetch();
            if (!$row || !password_verify($current, $row['password'])) {
                fail('Current password is incorrect.');
            }
            $stmt = $DB->prepare('UPDATE users SET password = ? WHERE id = ?');
            $stmt->execute([password_hash($new, PASSWORD_DEFAULT), $me['id']]);
            ok();
        }

        default:
            fail('Unknown action: ' . htmlspecialchars($ACTION), 404, 'unknown_action');
    }
} catch (Exception $ex) {
    http_response_code(500);
    out([
        'ok'      => false,
        'error'   => 'server_error',
        'message' => APP_DEBUG ? $ex->getMessage() : 'Server error. Check api logs / config.php.',
        'detail'  => APP_DEBUG ? $ex->getTraceAsString() : null,
    ]);
}
