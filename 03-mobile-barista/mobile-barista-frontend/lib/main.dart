import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'config.dart';
import 'login.dart';
import 'utils/logger.dart';
void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Initialize dotenv with default values to prevent NotInitializedError
  try {
    Logger.config('Initializing environment variables...', 'MAIN');
    
    // Deployed Render API (do not load barista-backend/.env — its SERVER_HOST=0.0.0.0 is for Node only)
    const deployedApi = {
      'SERVER_HOST': 'nomu-mobile-backend.onrender.com',
      'SERVER_PORT': '443',
    };
    await dotenv.load(
      fileName: '.env',
      isOptional: true,
      mergeWith: deployedApi,
    );
    Logger.success('Environment initialized for Render deployment', 'MAIN');
    
    // Log server configuration
    final host = dotenv.env['SERVER_HOST'] ?? 'nomu-mobile-backend.onrender.com';
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
    Logger.warning('App will continue with Render API defaults', 'MAIN');
    dotenv.testLoad(
      fileInput:
          'SERVER_HOST=nomu-mobile-backend.onrender.com\nSERVER_PORT=443\n',
    );
  }
  
  // Force clear any existing server overrides to ensure we use the correct IP
  try {
    await Config.forceResetToDefaults();
    Logger.debug('Force reset to default server configuration', 'MAIN');
    
    // Do not clear all SharedPreferences here — it would wipe login / remember-until state on every launch.

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
