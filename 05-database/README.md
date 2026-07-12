# Database (`05-database`)

Database documentation and (future) migration/seed scripts for the Nomu Cafe system.

**Live data** is stored in **MongoDB Atlas** (e.g. database `nomucafephdb`).  
**Mongoose models** (code) live in the app backends — this folder holds **schema reference docs**, not the running database.

---

## What belongs here vs other folders

| Folder | Purpose |
|--------|---------|
| **`05-database/`** (this folder) | Schema reference, ER diagrams, collection fields, future seeds/migrations |
| **`01-web-application/backend/models/`** | Web API Mongoose model **source code** |
| **`02-mobile-client/mobile-backend/`** | Mobile API models + `services/employeeScanBlockService.js` |
| **`04-documentation/`** | User manuals, app guides, rate limits, deploy docs — **not** primary home for schema |

---

## Main document

| File | Description |
|------|-------------|
| **[DATABASE-SCHEMA.md](./DATABASE-SCHEMA.md)** | Full MongoDB schema — all collections, fields, relationships, indexes, source file index |

**21 production collections** documented (+ legacy `customers` noted separately).

---

## Database facts

| Item | Detail |
|------|--------|
| **Type** | MongoDB (NoSQL) |
| **Production** | MongoDB Atlas |
| **Shared by** | `nomu-backend` + `nomu-mobile-backend` (same `MONGO_URI`) |
| **ODM** | Mongoose (Node.js) |
| **Files** | GridFS for images (profiles, promos, gallery) |

---

## Planned subfolders (not yet in repo)

```
05-database/
├── DATABASE-SCHEMA.md    ← schema reference (current)
├── migrations/           ← future: DB upgrade scripts
├── seeds/                ← future: sample/test data loaders
└── backups/              ← future: backup/restore notes or scripts
```

Seed scripts that already exist elsewhere today:

- `01-web-application/backend/scripts/seed-analytics-demo-data.js` — analytics demo data

---

## Related documentation

- [Web + mobile database check](../WEB_AND_MOBILE_API_DATABASE_CHECK.md) — same `MONGO_URI` checklist
- [Applications overview](../04-documentation/APPLICATIONS-OVERVIEW.md) — which app uses which API
- [Rate limits](../04-documentation/RATE-LIMITS.md) — limits (mostly in-memory; `employeescanblocks` is in MongoDB)
- [Abuse block collection](../04-documentation/ABUSE-BLOCK-SUPERVISOR-UNLOCK.md) — `employeescanblocks` feature guide

---

**Last updated:** June 2026
