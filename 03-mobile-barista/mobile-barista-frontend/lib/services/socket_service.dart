import 'package:socket_io_client/socket_io_client.dart' as io;
import 'package:shared_preferences/shared_preferences.dart';
import '../config.dart';
import '../utils/logger.dart';

class SocketService {
  static io.Socket? _socket;
  static bool _isConnected = false;

  // Get the socket instance
  static io.Socket? get socket => _socket;

  // Check if connected
  static bool get isConnected => _isConnected;

  // Initialize socket connection
  static Future<void> initialize() async {
    try {
      final apiBaseUrl = await Config.apiBaseUrl;
      final serverUrl = apiBaseUrl.replaceAll('/api', ''); // Remove /api from URL
      
      Logger.socket('Connecting to: $serverUrl');
      
      _socket = io.io(serverUrl, io.OptionBuilder()
        .setTransports(['websocket'])
        .enableAutoConnect()
        .build());

      _socket!.onConnect((_) {
        Logger.success('Connected successfully', 'SOCKET');
        _isConnected = true;
        _joinAsBarista();
      });

      _socket!.onDisconnect((_) {
        Logger.warning('Disconnected', 'SOCKET');
        _isConnected = false;
      });

      _socket!.onConnectError((error) {
        Logger.error('Connection error: $error', 'SOCKET');
        _isConnected = false;
      });

      // Listen for real-time notifications
      _socket!.on('loyalty-point-added', (data) {
        Logger.socket('New loyalty point added: $data');
        // You can emit custom events here for UI updates
      });

      _socket!.on('barista-status-update', (data) {
        Logger.socket('Barista status update: $data');
        // Handle barista status updates
      });

      // Listen for join errors
      _socket!.on('join-error', (data) {
        final message = data?['message'] ?? 'Unknown error';
        final code = data?['code'] ?? 'Unknown';
        Logger.error('Join error: $message (Code: $code)', 'SOCKET');
        // You can show error to user or handle accordingly
      });

    } catch (e) {
      Logger.exception('Initialization error', e, 'SOCKET');
    }
  }

  // Disconnect socket
  static void disconnect() {
    if (_socket != null) {
      _socket!.disconnect();
      _socket!.dispose();
      _socket = null;
      _isConnected = false;
      Logger.socket('Disconnected and disposed');
    }
  }

  // Join as barista (with role validation)
  static Future<void> _joinAsBarista() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final userType = prefs.getString('user_type');
      final userName = prefs.getString('user_name') ?? 'Unknown Barista';
      final userEmail = prefs.getString('user_email') ?? '';
      
      // 🔒 FRONTEND SECURITY: Check if user has barista permissions
      if (!Config.isRoleSupported(userType ?? '') || !Config.hasPermission(userType ?? '', 'staff')) {
        Logger.error('Access denied - user does not have barista permissions (userType: $userType)', 'SOCKET');
        return;
      }
      
      Logger.success('Frontend validation passed - user has barista permissions', 'SOCKET');
      
      _socket?.emit('barista-join', {
        'name': userName,
        'email': userEmail,
        'userType': userType ?? 'staff', // Send role to backend for verification, default to 'staff'
        'timestamp': DateTime.now().toIso8601String()
      });
      
      Logger.socket('Joined as barista: $userName (role: $userType)');
    } catch (e) {
      Logger.exception('Error joining as barista', e, 'SOCKET');
    }
  }

  // Emit order processed event
  static void emitOrderProcessed({
    required String drink,
    required int points,
    required String baristaName,
  }) {
    if (_socket != null && _isConnected) {
      _socket!.emit('order-processed', {
        'drink': drink,
        'points': points,
        'baristaName': baristaName,
        'timestamp': DateTime.now().toIso8601String()
      });
      Logger.socket('Emitted order processed: $drink');
    } else {
      Logger.warning('Cannot emit - not connected', 'SOCKET');
    }
  }


  // Listen to specific events
  static void on(String event, Function(dynamic) callback) {
    _socket?.on(event, callback);
  }

  // Remove event listener
  static void off(String event, [Function(dynamic)? callback]) {
    _socket?.off(event, callback);
  }
}
