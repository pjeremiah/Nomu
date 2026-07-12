# Barista Application Guide

The **Nomu Barista Application** is the Android app used at the counter to scan customer loyalty QR codes, record orders, update inventory, and process reward pickups.

**Current version:** v1.0.23+24  
**Download:** From the web admin sidebar (**Download Barista App**) or the site APK page  
**Production API:** `https://nomu-mobile-backend.onrender.com/api` (automatic on release APK — not local)

---

## 1. Who uses the barista app

The barista app uses the same **admin accounts** as the web portal (`admins` in the database).

| Role | Can log in | Can scan | Can unlock abuse block |
|------|------------|----------|-------------------------|
| **Staff** | Yes (if active) | Yes | **No** |
| **Manager** | Yes | Yes | **Yes** |
| **Owner** (`superadmin`) | Yes | Yes | **Yes** |

**Inactive** accounts cannot log in. Customer mobile accounts cannot be used on the barista app.

---

## 2. Getting started

### 2.1 Install the app

1. Download **Nomu Barista Application** APK from the Nomu website (admin portal or download page).  
2. Install on the shop Android device (enable “Install unknown apps” if prompted).  
3. Open the app — version **1.0.23+24** or newer is required for supervisor unlock.

### 2.2 Log in

1. Enter your **Nomu admin email** and **password** (same as web admin login).  
2. Optionally enable **Remember me** (skips OTP for 24 hours on that device).  
3. Enter the **6-digit OTP** sent to your email (unless remember-me is active).  
4. After verification, the **QR scanner** screen opens.

### 2.3 Log out

Use the logout control and confirm in the dialog. Another staff member can then log in.

---

## 3. Main screen — QR scanner

After login, you stay on one main **scanner** screen (landscape-friendly layout).

**Typical flow:**

1. Customer opens the **Nomu mobile app** → **Loyalty** tab → shows QR on the flip card.  
2. Point the device camera at the QR code.  
3. Select **inventory items** the customer bought (Donuts, Drinks, Pastries, Pizzas).  
4. Set quantity and price tier if the item has two prices.  
5. For **reward pickup**, add a **Free Reward** line (Free Donut, Free Drink, etc.) if the customer already **claimed** in the app.  
6. Tap **Complete Transaction**.  
7. Success dialog shows stamps added; stock updates if configured.

**Tips:**

- Wait **5 seconds** between scans (cooldown).  
- Order must meet **₱100 minimum** merchandise for the customer to earn a stamp (customer app rules).  
- Camera can be paused during item selection; it resumes after the transaction.

---

## 4. Manual Lookup

Use when the QR code will not scan (cracked screen, glare, customer cannot open QR).

1. Tap **Manual Lookup** on the scanner screen.  
2. Search by customer **email** or **username**.  
3. Confirm the correct customer.  
4. Continue with the same **item selection** and **Complete Transaction** flow as a normal scan.

Manual lookup still applies **daily limits** and **abuse detection** — it is not a way to bypass rules.

---

## 5. Reward pickup

When a customer **claimed** a reward in the mobile app:

1. Scan their QR (or use Manual Lookup).  
2. In the inventory modal, choose the matching **Free Reward** button for their tier (e.g. Free Pastry at 5 stamps).  
3. Complete the transaction.  

If the customer has not claimed in the app, or the pickup window expired, the app shows an error (e.g. “Claim in app first”).

---

## 6. Scan blocked — supervisor unlock

If suspicious scanning is detected, the barista account is **paused** until a Manager or Owner unlocks it.

### When this happens

Examples (production thresholds):

- Same customer scanned **8+ times in one hour** by the same barista  
- **10+ scans in one minute** (rapid scanning)  

### What staff see

A **Scan blocked** dialog with:

1. A short explanation message  
2. **Manager / owner email** field  
3. **Manager / owner password** field  
4. **Confirm** button  

Scanning cannot continue until unlock succeeds.

### How to unlock

1. Call a **Manager** or **Owner** to the counter (Staff cannot unlock).  
2. Manager/Owner enters their **web admin email and password** (same as logging into the Nomu website).  
3. Tap **Confirm**.  
4. On success, a message confirms the scanner is unlocked and scanning resumes.

Wrong password or Staff credentials show an error on the same dialog.

**Important:** The web admin dashboard may show **Security Alerts**, but unlock is only done **on this barista device**, not on the website.

---

## 7. Limits and messages

### Barista (employee) limits

| Limit | Value |
|-------|--------|
| Scans per hour | 100 |
| Scans per day | 500 |
| Cooldown between scans | 5 seconds |

### Customer limits (shown to barista when customer is at cap)

| Limit | Value |
|-------|--------|
| Scans per day | 12 |
| Points/stamps per day | 12 |
| Daily reset | **12:00 AM Philippines time (PHT)** |

If the customer hit their daily limit, the barista app shows **Daily Scan Limit Reached** or **Daily Points Limit Reached** — ask the customer to return after midnight PHT. This is **not** the same as abuse block.

### Common error messages

| Message | Meaning |
|---------|---------|
| Scan blocked + credential form | Abuse block — need Manager/Owner unlock |
| Daily scan/points limit | Customer cap for the day |
| Customer already has 10 stamps | Loyalty card full for current cycle |
| Claim in app first | Reward not claimed in customer app |
| Already picked up | Reward already fulfilled |

---

## 8. Inventory and stock

When items are sold through a completed scan, stock may decrease automatically if inventory is linked. If stock sync fails, loyalty still saves — adjust inventory in the **web admin** if needed.

The app maintains a **socket connection** for live inventory updates from the server.

---

## 9. Troubleshooting

| Problem | Solution |
|---------|----------|
| Cannot log in | Check email/password; account must be **active** in web Manage Admins |
| OTP not received | Check email spam; use resend on OTP screen |
| QR not scanning | Use **Manual Lookup** |
| Scan blocked | Manager/Owner **Confirm** unlock on device |
| Customer “limit reached” | Customer waits until **midnight PHT** |
| App cannot reach server | Device needs internet; production uses Render — not local Wi‑Fi server |
| Old app without unlock form | Download latest barista APK from website (v1.0.23+24) |

---

## 10. Related documentation

- [Mobile Client Application Guide](./MOBILE-CLIENT-APPLICATION.md) — what customers see on their phone  
- [Web Application Guide](./WEB-APPLICATION.md) — admin portal, security alerts  
- [Abuse block & supervisor unlock (technical)](../ABUSE-BLOCK-SUPERVISOR-UNLOCK.md)  
- [Rate limits](../RATE-LIMITS.md)  

---

**Last updated:** June 2026
