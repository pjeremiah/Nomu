/// NOMU CAFE Menu Constants
/// Complete menu data for the barista mobile application

class MenuConstants {
  // Pizza Categories
  static const Map<String, List<String>> pizzas = {
    'Creamy Pesto': ['Pizzetta', '12th'],
    'Salame Piccante': ['Pizzetta', '12th'],
    'Savory Spinach': ['Pizzetta', '12th'],
    'The Five Cheese': ['Pizzetta', '12th'],
    'Black Truffle': ['Pizzetta', '12th'],
    'Cheese': ['Pizzetta', '12th'],
  };


  // Pastries
  static const List<String> pastries = [
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
  ];

  // Donuts
  static const List<String> donuts = [
    'Original Milky Vanilla Glaze ★',
    'Oreo Overload',
    'White Chocolate with Almonds',
    'Dark Chocolate with Cashew Nuts',
    'Dark Chocolate with Sprinkles',
    'Matcha',
    'Strawberry with Sprinkles',
    'Smores',
  ];

  static const List<String> donutBoxes = [
    'Box of 6 (Classic)',
    'Box of 6 (Assorted)',
  ];

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


  // Category definitions
  static const List<String> categories = [
    'Pizzas',
    'Pastries',
    'Donuts',
    'Non-Coffee Drinks',
    'Hot/Iced Drinks',
    'Kumo Cream Series',
    'Coffee Series',
  ];

  // Get all menu items as a flat list for easy processing
  static List<Map<String, dynamic>> getAllMenuItems() {
    final List<Map<String, dynamic>> items = [];

    // Add pizzas
    for (final entry in pizzas.entries) {
      final pizzaName = entry.key;
      final sizes = entry.value;
      
      for (final size in sizes) {
        items.add({
          'name': '$pizzaName ($size)',
          'category': 'Pizzas',
          'description': 'Neapolitan-style pizza with $pizzaName',
          'ingredients': _getPizzaIngredients(pizzaName),
          'isAvailable': true,
        });
      }
    }


    // Add pastries
    for (final pastry in pastries) {
      items.add({
        'name': pastry,
        'category': 'Pastries',
        'description': 'Freshly baked pastry',
        'ingredients': _getPastryIngredients(pastry),
        'isAvailable': true,
      });
    }

    // Add donuts
    for (final donut in donuts) {
      items.add({
        'name': donut,
        'category': 'Donuts',
        'description': 'Made fresh daily using Hokkaido Milk Bread',
        'ingredients': _getDonutIngredients(donut),
        'isAvailable': true,
      });
    }

    // Add donut boxes
    for (final box in donutBoxes) {
      items.add({
        'name': box,
        'category': 'Donuts',
        'description': 'Box of 6 donuts',
        'ingredients': ['Mixed donuts'],
        'isAvailable': true,
      });
    }

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
  static List<String> _getPizzaIngredients(String pizzaName) {
    switch (pizzaName) {
      case 'Creamy Pesto':
        return ['Pesto sauce', 'Mozzarella', 'Parmesan', 'Basil'];
      case 'Salame Piccante':
        return ['Spicy salami', 'Mozzarella', 'Tomato sauce', 'Chili flakes'];
      case 'Savory Spinach':
        return ['Fresh spinach', 'Mozzarella', 'Garlic', 'Olive oil'];
      case 'The Five Cheese':
        return ['Mozzarella', 'Cheddar', 'Parmesan', 'Gorgonzola', 'Ricotta'];
      case 'Black Truffle':
        return ['Truffle oil', 'Mozzarella', 'Mushrooms', 'Parmesan'];
      case 'Cheese':
        return ['Mozzarella', 'Tomato sauce', 'Basil'];
      default:
        return ['Pizza dough', 'Tomato sauce', 'Cheese'];
    }
  }

  static List<String> _getPastryIngredients(String pastryName) {
    if (pastryName.contains('Croissant')) {
      return ['Butter', 'Flour', 'Yeast', 'Milk'];
    } else if (pastryName.contains('Danish')) {
      return ['Puff pastry', 'Cream cheese', 'Fruit filling'];
    } else if (pastryName.contains('Pain Suisse')) {
      return ['Sweet dough', 'Chocolate', 'Custard'];
    } else {
      return ['Flour', 'Butter', 'Sugar', 'Eggs'];
    }
  }

  static List<String> _getDonutIngredients(String donutName) {
    if (donutName.contains('Vanilla')) {
      return ['Hokkaido milk bread', 'Vanilla glaze', 'Sugar'];
    } else if (donutName.contains('Chocolate')) {
      return ['Hokkaido milk bread', 'Chocolate', 'Cocoa powder'];
    } else if (donutName.contains('Matcha')) {
      return ['Hokkaido milk bread', 'Matcha powder', 'Green tea'];
    } else if (donutName.contains('Strawberry')) {
      return ['Hokkaido milk bread', 'Strawberry', 'Pink glaze'];
    } else if (donutName.contains('Oreo')) {
      return ['Hokkaido milk bread', 'Oreo cookies', 'Chocolate'];
    } else {
      return ['Hokkaido milk bread', 'Sugar', 'Flour'];
    }
  }

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
