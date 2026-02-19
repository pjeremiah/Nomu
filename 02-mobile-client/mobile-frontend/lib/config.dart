import 'package:flutter/foundation.dart' show kIsWeb, defaultTargetPlatform, TargetPlatform;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'services/logging_service.dart';

class Config {
  // Base API URL - Use dynamic resolution for consistency
  static Future<String> get apiBaseUrl async => await dynamicApiBaseUrl;
  
  // Health check endpoint
  static Future<String> get healthCheckUrl async => '${await dynamicApiBaseUrl}/health';
  
  // Server info endpoint
  static Future<String> get serverInfoUrl async => '${await dynamicApiBaseUrl}/info';
  

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
  static Future<String> get loginUrl async => '${await dynamicApiBaseUrl}/user/login';
  static Future<String> get userInfo async => '${await dynamicApiBaseUrl}/user';
  

  // Environment variables from .env file (with fallback to dart-define)
  static String get _envHost {
    try {
      return dotenv.env['SERVER_HOST'] ?? '';
    } catch (e) {
      LoggingService.instance.warning('dotenv not initialized, using fallback for host');
      return '';
    }
  }
  
  static String get _envOpenAIKey {
    try {
      return dotenv.env['OPENAI_API_KEY'] ?? '';
    } catch (e) {
      LoggingService.instance.warning('dotenv not initialized, using fallback for OpenAI key');
      return '';
    }
  }
  
  static String get _envPort {
    try {
      return dotenv.env['SERVER_PORT'] ?? '';
    } catch (e) {
      LoggingService.instance.warning('dotenv not initialized, using fallback for port');
      return '';
    }
  }
  
  // Build-time defines (fallback)
  static const String _definedHost = String.fromEnvironment('SERVER_HOST');
  static const String _definedPort = String.fromEnvironment('SERVER_PORT', defaultValue: '5000');
  static const String _definedOpenAIKey = String.fromEnvironment('OPENAI_API_KEY');

  // Preference keys for runtime overrides
  static const String _prefHostKey = 'server_host_override';
  static const String _prefPortKey = 'server_port_override';

  // Public API: precedence = in-app override > .env > dart-define > default
  static Future<String> get dynamicApiBaseUrl async {
    final String host = await _resolveHost();
    final String port = await _resolvePort();
    
    // For web, try HTTPS first, fallback to HTTP for localhost
    if (kIsWeb) {
      if (host == 'localhost' || host == '127.0.0.1') {
        // For localhost, use HTTP (no CORS issues with same origin)
        return 'http://$host:$port/api';
      } else {
        // For production domains, use HTTPS
        return 'https://$host:$port/api';
      }
    } else {
      // For mobile, use HTTPS for production backend
      if (host == 'nomu-backend.onrender.com') {
        return 'https://$host/api';
      } else {
        return 'http://$host:$port/api';
      }
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
  }

  static Future<Map<String, String>> currentResolvedServer() async {
    final host = await _resolveHost();
    final port = await _resolvePort();
    return {'host': host, 'port': port};
  }

  // Internals
  static Future<String> _resolveHost() async {
    LoggingService.instance.info('Resolving host...', {
      'platform': defaultTargetPlatform.toString(),
      'isWeb': kIsWeb,
    });
    
    final prefs = await SharedPreferences.getInstance();
    final overrideHost = prefs.getString(_prefHostKey);
    if (overrideHost != null && overrideHost.trim().isNotEmpty) {
      LoggingService.instance.info('Using override host: $overrideHost');
      return overrideHost.trim();
    }

    // Check .env file first
    if (_envHost.isNotEmpty) {
      LoggingService.instance.info('Using .env host: $_envHost');
      return _envHost;
    }

    if (_definedHost.isNotEmpty) {
      LoggingService.instance.info('Using defined host: $_definedHost');
      return _definedHost;
    }

    if (kIsWeb) {
      // For web browser, use the current host or localhost
      final String host = Uri.base.host.isNotEmpty ? Uri.base.host : 'localhost';
      LoggingService.instance.info('Web detected - using host: $host');
      return host;
    }
    
    // Production backend for mobile app
    if (defaultTargetPlatform == TargetPlatform.android) {
      // For production, use the deployed backend
      LoggingService.instance.info('Android detected - using production backend: nomu-backend.onrender.com');
      return 'nomu-backend.onrender.com';
    }
    
    LoggingService.instance.info('Fallback to localhost');
    return 'localhost';
  }

  static Future<String> _resolvePort() async {
    final prefs = await SharedPreferences.getInstance();
    final overridePort = prefs.getString(_prefPortKey);
    if (overridePort != null && overridePort.trim().isNotEmpty) {
      return overridePort.trim();
    }
    
    // Check .env file first
    if (_envPort.isNotEmpty) return _envPort;
    
    // For production backend, use HTTPS (no port needed)
    final host = await _resolveHost();
    if (host == 'nomu-backend.onrender.com') {
      return '443'; // HTTPS port
    }
    
    return _definedPort.isNotEmpty ? _definedPort : '5000';
  }

  // Get current server configuration for display
  static Future<String> getCurrentServerConfig() async {
    final host = await _resolveHost();
    final port = await _resolvePort();
    return '$host:$port';
  }

  // Check if using manual override
  static Future<bool> isUsingManualOverride() async {
    final prefs = await SharedPreferences.getInstance();
    final overrideHost = prefs.getString(_prefHostKey);
    final overridePort = prefs.getString(_prefPortKey);
    return (overrideHost != null && overrideHost.trim().isNotEmpty) ||
           (overridePort != null && overridePort.trim().isNotEmpty);
  }

  // OpenAI API Key configuration
  static String get openAIKey {
    // Try .env file first
    if (_envOpenAIKey.isNotEmpty) return _envOpenAIKey;
    
    // Fallback to build-time define
    if (_definedOpenAIKey.isNotEmpty) return _definedOpenAIKey;
    
    // Return empty string if not found
    LoggingService.instance.warning('OpenAI API key not found in environment variables');
    return '';
  }

  // Check if OpenAI is configured
  static bool get isOpenAIConfigured => openAIKey.isNotEmpty;
}
