import 'dart:async';
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'login.dart';
import 'api/api.dart';
import 'services/socket_service.dart';
import 'services/inventory_scanner_service.dart';
import 'services/menu_service.dart';
import 'widgets/custom_toast.dart';
import 'widgets/notification_banner.dart';
import 'utils/qr_validation_utils.dart';
import 'utils/logger.dart';
import 'constants/app_constants.dart';

class BaristaScannerPage extends StatefulWidget {
  final VoidCallback? onPointsUpdated;
  const BaristaScannerPage({super.key, this.onPointsUpdated});

  @override
  State<BaristaScannerPage> createState() => _BaristaScannerPageState();
}

class _BaristaScannerPageState extends State<BaristaScannerPage> with WidgetsBindingObserver {
  MobileScannerController? controller;
  String? qrResult;
  bool isCameraPaused = false;
  bool isProcessing = false;
  Timer? _animationTimer;
  Timer? _debounceTimer;
  String? _lastScannedCode;
  DateTime? _lastScanTime;
  static const Duration _scanCooldown = AppConstants.scanCooldown;
  final Set<String> _processedCodes = <String>{};
  DateTime? _lastProcessedTime;
  
  // Transaction tracking
  String? _currentTransactionId;
  final List<String> _currentTransactionItems = [];
  DateTime? _transactionStartTime;
  static const Duration _transactionTimeout = AppConstants.transactionTimeout;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    Logger.barista('BaristaScannerPage initialized - Barista user logged in successfully!');
    Logger.barista('Ready to scan QR codes and process orders');
    
    // Initialize mobile scanner controller with proper configuration
    controller = MobileScannerController(
      detectionSpeed: DetectionSpeed.noDuplicates,
      facing: CameraFacing.back,
      torchEnabled: false,
      detectionTimeoutMs: AppConstants.scannerDetectionTimeoutMs,
    );
    
    // Add debug listener for scanner state
    controller!.addListener(() {
      Logger.debug('Controller listener triggered', 'SCANNER');
    });
    
    // Start the scanner
    controller!.start().then((_) {
      Logger.success('Scanner started successfully', 'SCANNER');
    }).catchError((error) {
      Logger.error('Failed to start scanner: $error', 'SCANNER');
    });
    
    // Initialize Socket.IO connection
    _initializeSocket();
    
    // Initialize inventory scanner service
    _initializeInventoryService();
    
    // Initialize menu service
    _initializeMenuService();
    
    // Set up periodic cleanup of processed codes
    Timer.periodic(AppConstants.processedCodesCleanupInterval, (timer) {
      _cleanupProcessedCodes();
    });
  }

  Future<void> _initializeSocket() async {
    try {
      await SocketService.initialize();
      
      // Listen for real-time notifications
      SocketService.on('loyalty-point-added', (data) {
        Logger.socket('Real-time notification: $data', 'BARISTA');
        if (mounted) {
          final message = data?['message'] ?? 'Loyalty point added';
          NotificationBanner.showSuccess(
            context,
            title: 'Loyalty Point Added',
            message: message,
            duration: const Duration(seconds: 4),
            action: IconButton(
              icon: const Icon(Icons.close, color: Colors.white),
              onPressed: () {
                // Dismiss banner
              },
            ),
          );
        }
      });
      
      SocketService.on('barista-status-update', (data) {
        final totalConnected = data?['totalConnected'] ?? 0;
        Logger.socket('Active baristas: $totalConnected', 'BARISTA');
      });
      
    } catch (e) {
      Logger.exception('Socket initialization error', e, 'BARISTA');
    }
  }

  Future<void> _initializeInventoryService() async {
    try {
      await InventoryScannerService.initialize();
      Logger.success('Inventory scanner service initialized', 'BARISTA');
    } catch (e) {
      Logger.exception('Inventory service initialization error', e, 'BARISTA');
    }
  }

  Future<void> _initializeMenuService() async {
    try {
      await MenuService.initialize();
      Logger.success('Menu service initialized', 'BARISTA');
    } catch (e) {
      Logger.exception('Menu service initialization error', e, 'BARISTA');
    }
  }

  // Helper method to get all categories from both inventory and menu
  List<String> _getAllCategories() {
    final inventoryCategories = InventoryScannerService.getCategories();
    final menuCategories = MenuService.getAllCategories();
    final allCategories = <String>{'All'};
    allCategories.addAll(inventoryCategories);
    allCategories.addAll(menuCategories);
    return allCategories.toList()..sort();
  }

  // Helper method to get item by ID from both inventory and menu
  Map<String, dynamic>? _getItemById(String itemId) {
    // First try inventory service
    final inventoryItem = InventoryScannerService.getItemById(itemId);
    if (inventoryItem != null) {
      return {
        ...inventoryItem,
        'isMenu': false, // Mark as inventory item
      };
    }
    
    // Then try menu service
    final menuItem = MenuService.getItemById(itemId);
    if (menuItem != null) {
      // Check if this menu item has a corresponding inventory item
      final baseName = _getBaseItemName(menuItem.name);
      final correspondingInventoryItem = _findInventoryItemByName(baseName);
      
      if (correspondingInventoryItem != null) {
        // Use inventory item data but keep menu item name for display
        return {
          ...correspondingInventoryItem,
          'name': menuItem.name, // Keep the menu variation name
          'isMenu': false, // Treat as inventory item since it has stock
        };
      } else {
        // Pure menu item with no inventory
        return {
          '_id': menuItem.id,
          'name': menuItem.name,
          'category': menuItem.category,
          'currentStock': 999, // Menu items are always available
          'unit': 'servings',
          'minimumThreshold': 0,
          'description': menuItem.description,
          'isMenu': true, // Mark as menu item
        };
      }
    }
    
    return null;
  }

  // Helper method to extract base item name from menu variations
  String _getBaseItemName(String menuName) {
    // Remove common variations like (Hot), (Iced), (Medium), (Large), etc.
    return menuName
        .replaceAll(RegExp(r'\s*\([^)]*\)'), '') // Remove (Hot), (Iced), etc.
        .replaceAll(RegExp(r'\s*★.*'), '') // Remove ★ and everything after
        .replaceAll(RegExp(r'\s*☆.*'), '') // Remove ☆ and everything after
        .trim();
  }

  // Helper method to find inventory item by name (case-insensitive)
  Map<String, dynamic>? _findInventoryItemByName(String name) {
    final inventoryItems = InventoryScannerService.getAllItems();
    try {
      return inventoryItems.firstWhere((item) => 
        (item['name'] ?? '').toLowerCase() == name.toLowerCase()
      );
    } catch (e) {
      return null;
    }
  }

  @override
  void reassemble() {
    super.reassemble();
    if (controller != null) {
      controller!.stop();
      controller!.start();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          SizedBox.expand(
            child: Image.asset(
              'assets/images/istetik.png',
              fit: BoxFit.cover,
            ),
          ),
          Container(
            color: Colors.black.withValues(alpha: 0.3),
          ),
          Container(
            height: 70,
            width: double.infinity,
            decoration: const BoxDecoration(
              image: DecorationImage(
                image: AssetImage('assets/images/istetik.png'),
                fit: BoxFit.cover,
              ),
            ),
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              children: [
                Image.asset(
                  'assets/images/nomutrans.png',
                  height: 36,
                ),
                const SizedBox(width: 10),
                const Text(
                  'Barista QR Scanner',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
                const Spacer(),
                IconButton(
                  icon: const Icon(Icons.logout, color: Colors.white),
                  tooltip: 'Logout',
                  onPressed: () async {
                    final shouldLogout = await showDialog<bool>(
                      context: context,
                      builder: (context) => AlertDialog(
                        title: Text(AppConstants.confirmLogoutTitle),
                        content: Text(AppConstants.confirmLogoutMessage),
                        actions: [
                          TextButton(
                            onPressed: () => Navigator.of(context).pop(false),
                            child: Text(AppConstants.cancelButton),
                          ),
                          TextButton(
                            onPressed: () => Navigator.of(context).pop(true),
                            child: Text(AppConstants.logoutButton),
                          ),
                        ],
                      ),
                    );
                    if (shouldLogout == true) {
                      await _performLogout();
                    }
                  },
                ),
              ],
            ),
          ),
          Column(
            children: [
              const SizedBox(height: 70),
              Expanded(
                flex: 4,
                child: Stack(
                  children: [
                    // Full screen scanner
                    MobileScanner(
                      controller: controller!,
                      onDetect: _onQRDetect,
                    ),
                    // Blur background overlay
                    Container(
                      decoration: BoxDecoration(
                        color: Colors.black.withValues(alpha: 0.3),
                      ),
                      child: BackdropFilter(
                        filter: ImageFilter.blur(sigmaX: 5, sigmaY: 5),
                        child: Container(
                          color: Colors.transparent,
                        ),
                      ),
                    ),
                    // Clean scanning frame overlay
                    Center(
                      child: Container(
                        width: AppConstants.scanningBoxSize,
                        height: AppConstants.scanningBoxSize,
                        decoration: BoxDecoration(
                          color: Colors.transparent,
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Stack(
                          children: [
                            // Corner indicators
                            ..._buildCornerIndicators(),
                            // Scanning animation
                            if (!isCameraPaused && qrResult == null)
                              _buildScanningAnimation(),
                            // Center QR icon
                            Center(
                              child: Container(
                                width: 50,
                                height: 50,
                                decoration: BoxDecoration(
                                  color: Colors.white.withValues(alpha: 0.1),
                                  borderRadius: BorderRadius.circular(25),
                                  border: Border.all(
                                    color: Colors.white.withValues(alpha: 0.3),
                                    width: 1,
                                  ),
                                ),
                                child: const Icon(
                                  Icons.qr_code_scanner,
                                  color: Colors.white,
                                  size: 28,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    // Instructions overlay
                    Positioned(
                      top: 50,
                      left: MediaQuery.of(context).size.width * 0.05,
                      right: MediaQuery.of(context).size.width * 0.05,
                      child: Container(
                        constraints: BoxConstraints(
                          maxWidth: MediaQuery.of(context).size.width * 0.9,
                        ),
                        padding: EdgeInsets.symmetric(
                          horizontal: MediaQuery.of(context).size.width * 0.06,
                          vertical: 16,
                        ),
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                            colors: [
                              Colors.black.withValues(alpha: 0.8),
                              Colors.black.withValues(alpha: 0.6),
                            ],
                          ),
                          borderRadius: BorderRadius.circular(30),
                          border: Border.all(
                            color: Colors.white.withValues(alpha: 0.3),
                            width: 1.5,
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.4),
                              blurRadius: 15,
                              spreadRadius: 3,
                              offset: const Offset(0, 5),
                            ),
                          ],
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: Colors.white.withValues(alpha: 0.2),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: const Icon(
                                Icons.qr_code_scanner,
                                color: Colors.white,
                                size: 20,
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                        child: Text(
                          AppConstants.positionQRCodeMessage,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                            letterSpacing: 0.5,
                          ),
                          textAlign: TextAlign.center,
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              if (isCameraPaused)
                Padding(
                  padding: EdgeInsets.symmetric(
                    horizontal: MediaQuery.of(context).size.width * 0.05,
                    vertical: 16,
                  ),
                  child: Container(
                    width: double.infinity,
                    constraints: BoxConstraints(
                      maxWidth: MediaQuery.of(context).size.width * 0.9,
                    ),
                  child: ElevatedButton.icon(
                      icon: const Icon(Icons.camera_alt, size: 20),
                      label: Text(
                        AppConstants.resumeScanningButton,
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.blue,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 24),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        elevation: 4,
                      ),
                    onPressed: () async {
                      await controller?.start();
                      setState(() {
                        isCameraPaused = false;
                        qrResult = null;
                      });
                    },
                    ),
                  ),
                ),
              Expanded(
                flex: 1,
                child: Center(
                  child: Container(
                    margin: EdgeInsets.symmetric(
                      horizontal: MediaQuery.of(context).size.width * 0.05,
                      vertical: 12,
                    ),
                    padding: EdgeInsets.all(MediaQuery.of(context).size.width * 0.05),
                    constraints: BoxConstraints(
                      maxWidth: MediaQuery.of(context).size.width * 0.9,
                      minHeight: 100,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(20),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.1),
                          blurRadius: 15,
                          offset: const Offset(0, 6),
                        ),
                      ],
                      border: Border.all(
                        color: Colors.grey.withValues(alpha: 0.1),
                        width: 1,
                      ),
                    ),
                    child: SingleChildScrollView(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        if (qrResult != null) ...[
                            Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: Colors.green.withOpacity(0.1),
                                borderRadius: BorderRadius.circular(50),
                              ),
                              child: const Icon(
                            Icons.check_circle,
                            color: Colors.green,
                                size: 32,
                          ),
                            ),
                            const SizedBox(height: 12),
                          Text(
                            AppConstants.qrCodeScannedMessage,
                            style: const TextStyle(
                              color: Colors.green,
                                fontSize: 18,
                              fontWeight: FontWeight.bold,
                                letterSpacing: 0.5,
                            ),
                            textAlign: TextAlign.center,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                          ),
                            const SizedBox(height: 6),
                          Text(
                            AppConstants.processingOrderMessage,
                            style: TextStyle(
                              color: Colors.grey.shade600,
                                fontSize: 14,
                                fontWeight: FontWeight.w500,
                            ),
                            textAlign: TextAlign.center,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                          ),
                        ] else ...[
                            Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: Colors.blue.withOpacity(0.1),
                                borderRadius: BorderRadius.circular(50),
                              ),
                              child: const Icon(
                            Icons.qr_code_scanner,
                            color: Colors.blue,
                                size: 32,
                          ),
                            ),
                            const SizedBox(height: 12),
                          Text(
                            AppConstants.scanQRCodeMessage,
                            style: const TextStyle(
                              color: Colors.black,
                                fontSize: 18,
                              fontWeight: FontWeight.bold,
                                letterSpacing: 0.5,
                            ),
                            textAlign: TextAlign.center,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                          ),
                            const SizedBox(height: 6),
                          Text(
                            AppConstants.pointCameraMessage,
                            style: TextStyle(
                              color: Colors.grey.shade600,
                                fontSize: 14,
                                fontWeight: FontWeight.w500,
                            ),
                            textAlign: TextAlign.center,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ],
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  void _onQRDetect(BarcodeCapture capture) {
    // Cancel any existing debounce timer
    _debounceTimer?.cancel();
    
    // Set a new debounce timer
    _debounceTimer = Timer(AppConstants.debounceDelay, () {
      _processQRDetection(capture);
    });
  }
  
  void _processQRDetection(BarcodeCapture capture) async {
    Logger.qr('Detection triggered - barcodes found: ${capture.barcodes.length}');
    
    // Validate basic detection conditions
    if (!_validateBasicDetectionConditions(capture)) {
      return;
    }
    
    final String? scannedCode = capture.barcodes.first.rawValue;
    Logger.qr('Raw value: $scannedCode');
    
    if (scannedCode == null || scannedCode.isEmpty) {
      Logger.qr('Empty or null raw value');
      return;
    }
    
    // Validate QR token format
    if (!_validateQRToken(scannedCode)) {
      return;
    }
    
    // Check for duplicate scans
    if (!_checkForDuplicateScans(scannedCode)) {
      return;
    }
    
    // Set processing state immediately to prevent concurrent processing
    setState(() {
      isProcessing = true;
    });
    
    // Stop scanner immediately to prevent further detections
    await controller?.stop();
    
    // Handle transaction logic
    _handleTransactionLogic(scannedCode);
    
    // Process the valid QR code
    await _processValidQRCode(scannedCode);
  }

  bool _validateBasicDetectionConditions(BarcodeCapture capture) {
    final List<Barcode> barcodes = capture.barcodes;
    if (barcodes.isEmpty) {
      Logger.qr('No barcodes detected');
      return false;
    }
    
    if (isProcessing) {
      Logger.qr('Already processing, ignoring');
      return false;
    }
    
    return true;
  }

  bool _validateQRToken(String scannedCode) {
    if (!QRValidationUtils.isValidQRToken(scannedCode)) {
      Logger.qr('Invalid QR token format: $scannedCode');
      CustomToast.showError(
        context,
        message: AppConstants.invalidQRCodeMessage,
        duration: const Duration(seconds: 4),
      );
      return false;
    }
    return true;
  }

  bool _checkForDuplicateScans(String scannedCode) {
    final now = DateTime.now();
    
    // Check if this exact code was processed recently
    if (_processedCodes.contains(scannedCode)) {
      Logger.qr('Code already processed recently, ignoring: $scannedCode');
      HapticFeedback.mediumImpact();
      return false;
    }
    
    // Check if we're processing the same code within cooldown period
    if (_lastScannedCode == scannedCode && 
        _lastScanTime != null && 
        now.difference(_lastScanTime!) < _scanCooldown) {
      Logger.qr('Duplicate scan within cooldown period, ignoring');
      HapticFeedback.mediumImpact();
      return false;
    }
    
    // Check if we processed any code very recently
    if (_lastProcessedTime != null && 
        now.difference(_lastProcessedTime!) < AppConstants.processingCooldown) {
      Logger.qr('Too soon after last processing, ignoring');
      HapticFeedback.mediumImpact();
      return false;
    }
    
    // Additional safety: Check if we're already processing (double-check)
    if (isProcessing) {
      Logger.qr('Already processing another scan, ignoring');
      HapticFeedback.mediumImpact();
      return false;
    }
    
    return true;
  }

  void _handleTransactionLogic(String scannedCode) {
    // Check if this is a new customer or same customer continuing transaction
    bool isNewCustomer = _lastScannedCode != scannedCode;
    bool isTransactionExpired = _transactionStartTime != null && 
        DateTime.now().difference(_transactionStartTime!) > _transactionTimeout;
    
    // If new customer or transaction expired, start new transaction
    if (isNewCustomer || isTransactionExpired) {
      _startNewTransaction(scannedCode);
    }
  }

  Future<void> _processValidQRCode(String scannedCode) async {
    Logger.success('Valid QR code detected: $scannedCode', 'QR SCAN');
    Logger.qr('QR token details:');
    Logger.qr('   - Length: ${scannedCode.length}');
    Logger.qr('   - Type: ${scannedCode.runtimeType}');
    Logger.qr('   - First 8 chars: ${scannedCode.substring(0, 8)}');
    
    // Mark this code as processed immediately to prevent duplicates
    _processedCodes.add(scannedCode);
    _lastProcessedTime = DateTime.now();
    
    // Provide haptic feedback for successful scan
    HapticFeedback.lightImpact();
    
    // Update last scanned code and time
    _lastScannedCode = scannedCode;
    _lastScanTime = DateTime.now();
    
    setState(() {
      qrResult = scannedCode;
      isCameraPaused = true;
    });
    
    // Show drink selection dialog
    await _showDrinkSelectionDialog();
  }

  Future<void> _showDrinkSelectionDialog() async {
    List<Map<String, dynamic>>? selectedItems = await showDialog<List<Map<String, dynamic>>>(
      context: context,
      barrierDismissible: false,
      builder: (context) {
        Map<String, int> tempSelectedItems = <String, int>{};
        String selectedCategory = 'All';
        String searchTerm = '';
        List<Map<String, dynamic>> filteredItems = InventoryScannerService.getAllItems();
        
        return StatefulBuilder(
          builder: (context, setState) {
            // Get combined items from both inventory and menu
            // Only drinks are hardcoded, everything else comes from admin inventory
            List<Map<String, dynamic>> getAllAvailableItems() {
              final inventoryItems = InventoryScannerService.getAllItems();
              final menuItems = MenuService.getAllItems().map((item) => {
                '_id': item.id,
                'name': item.name,
                'category': item.category,
                'currentStock': 999, // Menu items (drinks) are always available
                'unit': 'servings',
                'minimumThreshold': 0,
                'description': item.description,
                'isMenu': true, // Mark as menu item (drinks)
              }).toList();
              
              // Mark inventory items as not menu items
              final markedInventoryItems = inventoryItems.map((item) => {
                ...item,
                'isMenu': false, // Mark as inventory item (pizzas, pastries, donuts, etc.)
              }).toList();
              
              // Combine: Admin inventory items + Hardcoded drinks
              return [...markedInventoryItems, ...menuItems];
            }
            
            // Filter items based on category and search
            void updateFilteredItems() {
              final allItems = getAllAvailableItems();
              
              if (selectedCategory == 'All') {
                if (searchTerm.isEmpty) {
                  filteredItems = allItems;
                } else {
                  filteredItems = allItems.where((item) => 
                    (item['name'] ?? '').toLowerCase().contains(searchTerm.toLowerCase()) ||
                    (item['category'] ?? '').toLowerCase().contains(searchTerm.toLowerCase()) ||
                    (item['description'] ?? '').toLowerCase().contains(searchTerm.toLowerCase())
                  ).toList();
                }
              } else {
                if (searchTerm.isEmpty) {
                  filteredItems = allItems.where((item) => 
                    (item['category'] ?? '').toLowerCase() == selectedCategory.toLowerCase()
                  ).toList();
                } else {
                  filteredItems = allItems.where((item) => 
                    (item['category'] ?? '').toLowerCase() == selectedCategory.toLowerCase() &&
                    ((item['name'] ?? '').toLowerCase().contains(searchTerm.toLowerCase()) ||
                     (item['description'] ?? '').toLowerCase().contains(searchTerm.toLowerCase()))
                  ).toList();
                }
              }
              
              // Keep all selected items - don't remove them when switching categories
              // This allows cross-category selection
            }
            
            updateFilteredItems();
            
            return ConstrainedBox(
              constraints: BoxConstraints(
                maxWidth: MediaQuery.of(context).size.width * 0.98,
                maxHeight: MediaQuery.of(context).size.height * 0.9,
              ),
              child: AlertDialog(
              title: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Select Inventory Items (Multiple Selection)'),
                  if (_currentTransactionItems.isNotEmpty) ...[
                    const SizedBox(height: 8),
                    Text(
                      'Current Transaction: ${_currentTransactionItems.join(', ')}',
                      style: const TextStyle(
                        fontSize: 12,
                        color: Colors.grey,
                        fontWeight: FontWeight.normal,
                      ),
                    ),
                  ],
                  const SizedBox(height: 8),
                  if (tempSelectedItems.isNotEmpty)
                    Container(
                      height: 120,
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: Colors.blue.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: Colors.blue.withOpacity(0.3)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Selected Items (${tempSelectedItems.values.fold(0, (sum, quantity) => sum + quantity)}):',
                            style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 12,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Expanded(
                            child: SingleChildScrollView(
                              child: Wrap(
                                spacing: 4,
                                runSpacing: 4,
                                children: tempSelectedItems.entries.map((entry) {
                                  final itemId = entry.key;
                                  final quantity = entry.value;
                                  final item = _getItemById(itemId);
                                  final itemName = item?['name'] ?? 'Unknown Item';
                                  return Chip(
                                    label: Text(
                                      '$itemName (x$quantity)',
                                      style: const TextStyle(fontSize: 10),
                                    ),
                                    deleteIcon: const Icon(Icons.close, size: 16),
                                    onDeleted: () {
                                      setState(() {
                                        tempSelectedItems.remove(itemId);
                                      });
                                    },
                                  );
                                }).toList(),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                ],
              ),
              content: SizedBox(
                width: MediaQuery.of(context).size.width * 0.95,
                height: MediaQuery.of(context).size.height * 0.7,
                child: Column(
                  children: [
                    // Search bar
                    TextField(
                      decoration: const InputDecoration(
                        hintText: 'Search items...',
                        prefixIcon: Icon(Icons.search),
                        border: OutlineInputBorder(),
                        contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      ),
                      onChanged: (value) {
                        setState(() {
                          searchTerm = value;
                          updateFilteredItems();
                        });
                      },
                    ),
                    const SizedBox(height: 12),
                    
                    // Category filter and selection controls
                    Row(
                      children: [
                        Expanded(
                          child: Container(
                            height: 40,
                            child: ListView.builder(
                              scrollDirection: Axis.horizontal,
                              itemCount: _getAllCategories().length,
                              itemBuilder: (context, index) {
                                final categories = _getAllCategories();
                                final category = categories[index];
                                final isSelected = selectedCategory == category;
                                
                                return Padding(
                                  padding: const EdgeInsets.only(right: 8.0),
                                  child: FilterChip(
                                    label: Text(category),
                                    selected: isSelected,
                                    onSelected: (selected) {
                                      setState(() {
                                        selectedCategory = category;
                                        updateFilteredItems();
                                      });
                                    },
                                    selectedColor: Colors.blue.withOpacity(0.3),
                                    checkmarkColor: Colors.blue,
                                  ),
                                );
                              },
                            ),
                          ),
                        ),
                        // Clear all selection control
                        IconButton(
                          icon: const Icon(Icons.clear_all, size: 20),
                          tooltip: 'Clear All Selections',
                          onPressed: () {
                            setState(() {
                              tempSelectedItems.clear();
                            });
                          },
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    
                    // Items list
                    Expanded(
                      child: () {
                        // Combine filtered items with selected items from other categories
                        final Set<String> allItemIdsToShow = <String>{};
                        allItemIdsToShow.addAll(filteredItems.map((item) => item['_id'] ?? '').where((id) => id.isNotEmpty).cast<String>());
                        allItemIdsToShow.addAll(tempSelectedItems.keys);
                        
                        final List<String> itemIdsToShow = allItemIdsToShow.toList();
                        
                        if (itemIdsToShow.isEmpty) {
                          return const Center(
                            child: Text(
                              'No items found',
                              style: TextStyle(color: Colors.grey),
                            ),
                          );
                        }
                        
                        return ListView.builder(
                          itemCount: itemIdsToShow.length,
                          itemBuilder: (context, index) {
                            final itemId = itemIdsToShow[index];
                            final item = _getItemById(itemId);
                            if (item == null) return const SizedBox.shrink();
                            
                            final itemName = item['name'] ?? 'Unknown Item';
                            final category = item['category'] ?? '';
                            final currentQuantity = tempSelectedItems[itemId] ?? 0;
                            final isInFilteredList = filteredItems.any((filteredItem) => filteredItem['_id'] == itemId);
                            
                            return Card(
                              margin: const EdgeInsets.symmetric(vertical: 2),
                              color: currentQuantity > 0 ? Colors.blue.withOpacity(0.1) : null,
                              child: Padding(
                                padding: const EdgeInsets.all(12.0),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    // Item name and category
                                    Text(
                                      itemName,
                                      style: TextStyle(
                                        fontSize: 14,
                                        fontWeight: currentQuantity > 0 ? FontWeight.bold : FontWeight.normal,
                                        color: isInFilteredList ? null : Colors.grey.shade600,
                                      ),
                                    ),
                                    if (category.isNotEmpty) ...[
                                      const SizedBox(height: 2),
                                      Text(
                                        category,
                                        style: TextStyle(
                                          fontSize: 12, 
                                          color: isInFilteredList ? Colors.grey : Colors.grey.shade500,
                                        ),
                                      ),
                                    ],
                                    const SizedBox(height: 8),
                                    // Quantity controls below the text
                                    Row(
                                      mainAxisAlignment: MainAxisAlignment.end,
                                      children: [
                                        // Quantity display and controls
                                        if (currentQuantity > 0) ...[
                                          IconButton(
                                            icon: const Icon(Icons.remove, size: 18),
                                            onPressed: () {
                                              setState(() {
                                                if (currentQuantity > 1) {
                                                  tempSelectedItems[itemId] = currentQuantity - 1;
                                                } else {
                                                  tempSelectedItems.remove(itemId);
                                                }
                                              });
                                            },
                                            constraints: const BoxConstraints(
                                              minWidth: 32,
                                              minHeight: 32,
                                            ),
                                            padding: EdgeInsets.zero,
                                          ),
                                          Container(
                                            width: 40,
                                            alignment: Alignment.center,
                                            child: Text(
                                              '$currentQuantity',
                                              style: const TextStyle(
                                                fontSize: 16,
                                                fontWeight: FontWeight.bold,
                                              ),
                                            ),
                                          ),
                                        ],
                                        IconButton(
                                          icon: const Icon(Icons.add, size: 18),
                                          onPressed: () {
                                            setState(() {
                                              tempSelectedItems[itemId] = (currentQuantity + 1);
                                            });
                                          },
                                          constraints: const BoxConstraints(
                                            minWidth: 32,
                                            minHeight: 32,
                                          ),
                                          padding: EdgeInsets.zero,
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                              ),
                            );
                          },
                        );
                      }(),
                    ),
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.of(context).pop(),
                  child: Text(AppConstants.cancelButton),
                ),
                if (_currentTransactionItems.isNotEmpty)
                  TextButton(
                    onPressed: () {
                      Navigator.of(context, rootNavigator: true).pop('COMPLETE_TRANSACTION');
                    },
                    child: Text(AppConstants.completeTransactionButton),
                  ),
                ElevatedButton(
                  onPressed: tempSelectedItems.isEmpty
                      ? null
                      : () {
                          // Convert selected items with quantities to item objects
                          final selectedItems = <Map<String, dynamic>>[];
                          tempSelectedItems.forEach((itemId, quantity) {
                            final item = _getItemById(itemId);
                            if (item != null) {
                              // Add the item multiple times based on quantity
                              for (int i = 0; i < quantity; i++) {
                                selectedItems.add(item);
                              }
                            }
                          });
                          Navigator.of(context, rootNavigator: true).pop(selectedItems);
                        },
                  child: Text('Add ${tempSelectedItems.values.fold(0, (sum, quantity) => sum + quantity)} Item${tempSelectedItems.values.fold(0, (sum, quantity) => sum + quantity) != 1 ? 's' : ''}'),
                ),
              ],
            ),
            );
          },
        );
      },
    );
    
    if (selectedItems == null) {
      // If cancelled, resume scanning
      _resumeScanning();
      return;
    }
    
    // Handle transaction completion
    if (selectedItems.length == 1 && selectedItems.first == 'COMPLETE_TRANSACTION') {
      await _completeTransaction(qrResult!, '');
      return;
    }
    
    // Process selected items (all items can complete transactions)
    // Group items by ID and count quantities
    Map<String, Map<String, dynamic>> itemQuantities = {};
    for (Map<String, dynamic> item in selectedItems) {
      final itemId = item['_id'] ?? '';
      
      if (itemQuantities.containsKey(itemId)) {
        itemQuantities[itemId]!['quantity'] = (itemQuantities[itemId]!['quantity'] as int) + 1;
      } else {
        itemQuantities[itemId] = {
          'item': item,
          'quantity': 1,
        };
      }
    }
    
    List<String> processedItemNames = [];
    for (String itemId in itemQuantities.keys) {
      final itemData = itemQuantities[itemId]!;
      final item = itemData['item'] as Map<String, dynamic>;
      final quantity = itemData['quantity'] as int;
      final itemName = item['name'] ?? 'Unknown Item';
      final currentStock = item['currentStock'] ?? 0;
      final isMenu = item['isMenu'] ?? false;
      
      Logger.debug('Processing item: $itemName (ID: $itemId, isMenu: $isMenu, stock: $currentStock, quantity: $quantity)', 'TRANSACTION');
      
      // For pure menu items (no inventory), we don't need to check stock or decrease it
      if (isMenu) {
        // Add menu item to transaction multiple times based on quantity
        for (int i = 0; i < quantity; i++) {
          _addItemToTransaction(itemName);
          processedItemNames.add(itemName);
        }
        Logger.success('Successfully processed menu item: $itemName (x$quantity)', 'MENU');
        continue;
      }
      
      // For inventory items (including menu variations that map to inventory), try to decrease stock
      Logger.debug('Attempting to decrease stock for inventory item: $itemName (ID: $itemId, quantity: $quantity)', 'INVENTORY');
      
      // Decrease stock by the total quantity
      final stockResult = await InventoryScannerService.decreaseStock(
        itemId: itemId,
        quantity: quantity,
        reason: 'Sold via QR scan',
      );
      
      Logger.debug('Stock decrease result for $itemName (x$quantity): $stockResult', 'INVENTORY');
      
      if (stockResult != null && stockResult.containsKey('error')) {
        Logger.warning('Failed to decrease stock for $itemName (x$quantity): ${stockResult['error']} - but allowing transaction to continue', 'INVENTORY');
        // Show warning to user but don't block transaction
        if (mounted) {
          CustomToast.showWarning(
            context,
            message: 'Could not update stock for $itemName (x$quantity), but transaction will continue',
            duration: const Duration(seconds: 3),
          );
        }
      } else if (stockResult != null && stockResult.containsKey('item')) {
        // Show success feedback
        if (mounted) {
          CustomToast.showSuccess(
            context,
            message: 'Stock decreased for $itemName (x$quantity)',
              duration: const Duration(seconds: 2),
          );
        }
        Logger.success('Successfully processed $itemName (x$quantity) and decreased stock', 'INVENTORY');
      } else {
        Logger.warning('Stock decrease failed for $itemName (x$quantity) - but allowing transaction to continue', 'INVENTORY');
      }
      
      // Always add to transaction regardless of stock update result
      for (int i = 0; i < quantity; i++) {
        _addItemToTransaction(itemName);
        processedItemNames.add(itemName);
      }
    }
    
    if (processedItemNames.isEmpty) {
      Logger.warning('No items were selected for processing', 'TRANSACTION');
      if (mounted) {
        CustomToast.showWarning(
          context,
          message: 'No items were selected',
          duration: const Duration(seconds: 3),
        );
      }
      _resumeScanning();
      return;
    }
    
    // Show option to add more items or complete transaction
    await _showTransactionUpdateDialog(processedItemNames.join(', '));
  }

  Future<void> _showTransactionUpdateDialog(String selectedItems) async {
    final shouldComplete = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(AppConstants.transactionUpdatedTitle),
        content: Text('Added: $selectedItems\n\nTotal items: ${_currentTransactionItems.length}\n\nWould you like to add more items or complete the transaction?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: Text(AppConstants.addMoreButton),
          ),
          ElevatedButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: Text(AppConstants.completeTransactionButton),
          ),
        ],
      ),
    );
    
    if (shouldComplete == true) {
      await _completeTransaction(qrResult!, '');
    } else {
      // Resume scanning for more items
      _resumeScanning();
    }
  }

  // Build corner indicators for the scanning box
  List<Widget> _buildCornerIndicators() {
    const double bracketLength = 30.0;
    const double bracketThickness = 3.0;
    
    return [
      // Top-left corner (inverted L)
      Positioned(
        top: -2,
        left: -2,
        child: CustomPaint(
          painter: CornerBracketPainter(
            cornerType: CornerType.topLeft,
            bracketLength: bracketLength,
            bracketThickness: bracketThickness,
          ),
          size: Size(bracketLength, bracketLength),
        ),
      ),
      // Top-right corner (L)
      Positioned(
        top: -2,
        right: -2,
        child: CustomPaint(
          painter: CornerBracketPainter(
            cornerType: CornerType.topRight,
            bracketLength: bracketLength,
            bracketThickness: bracketThickness,
          ),
          size: Size(bracketLength, bracketLength),
        ),
      ),
      // Bottom-left corner (L rotated 90° clockwise)
      Positioned(
        bottom: -2,
        left: -2,
        child: CustomPaint(
          painter: CornerBracketPainter(
            cornerType: CornerType.bottomLeft,
            bracketLength: bracketLength,
            bracketThickness: bracketThickness,
          ),
          size: Size(bracketLength, bracketLength),
        ),
      ),
      // Bottom-right corner (L rotated 180°)
      Positioned(
        bottom: -2,
        right: -2,
        child: CustomPaint(
          painter: CornerBracketPainter(
            cornerType: CornerType.bottomRight,
            bracketLength: bracketLength,
            bracketThickness: bracketThickness,
          ),
          size: Size(bracketLength, bracketLength),
        ),
      ),
    ];
  }

  // Build scanning animation
  Widget _buildScanningAnimation() {
    return Positioned.fill(
      child: StatefulBuilder(
        builder: (context, setState) {
          // Start animation timer if not already started
          _animationTimer ??= Timer.periodic(const Duration(milliseconds: 50), (timer) {
            if (mounted) {
              setState(() {});
            }
          });
          
          return CustomPaint(
            painter: ScanningLinePainter(),
            size: const Size(AppConstants.scanningBoxSize, AppConstants.scanningBoxSize),
          );
        },
      ),
    );
  }

  
  // Show error dialog
  void _showErrorDialog(String title, String message) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(title),
        content: Text(message),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.of(context).pop();
              _resumeScanning();
            },
            child: Text(AppConstants.okButton),
          ),
        ],
      ),
    );
  }
  
  // Start new transaction
  void _startNewTransaction(String qrCode) {
    _currentTransactionId = DateTime.now().millisecondsSinceEpoch.toString();
    _currentTransactionItems.clear();
    _transactionStartTime = DateTime.now();
    Logger.transaction('Started new transaction (ID: $_currentTransactionId) for QR: $qrCode');
  }
  
  // Add item to current transaction
  void _addItemToTransaction(String item) {
    _currentTransactionItems.add(item);
    Logger.transaction('Added item: $item (Total items: ${_currentTransactionItems.length})');
  }
  
  // Complete transaction and add points
  Future<void> _completeTransaction(String qrCode, String selectedDrink) async {
    _addItemToTransaction(selectedDrink);
    
    // Show transaction summary
    String transactionSummary = _currentTransactionItems.join(', ');
    Logger.transaction('Completing transaction with items: $transactionSummary');
    
    // Add points only once per transaction
    final result = await ApiService.addLoyaltyPoint(qrCode, transactionSummary);
    
    Logger.transaction('API result: $result');
    
    if (result != null) {
      // Check if this is an error response (400 or 429 status)
      if (result.containsKey('error')) {
        Logger.error('Error response detected: ${result['error']}', 'TRANSACTION');
        Logger.transaction('Points in error response: ${result['points']}');
        
        // Check if it's a rate limit error (429)
        if (result['code'] == 'RATE_LIMIT_EXCEEDED' || result['statusCode'] == 429) {
          Logger.error('Rate limit exceeded - customer has reached daily scan limit', 'TRANSACTION');
          await _showRateLimitDialog(result);
        } else {
          // Handle other error cases - customer has reached maximum points
          await _showCardFullDialog(result);
        }
        _resetTransaction();
      } else {
        Logger.success('Success response detected', 'TRANSACTION');
        // Show success dialog with transaction details
        await _showTransactionSuccessDialog(result, transactionSummary);
        _resetTransaction();
      }
    } else {
      Logger.error('API returned null', 'TRANSACTION');
      // Handle API failure
      _showErrorDialog('Transaction Failed', AppConstants.transactionFailedMessage);
      _resetTransaction();
    }
  }
  
  // Reset transaction
  void _resetTransaction() {
    _currentTransactionId = null;
    _currentTransactionItems.clear();
    _transactionStartTime = null;
    Logger.transaction('Transaction reset');
  }
  
  // Show transaction success dialog
  Future<void> _showTransactionSuccessDialog(Map<String, dynamic> result, String transactionSummary) async {
    await showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => Dialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
        ),
        elevation: 20,
        child: Container(
          constraints: BoxConstraints(
            maxWidth: MediaQuery.of(context).size.width * 0.9,
            maxHeight: MediaQuery.of(context).size.height * 0.85,
          ),
          padding: EdgeInsets.symmetric(
            horizontal: MediaQuery.of(context).size.width * 0.05,
            vertical: MediaQuery.of(context).size.height * 0.02,
          ),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(20),
            gradient: const LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                Color(0xFF4CAF50),
                Color(0xFF45A049),
              ],
            ),
          ),
          child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
              // Success icon
              Container(
                padding: EdgeInsets.all(MediaQuery.of(context).size.width * 0.04),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(50),
                ),
                child: Icon(
                  Icons.check_circle,
                  color: Colors.white,
                  size: MediaQuery.of(context).size.width * 0.12,
                ),
              ),
              SizedBox(height: MediaQuery.of(context).size.height * 0.02),
              
              // Title
              Text(
                AppConstants.transactionCompleteTitle,
                style: TextStyle(
                  color: Colors.white,
                  fontSize: MediaQuery.of(context).size.width * 0.06,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 0.5,
                  decoration: TextDecoration.none,
                ),
                textAlign: TextAlign.center,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              SizedBox(height: MediaQuery.of(context).size.height * 0.02),
              
              // Transaction details
              Flexible(
                child: Container(
                  padding: EdgeInsets.all(MediaQuery.of(context).size.width * 0.04),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      _buildDetailRow('✅', AppConstants.itemsLabel, transactionSummary),
                      SizedBox(height: MediaQuery.of(context).size.height * 0.01),
                      _buildDetailRow('🎯', AppConstants.customerEarnedLabel, '1 ${AppConstants.pointLabel}'),
                      SizedBox(height: MediaQuery.of(context).size.height * 0.01),
                      _buildDetailRow('📊', AppConstants.totalPointsLabel, '${result['points']}'),
                      SizedBox(height: MediaQuery.of(context).size.height * 0.01),
                      _buildDetailRow('📋', AppConstants.totalOrdersLabel, '${result['totalOrders']}'),
                    ],
                  ),
                ),
              ),
              SizedBox(height: MediaQuery.of(context).size.height * 0.02),
              
              // OK button
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
            onPressed: () {
              Navigator.of(context).pop();
              _resumeScanning();
            },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.white,
                    foregroundColor: const Color(0xFF4CAF50),
                    padding: EdgeInsets.symmetric(
                      vertical: MediaQuery.of(context).size.height * 0.02,
                    ),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    elevation: 4,
                  ),
                  child: Text(
                    'Continue Scanning',
                    style: TextStyle(
                      fontSize: MediaQuery.of(context).size.width * 0.04,
                      fontWeight: FontWeight.w600,
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

  Widget _buildDetailRow(String emoji, String label, String value) {
    return Row(
      children: [
        Text(
          emoji,
          style: TextStyle(fontSize: MediaQuery.of(context).size.width * 0.05),
        ),
        SizedBox(width: MediaQuery.of(context).size.width * 0.03),
        Expanded(
          child: Text(
            label,
            style: TextStyle(
              color: Colors.white,
              fontSize: MediaQuery.of(context).size.width * 0.035,
              fontWeight: FontWeight.w500,
              decoration: TextDecoration.none,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ),
        Flexible(
          child: Text(
            value,
            style: TextStyle(
              color: Colors.white,
              fontSize: MediaQuery.of(context).size.width * 0.035,
              fontWeight: FontWeight.bold,
              decoration: TextDecoration.none,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }

  // Show card full dialog when customer has reached maximum points
  Future<void> _showCardFullDialog(Map<String, dynamic> result) async {
    await showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => Dialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
        ),
        elevation: 20,
        child: Container(
          constraints: BoxConstraints(
            maxWidth: MediaQuery.of(context).size.width * 0.9,
            maxHeight: MediaQuery.of(context).size.height * 0.85,
          ),
          padding: EdgeInsets.symmetric(
            horizontal: MediaQuery.of(context).size.width * 0.05,
            vertical: MediaQuery.of(context).size.height * 0.02,
          ),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(20),
            gradient: const LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                Color(0xFFFF9800),
                Color(0xFFF57C00),
              ],
            ),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Warning icon
              Container(
                padding: EdgeInsets.all(MediaQuery.of(context).size.width * 0.04),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(50),
                ),
                child: Icon(
                  Icons.warning,
                  color: Colors.white,
                  size: MediaQuery.of(context).size.width * 0.12,
                ),
              ),
              SizedBox(height: MediaQuery.of(context).size.height * 0.02),
              
              // Title
              Text(
                AppConstants.cardFullTitle,
                style: TextStyle(
                  color: Colors.white,
                  fontSize: MediaQuery.of(context).size.width * 0.06,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 0.5,
                  decoration: TextDecoration.none,
                ),
                textAlign: TextAlign.center,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              SizedBox(height: MediaQuery.of(context).size.height * 0.015),
              
              // Message
              Flexible(
                child: Container(
                  padding: EdgeInsets.all(MediaQuery.of(context).size.width * 0.04),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    'This customer already has ${result['points']} stamps. No more can be added.',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: MediaQuery.of(context).size.width * 0.04,
                      height: 1.4,
                      decoration: TextDecoration.none,
                    ),
                    textAlign: TextAlign.center,
                    maxLines: 3,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ),
              SizedBox(height: MediaQuery.of(context).size.height * 0.02),
              
              // OK button
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
            onPressed: () {
              Navigator.of(context).pop();
              _resumeScanning();
            },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.white,
                    foregroundColor: const Color(0xFFFF9800),
                    padding: EdgeInsets.symmetric(
                      vertical: MediaQuery.of(context).size.height * 0.02,
                    ),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    elevation: 4,
                  ),
                  child: Text(
                    'Continue Scanning',
                    style: TextStyle(
                      fontSize: MediaQuery.of(context).size.width * 0.04,
                      fontWeight: FontWeight.w600,
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

  // Show rate limit dialog when customer has reached daily scan limit
  Future<void> _showRateLimitDialog(Map<String, dynamic> result) async {
    await showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => Dialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
        ),
        elevation: 20,
        child: Container(
          constraints: BoxConstraints(
            maxWidth: MediaQuery.of(context).size.width * 0.9,
            maxHeight: MediaQuery.of(context).size.height * 0.85,
          ),
          padding: EdgeInsets.symmetric(
            horizontal: MediaQuery.of(context).size.width * 0.05,
            vertical: MediaQuery.of(context).size.height * 0.02,
          ),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(20),
            gradient: const LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                Color(0xFFFF5722),
                Color(0xFFE64A19),
              ],
            ),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Icon
              Container(
                width: MediaQuery.of(context).size.width * 0.15,
                height: MediaQuery.of(context).size.width * 0.15,
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.2),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  Icons.access_time,
                  color: Colors.white,
                  size: MediaQuery.of(context).size.width * 0.08,
                ),
              ),
              SizedBox(height: MediaQuery.of(context).size.height * 0.02),
              
              // Title
              Text(
                'Daily Scan Limit Reached',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: MediaQuery.of(context).size.width * 0.05,
                  fontWeight: FontWeight.bold,
                  decoration: TextDecoration.none,
                ),
                textAlign: TextAlign.center,
              ),
              SizedBox(height: MediaQuery.of(context).size.height * 0.01),
              
              // Message
              Container(
                width: double.infinity,
                child: Container(
                  padding: EdgeInsets.all(MediaQuery.of(context).size.width * 0.04),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    'This customer has reached their daily scan limit (3 scans per day). Please ask them to return tomorrow.',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: MediaQuery.of(context).size.width * 0.04,
                      height: 1.4,
                      decoration: TextDecoration.none,
                    ),
                    textAlign: TextAlign.center,
                    maxLines: 4,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ),
              SizedBox(height: MediaQuery.of(context).size.height * 0.02),
              
              // OK button
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () {
                    Navigator.of(context).pop();
                    _resumeScanning();
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.white,
                    foregroundColor: const Color(0xFFFF5722),
                    padding: EdgeInsets.symmetric(
                      vertical: MediaQuery.of(context).size.height * 0.02,
                    ),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    elevation: 4,
                  ),
                  child: Text(
                    'Continue Scanning',
                    style: TextStyle(
                      fontSize: MediaQuery.of(context).size.width * 0.04,
                      fontWeight: FontWeight.w600,
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

  // Resume scanning after error or cancellation
  void _resumeScanning() async {
    await controller?.start();
    setState(() {
      isCameraPaused = false;
      qrResult = null;
      isProcessing = false;
    });
    
    // Clear processed codes to allow re-scanning after resume
    _processedCodes.clear();
    _lastProcessedTime = null;
    _lastScannedCode = null;
    _lastScanTime = null;
    
    Logger.debug('Scanner resumed - cleared processed codes cache', 'SCANNER');
  }
  
  // Clean up old processed codes to prevent memory buildup
  void _cleanupProcessedCodes() {
    // Remove codes that are older than 5 minutes
    _processedCodes.removeWhere((code) {
      // For simplicity, we'll just clear all codes every 5 minutes
      // In a more sophisticated implementation, we could track timestamps per code
      return true;
    });
    
    Logger.debug('Cleaned up processed codes cache', 'CLEANUP');
  }

  // Perform logout
  Future<void> _performLogout() async {
    try {
      // Get user email from SharedPreferences
      final prefs = await SharedPreferences.getInstance();
      final userEmail = prefs.getString('user_email');
      
      if (userEmail != null) {
        // Call logout API
        final logoutSuccess = await ApiService.logout(userEmail);
        if (logoutSuccess) {
          Logger.success('Successfully logged out from server', 'LOGOUT');
        } else {
          Logger.warning('Failed to logout from server, but continuing with local logout', 'LOGOUT');
        }
      }
      
      // Clear local storage
      await prefs.clear();
      Logger.debug('Cleared local storage', 'LOGOUT');
      
      // Disconnect socket
      SocketService.disconnect();
      Logger.socket('Disconnected socket', 'LOGOUT');
      
      // Navigate to login page
      if (mounted) {
        Navigator.of(context).pushAndRemoveUntil(
          MaterialPageRoute(builder: (context) => const LoginPage()),
          (route) => false,
        );
      }
    } catch (e) {
      Logger.exception('Error during logout', e, 'LOGOUT');
      // Even if logout fails, still navigate to login page
      if (mounted) {
        Navigator.of(context).pushAndRemoveUntil(
          MaterialPageRoute(builder: (context) => const LoginPage()),
          (route) => false,
        );
      }
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _animationTimer?.cancel();
    _debounceTimer?.cancel();
    controller?.dispose();
    // Don't disconnect socket here as it might be used by other parts of the app
    // SocketService.disconnect();
    super.dispose();
  }

  // Handle app lifecycle changes
  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    super.didChangeAppLifecycleState(state);
    
    if (state == AppLifecycleState.paused || state == AppLifecycleState.detached) {
      // App is going to background or being closed
      Logger.info('App going to background/closed, performing logout', 'LIFECYCLE');
      _performLogout();
    }
  }
}

// Custom painter for scanning line animation
class ScanningLinePainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.white.withValues(alpha: 0.8)
      ..strokeWidth = 2.0
      ..style = PaintingStyle.stroke;

    // Draw scanning line that moves from top to bottom with smooth animation
    final animationValue = (DateTime.now().millisecondsSinceEpoch % 3000) / 3000.0;
    final lineY = (animationValue * 2 * size.height) % size.height;
    
    
    canvas.drawLine(
      Offset(0, lineY),
      Offset(size.width, lineY),
      paint,
    );

    // Draw corner highlights
    final cornerPaint = Paint()
      ..color = Colors.white
      ..strokeWidth = AppConstants.cornerHighlightStrokeWidth
      ..style = PaintingStyle.stroke;

    final cornerSize = AppConstants.cornerHighlightSize;
    
    // Top-left
    canvas.drawLine(
      Offset(0, cornerSize),
      Offset(0, 0),
      cornerPaint,
    );
    canvas.drawLine(
      Offset(0, 0),
      Offset(cornerSize, 0),
      cornerPaint,
    );
    
    // Top-right
    canvas.drawLine(
      Offset(size.width - cornerSize, 0),
      Offset(size.width, 0),
      cornerPaint,
    );
    canvas.drawLine(
      Offset(size.width, 0),
      Offset(size.width, cornerSize),
      cornerPaint,
    );
    
    // Bottom-left
    canvas.drawLine(
      Offset(0, size.height - cornerSize),
      Offset(0, size.height),
      cornerPaint,
    );
    canvas.drawLine(
      Offset(0, size.height),
      Offset(cornerSize, size.height),
      cornerPaint,
    );
    
    // Bottom-right
    canvas.drawLine(
      Offset(size.width - cornerSize, size.height),
      Offset(size.width, size.height),
      cornerPaint,
    );
    canvas.drawLine(
      Offset(size.width, size.height - cornerSize),
      Offset(size.width, size.height),
      cornerPaint,
    );
  }

  @override
  bool shouldRepaint(ScanningLinePainter oldDelegate) => true;
}

// Enum for corner types
enum CornerType { topLeft, topRight, bottomLeft, bottomRight }

// Custom painter for L-shaped corner brackets
class CornerBracketPainter extends CustomPainter {
  final CornerType cornerType;
  final double bracketLength;
  final double bracketThickness;

  CornerBracketPainter({
    required this.cornerType,
    required this.bracketLength,
    required this.bracketThickness,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.white
      ..strokeWidth = bracketThickness
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.square;

    switch (cornerType) {
      case CornerType.topLeft:
        // Inverted L: horizontal line right, vertical line down
        canvas.drawLine(
          Offset(0, bracketThickness / 2),
          Offset(bracketLength, bracketThickness / 2),
          paint,
        );
        canvas.drawLine(
          Offset(bracketThickness / 2, 0),
          Offset(bracketThickness / 2, bracketLength),
          paint,
        );
        break;
      case CornerType.topRight:
        // L: horizontal line left, vertical line down
        canvas.drawLine(
          Offset(0, bracketThickness / 2),
          Offset(bracketLength, bracketThickness / 2),
          paint,
        );
        canvas.drawLine(
          Offset(bracketLength - bracketThickness / 2, 0),
          Offset(bracketLength - bracketThickness / 2, bracketLength),
          paint,
        );
        break;
      case CornerType.bottomLeft:
        // L rotated 90° clockwise: horizontal line right, vertical line up
        canvas.drawLine(
          Offset(0, bracketLength - bracketThickness / 2),
          Offset(bracketLength, bracketLength - bracketThickness / 2),
          paint,
        );
        canvas.drawLine(
          Offset(bracketThickness / 2, 0),
          Offset(bracketThickness / 2, bracketLength),
          paint,
        );
        break;
      case CornerType.bottomRight:
        // L rotated 180°: horizontal line left, vertical line up
        canvas.drawLine(
          Offset(0, bracketLength - bracketThickness / 2),
          Offset(bracketLength, bracketLength - bracketThickness / 2),
          paint,
        );
        canvas.drawLine(
          Offset(bracketLength - bracketThickness / 2, 0),
          Offset(bracketLength - bracketThickness / 2, bracketLength),
          paint,
        );
        break;
    }
  }

  @override
  bool shouldRepaint(CornerBracketPainter oldDelegate) =>
      oldDelegate.cornerType != cornerType ||
      oldDelegate.bracketLength != bracketLength ||
      oldDelegate.bracketThickness != bracketThickness;
}
