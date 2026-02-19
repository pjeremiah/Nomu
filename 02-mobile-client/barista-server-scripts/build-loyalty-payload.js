/**
 * Barista server – build loyalty-point-added payload
 *
 * Copy this function into your barista server, or require this file and use
 * buildLoyaltyPointAddedPayload(customer, options).
 *
 * Usage in barista server after updating customer points:
 *   const payload = buildLoyaltyPointAddedPayload(customer, { drink: 'Sakura Latte (Iced)' });
 *   io.emit('loyalty-point-added', payload);
 */

/**
 * Build the payload for the 'loyalty-point-added' socket event.
 * @param {object} customer - Customer doc (must have qrToken, points; may have _id, pastOrders)
 * @param {object} options - Optional: drink, itemName, message, customerMessage
 * @returns {object} Payload to send via io.emit('loyalty-point-added', payload)
 */
function buildLoyaltyPointAddedPayload(customer, options = {}) {
  const drink = options.drink != null ? String(options.drink) : '';
  const points = Number(customer.points) || 0;
  const totalOrders = Array.isArray(customer.pastOrders) ? customer.pastOrders.length : 0;

  return {
    qrToken: customer.qrToken != null ? String(customer.qrToken) : '',
    userId: customer._id != null ? String(customer._id) : null,
    drink,
    itemName: options.itemName != null ? String(options.itemName) : drink,
    points,
    totalOrders,
    timestamp: new Date(),
    message: options.message != null
      ? String(options.message)
      : `New order: ${drink || 'order'} - Customer now has ${points} points`,
    customerMessage: options.customerMessage != null ? String(options.customerMessage) : null,
  };
}

// Example usage (for reference; barista server would have io, customer, drink from its own flow):
// const payload = buildLoyaltyPointAddedPayload(customer, { drink: 'Sakura Latte (Iced)' });
// io.emit('loyalty-point-added', payload);

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { buildLoyaltyPointAddedPayload };
}
