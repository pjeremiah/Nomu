import 'dart:typed_data';
import '../models/gridfs_models.dart';
import '../services/gridfs_api_service.dart';
import '../utils/logger.dart';
import '../constants/menu_constants.dart';

/// Enhanced Menu Service for barista mobile application
/// Handles menu operations with GridFS image support
class MenuService {
  static List<MenuItem> _menuItems = [];
  static bool _isInitialized = false;

  // Initialize with NOMU CAFE menu data
  static Future<void> _initializeWithMenuConstants() async {
    try {
      Logger.api('Initializing menu with NOMU CAFE constants', 'MENU');
      final menuData = MenuConstants.getAllMenuItems();
      
      _menuItems = menuData.map((itemData) {
        return MenuItem(
          id: _generateId(itemData['name']),
          name: itemData['name'],
          description: itemData['description'],
          category: itemData['category'],
          price: 0.0, // No pricing
          isAvailable: itemData['isAvailable'],
          ingredients: List<String>.from(itemData['ingredients']),
          createdAt: DateTime.now(),
          updatedAt: DateTime.now(),
        );
      }).toList();
      
      Logger.success('Initialized ${_menuItems.length} menu items from constants', 'MENU');
    } catch (e) {
      Logger.exception('Failed to initialize menu with constants', e, 'MENU');
    }
  }

  // Generate a simple ID from name
  static String _generateId(String name) {
    return name.toLowerCase().replaceAll(RegExp(r'[^a-z0-9]'), '_');
  }

  // Legacy drink categories for backward compatibility
  static const Map<String, List<String>> drinksByCategory = {
    'Non-Coffee': [
      'Nomu Milk Tea',
      'Wintermelon Milk Tea ★',
      'Taro Milk Tea w/ Taro Paste',
      'Blue Cotton Candy',
      'Mixed Fruit Tea',
      'Tiger Brown Sugar',
      'Mixed Berries w/ Popping Boba',
      'Strawberry Lemonade Green Tea',
    ],
    'Hot/Iced Drinks': [
      'Honey Citron Ginger Tea',
      'Matcha Latte',
      'Sakura Latte',
      'Honey Lemon Chia',
      'Hot Chocolate',
      'Hot Mint Chocolate',
    ],
    'Kumo Cream Series': [
      'Chiztill (Black/Oolong/Jasmine)',
      'Kumo Wintermelon',
      'Kumo Nomu Milk Tea ★',
      'Kumo Matcha',
      'Kumo Taro Milk Tea',
      'Kumo Choco',
      'Kumo Tiger Brown Sugar',
      'Kumo Sakura Latte',
      'Kumo Milo with Oreo ★',
      'Kumo Mixed Berries',
      'Kumo Fresh Strawberry ★',
      'Kumo Fresh Mango',
    ],
    'Coffee Series': [
      'Americano',
      'Cold Brew',
      'Nomu Latte ☆',
      'Kumo Coffee ☆',
      'Orange Long Black',
      'Cappuccino',
      'Flavored Latte (Vanilla / Hazelnut)',
      'Salted Caramel Latte ☆',
      'Spanish Latte ☆',
      'Chai Latte',
      'Ube Vanilla Latte',
      'Mazagran (Lemon Coffee)',
      'Coconut Vanilla Latte',
      'Chocolate Mocha (White or Dark)',
      'Caramel Macchiato',
      'Macadamia Latte',
      'Butterscotch Latte',
      'Peachespresso',
      'Shakerato (Caramel/Spanish/Dark Choco)',
      'Mint Latte',
      'Honey Oatmilk Latte',
    ],
  };

  /// Initialize the menu service
  static Future<void> initialize() async {
    if (_isInitialized) return;
    
    try {
      Logger.api('Initializing menu service', 'MENU');
      
      // First try to load from server
      try {
        await refreshMenuItems();
        if (_menuItems.isNotEmpty) {
          Logger.success('Menu service initialized with server data', 'MENU');
        } else {
          // If server data is empty, use constants
          await _initializeWithMenuConstants();
        }
      } catch (e) {
        // If server fails, use constants as fallback
        Logger.warning('Server data unavailable, using menu constants', 'MENU');
        await _initializeWithMenuConstants();
      }
      
      _isInitialized = true;
      Logger.success('Menu service initialized successfully', 'MENU');
    } catch (e) {
      Logger.exception('Failed to initialize menu service', e, 'MENU');
    }
  }

  /// Refresh menu items from server
  static Future<void> refreshMenuItems() async {
    try {
      Logger.api('Refreshing menu items', 'MENU');
      _menuItems = await GridFSApiService.getMenuItems();
      Logger.success('Refreshed ${_menuItems.length} menu items', 'MENU');
    } catch (e) {
      Logger.exception('Failed to refresh menu items', e, 'MENU');
    }
  }

  /// Get all menu items
  static List<MenuItem> getAllItems() {
    return List.from(_menuItems);
  }

  /// Get menu item by ID
  static MenuItem? getItemById(String id) {
    try {
      return _menuItems.firstWhere((item) => item.id == id);
    } catch (e) {
      return null;
    }
  }

  /// Get items by category
  static List<MenuItem> getItemsByCategory(String category) {
    return _menuItems.where((item) => item.category.toLowerCase() == category.toLowerCase()).toList();
  }

  /// Get available items only
  static List<MenuItem> getAvailableItems() {
    return _menuItems.where((item) => item.isAvailable).toList();
  }

  /// Get unavailable items
  static List<MenuItem> getUnavailableItems() {
    return _menuItems.where((item) => !item.isAvailable).toList();
  }

  /// Search items by name or description
  static List<MenuItem> searchItems(String query) {
    if (query.isEmpty) return _menuItems;
    
    final lowercaseQuery = query.toLowerCase();
    return _menuItems.where((item) => 
      item.name.toLowerCase().contains(lowercaseQuery) ||
      item.description.toLowerCase().contains(lowercaseQuery) ||
      item.category.toLowerCase().contains(lowercaseQuery) ||
      item.ingredients.any((ingredient) => ingredient.toLowerCase().contains(lowercaseQuery))
    ).toList();
  }

  /// Get all categories
  static List<String> getAllCategories() {
    final categories = _menuItems.map((item) => item.category).toSet().toList();
    categories.sort();
    return categories;
  }

  /// Get legacy drink categories (for backward compatibility)
  static List<String> getLegacyCategories() {
    return drinksByCategory.keys.toList();
  }

  /// Get all drinks as a flat list (legacy)
  static List<String> getAllDrinks() {
    return drinksByCategory.values.expand((drinks) => drinks).toList();
  }

  /// Get drinks by category (legacy)
  static List<String> getDrinksByCategory(String category) {
    return drinksByCategory[category] ?? [];
  }

  /// Check if a drink exists (legacy)
  static bool drinkExists(String drink) {
    return getAllDrinks().contains(drink);
  }

  /// Get category for a specific drink (legacy)
  static String? getCategoryForDrink(String drink) {
    for (final entry in drinksByCategory.entries) {
      if (entry.value.contains(drink)) {
        return entry.key;
      }
    }
    return null;
  }

  /// Get menu statistics
  static Map<String, dynamic> getMenuStats() {
    final totalItems = _menuItems.length;
    final availableItems = getAvailableItems().length;
    final unavailableItems = getUnavailableItems().length;
    final categories = getAllCategories().length;
    final averagePrice = _menuItems.isNotEmpty 
        ? _menuItems.map((item) => item.price).reduce((a, b) => a + b) / _menuItems.length 
        : 0.0;
    
    return {
      'totalItems': totalItems,
      'availableItems': availableItems,
      'unavailableItems': unavailableItems,
      'categories': categories,
      'averagePrice': averagePrice,
    };
  }

  /// Create new menu item
  static Future<MenuItem?> createItem({
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
      
      final item = await GridFSApiService.createMenuItem(
        name: name,
        description: description,
        category: category,
        price: price,
        ingredients: ingredients,
        imagePath: imagePath,
        nutritionInfo: nutritionInfo,
        metadata: metadata,
      );
      
      if (item != null) {
        _menuItems.add(item);
        Logger.success('Menu item created successfully', 'MENU');
      }
      
      return item;
    } catch (e) {
      Logger.exception('Failed to create menu item', e, 'MENU');
      return null;
    }
  }

  /// Update menu item
  static Future<MenuItem?> updateItem({
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
      
      final item = await GridFSApiService.updateMenuItem(
        id: id,
        name: name,
        description: description,
        category: category,
        price: price,
        isAvailable: isAvailable,
        ingredients: ingredients,
        imagePath: imagePath,
        nutritionInfo: nutritionInfo,
        metadata: metadata,
      );
      
      if (item != null) {
        final index = _menuItems.indexWhere((i) => i.id == id);
        if (index != -1) {
          _menuItems[index] = item;
        }
        Logger.success('Menu item updated successfully', 'MENU');
      }
      
      return item;
    } catch (e) {
      Logger.exception('Failed to update menu item', e, 'MENU');
      return null;
    }
  }

  /// Delete menu item
  static Future<bool> deleteItem(String id) async {
    try {
      Logger.api('Deleting menu item: $id', 'MENU');
      
      final success = await GridFSApiService.deleteMenuItem(id);
      
      if (success) {
        _menuItems.removeWhere((item) => item.id == id);
        Logger.success('Menu item deleted successfully', 'MENU');
      }
      
      return success;
    } catch (e) {
      Logger.exception('Failed to delete menu item', e, 'MENU');
      return false;
    }
  }

  /// Toggle item availability
  static Future<bool> toggleItemAvailability(String id) async {
    try {
      final item = getItemById(id);
      if (item == null) return false;
      
      return await updateItem(
        id: id,
        isAvailable: !item.isAvailable,
      ) != null;
    } catch (e) {
      Logger.exception('Failed to toggle item availability', e, 'MENU');
      return false;
    }
  }

  /// Download item image
  static Future<Uint8List?> downloadItemImage(String imageId) async {
    try {
      Logger.api('Downloading image for menu item: $imageId', 'MENU');
      return await GridFSApiService.downloadImage(imageId, 'menu_images');
    } catch (e) {
      Logger.exception('Failed to download menu item image', e, 'MENU');
      return null;
    }
  }

  /// Get item image URL
  static String getItemImageUrl(String imageId) {
    return GridFSApiService.getImageUrl(imageId, 'menu_images');
  }

  /// Delete item image
  static Future<bool> deleteItemImage(String imageId) async {
    try {
      Logger.api('Deleting menu item image: $imageId', 'MENU');
      return await GridFSApiService.deleteImage(imageId, 'menu_images');
    } catch (e) {
      Logger.exception('Failed to delete menu item image', e, 'MENU');
      return false;
    }
  }

  /// Validate menu item data
  static Map<String, String> validateItemData({
    required String name,
    required String description,
    required String category,
    required double price,
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
    
    if (price < 0) {
      errors['price'] = 'Price cannot be negative';
    }
    
    return errors;
  }

  /// Check if item name already exists
  static bool isItemNameExists(String name, {String? excludeId}) {
    return _menuItems.any((item) => 
      item.name.toLowerCase() == name.toLowerCase() && 
      (excludeId == null || item.id != excludeId)
    );
  }

  /// Get items by price range
  static List<MenuItem> getItemsByPriceRange(double minPrice, double maxPrice) {
    return _menuItems.where((item) => 
      item.price >= minPrice && item.price <= maxPrice
    ).toList();
  }

  /// Get items with specific ingredients
  static List<MenuItem> getItemsWithIngredient(String ingredient) {
    return _menuItems.where((item) => 
      item.ingredients.any((ing) => ing.toLowerCase().contains(ingredient.toLowerCase()))
    ).toList();
  }

  /// Get all ingredients
  static List<String> getAllIngredients() {
    final ingredients = <String>{};
    for (final item in _menuItems) {
      ingredients.addAll(item.ingredients);
    }
    return ingredients.toList()..sort();
  }

  /// Get items by nutrition info
  static List<MenuItem> getItemsByNutrition(String nutritionKey, dynamic value) {
    return _menuItems.where((item) => 
      item.nutritionInfo.containsKey(nutritionKey) && 
      item.nutritionInfo[nutritionKey] == value
    ).toList();
  }

  /// Get popular items (by some metric - you can implement your own logic)
  static List<MenuItem> getPopularItems({int limit = 10}) {
    // This is a placeholder - implement your own popularity logic
    final sortedItems = List<MenuItem>.from(_menuItems);
    sortedItems.sort((a, b) => b.price.compareTo(a.price)); // Sort by price as example
    return sortedItems.take(limit).toList();
  }

  /// Get items created in date range
  static List<MenuItem> getItemsByDateRange(DateTime startDate, DateTime endDate) {
    return _menuItems.where((item) => 
      item.createdAt.isAfter(startDate) && item.createdAt.isBefore(endDate)
    ).toList();
  }

  /// Get category-wise price statistics
  static Map<String, Map<String, double>> getCategoryPriceStats() {
    final categoryStats = <String, Map<String, double>>{};
    
    for (final item in _menuItems) {
      if (!categoryStats.containsKey(item.category)) {
        categoryStats[item.category] = {
          'min': double.infinity,
          'max': 0.0,
          'avg': 0.0,
          'count': 0.0,
        };
      }
      
      final stats = categoryStats[item.category]!;
      stats['min'] = stats['min']! < item.price ? stats['min']! : item.price;
      stats['max'] = stats['max']! > item.price ? stats['max']! : item.price;
      stats['count'] = stats['count']! + 1;
    }
    
    // Calculate averages
    for (final category in categoryStats.keys) {
      final stats = categoryStats[category]!;
      final total = _menuItems
          .where((item) => item.category == category)
          .map((item) => item.price)
          .reduce((a, b) => a + b);
      stats['avg'] = total / stats['count']!;
    }
    
    return categoryStats;
  }

  /// Clear all cached data
  static void clearCache() {
    _menuItems.clear();
    _isInitialized = false;
    Logger.api('Menu service cache cleared', 'MENU');
  }
}
