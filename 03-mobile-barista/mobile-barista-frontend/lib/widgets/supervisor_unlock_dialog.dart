import 'package:flutter/material.dart';
import '../api/api.dart';
import '../theme/nomu_app_theme.dart';
import '../utils/logger.dart';
import 'nomu_modal.dart';

/// Block modal with manager/owner credential fields and a Confirm button to unblock scanning.
class SupervisorUnlockDialog {
  SupervisorUnlockDialog._();

  static Future<bool> show(
    BuildContext context, {
    required String blockedEmployeeId,
    required String message,
  }) async {
    final emailController = TextEditingController();
    final passwordController = TextEditingController();
    var obscurePassword = true;
    var isSubmitting = false;
    String? errorMessage;

    final body = message.trim().isNotEmpty
        ? message.trim()
        : 'Suspicious activity was detected. A manager or owner must unlock your scanner before you can continue.';

    final result = await showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setState) {
            Future<void> submit() async {
              final email = emailController.text.trim();
              final password = passwordController.text;

              if (email.isEmpty || password.isEmpty) {
                setState(() {
                  errorMessage = 'Enter manager or owner email and password.';
                });
                return;
              }

              setState(() {
                isSubmitting = true;
                errorMessage = null;
              });

              final response = await ApiService.unlockBaristaScanner(
                blockedEmployeeId: blockedEmployeeId,
                supervisorEmail: email,
                supervisorPassword: password,
              );

              if (!context.mounted) return;

              if (response != null && response['success'] == true) {
                Logger.success('Scanner unlocked by supervisor', 'SECURITY');
                Navigator.of(ctx).pop(true);
                return;
              }

              setState(() {
                isSubmitting = false;
                errorMessage = response?['error']?.toString() ??
                    'Could not unlock scanner. Check manager or owner credentials.';
              });
            }

            final maxW = MediaQuery.sizeOf(context).width > 600
                ? 420.0
                : MediaQuery.sizeOf(context).width * 0.92;

            return Theme(
              data: NomuModal.wrapTheme(context),
              child: Dialog(
                shape: RoundedRectangleBorder(borderRadius: NomuAppTheme.dialogRadius),
                insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
                child: Container(
                  constraints: BoxConstraints(maxWidth: maxW),
                  padding: const EdgeInsets.fromLTRB(24, 28, 24, 24),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 56,
                        height: 56,
                        decoration: BoxDecoration(
                          color: NomuAppTheme.error.withValues(alpha: 0.12),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(
                          Icons.shield_outlined,
                          color: NomuAppTheme.error,
                          size: 28,
                        ),
                      ),
                      const SizedBox(height: 18),
                      const Text(
                        'Scan blocked',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.w700,
                          color: NomuAppTheme.neutral900,
                        ),
                      ),
                      const SizedBox(height: 12),
                      Text(
                        body,
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          fontSize: 15,
                          height: 1.45,
                          color: NomuAppTheme.neutral600,
                        ),
                      ),
                      const SizedBox(height: 8),
                      const Text(
                        'Enter manager or owner credentials to unblock this account.',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 14,
                          height: 1.4,
                          color: NomuAppTheme.neutral600,
                        ),
                      ),
                      const SizedBox(height: 20),
                      TextField(
                        controller: emailController,
                        keyboardType: TextInputType.emailAddress,
                        autocorrect: false,
                        enabled: !isSubmitting,
                        decoration: const InputDecoration(
                          labelText: 'Manager / owner email',
                          prefixIcon: Icon(Icons.email_outlined),
                        ),
                      ),
                      const SizedBox(height: 12),
                      TextField(
                        controller: passwordController,
                        obscureText: obscurePassword,
                        enabled: !isSubmitting,
                        decoration: InputDecoration(
                          labelText: 'Manager / owner password',
                          prefixIcon: const Icon(Icons.lock_outline),
                          suffixIcon: IconButton(
                            icon: Icon(
                              obscurePassword ? Icons.visibility_off : Icons.visibility,
                            ),
                            onPressed: isSubmitting
                                ? null
                                : () => setState(() {
                                      obscurePassword = !obscurePassword;
                                    }),
                          ),
                        ),
                        onSubmitted: isSubmitting ? null : (_) => submit(),
                      ),
                      if (errorMessage != null) ...[
                        const SizedBox(height: 12),
                        Text(
                          errorMessage!,
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            color: NomuAppTheme.error,
                            fontSize: 14,
                          ),
                        ),
                      ],
                      const SizedBox(height: 24),
                      NomuAppTheme.modalBottomActions(
                        dialogMaxWidth: maxW,
                        buttons: [
                          NomuModal.outlineConfirmButton(
                            label: isSubmitting ? 'Confirming…' : 'Confirm',
                            onPressed: isSubmitting ? null : submit,
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            );
          },
        );
      },
    );

    emailController.dispose();
    passwordController.dispose();
    return result == true;
  }
}
