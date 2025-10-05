import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter/material.dart';
import 'socket_service.dart';
import 'logging_service.dart';

class LogoutService {
  static LogoutService? _instance;
  
  // Singleton pattern
  static LogoutService get instance {
    _instance ??= LogoutService._internal();
    return _instance!;
  }

  LogoutService._internal();

  /// Performs a complete logout by clearing all user data and resetting app state
  static Future<void> performLogout(BuildContext context, Widget loginPage) async {
    try {
      LoggingService.instance.logout('Starting logout process...');
      
      // 1. Navigate to login page immediately for better UX
      _navigateToLoginImmediately(context, loginPage);
      
      // 2. Clear all SharedPreferences data in background
      _clearUserData();
      
      // 3. Disconnect WebSocket connection in background
      _resetWebSocketConnection();
      
      LoggingService.instance.logout('Logout completed successfully');
    } catch (e) {
      LoggingService.instance.error('Error during logout', e);
      // Even if there's an error, try to navigate to login
      _navigateToLoginImmediately(context, loginPage);
    }
  }

  /// Clear all user-related data from SharedPreferences
  static Future<void> _clearUserData() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      
      // List of user session keys to clear (but keep login form data)
      final sessionKeysToRemove = [
        'user_email',
        'fullName', 
        'user_id',
        'user_role',
        'profilePicture',  // Clear profile picture on logout
        'is_logged_in',
        'jwt_token',  // Clear JWT token to prevent auth issues
        'server_host_override',
        'server_port_override',
        // Add any other user-specific keys here
      ];
      
      LoggingService.instance.logout('Clearing user session data from SharedPreferences...');
      
      // Debug: Check what's stored before clearing
      final preClearState = <String, dynamic>{};
      for (String key in sessionKeysToRemove) {
        final value = prefs.get(key);
        preClearState[key] = value != null ? "EXISTS" : "NULL";
      }
      LoggingService.instance.debug('Pre-clear state', preClearState);
      
      // Remove session keys only (keep remember me credentials)
      for (String key in sessionKeysToRemove) {
        await prefs.remove(key);
      }
      
      // Debug: Verify clearing worked
      final postClearState = <String, dynamic>{};
      for (String key in sessionKeysToRemove) {
        final value = prefs.get(key);
        postClearState[key] = value != null ? "STILL_EXISTS" : "CLEARED";
      }
      LoggingService.instance.debug('Post-clear verification', postClearState);
      
      // Don't clear all keys - keep login form data for better UX
      
      LoggingService.instance.logout('User data cleared from SharedPreferences');
    } catch (e) {
      LoggingService.instance.error('Error clearing SharedPreferences', e);
    }
  }

  /// Reset WebSocket connection (non-blocking)
  static void _resetWebSocketConnection() {
    try {
      LoggingService.instance.logout('Resetting WebSocket connection...');
      
      // Reset socket service completely
      SocketService.instance.reset();
      
      LoggingService.instance.logout('WebSocket connection reset');
    } catch (e) {
      LoggingService.instance.error('Error resetting WebSocket', e);
    }
  }

  /// Navigate to login page immediately (for fast logout)
  static void _navigateToLoginImmediately(BuildContext context, Widget loginPage) {
    try {
      LoggingService.instance.logout('Navigating to login page immediately...');
      
      // Clear the entire navigation stack and go to login immediately
      if (context.mounted) {
        Navigator.of(context).pushAndRemoveUntil(
          MaterialPageRoute(builder: (context) => loginPage),
          (Route<dynamic> route) => false, // Remove all previous routes
        );
      }
      
      LoggingService.instance.logout('Navigation to login completed');
    } catch (e) {
      LoggingService.instance.error('Error navigating to login', e);
      // Fallback: just pop all routes
      if (context.mounted) {
        Navigator.of(context).popUntil((route) => route.isFirst);
      }
    }
  }


  /// Check if user is currently logged in
  static Future<bool> isUserLoggedIn() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      return prefs.getBool('is_logged_in') ?? false;
    } catch (e) {
      LoggingService.instance.error('Error checking login status', e);
      return false;
    }
  }

  /// Get stored user email (for debugging)
  static Future<String?> getStoredUserEmail() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      return prefs.getString('user_email');
    } catch (e) {
      LoggingService.instance.error('Error getting stored email', e);
      return null;
    }
  }
}

