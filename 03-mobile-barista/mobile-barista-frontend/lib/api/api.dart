import 'dart:convert';
import 'package:http/http.dart' as http;
import '../model.dart';
import '../config.dart';
import '../constants/app_constants.dart';
import '../utils/logger.dart';

class ApiService {
  static const Map<String, String> _headers = {
    'Content-Type': 'application/json',
  };

  // Send OTP for admin login (all roles: superadmin, manager, staff)
  static Future<Map<String, dynamic>?> sendAdminLoginOTP(String email) async {
    try {
      Logger.api('Sending OTP for email: $email', 'API');
      final otpUrl = await Config.adminSendOTPUrl;
      Logger.api('Admin OTP URL: $otpUrl', 'API');
      
      final response = await http
          .post(
            Uri.parse(otpUrl),
            headers: _headers,
            body: jsonEncode({'email': email}),
          )
          .timeout(AppConstants.apiTimeout);

      Logger.api('Admin OTP Response status: ${response.statusCode}');
      Logger.api('Admin OTP Response body: ${response.body}');

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data;
      } else {
        final errorData = jsonDecode(response.body);
        Logger.error('Admin OTP send failed: ${errorData['error'] ?? 'Unknown error'}', 'API');
        return null;
      }
    } catch (e) {
      Logger.exception('Admin OTP send exception', e, 'API');
      return null;
    }
  }

  // Send OTP for mobile admin login (resend functionality)
  static Future<Map<String, dynamic>?> sendMobileAdminOTP(String email) async {
    try {
      Logger.api('Resending mobile admin OTP for email: $email');
      final resendUrl = await Config.mobileAdminResendOTPUrl;
      Logger.api('Mobile admin resend OTP URL: $resendUrl');
      
      final response = await http
          .post(
            Uri.parse(resendUrl),
            headers: _headers,
            body: jsonEncode({'email': email}),
          )
          .timeout(AppConstants.apiTimeout);

      Logger.api('Mobile admin resend OTP Response status: ${response.statusCode}');
      Logger.api('Mobile admin resend OTP Response body: ${response.body}');

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data;
      } else {
        final errorData = jsonDecode(response.body);
        Logger.error('Mobile admin resend OTP failed: ${errorData['message'] ?? 'Unknown error'}', 'API');
        return null;
      }
    } catch (e) {
      Logger.exception('Mobile admin resend OTP exception', e, 'API');
      return null;
    }
  }

  // Verify OTP and complete admin login (all roles)
  static Future<UserModel?> verifyAdminLoginOTP(String email, String otp) async {
    try {
      Logger.auth('Verifying admin OTP for email: $email');
      final verifyUrl = await Config.adminVerifyOTPUrl;
      Logger.api('Admin Verify URL: $verifyUrl');
      
      final response = await http
          .post(
            Uri.parse(verifyUrl),
            headers: _headers,
            body: jsonEncode({'email': email, 'otp': otp}),
          )
          .timeout(AppConstants.apiTimeout);

      Logger.api('Admin Verify Response status: ${response.statusCode}');
      Logger.api('Admin Verify Response body: ${response.body}');

      if (response.statusCode == 200) {
          final data = jsonDecode(response.body);
        Logger.success('Admin OTP verification successful! Response data: $data', 'API');
        
        if (data['user'] != null) {
          final user = UserModel.fromJson(data['user']);
          Logger.auth('Admin user model created:');
          Logger.auth('   - ID: ${user.id}');
          Logger.auth('   - Name: ${user.name}');
          Logger.auth('   - Email: ${user.email}');
          Logger.auth('   - Username: ${user.username}');
          Logger.auth('   - User Type: ${user.userType}');
          Logger.auth('   - Role: ${user.role}');
          
          return user;
        } else {
          Logger.error('No user data in admin OTP verification response', 'API');
          return null;
        }
      } else {
        final errorData = jsonDecode(response.body);
        Logger.error('Admin OTP verification failed: ${errorData['error'] ?? 'Unknown error'}', 'API');
        return null;
      }
    } catch (e) {
      Logger.exception('Admin OTP verification exception', e, 'API');
      return null;
    }
  }

  // Mobile admin OTP verification (all roles)
  static Future<UserModel?> verifyMobileAdminOTP(String email, String otp) async {
    try {
      Logger.auth('Verifying mobile admin OTP for email: $email');
      final verifyUrl = await Config.mobileAdminVerifyOTPUrl;
      Logger.api('Mobile admin verify URL: $verifyUrl');
      
      final response = await http
          .post(
            Uri.parse(verifyUrl),
            headers: _headers,
            body: jsonEncode({'email': email, 'otp': otp}),
          )
          .timeout(AppConstants.apiTimeout);

      Logger.api('Mobile admin verify response status: ${response.statusCode}');
      Logger.api('Mobile admin verify response body: ${response.body}');

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        Logger.success('Mobile admin OTP verification successful! Response data: $data', 'API');
        
        // Enhanced debugging for response structure
        Logger.debug('Response data keys: ${data.keys.toList()}', 'API');
        Logger.debug('Response data type: ${data.runtimeType}', 'API');
        Logger.debug('User field exists: ${data.containsKey('user')}', 'API');
        Logger.debug('User field value: ${data['user']}', 'API');
        Logger.debug('User field type: ${data['user']?.runtimeType}', 'API');
        
        if (data['user'] != null) {
          try {
            final user = UserModel.fromJson(data['user']);
            Logger.auth('Mobile admin user model created:');
            Logger.auth('   - ID: ${user.id}');
            Logger.auth('   - Name: ${user.name}');
            Logger.auth('   - Email: ${user.email}');
            Logger.auth('   - Username: ${user.username}');
            Logger.auth('   - User Type: ${user.userType}');
            Logger.auth('   - Role: ${user.role}');
            
            return user;
          } catch (e) {
            Logger.error('Error creating UserModel from response: $e', 'API');
            Logger.error('User data that caused error: ${data['user']}', 'API');
            return null;
          }
        } else {
          Logger.error('No user data in mobile admin OTP verification response', 'API');
          Logger.error('Available fields in response: ${data.keys.toList()}', 'API');
          return null;
        }
      } else {
        final errorData = jsonDecode(response.body);
        Logger.error('Mobile admin OTP verification failed: ${errorData['message'] ?? 'Unknown error'}', 'API');
        return null;
      }
    } catch (e) {
      Logger.exception('Mobile admin OTP verification exception', e, 'API');
      return null;
    }
  }

  // Mobile admin login (email + password verification for all roles)
  static Future<UserModel?> login(String email, String password) async {
    try {
      Logger.auth('Mobile admin login attempt for email: $email');
      final loginUrl = await Config.mobileAdminLoginUrl;
      Logger.api('Mobile admin login URL: $loginUrl');
      Logger.debug('Debug - Config resolution:');
      final serverConfig = await Config.currentResolvedServer();
      Logger.debug('   - Resolved host: ${serverConfig['host']}');
      Logger.debug('   - Resolved port: ${serverConfig['port']}');
      
      final response = await http
          .post(
            Uri.parse(loginUrl),
            headers: _headers,
            body: jsonEncode({'email': email, 'password': password}),
          )
          .timeout(AppConstants.apiTimeout);

      Logger.api('Response status: ${response.statusCode}');
      Logger.api('Response body: ${response.body}');

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        Logger.success('Mobile admin login successful! Response data: $data', 'API');
        
        // The mobile admin login returns { message, email, expiresIn }
        // We need to create a temporary user object for OTP flow
        if (data['email'] != null) {
          final user = UserModel(
            id: 'temp',
            name: 'Admin', // Will be updated after OTP verification
            email: data['email'],
            username: data['email'],
            birthday: '', // Not needed for admin
            gender: '', // Not needed for admin
            userType: 'admin', // Generic admin type
            role: 'admin', // Will be updated after OTP verification
            points: 0,
            qrToken: '',
          );
          
          Logger.auth('Temporary user model created for OTP flow:');
          Logger.auth('   - Email: ${user.email}');
          Logger.auth('   - User Type: ${user.userType}');
          Logger.auth('   - Role: ${user.role}');
          Logger.auth('   - OTP expires in: ${data['expiresIn']}');
          
          return user;
        } else {
          Logger.error('No email in mobile admin login response', 'API');
          return null;
        }
      } else {
        final errorData = jsonDecode(response.body);
        Logger.error("Mobile admin login failed with status ${response.statusCode}: ${errorData['message'] ?? 'Unknown error'}", 'API');
        return null;
      }
    } catch (e) {
      Logger.exception("Exception during mobile admin login", e, 'API');
      return null;
    }
  }

  // Add loyalty point when admin scans QR code (all roles can scan)
  static Future<Map<String, dynamic>?> addLoyaltyPoint(String qrToken, String drink) async {
    const int maxRetries = AppConstants.maxRetries;
    const Duration retryDelay = AppConstants.retryDelay;
    
    for (int attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        Logger.transaction('Adding loyalty point for QR token: $qrToken, drink: $drink (attempt $attempt/$maxRetries)');
        final apiBaseUrl = await Config.apiBaseUrl;
        final response = await http.post(
          Uri.parse('$apiBaseUrl/loyalty/scan'),
          headers: _headers,
          body: jsonEncode({'qrToken': qrToken, 'drink': drink}),
        ).timeout(AppConstants.apiTimeout);
        
        Logger.api('Add loyalty point response status: ${response.statusCode}');
        Logger.api('Add loyalty point response body: ${response.body}');
        
        // Debug: Log the parsed response for 400 errors
        if (response.statusCode == 400) {
          try {
            final errorData = jsonDecode(response.body);
            Logger.debug('400 Error details: $errorData', 'API');
          } catch (e) {
            Logger.error('Failed to parse 400 error response: $e', 'API');
          }
        }
        
        if (response.statusCode == 200) {
          final data = jsonDecode(response.body);
          Logger.success('Loyalty point added successfully! Points: ${data['points']}', 'API');
          return data;
        } else if (response.statusCode == 429) {
          // Handle rate limiting and abuse detection
          final errorData = jsonDecode(response.body);
          Logger.error('429 Error - Rate limit exceeded:', 'API');
          Logger.error('   - Error message: ${errorData['error'] ?? errorData['message'] ?? 'Daily scan limit reached'}', 'API');
          Logger.error('   - Customer points: ${errorData['points']}', 'API');
          return {
            'error': errorData['error'] ?? errorData['message'] ?? 'Daily scan limit reached',
            'points': errorData['points'],
            'code': 'RATE_LIMIT_EXCEEDED',
            'statusCode': 429
          };
        } else if (response.statusCode == 400) {
          // For 400 errors (like max points reached), return the error data immediately
          final errorData = jsonDecode(response.body);
          Logger.error('400 Error - Customer points issue:', 'API');
          Logger.error('   - Error message: ${errorData['error']}', 'API');
          Logger.error('   - Customer points: ${errorData['points']}', 'API');
          Logger.error('   - Points type: ${errorData['points'].runtimeType}', 'API');
          return {'error': errorData['error'], 'points': errorData['points']};
        } else if (response.statusCode >= 500 && attempt < maxRetries) {
          // Server error - retry
          Logger.warning('Server error ${response.statusCode}, retrying in ${retryDelay.inSeconds}s...', 'API');
          await Future.delayed(retryDelay);
          continue;
        } else {
          Logger.error('Add loyalty point failed with status ${response.statusCode}', 'API');
          return null;
        }
      } catch (e) {
        Logger.exception('Exception during add loyalty point (attempt $attempt)', e, 'API');
        if (attempt < maxRetries) {
          Logger.warning('Retrying in ${retryDelay.inSeconds}s...', 'API');
          await Future.delayed(retryDelay);
        } else {
          Logger.error('All retry attempts failed', 'API');
          return null;
        }
      }
    }
    
    return null;
  }

  // Admin logout
  static Future<bool> logout(String email) async {
    try {
      Logger.auth('Admin logout for email: $email');
      final apiBaseUrl = await Config.apiBaseUrl;
      final response = await http.post(
        Uri.parse('$apiBaseUrl/admin/logout'),
        headers: _headers,
        body: jsonEncode({'email': email}),
      ).timeout(AppConstants.apiTimeout);
      
      Logger.api('Logout response status: ${response.statusCode}');
      Logger.api('Logout response body: ${response.body}');
      
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        Logger.success('Logout successful: ${data['message']}', 'API');
        return true;
      } else {
        Logger.error('Logout failed with status ${response.statusCode}', 'API');
        return false;
      }
    } catch (e) {
      Logger.exception('Exception during logout', e, 'API');
      return false;
    }
  }

  // ========== INVENTORY MANAGEMENT ==========

  // Get all inventory items
  static Future<List<Map<String, dynamic>>?> getInventoryItems() async {
    try {
      Logger.api('Fetching inventory items', 'INVENTORY');
      final apiBaseUrl = await Config.apiBaseUrl;
      final response = await http.get(
        Uri.parse('$apiBaseUrl/inventory'),
        headers: _headers,
      ).timeout(AppConstants.apiTimeout);
      
      Logger.api('Inventory response status: ${response.statusCode}');
      Logger.api('Inventory response body: ${response.body}');
      
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final items = List<Map<String, dynamic>>.from(data['items'] ?? []);
        Logger.success('Fetched ${items.length} inventory items', 'INVENTORY');
        return items;
      } else {
        Logger.error('Failed to fetch inventory items: ${response.statusCode}', 'INVENTORY');
        return null;
      }
    } catch (e) {
      Logger.exception('Exception during inventory fetch', e, 'INVENTORY');
      return null;
    }
  }

  // Get inventory item by ID
  static Future<Map<String, dynamic>?> getInventoryItem(String id) async {
    try {
      Logger.api('Fetching inventory item: $id', 'INVENTORY');
      final apiBaseUrl = await Config.apiBaseUrl;
      final response = await http.get(
        Uri.parse('$apiBaseUrl/inventory/$id'),
        headers: _headers,
      ).timeout(AppConstants.apiTimeout);
      
      Logger.api('Inventory item response status: ${response.statusCode}');
      Logger.api('Inventory item response body: ${response.body}');
      
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        Logger.success('Fetched inventory item: ${data['item']['name']}', 'INVENTORY');
        return data['item'];
      } else {
        Logger.error('Failed to fetch inventory item: ${response.statusCode}', 'INVENTORY');
        return null;
      }
    } catch (e) {
      Logger.exception('Exception during inventory item fetch', e, 'INVENTORY');
      return null;
    }
  }

  // Search inventory items
  static Future<List<Map<String, dynamic>>?> searchInventoryItems(String query) async {
    try {
      Logger.api('Searching inventory items with query: $query', 'INVENTORY');
      final apiBaseUrl = await Config.apiBaseUrl;
      final response = await http.get(
        Uri.parse('$apiBaseUrl/inventory/search/$query'),
        headers: _headers,
      ).timeout(AppConstants.apiTimeout);
      
      Logger.api('Inventory search response status: ${response.statusCode}');
      Logger.api('Inventory search response body: ${response.body}');
      
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final items = List<Map<String, dynamic>>.from(data['items'] ?? []);
        Logger.success('Found ${items.length} inventory items matching query', 'INVENTORY');
        return items;
      } else {
        Logger.error('Failed to search inventory items: ${response.statusCode}', 'INVENTORY');
        return null;
      }
    } catch (e) {
      Logger.exception('Exception during inventory search', e, 'INVENTORY');
      return null;
    }
  }

  // Update inventory stock (decrease when product is sold)
  static Future<Map<String, dynamic>?> updateInventoryStock({
    required String itemId,
    required int quantity,
    required String reason,
    required String adminId,
    required String adminName,
  }) async {
    try {
      Logger.api('Updating inventory stock for item: $itemId, quantity: $quantity', 'INVENTORY');
      final apiBaseUrl = await Config.apiBaseUrl;
      final response = await http.put(
        Uri.parse('$apiBaseUrl/inventory/$itemId/stock'),
        headers: _headers,
        body: jsonEncode({
          'quantity': quantity,
          'reason': reason,
          'adminId': adminId,
          'adminName': adminName,
        }),
      ).timeout(AppConstants.apiTimeout);
      
      Logger.api('Inventory stock update response status: ${response.statusCode}');
      Logger.api('Inventory stock update response body: ${response.body}');
      
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        Logger.success('Inventory stock updated successfully', 'INVENTORY');
        return data;
      } else {
        final errorData = jsonDecode(response.body);
        Logger.error('Failed to update inventory stock: ${errorData['error']}', 'INVENTORY');
        return {'error': errorData['error']};
      }
    } catch (e) {
      Logger.exception('Exception during inventory stock update', e, 'INVENTORY');
      return {'error': 'Failed to update inventory stock: ${e.toString()}'};
    }
  }
}