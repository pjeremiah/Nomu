import 'package:flutter/material.dart';

/// Recent Orders header / receipt chip palette: navy tile, white symbol, cool edge highlight.
const Color kNomuOrderIconNavy = Color(0xFF242C5B);
const Color kNomuOrderIconNavyDeep = Color(0xFF3A4A8C);
const Color kNomuOrderIconBorderLight = Color(0xFF7FA3D4);

enum OrderHistoryIconKind { drink, donut, pastry, pizza }

/// Classify API `itemType` + `category` for Recent / Past order rows.
OrderHistoryIconKind classifyOrderHistoryIcon(String itemType, String category) {
  final t = itemType.toLowerCase().trim();
  final c = category.toLowerCase().trim();
  if (t == 'pizza' || t == 'pizzas' || c.contains('pizza')) {
    return OrderHistoryIconKind.pizza;
  }
  if (t == 'donut' || t == 'donuts' || c.contains('donut')) {
    return OrderHistoryIconKind.donut;
  }
  if (t == 'pastry' ||
      t == 'pasta' ||
      t == 'calzone' ||
      t == 'food' ||
      c.contains('pastry') ||
      c.contains('croissant') ||
      c.contains('danish')) {
    return OrderHistoryIconKind.pastry;
  }
  if (t == 'drink' ||
      t == 'coffee' ||
      c.contains('coffee') ||
      c.contains('latte') ||
      c.contains('tea') ||
      c.contains('milk') ||
      c.contains('brew')) {
    return OrderHistoryIconKind.drink;
  }
  return OrderHistoryIconKind.drink;
}

Widget _historyIconInner(OrderHistoryIconKind kind, double side, Color foreground) {
  switch (kind) {
    case OrderHistoryIconKind.pizza:
      return Icon(Icons.local_pizza_rounded, size: side, color: foreground);
    case OrderHistoryIconKind.donut:
      return Image.asset(
        'assets/images/donut.png',
        width: side,
        height: side,
        fit: BoxFit.contain,
        color: foreground,
        colorBlendMode: BlendMode.srcIn,
        errorBuilder: (_, __, ___) => Icon(Icons.donut_large, size: side, color: foreground),
      );
    case OrderHistoryIconKind.pastry:
      return Image.asset(
        'assets/images/croissant.png',
        width: side,
        height: side,
        fit: BoxFit.contain,
        color: foreground,
        colorBlendMode: BlendMode.srcIn,
        errorBuilder: (_, __, ___) => Icon(Icons.bakery_dining_outlined, size: side, color: foreground),
      );
    case OrderHistoryIconKind.drink:
      return Image.asset(
        'assets/images/coffee.png',
        width: side,
        height: side,
        fit: BoxFit.contain,
        color: foreground,
        colorBlendMode: BlendMode.srcIn,
        errorBuilder: (_, __, ___) => Icon(Icons.local_cafe_rounded, size: side, color: foreground),
      );
  }
}

/// Leading icon for order list tiles — same palette as the Recent Orders header receipt (navy tile, white art, soft blue edge).
Widget buildOrderHistoryLeadingIcon({
  required String itemType,
  required String category,
  required bool isRecent,
  double outerSize = 48,
}) {
  final kind = classifyOrderHistoryIcon(itemType, category);
  final inner = outerSize * 0.52;
  final iconFg = Colors.white;
  final border = kNomuOrderIconBorderLight.withValues(alpha: isRecent ? 0.55 : 0.35);

  return Container(
    width: outerSize,
    height: outerSize,
    decoration: BoxDecoration(
      gradient: isRecent
          ? const LinearGradient(
              colors: [kNomuOrderIconNavy, kNomuOrderIconNavyDeep],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            )
          : LinearGradient(
              colors: [
                Colors.grey[500]!,
                Colors.grey[600]!,
              ],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
      borderRadius: BorderRadius.circular(12),
      border: Border.all(color: border, width: 1.5),
      boxShadow: [
        BoxShadow(
          color: Colors.black.withValues(alpha: isRecent ? 0.12 : 0.08),
          blurRadius: 6,
          offset: const Offset(0, 2),
        ),
      ],
    ),
    child: Stack(
      clipBehavior: Clip.none,
      children: [
        Center(child: _historyIconInner(kind, inner, iconFg)),
        if (isRecent)
          Positioned(
            top: 1,
            right: 1,
            child: Container(
              width: 11,
              height: 11,
              decoration: const BoxDecoration(
                color: Colors.green,
                shape: BoxShape.circle,
              ),
            ),
          ),
      ],
    ),
  );
}
