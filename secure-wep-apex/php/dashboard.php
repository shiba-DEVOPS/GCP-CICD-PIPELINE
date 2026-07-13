<?php
require_once 'config.php';

$db = getDB();
try {
    $users = $db->getAllUsers();
} catch (Exception $e) {
    die('Unable to fetch users: ' . $e->getMessage());
}

$successMessage = isset($_GET['success']) ? 'Latest user saved. All users are shown below.' : '';
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>User Dashboard</title>
    <link rel="stylesheet" href="../assets/css/styles.css">
</head>
<body class="dashboard-page">
    <main class="dashboard-shell">
        <section class="dashboard-header">
            <div>
                <p class="eyebrow">Main Page</p>
                <h1>Registered Users</h1>
                <p class="subtext">This table displays data from the active <strong><?php echo strtoupper(DB_TYPE); ?></strong> backend.</p>
            </div>
            <a class="secondary-button" href="index.php">Add Another User</a>
        </section>

        <?php if ($successMessage): ?>
            <div class="alert success"><?php echo htmlspecialchars($successMessage); ?></div>
        <?php endif; ?>

        <section class="table-card">
            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Password</th>
                        <th>Created At</th>
                    </tr>
                </thead>
                <tbody>
                    <?php if (count($users) > 0): ?>
                        <?php foreach ($users as $row): ?>
                            <tr>
                                <td><?php echo htmlspecialchars((string) $row['id']); ?></td>
                                <td><?php echo htmlspecialchars($row['name']); ?></td>
                                <td><?php echo htmlspecialchars($row['email']); ?></td>
                                <td><?php echo htmlspecialchars($row['password']); ?></td>
                                <td><?php echo htmlspecialchars($row['created_at']); ?></td>
                            </tr>
                        <?php endforeach; ?>
                    <?php else: ?>
                        <tr>
                            <td colspan="5" class="empty-state">No users found in the database yet.</td>
                        </tr>
                    <?php endif; ?>
                </tbody>
            </table>
        </section>
    </main>
</body>
</html>
