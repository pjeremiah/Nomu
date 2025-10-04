import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../constants/app_constants.dart';

enum ToastType {
  success,
  error,
  warning,
  info,
}

class CustomToast extends StatefulWidget {
  final String message;
  final ToastType type;
  final Duration duration;
  final VoidCallback? onTap;
  final VoidCallback? onDismiss;
  final IconData? icon;
  final Color? backgroundColor;
  final Color? textColor;
  final bool showProgress;

  const CustomToast({
    super.key,
    required this.message,
    required this.type,
    this.duration = const Duration(seconds: 3),
    this.onTap,
    this.onDismiss,
    this.icon,
    this.backgroundColor,
    this.textColor,
    this.showProgress = false,
  });

  @override
  State<CustomToast> createState() => _CustomToastState();

  // Static methods for easy usage
  static void showSuccess(
    BuildContext context, {
    required String message,
    Duration? duration,
    VoidCallback? onTap,
  }) {
    _showToast(
      context,
      message: message,
      type: ToastType.success,
      duration: duration,
      onTap: onTap,
    );
  }

  static void showError(
    BuildContext context, {
    required String message,
    Duration? duration,
    VoidCallback? onTap,
  }) {
    _showToast(
      context,
      message: message,
      type: ToastType.error,
      duration: duration,
      onTap: onTap,
    );
  }

  static void showWarning(
    BuildContext context, {
    required String message,
    Duration? duration,
    VoidCallback? onTap,
  }) {
    _showToast(
      context,
      message: message,
      type: ToastType.warning,
      duration: duration,
      onTap: onTap,
    );
  }

  static void showInfo(
    BuildContext context, {
    required String message,
    Duration? duration,
    VoidCallback? onTap,
  }) {
    _showToast(
      context,
      message: message,
      type: ToastType.info,
      duration: duration,
      onTap: onTap,
    );
  }

  static void _showToast(
    BuildContext context, {
    required String message,
    required ToastType type,
    Duration? duration,
    VoidCallback? onTap,
  }) {
    final overlay = Overlay.of(context);
    late OverlayEntry overlayEntry;

    overlayEntry = OverlayEntry(
      builder: (context) => Positioned(
        top: MediaQuery.of(context).padding.top + 20,
        left: 20,
        right: 20,
        child: CustomToast(
          message: message,
          type: type,
          duration: duration ?? AppConstants.snackbarDuration,
          onTap: onTap,
          onDismiss: () => overlayEntry.remove(),
        ),
      ),
    );

    overlay.insert(overlayEntry);

    // Auto remove after duration
    Future.delayed(duration ?? AppConstants.snackbarDuration, () {
      overlayEntry.remove();
    });
  }
}

class _CustomToastState extends State<CustomToast>
    with TickerProviderStateMixin {
  late AnimationController _slideController;
  late AnimationController _fadeController;
  late AnimationController _progressController;
  late Animation<Offset> _slideAnimation;
  late Animation<double> _fadeAnimation;
  late Animation<double> _progressAnimation;

  @override
  void initState() {
    super.initState();
    
    _slideController = AnimationController(
      duration: const Duration(milliseconds: 400),
      vsync: this,
    );
    
    _fadeController = AnimationController(
      duration: const Duration(milliseconds: 300),
      vsync: this,
    );

    _progressController = AnimationController(
      duration: widget.duration,
      vsync: this,
    );

    _slideAnimation = Tween<Offset>(
      begin: const Offset(0, -1),
      end: Offset.zero,
    ).animate(CurvedAnimation(
      parent: _slideController,
      curve: Curves.elasticOut,
    ));

    _fadeAnimation = Tween<double>(
      begin: 0.0,
      end: 1.0,
    ).animate(CurvedAnimation(
      parent: _fadeController,
      curve: Curves.easeOut,
    ));

    _progressAnimation = Tween<double>(
      begin: 0.0,
      end: 1.0,
    ).animate(CurvedAnimation(
      parent: _progressController,
      curve: Curves.linear,
    ));

    // Start animations
    _slideController.forward();
    _fadeController.forward();
    
    if (widget.showProgress) {
      _progressController.forward();
    }

    // Add haptic feedback
    _addHapticFeedback();
  }

  void _addHapticFeedback() {
    switch (widget.type) {
      case ToastType.success:
        HapticFeedback.lightImpact();
        break;
      case ToastType.error:
        HapticFeedback.heavyImpact();
        break;
      case ToastType.warning:
        HapticFeedback.mediumImpact();
        break;
      case ToastType.info:
        HapticFeedback.selectionClick();
        break;
    }
  }

  @override
  void dispose() {
    _slideController.dispose();
    _fadeController.dispose();
    _progressController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SlideTransition(
      position: _slideAnimation,
      child: FadeTransition(
        opacity: _fadeAnimation,
        child: _buildToastCard(),
      ),
    );
  }

  Widget _buildToastCard() {
    final theme = _getToastTheme();
    
    return GestureDetector(
      onTap: widget.onTap,
      child: Container(
        constraints: BoxConstraints(
          maxWidth: MediaQuery.of(context).size.width * 0.9,
          minHeight: 60,
        ),
        decoration: BoxDecoration(
          color: theme.backgroundColor,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: theme.backgroundColor.withOpacity(0.3),
              blurRadius: 20,
              spreadRadius: 2,
              offset: const Offset(0, 8),
            ),
            BoxShadow(
              color: Colors.black.withOpacity(0.1),
              blurRadius: 10,
              spreadRadius: 1,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(16),
          child: Stack(
            children: [
              // Background gradient
              Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [
                      theme.backgroundColor,
                      theme.backgroundColor.withOpacity(0.8),
                    ],
                  ),
                ),
              ),
              // Content
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                child: Row(
                  children: [
                    // Icon
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.2),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Icon(
                        widget.icon ?? theme.icon,
                        color: theme.textColor,
                        size: 20,
                      ),
                    ),
                    const SizedBox(width: 12),
                    // Message
                    Expanded(
                      child: Text(
                        widget.message,
                        style: TextStyle(
                          color: theme.textColor,
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                          height: 1.4,
                          decoration: TextDecoration.none,
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    // Dismiss button
                    GestureDetector(
                      onTap: widget.onDismiss,
                      child: Container(
                        padding: const EdgeInsets.all(4),
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.2),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Icon(
                          Icons.close,
                          color: theme.textColor,
                          size: 16,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              // Progress bar
              if (widget.showProgress)
                Positioned(
                  bottom: 0,
                  left: 0,
                  right: 0,
                  child: AnimatedBuilder(
                    animation: _progressAnimation,
                    builder: (context, child) {
                      return LinearProgressIndicator(
                        value: _progressAnimation.value,
                        backgroundColor: Colors.white.withOpacity(0.3),
                        valueColor: AlwaysStoppedAnimation<Color>(theme.textColor),
                        minHeight: 3,
                      );
                    },
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  _ToastTheme _getToastTheme() {
    switch (widget.type) {
      case ToastType.success:
        return _ToastTheme(
          backgroundColor: const Color(0xFF4CAF50),
          textColor: Colors.white,
          icon: Icons.check_circle,
        );
      case ToastType.error:
        return _ToastTheme(
          backgroundColor: const Color(0xFFF44336),
          textColor: Colors.white,
          icon: Icons.error,
        );
      case ToastType.warning:
        return _ToastTheme(
          backgroundColor: const Color(0xFFFF9800),
          textColor: Colors.white,
          icon: Icons.warning,
        );
      case ToastType.info:
        return _ToastTheme(
          backgroundColor: const Color(0xFF2196F3),
          textColor: Colors.white,
          icon: Icons.info,
        );
    }
  }
}

class _ToastTheme {
  final Color backgroundColor;
  final Color textColor;
  final IconData icon;

  const _ToastTheme({
    required this.backgroundColor,
    required this.textColor,
    required this.icon,
  });
}
