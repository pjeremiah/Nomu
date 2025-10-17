import 'dart:async';
import 'package:socket_io_client/socket_io_client.dart' as IO;
import 'dart:developer' as developer;

class RealtimeService {
  static final RealtimeService _instance = RealtimeService._internal();
  factory RealtimeService() => _instance;
  RealtimeService._internal();

  IO.Socket? _socket;
  bool _isConnected = false;
  final StreamController<Map<String, dynamic>> _customerStatsController = 
      StreamController<Map<String, dynamic>>.broadcast();
  final StreamController<Map<String, dynamic>> _notificationController = 
      StreamController<Map<String, dynamic>>.broadcast();

  // Getters for streams
  Stream<Map<String, dynamic>> get customerStatsStream => _customerStatsController.stream;
  Stream<Map<String, dynamic>> get notificationStream => _notificationController.stream;
  bool get isConnected => _isConnected;

  /// Initialize the socket connection
  void initializeSocket(String serverUrl) {
    try {
      _socket = IO.io(serverUrl, IO.OptionBuilder()
          .setTransports(['websocket'])
          .enableAutoConnect()
          .build());

      _socket!.onConnect((_) {
        _isConnected = true;
        developer.log('🔌 Connected to server', name: 'RealtimeService');
      });

      _socket!.onDisconnect((_) {
        _isConnected = false;
        developer.log('🔌 Disconnected from server', name: 'RealtimeService');
      });

      _socket!.onConnectError((error) {
        _isConnected = false;
        developer.log('❌ Connection error: $error', name: 'RealtimeService');
      });

      // Listen for customer stats updates
      _socket!.on('customer_stats_updated', (data) {
        developer.log('📊 Customer stats updated: $data', name: 'RealtimeService');
        _customerStatsController.add(Map<String, dynamic>.from(data));
      });

      // Listen for admin notifications
      _socket!.on('admin_notification', (data) {
        developer.log('🔔 Admin notification: $data', name: 'RealtimeService');
        _notificationController.add(Map<String, dynamic>.from(data));
      });

      // Listen for user registration events
      _socket!.on('user_registered', (data) {
        developer.log('👤 User registered: $data', name: 'RealtimeService');
        // You can add additional handling here if needed
      });

    } catch (e) {
      developer.log('❌ Failed to initialize socket: $e', name: 'RealtimeService');
    }
  }

  /// Connect to the server
  void connect() {
    if (_socket != null && !_isConnected) {
      _socket!.connect();
    }
  }

  /// Disconnect from the server
  void disconnect() {
    if (_socket != null && _isConnected) {
      _socket!.disconnect();
    }
  }

  /// Emit a custom event to the server
  void emit(String event, Map<String, dynamic> data) {
    if (_socket != null && _isConnected) {
      _socket!.emit(event, data);
      developer.log('📤 Emitted $event: $data', name: 'RealtimeService');
    } else {
      developer.log('⚠️ Cannot emit $event: not connected', name: 'RealtimeService');
    }
  }

  /// Listen to a custom event from the server
  void on(String event, Function(dynamic) callback) {
    if (_socket != null) {
      _socket!.on(event, callback);
      developer.log('👂 Listening to $event', name: 'RealtimeService');
    }
  }

  /// Stop listening to a custom event
  void off(String event) {
    if (_socket != null) {
      _socket!.off(event);
      developer.log('🔇 Stopped listening to $event', name: 'RealtimeService');
    }
  }

  /// Clean up resources
  void dispose() {
    disconnect();
    _customerStatsController.close();
    _notificationController.close();
    _socket?.dispose();
    _socket = null;
  }
}
