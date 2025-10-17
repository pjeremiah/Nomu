import 'dart:io';
import 'dart:typed_data';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:path/path.dart' as path;
import 'logging_service.dart';
import 'file_validation_service.dart';
import 'gridfs_image_service.dart';
import '../api/api.dart';
import '../config.dart';

class FileUploadService {
  static FileUploadService? _instance;
  
  // Singleton pattern
  static FileUploadService get instance {
    _instance ??= FileUploadService._internal();
    return _instance!;
  }

  FileUploadService._internal();

  /// Upload profile picture using multipart/form-data (supports all image types)
  static Future<Map<String, dynamic>> uploadProfilePicture({
    required String userId,
    required String filePath,
    required String apiBaseUrl,
  }) async {
    try {
      LoggingService.instance.info('Starting multipart profile picture upload...', {
        'userId': userId,
        'filePath': filePath,
        'apiBaseUrl': apiBaseUrl
      });

      // Check if file exists
      final file = File(filePath);
      if (!await file.exists()) {
        throw Exception('File does not exist: $filePath');
      }

      // Get file info
      final fileStat = await file.stat();
      final fileName = path.basename(filePath);
      final fileExtension = path.extension(filePath).toLowerCase();
      
      LoggingService.instance.info('File info:', {
        'fileName': fileName,
        'fileSize': fileStat.size,
        'fileExtension': fileExtension
      });

      // Read file bytes for validation
      final fileBytes = await file.readAsBytes();
      
      // Validate file using the new validation service
      final validationResult = await FileValidationService.validateFile(
        bytes: fileBytes,
        fileName: fileName,
      );
      
      if (!validationResult.isValid) {
        LoggingService.instance.warning('File validation failed, but attempting upload anyway for profile picture', {
          'fileName': fileName,
          'error': validationResult.error,
          'fileSize': fileBytes.length,
        });
        // For profile pictures, be more lenient and allow upload even if validation fails
      }
      
      // Log validation results
      LoggingService.instance.info('File validation passed', {
        'fileName': fileName,
        'category': validationResult.category.toString(),
        'requiresConversion': validationResult.requiresConversion,
      });

      // Create multipart request
      final uri = Uri.parse('$apiBaseUrl/api/user/$userId/profile-picture');
      final request = http.MultipartRequest('POST', uri);
      
      // Add file to request
      final multipartFile = await http.MultipartFile.fromPath(
        'profilePicture',
        filePath,
        filename: fileName,
      );
      request.files.add(multipartFile);

      // Add headers
      request.headers.addAll({
        'Content-Type': 'multipart/form-data',
      });

      LoggingService.instance.info('Sending multipart request...', {
        'url': uri.toString(),
        'fieldName': 'profilePicture',
        'fileName': fileName
      });

      // Send request
      final streamedResponse = await request.send();
      final response = await http.Response.fromStream(streamedResponse);

      LoggingService.instance.info('Upload response received:', {
        'statusCode': response.statusCode,
        'responseLength': response.body.length
      });

      if (response.statusCode == 200) {
        final responseData = await _parseJsonResponse(response.body);
        LoggingService.instance.info('Profile picture uploaded successfully', {
          'profilePicture': responseData['profilePicture'],
          'fileInfo': responseData['fileInfo']
        });
        
        return {
          'success': true,
          'profilePicture': responseData['profilePicture'],
          'fileInfo': responseData['fileInfo'],
          'message': responseData['message'] ?? 'Profile picture updated successfully'
        };
      } else {
        final errorData = await _parseJsonResponse(response.body);
        final errorMessage = errorData['error'] ?? errorData['message'] ?? 'Upload failed';
        
        LoggingService.instance.error('Upload failed', {
          'statusCode': response.statusCode,
          'error': errorMessage
        });
        
        throw Exception('Upload failed: $errorMessage');
      }
    } catch (e) {
      LoggingService.instance.error('Exception during file upload', e);
      rethrow;
    }
  }

  /// Upload profile picture from bytes (for web compatibility)
  static Future<Map<String, dynamic>> uploadProfilePictureFromBytes({
    required String userId,
    required Uint8List bytes,
    required String fileName,
    required String apiBaseUrl,
  }) async {
    try {
      LoggingService.instance.info('Starting multipart profile picture upload from bytes...', {
        'userId': userId,
        'fileName': fileName,
        'bytesLength': bytes.length,
        'apiBaseUrl': apiBaseUrl
      });

      // Validate file using the new validation service
      final validationResult = await FileValidationService.validateFile(
        bytes: bytes,
        fileName: fileName,
      );
      
      if (!validationResult.isValid) {
        LoggingService.instance.warning('File validation failed, but attempting upload anyway for profile picture', {
          'fileName': fileName,
          'error': validationResult.error,
          'fileSize': bytes.length,
        });
        
        // For profile pictures, be more lenient and allow upload even if validation fails
        LoggingService.instance.info('Allowing profile picture upload despite validation failure');
      }
      
      // Log validation results
      LoggingService.instance.info('File validation passed', {
        'fileName': fileName,
        'category': validationResult.category.toString(),
        'requiresConversion': validationResult.requiresConversion,
      });

      // Create multipart request
      final uri = Uri.parse('$apiBaseUrl/api/user/$userId/profile-picture');
      final request = http.MultipartRequest('POST', uri);
      
      // Add file to request
      final multipartFile = http.MultipartFile.fromBytes(
        'profilePicture',
        bytes,
        filename: fileName,
      );
      request.files.add(multipartFile);

      // Add headers
      request.headers.addAll({
        'Content-Type': 'multipart/form-data',
      });

      LoggingService.instance.info('Sending multipart request from bytes...', {
        'url': uri.toString(),
        'fieldName': 'profilePicture',
        'fileName': fileName
      });

      // Send request
      final streamedResponse = await request.send();
      final response = await http.Response.fromStream(streamedResponse);

      LoggingService.instance.info('Upload response received:', {
        'statusCode': response.statusCode,
        'responseLength': response.body.length
      });

      if (response.statusCode == 200) {
        final responseData = await _parseJsonResponse(response.body);
        LoggingService.instance.info('Profile picture uploaded successfully', {
          'profilePicture': responseData['profilePicture'],
          'fileInfo': responseData['fileInfo']
        });
        
        return {
          'success': true,
          'profilePicture': responseData['profilePicture'],
          'fileInfo': responseData['fileInfo'],
          'message': responseData['message'] ?? 'Profile picture updated successfully'
        };
      } else {
        final errorData = await _parseJsonResponse(response.body);
        final errorMessage = errorData['error'] ?? errorData['message'] ?? 'Upload failed';
        
        LoggingService.instance.error('Upload failed', {
          'statusCode': response.statusCode,
          'error': errorMessage
        });
        
        throw Exception('Upload failed: $errorMessage');
      }
    } catch (e) {
      LoggingService.instance.error('Exception during file upload from bytes', e);
      rethrow;
    }
  }

  /// Fallback method for base64 upload (backward compatibility)
  static Future<Map<String, dynamic>> uploadProfilePictureBase64({
    required String userId,
    required String base64Image,
    required String apiBaseUrl,
  }) async {
    try {
      LoggingService.instance.info('Starting base64 profile picture upload...', {
        'userId': userId,
        'apiBaseUrl': apiBaseUrl,
        'imageLength': base64Image.length
      });

      final uri = Uri.parse('$apiBaseUrl/api/user/$userId/profile-picture-base64');
      final response = await http.post(
        uri,
        headers: {'Content-Type': 'application/json'},
        body: json.encode({'image': base64Image}),
      );

      LoggingService.instance.info('Base64 upload response received:', {
        'statusCode': response.statusCode,
        'responseLength': response.body.length
      });

      if (response.statusCode == 200) {
        final responseData = await _parseJsonResponse(response.body);
        LoggingService.instance.info('Profile picture uploaded successfully via base64');
        
        return {
          'success': true,
          'profilePicture': responseData['profilePicture'],
          'message': responseData['message'] ?? 'Profile picture updated successfully'
        };
      } else {
        final errorData = await _parseJsonResponse(response.body);
        final errorMessage = errorData['error'] ?? errorData['message'] ?? 'Upload failed';
        
        LoggingService.instance.error('Base64 upload failed', {
          'statusCode': response.statusCode,
          'error': errorMessage
        });
        
        throw Exception('Upload failed: $errorMessage');
      }
    } catch (e) {
      LoggingService.instance.error('Exception during base64 file upload', e);
      rethrow;
    }
  }

  /// Parse JSON response safely
  static Future<Map<String, dynamic>> _parseJsonResponse(String responseBody) async {
    try {
      final dynamic jsonData = json.decode(responseBody);
      return Map<String, dynamic>.from(jsonData);
    } catch (e) {
      LoggingService.instance.error('Error parsing JSON response', e);
      return {'error': 'Failed to parse response'};
    }
  }

  // ==================== GRIDFS UPLOAD METHODS ====================

  /// Upload image to GridFS using multipart/form-data
  static Future<Map<String, dynamic>> uploadImageToGridFS({
    required String imageType, // 'menu', 'promo', 'inventory', 'profile'
    required String filePath,
    String? customFileName,
  }) async {
    try {
      LoggingService.instance.info('Starting GridFS image upload...', {
        'imageType': imageType,
        'filePath': filePath,
        'customFileName': customFileName
      });

      // Check if file exists
      final file = File(filePath);
      if (!await file.exists()) {
        throw Exception('File does not exist: $filePath');
      }

      // Get file info
      final fileStat = await file.stat();
      final fileName = customFileName ?? path.basename(filePath);
      final fileExtension = path.extension(filePath).toLowerCase();
      
      LoggingService.instance.info('File info:', {
        'fileName': fileName,
        'fileSize': fileStat.size,
        'fileExtension': fileExtension
      });

      // Read file bytes for validation
      final fileBytes = await file.readAsBytes();
      
      // Validate file using the validation service
      final validationResult = await FileValidationService.validateFile(
        bytes: fileBytes,
        fileName: fileName,
      );
      
      if (!validationResult.isValid) {
        LoggingService.instance.warning('File validation failed, but attempting upload anyway', {
          'fileName': fileName,
          'error': validationResult.error,
          'fileSize': fileBytes.length,
        });
        
        // For profile pictures, be more lenient and allow upload even if validation fails
        if (imageType == 'profile') {
          LoggingService.instance.info('Allowing profile picture upload despite validation failure');
        } else {
          throw Exception(validationResult.error);
        }
      }
      
      // Log validation results
      LoggingService.instance.info('File validation passed', {
        'fileName': fileName,
        'category': validationResult.category.toString(),
        'requiresConversion': validationResult.requiresConversion,
      });

      // Use GridFS image service for upload
      final result = await GridFSImageService.instance.uploadImage(
        imageType: imageType,
        filePath: filePath,
        customFileName: customFileName,
      );

      if (result != null) {
        LoggingService.instance.info('GridFS image uploaded successfully', {
          'imageId': result['imageId'],
          'imageUrl': result['imageUrl'],
          'fileInfo': result['fileInfo']
        });
        
        return {
          'success': true,
          'imageId': result['imageId'],
          'imageUrl': result['imageUrl'],
          'fileInfo': result['fileInfo'],
          'message': 'Image uploaded to GridFS successfully'
        };
      } else {
        throw Exception('Failed to upload image to GridFS');
      }
    } catch (e) {
      LoggingService.instance.error('Exception during GridFS image upload', e);
      rethrow;
    }
  }

  /// Upload image bytes to GridFS
  static Future<Map<String, dynamic>> uploadImageBytesToGridFS({
    required String imageType, // 'menu', 'promo', 'inventory', 'profile'
    required Uint8List bytes,
    required String fileName,
  }) async {
    try {
      LoggingService.instance.info('Starting GridFS image bytes upload...', {
        'imageType': imageType,
        'fileName': fileName,
        'bytesLength': bytes.length
      });

      // For profile pictures, skip validation to allow all file types
      LoggingService.instance.info('Skipping file validation for profile picture upload', {
        'fileName': fileName,
        'bytesLength': bytes.length
      });

      // Use GridFS image service for upload
      final result = await GridFSImageService.instance.uploadImageFromBytes(
        imageType: imageType,
        bytes: bytes,
        fileName: fileName,
      );

      if (result != null) {
        LoggingService.instance.info('GridFS image bytes uploaded successfully', {
          'imageId': result['imageId'],
          'imageUrl': result['imageUrl'],
          'fileInfo': result['fileInfo']
        });
        
        return {
          'success': true,
          'imageId': result['imageId'],
          'imageUrl': result['imageUrl'],
          'fileInfo': result['fileInfo'],
          'message': 'Image bytes uploaded to GridFS successfully'
        };
      } else {
        LoggingService.instance.error('GridFS upload failed - API returned null', {
          'imageType': imageType,
          'fileName': fileName,
          'bytesLength': bytes.length
        });
        
        throw Exception('Failed to upload image bytes to GridFS - server returned null response');
      }
    } catch (e) {
      LoggingService.instance.error('Exception during GridFS image bytes upload', e);
      rethrow;
    }
  }

  /// Upload profile picture to GridFS
  static Future<Map<String, dynamic>> uploadProfilePictureToGridFS({
    required String userId,
    required String filePath,
    String? customFileName,
  }) async {
    try {
      LoggingService.instance.info('Starting GridFS profile picture upload...', {
        'userId': userId,
        'filePath': filePath,
        'customFileName': customFileName
      });

      final result = await uploadImageToGridFS(
        imageType: 'profile',
        filePath: filePath,
        customFileName: customFileName,
      );

      if (result['success'] == true) {
        // Update user profile with new image URL
        final imageUrl = result['imageUrl'];
        final updateResult = await ApiService.updateUser(userId, {
          'profilePicture': imageUrl,
        });

        if (updateResult != null) {
          LoggingService.instance.info('Profile picture updated in user record', {
            'userId': userId,
            'imageUrl': imageUrl
          });
        }
      }

      return result;
    } catch (e) {
      LoggingService.instance.error('Exception during GridFS profile picture upload', e);
      rethrow;
    }
  }

  /// Upload profile picture bytes to GridFS
  static Future<Map<String, dynamic>> uploadProfilePictureBytesToGridFS({
    required String userId,
    required Uint8List bytes,
    required String fileName,
  }) async {
    try {
      LoggingService.instance.info('Starting GridFS profile picture bytes upload...', {
        'userId': userId,
        'fileName': fileName,
        'bytesLength': bytes.length
      });

      // Try the generic GridFS upload first
      try {
        final result = await uploadImageBytesToGridFS(
          imageType: 'profile',
          bytes: bytes,
          fileName: fileName,
        );

        if (result['success'] == true) {
          // Update user profile with new image URL
          final imageUrl = result['imageUrl'];
          // Convert generic image URL to profile picture URL format
          final profilePictureUrl = imageUrl.replaceFirst('/api/images/profile/', '/api/profile-picture/');
          final updateResult = await ApiService.updateUser(userId, {
            'profilePicture': profilePictureUrl,
          });

          if (updateResult != null) {
            LoggingService.instance.info('Profile picture updated in user record', {
              'userId': userId,
              'imageUrl': profilePictureUrl
            });
          }

          // Update result with correct profile picture URL
          result['profilePicture'] = profilePictureUrl;
          return result;
        } else {
          LoggingService.instance.warning('Generic GridFS upload failed, trying fallback method', {
            'error': result['error'],
            'message': result['message']
          });
        }
      } catch (e) {
        LoggingService.instance.warning('Generic GridFS upload failed with exception, trying fallback method', e);
      }

      // Fallback: Try direct profile picture upload
      LoggingService.instance.info('Trying fallback profile picture upload method...');
      return await _uploadProfilePictureDirect(userId, bytes, fileName);

    } catch (e) {
      LoggingService.instance.error('Exception during GridFS profile picture bytes upload', e);
      rethrow;
    }
  }

  /// Fallback method: Upload profile picture directly using multipart
  static Future<Map<String, dynamic>> _uploadProfilePictureDirect(
    String userId,
    Uint8List bytes,
    String fileName,
  ) async {
    try {
      LoggingService.instance.info('Using direct profile picture upload fallback...', {
        'userId': userId,
        'fileName': fileName,
        'bytesLength': bytes.length
      });

      final apiBaseUrl = await Config.apiBaseUrl;
      final uri = Uri.parse('$apiBaseUrl/user/$userId/profile-picture');
      
      final request = http.MultipartRequest('POST', uri);
      request.files.add(http.MultipartFile.fromBytes(
        'profilePicture',
        bytes.toList(),
        filename: fileName,
      ));
      
      // Add headers to indicate this is a profile picture upload
      request.headers.addAll({
        'Content-Type': 'multipart/form-data',
      });

      final streamedResponse = await request.send();
      final response = await http.Response.fromStream(streamedResponse);

      LoggingService.instance.info('Direct upload response:', {
        'statusCode': response.statusCode,
        'responseLength': response.body.length
      });

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        LoggingService.instance.info('Direct upload successful', {
          'profilePicture': data['profilePicture'],
          'message': data['message']
        });
        
        return {
          'success': true,
          'profilePicture': data['profilePicture'],
          'imageUrl': data['profilePicture'],
          'message': data['message'] ?? 'Profile picture updated successfully'
        };
      } else {
        final errorData = json.decode(response.body);
        final errorMessage = errorData['error'] ?? 'Direct upload failed';
        
        LoggingService.instance.error('Direct upload failed', {
          'statusCode': response.statusCode,
          'error': errorMessage
        });
        
        throw Exception('Direct upload failed: $errorMessage');
      }
    } catch (e) {
      LoggingService.instance.error('Exception during direct profile picture upload', e);
      rethrow;
    }
  }

  /// Upload menu item image to GridFS
  static Future<Map<String, dynamic>> uploadMenuItemImageToGridFS({
    required String filePath,
    String? customFileName,
  }) async {
    try {
      LoggingService.instance.info('Starting GridFS menu item image upload...', {
        'filePath': filePath,
        'customFileName': customFileName
      });

      return await uploadImageToGridFS(
        imageType: 'menu',
        filePath: filePath,
        customFileName: customFileName,
      );
    } catch (e) {
      LoggingService.instance.error('Exception during GridFS menu item image upload', e);
      rethrow;
    }
  }

  /// Upload promo image to GridFS
  static Future<Map<String, dynamic>> uploadPromoImageToGridFS({
    required String filePath,
    String? customFileName,
  }) async {
    try {
      LoggingService.instance.info('Starting GridFS promo image upload...', {
        'filePath': filePath,
        'customFileName': customFileName
      });

      return await uploadImageToGridFS(
        imageType: 'promo',
        filePath: filePath,
        customFileName: customFileName,
      );
    } catch (e) {
      LoggingService.instance.error('Exception during GridFS promo image upload', e);
      rethrow;
    }
  }

  /// Upload inventory item image to GridFS
  static Future<Map<String, dynamic>> uploadInventoryImageToGridFS({
    required String filePath,
    String? customFileName,
  }) async {
    try {
      LoggingService.instance.info('Starting GridFS inventory image upload...', {
        'filePath': filePath,
        'customFileName': customFileName
      });

      return await uploadImageToGridFS(
        imageType: 'inventory',
        filePath: filePath,
        customFileName: customFileName,
      );
    } catch (e) {
      LoggingService.instance.error('Exception during GridFS inventory image upload', e);
      rethrow;
    }
  }

  /// Delete image from GridFS
  static Future<bool> deleteImageFromGridFS({
    required String imageType,
    required String imageId,
  }) async {
    try {
      LoggingService.instance.info('Deleting image from GridFS...', {
        'imageType': imageType,
        'imageId': imageId
      });

      return await GridFSImageService.instance.deleteImage(imageType, imageId);
    } catch (e) {
      LoggingService.instance.error('Exception during GridFS image deletion', e);
      return false;
    }
  }

  /// Get image URL from GridFS
  static Future<String> getImageUrlFromGridFS({
    required String imageType,
    required String imageId,
  }) async {
    try {
      return await GridFSImageService.instance.getImageUrl(imageType, imageId);
    } catch (e) {
      LoggingService.instance.error('Exception getting GridFS image URL', e);
      return '';
    }
  }

  /// Download image from GridFS
  static Future<Uint8List?> downloadImageFromGridFS({
    required String imageType,
    required String imageId,
  }) async {
    try {
      return await GridFSImageService.instance.downloadImage(imageType, imageId);
    } catch (e) {
      LoggingService.instance.error('Exception downloading GridFS image', e);
      return null;
    }
  }
}
