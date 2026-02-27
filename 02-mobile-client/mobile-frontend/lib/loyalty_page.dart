import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flip_card/flip_card.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'api/api.dart';
import 'services/socket_service.dart';
import 'services/logging_service.dart';
import 'services/cache_service.dart';
import 'services/scan_limit_notification_service.dart';
import 'services/order_completion_notification_service.dart';
import 'config.dart';
import 'theme/app_theme.dart';
import 'screens/loyalty_rules_screen.dart';
import 'widgets/empty_state.dart';
import 'widgets/skeleton_loader.dart';

class LoyaltyPage extends StatefulWidget {
  final String qrToken;
  final int? initialPoints;
  final VoidCallback? onPointsUpdated;
  final ValueChanged<int>? onPointsChanged; // New callback for when points change
  const LoyaltyPage({super.key, required this.qrToken, this.initialPoints, this.onPointsUpdated, this.onPointsChanged});

  @override
  State<LoyaltyPage> createState() => _LoyaltyPageState();
}

/// Safe parse for int from API/JSON (handles int, double, String to avoid cast errors).
int _parseIntSafe(dynamic v, [int fallback = 0]) {
  if (v == null) return fallback;
  if (v is int) return v;
  if (v is double) return v.toInt();
  if (v is String) return int.tryParse(v) ?? fallback;
  return fallback;
}

class _LoyaltyPageState extends State<LoyaltyPage> with TickerProviderStateMixin {
  int? points;
  bool isLoading = true;
  bool _isLoadingRewardHistory = true;
  String? errorMsg;
  bool rewardClaimed5 = false;
  bool rewardClaimed10 = false;
  bool _isFetchingRewardHistory = false;
  bool _isClaimingReward = false;
  List<Map<String, dynamic>> rewardsHistory = [];
  
  // Dynamic rewards system (start with defaults so banners show immediately at 5/10 points)
  List<Map<String, dynamic>> activeRewards = [];
  bool _isLoadingRewards = true;
  static List<Map<String, dynamic>> get _defaultRewardsList => [
    {'_id': 'default_donut_5', 'title': 'Free Donut', 'description': 'Claim your free donut with 5 stamps!', 'pointsRequired': 5, 'rewardType': 'donut', 'bannerColor': '#FFB74D', 'iconName': 'cake'},
    {'_id': 'default_coffee_10', 'title': 'Free Coffee', 'description': 'Claim your free coffee with 10 stamps!', 'pointsRequired': 10, 'rewardType': 'coffee', 'bannerColor': '#81C784', 'iconName': 'local_cafe'},
  ];
  Map<String, bool> rewardClaimedStatus = {}; // Track which rewards have been claimed
  Map<String, DateTime> sessionClaimedRewards = {}; // Track rewards claimed in current session
  int currentCycle = 1; // Track current reward cycle

  // Animation controllers
  late AnimationController _fadeController;
  late AnimationController _slideController;
  late AnimationController _scaleController;
  late Animation<double> _fadeAnimation;
  late Animation<Offset> _slideAnimation;
  late Animation<double> _scaleAnimation;

  // Socket service for real-time updates
  late SocketService _socketService;
  StreamSubscription<Map<String, dynamic>>? _loyaltyPointSubscription;
  
  // Auto-refresh timer for cycle completion
  Timer? _autoRefreshTimer;
  
  // Rate limiting for API calls
  DateTime? _lastApiCall;
  static const Duration _apiCooldown = Duration(seconds: 1);
  
  // Timer for updating relative time display
  Timer? _timeUpdateTimer;

  /// Set when dispose() runs so we never use animation controllers after dispose (avoids crash).
  bool _controllersDisposed = false;

  @override
  void initState() {
    super.initState();
    LoggingService.instance.loyalty('Initializing LoyaltyPage with QR token: ${widget.qrToken}');
    
    try {
      // Animation setup: 280 ms fade-in (easeOutCubic), 220 ms fade-out (same as Account Settings / Nomu Chatbot)
      _fadeController = AnimationController(
        duration: const Duration(milliseconds: 280),
        reverseDuration: const Duration(milliseconds: 220),
        vsync: this,
      );
      _slideController = AnimationController(
        duration: const Duration(milliseconds: 900),
        vsync: this,
      );
      _scaleController = AnimationController(
        duration: const Duration(milliseconds: 800),
        vsync: this,
      );
      _fadeAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
        CurvedAnimation(parent: _fadeController, curve: Curves.easeOutCubic),
      );
      _slideAnimation = Tween<Offset>(
        begin: const Offset(0, 0.15),
        end: Offset.zero,
      ).animate(CurvedAnimation(parent: _slideController, curve: Curves.easeOutCubic));
      _scaleAnimation = Tween<double>(begin: 0.9, end: 1.0).animate(
        CurvedAnimation(parent: _scaleController, curve: Curves.elasticOut),
      );
      
      // Use initial points if provided, otherwise fetch from API
      if (widget.initialPoints != null) {
        points = widget.initialPoints;
        isLoading = false;
        LoggingService.instance.loyalty('Using initial points: ${widget.initialPoints}');
      }
      // Ensure we have reward definitions so banners show at 5/10 points even before API loads
      if (activeRewards.isEmpty) {
        activeRewards = List<Map<String, dynamic>>.from(_defaultRewardsList.map((e) => Map<String, dynamic>.from(e)));
      }
      // Initialize socket service
      _socketService = SocketService.instance;
      _initializeSocket();
      
      // Start timers
      _startAutoRefreshTimer();
      _startTimeUpdateTimer();
      
      // Fetch active rewards for dynamic banners
      fetchActiveRewards();
      
      // Start animations
      _fadeController.forward();
      _slideController.forward();
      _scaleController.forward();
      
      // Defer data fetching until after first frame - fetch user once to avoid multiple timeouts
      WidgetsBinding.instance.addPostFrameCallback((_) async {
        if (!mounted) return;
        try {
          if (widget.initialPoints != null) {
            if (mounted) {
              setState(() {
                points = widget.initialPoints;
                isLoading = false;
              });
            }
            if (!_isLoadingRewards && mounted) {
              _checkRewardClaimStatus();
            }
            if (mounted) {
              fetchRewardHistory();
              _fetchCurrentCycle();
            }
            return;
          }
          // Single user fetch so one timeout instead of three when server is down
          final userResponse = await ApiService.getUserByQrToken(widget.qrToken);
          if (!mounted) return;
          if (userResponse == null) {
            if (mounted) {
              setState(() {
                errorMsg = 'Server unavailable. Check your connection.';
                isLoading = false;
                _isLoadingRewardHistory = false;
              });
            }
            return;
          }
          final userPoints = _parseIntSafe(userResponse['points']);
          final userId = userResponse['_id'] ?? userResponse['id'];
          final userCycle = _parseIntSafe(userResponse['currentCycle'], 1);
          if (mounted) {
            setState(() {
              points = userPoints;
              currentCycle = userCycle;
              isLoading = false;
            });
          }
          // Wait for activeRewards to load before checking claim status
          if (!_isLoadingRewards && mounted) {
            _checkRewardClaimStatus();
          }
          if (userId != null && mounted) {
            fetchRewardHistory(cachedUserId: userId);
            _fetchCurrentCycle(cachedUserId: userId);
          }
        } catch (e, st) {
          LoggingService.instance.error('Loyalty initial load failed', e, st);
          if (mounted) {
            setState(() {
              errorMsg = 'Cannot reach server. Check connection and try again.';
              isLoading = false;
              _isLoadingRewardHistory = false;
              points = points ?? 0;
            });
          }
        }
      });
    } catch (e) {
      LoggingService.instance.error('Error during LoyaltyPage initialization', e);
      // Set error state
      if (mounted) {
        setState(() {
          errorMsg = 'Failed to initialize loyalty page';
          isLoading = false;
        });
      }
    }
  }

  @override
  void dispose() {
    try {
      _controllersDisposed = true;
      LoggingService.instance.loyalty('Disposing LoyaltyPage resources...');
      
      // Cancel subscriptions first
      _loyaltyPointSubscription?.cancel();
      _loyaltyPointSubscription = null;
      
      // Cancel all timers
      _autoRefreshTimer?.cancel();
      _autoRefreshTimer = null;
      _timeUpdateTimer?.cancel();
      _timeUpdateTimer = null;
      
      // Stop all ongoing operations
      _isClaimingReward = false;
      _isFetchingRewardHistory = false;
      _isLoadingRewards = false;
      
      // Dispose animation controllers safely
      try {
        if (_fadeController.isAnimating) {
          _fadeController.stop();
        }
        _fadeController.dispose();
      } catch (e) {
        LoggingService.instance.warning('Error disposing fade controller', e);
      }
      
      try {
        if (_slideController.isAnimating) {
          _slideController.stop();
        }
        _slideController.dispose();
      } catch (e) {
        LoggingService.instance.warning('Error disposing slide controller', e);
      }
      
      try {
        if (_scaleController.isAnimating) {
          _scaleController.stop();
        }
        _scaleController.dispose();
      } catch (e) {
        LoggingService.instance.warning('Error disposing scale controller', e);
      }
      
      // Clear all state variables
      activeRewards.clear();
      rewardsHistory.clear();
      rewardClaimedStatus.clear();
      sessionClaimedRewards.clear();
      
      LoggingService.instance.loyalty('LoyaltyPage resources disposed successfully');
    } catch (e) {
      LoggingService.instance.error('Error during LoyaltyPage dispose', e);
    } finally {
      super.dispose();
    }
  }

  // Initialize socket connection and listen for real-time updates
  void _initializeSocket() async {
    try {
      // Check if widget is still mounted
      if (!mounted) {
        LoggingService.instance.loyalty('Widget not mounted, skipping socket initialization');
        return;
      }
      
      // Prevent multiple initializations
      if (_loyaltyPointSubscription != null) {
        LoggingService.instance.loyalty('Socket already initialized, skipping');
        return;
      }
      
      LoggingService.instance.loyalty('Initializing socket connection');
      
      // Check if already connected
      final currentStatus = _socketService.getConnectionStatus();
      if (currentStatus['isConnected'] == true) {
        LoggingService.instance.loyalty('Socket already connected, setting up listeners');
        _setupLoyaltySocketListener();
        return;
      }
      
      // Only initialize if not already initialized
      if (!currentStatus['isInitialized']) {
        await _socketService.initialize();
      }
      
      // Check if widget is still mounted after async operation
      if (!mounted) {
        LoggingService.instance.loyalty('Widget disposed during socket initialization');
        return;
      }
      
      // Test connection
      final connectionStatus = _socketService.getConnectionStatus();
      LoggingService.instance.loyalty('Socket connection status', connectionStatus);
      
      // Set up listener regardless of connection status
      _setupLoyaltySocketListener();
      
      LoggingService.instance.loyalty('Socket listener set up successfully');
    } catch (e) {
      LoggingService.instance.error('Socket initialization error', e);
      // Only set up listener if widget is still mounted
      if (mounted) {
        _setupLoyaltySocketListener();
      }
    }
  }

  // Set up loyalty point socket listener
  void _setupLoyaltySocketListener() {
    try {
      // Always cancel existing subscription first
      _loyaltyPointSubscription?.cancel();
      _loyaltyPointSubscription = null;
      
      // Only create new subscription if widget is still mounted
      if (!mounted) {
        LoggingService.instance.loyalty('Widget not mounted, skipping socket listener setup');
        return;
      }
      
      _loyaltyPointSubscription = _socketService.loyaltyPointStream.listen(
        (data) {
          try {
            // Check if widget is still mounted before processing
            if (!mounted) {
              LoggingService.instance.loyalty('Widget disposed, ignoring socket data');
              return;
            }
            
            LoggingService.instance.loyalty('Received loyalty point update in loyalty page', data);
            
            // Check if this update is for the current user's QR token
            final receivedQrToken = data['qrToken'] as String?;
            final receivedUserId = data['userId'] as String?;
            
            LoggingService.instance.loyalty('Checking user match - received: $receivedQrToken, current: ${widget.qrToken}, userId: $receivedUserId');
        
            // Only update if this is for the current user
            if (mounted && (receivedQrToken == widget.qrToken || receivedUserId != null)) {
              LoggingService.instance.loyalty('User match confirmed, updating loyalty card');
              _refreshPointsFromSocket(data);
            } else {
              LoggingService.instance.loyalty('Update not for current user, ignoring - mounted: $mounted, qrMatch: ${receivedQrToken == widget.qrToken}, hasUserId: ${receivedUserId != null}');
            }
          } catch (e) {
            LoggingService.instance.error('Error processing socket data', e);
          }
        },
        onError: (error) {
          LoggingService.instance.error('Socket stream error', error);
          // No auto-reconnect - manual reconnection required
        },
        cancelOnError: true, // Cancel subscription on error
      );
      
      LoggingService.instance.loyalty('Loyalty page socket listener set up successfully');
      
      // Set up scan limit notification listener
      _setupScanLimitNotificationListener();
      
      // Set up order completion notification listener
      _setupOrderCompletionNotificationListener();
      
    } catch (e) {
      LoggingService.instance.error('Error setting up loyalty socket listener', e);
    }
  }

  // Set up scan limit notification listener
  void _setupScanLimitNotificationListener() {
    try {
      // Listen for scan limit notifications
      ScanLimitNotificationService.instance.notificationStream.listen((data) {
        if (!mounted) return;
        
        final customerId = data['customerId'] as String?;
        final notificationType = data['type'] as String?;
        
        // Check if this notification is for the current user
        // For now, we'll show all notifications, but you can add user filtering here
        if (customerId != null && notificationType != null) {
          LoggingService.instance.loyalty('Received scan limit notification', data);
          
          // Show the notification in the UI
          ScanLimitNotificationService.instance.showScanLimitNotification(context, data);
        }
      });
      
      LoggingService.instance.loyalty('Scan limit notification listener set up successfully');
    } catch (e) {
      LoggingService.instance.error('Error setting up scan limit notification listener', e);
    }
  }

  // Set up order completion notification listener
  void _setupOrderCompletionNotificationListener() {
    try {
      // Listen for order completion notifications
      OrderCompletionNotificationService.instance.notificationStream.listen((data) {
        if (!mounted) return;
        
        final qrToken = data['qrToken'] as String?;
        final notificationType = data['type'] as String?;
        
        // Check if this notification is for the current user
        if (qrToken == widget.qrToken && notificationType == 'order_completion') {
          LoggingService.instance.loyalty('Received order completion notification', data);
          
          // Show the notification in the UI
          OrderCompletionNotificationService.showOrderCompletionDialog(context, data);
        }
      });
      
      LoggingService.instance.loyalty('Order completion notification listener set up successfully');
    } catch (e) {
      LoggingService.instance.error('Error setting up order completion notification listener', e);
    }
  }

  // Handle real-time point updates
  void _refreshPointsFromSocket(Map<String, dynamic> data) async {
    try {
      // Check if widget is still mounted
      if (!mounted) {
        LoggingService.instance.loyalty('Widget disposed, ignoring socket update');
        return;
      }
      
      LoggingService.instance.loyalty('Refreshing points from socket data', data);
      
      // Extract points from socket data (safe parse: API may send int or double)
      final rawPoints = data['points'];
      final int? newPoints = rawPoints != null ? _parseIntSafe(rawPoints) : null;
      final message = data['message'] as String?;
      final customerMessage = data['customerMessage'] as String?;
      final messageType = data['messageType'] as String? ?? 'info';
      final isEligibleForPoints = data['isEligibleForPoints'] as bool? ?? true;
      final drink = data['itemName'] as String?;
      final qrToken = data['qrToken'] as String?;
      
      // Validate that this update is for the current user
      if (qrToken != null && qrToken != widget.qrToken) {
        LoggingService.instance.loyalty('Socket update not for current user, ignoring');
        return;
      }
      
      // Update points if available
      if (newPoints != null) {
        // Validate points to prevent glitches
        if (newPoints < 0) {
          LoggingService.instance.warning('Invalid points received: $newPoints, ignoring');
          return;
        }
        
        int validatedPoints = newPoints;
        if (newPoints > 1000) {
          LoggingService.instance.warning('Points exceed reasonable limit: $newPoints, capping at 1000');
          validatedPoints = 1000;
        }
      
        LoggingService.instance.loyalty('Updating loyalty card points to: $validatedPoints (was: $points)');
        
        // Clear cache to ensure fresh data on next fetch
        await CacheService.clearCache('user_qr_${widget.qrToken}');
        
        if (mounted) {
          setState(() {
            points = validatedPoints;
            isLoading = false;
          });
          
          LoggingService.instance.loyalty('Loyalty card UI updated with new points: $validatedPoints');
        }
      }
      
      // Show notification with customer message (even if points didn't change)
      String notificationMessage;
      IconData icon;
      Color backgroundColor;
      Color iconColor;
      
      if (customerMessage != null && customerMessage.isNotEmpty) {
        notificationMessage = customerMessage;
      } else if (message != null && message.isNotEmpty) {
        notificationMessage = message;
      } else if (newPoints != null) {
        notificationMessage = drink != null 
            ? 'New order: $drink! You now have $newPoints stamps'
            : 'Points updated! You now have $newPoints stamps';
      } else {
        notificationMessage = 'Scan processed';
      }
      
      // Determine icon and color based on message type
      if (messageType == 'success' || isEligibleForPoints) {
        if (newPoints != null && (newPoints == 5 || newPoints == 10)) {
          icon = Icons.celebration;
          backgroundColor = const Color(0xFF4CAF50); // Green for milestones
          iconColor = Colors.amber;
        } else {
          icon = Icons.check_circle;
          backgroundColor = const Color(0xFF4CAF50); // Green for success
          iconColor = Colors.white;
        }
      } else if (messageType == 'warning') {
        icon = Icons.warning;
        backgroundColor = Colors.orange;
        iconColor = Colors.white;
      } else {
        icon = Icons.info;
        backgroundColor = const Color(0xFF242C5B);
        iconColor = Colors.yellow;
      }
            
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                Icon(icon, color: iconColor, size: 20),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    notificationMessage,
                    style: const TextStyle(
                      fontWeight: FontWeight.w500,
                      color: Colors.white,
                    ),
                  ),
                ),
              ],
            ),
            backgroundColor: backgroundColor,
            duration: Duration(seconds: messageType == 'warning' ? 5 : 4),
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(10),
            ),
            action: isEligibleForPoints && newPoints != null
                ? SnackBarAction(
                    label: 'Refresh',
                    textColor: Colors.white,
                    onPressed: () {
                      fetchPoints(forceRefresh: true);
                      fetchRewardHistory();
                    },
                  )
                : null,
          ),
        );
      }
        
        // Notify parent widget if callback exists
        if (widget.onPointsUpdated != null) {
          widget.onPointsUpdated!();
        }
        
        // Notify parent of points change
        if (widget.onPointsChanged != null && newPoints != null) {
          widget.onPointsChanged!(newPoints);
        }
        
        // Load reward history and cycle in parallel, then run claim status once to avoid lag/glitching
        await Future.wait([
          fetchRewardHistory(skipClaimStatusCheck: true),
          _fetchCurrentCycle(),
        ]);
        if (mounted) {
          _checkPreviouslyClaimedRewards();
          _checkRewardClaimStatus();
        }
        // Milestone message is already shown via SnackBar above; no dialog to avoid blocking touches
    } catch (e) {
      LoggingService.instance.error('Error refreshing points from socket', e);
    }
  }

  Future<void> fetchRewardHistory({bool forceRefresh = false, String? cachedUserId, bool skipClaimStatusCheck = false}) async {
    if (!mounted || _isFetchingRewardHistory) return;
    
    _isFetchingRewardHistory = true;
    if (mounted) {
      setState(() {
        _isLoadingRewardHistory = true;
      });
    }
    
    try {
      if (widget.qrToken.isNotEmpty) {
        final userId = cachedUserId ?? await ApiService.getUserIdByQrToken(widget.qrToken, forceRefresh: forceRefresh);
        if (userId != null) {
          List<Map<String, dynamic>> history;
          try {
            history = await ApiService.getRewardHistory(userId);
          } catch (apiError) {
            // Handle API errors (429, 400, 500, etc.)
            LoggingService.instance.error('API error during getRewardHistory', apiError);
            
            if (mounted) {
              setState(() {
                _isLoadingRewardHistory = false;
                errorMsg = apiError.toString().replaceFirst('Exception: ', '');
              });
            }
            
            // Show user-friendly error message
            if (mounted) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('Failed to load reward history: ${apiError.toString().replaceFirst('Exception: ', '')}'),
                  backgroundColor: Colors.orange,
                  duration: const Duration(seconds: 3),
                ),
              );
            }
            return;
          }
          if (mounted) {
            setState(() {
              rewardsHistory = history;
              // Sort by date (newest first) with proper error handling
              rewardsHistory.sort((a, b) {
                try {
                  final da = DateTime.tryParse(a['date'].toString()) ?? DateTime(1970);
                  final db = DateTime.tryParse(b['date'].toString()) ?? DateTime(1970);
                  return db.compareTo(da); // newest first
                } catch (e) {
                  LoggingService.instance.warning('Error sorting reward history', e);
                  return 0; // Keep original order if sorting fails
                }
              });
            });
            
            LoggingService.instance.loyalty('Fetched ${rewardsHistory.length} reward history entries');
            
            // Check for previously claimed rewards
            if (mounted) {
              _checkPreviouslyClaimedRewards();
              if (!skipClaimStatusCheck) _checkRewardClaimStatus();
            }
          }
        } else {
          // If we can't get user ID, clear cache and try once more
          LoggingService.instance.warning('Could not get user ID for QR token: ${widget.qrToken}');
          
          // Clear cache and try once more
          if (!forceRefresh) {
            LoggingService.instance.loyalty('Clearing cache and retrying...');
            await CacheService.clearCachePattern('user_qr_${widget.qrToken}');
            
            // Try once more with force refresh
            final retryUserId = await ApiService.getUserIdByQrToken(widget.qrToken, forceRefresh: true);
            if (retryUserId != null) {
              final history = await ApiService.getRewardHistory(retryUserId);
              if (mounted) {
                setState(() {
                  rewardsHistory = history;
                  // Sort by date (newest first) with proper error handling
                  rewardsHistory.sort((a, b) {
                    try {
                      final da = DateTime.tryParse(a['date'].toString()) ?? DateTime(1970);
                      final db = DateTime.tryParse(b['date'].toString()) ?? DateTime(1970);
                      return db.compareTo(da); // newest first
                    } catch (e) {
                      LoggingService.instance.warning('Error sorting reward history', e);
                      return 0; // Keep original order if sorting fails
                    }
                  });
                });
                
                LoggingService.instance.loyalty('Fetched ${rewardsHistory.length} reward history entries after cache clear');
                
                // Check for previously claimed rewards
                if (mounted) {
                  _checkPreviouslyClaimedRewards();
                  if (!skipClaimStatusCheck) _checkRewardClaimStatus();
                }
              }
              return; // Success after retry
            }
          }
          
          // If still can't get user ID, set empty rewards history
          if (mounted) {
            setState(() {
              rewardsHistory = [];
            });
          }
        }
      } else {
        // If no QR token, set empty rewards history
        LoggingService.instance.warning('No QR token provided for reward history');
        if (mounted) {
          setState(() {
            rewardsHistory = [];
          });
        }
      }
    } catch (e) {
      LoggingService.instance.error('Error fetching reward history', e);
      // If there's an error, set empty rewards history
      if (mounted) {
        setState(() {
          rewardsHistory = [];
        });
      }
    } finally {
      _isFetchingRewardHistory = false;
      if (mounted) {
        setState(() {
          _isLoadingRewardHistory = false;
        });
      }
    }
  }

  Future<void> fetchActiveRewards() async {
    if (!mounted) return;
    
    if (mounted) {
      setState(() {
        _isLoadingRewards = true;
      });
    }
    
    try {
      LoggingService.instance.loyalty('Starting to fetch active rewards...');
      final apiUrl = await Config.apiBaseUrl;
      LoggingService.instance.loyalty('API Base URL: $apiUrl');
      LoggingService.instance.loyalty('Full rewards URL: $apiUrl/rewards/active');
      var rewards = await ApiService.getActiveRewards();
      LoggingService.instance.loyalty('Fetched ${rewards.length} active rewards from database');
      
      // Fallback: If no rewards from database, create default rewards
      if (rewards.isEmpty) {
        LoggingService.instance.loyalty('No rewards from database, creating default rewards');
        rewards = [
          {
            '_id': 'default_donut_5',
            'title': 'Free Donut',
            'description': 'Claim your free donut with 5 stamps!',
            'pointsRequired': 5,
            'rewardType': 'donut',
            'bannerColor': '#FFB74D',
            'iconName': 'cake',
            'isActive': true,
            'status': 'Active',
            'priority': 1,
          },
          {
            '_id': 'default_coffee_10',
            'title': 'Free Coffee',
            'description': 'Claim your free coffee with 10 stamps!',
            'pointsRequired': 10,
            'rewardType': 'coffee',
            'bannerColor': '#81C784',
            'iconName': 'local_cafe',
            'isActive': true,
            'status': 'Active',
            'priority': 2,
          },
        ];
        LoggingService.instance.loyalty('Created ${rewards.length} default rewards');
      }
      
      // Debug: Log each reward in detail
      for (int i = 0; i < rewards.length; i++) {
        final reward = rewards[i];
        LoggingService.instance.loyalty('Reward $i: ${reward.toString()}');
      }
      
      if (mounted) {
        setState(() {
          activeRewards = rewards;
          _isLoadingRewards = false;
        });
        
        // Log reward details
        for (final reward in rewards) {
          LoggingService.instance.loyalty('Reward: ${reward['title']} - ${reward['pointsRequired']} points - ${reward['rewardType']}');
        }
        
        // First check static reward flags, then dynamic rewards
        if (mounted) {
          _checkPreviouslyClaimedRewards();
          
          // Check which dynamic rewards have been claimed (only if points are loaded)
          if (points != null) {
            _checkRewardClaimStatus();
          }
        }
        
        LoggingService.instance.loyalty('Active rewards updated in state: ${activeRewards.length}');
      }
    } catch (e) {
      LoggingService.instance.error('Error fetching active rewards', e);
      if (mounted) {
        // Fallback: Use default rewards even on error
        final defaultRewards = [
          {
            '_id': 'default_donut_5',
            'title': 'Free Donut',
            'description': 'Claim your free donut with 5 stamps!',
            'pointsRequired': 5,
            'rewardType': 'donut',
            'bannerColor': '#FFB74D',
            'iconName': 'cake',
            'isActive': true,
            'status': 'Active',
            'priority': 1,
          },
          {
            '_id': 'default_coffee_10',
            'title': 'Free Coffee',
            'description': 'Claim your free coffee with 10 stamps!',
            'pointsRequired': 10,
            'rewardType': 'coffee',
            'bannerColor': '#81C784',
            'iconName': 'local_cafe',
            'isActive': true,
            'status': 'Active',
            'priority': 2,
          },
        ];
        LoggingService.instance.loyalty('Using default rewards due to error: ${e.toString()}');
        if (mounted) {
          setState(() {
            activeRewards = defaultRewards;
            _isLoadingRewards = false;
          });
          // Check claim status if points are already loaded
          if (points != null && mounted) {
            _checkPreviouslyClaimedRewards();
            _checkRewardClaimStatus();
          }
        }
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
      }
    }
  }

  Future<void> _fetchCurrentCycle({String? cachedUserId}) async {
    try {
      if (widget.qrToken.isNotEmpty) {
        final userId = cachedUserId ?? await ApiService.getUserIdByQrToken(widget.qrToken);
        if (userId != null) {
          final userData = await ApiService.getUserData(userId);
          if (userData != null && userData['success'] == true) {
            final user = userData['user'];
            if (user != null) {
              setState(() {
                currentCycle = _parseIntSafe(user['currentCycle'], 1);
              });
              LoggingService.instance.loyalty('Current cycle fetched: $currentCycle');
            }
          }
        }
      }
    } catch (e) {
      LoggingService.instance.error('Error fetching current cycle', e);
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
    }
  }

  void _checkRewardClaimStatus() {
    if (!mounted || points == null || activeRewards.isEmpty || _isLoadingRewards) {
      LoggingService.instance.loyalty('Skipping reward claim status check - mounted: $mounted, points: $points, activeRewards: ${activeRewards.length}, isLoading: $_isLoadingRewards');
      return;
    }
    
    LoggingService.instance.loyalty('Checking dynamic reward claim status - points: $points, activeRewards: ${activeRewards.length}');
    LoggingService.instance.loyalty('Current cycle: $currentCycle');
    
    // Clean up old session claims (older than 10 minutes)
    final now = DateTime.now();
    sessionClaimedRewards.removeWhere((key, claimTime) {
      final timeDifference = now.difference(claimTime);
      return timeDifference.inMinutes > 10;
    });
    
    // Reset all reward claim status
    rewardClaimedStatus.clear();
    
    for (final reward in activeRewards) {
      final pointsRequired = _parseIntSafe(reward['pointsRequired']);
      final rewardId = (reward['_id'] as String? ?? '').isEmpty
          ? '${reward['title']}_$pointsRequired'
          : (reward['_id'] as String? ?? '');
      final rewardType = reward['rewardType'] as String? ?? '';
      final title = reward['title'] as String? ?? '';
      
      LoggingService.instance.loyalty('Processing reward: $title - $pointsRequired points - $rewardType');
      
      // Check if user has enough points
      if (points! < pointsRequired) {
        rewardClaimedStatus[rewardId] = false; // Not enough points - show reward but not claimable
        LoggingService.instance.loyalty('Not enough points for $title - need $pointsRequired, have $points - showing but not claimable');
        continue;
      }
      
      // Claimed = only if THIS specific reward was claimed in the current cycle.
      // Match strictly by claim TYPE only (backend stores 'donut' or 'coffee'). Do not use description.
      // Ignore legacy claims with cycle 0 so they never mark a reward as claimed.
      final effectiveCycle = currentCycle < 1 ? 1 : currentCycle;
      bool wasClaimed = false;
      for (final claim in rewardsHistory) {
        final claimCycle = _parseIntSafe(claim['cycle'], 0);
        if (claimCycle < 1 || claimCycle != effectiveCycle) continue; // only consider current cycle; ignore cycle 0
        final claimType = (claim['type'] as String? ?? '').toLowerCase();
        bool isMatch = false;
        if (pointsRequired == 5) {
          isMatch = claimType == 'donut';
        } else if (pointsRequired == 10) {
          isMatch = claimType == 'coffee';
        } else {
          final claimDesc = (claim['description'] as String? ?? '').toLowerCase();
          isMatch = claimDesc.contains(title.toLowerCase()) || title.toLowerCase().contains(claimDesc);
        }
        if (isMatch) {
          wasClaimed = true;
          LoggingService.instance.loyalty('Reward $title claimed in cycle $currentCycle');
          break;
        }
      }
      // Session claim just claimed: show as claimed immediately
      if (!wasClaimed && sessionClaimedRewards.containsKey(rewardId)) {
        final claimTime = sessionClaimedRewards[rewardId]!;
        if (now.difference(claimTime).inMinutes < 5) {
          wasClaimed = true;
        }
      }
      
      rewardClaimedStatus[rewardId] = wasClaimed;
      LoggingService.instance.loyalty('Reward $title claim status: $wasClaimed');
    }
    
    LoggingService.instance.loyalty('Final reward claim status: $rewardClaimedStatus');
    
    // Log which rewards are available for claiming
    for (final reward in activeRewards) {
      final pointsRequired = _parseIntSafe(reward['pointsRequired']);
      final rawId = reward['_id'] as String? ?? '';
      final rewardId = rawId.isEmpty ? '${reward['title']}_$pointsRequired' : rawId;
      final title = reward['title'] as String? ?? '';
      final isClaimed = rewardClaimedStatus[rewardId] ?? false;
      
      if (points! >= pointsRequired && !isClaimed) {
        LoggingService.instance.loyalty('✅ Reward available: $title (${pointsRequired} points)');
      } else if (points! >= pointsRequired && isClaimed) {
        LoggingService.instance.loyalty('❌ Reward claimed: $title (${pointsRequired} points)');
      } else {
        LoggingService.instance.loyalty('⏳ Reward locked: $title (need ${pointsRequired} points, have $points)');
      }
    }
    // Trigger rebuild so reward banners appear/update
    if (mounted) {
      setState(() {});
    }
  }

  void _checkPreviouslyClaimedRewards() {
    if (!mounted || points == null) return;
    
    LoggingService.instance.loyalty('Checking previously claimed rewards for ${points} points');
    
    // Find the most recent claims for each reward type
    DateTime? lastCoffeeClaim;
    Map<String, dynamic>? lastDonutClaimData;
    
    for (final r in rewardsHistory) {
      final claimDate = DateTime.tryParse(r['date'].toString());
      if (claimDate == null) continue;
      
      if (r['type'] == 'coffee' && (lastCoffeeClaim == null || claimDate.isAfter(lastCoffeeClaim))) {
        lastCoffeeClaim = claimDate;
      } else if (r['type'] == 'donut' && (lastDonutClaimData == null || claimDate.isAfter(DateTime.tryParse(lastDonutClaimData['date'].toString()) ?? DateTime(1970)))) {
        lastDonutClaimData = r;
      }
    }

    if (mounted) {
      setState(() {
        // Reset flags
        rewardClaimed5 = false;
        rewardClaimed10 = false;
        
        // Coffee logic: If user has 10+ points, they can claim coffee
        // Coffee resets points to 0, so if they have points, they haven't claimed coffee
        if (points! >= 10) {
          rewardClaimed10 = false; // Can claim coffee
          LoggingService.instance.loyalty('User has ${points} points - can claim coffee');
        } else {
          rewardClaimed10 = true; // Not enough points for coffee
          LoggingService.instance.loyalty('User has ${points} points - cannot claim coffee');
        }
        
        // Donut logic: Show banner if user has 5+ points and hasn't claimed donut today
        if (points! >= 5) {
          // Check if donut was claimed today
          if (lastDonutClaimData != null) {
            final donutClaimDate = DateTime.tryParse(lastDonutClaimData['date'].toString());
            if (donutClaimDate != null) {
              final now = DateTime.now();
              final daysDifference = now.difference(donutClaimDate).inDays;
              rewardClaimed5 = daysDifference == 0; // Claimed today
              LoggingService.instance.loyalty('Donut claimed today: $rewardClaimed5');
            } else {
              rewardClaimed5 = false; // Show banner - no valid claim date
            }
          } else {
            rewardClaimed5 = false; // Show banner - never claimed
            LoggingService.instance.loyalty('Donut claim available - never claimed before');
          }
        } else {
          rewardClaimed5 = false; // Not enough points for donut - show but not claimable
          LoggingService.instance.loyalty('Not enough points for donut - ${points} < 5 - showing but not claimable');
        }
        
        LoggingService.instance.loyalty('Final reward flags - donut: $rewardClaimed5, coffee: $rewardClaimed10');
      });
    }
  }

  Future<void> fetchPoints({bool forceRefresh = false}) async {
    if (!mounted) return;
    
    // Rate limiting to prevent excessive API calls
    final now = DateTime.now();
    if (!forceRefresh && _lastApiCall != null && now.difference(_lastApiCall!) < _apiCooldown) {
      LoggingService.instance.loyalty('Rate limiting: skipping API call (too soon)');
      return;
    }
    _lastApiCall = now;
    
    // If we already have initial points, don't fetch again unless forced
    if (widget.initialPoints != null && points == widget.initialPoints && !forceRefresh) {
      LoggingService.instance.loyalty('Using cached initial points, skipping fetch');
      return;
    }
    
    // Reset session state when fetching new points
    
    // Clear cache if force refresh is requested (but not authentication data)
    if (forceRefresh) {
      try {
        await CacheService.clearCache('user_qr_${widget.qrToken}');
        LoggingService.instance.loyalty('Cache cleared for force refresh');
      } catch (e) {
        LoggingService.instance.warning('Failed to clear cache, continuing anyway', e);
      }
    }
    
    if (mounted) {
      setState(() {
        isLoading = true;
        errorMsg = null;
      });
    }
    
    LoggingService.instance.loyalty('Fetching points for QR token: ${widget.qrToken}');
    
    try {
      if (widget.qrToken.isNotEmpty) {
        Map<String, dynamic>? response;
        try {
          response = await ApiService.getUserByQrToken(widget.qrToken);
        } catch (apiError) {
          // Handle API errors (429, 400, 500, etc.)
          LoggingService.instance.error('API error during getUserByQrToken', apiError);
          
          if (mounted) {
            setState(() {
              isLoading = false;
              errorMsg = apiError.toString().replaceFirst('Exception: ', '');
            });
          }
          
          // Show user-friendly error message
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(apiError.toString().replaceFirst('Exception: ', '')),
                backgroundColor: Colors.orange,
                duration: const Duration(seconds: 4),
                action: SnackBarAction(
                  label: 'Retry',
                  textColor: Colors.white,
                  onPressed: () => fetchPoints(forceRefresh: true),
                ),
              ),
            );
          }
          return;
        }
        LoggingService.instance.loyalty('API response', response);
        if (response != null) {
          final userPoints = _parseIntSafe(response['points']);
          final fetchedCycle = _parseIntSafe(response['currentCycle'], 1);
          LoggingService.instance.loyalty('Extracted points: $userPoints, cycle: $fetchedCycle');
          
          // Validate points to prevent glitches
          int validatedPoints = userPoints;
          if (userPoints < 0) {
            LoggingService.instance.warning('Invalid points from API: $userPoints, setting to 0');
            validatedPoints = 0;
          } else if (userPoints > 1000) {
            LoggingService.instance.warning('Points exceed reasonable limit: $userPoints, capping at 1000');
            validatedPoints = 1000;
          }
          
          if (mounted) {
            setState(() {
              points = validatedPoints;
              currentCycle = fetchedCycle;
              isLoading = false;
            });
            
            // Update dynamic reward claim status when points change (only if activeRewards are loaded)
            if (!_isLoadingRewards && activeRewards.isNotEmpty) {
              _checkRewardClaimStatus();
            }
          }
          if (widget.onPointsUpdated != null) {
            widget.onPointsUpdated!();
          }
          
          // Notify parent of points change
          if (widget.onPointsChanged != null) {
            widget.onPointsChanged!(userPoints);
          }
          await fetchRewardHistory(forceRefresh: true);
        } else {
          LoggingService.instance.loyalty('QR token lookup failed, keeping current points');
          // If QR token lookup fails, keep current points instead of resetting to 0
          if (mounted) {
            setState(() {
              // Keep current points instead of resetting to 0
              final currentPoints = points;
              points = currentPoints ?? 0;
              isLoading = false;
              LoggingService.instance.loyalty('DEBUGGING PROTECTION: QR lookup failed, keeping points at: $currentPoints');
            });
          }
          // Don't trigger more slow requests when server is down
        }
      } else {
        LoggingService.instance.loyalty('No QR token provided, keeping current points');
        // If no QR token, keep current points instead of resetting to 0
        if (mounted) {
          setState(() {
            // Keep current points instead of resetting to 0
            final currentPoints = points;
            points = currentPoints ?? 0;
            isLoading = false;
            LoggingService.instance.loyalty('DEBUGGING PROTECTION: No QR token, keeping points at: $currentPoints');
          });
        }
        // Don't notify parent of points change since we're keeping current points
        await fetchRewardHistory();
      }
    } catch (e) {
      LoggingService.instance.error('Error fetching points', e);
      // If there's an error, keep current points instead of resetting to 0
      if (mounted) {
        setState(() {
          // Keep current points instead of resetting to 0
          final currentPoints = points;
          points = currentPoints ?? 0;
          isLoading = false;
          errorMsg = 'Failed to load points. Please try again.';
          LoggingService.instance.loyalty('DEBUGGING PROTECTION: Error occurred, keeping points at: $currentPoints');
        });
      }
      // Don't notify parent of points change since we're keeping current points
      // Don't fetch reward history if there's an error to prevent cascading failures
      if (mounted) {
        setState(() {
          _isLoadingRewardHistory = false;
        });
      }
    }
  }


  // Method to force refresh points (bypasses cache)
  Future<void> forceRefreshPoints() async {
    LoggingService.instance.loyalty('Force refreshing points...');
    await fetchPoints(forceRefresh: true);
  }


  @override
  Widget build(BuildContext context) {
    try {
      LoggingService.instance.loyalty('Building LoyaltyPage - isLoading: $isLoading, points: $points, errorMsg: $errorMsg');
      final widget = _buildLoyaltyScaffold(context);
      LoggingService.instance.loyalty('LoyaltyPage widget built successfully');
      return widget;
    } catch (e, st) {
      LoggingService.instance.error('Loyalty page build error', e, st);
      // Return a simple fallback that always renders
      return Container(
        color: const Color(0xFFF8F9FA),
        child: SafeArea(
          child: Center(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.warning_amber_rounded, size: 48, color: Colors.orange),
                  const SizedBox(height: 16),
                  const Text('Something went wrong', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600)),
                  const SizedBox(height: 8),
                  Text('Error: ${e.toString()}', style: const TextStyle(fontSize: 12, color: Colors.red), textAlign: TextAlign.center),
                  const SizedBox(height: 24),
                  ElevatedButton.icon(
                    onPressed: () {
                      setState(() {
                        errorMsg = null;
                        isLoading = true;
                      });
                      fetchPoints(forceRefresh: true);
                    },
                    icon: const Icon(Icons.refresh),
                    label: const Text('Retry'),
                  ),
                ],
              ),
            ),
          ),
        ),
      );
    }
  }

  Widget _buildLoyaltyScaffold(BuildContext context) {
    try {
      // Never touch controllers after dispose (prevents "used after being disposed" crash)
      final Animation<double> safeFade = _controllersDisposed
          ? const AlwaysStoppedAnimation<double>(1.0)
          : (_fadeController.isAnimating || _fadeController.isCompleted
              ? _fadeAnimation
              : const AlwaysStoppedAnimation<double>(1.0));
      final Animation<Offset> safeSlide = _controllersDisposed
          ? const AlwaysStoppedAnimation<Offset>(Offset.zero)
          : _slideAnimation;
      final Animation<double> safeScale = _controllersDisposed
          ? const AlwaysStoppedAnimation<double>(1.0)
          : _scaleAnimation;
      // Do NOT use Scaffold here: nested Scaffold's FAB slot can stay unlaid-out. Homepage has the Scaffold.
      // LayoutBuilder ensures Container always gets explicit size from constraints (avoids "no size" crash)
      return LayoutBuilder(
        builder: (context, constraints) {
          try {
            // Ensure we have valid constraints before building
            if (constraints.maxWidth <= 0 || constraints.maxHeight <= 0) {
              LoggingService.instance.warning('Invalid constraints in LayoutBuilder: ${constraints.maxWidth}x${constraints.maxHeight}');
              return const Center(child: CircularProgressIndicator());
            }
            return SizedBox(
              width: constraints.maxWidth,
              height: constraints.maxHeight,
              child: Container(
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
              child: Column(
                children: [
            // Header: same background and size as Profile page
            FadeTransition(
                opacity: safeFade,
                child: Container(
                  height: 70,
                  width: double.infinity,
                  decoration: const BoxDecoration(
                    image: DecorationImage(
                      image: AssetImage('assets/images/istetik.png'),
                      fit: BoxFit.cover,
                    ),
                  ),
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    children: [
                      Image.asset(
                        'assets/images/loyaltyicon.png',
                        height: 32,
                        width: 32,
                        errorBuilder: (_, __, ___) => const Icon(Icons.card_membership, size: 32, color: Colors.white),
                      ),
                      const SizedBox(width: 12),
                      const Text(
                        'My Loyalty Card',
                        style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.w600,
                          color: Colors.white,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              Expanded(
                child: FadeTransition(
                  opacity: safeFade,
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    child: RefreshIndicator(
                      onRefresh: () async {
                        LoggingService.instance.loyalty('Pull-to-refresh triggered');
                        await clearCacheAndRefresh();
                      },
                      color: const Color(0xFF242C5B),
                      backgroundColor: Colors.white,
                      child: ListView(
                      physics: const AlwaysScrollableScrollPhysics(),
                      cacheExtent: 200,
                      padding: EdgeInsets.only(
                        bottom: MediaQuery.of(context).padding.bottom + 40,
                        left: 4,
                        right: 4,
                      ),
                      children: [
                        SizedBox(height: MediaQuery.sizeOf(context).height * 0.02),
                        if (!isLoading && points != null && errorMsg == null)
                          Padding(
                            padding: const EdgeInsets.only(bottom: 12),
                            child: _buildProgressToNextReward(points!),
                          ),
                        // Bounded height so layout completes (avoids render box with no size)
                        SizedBox(
                          height: (MediaQuery.sizeOf(context).height * 0.36).clamp(280.0, 320.0),
                          child: isLoading
                              ? const SkeletonLoyaltyCard()
                              : ScaleTransition(
                                  scale: safeScale,
                                  child: SizedBox.expand(
                                    child: FlipCard(
                                      key: ValueKey<int>(points ?? -1),
                                      fill: Fill.fillBack,
                                      direction: FlipDirection.HORIZONTAL,
                                      front: LoyaltyCardFront(points: points ?? 0),
                                      back: LoyaltyCardBack(
                                        qrToken: widget.qrToken,
                                        getScanToken: () => ApiService.getScanToken(widget.qrToken),
                                      ),
                                    ),
                                  ),
                                ),
                        ), // SizedBox
                        const SizedBox(height: 18),
                        _buildHowItWorksButton(context),
                        const SizedBox(height: 24),
                        SlideTransition(
                          position: safeSlide,
                          child: isLoading
                              ? const Center(
                                  child: Padding(
                                    padding: EdgeInsets.all(24),
                                    child: CircularProgressIndicator(color: Color(0xFF242C5B)),
                                  ),
                                )
                              : errorMsg != null
                                  ? Padding(
                                      padding: const EdgeInsets.all(16),
                                      child: Text(errorMsg!, style: const TextStyle(color: Colors.red)),
                                    )
                                  : _buildStatsSection(points ?? 0),
                        ),
                        const SizedBox(height: 18),
                        if (!isLoading && _isLoadingRewards && errorMsg == null && points != null)
                          const Padding(
                            padding: EdgeInsets.all(16),
                            child: Center(
                              child: CircularProgressIndicator(
                                color: Color(0xFF242C5B),
                                strokeWidth: 2.0,
                              ),
                            ),
                          ),
                        if (!isLoading && errorMsg == null && points != null)
                          ...(_isLoadingRewards && activeRewards.isEmpty
                              ? [const Padding(
                                  padding: EdgeInsets.symmetric(vertical: 12),
                                  child: Center(
                                    child: SizedBox(
                                      width: 24,
                                      height: 24,
                                      child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF242C5B)),
                                    ),
                                  ),
                                )]
                              : _buildDynamicRewardBannersSafe(context, const AlwaysStoppedAnimation<double>(1.0))),
                        const SizedBox(height: 18),
                        _buildRewardHistory(),
                      ],
                    ),
                  ),
                ),
                ),
              ),
            ],
            ),
          ),
        ),
        );
            } catch (e, st) {
              LoggingService.instance.error('Error in LayoutBuilder builder', e, st);
              return Center(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.error_outline, size: 48, color: Colors.red),
                      const SizedBox(height: 16),
                      Text('Layout error: ${e.toString()}', textAlign: TextAlign.center),
                    ],
                  ),
                ),
              );
            }
          },
        );
      } catch (e, st) {
        LoggingService.instance.error('Error in _buildLoyaltyScaffold', e, st);
        return Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.error_outline, size: 48, color: Colors.red),
                const SizedBox(height: 16),
                Text('Build error: ${e.toString()}', textAlign: TextAlign.center),
              ],
            ),
          ),
        );
      }
    }

  Widget _buildProgressToNextReward(int currentPoints) {
    try {
      const int nextMilestone5 = 5;
      const int nextMilestone10 = 10;
      int target = nextMilestone5;
      if (currentPoints >= 10) target = 10;
      else if (currentPoints >= 5) target = nextMilestone10;
      if (target <= 0) target = 1;
      final progress = (currentPoints / target).clamp(0.0, 1.0);
      final toGo = target - currentPoints;
      final label = currentPoints >= 10
          ? 'You\'re in! Claim rewards at any branch.'
          : toGo <= 0
              ? 'Almost there!'
              : '$toGo point${toGo == 1 ? '' : 's'} to next reward';
      final theme = Theme.of(context);
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
        decoration: BoxDecoration(
          color: AppTheme.neutral0,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: AppTheme.neutral200),
          boxShadow: [
            BoxShadow(
              color: AppTheme.primary.withValues(alpha: 0.06),
              blurRadius: 12,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Flexible(
                  child: Text(
                    'Progress to next reward',
                    style: (theme.textTheme.titleSmall ?? theme.textTheme.bodyMedium)?.copyWith(
                          color: AppTheme.primary,
                          fontWeight: FontWeight.w600,
                        ) ?? TextStyle(color: AppTheme.primary, fontWeight: FontWeight.w600),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppTheme.accent.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    '$currentPoints / $target',
                    style: (theme.textTheme.labelLarge ?? theme.textTheme.bodyMedium)?.copyWith(
                          color: AppTheme.accentDark,
                          fontWeight: FontWeight.w700,
                        ) ?? TextStyle(color: AppTheme.accentDark, fontWeight: FontWeight.w700),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            ClipRRect(
              borderRadius: BorderRadius.circular(10),
              child: LinearProgressIndicator(
                value: progress,
                minHeight: 10,
                backgroundColor: AppTheme.neutral100,
                valueColor: const AlwaysStoppedAnimation<Color>(AppTheme.accent),
              ),
            ),
            const SizedBox(height: 8),
            Text(
              label,
              style: (theme.textTheme.bodySmall ?? theme.textTheme.bodyMedium)?.copyWith(
                    color: AppTheme.neutral500,
                  ) ?? TextStyle(color: AppTheme.neutral500),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      );
    } catch (e, st) {
      LoggingService.instance.error('_buildProgressToNextReward', e, st);
      return Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppTheme.neutral0,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppTheme.neutral200),
        ),
        child: Text('$currentPoints / 10 stamps', style: TextStyle(color: AppTheme.primary, fontWeight: FontWeight.w600)),
      );
    }
  }

  Widget _buildHowItWorksButton(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      height: 52,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () {
            AppHaptics.selection();
            Navigator.of(context).push(
              MaterialPageRoute(
                builder: (context) => const LoyaltyRulesScreen(),
              ),
            );
          },
          borderRadius: BorderRadius.circular(14),
          child: Container(
            width: double.infinity,
            height: 52,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(14),
              image: const DecorationImage(
                image: AssetImage('assets/images/istetik.png'),
                fit: BoxFit.cover,
              ),
            ),
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Image.asset(
                  'assets/images/manual-book.png',
                  height: 24,
                  width: 24,
                  errorBuilder: (_, __, ___) => const Icon(Icons.menu_book_rounded, size: 24, color: Colors.white),
                ),
                const SizedBox(width: 12),
                const Text(
                  'How it works',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: Colors.white,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  static List<Map<String, dynamic>> get _defaultRewards => [
    {
      '_id': 'default_donut_5',
      'title': 'Free Donut',
      'description': 'Claim your free donut with 5 stamps!',
      'pointsRequired': 5,
      'rewardType': 'donut',
      'bannerColor': '#FFB74D',
      'iconName': 'cake',
      'isActive': true,
      'status': 'Active',
      'priority': 1,
    },
    {
      '_id': 'default_coffee_10',
      'title': 'Free Coffee',
      'description': 'Claim your free coffee with 10 stamps!',
      'pointsRequired': 10,
      'rewardType': 'coffee',
      'bannerColor': '#81C784',
      'iconName': 'local_cafe',
      'isActive': true,
      'status': 'Active',
      'priority': 2,
    },
  ];

  /// Safe wrapper so a single bad reward never crashes the page.
  List<Widget> _buildDynamicRewardBannersSafe(BuildContext context, [Animation<double>? animation]) {
    try {
      // Removed animation parameter usage to prevent rebuild loops causing MouseTracker errors
      final rewardsToUse = activeRewards.isEmpty ? _defaultRewards : activeRewards;
      LoggingService.instance.loyalty('Building reward banners - activeRewards: ${activeRewards.length}, using: ${rewardsToUse.length}, points: $points');
      final banners = _buildDynamicRewardBannersFromList(context, rewardsToUse);
      LoggingService.instance.loyalty('Built ${banners.length} reward banners');
      return banners;
    } catch (e, st) {
      LoggingService.instance.error('Error building reward banners', e, st);
      return [];
    }
  }

  List<Widget> _buildDynamicRewardBannersFromList(BuildContext context, List<Map<String, dynamic>> rewardsList) {
    if (rewardsList.isEmpty) return [];
    // Removed opacity/animation to prevent rebuild loops causing MouseTracker errors
    List<Widget> banners = [];
    
    for (final reward in rewardsList) {
      final pointsRequired = _parseIntSafe(reward['pointsRequired']);
      final rawId = reward['_id'] as String? ?? '';
      final rewardId = rawId.isEmpty ? '${reward['title']}_$pointsRequired' : rawId;
      final title = reward['title'] as String? ?? '';
      final description = reward['description'] as String? ?? '';
      final rewardType = reward['rewardType'] as String? ?? '';
      
      // Set appropriate colors and icons based on reward type and points
      String bannerColor = '#FFD700'; // Default amber
      String iconName = 'emoji_events'; // Default icon
      
      if (pointsRequired == 5) {
        bannerColor = '#FFB74D'; // Light orange for donut
        iconName = 'cake';
      } else if (pointsRequired == 10) {
        bannerColor = '#81C784'; // Light green for coffee
        iconName = 'local_cafe';
      }
      
      // Override with database values if they exist
      if (reward['bannerColor'] != null) {
        bannerColor = reward['bannerColor'] as String;
      }
      if (reward['iconName'] != null) {
        iconName = reward['iconName'] as String;
      }
      
      if (points == null) continue;
      final hasEnoughPoints = points! >= pointsRequired;
      final isClaimed = rewardClaimedStatus[rewardId] ?? false;
      
      // Reward banners are always shown (5-point and 10-point) so user always sees what they can earn.
      // User can claim 5-point anytime when they have 5–10 points; 10-point when they have 10.
      // After claiming 10-point, points reset and new cycle begins. Claimed state is per cycle.
      final bool shouldShow = true;
      LoggingService.instance.loyalty('Reward banner: $title hasEnoughPoints=$hasEnoughPoints, isClaimed=$isClaimed');
      
      if (shouldShow) {
        // Bounded height so ListView hit-test works; responsive to screen size
        final screenHeight = MediaQuery.sizeOf(context).height;
        final bannerHeight = (screenHeight * 0.14).clamp(100.0, 140.0);
        banners.add(
          RepaintBoundary(
            key: ValueKey('reward_banner_$rewardId'),
            child: SizedBox(
              height: bannerHeight,
              child: _buildDynamicRewardBanner(
                context,
                rewardId: rewardId,
                title: title,
                description: description,
                pointsRequired: pointsRequired,
                rewardType: rewardType,
                bannerColor: bannerColor,
                iconName: iconName,
                isClaimable: hasEnoughPoints && !isClaimed,
              ),
            ),
          ),
        );
      }
    }
    
    return banners;
  }

  Widget _buildDynamicRewardBanner(
    BuildContext context, {
    required String rewardId,
    required String title,
    required String description,
    required int pointsRequired,
    required String rewardType,
    required String bannerColor,
    required String iconName,
    bool isClaimable = true,
  }) {
    try {
      final safeIconName = (iconName).toString().trim().toLowerCase();
      if (safeIconName.isEmpty) return _rewardBannerFallback(title);
      // Parse banner color
      Color backgroundColor;
      try {
        final hex = bannerColor.replaceFirst('#', '0xFF').trim();
        backgroundColor = Color(int.parse(hex.isEmpty ? '0xFFFFF8E1' : hex));
      } catch (e) {
        backgroundColor = Colors.amber.shade100;
      }
      // Get appropriate icon
      IconData iconData;
      switch (safeIconName) {
        case 'emoji_events':
          iconData = Icons.emoji_events;
          break;
        case 'local_cafe':
          iconData = Icons.local_cafe;
          break;
        case 'cake':
          iconData = Icons.cake;
          break;
        case 'star':
          iconData = Icons.star;
          break;
        default:
          iconData = Icons.emoji_events;
      }
      final luminance = backgroundColor.computeLuminance();
      final textColor = luminance > 0.5 ? Colors.black87 : Colors.white;
      return Card(
        color: backgroundColor,
        margin: const EdgeInsets.symmetric(vertical: 4),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          child: Row(
            children: [
              Icon(iconData, color: textColor, size: 28),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: textColor),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    if (description.isNotEmpty) ...[
                      const SizedBox(height: 2),
                      Text(
                        description,
                        style: TextStyle(fontSize: 13, color: luminance > 0.5 ? Colors.black54 : Colors.white70),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ],
                ),
              ),
              Builder(
                builder: (context) {
                  final alreadyClaimed = rewardClaimedStatus[rewardId] == true;
                  final currentPoints = points ?? 0;
                  final canClaimNow = currentPoints >= pointsRequired;
                  final isDonutReward = pointsRequired == 5;
                  final isCoffeeReward = pointsRequired == 10;

                  // Donut (5 points): show "Claim" only if not already claimed this cycle.
                  if (isDonutReward) {
                    if (canClaimNow && alreadyClaimed) {
                      return const Padding(
                        padding: EdgeInsets.symmetric(horizontal: 8),
                        child: Text('Claimed', style: TextStyle(color: Colors.green, fontWeight: FontWeight.bold)),
                      );
                    }
                    if (canClaimNow) {
                      return ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF242C5B),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          minimumSize: const Size(72, 36),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        ),
                        onPressed: _isClaimingReward ? null : () {
                          _claimDynamicReward(context, rewardId, pointsRequired, rewardType, title);
                        },
                        child: _isClaimingReward
                            ? const SizedBox(
                                width: 16,
                                height: 16,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                                ),
                              )
                            : const Text('Claim'),
                      );
                    }
                    return Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 8),
                      child: Text(
                        'Need ${pointsRequired - currentPoints} more points',
                        style: const TextStyle(color: Colors.orange, fontWeight: FontWeight.bold),
                      ),
                    );
                  }

                  // Coffee (10 points): show "Claim" only if not already claimed this cycle.
                  if (isCoffeeReward) {
                    if (canClaimNow && alreadyClaimed) {
                      return const Padding(
                        padding: EdgeInsets.symmetric(horizontal: 8),
                        child: Text('Claimed', style: TextStyle(color: Colors.green, fontWeight: FontWeight.bold)),
                      );
                    }
                    if (canClaimNow) {
                      return ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF242C5B),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          minimumSize: const Size(72, 36),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        ),
                        onPressed: _isClaimingReward ? null : () {
                          _claimDynamicReward(context, rewardId, pointsRequired, rewardType, title);
                        },
                        child: _isClaimingReward
                            ? const SizedBox(
                                width: 16,
                                height: 16,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                                ),
                              )
                            : const Text('Claim'),
                      );
                    }
                    if (alreadyClaimed) {
                      return const Padding(
                        padding: EdgeInsets.symmetric(horizontal: 8),
                        child: Text('Claimed', style: TextStyle(color: Colors.green, fontWeight: FontWeight.bold)),
                      );
                    }
                    return Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 8),
                      child: Text(
                        'Need ${pointsRequired - currentPoints} more points',
                        style: const TextStyle(color: Colors.orange, fontWeight: FontWeight.bold),
                      ),
                    );
                  }

                  // Fallback for other reward types (if any)
                  if (alreadyClaimed) {
                    return const Padding(
                      padding: EdgeInsets.symmetric(horizontal: 8),
                      child: Text('Claimed', style: TextStyle(color: Colors.green, fontWeight: FontWeight.bold)),
                    );
                  }
                  if (isClaimable) {
                    return ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF242C5B),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        minimumSize: const Size(72, 36),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                      onPressed: _isClaimingReward ? null : () {
                        _claimDynamicReward(context, rewardId, pointsRequired, rewardType, title);
                      },
                      child: _isClaimingReward
                          ? const SizedBox(
                              width: 16,
                              height: 16,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                              ),
                            )
                          : const Text('Claim'),
                    );
                  }
                  return Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 8),
                    child: Text(
                      'Need ${pointsRequired - currentPoints} more points',
                      style: const TextStyle(color: Colors.orange, fontWeight: FontWeight.bold),
                    ),
                  );
                },
              ),
            ],
          ),
        ),
      );
    } catch (e, st) {
      LoggingService.instance.error('_buildDynamicRewardBanner', e, st);
      return _rewardBannerFallback(title);
    }
  }

  Widget _rewardBannerFallback(String title) {
    return Card(
      margin: const EdgeInsets.symmetric(vertical: 8),
      color: Colors.amber.shade100,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            const Icon(Icons.card_giftcard, size: 32, color: Colors.brown),
            const SizedBox(width: 12),
            Expanded(child: Text(title, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 16))),
          ],
        ),
      ),
    );
  }

  void _claimDynamicReward(BuildContext context, String rewardId, int pointsRequired, String rewardType, String title) async {
    if (_isClaimingReward) return;
    
    LoggingService.instance.loyalty('Claiming dynamic reward: $title for $pointsRequired points');
    
    if (!mounted) return; // Check if widget is still mounted
    
    if (mounted) {
      setState(() {
        _isClaimingReward = true;
      });
    }
    
    // Show loading dialog
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => const AlertDialog(
        content: Row(
          children: [
            CircularProgressIndicator(),
            SizedBox(width: 16),
            Text('Claiming reward...'),
          ],
        ),
      ),
    );
    
    try {
      if (widget.qrToken.isNotEmpty) {
        final userId = await ApiService.getUserIdByQrToken(widget.qrToken);
        if (userId != null) {
          // Map reward type to the expected format
          String claimType = 'donut'; // Default
          if (rewardType.toLowerCase().contains('coffee') || pointsRequired == 10) {
            claimType = 'coffee';
          } else if (rewardType.toLowerCase().contains('donut') || pointsRequired == 5) {
            claimType = 'donut';
          }
          
          final result = await ApiService.claimReward(userId, claimType, title);
          
          if (result != null && result['success'] != false) {
            // Update local state: points and cycle from server (coffee = reset to 0, cycle advances)
            final newPoints = _parseIntSafe(result['newPoints'], points ?? 0);
            final newCycle = _parseIntSafe(result['currentCycle'], currentCycle + (pointsRequired == 10 ? 1 : 0));
            if (mounted) {
              setState(() {
                points = newPoints; // Coffee: 0; donut: unchanged
                currentCycle = newCycle; // Coffee: cycle advances 1->2->3...
                rewardClaimedStatus[rewardId] = true;
                if (pointsRequired == 10) rewardClaimed10 = true;
                sessionClaimedRewards[rewardId] = DateTime.now();
              });
            }
            
            // Close loading dialog immediately so user is never stuck (don't wait for refresh)
            if (mounted) {
              Navigator.of(context).pop();
            }
            
            // Show success dialog
            if (mounted) {
              AppHaptics.success();
              await showDialog(
                context: context,
                builder: (context) => AlertDialog(
                  title: const Text('Reward claimed!'),
                  content: Text('You\'re in! You claimed: $title. Claim at any Nomu Cafe branch.'),
                  actions: [
                    TextButton(
                      onPressed: () => Navigator.pop(context),
                      child: const Text('Close'),
                    ),
                  ],
                ),
              );
            }
            
            // Refresh in background (with timeout so a slow server never blocks UI)
            if (mounted) {
              Future(() async {
                try {
                  await fetchPoints(forceRefresh: true).timeout(
                    const Duration(seconds: 8),
                    onTimeout: () {
                      if (mounted) _checkRewardClaimStatus();
                      return Future.value();
                    },
                  );
                  await fetchRewardHistory(forceRefresh: true).timeout(const Duration(seconds: 5));
                  if (mounted) _checkRewardClaimStatus();
                } catch (_) {
                  if (mounted) _checkRewardClaimStatus();
                }
              });
            }
          } else {
            // Close loading dialog
            if (mounted) {
              Navigator.pop(context);
            }
            
            // Show error message
            if (mounted) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('Failed to claim reward: ${result?['error'] ?? 'Unknown error'}'),
                  backgroundColor: Colors.red,
                  duration: const Duration(seconds: 3),
                ),
              );
            }
          }
        } else {
          // Close loading dialog
          if (mounted) {
            Navigator.pop(context);
          }
          
          // Show error message
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('User not found. Please try again.'),
                backgroundColor: Colors.red,
                duration: Duration(seconds: 3),
              ),
            );
          }
        }
      } else {
        // Close loading dialog
        if (mounted) {
          Navigator.pop(context);
        }
        
        // Show error message
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Invalid QR token. Please try again.'),
              backgroundColor: Colors.red,
              duration: Duration(seconds: 3),
            ),
          );
        }
      }
    } catch (e) {
      LoggingService.instance.error('Error claiming dynamic reward', e);
      
      // Close loading dialog
      if (mounted) {
        Navigator.pop(context);
      }
      
      // Show error message
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to claim reward: ${e.toString()}'),
            backgroundColor: Colors.red,
            duration: const Duration(seconds: 3),
          ),
        );
      }
    } finally {
      // Reset claiming state
      if (mounted) {
        setState(() {
          _isClaimingReward = false;
        });
      }
    }
  }

  // Removed static _claimReward method - using dynamic rewards only

  Widget _buildRewardHistoryItem(Map<String, dynamic> r) {
    try {
      final d = DateTime.tryParse(r['date'].toString());
      final now = DateTime.now();
      String dateStr = 'Unknown date';
      DateTime? localDate;
      if (d != null) {
        try {
          localDate = d.toLocal();
          final difference = now.difference(localDate);
          if (difference.inMinutes < 1) dateStr = 'Just now';
          else if (difference.inMinutes < 60) dateStr = '${difference.inMinutes}m ago';
          else if (difference.inHours < 24) dateStr = '${difference.inHours}h ago';
          else if (difference.inDays == 1) dateStr = 'Yesterday';
          else if (difference.inDays < 7) dateStr = '${difference.inDays}d ago';
          else dateStr = '${_monthName(localDate.month)} ${localDate.day}, ${localDate.year}';
        } catch (_) {
          dateStr = 'Unknown date';
        }
      }
      final type = (r['type'] as String? ?? '').toLowerCase();
      final isDonut = type == 'donut';
      return Container(
        margin: const EdgeInsets.only(bottom: 8),
        decoration: BoxDecoration(
          color: Colors.grey[50],
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: Colors.grey[200]!),
        ),
        child: ListTile(
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          leading: Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: isDonut ? Colors.orange[100] : Colors.brown[100],
              borderRadius: BorderRadius.circular(8),
            ),
            child: Center(
              child: Image.asset(
                isDonut ? 'assets/images/donut.png' : 'assets/images/coffee.png',
                width: 24,
                height: 24,
                fit: BoxFit.contain,
                errorBuilder: (_, __, ___) => Icon(
                  isDonut ? Icons.cake : Icons.local_cafe,
                  size: 24,
                  color: isDonut ? Colors.orange[700] : Colors.brown[700],
                ),
              ),
            ),
          ),
          title: Text(
            r['description']?.toString() ?? 'Unknown Reward',
            style: const TextStyle(fontWeight: FontWeight.w600),
          ),
          subtitle: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(dateStr, style: TextStyle(color: Colors.grey[600])),
              if (r['cycle'] != null)
                Text('Cycle ${r['cycle']}', style: TextStyle(color: Colors.grey[500], fontSize: 12)),
            ],
          ),
          trailing: localDate != null
              ? Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.grey[100],
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    '${localDate.hour.toString().padLeft(2, '0')}:${localDate.minute.toString().padLeft(2, '0')}',
                    style: TextStyle(color: Colors.grey[600], fontSize: 12, fontWeight: FontWeight.w500),
                  ),
                )
              : null,
        ),
      );
    } catch (e) {
      LoggingService.instance.warning('Error building reward history item', e);
      return ListTile(
        title: const Text('Unknown reward', style: TextStyle(fontStyle: FontStyle.italic)),
        subtitle: Text(r['date']?.toString() ?? ''),
      );
    }
  }

  Widget _buildRewardHistory() {
    try {
      // Wrap Card in RepaintBoundary and ensure it has proper constraints to prevent layout issues
      return RepaintBoundary(
        child: Card(
          margin: const EdgeInsets.symmetric(vertical: 12),
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
              Row(
                children: [
                  const Text('Reward Claim History', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                  const Spacer(),
                  if (_isLoadingRewardHistory)
                    const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    ),
                ],
              ),
              const SizedBox(height: 8),
              if (_isLoadingRewardHistory)
                const Center(
                  child: Padding(
                    padding: EdgeInsets.all(20),
                    child: CircularProgressIndicator(),
                  ),
                )
              else if (rewardsHistory.isEmpty)
                Padding(
                  padding: const EdgeInsets.all(20),
                  child: EmptyStates.noRewards(),
                )
              else
                ...rewardsHistory.take(5).map((r) => _buildRewardHistoryItem(r)),
              ],
            ),
          ),
        ),
      );
    } catch (e, st) {
      LoggingService.instance.error('_buildRewardHistory', e, st);
      return RepaintBoundary(
        child: Card(
          margin: const EdgeInsets.symmetric(vertical: 12),
          child: const Padding(
            padding: EdgeInsets.all(20),
            child: Text('Reward history', style: TextStyle(fontWeight: FontWeight.w600)),
          ),
        ),
      );
    }
  }

  String _monthName(int month) {
    const months = [
      '',
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    if (month < 1 || month > 12) return 'Unknown';
    return months[month];
  }

  Widget _buildStatsSection(int points) {
    try {
      final safePoints = points.clamp(0, 10);
      return Row(
        children: [
          Expanded(
            child: _buildStatCard(
              'Total Stamps',
              '$safePoints/10',
              'assets/images/iskor.png',
            ),
          ),
        ],
      );
    } catch (e, st) {
      LoggingService.instance.error('_buildStatsSection', e, st);
      return Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Text('$points / 10 stamps', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600)),
        ),
      );
    }
  }

  Widget _buildStatCard(String title, String value, String iconAsset) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 20),
      decoration: BoxDecoration(
        color: AppTheme.neutral0,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppTheme.neutral200),
        boxShadow: [
          BoxShadow(
            color: AppTheme.primary.withValues(alpha: 0.06),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Image.asset(
            iconAsset,
            width: 40,
            height: 40,
            fit: BoxFit.contain,
            errorBuilder: (_, __, ___) => Icon(Icons.auto_awesome, size: 40, color: AppTheme.accent),
          ),
          const SizedBox(height: 12),
          Text(
            value,
            style: const TextStyle(
              fontSize: 28,
              fontWeight: FontWeight.w700,
              color: AppTheme.primary,
              letterSpacing: -0.5,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            title,
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w500,
              color: AppTheme.neutral500,
            ),
          ),
        ],
      ),
    );
  }

  // Start auto-refresh timer for cycle completion
  void _startAutoRefreshTimer() {
    _autoRefreshTimer?.cancel();
    _autoRefreshTimer = Timer.periodic(const Duration(minutes: 2), (timer) {
      if (!mounted || _isClaimingReward || errorMsg != null) return;
      fetchPoints(forceRefresh: false);
    });
  }

  // Start time update timer for real-time relative dates
  void _startTimeUpdateTimer() {
    _timeUpdateTimer?.cancel();
    _timeUpdateTimer = Timer.periodic(const Duration(minutes: 1), (timer) {
      if (mounted && rewardsHistory.isNotEmpty) {
        // Trigger a rebuild to update relative time display
        if (mounted) {
          setState(() {
            // This will cause the reward history to rebuild with updated times
          });
        }
      }
    });
  }

  // Method to handle external point updates (prevents glitches)
  void updatePointsFromExternal(int newPoints) {
    if (!mounted) return;
    
    LoggingService.instance.loyalty('External point update received: $newPoints (current: $points)');
    
    // Validate points to prevent glitches
    int validatedPoints = newPoints;
    if (newPoints < 0) {
      LoggingService.instance.warning('Invalid external points: $newPoints, setting to 0');
      validatedPoints = 0;
    } else if (newPoints > 1000) {
      LoggingService.instance.warning('External points exceed reasonable limit: $newPoints, capping at 1000');
      validatedPoints = 1000;
    }
    
    // Only update if points actually changed
    if (validatedPoints != points) {
      if (mounted) {
        setState(() {
          points = validatedPoints;
          isLoading = false;
        });
      }
      
      LoggingService.instance.loyalty('Points updated from external source: $validatedPoints');
      
      // Refresh reward history and claim status when points change
      refreshRewardData();
      
      // Notify parent of points change
      if (widget.onPointsChanged != null) {
        widget.onPointsChanged!(validatedPoints);
      }
    }
  }

  // Method to refresh reward history and claim status
  Future<void> refreshRewardData({bool forceRefresh = false}) async {
    if (!mounted) return;
    
    LoggingService.instance.loyalty('Refreshing reward data...');
    
    try {
      await Future.wait([
        fetchRewardHistory(forceRefresh: forceRefresh),
        fetchActiveRewards(),
      ]);
      
      if (mounted) {
        _checkRewardClaimStatus();
        _checkPreviouslyClaimedRewards();
      }
      
      LoggingService.instance.loyalty('Reward data refreshed successfully');
    } catch (e) {
      LoggingService.instance.error('Error refreshing reward data', e);
    }
  }

  // Method to clear cache and force refresh all data
  Future<void> clearCacheAndRefresh() async {
    if (!mounted) return;
    
    LoggingService.instance.loyalty('Clearing cache and refreshing data...');
    
    try {
      // Clear user-related cache
      await CacheService.clearCachePattern('user_qr_');
      await CacheService.clearCachePattern('user_');
      
      LoggingService.instance.loyalty('Cache cleared, refreshing data...');
      
      // Force refresh all data
      await Future.wait([
        fetchPoints(forceRefresh: true),
        fetchRewardHistory(forceRefresh: true),
        fetchActiveRewards(),
      ]);
      
      if (mounted) {
        _checkRewardClaimStatus();
        _checkPreviouslyClaimedRewards();
      }
      
      LoggingService.instance.loyalty('Cache cleared and data refreshed successfully');
    } catch (e) {
      LoggingService.instance.error('Error clearing cache and refreshing data', e);
    }
  }

}

class LoyaltyCardFront extends StatelessWidget {
  final int points;
  const LoyaltyCardFront({super.key, required this.points});

  @override
  Widget build(BuildContext context) {
    try {
      final safePoints = points.clamp(0, 10);
      final size = MediaQuery.sizeOf(context);
      // Match other sections: ListView has left/right 4, so use full content width
      final cardWidth = size.width - 8;
      final cardHeight = (size.height * 0.32).clamp(220.0, 280.0);
      return Container(
        margin: EdgeInsets.zero,
        width: cardWidth,
        height: cardHeight,
        decoration: BoxDecoration(
          color: AppTheme.neutral0,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: AppTheme.neutral200),
          boxShadow: [
            BoxShadow(
              color: AppTheme.primary.withValues(alpha: 0.08),
              blurRadius: 16,
              offset: const Offset(0, 6),
            ),
          ],
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(20),
          child: Column(
            children: [
              // Same accent bar as back of card
              Container(
                height: 4,
                width: double.infinity,
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [AppTheme.primary, AppTheme.primaryLight],
                    begin: Alignment.centerLeft,
                    end: Alignment.centerRight,
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Text(
                'LOYALTY CARD',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w700,
                  color: AppTheme.primary,
                  letterSpacing: 1.2,
                ),
              ),
              const SizedBox(height: 14),
              Expanded(
                child: _buildStampGrid(safePoints),
              ),
              // Footer strip – same style as back of card
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                decoration: BoxDecoration(
                  color: AppTheme.neutral50.withValues(alpha: 0.6),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    Image.asset(
                      'assets/images/croissant.png',
                      height: 36,
                      errorBuilder: (_, __, ___) => Icon(Icons.breakfast_dining, size: 36, color: AppTheme.accent),
                    ),
                    Text(
                      'Tap card to flip',
                      style: TextStyle(
                        fontSize: 12,
                        color: AppTheme.neutral500,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      );
    } catch (e, st) {
      LoggingService.instance.error('LoyaltyCardFront build error', e, st);
      final size = MediaQuery.sizeOf(context);
      final cardWidth = size.width - 8;
      return Container(
        margin: EdgeInsets.zero,
        width: cardWidth,
        height: 260,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppTheme.neutral0,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: AppTheme.neutral200),
        ),
        alignment: Alignment.center,
        child: Text(
          '${points.clamp(0, 10)} / 10 stamps',
          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600, color: AppTheme.primary),
        ),
      );
    }
  }

  Widget _buildStampGrid(int displayPoints) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: GridView.builder(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 5,
          crossAxisSpacing: 10,
          mainAxisSpacing: 10,
          childAspectRatio: 1,
        ),
        itemCount: 10,
        itemBuilder: (context, index) {
          final isFilled = index < displayPoints;
          return Container(
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: isFilled ? AppTheme.primary : AppTheme.neutral50,
              border: Border.all(
                color: isFilled ? AppTheme.primary : AppTheme.neutral300,
                width: 2,
              ),
              boxShadow: isFilled
                  ? [
                      BoxShadow(
                        color: AppTheme.primary.withValues(alpha: 0.25),
                        blurRadius: 6,
                        offset: const Offset(0, 2),
                      ),
                    ]
                  : null,
            ),
            child: isFilled
                ? const Icon(Icons.check_rounded, color: Colors.white, size: 22)
                : null,
          );
        },
      ),
    );
  }
}

class LoyaltyCardBack extends StatelessWidget {
  final String qrToken;
  final Future<String?> Function()? getScanToken;

  const LoyaltyCardBack({
    super.key,
    required this.qrToken,
    this.getScanToken,
  });

  Future<void> _showQrDialog(BuildContext context) async {
    final fetchToken = getScanToken;
    if (fetchToken == null) {
      _showQrDialogWithToken(context, qrToken);
      return;
    }
    // Show loading, fetch new token, then show dialog (QR changes every time)
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => const Center(
        child: Card(
          child: Padding(
            padding: EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                CircularProgressIndicator(),
                SizedBox(height: 16),
                Text('Preparing your QR code...'),
              ],
            ),
          ),
        ),
      ),
    );
    final token = await fetchToken();
    if (!context.mounted) return;
    Navigator.of(context).pop(); // dismiss loading
    if (token != null && token.isNotEmpty) {
      _showQrDialogWithToken(context, token);
    } else {
      _showQrDialogWithToken(context, qrToken);
    }
  }

  void _showQrDialogWithToken(BuildContext context, String token) {
    final theme = AppTheme.primary;
    showDialog(
      context: context,
      builder: (ctx) => Dialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        child: Container(
          constraints: const BoxConstraints(maxWidth: 320),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                'Your QR Code',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: theme,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Show this at checkout to earn points',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 13,
                  color: Colors.grey.shade600,
                ),
              ),
              const SizedBox(height: 20),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.grey.shade300),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.06),
                      blurRadius: 12,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: QrImageView(
                  data: token,
                  version: QrVersions.auto,
                  size: 200.0,
                  backgroundColor: Colors.white,
                  eyeStyle: const QrEyeStyle(
                    eyeShape: QrEyeShape.square,
                    color: Color(0xFF212C59),
                  ),
                  dataModuleStyle: const QrDataModuleStyle(
                    dataModuleShape: QrDataModuleShape.square,
                    color: Color(0xFF212C59),
                  ),
                ),
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton(
                  onPressed: () => Navigator.of(ctx).pop(),
                  style: OutlinedButton.styleFrom(
                    backgroundColor: Colors.white,
                    foregroundColor: theme,
                    side: BorderSide(color: theme, width: 2),
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

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.sizeOf(context);
    final cardWidth = size.width - 8;
    final cardHeight = (size.height * 0.30).clamp(200.0, 260.0);
    return Container(
      margin: EdgeInsets.zero,
      width: cardWidth,
      height: cardHeight,
      decoration: BoxDecoration(
        color: AppTheme.neutral0,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppTheme.neutral200),
        boxShadow: [
          BoxShadow(
            color: AppTheme.primary.withValues(alpha: 0.08),
            blurRadius: 16,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(20),
        child: Column(
          children: [
            // Subtle accent bar at top
            Container(
              height: 4,
              width: double.infinity,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [AppTheme.primary, AppTheme.primaryLight],
                  begin: Alignment.centerLeft,
                  end: Alignment.centerRight,
                ),
              ),
            ),
            Expanded(
              child: LayoutBuilder(
                builder: (context, constraints) {
                  return SingleChildScrollView(
                    padding: const EdgeInsets.fromLTRB(16, 10, 16, 4),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        _buildInfoSection('VISIT US:', '1200 Lacson St. corner\nDapitan St., Sampaloc, Manila'),
                        const SizedBox(height: 14),
                        _buildInfoSection('WEBSITE:', 'Nomu.cafe'),
                        const SizedBox(height: 14),
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Expanded(
                              child: _buildInfoSection('CONTACT US:', '+63 954-368-0542'),
                            ),
                            const SizedBox(width: 10),
                            GestureDetector(
                              onTap: () => _showQrDialog(context),
                              child: Container(
                                width: 72,
                                height: 72,
                                padding: const EdgeInsets.all(5),
                                decoration: BoxDecoration(
                                  color: AppTheme.neutral50,
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(color: AppTheme.primary.withValues(alpha: 0.35), width: 2),
                                  boxShadow: [
                                    BoxShadow(
                                      color: AppTheme.primary.withValues(alpha: 0.08),
                                      blurRadius: 6,
                                      offset: const Offset(0, 2),
                                    ),
                                  ],
                                ),
                                child: ClipRRect(
                                  borderRadius: BorderRadius.circular(8),
                                  child: QrImageView(
                                    data: qrToken,
                                    version: QrVersions.auto,
                                    size: 62.0,
                                    backgroundColor: AppTheme.neutral50,
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  );
                },
              ),
            ),
            // Footer: middle-bottom hint (compact to avoid overflow)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 5),
              decoration: BoxDecoration(
                color: AppTheme.neutral50.withValues(alpha: 0.6),
              ),
              child: Center(
                child: Text(
                  'Tap QR to show at checkout',
                  style: TextStyle(
                    fontSize: 15,
                    color: AppTheme.neutral500,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoSection(String title, String content) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w700,
            color: AppTheme.primary,
            letterSpacing: 0.6,
          ),
        ),
        const SizedBox(height: 6),
        Text(
          content,
          style: TextStyle(
            fontSize: 18,
            height: 1.4,
            color: AppTheme.neutral700,
          ),
        ),
      ],
    );
  }
}
