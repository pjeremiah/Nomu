// Display: "(Free)" only for loyalty reward pickups (rewardBucket + no positive unit price).

/// Unit price from a past-order line; paid purchases are always > 0 after scan-multiple enrich.
double _lineUnitPrice(Map<String, dynamic> line) {
  final p = line['price'];
  if (p is num) return p.toDouble();
  if (p is String) return double.tryParse(p) ?? 0;
  return 0;
}

/// True for shop redemptions only — not items the customer bought (those have [price] > 0).
bool isFreeRewardOrderLine(Map<String, dynamic> line) {
  final rb = line['rewardBucket']?.toString().trim();
  if (rb == null || rb.isEmpty) return false;
  if (_lineUnitPrice(line) > 0) return false;
  return true;
}

Map<String, dynamic> orderLineAsMap(dynamic raw) {
  if (raw is Map<String, dynamic>) return raw;
  if (raw is Map) return Map<String, dynamic>.from(raw);
  return {};
}

/// e.g. `Nomu Latte (Free)` for loyalty redemptions; plain name for paid lines.
String orderLineDisplayName(String rawName, Map<String, dynamic> line) {
  final trimmed = rawName.trim();
  final base = trimmed.isEmpty ? 'Unknown Item' : trimmed;
  if (!isFreeRewardOrderLine(line)) return base;
  if (trimmed.isEmpty) return '(Free)';
  return '$trimmed (Free)';
}

/// Recent Orders bullets / detail rows: `Americano (Drink)` or `Americano (Drink) (Free)`.
String orderLineBulletLabel(
  String rawName,
  Map<String, dynamic> line,
  String typeDisplayName, {
  int quantity = 1,
}) {
  final trimmed = rawName.trim();
  final base = trimmed.isEmpty ? 'Unknown Item' : trimmed;
  final q = quantity > 1 ? ' × $quantity' : '';
  final t = typeDisplayName.trim();
  final typePart = t.isEmpty ? '' : ' ($t)';
  if (!isFreeRewardOrderLine(line)) {
    return '$base$q$typePart';
  }
  if (trimmed.isEmpty) {
    return '(Free)$q$typePart';
  }
  return '$base$q$typePart (Free)';
}
