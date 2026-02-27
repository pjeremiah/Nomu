import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:url_launcher/url_launcher.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'config.dart';
import 'services/logging_service.dart';
import 'services/openai_service.dart';
import 'theme/app_theme.dart';

class HelpSupportPage extends StatefulWidget {
  final String userId;
  const HelpSupportPage({Key? key, required this.userId}) : super(key: key);

  @override
  State<HelpSupportPage> createState() => _HelpSupportPageState();
}

class _HelpSupportPageState extends State<HelpSupportPage> {
  final TextEditingController _controller = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  List<Map<String, dynamic>> _messages = [];
  bool _loading = false;
  String? _error;
  bool _lastMessageWasQuickQuestion = false;

  Future<String> get backendUrl async {
    final base = await Config.apiBaseUrl;
    return base.replaceFirst('/api', '');
  }

  @override
  void initState() {
    super.initState();
    _fetchHistory();
  }

  @override
  void dispose() {
    _controller.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _scrollToBottom() {
    if (_scrollController.hasClients) {
      _scrollController.animateTo(
        _scrollController.position.maxScrollExtent,
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeOut,
      );
    }
  }

  Future<void> _fetchHistory() async {
    // Check if history was cleared using SharedPreferences FIRST
    final prefs = await SharedPreferences.getInstance();
    final historyClearedKey = 'chat_history_cleared_${widget.userId}';
    final isHistoryCleared = prefs.getBool(historyClearedKey) ?? false;
    
    if (isHistoryCleared) {
      LoggingService.instance.info('Skipping history fetch - history was cleared for user ${widget.userId}');
      setState(() {
        _messages = [];
        _loading = false;
      });
      return;
    }
    
    setState(() { _loading = true; _error = null; });
    try {
      final bu = await backendUrl;
      final res = await http.get(Uri.parse('$bu/api/chat/history/${widget.userId}'));
      if (res.statusCode == 200) {
        final data = json.decode(res.body);
        final fetchedMessages = List<Map<String, dynamic>>.from(data['messages'] ?? []);
        
        // Double-check the cleared flag before setting messages
        final stillCleared = prefs.getBool(historyClearedKey) ?? false;
        if (stillCleared) {
          LoggingService.instance.info('History was cleared during fetch, ignoring backend data');
          setState(() {
            _messages = [];
          });
          return;
        }
        
        setState(() {
          _messages = fetchedMessages;
        });
        
        // Scroll to bottom after loading history
        WidgetsBinding.instance.addPostFrameCallback((_) {
          _scrollToBottom();
        });
      } else {
        setState(() { _messages = []; });
      }
    } catch (e) {
      LoggingService.instance.error('Failed to fetch chat history', e);
      setState(() { 
        _messages = [];
        _error = null; // Don't show error for failed history fetch
      });
    } finally {
      setState(() { _loading = false; });
    }
  }

  Future<void> _clearChatHistory() async {
    try {
      // Clear locally first
      setState(() {
        _messages = [];
      });
      
      // Save cleared state to SharedPreferences IMMEDIATELY and PERSISTENTLY
      final prefs = await SharedPreferences.getInstance();
      final historyClearedKey = 'chat_history_cleared_${widget.userId}';
      await prefs.setBool(historyClearedKey, true);
      LoggingService.instance.info('Saved cleared state to SharedPreferences for user ${widget.userId}');
      
      // Also try to clear from backend (but don't fail if this doesn't work)
      try {
        final bu = await backendUrl;
        final endpoints = [
          '$bu/api/chat/history/${widget.userId}',
          '$bu/api/chat/${widget.userId}',
          '$bu/api/chat/clear/${widget.userId}',
        ];
        
        for (String endpoint in endpoints) {
          try {
            final res = await http.delete(Uri.parse(endpoint));
            if (res.statusCode == 200 || res.statusCode == 204) {
              LoggingService.instance.info('Successfully cleared chat history from: $endpoint');
              break;
            }
          } catch (e) {
            LoggingService.instance.warning('Failed to clear from $endpoint: $e');
            continue;
          }
        }
      } catch (e) {
        LoggingService.instance.warning('Backend clear failed, but local clear succeeded', e);
      }
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                Icon(Icons.check_circle, color: Colors.white, size: 20),
                SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Chat history has been permanently cleared.',
                    style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
            backgroundColor: const Color(0xFF2E7D32),
            duration: Duration(seconds: 3),
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            margin: EdgeInsets.all(16),
          ),
        );
      }
    } catch (e) {
      // If there's an error, still clear locally and save state
      setState(() {
        _messages = [];
      });
      
      final prefs = await SharedPreferences.getInstance();
      final historyClearedKey = 'chat_history_cleared_${widget.userId}';
      await prefs.setBool(historyClearedKey, true);
      LoggingService.instance.info('Saved cleared state to SharedPreferences (error case) for user ${widget.userId}');
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                Icon(Icons.check_circle, color: Colors.white, size: 20),
                SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Chat history has been cleared.',
                    style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
            backgroundColor: const Color(0xFF2E7D32),
            duration: Duration(seconds: 3),
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            margin: EdgeInsets.all(16),
          ),
        );
      }
    }
  }

  void _showClearHistoryDialog() {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => Dialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        elevation: 0,
        backgroundColor: Colors.transparent,
        child: Container(
          constraints: BoxConstraints(maxWidth: 340),
          decoration: BoxDecoration(
            color: AppTheme.neutral0,
            borderRadius: BorderRadius.circular(24),
            boxShadow: [
              BoxShadow(
                color: AppTheme.neutral900.withValues(alpha: 0.12),
                blurRadius: 24,
                offset: const Offset(0, 8),
              ),
            ],
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const SizedBox(height: 28),
              Container(
                width: 56,
                height: 56,
                decoration: BoxDecoration(
                  color: AppTheme.errorLight,
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.delete_outline_rounded,
                  color: AppTheme.error,
                  size: 28,
                ),
              ),
              const SizedBox(height: 20),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: Text(
                  'Clear Chat History',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w700,
                    color: AppTheme.neutral900,
                    letterSpacing: -0.3,
                  ),
                ),
              ),
              const SizedBox(height: 12),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: Text(
                  'Are you sure you want to permanently delete all your chat history? This action cannot be undone.',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 15,
                    height: 1.5,
                    color: AppTheme.neutral600,
                  ),
                ),
              ),
              const SizedBox(height: 28),
              Padding(
                padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
                child: Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () => Navigator.pop(context),
                        style: OutlinedButton.styleFrom(
                          backgroundColor: AppTheme.neutral0,
                          foregroundColor: const Color(0xFFB08D57),
                          side: const BorderSide(color: Color(0xFFB08D57)),
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        child: const Text('Cancel'),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () {
                          Navigator.pop(context);
                          _clearChatHistory();
                        },
                        style: OutlinedButton.styleFrom(
                          backgroundColor: AppTheme.neutral0,
                          foregroundColor: AppTheme.error,
                          side: const BorderSide(color: AppTheme.error),
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        child: const Text('Clear History'),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  bool _isAccountManagementQuery(String query) {
    final lowerQuery = query.toLowerCase();
    final accountKeywords = [
      'change password',
      'reset password',
      'forgot password',
      'update profile',
      'edit profile',
      'change personal info',
      'update personal information',
      'account settings',
      'profile settings',
      'change email',
      'change name',
      'update details',
      'account management',
      'password help',
      'profile help',
      'account help',
      'how to change',
      'how to update',
      'how to edit',
    ];
    
    return accountKeywords.any((keyword) => lowerQuery.contains(keyword));
  }

  bool _isBusinessHoursQuery(String query) {
    final lowerQuery = query.toLowerCase();
    final hoursKeywords = [
      'hours',
      'opening hours',
      'closing hours',
      'business hours',
      'store hours',
      'what time',
      'when open',
      'when close',
      'open today',
      'closed today',
      'operating hours',
      'working hours',
      'time',
      'schedule',
      'available',
      'open now',
      'is open',
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
      'sunday',
      'weekend',
      'weekday',
      'holiday',
      'holidays',
      'christmas',
      'new year',
      'easter',
      'thanksgiving',
      'valentine',
      'halloween',
      'special hours',
      'holiday hours',
      'announcement',
      'announcements',
    ];
    
    return hoursKeywords.any((keyword) => lowerQuery.contains(keyword));
  }

  bool _isBestSellerQuery(String query) {
    final lowerQuery = query.toLowerCase();
    final bestSellerKeywords = [
      'best seller',
      'best sellers',
      'popular',
      'popular items',
      'most popular',
      'top seller',
      'top sellers',
      'customer favorite',
      'favorites',
      'recommended',
      'what should i try',
      'must try',
      'signature',
      'signature items',
      'house special',
      'specialty',
      'starred items',
      'bestselling',
      'bestsellers',
      'trending',
      'hot items',
      'crowd favorite',
      'staff pick',
      'barista choice',
      'chef\'s choice'
    ];
    
    return bestSellerKeywords.any((keyword) => lowerQuery.contains(keyword));
  }

  bool _isMenuQuery(String query) {
    final lowerQuery = query.toLowerCase();
    final menuKeywords = [
      'menu',
      'show complete menu',
      'show me the complete menu',
      'what is the menu',
      'show me the menu',
      'full menu',
      'complete menu',
      'entire menu',
      'all items',
      'food',
      'drink',
      'coffee',
      'pizza',
      'pasta',
      'donut',
      'pastry',
      'price',
      'prices',
      'cost',
      'how much',
      'what do you have',
      'what can i order',
      'available',
      'recommend',
      'recommendation',
      'special',
      'new',
      'fresh',
      'delicious',
      'tasty',
      'order',
      'ordering',
      'takeout',
      'delivery',
      'catering',
      'group order',
      'large order',
      'vegetarian',
      'vegan',
      'gluten free',
      'dairy free',
      'allergy',
      'ingredients',
      'calories',
      'nutrition',
      'size',
      'small',
      'medium',
      'large',
      'extra large',
      'latte',
      'milk tea',
      'kumo',
      'cream',
      'americano',
      'cappuccino',
      'mocha',
      'macchiato',
      'croissant',
      'calzone',
      'neapolitan',
      'hokkaido',
      'truffle',
      'carbonara',
      'alfredo',
      'guanciale',
      'fiery',
      'creamy',
      'bacon',
      'pepperoni',
      'salame',
      'piccante',
      'savory',
      'spinach',
      'five cheese',
      'black truffle',
      'cheese',
      'pain suisse',
      'french butter',
      'blueberry',
      'mango',
      'crookie',
      'pain au chocolat',
      'almond',
      'hokkaido cheese',
      'vanilla flan',
      'brulee',
      'tart',
      'pistachio',
      'strawberry',
      'choco-berry',
      'kunefe',
      'garlic cream',
      'ham',
      'grilled',
      'original milky',
      'vanilla glaze',
      'oreo',
      'overload',
      'white chocolate',
      'dark chocolate',
      'cashew',
      'sprinkles',
      'matcha',
      'smores',
      'nomu milk tea',
      'wintermelon',
      'taro',
      'blue cotton candy',
      'mixed fruit',
      'tiger brown sugar',
      'mixed berries',
      'popping boba',
      'strawberry lemonade',
      'green tea',
      'honey citron',
      'ginger tea',
      'sakura',
      'honey lemon',
      'chia',
      'hot chocolate',
      'hot mint',
      'chiztill',
      'oolong',
      'jasmine',
      'kumo wintermelon',
      'kumo choco',
      'kumo nomu',
      'kumo taro',
      'kumo milo',
      'oreo',
      'kumo matcha',
      'kumo tiger',
      'kumo sakura',
      'kumo mixed',
      'kumo fresh',
      'cold brew',
      'orange long black',
      'flavored latte',
      'vanilla',
      'hazelnut',
      'salted caramel',
      'spanish latte',
      'chai latte',
      'ube vanilla',
      'mazagran',
      'lemon coffee',
      'coconut vanilla',
      'chocolate mocha',
      'white',
      'dark',
      'caramel macchiato',
      'macadamia',
      'butterscotch',
      'peachespresso',
      'shakerato',
      'mint latte',
      'honey oatmilk',
    ];

    return menuKeywords.any((keyword) => lowerQuery.contains(keyword));
  }

  Future<void> _sendMessage({bool isQuickQuestion = false}) async {
    final text = _controller.text.trim();
    if (text.isEmpty) return;

    // Do NOT clear the history-cleared flag when user sends a message. Keeping the flag
    // ensures we never refetch old messages from the backend (e.g. when user reopens
    // the chat), so cleared history stays gone permanently.

    // Track if this is a quick question
    _lastMessageWasQuickQuestion = isQuickQuestion;
    
    // Add user message to the chat immediately
    setState(() {
      _messages.add({
        'sender': 'user',
        'text': text,
        'timestamp': DateTime.now().toIso8601String(),
      });
    });
    
    _controller.clear();
    
    // Scroll to bottom after adding user message
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _scrollToBottom();
    });
    
    setState(() { _loading = true; _error = null; });
    
    try {
      String aiResponse;

      // Menu query: always show the same complete menu as nomu.cafe (whether or not OpenAI is configured)
      if (_isMenuQuery(text)) {
        aiResponse = OpenAIService.getMenuHelp();
      } else if (Config.isOpenAIConfigured) {
        // Check query type and provide specific responses
        if (_isAccountManagementQuery(text)) {
          aiResponse = OpenAIService.getAccountManagementHelp();
        } else if (_isBusinessHoursQuery(text)) {
          aiResponse = OpenAIService.getBusinessHoursHelp();
        } else if (_isBestSellerQuery(text)) {
          aiResponse = OpenAIService.getBestSellerHelp();
        } else {
          // Use OpenAI for AI responses with conversation history for context
          try {
            aiResponse = await OpenAIService.getCustomerSupportResponse(
              customerQuery: text,
              conversationHistory: _messages,
            );
          } catch (e) {
            // If OpenAI fails, use fallback response
            LoggingService.instance.error('OpenAI request failed', e);
            aiResponse = OpenAIService.getOutOfScopeResponse();
          }
        }
      } else {
        // Fallback to backend API
        final bu = await backendUrl;
        final res = await http.post(
          Uri.parse('$bu/api/chat'),
          headers: {'Content-Type': 'application/json'},
          body: json.encode({'userId': widget.userId, 'message': text}),
        );

        if (res.statusCode == 200) {
          final data = json.decode(res.body);
          final chatMessages = List<Map<String, dynamic>>.from(data['chat']['messages'] ?? []);
          // Find the latest AI response
          final aiMessages = chatMessages.where((msg) => msg['sender'] == 'ai').toList();
          aiResponse = aiMessages.isNotEmpty ? aiMessages.last['text'] ?? 'Sorry, I couldn\'t process your request.' : 'Sorry, I couldn\'t process your request.';
        } else {
          aiResponse = 'Sorry, I\'m having trouble connecting to our support system. Please try again later.';
        }
      }
      
      // Add AI response to the chat
      print('Adding AI response to chat. Length: ${aiResponse.length} characters');
      setState(() {
        _messages.add({
          'sender': 'ai',
          'text': aiResponse,
          'timestamp': DateTime.now().toIso8601String(),
        });
      });
      print('Message added. Total messages: ${_messages.length}');
      
      // Scroll to bottom after adding AI response to show it first
      WidgetsBinding.instance.addPostFrameCallback((_) {
        Future.delayed(Duration(milliseconds: 100), () {
          _scrollToBottom();
          // Scroll again to ensure AI response is fully visible
          Future.delayed(Duration(milliseconds: 200), () {
            _scrollToBottom();
          });
        });
      });
      
      // Save to backend if available
      if (Config.isOpenAIConfigured) {
        try {
          final bu = await backendUrl;
          await http.post(
            Uri.parse('$bu/api/chat'),
            headers: {'Content-Type': 'application/json'},
            body: json.encode({
              'userId': widget.userId, 
              'message': text,
              'response': aiResponse,
            }),
          );
        } catch (e) {
          // Backend save failed, but continue with the chat
          LoggingService.instance.error('Failed to save to backend', e);
        }
      }
      
    } catch (e) {
      setState(() { 
        _error = 'Failed to get response. Please try again.';
        // Remove the user message if there was an error
        if (_messages.isNotEmpty && _messages.last['sender'] == 'user') {
          _messages.removeLast();
        }
      });
    } finally {
      setState(() { _loading = false; });
    }
  }

  Widget _buildMessage(Map<String, dynamic> msg) {
    final sender = msg['sender'] ?? 'user';
    final isUser = sender == 'user';
    final text = msg['text'] ?? '';
    
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 16),
      child: Row(
        mainAxisAlignment: isUser ? MainAxisAlignment.end : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (!isUser) ...[
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(color: Color(0xFF242C5B), width: 1.5),
              ),
              child: Icon(Icons.support_agent_rounded, color: Color(0xFF242C5B), size: 18),
            ),
            SizedBox(width: 8),
          ],
          Flexible(
            child: Column(
              crossAxisAlignment: isUser ? CrossAxisAlignment.end : CrossAxisAlignment.start,
              children: [
                if (!isUser)
                  Padding(
                    padding: EdgeInsets.only(bottom: 4, left: 4),
                    child: Text(
                      'Nomu Chatbot',
                      style: TextStyle(
                        fontSize: 11,
                        color: Colors.grey[600],
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: isUser 
                        ? Color(0xFF242C5B).withValues(alpha: 0.1)
                        : Color(0xFF242C5B),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: Color(0xFF242C5B),
                      width: 1.5,
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.05),
                        blurRadius: 4,
                        offset: Offset(0, 2),
                        spreadRadius: 0,
                      ),
                    ],
                  ),
                  child: _buildMessageText(text, isUser),
                ),
              ],
            ),
          ),
          if (isUser) ...[
            SizedBox(width: 8),
            Padding(
              padding: EdgeInsets.only(top: 20),
              child: Text(
                'User',
                style: TextStyle(
                  fontSize: 11,
                  color: Colors.grey[600],
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
  
  /// Quick questions ordered by category: Cafe info (hours, menu) → Account support → External (website).
  Widget _buildWelcomeButtons() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Cafe info: hours & menu
        _buildWelcomeButton(
          Icons.access_time,
          'What are the business hours?',
          Colors.blue,
          () => _sendQuickMessage('What are the business hours?'),
        ),
        SizedBox(height: 10),
        _buildWelcomeButton(
          Icons.restaurant_menu,
          'Show Complete Menu',
          Colors.blue,
          () => _sendQuickMessage('Show Complete Menu'),
        ),
        SizedBox(height: 10),
        // Account & support
        _buildWelcomeButton(
          Icons.account_circle,
          'Account help',
          Colors.blue,
          () => _sendQuickMessage('Account help'),
        ),
        SizedBox(height: 10),
        // External: website
        _buildWelcomeButton(
          Icons.language,
          'Visit Nomu Cafe Website',
          Colors.blue,
          () => _openWebsite(),
        ),
      ],
    );
  }
  
  Widget _buildWelcomeButton(IconData icon, String text, Color textColor, VoidCallback onTap, {Color? borderColor}) {
    final effectiveBorderColor = borderColor ?? const Color(0xFF242C5B);
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: effectiveBorderColor,
              width: 2,
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.08),
                blurRadius: 8,
                offset: Offset(0, 2),
                spreadRadius: 0,
              ),
            ],
          ),
          child: Row(
            children: [
              Container(
                padding: EdgeInsets.all(6),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      Color(0xFF242C5B).withValues(alpha: 0.1),
                      Color(0xFF3A4A7A).withValues(alpha: 0.1),
                    ],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: Color(0xFF242C5B).withValues(alpha: 0.2),
                    width: 1,
                  ),
                ),
                child: Icon(
                  icon,
                  size: 18,
                  color: Color(0xFF242C5B),
                ),
              ),
              SizedBox(width: 12),
              Expanded(
                child: Text(
                  text,
                  style: TextStyle(
                    color: Color(0xFF242C5B),
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    letterSpacing: 0.2,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  static const Color _msgUserFg = Color(0xFF242C5B);
  static const Color _msgBotFg = Colors.white;

  /// Splits message text into logical lines for list/paragraph formatting.
  /// Converts run-on "1. ... 2. ..." and " - item" into separate lines.
  List<String> _messageToLines(String text) {
    if (text.trim().isEmpty) return [];
    String s = text
        .replaceAll('https://www.nomu.ph', 'https://nomu.cafe');
    // Break numbered list run-ons: " 1. ", " 2. ", ... " 9. "
    for (int i = 1; i <= 9; i++) {
      s = s.replaceAll(' $i. ', '\n$i. ');
    }
    // Break bullet run-ons: " - " -> newline + bullet
    s = s.replaceAll(' - ', '\n• ');
    final lines = s.split('\n').map((e) => e.trim()).toList();
    return lines;
  }

  /// Builds formatted message content (lists, headers, paragraphs) for readability.
  Widget _buildFormattedContent(String text, bool isUser) {
    final color = isUser ? _msgUserFg : _msgBotFg;
    final lines = _messageToLines(text);
    if (lines.isEmpty) {
      return SelectableText(
        text,
        style: TextStyle(fontSize: 14, color: color, height: 1.5, fontWeight: FontWeight.w500),
      );
    }

    final list = <Widget>[];
    for (int i = 0; i < lines.length; i++) {
      final line = lines[i];
      // Blank line: add vertical spacing (e.g. between menu and website message)
      if (line.isEmpty) {
        list.add(const SizedBox(height: 16));
        continue;
      }
      // Numbered list: "1. ...", "2. ..."
      final numMatch = RegExp(r'^(\d+)\.\s*(.*)$').firstMatch(line);
      if (numMatch != null) {
        list.add(Padding(
          padding: const EdgeInsets.only(bottom: 6),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '${numMatch.group(1)}. ',
                style: TextStyle(fontSize: 14, color: color, fontWeight: FontWeight.w700, height: 1.5),
              ),
              Expanded(
                child: SelectableText(
                  numMatch.group(2) ?? '',
                  style: TextStyle(fontSize: 14, color: color, height: 1.5, fontWeight: FontWeight.w500),
                ),
              ),
            ],
          ),
        ));
        continue;
      }
      // Bullet: "• ..." or "- ..."
      if (line.startsWith('•') || (line.startsWith('-') && line.length > 1)) {
        final content = line.replaceFirst(RegExp(r'^[•\-]\s*'), '').trim();
        list.add(Padding(
          padding: const EdgeInsets.only(bottom: 4),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.only(right: 8, top: 2),
                child: Text('•', style: TextStyle(fontSize: 14, color: color, fontWeight: FontWeight.w700)),
              ),
              Expanded(
                child: SelectableText(
                  content,
                  style: TextStyle(fontSize: 14, color: color, height: 1.5, fontWeight: FontWeight.w500),
                ),
              ),
            ],
          ),
        ));
        continue;
      }
      // Section header: menu category line (——— CATEGORY ———), ALL CAPS, or category-like
      final isMenuCategoryLine = line.startsWith('———');
      final isCaps = line.length >= 2 && line.length <= 50 && line == line.toUpperCase();
      final isCategory = line.startsWith('PASTAS') || line.startsWith('PIZZAS') ||
          line.startsWith('DONUTS') || line.startsWith('DRINKS') || line.startsWith('CALZONE') ||
          line.startsWith('COFFEE') || line.startsWith('Add-Ons') || line.startsWith('Coffee Series') ||
          line.startsWith('Pizza Add-Ons') || line.startsWith('Drink Add-Ons') || line.startsWith('Coffee Add-Ons') ||
          line.startsWith('Milk Tea') || line.startsWith('Hot & Iced') || line.startsWith('Kumo Cream') ||
          line.startsWith('🍕') || line.startsWith('🍝') || line.startsWith('🍩') || line.startsWith('🥤');
      if (isMenuCategoryLine || isCaps || isCategory) {
        list.add(Padding(
          padding: const EdgeInsets.only(top: 8, bottom: 4),
          child: SelectableText(
            line,
            style: TextStyle(
              fontSize: 15,
              color: color,
              fontWeight: FontWeight.w700,
              height: 1.4,
            ),
          ),
        ));
        continue;
      }
      // Paragraph
      list.add(Padding(
        padding: const EdgeInsets.only(bottom: 6),
        child: SelectableText(
          line,
          style: TextStyle(fontSize: 14, color: color, height: 1.5, fontWeight: FontWeight.w500),
        ),
      ));
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: list,
    );
  }

  Widget _buildMessageText(String text, bool isUser) {
    // Check if the message contains website URLs
    if (text.contains('https://www.nomu.ph') || text.contains('https://nomu.cafe')) {
      String updatedText = text.replaceAll('https://www.nomu.ph', 'https://nomu.cafe');
      final parts = updatedText.split('https://nomu.cafe');
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildFormattedContent(parts[0], isUser),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            child: Center(
              child: GestureDetector(
                onTap: _openWebsite,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFF242C5B), width: 2),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.1),
                        blurRadius: 4,
                        offset: const Offset(0, 2),
                        spreadRadius: 0,
                      ),
                    ],
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.language, color: const Color(0xFF242C5B), size: 18),
                      const SizedBox(width: 10),
                      Text(
                        'Visit Nomu Cafe Website',
                        style: TextStyle(
                          color: const Color(0xFF242C5B),
                          fontWeight: FontWeight.w600,
                          fontSize: 14,
                          letterSpacing: 0.3,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
          if (parts.length > 1) ...[
            const SizedBox(height: 12),
            _buildFormattedContent(parts[1], isUser),
          ],
        ],
      );
    }

    return _buildFormattedContent(text, isUser);
  }

  Widget _buildWelcomeMessage() {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 16),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              border: Border.all(color: Colors.black, width: 1.5),
            ),
            child: Icon(Icons.support_agent_rounded, color: Colors.black, size: 18),
          ),
          SizedBox(width: 8),
          Flexible(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Padding(
                  padding: EdgeInsets.only(bottom: 4, left: 4),
                  child: Text(
                    'Nomu Chatbot',
                    style: TextStyle(
                      fontSize: 11,
                      color: Colors.grey[600],
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.grey[300]!, width: 1),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Hi there! I\'m your Nomu Chatbot. How can I help you today?',
                        style: TextStyle(
                          fontSize: 14,
                          color: Colors.grey[800],
                          height: 1.5,
                        ),
                      ),
                      SizedBox(height: 12),
                      _buildWelcomeButtons(),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }


  void _sendQuickMessage(String message) {
    _controller.text = message;
    _sendMessage(isQuickQuestion: true);
  }

  Future<void> _openWebsite() async {
    const url = 'https://nomu.cafe';
    final uri = Uri.parse(url);
    try {
      // Try to open in external browser (works when manifest has <queries> for https on Android 11+)
      final launched = await launchUrl(
        uri,
        mode: LaunchMode.externalApplication,
      );
      if (launched) {
        LoggingService.instance.info('Opened Nomu website: $url');
      } else {
        _showWebsiteError(url);
      }
    } catch (e) {
      LoggingService.instance.error('Error opening website', e);
      _showWebsiteError(url);
    }
  }

  void _showWebsiteError(String url) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          'Could not open browser. Please visit $url manually.',
          style: TextStyle(fontSize: 14),
          maxLines: 3,
          overflow: TextOverflow.ellipsis,
        ),
        backgroundColor: Colors.red[600],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        elevation: 0,
        backgroundColor: Colors.transparent,
        iconTheme: const IconThemeData(color: Colors.white),
        leading: IconButton(
          icon: const Icon(Icons.close, size: 20),
          onPressed: () => Navigator.pop(context),
          padding: EdgeInsets.zero,
        ),
        title: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.support_agent_rounded, size: 28, color: Colors.white),
            const SizedBox(width: 12),
            const Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  'Nomu Chatbot',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w600,
                    color: Colors.white,
                  ),
                ),
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.circle, size: 8, color: Colors.greenAccent),
                    SizedBox(width: 6),
                    Text(
                      'Online',
                      style: TextStyle(
                        fontSize: 11,
                        color: Colors.white70,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ],
        ),
        centerTitle: true,
        actions: [
          if (_messages.isNotEmpty)
            IconButton(
              icon: const Icon(Icons.delete_outline, size: 20),
              onPressed: _showClearHistoryDialog,
              tooltip: 'Clear Chat History',
              padding: EdgeInsets.zero,
            ),
        ],
        flexibleSpace: Container(
          decoration: const BoxDecoration(
            image: DecorationImage(
              image: AssetImage('assets/images/istetik.png'),
              fit: BoxFit.cover,
            ),
          ),
        ),
      ),
      body: Stack(
        children: [
          // Clean white background
          Positioned.fill(
            child: Container(
              color: Colors.grey[50],
            ),
          ),
          // Chat content
          Column(
            children: [
              if (_loading) const LinearProgressIndicator(),
              if (_error != null)
                Padding(
                  padding: const EdgeInsets.all(8.0),
                  child: Text(_error!, style: TextStyle(color: Colors.red)),
                ),
              Expanded(
                child: ListView.builder(
                  controller: _scrollController,
                  reverse: false,
                  padding: EdgeInsets.only(top: 16, bottom: 16),
                  itemCount: _messages.isEmpty ? 1 : _messages.length + (_lastMessageWasQuickQuestion && !_loading ? 1 : 0),
                  itemBuilder: (context, idx) {
                    if (_messages.isEmpty) {
                      // Show welcome message when no messages
                      return _buildWelcomeMessage();
                    }
                    if (!_loading && _lastMessageWasQuickQuestion && idx == _messages.length) {
                      // Show quick questions after quick question responses
                      return Padding(
                        padding: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Quick Questions',
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.bold,
                                color: Colors.grey[700],
                                letterSpacing: 0.3,
                              ),
                            ),
                            SizedBox(height: 12),
                            _buildWelcomeButtons(),
                          ],
                        ),
                      );
                    }
                    return _buildMessage(_messages[idx]);
                  },
                ),
              ),
              Container(
                padding: EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                decoration: BoxDecoration(
                  color: Colors.white,
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.08),
                      blurRadius: 15,
                      offset: Offset(0, -3),
                      spreadRadius: 0,
                    ),
                  ],
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Container(
                        decoration: BoxDecoration(
                          color: Colors.grey[50],
                          borderRadius: BorderRadius.circular(2),
                          border: Border.all(
                            color: Colors.grey[300]!,
                            width: 1.5,
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.05),
                              blurRadius: 8,
                              offset: Offset(0, 2),
                              spreadRadius: 0,
                            ),
                          ],
                        ),
                        child: TextField(
                          controller: _controller,
                          style: TextStyle(
                            color: Colors.grey[900],
                            fontSize: 14,
                            fontWeight: FontWeight.w500,
                          ),
                          decoration: InputDecoration(
                            hintText: 'Send a message...',
                            hintStyle: TextStyle(
                              color: Colors.grey[500],
                              fontSize: 14,
                              fontWeight: FontWeight.normal,
                            ),
                            border: InputBorder.none,
                            contentPadding: EdgeInsets.symmetric(
                              horizontal: 20,
                              vertical: 14,
                            ),
                            prefixIcon: Icon(
                              Icons.edit_outlined,
                              color: Colors.grey[600],
                              size: 20,
                            ),
                            prefixIconConstraints: BoxConstraints(
                              minWidth: 40,
                              minHeight: 40,
                            ),
                          ),
                          maxLines: null,
                          textCapitalization: TextCapitalization.sentences,
                          onSubmitted: (_) => _sendMessage(),
                        ),
                      ),
                    ),
                    SizedBox(width: 12),
                    Container(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: [Color(0xFF242C5B), Color(0xFF3A4A7A)],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        borderRadius: BorderRadius.circular(6),
                        boxShadow: [
                          BoxShadow(
                            color: Color(0xFF242C5B).withValues(alpha: 0.4),
                            blurRadius: 8,
                            offset: Offset(0, 3),
                            spreadRadius: 0,
                          ),
                        ],
                      ),
                      child: Material(
                        color: Colors.transparent,
                        child: InkWell(
                          onTap: _loading ? null : _sendMessage,
                          borderRadius: BorderRadius.circular(24),
                          child: Container(
                            width: 48,
                            height: 48,
                            padding: EdgeInsets.all(12),
                            child: _loading
                                ? SizedBox(
                                    width: 20,
                                    height: 20,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                      valueColor: AlwaysStoppedAnimation<Color>(
                                        Colors.white,
                                      ),
                                    ),
                                  )
                                : Icon(
                                    Icons.send_rounded,
                                    color: Colors.white,
                                    size: 22,
                                  ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
