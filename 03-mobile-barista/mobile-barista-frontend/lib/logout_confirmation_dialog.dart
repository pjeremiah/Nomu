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
              child: Align(
                alignment: Alignment.bottomCenter,
                child: NomuAppTheme.modalBottomActions(
                  dialogMaxWidth: 340,
                  buttons: [
                    OutlinedButton(
                      onPressed: () => Navigator.pop(dialogContext, false),
                      style: OutlinedButton.styleFrom(
                        backgroundColor: NomuAppTheme.white,
                        foregroundColor: NomuAppTheme.goldBrown,
                        side: const BorderSide(color: NomuAppTheme.goldBrown),
                        padding: EdgeInsets.zero,
                        minimumSize: Size.zero,
                        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        alignment: Alignment.center,
                        textStyle: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                          height: 1.0,
                        ),
                        shape: RoundedRectangleBorder(
                          borderRadius: NomuAppTheme.buttonRadius,
                        ),
                      ),
                      child: const Text('Cancel'),
                    ),
                    OutlinedButton(
                      onPressed: () => Navigator.pop(dialogContext, true),
                      style: OutlinedButton.styleFrom(
                        backgroundColor: NomuAppTheme.white,
                        foregroundColor: NomuAppTheme.darkBlue,
                        side: const BorderSide(color: NomuAppTheme.darkBlue),
                        padding: EdgeInsets.zero,
                        minimumSize: Size.zero,
                        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        alignment: Alignment.center,
                        textStyle: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                          height: 1.0,
                        ),
                        shape: RoundedRectangleBorder(
                          borderRadius: NomuAppTheme.buttonRadius,
                        ),
                      ),
                      child: const Text('Log Out'),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    ),
  );
}
