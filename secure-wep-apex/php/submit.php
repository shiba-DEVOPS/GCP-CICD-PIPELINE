<?php
require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: index.php');
    exit;
}

$name = trim($_POST['name'] ?? '');
$email = trim($_POST['email'] ?? '');
$password = trim($_POST['password'] ?? '');

if ($name === '' || $email === '' || $password === '') {
    die('All fields are required.');
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    die('Please enter a valid email address.');
}

$db = getDB();

try {
    if ($db->insertUser($name, $email, $password)) {
        header('Location: dashboard.php?success=1');
        exit;
    } else {
        die('Unable to save user.');
    }
} catch (Exception $e) {
    if (strpos($e->getMessage(), 'UNIQUE') !== false || strpos($e->getMessage(), '1062') !== false) {
        die('This email is already registered.');
    }
    die('Error: ' . $e->getMessage());
}
?>
