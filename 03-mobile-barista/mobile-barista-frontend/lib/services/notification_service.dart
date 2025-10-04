import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'dart:async';
import '../constants/app_constants.dart';

enum NotificationType {
  success,
  error,
  warning,
  info,
  loading,
}

enum NotificationPosition {
  top,
  center,
  bottom,
}

class NotificationData {
  final String title;
  final String? message;
  final NotificationType type;
  final Duration duration;
  final VoidCallback? onTap;
  final VoidCallback? onDismiss;
  final IconData? icon;
  final Color? backgroundColor;
  final Color? textColor;
  final bool showProgress;
  final double? progress;

  const NotificationData({
    required this.title,
    this.message,
    required this.type,
    this.duration = const Duration(seconds: 3),
    this.onTap,
    this.onDismiss,
    this.icon,
    this.backgroundColor,
    this.textColor,
    this.showProgress = false,
    this.progress,
  });
}

class NotificationService {
  static final NotificationService _instance = NotificationService._internal();
  factory NotificationService() => _instance;
  NotificationService._internal();

  static final GlobalKey<NavigatorState> navigatorKey = GlobalKey<NavigatorState>();
  static final List<NotificationData> _notificationQueue = [];
  static bool _isShowingNotification = false;
  static OverlayEntry? _currentOverlay;

  // Notification theme colors
  static const Map<NotificationType, Color> _typeColors = {
    NotificationType.success: Color(0xFF4CAF50),
    NotificationType.error: Color(0xFFF44336),
    NotificationType.warning: Color(0xFFFF9800),
    NotificationType.info: Color(0xFF2196F3),
    NotificationType.loading: Color(0xFF9C27B0),
  };

  static const Map<NotificationType, IconData> _typeIcons = {
    NotificationType.success: Icons.check_circle,
    NotificationType.error: Icons.error,
    NotificationType.warning: Icons.warning,
    NotificationType.info: Icons.info,
    NotificationType.loading: Icons.hourglass_empty,
  };

  static void show({
    required String title,
    String? message,
    NotificationType type = NotificationType.info,
    Duration? duration,
    VoidCallback? onTap,
    VoidCallback? onDismiss,
    IconData? icon,
    Color? backgroundColor,
    Color? textColor,
    bool showProgress = false,
    double? progress,
    NotificationPosition position = NotificationPosition.top,
  }) {
    final notification = NotificationData(
      title: title,
      message: message,
      type: type,
      duration: duration ?? AppConstants.snackbarDuration,
      onTap: onTap,
      onDismiss: onDismiss,
      icon: icon,
      backgroundColor: backgroundColor,
      textColor: textColor,
      showProgress: showProgress,
      progress: progress,
    );

    _notificationQueue.add(notification);
    _processQueue(position);
  }

  static void showSuccess({
    required String title,
    String? message,
    Duration? duration,
    VoidCallback? onTap,
    VoidCallback? onDismiss,
  }) {
    show(
      title: title,
      message: message,
      type: NotificationType.success,
      duration: duration,
      onTap: onTap,
      onDismiss: onDismiss,
    );
  }

  static void showError({
    required String title,
    String? message,
    Duration? duration,
    VoidCallback? onTap,
    VoidCallback? onDismiss,
  }) {
    show(
      title: title,
      message: message,
      type: NotificationType.error,
      duration: duration,
      onTap: onTap,
      onDismiss: onDismiss,
    );
  }

  static void showWarning({
    required String title,
    String? message,
    Duration? duration,
    VoidCallback? onTap,
    VoidCallback? onDismiss,
  }) {
    show(
      title: title,
      message: message,
      type: NotificationType.warning,
      duration: duration,
      onTap: onTap,
      onDismiss: onDismiss,
    );
  }

  static void showInfo({
    required String title,
    String? message,
    Duration? duration,
    VoidCallback? onTap,
    VoidCallback? onDismiss,
  }) {
    show(
      title: title,
      message: message,
      type: NotificationType.info,
      duration: duration,
      onTap: onTap,
      onDismiss: onDismiss,
    );
  }

  static void showLoading({
    required String title,
    String? message,
    Duration? duration,
    VoidCallback? onDismiss,
  }) {
    show(
      title: title,
      message: message,
      type: NotificationType.loading,
      duration: duration ?? const Duration(seconds: 5),
      onDismiss: onDismiss,
    );
  }

  static void _processQueue(NotificationPosition position) {
    if (_isShowingNotification || _notificationQueue.isEmpty) return;

    final notification = _notificationQueue.removeAt(0);
    _isShowingNotification = true;

    _showNotification(notification, position);
  }

  static void _showNotification(NotificationData notification, NotificationPosition position) {
    final context = navigatorKey.currentContext;
    if (context == null) {
      _isShowingNotification = false;
      _processQueue(position);
      return;
    }

    // Add haptic feedback based on notification type
    _addHapticFeedback(notification.type);

    // Create overlay entry
    _currentOverlay = OverlayEntry(
      builder: (context) => _NotificationOverlay(
        notification: notification,
        position: position,
        onDismiss: () {
          _dismissCurrentNotification();
        },
      ),
    );

    // Insert overlay
    Overlay.of(context).insert(_currentOverlay!);

    // Auto dismiss after duration
    Timer(notification.duration, () {
      _dismissCurrentNotification();
    });
  }

  static void _dismissCurrentNotification() {
    _currentOverlay?.remove();
    _currentOverlay = null;
    _isShowingNotification = false;
    _processQueue(NotificationPosition.top);
  }

  static void _addHapticFeedback(NotificationType type) {
    switch (type) {
      case NotificationType.success:
        HapticFeedback.lightImpact();
        break;
      case NotificationType.error:
        HapticFeedback.heavyImpact();
        break;
      case NotificationType.warning:
        HapticFeedback.mediumImpact();
        break;
      case NotificationType.info:
        HapticFeedback.selectionClick();
        break;
      case NotificationType.loading:
        // No haptic feedback for loading
        break;
    }
  }

  static void dismissAll() {
    _currentOverlay?.remove();
    _currentOverlay = null;
    _notificationQueue.clear();
    _isShowingNotification = false;
  }
}

class _NotificationOverlay extends StatefulWidget {
  final NotificationData notification;
  final NotificationPosition position;
  final VoidCallback onDismiss;

  const _NotificationOverlay({
    required this.notification,
    required this.position,
    required this.onDismiss,
  });

  @override
  State<_NotificationOverlay> createState() => _NotificationOverlayState();
}

class _NotificationOverlayState extends State<_NotificationOverlay>
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
      duration: const Duration(milliseconds: 300),
      vsync: this,
    );
    
    _fadeController = AnimationController(
      duration: const Duration(milliseconds: 200),
      vsync: this,
    );

    _progressController = AnimationController(
      duration: widget.notification.duration,
      vsync: this,
    );

    _slideAnimation = Tween<Offset>(
      begin: _getSlideBeginOffset(),
      end: Offset.zero,
    ).animate(CurvedAnimation(
      parent: _slideController,
      curve: Curves.easeOutCubic,
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
    
    if (widget.notification.showProgress) {
      _progressController.forward();
    }
  }

  Offset _getSlideBeginOffset() {
    switch (widget.position) {
      case NotificationPosition.top:
        return const Offset(0, -1);
      case NotificationPosition.center:
        return const Offset(0, -0.5);
      case NotificationPosition.bottom:
        return const Offset(0, 1);
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
    return Positioned.fill(
      child: Material(
        color: Colors.transparent,
        child: Stack(
          children: [
            // Backdrop
            GestureDetector(
              onTap: widget.onDismiss,
              child: Container(
                color: Colors.transparent,
                width: double.infinity,
                height: double.infinity,
              ),
            ),
            // Notification
            _buildNotificationPosition(),
          ],
        ),
      ),
    );
  }

  Widget _buildNotificationPosition() {
    switch (widget.position) {
      case NotificationPosition.top:
        return Positioned(
          top: MediaQuery.of(context).padding.top + 16,
          left: 16,
          right: 16,
          child: SlideTransition(
            position: _slideAnimation,
            child: FadeTransition(
              opacity: _fadeAnimation,
              child: _buildNotificationCard(),
            ),
          ),
        );
      case NotificationPosition.center:
        return Center(
          child: SlideTransition(
            position: _slideAnimation,
            child: FadeTransition(
              opacity: _fadeAnimation,
              child: _buildNotificationCard(),
            ),
          ),
        );
      case NotificationPosition.bottom:
        return Positioned(
          bottom: MediaQuery.of(context).padding.bottom + 16,
          left: 16,
          right: 16,
          child: SlideTransition(
            position: _slideAnimation,
            child: FadeTransition(
              opacity: _fadeAnimation,
              child: _buildNotificationCard(),
            ),
          ),
        );
    }
  }

  Widget _buildNotificationCard() {
    final type = widget.notification.type;
    final backgroundColor = widget.notification.backgroundColor ?? 
        NotificationService._typeColors[type]!;
    final textColor = widget.notification.textColor ?? Colors.white;
    final icon = widget.notification.icon ?? 
        NotificationService._typeIcons[type]!;

    return GestureDetector(
      onTap: widget.notification.onTap,
      child: Container(
        constraints: const BoxConstraints(maxWidth: 400),
        decoration: BoxDecoration(
          color: backgroundColor,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: backgroundColor.withOpacity(0.3),
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
                      backgroundColor,
                      backgroundColor.withOpacity(0.8),
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
                            color: Colors.white.withOpacity(0.2),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Icon(
                            icon,
                            color: textColor,
                            size: 20,
                          ),
                        ),
                        const SizedBox(width: 12),
                        // Title
                        Expanded(
                          child: Text(
                            widget.notification.title,
                            style: TextStyle(
                              color: textColor,
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                              letterSpacing: 0.5,
                            ),
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
                              color: textColor,
                              size: 16,
                            ),
                          ),
                        ),
                      ],
                    ),
                    // Message
                    if (widget.notification.message != null) ...[
                      const SizedBox(height: 8),
                      Text(
                        widget.notification.message!,
                        style: TextStyle(
                          color: textColor.withOpacity(0.9),
                          fontSize: 14,
                          height: 1.4,
                        ),
                      ),
                    ],
                    // Progress bar
                    if (widget.notification.showProgress) ...[
                      const SizedBox(height: 12),
                      AnimatedBuilder(
                        animation: _progressAnimation,
                        builder: (context, child) {
                          return LinearProgressIndicator(
                            value: widget.notification.progress ?? _progressAnimation.value,
                            backgroundColor: Colors.white.withOpacity(0.3),
                            valueColor: AlwaysStoppedAnimation<Color>(textColor),
                            minHeight: 3,
                          );
                        },
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
