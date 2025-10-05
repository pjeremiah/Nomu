import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flip_card/flip_card.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'api/api.dart';
import 'services/socket_service.dart';
import 'services/logging_service.dart';
import 'services/cache_service.dart';
import 'services/scan_limit_notification_service.dart';
import 'config.dart';

class LoyaltyPage extends StatefulWidget {
  final String qrToken;
  final int? initialPoints;
  final VoidCallback? onPointsUpdated;
  final ValueChanged<int>? onPointsChanged; // New callback for when points change
  const LoyaltyPage({super.key, required this.qrToken, this.initialPoints, this.onPointsUpdated, this.onPointsChanged});

  @override
  State<LoyaltyPage> createState() => _LoyaltyPageState();
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
  
  // Dynamic rewards system
  List<Map<String, dynamic>> activeRewards = [];
  bool _isLoadingRewards = true;
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

  @override
  void initState() {
    super.initState();
    LoggingService.instance.loyalty('Initializing LoyaltyPage with QR token: ${widget.qrToken}');
    
    try {
      // Animation setup first (required for TickerProviderStateMixin) - faster animation
      _fadeController = AnimationController(
        duration: const Duration(milliseconds: 600), // Reduced from 1200ms to 600ms
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
        CurvedAnimation(parent: _fadeController, curve: Curves.easeInOut),
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
      
      // Defer data fetching until after first frame - load in parallel for faster display
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) {
          // Only fetch points if we don't have initial points
          if (widget.initialPoints == null) {
            fetchPoints();
          }
          // Load reward history in parallel with other data
          fetchRewardHistory();
          // Fetch current cycle
          _fetchCurrentCycle();
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

  // Handle real-time point updates
  void _refreshPointsFromSocket(Map<String, dynamic> data) async {
    try {
      // Check if widget is still mounted
      if (!mounted) {
        LoggingService.instance.loyalty('Widget disposed, ignoring socket update');
        return;
      }
      
      LoggingService.instance.loyalty('Refreshing points from socket data', data);
      
      // Extract points from socket data
      final newPoints = data['points'] as int?;
      final message = data['message'] as String?;
      final drink = data['drink'] as String?;
      final qrToken = data['qrToken'] as String?;
      
      // Validate that this update is for the current user
      if (qrToken != null && qrToken != widget.qrToken) {
        LoggingService.instance.loyalty('Socket update not for current user, ignoring');
        return;
      }
      
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
        
        // Show enhanced notification with drink info
        final notificationMessage = drink != null 
            ? 'New order: $drink! You now have $validatedPoints stamps'
            : message ?? 'Points updated! You now have $validatedPoints stamps';
            
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Row(
                children: [
                  const Icon(Icons.star, color: Colors.yellow, size: 20),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      notificationMessage,
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
                  fetchPoints(forceRefresh: true);
                  fetchRewardHistory();
                },
              ),
            ),
          );
        }
        
        // Notify parent widget if callback exists
        if (widget.onPointsUpdated != null) {
          widget.onPointsUpdated!();
        }
        
        // Notify parent of points change
        if (widget.onPointsChanged != null) {
          widget.onPointsChanged!(newPoints);
        }
        
        // Refresh reward history to get latest claims
        fetchRewardHistory();
        
        // Update reward claim status when points change
        _checkRewardClaimStatus();
        
        // Fetch current cycle when points change
        _fetchCurrentCycle();
        
        // Show celebration animation for milestone points
        if (newPoints == 5 || newPoints == 10) {
          _showMilestoneCelebration(newPoints);
        }
      }
    }
    } catch (e) {
      LoggingService.instance.error('Error refreshing points from socket', e);
    }
  }

  // Show celebration animation for milestone points
  void _showMilestoneCelebration(int points) {
    showDialog(
      context: context,
      barrierDismissible: true,
      builder: (context) => Dialog(
        backgroundColor: Colors.transparent,
        child: Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.3),
                blurRadius: 20,
                offset: const Offset(0, 10),
              ),
            ],
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(
                Icons.celebration,
                size: 60,
                color: Colors.amber,
              ),
              const SizedBox(height: 16),
              Text(
                'Milestone Reached!',
                style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                  color: const Color(0xFF242C5B),
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'You now have $points stamps!',
                style: TextStyle(
                  fontSize: 18,
                  color: Colors.grey[600],
                ),
              ),
              const SizedBox(height: 20),
              ElevatedButton(
                onPressed: () => Navigator.pop(context),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF242C5B),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 30, vertical: 12),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(25),
                  ),
                ),
                child: const Text('Awesome!'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> fetchRewardHistory({bool forceRefresh = false}) async {
    if (!mounted || _isFetchingRewardHistory) return;
    
    _isFetchingRewardHistory = true;
    if (mounted) {
      setState(() {
        _isLoadingRewardHistory = true;
      });
    }
    
    try {
      if (widget.qrToken.isNotEmpty) {
        final userId = await ApiService.getUserIdByQrToken(widget.qrToken, forceRefresh: forceRefresh);
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
              
              // Update dynamic reward claim status
              _checkRewardClaimStatus();
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
                  
                  // Update dynamic reward claim status
                  _checkRewardClaimStatus();
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
      final rewards = await ApiService.getActiveRewards();
      LoggingService.instance.loyalty('Fetched ${rewards.length} active rewards from database');
      
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
        _checkPreviouslyClaimedRewards();
        
        // Check which dynamic rewards have been claimed
        _checkRewardClaimStatus();
        
        LoggingService.instance.loyalty('Active rewards updated in state: ${activeRewards.length}');
      }
    } catch (e) {
      LoggingService.instance.error('Error fetching active rewards', e);
      if (mounted) {
        setState(() {
          activeRewards = [];
          _isLoadingRewards = false;
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

  Future<void> _fetchCurrentCycle() async {
    try {
      if (widget.qrToken.isNotEmpty) {
        final userId = await ApiService.getUserIdByQrToken(widget.qrToken);
        if (userId != null) {
          final userData = await ApiService.getUserData(userId);
          if (userData != null && userData['success'] == true) {
            final user = userData['user'];
            if (user != null) {
              setState(() {
                currentCycle = user['currentCycle'] ?? 1;
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
    if (points == null || activeRewards.isEmpty) {
      LoggingService.instance.loyalty('Skipping reward claim status check - points: $points, activeRewards: ${activeRewards.length}');
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
      final pointsRequired = reward['pointsRequired'] as int? ?? 0;
      final rewardId = reward['_id'] as String? ?? '';
      final rewardType = reward['rewardType'] as String? ?? '';
      final title = reward['title'] as String? ?? '';
      
      LoggingService.instance.loyalty('Processing reward: $title - $pointsRequired points - $rewardType');
      
      // Check if user has enough points
      if (points! < pointsRequired) {
        rewardClaimedStatus[rewardId] = false; // Not enough points - show reward but not claimable
        LoggingService.instance.loyalty('Not enough points for $title - need $pointsRequired, have $points - showing but not claimable');
        continue;
      }
      
      // Check if this specific reward was claimed
      bool wasClaimed = false;
      
      // For 5-point rewards (donuts), use cycle-based logic
      if (pointsRequired == 5) {
        // Check if claimed in current session (temporary hide for 5 minutes)
        if (sessionClaimedRewards.containsKey(rewardId)) {
          final claimTime = sessionClaimedRewards[rewardId]!;
          final now = DateTime.now();
          final timeDifference = now.difference(claimTime);
          
          // Hide if claimed in current session (within 5 minutes)
          wasClaimed = timeDifference.inMinutes < 5;
          LoggingService.instance.loyalty('5-point reward $title claimed in current session ${timeDifference.inMinutes} minutes ago, hiding: $wasClaimed');
        } else {
          // Check if 5-point reward was claimed in the current cycle
          for (final claim in rewardsHistory) {
            final claimType = claim['type'] as String? ?? '';
            final claimDescription = claim['description'] as String? ?? '';
            final claimCycle = claim['cycle'] as int? ?? 1;
            
            // Check if this claim matches the current reward
            bool isMatch = false;
            
            // Match by type first
            if (claimType.toLowerCase() == 'donut' && pointsRequired == 5) {
              isMatch = true;
            }
            
            // Also try to match by description if type matching fails
            if (!isMatch) {
              if (claimDescription.toLowerCase().contains(title.toLowerCase()) ||
                  title.toLowerCase().contains(claimDescription.toLowerCase())) {
                isMatch = true;
              }
            }
            
            if (isMatch) {
              // Hide if claimed in current cycle (exact match)
              wasClaimed = claimCycle == currentCycle;
              LoggingService.instance.loyalty('5-point reward $title - claim cycle: $claimCycle, current cycle: $currentCycle, hiding: $wasClaimed');
              break;
            }
          }
        }
        
      } else if (pointsRequired == 10) {
        // For 10-point rewards (coffee), check if claimed recently
        // First check if claimed in current session
        if (sessionClaimedRewards.containsKey(rewardId)) {
          final claimTime = sessionClaimedRewards[rewardId]!;
          final now = DateTime.now();
          final timeDifference = now.difference(claimTime);
          
          // Hide if claimed in current session (within 5 minutes)
          wasClaimed = timeDifference.inMinutes < 5;
          LoggingService.instance.loyalty('10-point reward $title claimed in current session ${timeDifference.inMinutes} minutes ago, hiding: $wasClaimed');
        } else {
          // Check historical claims
          for (final claim in rewardsHistory) {
            final claimType = claim['type'] as String? ?? '';
            final claimDescription = claim['description'] as String? ?? '';
            final claimDate = DateTime.tryParse(claim['date'].toString());
            
            // Check if this claim matches the current reward
            bool isMatch = false;
            
            // Match by type first
            if (claimType.toLowerCase() == 'coffee' && pointsRequired == 10) {
              isMatch = true;
            }
            
            // Also try to match by description if type matching fails
            if (!isMatch) {
              if (claimDescription.toLowerCase().contains(title.toLowerCase()) ||
                  title.toLowerCase().contains(claimDescription.toLowerCase())) {
                isMatch = true;
              }
            }
            
            if (isMatch && claimDate != null) {
              // Hide if claimed recently (within 1 minute)
              final now = DateTime.now();
              final timeDifference = now.difference(claimDate);
              wasClaimed = timeDifference.inMinutes < 1;
              LoggingService.instance.loyalty('10-point reward $title - claimed ${timeDifference.inMinutes} minutes ago, hiding: $wasClaimed');
              break;
            }
          }
        }
      } else {
        // For other reward types, use general logic
        // First check if claimed in current session
        if (sessionClaimedRewards.containsKey(rewardId)) {
          final claimTime = sessionClaimedRewards[rewardId]!;
          final now = DateTime.now();
          final timeDifference = now.difference(claimTime);
          
          // Hide if claimed in current session (within 5 minutes)
          wasClaimed = timeDifference.inMinutes < 5;
          LoggingService.instance.loyalty('Reward $title claimed in current session ${timeDifference.inMinutes} minutes ago, hiding: $wasClaimed');
        } else {
          // Check historical claims
          for (final claim in rewardsHistory) {
            final claimDescription = claim['description'] as String? ?? '';
            final claimDate = DateTime.tryParse(claim['date'].toString());
            
            // Check if this claim matches the current reward
            bool isMatch = false;
            if (claimDescription.toLowerCase().contains(title.toLowerCase()) ||
                title.toLowerCase().contains(claimDescription.toLowerCase())) {
              isMatch = true;
            }
            
            if (isMatch && claimDate != null) {
              // Hide if claimed recently (within 1 minute)
              final now = DateTime.now();
              final timeDifference = now.difference(claimDate);
              wasClaimed = timeDifference.inMinutes < 1;
              LoggingService.instance.loyalty('Reward $title - claimed ${timeDifference.inMinutes} minutes ago, hiding: $wasClaimed');
              break;
            }
          }
        }
      }
      
      rewardClaimedStatus[rewardId] = wasClaimed;
      LoggingService.instance.loyalty('Reward $title claim status: $wasClaimed');
    }
    
    LoggingService.instance.loyalty('Final reward claim status: $rewardClaimedStatus');
    
    // Log which rewards are available for claiming
    for (final reward in activeRewards) {
      final pointsRequired = reward['pointsRequired'] as int? ?? 0;
      final rewardId = reward['_id'] as String? ?? '';
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
          final userPoints = response['points'] ?? 0;
          LoggingService.instance.loyalty('Extracted points: $userPoints');
          
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
              isLoading = false;
              
              // Points updated successfully
            });
            
            // Update dynamic reward claim status when points change
            _checkRewardClaimStatus();
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
          // Don't notify parent of points change since we're keeping current points
          await fetchRewardHistory(forceRefresh: true);
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
          child: Column(
            children: [
              // Modernized header
              FadeTransition(
                opacity: _fadeAnimation,
                child: Container(
                  height: 80,
                  width: double.infinity,
                  margin: const EdgeInsets.only(bottom: 8),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFF242C5B), Color(0xFF3A4A8C)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.08),
                        blurRadius: 12,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 7),
                  child: Row(
                    children: [
                      Image.asset(
                        'assets/images/loyaltyicon.png',
                        height: 30,
                        width: 30,
                      ),
                      const SizedBox(width: 5),
                      const Text(
                        'My Loyalty Card',
                        style: TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              Expanded( 
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  child: RefreshIndicator(
                    onRefresh: () async {
                      LoggingService.instance.loyalty('Pull-to-refresh triggered');
                      await clearCacheAndRefresh();
                    },
                    color: const Color(0xFF242C5B),
                    backgroundColor: Colors.white,
                    child: SingleChildScrollView(
                      physics: const AlwaysScrollableScrollPhysics(),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.start,
                        children: [
                          const SizedBox(height: 18),
                          // Loyalty card with animation
                          ScaleTransition(
                          scale: _scaleAnimation,
                          child: FlipCard(
                            fill: Fill.fillBack,
                            direction: FlipDirection.HORIZONTAL,
                            front: LoyaltyCardFront(points: points ?? 0),
                            back: LoyaltyCardBack(qrToken: widget.qrToken),
                          ),
                        ),
                        const SizedBox(height: 18),
                        // How it works button with fade
                        FadeTransition(
                          opacity: _fadeAnimation,
                          child: _buildHowItWorksButton(context),
                        ),
                        const SizedBox(height: 24),
                        // Stats section with slide animation
                        SlideTransition(
                          position: _slideAnimation,
                          child: isLoading
                              ? const Center(
                                  child: CircularProgressIndicator(
                                    color: Color(0xFF242C5B),
                                  ),
                                )
                              : errorMsg != null
                                  ? Text(errorMsg!, style: const TextStyle(color: Colors.red))
                                  : _buildStatsSection(points ?? 0),
                        ),
                        const SizedBox(height: 18),
                        // Show loading indicator for rewards if still loading
                        if (!isLoading && _isLoadingRewards && errorMsg == null && points != null) ...[
                          const Center(
                            child: Padding(
                              padding: EdgeInsets.all(16.0),
                              child: CircularProgressIndicator(
                                color: Color(0xFF242C5B),
                                strokeWidth: 2.0,
                              ),
                            ),
                          ),
                        ],
                        // Show dynamic reward banners as soon as they're loaded (don't wait for reward history)
                        if (!isLoading && !_isLoadingRewards && errorMsg == null && points != null) ...[
                          // Dynamic reward banners from database
                          ..._buildDynamicRewardBanners(context),
                        ],
                        const SizedBox(height: 18),
                        // Reward history with fade
                        FadeTransition(
                          opacity: _fadeAnimation,
                          child: _buildRewardHistory(),
                        ),
                        const SizedBox(height: 10),
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
  }

  Widget _buildHowItWorksButton(BuildContext context) {
    return ElevatedButton.icon(
      style: ElevatedButton.styleFrom(
        backgroundColor: const Color(0xFF242C5B),
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(30),
        ),
      ),
      icon: Image.asset(
        'assets/images/manual-book.png',
        height: 30,
        width: 30,
      ),
      label: const Text(
        'How it works',
        style: TextStyle(
          color: Colors.white,
          fontSize: 14,
          fontWeight: FontWeight.bold,
        ),
      ),
      onPressed: () {
        showDialog(
          context: context,
          builder: (context) {
            return AlertDialog(
              title: const Text('How It Works'),
              content: const Text(
                '• Get 1 stamp for every Transaction.\n'
                '• Complete 5 stamps and get 1 free Donut.\n'
                '• Complete 10 stamps and get 1 free medium Coffee or Pastry.\n'
                'Flip the card to see location and contact details!',
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text('Close'),
                ),
              ],
            );
          },
        );
      },
    );
  }


  List<Widget> _buildDynamicRewardBanners(BuildContext context) {
    LoggingService.instance.loyalty('Building dynamic reward banners - activeRewards: ${activeRewards.length}, points: $points');
    LoggingService.instance.loyalty('Reward claim status: $rewardClaimedStatus');
    
    if (activeRewards.isEmpty) {
      LoggingService.instance.loyalty('No active rewards found, returning empty banners');
      return [];
    }
    
    List<Widget> banners = [];
    
    for (final reward in activeRewards) {
      final pointsRequired = reward['pointsRequired'] as int? ?? 0;
      final rewardId = reward['_id'] as String? ?? '';
      final title = reward['title'] as String? ?? '';
      final description = reward['description'] as String? ?? '';
      final rewardType = reward['rewardType'] as String? ?? '';
      
      LoggingService.instance.loyalty('Building banner for: $title - $pointsRequired points');
      
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
      
      final hasEnoughPoints = points! >= pointsRequired;
      final isClaimed = rewardClaimedStatus[rewardId] ?? false;
      
      LoggingService.instance.loyalty('Reward: $title - Points: $pointsRequired, Has enough: $hasEnoughPoints, Claimed: $isClaimed');
      
      // Show reward if user has enough points and hasn't claimed it, or if user doesn't have enough points (to show progress)
      LoggingService.instance.loyalty('Evaluating reward: $title - Points required: $pointsRequired, User points: $points, Has enough: $hasEnoughPoints, Is claimed: $isClaimed');
      
      if ((hasEnoughPoints && !isClaimed) || (!hasEnoughPoints && !isClaimed)) {
        LoggingService.instance.loyalty('✅ Adding banner for: $title - hasEnoughPoints: $hasEnoughPoints, isClaimed: $isClaimed');
        banners.add(
          FadeTransition(
            opacity: _fadeAnimation,
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
        );
      } else {
        LoggingService.instance.loyalty('❌ Skipping banner for: $title - hasEnoughPoints: $hasEnoughPoints, isClaimed: $isClaimed');
      }
    }
    
    LoggingService.instance.loyalty('Built ${banners.length} dynamic reward banners');
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
    // Parse banner color
    Color backgroundColor;
    try {
      backgroundColor = Color(int.parse(bannerColor.replaceFirst('#', '0xFF')));
    } catch (e) {
      backgroundColor = Colors.amber[100]!; // Fallback color
    }
    
    // Get appropriate icon
    IconData iconData;
    switch (iconName.toLowerCase()) {
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
    
    return Card(
      color: backgroundColor,
      margin: const EdgeInsets.symmetric(vertical: 8),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Icon(iconData, color: backgroundColor.computeLuminance() > 0.5 ? Colors.black87 : Colors.white, size: 32),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                      color: backgroundColor.computeLuminance() > 0.5 ? Colors.black87 : Colors.white,
                    ),
                  ),
                  if (description.isNotEmpty)
                    Text(
                      description,
                      style: TextStyle(
                        fontSize: 14,
                        color: backgroundColor.computeLuminance() > 0.5 ? Colors.black54 : Colors.white70,
                      ),
                    ),
                ],
              ),
            ),
            rewardClaimedStatus[rewardId] == true
                ? const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 8),
                    child: Text('Claimed', style: TextStyle(color: Colors.green, fontWeight: FontWeight.bold)),
                  )
                : isClaimable
                    ? ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF242C5B),
                          foregroundColor: Colors.white,
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
                      )
                    : Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 8),
                        child: Text(
                          'Need ${pointsRequired - (points ?? 0)} more points',
                          style: const TextStyle(color: Colors.orange, fontWeight: FontWeight.bold),
                        ),
                      ),
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
            // Update local state
            if (mounted) {
              setState(() {
                // For 5-point rewards, don't hide the banner - let the cycle logic handle it
                // Points are NOT deducted for donut rewards, so user can claim again
                if (pointsRequired == 5) {
                  LoggingService.instance.loyalty('5-point reward claimed - points remain, banner will be re-evaluated');
                  // Don't set rewardClaimedStatus[rewardId] = true for 5-point rewards
                  // This allows the reward to remain visible and claimable
                } else {
                  rewardClaimedStatus[rewardId] = true;
                }
                
                sessionClaimedRewards[rewardId] = DateTime.now(); // Track session claim
                
                // Update legacy flags for compatibility
                if (pointsRequired == 5) {
                  // For 5-point rewards, don't hide permanently - let cycle logic handle it
                  // Points are NOT deducted for donut rewards, so user can claim again
                } else if (pointsRequired == 10) {
                  rewardClaimed10 = true; // Hide coffee button after claiming (points reset to 0)
                }
              });
            }
            
            // Refresh points and reward history
            await fetchPoints(forceRefresh: true);
            await fetchRewardHistory(forceRefresh: true);
            
            // Refresh dynamic reward claim status after a short delay to ensure data is updated
            await Future.delayed(const Duration(milliseconds: 500));
            if (mounted) {
              _checkRewardClaimStatus();
            }
            
            // Close loading dialog
            if (mounted) {
              Navigator.pop(context);
            }
            
            // Show success dialog
            if (mounted) {
              await showDialog(
                context: context,
                builder: (context) => AlertDialog(
                  title: const Text('Reward Claimed'),
                  content: Text('Congratulations! You claimed: $title'),
                  actions: [
                    TextButton(
                      onPressed: () => Navigator.pop(context),
                      child: const Text('Close'),
                    ),
                  ],
                ),
              );
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

  Widget _buildRewardHistory() {
    return Card(
      margin: const EdgeInsets.symmetric(vertical: 12),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
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
              const Padding(
                padding: EdgeInsets.all(20),
                child: Center(
                  child: Text(
                    'No rewards claimed yet.',
                    style: TextStyle(color: Colors.grey, fontSize: 16),
                  ),
                ),
              )
            else
              ...rewardsHistory.take(5).map((r) {
                final d = DateTime.tryParse(r['date'].toString());
                final now = DateTime.now();
                String dateStr = '';
                DateTime? localDate;
                
                if (d != null) {
                  try {
                    // Convert to local timezone if needed
                    localDate = d.toLocal();
                    final difference = now.difference(localDate);
                    
                    if (difference.inMinutes < 1) {
                      dateStr = 'Just now';
                    } else if (difference.inMinutes < 60) {
                      dateStr = '${difference.inMinutes}m ago';
                    } else if (difference.inHours < 24) {
                      dateStr = '${difference.inHours}h ago';
                    } else if (difference.inDays == 1) {
                      dateStr = 'Yesterday';
                    } else if (difference.inDays < 7) {
                      dateStr = '${difference.inDays}d ago';
                    } else {
                      // Show full date for older claims
                      dateStr = '${_monthName(localDate.month)} ${localDate.day}, ${localDate.year}';
                    }
                  } catch (e) {
                    LoggingService.instance.warning('Error parsing date: ${r['date']}', e);
                    dateStr = 'Unknown date';
                  }
                } else {
                  dateStr = 'Unknown date';
                }
                
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
                        color: r['type'] == 'donut' ? Colors.orange[100] : Colors.brown[100],
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Center(
                        child: Image.asset(
                          r['type'] == 'donut' ? 'assets/images/donut.png' : 'assets/images/coffee.png',
                          width: 24,
                          height: 24,
                          fit: BoxFit.contain,
                          errorBuilder: (context, error, stackTrace) {
                            return Icon(
                              r['type'] == 'donut' ? Icons.cake : Icons.local_cafe,
                              size: 24,
                              color: r['type'] == 'donut' ? Colors.orange[700] : Colors.brown[700],
                            );
                          },
                        ),
                      ),
                    ),
                    title: Text(
                      r['description'] ?? 'Unknown Reward',
                      style: const TextStyle(fontWeight: FontWeight.w600),
                    ),
                    subtitle: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          dateStr,
                          style: TextStyle(color: Colors.grey[600]),
                        ),
                        if (r['cycle'] != null)
                          Text(
                            'Cycle ${r['cycle']}',
                            style: TextStyle(
                              color: Colors.grey[500],
                              fontSize: 12,
                            ),
                          ),
                      ],
                    ),
                    trailing: localDate != null ? Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.grey[100],
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        '${localDate.hour.toString().padLeft(2, '0')}:${localDate.minute.toString().padLeft(2, '0')}',
                        style: TextStyle(
                          color: Colors.grey[600],
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ) : null,
                  ),
                );
              }),
          ],
        ),
      ),
    );
  }

  String _monthName(int month) {
    const months = [
      '',
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[month];
  }

  Widget _buildStatsSection(int points) {
    return Row(
      children: [
        Expanded(
          child: _buildStatCard(
            'Total Stamps',
            '$points/10',
            'assets/images/iskor.png',
          ),
        ),
      ],
    );
  }

  Widget _buildStatCard(String title, String value, String iconAsset) {
    return Card(
      elevation: 4,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Image.asset(
              iconAsset,
              width: 32,
              height: 32,
              fit: BoxFit.contain,
            ),
            const SizedBox(height: 8),
            Text(
              value,
              style: const TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: Color(0xFF242C5B),
              ),
            ),
            const SizedBox(height: 4),
            Text(
              title,
              style: TextStyle(
                fontSize: 14,
                color: Colors.grey[600],
              ),
            ),
          ],
        ),
      ),
    );
  }

  // Start auto-refresh timer for cycle completion
  void _startAutoRefreshTimer() {
    _autoRefreshTimer?.cancel();
    _autoRefreshTimer = Timer.periodic(const Duration(minutes: 2), (timer) {
      if (mounted && !_isClaimingReward) {
        // Gentle periodic refresh without forcing
        fetchPoints(forceRefresh: false);
      }
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
    return Card(
      elevation: 4,
      margin: const EdgeInsets.all(8),
      child: Container(
        width: 360,
        height: 260,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.grey.shade300),
        ),
        child: Column(
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Text(
                  'LOYALTY CARD',
                  style: TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.bold,
                    color: Colors.indigo,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Expanded(
              child: _buildStampGrid(),
            ),
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.start,
              children: [
                Image.asset(
                  'assets/images/croissant.png',
                  height: 36,
                  errorBuilder: (context, error, stackTrace) {
                    return const Icon(
                      Icons.cake,
                      size: 36,
                      color: Colors.brown,
                    );
                  },
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStampGrid() {
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 5,
        crossAxisSpacing: 8,
        mainAxisSpacing: 8,
        childAspectRatio: 1,
      ),
      itemCount: 10,
      itemBuilder: (context, index) {
        final isFilled = index < points;
        return Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: isFilled ? Colors.indigo : Colors.transparent,
            border: Border.all(
              color: isFilled ? Colors.indigo : Colors.grey.shade400, 
              width: 3
            ),
          ),
          child: isFilled
              ? const Icon(Icons.check, color: Colors.white, size: 24)
              : const Icon(Icons.circle_outlined, color: Colors.grey, size: 24),
        );
      },
    );
  }
}

class LoyaltyCardBack extends StatelessWidget {
  final String qrToken;
  const LoyaltyCardBack({super.key, required this.qrToken});

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 4,
      margin: const EdgeInsets.all(8),
      child: Container(
        width: 340,
        height: 240,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.grey.shade300),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildInfoSection(
              'VISIT US:',
              '1200 Lacson St. corner\nDapitan St., Sampaloc, Manila',
            ),
            const SizedBox(height: 8),
            _buildInfoSection(
              'CONTACT US:',
              '+63 954-368-0542',
            ),
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: _buildInfoSection('CHECK OUR WEBSITE:', '@NOMU.PH'),
                ),
                GestureDetector(
                  onTap: () {
                    showDialog(
                      context: context,
                      builder: (context) => AlertDialog(
                        title: const Text('Your QR Code'),
                        content: SizedBox(
                          width: 200,
                          height: 200,
                          child: QrImageView(
                            data: qrToken,
                            version: QrVersions.auto,
                            size: 200.0,
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
                  },
                  child: Container(
                    width: 90,
                    height: 90,
                    decoration: BoxDecoration(
                      border: Border.all(color: Colors.grey.shade300),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: QrImageView(
                      data: qrToken,
                      version: QrVersions.auto,
                      size: 90.0,
                    ),
                  ),
                ),
              ],
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
            fontWeight: FontWeight.bold,
            color: Colors.indigo,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          content,
          style: const TextStyle(
            fontSize: 14,
            color: Colors.black87,
          ),
        ),
      ],
    );
  }
}
