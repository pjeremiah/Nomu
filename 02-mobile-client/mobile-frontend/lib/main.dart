import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'login.dart';
import 'config.dart';
import 'services/socket_service.dart';
import 'services/realtime_notification_service.dart';
import 'services/scan_limit_notification_service.dart';
import 'services/logging_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Initialize logging service first
  LoggingService.instance.initialize();
  
  try {
    // Load environment variables from .env file
    LoggingService.instance.info('Loading environment variables from .env file...');
    
    // Check if running on web
    if (kIsWeb) {
      LoggingService.instance.info('Running on web - using web-compatible .env loading');
      // For web, try to load from assets
      await dotenv.load(fileName: "assets/backend/.env");
    } else {
      // For mobile, use the mobile backend path
      await dotenv.load(fileName: "../mobile-backend/.env");
    }
    
    LoggingService.instance.info('.env file loaded successfully');
    
    // Log server configuration
    final host = dotenv.env['SERVER_HOST'] ?? 'NOT_SET';
    final port = dotenv.env['SERVER_PORT'] ?? 'NOT_SET';
    LoggingService.instance.info('Server configuration: HOST: $host, PORT: $port, CURRENT SERVER: ${await Config.getCurrentServerConfig()}');
  } catch (e) {
    LoggingService.instance.error('Failed to load .env file', e);
    LoggingService.instance.warning('App will continue with default configuration');
  }
  
  LoggingService.instance.info('Starting NOMU Mobile App...');
  
  // Initialize socket service for real-time updates (only once)
  try {
    LoggingService.instance.info('Initializing socket service...');
    await SocketService.instance.initialize();
    LoggingService.instance.info('Socket service initialized successfully');
  } catch (e) {
    LoggingService.instance.error('Failed to initialize socket service', e);
    LoggingService.instance.warning('App will continue without real-time features');
  }
  
  // Initialize real-time notification service
  try {
    await RealtimeNotificationService.instance.initialize();
    LoggingService.instance.info('Real-time notification service initialized');
  } catch (e) {
    LoggingService.instance.error('Failed to initialize notification service', e);
    LoggingService.instance.warning('App will continue without real-time notifications');
  }
  
  // Initialize scan limit notification service
  try {
    await ScanLimitNotificationService.instance.initialize();
    LoggingService.instance.info('Scan limit notification service initialized');
  } catch (e) {
    LoggingService.instance.error('Failed to initialize scan limit notification service', e);
    LoggingService.instance.warning('App will continue without scan limit notifications');
  }
  
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return const MaterialApp(
      home: SplashScreen(),
      debugShowCheckedModeBanner: false,
    );
  }
}

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  @override
  void initState() {
    super.initState();
    Future.delayed(const Duration(seconds: 3), () {
      if (mounted) {
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(builder: (context) => const LoginPage()),
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        fit: StackFit.expand,
        children: [
          Image.asset(
            'assets/images/istetik.png',
            fit: BoxFit.cover,
          ),
          Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                SizedBox(
                  width: 150,
                  height: 150,
                  child: Image.asset(
                    'assets/images/nomutrans.png',
                    fit: BoxFit.cover,
                  ),
                ),
                const SizedBox(height: 30),
                const CircularProgressIndicator(
                  valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
