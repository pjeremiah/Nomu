import 'package:flutter/material.dart';

/// Nomu brand colors — aligned with customer app [AppTheme].
class NomuAppTheme {
  NomuAppTheme._();

  static const Color darkBlue = Color(0xFF1B2A59);
  static const Color darkBlueAlt = Color(0xFF212C59);
  static const Color gold = Color(0xFFD4A84B);
  static const Color goldBrown = Color(0xFFB8860B);
  static const Color goldDark = Color(0xFFB8923D);

  static const Color white = Color(0xFFFFFFFF);
  static const Color neutral50 = Color(0xFFF8F9FA);
  static const Color neutral600 = Color(0xFF495057);
  static const Color neutral900 = Color(0xFF0D0D0D);

  static const Color success = Color(0xFF2E7D32);
  static const Color successLight = Color(0xFFE6F4E6);
  static const Color error = Color(0xFFC62828);

  static BorderRadius get dialogRadius => BorderRadius.circular(24);
  static BorderRadius get buttonRadius => BorderRadius.circular(12);
  static BorderRadius get fieldRadius => BorderRadius.circular(12);

  static List<BoxShadow> get dialogShadow => [
        BoxShadow(
          color: neutral900.withValues(alpha: 0.12),
          blurRadius: 24,
          offset: const Offset(0, 8),
        ),
      ];

  /// Modal action buttons stacked and centered at the bottom.
  static Widget modalBottomActions({
    required double dialogMaxWidth,
    required List<Widget> buttons,
  }) {
    final buttonWidth = (dialogMaxWidth - 48).clamp(220.0, 300.0);
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        for (var i = 0; i < buttons.length; i++) ...[
          if (i > 0) const SizedBox(height: 10),
          SizedBox(
            width: buttonWidth,
            height: 48,
            child: buttons[i],
          ),
        ],
      ],
    );
  }
}
