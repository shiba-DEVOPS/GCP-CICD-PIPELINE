<?php

interface DBAdapter {
    public function connect(): void;
    public function insertUser(string $name, string $email, string $password): bool;
    public function getAllUsers(): array;
    public function close(): void;
}

class MariaDBAdapter implements DBAdapter {
    private $pdo;
    private $host, $name, $user, $pass, $port;

    public function __construct($host, $name, $user, $pass, $port) {
        $this->host = $host;
        $this->name = $name;
        $this->user = $user;
        $this->pass = $pass;
        $this->port = $port;
    }

    public function connect(): void {
        $dsn = "mysql:host={$this->host};port={$this->port};dbname={$this->name};charset=utf8mb4";
        try {
            $this->pdo = new PDO($dsn, $this->user, $this->pass, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            ]);
        } catch (PDOException $e) {
            die("MariaDB Connection failed: " . $e->getMessage());
        }
    }

    public function insertUser(string $name, string $email, string $password): bool {
        $stmt = $this->pdo->prepare("INSERT INTO users (name, email, password) VALUES (?, ?, ?)");
        return $stmt->execute([$name, $email, $password]);
    }

    public function getAllUsers(): array {
        $stmt = $this->pdo->query("SELECT id, name, email, password, created_at FROM users ORDER BY id DESC");
        return $stmt->fetchAll();
    }

    public function close(): void {
        $this->pdo = null;
    }
}

class PostgreSQLAdapter implements DBAdapter {
    private $pdo;
    private $host, $name, $user, $pass, $port;

    public function __construct($host, $name, $user, $pass, $port) {
        $this->host = $host;
        $this->name = $name;
        $this->user = $user;
        $this->pass = $pass;
        $this->port = $port;
    }

    public function connect(): void {
        $dsn = "pgsql:host={$this->host};port={$this->port};dbname={$this->name}";
        try {
            $this->pdo = new PDO($dsn, $this->user, $this->pass, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            ]);
        } catch (PDOException $e) {
            die("PostgreSQL Connection failed: " . $e->getMessage());
        }
    }

    public function insertUser(string $name, string $email, string $password): bool {
        $stmt = $this->pdo->prepare("INSERT INTO users (name, email, password) VALUES (?, ?, ?)");
        return $stmt->execute([$name, $email, $password]);
    }

    public function getAllUsers(): array {
        $stmt = $this->pdo->query("SELECT id, name, email, password, created_at FROM users ORDER BY id DESC");
        return $stmt->fetchAll();
    }

    public function close(): void {
        $this->pdo = null;
    }
}

class MongoDBAdapter implements DBAdapter {
    private $client;
    private $db;
    private $host, $name, $user, $pass, $port;

    public function __construct($host, $name, $user, $pass, $port) {
        $this->host = $host;
        $this->name = $name;
        $this->user = $user;
        $this->pass = $pass;
        $this->port = $port;
    }

    public function connect(): void {
        if (!class_exists('MongoDB\Driver\Manager')) {
            die("MongoDB extension not installed.");
        }
        $uri = "mongodb://{$this->user}:{$this->pass}@{$this->host}:{$this->port}";
        try {
            $this->client = new \MongoDB\Client($uri);
            $this->db = $this->client->selectDatabase($this->name);
        } catch (Exception $e) {
            die("MongoDB Connection failed: " . $e->getMessage());
        }
    }

    public function insertUser(string $name, string $email, string $password): bool {
        $collection = $this->db->selectCollection('users');
        $result = $collection->insertOne([
            'name' => $name,
            'email' => $email,
            'password' => $password,
            'created_at' => date('Y-m-d H:i:s')
        ]);
        return $result->getInsertedCount() === 1;
    }

    public function getAllUsers(): array {
        $collection = $this->db->selectCollection('users');
        $cursor = $collection->find([], ['sort' => ['_id' => -1]]);
        $users = [];
        foreach ($cursor as $doc) {
            $users[] = [
                'id' => (string)$doc['_id'],
                'name' => $doc['name'],
                'email' => $doc['email'],
                'password' => $doc['password'],
                'created_at' => $doc['created_at']
            ];
        }
        return $users;
    }

    public function close(): void {
        $this->client = null;
    }
}

class MemoryAdapter implements DBAdapter {
    private $pdo;

    public function connect(): void {
        try {
            $this->pdo = new PDO("sqlite::memory:", null, null, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            ]);
            // Initialize schema for memory DB
            $this->pdo->exec("CREATE TABLE users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                password TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )");
        } catch (PDOException $e) {
            die("Memory DB Initialization failed: " . $e->getMessage());
        }
    }

    public function insertUser(string $name, string $email, string $password): bool {
        $stmt = $this->pdo->prepare("INSERT INTO users (name, email, password) VALUES (?, ?, ?)");
        return $stmt->execute([$name, $email, $password]);
    }

    public function getAllUsers(): array {
        $stmt = $this->pdo->query("SELECT id, name, email, password, created_at FROM users ORDER BY id DESC");
        return $stmt->fetchAll();
    }

    public function close(): void {
        $this->pdo = null;
    }
}
?>
