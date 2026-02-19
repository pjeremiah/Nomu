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
    final drink = data['drink'] as String?;
    
    if (newPoints != null) {
      // Create notification data
      final notificationData = {
        'type': 'loyalty_points',
        'points': newPoints,
        'message': message,
        'drink': drink,
        'timestamp': DateTime.now().millisecondsSinceEpoch,
        'isMilestone': newPoints == 5 || newPoints == 10,
      };
      
      // Emit notification
      _notificationController.add(notificationData);
      
      LoggingService.instance.info('Emitted loyalty point notification', notificationData);
    }
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
    final drink = data['drink'] as String?;
    final isMilestone = data['isMilestone'] as bool? ?? false;
    
    if (points == null) return;
    
    final notificationMessage = drink != null 
        ? 'New order: $drink! You now have $points stamps'
        : message ?? 'Points updated! You now have $points stamps';
    
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            Icon(
              isMilestone ? Icons.celebration : Icons.star,
              color: isMilestone ? Colors.amber : Colors.yellow,
              size: 20,
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                notificationMessage,
                style: const TextStyle(fontWeight: FontWeight.w500),
              ),
            ),
          ],
        ),
        backgroundColor: isMilestone ? const Color(0xFF4CAF50) : const Color(0xFF242C5B),
        duration: Duration(seconds: isMilestone ? 5 : 3),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(10),
        ),
        action: SnackBarAction(
          label: 'View',
          textColor: Colors.white,
          onPressed: () {
            // Navigate to loyalty page or refresh
            // This could be customized based on your navigation structure
          },
        ),
      ),
    );
  }

  // Dispose resources
  void dispose() {
    _loyaltyPointSubscription?.cancel();
    _notificationController.close();
  }
}
