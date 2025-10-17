import 'package:flutter/material.dart';

class NotificationTheme {
  // Color scheme
  static const Color successColor = Color(0xFF4CAF50);
  static const Color errorColor = Color(0xFFF44336);
  static const Color warningColor = Color(0xFFFF9800);
  static const Color infoColor = Color(0xFF2196F3);
  static const Color loadingColor = Color(0xFF9C27B0);

  // Text colors
  static const Color primaryTextColor = Colors.white;
  static const Color secondaryTextColor = Color(0xFFF5F5F5);

  // Background colors
  static const Color primaryBackgroundColor = Color(0xFF1E1E1E);
  static const Color secondaryBackgroundColor = Color(0xFF2E2E2E);

  // Border radius
  static const double borderRadius = 16.0;
  static const double borderRadiusLarge = 20.0;
  static const double borderRadiusSmall = 8.0;

  // Shadows
  static List<BoxShadow> get primaryShadow => [
    BoxShadow(
      color: Colors.black.withOpacity(0.1),
      blurRadius: 10,
      spreadRadius: 1,
      offset: const Offset(0, 4),
    ),
  ];

  static List<BoxShadow> get elevatedShadow => [
    BoxShadow(
      color: Colors.black.withOpacity(0.15),
      blurRadius: 15,
      spreadRadius: 2,
      offset: const Offset(0, 6),
    ),
  ];

  static List<BoxShadow> get strongShadow => [
    BoxShadow(
      color: Colors.black.withOpacity(0.2),
      blurRadius: 20,
      spreadRadius: 3,
      offset: const Offset(0, 8),
    ),
  ];

  // Typography
  static const TextStyle titleStyle = TextStyle(
    color: primaryTextColor,
    fontSize: 16,
    fontWeight: FontWeight.w600,
    letterSpacing: 0.5,
  );

  static const TextStyle messageStyle = TextStyle(
    color: secondaryTextColor,
    fontSize: 14,
    height: 1.4,
  );

  static const TextStyle largeTitleStyle = TextStyle(
    color: primaryTextColor,
    fontSize: 24,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.5,
  );

  // Animation durations
  static const Duration slideAnimationDuration = Duration(milliseconds: 400);
  static const Duration fadeAnimationDuration = Duration(milliseconds: 300);
  static const Duration bounceAnimationDuration = Duration(milliseconds: 500);

  // Icon sizes
  static const double iconSize = 20.0;
  static const double largeIconSize = 32.0;
  static const double extraLargeIconSize = 48.0;

  // Padding
  static const EdgeInsets defaultPadding = EdgeInsets.all(16);
  static const EdgeInsets largePadding = EdgeInsets.all(20);
  static const EdgeInsets smallPadding = EdgeInsets.all(8);

  // Get notification colors by type
  static Color getColorByType(NotificationType type) {
    switch (type) {
      case NotificationType.success:
        return successColor;
      case NotificationType.error:
        return errorColor;
      case NotificationType.warning:
        return warningColor;
      case NotificationType.info:
        return infoColor;
      case NotificationType.loading:
        return loadingColor;
    }
  }

  // Get notification icon by type
  static IconData getIconByType(NotificationType type) {
    switch (type) {
      case NotificationType.success:
        return Icons.check_circle;
      case NotificationType.error:
        return Icons.error;
      case NotificationType.warning:
        return Icons.warning;
      case NotificationType.info:
        return Icons.info;
      case NotificationType.loading:
        return Icons.hourglass_empty;
    }
  }

  // Get gradient colors by type
  static List<Color> getGradientColorsByType(NotificationType type) {
    final baseColor = getColorByType(type);
    return [
      baseColor,
      baseColor.withOpacity(0.8),
    ];
  }
}

enum NotificationType {
  success,
  error,
  warning,
  info,
  loading,
}
