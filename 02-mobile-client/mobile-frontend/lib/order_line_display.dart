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

/// First line for order bullets: name + `(Type)` + optional `(Free)` — no quantity.
String orderLineBulletPrimaryLabel(
  String rawName,
  Map<String, dynamic> line,
  String typeDisplayName,
) {
  final trimmed = rawName.trim();
  final base = trimmed.isEmpty ? 'Unknown Item' : trimmed;
  final t = typeDisplayName.trim();
  final typePart = t.isEmpty ? '' : ' ($t)';
  if (!isFreeRewardOrderLine(line)) {
    return '$base$typePart';
  }
  if (trimmed.isEmpty) {
    return '(Free)$typePart';
  }
  return '$base$typePart (Free)';
}

/// Second line when quantity > 1, e.g. `2 pcs`.
String? orderLineBulletQuantityLine(int quantity) {
  if (quantity <= 1) return null;
  return '$quantity pcs';
}
