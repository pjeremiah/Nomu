import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config.dart';

class OpenAIService {
  static const String _baseUrl = 'https://api.openai.com/v1';
  
  /// Send a chat completion request to OpenAI (or via backend proxy when on production mobile backend)
  static Future<Map<String, dynamic>> sendChatCompletion({
    required String message,
    String model = 'gpt-3.5-turbo',
    double temperature = 0.7,
    int maxTokens = 4000, // Increased default limit
  }) async {
    final useProxy = await Config.useBackendChatProxy;
    if (useProxy) {
      final baseUrl = await Config.apiBaseUrl;
      final url = Uri.parse('$baseUrl/chat/completion');
      final response = await http.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: json.encode({
          'message': message,
          'model': model,
          'temperature': temperature,
          'maxTokens': maxTokens,
        }),
      ).timeout(const Duration(seconds: 60));
      if (response.statusCode == 200) {
        return json.decode(response.body) as Map<String, dynamic>;
      }
      throw Exception('Chat proxy error: ${response.statusCode} - ${response.body}');
    }

    if (!Config.isOpenAIConfigured) {
      throw Exception('OpenAI API key not configured');
    }

    final url = Uri.parse('$_baseUrl/chat/completions');
    
    final headers = {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ${Config.openAIKey}',
    };

    final body = {
      'model': model,
      'messages': [
        {
          'role': 'user',
          'content': message,
        }
      ],
      'temperature': temperature,
      'max_tokens': maxTokens,
    };

    try {
      final response = await http.post(
        url,
        headers: headers,
        body: json.encode(body),
      );

      if (response.statusCode == 200) {
        return json.decode(response.body);
      } else {
        throw Exception('OpenAI API error: ${response.statusCode} - ${response.body}');
      }
    } catch (e) {
      throw Exception('Failed to call OpenAI API: $e');
    }
  }

  /// Generate a simple text completion
  static Future<String> generateText({
    required String prompt,
    String model = 'gpt-3.5-turbo',
    double temperature = 0.7,
    int maxTokens = 4000, // Increased default limit
  }) async {
    final response = await sendChatCompletion(
      message: prompt,
      model: model,
      temperature: temperature,
      maxTokens: maxTokens,
    );

    if (response['choices'] != null && response['choices'].isNotEmpty) {
      return response['choices'][0]['message']['content'] ?? '';
    }
    
    throw Exception('No response generated from OpenAI');
  }

  /// Generate a coffee recommendation based on user preferences
  static Future<String> getCoffeeRecommendation({
    required String userPreferences,
    String timeOfDay = 'morning',
  }) async {
    final prompt = '''
    I'm a coffee shop customer looking for recommendations. 
    Time of day: $timeOfDay
    My preferences: $userPreferences
    
    Please suggest 2-3 coffee drinks that would suit my taste and the time of day. 
    Keep the response concise and friendly, like a barista would speak.
    ''';

    final response = await generateText(
      prompt: prompt,
      temperature: 0.8,
      maxTokens: 4000, // Increased limit
    );
    
    // Remove star symbols from the response
    return _removeStarSymbols(response);
  }

  /// Generate a response for customer support
  static Future<String> getCustomerSupportResponse({
    required String customerQuery,
    List<Map<String, dynamic>>? conversationHistory,
  }) async {
    // Check if this is actually a menu query that fell through
    final lowerQuery = customerQuery.toLowerCase();
    if (lowerQuery.contains('menu') || lowerQuery.contains('what do you have') || 
        lowerQuery.contains('food') || lowerQuery.contains('drink') ||
        lowerQuery.contains('coffee') || lowerQuery.contains('pizza') ||
        lowerQuery.contains('pasta') || lowerQuery.contains('donut') ||
        lowerQuery.contains('pastry') || lowerQuery.contains('price')) {
      return getMenuHelp();
    }
    
    // Build conversation context if history is provided
    String conversationContext = '';
    if (conversationHistory != null && conversationHistory.isNotEmpty) {
      // Get last 6 messages for context (3 exchanges)
      final recentMessages = conversationHistory.length > 6 
          ? conversationHistory.sublist(conversationHistory.length - 6)
          : conversationHistory;
      
      conversationContext = '\n\nPrevious conversation:\n';
      for (var msg in recentMessages) {
        final sender = msg['sender'] == 'user' ? 'Customer' : 'Assistant';
        final text = msg['text'] ?? '';
        conversationContext += '$sender: $text\n';
      }
      conversationContext += '\nCurrent question: ';
    }
    
    final prompt = '''
    You are a professional customer support assistant for Nomu Cafe, a premium coffee shop and cafe. 
    You represent the Nomu brand with professionalism, courtesy, and expertise.
    ${conversationContext}${conversationContext.isNotEmpty ? customerQuery : 'A customer is asking: "$customerQuery"'}
    
    Please provide a formal, professional, and helpful response. Maintain a courteous and respectful tone throughout.
    Use proper grammar and complete sentences. Address the customer as "you" in a respectful manner.
    If you need more information, ask clarifying questions politely.
    Keep responses concise but comprehensive, maintaining a professional business communication style.
    ${conversationContext.isNotEmpty ? 'Consider the previous conversation context when responding. If this is a follow-up question, reference the previous discussion appropriately.' : ''}
    
    ACCOUNT MANAGEMENT HELP:
    - To change personal information: Navigate to the Profile page → Select "Edit Profile" → Update your details → Save changes
    - To change password: Navigate to the Profile page → Access "Account Settings" → Select "Change Password" → Follow the prompts
    - For password reset: Utilize the "Forgot Password" option on the login page
    - For account issues: Please contact our support team via our official website
    
    IMPORTANT: If the customer's question is outside the scope of cafe operations, menu items, 
    store hours, locations, loyalty program, account management, or general customer service inquiries, 
    please politely and professionally redirect them to contact Nomu Cafe directly via our official website at 
    https://nomu.cafe for more detailed assistance.
    
    Always maintain a formal, professional tone appropriate for a premium cafe establishment.
    ''';

    final response = await generateText(
      prompt: prompt,
      temperature: 0.7,
      maxTokens: 4000, // Increased to allow complete responses
    );
    
    // Remove star symbols from the response
    return _removeStarSymbols(response);
  }

  /// Generate a fallback response for out-of-scope queries
  static String getOutOfScopeResponse() {
    return '''Thank you for your inquiry. I understand that your question falls outside my current area of expertise.

For more detailed assistance with complex inquiries, special requests, or topics beyond our standard cafe operations, I would recommend contacting Nomu Cafe directly through our official channels:

Website: https://nomu.cafe

Our dedicated support team will be pleased to assist you with any specific questions or concerns you may have.

Is there anything else I can assist you with regarding our menu, store hours, loyalty program, or general cafe information?''';
  }

  static String getAccountManagementHelp() {
    return '''Here’s how to manage your account settings in the Nomu app:

1. Go to the Profile page (tap Profile in the bottom navigation).

2. Tap Account Settings.

3. To change your profile picture: Tap the profile picture area (or “Tap to change profile picture”), then tap Edit Picture. Choose Camera or Gallery, then select the photo you want to use.

4. To edit personal information: Update any fields (e.g. Full Name, Username, Birthday, Gender). Scroll down and tap Save Changes to keep your updates.

5. To change your password: In the Change Password section, enter your current password, then enter and confirm your new password. Tap Send OTP to receive a code by email, enter the OTP in the field provided, then tap Verify OTP. When verification succeeds, tap Save Changes to complete the password change.

Need to reset your password from the login screen? Use “Forgot Password” on the login page and follow the link sent to your email.

Visit our website to explore our menu, locations, and discover more about Nomu Cafe: https://nomu.cafe''';
  }

  /// Business hours synced with Nomu Cafe website Location page (https://nomu.cafe).
  static String getBusinessHoursHelp() {
    return '''The opening and closing hours vary per branch.

Nomu Café – Dapitan
Dapitan St., Sampaloc, Manila
8:00 AM – 10:00 PM

Nomu Café – Jupiter
Jupiter St, Bel-Air, Makati 
7:00 AM – 8:00 PM

Nomu Café – UPD
University Ave, Diliman, Quezon City 
7:00 AM – 9:00 PM

Visit our website to explore our menu, locations, and discover more about Nomu Cafe.

https://nomu.cafe''';
  }

  static String getBestSellerHelp() {
    String bestSellerResponse = '''Nomu Cafe Best Sellers

We are pleased to present our most popular menu items, selected based on customer preferences and reviews:

PASTRIES
French Butter Croissant - ₱120

DONUTS
Original Milky Vanilla Glaze - ₱40

NON-COFFEE DRINKS
Wintermelon Milk Tea - ₱120 (Medium) / ₱140 (Large)
Kumo Nomu Milk Tea - ₱130 (Medium) / ₱150 (Large)
Kumo Milo with Oreo - ₱130 (Medium) / ₱150 (Large)
Kumo Fresh Strawberry - ₱160 (Medium) / ₱180 (Large)

COFFEE SERIES
Nomu Latte - ₱130
Kumo Coffee - ₱130 (Iced) / ₱140 (Hot)
Salted Caramel Latte - ₱140 (Iced) / ₱150 (Hot)
Spanish Latte - ₱140 (Iced) / ₱150 (Hot)

Why These Items Are Popular:
These selections are crafted with premium ingredients and represent customer favorites with excellent reviews. They offer a perfect balance of flavor and quality, providing exceptional value for money.

Additional Recommendations:
If you would like personalized recommendations, please share your preferences regarding sweetness level, coffee strength, and temperature preference (hot or cold), and we will be pleased to suggest the perfect beverage or food item for you.

Contact Information:
For further inquiries or to place orders, please contact us via our official website: https://nomu.cafe''';
    
    // Remove star symbols from the response
    return _removeStarSymbols(bestSellerResponse);
  }

  /// Complete menu shown when user taps "Show Complete Menu" or asks for the menu.
  /// Button is placed at the bottom so users read the menu first, then get the CTA to visit the site.
  static String getMenuHelp() {
    String menuResponse = '''Here are the menus available at Nomu Cafe.

——— 🍝 PASTAS ——— 
• Guanciale Alfredo - ₱250
• Fiery Carbonara - ₱250
• Truffle Cream Pasta - ₱250

——— 🥟 CALZONE ——— 
• Creamy Bacon Calzone - ₱170
• Pepperoni Calzone - ₱170

——— 🍕 PIZZAS ———
• Creamy Pesto — ₱220 / ₱400
• Salame Piccante — ₱220 / ₱400
• Savory Spinach — ₱220 / ₱400
• The Five Cheese — ₱280 / ₱440
• Black Truffle — ₱280 / ₱440
• Cheese — ₱200 / ₱350

Pizza Add-Ons:
- Pesto – +₱50
- Salami – +₱50
- Spinach – +₱50
- Spicy Honey – +₱25
- Chilli Flakes – +₱25

——— 🥐 PASTRIES ———
• Pain Suisse — ₱120
• French Butter Croissant — ₱120
• Blueberry Cheesecake Danish — ₱120
• Mango Cheesecake Danish — ₱120
• Crookie — ₱130
• Pain Au Chocolat — ₱140
• Almond Croissant — ₱150
• Pain Suisse Chocolate — ₱150
• Hokkaido Cheese Danish — ₱150
• Vanilla Flan Brulee Tart — ₱150
• Pain Au Pistachio — ₱180
• Strawberry Cream Croissant — ₱180
• Choco-Berry Pain Suisse — ₱180
• Kunefe Pistachio Croissant — ₱200
• Garlic Cream Cheese Croissant — ₱160
• Pain Au Ham & Cheese — ₱180
• Grilled Cheese — ₱190

——— 🍩 DONUTS ———
• Original Milky Vanilla Glaze — ₱40
• Oreo Overload — ₱45
• White Chocolate with Almonds — ₱45
• Dark Chocolate with Cashew Nuts — ₱45
• Dark Chocolate with Sprinkles — ₱45
• Matcha — ₱45
• Strawberry with Sprinkles — ₱45
• Smores — ₱50
• Box of 6 (Classic) — ₱200
• Box of 6 (Assorted) — ₱250

——— 🧋 DRINKS ———

Milk Tea (Medium / Large)
• Nomu Milk Tea — ₱120 / ₱140
• Wintermelon Milk Tea — ₱120 / ₱140
• Taro Milk Tea w/ Taro Paste — ₱120 / ₱140
• Blue Cotton Candy — ₱130 / ₱150
• Mixed Fruit Tea — ₱130 / ₱150
• Tiger Brown Sugar — ₱140 / ₱160
• Mixed Berries w/ Popping Boba — ₱150 / ₱170
• Strawberry Lemonade Green Tea — ₱150 / ₱170

Hot & Iced
• Honey Citron Ginger Tea — ₱120 / ₱130
• Matcha Latte — ₱140 / ₱150
• Sakura Latte — ₱140 / ₱150
• Honey Lemon Chia — ₱180 / ₱190
• Hot Chocolate — ₱130
• Hot Mint Chocolate — ₱150

Kumo Cream (Medium / Large)
• Chiztill (Black/Oolong/Jasmine) — ₱100 / ₱120
• Kumo Wintermelon — ₱120 / ₱140
• Kumo Nomu Milk Tea — ₱130 / ₱150
• Kumo Matcha — ₱140 / ₱160
• Kumo Taro Milk Tea — ₱130 / ₱150
• Kumo Choco — ₱120 / ₱140
• Kumo Tiger Brown Sugar — ₱140 / ₱160
• Kumo Sakura Latte — ₱140 / ₱160
• Kumo Milo with Oreo — ₱130 / ₱150
• Kumo Mixed Berries — ₱140 / ₱160
• Kumo Fresh Strawberry — ₱160 / ₱180
• Kumo Fresh Mango — ₱160 / ₱180

Drink Add-Ons:
- Pearls – +₱10
- Pudding – +₱15
- Grass Jelly / Nata – +₱15
- Popping Boba – +₱15
- Espresso Shot – +₱30
- Kumo Cream – +₱40

——— ☕ COFFEE SERIES ——— (Iced / Hot)
• Americano — ₱120 / ₱120
• Cold Brew — ₱130
• Nomu Latte — ₱130 / ₱130
• Kumo Coffee — ₱130 / ₱140
• Orange Long Black — ₱130 / ₱140
• Cappuccino — ₱130 / ₱140
• Flavored Latte (Vanilla/Hazelnut) — ₱140 / ₱140
• Salted Caramel Latte — ₱140 / ₱150
• Spanish Latte — ₱140 / ₱150
• Chai Latte — ₱140 / ₱150
• Ube Vanilla Latte — ₱140 / ₱160
• Mazagran (Lemon Coffee) — ₱160
• Coconut Vanilla Latte — ₱160 / ₱170
• Chocolate Mocha (White or Dark) — ₱160 / ₱170
• Caramel Macchiato — ₱160 / ₱170
• Macadamia Latte — ₱160 / ₱170
• Butterscotch Latte — ₱160 / ₱170
• Peachespresso — ₱160
• Shakerato (Caramel/Spanish/Dark Choco) — ₱180
• Mint Latte — ₱180
• Honey Oatmilk Latte — ₱200

Coffee Add-Ons:
- Medium (Upsize) – +₱10
- Large (Upsize) – +₱20
- Espresso Shot – +₱30
- Kumo Cream – +₱40
- Oatmilk / Soymilk – +₱40
- Pearls – +₱15
- Pudding – +₱15
- Grass Jelly / Nata – +₱15
- Popping Boba – +₱15


Visit our website to explore our menu, locations, and discover more about Nomu Cafe. https://nomu.cafe''';
    
    // Debug: Log the menu length
    print('Menu response length: ${menuResponse.length} characters');
    
    // Remove star symbols from the response (but preserve spacing for menu tables)
    return _removeStarSymbols(menuResponse);
  }
  
  /// Remove star symbols (★, ☆, *) and word "order" from text while preserving proper spacing
  static String _removeStarSymbols(String text) {
    // Remove star symbols, asterisks, and the word "order" but preserve proper spacing
    String cleaned = text.replaceAll('★', '').replaceAll('☆', '').replaceAll('*', '');
    
    // Remove the word "order" (case insensitive)
    cleaned = cleaned.replaceAll(RegExp(r'\border\b', caseSensitive: false), '');
    
    // For menu responses, preserve tabs for table formatting
    // Only clean up excessive spaces/tabs, but keep single tabs for alignment
    cleaned = cleaned.replaceAll(RegExp(r' {2,}'), ' '); // Replace multiple spaces with single space (but keep tabs)
    cleaned = cleaned.replaceAll(RegExp(r'\n[ ]+'), '\n'); // Remove leading spaces after line breaks
    cleaned = cleaned.replaceAll(RegExp(r'[ ]+\n'), '\n'); // Remove trailing spaces before line breaks
    cleaned = cleaned.replaceAll(RegExp(r'\n{3,}'), '\n\n'); // Replace 3+ line breaks with 2
    
    return cleaned.trim();
  }
}
