import 'package:flutter/material.dart';
import 'theme/nomu_app_theme.dart';

/// Log out confirmation — matches customer app
/// [02-mobile-client/mobile-frontend/lib/logout_confirmation_dialog.dart].
Future<bool?> showBaristaLogoutConfirmationDialog(BuildContext context) {
  return showDialog<bool>(
    context: context,
    barrierDismissible: false,
    builder: (dialogContext) => Dialog(
      shape: RoundedRectangleBorder(borderRadius: NomuAppTheme.dialogRadius),
      elevation: 0,
      backgroundColor: Colors.transparent,
      child: Container(
        constraints: const BoxConstraints(maxWidth: 340),
        decoration: BoxDecoration(
          color: NomuAppTheme.white,
          borderRadius: NomuAppTheme.dialogRadius,
          boxShadow: NomuAppTheme.dialogShadow,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: 28),
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                color: NomuAppTheme.darkBlue.withValues(alpha: 0.12),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.logout_rounded,
                color: NomuAppTheme.darkBlue,
                size: 28,
              ),
            ),
            const SizedBox(height: 20),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Text(
                'Log Out',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w700,
                  color: NomuAppTheme.neutral900,
                  letterSpacing: -0.3,
                ),
              ),
            ),
            const SizedBox(height: 12),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Text(
                'Are you sure you want to log out? You will need to sign in again to access your account.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 15,
                  height: 1.5,
                  color: NomuAppTheme.neutral600,
                ),
              ),
            ),
            const SizedBox(height: 28),
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
              child: Row(
                children: [
                  Expanded(
                    child: NomuAppTheme.outlineCancelButton(
                      label: 'Cancel',
                      onPressed: () => Navigator.pop(dialogContext, false),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: NomuAppTheme.outlineConfirmButton(
                      label: 'Log Out',
                      onPressed: () => Navigator.pop(dialogContext, true),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    ),
  );
}
