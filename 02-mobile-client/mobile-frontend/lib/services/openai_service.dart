import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config.dart';

class OpenAIService {
  static const String _baseUrl = 'https://api.openai.com/v1';
  
  /// Send a chat completion request to OpenAI
  static Future<Map<String, dynamic>> sendChatCompletion({
    required String message,
    String model = 'gpt-3.5-turbo',
    double temperature = 0.7,
    int maxTokens = 150,
  }) async {
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
    int maxTokens = 150,
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
      maxTokens: 200,
    );
    
    // Remove star symbols from the response
    return _removeStarSymbols(response);
  }

  /// Generate a response for customer support
  static Future<String> getCustomerSupportResponse({
    required String customerQuery,
  }) async {
    final prompt = '''
    You are a helpful customer support representative for NOMU coffee shop. 
    A customer is asking: "$customerQuery"
    
    Please provide a helpful, friendly response. If you need more information, 
    ask clarifying questions. Keep it concise and professional.
    
    ACCOUNT MANAGEMENT HELP:
    - To change personal information: Go to Profile page → Edit Profile → Update your details
    - To change password: Go to Profile page → Account Settings → Change Password  
    - For password reset: Use "Forgot Password" on login page
    - For account issues: Contact support via our website
    
    IMPORTANT: If the customer's question is outside of cafe operations, menu items, 
    store hours, locations, loyalty program, account management, or general customer service, 
    politely redirect them to contact NOMU Cafe directly via our website at 
    https://www.nomu.ph for more detailed assistance.
    ''';

    final response = await generateText(
      prompt: prompt,
      temperature: 0.7,
      maxTokens: 150,
    );
    
    // Remove star symbols from the response
    return _removeStarSymbols(response);
  }

  /// Generate a fallback response for out-of-scope queries
  static String getOutOfScopeResponse() {
    return '''I understand you have a question that's outside my area of expertise. 

For more detailed assistance with complex inquiries, special requests, or topics beyond our cafe operations, please contact NOMU Cafe directly:

🌐 Website: https://www.nomu.ph
☕ Our team will be happy to help you with any specific questions!

Is there anything else I can help you with regarding our menu, store hours, or loyalty program?''';
  }

  /// Generate account management help response
  static String getAccountManagementHelp() {
    return '''🔐 **Account Management Help**

Here's how to manage your NOMU Cafe account:

**📝 Change Personal Information:**
1. Go to your Profile page
2. Tap "Edit Profile" 
3. Update your details (name, email, etc.)
4. Save changes

**🔑 Change Password:**
1. Go to Profile page
2. Tap "Account Settings"
3. Select "Change Password"
4. Enter current password
5. Enter new password
6. Confirm new password

**🆘 Forgot Password:**
1. On login page, tap "Forgot Password"
2. Enter your email
3. Check email for reset link
4. Follow instructions to reset

**❓ Need More Help?**
Contact us via our website: https://www.nomu.ph

Is there anything specific about your account you'd like help with?''';
  }

  /// Generate business hours help response
  static String getBusinessHoursHelp() {
    return '''🕒 **NOMU Cafe Business Hours**

**📍 UST Branch:**
- **Monday - Sunday:** 7:00 AM - 10:00 PM
- **Last Service:** 9:45 PM

**⏰ General Hours:**
- **Opening:** 7:00 AM daily
- **Closing:** 10:00 PM daily
- **Peak Hours:** 8:00 AM - 10:00 AM, 12:00 PM - 2:00 PM, 6:00 PM - 8:00 PM

**📱 Real-time Status:**
- Check our app for live updates
- Check our website for any schedule changes
- Call ahead for large purchases or special requests

**🎉 Special Hours:**
- **Holidays:** See our website for announcements and adjusted hours
- **Events:** Extended hours during special occasions
- **Weather:** May close early during severe weather

**📢 Holiday Updates:**
For the most current holiday hours and special announcements, please check our website: https://www.nomu.ph

**❓ Need More Info?**
Contact us via our website: https://www.nomu.ph

Is there anything else about our hours you'd like to know?''';
  }

  /// Generate best seller help response
  static String getBestSellerHelp() {
    String bestSellerResponse = '''⭐ **NOMU Cafe Best Sellers**

**🥐 PASTRIES**
- French Butter Croissant ₱120

**🍩 DONUTS**
- Original Milky Vanilla Glaze ₱40

**🧋 NON-COFFEE DRINKS**
- Wintermelon Milk Tea ₱120/₱140
- Kumo Nomu Milk Tea ₱130/₱150
- Kumo Milo with Oreo ₱130/₱150
- Kumo Fresh Strawberry ₱160/₱180

**☕ COFFEE SERIES**
- Nomu Latte ₱130
- Kumo Coffee ₱130/₱140
- Salted Caramel Latte ₱140/₱150
- Spanish Latte ₱140/₱150

**💡 Why These Are Popular:**
- Made with premium ingredients
- Customer favorites with great reviews
- Perfect balance of flavor and quality
- Great value for money

**❓ Need More Recommendations?**
Tell me your preferences (sweet, strong, hot/cold) and I'll suggest the perfect drink or food for you!

**📞 Contact Ahead:**
Contact us via our website: https://www.nomu.ph''';
    
    // Remove star symbols from the response
    return _removeStarSymbols(bestSellerResponse);
  }

  /// Generate menu help response
  static String getMenuHelp() {
    String menuResponse = '''🍽️ **NOMU Cafe Menu Overview**

**🍝 PASTAS – 250**
- Guanciale Alfredo, Fiery Carbonara, Truffle Cream Pasta

**🥟 CALZONE – 170**
- Creamy Bacon Calzone, Pepperoni Calzone

**🍕 PIZZAS**
- Creamy Pesto 220/400
- Salame Piccante 220/400
- Savory Spinach 220/400
- The Five Cheese 280/440
- Black Truffle 280/440
- Cheese 200/350

**Add-Ons:**
- Pesto +50, Salami +50, Spinach +50
- Spicy Honey +25, Chilli Flakes +25

**🥐 PASTRIES**
- Pain Suisse 120
- French Butter Croissant ★ 120
- Blueberry Cheesecake Danish 120
- Mango Cheesecake Danish 120
- Crookie 130
- Pain Au Chocolat 140
- Almond Croissant 150
- Pain Suisse Chocolate 150
- Hokkaido Cheese Danish 150
- Vanilla Flan Brulee Tart 150
- Pain Au Pistachio 180
- Strawberry Cream Croissant 180
- Choco-Berry Pain Suisse 180
- Kunefe Pistachio Croissant 200
- Garlic Cream Cheese Croissant 160
- Pain Au Ham & Cheese 180
- Grilled Cheese 190

**🍩 DONUTS** (Made fresh daily using Hokkaido Milk Bread)
- Original Milky Vanilla Glaze ★ 40
- Oreo Overload 45
- White Chocolate with Almonds 45
- Dark Chocolate with Cashew Nuts 45
- Dark Chocolate with Sprinkles 45
- Matcha 45
- Strawberry with Sprinkles 45
- Smores 50

**Donut Boxes:**
- Box of 6 (Classic) – 200
- Box of 6 (Assorted) – 250

**🧋 DRINKS - Non-Coffee Series**
- Nomu Milk Tea 120/140
- Wintermelon Milk Tea ★ 120/140
- Taro Milk Tea w/ Taro Paste 120/140
- Blue Cotton Candy 130/150
- Mixed Fruit Tea 130/150
- Tiger Brown Sugar 140/160
- Mixed Berries w/ Popping Boba 150/170
- Strawberry Lemonade Green Tea 150/170

**☕ Coffee Series**
- Americano 120
- Cold Brew 130
- Nomu Latte ☆ 130
- Kumo Coffee ☆ 130/140
- Orange Long Black 130/140
- Cappuccino 130/140
- Flavored Latte (Vanilla/Hazelnut) 140
- Salted Caramel Latte ☆ 140/150
- Spanish Latte ☆ 140/150
- Chai Latte 140/150
- Ube Vanilla Latte 140/160
- Caramel Macchiato 160/170
- Chocolate Mocha 160/170
- Macadamia Latte 160/170
- Butterscotch Latte 160/170
- Honey Oatmilk Latte 200

**🥤 Kumo Cream Series** (Topped with salty cream cheese)
- Chiztill (Black/Oolong/Jasmine) 100/120
- Kumo Wintermelon 120/140
- Kumo Nomu Milk Tea ★ 130/150
- Kumo Matcha 140/160
- Kumo Taro Milk Tea 130/150
- Kumo Choco 120/140
- Kumo Tiger Brown Sugar 140/160
- Kumo Sakura Latte 140/160
- Kumo Milo with Oreo ★ 130/150
- Kumo Mixed Berries 140/160
- Kumo Fresh Strawberry ★ 160/180
- Kumo Fresh Mango 160/180

**Add-Ons:**
- Black/White Pearls +10
- Pudding +15
- Grass Jelly/Nata +15
- Popping Boba +15
- Espresso Shot +30
- Kumo Cream +40
- Oatmilk/Soymilk +40

**❓ Need Recommendations?**
Tell me your preferences and I'll suggest the perfect drink or food for you!

**📞 Contact Ahead:**
Contact us via our website: https://www.nomu.ph''';
    
    // Remove star symbols from the response
    return _removeStarSymbols(menuResponse);
  }
  
  /// Remove star symbols (★, ☆, *) and word "order" from text while preserving proper spacing
  static String _removeStarSymbols(String text) {
    // Remove star symbols, asterisks, and the word "order" but preserve proper spacing
    String cleaned = text.replaceAll('★', '').replaceAll('☆', '').replaceAll('*', '');
    
    // Remove the word "order" (case insensitive)
    cleaned = cleaned.replaceAll(RegExp(r'\border\b', caseSensitive: false), '');
    
    // Clean up multiple spaces but preserve line breaks and structure
    cleaned = cleaned.replaceAll(RegExp(r'[ \t]+'), ' '); // Replace multiple spaces/tabs with single space
    cleaned = cleaned.replaceAll(RegExp(r'\n[ \t]+'), '\n'); // Remove leading spaces after line breaks
    cleaned = cleaned.replaceAll(RegExp(r'[ \t]+\n'), '\n'); // Remove trailing spaces before line breaks
    cleaned = cleaned.replaceAll(RegExp(r'\n{3,}'), '\n\n'); // Replace 3+ line breaks with 2
    
    return cleaned.trim();
  }
}
