import 'dart:io';
import 'dart:typed_data';
import 'dart:convert';
import 'package:http/http.dart' as http;
import '../api/api.dart';
import '../config.dart';
import '../services/cache_service.dart';
import '../services/logging_service.dart';

class GridFSImageService {
  static GridFSImageService? _instance;
  
  // Singleton pattern
  static GridFSImageService get instance {
    _instance ??= GridFSImageService._internal();
    return _instance!;
  }

  GridFSImageService._internal();

  // Image types supported by GridFS
  static const List<String> supportedImageTypes = [
    'menu',
    'promo', 
    'inventory',
    'profile'
  ];

  // Cache duration for images (24 hours)
  static const Duration imageCacheDuration = Duration(hours: 24);

  /// Upload image to GridFS
  Future<Map<String, dynamic>?> uploadImage({
    required String imageType,
    required String filePath,
    String? customFileName,
  }) async {
    try {
      if (!supportedImageTypes.contains(imageType)) {
        throw Exception('Unsupported image type: $imageType');
      }

      final file = File(filePath);
      if (!await file.exists()) {
        throw Exception('File does not exist: $filePath');
      }

      final fileName = customFileName ?? file.path.split('/').last;
      
      LoggingService.instance.info('Uploading image to GridFS', {
        'imageType': imageType,
        'filePath': filePath,
        'fileName': fileName
      });

      final result = await ApiService.uploadImage(
        imageType: imageType,
        filePath: filePath,
        fileName: fileName,
      );

      if (result != null) {
        LoggingService.instance.info('Image uploaded successfully', {
          'imageId': result['imageId'],
          'imageUrl': result['imageUrl']
        });
      }

      return result;
    } catch (e) {
      LoggingService.instance.error('Error uploading image to GridFS', e);
      rethrow;
    }
  }

  /// Upload image from bytes to GridFS
  Future<Map<String, dynamic>?> uploadImageFromBytes({
    required String imageType,
    required Uint8List bytes,
    required String fileName,
  }) async {
    try {
      if (!supportedImageTypes.contains(imageType)) {
        throw Exception('Unsupported image type: $imageType');
      }

      LoggingService.instance.info('Uploading image bytes to GridFS', {
        'imageType': imageType,
        'fileName': fileName,
        'bytesLength': bytes.length,
        'gridfsCollection': '${imageType}_images'
      });

      final result = await ApiService.uploadImageFromBytes(
        imageType: imageType,
        bytes: bytes,
        fileName: fileName,
      );

      if (result != null) {
        LoggingService.instance.info('Image bytes uploaded successfully to GridFS', {
          'imageId': result['imageId'],
          'imageUrl': result['imageUrl'],
          'gridfsCollection': '${imageType}_images',
          'chunksCollection': '${imageType}_images.chunks',
          'filesCollection': '${imageType}_images.files'
        });
        return result;
      } else {
        LoggingService.instance.error('Failed to upload image to GridFS - API returned null');
        return null;
      }
    } catch (e) {
      LoggingService.instance.error('Error uploading image bytes to GridFS', e);
      return null;
    }
  }

  /// Get image URL for GridFS image
  Future<String> getImageUrl(String imageType, String imageId) async {
    try {
      if (!supportedImageTypes.contains(imageType)) {
        throw Exception('Unsupported image type: $imageType');
      }

      final baseUrl = await Config.apiBaseUrl;
      final imageUrl = '$baseUrl/api/images/$imageType/$imageId';
      
      LoggingService.instance.info('Constructed image URL', {
        'imageType': imageType,
        'imageId': imageId,
        'baseUrl': baseUrl,
        'imageUrl': imageUrl
      });
      
      return imageUrl;
    } catch (e) {
      LoggingService.instance.error('Error getting image URL', e);
      return '';
    }
  }

  /// Get fallback image URL for promo (uses regular promo image endpoint with fallback)
  Future<String> getPromoImageUrl(String promoId) async {
    try {
      final baseUrl = await Config.apiBaseUrl;
      final imageUrl = '$baseUrl/api/promo-image/$promoId';
      
      LoggingService.instance.info('Constructed promo fallback image URL', {
        'promoId': promoId,
        'baseUrl': baseUrl,
        'imageUrl': imageUrl
      });
      
      return imageUrl;
    } catch (e) {
      LoggingService.instance.error('Error getting promo fallback image URL', e);
      return '';
    }
  }

  /// Download image from GridFS
  Future<Uint8List?> downloadImage(String imageType, String imageId) async {
    try {
      if (!supportedImageTypes.contains(imageType)) {
        throw Exception('Unsupported image type: $imageType');
      }

      // Check cache first
      final cacheKey = 'gridfs_image_${imageType}_$imageId';
      final cachedImage = await CacheService.getImageCache(cacheKey);
      if (cachedImage != null) {
        LoggingService.instance.info('Using cached image', {
          'imageType': imageType,
          'imageId': imageId
        });
        return cachedImage;
      }

      // For promo images, try GridFS first, then fallback to regular promo endpoint
      String imageUrl = await getImageUrl(imageType, imageId);
      if (imageUrl.isEmpty) {
        return null;
      }

      LoggingService.instance.info('Downloading image from GridFS', {
        'imageType': imageType,
        'imageId': imageId,
        'imageUrl': imageUrl
      });

      var response = await http.get(
        Uri.parse(imageUrl),
        headers: {
          'Accept': 'image/*',
        },
      ).timeout(const Duration(seconds: 30));

      // If GridFS fails for promo images, try the fallback endpoint
      if (response.statusCode == 404 && imageType == 'promo') {
        LoggingService.instance.warning('GridFS image not found, trying fallback endpoint', {
          'imageType': imageType,
          'imageId': imageId
        });
        
        // For promo fallback, we need the promo ID, not the image ID
        // This is a limitation - we need to modify the calling code to pass promo ID
        // For now, let's try to use the imageId as promoId (this might work if they're the same)
        final fallbackUrl = await getPromoImageUrl(imageId);
        if (fallbackUrl.isNotEmpty) {
          response = await http.get(
            Uri.parse(fallbackUrl),
            headers: {
              'Accept': 'image/*',
            },
          ).timeout(const Duration(seconds: 30));
          
          LoggingService.instance.info('Tried fallback endpoint', {
            'fallbackUrl': fallbackUrl,
            'statusCode': response.statusCode
          });
        }
      }

      if (response.statusCode == 200) {
        final imageBytes = response.bodyBytes;
        
        // Cache the image
        await CacheService.setImageCache(
          cacheKey, 
          imageBytes, 
          duration: imageCacheDuration
        );

        LoggingService.instance.info('Image downloaded successfully', {
          'imageType': imageType,
          'imageId': imageId,
          'bytesLength': imageBytes.length
        });

        return imageBytes;
      } else {
        LoggingService.instance.error('Failed to download image', {
          'imageType': imageType,
          'imageId': imageId,
          'statusCode': response.statusCode
        });
        return null;
      }
    } catch (e) {
      LoggingService.instance.error('Error downloading image from GridFS', e);
      return null;
    }
  }

  /// Delete image from GridFS
  Future<bool> deleteImage(String imageType, String imageId) async {
    try {
      if (!supportedImageTypes.contains(imageType)) {
        throw Exception('Unsupported image type: $imageType');
      }

      LoggingService.instance.info('Deleting image from GridFS', {
        'imageType': imageType,
        'imageId': imageId
      });

      final success = await ApiService.deleteImage(imageType, imageId);
      
      if (success) {
        // Clear cache
        final cacheKey = 'gridfs_image_${imageType}_$imageId';
        await CacheService.removeImageCache(cacheKey);
        
        LoggingService.instance.info('Image deleted successfully', {
          'imageType': imageType,
          'imageId': imageId
        });
      }

      return success;
    } catch (e) {
      LoggingService.instance.error('Error deleting image from GridFS', e);
      return false;
    }
  }

  /// Check if image exists in GridFS
  Future<bool> imageExists(String imageType, String imageId) async {
    try {
      if (!supportedImageTypes.contains(imageType)) {
        return false;
      }

      final imageUrl = await getImageUrl(imageType, imageId);
      if (imageUrl.isEmpty) {
        return false;
      }

      final response = await http.head(
        Uri.parse(imageUrl),
      ).timeout(const Duration(seconds: 10));

      return response.statusCode == 200;
    } catch (e) {
      LoggingService.instance.error('Error checking if image exists', e);
      return false;
    }
  }

  /// Get image info from GridFS
  Future<Map<String, dynamic>?> getImageInfo(String imageType, String imageId) async {
    try {
      if (!supportedImageTypes.contains(imageType)) {
        return null;
      }

      final baseUrl = await Config.apiBaseUrl;
      final response = await http.get(
        Uri.parse('$baseUrl/images/$imageType/$imageId/info'),
        headers: {
          'Content-Type': 'application/json',
        },
      ).timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        if (data['success'] == true) {
          return data['imageInfo'];
        }
      }

      return null;
    } catch (e) {
      LoggingService.instance.error('Error getting image info', e);
      return null;
    }
  }

  /// Clear image cache
  Future<void> clearImageCache() async {
    try {
      await CacheService.clearImageCachePattern('gridfs_image_');
      LoggingService.instance.info('Image cache cleared');
    } catch (e) {
      LoggingService.instance.error('Error clearing image cache', e);
    }
  }

  /// Clear cache for specific image
  Future<void> clearImageCacheFor(String imageType, String imageId) async {
    try {
      final cacheKey = 'gridfs_image_${imageType}_$imageId';
      await CacheService.removeImageCache(cacheKey);
      LoggingService.instance.info('Image cache cleared for specific image', {
        'imageType': imageType,
        'imageId': imageId
      });
    } catch (e) {
      LoggingService.instance.error('Error clearing specific image cache', e);
    }
  }

  /// Get cache size for images
  Future<int> getImageCacheSize() async {
    try {
      return await CacheService.getImageCacheSize('gridfs_image_');
    } catch (e) {
      LoggingService.instance.error('Error getting image cache size', e);
      return 0;
    }
  }

  /// Preload images for better performance
  Future<void> preloadImages(List<Map<String, String>> imageList) async {
    try {
      LoggingService.instance.info('Preloading images', {
        'count': imageList.length
      });

      for (final imageInfo in imageList) {
        final imageType = imageInfo['type'];
        final imageId = imageInfo['id'];
        
        if (imageType != null && imageId != null) {
          // Download image in background (don't await to avoid blocking)
          downloadImage(imageType, imageId).catchError((e) {
            LoggingService.instance.error('Error preloading image', e);
            return null;
          });
        }
      }
    } catch (e) {
      LoggingService.instance.error('Error preloading images', e);
    }
  }

  /// Validate image type
  static bool isValidImageType(String imageType) {
    return supportedImageTypes.contains(imageType);
  }

  /// Get supported image types
  static List<String> getSupportedImageTypes() {
    return List.from(supportedImageTypes);
  }
}
