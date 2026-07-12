# Web Application Guide

Nomu’s **web application** combines the public Nomu Cafe website and the **admin portal** used by Owner, Manager, and Staff. Customers do **not** log in on the web — loyalty and QR codes are in the **mobile client app** only.

**Live site:** https://nomucafe.onrender.com (or your custom domain, e.g. nomu.cafe)  
**Admin login:** `/login`

---

## 1. Who uses the web app

| Role | Name in system | What they do |
|------|----------------|--------------|
| **Owner** | `superadmin` | Full control: all modules, all admin accounts |
| **Manager** | `manager` | Menu, inventory, gallery, staff management; can unlock blocked barista scanners (credentials used on barista device) |
| **Staff** | `staff` | Dashboard, rewards, promos, customer feedback |
| **Public visitor** | — | Browse menu, gallery, locations; download APKs; send feedback |

**Note:** The admin portal is intended for **desktop or tablet**. Mobile phone browsers may be restricted from admin pages.

---

## 2. Public website (no login)

### Pages

| Page | URL | Purpose |
|------|-----|---------|
| Home | `/` | Brand intro, highlights, promos |
| About Us | `/aboutus` | Mission and story |
| Menu | `/menu` | Browse items, categories, prices |
| Gallery | `/gallery` | Photos and videos; likes and comments |
| Location | `/location` | Branch addresses |
| Contact Us | `/contactus` | Send feedback (appears in admin **Customer Feedback**) |
| Nomu App | `/nomu-app` | Customer mobile app info + **download customer APK** |

### What visitors can do

- View menu, gallery, and branch locations  
- Submit questions or feedback through Contact Us  
- Download the **Nomu Mobile Application** (customer APK) for Android  

### What visitors cannot do on the web

- Create a customer loyalty account  
- View or scan a loyalty QR code  
- Earn stamps (that happens in the customer mobile app + barista scan)

---

## 3. Admin portal (login required)

After signing in at `/login` (email, password, and OTP verification), admins land on **Admin Dashboard** (`/admin/home`).

### Admin modules

| Module | Path | Typical users |
|--------|------|----------------|
| Admin Dashboard | `/admin/home` | All |
| Manage Admins | `/admin/manage-admins` | Owner, Manager |
| Menu Management | `/admin/menu-management` | Owner, Manager |
| Inventory Management | `/admin/inventory-management` | Owner, Manager |
| Reward Management | `/admin/reward-management` | All |
| Promo Management | `/admin/promo-management` | All |
| Customer Feedback | `/admin/customer-feedback` | All |
| Gallery Management | `/admin/gallery-management` | Owner, Manager |

The sidebar also includes **Download Barista App** (barista APK) and **Logout**.

---

### 3.1 Admin Dashboard

The dashboard is the control center for café operations and security.

- **Summary cards** — total customers, total orders  
- **Customer Analytics** — demographics and trends; export to PDF  
- **Business Analytics** — revenue and order trends; export to PDF  
- **Best Seller Analytics** — top items by day, week, or month  
- **Best Seller by Employment** — Student vs Employed preferences by category  
- **Security Alerts** — notifications when the barista app detects suspicious scanning (see barista manual for unlock on device)  
- **Recent Activity** — latest system events  

Security alerts refresh automatically. Unlocking a paused barista scanner is **not** done on the web — a Manager or Owner enters credentials on the **barista app** at the counter.

---

### 3.2 Manage Admins

Create and maintain accounts used for **web login** and **barista app login**.

- Add, edit, or remove admin accounts  
- Assign role: **Owner**, **Manager**, or **Staff**  
- Set status: **active** or **inactive** (inactive accounts cannot use the barista app)  
- Reset passwords  

**Manager rules:** Managers can add **Staff** accounts. Only the Owner has full control over all admin types.

---

### 3.3 Menu Management

Manage what appears on the public **Menu** page and supports pricing reference.

- Add, edit, or remove menu items  
- Set name, description, price (and optional second price tier), category, image  
- Show or hide items (active / inactive)  
- Categories include Donuts, Drinks, Pastries, Pizzas, and others  

---

### 3.4 Inventory Management

Manage stock items that baristas select when scanning a customer.

- Add, edit, or remove inventory items by category  
- Track current stock, minimum threshold, units  
- Upload images so baristas can identify products on the scanner  
- Filter low-stock or out-of-stock items  

Changes sync to the **barista app** item selection modal.

---

### 3.5 Reward Management

Configure loyalty rewards shown in the **customer mobile app** at 5-stamp and 10-stamp tiers.

- Create reward banners (title, description, stamps required)  
- Set active dates and usage limits  
- Control which rewards customers can claim in the app  

---

### 3.6 Promo Management

Create promotions pushed to the customer app **Special Offers** section.

- Types: percentage off, fixed amount, BOGO, free item, loyalty bonus  
- Status: Active, Inactive, Scheduled, Expired  
- Upload promo images  
- Updates appear in the customer app in real time when active  

---

### 3.7 Customer Feedback

Review messages from **Contact Us** and other feedback channels.

- Read customer messages  
- Reply as admin (customer sees replies in app or email flow as configured)  
- Email addresses may be partially masked for privacy  

---

### 3.8 Gallery Management

Curate the public **Gallery** page.

- Upload, edit, or delete posts (images and video)  
- Manage featured content and engagement  

---

## 4. Signing in and out

1. Open the site and go to **Login** (`/login`).  
2. Enter admin **email** and **password**.  
3. Enter the **6-digit OTP** sent to your email (unless “remember this device” is active).  
4. You are redirected to the Admin Dashboard.  

**Logout:** Use **Logout** in the sidebar. Session is cleared on the server.

---

## 5. Downloading mobile apps from the web

| App | Where to download |
|-----|-------------------|
| **Customer app** | Nomu App page (`/nomu-app`) or `download-apk.html` |
| **Barista app** | Admin sidebar — **Download Barista App** |

Install the APK on Android devices. Both apps connect to the production API (`nomu-mobile-backend`), not your local computer.

---

## 6. Relationship to other Nomu apps

| Task | Web app | Barista app | Customer app |
|------|---------|-------------|--------------|
| Manage menu & inventory | Yes | Uses data | Shows promos/menu context |
| Scan customer QR | No | Yes | Shows QR |
| Earn stamps | No | Processes scan | Receives stamps |
| View abuse alerts | Yes | Triggers alerts | Not involved |
| Unlock blocked scanner | No (credentials only) | Yes — on device | Not involved |

See also: [Barista Application Guide](./BARISTA-APPLICATION.md) · [Mobile Client Application Guide](./MOBILE-CLIENT-APPLICATION.md)

---

## 7. Troubleshooting (web)

| Issue | What to try |
|-------|-------------|
| Cannot open admin on phone | Use desktop or tablet |
| OTP not received | Check spam; verify email on admin account |
| Barista cannot log in | Confirm account is **active** in Manage Admins |
| Customer says stamps not updating | Check barista scan succeeded; see customer daily limits (12/day PHT) |
| Security alert on dashboard | Review barista app; Manager/Owner unlocks scanner on barista device if blocked |

---

**Last updated:** June 2026
