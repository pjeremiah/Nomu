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

  /// Gold-outline cancel (matches client logout modal).
  static ButtonStyle get modalCancelOutlineStyle => OutlinedButton.styleFrom(
        backgroundColor: white,
        foregroundColor: goldBrown,
        side: const BorderSide(color: goldBrown),
        padding: const EdgeInsets.symmetric(vertical: 14),
        textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
        shape: RoundedRectangleBorder(borderRadius: buttonRadius),
      );

  /// Dark-blue-outline confirm (matches client logout modal).
  static ButtonStyle get modalConfirmOutlineStyle => OutlinedButton.styleFrom(
        backgroundColor: white,
        foregroundColor: darkBlue,
        disabledBackgroundColor: white,
        disabledForegroundColor: darkBlue.withValues(alpha: 0.35),
        side: const BorderSide(color: darkBlue),
        padding: const EdgeInsets.symmetric(vertical: 14),
        textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
        shape: RoundedRectangleBorder(borderRadius: buttonRadius),
      );

  static Widget outlineCancelButton({
    required String label,
    required VoidCallback onPressed,
  }) {
    return OutlinedButton(
      onPressed: onPressed,
      style: modalCancelOutlineStyle,
      child: Text(label),
    );
  }

  static Widget outlineConfirmButton({
    required String label,
    required VoidCallback? onPressed,
  }) {
    return OutlinedButton(
      onPressed: onPressed,
      style: modalConfirmOutlineStyle,
      child: Text(label, textAlign: TextAlign.center),
    );
  }

  /// Inventory modal: Cancel and Complete Transaction side-by-side.
  static Widget inventorySelectionActions({
    required VoidCallback onCancel,
    required VoidCallback? onComplete,
    String cancelLabel = 'Cancel',
    String completeLabel = 'Complete Transaction',
  }) {
    return Row(
      children: [
        Expanded(
          child: outlineCancelButton(label: cancelLabel, onPressed: onCancel),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: outlineConfirmButton(
            label: completeLabel,
            onPressed: onComplete,
          ),
        ),
      ],
    );
  }

  /// Modal action buttons at the bottom. Two buttons sit side-by-side (client app style);
  /// one or three+ buttons stack vertically and stay centered.
  static Widget modalBottomActions({
    required double dialogMaxWidth,
    required List<Widget> buttons,
    bool forceVertical = false,
  }) {
    if (!forceVertical && buttons.length == 2) {
      return Row(
        children: [
          for (var i = 0; i < buttons.length; i++) ...[
            if (i > 0) const SizedBox(width: 12),
            Expanded(child: buttons[i]),
          ],
        ],
      );
    }

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
