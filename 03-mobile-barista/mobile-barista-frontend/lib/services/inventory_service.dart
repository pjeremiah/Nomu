import 'dart:typed_data';
import '../models/gridfs_models.dart';
import '../services/gridfs_api_service.dart';
import '../utils/logger.dart';

/// Inventory Management Service for barista mobile application
/// Handles inventory operations with GridFS image support
class InventoryService {
  static List<InventoryItem> _inventoryItems = [];
  static List<StockMovement> _stockMovements = [];
  static bool _isInitialized = false;

  /// Initialize the inventory service
  static Future<void> initialize() async {
    if (_isInitialized) return;
    
    try {
      Logger.api('Initializing inventory service', 'INVENTORY');
      await refreshInventoryItems();
      _isInitialized = true;
      Logger.success('Inventory service initialized successfully', 'INVENTORY');
    } catch (e) {
      Logger.exception('Failed to initialize inventory service', e, 'INVENTORY');
    }
  }

  /// Refresh inventory items from server
  static Future<void> refreshInventoryItems() async {
    try {
      Logger.api('Refreshing inventory items', 'INVENTORY');
      _inventoryItems = await GridFSApiService.getInventoryItems();
      Logger.success('Refreshed ${_inventoryItems.length} inventory items', 'INVENTORY');
    } catch (e) {
      Logger.exception('Failed to refresh inventory items', e, 'INVENTORY');
    }
  }

  /// Get all inventory items
  static List<InventoryItem> getAllItems() {
    return List.from(_inventoryItems);
  }

  /// Get inventory item by ID
  static InventoryItem? getItemById(String id) {
    try {
      return _inventoryItems.firstWhere((item) => item.id == id);
    } catch (e) {
      return null;
    }
  }

  /// Get items by category
  static List<InventoryItem> getItemsByCategory(String category) {
    return _inventoryItems.where((item) => item.category.toLowerCase() == category.toLowerCase()).toList();
  }

  /// Get low stock items
  static List<InventoryItem> getLowStockItems() {
    return _inventoryItems.where((item) => item.isLowStock).toList();
  }

  /// Get out of stock items
  static List<InventoryItem> getOutOfStockItems() {
    return _inventoryItems.where((item) => item.isOutOfStock).toList();
  }

  /// Get overstocked items
  static List<InventoryItem> getOverstockedItems() {
    return _inventoryItems.where((item) => item.isOverstocked).toList();
  }

  /// Search items by name
  static List<InventoryItem> searchItems(String query) {
    if (query.isEmpty) return _inventoryItems;
    
    final lowercaseQuery = query.toLowerCase();
    return _inventoryItems.where((item) => 
      item.name.toLowerCase().contains(lowercaseQuery) ||
      item.description.toLowerCase().contains(lowercaseQuery) ||
      item.category.toLowerCase().contains(lowercaseQuery) ||
      item.supplier.toLowerCase().contains(lowercaseQuery)
    ).toList();
  }

  /// Get all categories
  static List<String> getCategories() {
    final categories = _inventoryItems.map((item) => item.category).toSet().toList();
    categories.sort();
    return categories;
  }

  /// Get inventory statistics
  static Map<String, dynamic> getInventoryStats() {
    final totalItems = _inventoryItems.length;
    final lowStockCount = getLowStockItems().length;
    final outOfStockCount = getOutOfStockItems().length;
    final overstockedCount = getOverstockedItems().length;
    final totalValue = _inventoryItems.fold(0.0, (sum, item) => sum + (item.currentStock * item.unitPrice));
    
    return {
      'totalItems': totalItems,
      'lowStockCount': lowStockCount,
      'outOfStockCount': outOfStockCount,
      'overstockedCount': overstockedCount,
      'totalValue': totalValue,
      'categories': getCategories().length,
    };
  }

  /// Create new inventory item
  static Future<InventoryItem?> createItem({
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
      
      final item = await GridFSApiService.createInventoryItem(
        name: name,
        description: description,
        category: category,
        unit: unit,
        currentStock: currentStock,
        minimumStock: minimumStock,
        maximumStock: maximumStock,
        unitPrice: unitPrice,
        supplier: supplier,
        imagePath: imagePath,
        metadata: metadata,
      );
      
      if (item != null) {
        _inventoryItems.add(item);
        Logger.success('Inventory item created successfully', 'INVENTORY');
      }
      
      return item;
    } catch (e) {
      Logger.exception('Failed to create inventory item', e, 'INVENTORY');
      return null;
    }
  }

  /// Update inventory item
  static Future<InventoryItem?> updateItem({
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
      
      final item = await GridFSApiService.updateInventoryItem(
        id: id,
        name: name,
        description: description,
        category: category,
        unit: unit,
        currentStock: currentStock,
        minimumStock: minimumStock,
        maximumStock: maximumStock,
        unitPrice: unitPrice,
        supplier: supplier,
        imagePath: imagePath,
        metadata: metadata,
      );
      
      if (item != null) {
        final index = _inventoryItems.indexWhere((i) => i.id == id);
        if (index != -1) {
          _inventoryItems[index] = item;
        }
        Logger.success('Inventory item updated successfully', 'INVENTORY');
      }
      
      return item;
    } catch (e) {
      Logger.exception('Failed to update inventory item', e, 'INVENTORY');
      return null;
    }
  }

  /// Delete inventory item
  static Future<bool> deleteItem(String id) async {
    try {
      Logger.api('Deleting inventory item: $id', 'INVENTORY');
      
      final success = await GridFSApiService.deleteInventoryItem(id);
      
      if (success) {
        _inventoryItems.removeWhere((item) => item.id == id);
        Logger.success('Inventory item deleted successfully', 'INVENTORY');
      }
      
      return success;
    } catch (e) {
      Logger.exception('Failed to delete inventory item', e, 'INVENTORY');
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
      
      final success = await GridFSApiService.addStockMovement(
        inventoryItemId: inventoryItemId,
        type: type,
        quantity: quantity,
        reason: reason,
        adminId: adminId,
        adminName: adminName,
        metadata: metadata,
      );
      
      if (success) {
        // Update local stock level
        final item = getItemById(inventoryItemId);
        if (item != null) {
          double newStock = item.currentStock;
          switch (type) {
            case 'in':
              newStock += quantity;
              break;
            case 'out':
              newStock -= quantity;
              break;
            case 'adjustment':
              newStock = quantity;
              break;
          }
          
          final updatedItem = item.copyWith(currentStock: newStock);
          final index = _inventoryItems.indexWhere((i) => i.id == inventoryItemId);
          if (index != -1) {
            _inventoryItems[index] = updatedItem;
          }
        }
        
        Logger.success('Stock movement added successfully', 'INVENTORY');
      }
      
      return success;
    } catch (e) {
      Logger.exception('Failed to add stock movement', e, 'INVENTORY');
      return false;
    }
  }

  /// Get stock movements for an item
  static Future<List<StockMovement>> getStockMovements(String inventoryItemId) async {
    try {
      Logger.api('Fetching stock movements for item: $inventoryItemId', 'INVENTORY');
      
      _stockMovements = await GridFSApiService.getStockMovements(inventoryItemId);
      Logger.success('Fetched ${_stockMovements.length} stock movements', 'INVENTORY');
      
      return _stockMovements;
    } catch (e) {
      Logger.exception('Failed to fetch stock movements', e, 'INVENTORY');
      return [];
    }
  }

  /// Get all stock movements
  static List<StockMovement> getAllStockMovements() {
    return List.from(_stockMovements);
  }

  /// Download item image
  static Future<Uint8List?> downloadItemImage(String imageId) async {
    try {
      Logger.api('Downloading image for item: $imageId', 'INVENTORY');
      return await GridFSApiService.downloadImage(imageId, 'inventory_images');
    } catch (e) {
      Logger.exception('Failed to download item image', e, 'INVENTORY');
      return null;
    }
  }

  /// Get item image URL
  static String getItemImageUrl(String imageId) {
    return GridFSApiService.getImageUrl(imageId, 'inventory_images');
  }

  /// Delete item image
  static Future<bool> deleteItemImage(String imageId) async {
    try {
      Logger.api('Deleting image: $imageId', 'INVENTORY');
      return await GridFSApiService.deleteImage(imageId, 'inventory_images');
    } catch (e) {
      Logger.exception('Failed to delete item image', e, 'INVENTORY');
      return false;
    }
  }

  /// Get inventory dashboard data
  static Future<Map<String, dynamic>?> getDashboardData() async {
    try {
      Logger.api('Fetching inventory dashboard data', 'INVENTORY');
      return await GridFSApiService.getInventoryDashboard();
    } catch (e) {
      Logger.exception('Failed to fetch dashboard data', e, 'INVENTORY');
      return null;
    }
  }

  /// Get low stock items from server
  static Future<List<InventoryItem>> getLowStockItemsFromServer() async {
    try {
      Logger.api('Fetching low stock items from server', 'INVENTORY');
      return await GridFSApiService.getLowStockItems();
    } catch (e) {
      Logger.exception('Failed to fetch low stock items', e, 'INVENTORY');
      return [];
    }
  }

  /// Validate inventory item data
  static Map<String, String> validateItemData({
    required String name,
    required String description,
    required String category,
    required String unit,
    required double currentStock,
    required double minimumStock,
    required double maximumStock,
    required double unitPrice,
    required String supplier,
  }) {
    final errors = <String, String>{};
    
    if (name.trim().isEmpty) {
      errors['name'] = 'Name is required';
    }
    
    if (description.trim().isEmpty) {
      errors['description'] = 'Description is required';
    }
    
    if (category.trim().isEmpty) {
      errors['category'] = 'Category is required';
    }
    
    if (unit.trim().isEmpty) {
      errors['unit'] = 'Unit is required';
    }
    
    if (currentStock < 0) {
      errors['currentStock'] = 'Current stock cannot be negative';
    }
    
    if (minimumStock < 0) {
      errors['minimumStock'] = 'Minimum stock cannot be negative';
    }
    
    if (maximumStock < 0) {
      errors['maximumStock'] = 'Maximum stock cannot be negative';
    }
    
    if (minimumStock > maximumStock) {
      errors['minimumStock'] = 'Minimum stock cannot be greater than maximum stock';
    }
    
    if (currentStock > maximumStock) {
      errors['currentStock'] = 'Current stock cannot be greater than maximum stock';
    }
    
    if (unitPrice < 0) {
      errors['unitPrice'] = 'Unit price cannot be negative';
    }
    
    if (supplier.trim().isEmpty) {
      errors['supplier'] = 'Supplier is required';
    }
    
    return errors;
  }

  /// Check if item name already exists
  static bool isItemNameExists(String name, {String? excludeId}) {
    return _inventoryItems.any((item) => 
      item.name.toLowerCase() == name.toLowerCase() && 
      (excludeId == null || item.id != excludeId)
    );
  }

  /// Get items by supplier
  static List<InventoryItem> getItemsBySupplier(String supplier) {
    return _inventoryItems.where((item) => 
      item.supplier.toLowerCase() == supplier.toLowerCase()
    ).toList();
  }

  /// Get all suppliers
  static List<String> getSuppliers() {
    final suppliers = _inventoryItems.map((item) => item.supplier).toSet().toList();
    suppliers.sort();
    return suppliers;
  }

  /// Get items needing restock
  static List<InventoryItem> getItemsNeedingRestock() {
    return _inventoryItems.where((item) => 
      item.isLowStock || item.isOutOfStock
    ).toList();
  }

  /// Get total inventory value
  static double getTotalInventoryValue() {
    return _inventoryItems.fold(0.0, (sum, item) => sum + (item.currentStock * item.unitPrice));
  }

  /// Get category-wise inventory value
  static Map<String, double> getCategoryWiseValue() {
    final categoryValues = <String, double>{};
    
    for (final item in _inventoryItems) {
      final value = item.currentStock * item.unitPrice;
      categoryValues[item.category] = (categoryValues[item.category] ?? 0) + value;
    }
    
    return categoryValues;
  }

  /// Clear all cached data
  static void clearCache() {
    _inventoryItems.clear();
    _stockMovements.clear();
    _isInitialized = false;
    Logger.api('Inventory service cache cleared', 'INVENTORY');
  }
}
