import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';
import 'package:http/http.dart' as http;
import 'package:path/path.dart' as path;
import '../models/gridfs_models.dart';
import '../config.dart';
import '../constants/app_constants.dart';
import '../utils/logger.dart';

/// GridFS API Service for barista mobile application
/// Handles image uploads, downloads, and barista-related features
class GridFSApiService {
  static const Map<String, String> _jsonHeaders = {
    'Content-Type': 'application/json',
  };

  // GridFS Buckets
  static const String _inventoryBucket = 'inventory_images';
  static const String _menuBucket = 'menu_images';

  /// Upload image to GridFS
  static Future<ImageUploadResponse> uploadImage({
    required String filePath,
    required String bucket,
    String? filename,
    Map<String, dynamic>? metadata,
  }) async {
    try {
      Logger.api('Uploading image to GridFS bucket: $bucket', 'GRIDFS');
      
      final file = File(filePath);
      if (!await file.exists()) {
        return ImageUploadResponse(
          success: false,
          error: 'File does not exist: $filePath',
        );
      }

      final apiBaseUrl = await Config.apiBaseUrl;
      final uploadUrl = '$apiBaseUrl/gridfs/upload';
      
      final request = http.MultipartRequest('POST', Uri.parse(uploadUrl));
      
      // Add file
      final fileStream = http.ByteStream(file.openRead());
      final fileLength = await file.length();
      final multipartFile = http.MultipartFile(
        'image',
        fileStream,
        fileLength,
        filename: filename ?? path.basename(filePath),
      );
      request.files.add(multipartFile);
      
      // Add form fields
      request.fields['bucket'] = bucket;
      if (metadata != null) {
        request.fields['metadata'] = jsonEncode(metadata);
      }
      
      // Add authorization header if available
      // Note: You'll need to implement token management
      // request.headers['Authorization'] = 'Bearer $token';

      final streamedResponse = await request.send().timeout(AppConstants.apiTimeout);
      final response = await http.Response.fromStream(streamedResponse);
      
      Logger.api('Image upload response status: ${response.statusCode}', 'GRIDFS');
      Logger.api('Image upload response body: ${response.body}', 'GRIDFS');

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return ImageUploadResponse.fromJson(data);
      } else {
        final errorData = jsonDecode(response.body);
        return ImageUploadResponse(
          success: false,
          error: errorData['error'] ?? 'Upload failed',
        );
      }
    } catch (e) {
      Logger.exception('Image upload exception', e, 'GRIDFS');
      return ImageUploadResponse(
        success: false,
        error: 'Upload failed: ${e.toString()}',
      );
    }
  }

  /// Get image URL from GridFS
  static String getImageUrl(String imageId, String bucket) {
    return '${Config.apiBaseUrl}/gridfs/images/$bucket/$imageId';
  }

  /// Download image from GridFS
  static Future<Uint8List?> downloadImage(String imageId, String bucket) async {
    try {
      Logger.api('Downloading image from GridFS: $imageId', 'GRIDFS');
      
      final apiBaseUrl = await Config.apiBaseUrl;
      final imageUrl = '$apiBaseUrl/gridfs/images/$bucket/$imageId';
      
      final response = await http.get(
        Uri.parse(imageUrl),
      ).timeout(AppConstants.apiTimeout);
      
      if (response.statusCode == 200) {
        return response.bodyBytes;
      } else {
        Logger.error('Failed to download image: ${response.statusCode}', 'GRIDFS');
        return null;
      }
    } catch (e) {
      Logger.exception('Image download exception', e, 'GRIDFS');
      return null;
    }
  }

  /// Delete image from GridFS
  static Future<bool> deleteImage(String imageId, String bucket) async {
    try {
      Logger.api('Deleting image from GridFS: $imageId', 'GRIDFS');
      
      final apiBaseUrl = await Config.apiBaseUrl;
      final deleteUrl = '$apiBaseUrl/gridfs/images/$bucket/$imageId';
      
      final response = await http.delete(
        Uri.parse(deleteUrl),
        headers: _jsonHeaders,
      ).timeout(AppConstants.apiTimeout);
      
      if (response.statusCode == 200) {
        Logger.success('Image deleted successfully', 'GRIDFS');
        return true;
      } else {
        Logger.error('Failed to delete image: ${response.statusCode}', 'GRIDFS');
        return false;
      }
    } catch (e) {
      Logger.exception('Image delete exception', e, 'GRIDFS');
      return false;
    }
  }

  // ========== INVENTORY MANAGEMENT ==========

  /// Get all inventory items
  static Future<List<InventoryItem>> getInventoryItems() async {
    try {
      Logger.api('Fetching inventory items', 'INVENTORY');
      
      final apiBaseUrl = await Config.apiBaseUrl;
      final response = await http.get(
        Uri.parse('$apiBaseUrl/inventory'),
        headers: _jsonHeaders,
      ).timeout(AppConstants.apiTimeout);
      
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final items = (data['items'] as List)
            .map((item) => InventoryItem.fromJson(item))
            .toList();
        
        Logger.success('Fetched ${items.length} inventory items', 'INVENTORY');
        return items;
      } else {
        Logger.error('Failed to fetch inventory items: ${response.statusCode}', 'INVENTORY');
        return [];
      }
    } catch (e) {
      Logger.exception('Inventory fetch exception', e, 'INVENTORY');
      return [];
    }
  }

  /// Get inventory item by ID
  static Future<InventoryItem?> getInventoryItem(String id) async {
    try {
      Logger.api('Fetching inventory item: $id', 'INVENTORY');
      
      final apiBaseUrl = await Config.apiBaseUrl;
      final response = await http.get(
        Uri.parse('$apiBaseUrl/inventory/$id'),
        headers: _jsonHeaders,
      ).timeout(AppConstants.apiTimeout);
      
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return InventoryItem.fromJson(data['item']);
      } else {
        Logger.error('Failed to fetch inventory item: ${response.statusCode}', 'INVENTORY');
        return null;
      }
    } catch (e) {
      Logger.exception('Inventory item fetch exception', e, 'INVENTORY');
      return null;
    }
  }

  /// Create new inventory item
  static Future<InventoryItem?> createInventoryItem({
    required String name,
    required String description,
    required String category,
    required String unit,
    required double currentStock,
    required double minimumStock,
    required double maximumStock,
    required double unitPrice,
    required String supplier,
    String? imagePath,
    Map<String, dynamic>? metadata,
  }) async {
    try {
      Logger.api('Creating inventory item: $name', 'INVENTORY');
      
      String? imageId;
      String? imageUrl;
      
      // Upload image if provided
      if (imagePath != null) {
        final uploadResponse = await uploadImage(
          filePath: imagePath,
          bucket: _inventoryBucket,
          metadata: {
            'type': 'inventory',
            'itemName': name,
            'category': category,
            ...?metadata,
          },
        );
        
        if (uploadResponse.success) {
          imageId = uploadResponse.imageId;
          imageUrl = uploadResponse.imageUrl;
        } else {
          Logger.warning('Image upload failed: ${uploadResponse.error}', 'INVENTORY');
        }
      }
      
      final apiBaseUrl = await Config.apiBaseUrl;
      final response = await http.post(
        Uri.parse('$apiBaseUrl/inventory'),
        headers: _jsonHeaders,
        body: jsonEncode({
          'name': name,
          'description': description,
          'category': category,
          'unit': unit,
          'currentStock': currentStock,
          'minimumStock': minimumStock,
          'maximumStock': maximumStock,
          'unitPrice': unitPrice,
          'supplier': supplier,
          'imageId': imageId,
          'imageUrl': imageUrl,
          'metadata': metadata ?? {},
        }),
      ).timeout(AppConstants.apiTimeout);
      
      if (response.statusCode == 201) {
        final data = jsonDecode(response.body);
        Logger.success('Inventory item created successfully', 'INVENTORY');
        return InventoryItem.fromJson(data['item']);
      } else {
        final errorData = jsonDecode(response.body);
        Logger.error('Failed to create inventory item: ${errorData['error']}', 'INVENTORY');
        return null;
      }
    } catch (e) {
      Logger.exception('Inventory item creation exception', e, 'INVENTORY');
      return null;
    }
  }

  /// Update inventory item
  static Future<InventoryItem?> updateInventoryItem({
    required String id,
    String? name,
    String? description,
    String? category,
    String? unit,
    double? currentStock,
    double? minimumStock,
    double? maximumStock,
    double? unitPrice,
    String? supplier,
    String? imagePath,
    Map<String, dynamic>? metadata,
  }) async {
    try {
      Logger.api('Updating inventory item: $id', 'INVENTORY');
      
      String? imageId;
      String? imageUrl;
      
      // Upload new image if provided
      if (imagePath != null) {
        final uploadResponse = await uploadImage(
          filePath: imagePath,
          bucket: _inventoryBucket,
          metadata: {
            'type': 'inventory',
            'itemId': id,
            ...?metadata,
          },
        );
        
        if (uploadResponse.success) {
          imageId = uploadResponse.imageId;
          imageUrl = uploadResponse.imageUrl;
        } else {
          Logger.warning('Image upload failed: ${uploadResponse.error}', 'INVENTORY');
        }
      }
      
      final apiBaseUrl = await Config.apiBaseUrl;
      final response = await http.put(
        Uri.parse('$apiBaseUrl/inventory/$id'),
        headers: _jsonHeaders,
        body: jsonEncode({
          if (name != null) 'name': name,
          if (description != null) 'description': description,
          if (category != null) 'category': category,
          if (unit != null) 'unit': unit,
          if (currentStock != null) 'currentStock': currentStock,
          if (minimumStock != null) 'minimumStock': minimumStock,
          if (maximumStock != null) 'maximumStock': maximumStock,
          if (unitPrice != null) 'unitPrice': unitPrice,
          if (supplier != null) 'supplier': supplier,
          if (imageId != null) 'imageId': imageId,
          if (imageUrl != null) 'imageUrl': imageUrl,
          if (metadata != null) 'metadata': metadata,
        }),
      ).timeout(AppConstants.apiTimeout);
      
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        Logger.success('Inventory item updated successfully', 'INVENTORY');
        return InventoryItem.fromJson(data['item']);
      } else {
        final errorData = jsonDecode(response.body);
        Logger.error('Failed to update inventory item: ${errorData['error']}', 'INVENTORY');
        return null;
      }
    } catch (e) {
      Logger.exception('Inventory item update exception', e, 'INVENTORY');
      return null;
    }
  }

  /// Delete inventory item
  static Future<bool> deleteInventoryItem(String id) async {
    try {
      Logger.api('Deleting inventory item: $id', 'INVENTORY');
      
      final apiBaseUrl = await Config.apiBaseUrl;
      final response = await http.delete(
        Uri.parse('$apiBaseUrl/inventory/$id'),
        headers: _jsonHeaders,
      ).timeout(AppConstants.apiTimeout);
      
      if (response.statusCode == 200) {
        Logger.success('Inventory item deleted successfully', 'INVENTORY');
        return true;
      } else {
        Logger.error('Failed to delete inventory item: ${response.statusCode}', 'INVENTORY');
        return false;
      }
    } catch (e) {
      Logger.exception('Inventory item deletion exception', e, 'INVENTORY');
      return false;
    }
  }

  /// Add stock movement
  static Future<bool> addStockMovement({
    required String inventoryItemId,
    required String type,
    required double quantity,
    required String reason,
    required String adminId,
    required String adminName,
    Map<String, dynamic>? metadata,
  }) async {
    try {
      Logger.api('Adding stock movement for item: $inventoryItemId', 'INVENTORY');
      
      final apiBaseUrl = await Config.apiBaseUrl;
      final response = await http.post(
        Uri.parse('$apiBaseUrl/inventory/$inventoryItemId/stock-movement'),
        headers: _jsonHeaders,
        body: jsonEncode({
          'type': type,
          'quantity': quantity,
          'reason': reason,
          'adminId': adminId,
          'adminName': adminName,
          'metadata': metadata ?? {},
        }),
      ).timeout(AppConstants.apiTimeout);
      
      if (response.statusCode == 201) {
        Logger.success('Stock movement added successfully', 'INVENTORY');
        return true;
      } else {
        final errorData = jsonDecode(response.body);
        Logger.error('Failed to add stock movement: ${errorData['error']}', 'INVENTORY');
        return false;
      }
    } catch (e) {
      Logger.exception('Stock movement addition exception', e, 'INVENTORY');
      return false;
    }
  }

  /// Get stock movements for an item
  static Future<List<StockMovement>> getStockMovements(String inventoryItemId) async {
    try {
      Logger.api('Fetching stock movements for item: $inventoryItemId', 'INVENTORY');
      
      final apiBaseUrl = await Config.apiBaseUrl;
      final response = await http.get(
        Uri.parse('$apiBaseUrl/inventory/$inventoryItemId/stock-movements'),
        headers: _jsonHeaders,
      ).timeout(AppConstants.apiTimeout);
      
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final movements = (data['movements'] as List)
            .map((movement) => StockMovement.fromJson(movement))
            .toList();
        
        Logger.success('Fetched ${movements.length} stock movements', 'INVENTORY');
        return movements;
      } else {
        Logger.error('Failed to fetch stock movements: ${response.statusCode}', 'INVENTORY');
        return [];
      }
    } catch (e) {
      Logger.exception('Stock movements fetch exception', e, 'INVENTORY');
      return [];
    }
  }

  // ========== MENU MANAGEMENT ==========

  /// Get all menu items
  static Future<List<MenuItem>> getMenuItems() async {
    try {
      Logger.api('Fetching menu items', 'MENU');
      
      final apiBaseUrl = await Config.apiBaseUrl;
      final response = await http.get(
        Uri.parse('$apiBaseUrl/menu'),
        headers: _jsonHeaders,
      ).timeout(AppConstants.apiTimeout);
      
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final items = (data['items'] as List)
            .map((item) => MenuItem.fromJson(item))
            .toList();
        
        Logger.success('Fetched ${items.length} menu items', 'MENU');
        return items;
      } else {
        Logger.error('Failed to fetch menu items: ${response.statusCode}', 'MENU');
        return [];
      }
    } catch (e) {
      Logger.exception('Menu items fetch exception', e, 'MENU');
      return [];
    }
  }

  /// Create new menu item
  static Future<MenuItem?> createMenuItem({
    required String name,
    required String description,
    required String category,
    required double price,
    List<String>? ingredients,
    String? imagePath,
    Map<String, dynamic>? nutritionInfo,
    Map<String, dynamic>? metadata,
  }) async {
    try {
      Logger.api('Creating menu item: $name', 'MENU');
      
      String? imageId;
      String? imageUrl;
      
      // Upload image if provided
      if (imagePath != null) {
        final uploadResponse = await uploadImage(
          filePath: imagePath,
          bucket: _menuBucket,
          metadata: {
            'type': 'menu',
            'itemName': name,
            'category': category,
            ...?metadata,
          },
        );
        
        if (uploadResponse.success) {
          imageId = uploadResponse.imageId;
          imageUrl = uploadResponse.imageUrl;
        } else {
          Logger.warning('Image upload failed: ${uploadResponse.error}', 'MENU');
        }
      }
      
      final apiBaseUrl = await Config.apiBaseUrl;
      final response = await http.post(
        Uri.parse('$apiBaseUrl/menu'),
        headers: _jsonHeaders,
        body: jsonEncode({
          'name': name,
          'description': description,
          'category': category,
          'price': price,
          'ingredients': ingredients ?? [],
          'imageId': imageId,
          'imageUrl': imageUrl,
          'nutritionInfo': nutritionInfo ?? {},
          'metadata': metadata ?? {},
        }),
      ).timeout(AppConstants.apiTimeout);
      
      if (response.statusCode == 201) {
        final data = jsonDecode(response.body);
        Logger.success('Menu item created successfully', 'MENU');
        return MenuItem.fromJson(data['item']);
      } else {
        final errorData = jsonDecode(response.body);
        Logger.error('Failed to create menu item: ${errorData['error']}', 'MENU');
        return null;
      }
    } catch (e) {
      Logger.exception('Menu item creation exception', e, 'MENU');
      return null;
    }
  }

  /// Update menu item
  static Future<MenuItem?> updateMenuItem({
    required String id,
    String? name,
    String? description,
    String? category,
    double? price,
    bool? isAvailable,
    List<String>? ingredients,
    String? imagePath,
    Map<String, dynamic>? nutritionInfo,
    Map<String, dynamic>? metadata,
  }) async {
    try {
      Logger.api('Updating menu item: $id', 'MENU');
      
      String? imageId;
      String? imageUrl;
      
      // Upload new image if provided
      if (imagePath != null) {
        final uploadResponse = await uploadImage(
          filePath: imagePath,
          bucket: _menuBucket,
          metadata: {
            'type': 'menu',
            'itemId': id,
            ...?metadata,
          },
        );
        
        if (uploadResponse.success) {
          imageId = uploadResponse.imageId;
          imageUrl = uploadResponse.imageUrl;
        } else {
          Logger.warning('Image upload failed: ${uploadResponse.error}', 'MENU');
        }
      }
      
      final apiBaseUrl = await Config.apiBaseUrl;
      final response = await http.put(
        Uri.parse('$apiBaseUrl/menu/$id'),
        headers: _jsonHeaders,
        body: jsonEncode({
          if (name != null) 'name': name,
          if (description != null) 'description': description,
          if (category != null) 'category': category,
          if (price != null) 'price': price,
          if (isAvailable != null) 'isAvailable': isAvailable,
          if (ingredients != null) 'ingredients': ingredients,
          if (imageId != null) 'imageId': imageId,
          if (imageUrl != null) 'imageUrl': imageUrl,
          if (nutritionInfo != null) 'nutritionInfo': nutritionInfo,
          if (metadata != null) 'metadata': metadata,
        }),
      ).timeout(AppConstants.apiTimeout);
      
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        Logger.success('Menu item updated successfully', 'MENU');
        return MenuItem.fromJson(data['item']);
      } else {
        final errorData = jsonDecode(response.body);
        Logger.error('Failed to update menu item: ${errorData['error']}', 'MENU');
        return null;
      }
    } catch (e) {
      Logger.exception('Menu item update exception', e, 'MENU');
      return null;
    }
  }

  /// Delete menu item
  static Future<bool> deleteMenuItem(String id) async {
    try {
      Logger.api('Deleting menu item: $id', 'MENU');
      
      final apiBaseUrl = await Config.apiBaseUrl;
      final response = await http.delete(
        Uri.parse('$apiBaseUrl/menu/$id'),
        headers: _jsonHeaders,
      ).timeout(AppConstants.apiTimeout);
      
      if (response.statusCode == 200) {
        Logger.success('Menu item deleted successfully', 'MENU');
        return true;
      } else {
        Logger.error('Failed to delete menu item: ${response.statusCode}', 'MENU');
        return false;
      }
    } catch (e) {
      Logger.exception('Menu item deletion exception', e, 'MENU');
      return false;
    }
  }

  // ========== UTILITY METHODS ==========

  /// Get inventory dashboard data
  static Future<Map<String, dynamic>?> getInventoryDashboard() async {
    try {
      Logger.api('Fetching inventory dashboard', 'INVENTORY');
      
      final apiBaseUrl = await Config.apiBaseUrl;
      final response = await http.get(
        Uri.parse('$apiBaseUrl/inventory/dashboard'),
        headers: _jsonHeaders,
      ).timeout(AppConstants.apiTimeout);
      
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        Logger.success('Fetched inventory dashboard data', 'INVENTORY');
        return data;
      } else {
        Logger.error('Failed to fetch inventory dashboard: ${response.statusCode}', 'INVENTORY');
        return null;
      }
    } catch (e) {
      Logger.exception('Inventory dashboard fetch exception', e, 'INVENTORY');
      return null;
    }
  }

  /// Get low stock items
  static Future<List<InventoryItem>> getLowStockItems() async {
    try {
      Logger.api('Fetching low stock items', 'INVENTORY');
      
      final apiBaseUrl = await Config.apiBaseUrl;
      final response = await http.get(
        Uri.parse('$apiBaseUrl/inventory/low-stock'),
        headers: _jsonHeaders,
      ).timeout(AppConstants.apiTimeout);
      
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final items = (data['items'] as List)
            .map((item) => InventoryItem.fromJson(item))
            .toList();
        
        Logger.success('Fetched ${items.length} low stock items', 'INVENTORY');
        return items;
      } else {
        Logger.error('Failed to fetch low stock items: ${response.statusCode}', 'INVENTORY');
        return [];
      }
    } catch (e) {
      Logger.exception('Low stock items fetch exception', e, 'INVENTORY');
      return [];
    }
  }
}
