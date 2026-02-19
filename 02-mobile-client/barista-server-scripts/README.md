# Barista server scripts & schema

Use these so the barista server emits `loyalty-point-added` in the same shape as the mobile-backend. The mobile app then updates the correct user with no conflict.

## Files

| File | Purpose |
|------|--------|
| **loyalty-point-added.schema.json** | JSON schema of the payload. Use for docs or validation. |
| **build-loyalty-payload.js** | Node helper: `buildLoyaltyPointAddedPayload(customer, options)`. Copy into your barista server or require this file. |
| **../BARISTA_SERVER_UPDATE_GUIDE.md** | Full update guide: schema table, before/after code, checklist. |

## Quick integration in barista server

1. Copy the contents of `build-loyalty-payload.js` into your barista server (e.g. near other helpers), **or** copy the function and use it where you currently emit after a scan.

2. Where you currently do something like:
   ```javascript
   io.emit('loyalty-point-added', { drink, points: customer.points, ... });
   ```
   replace with:
   ```javascript
   const payload = buildLoyaltyPointAddedPayload(customer, { drink });
   io.emit('loyalty-point-added', payload);
   ```

3. Restart the barista server and test: scan a customer QR, then check that the customer’s mobile app loyalty tab updates in real time.

## Required fields for the app

- **qrToken** – so the app can match the event to the logged-in user.
- **points** – must be a **number** (e.g. `Number(customer.points) || 0`).

Everything else is optional but recommended for a consistent schema across barista server and mobile-backend.
