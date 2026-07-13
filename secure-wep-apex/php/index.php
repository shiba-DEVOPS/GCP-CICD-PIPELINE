<?php
$successMessage = isset($_GET['success']) ? 'User details saved successfully.' : '';
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AWS RDS User Entry</title>
    <link rel="stylesheet" href="../assets/css/styles.css">
</head>
<body class="form-page">
    <main class="card">
        <div class="card-header">
            <p class="eyebrow">AWS RDS Practical</p>
            <h1>User Entry Form</h1>
            <p class="subtext">Enter user details and save them to your MySQL or AWS RDS database.</p>
        </div>

        <?php if ($successMessage): ?>
            <div class="alert success"><?php echo htmlspecialchars($successMessage); ?></div>
        <?php endif; ?>

        <form action="submit.php" method="POST" class="entry-form">
            <label for="name">Enter Your Name</label>
            <input type="text" id="name" name="name" placeholder="Enter name" required>

            <label for="email">Enter Your Email</label>
            <input type="email" id="email" name="email" placeholder="Enter email" required>

            <label for="password">Enter Your Password</label>
            <input type="text" id="password" name="password" placeholder="Enter password" required>

            <button type="submit">Enter</button>
        </form>
    </main>
</body>
</html>
