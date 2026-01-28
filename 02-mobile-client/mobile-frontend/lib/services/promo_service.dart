import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter/foundation.dart' show kDebugMode;
import 'dart:developer' as developer;
import '../models/promo.dart';
import '../config.dart';

class PromoService {
  static const Map<String, String> _headers = {
    'Content-Type': 'application/json',
  };

  // Helper method for debug logging
  static void _log(String message, {String level = 'info'}) {
    if (kDebugMode) {
      developer.log(message, name: 'PromoService', level: level == 'error' ? 1000 : 800);
    }
  }

  // Get active promos
  static Future<List<Promo>> getActivePromos() async {
    try {
      final apiBaseUrl = await Config.apiBaseUrl;
      final response = await http.get(
        Uri.parse('$apiBaseUrl/promos'),
        headers: _headers,
      ).timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success'] == true) {
          final List<dynamic> promos = data['promos'] ?? [];
          return promos.map((promo) => Promo.fromJson(promo)).toList();
        }
      }
      
      if (kDebugMode) {
        _log('Get active promos failed: ${response.body}', level: 'error');
      }
      return [];
    } catch (e) {
      if (kDebugMode) {
        _log('Exception during get active promos: $e', level: 'error');
      }
      return [];
    }
  }

  // Get all promos (admin only)
  static Future<List<Promo>> getAllPromos(String token) async {
    try {
      final apiBaseUrl = await Config.apiBaseUrl;
      final response = await http.get(
        Uri.parse('$apiBaseUrl/promos'),
        headers: {
          ..._headers,
          'Authorization': 'Bearer $token',
        },
      ).timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success'] == true) {
          final List<dynamic> promos = data['promos'] ?? [];
          return promos.map((promo) => Promo.fromJson(promo)).toList();
        }
      }
      
      if (kDebugMode) {
        _log('Get all promos failed: ${response.body}', level: 'error');
      }
      return [];
    } catch (e) {
      if (kDebugMode) {
        _log('Exception during get all promos: $e', level: 'error');
      }
      return [];
    }
  }

  // Get all promos for carousel display (legacy method for backward compatibility)
  static Future<List<Map<String, dynamic>>> getPromos() async {
    try {
      final apiBaseUrl = await Config.apiBaseUrl;
      if (kDebugMode) {
        _log('Fetching promos from: $apiBaseUrl/promos');
      }
      final response = await http.get(
        Uri.parse('$apiBaseUrl/promos'),
        headers: _headers,
      ).timeout(const Duration(seconds: 5));
      
      if (kDebugMode) {
        _log('Promos response status: ${response.statusCode}');
        _log('Promos response body: ${response.body}');
      }
      
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (kDebugMode) {
          _log('Parsed promos data: $data');
        }
        if (data['success'] == true) {
          final promos = List<Map<String, dynamic>>.from(data['promos'] ?? []);
          if (kDebugMode) {
            _log('Returning ${promos.length} promos');
          }
          return promos;
        }
      }
      if (kDebugMode) {
        _log('Get promos failed: ${response.body}', level: 'error');
      }
      return [];
    } catch (e) {
      if (kDebugMode) {
        _log('Exception during get promos: $e', level: 'error');
      }
      return [];
    }
  }

  // Get admin promos (admin only) - legacy method
  static Future<List<Map<String, dynamic>>> getAdminPromos(String token) async {
    try {
      final apiBaseUrl = await Config.apiBaseUrl;
      final response = await http.get(
        Uri.parse('$apiBaseUrl/admin/promos'),
        headers: {
          ..._headers,
          'Authorization': 'Bearer $token',
        },
      );
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success'] == true) {
          return List<Map<String, dynamic>>.from(data['promos'] ?? []);
        }
      }
      if (kDebugMode) {
        _log('Get admin promos failed: ${response.body}', level: 'error');
      }
      return [];
    } catch (e) {
      if (kDebugMode) {
        _log('Exception during get admin promos: $e', level: 'error');
      }
      return [];
    }
  }

  // Get promo by ID
  static Future<Promo?> getPromo(String promoId) async {
    try {
      final apiBaseUrl = await Config.apiBaseUrl;
      final response = await http.get(
        Uri.parse('$apiBaseUrl/promos/$promoId'),
        headers: _headers,
      ).timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success'] == true) {
          return Promo.fromJson(data['promo']);
        }
      }
      
      if (kDebugMode) {
        _log('Get promo failed: ${response.body}', level: 'error');
      }
      return null;
    } catch (e) {
      if (kDebugMode) {
        _log('Exception during get promo: $e', level: 'error');
      }
      return null;
    }
  }

  // Create new promo (admin only)
  static Future<Promo?> createPromo(String token, Map<String, dynamic> promoData) async {
    try {
      final apiBaseUrl = await Config.apiBaseUrl;
      final response = await http.post(
        Uri.parse('$apiBaseUrl/admin/promos'),
        headers: {
          ..._headers,
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode(promoData),
      );
      if (response.statusCode == 201) {
        final data = jsonDecode(response.body);
        if (data['success'] == true) {
          return Promo.fromJson(data['promo']);
        }
      }
      if (kDebugMode) {
        _log('Create promo failed: ${response.body}', level: 'error');
      }
      return null;
    } catch (e) {
      if (kDebugMode) {
        _log('Exception during create promo: $e', level: 'error');
      }
      return null;
    }
  }

  // Update promo (admin only)
  static Future<Promo?> updatePromo(String token, String promoId, Map<String, dynamic> promoData) async {
    try {
      final apiBaseUrl = await Config.apiBaseUrl;
      final response = await http.put(
        Uri.parse('$apiBaseUrl/admin/promos/$promoId'),
        headers: {
          ..._headers,
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode(promoData),
      );
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success'] == true) {
          return Promo.fromJson(data['promo']);
        }
      }
      if (kDebugMode) {
        _log('Update promo failed: ${response.body}', level: 'error');
      }
      return null;
    } catch (e) {
      if (kDebugMode) {
        _log('Exception during update promo: $e', level: 'error');
      }
      return null;
    }
  }

  // Delete promo (admin only)
  static Future<bool> deletePromo(String token, String promoId) async {
    try {
      final apiBaseUrl = await Config.apiBaseUrl;
      final response = await http.delete(
        Uri.parse('$apiBaseUrl/admin/promos/$promoId'),
        headers: {
          ..._headers,
          'Authorization': 'Bearer $token',
        },
      );
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data['success'] == true;
      }
      if (kDebugMode) {
        _log('Delete promo failed: ${response.body}', level: 'error');
      }
      return false;
    } catch (e) {
      if (kDebugMode) {
        _log('Exception during delete promo: $e', level: 'error');
      }
      return false;
    }
  }
}
