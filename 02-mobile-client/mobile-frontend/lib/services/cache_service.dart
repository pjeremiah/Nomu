import 'dart:convert';
import 'dart:typed_data';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:path_provider/path_provider.dart';
import 'dart:io';
import 'logging_service.dart';

class CacheService {
  static const String _cachePrefix = 'cache_';
  static const Duration _defaultCacheDuration = Duration(hours: 1);
  
  /// Cache data with expiration
  static Future<void> setCache(String key, dynamic data, {Duration? duration}) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final cacheData = {
        'data': data,
        'timestamp': DateTime.now().millisecondsSinceEpoch,
        'expiresAt': DateTime.now().add(duration ?? _defaultCacheDuration).millisecondsSinceEpoch,
      };
      await prefs.setString('$_cachePrefix$key', jsonEncode(cacheData));
    } catch (e) {
      LoggingService.instance.error('Error setting cache for $key', e);
    }
  }
  
  /// Get cached data if not expired
  static Future<T?> getCache<T>(String key) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final cachedString = prefs.getString('$_cachePrefix$key');
      
      if (cachedString == null) return null;
      
      final cacheData = jsonDecode(cachedString) as Map<String, dynamic>;
      final expiresAt = cacheData['expiresAt'] as int;
      
      if (DateTime.now().millisecondsSinceEpoch > expiresAt) {
        // Cache expired, remove it
        await prefs.remove('$_cachePrefix$key');
        return null;
      }
      
      return cacheData['data'] as T?;
    } catch (e) {
      LoggingService.instance.error('Error getting cache for $key', e);
      return null;
    }
  }
  
  /// Clear specific cache
  static Future<void> clearCache(String key) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove('$_cachePrefix$key');
    } catch (e) {
      LoggingService.instance.error('Error clearing cache for $key', e);
    }
  }
  
  /// Clear all cache
  static Future<void> clearAllCache() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final keys = prefs.getKeys().where((key) => key.startsWith(_cachePrefix));
      for (final key in keys) {
        await prefs.remove(key);
      }
    } catch (e) {
      LoggingService.instance.error('Error clearing all cache', e);
    }
  }
  
  /// Clear cache entries that match a pattern
  static Future<void> clearCachePattern(String pattern) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final keys = prefs.getKeys().where((key) => 
        key.startsWith(_cachePrefix) && key.contains(pattern)
      );
      for (final key in keys) {
        await prefs.remove(key);
      }
      LoggingService.instance.info('Cleared ${keys.length} cache entries matching pattern: $pattern');
    } catch (e) {
      LoggingService.instance.error('Error clearing cache pattern $pattern', e);
    }
  }
  
  /// Check if cache exists and is valid
  static Future<bool> hasValidCache(String key) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final cachedString = prefs.getString('$_cachePrefix$key');
      
      if (cachedString == null) return false;
      
      final cacheData = jsonDecode(cachedString) as Map<String, dynamic>;
      final expiresAt = cacheData['expiresAt'] as int;
      
      return DateTime.now().millisecondsSinceEpoch <= expiresAt;
    } catch (e) {
      LoggingService.instance.error('Error checking cache validity for $key', e);
      return false;
    }
  }
  
  /// Get cache age
  static Future<Duration?> getCacheAge(String key) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final cachedString = prefs.getString('$_cachePrefix$key');
      
      if (cachedString == null) return null;
      
      final cacheData = jsonDecode(cachedString) as Map<String, dynamic>;
      final timestamp = cacheData['timestamp'] as int;
      
      return DateTime.now().difference(DateTime.fromMillisecondsSinceEpoch(timestamp));
    } catch (e) {
      LoggingService.instance.error('Error getting cache age for $key', e);
      return null;
    }
  }

  // ==================== GRIDFS IMAGE CACHE METHODS ====================

  /// Cache GridFS image bytes to file system
  static Future<void> setImageCache(String key, Uint8List imageBytes, {Duration? duration}) async {
    try {
      final cacheDir = await _getImageCacheDirectory();
      final file = File('${cacheDir.path}/$key');
      
      // Write image bytes to file
      await file.writeAsBytes(imageBytes);
      
      // Store metadata in SharedPreferences
      final prefs = await SharedPreferences.getInstance();
      final cacheData = {
        'filePath': file.path,
        'timestamp': DateTime.now().millisecondsSinceEpoch,
        'expiresAt': DateTime.now().add(duration ?? _defaultCacheDuration).millisecondsSinceEpoch,
        'size': imageBytes.length,
      };
      await prefs.setString('$_cachePrefix$key', jsonEncode(cacheData));
      
      LoggingService.instance.info('Image cached to file system', {
        'key': key,
        'filePath': file.path,
        'size': imageBytes.length
      });
    } catch (e) {
      LoggingService.instance.error('Error caching image for $key', e);
    }
  }

  /// Get cached GridFS image bytes from file system
  static Future<Uint8List?> getImageCache(String key) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final cachedString = prefs.getString('$_cachePrefix$key');
      
      if (cachedString == null) return null;
      
      final cacheData = jsonDecode(cachedString) as Map<String, dynamic>;
      final expiresAt = cacheData['expiresAt'] as int;
      
      if (DateTime.now().millisecondsSinceEpoch > expiresAt) {
        // Cache expired, remove it
        await removeImageCache(key);
        return null;
      }
      
      final filePath = cacheData['filePath'] as String;
      final file = File(filePath);
      
      if (await file.exists()) {
        final imageBytes = await file.readAsBytes();
        LoggingService.instance.info('Image loaded from cache', {
          'key': key,
          'filePath': filePath,
          'size': imageBytes.length
        });
        return imageBytes;
      } else {
        // File doesn't exist, remove cache entry
        await removeImageCache(key);
        return null;
      }
    } catch (e) {
      LoggingService.instance.error('Error getting image cache for $key', e);
      return null;
    }
  }

  /// Remove specific image cache
  static Future<void> removeImageCache(String key) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final cachedString = prefs.getString('$_cachePrefix$key');
      
      if (cachedString != null) {
        final cacheData = jsonDecode(cachedString) as Map<String, dynamic>;
        final filePath = cacheData['filePath'] as String?;
        
        if (filePath != null) {
          final file = File(filePath);
          if (await file.exists()) {
            await file.delete();
          }
        }
      }
      
      await prefs.remove('$_cachePrefix$key');
      LoggingService.instance.info('Image cache removed', {'key': key});
    } catch (e) {
      LoggingService.instance.error('Error removing image cache for $key', e);
    }
  }

  /// Clear all image cache
  static Future<void> clearAllImageCache() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final keys = prefs.getKeys().where((key) => key.startsWith(_cachePrefix));
      
      for (final key in keys) {
        final cachedString = prefs.getString(key);
        if (cachedString != null) {
          final cacheData = jsonDecode(cachedString) as Map<String, dynamic>;
          final filePath = cacheData['filePath'] as String?;
          
          if (filePath != null) {
            final file = File(filePath);
            if (await file.exists()) {
              await file.delete();
            }
          }
        }
        await prefs.remove(key);
      }
      
      LoggingService.instance.info('All image cache cleared');
    } catch (e) {
      LoggingService.instance.error('Error clearing all image cache', e);
    }
  }

  /// Clear image cache entries that match a pattern
  static Future<void> clearImageCachePattern(String pattern) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final keys = prefs.getKeys().where((key) => 
        key.startsWith(_cachePrefix) && key.contains(pattern)
      );
      
      int removedCount = 0;
      for (final key in keys) {
        final cachedString = prefs.getString(key);
        if (cachedString != null) {
          final cacheData = jsonDecode(cachedString) as Map<String, dynamic>;
          final filePath = cacheData['filePath'] as String?;
          
          if (filePath != null) {
            final file = File(filePath);
            if (await file.exists()) {
              await file.delete();
            }
          }
        }
        await prefs.remove(key);
        removedCount++;
      }
      
      LoggingService.instance.info('Cleared $removedCount image cache entries matching pattern: $pattern');
    } catch (e) {
      LoggingService.instance.error('Error clearing image cache pattern $pattern', e);
    }
  }

  /// Get image cache size in bytes
  static Future<int> getImageCacheSize([String? pattern]) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final keys = prefs.getKeys().where((key) => 
        key.startsWith(_cachePrefix) && 
        (pattern == null || key.contains(pattern))
      );
      
      int totalSize = 0;
      for (final key in keys) {
        final cachedString = prefs.getString(key);
        if (cachedString != null) {
          final cacheData = jsonDecode(cachedString) as Map<String, dynamic>;
          final size = cacheData['size'] as int? ?? 0;
          totalSize += size;
        }
      }
      
      return totalSize;
    } catch (e) {
      LoggingService.instance.error('Error getting image cache size', e);
      return 0;
    }
  }

  /// Get image cache count
  static Future<int> getImageCacheCount([String? pattern]) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final keys = prefs.getKeys().where((key) => 
        key.startsWith(_cachePrefix) && 
        (pattern == null || key.contains(pattern))
      );
      
      return keys.length;
    } catch (e) {
      LoggingService.instance.error('Error getting image cache count', e);
      return 0;
    }
  }

  /// Clean up expired image cache files
  static Future<void> cleanupExpiredImageCache() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final keys = prefs.getKeys().where((key) => key.startsWith(_cachePrefix));
      
      int cleanedCount = 0;
      for (final key in keys) {
        final cachedString = prefs.getString(key);
        if (cachedString != null) {
          final cacheData = jsonDecode(cachedString) as Map<String, dynamic>;
          final expiresAt = cacheData['expiresAt'] as int;
          
          if (DateTime.now().millisecondsSinceEpoch > expiresAt) {
            final filePath = cacheData['filePath'] as String?;
            
            if (filePath != null) {
              final file = File(filePath);
              if (await file.exists()) {
                await file.delete();
              }
            }
            
            await prefs.remove(key);
            cleanedCount++;
          }
        }
      }
      
      LoggingService.instance.info('Cleaned up $cleanedCount expired image cache entries');
    } catch (e) {
      LoggingService.instance.error('Error cleaning up expired image cache', e);
    }
  }

  /// Get image cache directory
  static Future<Directory> _getImageCacheDirectory() async {
    final appDir = await getApplicationDocumentsDirectory();
    final cacheDir = Directory('${appDir.path}/image_cache');
    
    if (!await cacheDir.exists()) {
      await cacheDir.create(recursive: true);
    }
    
    return cacheDir;
  }

  /// Get image cache statistics
  static Future<Map<String, dynamic>> getImageCacheStats() async {
    try {
      final totalSize = await getImageCacheSize();
      final totalCount = await getImageCacheCount();
      final menuCount = await getImageCacheCount('gridfs_image_menu_');
      final promoCount = await getImageCacheCount('gridfs_image_promo_');
      final inventoryCount = await getImageCacheCount('gridfs_image_inventory_');
      final profileCount = await getImageCacheCount('gridfs_image_profile_');
      
      return {
        'totalSize': totalSize,
        'totalCount': totalCount,
        'menuImages': menuCount,
        'promoImages': promoCount,
        'inventoryImages': inventoryCount,
        'profileImages': profileCount,
        'averageSize': totalCount > 0 ? totalSize / totalCount : 0,
      };
    } catch (e) {
      LoggingService.instance.error('Error getting image cache stats', e);
      return {};
    }
  }
}
