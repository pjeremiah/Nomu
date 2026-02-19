# Barista server update guide – loyalty socket payload

Use this to update your barista server so its `loyalty-point-added` emit matches what the mobile app expects. No conflict with mobile-backend when both use this schema.

---

## 1. Payload schema (what to send)

When the barista server adds loyalty points (e.g. after a QR scan), it must emit:

**Event name:** `loyalty-point-added`

**Payload:**

| Field            | Type    | Required | Description |
|------------------|---------|----------|-------------|
| `qrToken`        | string  | **Yes**  | Customer's QR token. Mobile app uses this to know which user to update. |
| `userId`         | string  | No       | Customer ID (e.g. `customer._id.toString()`). Optional fallback for the app. |
| `points`         | number  | **Yes**  | Current points after this transaction. Must be a number (e.g. `5`, not `"5"`). |
| `drink`          | string  | No       | Item/drink name (e.g. order summary). |
| `itemName`       | string  | No       | Same as `drink`; app may use either. |
| `totalOrders`    | number  | No       | Length of `customer.pastOrders` or similar. |
| `timestamp`      | Date    | No       | When the event happened. |
| `message`        | string  | No       | Human-readable message for logs/notifications. |
| `customerMessage`| string  | No       | Message to show the customer (e.g. in a snackbar). |

**Minimum required for the app to apply the update:** `qrToken` + `points` (as number).

---

## 2. JSON schema (for validation)

Save this as `loyalty-point-added.schema.json` in your barista project if you want to validate payloads:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "loyalty-point-added",
  "description": "Socket payload for loyalty-point-added event (barista & mobile-backend)",
  "type": "object",
  "required": ["qrToken", "points"],
  "properties": {
    "qrToken":        { "type": "string" },
    "userId":         { "type": ["string", "null"] },
    "points":         { "type": "number" },
    "drink":          { "type": "string" },
    "itemName":       { "type": "string" },
    "totalOrders":    { "type": "number" },
    "timestamp":      { "type": "string", "format": "date-time" },
    "message":        { "type": "string" },
    "customerMessage": { "type": ["string", "null"] }
  },
  "additionalProperties": true
}
```

---

## 3. What to change in the barista server

### Find the emit

Search for:

- `loyalty-point-added`
- or `io.emit(` after you update the customer’s points (e.g. after a QR scan).

### Before (example – do not use)

```javascript
io.emit('loyalty-point-added', {
  drink: drink,
  points: customer.points,
  totalOrders: customer.pastOrders ? customer.pastOrders.length : 0,
  timestamp: new Date(),
  message: `New order: ${drink} - Customer now has ${customer.points} points`
});
```

Problems: no `qrToken` (app can’t match user), `points` might be a string from DB.

### After (use this shape)

```javascript
io.emit('loyalty-point-added', {
  qrToken: customer.qrToken,
  userId: customer._id != null ? String(customer._id) : null,
  drink: drink || '',
  itemName: drink || '',
  points: Number(customer.points) || 0,
  totalOrders: customer.pastOrders ? customer.pastOrders.length : 0,
  timestamp: new Date(),
  message: `New order: ${drink || 'order'} - Customer now has ${customer.points} points`,
  customerMessage: null
});
```

### Helper function (optional)

You can centralize the payload in one place:

```javascript
function buildLoyaltyPointAddedPayload(customer, drink = '') {
  return {
    qrToken: customer.qrToken,
    userId: customer._id != null ? String(customer._id) : null,
    drink: drink,
    itemName: drink,
    points: Number(customer.points) || 0,
    totalOrders: Array.isArray(customer.pastOrders) ? customer.pastOrders.length : 0,
    timestamp: new Date(),
    message: `New order: ${drink || 'order'} - Customer now has ${customer.points} points`,
    customerMessage: null
  };
}

// Usage after updating customer points:
io.emit('loyalty-point-added', buildLoyaltyPointAddedPayload(customer, drink));
```

---

## 4. Checklist

- [ ] Emit event name is exactly `loyalty-point-added`.
- [ ] Payload includes `qrToken` (customer’s QR token).
- [ ] Payload includes `points` as a **number** (e.g. `Number(customer.points) || 0`).
- [ ] Optionally include `userId`, `drink`/`itemName`, `totalOrders`, `timestamp`, `message`, `customerMessage`.
- [ ] Restart barista server and test: scan QR on barista app, confirm mobile app loyalty tab updates in real time.

---

## 5. How the mobile app uses it

- Listens for socket event `loyalty-point-added`.
- Only applies the update if `data.qrToken === currentUserQrToken` (or `data.userId` matches).
- Uses `data.points` (expects a number) to update the loyalty UI.

If `qrToken` is missing or `points` is not a number, the app may ignore the event or behave incorrectly. Using this schema on the barista server keeps it aligned with the mobile-backend and avoids conflicts.
