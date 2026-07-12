# Mobile Client Application Guide

The **Nomu Mobile Client Application** (customer app) is the Android app for café customers. It provides the loyalty card, QR code for barista scans, rewards, promos, branch map, and account settings.

**Current version:** v1.0.14+15  
**Download:** Nomu website → **Nomu App** page (`/nomu-app`) or APK download page  
**Production API:** `https://nomu-mobile-backend.onrender.com/api`

---

## 1. Who uses this app

**Customers only.** You create a personal account in the app. Web admin accounts and barista accounts are separate — you cannot use them to log in here.

---

## 2. Getting started

### 2.1 Install

1. Download **Nomu Mobile Application** APK from the Nomu website.  
2. Install on your Android phone.  
3. Open the app.

### 2.2 First launch

1. **Splash screen** — brief Nomu branding.  
2. **Onboarding** (first time only) — three slides: earn stamps, scan at checkout, redeem rewards.  
3. Choose **Sign Up** (new) or **Login** (returning).

### 2.3 Sign up

Provide:

- Full name  
- Username  
- Email  
- Birthday  
- Gender  
- Employment status  
- Password  

Verify your email with the **6-digit OTP** sent to your inbox. After verification, you can use the app.

### 2.4 Log in

- Email (or username as configured) and password  
- Optional **Remember me**  
- **Forgot password** uses OTP to reset  

---

## 3. Main navigation (bottom tabs)

After login, four tabs are available:

| Tab | Name | Purpose |
|-----|------|---------|
| 1 | **Home** | Dashboard, stamp count, promos, recent orders |
| 2 | **Maps** | Branch locations (UST Dapitan, UP Diliman, Jupiter) |
| 3 | **Loyalty** | Flip-card QR, stamp grid, rewards, claim & pickup |
| 4 | **Profile** | Account photo, settings, help |

---

## 4. Home tab

- **Greeting** with your name (time shown in Philippines time where applicable)  
- **Current stamp count** toward rewards  
- **Special Offers** — active promos from the café (updates when admins publish promos)  
- **Highlight video** or featured content  
- **Recent orders** — last orders; **View All** opens full **Past Orders** list  

---

## 5. Maps tab

View Nomu branch pins and open directions in **Google Maps** for:

- UST Dapitan  
- UP Diliman  
- Jupiter  

---

## 6. Loyalty tab (most important)

### 6.1 Your QR code

- Open **Loyalty** and show the **flip card** QR code to the barista at checkout.  
- The barista scans it with the **Barista Application** to add stamps.  
- Keep the app open or refresh the QR if the barista has trouble scanning.

### 6.2 How you earn stamps

| Rule | Detail |
|------|--------|
| Stamps per visit | **1 stamp** when your paid merchandise is **₱100 or more** |
| Below ₱100 | Visit counts but **no stamp** for that transaction |
| 5 stamps | Eligible for **free pastry or donut** reward tier |
| 10 stamps | Eligible for **free drink or pizza** reward tier |
| Daily maximum | **12 scans** and **12 stamps/points per calendar day** |
| When limits reset | **12:00 AM Philippines time (PHT)** — midnight in the Philippines, not your phone’s travel timezone |
| Approaching limit | Notification around **10 stamps** in one day |

Tap **How loyalty works** (rules screen in the app) for the full text shown to customers.

### 6.3 Claiming rewards

1. Reach **5** or **10 stamps** (or tier shown on reward banners).  
2. Tap **Claim** in the app within the **24-hour claim window**.  
3. Go to the counter within **24 hours after claiming** for **pickup**.  
4. Show your QR again; barista selects the **Free Reward** item and completes the transaction.  

After claiming the **10-stamp** reward, your card may **reset to a new cycle** per program rules.

### 6.4 Loyalty history

View past claims, pickup status, and stamp progress on the Loyalty tab and related history sections.

---

## 7. Profile tab

### Account

- Profile photo  
- View and edit personal details in **Account Settings**  
- Change password (OTP verification)  
- **Logout**  

### Help

- **Nomu Chatbot** — ask questions about hours, loyalty, and support  
- Conversation history may be saved for convenience  

---

## 8. Promotions

Active promos appear on **Home** under Special Offers. They are managed by café admins on the web portal and sync to your app when published.

---

## 9. What customers should know about limits

### Daily stamp limit (12 per day)

- You can earn at most **12 stamps per day** (Philippines calendar day).  
- If you reach the limit, the barista’s app will show that you cannot receive more stamps until **midnight PHT**.  
- Plan multiple visits accordingly.

### This app vs barista “scan blocked”

- **Customer daily limit** — applies to **you** when you’ve had 12 stamps today.  
- **Barista abuse block** — applies to the **barista account**, not yours. If scanning fails for shop security reasons, staff will ask a manager to unlock their device — you do not enter any password.

---

## 10. Tips for a smooth visit

1. Open **Loyalty** before reaching the counter.  
2. Brighten screen and show the **QR** clearly.  
3. Ensure your order meets **₱100+** if you want a stamp.  
4. **Claim** rewards in the app before asking for free items at the counter.  
5. Pick up claimed rewards within **24 hours**.  

---

## 11. Troubleshooting

| Problem | What to try |
|---------|-------------|
| OTP not received | Check spam; request resend |
| QR won’t scan | Barista can use **Manual Lookup** with your email/username |
| No stamp after purchase | Order may be under ₱100; or you hit **12/day** limit |
| “Limit reached” at counter | Wait until after **midnight Philippines time** |
| Cannot claim reward | Check stamp count and claim window in Loyalty tab |
| Pickup denied | Claim in app first; check 24-hour pickup window |
| Points not updating | Pull to refresh Loyalty; ensure barista completed transaction |

---

## 12. Related documentation

- [Barista Application Guide](./BARISTA-APPLICATION.md) — what happens when your QR is scanned  
- [Web Application Guide](./WEB-APPLICATION.md) — public menu and café info  
- [Rate limits](../RATE-LIMITS.md) — technical detail on 12/day PHT  

---

**Last updated:** June 2026
