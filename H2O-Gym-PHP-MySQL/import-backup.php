<?php
/* ============================================================
   H2O GYM — ONE-CLICK JSON BACKUP IMPORTER
   ============================================================
   Open this file in the browser (http://your-site/import-backup.php)
   AFTER importing database_schema.sql, choose a backup JSON file
   (e.g. H2O_Singur_Backup_2026-08-26.json) and it will replace the
   MySQL data with the file contents.

   ⚠ DELETE THIS FILE from the server after importing (security).
   ============================================================ */
require_once __DIR__ . '/config.php';

$message = '';
$error = '';
$done = false;

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_FILES['backupfile'])) {
    $file = $_FILES['backupfile'];
    if ($file['error'] !== UPLOAD_ERR_OK) {
        $error = 'Upload failed (code ' . $file['error'] . '). File may be too large (check upload_max_filesize).';
    } else {
        $raw = file_get_contents($file['tmp_name']);
        $data = json_decode($raw, true);
        if (!is_array($data) || empty($data['clients'])) {
            $error = 'That file is not a valid H2O Singur backup JSON.';
        } else {
            try {
                $pdo = db();
                // Entity => table map (matches api/index.php)
                $map = [
                    'clients' => ['clients', 'id', false],
                    'enquiries' => ['enquiries', 'id', false],
                    'templates' => ['templates', 'id', false],
                    'trainers' => ['trainers', 'id', false],
                    'attendance' => ['attendance', 'id', true],
                    'dietPlans' => ['diet_plans', 'id', false],
                    'exercisePlans' => ['exercise_plans', 'id', false],
                    'classes' => ['classes', 'id', false],
                    'expenses' => ['expenses', 'id', false],
                    'bodyMeasurements' => ['body_measurements', 'id', false],
                    'feedback' => ['feedback', 'id', false],
                    'referrals' => ['referrals', 'id', false],
                    'loyaltyPoints' => ['loyalty_points', 'id', false],
                    'selfRegistrations' => ['self_registrations', 'id', false],
                    'freezes' => ['freezes', 'id', false],
                    'campaigns' => ['campaigns', 'id', false],
                ];
                // JSON sub-structures per table
                $jsonCols = [
                    'invoices' => ['client' => 'clientJson', 'items' => 'itemsJson'],
                    'trainers' => ['assignedClients' => 'assignedClientsJson'],
                    'classes' => ['enrolled' => 'enrolledJson'],
                ];
                $summary = [];
                $pdo->beginTransaction();
                foreach ($map as $entity => $conf) {
                    list($table, $pk, $isAI) = $conf;
                    if (empty($data[$entity]) || !is_array($data[$entity])) continue;
                    $pdo->exec("DELETE FROM `$table`");
                    $count = 0;
                    foreach ($data[$entity] as $rec) {
                        if (!is_array($rec)) continue;
                        $cols = [];
                        $params = [];
                        foreach ($rec as $k => $v) {
                            if ($isAI && $k === $pk) continue; // let MySQL assign
                            $cols[] = $k;
                            $params[":$k"] = $v;
                        }
                        // JSON columns
                        if (isset($jsonCols[$table])) {
                            foreach ($jsonCols[$table] as $jsField => $col) {
                                if (!in_array($col, $cols)) {
                                    $cols[] = $col;
                                    $params[":$col"] = isset($rec[$jsField]) ? json_encode($rec[$jsField], JSON_UNESCAPED_UNICODE) : null;
                                }
                            }
                        }
                        if (!$cols) continue;
                        $sql = "INSERT INTO `$table` (`" . implode('`,`', $cols) . "`) VALUES (:" . implode(', :', $cols) . ")";
                        if (!$isAI) {
                            $updates = [];
                            foreach ($cols as $c) {
                                if ($c !== $pk) $updates[] = "`$c`=VALUES(`$c`)";
                            }
                            if ($updates) {
                                $sql .= " ON DUPLICATE KEY UPDATE " . implode(',', $updates);
                            }
                        }
                        $stmt = $pdo->prepare($sql);
                        $stmt->execute($params);
                        $count++;
                    }
                    $summary[$entity] = $count;
                }
                // Invoices are NOT in the $map above because of their JSON
                // columns — handle them explicitly:
                if (!empty($data['invoices']) && is_array($data['invoices'])) {
                    $pdo->exec("DELETE FROM `invoices`");
                    $count = 0;
                    foreach ($data['invoices'] as $inv) {
                        if (!is_array($inv)) continue;
                        $sql = "INSERT INTO `invoices`
                            (id, number, date, color, gymName, gymPhone, gymAddress, gstNumber, clientJson, itemsJson, subtotal, discount, taxRate, taxAmount, total)
                            VALUES
                            (:id, :number, :date, :color, :gymName, :gymPhone, :gymAddress, :gstNumber, :clientJson, :itemsJson, :subtotal, :discount, :taxRate, :taxAmount, :total)";
                        $stmt = $pdo->prepare($sql);
                        $stmt->execute([
                            ':id' => $inv['id'] ?? ('INV' . time()),
                            ':number' => $inv['number'] ?? '',
                            ':date' => $inv['date'] ?? '',
                            ':color' => $inv['color'] ?? '#10b981',
                            ':gymName' => $inv['gymName'] ?? '',
                            ':gymPhone' => $inv['gymPhone'] ?? '',
                            ':gymAddress' => $inv['gymAddress'] ?? '',
                            ':gstNumber' => $inv['gstNumber'] ?? '',
                            ':clientJson' => json_encode($inv['client'] ?? null, JSON_UNESCAPED_UNICODE),
                            ':itemsJson' => json_encode($inv['items'] ?? [], JSON_UNESCAPED_UNICODE),
                            ':subtotal' => (float)($inv['subtotal'] ?? 0),
                            ':discount' => (float)($inv['discount'] ?? 0),
                            ':taxRate' => (float)($inv['taxRate'] ?? 0),
                            ':taxAmount' => (float)($inv['taxAmount'] ?? 0),
                            ':total' => (float)($inv['total'] ?? 0),
                        ]);
                        $count++;
                    }
                    $summary['invoices'] = $count;
                }
                // Config
                if (!empty($data['config']) && is_array($data['config'])) {
                    $stmt = $pdo->prepare("INSERT INTO app_config (k, v) VALUES ('app', :v) ON DUPLICATE KEY UPDATE v = :v2");
                    $json = json_encode($data['config'], JSON_UNESCAPED_UNICODE);
                    $stmt->execute([':v' => $json, ':v2' => $json]);
                    $summary['config'] = 1;
                }
                $pdo->commit();
                $done = true;
                $detail = [];
                foreach ($summary as $k => $v) $detail[] = "$k: $v";
                $message = 'Import successful! Rows imported → ' . implode(', ', $detail) . '. You can now open index.html and log in.';
            } catch (Exception $ex) {
                if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
                $error = 'Import failed: ' . $ex->getMessage();
            }
        }
    }
}
?>
<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>H2O Gym — Backup Importer</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #0f172a; color: #e2e8f0; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; }
    .card { background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 32px; max-width: 560px; width: 100%; }
    h1 { margin: 0 0 6px; font-size: 22px; } p { color: #94a3b8; font-size: 14px; line-height: 1.6; }
    input[type=file] { margin: 18px 0; color: #cbd5e1; } button { background: #10b981; color: #fff; border: 0; padding: 12px 22px; border-radius: 10px; font-size: 15px; font-weight: 600; cursor: pointer; }
    .msg { padding: 12px 16px; border-radius: 10px; margin-top: 16px; font-size: 14px; }
    .ok { background: rgba(16,185,129,.15); color: #6ee7b7; } .err { background: rgba(239,68,68,.15); color: #fca5a5; }
    code { background: #0f172a; padding: 2px 6px; border-radius: 6px; font-size: 12px; }
  </style>
</head>
<body>
  <div class="card">
    <h1>📦 H2O Gym — JSON Backup Importer</h1>
    <p>
      Replaces the MySQL data with the contents of a backup JSON file
      (e.g. <code>H2O_Singur_Backup_2026-08-26.json</code>).
      <br><strong>Make sure you already imported <code>database_schema.sql</code> via phpMyAdmin.</strong>
      <br>⚠ This overwrites current MySQL rows. Delete this file after use.
    </p>
    <form method="post" enctype="multipart/form-data">
      <input type="file" name="backupfile" accept=".json,application/json" required>
      <div><button type="submit">Import into MySQL</button></div>
    </form>
    <?php if ($message): ?><div class="msg ok"><?= htmlspecialchars($message) ?></div><?php endif; ?>
    <?php if ($error): ?><div class="msg err"><?= htmlspecialchars($error) ?></div><?php endif; ?>
    <p style="margin-top:22px;font-size:12px;">
      DB: <code><?= htmlspecialchars(DB_NAME) ?></code> @ <code><?= htmlspecialchars(DB_HOST) ?></code>
      — change credentials in <code>config.php</code>.
    </p>
  </div>
</body>
</html>
