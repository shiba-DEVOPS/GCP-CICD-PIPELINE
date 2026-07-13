# AWS RDS User Entry Website

This project is now organized so you can:

- run a frontend demo directly with VS Code Live Server
- keep a real PHP + MySQL version for AWS RDS practical work

## Folder structure

- `index.html` - frontend entry page for Live Server
- `dashboard.html` - role-based frontend dashboard for Live Server
- `assets/css/styles.css` - shared styling
- `assets/js/app.js` - role-based localStorage logic for Live Server preview
- `php/index.php` - PHP form page for real database usage
- `php/submit.php` - inserts form data into MySQL
- `php/dashboard.php` - fetches and shows all users from database
- `php/config.php` - database connection settings
- `database/database.sql` - database and table creation script

## Live Server mode

Use this when you want to open the folder directly in VS Code and click `Go Live`.

- Open `index.html`
- Select `Employee` or `Manager`
- Submit the form
- Data is stored in browser localStorage
- Employees can update only their own details
- Managers can access both sections, add users, edit users, and delete a selected user
- Both employee and manager users can log out and return to the login page
- Employee and manager tables now open from a `Show Data` button on the page
- Employees can send messages to the manager and receive replies
- Managers can send an immediate access request, employees can grant or deny it, and managers can open the employee portal popup after approval
- Duplicate names are automatically stored like `Name - A`, `Name - B`, and so on
- Passwords must be unique across all users, and reused passwords show a popup warning
- The single manager account uses camera-based face enrollment on first setup and face login on later sign-ins
- `dashboard.html` shows the records in table format like an RDBMS table

This mode is only for frontend demo. It does not connect to AWS RDS.

## AWS RDS mode

Use this when you want real database storage and fetching.

1. Create a MySQL database in AWS RDS.
2. Open the RDS security group and allow your IP on port `3306`.
3. Run `database/database.sql` on the RDS instance.
4. Update `php/config.php` with your RDS endpoint, database name, username, and password.
5. Extend the PHP pages to use the new fields if you want the same role-based CRUD behavior with the real database.
6. Run the `php` folder through a PHP server such as XAMPP, WAMP, or Laragon.
7. Open `php/index.php`.

## Important note

The table shows passwords because you requested that for practice. For real applications, passwords must be hashed and should never be displayed.
