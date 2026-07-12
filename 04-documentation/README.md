# 📚 Nomu Documentation

Documentation for the Nomu Cafe integrated system: **web app**, **barista app**, and **mobile client (customer) app**.

---

## 📱 Application user manuals

Step-by-step guides for each application:

| Manual | File | For |
|--------|------|-----|
| **Web Application** | [user-manuals/WEB-APPLICATION.md](./user-manuals/WEB-APPLICATION.md) | Owner, Manager, Staff, public visitors |
| **Barista Application** | [user-manuals/BARISTA-APPLICATION.md](./user-manuals/BARISTA-APPLICATION.md) | Counter staff — scan, manual lookup, supervisor unlock |
| **Mobile Client Application** | [user-manuals/MOBILE-CLIENT-APPLICATION.md](./user-manuals/MOBILE-CLIENT-APPLICATION.md) | Customers — loyalty QR, stamps, rewards |

**Index:** [user-manuals/README.md](./user-manuals/README.md)

---

## 🏗 System & technical docs

| Document | Description |
|----------|-------------|
| [DATABASE-SCHEMA.md](../05-database/DATABASE-SCHEMA.md) | **MongoDB schema** — collections, fields, relationships (in `05-database/`) |
| [APPLICATIONS-OVERVIEW.md](./APPLICATIONS-OVERVIEW.md) | How the three apps connect — backends, APKs, roles |
| [ABUSE-BLOCK-SUPERVISOR-UNLOCK.md](./ABUSE-BLOCK-SUPERVISOR-UNLOCK.md) | Barista abuse block, unlock API, production deploy |
| [RATE-LIMITS.md](./RATE-LIMITS.md) | Daily/hourly limits, 12/day PHT, abuse thresholds |
| [BEST-SELLER-ANALYTICS-RECOMMENDATIONS.md](./BEST-SELLER-ANALYTICS-RECOMMENDATIONS.md) | Analytics recommendations |

---

## 🚀 Deployment

| Document | Description |
|----------|-------------|
| [RENDER_AND_GITHUB.md](../RENDER_AND_GITHUB.md) | Render services, env vars, APK hosting, GitHub deploy |
| [MOBILE_DEPLOYMENT.md](../02-mobile-client/MOBILE_DEPLOYMENT.md) | Customer APK build and backend URL |

---

## 🔒 Security references

| Document | Description |
|----------|-------------|
| [mobile-backend SECURITY_IMPLEMENTATION.md](../02-mobile-client/mobile-backend/SECURITY_IMPLEMENTATION.md) | Production mobile API security |
| [barista-backend SECURITY_IMPLEMENTATION.md](../03-mobile-barista/mobile-barista-backend/SECURITY_IMPLEMENTATION.md) | Local barista backend (dev) |

---

## 📋 Suggested reading order (capstone / training)

1. [Applications overview](./APPLICATIONS-OVERVIEW.md) — big picture  
2. [Mobile Client Application Guide](./user-manuals/MOBILE-CLIENT-APPLICATION.md) — customer journey  
3. [Barista Application Guide](./user-manuals/BARISTA-APPLICATION.md) — counter operations  
4. [Web Application Guide](./user-manuals/WEB-APPLICATION.md) — admin & public site  
5. [Abuse block & supervisor unlock](./ABUSE-BLOCK-SUPERVISOR-UNLOCK.md) + [Rate limits](./RATE-LIMITS.md) — appendix  
6. [Database schema](../05-database/DATABASE-SCHEMA.md) — MongoDB reference (`05-database/`)  

---

## 📁 Folder note

**`04-documentation`** = user manuals and system guides (how to use Nomu).  
**`05-database`** = database schema and future migrations/seeds. Mongoose model **code** stays in each backend’s `models/` folder.

---

**Last updated:** June 2026  
**Barista APK:** v1.0.23+24 · **Customer APK:** v1.0.14+15  
