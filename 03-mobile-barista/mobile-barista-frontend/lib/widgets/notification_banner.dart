import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../constants/app_constants.dart';

enum BannerType {
  success,
  error,
  warning,
  info,
  loading,
}

class NotificationBanner extends StatefulWidget {
  final String title;
  final String? message;
  final BannerType type;
  final Duration duration;
  final VoidCallback? onTap;
  final VoidCallback? onDismiss;
  final IconData? icon;
  final Color? backgroundColor;
  final Color? textColor;
  final bool showProgress;
  final double? progress;
  final Widget? action;

  const NotificationBanner({
    super.key,
    required this.title,
    this.message,
    required this.type,
    this.duration = const Duration(seconds: 4),
    this.onTap,
    this.onDismiss,
    this.icon,
    this.backgroundColor,
    this.textColor,
    this.showProgress = false,
    this.progress,
    this.action,
  });

  @override
  State<NotificationBanner> createState() => _NotificationBannerState();

  // Static methods for easy usage
  static void showSuccess(
    BuildContext context, {
    required String title,
    String? message,
    Duration? duration,
    VoidCallback? onTap,
    VoidCallback? onDismiss,
    Widget? action,
  }) {
    _showBanner(
      context,
      title: title,
      message: message,
      type: BannerType.success,
      duration: duration,
      onTap: onTap,
      onDismiss: onDismiss,
      action: action,
    );
  }

  static void showError(
    BuildContext context, {
    required String title,
    String? message,
    Duration? duration,
    VoidCallback? onTap,
    VoidCallback? onDismiss,
    Widget? action,
  }) {
    _showBanner(
      context,
      title: title,
      message: message,
      type: BannerType.error,
      duration: duration,
      onTap: onTap,
      onDismiss: onDismiss,
      action: action,
    );
  }

  static void showWarning(
    BuildContext context, {
    required String title,
    String? message,
    Duration? duration,
    VoidCallback? onTap,
    VoidCallback? onDismiss,
    Widget? action,
  }) {
    _showBanner(
      context,
      title: title,
      message: message,
      type: BannerType.warning,
      duration: duration,
      onTap: onTap,
      onDismiss: onDismiss,
      action: action,
    );
  }

  static void showInfo(
    BuildContext context, {
    required String title,
    String? message,
    Duration? duration,
    VoidCallback? onTap,
    VoidCallback? onDismiss,
    Widget? action,
  }) {
    _showBanner(
      context,
      title: title,
      message: message,
      type: BannerType.info,
      duration: duration,
      onTap: onTap,
      onDismiss: onDismiss,
      action: action,
    );
  }

  static void showLoading(
    BuildContext context, {
    required String title,
    String? message,
    Duration? duration,
    VoidCallback? onDismiss,
  }) {
    _showBanner(
      context,
      title: title,
      message: message,
      type: BannerType.loading,
      duration: duration,
      onDismiss: onDismiss,
    );
  }

  static void _showBanner(
    BuildContext context, {
    required String title,
    String? message,
    required BannerType type,
    Duration? duration,
    VoidCallback? onTap,
    VoidCallback? onDismiss,
    Widget? action,
  }) {
    final overlay = Overlay.of(context);
    late OverlayEntry overlayEntry;

    overlayEntry = OverlayEntry(
      builder: (context) => Positioned(
        top: MediaQuery.of(context).padding.top + 10,
        left: 16,
        right: 16,
        child: NotificationBanner(
          title: title,
          message: message,
          type: type,
          duration: duration ?? AppConstants.snackbarDuration,
          onTap: onTap,
          onDismiss: () => overlayEntry.remove(),
          action: action,
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

class _NotificationBannerState extends State<NotificationBanner>
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
      duration: const Duration(milliseconds: 500),
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
      curve: Curves.easeOutBack,
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
      case BannerType.success:
        HapticFeedback.lightImpact();
        break;
      case BannerType.error:
        HapticFeedback.heavyImpact();
        break;
      case BannerType.warning:
        HapticFeedback.mediumImpact();
        break;
      case BannerType.info:
        HapticFeedback.selectionClick();
        break;
      case BannerType.loading:
        // No haptic feedback for loading
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
        child: _buildBannerCard(),
      ),
    );
  }

  Widget _buildBannerCard() {
    final theme = _getBannerTheme();
    
    return GestureDetector(
      onTap: widget.onTap,
      child: Container(
        constraints: BoxConstraints(
          maxWidth: MediaQuery.of(context).size.width * 0.9,
          minHeight: 80,
        ),
        decoration: BoxDecoration(
          color: theme.backgroundColor,
          borderRadius: BorderRadius.circular(20),
          boxShadow: [
            BoxShadow(
              color: theme.backgroundColor.withOpacity(0.4),
              blurRadius: 25,
              spreadRadius: 3,
              offset: const Offset(0, 10),
            ),
            BoxShadow(
              color: Colors.black.withOpacity(0.15),
              blurRadius: 15,
              spreadRadius: 2,
              offset: const Offset(0, 6),
            ),
          ],
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(20),
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
                      theme.backgroundColor.withOpacity(0.9),
                    ],
                  ),
                ),
              ),
              // Content
              Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        // Icon
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: Colors.white.withOpacity(0.25),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Icon(
                            widget.icon ?? theme.icon,
                            color: theme.textColor,
                            size: 20,
                          ),
                        ),
                        const SizedBox(width: 12),
                        // Title and message
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                widget.title,
                                style: TextStyle(
                                  color: theme.textColor,
                                  fontSize: 16,
                                  fontWeight: FontWeight.w600,
                                  letterSpacing: 0.5,
                                  decoration: TextDecoration.none,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                              if (widget.message != null) ...[
                                const SizedBox(height: 4),
                                Text(
                                  widget.message!,
                                  style: TextStyle(
                                    color: theme.textColor.withOpacity(0.9),
                                    fontSize: 14,
                                    height: 1.4,
                                    decoration: TextDecoration.none,
                                  ),
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ],
                            ],
                          ),
                        ),
                        // Action or dismiss button
                        if (widget.action != null)
                          widget.action!
                        else
                          GestureDetector(
                            onTap: widget.onDismiss,
                            child: Container(
                              padding: const EdgeInsets.all(6),
                              decoration: BoxDecoration(
                                color: Colors.white.withOpacity(0.25),
                                borderRadius: BorderRadius.circular(6),
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
                        value: widget.progress ?? _progressAnimation.value,
                        backgroundColor: Colors.white.withOpacity(0.3),
                        valueColor: AlwaysStoppedAnimation<Color>(theme.textColor),
                        minHeight: 4,
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

  _BannerTheme _getBannerTheme() {
    switch (widget.type) {
      case BannerType.success:
        return _BannerTheme(
          backgroundColor: const Color(0xFF4CAF50),
          textColor: Colors.white,
          icon: Icons.check_circle,
        );
      case BannerType.error:
        return _BannerTheme(
          backgroundColor: const Color(0xFFF44336),
          textColor: Colors.white,
          icon: Icons.error,
        );
      case BannerType.warning:
        return _BannerTheme(
          backgroundColor: const Color(0xFFFF9800),
          textColor: Colors.white,
          icon: Icons.warning,
        );
      case BannerType.info:
        return _BannerTheme(
          backgroundColor: const Color(0xFF2196F3),
          textColor: Colors.white,
          icon: Icons.info,
        );
      case BannerType.loading:
        return _BannerTheme(
          backgroundColor: const Color(0xFF9C27B0),
          textColor: Colors.white,
          icon: Icons.hourglass_empty,
        );
    }
  }
}

class _BannerTheme {
  final Color backgroundColor;
  final Color textColor;
  final IconData icon;

  const _BannerTheme({
    required this.backgroundColor,
    required this.textColor,
    required this.icon,
  });
}

