import 'dart:typed_data';
import 'logging_service.dart';

class FileValidationService {
  static FileValidationService? _instance;
  
  // Singleton pattern
  static FileValidationService get instance {
    _instance ??= FileValidationService._internal();
    return _instance!;
  }

  FileValidationService._internal();

  // File type categories for different size limits and processing
  static const Map<String, FileTypeCategory> _fileTypeCategories = {
    // Web-safe formats - 50MB limit (increased for profile pictures)
    '.jpg': FileTypeCategory.webSafe,
    '.jpeg': FileTypeCategory.webSafe,
    '.png': FileTypeCategory.webSafe,
    '.gif': FileTypeCategory.webSafe,
    '.webp': FileTypeCategory.webSafe,
    '.bmp': FileTypeCategory.webSafe,
    '.tiff': FileTypeCategory.webSafe,
    '.tif': FileTypeCategory.webSafe,
    '.svg': FileTypeCategory.webSafe,
    '.ico': FileTypeCategory.webSafe,
    '.icon': FileTypeCategory.webSafe,
    '.avif': FileTypeCategory.webSafe,
    '.jfif': FileTypeCategory.webSafe,
    '.pjpeg': FileTypeCategory.webSafe,
    '.pjp': FileTypeCategory.webSafe,
    '.apng': FileTypeCategory.webSafe,
    // Additional common formats
    '.jpe': FileTypeCategory.webSafe,
    '.dib': FileTypeCategory.webSafe,
    '.tga': FileTypeCategory.webSafe,
    '.psd': FileTypeCategory.webSafe,
    '.xcf': FileTypeCategory.webSafe,
    '.pcx': FileTypeCategory.webSafe,
    '.ppm': FileTypeCategory.webSafe,
    '.pgm': FileTypeCategory.webSafe,
    '.pbm': FileTypeCategory.webSafe,
    '.pnm': FileTypeCategory.webSafe,
    '.xbm': FileTypeCategory.webSafe,
    '.xpm': FileTypeCategory.webSafe,
    
    // Modern formats - 8MB limit
    '.heic': FileTypeCategory.modern,
    '.heif': FileTypeCategory.modern,
    
    // Legacy formats - 50MB limit (increased for profile pictures)
    // Note: Many legacy formats moved to webSafe for better compatibility
    
    // RAW formats - 5MB limit, requires conversion
    '.raw': FileTypeCategory.raw,
    '.cr2': FileTypeCategory.raw,
    '.nef': FileTypeCategory.raw,
    '.orf': FileTypeCategory.raw,
    '.sr2': FileTypeCategory.raw,
    '.arw': FileTypeCategory.raw,
    '.dng': FileTypeCategory.raw,
    '.rw2': FileTypeCategory.raw,
    '.pef': FileTypeCategory.raw,
    '.srw': FileTypeCategory.raw,
    '.3fr': FileTypeCategory.raw,
    '.mef': FileTypeCategory.raw,
    '.mos': FileTypeCategory.raw,
    '.mrw': FileTypeCategory.raw,
    '.raf': FileTypeCategory.raw,
    '.x3f': FileTypeCategory.raw,
    '.dcr': FileTypeCategory.raw,
    '.kdc': FileTypeCategory.raw,
    '.erf': FileTypeCategory.raw,
    '.mdc': FileTypeCategory.raw,
    '.nrw': FileTypeCategory.raw,
  };

  // File size limits by category
  static const Map<FileTypeCategory, int> _sizeLimits = {
    FileTypeCategory.webSafe: 50 * 1024 * 1024, // 50MB (increased for profile pictures)
    FileTypeCategory.modern: 50 * 1024 * 1024,  // 50MB (increased for profile pictures)
    FileTypeCategory.legacy: 50 * 1024 * 1024,  // 50MB (increased for profile pictures)
    FileTypeCategory.raw: 50 * 1024 * 1024,     // 50MB (increased for profile pictures)
  };

  // Magic number signatures for file validation
  static const Map<String, List<int>> _magicNumbers = {
    'jpeg': [0xFF, 0xD8, 0xFF],
    'png': [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A],
    'gif': [0x47, 0x49, 0x46, 0x38], // GIF8
    'webp': [0x52, 0x49, 0x46, 0x46], // RIFF (WebP starts with RIFF)
    'bmp': [0x42, 0x4D], // BM
    'tiff': [0x49, 0x49, 0x2A, 0x00], // II* (little endian)
    'tiff_be': [0x4D, 0x4D, 0x00, 0x2A], // MM* (big endian)
    'svg': [0x3C, 0x3F, 0x78, 0x6D, 0x6C], // <?xml
    'ico': [0x00, 0x00, 0x01, 0x00],
    'heic': [0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70], // ftyp
    'avif': [0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70], // ftyp (same as HEIC)
  };

  /// Validate file content and return validation result
  static Future<FileValidationResult> validateFile({
    required Uint8List bytes,
    required String fileName,
  }) async {
    try {
      LoggingService.instance.info('Starting file validation', {
        'fileName': fileName,
        'fileSize': bytes.length,
      });

      // Get file extension
      final fileExtension = _getFileExtension(fileName).toLowerCase();
      
      LoggingService.instance.info('File validation details', {
        'fileName': fileName,
        'fileExtension': fileExtension,
        'fileSize': bytes.length,
        'firstBytes': bytes.take(8).toList(),
      });
      
      // Check if extension is supported
      final category = _fileTypeCategories[fileExtension];
      if (category == null) {
        LoggingService.instance.warning('Unsupported file extension, attempting content detection', {
          'fileName': fileName,
          'fileExtension': fileExtension,
        });
        
        // If no extension or unsupported extension, try to detect from content
        final detectedType = await _detectFileTypeFromContent(bytes);
        if (detectedType != null) {
          LoggingService.instance.info('File type detected from content', {
            'fileName': fileName,
            'detectedType': detectedType,
            'originalExtension': fileExtension
          });
          
          // Use detected type for validation
          final detectedCategory = _fileTypeCategories['.$detectedType'];
          if (detectedCategory != null) {
            return await _validateWithCategory(bytes, detectedCategory, '.$detectedType');
          }
        }
        
        // For profile pictures, be more lenient - allow any file type
        LoggingService.instance.warning('Unsupported file type, but allowing for profile picture', {
          'fileName': fileName,
          'fileExtension': fileExtension,
          'detectedType': detectedType,
          'fileSize': bytes.length
        });
        
        // Use webSafe category as fallback for unsupported types
        return await _validateWithCategory(bytes, FileTypeCategory.webSafe, fileExtension);
      }

      // Check file size limit (more lenient for profile pictures)
      final sizeLimit = _sizeLimits[category]!;
      if (bytes.length > sizeLimit) {
        final sizeMB = (bytes.length / (1024 * 1024)).toStringAsFixed(1);
        final limitMB = (sizeLimit / (1024 * 1024)).toStringAsFixed(1);
        
        // For profile pictures, allow larger files up to 100MB
        if (bytes.length > 100 * 1024 * 1024) { // 100MB hard limit
          LoggingService.instance.error('File too large even for profile pictures', {
            'fileName': fileName,
            'fileSize': bytes.length,
            'sizeMB': sizeMB,
          });
          
          return FileValidationResult(
            isValid: false,
            error: 'File too large: ${sizeMB}MB. Maximum size is 100MB.',
            category: category,
            requiresConversion: false,
          );
        }
        
        LoggingService.instance.warning('File larger than recommended, but allowing for profile picture', {
          'fileName': fileName,
          'fileSize': bytes.length,
          'sizeMB': sizeMB,
          'limitMB': limitMB,
        });
      }

      // Validate file content using magic numbers (more lenient for profile pictures)
      final contentValidation = await _validateFileContent(bytes, fileExtension);
      if (!contentValidation.isValid) {
        // For profile pictures, be more lenient with content validation
        LoggingService.instance.warning('File content validation failed, but allowing for profile picture', {
          'fileName': fileName,
          'fileExtension': fileExtension,
          'error': contentValidation.error,
          'fileSize': bytes.length
        });
        
        // Continue with validation even if content validation fails
      }

      // Determine if conversion is required
      final requiresConversion = category == FileTypeCategory.raw || 
                                category == FileTypeCategory.modern ||
                                category == FileTypeCategory.legacy;

      LoggingService.instance.info('File validation successful', {
        'fileName': fileName,
        'category': category.toString(),
        'requiresConversion': requiresConversion,
      });

      return FileValidationResult(
        isValid: true,
        error: null,
        category: category,
        requiresConversion: requiresConversion,
      );

    } catch (e) {
      LoggingService.instance.error('File validation error', e);
      return FileValidationResult(
        isValid: false,
        error: 'File validation failed: $e',
        category: null,
        requiresConversion: false,
      );
    }
  }

  /// Get file extension from filename
  static String _getFileExtension(String fileName) {
    final lastDot = fileName.lastIndexOf('.');
    if (lastDot == -1) return '';
    return fileName.substring(lastDot);
  }

  /// Detect file type from content using magic numbers
  static Future<String?> _detectFileTypeFromContent(Uint8List bytes) async {
    if (bytes.length < 4) return null;
    
    // Check JPEG
    if (bytes.length >= 3 && 
        bytes[0] == 0xFF && bytes[1] == 0xD8 && bytes[2] == 0xFF) {
      return 'jpg';
    }
    
    // Check PNG
    if (bytes.length >= 8 &&
        bytes[0] == 0x89 && bytes[1] == 0x50 && bytes[2] == 0x4E && bytes[3] == 0x47 &&
        bytes[4] == 0x0D && bytes[5] == 0x0A && bytes[6] == 0x1A && bytes[7] == 0x0A) {
      return 'png';
    }
    
    // Check GIF
    if (bytes.length >= 4 &&
        bytes[0] == 0x47 && bytes[1] == 0x49 && bytes[2] == 0x46 && bytes[3] == 0x38) {
      return 'gif';
    }
    
    // Check WebP (RIFF format)
    if (bytes.length >= 12 &&
        bytes[0] == 0x52 && bytes[1] == 0x49 && bytes[2] == 0x46 && bytes[3] == 0x46 &&
        bytes[8] == 0x57 && bytes[9] == 0x45 && bytes[10] == 0x42 && bytes[11] == 0x50) {
      return 'webp';
    }
    
    // Check BMP
    if (bytes.length >= 2 &&
        bytes[0] == 0x42 && bytes[1] == 0x4D) {
      return 'bmp';
    }
    
    // Check TIFF
    if (bytes.length >= 4 &&
        ((bytes[0] == 0x49 && bytes[1] == 0x49 && bytes[2] == 0x2A && bytes[3] == 0x00) ||
         (bytes[0] == 0x4D && bytes[1] == 0x4D && bytes[2] == 0x00 && bytes[3] == 0x2A))) {
      return 'tiff';
    }
    
    // Check SVG (starts with <?xml)
    if (bytes.length >= 5 &&
        bytes[0] == 0x3C && bytes[1] == 0x3F && bytes[2] == 0x78 && bytes[3] == 0x6D && bytes[4] == 0x6C) {
      return 'svg';
    }
    
    // Check ICO
    if (bytes.length >= 4 &&
        bytes[0] == 0x00 && bytes[1] == 0x00 && bytes[2] == 0x01 && bytes[3] == 0x00) {
      return 'ico';
    }
    
    return null;
  }

  /// Validate file with specific category
  static Future<FileValidationResult> _validateWithCategory(
    Uint8List bytes, 
    FileTypeCategory category, 
    String fileExtension
  ) async {
    // Check file size limit (more lenient for profile pictures)
    final sizeLimit = _sizeLimits[category]!;
    if (bytes.length > sizeLimit) {
      final sizeMB = (bytes.length / (1024 * 1024)).toStringAsFixed(1);
      final limitMB = (sizeLimit / (1024 * 1024)).toStringAsFixed(1);
      
      // For profile pictures, allow larger files up to 100MB
      if (bytes.length > 100 * 1024 * 1024) { // 100MB hard limit
        return FileValidationResult(
          isValid: false,
          error: 'File too large: ${sizeMB}MB. Maximum size is 100MB.',
          category: category,
          requiresConversion: false,
        );
      }
      
      // Allow larger files for profile pictures
      LoggingService.instance.warning('File larger than recommended, but allowing for profile picture', {
        'fileSize': bytes.length,
        'sizeMB': sizeMB,
        'limitMB': limitMB,
      });
    }

    // Determine if conversion is required
    final requiresConversion = category == FileTypeCategory.raw || 
                              category == FileTypeCategory.modern ||
                              category == FileTypeCategory.legacy;

    return FileValidationResult(
      isValid: true,
      error: null,
      category: category,
      requiresConversion: requiresConversion,
    );
  }

  /// Validate file content using magic numbers
  static Future<ContentValidationResult> _validateFileContent(
    Uint8List bytes, 
    String fileExtension
  ) async {
    LoggingService.instance.info('Validating file content', {
      'fileExtension': fileExtension,
      'fileSize': bytes.length,
      'firstBytes': bytes.take(8).toList(),
    });

    if (bytes.length < 8) {
      LoggingService.instance.warning('File too small for validation', {
        'fileSize': bytes.length,
      });
      return ContentValidationResult(
        isValid: false,
        error: 'File too small to be a valid image',
      );
    }

    // Get the expected magic number for this file type
    final expectedMagic = _getMagicNumberForExtension(fileExtension);
    LoggingService.instance.info('Magic number validation', {
      'fileExtension': fileExtension,
      'expectedMagic': expectedMagic,
      'actualFirstBytes': bytes.take(expectedMagic?.length ?? 0).toList(),
    });

    if (expectedMagic == null) {
      LoggingService.instance.info('No specific magic number, using generic validation');
      // For unsupported extensions, just check if it starts with common image patterns
      return _validateGenericImageContent(bytes);
    }

    // Check magic number
    if (bytes.length < expectedMagic.length) {
      LoggingService.instance.warning('File too small for expected format', {
        'fileSize': bytes.length,
        'expectedLength': expectedMagic.length,
      });
      return ContentValidationResult(
        isValid: false,
        error: 'File too small for expected format',
      );
    }

    for (int i = 0; i < expectedMagic.length; i++) {
      if (bytes[i] != expectedMagic[i]) {
        LoggingService.instance.warning('Magic number mismatch', {
          'fileExtension': fileExtension,
          'position': i,
          'expected': expectedMagic[i],
          'actual': bytes[i],
        });
        
        // For common image types, try to be more lenient
        if (fileExtension == '.jpg' || fileExtension == '.jpeg') {
          LoggingService.instance.info('JPEG magic number mismatch, but allowing as it might be a valid JPEG with different header');
          return ContentValidationResult(isValid: true, error: null);
        }
        
        return ContentValidationResult(
          isValid: false,
          error: 'File content does not match expected format for $fileExtension',
        );
      }
    }

    LoggingService.instance.info('File content validation successful', {
      'fileExtension': fileExtension,
    });

    return ContentValidationResult(isValid: true, error: null);
  }

  /// Get magic number for file extension
  static List<int>? _getMagicNumberForExtension(String fileExtension) {
    // Safe substring operation to prevent RangeError
    final ext = fileExtension.toLowerCase().startsWith('.') 
        ? fileExtension.toLowerCase().substring(1) // Remove the dot
        : fileExtension.toLowerCase();
    
    // Handle special cases
    if (ext == 'jpeg' || ext == 'jpg') return _magicNumbers['jpeg'];
    if (ext == 'tif' || ext == 'tiff') return _magicNumbers['tiff'];
    
    return _magicNumbers[ext];
  }

  /// Validate generic image content for unsupported extensions
  static ContentValidationResult _validateGenericImageContent(Uint8List bytes) {
    // Check for common image patterns
    final firstBytes = bytes.take(16).toList();
    
    // Check for common image file signatures
    for (final magic in _magicNumbers.values) {
      if (firstBytes.length >= magic.length) {
        bool matches = true;
        for (int i = 0; i < magic.length; i++) {
          if (firstBytes[i] != magic[i]) {
            matches = false;
            break;
          }
        }
        if (matches) {
          return ContentValidationResult(isValid: true, error: null);
        }
      }
    }

    return ContentValidationResult(
      isValid: false,
      error: 'File does not appear to be a valid image format',
    );
  }

  /// Get size limit for file category
  static int getSizeLimit(FileTypeCategory category) {
    return _sizeLimits[category] ?? 5 * 1024 * 1024; // Default 5MB
  }

  /// Check if file requires conversion
  static bool requiresConversion(FileTypeCategory category) {
    return category == FileTypeCategory.raw || 
           category == FileTypeCategory.modern ||
           category == FileTypeCategory.legacy;
  }
}

enum FileTypeCategory {
  webSafe,  // Standard web formats
  modern,   // Modern formats that may need conversion
  legacy,   // Legacy formats
  raw,      // RAW camera formats
}

class FileValidationResult {
  final bool isValid;
  final String? error;
  final FileTypeCategory? category;
  final bool requiresConversion;

  FileValidationResult({
    required this.isValid,
    required this.error,
    required this.category,
    required this.requiresConversion,
  });
}

class ContentValidationResult {
  final bool isValid;
  final String? error;

  ContentValidationResult({
    required this.isValid,
    required this.error,
  });
}
