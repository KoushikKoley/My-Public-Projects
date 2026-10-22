<?php
/* ============================================================
   H2O SINGUR FITNESS GYM - DATABASE CONFIGURATION
   ============================================================
   Edit these values to match your MySQL server (from your
   hosting provider or local XAMPP/WAMP installation).

   - Local XAMPP default user is "root" with NO password.
   - On live hosting (cPanel / Plesk), create a database +
     user in phpMyAdmin and fill in the details below.
   ============================================================ */

// ---- Database credentials ------------------------------------
define('DB_HOST', 'sql.freedb.tech');
define('DB_NAME', 'freedb_UZ7Sh8Nm');          // Database name
define('DB_USER', 'u_wHMVcQ');             // Database username
define('DB_PASS', 'WtSmzP9yWLW4');                 // Database password
define('DB_PORT', 3306);               // MySQL port (3306 default)

// ---- Application settings ------------------------------------
define('APP_NAME', 'H2O Singur Fitness Gym');
define('SESSION_NAME', 'h2o_gym_session');

// Set to true ONLY while debugging. Never leave on in production.
define('APP_DEBUG', false);

/* ============================================================
   DATABASE CONNECTION (PDO)
   ============================================================ */
function db(): PDO
{
    static $pdo = null;
    if ($pdo === null) {
        if (APP_DEBUG) {
            ini_set('display_errors', '1');
            error_reporting(E_ALL);
        } else {
            ini_set('display_errors', '0');
        }

        $dsn = 'mysql:host=' . DB_HOST . ';port=' . DB_PORT . ';dbname=' . DB_NAME . ';charset=utf8mb4';
        try {
            $pdo = new PDO($dsn, DB_USER, DB_PASS, [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
                PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci",
            ]);
        } catch (PDOException $e) {
            http_response_code(500);
            header('Content-Type: application/json');
            echo json_encode([
                'ok'      => false,
                'error'   => 'database_connect_failed',
                'message' => 'Could not connect to MySQL. Check config.php credentials and that the database "' . DB_NAME . '" exists (import database_schema.sql via phpMyAdmin).',
                'detail'  => APP_DEBUG ? $e->getMessage() : null,
            ]);
            exit;
        }
    }
    return $pdo;
}
