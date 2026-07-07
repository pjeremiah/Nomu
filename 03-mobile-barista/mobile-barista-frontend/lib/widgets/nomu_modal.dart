import 'package:flutter/material.dart';
import '../theme/nomu_app_theme.dart';

/// Branded modal dialogs for the barista app (dark blue + gold).
class NomuModal {
  NomuModal._();

  static ThemeData wrapTheme(BuildContext context) {
    final base = Theme.of(context);
    return base.copyWith(
      colorScheme: base.colorScheme.copyWith(
        primary: NomuAppTheme.darkBlue,
        secondary: NomuAppTheme.goldBrown,
        surface: NomuAppTheme.white,
      ),
      dialogTheme: DialogThemeData(
        backgroundColor: NomuAppTheme.white,
        shape: RoundedRectangleBorder(borderRadius: NomuAppTheme.dialogRadius),
        elevation: 0,
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: NomuAppTheme.darkBlue,
          foregroundColor: NomuAppTheme.white,
          disabledBackgroundColor: NomuAppTheme.darkBlue.withValues(alpha: 0.35),
          elevation: 0,
          shape: RoundedRectangleBorder(borderRadius: NomuAppTheme.buttonRadius),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: NomuAppTheme.goldBrown,
          side: const BorderSide(color: NomuAppTheme.goldBrown, width: 1.5),
          shape: RoundedRectangleBorder(borderRadius: NomuAppTheme.buttonRadius),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(foregroundColor: NomuAppTheme.goldBrown),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: NomuAppTheme.neutral50,
        focusedBorder: OutlineInputBorder(
          borderRadius: NomuAppTheme.fieldRadius,
          borderSide: const BorderSide(color: NomuAppTheme.darkBlue, width: 2),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: NomuAppTheme.fieldRadius,
          borderSide: BorderSide(color: NomuAppTheme.neutral600.withValues(alpha: 0.25)),
        ),
        prefixIconColor: NomuAppTheme.darkBlue,
      ),
      chipTheme: base.chipTheme.copyWith(
        selectedColor: NomuAppTheme.darkBlue.withValues(alpha: 0.12),
        checkmarkColor: NomuAppTheme.darkBlue,
        deleteIconColor: NomuAppTheme.darkBlue,
        side: BorderSide(color: NomuAppTheme.goldBrown.withValues(alpha: 0.45)),
        labelStyle: const TextStyle(color: NomuAppTheme.darkBlue),
      ),
    );
  }

  static Widget _iconCircle(IconData icon, Color color) {
    return Center(
      child: Container(
        width: 56,
        height: 56,
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.12),
          shape: BoxShape.circle,
        ),
        child: Icon(icon, color: color, size: 28),
      ),
    );
  }

  static Widget _titleText(String title) {
    return Text(
      title,
      textAlign: TextAlign.center,
      style: const TextStyle(
        fontSize: 20,
        fontWeight: FontWeight.w700,
        color: NomuAppTheme.neutral900,
        letterSpacing: -0.3,
      ),
    );
  }

  static Widget _bodyText(String message) {
    return Text(
      message,
      textAlign: TextAlign.center,
      style: const TextStyle(
        fontSize: 15,
        height: 1.45,
        color: NomuAppTheme.neutral600,
      ),
    );
  }

  static Widget _shell({
    required double maxWidth,
    required Widget body,
    required List<Widget> buttons,
  }) {
    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: NomuAppTheme.dialogRadius),
      elevation: 0,
      backgroundColor: Colors.transparent,
      insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
      child: Container(
        constraints: BoxConstraints(maxWidth: maxWidth),
        decoration: BoxDecoration(
          color: NomuAppTheme.white,
          borderRadius: NomuAppTheme.dialogRadius,
          boxShadow: NomuAppTheme.dialogShadow,
        ),
        padding: const EdgeInsets.fromLTRB(24, 28, 24, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            body,
            const SizedBox(height: 24),
            Align(
              alignment: Alignment.bottomCenter,
              child: NomuAppTheme.modalBottomActions(
                dialogMaxWidth: maxWidth,
                buttons: buttons,
              ),
            ),
          ],
        ),
      ),
    );
  }

  static Widget outlineCancelButton({
    required String label,
    required VoidCallback onPressed,
  }) {
    return NomuAppTheme.outlineCancelButton(
      label: label,
      onPressed: onPressed,
    );
  }

  static Widget outlineConfirmButton({
    required String label,
    required VoidCallback? onPressed,
  }) {
    return NomuAppTheme.outlineConfirmButton(
      label: label,
      onPressed: onPressed,
    );
  }
  static Widget _singleActionButton({
    required String label,
    required VoidCallback onPressed,
  }) {
    return NomuAppTheme.outlineConfirmButton(
      label: label,
      onPressed: onPressed,
    );
  }

  /// Single-action info / OK modal.
  static Future<void> showMessage(
    BuildContext context, {
    required String title,
    required String message,
    IconData icon = Icons.info_outline_rounded,
    Color iconColor = NomuAppTheme.darkBlue,
    String primaryLabel = 'OK',
    VoidCallback? onPrimary,
  }) {
    final maxW = MediaQuery.sizeOf(context).width > 600
        ? 420.0
        : MediaQuery.sizeOf(context).width * 0.92;

    return showDialog<void>(
      context: context,
      builder: (ctx) => Theme(
        data: wrapTheme(context),
        child: _shell(
          maxWidth: maxW,
          body: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              _iconCircle(icon, iconColor),
              const SizedBox(height: 18),
              _titleText(title),
              const SizedBox(height: 12),
              _bodyText(message),
            ],
          ),
          buttons: [
            _singleActionButton(
              label: primaryLabel,
              onPressed: () {
                Navigator.of(ctx).pop();
                onPrimary?.call();
              },
            ),
          ],
        ),
      ),
    );
  }

  /// Two-action confirm modal — returns true when [confirmLabel] is pressed.
  static Future<bool?> showConfirm(
    BuildContext context, {
    required String title,
    required String message,
    IconData icon = Icons.help_outline_rounded,
    Color iconColor = NomuAppTheme.darkBlue,
    String cancelLabel = 'Cancel',
    String confirmLabel = 'Confirm',
  }) {
    final maxW = MediaQuery.sizeOf(context).width > 600
        ? 420.0
        : MediaQuery.sizeOf(context).width * 0.92;

    return showDialog<bool>(
      context: context,
      builder: (ctx) => Theme(
        data: wrapTheme(context),
        child: _shell(
          maxWidth: maxW,
          body: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              _iconCircle(icon, iconColor),
              const SizedBox(height: 18),
              _titleText(title),
              const SizedBox(height: 12),
              _bodyText(message),
            ],
          ),
          buttons: [
            outlineCancelButton(
              label: cancelLabel,
              onPressed: () => Navigator.of(ctx).pop(false),
            ),
            outlineConfirmButton(
              label: confirmLabel,
              onPressed: () => Navigator.of(ctx).pop(true),
            ),
          ],
        ),
      ),
    );
  }

  /// Rich content modal (e.g. transaction success details).
  static Future<void> showRich(
    BuildContext context, {
    required String title,
    required IconData icon,
    Color iconColor = NomuAppTheme.darkBlue,
    required Widget content,
    required String primaryLabel,
    VoidCallback? onPrimary,
    String? secondaryLabel,
    VoidCallback? onSecondary,
  }) {
    final maxW = MediaQuery.sizeOf(context).width > 600
        ? 460.0
        : MediaQuery.sizeOf(context).width * 0.92;

    final buttons = <Widget>[
      if (secondaryLabel != null)
        outlineCancelButton(
          label: secondaryLabel,
          onPressed: () {
            Navigator.of(context).pop();
            onSecondary?.call();
          },
        ),
      if (secondaryLabel != null)
        outlineConfirmButton(
          label: primaryLabel,
          onPressed: () {
            Navigator.of(context).pop();
            onPrimary?.call();
          },
        )
      else
        _singleActionButton(
          label: primaryLabel,
          onPressed: () {
            Navigator.of(context).pop();
            onPrimary?.call();
          },
        ),
    ];

    return showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => Theme(
        data: wrapTheme(context),
        child: _shell(
          maxWidth: maxW,
          body: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              _iconCircle(icon, iconColor),
              const SizedBox(height: 18),
              _titleText(title),
              const SizedBox(height: 16),
              content,
            ],
          ),
          buttons: buttons,
        ),
      ),
    );
  }

  static Widget detailPanel({required List<Widget> rows}) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: NomuAppTheme.darkBlue.withValues(alpha: 0.05),
        borderRadius: NomuAppTheme.buttonRadius,
        border: Border.all(color: NomuAppTheme.goldBrown.withValues(alpha: 0.35)),
      ),
      child: Column(mainAxisSize: MainAxisSize.min, children: rows),
    );
  }

  static Widget detailRow(String label, String value, {String? emoji}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (emoji != null) ...[
            Text(emoji, style: const TextStyle(fontSize: 16)),
            const SizedBox(width: 8),
          ],
          Expanded(
            child: Text(
              label,
              style: const TextStyle(
                color: NomuAppTheme.neutral600,
                fontWeight: FontWeight.w500,
                fontSize: 14,
              ),
            ),
          ),
          Flexible(
            child: Text(
              value,
              textAlign: TextAlign.right,
              style: const TextStyle(
                color: NomuAppTheme.darkBlue,
                fontWeight: FontWeight.w700,
                fontSize: 14,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
