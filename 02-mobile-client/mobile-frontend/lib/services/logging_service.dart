import 'dart:developer' as developer;
import 'package:flutter/foundation.dart';
import 'package:logger/logger.dart';

class LoggingService {
  static LoggingService? _instance;
  static LoggingService get instance {
    _instance ??= LoggingService._internal();
    return _instance!;
  }

  LoggingService._internal();

  late Logger _logger;
  bool _isInitialized = false;

  void initialize() {
    if (_isInitialized) return;
    
    _logger = Logger(
      printer: PrettyPrinter(
        methodCount: 2,
        errorMethodCount: 8,
        lineLength: 120,
        colors: true,
        printEmojis: true,
        printTime: true,
      ),
    );
    _isInitialized = true;
  }

  // Debug logging - only in debug builds
  void debug(String message, [dynamic error, StackTrace? stackTrace]) {
    if (kDebugMode) {
      try {
        _logger.d(message, error: error, stackTrace: stackTrace);
      } catch (e) {
        // Fallback to basic logging if logger fails
        print('DEBUG: $message');
        if (error != null) print('Error: $error');
      }
    }
  }

  // Info logging - works in both debug and release
  void info(String message, [dynamic error, StackTrace? stackTrace]) {
    if (kDebugMode) {
      try {
        _logger.i(message, error: error, stackTrace: stackTrace);
      } catch (e) {
        // Fallback to basic logging if logger fails
        print('INFO: $message');
        if (error != null) print('Error: $error');
      }
    } else {
      // In release builds, use developer.log for production logging
      try {
        developer.log(
          message,
          name: 'NOMU_APP',
          level: 800,
          time: DateTime.now(),
          error: error,
        );
      } catch (e) {
        // Fallback to basic logging if developer.log fails
        print('INFO: $message');
        if (error != null) print('Error: $error');
      }
    }
  }

  // Warning logging
  void warning(String message, [dynamic error, StackTrace? stackTrace]) {
    if (kDebugMode) {
      try {
        _logger.w(message, error: error, stackTrace: stackTrace);
      } catch (e) {
        print('WARNING: $message');
        if (error != null) print('Error: $error');
      }
    } else {
      try {
        developer.log(
          message,
          name: 'NOMU_APP',
          level: 900,
          time: DateTime.now(),
          error: error,
        );
      } catch (e) {
        print('WARNING: $message');
        if (error != null) print('Error: $error');
      }
    }
  }

  // Error logging
  void error(String message, [dynamic error, StackTrace? stackTrace]) {
    if (kDebugMode) {
      try {
        _logger.e(message, error: error, stackTrace: stackTrace);
      } catch (e) {
        print('ERROR: $message');
        if (error != null) print('Error: $error');
      }
    } else {
      try {
        developer.log(
          message,
          name: 'NOMU_APP',
          level: 1000,
          time: DateTime.now(),
          error: error,
        );
      } catch (e) {
        print('ERROR: $message');
        if (error != null) print('Error: $error');
      }
    }
  }

  // Production logging - always works, even in release builds
  void production(String message, [Map<String, dynamic>? data]) {
    try {
      developer.log(
        message,
        name: 'NOMU_APP',
        level: 800,
        time: DateTime.now(),
        error: data,
      );
    } catch (e) {
      print('PRODUCTION: $message');
      if (data != null) print('Data: $data');
    }
  }

  // Socket-specific logging
  void socket(String message, [Map<String, dynamic>? data]) {
    final fullMessage = '🔌 [SOCKET] $message';
    if (kDebugMode) {
      try {
        _logger.i(fullMessage, error: data);
      } catch (e) {
        print('SOCKET: $fullMessage');
        if (data != null) print('Data: $data');
      }
    } else {
      try {
        developer.log(
          fullMessage,
          name: 'NOMU_SOCKET',
          level: 800,
          time: DateTime.now(),
          error: data,
        );
      } catch (e) {
        print('SOCKET: $fullMessage');
        if (data != null) print('Data: $data');
      }
    }
  }

  // Homepage-specific logging
  void homepage(String message, [Map<String, dynamic>? data]) {
    final fullMessage = '🏠 [HOMEPAGE] $message';
    if (kDebugMode) {
      try {
        _logger.i(fullMessage, error: data);
      } catch (e) {
        print('HOMEPAGE: $fullMessage');
        if (data != null) print('Data: $data');
      }
    } else {
      try {
        developer.log(
          fullMessage,
          name: 'NOMU_HOMEPAGE',
          level: 800,
          time: DateTime.now(),
          error: data,
        );
      } catch (e) {
        print('HOMEPAGE: $fullMessage');
        if (data != null) print('Data: $data');
      }
    }
  }

  // Loyalty-specific logging
  void loyalty(String message, [Map<String, dynamic>? data]) {
    final fullMessage = '🎯 [LOYALTY] $message';
    if (kDebugMode) {
      try {
        _logger.i(fullMessage, error: data);
      } catch (e) {
        print('LOYALTY: $fullMessage');
        if (data != null) print('Data: $data');
      }
    } else {
      try {
        developer.log(
          fullMessage,
          name: 'NOMU_LOYALTY',
          level: 800,
          time: DateTime.now(),
          error: data,
        );
      } catch (e) {
        print('LOYALTY: $fullMessage');
        if (data != null) print('Data: $data');
      }
    }
  }

  // API-specific logging
  void api(String message, [Map<String, dynamic>? data]) {
    final fullMessage = '🌐 [API] $message';
    if (kDebugMode) {
      try {
        _logger.i(fullMessage, error: data);
      } catch (e) {
        print('API: $fullMessage');
        if (data != null) print('Data: $data');
      }
    } else {
      try {
        developer.log(
          fullMessage,
          name: 'NOMU_API',
          level: 800,
          time: DateTime.now(),
          error: data,
        );
      } catch (e) {
        print('API: $fullMessage');
        if (data != null) print('Data: $data');
      }
    }
  }

  // Promo-specific logging
  void promo(String message, [Map<String, dynamic>? data]) {
    final fullMessage = '🎯 [PROMO] $message';
    if (kDebugMode) {
      try {
        _logger.i(fullMessage, error: data);
      } catch (e) {
        print('PROMO: $fullMessage');
        if (data != null) print('Data: $data');
      }
    } else {
      try {
        developer.log(
          fullMessage,
          name: 'NOMU_PROMO',
          level: 800,
          time: DateTime.now(),
          error: data,
        );
      } catch (e) {
        print('PROMO: $fullMessage');
        if (data != null) print('Data: $data');
      }
    }
  }

  // Performance logging
  void performance(String operation, int durationMs, [Map<String, dynamic>? data]) {
    final message = '⚡ [PERFORMANCE] $operation took ${durationMs}ms';
    if (kDebugMode) {
      try {
        _logger.i(message, error: data);
      } catch (e) {
        print('PERFORMANCE: $message');
        if (data != null) print('Data: $data');
      }
    } else {
      try {
        developer.log(
          message,
          name: 'NOMU_PERFORMANCE',
          level: 800,
          time: DateTime.now(),
          error: data,
        );
      } catch (e) {
        print('PERFORMANCE: $message');
        if (data != null) print('Data: $data');
      }
    }
  }

  // Logout-specific logging
  void logout(String message, [Map<String, dynamic>? data]) {
    final fullMessage = '🚪 [LOGOUT] $message';
    if (kDebugMode) {
      try {
        _logger.i(fullMessage, error: data);
      } catch (e) {
        print('LOGOUT: $fullMessage');
        if (data != null) print('Data: $data');
      }
    } else {
      try {
        developer.log(
          fullMessage,
          name: 'NOMU_LOGOUT',
          level: 800,
          time: DateTime.now(),
          error: data,
        );
      } catch (e) {
        print('LOGOUT: $fullMessage');
        if (data != null) print('Data: $data');
      }
    }
  }

  // Authentication logging
  void auth(String message, [Map<String, dynamic>? data]) {
    final fullMessage = '🔐 [AUTH] $message';
    if (kDebugMode) {
      try {
        _logger.i(fullMessage, error: data);
      } catch (e) {
        print('AUTH: $fullMessage');
        if (data != null) print('Data: $data');
      }
    } else {
      try {
        developer.log(
          fullMessage,
          name: 'NOMU_AUTH',
          level: 800,
          time: DateTime.now(),
          error: data,
        );
      } catch (e) {
        print('AUTH: $fullMessage');
        if (data != null) print('Data: $data');
      }
    }
  }
}
