import 'package:flutter/material.dart';
import 'package:timezone/timezone.dart' as tz;
import 'usermodel.dart';
import 'map_page.dart';
import 'loyalty_page.dart';
import 'profile_page.dart';
import 'services/promo_service.dart';
import 'models/promo.dart';
import 'widgets/promo_card.dart';
import 'api/api.dart';
import 'services/socket_service.dart';
import 'services/logging_service.dart';
import 'services/cache_service.dart';
import 'dart:async';
import 'package:intl/intl.dart';
import 'package:video_player/video_player.dart';
import 'package:visibility_detector/visibility_detector.dart';
import 'past_orders_page.dart';
import 'order_line_display.dart';
import 'order_type_icon.dart';
import 'theme/app_theme.dart';
import 'logout_confirmation_dialog.dart';

/// Formats an order date as "Xm ago", "Xh ago", "Xd ago", or "MMM d, y".
String formatOrderDate(DateTime date) {
  final now = DateTime.now();
  final difference = now.difference(date);
  if (difference.inMinutes < 60) {
    return '${difference.inMinutes}m ago';
  } else if (difference.inHours < 24) {
    return '${difference.inHours}h ago';
  } else if (difference.inDays < 7) {
    return '${difference.inDays}d ago';
  } else {
    return DateFormat('MMM d, y').format(date);
  }
}

/// Bulleted order line: dot aligned with first text line; quantity as `N pcs` below when > 1.
Widget _orderLineBulletRow({
  required String rawName,
  required Map<String, dynamic> line,
  required String typeDisplayName,
  required int quantity,
  double dotSize = 6,
  double dotTopPadding = 5,
  double gapAfterDot = 10,
  required TextStyle primaryStyle,
  TextStyle? quantityStyle,
}) {
  final primary = orderLineBulletPrimaryLabel(rawName, line, typeDisplayName);
  final qtyLine = orderLineBulletQuantityLine(quantity);
  final baseSize = primaryStyle.fontSize ?? 14;
  final qStyle = quantityStyle ??
      primaryStyle.copyWith(
        fontSize: baseSize - 1,
        color: Colors.grey[600],
        fontWeight: FontWeight.w500,
      );
  return Row(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Padding(
        padding: EdgeInsets.only(top: dotTopPadding),
        child: Container(
          width: dotSize,
          height: dotSize,
          decoration: const BoxDecoration(
            color: Color(0xFF242C5B),
            shape: BoxShape.circle,
          ),
        ),
      ),
      SizedBox(width: gapAfterDot),
      Expanded(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(primary, style: primaryStyle),
            if (qtyLine != null) ...[
              const SizedBox(height: 2),
              Text(qtyLine, style: qStyle),
            ],
          ],
        ),
      ),
    ],
  );
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

class _WidgetBotState extends State<WidgetBot> with TickerProviderStateMixin, WidgetsBindingObserver {
  int _currentIndex = 0;
  int? points;
  bool isLoadingPoints = true;
  String? pointsError;
  late UserModel _user;
  
  // Stream subscriptions for real-time updates
  StreamSubscription<Map<String, dynamic>>? _loyaltyPointSubscription;
  StreamSubscription<Map<String, dynamic>>? _promosUpdatedSubscription;
  StreamSubscription<Map<String, dynamic>>? _newPromoCreatedSubscription;
  StreamSubscription<Map<String, dynamic>>? _promoDeletedSubscription;
  
  // Promo state
  List<Promo> _activePromos = [];
  bool _isLoadingPromos = true;
  String? _promoError;
  Timer? _promoRefreshTimer;
  Timer? _greetingRefreshTimer;
  int? _lastPhilippinesHour;
  
  // Animation controllers
  late AnimationController _fadeController;
  late AnimationController _slideController;
  late AnimationController _scaleController;
  late AnimationController _coffeeIconRotationController;
  
  // Global key for LoyaltyPage to access its methods
  final GlobalKey _loyaltyPageKey = GlobalKey();
  
  // Animations
  late Animation<double> _fadeAnimation;
  late Animation<Offset> _slideAnimation;
  late Animation<double> _scaleAnimation;

  final List<String> _labels = ['Home', 'Maps', 'Loyalty', 'Profile'];

  // UI theme from image: dark blue, white, light gray, lighter blue highlight, gold accent
  static const Color _kDarkBlue = Color(0xFF242C5B);
  static const Color _kLightBlueHighlight = Color(0xFF5B7FB5);
  static const Color _kGoldAccent = Color(0xFFB08D57);
  // Good Morning section icon container – boxed look, same curve for both icons
  static const double _kGreetingIconRadius = 6.0;

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
    
    WidgetsBinding.instance.addObserver(this);
    // Initialize socket service for real-time updates (only once)
    _initializeSocketService();
    
    // Defer data fetching until after first frame
    WidgetsBinding.instance.addPostFrameCallback((_) {
      fetchPoints();
      fetchActivePromos();
      _startPromoRefreshTimer();
      _startGreetingRefreshTimer();
    });
  }

  void _startGreetingRefreshTimer() {
    _greetingRefreshTimer?.cancel();
    _lastPhilippinesHour = _hourInPhilippines();
    _greetingRefreshTimer = Timer.periodic(const Duration(minutes: 1), (_) {
      if (!mounted) return;
      final hour = _hourInPhilippines();
      if (hour != _lastPhilippinesHour) {
        _lastPhilippinesHour = hour;
        setState(() {});
      }
    });
  }

  void _startPromoRefreshTimer() {
    _promoRefreshTimer?.cancel();
    _promoRefreshTimer = Timer.periodic(const Duration(seconds: 45), (_) {
      if (mounted) fetchActivePromos();
    });
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed && mounted) {
      fetchActivePromos();
    }
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
        final rawPts = data['points'];
        final int? newPoints = rawPts is num
            ? rawPts.toInt()
            : int.tryParse(rawPts?.toString() ?? '');
        final qrToken = data['qrToken'] as String?;
        final userId = data['userId'] as String?;
        final rawPa = data['pointsAdded'];
        final int pointsAdded =
            rawPa is num ? rawPa.toInt() : int.tryParse(rawPa?.toString() ?? '') ?? 0;
        
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
          
          if (pointsAdded > 0 && mounted) {
            final drink = data['itemName'] as String? ?? data['drink'] as String?;
            final message = drink != null
                ? 'New order: $drink! You now have $newPoints stamps'
                : 'Points updated! You now have $newPoints stamps';
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
                backgroundColor: const Color(0xFF4CAF50),
                duration: const Duration(seconds: 4),
                behavior: SnackBarBehavior.floating,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10),
                ),
              ),
            );
          }
        } else {
          LoggingService.instance.homepage('Update not for current user, ignoring');
        }
      });
      
      // Listen for promo updates from admin (add/update/delete/expire) so Special Offers stays in sync
      void onPromoEvent(Map<String, dynamic> data) {
        if (!mounted) return;
        LoggingService.instance.homepage('Promo change from admin, refreshing list', data);
        fetchActivePromos();
      }
      _promosUpdatedSubscription?.cancel();
      _promosUpdatedSubscription = SocketService.instance.promoUpdatedStream.listen(onPromoEvent);
      _newPromoCreatedSubscription?.cancel();
      _newPromoCreatedSubscription = SocketService.instance.newPromoCreatedStream.listen(onPromoEvent);
      _promoDeletedSubscription?.cancel();
      _promoDeletedSubscription = SocketService.instance.promoDeletedStream.listen(onPromoEvent);
      
      LoggingService.instance.homepage('Socket listeners set up successfully');
    } catch (e) {
      LoggingService.instance.error('Error setting up socket listeners', e);
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    LoggingService.instance.homepage('Disposing homepage resources...');
    
    // Cancel all stream subscriptions
    _loyaltyPointSubscription?.cancel();
    _promosUpdatedSubscription?.cancel();
    _newPromoCreatedSubscription?.cancel();
    _promoDeletedSubscription?.cancel();
    _promoRefreshTimer?.cancel();
    _greetingRefreshTimer?.cancel();
    
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



  /// Home tab body (extracted for use with AnimatedSwitcher).
  /// All sections use the same horizontal padding so widths are consistent.
  static const double _kHomeHorizontalPaddingFraction = 0.05;

  Widget _buildHomeBody(Size screen, EdgeInsets padding) {
    String lastOrder = _user.lastOrder;
    List<Map<String, dynamic>> pastOrders = _user.pastOrders;
    const double sectionSpacing = 24.0;
    final double contentPadding = screen.width * _kHomeHorizontalPaddingFraction;
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            Color(0xFFF8F6F3),
            Color(0xFFF2F0EB),
            Color(0xFFEBE8E3),
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
                padding: EdgeInsets.symmetric(horizontal: contentPadding),
                child: ConstrainedBox(
                  constraints: BoxConstraints(
                    minHeight: (constraints.maxHeight - padding.top - padding.bottom - 80)
                        .clamp(0.0, double.infinity),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      SizedBox(height: screen.height * 0.028),
                      FadeTransition(
                        opacity: _fadeAnimation,
                        child: SlideTransition(
                          position: _slideAnimation,
                          child: _buildAnimatedGreeting(screen),
                        ),
                      ),
                      SizedBox(height: sectionSpacing),
                      ScaleTransition(
                        scale: _scaleAnimation,
                        child: _buildHighlightVideo(screen),
                      ),
                      SizedBox(height: sectionSpacing),
                      FadeTransition(
                        opacity: _fadeAnimation,
                        child: _buildEnhancedStatsSection(),
                      ),
                      SizedBox(height: sectionSpacing),
                      FadeTransition(
                        opacity: _fadeAnimation,
                        child: _buildPromosSection(screen),
                      ),
                      SizedBox(height: sectionSpacing),
                      SlideTransition(
                        position: _slideAnimation,
                        child: _buildEnhancedLastOrderCard(screen, lastOrder, pastOrders),
                      ),
                      SizedBox(height: sectionSpacing),
                      SizedBox(height: screen.height * 0.028),
                    ],
                  ),
                ),
              ),
            );
          },
        ),
      ),
    );
  }

  /// Current tab content keyed by index so AnimatedSwitcher runs the same transition every time.
  Widget _getCurrentScreen(Size screen, EdgeInsets padding) {
    if (_currentIndex == 0) {
      return KeyedSubtree(
        key: const ValueKey<int>(0),
        child: _buildHomeBody(screen, padding),
      );
    }
    return KeyedSubtree(
      key: ValueKey<int>(_currentIndex),
      child: _getScreen(_currentIndex - 1),
    );
  }

  // Same as Nomu Chatbot & Account Settings: 280 ms fade-in (easeOutCubic), 220 ms fade-out
  static const _kTabTransitionDurationIn = Duration(milliseconds: 280);
  static const _kTabTransitionDurationOut = Duration(milliseconds: 220);
  static const _kTabTransitionCurve = Curves.easeOutCubic;

  @override
  Widget build(BuildContext context) {
    final screen = MediaQuery.of(context).size;
    final padding = MediaQuery.of(context).padding;

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (bool didPop, dynamic result) {
        if (didPop || !context.mounted) return;
        // Use maybePop so overlays/dialogs and pushed routes close first; avoids
        // system back / edge swipe dropping the main shell without confirmation.
        Navigator.of(context).maybePop().then((popped) {
          if (!context.mounted) return;
          if (popped) return;
          if (_currentIndex != 0) {
            setState(() => _currentIndex = 0);
            return;
          }
          showLogoutConfirmationDialog(context);
        });
      },
      child: Scaffold(
        backgroundColor: _currentIndex == 0
            ? null
            : Theme.of(context).scaffoldBackgroundColor,
        body: AnimatedSwitcher(
          duration: _kTabTransitionDurationIn,
          reverseDuration: _kTabTransitionDurationOut,
          switchInCurve: _kTabTransitionCurve,
          switchOutCurve: _kTabTransitionCurve,
          transitionBuilder: (Widget child, Animation<double> animation) {
            return FadeTransition(
              opacity: animation,
              child: child,
            );
          },
          child: _getCurrentScreen(screen, padding),
        ),
        bottomNavigationBar: _buildEnhancedBottomNavBar(screen),
      ),
    );
  }

  Widget _buildAnimatedGreeting(Size screen) {
    final hour = _hourInPhilippines();
    final isMorning = hour < 12;
    final isAfternoon = hour >= 12 && hour < 17;
    return Container(
      margin: EdgeInsets.zero,
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 20),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.08),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
        image: const DecorationImage(
          image: AssetImage('assets/images/istetik.png'),
          fit: BoxFit.cover,
        ),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(20),
        child: Padding(
          // Inset so icon boxes clear the card’s 20px corners – both get same curve
          padding: const EdgeInsets.symmetric(horizontal: 12),
          child: Row(
            children: [
              Container(
                width: screen.width < 360 ? 44 : 48,
                height: screen.width < 360 ? 44 : 48,
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.all(Radius.circular(_kGreetingIconRadius)),
                  border: Border.all(color: Colors.white.withValues(alpha: 0.3)),
                ),
                child: Icon(
                  isMorning
                      ? Icons.wb_sunny_rounded
                      : isAfternoon
                          ? Icons.brightness_6_rounded
                          : Icons.nightlight_round,
                  color: Colors.white,
                  size: screen.width < 360 ? 22 : 26,
                ),
              ),
              SizedBox(width: screen.width < 360 ? 10 : 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      _getGreeting(),
                      style: TextStyle(
                        fontSize: screen.width < 360 ? 12 : 13,
                        color: Colors.white.withValues(alpha: 0.9),
                        fontWeight: FontWeight.w500,
                        letterSpacing: 0.2,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 6),
                    Text(
                      _user.username.isNotEmpty
                          ? _user.username
                          : (_user.fullName.isNotEmpty ? _user.fullName : 'Guest'),
                      style: TextStyle(
                        fontSize: screen.width < 360 ? 18 : 22,
                        color: Colors.white,
                        fontWeight: FontWeight.w800,
                        letterSpacing: -0.3,
                        height: 1.2,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
              AnimatedBuilder(
                animation: _coffeeIconRotationController,
                builder: (context, child) {
                  final sz = screen.width < 360 ? 44.0 : 48.0;
                  final ic = screen.width < 360 ? 22.0 : 26.0;
                  return Container(
                    width: sz,
                    height: sz,
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.2),
                      borderRadius: BorderRadius.all(Radius.circular(_kGreetingIconRadius)),
                      border: Border.all(color: Colors.white.withValues(alpha: 0.3)),
                    ),
                    child: Center(
                      child: Transform.rotate(
                        angle: _coffeeIconRotationController.value * 2 * 3.14159,
                        child: Icon(
                          Icons.coffee_rounded,
                          color: Colors.white,
                          size: ic,
                        ),
                      ),
                    ),
                  );
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  /// Current hour in Philippines (Asia/Manila) for greeting and icon.
  int _hourInPhilippines() {
    try {
      final manila = tz.getLocation('Asia/Manila');
      return tz.TZDateTime.now(manila).hour;
    } catch (_) {
      return DateTime.now().hour;
    }
  }

  String _getGreeting() {
    final hour = _hourInPhilippines();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  }

  Widget _buildEnhancedStatsSection() {
    final pts = points ?? 0;
    final earned = pts > 10 ? 10 : pts;
    final progress = (pts > 10 ? 10.0 : pts.toDouble()) / 10.0;
    return Container(
      margin: EdgeInsets.zero,
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 20),
      decoration: BoxDecoration(
        color: const Color(0xFFFAF9F7),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: _kDarkBlue.withValues(alpha: 0.08)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
          BoxShadow(
            color: _kDarkBlue.withValues(alpha: 0.04),
            blurRadius: 8,
            offset: const Offset(0, 1),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 52,
                height: 52,
                decoration: BoxDecoration(
                  color: const Color(0xFFFAF9F7),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(
                    color: _kGoldAccent,
                    width: 2,
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: _kGoldAccent.withValues(alpha: 0.2),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    ),
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.06),
                      blurRadius: 6,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: Center(
                  child: Image.asset(
                    'assets/images/iskor.png',
                    width: 26,
                    height: 26,
                    fit: BoxFit.contain,
                    color: _kGoldAccent,
                    errorBuilder: (_, __, ___) => Icon(Icons.card_giftcard_rounded, color: _kGoldAccent, size: 26),
                  ),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Loyalty Stamps',
                      style: TextStyle(
                        fontSize: 13,
                        color: Colors.grey[600],
                        fontWeight: FontWeight.w600,
                        letterSpacing: 0.2,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      isLoadingPoints
                          ? 'Loading...'
                          : pointsError != null
                              ? 'Error loading'
                              : '$earned of 10 stamps',
                      style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w800,
                        color: _kGoldAccent,
                        letterSpacing: -0.3,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 18),
          LayoutBuilder(
            builder: (context, c) {
              return FittedBox(
                fit: BoxFit.scaleDown,
                alignment: Alignment.centerLeft,
                child: SizedBox(
                  width: c.maxWidth.isFinite ? c.maxWidth : 300,
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: List.generate(10, (index) {
                      final filled = index < earned;
                      return Container(
                        width: 22,
                        height: 22,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: filled ? _kGoldAccent : Colors.grey[300],
                          border: Border.all(
                            color: filled ? _kGoldAccent : Colors.grey[400]!,
                            width: filled ? 0 : 1.5,
                          ),
                          boxShadow: filled
                              ? [
                                  BoxShadow(
                                    color: _kGoldAccent.withValues(alpha: 0.35),
                                    blurRadius: 4,
                                    offset: const Offset(0, 1),
                                  ),
                                ]
                              : null,
                        ),
                        child: filled
                            ? const Icon(Icons.check_rounded, color: Colors.white, size: 14)
                            : null,
                      );
                    }),
                  ),
                ),
              );
            },
          ),
          const SizedBox(height: 12),
          ClipRRect(
            borderRadius: BorderRadius.circular(10),
            child: LinearProgressIndicator(
              value: progress.clamp(0.0, 1.0),
              minHeight: 8,
              backgroundColor: Colors.grey[200],
              valueColor: const AlwaysStoppedAnimation<Color>(_kGoldAccent),
            ),
          ),
        ],
      ),
    );
  }



  Widget _buildPromosSection(Size screen) {
    final isSmallScreen = screen.width < 400;
    final isMediumScreen = screen.width < 600;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 4),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                "Special Offers",
                style: TextStyle(
                  fontSize: isSmallScreen ? 20 : (isMediumScreen ? 22 : 24),
                  fontWeight: FontWeight.w700,
                  color: const Color(0xFFB08D57),
                  letterSpacing: -0.5,
                ),
              ),
              SizedBox(height: isSmallScreen ? 6 : 8),
              Text(
                "Discover our latest promotions and exclusive deals",
                style: TextStyle(
                  fontSize: isSmallScreen ? 13 : 14,
                  color: Colors.grey[600],
                  height: 1.35,
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
            margin: EdgeInsets.zero,
            decoration: BoxDecoration(
              color: Colors.grey[100],
              borderRadius: BorderRadius.circular(isSmallScreen ? 14 : 18),
            ),
            child: const Center(
              child: CircularProgressIndicator(
                valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF242C5B)),
              ),
            ),
          )
        else if (_promoError != null)
          Container(
            height: screen.height * 0.25,
            margin: EdgeInsets.zero,
            decoration: BoxDecoration(
              color: Colors.grey[100],
              borderRadius: BorderRadius.circular(isSmallScreen ? 14 : 18),
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
            margin: EdgeInsets.zero,
            decoration: BoxDecoration(
              color: Colors.grey[100],
              borderRadius: BorderRadius.circular(isSmallScreen ? 14 : 18),
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
            padding: EdgeInsets.zero, // Full width to match other sections
            onPromoTap: null, // Special offers are not clickable; no navigation to Promotions page
          ),
      ],
    );
  }







  /// Highlight video section – height matches 16:9 so no top/bottom black bars, video 100% visible.
  Widget _buildHighlightVideo(Size screen) {
    final contentWidth = screen.width * (1 - 2 * _kHomeHorizontalPaddingFraction);
    final videoHeight = contentWidth * 9 / 16;

    return Container(
      margin: EdgeInsets.zero,
      width: double.infinity,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.12),
            blurRadius: 20,
            offset: const Offset(0, 6),
          ),
          BoxShadow(
            color: _kDarkBlue.withValues(alpha: 0.06),
            blurRadius: 12,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(24),
        child: SizedBox(
          width: double.infinity,
          height: videoHeight,
          child: CarouselVideo(
            videoAsset: 'assets/videos/dap.mp4',
          ),
        ),
      ),
    );
  }



  Widget _buildEnhancedLastOrderCard(Size screen, String lastOrder, List<Map<String, dynamic>> pastOrders) {
    // Show only the last 3 orders on the home page; "View All" shows full past orders
    final List<Map<String, dynamic>> last3Orders = pastOrders.length > 3
        ? pastOrders.sublist(pastOrders.length - 3)
        : pastOrders;
    
    // Adaptive sizing – one vertical spacing for all gaps (header→first, between cards, after last)
    final titleFontSize = screen.width < 400 ? screen.width * 0.055 : screen.width * 0.06;
    final headerPadding = screen.width < 400 ? 16.0 : 20.0;
    final contentPadding = screen.width < 400 ? 16.0 : 20.0;
    const double cardSpacing = 16.0;
    final emptyStateIconSize = screen.height < 600 ? 60.0 : 80.0;
    final emptyStateFontSize = screen.width < 400 ? screen.width * 0.045 : screen.width * 0.05;
    final emptyStateSubFontSize = screen.width < 400 ? screen.width * 0.035 : screen.width * 0.04;
    
    return Container(
      margin: EdgeInsets.zero,
      width: double.infinity,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(22),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.06),
            blurRadius: 16,
            offset: const Offset(0, 6),
          ),
          BoxShadow(
            color: const Color(0xFF242C5B).withValues(alpha: 0.04),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
        child: ClipRRect(
        borderRadius: BorderRadius.circular(22),
        child: Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              colors: [Color(0xFFFAF9F7), Color(0xFFF5F3F0)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header – same background image as My Loyalty Card
              Container(
                padding: EdgeInsets.all(headerPadding),
                decoration: BoxDecoration(
                  image: const DecorationImage(
                    image: AssetImage('assets/images/istetik.png'),
                    fit: BoxFit.cover,
                  ),
                  border: Border(
                    bottom: BorderSide(color: Colors.white.withValues(alpha: 0.2)),
                  ),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    Expanded(
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.2),
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(color: Colors.white.withValues(alpha: 0.3)),
                            ),
                            child: const Icon(
                              Icons.receipt_long,
                              color: Colors.white,
                              size: 20,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              'Recent Orders',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                fontSize: titleFontSize,
                                fontWeight: FontWeight.bold,
                                color: Colors.white,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    if (pastOrders.isNotEmpty) ...[
                      const SizedBox(width: 8),
                      // No Flexible here — Flexible would take flex space and pull the chip toward the title.
                      GestureDetector(
                        onTap: () => _showPastOrdersPopup(context, pastOrders),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
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
                  ],
                ),
              ),
              // Content – equal gap everywhere: use cardSpacing below header and after every card (including last)
              Container(
                padding: EdgeInsets.fromLTRB(contentPadding, cardSpacing, contentPadding, 0),
                child: last3Orders.isEmpty
                    ? _buildEmptyOrderState(screen, emptyStateIconSize, emptyStateFontSize, emptyStateSubFontSize)
                    : Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          for (int i = last3Orders.length - 1; i >= 0; i--)
                            Padding(
                              padding: EdgeInsets.only(bottom: cardSpacing),
                              child: _buildEnhancedOrderListTile(
                                last3Orders[i],
                                onTap: () => _showOrderDetails(context, last3Orders[i]),
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

  Widget _buildEnhancedOrderListTile(Map<String, dynamic> order, {VoidCallback? onTap}) {
    final mq = MediaQuery.of(context);
    final narrow = mq.size.width < 380;
    final date = DateTime.tryParse(order['date'].toString());
    final isRecent = date != null && DateTime.now().difference(date).inHours < 24;
    
    // Support both old and new order structure for backward compatibility
    final items = order['items'] as List<dynamic>?;
    final isMultipleItems = items != null && items.isNotEmpty;
    
    // For multiple items, use the first item for main display
    final firstItem = isMultipleItems ? items.first : order;
    final firstLine = orderLineAsMap(firstItem);
    final itemNameRaw =
        firstLine['itemName'] ?? order['itemName'] ?? order['drink'] ?? 'Unknown Item';
    final itemName = orderLineDisplayName(itemNameRaw.toString(), firstLine);
    final itemType = firstLine['itemType'] ?? order['itemType'] ?? 'drink';
    final category = firstLine['category'] ?? order['category'] ?? 'coffee';
    
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: Container(
      padding: EdgeInsets.symmetric(horizontal: narrow ? 10 : 16, vertical: 14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: isRecent ? const Color(0xFF242C5B).withValues(alpha: 0.12) : Colors.grey.withValues(alpha: 0.08),
          width: 1,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
          BoxShadow(
            color: const Color(0xFF242C5B).withValues(alpha: 0.03),
            blurRadius: 4,
            offset: const Offset(0, 1),
          ),
        ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Order icon (gold border; drink / donut / pastry asset or pizza Material icon)
          buildOrderHistoryLeadingIcon(
            itemType: itemType,
            category: category,
            isRecent: isRecent,
            outerSize: narrow ? 42 : 48,
          ),
          SizedBox(width: narrow ? 10 : 16),
          // Order Details — stacked top-to-bottom; time always after title, badge, and optional list
          Expanded(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        isMultipleItems && items.length > 1
                            ? '$itemName +${items.length - 1} more'
                            : itemName,
                        style: TextStyle(
                          fontWeight: FontWeight.w600,
                          fontSize: narrow ? 14 : 16,
                          color: isRecent ? const Color(0xFF242C5B) : Colors.grey[700],
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    if (isRecent)
                      Container(
                        padding: EdgeInsets.symmetric(horizontal: narrow ? 6 : 8, vertical: 2),
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
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: const Color(0xFF242C5B).withValues(alpha: 0.08),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(
                          color: const Color(0xFF242C5B).withValues(alpha: 0.15),
                          width: 1,
                        ),
                      ),
                      child: Text(
                        isMultipleItems
                            ? (items.length == 1 ? '1 Item' : '${items.length} items')
                            : _getItemTypeDisplayName(itemType),
                        style: const TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: Color(0xFF242C5B),
                        ),
                      ),
                    ),
                  ],
                ),
                // Relative time under the badge (same stack as single-item cards), above the line-item box
                if (date != null) ...[
                  const SizedBox(height: 6),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: [
                      Icon(
                        Icons.access_time,
                        size: 14,
                        color: Colors.grey[500],
                      ),
                      const SizedBox(width: 4),
                      Text(
                        formatOrderDate(date),
                        style: TextStyle(
                          fontSize: 13,
                          color: Colors.grey[600],
                        ),
                      ),
                    ],
                  ),
                ],
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
                          padding: const EdgeInsets.only(bottom: 4),
                          child: _orderLineBulletRow(
                            rawName: (item['itemName'] ?? '').toString(),
                            line: orderLineAsMap(item),
                            typeDisplayName: _getItemTypeDisplayName(item['itemType'] ?? 'item'),
                            quantity: (item['quantity'] as num?)?.toInt() ?? 1,
                            dotSize: 4,
                            dotTopPadding: 3,
                            gapAfterDot: 6,
                            primaryStyle: TextStyle(
                              fontSize: 10,
                              height: 1.25,
                              color: Colors.grey[800],
                            ),
                            quantityStyle: TextStyle(
                              fontSize: 9,
                              height: 1.2,
                              color: Colors.grey[600],
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        )),
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
              ],
            ),
          ),
          SizedBox(width: narrow ? 10 : 14),
          // Arrow — top-aligned with title; avoids vertical centering that misreads vs. timestamp
          Padding(
            padding: EdgeInsets.only(top: narrow ? 6 : 8),
            child: Container(
              padding: EdgeInsets.all(narrow ? 8 : 10),
              decoration: BoxDecoration(
                color: const Color(0xFF242C5B).withValues(alpha: 0.06),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(
                  color: const Color(0xFF242C5B).withValues(alpha: 0.1),
                  width: 1,
                ),
              ),
              child: Icon(
                Icons.arrow_forward_ios,
                size: narrow ? 11 : 12,
                color: const Color(0xFF242C5B).withValues(alpha: 0.7),
              ),
            ),
          ),
        ],
      ),
    ),
    );
  }

  void _showOrderDetails(BuildContext context, Map<String, dynamic> order) {
    final date = DateTime.tryParse(order['date'].toString());
    final items = order['items'] as List<dynamic>?;
    final isMultipleItems = items != null && items.isNotEmpty;
    final firstItem = isMultipleItems ? items.first : order;
    final firstLine = orderLineAsMap(firstItem);
    final itemNameRaw =
        firstLine['itemName'] ?? order['itemName'] ?? order['drink'] ?? 'Unknown Item';
    final itemName = orderLineDisplayName(itemNameRaw.toString(), firstLine);
    final itemType = firstLine['itemType'] ?? order['itemType'] ?? 'drink';

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(
          children: [
            Icon(Icons.receipt_long, color: const Color(0xFF242C5B), size: 24),
            const SizedBox(width: 10),
            const Expanded(
              child: Text(
                'Order details',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF242C5B),
                ),
              ),
            ),
          ],
        ),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                isMultipleItems && items.length > 1
                    ? '$itemName +${items.length - 1} more'
                    : itemName,
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF242C5B),
                ),
              ),
              if (date != null) ...[
                const SizedBox(height: 8),
                Row(
                  children: [
                    Icon(Icons.calendar_today, size: 14, color: Colors.grey[600]),
                    const SizedBox(width: 6),
                    Text(
                      DateFormat('MMM d, y').format(date),
                      style: TextStyle(fontSize: 14, color: Colors.grey[700]),
                    ),
                  ],
                ),
              ],
              const SizedBox(height: 12),
              const Divider(height: 1),
              const SizedBox(height: 8),
              Text(
                'Items in this order',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: Colors.grey[800],
                ),
              ),
              const SizedBox(height: 8),
              ...(isMultipleItems
                  ? items.asMap().entries.map((e) {
                      final item = e.value;
                      final line = orderLineAsMap(item);
                      final qty = (item['quantity'] as num?)?.toInt() ?? 1;
                      final type = _getItemTypeDisplayName(item['itemType'] ?? 'item');
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 6),
                        child: _orderLineBulletRow(
                          rawName: (item['itemName'] ?? item['name'] ?? 'Item').toString(),
                          line: line,
                          typeDisplayName: type,
                          quantity: qty,
                          dotSize: 6,
                          dotTopPadding: 5,
                          gapAfterDot: 10,
                          primaryStyle: TextStyle(fontSize: 14, height: 1.3, color: Colors.grey[800]),
                          quantityStyle: TextStyle(
                            fontSize: 12,
                            height: 1.25,
                            color: Colors.grey[600],
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      );
                    }).toList()
                  : [
                      Padding(
                        padding: const EdgeInsets.only(bottom: 6),
                        child: _orderLineBulletRow(
                          rawName: itemNameRaw.toString(),
                          line: orderLineAsMap(order),
                          typeDisplayName: _getItemTypeDisplayName(itemType),
                          quantity: (order['quantity'] as num?)?.toInt() ?? 1,
                          dotSize: 6,
                          dotTopPadding: 5,
                          gapAfterDot: 10,
                          primaryStyle: TextStyle(fontSize: 14, height: 1.3, color: Colors.grey[800]),
                          quantityStyle: TextStyle(
                            fontSize: 12,
                            height: 1.25,
                            color: Colors.grey[600],
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                    ]),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton(
                  onPressed: () => Navigator.of(context).pop(),
                  style: OutlinedButton.styleFrom(
                    backgroundColor: Colors.white,
                    foregroundColor: AppTheme.primary,
                    side: BorderSide(color: AppTheme.primary, width: 2),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                  child: const Text('Close'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showPastOrdersPopup(BuildContext context, List<Map<String, dynamic>> pastOrders) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => PastOrdersPage(
          pastOrders: pastOrders,
          getItemTypeDisplayName: _getItemTypeDisplayName,
          onOrderTap: _showOrderDetails,
        ),
      ),
    );
  }

  Widget _buildEnhancedBottomNavBar(Size screen) {
    // Keep nav compact to avoid overflow; highlight only the icon with minimal padding
    final navHeight = screen.height < 600 ? 50.0 : 56.0;
    final iconSize = screen.height < 600 ? 20.0 : 22.0;
    final selectedIconSize = screen.height < 600 ? 22.0 : 24.0;
    final fontSize = screen.height < 600 ? 9.0 : 10.0;
    final verticalPadding = screen.height < 600 ? 4.0 : 6.0;
    // Subtle white/transparent highlight so user can see which page is selected
    const double iconHighlightPadding = 2.0;

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
        child: Container(
          decoration: const BoxDecoration(
            image: DecorationImage(
              image: AssetImage('assets/images/istetik.png'),
              fit: BoxFit.cover,
            ),
          ),
          padding: EdgeInsets.symmetric(vertical: verticalPadding),
          child: Row(
            children: List.generate(_labels.length, (index) {
              final isSelected = _currentIndex == index;
              final iconPath = _getCustomIconPath(index);
              final size = isSelected ? selectedIconSize : iconSize;
              final highlightSize = size + (2 * iconHighlightPadding);
              return Expanded(
                child: GestureDetector(
                  behavior: HitTestBehavior.opaque,
                  onTap: () {
                    LoggingService.instance.homepage('Switching to tab $index: ${_labels[index]}', {
                      'profilePictureLength': _user.profilePicture.length,
                    });
                    setState(() => _currentIndex = index);
                  },
                  child: SizedBox(
                    height: navHeight - (2 * verticalPadding),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        SizedBox(
                          width: highlightSize,
                          height: highlightSize,
                          child: AnimatedContainer(
                            duration: const Duration(milliseconds: 300),
                            decoration: BoxDecoration(
                              color: isSelected
                                  ? Colors.white.withValues(alpha: 0.25)
                                  : Colors.transparent,
                              shape: BoxShape.circle,
                            ),
                            alignment: Alignment.center,
                            child: ClipOval(
                              child: SizedBox(
                                width: size,
                                height: size,
                                child: Image.asset(
                                  iconPath,
                                  fit: BoxFit.cover,
                                ),
                              ),
                            ),
                          ),
                        ),
                        SizedBox(height: screen.height < 600 ? 2 : 3),
                        Text(
                          _labels[index],
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            color: isSelected ? Colors.white : Colors.white70,
                            fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
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
  VideoPlayerController? _controller;
  bool _isInitialized = false;
  bool _hasError = false;
  bool _hadValidSize = false;
  bool _isVisible = false; // Start false; only play when VisibilityDetector says visible

  @override
  void initState() {
    super.initState();
    _initializeVideo();
  }

  void _onVisibilityChanged(VisibilityInfo info) {
    final visible = info.visibleFraction >= 0.5;
    if (visible != _isVisible && mounted && _controller != null) {
      setState(() => _isVisible = visible);
      if (_isVisible) {
        _controller!.play();
      } else {
        _controller!.pause();
      }
    }
  }

  Future<void> _initializeVideo() async {
    try {
      final controller = VideoPlayerController.asset(widget.videoAsset);
      await controller.initialize();
      if (!mounted) {
        controller.dispose();
        return;
      }
      _controller = controller;
      controller.setVolume(0.0);
      controller.setLooping(true);
      controller.addListener(_onVideoUpdate);
      setState(() {
        _isInitialized = true;
      });
      // Do not auto-play here: only play when VisibilityDetector reports visible (see _onVisibilityChanged)
    } catch (e) {
      LoggingService.instance.error('Error initializing video: ${widget.videoAsset}', e);
      if (mounted) {
        setState(() {
          _hasError = true;
        });
      }
    }
  }

  void _onVideoUpdate() {
    if (mounted && _controller != null && !_hadValidSize) {
      final size = _controller!.value.size;
      if (size.width > 0 && size.height > 0) {
        _hadValidSize = true;
        setState(() {});
      }
    }
  }

  @override
  void dispose() {
    _controller?.removeListener(_onVideoUpdate);
    _controller?.dispose();
    _controller = null;
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return VisibilityDetector(
      key: Key('carousel_video_${widget.videoAsset}'),
      onVisibilityChanged: _onVisibilityChanged,
      child: LayoutBuilder(
        builder: (context, constraints) {
          return Container(
            width: constraints.maxWidth,
            height: constraints.maxHeight,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(24),
              color: Colors.black,
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(24),
              child: _hasError
                  ? _buildErrorWidget()
                  : !_isInitialized
                      ? _buildLoadingWidget()
                      : _buildVideoContent(),
            ),
          );
        },
      ),
    );
  }

  Widget _buildVideoContent() {
    final c = _controller!;
    final size = c.value.size;
    final hasValidSize = size.width > 0 && size.height > 0;
    if (hasValidSize) {
      return FittedBox(
        fit: BoxFit.contain,
        alignment: Alignment.center,
        child: SizedBox(
          width: size.width,
          height: size.height,
          child: VideoPlayer(c),
        ),
      );
    }
    return Center(child: VideoPlayer(c));
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
