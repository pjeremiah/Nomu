import 'dart:async';
import 'package:shared_preferences/shared_preferences.dart';
import '../api/api.dart';
import '../utils/logger.dart';

/// Inventory Scanner Service for barista mobile application
/// Handles inventory operations during QR scanning and product selection
class InventoryScannerService {
  static List<Map<String, dynamic>> _inventoryItems = [];
  static bool _isInitialized = false;

  /// Initialize the inventory scanner service
  static Future<void> initialize() async {
    if (_isInitialized) return;
    
    try {
      Logger.api('Initializing inventory scanner service', 'INVENTORY_SCANNER');
      await refreshInventoryItems();
      _isInitialized = true;
      Logger.success('Inventory scanner service initialized successfully', 'INVENTORY_SCANNER');
    } catch (e) {
      Logger.exception('Failed to initialize inventory scanner service', e, 'INVENTORY_SCANNER');
    }
  }

  /// Refresh inventory items from server
  static Future<void> refreshInventoryItems() async {
    try {
      Logger.api('Refreshing inventory items', 'INVENTORY_SCANNER');
      final items = await ApiService.getInventoryItems();
      if (items != null) {
        _inventoryItems = items;
        Logger.success('Refreshed ${_inventoryItems.length} inventory items', 'INVENTORY_SCANNER');
      }
    } catch (e) {
      Logger.exception('Failed to refresh inventory items', e, 'INVENTORY_SCANNER');
    }
  }

  /// Get all inventory items
  static List<Map<String, dynamic>> getAllItems() {
    return List.from(_inventoryItems);
  }

  /// Get inventory item by ID
  static Map<String, dynamic>? getItemById(String id) {
    try {
      return _inventoryItems.firstWhere((item) => item['_id'] == id);
    } catch (e) {
      return null;
    }
  }

  /// Search inventory items by name or category
  static List<Map<String, dynamic>> searchItems(String query) {
    if (query.isEmpty) return _inventoryItems;
    
    final lowercaseQuery = query.toLowerCase();
    return _inventoryItems.where((item) => 
      (item['name'] ?? '').toLowerCase().contains(lowercaseQuery) ||
      (item['category'] ?? '').toLowerCase().contains(lowercaseQuery) ||
      (item['description'] ?? '').toLowerCase().contains(lowercaseQuery)
    ).toList();
  }

  /// Get items by category
  static List<Map<String, dynamic>> getItemsByCategory(String category) {
    return _inventoryItems.where((item) => 
      (item['category'] ?? '').toLowerCase() == category.toLowerCase()
    ).toList();
  }

  /// Get all categories
  static List<String> getCategories() {
    final categories = _inventoryItems.map((item) => item['category'] ?? '').toSet().toList();
    categories.removeWhere((category) => category.isEmpty);
    categories.sort();
    return categories.cast<String>();
  }

  /// Decrease stock for a product when it's sold
  static Future<Map<String, dynamic>?> decreaseStock({
    required String itemId,
    required int quantity,
    required String reason,
  }) async {
    try {
      Logger.api('Decreasing stock for item: $itemId, quantity: $quantity', 'INVENTORY_SCANNER');
      
      // Get admin info from SharedPreferences
      final prefs = await SharedPreferences.getInstance();
      final adminId = prefs.getString('user_id') ?? '';
      final adminName = prefs.getString('user_name') ?? 'Unknown Admin';
      
      if (adminId.isEmpty) {
        Logger.error('Admin ID not found in SharedPreferences', 'INVENTORY_SCANNER');
        return {'error': 'Admin not authenticated'};
      }
      
      // Update stock via API
      final result = await ApiService.updateInventoryStock(
        itemId: itemId,
        quantity: quantity,
        reason: reason,
        adminId: adminId,
        adminName: adminName,
      );
      
      if (result != null && result.containsKey('error')) {
        Logger.error('Failed to decrease stock: ${result['error']}', 'INVENTORY_SCANNER');
        return result;
      }
      
      if (result != null && result.containsKey('item')) {
        // Update local cache
        final updatedItem = result['item'];
        final index = _inventoryItems.indexWhere((item) => item['_id'] == itemId);
        if (index != -1) {
          _inventoryItems[index] = updatedItem;
        }
        
        Logger.success('Stock decreased successfully for ${updatedItem['name']}', 'INVENTORY_SCANNER');
        return result;
      }
      
      Logger.error('Unexpected response from stock update API', 'INVENTORY_SCANNER');
      return {'error': 'Unexpected response from server'};
    } catch (e) {
      Logger.exception('Failed to decrease stock', e, 'INVENTORY_SCANNER');
      return {'error': 'Failed to decrease stock: ${e.toString()}'};
    }
  }

  /// Check if item has sufficient stock
  static bool hasSufficientStock(String itemId, int requiredQuantity) {
    final item = getItemById(itemId);
    if (item == null) return false;
    
    final currentStock = item['currentStock'] ?? 0;
    return currentStock >= requiredQuantity;
  }

  /// Get low stock items
  static List<Map<String, dynamic>> getLowStockItems() {
    return _inventoryItems.where((item) {
      final currentStock = item['currentStock'] ?? 0;
      final minimumThreshold = item['minimumThreshold'] ?? 0;
      return currentStock <= minimumThreshold;
    }).toList();
  }

  /// Get out of stock items
  static List<Map<String, dynamic>> getOutOfStockItems() {
    return _inventoryItems.where((item) {
      final currentStock = item['currentStock'] ?? 0;
      return currentStock <= 0;
    }).toList();
  }

  /// Clear all cached data
  static void clearCache() {
    _inventoryItems.clear();
    _isInitialized = false;
    Logger.api('Inventory scanner service cache cleared', 'INVENTORY_SCANNER');
  }

  /// Get inventory statistics
  static Map<String, dynamic> getInventoryStats() {
    final totalItems = _inventoryItems.length;
    final lowStockCount = getLowStockItems().length;
    final outOfStockCount = getOutOfStockItems().length;
    final categories = getCategories().length;
    
    return {
      'totalItems': totalItems,
      'lowStockCount': lowStockCount,
      'outOfStockCount': outOfStockCount,
      'categories': categories,
    };
  }
}
