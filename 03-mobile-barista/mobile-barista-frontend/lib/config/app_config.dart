class AppConfig {
  static const bool _isProduction = bool.fromEnvironment('PRODUCTION', defaultValue: false);
  static const bool _isDebug = bool.fromEnvironment('DEBUG', defaultValue: true);
  
  // Environment detection
  static bool get isProduction => _isProduction;
  static bool get isDevelopment => !_isProduction;
  static bool get isDebug => _isDebug;
  
  // Debug features (only enabled in development)
  static bool get enableDebugButtons => isDevelopment;
  static bool get enableTestQRCode => isDevelopment;
  static bool get enableVerboseLogging => isDevelopment;
  static bool get enableSocketDebug => isDevelopment;
  
  // Production features
  static bool get enableAnalytics => isProduction;
  static bool get enableCrashReporting => isProduction;
  static bool get enablePerformanceMonitoring => isProduction;
  
  // Server configuration based on environment
  static String get defaultServerHost {
    if (isProduction) {
      return 'your-production-server.com';
    } else {
      return '192.168.100.3';
    }
  }
  
  static String get defaultServerPort {
    if (isProduction) {
      return '443'; // HTTPS port
    } else {
      return '5001'; // HTTP port
    }
  }
  
  static String get mobileAdminPort {
    if (isProduction) {
      return '443'; // HTTPS port
    } else {
      return '5001'; // HTTP port
    }
  }
  
  static String get serverScheme {
    if (isProduction) {
      return 'https';
    } else {
      return 'http';
    }
  }
  
  // API configuration
  static Duration get apiTimeout {
    if (isProduction) {
      return const Duration(seconds: 15); // Longer timeout for production
    } else {
      return const Duration(seconds: 10); // Shorter timeout for development
    }
  }
  
  static int get maxRetries {
    if (isProduction) {
      return 5; // More retries in production
    } else {
      return 3; // Fewer retries in development
    }
  }
  
  // UI configuration
  static bool get showDebugInfo => isDevelopment;
  static bool get enableHapticFeedback => true; // Always enabled
  static bool get enableAnimations => true; // Always enabled
  
  // Logging configuration
  static bool get shouldLogToConsole => isDevelopment;
  static bool get shouldLogToFile => isProduction;
  static String get logLevel => isProduction ? 'WARNING' : 'DEBUG';
  
  // Security configuration
  static bool get enableCertificatePinning => isProduction;
  static bool get enableNetworkSecurity => isProduction;
  static bool get enableDataEncryption => isProduction;
  
  // Feature flags
  static bool get enableRealTimeNotifications => true;
  static bool get enableOfflineMode => false; // Not implemented yet
  static bool get enableBiometricAuth => isProduction;
  static bool get enableAutoLogout => true;
  
  // Development helpers
  static Map<String, dynamic> get debugInfo => {
    'isProduction': isProduction,
    'isDevelopment': isDevelopment,
    'isDebug': isDebug,
    'defaultServerHost': defaultServerHost,
    'defaultServerPort': defaultServerPort,
    'serverScheme': serverScheme,
    'apiTimeout': apiTimeout.inSeconds,
    'maxRetries': maxRetries,
    'enableDebugButtons': enableDebugButtons,
    'enableTestQRCode': enableTestQRCode,
    'enableVerboseLogging': enableVerboseLogging,
  };
}
