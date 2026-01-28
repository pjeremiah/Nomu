import 'dart:async';
import 'package:socket_io_client/socket_io_client.dart' as IO;
import '../config.dart';
import 'logging_service.dart';

class SocketService {
  static SocketService? _instance;
  IO.Socket? _socket;
  bool _isConnected = false;
  
  // Stream controllers for different events
  StreamController<Map<String, dynamic>> _loyaltyPointController = 
      StreamController<Map<String, dynamic>>.broadcast();
  StreamController<Map<String, dynamic>> _otpSentController = 
      StreamController<Map<String, dynamic>>.broadcast();
  StreamController<Map<String, dynamic>> _otpVerifiedController = 
      StreamController<Map<String, dynamic>>.broadcast();
  
  // Promo event streams
  StreamController<Map<String, dynamic>> _promoUpdatedController = 
      StreamController<Map<String, dynamic>>.broadcast();
  StreamController<Map<String, dynamic>> _newPromoCreatedController = 
      StreamController<Map<String, dynamic>>.broadcast();
  StreamController<Map<String, dynamic>> _promoDeletedController = 
      StreamController<Map<String, dynamic>>.broadcast();
  
  // Scan limit event streams
  StreamController<Map<String, dynamic>> _scanLimitController = 
      StreamController<Map<String, dynamic>>.broadcast();
  StreamController<Map<String, dynamic>> _scanWarningController = 
      StreamController<Map<String, dynamic>>.broadcast();

  // Getters for streams
  Stream<Map<String, dynamic>> get loyaltyPointStream => _loyaltyPointController.stream;
  Stream<Map<String, dynamic>> get otpSentStream => _otpSentController.stream;
  Stream<Map<String, dynamic>> get otpVerifiedStream => _otpVerifiedController.stream;
  
  // Promo stream getters
  Stream<Map<String, dynamic>> get promoUpdatedStream => _promoUpdatedController.stream;
  Stream<Map<String, dynamic>> get newPromoCreatedStream => _newPromoCreatedController.stream;
  Stream<Map<String, dynamic>> get promoDeletedStream => _promoDeletedController.stream;
  
  // Scan limit stream getters
  Stream<Map<String, dynamic>> get scanLimitStream => _scanLimitController.stream;
  Stream<Map<String, dynamic>> get scanWarningStream => _scanWarningController.stream;

  // Singleton pattern
  static SocketService get instance {
    _instance ??= SocketService._internal();
    return _instance!;
  }

  SocketService._internal();

  // Initialize socket connection
  Future<void> initialize() async {
    if (_socket != null && _isConnected) {
      LoggingService.instance.socket('Already connected');
      return;
    }

    try {
      // Clean up any existing socket first
      if (_socket != null) {
        _socket!.disconnect();
        _socket!.dispose();
        _socket = null;
        _isConnected = false;
      }

      // Get API base URL with error handling
      String apiBaseUrl;
      try {
        apiBaseUrl = await Config.apiBaseUrl;
        LoggingService.instance.socket('API Base URL: $apiBaseUrl');
      } catch (e) {
        LoggingService.instance.error('Failed to get API base URL', e);
        throw Exception('Cannot initialize socket: API configuration error');
      }
      
      // Extract host and port from API URL with validation
      Uri uri;
      try {
        uri = Uri.parse(apiBaseUrl);
        if (uri.host.isEmpty || uri.port == 0) {
          throw Exception('Invalid API URL format');
        }
        LoggingService.instance.socket('Parsed URI', {
          'host': uri.host,
          'port': uri.port,
        });
      } catch (e) {
        LoggingService.instance.error('Failed to parse API URL: $apiBaseUrl', e);
        throw Exception('Invalid API URL format');
      }
      
      // Use the same host as the API URL for proper network connectivity
      // Use HTTPS for production backend, HTTP for local development
      final socketUrl = uri.scheme == 'https' 
          ? 'https://${uri.host}' 
          : 'http://${uri.host}:${uri.port}';
      
      LoggingService.instance.socket('Connecting to: $socketUrl');
      
      _socket = IO.io(socketUrl, IO.OptionBuilder()
        .setTransports(['websocket', 'polling']) // Add polling as fallback
        .enableAutoConnect()
        .setTimeout(30000) // 30 second timeout for more stability
        .setReconnectionAttempts(0) // No automatic reconnection attempts
        .setReconnectionDelay(0) // No reconnection delay
        .setReconnectionDelayMax(0) // No max reconnection delay
        .build());

      // Set up event listeners BEFORE connecting
      _setupSocketListeners(socketUrl);

      // Connect to server
      _socket!.connect();

      // Wait for connection to be established
      await _waitForConnection();

      // Connection established or failed - no auto-reconnect
      LoggingService.instance.socket('Socket initialization complete. Connected: $_isConnected');

    } catch (e) {
      LoggingService.instance.error('Error initializing socket', e);
      // Reset state on error
      _isConnected = false;
      if (_socket != null) {
        _socket!.disconnect();
        _socket!.dispose();
        _socket = null;
      }
      // No auto-reconnect on error - manual reconnection required
      LoggingService.instance.socket('Socket initialization failed. Manual reconnection required.');
    }
  }

  // Set up all socket event listeners
  void _setupSocketListeners(String socketUrl) {
    _socket!.onConnect((_) {
      LoggingService.instance.socket('Connected successfully to: $socketUrl');
      _isConnected = true;
    });

    _socket!.onDisconnect((reason) {
      LoggingService.instance.socket('Disconnected from: $socketUrl, reason: $reason');
      _isConnected = false;
      // No auto-reconnect - manual reconnection required
    });

    _socket!.onConnectError((error) {
      LoggingService.instance.error('Connection error to $socketUrl', error);
      _isConnected = false;
      // No auto-reconnect on error - manual reconnection required
    });

    _socket!.onReconnect((attemptNumber) {
      LoggingService.instance.socket('Reconnected to: $socketUrl after $attemptNumber attempts');
      _isConnected = true;
    });

    _socket!.onReconnectError((error) {
      LoggingService.instance.error('Reconnection error', error);
      _isConnected = false;
    });

    _socket!.onReconnectFailed((_) {
      LoggingService.instance.error('Reconnection failed after all attempts');
      _isConnected = false;
      // No auto-reconnect after failed attempts - manual reconnection required
    });

    // Listen for loyalty point events
    _socket!.on('loyalty-point-added', (data) {
      try {
        LoggingService.instance.socket('Loyalty point added', {
          'data': data,
          'dataType': data.runtimeType.toString(),
          'dataKeys': data is Map ? data.keys.toList() : 'Not a Map',
        });
        if (!_loyaltyPointController.isClosed) {
          _loyaltyPointController.add(Map<String, dynamic>.from(data));
        }
      } catch (e) {
        LoggingService.instance.error('Error handling loyalty point event', e);
      }
    });

    // Listen for OTP events
    _socket!.on('otp_sent', (data) {
      try {
        LoggingService.instance.socket('OTP sent', data);
        if (!_otpSentController.isClosed) {
          _otpSentController.add(Map<String, dynamic>.from(data));
        }
      } catch (e) {
        LoggingService.instance.error('Error handling OTP sent event', e);
      }
    });

    _socket!.on('otp_verified', (data) {
      try {
        LoggingService.instance.socket('OTP verified', data);
        if (!_otpVerifiedController.isClosed) {
          _otpVerifiedController.add(Map<String, dynamic>.from(data));
        }
      } catch (e) {
        LoggingService.instance.error('Error handling OTP verified event', e);
      }
    });

    // Listen for promo events
    _socket!.on('promos_updated', (data) {
      try {
        LoggingService.instance.socket('Promos updated', data);
        if (!_promoUpdatedController.isClosed) {
          _promoUpdatedController.add(Map<String, dynamic>.from(data));
        }
      } catch (e) {
        LoggingService.instance.error('Error handling promos updated event', e);
      }
    });

    _socket!.on('new_promo_created', (data) {
      try {
        LoggingService.instance.socket('New promo created', data);
        if (!_newPromoCreatedController.isClosed) {
          _newPromoCreatedController.add(Map<String, dynamic>.from(data));
        }
      } catch (e) {
        LoggingService.instance.error('Error handling new promo created event', e);
      }
    });

    _socket!.on('promo_updated', (data) {
      try {
        LoggingService.instance.socket('Promo updated', data);
        if (!_promoUpdatedController.isClosed) {
          _promoUpdatedController.add(Map<String, dynamic>.from(data));
        }
      } catch (e) {
        LoggingService.instance.error('Error handling promo updated event', e);
      }
    });

    _socket!.on('promo_deleted', (data) {
      try {
        LoggingService.instance.socket('Promo deleted', data);
        if (!_promoDeletedController.isClosed) {
          _promoDeletedController.add(Map<String, dynamic>.from(data));
        }
      } catch (e) {
        LoggingService.instance.error('Error handling promo deleted event', e);
      }
    });

    // Listen for scan limit events
    _socket!.on('customer_scan_limit', (data) {
      try {
        LoggingService.instance.socket('Customer scan limit reached', data);
        if (!_scanLimitController.isClosed) {
          _scanLimitController.add(Map<String, dynamic>.from(data));
        }
      } catch (e) {
        LoggingService.instance.error('Error handling customer scan limit event', e);
      }
    });

    _socket!.on('customer_scan_warning', (data) {
      try {
        LoggingService.instance.socket('Customer scan limit warning', data);
        if (!_scanWarningController.isClosed) {
          _scanWarningController.add(Map<String, dynamic>.from(data));
        }
      } catch (e) {
        LoggingService.instance.error('Error handling customer scan warning event', e);
      }
    });
  }

  // Wait for socket connection to be established
  Future<void> _waitForConnection() async {
    int attempts = 0;
    const maxAttempts = 10; // 5 seconds total
    
    while (!_isConnected && attempts < maxAttempts) {
      await Future.delayed(const Duration(milliseconds: 500));
      attempts++;
      LoggingService.instance.socket('Waiting for connection... attempt $attempts');
    }
    
    if (_isConnected) {
      LoggingService.instance.socket('Socket connection established successfully');
    } else {
      LoggingService.instance.warning('Socket connection timeout after ${maxAttempts * 500}ms');
    }
  }

  // Disconnect socket
  void disconnect() {
    if (_socket != null) {
      LoggingService.instance.socket('Disconnecting...');
      try {
        _socket!.disconnect();
        _socket!.dispose();
      } catch (e) {
        LoggingService.instance.error('Error during socket disconnect', e);
      } finally {
        _socket = null;
        _isConnected = false;
      }
    }
  }

  // Reset socket service (for logout/login scenarios)
  void reset() {
    LoggingService.instance.socket('Resetting socket service...');
    
    // Disconnect and dispose socket first
    disconnect();
    _isConnected = false;
    
    // Only close controllers if they're not already closed
    if (!_loyaltyPointController.isClosed) {
      _loyaltyPointController.close();
    }
    if (!_otpSentController.isClosed) {
      _otpSentController.close();
    }
    if (!_otpVerifiedController.isClosed) {
      _otpVerifiedController.close();
    }
    if (!_promoUpdatedController.isClosed) {
      _promoUpdatedController.close();
    }
    if (!_newPromoCreatedController.isClosed) {
      _newPromoCreatedController.close();
    }
    if (!_promoDeletedController.isClosed) {
      _promoDeletedController.close();
    }
    
    // Recreate stream controllers for fresh state
    _loyaltyPointController = StreamController<Map<String, dynamic>>.broadcast();
    _otpSentController = StreamController<Map<String, dynamic>>.broadcast();
    _otpVerifiedController = StreamController<Map<String, dynamic>>.broadcast();
    _promoUpdatedController = StreamController<Map<String, dynamic>>.broadcast();
    _newPromoCreatedController = StreamController<Map<String, dynamic>>.broadcast();
    _promoDeletedController = StreamController<Map<String, dynamic>>.broadcast();
    
    LoggingService.instance.socket('Socket service reset complete');
  }

  // Manual reconnection method (no auto-reconnect)
  Future<bool> reconnect() async {
    if (_socket == null) {
      LoggingService.instance.warning('Cannot reconnect - socket not initialized');
      return false;
    }
    
    try {
      LoggingService.instance.socket('Attempting manual reconnection...');
      _socket!.connect();
      await _waitForConnection();
      return _isConnected;
    } catch (e) {
      LoggingService.instance.error('Manual reconnection failed', e);
      return false;
    }
  }

  // Check if connected
  bool get isConnected => _isConnected;

  // Emit custom events (if needed)
  void emit(String event, dynamic data) {
    if (_socket != null && _isConnected) {
      LoggingService.instance.socket('Emitting $event', data);
      _socket!.emit(event, data);
    } else {
      LoggingService.instance.warning('Cannot emit - not connected');
    }
  }

  // Test socket connection
  Future<bool> testConnection() async {
    if (_socket == null) {
      LoggingService.instance.error('Socket not initialized');
      return false;
    }
    
    if (!_isConnected) {
      LoggingService.instance.error('Socket not connected');
      return false;
    }
    
    LoggingService.instance.socket('Socket connection test passed');
    return true;
  }

  // Test socket with a ping
  Future<bool> pingServer() async {
    if (_socket == null || !_isConnected) {
      LoggingService.instance.warning('Cannot ping - socket not connected');
      return false;
    }
    
    try {
      // Emit a test event
      _socket!.emit('ping', {'timestamp': DateTime.now().millisecondsSinceEpoch});
      LoggingService.instance.socket('Ping sent to server');
      return true;
    } catch (e) {
      LoggingService.instance.error('Error pinging server', e);
      return false;
    }
  }

  // Get connection status with details
  Map<String, dynamic> getConnectionStatus() {
    return {
      'isInitialized': _socket != null,
      'isConnected': _isConnected,
      'socketId': _socket?.id,
    };
  }

  // Dispose resources
  void dispose() {
    disconnect();
    
    // Only close controllers if they're not already closed
    if (!_loyaltyPointController.isClosed) {
      _loyaltyPointController.close();
    }
    if (!_otpSentController.isClosed) {
      _otpSentController.close();
    }
    if (!_otpVerifiedController.isClosed) {
      _otpVerifiedController.close();
    }
    if (!_promoUpdatedController.isClosed) {
      _promoUpdatedController.close();
    }
    if (!_newPromoCreatedController.isClosed) {
      _newPromoCreatedController.close();
    }
    if (!_promoDeletedController.isClosed) {
      _promoDeletedController.close();
    }
    if (!_scanLimitController.isClosed) {
      _scanLimitController.close();
    }
    if (!_scanWarningController.isClosed) {
      _scanWarningController.close();
    }
  }
}
