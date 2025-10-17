class DrinkMenuService {
  // Grouped menu by category
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
    '🍕 PIZZAS': [
      'Creamy Pesto (Pizzetta)',
      'Creamy Pesto (12th)',
      'Salame Piccante (Pizzetta)',
      'Salame Piccante (12th)',
      'Savory Spinach (Pizzetta)',
      'Savory Spinach (12th)',
      'The Five Cheese (Pizzetta)',
      'The Five Cheese (12th)',
      'Black Truffle (Pizzetta)',
      'Black Truffle (12th)',
      'Cheese (Pizzetta)',
      'Cheese (12th)',
    ],
    '🥐 PASTRIES': [
      'Pain Suisse',
      'French Butter Croissant ★',
      'Blueberry Cheesecake Danish',
      'Mango Cheesecake Danish',
      'Crookie',
      'Pain Au Chocolat',
      'Almond Croissant',
      'Pain Suisse Chocolate',
      'Hokkaido Cheese Danish',
      'Vanilla Flan Brulee Tart',
      'Pain Au Pistachio',
      'Strawberry Cream Croissant',
      'Choco-Berry Pain Suisse',
      'Kunefe Pistachio Croissant',
      'Garlic Cream Cheese Croissant',
      'Pain Au Ham & Cheese',
      'Grilled Cheese',
    ],
    '🍩 DONUTS': [
      'Original Milky Vanilla Glaze ★',
      'Oreo Overload',
      'White Chocolate with Almonds',
      'Dark Chocolate with Cashew Nuts',
      'Dark Chocolate with Sprinkles',
      'Matcha',
      'Strawberry with Sprinkles',
      'Smores',
    ],
  };

  // Get all drinks as a flat list
  static List<String> getAllDrinks() {
    return drinksByCategory.values.expand((drinks) => drinks).toList();
  }

  // Get drinks by category
  static List<String> getDrinksByCategory(String category) {
    return drinksByCategory[category] ?? [];
  }

  // Get all categories
  static List<String> getAllCategories() {
    return drinksByCategory.keys.toList();
  }

  // Check if a drink exists
  static bool drinkExists(String drink) {
    return getAllDrinks().contains(drink);
  }

  // Get category for a specific drink
  static String? getCategoryForDrink(String drink) {
    for (final entry in drinksByCategory.entries) {
      if (entry.value.contains(drink)) {
        return entry.key;
      }
    }
    return null;
  }

  // Filter drinks by category
  static List<String> getDrinksByCategoryFilter(String category) {
    return drinksByCategory[category] ?? [];
  }

  // Filter drinks by search term
  static List<String> searchDrinks(String searchTerm) {
    if (searchTerm.isEmpty) return getAllDrinks();
    
    final term = searchTerm.toLowerCase();
    return getAllDrinks()
        .where((drink) => drink.toLowerCase().contains(term))
        .toList();
  }

  // Filter drinks by multiple categories
  static List<String> getDrinksByCategories(List<String> categories) {
    final List<String> result = [];
    for (final category in categories) {
      result.addAll(getDrinksByCategoryFilter(category));
    }
    return result;
  }

  // Get all categories with emojis
  static List<String> getAllCategoriesWithEmojis() {
    return drinksByCategory.keys.toList();
  }

  // Get categories without emojis (for filtering)
  static List<String> getAllCategoriesWithoutEmojis() {
    return drinksByCategory.keys
        .map((category) => category.replaceAll(RegExp(r'[^\w\s]'), '').trim())
        .toList();
  }

  // Check if a category exists
  static bool categoryExists(String category) {
    return drinksByCategory.containsKey(category);
  }

  // Get popular items (marked with ★)
  static List<String> getPopularItems() {
    return getAllDrinks()
        .where((drink) => drink.contains('★'))
        .toList();
  }

  // Get recommended items (marked with ☆)
  static List<String> getRecommendedItems() {
    return getAllDrinks()
        .where((drink) => drink.contains('☆'))
        .toList();
  }

  // Get items by price range (if price info is available)
  static List<String> getItemsByPriceRange(String priceRange) {
    // This is a placeholder for future price-based filtering
    // You can implement this based on your pricing data structure
    switch (priceRange.toLowerCase()) {
      case 'low':
        return getDrinksByCategoryFilter('🍩 DONUTS'); // Assuming donuts are lowest price
      case 'medium':
        return getDrinksByCategoryFilter('🥐 PASTRIES');
      case 'high':
        return getDrinksByCategoryFilter('🍕 PIZZAS');
      default:
        return getAllDrinks();
    }
  }
}
