# H2O Singur Fitness Gym — Management System (PHP + MySQL Version)

Production-ready conversion of the gym management system from **offline JSON/localStorage** storage to a **live MySQL database** managed through **phpMyAdmin** — accessible online from any device.

---

## 1. What's Included

| File | Purpose |
|------|---------|
| `index.html` | The app UI (login, dashboard, clients, invoices, ID cards, …) |
| `app.js` | Application logic — now talks to the MySQL API |
| `styles.css` | Styles + new mobile-friendly & layout patches |
| `config.php` | ⚙️ **EDIT THIS** — MySQL credentials |
| `api/index.php` | REST API (login, sync, backups, users, …) |
| `database_schema.sql` | Full database schema **with all your existing data pre-imported** |
| `import-backup.php` | Optional: import any JSON backup file into MySQL from the browser |

---

## 2. Installation on XAMPP / WAMP (Local PC)

1. Copy the whole `h2o-gym-php` folder into `C:\xampp\htdocs\` (rename to `h2o-gym` if you like).
2. Start **Apache** and **MySQL** from the XAMPP control panel.
3. Open **http://localhost/phpmyadmin** → click **New** → create a database named `h2o_gym` with collation `utf8mb4_unicode_ci`.
4. Select the `h2o_gym` database → **Import** tab → choose `database_schema.sql` → **Go**.
   *(This creates all 20 tables AND loads your existing 31 members, trainers, attendance, invoices, templates, settings, and login users.)*
5. If you use a MySQL password (XAMPP default is empty), open `config.php` and set `DB_USER` / `DB_PASS`.
6. Open **http://localhost/h2o-gym/** and log in.

## 3. Installation on Live Hosting (cPanel / Plesk)

1. Create a MySQL database + user in your hosting panel (assign the user to the database with ALL PRIVILEGES).
2. Upload all files to `public_html/` (or a subfolder) using File Manager or FTP.
3. Open phpMyAdmin → select your database → **Import** → `database_schema.sql`.
4. Edit `config.php` with the host credentials:
   ```php
   define('DB_HOST', 'localhost');   // usually 'localhost' on shared hosting
   define('DB_NAME', 'your_db_name');
   define('DB_USER', 'your_db_user');
   define('DB_PASS', 'your_db_password');
   ```
5. Visit your domain — the login page appears. Done. ✅

## 4. Default Logins (change them!)

| Role | Username | Password |
|------|----------|----------|
| Admin | `admin` | `admin123` |
| Admin | `owner` | `owner123` |
| Staff | `staff` | `staff123` |
| Trainer | `trainer` | `trainer123` |

> 🔐 **Change these immediately** — log in as admin → **Settings → Users & Security**. Passwords are stored as bcrypt hashes; you can also change them from the user manager. (If you ever type a plain password directly into the `users` table in phpMyAdmin, the system verifies it once and automatically converts it to a secure hash.)

---

## 5. What Changed vs. the Old Offline Version

### ✅ Live MySQL everywhere
* **Login** — verified against the MySQL `users` table (PHP session based). Works from any device.
* **All data** — clients, enquiries, invoices, templates, trainers, attendance, diet plans, exercise plans, classes, expenses, body measurements, feedback, referrals, loyalty points, self-registrations, freezes, campaigns — live in MySQL and sync automatically as you use the app.
* **phpMyAdmin** — every table uses real columns you can view and edit directly.
* **Offline safety** — if the server is briefly unreachable, the app keeps working from a local cache and re-syncs when the connection returns.

### ✅ Bug fixes requested
* **ID Card PDF fixed** — the old code required the `html2canvas` library, which was never loaded (so no preview/PDF). Now html2canvas + local QR rendering are included; the card is captured at ~300 DPI and placed on a true CR80 (85.6 × 54 mm) PDF page.
* **Preview = Print = PDF** — print and batch-print now use the *same captured image* as the PDF, so they look identical.
* **Invoice edit fixed** — the plan row was being double-counted (plan amount added twice) and the form wasn't reset between edits. Editing now restores items exactly, shows an "EDITING" badge, and the button becomes "Update Invoice".
* **Loyalty Points hidden** — feature hidden with `display:none` (all code kept intact/commented; remove the block in `styles.css` "SECTION 35" to re-enable).

### ✅ New features
* **Mobile friendly** — tables now scroll horizontally on phones (fixed CSS grid blowout), forms stack, modals become bottom sheets, larger touch targets.
* **100% width layout** — the 1440px content cap was removed so client data uses the full computer screen.
* **Adjustable sidebar** — drag the right edge of the sidebar to resize it (remembered per browser, 190–440 px).
* **User Management** — Settings → Users & Security: add/edit/disable users, reset passwords (admin only).
* **Server backups** — manual & daily auto-backups are now stored in the MySQL `backups` table; restore/download/delete them from any device (Backup & Data page).

---

## 6. Self-Registration Portal

Share this link with prospects (replace your domain):
```
https://your-domain.com/index.html?portal=selfregister
```
Visitors submit the form **without logging in**; entries land in the MySQL `self_registrations` table and appear in **Self-Register Portal → pending approvals** after you log in.

---

## 7. Notes & Tips

* **Photos** are stored as base64 in the `clients.photo` column. If you add very large photos, make sure `max_allowed_packet` is at least 32M (phpMyAdmin → Variables; on XAMPP edit `my.ini`).
* **PHP version**: requires PHP 7.4+ (PHP 8.x recommended). The `pdo_mysql` extension must be enabled (default on XAMPP & most hosts).
* **HTTPS**: once your domain has SSL, sessions and logins are fully secure. For strict setups add `session.cookie_secure = 1` in php.ini.
* **Multi-user editing**: last-save-wins per record — ideal for single-gym teams; avoid two people editing the *same* member simultaneously.
* **Debugging**: set `APP_DEBUG` to `true` in `config.php` to see detailed errors, then set it back to `false` in production.
* **Delete `import-backup.php`** after initial data import (it has no authentication).

---

## 8. Database Tables Reference (phpMyAdmin)

| Table | Contents |
|-------|----------|
| `users` | Login accounts (bcrypt passwords) |
| `clients` | Members — all profile fields + `photo` |
| `enquiries` | Walk-in/prospect enquiries |
| `invoices` | Invoices (`clientJson`/`itemsJson` hold the snapshot + line items) |
| `templates` | WhatsApp/message templates |
| `trainers` | Staff trainers (`assignedClientsJson` = assigned member ids) |
| `attendance` | Daily check-ins (unique per client per day) |
| `diet_plans`, `exercise_plans` | Assigned plans |
| `classes` | Group classes (`enrolledJson` = enrolled member ids) |
| `expenses` | Gym expenses |
| `body_measurements` | Member progress tracking |
| `feedback`, `referrals`, `loyalty_points` | Member engagement |
| `self_registrations` | Portal sign-ups awaiting approval |
| `freezes`, `campaigns` | Membership freezes, festival campaigns |
| `backups` | Server-side backup snapshots |
| `app_config` | Key/value settings (`k='app'` holds the full config JSON) |
