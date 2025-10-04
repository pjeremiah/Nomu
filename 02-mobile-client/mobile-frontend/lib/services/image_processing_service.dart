import 'dart:typed_data';
import 'package:flutter/foundation.dart';
import 'logging_service.dart';

class ImageProcessingService {
  static ImageProcessingService? _instance;
  
  // Singleton pattern
  static ImageProcessingService get instance {
    _instance ??= ImageProcessingService._internal();
    return _instance!;
  }

  ImageProcessingService._internal();

  /// Process image bytes to ensure web compatibility
  static Future<ProcessedImageResult> processImageForWeb({
    required Uint8List imageBytes,
    required String originalFileName,
    int maxWidth = 1920,
    int maxHeight = 1920,
    int quality = 85,
  }) async {
    try {
      LoggingService.instance.info('Starting image processing for web compatibility', {
        'originalFileName': originalFileName,
        'originalSize': imageBytes.length,
        'maxWidth': maxWidth,
        'maxHeight': maxHeight,
        'quality': quality,
      });

      // For now, we'll return the original bytes with a warning
      // In a production app, you would use libraries like:
      // - image package for basic image processing
      // - flutter_image_compress for compression
      // - native platform libraries for RAW format conversion
      
      LoggingService.instance.warning('Image processing not fully implemented', {
        'message': 'Returning original image bytes. Consider implementing proper image conversion for better compatibility.',
        'originalFileName': originalFileName,
      });

      return ProcessedImageResult(
        processedBytes: imageBytes,
        originalBytes: imageBytes,
        wasProcessed: false,
        warning: 'Image processing not fully implemented. Some formats may not display properly in all browsers.',
        suggestedFormat: 'JPEG',
      );

    } catch (e) {
      LoggingService.instance.error('Image processing error', e);
      return ProcessedImageResult(
        processedBytes: imageBytes,
        originalBytes: imageBytes,
        wasProcessed: false,
        error: 'Image processing failed: $e',
        suggestedFormat: 'JPEG',
      );
    }
  }

  /// Get recommended format for different file types
  static String getRecommendedFormat(String fileExtension) {
    final ext = fileExtension.toLowerCase();
    
    // RAW formats should be converted to JPEG
    if (['.raw', '.cr2', '.nef', '.orf', '.sr2', '.arw', '.dng', '.rw2', 
         '.pef', '.srw', '.3fr', '.mef', '.mos', '.mrw', '.raf', '.x3f', 
         '.dcr', '.kdc', '.erf', '.mdc', '.nrw'].contains(ext)) {
      return 'JPEG';
    }
    
    // Modern formats should be converted to JPEG or WebP
    if (['.heic', '.heif'].contains(ext)) {
      return 'JPEG';
    }
    
    // Legacy formats should be converted to JPEG
    if (['.xbm', '.xpm', '.ppm', '.pgm', '.pbm', '.pnm', '.pcx', '.tga', '.psd'].contains(ext)) {
      return 'JPEG';
    }
    
    // Already web-safe formats
    if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff', '.svg', '.ico', '.avif'].contains(ext)) {
      // Safe substring operation to prevent RangeError
      return ext.startsWith('.') ? ext.substring(1).toUpperCase() : ext.toUpperCase();
    }
    
    return 'JPEG'; // Default fallback
  }

  /// Check if image needs processing
  static bool needsProcessing(String fileExtension) {
    final ext = fileExtension.toLowerCase();
    
    // RAW formats need processing
    if (['.raw', '.cr2', '.nef', '.orf', '.sr2', '.arw', '.dng', '.rw2', 
         '.pef', '.srw', '.3fr', '.mef', '.mos', '.mrw', '.raf', '.x3f', 
         '.dcr', '.kdc', '.erf', '.mdc', '.nrw'].contains(ext)) {
      return true;
    }
    
    // Modern formats may need processing
    if (['.heic', '.heif'].contains(ext)) {
      return true;
    }
    
    // Legacy formats need processing
    if (['.xbm', '.xpm', '.ppm', '.pgm', '.pbm', '.pnm', '.pcx', '.tga', '.psd'].contains(ext)) {
      return true;
    }
    
    return false;
  }

  /// Get browser compatibility warning for file type
  static String? getBrowserCompatibilityWarning(String fileExtension) {
    final ext = fileExtension.toLowerCase();
    
    if (['.heic', '.heif'].contains(ext)) {
      return 'HEIC/HEIF files may not display in all browsers. Consider using JPEG for better compatibility.';
    }
    
    if (['.raw', '.cr2', '.nef', '.orf', '.sr2', '.arw', '.dng', '.rw2', 
         '.pef', '.srw', '.3fr', '.mef', '.mos', '.mrw', '.raf', '.x3f', 
         '.dcr', '.kdc', '.erf', '.mdc', '.nrw'].contains(ext)) {
      return 'RAW camera files cannot be displayed in browsers. They will be saved but may not show as profile pictures.';
    }
    
    if (['.xbm', '.xpm', '.ppm', '.pgm', '.pbm', '.pnm', '.pcx', '.tga', '.psd'].contains(ext)) {
      return 'Legacy image formats may not display properly in all browsers. Consider using JPEG or PNG.';
    }
    
    return null;
  }
}

class ProcessedImageResult {
  final Uint8List processedBytes;
  final Uint8List originalBytes;
  final bool wasProcessed;
  final String? warning;
  final String? error;
  final String suggestedFormat;

  ProcessedImageResult({
    required this.processedBytes,
    required this.originalBytes,
    required this.wasProcessed,
    required this.suggestedFormat,
    this.warning,
    this.error,
  });

  bool get hasError => error != null;
  bool get hasWarning => warning != null;
}
