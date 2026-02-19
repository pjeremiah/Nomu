import 'dart:async';
import 'package:flutter/material.dart';
import 'socket_service.dart';
import 'logging_service.dart';

class RealtimeNotificationService {
  static RealtimeNotificationService? _instance;
  static RealtimeNotificationService get instance {
    _instance ??= RealtimeNotificationService._internal();
    return _instance!;
  }

  RealtimeNotificationService._internal();

  final StreamController<Map<String, dynamic>> _notificationController = 
      StreamController<Map<String, dynamic>>.broadcast();
  
  Stream<Map<String, dynamic>> get notificationStream => _notificationController.stream;
  
  late SocketService _socketService;
  StreamSubscription<Map<String, dynamic>>? _loyaltyPointSubscription;

  // Initialize the service
  Future<void> initialize() async {
    _socketService = SocketService.instance;
    
    // Don't initialize socket service here - it's already initialized in main.dart
    // Just set up the listener if socket is available
    if (_socketService.isConnected) {
      _setupListener();
      LoggingService.instance.info('Realtime notification service initialized with existing socket');
    } else {
      LoggingService.instance.warning('Socket not connected, notification service will not work until socket connects');
    }
  }
  
  // Set up listener for loyalty point updates
  void _setupListener() {
    _loyaltyPointSubscription?.cancel();
    _loyaltyPointSubscription = _socketService.loyaltyPointStream.listen((data) {
      _handleLoyaltyPointUpdate(data);
    });
  }

  // Handle loyalty point updates and create notifications
  void _handleLoyaltyPointUpdate(Map<String, dynamic> data) {
    final newPoints = data['points'] as int?;
    final message = data['message'] as String?;
    final customerMessage = data['customerMessage'] as String?;
    final messageType = data['messageType'] as String?;
    final drink = data['itemName'] as String?;
    final pointsAdded = data['pointsAdded'] as int? ?? 0;
    final isEligibleForPoints = data['isEligibleForPoints'] as bool? ?? true;
    final orderPrice = data['orderPrice'] as num?;
    final minimumSpending = data['minimumSpending'] as num?;
    
    // Create notification data with customer message
    final notificationData = {
      'type': 'loyalty_points',
      'points': newPoints,
      'pointsAdded': pointsAdded,
      'message': customerMessage ?? message, // Use customer message if available
      'customerMessage': customerMessage,
      'messageType': messageType ?? (isEligibleForPoints ? 'success' : 'warning'),
      'drink': drink,
      'isEligibleForPoints': isEligibleForPoints,
      'orderPrice': orderPrice,
      'minimumSpending': minimumSpending,
      'timestamp': DateTime.now().millisecondsSinceEpoch,
      'isMilestone': newPoints != null && (newPoints == 5 || newPoints == 10),
    };
    
    // Emit notification
    _notificationController.add(notificationData);
    
    LoggingService.instance.info('Emitted loyalty point notification', notificationData);
  }

  // Show notification in UI
  void showNotification(BuildContext context, Map<String, dynamic> data) {
    final type = data['type'] as String?;
    
    if (type == 'loyalty_points') {
      _showLoyaltyPointsNotification(context, data);
    }
  }

  // Show loyalty points notification
  void _showLoyaltyPointsNotification(BuildContext context, Map<String, dynamic> data) {
    final points = data['points'] as int?;
    final message = data['message'] as String?;
    final customerMessage = data['customerMessage'] as String?;
    final messageType = data['messageType'] as String? ?? 'info';
    final drink = data['drink'] as String?;
    final isMilestone = data['isMilestone'] as bool? ?? false;
    final isEligibleForPoints = data['isEligibleForPoints'] as bool? ?? true;
    
    // Use customer message if available, otherwise fallback to default message
    String notificationMessage;
    if (customerMessage != null && customerMessage.isNotEmpty) {
      notificationMessage = customerMessage;
    } else if (message != null && message.isNotEmpty) {
      notificationMessage = message;
    } else if (points != null) {
      notificationMessage = drink != null 
          ? 'New order: $drink! You now have $points stamps'
          : 'Points updated! You now have $points stamps';
    } else {
      notificationMessage = 'Scan processed';
    }
    
    // Determine icon and color based on message type
    IconData icon;
    Color backgroundColor;
    Color iconColor;
    
    if (messageType == 'success' || isEligibleForPoints) {
      if (isMilestone) {
        icon = Icons.celebration;
        backgroundColor = const Color(0xFF4CAF50); // Green for milestones
        iconColor = Colors.amber;
      } else {
        icon = Icons.check_circle;
        backgroundColor = const Color(0xFF4CAF50); // Green for success
        iconColor = Colors.white;
      }
    } else if (messageType == 'warning') {
      icon = Icons.warning;
      backgroundColor = Colors.orange;
      iconColor = Colors.white;
    } else {
      icon = Icons.info;
      backgroundColor = const Color(0xFF242C5B);
      iconColor = Colors.yellow;
    }
    
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            Icon(
              icon,
              color: iconColor,
              size: 20,
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                notificationMessage,
                style: const TextStyle(
                  fontWeight: FontWeight.w500,
                  color: Colors.white,
                ),
              ),
            ),
          ],
        ),
        backgroundColor: backgroundColor,
        duration: Duration(seconds: isMilestone ? 6 : (messageType == 'warning' ? 5 : 4)),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(10),
        ),
        action: points != null && isEligibleForPoints
            ? SnackBarAction(
                label: 'View',
                textColor: Colors.white,
                onPressed: () {
                  // Navigate to loyalty page or refresh
                  // This could be customized based on your navigation structure
                },
              )
            : null,
      ),
    );
  }

  // Dispose resources
  void dispose() {
    _loyaltyPointSubscription?.cancel();
    _notificationController.close();
  }
}
