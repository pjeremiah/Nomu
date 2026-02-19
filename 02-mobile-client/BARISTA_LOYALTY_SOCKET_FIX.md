# Barista server – loyalty socket fix (5+ points / blank screen)

If your **barista** server is a separate codebase from `mobile-backend` and it emits `loyalty-point-added` **without** `qrToken`, the mobile app cannot know which user the update is for. The loyalty page may then misbehave or show a blank screen when the user has 5+ points.

## Fix: include `qrToken` and `userId` in the emit

In your barista server, find where you emit after a loyalty scan, e.g.:

```javascript
io.emit('loyalty-point-added', {
  drink: drink,
  points: customer.points,
  totalOrders: customer.pastOrders ? customer.pastOrders.length : 0,
  timestamp: new Date(),
  message: `New order: ${drink} - Customer now has ${customer.points} points`
});
```

**Replace it with** (add `qrToken` and `userId`, and ensure `points` is a number):

```javascript
io.emit('loyalty-point-added', {
  qrToken: customer.qrToken,        // required so the app can match the current user
  userId: customer._id ? customer._id.toString() : null,
  drink: drink,
  itemName: drink,
  points: Number(customer.points) ?? 0,
  totalOrders: customer.pastOrders ? customer.pastOrders.length : 0,
  timestamp: new Date(),
  message: `New order: ${drink} - Customer now has ${customer.points} points`,
  customerMessage: null
});
```

- **qrToken** – Used by the app to decide if the update is for the logged-in user. Without it, the app ignores the event.
- **userId** – Optional; app can use it as a fallback to match the user.
- **points** – Send as a number so the app does not crash on parse (e.g. `Number(customer.points) ?? 0`).

## mobile-backend (this repo)

`mobile-backend/server.js` already emits `qrToken` and `userId` in both loyalty scan flows. No change needed there unless you run a different barista server that does not.
