<?php
require_once 'db.php';

// Dynamic Environment Loading
define('DB_TYPE', getenv('DB_TYPE') ?: 'memory'); // Default to stateless memory mode
define('DB_HOST', getenv('DB_HOST') ?: 'localhost');
define('DB_NAME', getenv('DB_NAME') ?: 'secure_apex');
define('DB_USER', getenv('DB_USER') ?: 'root');
define('DB_PASS', getenv('DB_PASS') ?: '');
define('DB_PORT', getenv('DB_PORT') ?: '3306');

// Statelessness: Ensure no local data storage
ini_set('session.save_handler', 'files');
ini_set('session.save_path', '/tmp'); // Use RAM-backed tmp directory

class DatabaseFactory {
    public static function create(): DBAdapter {
        switch (strtolower(DB_TYPE)) {
            case 'mariadb':
            case 'mysql':
            case 'rds':
                return new MariaDBAdapter(DB_HOST, DB_NAME, DB_USER, DB_PASS, DB_PORT);
            case 'postgres':
            case 'postgresql':
                return new PostgreSQLAdapter(DB_HOST, DB_NAME, DB_USER, DB_PASS, DB_PORT);
            case 'mongodb':
                return new MongoDBAdapter(DB_HOST, DB_NAME, DB_USER, DB_PASS, DB_PORT);
            case 'memory':
            default:
                return new MemoryAdapter();
        }
    }
}

function getDB(): DBAdapter {
    static $db = null;
    if ($db === null) {
        $db = DatabaseFactory::create();
        $db->connect();
    }
    return $db;
}
?>
