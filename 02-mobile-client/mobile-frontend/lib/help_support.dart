import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'config.dart';
import 'services/logging_service.dart';
import 'services/openai_service.dart';

class HelpSupportPage extends StatefulWidget {
  final String userId;
  const HelpSupportPage({Key? key, required this.userId}) : super(key: key);

  @override
  State<HelpSupportPage> createState() => _HelpSupportPageState();
}

class _HelpSupportPageState extends State<HelpSupportPage> {
  final TextEditingController _controller = TextEditingController();
  List<Map<String, dynamic>> _messages = [];
  bool _loading = false;
  String? _error;

  Future<String> get backendUrl async {
    final base = await Config.apiBaseUrl;
    return base.replaceFirst('/api', '');
  }

  @override
  void initState() {
    super.initState();
    _fetchHistory();
  }

  Future<void> _fetchHistory() async {
    setState(() { _loading = true; _error = null; });
    try {
      final bu = await backendUrl;
      final res = await http.get(Uri.parse('$bu/api/chat/history/${widget.userId}'));
      if (res.statusCode == 200) {
        final data = json.decode(res.body);
        setState(() {
          _messages = List<Map<String, dynamic>>.from(data['messages'] ?? []);
        });
      } else {
        setState(() { _messages = []; });
      }
    } catch (e) {
      setState(() { _error = 'Failed to load chat history.'; });
    } finally {
      setState(() { _loading = false; });
    }
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
    ];
    
    return menuKeywords.any((keyword) => lowerQuery.contains(keyword));
  }

  Future<void> _sendMessage() async {
    final text = _controller.text.trim();
    if (text.isEmpty) return;
    
    // Add user message to the chat immediately
    setState(() {
      _messages.add({
        'sender': 'user',
        'text': text,
        'timestamp': DateTime.now().toIso8601String(),
      });
    });
    _controller.clear();
    
    setState(() { _loading = true; _error = null; });
    
    try {
      String aiResponse;
      
      // Check if OpenAI is configured, use it for AI responses
      if (Config.isOpenAIConfigured) {
        // Check query type and provide specific responses
        if (_isAccountManagementQuery(text)) {
          aiResponse = OpenAIService.getAccountManagementHelp();
        } else if (_isBusinessHoursQuery(text)) {
          aiResponse = OpenAIService.getBusinessHoursHelp();
        } else if (_isBestSellerQuery(text)) {
          aiResponse = OpenAIService.getBestSellerHelp();
        } else if (_isMenuQuery(text)) {
          aiResponse = OpenAIService.getMenuHelp();
        } else {
          // Use OpenAI for AI responses
          try {
            aiResponse = await OpenAIService.getCustomerSupportResponse(
              customerQuery: text,
            );
          } catch (e) {
            // If OpenAI fails, use fallback response
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
      setState(() {
        _messages.add({
          'sender': 'ai',
          'text': aiResponse,
          'timestamp': DateTime.now().toIso8601String(),
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
    
    return Align(
      alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 4, horizontal: 8),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: isUser
              ? Colors.blue[100]
              : Colors.green[100],
          borderRadius: BorderRadius.circular(10),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              isUser ? 'You' : 'AI Support',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
            ),
            const SizedBox(height: 4),
            _buildMessageText(text),
          ],
        ),
      ),
    );
  }

  Widget _buildMessageText(String text) {
    // Check if the message contains the website URL
    if (text.contains('https://www.nomu.ph')) {
      final parts = text.split('https://www.nomu.ph');
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(parts[0]),
          const SizedBox(height: 8),
          GestureDetector(
            onTap: () {
              // Open website in browser
              // You can use url_launcher package for this
              LoggingService.instance.info('Opening NOMU website: https://www.nomu.ph');
            },
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: const Color(0xFF242C5B),
                borderRadius: BorderRadius.circular(6),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.language, color: Colors.white, size: 16),
                  const SizedBox(width: 8),
                  Text(
                    'Visit NOMU Website',
                    style: TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ),
          ),
          if (parts.length > 1) ...[
            const SizedBox(height: 8),
            Text(parts[1]),
          ],
        ],
      );
    }
    
    return Text(text);
  }

  Widget _buildRecommendationButtons() {
    return Container(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Quick Questions',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _buildRecommendationButton(
                  'What are the business hours?',
                  Icons.access_time,
                  Colors.blue[600]!,
                  () => _sendQuickMessage('What are the business hours?'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildRecommendationButton(
                  'What is the menu?',
                  Icons.restaurant_menu,
                  Colors.green[600]!,
                  () => _sendQuickMessage('What is the menu?'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildRecommendationButton(String text, IconData icon, Color color, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: color,
          borderRadius: BorderRadius.circular(8),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.2),
              blurRadius: 4,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: Colors.white, size: 18),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                text,
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w500,
                  fontSize: 13,
                ),
                textAlign: TextAlign.center,
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _sendQuickMessage(String message) {
    _controller.text = message;
    _sendMessage();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('AI Support')),
      body: Stack(
        children: [
          // Background image
          Positioned.fill(
            child: Image.asset(
              'assets/images/istetik.png',
              fit: BoxFit.cover,
            ),
          ),
          // Semi-transparent overlay for readability
          Positioned.fill(
            child: Container(
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
                  reverse: false,
                  itemCount: _messages.length,
                  itemBuilder: (context, idx) => _buildMessage(_messages[idx]),
                ),
              ),
              // Recommendation buttons
              if (_messages.isEmpty) _buildRecommendationButtons(),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _controller,
                      style: const TextStyle(color: Colors.black),
                      decoration: InputDecoration(
                        filled: true,
                        fillColor: Colors.white,
                        hintText: 'Type your message...',
                        hintStyle: const TextStyle(color: Colors.grey),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(8),
                          borderSide: const BorderSide(color: Colors.black12),
                        ),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      ),
                      onSubmitted: (_) => _sendMessage(),
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.send, color: Colors.white),
                    onPressed: _sendMessage,
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }
}
