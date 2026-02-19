/// NOMU CAFE Menu Constants
/// Complete menu data for the barista mobile application

class MenuConstants {
  // Note: Pizzas, Pastries, and Donuts are now managed through the admin inventory system
  // Only drinks remain hardcoded here

  // Non-Coffee Series
  static const Map<String, List<String>> nonCoffeeDrinks = {
    'Nomu Milk Tea': ['Medium', 'Large'],
    'Wintermelon Milk Tea ★': ['Medium', 'Large'],
    'Taro Milk Tea w/ Taro Paste': ['Medium', 'Large'],
    'Blue Cotton Candy': ['Medium', 'Large'],
    'Mixed Fruit Tea': ['Medium', 'Large'],
    'Tiger Brown Sugar': ['Medium', 'Large'],
    'Mixed Berries w/ Popping Boba': ['Medium', 'Large'],
    'Strawberry Lemonade Green Tea': ['Medium', 'Large'],
  };

  // Hot/Iced Drinks
  static const Map<String, List<String>> hotIcedDrinks = {
    'Honey Citron Ginger Tea': ['Regular'],
    'Matcha Latte': ['Regular'],
    'Sakura Latte': ['Regular'],
    'Honey Lemon Chia': ['Regular'],
    'Hot Chocolate': ['Regular'],
    'Hot Mint Chocolate': ['Regular'],
  };

  // Kumo Cream Series
  static const Map<String, List<String>> kumoCreamDrinks = {
    'Chiztill (Black/Oolong/Jasmine)': ['Medium', 'Large'],
    'Kumo Wintermelon': ['Medium', 'Large'],
    'Kumo Nomu Milk Tea ★': ['Medium', 'Large'],
    'Kumo Matcha': ['Medium', 'Large'],
    'Kumo Taro Milk Tea': ['Medium', 'Large'],
    'Kumo Choco': ['Medium', 'Large'],
    'Kumo Tiger Brown Sugar': ['Medium', 'Large'],
    'Kumo Sakura Latte': ['Medium', 'Large'],
    'Kumo Milo with Oreo ★': ['Medium', 'Large'],
    'Kumo Mixed Berries': ['Medium', 'Large'],
    'Kumo Fresh Strawberry ★': ['Medium', 'Large'],
    'Kumo Fresh Mango': ['Medium', 'Large'],
  };

  // Coffee Series
  static const Map<String, List<String>> coffeeDrinks = {
    'Americano': ['Regular'],
    'Cold Brew': ['Regular'],
    'Nomu Latte ☆': ['Regular'],
    'Kumo Coffee ☆': ['Regular'],
    'Orange Long Black': ['Regular'],
    'Cappuccino': ['Regular'],
    'Flavored Latte (Vanilla / Hazelnut)': ['Regular'],
    'Salted Caramel Latte ☆': ['Regular'],
    'Spanish Latte ☆': ['Regular'],
    'Chai Latte': ['Regular'],
    'Ube Vanilla Latte': ['Regular'],
    'Mazagran (Lemon Coffee)': ['Regular'],
    'Coconut Vanilla Latte': ['Regular'],
    'Chocolate Mocha (White or Dark)': ['Regular'],
    'Caramel Macchiato': ['Regular'],
    'Macadamia Latte': ['Regular'],
    'Butterscotch Latte': ['Regular'],
    'Peachespresso': ['Regular'],
    'Shakerato (Caramel/Spanish/Dark Choco)': ['Regular'],
    'Mint Latte': ['Regular'],
    'Honey Oatmilk Latte': ['Regular'],
  };


  // Category definitions (only drinks remain hardcoded)
  static const List<String> categories = [
    'Non-Coffee Drinks',
    'Hot/Iced Drinks',
    'Kumo Cream Series',
    'Coffee Series',
  ];

  // Get all menu items as a flat list for easy processing
  // Note: Only drinks are hardcoded here. Pizzas, Pastries, and Donuts are managed through admin inventory
  static List<Map<String, dynamic>> getAllMenuItems() {
    final List<Map<String, dynamic>> items = [];

    // Note: Pizzas, Pastries, and Donuts are now managed through the admin inventory system
    // They will be loaded dynamically from the inventory management system

    // Add non-coffee drinks
    for (final entry in nonCoffeeDrinks.entries) {
      final drinkName = entry.key;
      final sizes = entry.value;
      
      for (final size in sizes) {
        items.add({
          'name': '$drinkName ($size)',
          'category': 'Non-Coffee Drinks',
          'description': 'Milk tea made from brewed tea leaves',
          'ingredients': _getDrinkIngredients(drinkName),
          'isAvailable': true,
        });
      }
    }

    // Add hot/iced drinks
    for (final entry in hotIcedDrinks.entries) {
      final drinkName = entry.key;
      final sizes = entry.value;
      
      for (final size in sizes) {
        // Only add size in parentheses if it's not "Regular"
        final displayName = size == 'Regular' ? drinkName : '$drinkName ($size)';
        items.add({
          'name': displayName,
          'category': 'Hot/Iced Drinks',
          'description': 'Premium hot or iced beverage',
          'ingredients': _getDrinkIngredients(drinkName),
          'isAvailable': true,
        });
      }
    }

    // Add Kumo Cream drinks
    for (final entry in kumoCreamDrinks.entries) {
      final drinkName = entry.key;
      final sizes = entry.value;
      
      for (final size in sizes) {
        items.add({
          'name': '$drinkName ($size)',
          'category': 'Kumo Cream Series',
          'description': 'Topped with salty cream cheese',
          'ingredients': _getDrinkIngredients(drinkName),
          'isAvailable': true,
        });
      }
    }

    // Add coffee drinks
    for (final entry in coffeeDrinks.entries) {
      final drinkName = entry.key;
      final sizes = entry.value;
      
      for (final size in sizes) {
        // Only add size in parentheses if it's not "Regular"
        final displayName = size == 'Regular' ? drinkName : '$drinkName ($size)';
        items.add({
          'name': displayName,
          'category': 'Coffee Series',
          'description': 'Freshly roasted, locally sourced coffee',
          'ingredients': _getDrinkIngredients(drinkName),
          'isAvailable': true,
        });
      }
    }


    return items;
  }

  // Helper methods to get ingredients based on item names
  // Note: Pizza, Pastry, and Donut ingredient methods removed as these items are now managed through admin inventory

  static List<String> _getDrinkIngredients(String drinkName) {
    if (drinkName.contains('Milk Tea')) {
      return ['Tea leaves', 'Milk', 'Sugar', 'Tapioca pearls'];
    } else if (drinkName.contains('Latte')) {
      return ['Coffee', 'Milk', 'Espresso'];
    } else if (drinkName.contains('Kumo')) {
      return ['Tea', 'Milk', 'Cream cheese', 'Salt'];
    } else if (drinkName.contains('Matcha')) {
      return ['Matcha powder', 'Milk', 'Sugar'];
    } else if (drinkName.contains('Taro')) {
      return ['Taro paste', 'Milk', 'Tea'];
    } else if (drinkName.contains('Wintermelon')) {
      return ['Wintermelon', 'Tea', 'Milk', 'Sugar'];
    } else {
      return ['Water', 'Sugar', 'Natural flavors'];
    }
  }
}
