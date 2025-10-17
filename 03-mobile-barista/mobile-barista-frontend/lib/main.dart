import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'config.dart';
import 'login.dart';
import 'utils/logger.dart';
void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Initialize dotenv with default values to prevent NotInitializedError
  try {
    Logger.config('Initializing environment variables...', 'MAIN');
    
    // Always initialize dotenv with default values first
    await dotenv.load(fileName: ".env", mergeWith: {
      'SERVER_HOST': 'nomu-backend.onrender.com',
      'SERVER_PORT': '443',
    });
    Logger.success('Default environment variables initialized', 'MAIN');
    
    // Try to load from mobile-barista-backend/.env file to override defaults
    try {
      await dotenv.load(fileName: "../mobile-barista-backend/.env", mergeWith: dotenv.env);
      Logger.success('Mobile barista backend .env file loaded and merged', 'MAIN');
    } catch (e) {
      Logger.warning('Mobile barista backend .env file not found, using defaults: $e', 'MAIN');
    }
    
    // Log server configuration
    final host = dotenv.env['SERVER_HOST'] ?? 'nomu-backend.onrender.com';
    final port = dotenv.env['SERVER_PORT'] ?? '443';
    Logger.api('Server configuration:');
    Logger.api('   - HOST: $host');
    Logger.api('   - PORT: $port');
    
    // Log detailed configuration after initialization
    try {
      final config = await Config.getDetailedServerConfig();
      Logger.config('Detailed configuration:');
      Logger.config('   - Resolved Host: ${config['host']}');
      Logger.config('   - Resolved Port: ${config['port']}');
      Logger.config('   - Base URL: ${config['baseUrl']}');
      Logger.config('   - Using Override: ${config['isUsingOverride']}');
      Logger.config('   - Platform: ${config['platform']}');
      Logger.config('   - Is Web: ${config['isWeb']}');
    } catch (e) {
      Logger.warning('Could not get detailed config: $e', 'MAIN');
    }
  } catch (e) {
    Logger.error('Failed to initialize environment: $e', 'MAIN');
    Logger.warning('App will continue with hardcoded defaults', 'MAIN');
    
    // Last resort: try to initialize with empty file
    try {
      await dotenv.load(fileName: ".env", mergeWith: {
        'SERVER_HOST': '192.168.100.131',
        'SERVER_PORT': '5001',
      });
      Logger.success('Emergency fallback environment initialized', 'MAIN');
    } catch (fallbackError) {
      Logger.error('Emergency fallback also failed: $fallbackError', 'MAIN');
    }
  }
  
  // Force clear any existing server overrides to ensure we use the correct IP
  try {
    await Config.forceResetToDefaults();
    Logger.debug('Force reset to default server configuration', 'MAIN');
    
    // Also clear all SharedPreferences to remove any cached data
    final prefs = await SharedPreferences.getInstance();
    await prefs.clear();
    Logger.debug('Cleared all SharedPreferences cache', 'MAIN');
    
    // Force set the correct server configuration
    await Config.forceSetCorrectServer();
    Logger.debug('Force set correct server configuration', 'MAIN');
    
    // Test server connectivity
    await Config.testServerConnectivity();
  } catch (e) {
    Logger.warning('Could not clear server overrides: $e', 'MAIN');
  }
  
  Logger.info('Starting NOMU Barista Scanner App...', 'MAIN');
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return const MaterialApp(
      home: LoginPage(),
      debugShowCheckedModeBanner: false,
    );
  }
}
