# Mechanic Notification System

This document explains the new mechanic notification system that allows mechanics to notify customers about order completion and loyalty points.

## Overview

The system allows mechanics to:
1. Notify customers when their order is completed
2. Automatically check if the customer spent at least ₱100 to earn loyalty points
3. Send real-time notifications to the customer's mobile app
4. Send email notifications with order details and loyalty information

## Backend API

### Endpoint: POST `/api/mechanic/notify-order-completion`

**Request Body:**
```json
{
  "qrToken": "customer_qr_token_here",
  "orderTotal": 150.00,
  "employeeId": "employee_123",
  "orderItems": [
    {
      "itemName": "Cappuccino",
      "itemType": "drink",
      "category": "coffee",
      "price": 120.00,
      "quantity": 1
    },
    {
      "itemName": "Croissant",
      "itemType": "food",
      "category": "pastry",
      "price": 30.00,
      "quantity": 1
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Customer notified successfully",
  "orderId": "order_1234567890_abc123",
  "orderTotal": 150.00,
  "pointsAdded": 1,
  "currentPoints": 5,
  "isEligibleForPoints": true,
  "loyaltyMessage": "Congratulations! You've earned 1 loyalty point for spending ₱150.00. You now have 5 points."
}
```

## Loyalty Points Rules

- **Minimum Spending**: ₱100.00 required to earn loyalty points
- **Points Earned**: 1 point per order (if eligible)
- **Notification Messages**:
  - If eligible: "Congratulations! You've earned 1 loyalty point for spending ₱X. You now have Y points."
  - If not eligible: "Thank you for your order! Spend at least ₱100 next time to earn loyalty points. You need ₱Z more."

## Frontend Integration

The mobile app automatically receives and displays order completion notifications through:

1. **Real-time Socket Notifications**: Instant notifications via WebSocket
2. **Email Notifications**: Detailed email with order summary
3. **In-App Dialogs**: Beautiful dialog showing order details and loyalty status
4. **Snackbar Notifications**: Quick notifications for order completion

## Usage Example

### For Mechanics (Backend Integration)

```javascript
// Example: Notify customer about completed order
const response = await fetch('/api/mechanic/notify-order-completion', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    qrToken: 'customer_qr_token',
    orderTotal: 150.00,
    employeeId: 'employee_123',
    orderItems: [
      {
        itemName: 'Cappuccino',
        itemType: 'drink',
        category: 'coffee',
        price: 120.00,
        quantity: 1
      }
    ]
  })
});

const result = await response.json();
console.log('Notification sent:', result);
```

### For Mobile App (Frontend Integration)

The mobile app automatically handles notifications through the `OrderCompletionNotificationService`. No additional integration needed - notifications will appear automatically when orders are completed.

## Features

1. **Automatic Loyalty Validation**: Checks if order total meets ₱100 minimum
2. **Real-time Notifications**: Instant updates via WebSocket
3. **Email Notifications**: Detailed order summaries sent to customer email
4. **Order History**: Orders are automatically added to customer's order history
5. **Points Tracking**: Loyalty points are updated in real-time
6. **Beautiful UI**: Professional notification dialogs and snackbars

## Security

- QR token validation ensures notifications go to correct customer
- Employee ID tracking for audit purposes
- Rate limiting prevents spam notifications
- Input validation on all order data

## Error Handling

- Invalid QR tokens return 404 error
- Missing required fields return 400 error
- Server errors return 500 error with details
- Frontend gracefully handles connection issues

## Testing

To test the system:

1. Use a valid customer QR token
2. Send order completion notification with order total ≥ ₱100
3. Check customer's mobile app for notification
4. Verify loyalty points were added
5. Check email for notification

## Configuration

The minimum spending requirement can be changed by modifying the `MINIMUM_SPENDING` constant in the backend code (currently set to 100 pesos).
