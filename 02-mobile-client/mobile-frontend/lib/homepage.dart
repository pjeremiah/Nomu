import 'package:flutter/material.dart';
import 'package:carousel_slider/carousel_slider.dart';
import 'usermodel.dart';
import 'map_page.dart';
import 'loyalty_page.dart';
import 'profile_page.dart';
import 'screens/promos_screen.dart';
import 'services/promo_service.dart';
import 'models/promo.dart';
import 'widgets/promo_card.dart';
import 'api/api.dart';
import 'services/socket_service.dart';
import 'services/logging_service.dart';
import 'services/cache_service.dart';
import 'dart:async';
import 'package:video_player/video_player.dart';

// Helper function to get appropriate icon for different item types
String _getItemIcon(String itemType, String category) {
  switch (itemType.toLowerCase()) {
    case 'drink':
      if (category.toLowerCase().contains('coffee') || category.toLowerCase().contains('latte')) {
        return 'assets/images/coffee.png';
      } else if (category.toLowerCase().contains('milk') || category.toLowerCase().contains('tea')) {
        return 'assets/images/coffee.png'; // Using coffee icon for milk teas
      } else {
        return 'assets/images/coffee.png';
      }
    case 'pizza':
      return 'assets/images/pastry.png'; // Using pastry icon for pizza
    case 'pasta':
      return 'assets/images/pastry.png'; // Using pastry icon for pasta
    case 'calzone':
      return 'assets/images/pastry.png'; // Using pastry icon for calzone
    case 'pastry':
      return 'assets/images/pastry.png';
    case 'donut':
      return 'assets/images/donut.png';
    case 'food':
      return 'assets/images/pastry.png'; // Generic food icon
    default:
      return 'assets/images/coffee.png'; // Default to coffee icon
  }
}

// Helper function to get item type display name
String _getItemTypeDisplayName(String itemType) {
  switch (itemType.toLowerCase()) {
    case 'drink':
      return 'Drink';
    case 'pizza':
      return 'Pizza';
    case 'pasta':
      return 'Pasta';
    case 'calzone':
      return 'Calzone';
    case 'pastry':
      return 'Pastry';
    case 'donut':
      return 'Donut';
    case 'food':
      return 'Food';
    default:
      return 'Item';
  }
}

class WidgetBot extends StatefulWidget {
  final UserModel user;

  const WidgetBot({super.key, required this.user});

  @override
  State<WidgetBot> createState() => _WidgetBotState();
}

class _WidgetBotState extends State<WidgetBot> with TickerProviderStateMixin {
  int _currentIndex = 0;
  int? points;
  bool isLoadingPoints = true;
  String? pointsError;
  late UserModel _user;
  
  // Stream subscriptions for real-time updates
  StreamSubscription<Map<String, dynamic>>? _loyaltyPointSubscription;
  
  // Promo state
  List<Promo> _activePromos = [];
  bool _isLoadingPromos = true;
  String? _promoError;
  
  
  
  // Animation controllers
  late AnimationController _fadeController;
  late AnimationController _slideController;
  late AnimationController _scaleController;
  final CarouselSliderController _carouselController = CarouselSliderController();
  late AnimationController _coffeeIconRotationController;
  
  // Global key for LoyaltyPage to access its methods
  final GlobalKey _loyaltyPageKey = GlobalKey();
  
  // Animations
  late Animation<double> _fadeAnimation;
  late Animation<Offset> _slideAnimation;
  late Animation<double> _scaleAnimation;

  final List<String> _labels = ['Home', 'Maps', 'Loyalty', 'Profile'];

  // Lazy load screens to improve performance
  Widget _getScreen(int index) {
    switch (index) {
      case 0:
        return const MapPage();
      case 1:
        return LoyaltyPage(
          key: _loyaltyPageKey,
          qrToken: _user.qrToken,
          initialPoints: points,
          onPointsUpdated: fetchPoints,
          onPointsChanged: (newPoints) {
            // Update homepage points when loyalty page points change
            if (mounted) {
              setState(() {
                points = newPoints;
              });
            }
          }
        );
      case 2:
        return ProfilePage(
          userData: _user.toJson(),
          onUserUpdated: (updatedUser) {
            LoggingService.instance.homepage('User updated from ProfilePage', {
              'newProfilePictureLength': updatedUser.profilePicture.length,
            });
            setState(() {
              _user = updatedUser;
            });
          },
        );
      default:
        return const SizedBox.shrink();
    }
  }

  @override
  void initState() {
    super.initState();
    _user = widget.user;
    
    // Debug: Log user data to see what's being received
    LoggingService.instance.homepage('User data received', {
      'userId': _user.id,
      'fullName': _user.fullName,
      'username': _user.username,
      'email': _user.email,
      'qrToken': _user.qrToken,
      'points': _user.points,
      'birthday': _user.birthday,
      'gender': _user.gender,
      'profilePicture': _user.profilePicture.isNotEmpty ? 'EXISTS (${_user.profilePicture.length} chars)' : 'EMPTY',
    });
    
    
    // Initialize animation controllers
    _fadeController = AnimationController(
      duration: const Duration(milliseconds: 1500),
      vsync: this,
    );
    _slideController = AnimationController(
      duration: const Duration(milliseconds: 1200),
      vsync: this,
    );
    _scaleController = AnimationController(
      duration: const Duration(milliseconds: 800),
      vsync: this,
    );
    _coffeeIconRotationController = AnimationController(
      duration: const Duration(milliseconds: 800),
      vsync: this,
      upperBound: 1.0,
      lowerBound: 0.0,
    );
    
    // Initialize animations
    _fadeAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _fadeController, curve: Curves.easeInOut),
    );
    _slideAnimation = Tween<Offset>(
      begin: const Offset(0, 0.3),
      end: Offset.zero,
    ).animate(CurvedAnimation(parent: _slideController, curve: Curves.easeOutCubic));
    _scaleAnimation = Tween<double>(begin: 0.8, end: 1.0).animate(
      CurvedAnimation(parent: _scaleController, curve: Curves.elasticOut),
    );
    
    // Start animations immediately
    _fadeController.forward();
    _slideController.forward();
    _scaleController.forward();
    _coffeeIconRotationController.value = 0.0;
    
    // Initialize socket service for real-time updates (only once)
    _initializeSocketService();
    
    // Defer data fetching until after first frame
    WidgetsBinding.instance.addPostFrameCallback((_) {
      fetchPoints();
      fetchActivePromos();
    });
  }

  // Initialize socket service for real-time updates
  Future<void> _initializeSocketService() async {
    try {
      LoggingService.instance.homepage('Initializing socket service...');
      
      // Check if socket is already connected
      final currentStatus = SocketService.instance.getConnectionStatus();
      if (currentStatus['isConnected'] == true) {
        LoggingService.instance.homepage('Socket already connected, setting up listeners');
        _setupSocketListeners();
        return;
      }
      
      // Initialize socket service (this now waits for connection)
      await SocketService.instance.initialize();
      
      // Test connection
      final connectionStatus = SocketService.instance.getConnectionStatus();
      LoggingService.instance.homepage('Socket connection status', connectionStatus);
      
      if (connectionStatus['isConnected']) {
        LoggingService.instance.homepage('Socket connected successfully');
        
        // Test the connection
        final pingResult = await SocketService.instance.pingServer();
        LoggingService.instance.homepage('Socket ping result: $pingResult');
        
        // Set up real-time listeners
        _setupSocketListeners();
      } else {
        LoggingService.instance.warning('Socket connection failed, will retry automatically');
        // Set up listeners anyway - they will work when connection is established
        _setupSocketListeners();
      }
    } catch (e) {
      LoggingService.instance.error('Error initializing socket service', e);
      // Set up listeners anyway - they will work when connection is established
      _setupSocketListeners();
    }
  }

  // Set up socket listeners for real-time updates
  void _setupSocketListeners() {
    try {
      LoggingService.instance.homepage('Setting up socket listeners...');
      
      // Listen for loyalty point updates
      _loyaltyPointSubscription?.cancel();
      _loyaltyPointSubscription = SocketService.instance.loyaltyPointStream.listen((data) async {
        LoggingService.instance.homepage('Received loyalty point update', {
          'data': data,
          'currentUserQrToken': _user.qrToken,
          'currentUserId': _user.id,
          'socketConnected': SocketService.instance.isConnected,
        });
        
        // Update points immediately from socket data
        final newPoints = data['points'] as int?;
        final qrToken = data['qrToken'] as String?;
        final userId = data['userId'] as String?;
        
        // Only update if this is for the current user
        if (mounted && newPoints != null && 
            (qrToken == _user.qrToken || userId == _user.id)) {
          LoggingService.instance.homepage('Updating points immediately to: $newPoints');
          
          // Clear cache to ensure fresh data on next fetch
          await CacheService.clearCache('user_qr_${_user.qrToken}');
          
          setState(() {
            points = newPoints;
            isLoadingPoints = false;
          });
          
          // Also update the LoyaltyPage directly if it exists
          if (_loyaltyPageKey.currentState != null) {
            (_loyaltyPageKey.currentState as dynamic).updatePointsFromExternal(newPoints);
          }
          
          // Show notification
          final drink = data['drink'] as String?;
          final message = drink != null 
              ? 'New order: $drink! You now have $newPoints stamps'
              : 'Points updated! You now have $newPoints stamps';
              
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Row(
                children: [
                  const Icon(Icons.star, color: Colors.yellow, size: 20),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      message,
                      style: const TextStyle(fontWeight: FontWeight.w500),
                    ),
                  ),
                ],
              ),
              backgroundColor: const Color(0xFF242C5B),
              duration: const Duration(seconds: 4),
              behavior: SnackBarBehavior.floating,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(10),
              ),
              action: SnackBarAction(
                label: 'Refresh',
                textColor: Colors.white,
                onPressed: () {
                  fetchPoints();
                  if (_loyaltyPageKey.currentState != null) {
                    (_loyaltyPageKey.currentState as dynamic).forceRefreshPoints();
                  }
                },
              ),
            ),
          );
          }
        } else {
          LoggingService.instance.homepage('Update not for current user, ignoring');
        }
      });
      
      
      LoggingService.instance.homepage('Socket listeners set up successfully');
    } catch (e) {
      LoggingService.instance.error('Error setting up socket listeners', e);
    }
  }

  @override
  void dispose() {
    LoggingService.instance.homepage('Disposing homepage resources...');
    
    // Cancel all stream subscriptions
    _loyaltyPointSubscription?.cancel();
    
    // Dispose animation controllers
    _fadeController.dispose();
    _slideController.dispose();
    _scaleController.dispose();
    _coffeeIconRotationController.dispose();
    
    // Note: We don't disconnect the socket service here because it's a singleton
    // that might be used by other parts of the app. The socket service will be
    // properly reset during logout by the LogoutService.
    
    LoggingService.instance.homepage('Homepage resources disposed');
    super.dispose();
    }

  Future<void> fetchUserData() async {
    if (!mounted) return;
    
    try {
      // Fetch updated user data including orders
      if (_user.qrToken.isNotEmpty) {
        final response = await ApiService.getUserByQrToken(_user.qrToken);
        if (response != null) {
          if (mounted) {
            setState(() {
              // Store current points before updating user data
              final currentPoints = points;
              final serverPoints = response['points'] ?? 0;
              
              // Update the user data with fresh information from the server
              _user = UserModel.fromJson(response);
              
              // Only update points if server has higher points or if we don't have points yet
              // This prevents points from being reset to 0 during refresh
              if (currentPoints == null || serverPoints > currentPoints) {
                points = serverPoints;
                LoggingService.instance.homepage('Points updated from server: $serverPoints (was: $currentPoints)');
              } else if (serverPoints == 0 && currentPoints > 0) {
                // Extra protection: If server returns 0 points but we have points, keep current points
                LoggingService.instance.homepage('DEBUGGING PROTECTION: Server returned 0 points but we have $currentPoints, keeping current points');
              } else {
                LoggingService.instance.homepage('Keeping current points: $currentPoints (server: $serverPoints)');
              }
            });
            LoggingService.instance.homepage('User data refreshed successfully', {
              'lastOrder': _user.lastOrder,
              'pastOrdersCount': _user.pastOrders.length,
              'currentPoints': points,
              'serverPoints': response['points'] ?? 0,
            });
          }
        }
      }
    } catch (e) {
      LoggingService.instance.error('Error fetching user data during refresh', e);
      // Show error message for rate limiting
      if (mounted && e.toString().contains('Too many requests')) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Too many requests. Please try again later.'),
            backgroundColor: Colors.orange,
            duration: const Duration(seconds: 3),
          ),
        );
      }
      // Don't update user data if there's an error, keep existing data
    }
  }

  Future<void> fetchPoints() async {
    if (!mounted) return;
    setState(() {
      isLoadingPoints = true;
      pointsError = null;
    });
    
    try {
      // Use the user data that's already available instead of trying to fetch by QR token
      if (_user.qrToken.isNotEmpty) {
        final response = await ApiService.getUserByQrToken(_user.qrToken);
        if (response != null) {
          if (mounted) {
            setState(() {
              points = response['points'] ?? 0;
              isLoadingPoints = false;
            });
          }
        } else {
          // If QR token lookup fails, use the user data we already have
          if (mounted) {
            setState(() {
              points = _user.points;
              isLoadingPoints = false;
            });
          }
        }
      } else {
        // If no QR token, use the user data we already have
        if (mounted) {
          setState(() {
            points = _user.points;
            isLoadingPoints = false;
          });
        }
      }
    } catch (e) {
      // If there's an error, use the user data we already have
      if (mounted) {
        setState(() {
          points = _user.points;
          isLoadingPoints = false;
        });
        // Show error message for rate limiting
        if (e.toString().contains('Too many requests')) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Too many requests. Please try again later.'),
              backgroundColor: Colors.orange,
              duration: const Duration(seconds: 3),
            ),
          );
        }
      }
    }
  }

  Future<void> fetchActivePromos() async {
    try {
      setState(() {
        _isLoadingPromos = true;
        _promoError = null;
      });
      
      final promos = await PromoService.getActivePromos();
      
      if (mounted) {
        setState(() {
          _activePromos = promos;
          _isLoadingPromos = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _promoError = e.toString();
          _isLoadingPromos = false;
        });
      }
    }
  }

  // Handle pull-to-refresh
  Future<void> _handleRefresh() async {
    LoggingService.instance.homepage('Pull-to-refresh triggered');
    
    try {
      // Show a brief loading indicator
      if (mounted) {
        setState(() {
          // You can add loading states here if needed
        });
      }
      
      // Refresh user data, points, and promos
      await Future.wait([
        fetchUserData(),
        fetchPoints(),
        fetchActivePromos(),
      ]);
      
      LoggingService.instance.homepage('Pull-to-refresh completed successfully');
      
      // Show success feedback
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(Icons.check_circle, color: Colors.green, size: 20),
                const SizedBox(width: 8),
                const Text(
                  'Content refreshed successfully!',
                  style: TextStyle(fontWeight: FontWeight.w500),
                ),
              ],
            ),
            backgroundColor: const Color(0xFF242C5B),
            duration: const Duration(seconds: 2),
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(10),
            ),
          ),
        );
      }
    } catch (e) {
      LoggingService.instance.error('Error during pull-to-refresh', e);
      
      // Show error feedback
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(Icons.error, color: Colors.red, size: 20),
                const SizedBox(width: 8),
                const Text(
                  'Failed to refresh content. Please try again.',
                  style: TextStyle(fontWeight: FontWeight.w500),
                ),
              ],
            ),
            backgroundColor: Colors.red[600],
            duration: const Duration(seconds: 3),
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(10),
            ),
          ),
        );
      }
    }
  }



  @override
  Widget build(BuildContext context) {
    final screen = MediaQuery.of(context).size;
    final padding = MediaQuery.of(context).padding;

    if (_currentIndex == 0) {
      String lastOrder = _user.lastOrder;
      List<Map<String, dynamic>> pastOrders = _user.pastOrders;
      return Scaffold(
        body: Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [
                Color(0xFFF8F9FA),
                Color(0xFFE9ECEF),
                Color(0xFFDEE2E6),
              ],
            ),
          ),
          child: SafeArea(
            child: LayoutBuilder(
              builder: (context, constraints) {
                return RefreshIndicator(
                  onRefresh: _handleRefresh,
                  color: const Color(0xFF242C5B),
                  backgroundColor: Colors.white,
                  strokeWidth: 2.0,
                  child: SingleChildScrollView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: EdgeInsets.symmetric(horizontal: screen.width * 0.05),
                    child: ConstrainedBox(
                      constraints: BoxConstraints(
                        minHeight: constraints.maxHeight - padding.top - padding.bottom - 80, // Account for bottom nav
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          SizedBox(height: screen.height * 0.03),
                          // Animated Greeting
                          FadeTransition(
                            opacity: _fadeAnimation,
                            child: SlideTransition(
                              position: _slideAnimation,
                              child: _buildAnimatedGreeting(screen),
                            ),
                          ),
                          SizedBox(height: screen.height * 0.02),
                          // Animated Carousel
                          ScaleTransition(
                            scale: _scaleAnimation,
                            child: _buildEnhancedCarousel(screen),
                          ),
                          SizedBox(height: screen.height * 0.02),
                          // Animated Stats
                          FadeTransition(
                            opacity: _fadeAnimation,
                            child: _buildEnhancedStatsSection(),
                          ),
                          SizedBox(height: screen.height * 0.02),
                          // What's New Section
                          FadeTransition(
                            opacity: _fadeAnimation,
                            child: _buildWhatsNewSection(screen),
                          ),
                          SizedBox(height: screen.height * 0.02),
                          // Promos Section
                          FadeTransition(
                            opacity: _fadeAnimation,
                            child: _buildPromosSection(screen),
                          ),
                          SizedBox(height: screen.height * 0.02),
                          // Animated Last Order
                          SlideTransition(
                            position: _slideAnimation,
                            child: _buildEnhancedLastOrderCard(screen, lastOrder, pastOrders),
                          ),
                          SizedBox(height: screen.height * 0.02),
                          // Animated Thank You Message
                          FadeTransition(
                            opacity: _fadeAnimation,
                            child: _buildEnhancedThankYouMessage(screen),
                          ),
                          SizedBox(height: screen.height * 0.03),
                        ],
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
        ),
        bottomNavigationBar: _buildEnhancedBottomNavBar(screen),
      );
    } else {
      return Scaffold(
        backgroundColor: Theme.of(context).scaffoldBackgroundColor,
        body: _getScreen(_currentIndex - 1),
        bottomNavigationBar: _buildEnhancedBottomNavBar(screen),
      );
    }
  }

  Widget _buildAnimatedGreeting(Size screen) {
    final currentTime = DateTime.now();
    final hour = currentTime.hour;
    final isMorning = hour < 12;
    final isAfternoon = hour >= 12 && hour < 17;
    
    return Container(
      margin: EdgeInsets.symmetric(horizontal: screen.width * 0.05),
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF242C5B), Color(0xFF3A4A8C)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF242C5B).withValues(alpha: 0.2),
            blurRadius: 12,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Row(
        children: [
          // Time-based icon
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(
              isMorning 
                  ? Icons.wb_sunny_rounded
                  : isAfternoon 
                      ? Icons.wb_sunny_outlined
                      : Icons.nightlight_round,
              color: Colors.white,
              size: 22,
            ),
          ),
          const SizedBox(width: 16),
          // Greeting text
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _getGreeting(),
                  style: const TextStyle(
                    fontSize: 14,
                    color: Colors.white70,
                    fontWeight: FontWeight.w500,
                    letterSpacing: 0.5,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  _user.fullName.isNotEmpty ? _user.fullName : 'Guest',
                  style: const TextStyle(
                    fontSize: 20,
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                    letterSpacing: -0.3,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          // Animated coffee icon
          AnimatedBuilder(
            animation: _coffeeIconRotationController,
            builder: (context, child) {
              return Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Center(
                  child: Transform.rotate(
                    angle: _coffeeIconRotationController.value * 2 * 3.14159,
                    child: const Icon(
                      Icons.coffee_rounded,
                      color: Colors.white,
                      size: 22,
                    ),
                  ),
                ),
              );
            },
          ),
        ],
      ),
    );
  }

  String _getGreeting() {
    final hour = DateTime.now().hour;
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  }

  Widget _buildEnhancedStatsSection() {
    return Container(
      margin: EdgeInsets.symmetric(horizontal: MediaQuery.of(context).size.width * 0.05),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFF242C5B).withValues(alpha: 0.1)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF242C5B), Color(0xFF3A4A8C)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Center(
              child: Image.asset(
                'assets/images/iskor.png',
                width: 18,
                height: 18,
                fit: BoxFit.contain,
                color: Colors.white,
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Loyalty Stamps',
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey[600],
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  isLoadingPoints
                      ? 'Loading...'
                      : pointsError != null
                          ? 'Error loading'
                          : '${points ?? 0} of 10 stamps',
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF242C5B),
                  ),
                ),
              ],
            ),
          ),
          // Progress indicator
          Container(
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: Colors.grey[200],
              borderRadius: BorderRadius.circular(2),
            ),
            child: FractionallySizedBox(
              alignment: Alignment.centerLeft,
              widthFactor: (points ?? 0) / 10,
              child: Container(
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF242C5B), Color(0xFF3A4A8C)],
                  ),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }



  Widget _buildWhatsNewSection(Size screen) {
    return Container(
      margin: EdgeInsets.symmetric(horizontal: screen.width * 0.05),
      child: Text(
        "What's New",
        style: TextStyle(
          fontSize: screen.width < 400 ? 18 : 20,
          fontWeight: FontWeight.bold,
          color: const Color(0xFF242C5B),
          letterSpacing: -0.5,
        ),
      ),
    );
  }

  Widget _buildPromosSection(Size screen) {
    final isSmallScreen = screen.width < 400;
    final isMediumScreen = screen.width < 600;
    
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Section Header
        Container(
          margin: EdgeInsets.symmetric(horizontal: screen.width * 0.05),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    "Special Offers",
                    style: TextStyle(
                      fontSize: isSmallScreen ? 20 : (isMediumScreen ? 22 : 24),
                      fontWeight: FontWeight.bold,
                      color: const Color(0xFF242C5B),
                      letterSpacing: -0.5,
                    ),
                  ),
                  if (_activePromos.isNotEmpty)
                    TextButton(
                      onPressed: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(builder: (context) => const PromosScreen()),
                        );
                      },
                      child: Text(
                        'View All',
                        style: TextStyle(
                          color: const Color(0xFF242C5B),
                          fontWeight: FontWeight.w600,
                          fontSize: isSmallScreen ? 14 : 16,
                        ),
                      ),
                    ),
                ],
              ),
              SizedBox(height: isSmallScreen ? 4 : 6),
              Text(
                "Discover our latest promotions and exclusive deals",
                style: TextStyle(
                  fontSize: isSmallScreen ? 12 : 14,
                  color: Colors.grey[600],
                  fontWeight: FontWeight.w400,
                ),
              ),
            ],
          ),
        ),
        SizedBox(height: screen.height * 0.02),
        
        // Promos List
        if (_isLoadingPromos)
          Container(
            height: screen.height * 0.25,
            margin: EdgeInsets.symmetric(horizontal: screen.width * 0.05),
            decoration: BoxDecoration(
              color: Colors.grey[100],
              borderRadius: BorderRadius.circular(isSmallScreen ? 12 : 16),
            ),
            child: const Center(
              child: CircularProgressIndicator(
                valueColor: AlwaysStoppedAnimation<Color>(Color(0xFFB08D57)),
              ),
            ),
          )
        else if (_promoError != null)
          Container(
            height: screen.height * 0.25,
            margin: EdgeInsets.symmetric(horizontal: screen.width * 0.05),
            decoration: BoxDecoration(
              color: Colors.grey[100],
              borderRadius: BorderRadius.circular(isSmallScreen ? 12 : 16),
            ),
            child: Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.error_outline, color: Colors.grey, size: 48),
                  const SizedBox(height: 8),
                  Text(
                    'Failed to load promos',
                    style: TextStyle(color: Colors.grey[600]),
                  ),
                  const SizedBox(height: 8),
                  ElevatedButton(
                    onPressed: fetchActivePromos,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFB08D57),
                      foregroundColor: Colors.white,
                    ),
                    child: const Text('Retry'),
                  ),
                ],
              ),
            ),
          )
        else if (_activePromos.isEmpty)
          Container(
            height: screen.height * 0.25,
            margin: EdgeInsets.symmetric(horizontal: screen.width * 0.05),
            decoration: BoxDecoration(
              color: Colors.grey[100],
              borderRadius: BorderRadius.circular(isSmallScreen ? 12 : 16),
            ),
            child: const Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.local_offer_outlined, color: Colors.grey, size: 48),
                  SizedBox(height: 8),
                  Text(
                    'No active promotions',
                    style: TextStyle(color: Colors.grey),
                  ),
                ],
              ),
            ),
          )
        else
          PromoCarousel(
            promos: _activePromos,
            height: 0, // Let it use responsive height
            padding: EdgeInsets.symmetric(horizontal: screen.width * 0.02), // Reduced padding for more card space
            onPromoTap: (promo) {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (context) => const PromosScreen()),
              );
            },
          ),
      ],
    );
  }







  Widget _buildEnhancedCarousel(Size screen) {
    final carouselHeight = screen.height < 600 ? screen.height * 0.25 : screen.height * 0.3;

    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(25),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.15),
            blurRadius: 25,
            offset: const Offset(0, 15),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(25),
        child: SizedBox(
          width: screen.width * 0.9,
          height: carouselHeight,
          child: CarouselSlider(
            carouselController: _carouselController,
            items: [
              CarouselVideo(
                videoAsset: 'assets/videos/dap.mp4',
              ),
              CarouselImage(
                imageAsset: 'assets/images/nomudisplay.jpg',
              ),
              CarouselImage(
                imageAsset: 'assets/images/nomudisplay2.jpg',
              ),
              CarouselImage(
                imageAsset: 'assets/images/nomudisplay3.jpg',
              ),
            ],
            options: CarouselOptions(
              height: carouselHeight,
              enlargeCenterPage: true,
              autoPlay: true, // Always enable autoplay
              autoPlayInterval: Duration(seconds: 5),
              autoPlayAnimationDuration: Duration(milliseconds: 800),
              aspectRatio: 16 / 9,
              viewportFraction: screen.width < 400 ? 0.9 : 0.85,
              enableInfiniteScroll: true,
              pauseAutoPlayOnTouch: true,
              pauseAutoPlayOnManualNavigate: true,
              onPageChanged: (index, reason) {
                // Animate coffee icon rotation on page change
                _coffeeIconRotationController.forward(from: 0.0);
              },
            ),
          ),
        ),
      ),
    );
  }



  Widget _buildEnhancedLastOrderCard(Size screen, String lastOrder, List<Map<String, dynamic>> pastOrders) {
    // Show only the last 5 orders on the home page for better UX
    final List<Map<String, dynamic>> last5Orders = pastOrders.length > 5
        ? pastOrders.sublist(pastOrders.length - 5)
        : pastOrders;
    
    // Adaptive sizing
    final titleFontSize = screen.width < 400 ? screen.width * 0.055 : screen.width * 0.06;
    final headerPadding = screen.width < 400 ? 16.0 : 20.0;
    final contentPadding = screen.width < 400 ? 16.0 : 20.0;
    final emptyStateIconSize = screen.height < 600 ? 60.0 : 80.0;
    final emptyStateFontSize = screen.width < 400 ? screen.width * 0.045 : screen.width * 0.05;
    final emptyStateSubFontSize = screen.width < 400 ? screen.width * 0.035 : screen.width * 0.04;
    
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.08),
            blurRadius: 20,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(20),
        child: Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              colors: [Colors.white, Color(0xFFFAFBFC)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header
              Container(
                padding: EdgeInsets.all(headerPadding),
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    colors: [Color(0xFF242C5B), Color(0xFF3A4A8C)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.2),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: const Icon(
                            Icons.receipt_long,
                            color: Colors.white,
                            size: 20,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Text(
                          'Recent Orders',
                          style: TextStyle(
                            fontSize: titleFontSize,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                      ],
                    ),
                    if (pastOrders.length > 5)
                      GestureDetector(
                        onTap: () => _showPastOrdersPopup(context, pastOrders),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.2),
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(color: Colors.white.withValues(alpha: 0.3)),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(
                                'View All',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: screen.width < 400 ? 12 : 14,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                              const SizedBox(width: 4),
                              const Icon(
                                Icons.arrow_forward_ios,
                                color: Colors.white,
                                size: 12,
                              ),
                            ],
                          ),
                        ),
                      ),
                  ],
                ),
              ),
              // Content
              Container(
                padding: EdgeInsets.all(contentPadding),
                child: last5Orders.isEmpty
                    ? _buildEmptyOrderState(screen, emptyStateIconSize, emptyStateFontSize, emptyStateSubFontSize)
                    : Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          for (int i = last5Orders.length - 1; i >= 0; i--)
                            _buildEnhancedOrderListTile(last5Orders[i], i == last5Orders.length - 1),
                        ],
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildEmptyOrderState(Size screen, double iconSize, double titleSize, double subtitleSize) {
    return Container(
      padding: EdgeInsets.all(screen.height < 600 ? 30 : 40),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: Colors.grey[100],
              shape: BoxShape.circle,
            ),
            child: Icon(
              Icons.shopping_bag_outlined,
              size: iconSize,
              color: Colors.grey[400],
            ),
          ),
          SizedBox(height: screen.height < 600 ? 16 : 20),
          Text(
            'No recent orders',
            style: TextStyle(
              fontSize: titleSize,
              fontWeight: FontWeight.w600,
              color: Colors.grey[700],
            ),
          ),
          SizedBox(height: screen.height < 600 ? 8 : 10),
          Center(
            child: Text(
              'Your order history will appear here\nwhen you place your first order',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: subtitleSize,
                color: Colors.grey[500],
                height: 1.4,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEnhancedOrderListTile(Map<String, dynamic> order, bool isLast) {
    final date = DateTime.tryParse(order['date'].toString());
    final isRecent = date != null && DateTime.now().difference(date).inHours < 24;
    
    // Support both old and new order structure for backward compatibility
    final items = order['items'] as List<dynamic>?;
    final isMultipleItems = items != null && items.isNotEmpty;
    
    // For multiple items, use the first item for main display
    final firstItem = isMultipleItems ? items.first : order;
    final itemName = firstItem['itemName'] ?? order['itemName'] ?? order['drink'] ?? 'Unknown Item';
    final itemType = firstItem['itemType'] ?? order['itemType'] ?? 'drink';
    final category = firstItem['category'] ?? order['category'] ?? 'coffee';
    
    return Container(
      margin: EdgeInsets.only(bottom: isLast ? 0 : 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isRecent ? const Color(0xFF242C5B).withValues(alpha: 0.1) : Colors.grey.withValues(alpha: 0.1),
          width: 1,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          // Order Icon with Status
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: isRecent 
                    ? [const Color(0xFF242C5B), const Color(0xFF3A4A8C)]
                    : [Colors.grey[400]!, Colors.grey[500]!],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Stack(
              children: [
                Center(
                  child: Image.asset(
                    _getItemIcon(itemType, category),
                    width: 24,
                    height: 24,
                    fit: BoxFit.contain,
                    color: Colors.white,
                  ),
                ),
                if (isRecent)
                  Positioned(
                    top: 0,
                    right: 0,
                    child: Container(
                      width: 12,
                      height: 12,
                      decoration: const BoxDecoration(
                        color: Colors.green,
                        shape: BoxShape.circle,
                      ),
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(width: 16),
          // Order Details
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        isMultipleItems 
                            ? '${itemName} +${items.length - 1} more'
                            : itemName,
                        style: TextStyle(
                          fontWeight: FontWeight.w600,
                          fontSize: 16,
                          color: isRecent ? const Color(0xFF242C5B) : Colors.grey[700],
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    if (isRecent)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: Colors.green.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Text(
                          'Recent',
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w600,
                            color: Colors.green,
                          ),
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 4),
                // Item type and price row
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: const Color(0xFF242C5B).withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        isMultipleItems 
                            ? '${items.length} items'
                            : _getItemTypeDisplayName(itemType),
                        style: const TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w600,
                          color: Color(0xFF242C5B),
                        ),
                      ),
                    ),
                  ],
                ),
                // Show item breakdown for multiple items
                if (isMultipleItems && items.length > 1) ...[
                  const SizedBox(height: 4),
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: Colors.grey[50],
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: Colors.grey[200]!),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Items in this order:',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: Colors.grey[700],
                          ),
                        ),
                        const SizedBox(height: 4),
                        ...items.take(3).map((item) => Padding(
                          padding: const EdgeInsets.only(bottom: 2),
                          child: Row(
                            children: [
                              Container(
                                width: 4,
                                height: 4,
                                decoration: const BoxDecoration(
                                  color: Color(0xFF242C5B),
                                  shape: BoxShape.circle,
                                ),
                              ),
                              const SizedBox(width: 6),
                              Expanded(
                                child: Text(
                                  '${item['itemName']} (${_getItemTypeDisplayName(item['itemType'] ?? 'item')})',
                                  style: TextStyle(
                                    fontSize: 10,
                                    color: Colors.grey[600],
                                  ),
                                ),
                              ),
                            ],
                          ),
                        )).toList(),
                        if (items.length > 3)
                          Text(
                            '... and ${items.length - 3} more items',
                            style: TextStyle(
                              fontSize: 10,
                              fontStyle: FontStyle.italic,
                              color: Colors.grey[500],
                            ),
                          ),
                      ],
                    ),
                  ),
                ],
                const SizedBox(height: 4),
                if (date != null) ...[
                  Row(
                    children: [
                      Icon(
                        Icons.access_time,
                        size: 14,
                        color: Colors.grey[500],
                      ),
                      const SizedBox(width: 4),
                      Text(
                        _formatOrderDate(date),
                        style: TextStyle(
                          fontSize: 13,
                          color: Colors.grey[600],
                        ),
                      ),
                    ],
                  ),
                ],
              ],
            ),
          ),
          // Arrow
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: Colors.grey[100],
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(
              Icons.arrow_forward_ios,
              size: 14,
              color: Colors.grey[600],
            ),
          ),
        ],
      ),
    );
  }

  String _formatOrderDate(DateTime date) {
    final now = DateTime.now();
    final difference = now.difference(date);
    
    if (difference.inMinutes < 60) {
      return '${difference.inMinutes}m ago';
    } else if (difference.inHours < 24) {
      return '${difference.inHours}h ago';
    } else if (difference.inDays < 7) {
      return '${difference.inDays}d ago';
    } else {
      return '${date.day}/${date.month}/${date.year}';
    }
  }

  void _showPastOrdersPopup(BuildContext context, List<Map<String, dynamic>> pastOrders) {
    final screen = MediaQuery.of(context).size;
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Row(
          children: [
            Container(
              padding: EdgeInsets.all(screen.width < 400 ? 6 : 8),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF242C5B), Color(0xFF3A4A8C)],
                ),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(Icons.history, color: Colors.white, size: screen.width < 400 ? 18 : 20),
            ),
            SizedBox(width: screen.width < 400 ? 8 : 10),
            const Text('Past Orders'),
          ],
        ),
        content: SizedBox(
          width: double.maxFinite,
          // Constrain the height to avoid overflow
          height: screen.height * 0.6,
          child: pastOrders.isEmpty
              ? Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.coffee_outlined, size: screen.height < 600 ? 40 : 50, color: Colors.grey[400]),
                    SizedBox(height: screen.height < 600 ? 8 : 10),
                    const Text('No past orders.'),
                  ],
                )
              : ListView.builder(
                  shrinkWrap: true,
                  itemCount: pastOrders.length,
                  itemBuilder: (context, index) {
                    // Show most recent first
                    final order = pastOrders[pastOrders.length - 1 - index];
                    final date = DateTime.tryParse(order['date'].toString());
                    
                    // Support both old and new order structure for backward compatibility
                    final items = order['items'] as List<dynamic>?;
                    final isMultipleItems = items != null && items.isNotEmpty;
                    
                    // For multiple items, use the first item for main display
                    final firstItem = isMultipleItems ? items.first : order;
                    final itemName = firstItem['itemName'] ?? order['itemName'] ?? order['drink'] ?? 'Unknown Item';
                    final itemType = firstItem['itemType'] ?? order['itemType'] ?? 'drink';
                    final category = firstItem['category'] ?? order['category'] ?? 'coffee';
                    
                    return Container(
                      margin: const EdgeInsets.only(bottom: 8),
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.grey[50],
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(6),
                            decoration: BoxDecoration(
                              color: const Color(0xFF242C5B),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Image.asset(
                              _getItemIcon(itemType, category),
                              width: 16,
                              height: 16,
                              color: Colors.white,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  isMultipleItems 
                                      ? '${itemName} +${items.length - 1} more'
                                      : itemName,
                                  style: const TextStyle(fontWeight: FontWeight.w600),
                                ),
                                const SizedBox(height: 2),
                                Row(
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                                      decoration: BoxDecoration(
                                        color: const Color(0xFF242C5B).withValues(alpha: 0.1),
                                        borderRadius: BorderRadius.circular(4),
                                      ),
                                      child: Text(
                                        isMultipleItems 
                                            ? '${items.length} items'
                                            : _getItemTypeDisplayName(itemType),
                                        style: const TextStyle(
                                          fontSize: 10,
                                          fontWeight: FontWeight.w600,
                                          color: Color(0xFF242C5B),
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                // Show item breakdown for multiple items in past orders
                                if (isMultipleItems && items.length > 1) ...[
                                  const SizedBox(height: 4),
                                  Container(
                                    padding: const EdgeInsets.all(6),
                                    decoration: BoxDecoration(
                                      color: Colors.grey[100],
                                      borderRadius: BorderRadius.circular(6),
                                    ),
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          'Items:',
                                          style: TextStyle(
                                            fontSize: 10,
                                            fontWeight: FontWeight.w600,
                                            color: Colors.grey[700],
                                          ),
                                        ),
                                        const SizedBox(height: 2),
                                        ...items.take(2).map((item) => Padding(
                                          padding: const EdgeInsets.only(bottom: 1),
                                          child: Text(
                                            '• ${item['itemName']} (${_getItemTypeDisplayName(item['itemType'] ?? 'item')})',
                                            style: TextStyle(
                                              fontSize: 9,
                                              color: Colors.grey[600],
                                            ),
                                          ),
                                        )).toList(),
                                        if (items.length > 2)
                                          Text(
                                            '• ... and ${items.length - 2} more',
                                            style: TextStyle(
                                              fontSize: 9,
                                              fontStyle: FontStyle.italic,
                                              color: Colors.grey[500],
                                            ),
                                          ),
                                      ],
                                    ),
                                  ),
                                ],
                                if (date != null)
                                  Text(
                                    '${date.toLocal()}',
                                    style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                                  ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    );
                  },
                ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }

  Widget _buildEnhancedThankYouMessage(Size screen) {
    // Adaptive sizing
    final padding = screen.width < 400 ? 16.0 : 20.0;
    final fontSize = screen.width < 400 ? screen.width * 0.035 : screen.width * 0.04;
    final iconSize = screen.width < 400 ? 18.0 : 20.0;
    final spacing = screen.width < 400 ? 8.0 : 10.0;
    
    return Container(
      padding: EdgeInsets.all(padding),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF242C5B), Color(0xFF3A4A8C)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF242C5B).withValues(alpha: 0.3),
            blurRadius: 15,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.favorite,
            color: Colors.white,
            size: iconSize,
          ),
          SizedBox(width: spacing),
          Flexible(
            child: Text(
              'Thank you for choosing Nomu Cafe ☕',
              style: TextStyle(
                fontSize: fontSize,
                fontWeight: FontWeight.w600,
                color: Colors.white,
              ),
              textAlign: TextAlign.center,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEnhancedBottomNavBar(Size screen) {
    // Adaptive height and sizing
    final navHeight = screen.height < 600 ? 48.0 : 60.0;
    final iconSize = screen.height < 600 ? 18.0 : 22.0;
    final selectedIconSize = screen.height < 600 ? 22.0 : 26.0;
    final fontSize = screen.height < 600 ? 8.0 : 10.0;
    final padding = screen.height < 600 ? 2.0 : 6.0;
    
    return SafeArea(
      bottom: true,
      top: false,
      left: false,
      right: false,
      child: Container(
        height: navHeight,
        clipBehavior: Clip.hardEdge,
        decoration: BoxDecoration(
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.1),
              blurRadius: 20,
              offset: const Offset(0, -5),
            ),
          ],
        ),
        child: Stack(
          children: [
            Positioned.fill(
              child: ClipRRect(
                borderRadius: BorderRadius.zero,
                child: Image.asset(
                  'assets/images/istetik.png',
                  fit: BoxFit.cover,
                ),
              ),
            ),
            Container(
              padding: EdgeInsets.symmetric(vertical: padding),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: List.generate(_labels.length, (index) {
                  final isSelected = _currentIndex == index;
                  final iconPath = _getCustomIconPath(index);
                  return GestureDetector(
                    onTap: () {
                      LoggingService.instance.homepage('Switching to tab $index: ${_labels[index]}', {
                        'profilePictureLength': _user.profilePicture.length,
                      });
                      setState(() => _currentIndex = index);
                    },
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 300),
                      padding: EdgeInsets.symmetric(
                        horizontal: screen.width < 400 ? 4 : 8, 
                        vertical: screen.height < 600 ? 0 : 2
                      ),
                      decoration: BoxDecoration(
                        color: isSelected ? Colors.white.withValues(alpha: 0.3) : Colors.transparent,
                        borderRadius: BorderRadius.circular(15),
                        border: isSelected
                            ? Border.all(color: Colors.white.withValues(alpha: 0.5), width: 1)
                            : null,
                      ),
                      child: SizedBox(
                        height: navHeight - (2 * padding),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            AnimatedContainer(
                              duration: const Duration(milliseconds: 300),
                              child: Image.asset(
                                iconPath,
                                height: isSelected ? selectedIconSize : iconSize,
                                width: isSelected ? selectedIconSize : iconSize,
                                fit: BoxFit.cover,
                              ),
                            ),
                            SizedBox(height: screen.height < 600 ? 0 : 2),
                            Text(
                              _labels[index],
                              style: TextStyle(
                                color: isSelected ? Colors.white : Colors.white70,
                                fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                                fontSize: fontSize,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ),
                    ),
                  );
                }),
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _getCustomIconPath(int index) {
    switch (index) {
      case 0:
        return 'assets/images/nomutrans.png';
      case 1:
        return 'assets/images/mapicon.jpg';
      case 2:
        return 'assets/images/loyaltyicon.png';
      case 3:
        return 'assets/images/usericon.png';
      default:
        return 'assets/images/nomutrans.png';
    }
  }
}

class CarouselImage extends StatefulWidget {
  final String imageAsset;
  
  const CarouselImage({
    super.key, 
    required this.imageAsset,
  });

  @override
  State<CarouselImage> createState() => _CarouselImageState();
}

class _CarouselImageState extends State<CarouselImage> {
  @override
  void initState() {
    super.initState();
  }

  @override
  Widget build(BuildContext context) {
    LoggingService.instance.homepage('Building asset image: ${widget.imageAsset}');
    return LayoutBuilder(
      builder: (context, constraints) {
        return Container(
          width: constraints.maxWidth,
          height: constraints.maxHeight,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(25),
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(25),
            child: Image.asset(
              widget.imageAsset,
              fit: BoxFit.cover,
              width: constraints.maxWidth,
              height: constraints.maxHeight,
              cacheWidth: constraints.maxWidth.round(),
              cacheHeight: constraints.maxHeight.round(),
              isAntiAlias: true,
              filterQuality: FilterQuality.medium,
              errorBuilder: (context, error, stackTrace) {
                LoggingService.instance.error('Error loading asset: ${widget.imageAsset}', error);
                return _buildErrorWidget();
              },
            ),
          ),
        );
      },
    );
  }

  Widget _buildErrorWidget() {
    return Container(
      color: Colors.grey[300],
      child: const Center(
        child: Icon(
          Icons.image_not_supported,
          size: 50,
          color: Colors.grey,
        ),
      ),
    );
  }
}

class CarouselVideo extends StatefulWidget {
  final String videoAsset;
  
  const CarouselVideo({
    super.key, 
    required this.videoAsset,
  });

  @override
  State<CarouselVideo> createState() => _CarouselVideoState();
}

class _CarouselVideoState extends State<CarouselVideo> {
  late VideoPlayerController _controller;
  bool _isInitialized = false;
  bool _hasError = false;

  @override
  void initState() {
    super.initState();
    _initializeVideo();
  }

  Future<void> _initializeVideo() async {
    try {
      _controller = VideoPlayerController.asset(widget.videoAsset);
      await _controller.initialize();
      
      if (mounted) {
        setState(() {
          _isInitialized = true;
        });
        
        // Start playing the video (muted)
        _controller.setVolume(0.0); // Mute the video
        _controller.play();
        _controller.setLooping(true);
      }
    } catch (e) {
      LoggingService.instance.error('Error initializing video: ${widget.videoAsset}', e);
      if (mounted) {
        setState(() {
          _hasError = true;
        });
      }
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        return Container(
          width: constraints.maxWidth,
          height: constraints.maxHeight,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(25),
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(25),
            child: _hasError
                ? _buildErrorWidget()
                : !_isInitialized
                    ? _buildLoadingWidget()
                    : VideoPlayer(_controller),
          ),
        );
      },
    );
  }

  Widget _buildErrorWidget() {
    return Container(
      color: Colors.grey[300],
      child: const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.videocam_off,
              size: 50,
              color: Colors.grey,
            ),
            SizedBox(height: 8),
            Text(
              'Video Error',
              style: TextStyle(
                color: Colors.grey,
                fontSize: 16,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLoadingWidget() {
    return Container(
      color: Colors.grey[300],
      child: const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            CircularProgressIndicator(),
            SizedBox(height: 8),
            Text(
              'Loading Video...',
              style: TextStyle(
                color: Colors.grey,
                fontSize: 16,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
