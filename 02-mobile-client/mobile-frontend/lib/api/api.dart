import 'dart:convert';
import 'dart:typed_data';
import 'package:http/http.dart' as http;
import 'package:flutter/foundation.dart' show kDebugMode;
import 'dart:developer' as developer;
import 'package:login/usermodel.dart';
import '../config.dart';
import '../services/cache_service.dart';
import '../models/menu_item.dart';
import '../models/inventory_item.dart';

class ApiService {
  static const Map<String, String> _headers = {
    'Content-Type': 'application/json',
  };

  // Helper method for debug logging
  static void _log(String message, {String level = 'info'}) {
    if (kDebugMode) {
      developer.log(message, name: 'API', level: level == 'error' ? 1000 : 800);
    }
  }

  // Generic GET request method
  static Future<Map<String, dynamic>?> get(String endpoint) async {
    try {
      final baseUrl = await Config.apiBaseUrl;
      final url = Uri.parse('$baseUrl$endpoint');
      
      if (kDebugMode) {
        _log('GET request to: $url');
      }
      
      final response = await http
          .get(url, headers: _headers)
          .timeout(const Duration(seconds: 10));

      if (kDebugMode) {
        _log('GET response status: ${response.statusCode}');
      }
      
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return Map<String, dynamic>.from(data);
      } else if (response.statusCode == 429) {
        // Handle rate limiting
        String errorMessage = 'Too many requests. Please try again later.';
        try {
          final data = jsonDecode(response.body);
          errorMessage = data['error'] ?? data['message'] ?? 'Too many requests. Please try again later.';
        } catch (e) {
          if (kDebugMode) {
            _log('Error parsing 429 response: $e', level: 'error');
          }
        }
        if (kDebugMode) {
          _log('Rate limit exceeded: $errorMessage', level: 'error');
        }
        throw Exception(errorMessage);
      } else {
        if (kDebugMode) {
          _log('GET request failed: ${response.statusCode}', level: 'error');
        }
        return null;
      }
    } catch (e) {
      if (kDebugMode) {
        _log('GET request exception: $e', level: 'error');
      }
      rethrow;
    }
  }

  // Sign up a new user
  static Future<String?> signUp(UserModel user, String password) async {
    try {
      final registrationUrl = await Config.registration;
      
      final registrationData = {
        'fullName': user.fullName,
        'username': user.username,
        'email': user.email,
        'birthday': user.birthday,
        'gender': user.gender,
        'employmentStatus': user.employmentStatus,
        'role': user.role,
        'source': user.source,
        'password': password,
      };
      
      if (kDebugMode) {
        _log('Validating registration data');
        _log('Registration data: fullName: "${user.fullName}", username: "${user.username}", email: "${user.email}"');
      }
      
      final response = await http
          .post(
            Uri.parse(registrationUrl),
            headers: _headers,
            body: jsonEncode(registrationData),
          )
          .timeout(const Duration(seconds: 10));

      if (kDebugMode) {
        _log('Registration response status: ${response.statusCode}');
        _log('Registration response body: ${response.body}');
      }
      
      if (response.statusCode == 201 || response.statusCode == 200) {
        if (kDebugMode) {
          _log('Registration successful!');
        }
        return null; // Success
      } else {
        String errorMsg = "Registration failed";
        try {
          final data = jsonDecode(response.body);
          if (data['error'] != null) errorMsg = data['error'];
          if (kDebugMode) {
            _log('Registration error details: $data', level: 'error');
          }
        } catch (e) {
          if (kDebugMode) {
            _log('Error parsing response: $e', level: 'error');
          }
        }
        if (kDebugMode) {
          _log("Registration failed: $errorMsg", level: 'error');
        }
        return errorMsg;
      }
    } catch (e) {
      if (kDebugMode) {
        _log("Exception during registration: $e", level: 'error');
      }
      return e.toString();
    }
  }

  // Log in a user
  static Future<Map<String, dynamic>?> login(String email, String password) async {
    if (kDebugMode) {
      _log('Login attempt for email: $email');
    }
    final loginUrl = await Config.loginUrl;
    if (kDebugMode) {
      _log('Login URL: $loginUrl');
    }
    
    try {
      // Test server connectivity first
      try {
        final healthUrl = await Config.healthCheckUrl;
        if (kDebugMode) {
          _log('Testing server connectivity: $healthUrl');
        }
        final healthResponse = await http.get(Uri.parse(healthUrl)).timeout(const Duration(seconds: 5));
        if (kDebugMode) {
          _log('Health check status: ${healthResponse.statusCode}');
        }
      } catch (e) {
        if (kDebugMode) {
          _log('Health check failed: $e', level: 'error');
        }
        // Continue with login attempt anyway
      }
      
      final response = await http
          .post(
            Uri.parse(loginUrl),
            headers: _headers,
            body: jsonEncode({'email': email, 'password': password}),
          )
          .timeout(const Duration(seconds: 30));

      if (kDebugMode) {
        _log('Response status: ${response.statusCode}');
        _log('Response body: ${response.body}');
        _log('Response headers: ${response.headers}');
      }

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (kDebugMode) {
          _log('Login successful! Response data: $data');
        }
        
        if (data['user'] != null) {
          if (kDebugMode) {
            _log('User data found in response, creating UserModel...');
          }
          try {
            final user = UserModel.fromJson(data['user']);
            if (kDebugMode) {
              _log('User model created successfully: ID: ${user.id}, Name: ${user.fullName}');
            }
            
            return {
              'user': user,
              'token': data['token'],
            };
          } catch (e) {
            if (kDebugMode) {
              _log('Error creating UserModel from response: $e', level: 'error');
            }
            throw Exception('Failed to parse user data: $e');
          }
        } else {
          if (kDebugMode) {
            _log('No user data in login response', level: 'error');
          }
          throw Exception('No user data received from server');
        }
      } else if (response.statusCode == 401) {
        // Handle authentication errors specifically
        String errorMessage = 'Invalid credentials';
        try {
          final data = jsonDecode(response.body);
          errorMessage = data['message'] ?? data['error'] ?? 'Invalid credentials';
        } catch (e) {
          if (kDebugMode) {
            _log('Error parsing 401 response: $e', level: 'error');
          }
        }
        if (kDebugMode) {
          _log('Authentication failed: $errorMessage', level: 'error');
        }
        throw Exception(errorMessage);
      } else if (response.statusCode == 400) {
        // Handle bad request errors
        String errorMessage = 'Invalid request';
        try {
          final data = jsonDecode(response.body);
          errorMessage = data['message'] ?? data['error'] ?? 'Invalid request';
        } catch (e) {
          if (kDebugMode) {
            _log('Error parsing 400 response: $e', level: 'error');
          }
        }
        if (kDebugMode) {
          _log('Bad request: $errorMessage', level: 'error');
        }
        throw Exception(errorMessage);
      } else if (response.statusCode == 500) {
        // Handle server errors
        if (kDebugMode) {
          _log("Server error: ${response.statusCode}: ${response.body}", level: 'error');
        }
        throw Exception('Server error. Please try again later.');
      } else {
        if (kDebugMode) {
          _log("Login failed with status ${response.statusCode}: ${response.body}", level: 'error');
        }
        throw Exception('Login failed with status ${response.statusCode}');
      }
    } catch (e) {
      if (kDebugMode) {
        _log("Exception during login: $e", level: 'error');
      }
      // Re-throw the exception instead of returning null
      rethrow;
    }
  }

  // Get user info by username
  static Future<UserModel?> getUserInfo(String username) async {
    try {
      final userInfoUrl = await Config.userInfo;
      final response = await http
          .get(
            Uri.parse('$userInfoUrl/$username'),
            headers: _headers,
          )
          .timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return UserModel.fromJson(data);
      } else {
        if (kDebugMode) {
          _log("Get user info failed: ${response.body}", level: 'error');
        }
        return null;
      }
    } catch (e) {
      if (kDebugMode) {
        _log("Exception during fetching user info: $e", level: 'error');
      }
      return null;
    }
  }

  static Future<int?> addLoyaltyPoint(String qrToken, String drink) async {
    try {
      final apiBaseUrl = await Config.apiBaseUrl;
      final response = await http.post(
        Uri.parse('$apiBaseUrl/loyalty/scan'),
        headers: _headers,
        body: jsonEncode({'qrToken': qrToken, 'drink': drink}),
      ).timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data['points'];
      } else if (response.statusCode == 429) {
        // Handle rate limiting and abuse detection
        String errorMessage = 'Daily scan limit reached';
        try {
          final data = jsonDecode(response.body);
          errorMessage = data['error'] ?? data['message'] ?? 'Daily scan limit reached';
        } catch (e) {
          if (kDebugMode) {
            _log('Error parsing 429 response: $e', level: 'error');
          }
        }
        if (kDebugMode) {
          _log('Rate limit exceeded: $errorMessage', level: 'error');
        }
        throw Exception(errorMessage);
      } else if (response.statusCode == 400) {
        // Handle bad request
        String errorMessage = 'Invalid request';
        try {
          final data = jsonDecode(response.body);
          errorMessage = data['error'] ?? data['message'] ?? 'Invalid request';
        } catch (e) {
          if (kDebugMode) {
            _log('Error parsing 400 response: $e', level: 'error');
          }
        }
        if (kDebugMode) {
          _log('Bad request: $errorMessage', level: 'error');
        }
        throw Exception(errorMessage);
      } else if (response.statusCode == 500) {
        // Handle server errors
        if (kDebugMode) {
          _log("Server error: ${response.statusCode}: ${response.body}", level: 'error');
        }
        throw Exception('Server error. Please try again later.');
      } else {
        if (kDebugMode) {
          _log("Loyalty scan failed with status ${response.statusCode}: ${response.body}", level: 'error');
        }
        throw Exception('Scan failed with status ${response.statusCode}');
      }
    } catch (e) {
      if (kDebugMode) {
        _log("Exception during loyalty scan: $e", level: 'error');
      }
      rethrow;
    }
  }

  static Future<Map<String, dynamic>?> getUserByQrToken(String qrToken) async {
    try {
      // Check cache first
      final cacheKey = 'user_qr_$qrToken';
      final cachedData = await CacheService.getCache<Map<String, dynamic>>(cacheKey);
      
      if (cachedData != null) {
        if (kDebugMode) {
          _log('Using cached user data for QR token: $qrToken');
        }
        return cachedData;
      }
      
      final apiBaseUrl = await Config.apiBaseUrl;
      final fullUrl = '$apiBaseUrl/customer/qr/$qrToken';
      if (kDebugMode) {
        _log('Getting user by QR token: $fullUrl');
        _log('QR token: $qrToken');
      }
      
      final response = await http.get(
        Uri.parse(fullUrl),
        headers: _headers,
      ).timeout(const Duration(seconds: 10)); // Reduced timeout
      
      if (kDebugMode) {
        _log('Response status: ${response.statusCode}');
        _log('Response body: ${response.body}');
      }
      
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (kDebugMode) {
          _log('Parsed data: $data');
        }
        
        // Cache the result for 30 seconds only (shorter cache for real-time updates)
        await CacheService.setCache(cacheKey, data, duration: const Duration(seconds: 30));
        
        return data;
      } else if (response.statusCode == 429) {
        // Handle rate limiting
        String errorMessage = 'Daily scan limit reached';
        try {
          final data = jsonDecode(response.body);
          errorMessage = data['error'] ?? data['message'] ?? 'Daily scan limit reached';
        } catch (e) {
          if (kDebugMode) {
            _log('Error parsing 429 response: $e', level: 'error');
          }
        }
        if (kDebugMode) {
          _log('Rate limit exceeded: $errorMessage', level: 'error');
        }
        throw Exception(errorMessage);
      } else if (response.statusCode == 400) {
        // Handle bad request
        String errorMessage = 'Invalid QR token';
        try {
          final data = jsonDecode(response.body);
          errorMessage = data['error'] ?? data['message'] ?? 'Invalid QR token';
        } catch (e) {
          if (kDebugMode) {
            _log('Error parsing 400 response: $e', level: 'error');
          }
        }
        if (kDebugMode) {
          _log('Bad request: $errorMessage', level: 'error');
        }
        throw Exception(errorMessage);
      } else if (response.statusCode == 500) {
        // Handle server errors
        if (kDebugMode) {
          _log("Server error: ${response.statusCode}: ${response.body}", level: 'error');
        }
        throw Exception('Server error. Please try again later.');
      } else {
        if (kDebugMode) {
          _log("QR token lookup failed with status ${response.statusCode}: ${response.body}", level: 'error');
        }
        throw Exception('QR token lookup failed with status ${response.statusCode}');
      }
    } catch (e) {
      if (kDebugMode) {
        _log('Exception during getUserByQrToken: $e', level: 'error');
      }
      return null;
    }
  }

  static Future<UserModel?> updateUser(String id, Map<String, dynamic> updates) async {
    final apiBaseUrl = await Config.apiBaseUrl;
    final response = await http.patch(
      Uri.parse('$apiBaseUrl/user/$id'),
      headers: _headers,
      body: jsonEncode(updates),
    );
    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return UserModel.fromJson(data);
    } else {
      if (kDebugMode) {
        _log('Update user failed: ${response.body}', level: 'error');
      }
      return null;
    }
  }

  static Future<bool> updateUserByQrToken(String qrToken, Map<String, dynamic> updates) async {
    if (kDebugMode) {
      _log('PATCH to /customer/qr/$qrToken with $updates');
    }
    final apiBaseUrl = await Config.apiBaseUrl;
    final response = await http.patch(
      Uri.parse('$apiBaseUrl/customer/qr/$qrToken'),
      headers: _headers,
      body: jsonEncode(updates),
    );
    if (kDebugMode) {
      _log('PATCH response: ${response.statusCode} ${response.body}');
    }
    if (response.statusCode == 200) {
      return true;
    } else {
      if (kDebugMode) {
        _log('Update user by QR token failed: ${response.body}', level: 'error');
      }
      return false;
    }
  }

  static Future<String?> getUserIdByQrToken(String qrToken, {bool forceRefresh = false}) async {
    try {
      // Check cache first only if not forcing refresh
      if (!forceRefresh) {
        final cacheKey = 'user_qr_$qrToken';
        final cachedData = await CacheService.getCache<Map<String, dynamic>>(cacheKey);
        
        if (cachedData != null) {
          if (kDebugMode) {
            _log('Using cached user data for QR token: $qrToken');
          }
          return cachedData['_id'] ?? cachedData['id'];
        }
      }
      
      final apiBaseUrl = await Config.apiBaseUrl;
      final fullUrl = '$apiBaseUrl/customer/qr/$qrToken';
      
      if (kDebugMode) {
        _log('Getting user ID by QR token: $fullUrl');
        _log('QR token: $qrToken');
      }
      
      final response = await http.get(
        Uri.parse(fullUrl),
        headers: _headers,
      ).timeout(const Duration(seconds: 10));
      
      if (kDebugMode) {
        _log('Response status: ${response.statusCode}');
        _log('Response body: ${response.body}');
      }
      
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        
        if (kDebugMode) {
          _log('Parsed data: $data');
        }
        
        // Cache the result for 30 seconds only (shorter cache for real-time updates)
        if (!forceRefresh) {
          final cacheKey = 'user_qr_$qrToken';
          await CacheService.setCache(cacheKey, data, duration: const Duration(seconds: 30));
        }
        
        return data['_id'] ?? data['id'];
      } else {
        if (kDebugMode) {
          _log('Get user ID by QR token failed: ${response.body}', level: 'error');
        }
        return null;
      }
    } catch (e) {
      if (kDebugMode) {
        _log('Exception during getUserIdByQrToken: $e', level: 'error');
      }
      return null;
    }
  }

  static Future<Map<String, dynamic>?> getUserData(String userId) async {
    try {
      if (kDebugMode) {
        _log('Getting user data for user $userId');
      }
      
      final apiBaseUrl = await Config.apiBaseUrl;
      final response = await http.get(
        Uri.parse('$apiBaseUrl/user/$userId/data'),
        headers: {
          'Content-Type': 'application/json',
        },
      ).timeout(const Duration(seconds: 10));
      
      if (kDebugMode) {
        _log('User data response status: ${response.statusCode}');
        _log('User data response body: ${response.body}');
      }
      
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return data;
      } else {
        if (kDebugMode) {
          _log('Failed to get user data: ${response.statusCode} - ${response.body}', level: 'error');
        }
        return null;
      }
    } catch (e) {
      if (kDebugMode) {
        _log('Exception during getUserData: $e', level: 'error');
      }
      return null;
    }
  }

  static Future<Map<String, dynamic>?> claimReward(String userId, String type, String description) async {
    try {
      if (kDebugMode) {
        _log('Claiming reward for user $userId: $type - $description');
      }
      
      // Validate inputs
      if (userId.isEmpty) {
        return {
          'success': false,
          'error': 'User ID is required'
        };
      }
      
      if (type.isEmpty || description.isEmpty) {
        return {
          'success': false,
          'error': 'Reward type and description are required'
        };
      }
      
      final apiBaseUrl = await Config.apiBaseUrl;
      final response = await http.post(
        Uri.parse('$apiBaseUrl/user/$userId/claim-reward'),
        headers: _headers,
        body: jsonEncode({'type': type, 'description': description}),
      ).timeout(const Duration(seconds: 30));
      
      if (kDebugMode) {
        _log('Claim reward response status: ${response.statusCode}');
        _log('Claim reward response body: ${response.body}');
      }
      
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (kDebugMode) {
          _log('Claim reward success, data: $data');
        }
        
        // Clear cache for this user to ensure fresh data is fetched
        await _clearUserCaches();
        
        return data;
      } else if (response.statusCode == 429) {
        // Handle rate limiting and abuse detection
        String errorMessage = 'Daily reward limit reached';
        try {
          final data = jsonDecode(response.body);
          errorMessage = data['error'] ?? data['message'] ?? 'Daily reward limit reached';
        } catch (e) {
          if (kDebugMode) {
            _log('Error parsing 429 response: $e', level: 'error');
          }
        }
        if (kDebugMode) {
          _log('Rate limit exceeded: $errorMessage', level: 'error');
        }
        return {
          'success': false,
          'error': errorMessage,
          'statusCode': response.statusCode,
          'code': 'RATE_LIMIT_EXCEEDED'
        };
      } else if (response.statusCode == 400) {
        // Handle bad request
        String errorMessage = 'Invalid reward claim request';
        try {
          final data = jsonDecode(response.body);
          errorMessage = data['error'] ?? data['message'] ?? 'Invalid reward claim request';
        } catch (e) {
          if (kDebugMode) {
            _log('Error parsing 400 response: $e', level: 'error');
          }
        }
        if (kDebugMode) {
          _log('Bad request: $errorMessage', level: 'error');
        }
        return {
          'success': false,
          'error': errorMessage,
          'statusCode': response.statusCode
        };
      } else if (response.statusCode == 500) {
        // Handle server errors
        if (kDebugMode) {
          _log("Server error: ${response.statusCode}: ${response.body}", level: 'error');
        }
        return {
          'success': false,
          'error': 'Server error. Please try again later.',
          'statusCode': response.statusCode
        };
      } else {
        // Parse error message from response
        String errorMessage = 'Unknown error occurred';
        try {
          final errorData = jsonDecode(response.body);
          errorMessage = errorData['error'] ?? 'Server returned status ${response.statusCode}';
        } catch (e) {
          errorMessage = 'Server returned status ${response.statusCode}: ${response.body}';
        }
        
        if (kDebugMode) {
          _log('Claim reward failed with status ${response.statusCode}: $errorMessage', level: 'error');
        }
        
        // Return error information instead of null
        return {
          'success': false,
          'error': errorMessage,
          'statusCode': response.statusCode
        };
      }
    } catch (e) {
      if (kDebugMode) {
        _log('Claim reward exception: $e', level: 'error');
      }
      
      // Return error information instead of null
      return {
        'success': false,
        'error': 'Network error: ${e.toString()}',
        'statusCode': 0
      };
    }
  }

  // Helper method to clear user-related caches
  static Future<void> _clearUserCaches() async {
    try {
      await CacheService.clearCachePattern('user_qr_');
    } catch (e) {
      if (kDebugMode) {
        _log('Error clearing user caches: $e', level: 'error');
      }
    }
  }

  static Future<List<Map<String, dynamic>>> getRewardHistory(String userId) async {
    try {
      final apiBaseUrl = await Config.apiBaseUrl;
      final response = await http.get(
        Uri.parse('$apiBaseUrl/user/$userId/reward-history'),
        headers: _headers,
      ).timeout(const Duration(seconds: 10));
      
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body) as List<dynamic>;
        return data.map((e) => Map<String, dynamic>.from(e as Map)).toList();
      } else if (response.statusCode == 429) {
        // Handle rate limiting
        String errorMessage = 'Daily request limit reached';
        try {
          final data = jsonDecode(response.body);
          errorMessage = data['error'] ?? data['message'] ?? 'Daily request limit reached';
        } catch (e) {
          if (kDebugMode) {
            _log('Error parsing 429 response: $e', level: 'error');
          }
        }
        if (kDebugMode) {
          _log('Rate limit exceeded: $errorMessage', level: 'error');
        }
        throw Exception(errorMessage);
      } else if (response.statusCode == 400) {
        // Handle bad request
        String errorMessage = 'Invalid user ID';
        try {
          final data = jsonDecode(response.body);
          errorMessage = data['error'] ?? data['message'] ?? 'Invalid user ID';
        } catch (e) {
          if (kDebugMode) {
            _log('Error parsing 400 response: $e', level: 'error');
          }
        }
        if (kDebugMode) {
          _log('Bad request: $errorMessage', level: 'error');
        }
        throw Exception(errorMessage);
      } else if (response.statusCode == 500) {
        // Handle server errors
        if (kDebugMode) {
          _log("Server error: ${response.statusCode}: ${response.body}", level: 'error');
        }
        throw Exception('Server error. Please try again later.');
      } else {
        if (kDebugMode) {
          _log('Get reward history failed with status ${response.statusCode}: ${response.body}', level: 'error');
        }
        throw Exception('Failed to get reward history with status ${response.statusCode}');
      }
    } catch (e) {
      if (kDebugMode) {
        _log('Exception during getRewardHistory: $e', level: 'error');
      }
      rethrow;
    }
  }

  static Future<List<Map<String, dynamic>>> getActiveRewards() async {
    try {
      final apiBaseUrl = await Config.apiBaseUrl;
      final fullUrl = '$apiBaseUrl/rewards/active';
      if (kDebugMode) {
        _log('Fetching active rewards from: $fullUrl');
      }
      final response = await http.get(
        Uri.parse(fullUrl),
        headers: _headers,
      );
      
      if (kDebugMode) {
        _log('Get active rewards status: ${response.statusCode}');
        _log('Get active rewards body: ${response.body}');
        _log('Response headers: ${response.headers}');
      }
      
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body) as List<dynamic>;
        return data.map((e) => Map<String, dynamic>.from(e as Map)).toList();
      } else {
        if (kDebugMode) {
          _log('Get active rewards failed: ${response.body}', level: 'error');
        }
        return [];
      }
    } catch (e) {
      if (kDebugMode) {
        _log('Exception during get active rewards: $e', level: 'error');
      }
      return [];
    }
  }

  /// Uploads a profile picture for the user.
  static Future<bool> uploadProfilePicture(String userId, String base64Image) async {
    final apiBaseUrl = await Config.apiBaseUrl;
    final url = '$apiBaseUrl/user/$userId/profile-picture';
    try {
      final response = await http.post(
        Uri.parse(url),
        headers: _headers,
        body: jsonEncode({'image': base64Image}),
      );
      if (kDebugMode) {
        _log('Upload profile picture status: ${response.statusCode}');
        _log('Upload profile picture body: ${response.body}');
      }
      return response.statusCode == 200;
    } catch (e) {
      if (kDebugMode) {
        _log('Exception during profile picture upload: $e', level: 'error');
      }
      return false;
    }
  }


  // Send OTP to email
  static Future<String?> sendOTP(String email, [String? name]) async {
    try {
      final otpUrl = await Config.sendOtp;
      final response = await http
          .post(
            Uri.parse(otpUrl),
            headers: _headers,
            body: jsonEncode({
              'email': email,
              if (name != null) 'name': name,
            }),
          )
          .timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        return null; // Success
      } else {
        String errorMsg = "Failed to send OTP";
        try {
          final data = jsonDecode(response.body);
          if (data['error'] != null) errorMsg = data['error'];
        } catch (_) {}
        if (kDebugMode) {
          _log("Send OTP failed: $errorMsg", level: 'error');
        }
        return null;
      }
    } catch (e) {
      if (kDebugMode) {
        _log("Exception during send OTP: $e", level: 'error');
      }
      return e.toString();
    }
  }

  // Request new OTP (for resending)
  static Future<String?> requestOTP(String email) async {
    try {
      final apiBaseUrl = await Config.apiBaseUrl;
      final response = await http
          .post(
            Uri.parse('$apiBaseUrl/request-otp'),
            headers: _headers,
            body: jsonEncode({'email': email}),
          )
          .timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        return null; // Success
      } else {
        String errorMsg = "Failed to request OTP";
        try {
          final data = jsonDecode(response.body);
          if (data['error'] != null) errorMsg = data['error'];
        } catch (_) {}
        if (kDebugMode) {
          _log("Request OTP failed: $errorMsg", level: 'error');
        }
        return null;
      }
    } catch (e) {
      if (kDebugMode) {
        _log("Exception during request OTP: $e", level: 'error');
      }
      return e.toString();
    }
  }

  // Verify OTP for signup
  static Future<String?> verifyOTP(String email, String otp) async {
    try {
      final apiBaseUrl = await Config.apiBaseUrl;
      
      if (kDebugMode) {
        _log('Verifying OTP for email: $email');
        _log('OTP: $otp');
        _log('URL: $apiBaseUrl/verify-signup-otp');
      }
      
      final response = await http
          .post(
            Uri.parse('$apiBaseUrl/verify-signup-otp'),
            headers: _headers,
            body: jsonEncode({'email': email, 'otp': otp}),
          )
          .timeout(const Duration(seconds: 10));
          
      if (kDebugMode) {
        _log('OTP verification response status: ${response.statusCode}');
        _log('OTP verification response body: ${response.body}');
      }

      if (response.statusCode == 200) {
        return null; // Success
      } else {
        String errorMsg = "OTP verification failed";
        try {
          final data = jsonDecode(response.body);
          if (data['error'] != null) errorMsg = data['error'];
        } catch (_) {}
        if (kDebugMode) {
          _log("OTP verification failed: $errorMsg", level: 'error');
        }
        return null;
      }
    } catch (e) {
      if (kDebugMode) {
        _log("Exception during OTP verification: $e", level: 'error');
      }
      return e.toString();
    }
  }

  // Send OTP for password change
  static Future<Map<String, dynamic>> sendPasswordChangeOTP(String email, String name) async {
    try {
      final apiBaseUrl = await Config.apiBaseUrl;
      final fullUrl = '$apiBaseUrl/send-password-change-otp';
      if (kDebugMode) {
        _log('Sending password change OTP to: $fullUrl');
        _log('Email: $email, Name: $name');
      }
      
      final response = await http
          .post(
            Uri.parse(fullUrl),
            headers: _headers,
            body: jsonEncode({
              'email': email,
              'name': name,
              'purpose': 'password_change',
            }),
          )
          .timeout(const Duration(seconds: 10));

      if (kDebugMode) {
        _log('Password change OTP response status: ${response.statusCode}');
        _log('Password change OTP response body: ${response.body}');
      }
      
      if (response.statusCode == 200) {
        return {'success': true, 'message': 'OTP sent successfully'};
      } else {
        String errorMsg = "Failed to send password change OTP";
        try {
          final data = jsonDecode(response.body);
          if (data['error'] != null) errorMsg = data['error'];
          if (data['message'] != null) errorMsg = data['message'];
        } catch (_) {}
        if (kDebugMode) {
          _log("Send password change OTP failed: $errorMsg", level: 'error');
        }
        return {'success': false, 'error': errorMsg};
      }
    } catch (e) {
      if (kDebugMode) {
        _log("Exception during send password change OTP: $e", level: 'error');
      }
      return {'success': false, 'error': e.toString()};
    }
  }

  // Verify OTP for password change
  static Future<Map<String, dynamic>> verifyPasswordChangeOTP(String email, String otp) async {
    try {
      final apiBaseUrl = await Config.apiBaseUrl;
      final response = await http
          .post(
            Uri.parse('$apiBaseUrl/verify-password-change-otp'),
            headers: _headers,
            body: jsonEncode({
              'email': email,
              'otp': otp,
              'purpose': 'password_change',
            }),
          )
          .timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        return {'success': true, 'message': 'OTP verified successfully'};
      } else {
        String errorMsg = "Password change OTP verification failed";
        try {
          final data = jsonDecode(response.body);
          if (data['error'] != null) errorMsg = data['error'];
          if (data['message'] != null) errorMsg = data['message'];
        } catch (_) {}
        if (kDebugMode) {
          _log("Password change OTP verification failed: $errorMsg", level: 'error');
        }
        return {'success': false, 'error': errorMsg};
      }
    } catch (e) {
      if (kDebugMode) {
        _log("Exception during password change OTP verification: $e", level: 'error');
      }
      return {'success': false, 'error': e.toString()};
    }
  }

  // Send OTP for forgot password
  static Future<String?> sendForgotPasswordOTP(String email) async {
    try {
      final apiBaseUrl = await Config.apiBaseUrl;
      final response = await http
          .post(
            Uri.parse('$apiBaseUrl/forgot-password'),
            headers: _headers,
            body: jsonEncode({'email': email}),
          )
          .timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        return null; // Success
      } else {
        String errorMsg = "Failed to send forgot password OTP";
        try {
          final data = jsonDecode(response.body);
          if (data['error'] != null) errorMsg = data['error'];
        } catch (_) {}
        if (kDebugMode) {
          _log("Send forgot password OTP failed: $errorMsg", level: 'error');
        }
        return errorMsg;
      }
    } catch (e) {
      if (kDebugMode) {
        _log("Exception during send forgot password OTP: $e", level: 'error');
      }
      return e.toString();
    }
  }

  // Verify OTP for forgot password
  static Future<Map<String, dynamic>?> verifyForgotPasswordOTP(String email, String otp) async {
    try {
      final apiBaseUrl = await Config.apiBaseUrl;
      final response = await http
          .post(
            Uri.parse('$apiBaseUrl/verify-forgot-password-otp'),
            headers: _headers,
            body: jsonEncode({
              'email': email,
              'otp': otp,
            }),
          )
          .timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data; // Return userId and email for password reset
      } else {
        String errorMsg = "Forgot password OTP verification failed";
        try {
          final data = jsonDecode(response.body);
          if (data['error'] != null) errorMsg = data['error'];
        } catch (_) {}
        if (kDebugMode) {
          _log("Forgot password OTP verification failed: $errorMsg", level: 'error');
        }
        return null;
      }
    } catch (e) {
      if (kDebugMode) {
        _log("Exception during forgot password OTP verification: $e", level: 'error');
      }
      return null;
    }
  }

  // Reset password (for forgot password flow)
  static Future<String?> resetPassword(String email, String otp, String newPassword) async {
    try {
      final apiBaseUrl = await Config.apiBaseUrl;
      final response = await http
          .post(
            Uri.parse('$apiBaseUrl/reset-password'),
            headers: _headers,
            body: jsonEncode({
              'email': email,
              'otp': otp,
              'newPassword': newPassword,
            }),
          )
          .timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        return null; // Success
      } else {
        String errorMsg = "Password reset failed";
        try {
          final data = jsonDecode(response.body);
          if (data['error'] != null) errorMsg = data['error'];
        } catch (_) {}
        if (kDebugMode) {
          _log("Password reset failed: $errorMsg", level: 'error');
        }
        return errorMsg;
      }
    } catch (e) {
      if (kDebugMode) {
        _log("Exception during password reset: $e", level: 'error');
      }
      return e.toString();
    }
  }

  // Change password (for authenticated users)
  static Future<Map<String, dynamic>> changePassword(String userId, String currentPassword, String newPassword) async {
    try {
      final apiBaseUrl = await Config.apiBaseUrl;
      final response = await http
          .post(
            Uri.parse('$apiBaseUrl/user/$userId/change-password'),
            headers: _headers,
            body: jsonEncode({
              'currentPassword': currentPassword,
              'newPassword': newPassword,
            }),
          )
          .timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        return {'success': true, 'message': 'Password changed successfully'};
      } else {
        String errorMsg = "Password change failed";
        try {
          final data = jsonDecode(response.body);
          if (data['error'] != null) errorMsg = data['error'];
          if (data['message'] != null) errorMsg = data['message'];
        } catch (_) {}
        if (kDebugMode) {
          _log("Password change failed: $errorMsg", level: 'error');
        }
        return {'success': false, 'error': errorMsg};
      }
    } catch (e) {
      if (kDebugMode) {
        _log("Exception during password change: $e", level: 'error');
      }
      return {'success': false, 'error': e.toString()};
    }
  }

  // ==================== GRIDFS IMAGE ENDPOINTS ====================

  /// Get image URL for GridFS images
  static String getImageUrl(String imageType, String imageId) {
    return '/api/images/$imageType/$imageId';
  }

  /// Get full image URL with base URL
  static Future<String> getFullImageUrl(String imageType, String imageId) async {
    final apiBaseUrl = await Config.apiBaseUrl;
    return '$apiBaseUrl/images/$imageType/$imageId';
  }

  // ==================== MENU ITEMS API ====================

  /// Get all menu items
  static Future<List<MenuItem>> getMenuItems() async {
    try {
      final apiBaseUrl = await Config.apiBaseUrl;
      final response = await http.get(
        Uri.parse('$apiBaseUrl/menu'),
        headers: _headers,
      ).timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success'] == true) {
          final List<dynamic> menuItems = data['menuItems'] ?? [];
          return menuItems.map((item) => MenuItem.fromJson(item)).toList();
        }
      }
      
      if (kDebugMode) {
        _log('Get menu items failed: ${response.body}', level: 'error');
      }
      return [];
    } catch (e) {
      if (kDebugMode) {
        _log('Exception during get menu items: $e', level: 'error');
      }
      return [];
    }
  }

  /// Get menu items by category
  static Future<List<MenuItem>> getMenuItemsByCategory(String category) async {
    try {
      final apiBaseUrl = await Config.apiBaseUrl;
      final response = await http.get(
        Uri.parse('$apiBaseUrl/menu/category/$category'),
        headers: _headers,
      ).timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success'] == true) {
          final List<dynamic> menuItems = data['menuItems'] ?? [];
          return menuItems.map((item) => MenuItem.fromJson(item)).toList();
        }
      }
      
      if (kDebugMode) {
        _log('Get menu items by category failed: ${response.body}', level: 'error');
      }
      return [];
    } catch (e) {
      if (kDebugMode) {
        _log('Exception during get menu items by category: $e', level: 'error');
      }
      return [];
    }
  }

  /// Get menu item by ID
  static Future<MenuItem?> getMenuItem(String itemId) async {
    try {
      final apiBaseUrl = await Config.apiBaseUrl;
      final response = await http.get(
        Uri.parse('$apiBaseUrl/menu/$itemId'),
        headers: _headers,
      ).timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success'] == true) {
          return MenuItem.fromJson(data['menuItem']);
        }
      }
      
      if (kDebugMode) {
        _log('Get menu item failed: ${response.body}', level: 'error');
      }
      return null;
    } catch (e) {
      if (kDebugMode) {
        _log('Exception during get menu item: $e', level: 'error');
      }
      return null;
    }
  }


  // ==================== INVENTORY API ====================

  /// Get all inventory items
  static Future<List<InventoryItem>> getInventoryItems() async {
    try {
      final apiBaseUrl = await Config.apiBaseUrl;
      final response = await http.get(
        Uri.parse('$apiBaseUrl/inventory'),
        headers: _headers,
      ).timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success'] == true) {
          final List<dynamic> items = data['inventoryItems'] ?? [];
          return items.map((item) => InventoryItem.fromJson(item)).toList();
        }
      }
      
      if (kDebugMode) {
        _log('Get inventory items failed: ${response.body}', level: 'error');
      }
      return [];
    } catch (e) {
      if (kDebugMode) {
        _log('Exception during get inventory items: $e', level: 'error');
      }
      return [];
    }
  }

  /// Get inventory items by category
  static Future<List<InventoryItem>> getInventoryItemsByCategory(String category) async {
    try {
      final apiBaseUrl = await Config.apiBaseUrl;
      final response = await http.get(
        Uri.parse('$apiBaseUrl/inventory/category/$category'),
        headers: _headers,
      ).timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success'] == true) {
          final List<dynamic> items = data['inventoryItems'] ?? [];
          return items.map((item) => InventoryItem.fromJson(item)).toList();
        }
      }
      
      if (kDebugMode) {
        _log('Get inventory items by category failed: ${response.body}', level: 'error');
      }
      return [];
    } catch (e) {
      if (kDebugMode) {
        _log('Exception during get inventory items by category: $e', level: 'error');
      }
      return [];
    }
  }

  /// Get low stock items
  static Future<List<InventoryItem>> getLowStockItems() async {
    try {
      final apiBaseUrl = await Config.apiBaseUrl;
      final response = await http.get(
        Uri.parse('$apiBaseUrl/inventory/low-stock'),
        headers: _headers,
      ).timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success'] == true) {
          final List<dynamic> items = data['inventoryItems'] ?? [];
          return items.map((item) => InventoryItem.fromJson(item)).toList();
        }
      }
      
      if (kDebugMode) {
        _log('Get low stock items failed: ${response.body}', level: 'error');
      }
      return [];
    } catch (e) {
      if (kDebugMode) {
        _log('Exception during get low stock items: $e', level: 'error');
      }
      return [];
    }
  }

  /// Get inventory item by ID
  static Future<InventoryItem?> getInventoryItem(String itemId) async {
    try {
      final apiBaseUrl = await Config.apiBaseUrl;
      final response = await http.get(
        Uri.parse('$apiBaseUrl/inventory/$itemId'),
        headers: _headers,
      ).timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success'] == true) {
          return InventoryItem.fromJson(data['inventoryItem']);
        }
      }
      
      if (kDebugMode) {
        _log('Get inventory item failed: ${response.body}', level: 'error');
      }
      return null;
    } catch (e) {
      if (kDebugMode) {
        _log('Exception during get inventory item: $e', level: 'error');
      }
      return null;
    }
  }

  // ==================== IMAGE UPLOAD API ====================

  /// Upload image to GridFS
  static Future<Map<String, dynamic>?> uploadImage({
    required String imageType, // 'menu', 'promo', 'inventory', 'profile'
    required String filePath,
    required String fileName,
  }) async {
    try {
      final apiBaseUrl = await Config.apiBaseUrl;
      final uri = Uri.parse('$apiBaseUrl/images/upload');
      
      final request = http.MultipartRequest('POST', uri);
      request.files.add(await http.MultipartFile.fromPath(
        'image',
        filePath,
        filename: fileName,
      ));
      request.fields['imageType'] = imageType;

      final streamedResponse = await request.send();
      final response = await http.Response.fromStream(streamedResponse);

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success'] == true) {
          return {
            'imageId': data['imageId'],
            'imageUrl': data['imageUrl'],
            'fileInfo': data['fileInfo'],
          };
        }
      }
      
      if (kDebugMode) {
        _log('Upload image failed: ${response.body}', level: 'error');
      }
      return null;
    } catch (e) {
      if (kDebugMode) {
        _log('Exception during upload image: $e', level: 'error');
      }
      return null;
    }
  }

  /// Upload image from bytes to GridFS
  static Future<Map<String, dynamic>?> uploadImageFromBytes({
    required String imageType, // 'menu', 'promo', 'inventory', 'profile'
    required Uint8List bytes,
    required String fileName,
  }) async {
    try {
      final apiBaseUrl = await Config.apiBaseUrl;
      final uri = Uri.parse('$apiBaseUrl/images/upload');
      
      if (kDebugMode) {
        _log('Uploading image to: $uri');
        _log('Image type: $imageType, fileName: $fileName, bytes: ${bytes.length}');
        _log('Expected GridFS collection: ${imageType}_images');
      }
      
      // Test server connectivity first
      try {
        final healthUrl = await Config.healthCheckUrl;
        final healthResponse = await http.get(Uri.parse(healthUrl)).timeout(const Duration(seconds: 5));
        if (kDebugMode) {
          _log('Server health check status: ${healthResponse.statusCode}');
        }
      } catch (e) {
        if (kDebugMode) {
          _log('Server health check failed: $e', level: 'error');
        }
        // Continue with upload attempt anyway
      }
      
      final request = http.MultipartRequest('POST', uri);
      request.files.add(http.MultipartFile.fromBytes(
        'image',
        bytes.toList(), // Convert Uint8List to List<int>
        filename: fileName,
      ));
      request.fields['imageType'] = imageType;

      final streamedResponse = await request.send().timeout(const Duration(seconds: 30));
      final response = await http.Response.fromStream(streamedResponse);

      if (kDebugMode) {
        _log('Upload response status: ${response.statusCode}');
        _log('Upload response body: ${response.body}');
        _log('Upload response headers: ${response.headers}');
      }

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success'] == true) {
          return {
            'imageId': data['imageId'],
            'imageUrl': data['imageUrl'],
            'fileInfo': data['fileInfo'],
          };
        } else {
          if (kDebugMode) {
            _log('Upload failed - success=false: ${response.body}', level: 'error');
          }
          return null;
        }
      }
      
      if (kDebugMode) {
        _log('Upload image from bytes failed with status ${response.statusCode}: ${response.body}', level: 'error');
      }
      return null;
    } catch (e) {
      if (kDebugMode) {
        _log('Exception during upload image from bytes: $e', level: 'error');
      }
      return null;
    }
  }

  /// Delete image from GridFS
  static Future<bool> deleteImage(String imageType, String imageId) async {
    try {
      final apiBaseUrl = await Config.apiBaseUrl;
      final response = await http.delete(
        Uri.parse('$apiBaseUrl/images/$imageType/$imageId'),
        headers: _headers,
      ).timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data['success'] == true;
      }
      
      if (kDebugMode) {
        _log('Delete image failed: ${response.body}', level: 'error');
      }
      return false;
    } catch (e) {
      if (kDebugMode) {
        _log('Exception during delete image: $e', level: 'error');
      }
      return false;
    }
  }
}
