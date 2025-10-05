# Notification System

This directory contains a comprehensive notification system for the NOMU Barista app, designed to provide a modern, consistent, and user-friendly notification experience.

## Components

### 1. CustomToast
A lightweight toast notification component for quick messages.

**Usage:**
```dart
// Success toast
CustomToast.showSuccess(
  context,
  message: 'Operation completed successfully!',
  duration: Duration(seconds: 3),
);

// Error toast
CustomToast.showError(
  context,
  message: 'Something went wrong!',
  duration: Duration(seconds: 4),
);

// Warning toast
CustomToast.showWarning(
  context,
  message: 'Please check your input',
  duration: Duration(seconds: 3),
);

// Info toast
CustomToast.showInfo(
  context,
  message: 'New feature available!',
  duration: Duration(seconds: 3),
);
```

### 2. NotificationBanner
A more prominent banner notification for important messages.

**Usage:**
```dart
// Success banner
NotificationBanner.showSuccess(
  context,
  title: 'Transaction Complete',
  message: 'Customer earned 1 loyalty point',
  duration: Duration(seconds: 4),
  action: IconButton(
    icon: Icon(Icons.close, color: Colors.white),
    onPressed: () => dismissBanner(),
  ),
);

// Error banner
NotificationBanner.showError(
  context,
  title: 'Transaction Failed',
  message: 'Unable to process the transaction',
  duration: Duration(seconds: 5),
);

// Loading banner
NotificationBanner.showLoading(
  context,
  title: 'Processing...',
  message: 'Please wait while we process your request',
  duration: Duration(seconds: 5),
);
```

### 3. NotificationService
A comprehensive notification service with queue management and advanced features.

**Usage:**
```dart
// Basic notification
NotificationService.show(
  title: 'Success',
  message: 'Operation completed',
  type: NotificationType.success,
  duration: Duration(seconds: 3),
);

// Success notification
NotificationService.showSuccess(
  title: 'Success',
  message: 'Operation completed successfully!',
  onTap: () => print('Notification tapped'),
);

// Error notification
NotificationService.showError(
  title: 'Error',
  message: 'Something went wrong!',
  onDismiss: () => print('Notification dismissed'),
);

// Loading notification with progress
NotificationService.showLoading(
  title: 'Processing',
  message: 'Please wait...',
  showProgress: true,
  progress: 0.5,
);
```

## Features

### 🎨 Modern Design
- **Gradient backgrounds** with smooth color transitions
- **Rounded corners** and modern border radius
- **Elevated shadows** for depth and visual hierarchy
- **Consistent typography** with proper font weights and spacing

### ✨ Smooth Animations
- **Slide animations** with elastic curves for natural feel
- **Fade transitions** for smooth appearance/disappearance
- **Progress indicators** for loading states
- **Haptic feedback** for better user interaction

### 🔧 Advanced Features
- **Queue management** to handle multiple notifications
- **Auto-dismiss** with configurable duration
- **Manual dismiss** with tap gestures
- **Custom actions** and callbacks
- **Progress tracking** for loading states

### 📱 Responsive Design
- **Adaptive sizing** for different screen sizes
- **Safe area support** for notched devices
- **Flexible positioning** (top, center, bottom)
- **Maximum width constraints** for readability

## Customization

### Colors
The notification system uses a consistent color scheme defined in `notification_theme.dart`:

- **Success**: Green (#4CAF50)
- **Error**: Red (#F44336)
- **Warning**: Orange (#FF9800)
- **Info**: Blue (#2196F3)
- **Loading**: Purple (#9C27B0)

### Typography
- **Title**: 16px, FontWeight.w600, letter-spacing: 0.5
- **Message**: 14px, height: 1.4
- **Large Title**: 24px, FontWeight.bold

### Animations
- **Slide**: 400ms with elastic curve
- **Fade**: 300ms with ease-out curve
- **Bounce**: 500ms with ease-out-back curve

## Integration

The notification system is fully integrated with the main BaristaScannerPage and provides:

1. **Real-time socket notifications** for loyalty point updates
2. **Transaction feedback** for successful operations
3. **Error handling** with user-friendly messages
4. **Loading states** for async operations
5. **Haptic feedback** for better user experience

## Best Practices

1. **Use appropriate notification types** for different scenarios
2. **Keep messages concise** and actionable
3. **Provide clear actions** when needed
4. **Use haptic feedback** sparingly to avoid overwhelming users
5. **Test on different screen sizes** to ensure proper display

## Future Enhancements

- [ ] Sound effects for notifications
- [ ] Notification history and persistence
- [ ] Custom notification layouts
- [ ] Push notification integration
- [ ] Accessibility improvements
- [ ] Dark/light theme support
