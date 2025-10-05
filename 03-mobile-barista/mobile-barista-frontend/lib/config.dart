import 'package:flutter/foundation.dart' show kIsWeb, defaultTargetPlatform;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'constants/app_constants.dart';
import 'utils/logger.dart';

class Config {
  // Admin Scanner API Endpoints (Updated to use web backend endpoints)
  static Future<String> get adminSendOTPUrl async => '${await dynamicApiBaseUrl}/admin/request-otp';
  static Future<String> get adminVerifyOTPUrl async => '${await dynamicApiBaseUrl}/admin/verify-otp';
  static Future<String> get mobileAdminLoginUrl async => '${await dynamicApiBaseUrl}/login';
  static Future<String> get mobileAdminVerifyOTPUrl async => '${await dynamicApiBaseUrl}/admin/verify-otp';
  static Future<String> get mobileAdminResendOTPUrl async => '${await dynamicApiBaseUrl}/admin/request-otp';
  static Future<String> get apiBaseUrl async => await dynamicApiBaseUrl;
  
  // Health check endpoint
  static Future<String> get healthCheckUrl async => '${await dynamicApiBaseUrl}/health';
  
  // Server info endpoint
  static Future<String> get serverInfoUrl async => '${await dynamicApiBaseUrl}/info';
  
  // Supported admin roles
  static const List<String> supportedRoles = ['superadmin', 'manager', 'staff'];
  
  // Role display names
  static const Map<String, String> roleDisplayNames = {
    'superadmin': 'Super Admin',
    'manager': 'Manager',
    'staff': 'Staff',
  };
  
  // Get role display name
  static String getRoleDisplayName(String role) {
    return roleDisplayNames[role] ?? role.toUpperCase();
  }
  
  // Check if role is supported
  static bool isRoleSupported(String role) {
    return supportedRoles.contains(role);
  }
  
  // Get role hierarchy (for permission checking)
  static int getRoleHierarchy(String role) {
    switch (role) {
      case 'superadmin':
        return 3;
      case 'manager':
        return 2;
      case 'staff':
        return 1;
      default:
        return 0;
    }
  }
  
  // Check if role has permission (higher hierarchy = more permissions)
  static bool hasPermission(String userRole, String requiredRole) {
    return getRoleHierarchy(userRole) >= getRoleHierarchy(requiredRole);
  }

  // Legacy endpoints for backward compatibility
  static Future<String> get sendOtp async {
    final baseUrl = await dynamicApiBaseUrl;
    return '$baseUrl/send-otp';
  }

  static Future<String> get verifyOtp async {
    final baseUrl = await dynamicApiBaseUrl;
    return '$baseUrl/verify-otp';
  }

  static Future<String> get registration async => '${await dynamicApiBaseUrl}/register';
  static Future<String> get loginUrl async => '${await dynamicApiBaseUrl}/login';
  static Future<String> get userInfo async => '${await dynamicApiBaseUrl}/user';
  
  // Barista OTP endpoints
  static Future<String> get baristaSendOTPUrl async => '${await dynamicApiBaseUrl}/barista/send-login-otp';
  static Future<String> get baristaVerifyOTPUrl async => '${await dynamicApiBaseUrl}/barista/verify-login-otp';

  // Environment variables from .env file (with fallback to dart-define)
  static String get _envHost {
    try {
      // Check if dotenv is initialized before accessing
      if (dotenv.isInitialized) {
        return dotenv.env['SERVER_HOST'] ?? '';
      } else {
        return '';
      }
    } catch (e) {
      return '';
    }
  }
  
  static String get _envPort {
    try {
      // Check if dotenv is initialized before accessing
      if (dotenv.isInitialized) {
        return dotenv.env['SERVER_PORT'] ?? '';
      } else {
        return '';
      }
    } catch (e) {
      return '';
    }
  }
  
  // Build-time defines (fallback)
  static const String _definedHost = String.fromEnvironment('SERVER_HOST');
  static const String _definedPort = String.fromEnvironment('SERVER_PORT', defaultValue: '5001');

  // Preference keys for runtime overrides
  static const String _prefHostKey = 'server_host_override';
  static const String _prefPortKey = 'server_port_override';

  // Public API: precedence = in-app override > .env > dart-define > auto-discovery > default
  static Future<String> get dynamicApiBaseUrl async {
    final String host = await _resolveHost();
    final String port = await _resolvePort();
    
    // Use HTTPS for production backend
    if (host == 'nomu-backend.onrender.com') {
      return 'https://$host/api';
    } else {
      return 'http://$host:$port/api';
    }
  }

  // Runtime override controls
  static Future<void> setServerOverride({required String host, required String port}) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_prefHostKey, host.trim());
    await prefs.setString(_prefPortKey, port.trim());
  }

  static Future<void> clearServerOverride() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_prefHostKey);
    await prefs.remove(_prefPortKey);
    Logger.config('Cleared server override cache', 'CONFIG');
  }

  // Force clear all server-related cache and use defaults
  static Future<void> forceResetToDefaults() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_prefHostKey);
    await prefs.remove(_prefPortKey);
    // Also clear any other cached server data
    await prefs.remove('server_host_override');
    await prefs.remove('server_port_override');
    Logger.config('Force reset to default server configuration', 'CONFIG');
  }

  // Force set the correct server configuration
  static Future<void> forceSetCorrectServer() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_prefHostKey, AppConstants.defaultServerHost);
    await prefs.setString(_prefPortKey, AppConstants.defaultServerPort);
    Logger.config('Force set server to: ${AppConstants.defaultServerHost}:${AppConstants.defaultServerPort}', 'CONFIG');
  }

  // Test server connectivity
  static Future<void> testServerConnectivity() async {
    try {
      final host = await _resolveHost();
      final port = await _resolvePort();
      final mobilePort = AppConstants.mobileAdminPort;
      
      Logger.config('Testing server connectivity...');
      Logger.config('   - Main API: http://$host:$port/api');
      Logger.config('   - Mobile Admin: http://$host:$mobilePort/api/mobile/admin/login');
      Logger.config('   - Health Check: http://$host:$port/api/health');
    } catch (e) {
      Logger.error('Error testing server connectivity: $e', 'CONFIG');
    }
  }

  static Future<Map<String, String>> currentResolvedServer() async {
    final host = await _resolveHost();
    final port = await _resolvePort();
    return {'host': host, 'port': port};
  }

  // Internals
  static Future<String> _resolveHost() async {
    final prefs = await SharedPreferences.getInstance();
    final overrideHost = prefs.getString(_prefHostKey);
    
    Logger.config('Resolving host...');
    Logger.config('   - Override host: $overrideHost');
    Logger.config('   - Env host: $_envHost');
    Logger.config('   - Defined host: $_definedHost');
    Logger.config('   - Default host: ${AppConstants.defaultServerHost}');
    
    if (overrideHost != null && overrideHost.trim().isNotEmpty) {
      Logger.config('Using override host: $overrideHost');
      return overrideHost.trim();
    }

    // Check .env file first
    if (_envHost.isNotEmpty) {
      Logger.config('Using env host: $_envHost');
      return _envHost;
    }

    if (_definedHost.isNotEmpty) {
      Logger.config('Using defined host: $_definedHost');
      return _definedHost;
    }

    if (kIsWeb) {
      // For web browser, use the current host or localhost
      final String host = Uri.base.host.isNotEmpty ? Uri.base.host : 'localhost';
      Logger.config('Using web host: $host');
      return host;
    }

    // Manual IP configuration - replace with your server IP
    const String manualHost = AppConstants.defaultServerHost;
    
    // Skip auto-discovery and use manual host directly
    Logger.config('Using manual host: $manualHost');
    return manualHost;
  }

  static Future<String> _resolvePort() async {
    final prefs = await SharedPreferences.getInstance();
    final overridePort = prefs.getString(_prefPortKey);
    if (overridePort != null && overridePort.trim().isNotEmpty) {
      return overridePort.trim();
    }
    
    // Check .env file first
    if (_envPort.isNotEmpty) return _envPort;
    
    // Manual port configuration - replace with your server port
    const String manualPort = AppConstants.defaultServerPort;
    
    return _definedPort.isNotEmpty ? _definedPort : manualPort;
  }



  // Get current server configuration for display
  static Future<String> getCurrentServerConfig() async {
    final host = await _resolveHost();
    final port = await _resolvePort();
    return '$host:$port';
  }

  // Get detailed server configuration for debugging
  static Future<Map<String, dynamic>> getDetailedServerConfig() async {
    final host = await _resolveHost();
    final port = await _resolvePort();
    final baseUrl = await dynamicApiBaseUrl;
    
    return {
      'host': host,
      'port': port,
      'baseUrl': baseUrl,
      'isUsingOverride': await isUsingManualOverride(),
      'platform': defaultTargetPlatform.toString(),
      'isWeb': kIsWeb,
    };
  }

  // Check if using manual override
  static Future<bool> isUsingManualOverride() async {
    final prefs = await SharedPreferences.getInstance();
    final overrideHost = prefs.getString(_prefHostKey);
    final overridePort = prefs.getString(_prefPortKey);
    return (overrideHost != null && overrideHost.trim().isNotEmpty) ||
           (overridePort != null && overridePort.trim().isNotEmpty);
  }
}