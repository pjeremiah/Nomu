import 'dart:async';
import 'package:flutter/material.dart';
import 'socket_service.dart';
import 'logging_service.dart';
import '../theme/app_theme.dart';
import '../widgets/receipt_summary.dart';

class OrderCompletionNotificationService {
  static OrderCompletionNotificationService? _instance;
  static OrderCompletionNotificationService get instance {
    _instance ??= OrderCompletionNotificationService._internal();
    return _instance!;
  }

  OrderCompletionNotificationService._internal();

  final StreamController<Map<String, dynamic>> _notificationController = 
      StreamController<Map<String, dynamic>>.broadcast();
  
  Stream<Map<String, dynamic>> get notificationStream => _notificationController.stream;
  
  late SocketService _socketService;
  StreamSubscription<Map<String, dynamic>>? _orderCompletionSubscription;

  // Initialize the service
  Future<void> initialize() async {
    _socketService = SocketService.instance;
    // Always attach to [orderCompletionStream] so events are received once the socket connects
    // (previously we only subscribed when already connected, which dropped all notifications).
    _setupListener();
    LoggingService.instance.info('Order completion notification service initialized (listener ready)');
  }
  
  // Set up listener for order completion notifications
  void _setupListener() {
    _orderCompletionSubscription?.cancel();
    _orderCompletionSubscription = _socketService.orderCompletionStream.listen((data) {
      _handleOrderCompletionNotification(data);
    });
  }

  // Handle order completion notifications
  void _handleOrderCompletionNotification(Map<String, dynamic> data) {
    try {
      LoggingService.instance.info('Order completion notification received', data);
      
      // Add timestamp if not present
      if (!data.containsKey('timestamp')) {
        data['timestamp'] = DateTime.now().toIso8601String();
      }
      
      // Emit to notification stream
      _notificationController.add(data);
      
    } catch (e) {
      LoggingService.instance.error('Error handling order completion notification', e);
    }
  }

  // Show order completion notification dialog (receipt-style + haptics)
  static void showOrderCompletionDialog(BuildContext context, Map<String, dynamic> notification) {
    AppHaptics.success();
    final orderTotal = (notification['orderTotal'] as num?)?.toDouble() ?? 0.0;
    final pointsAdded = notification['pointsAdded'] as int? ?? 0;
    final isEligibleForPoints = notification['isEligibleForPoints'] as bool? ?? false;
    final message = notification['message'] as String? ?? 'Order completed successfully!';
    final orderId = notification['orderId'] as String? ?? '';
    final orderItems = notification['orderItems'] as List<dynamic>?;
    final List<Map<String, dynamic>> items = orderItems != null
        ? orderItems.map((e) => Map<String, dynamic>.from(e as Map)).toList()
        : [{'itemName': 'Order', 'price': orderTotal, 'quantity': 1}];

    showDialog(
      context: context,
      barrierDismissible: true,
      builder: (BuildContext context) {
        return AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: Row(
            children: [
              Icon(
                isEligibleForPoints ? Icons.celebration : Icons.check_circle,
                color: isEligibleForPoints ? AppTheme.success : AppTheme.primary,
                size: 28,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  'Order completed!',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: AppTheme.primary,
                  ),
                ),
              ),
            ],
          ),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                ReceiptSummary(
                  orderId: orderId,
                  items: items,
                  totalPrice: orderTotal,
                  pointsEarned: pointsAdded,
                  isEligibleForPoints: isEligibleForPoints,
                ),
                const SizedBox(height: 12),
                Text(
                  message,
                  style: TextStyle(
                    color: AppTheme.neutral600,
                    fontSize: 14,
                  ),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: Text(
                'OK',
                style: TextStyle(
                  color: AppTheme.primary,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ],
        );
      },
    );
  }

  // Show order completion snackbar
  static void showOrderCompletionSnackBar(BuildContext context, Map<String, dynamic> notification) {
    final isEligibleForPoints = notification['isEligibleForPoints'] as bool? ?? false;
    final message = notification['message'] as String? ?? 'Order completed successfully!';

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            Icon(
              isEligibleForPoints ? Icons.celebration : Icons.check_circle,
              color: Colors.white,
              size: 20,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Order Completed!',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 14,
                    ),
                  ),
                  Text(
                    message,
                    style: TextStyle(fontSize: 12),
                  ),
                ],
              ),
            ),
          ],
        ),
        backgroundColor: isEligibleForPoints ? Colors.green[600] : Colors.blue[600],
        duration: const Duration(seconds: 5),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        action: SnackBarAction(
          label: 'View',
          textColor: Colors.white,
          onPressed: () {
            showOrderCompletionDialog(context, notification);
          },
        ),
      ),
    );
  }

  // Dispose resources
  void dispose() {
    _orderCompletionSubscription?.cancel();
    _notificationController.close();
  }
}
