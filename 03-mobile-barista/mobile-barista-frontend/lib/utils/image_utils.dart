import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';
import 'dart:ui' as ui;
import 'package:flutter/services.dart';
import '../utils/logger.dart';

/// Image utility functions for compression, caching, and processing
class ImageUtils {
  static const int _maxImageSize = 2 * 1024 * 1024; // 2MB
  static const int _maxImageWidth = 1920;
  static const int _maxImageHeight = 1080;
  static const int _compressionQuality = 85;

  /// Compress image file to reduce size
  static Future<File?> compressImage(File imageFile) async {
    try {
      Logger.api('Compressing image: ${imageFile.path}', 'IMAGE');
      
      // Check if file exists
      if (!await imageFile.exists()) {
        Logger.error('Image file does not exist: ${imageFile.path}', 'IMAGE');
        return null;
      }

      // Check file size
      final fileSize = await imageFile.length();
      if (fileSize <= _maxImageSize) {
        Logger.api('Image size is already within limits: ${fileSize / 1024}KB', 'IMAGE');
        return imageFile;
      }

      // Read image data
      final imageBytes = await imageFile.readAsBytes();
      final codec = await ui.instantiateImageCodec(
        imageBytes,
        targetWidth: _maxImageWidth,
        targetHeight: _maxImageHeight,
      );
      
      final frame = await codec.getNextFrame();
      final image = frame.image;
      
      // Convert to PNG with compression
      final byteData = await image.toByteData(format: ui.ImageByteFormat.png);
      if (byteData == null) {
        Logger.error('Failed to convert image to byte data', 'IMAGE');
        return null;
      }

      // Create compressed file
      final compressedBytes = byteData.buffer.asUint8List();
      final compressedFile = File('${imageFile.path}_compressed');
      await compressedFile.writeAsBytes(compressedBytes);
      
      final compressedSize = await compressedFile.length();
      Logger.success('Image compressed: ${fileSize / 1024}KB -> ${compressedSize / 1024}KB', 'IMAGE');
      
      return compressedFile;
    } catch (e) {
      Logger.exception('Failed to compress image', e, 'IMAGE');
      return null;
    }
  }

  /// Resize image to specified dimensions
  static Future<Uint8List?> resizeImage(
    Uint8List imageBytes, {
    int? targetWidth,
    int? targetHeight,
    int quality = _compressionQuality,
  }) async {
    try {
      Logger.api('Resizing image to ${targetWidth}x${targetHeight}', 'IMAGE');
      
      final codec = await ui.instantiateImageCodec(
        imageBytes,
        targetWidth: targetWidth,
        targetHeight: targetHeight,
      );
      
      final frame = await codec.getNextFrame();
      final image = frame.image;
      
      final byteData = await image.toByteData(format: ui.ImageByteFormat.png);
      if (byteData == null) {
        Logger.error('Failed to convert resized image to byte data', 'IMAGE');
        return null;
      }
      
      Logger.success('Image resized successfully', 'IMAGE');
      return byteData.buffer.asUint8List();
    } catch (e) {
      Logger.exception('Failed to resize image', e, 'IMAGE');
      return null;
    }
  }

  /// Get image dimensions
  static Future<Map<String, int>?> getImageDimensions(String imagePath) async {
    try {
      final file = File(imagePath);
      if (!await file.exists()) {
        Logger.error('Image file does not exist: $imagePath', 'IMAGE');
        return null;
      }

      final imageBytes = await file.readAsBytes();
      final codec = await ui.instantiateImageCodec(imageBytes);
      final frame = await codec.getNextFrame();
      final image = frame.image;
      
      return {
        'width': image.width,
        'height': image.height,
      };
    } catch (e) {
      Logger.exception('Failed to get image dimensions', e, 'IMAGE');
      return null;
    }
  }

  /// Validate image file
  static Future<Map<String, dynamic>> validateImageFile(String imagePath) async {
    try {
      final file = File(imagePath);
      
      // Check if file exists
      if (!await file.exists()) {
        return {
          'valid': false,
          'error': 'File does not exist',
        };
      }

      // Check file size
      final fileSize = await file.length();
      if (fileSize > _maxImageSize) {
        return {
          'valid': false,
          'error': 'File size too large: ${(fileSize / 1024 / 1024).toStringAsFixed(2)}MB',
          'fileSize': fileSize,
        };
      }

      // Check file extension
      final extension = imagePath.split('.').last.toLowerCase();
      if (!['jpg', 'jpeg', 'png', 'gif', 'webp'].contains(extension)) {
        return {
          'valid': false,
          'error': 'Unsupported file format: $extension',
        };
      }

      // Get image dimensions
      final dimensions = await getImageDimensions(imagePath);
      if (dimensions == null) {
        return {
          'valid': false,
          'error': 'Invalid image file',
        };
      }

      // Check dimensions
      if (dimensions['width']! > _maxImageWidth || dimensions['height']! > _maxImageHeight) {
        return {
          'valid': false,
          'error': 'Image dimensions too large: ${dimensions['width']}x${dimensions['height']}',
          'dimensions': dimensions,
        };
      }

      return {
        'valid': true,
        'fileSize': fileSize,
        'dimensions': dimensions,
        'extension': extension,
      };
    } catch (e) {
      Logger.exception('Failed to validate image file', e, 'IMAGE');
      return {
        'valid': false,
        'error': 'Validation failed: ${e.toString()}',
      };
    }
  }

  /// Create thumbnail from image
  static Future<Uint8List?> createThumbnail(
    String imagePath, {
    int thumbnailWidth = 200,
    int thumbnailHeight = 200,
  }) async {
    try {
      Logger.api('Creating thumbnail for: $imagePath', 'IMAGE');
      
      final file = File(imagePath);
      if (!await file.exists()) {
        Logger.error('Image file does not exist: $imagePath', 'IMAGE');
        return null;
      }

      final imageBytes = await file.readAsBytes();
      final thumbnailBytes = await resizeImage(
        imageBytes,
        targetWidth: thumbnailWidth,
        targetHeight: thumbnailHeight,
      );
      
      if (thumbnailBytes != null) {
        Logger.success('Thumbnail created successfully', 'IMAGE');
      }
      
      return thumbnailBytes;
    } catch (e) {
      Logger.exception('Failed to create thumbnail', e, 'IMAGE');
      return null;
    }
  }

  /// Convert image to base64 string
  static Future<String?> imageToBase64(String imagePath) async {
    try {
      final file = File(imagePath);
      if (!await file.exists()) {
        Logger.error('Image file does not exist: $imagePath', 'IMAGE');
        return null;
      }

      final imageBytes = await file.readAsBytes();
      return base64Encode(imageBytes);
    } catch (e) {
      Logger.exception('Failed to convert image to base64', e, 'IMAGE');
      return null;
    }
  }

  /// Convert base64 string to image bytes
  static Uint8List? base64ToImageBytes(String base64String) {
    try {
      return base64Decode(base64String);
    } catch (e) {
      Logger.exception('Failed to convert base64 to image bytes', e, 'IMAGE');
      return null;
    }
  }

  /// Save image bytes to file
  static Future<File?> saveImageBytes(Uint8List imageBytes, String filePath) async {
    try {
      final file = File(filePath);
      await file.writeAsBytes(imageBytes);
      Logger.success('Image saved to: $filePath', 'IMAGE');
      return file;
    } catch (e) {
      Logger.exception('Failed to save image bytes', e, 'IMAGE');
      return null;
    }
  }

  /// Get image file info
  static Future<Map<String, dynamic>?> getImageInfo(String imagePath) async {
    try {
      final file = File(imagePath);
      if (!await file.exists()) {
        return null;
      }

      final fileSize = await file.length();
      final dimensions = await getImageDimensions(imagePath);
      final extension = imagePath.split('.').last.toLowerCase();
      
      return {
        'path': imagePath,
        'name': imagePath.split('/').last,
        'size': fileSize,
        'sizeFormatted': _formatFileSize(fileSize),
        'dimensions': dimensions,
        'extension': extension,
        'isValid': dimensions != null,
      };
    } catch (e) {
      Logger.exception('Failed to get image info', e, 'IMAGE');
      return null;
    }
  }

  /// Format file size for display
  static String _formatFileSize(int bytes) {
    if (bytes < 1024) return '$bytes B';
    if (bytes < 1024 * 1024) return '${(bytes / 1024).toStringAsFixed(1)} KB';
    if (bytes < 1024 * 1024 * 1024) return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
    return '${(bytes / (1024 * 1024 * 1024)).toStringAsFixed(1)} GB';
  }

  /// Check if image needs compression
  static Future<bool> needsCompression(String imagePath) async {
    try {
      final file = File(imagePath);
      if (!await file.exists()) return false;
      
      final fileSize = await file.length();
      return fileSize > _maxImageSize;
    } catch (e) {
      Logger.exception('Failed to check if image needs compression', e, 'IMAGE');
      return false;
    }
  }

  /// Get supported image formats
  static List<String> getSupportedFormats() {
    return ['jpg', 'jpeg', 'png', 'gif', 'webp'];
  }

  /// Get maximum image size in MB
  static double getMaxImageSizeMB() {
    return _maxImageSize / (1024 * 1024);
  }

  /// Get maximum image dimensions
  static Map<String, int> getMaxImageDimensions() {
    return {
      'width': _maxImageWidth,
      'height': _maxImageHeight,
    };
  }

  /// Create image cache directory
  static Future<Directory> getImageCacheDirectory() async {
    try {
      final cacheDir = Directory('${Directory.systemTemp.path}/nomu_image_cache');
      if (!await cacheDir.exists()) {
        await cacheDir.create(recursive: true);
      }
      return cacheDir;
    } catch (e) {
      Logger.exception('Failed to create image cache directory', e, 'IMAGE');
      return Directory.systemTemp;
    }
  }

  /// Clear image cache
  static Future<void> clearImageCache() async {
    try {
      final cacheDir = await getImageCacheDirectory();
      if (await cacheDir.exists()) {
        await cacheDir.delete(recursive: true);
        Logger.success('Image cache cleared', 'IMAGE');
      }
    } catch (e) {
      Logger.exception('Failed to clear image cache', e, 'IMAGE');
    }
  }

  /// Get cache size
  static Future<int> getCacheSize() async {
    try {
      final cacheDir = await getImageCacheDirectory();
      if (!await cacheDir.exists()) return 0;
      
      int totalSize = 0;
      await for (final entity in cacheDir.list(recursive: true)) {
        if (entity is File) {
          totalSize += await entity.length();
        }
      }
      
      return totalSize;
    } catch (e) {
      Logger.exception('Failed to get cache size', e, 'IMAGE');
      return 0;
    }
  }

  /// Format cache size for display
  static String formatCacheSize(int bytes) {
    return _formatFileSize(bytes);
  }
}

// Base64 encoding/decoding utilities
String base64Encode(Uint8List bytes) {
  return base64.encode(bytes);
}

Uint8List base64Decode(String base64String) {
  return base64.decode(base64String);
}
