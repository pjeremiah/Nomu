import '../config/app_config.dart';

enum LogLevel {
  debug,
  info,
  warning,
  error,
}

class Logger {
  static const String _prefix = '[NOMU]';
  
  // Log level based on configuration
  static LogLevel get _currentLogLevel {
    if (AppConfig.isProduction) {
      return LogLevel.warning; // Only warnings and errors in production
    } else {
      return LogLevel.debug; // All logs in development
    }
  }
  
  // Check if a log level should be printed
  static bool _shouldLog(LogLevel level) {
    return level.index >= _currentLogLevel.index;
  }
  
  // Format log message with timestamp and level
  static String _formatMessage(LogLevel level, String message, [String? tag]) {
    final timestamp = DateTime.now().toIso8601String().substring(11, 23);
    final levelStr = level.name.toUpperCase().padRight(7);
    final tagStr = tag != null ? '[$tag]' : '';
    return '$timestamp $levelStr $_prefix$tagStr $message';
  }
  
  // Debug logs (only in development)
  static void debug(String message, [String? tag]) {
    if (_shouldLog(LogLevel.debug)) {
      print(_formatMessage(LogLevel.debug, message, tag));
    }
  }
  
  // Info logs
  static void info(String message, [String? tag]) {
    if (_shouldLog(LogLevel.info)) {
      print(_formatMessage(LogLevel.info, message, tag));
    }
  }
  
  // Warning logs
  static void warning(String message, [String? tag]) {
    if (_shouldLog(LogLevel.warning)) {
      print(_formatMessage(LogLevel.warning, message, tag));
    }
  }
  
  // Error logs (always shown)
  static void error(String message, [String? tag]) {
    if (_shouldLog(LogLevel.error)) {
      print(_formatMessage(LogLevel.error, message, tag));
    }
  }
  
  // Success logs (info level with success emoji)
  static void success(String message, [String? tag]) {
    if (_shouldLog(LogLevel.info)) {
      print(_formatMessage(LogLevel.info, '✅ $message', tag));
    }
  }
  
  // API logs (for API calls)
  static void api(String message, [String? tag]) {
    if (_shouldLog(LogLevel.info)) {
      print(_formatMessage(LogLevel.info, '🌐 $message', tag));
    }
  }
  
  // QR Scanner logs
  static void qr(String message, [String? tag]) {
    if (_shouldLog(LogLevel.info)) {
      print(_formatMessage(LogLevel.info, '🔍 $message', tag));
    }
  }
  
  // Socket logs
  static void socket(String message, [String? tag]) {
    if (_shouldLog(LogLevel.info)) {
      print(_formatMessage(LogLevel.info, '🔌 $message', tag));
    }
  }
  
  // Transaction logs
  static void transaction(String message, [String? tag]) {
    if (_shouldLog(LogLevel.info)) {
      print(_formatMessage(LogLevel.info, '🛒 $message', tag));
    }
  }
  
  // Barista logs
  static void barista(String message, [String? tag]) {
    if (_shouldLog(LogLevel.info)) {
      print(_formatMessage(LogLevel.info, '☕ $message', tag));
    }
  }
  
  // Login/Auth logs
  static void auth(String message, [String? tag]) {
    if (_shouldLog(LogLevel.info)) {
      print(_formatMessage(LogLevel.info, '🔐 $message', tag));
    }
  }
  
  // Configuration logs
  static void config(String message, [String? tag]) {
    if (_shouldLog(LogLevel.info)) {
      print(_formatMessage(LogLevel.info, '⚙️ $message', tag));
    }
  }
  
  // Test/Debug logs (only in development)
  static void test(String message, [String? tag]) {
    if (AppConfig.enableDebugButtons && _shouldLog(LogLevel.debug)) {
      print(_formatMessage(LogLevel.debug, '🧪 $message', tag));
    }
  }
  
  // Exception logs (always shown with stack trace)
  static void exception(String message, dynamic error, [String? tag]) {
    if (_shouldLog(LogLevel.error)) {
      print(_formatMessage(LogLevel.error, '💥 $message: $error', tag));
      if (AppConfig.isDevelopment) {
        print('Stack trace: ${error.toString()}');
      }
    }
  }
}
