import 'dart:async';
import 'package:flutter/material.dart';
import 'socket_service.dart';
import 'logging_service.dart';

class ScanLimitNotificationService {
  static ScanLimitNotificationService? _instance;
  static ScanLimitNotificationService get instance {
    _instance ??= ScanLimitNotificationService._internal();
    return _instance!;
  }

  ScanLimitNotificationService._internal();

  final StreamController<Map<String, dynamic>> _notificationController = 
      StreamController<Map<String, dynamic>>.broadcast();
  
  Stream<Map<String, dynamic>> get notificationStream => _notificationController.stream;
  
  late SocketService _socketService;
  StreamSubscription<Map<String, dynamic>>? _scanLimitSubscription;
  StreamSubscription<Map<String, dynamic>>? _scanWarningSubscription;

  // Initialize the service
  Future<void> initialize() async {
    _socketService = SocketService.instance;
    
    if (_socketService.isConnected) {
      _setupListeners();
      LoggingService.instance.info('Scan limit notification service initialized');
    } else {
      LoggingService.instance.warning('Socket not connected, scan limit notifications will not work until socket connects');
    }
  }
  
  // Set up listeners for scan limit notifications
  void _setupListeners() {
    _scanLimitSubscription?.cancel();
    _scanWarningSubscription?.cancel();
    
    // Listen for scan limit reached notifications
    _scanLimitSubscription = _socketService.scanLimitStream.listen((data) {
      _handleScanLimitReached(data);
    });
    
    // Listen for scan limit warning notifications
    _scanWarningSubscription = _socketService.scanWarningStream.listen((data) {
      _handleScanLimitWarning(data);
    });
  }

  // Handle scan limit reached notifications
  void _handleScanLimitReached(Map<String, dynamic> data) {
    try {
      final customerId = data['customerId'] as String?;
      final limitType = data['limitType'] as String?;
      final currentCount = data['currentCount'] as int?;
      final maxLimit = data['maxLimit'] as int?;
      final message = data['message'] as String?;
      
      if (customerId == null || limitType == null) {
        LoggingService.instance.warning('Invalid scan limit notification data', data);
        return;
      }
      
      LoggingService.instance.info('Scan limit reached notification received', {
        'customerId': customerId,
        'limitType': limitType,
        'currentCount': currentCount,
        'maxLimit': maxLimit
      });
      
      // Add to notification stream
      _notificationController.add({
        'type': 'scan_limit_reached',
        'customerId': customerId,
        'limitType': limitType,
        'currentCount': currentCount,
        'maxLimit': maxLimit,
        'message': message,
        'timestamp': data['timestamp'],
        'retryAfter': data['retryAfter']
      });
      
    } catch (e) {
      LoggingService.instance.error('Error handling scan limit notification', e);
    }
  }

  // Handle scan limit warning notifications
  void _handleScanLimitWarning(Map<String, dynamic> data) {
    try {
      final customerId = data['customerId'] as String?;
      final limitType = data['limitType'] as String?;
      final currentCount = data['currentCount'] as int?;
      final maxLimit = data['maxLimit'] as int?;
      final remaining = data['remaining'] as int?;
      final message = data['message'] as String?;
      
      if (customerId == null || limitType == null) {
        LoggingService.instance.warning('Invalid scan limit warning data', data);
        return;
      }
      
      LoggingService.instance.info('Scan limit warning notification received', {
        'customerId': customerId,
        'limitType': limitType,
        'currentCount': currentCount,
        'maxLimit': maxLimit,
        'remaining': remaining
      });
      
      // Add to notification stream
      _notificationController.add({
        'type': 'scan_limit_warning',
        'customerId': customerId,
        'limitType': limitType,
        'currentCount': currentCount,
        'maxLimit': maxLimit,
        'remaining': remaining,
        'message': message,
        'timestamp': data['timestamp']
      });
      
    } catch (e) {
      LoggingService.instance.error('Error handling scan limit warning', e);
    }
  }

  // Show scan limit notification in UI
  void showScanLimitNotification(BuildContext context, Map<String, dynamic> data) {
    final limitType = data['limitType'] as String?;
    final currentCount = data['currentCount'] as int?;
    final maxLimit = data['maxLimit'] as int?;
    final message = data['message'] as String?;
    final remaining = data['remaining'] as int?;
    
    if (message == null) return;
    
    final isWarning = data['type'] == 'scan_limit_warning';
    final icon = isWarning ? Icons.warning : Icons.block;
    final color = isWarning ? Colors.orange : Colors.red;
    final duration = isWarning ? 4 : 6;
    
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            Icon(
              icon,
              color: Colors.white,
              size: 20,
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    isWarning ? 'Approaching Limit' : 'Limit Reached',
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 14,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    message,
                    style: const TextStyle(fontSize: 12),
                  ),
                  if (remaining != null && isWarning) ...[
                    const SizedBox(height: 4),
                    LinearProgressIndicator(
                      value: (currentCount ?? 0) / (maxLimit ?? 1),
                      backgroundColor: Colors.white30,
                      valueColor: const AlwaysStoppedAnimation<Color>(Colors.white),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
        backgroundColor: color,
        duration: Duration(seconds: duration),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(10),
        ),
        action: SnackBarAction(
          label: isWarning ? 'OK' : 'View Details',
          textColor: Colors.white,
          onPressed: () {
            if (!isWarning) {
              // Navigate to loyalty page or show details
              _showLimitDetailsDialog(context, data);
            }
          },
        ),
      ),
    );
  }

  // Show detailed limit information dialog
  void _showLimitDetailsDialog(BuildContext context, Map<String, dynamic> data) {
    final currentCount = data['currentCount'] as int?;
    final maxLimit = data['maxLimit'] as int?;
    
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          title: Row(
            children: [
              Icon(Icons.info_outline, color: Colors.blue),
              const SizedBox(width: 8),
              Text('Daily Limit Reached'),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'You\'ve reached your daily limit',
                style: const TextStyle(fontSize: 16),
              ),
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.grey[100],
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('Current:'),
                        Text('${currentCount ?? 0}'),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('Limit:'),
                        Text('${maxLimit ?? 0}'),
                      ],
                    ),
                    const SizedBox(height: 8),
                    LinearProgressIndicator(
                      value: (currentCount ?? 0) / (maxLimit ?? 1),
                      backgroundColor: Colors.grey[300],
                      valueColor: const AlwaysStoppedAnimation<Color>(Colors.red),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              Text(
                'Your limits will reset tomorrow. Thank you for using NOMU!',
                style: TextStyle(
                  fontSize: 14,
                  color: Colors.grey[600],
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: Text('OK'),
            ),
          ],
        );
      },
    );
  }

  // Dispose resources
  void dispose() {
    _scanLimitSubscription?.cancel();
    _scanWarningSubscription?.cancel();
    _notificationController.close();
  }
}
