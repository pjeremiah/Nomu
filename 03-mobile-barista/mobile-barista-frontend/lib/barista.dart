import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'login.dart';
import 'api/api.dart';
import 'services/socket_service.dart';
import 'services/inventory_scanner_service.dart';
import 'widgets/custom_toast.dart';
import 'widgets/notification_banner.dart';
import 'utils/qr_validation_utils.dart';
import 'utils/logger.dart';
import 'constants/app_constants.dart';
import 'logout_confirmation_dialog.dart';

/// Barista-chosen unit price for an inventory line (first vs second price tier).
const String _kBaristaUnitPrice = '_baristaUnitPrice';
const String _kIsRewardRedemption = '_isRewardRedemption';
const String _kRewardBucket = '_rewardBucket';
const String _kRewardDescription = '_rewardDescription';

/// Maps an inventory row's [category] to a loyalty reward bucket.
///
/// Uses the **same strings as the Select Inventory modal chips**
/// (`InventoryScannerService.getCategories()`), e.g. "Donuts", "Drinks",
/// "Pastries", "Pizzas" — not improvised DB-only synonyms.
String? _rewardBucketForBaristaModalCategory(String raw) {
  final c = raw.trim().toLowerCase();
  if (c.isEmpty) return null;
  // Modal tab labels (plural) + common singular / spelling variants.
  switch (c) {
    case 'donuts':
    case 'donut':
    case 'doughnuts':
    case 'doughnut':
      return 'donut';
    case 'drinks':
    case 'drink':
      return 'drink';
    case 'pizzas':
    case 'pizza':
      return 'pizza';
    case 'pastries':
    case 'pastry':
      return 'pastry';
    default:
      return null;
  }
}

String _freeRewardButtonLabel(String bucket) {
  switch (bucket) {
    case 'donut':
      return 'Free Donut';
    case 'drink':
      return 'Free Drink';
    case 'pastry':
      return 'Free Pastry';
    case 'pizza':
      return 'Free Pizza';
    default:
      return 'Free Reward';
  }
}

/// One line in the open transaction (paid tier, or reward pickup at ₱0).
class _TxnLine {
  final String itemName;
  final double? unitPrice;
  final String? rewardBucket;
  final String? rewardDescription;

  const _TxnLine(
    this.itemName, {
    this.unitPrice,
    this.rewardBucket,
    this.rewardDescription,
  });

  static const String _sep = '\u241e';
  static const String _rw = '\u241e@RW@\u241e';

  bool get isReward => rewardBucket != null && rewardBucket!.isNotEmpty;

  String encodeKey() {
    if (isReward) {
      return '$itemName${_TxnLine._rw}$rewardBucket';
    }
    if (unitPrice != null) {
      return '$itemName$_sep${unitPrice!.toStringAsFixed(2)}';
    }
    return itemName;
  }

  static _TxnLine decodeKey(String s) {
    final rw = s.indexOf(_rw);
    if (rw >= 0) {
      final name = s.substring(0, rw).trim();
      final bucket = s.substring(rw + _rw.length).trim();
      return _TxnLine(name, rewardBucket: bucket.isEmpty ? null : bucket);
    }
    final i = s.indexOf(_sep);
    if (i < 0) return _TxnLine(s.trim());
    final name = s.substring(0, i).trim();
    final p = double.tryParse(s.substring(i + _sep.length));
    return _TxnLine(name, unitPrice: p);
  }

  String displayLabel() {
    if (isReward) {
      return '$itemName (${_freeRewardButtonLabel(rewardBucket!)})';
    }
    if (unitPrice == null) return itemName;
    final p = unitPrice!;
    final ps = p == p.roundToDouble() ? p.round().toString() : p.toStringAsFixed(2);
    return '$itemName (₱$ps)';
  }
}

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
  final List<_TxnLine> _currentTransactionItems = [];
  DateTime? _transactionStartTime;
  static const Duration _transactionTimeout = AppConstants.transactionTimeout;

  /// Physical stock is reduced only after `/loyalty/scan-multiple` succeeds (see `_applyPendingStockDecreases`).
  final List<Map<String, dynamic>> _pendingStockDecreases = [];

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

  /// Categories from admin inventory only (Donuts, Drinks, Pastries, Pizzas).
  List<String> _getAllCategories() {
    final inventoryCategories = InventoryScannerService.getCategories();
    final allCategories = <String>{'All'};
    allCategories.addAll(inventoryCategories);
    return allCategories.toList()..sort();
  }

  Map<String, dynamic>? _getItemById(String itemId) {
    final inventoryItem = InventoryScannerService.getItemById(itemId);
    if (inventoryItem != null) {
      return {...inventoryItem, 'isMenu': false};
    }
    return null;
  }

  static final RegExp _reSelReward =
      RegExp(r'^(.+)__rw_(donut|drink|pastry|pizza)$');
  static final RegExp _reSelPrice = RegExp(r'^(.+)__p(\d+)$');

  /// Dialog selection key → base Mongo id (strip `__rw_*` or `__p*` suffix).
  String _selectionKeyToBaseId(String key) {
    final rw = _reSelReward.firstMatch(key);
    if (rw != null) return rw.group(1)!;
    final m = _reSelPrice.firstMatch(key);
    if (m != null) return m.group(1)!;
    return key;
  }

  double? _selectionKeyToPrice(String key) {
    if (_reSelReward.hasMatch(key)) return null;
    final m = _reSelPrice.firstMatch(key);
    if (m != null) return double.tryParse(m.group(2)!);
    return null;
  }

  String? _selectionKeyRewardBucket(String key) {
    return _reSelReward.firstMatch(key)?.group(2);
  }

  String _selectionKeyDual(String baseId, double price) =>
      '${baseId}__p${price.round()}';

  String _selectionKeyReward(String baseId, String bucket) =>
      '${baseId}__rw_$bucket';

  Map<String, dynamic>? _getItemBySelectionKey(String key) {
    final rwBucket = _selectionKeyRewardBucket(key);
    final bid = _selectionKeyToBaseId(key);
    final inv = _getItemById(bid);
    if (inv == null) return null;
    if (rwBucket != null) {
      final desc = '${_freeRewardButtonLabel(rwBucket)} — ${inv['name'] ?? ''}';
      return {
        ...inv,
        _kIsRewardRedemption: true,
        _kRewardBucket: rwBucket,
        _kRewardDescription: desc,
      };
    }
    final p = _selectionKeyToPrice(key);
    if (p != null) {
      return {...inv, _kBaristaUnitPrice: p};
    }
    return inv;
  }

  bool _itemHasDualPrice(Map<String, dynamic> item) {
    final fp = _num(item['firstPrice']);
    final sp = _num(item['secondPrice']);
    return fp != null &&
        fp > 0 &&
        sp != null &&
        sp > 0 &&
        fp != sp;
  }

  static double? _num(dynamic v) {
    if (v == null) return null;
    if (v is num) return v.toDouble();
    return double.tryParse(v.toString());
  }

  /// Unit price: firstPrice, else secondPrice, else legacy price fields.
  double _unitPriceFromInventoryRow(Map<String, dynamic> row) {
    final fp = _num(row['firstPrice']);
    final sp = _num(row['secondPrice']);
    if (fp != null && fp > 0) return fp;
    if (sp != null && sp > 0) return sp;
    final legacy = _num(row['sellingPrice']) ??
        _num(row['unitPrice']) ??
        _num(row['price']) ??
        _num(row['retailPrice']);
    if (legacy != null && legacy > 0) return legacy;
    return 0;
  }

  /// Maps admin inventory category to API labels (Drinks, Pastries, Pizza, Donut) + itemType.
  Map<String, String> _loyaltyCategoryAndType(String rawCategory) {
    final c = rawCategory.trim().toLowerCase();
    if (c == 'drinks') {
      return {'category': 'Drinks', 'itemType': 'drink'};
    }
    if (c == 'pastries') {
      return {'category': 'Pastries', 'itemType': 'pastry'};
    }
    if (c == 'pizzas') {
      return {'category': 'Pizza', 'itemType': 'pizza'};
    }
    if (c == 'donuts') {
      return {'category': 'Donut', 'itemType': 'donut'};
    }
    return {'category': rawCategory.isNotEmpty ? rawCategory : 'General', 'itemType': 'food'};
  }

  /// Builds line items for `/api/loyalty/scan-multiple` from the transaction lines (incl. chosen price).
  List<Map<String, dynamic>> _buildLoyaltyLineItemsFromTransaction() {
    final counts = <String, int>{};
    for (final line in _currentTransactionItems) {
      final k = line.encodeKey();
      counts[k] = (counts[k] ?? 0) + 1;
    }
    final inv = InventoryScannerService.getAllItems();
    final lines = <Map<String, dynamic>>[];
    counts.forEach((encKey, qty) {
      final line = _TxnLine.decodeKey(encKey);
      final name = line.itemName;
      final chosen = line.unitPrice;
      Map<String, dynamic>? row;
      final nameLower = name.toLowerCase();
      for (final e in inv) {
        if ((e['name'] ?? '').toString().trim().toLowerCase() == nameLower) {
          row = e;
          break;
        }
      }
      if (line.isReward) {
        final bucket = line.rewardBucket ?? '';
        if (row != null) {
          final cat = (row['category'] ?? '').toString();
          final m = _loyaltyCategoryAndType(cat);
          final desc = line.rewardDescription ??
              '${_freeRewardButtonLabel(bucket)} — ${row['name'] ?? name}';
          lines.add({
            'itemName': (row['name'] ?? name).toString(),
            'itemType': m['itemType']!,
            'category': m['category']!,
            'price': 0,
            'quantity': qty,
            'isRewardRedemption': true,
            'rewardBucket': bucket,
            'rewardDescription': desc,
          });
        } else {
          lines.add({
            'itemName': name,
            'itemType': 'unknown',
            'category': 'General',
            'price': 0,
            'quantity': qty,
            'isRewardRedemption': true,
            'rewardBucket': bucket,
            'rewardDescription':
                line.rewardDescription ?? _freeRewardButtonLabel(bucket),
          });
        }
        return;
      }
      if (row != null) {
        final cat = (row['category'] ?? '').toString();
        final m = _loyaltyCategoryAndType(cat);
        final unit = chosen ?? _unitPriceFromInventoryRow(row);
        lines.add({
          'itemName': (row['name'] ?? name).toString(),
          'itemType': m['itemType']!,
          'category': m['category']!,
          'price': unit,
          'quantity': qty,
        });
      } else {
        lines.add({
          'itemName': name,
          'itemType': 'unknown',
          'category': 'General',
          'price': chosen ?? 0,
          'quantity': qty,
        });
      }
    });
    return lines;
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
                    final shouldLogout =
                        await showBaristaLogoutConfirmationDialog(context);
                    if (shouldLogout == true && context.mounted) {
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
                    // Dim area outside scan frame only (no full-screen blur — that blurred the camera + UI).
                    CustomPaint(
                      painter: _ScannerOutsideDimPainter(
                        holeSize: AppConstants.scanningBoxSize,
                        borderRadius: 20,
                        dimColor: Colors.black.withValues(alpha: 0.45),
                      ),
                      child: const SizedBox.expand(),
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
                                color: Colors.green.withValues(alpha: 0.1),
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
                                color: Colors.blue.withValues(alpha: 0.1),
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
    final dynamic selectedItems = await showDialog<dynamic>(
      context: context,
      barrierDismissible: false,
      builder: (context) {
        Map<String, int> tempSelectedItems = <String, int>{};
        String selectedCategory = 'All';
        String searchTerm = '';
        List<Map<String, dynamic>> filteredItems = InventoryScannerService.getAllItems();
        
        return StatefulBuilder(
          builder: (context, setState) {
            /// Web admin inventory only (same SKUs as stock / loyalty DB).
            List<Map<String, dynamic>> getAllAvailableItems() {
              return InventoryScannerService.getAllItems()
                  .map((item) => {...item, 'isMenu': false})
                  .toList();
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
                      'Current Transaction: ${_currentTransactionItems.map((l) => l.displayLabel()).join(', ')}',
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
                                  final item = _getItemBySelectionKey(itemId);
                                  final itemName = item?['name'] ?? 'Unknown Item';
                                  final isRwChip = item?[_kIsRewardRedemption] == true;
                                  final rwbChip = item?[_kRewardBucket] as String?;
                                  final p = item?[_kBaristaUnitPrice];
                                  var priceTag = '';
                                  if (!isRwChip && p != null) {
                                    final pd = p is num
                                        ? p.toDouble()
                                        : (double.tryParse(p.toString()) ?? 0);
                                    priceTag = pd == pd.roundToDouble()
                                        ? ' ₱${pd.round()}'
                                        : ' ₱${pd.toStringAsFixed(2)}';
                                  }
                                  final rwTag = isRwChip && rwbChip != null
                                      ? ' [${_freeRewardButtonLabel(rwbChip)}]'
                                      : '';
                                  return Chip(
                                    label: Text(
                                      '$itemName$priceTag$rwTag (x$quantity)',
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
                        // One row per inventory SKU; dual-priced items use two price buttons.
                        final Set<String> allItemIdsToShow = <String>{};
                        for (final fi in filteredItems) {
                          final id = fi['_id']?.toString() ?? '';
                          if (id.isNotEmpty) allItemIdsToShow.add(id);
                        }
                        for (final k in tempSelectedItems.keys) {
                          allItemIdsToShow.add(_selectionKeyToBaseId(k));
                        }

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
                            final baseId = itemIdsToShow[index];
                            final item = _getItemById(baseId);
                            if (item == null) return const SizedBox.shrink();

                            final itemName = item['name'] ?? 'Unknown Item';
                            final category = item['category'] ?? '';
                            final rewardBucket =
                                _rewardBucketForBaristaModalCategory(category);
                            final dual = _itemHasDualPrice(item);
                            final fp = _num(item['firstPrice']);
                            final sp = _num(item['secondPrice']);

                            String? keyFirst;
                            String? keySecond;
                            int paidQty;
                            if (dual && fp != null && sp != null) {
                              keyFirst = _selectionKeyDual(baseId, fp);
                              keySecond = _selectionKeyDual(baseId, sp);
                              paidQty = (tempSelectedItems[keyFirst] ?? 0) +
                                  (tempSelectedItems[keySecond] ?? 0);
                            } else {
                              paidQty = tempSelectedItems[baseId] ?? 0;
                            }

                            final rewardKey = rewardBucket != null
                                ? _selectionKeyReward(baseId, rewardBucket)
                                : null;
                            final rewardQty =
                                rewardKey != null ? (tempSelectedItems[rewardKey] ?? 0) : 0;
                            final anySelected = paidQty > 0 || rewardQty > 0;

                            final isInFilteredList = filteredItems
                                .any((filteredItem) => filteredItem['_id'] == baseId);

                            final btnStyle = OutlinedButton.styleFrom(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 10, vertical: 8),
                              minimumSize: Size.zero,
                              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                              visualDensity: VisualDensity.compact,
                            );

                            Widget horizontalActions = SingleChildScrollView(
                              scrollDirection: Axis.horizontal,
                              child: Row(
                                crossAxisAlignment: CrossAxisAlignment.center,
                                children: [
                                  if (rewardBucket != null) ...[
                                    OutlinedButton(
                                      style: btnStyle.copyWith(
                                        foregroundColor:
                                            WidgetStateProperty.all(Colors.deepPurple),
                                        side: WidgetStateProperty.all(
                                            const BorderSide(
                                                color: Colors.deepPurple)),
                                      ),
                                      onPressed: () {
                                        setState(() {
                                          final rk = _selectionKeyReward(
                                              baseId, rewardBucket);
                                          tempSelectedItems[rk] =
                                              (tempSelectedItems[rk] ?? 0) + 1;
                                        });
                                      },
                                      child: Text(
                                        _freeRewardButtonLabel(rewardBucket),
                                        style: const TextStyle(fontSize: 11),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ),
                                    const SizedBox(width: 6),
                                  ],
                                  if (dual &&
                                      fp != null &&
                                      sp != null &&
                                      keyFirst != null &&
                                      keySecond != null) ...[
                                    OutlinedButton(
                                      style: btnStyle,
                                      onPressed: () {
                                        setState(() {
                                          tempSelectedItems[keyFirst!] =
                                              (tempSelectedItems[keyFirst] ?? 0) + 1;
                                        });
                                      },
                                      child: Text(
                                        '₱${fp.round()}',
                                        style: const TextStyle(fontSize: 12),
                                      ),
                                    ),
                                    const SizedBox(width: 6),
                                    OutlinedButton(
                                      style: btnStyle,
                                      onPressed: () {
                                        setState(() {
                                          tempSelectedItems[keySecond!] =
                                              (tempSelectedItems[keySecond] ?? 0) + 1;
                                        });
                                      },
                                      child: Text(
                                        '₱${sp.round()}',
                                        style: const TextStyle(fontSize: 12),
                                      ),
                                    ),
                                  ] else ...[
                                    Padding(
                                      padding: const EdgeInsets.symmetric(
                                          horizontal: 4, vertical: 6),
                                      child: Text(
                                        '₱${_unitPriceFromInventoryRow(item).round()}',
                                        style: TextStyle(
                                          fontSize: 12,
                                          fontWeight: FontWeight.w700,
                                          color: Colors.blueGrey.shade800,
                                        ),
                                      ),
                                    ),
                                  ],
                                  const SizedBox(width: 4),
                                  IconButton(
                                    icon: const Icon(Icons.remove, size: 20),
                                    onPressed: paidQty > 0
                                        ? () {
                                            setState(() {
                                              if (dual &&
                                                  keyFirst != null &&
                                                  keySecond != null) {
                                                final q2 =
                                                    tempSelectedItems[keySecond] ?? 0;
                                                if (q2 > 0) {
                                                  if (q2 <= 1) {
                                                    tempSelectedItems
                                                        .remove(keySecond);
                                                  } else {
                                                    tempSelectedItems[keySecond] =
                                                        q2 - 1;
                                                  }
                                                } else {
                                                  final q1 = tempSelectedItems[
                                                          keyFirst] ??
                                                      0;
                                                  if (q1 <= 1) {
                                                    tempSelectedItems
                                                        .remove(keyFirst);
                                                  } else {
                                                    tempSelectedItems[keyFirst] =
                                                        q1 - 1;
                                                  }
                                                }
                                              } else {
                                                if (paidQty <= 1) {
                                                  tempSelectedItems
                                                      .remove(baseId);
                                                } else {
                                                  tempSelectedItems[baseId] =
                                                      paidQty - 1;
                                                }
                                              }
                                            });
                                          }
                                        : null,
                                    constraints: const BoxConstraints(
                                      minWidth: 36,
                                      minHeight: 36,
                                    ),
                                    padding: EdgeInsets.zero,
                                  ),
                                  SizedBox(
                                    width: 28,
                                    child: Text(
                                      '$paidQty',
                                      textAlign: TextAlign.center,
                                      style: const TextStyle(
                                        fontSize: 15,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ),
                                  IconButton(
                                    icon: const Icon(Icons.add, size: 20),
                                    onPressed: () {
                                      setState(() {
                                        if (dual &&
                                            keyFirst != null &&
                                            keySecond != null) {
                                          tempSelectedItems[keyFirst] =
                                              (tempSelectedItems[keyFirst] ?? 0) + 1;
                                        } else {
                                          tempSelectedItems[baseId] =
                                              paidQty + 1;
                                        }
                                      });
                                    },
                                    constraints: const BoxConstraints(
                                      minWidth: 36,
                                      minHeight: 36,
                                    ),
                                    padding: EdgeInsets.zero,
                                  ),
                                ],
                              ),
                            );

                            return Card(
                              margin: const EdgeInsets.symmetric(vertical: 2),
                              color: anySelected
                                  ? Colors.blue.withOpacity(0.1)
                                  : null,
                              child: Padding(
                                padding: const EdgeInsets.all(12.0),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      itemName,
                                      style: TextStyle(
                                        fontSize: 14,
                                        fontWeight: anySelected
                                            ? FontWeight.bold
                                            : FontWeight.normal,
                                        color: isInFilteredList
                                            ? null
                                            : Colors.grey.shade600,
                                      ),
                                    ),
                                    if (category.isNotEmpty) ...[
                                      const SizedBox(height: 2),
                                      Text(
                                        category,
                                        style: TextStyle(
                                          fontSize: 12,
                                          color: isInFilteredList
                                              ? Colors.grey
                                              : Colors.grey.shade500,
                                        ),
                                      ),
                                    ],
                                    const SizedBox(height: 8),
                                    horizontalActions,
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
                            final item = _getItemBySelectionKey(itemId);
                            if (item != null) {
                              for (int i = 0; i < quantity; i++) {
                                selectedItems.add(Map<String, dynamic>.from(item));
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

    if (selectedItems is String && selectedItems == 'COMPLETE_TRANSACTION') {
      await _completeTransaction(qrResult!, '');
      return;
    }

    if (selectedItems is! List) {
      _resumeScanning();
      return;
    }

    final selectedItemsList =
        List<Map<String, dynamic>>.from(selectedItems);
    
    // Group by inventory id + chosen price tier (dual-priced SKUs may appear twice).
    Map<String, Map<String, dynamic>> itemQuantities = {};
    for (Map<String, dynamic> item in selectedItemsList) {
      final itemId = item['_id'] ?? '';
      final isRw = item[_kIsRewardRedemption] == true;
      final rwb = item[_kRewardBucket] as String?;
      final rawP = item[_kBaristaUnitPrice];
      final priceKey = !isRw && rawP != null
          ? (rawP is num ? rawP.toDouble() : (double.tryParse(rawP.toString()) ?? 0))
              .toStringAsFixed(2)
          : '';
      final groupKey = isRw && rwb != null && rwb.isNotEmpty
          ? '${itemId}_rw_$rwb'
          : (priceKey.isNotEmpty ? '${itemId}_$priceKey' : itemId);

      if (itemQuantities.containsKey(groupKey)) {
        itemQuantities[groupKey]!['quantity'] =
            (itemQuantities[groupKey]!['quantity'] as int) + 1;
      } else {
        itemQuantities[groupKey] = {
          'item': item,
          'quantity': 1,
        };
      }
    }
    
    List<String> processedItemNames = [];
    for (final groupKey in itemQuantities.keys) {
      final itemData = itemQuantities[groupKey]!;
      final item = itemData['item'] as Map<String, dynamic>;
      final quantity = itemData['quantity'] as int;
      final mongoId = item['_id']?.toString() ?? '';
      final itemName = item['name'] ?? 'Unknown Item';
      final currentStock = item['currentStock'] ?? 0;
      final isMenu = item['isMenu'] ?? false;

      Logger.debug(
          'Processing item: $itemName (ID: $mongoId, isMenu: $isMenu, stock: $currentStock, quantity: $quantity)',
          'TRANSACTION');
      
      final isRwLine = item[_kIsRewardRedemption] == true;
      double? chosenPrice;
      if (!isRwLine) {
        final rawBp = item[_kBaristaUnitPrice];
        if (rawBp != null) {
          chosenPrice = rawBp is num
              ? rawBp.toDouble()
              : double.tryParse(rawBp.toString());
        }
      }

      // For pure menu items (no inventory), we don't need to check stock or decrease it
      if (isMenu) {
        for (int i = 0; i < quantity; i++) {
          if (isRwLine) {
            _addItemToTransaction(
              itemName,
              rewardBucket: item[_kRewardBucket] as String?,
              rewardDescription: item[_kRewardDescription] as String?,
            );
          } else {
            _addItemToTransaction(itemName, unitPrice: chosenPrice);
          }
          processedItemNames.add(itemName);
        }
        Logger.success('Successfully processed menu item: $itemName (x$quantity)', 'MENU');
        continue;
      }
      
      // Inventory: defer stock decrease until loyalty API succeeds (avoids selling stock when scan fails).
      Logger.debug(
          'Queueing stock decrease for after loyalty success: $itemName (ID: $mongoId, quantity: $quantity)',
          'INVENTORY');
      _queueInventoryStockForCompletion(
        itemId: mongoId,
        quantity: quantity,
        itemName: itemName,
      );

      for (int i = 0; i < quantity; i++) {
        if (isRwLine) {
          _addItemToTransaction(
            itemName,
            rewardBucket: item[_kRewardBucket] as String?,
            rewardDescription: item[_kRewardDescription] as String?,
          );
        } else {
          _addItemToTransaction(itemName, unitPrice: chosenPrice);
        }
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
    _pendingStockDecreases.clear();
    _transactionStartTime = DateTime.now();
    Logger.transaction('Started new transaction (ID: $_currentTransactionId) for QR: $qrCode');
  }

  void _queueInventoryStockForCompletion({
    required String itemId,
    required int quantity,
    required String itemName,
  }) {
    if (itemId.isEmpty || quantity <= 0) return;
    final i = _pendingStockDecreases.indexWhere((e) => e['itemId'] == itemId);
    if (i >= 0) {
      _pendingStockDecreases[i]['quantity'] =
          (_pendingStockDecreases[i]['quantity'] as int) + quantity;
    } else {
      _pendingStockDecreases.add({
        'itemId': itemId,
        'quantity': quantity,
        'itemName': itemName,
      });
    }
  }

  Future<void> _applyPendingStockDecreases() async {
    for (final p in List<Map<String, dynamic>>.from(_pendingStockDecreases)) {
      final mongoId = p['itemId'] as String? ?? '';
      final quantity = p['quantity'] as int? ?? 0;
      final itemName = p['itemName'] as String? ?? 'Item';
      if (mongoId.isEmpty || quantity <= 0) continue;

      final stockResult = await InventoryScannerService.decreaseStock(
        itemId: mongoId,
        quantity: quantity,
        reason: 'Sold via QR scan',
      );

      if (stockResult != null && stockResult.containsKey('error')) {
        Logger.warning(
            'Post-sale stock update failed for $itemName (x$quantity): ${stockResult['error']}',
            'INVENTORY');
        if (mounted) {
          CustomToast.showWarning(
            context,
            message:
                'Loyalty saved but stock sync failed for $itemName — adjust inventory in admin if needed',
            duration: const Duration(seconds: 4),
          );
        }
      } else if (stockResult != null && stockResult.containsKey('item')) {
        if (mounted) {
          CustomToast.showSuccess(
            context,
            message: 'Stock decreased for $itemName (x$quantity)',
            duration: const Duration(seconds: 2),
          );
        }
        Logger.success(
            'Stock decreased after successful loyalty: $itemName (x$quantity)', 'INVENTORY');
      }
    }
    _pendingStockDecreases.clear();
  }
  
  void _addItemToTransaction(
    String itemName, {
    double? unitPrice,
    String? rewardBucket,
    String? rewardDescription,
  }) {
    final n = itemName.trim();
    if (n.isEmpty) return;
    final rb =
        (rewardBucket != null && rewardBucket.isNotEmpty) ? rewardBucket : null;
    final line = _TxnLine(
      n,
      unitPrice: rb != null ? null : unitPrice,
      rewardBucket: rb,
      rewardDescription: rewardDescription,
    );
    _currentTransactionItems.add(line);
    Logger.transaction(
        'Added item: ${line.displayLabel()} (Total items: ${_currentTransactionItems.length})');
  }
  
  // Complete transaction and add points
  Future<void> _completeTransaction(String qrCode, String selectedDrink) async {
    if (selectedDrink.trim().isNotEmpty) {
      _addItemToTransaction(selectedDrink, unitPrice: null);
    }

    String transactionSummary = _currentTransactionItems
        .map((l) => l.displayLabel())
        .where((s) => s.trim().isNotEmpty)
        .join(', ');
    Logger.transaction('Completing transaction with items: $transactionSummary');

    final lineItems = _buildLoyaltyLineItemsFromTransaction();
    if (lineItems.isEmpty) {
      Logger.error('No line items for loyalty payload', 'TRANSACTION');
      if (mounted) {
        CustomToast.showWarning(
          context,
          message: 'No items in this transaction',
          duration: const Duration(seconds: 3),
        );
      }
      _resetTransaction();
      _resumeScanning();
      return;
    }

    final prefs = await SharedPreferences.getInstance();
    final employeeId = prefs.getString('user_id');

    final result = await ApiService.addLoyaltyPointsMultiple(
      qrCode,
      lineItems,
      employeeId: employeeId,
    );
    
    Logger.transaction('API result: $result');
    
    if (result != null) {
      // Check if this is an error response (400 or 429 status)
      if (result.containsKey('error')) {
        final err = result['error']?.toString() ?? 'Unknown error';
        final code = result['code']?.toString();
        final statusCode = result['statusCode'];
        Logger.error('Error response detected: $err (code: $code)', 'TRANSACTION');

        if (code == 'ABUSE_DETECTED') {
          _showErrorDialog('Scan blocked', err);
        } else if (code == 'RATE_LIMIT_EXCEEDED' || statusCode == 429) {
          Logger.error('Rate limit exceeded - customer has reached daily scan limit', 'TRANSACTION');
          await _showRateLimitDialog(result);
        } else if (_isLoyaltyCardFullError(code, err)) {
          await _showCardFullDialog(result);
        } else if (code == 'REWARD_ALREADY_PICKED_UP' ||
            code == 'REWARD_PICKUP_EXPIRED' ||
            code == 'REWARD_NOT_CLAIMED') {
          final detail = result['message']?.toString();
          final title = code == 'REWARD_ALREADY_PICKED_UP'
              ? 'Already picked up'
              : (code == 'REWARD_PICKUP_EXPIRED' ? 'Pickup window ended' : 'Claim in app first');
          final msg = (detail != null && detail.isNotEmpty) ? detail : err;
          _showErrorDialog(title, msg);
        } else {
          final detail = result['message']?.toString();
          final msg = (detail != null && detail.isNotEmpty && detail != err)
              ? '$err\n\n$detail'
              : err;
          _showErrorDialog('Transaction Failed', msg);
        }
        _resetTransaction();
      } else {
        Logger.success('Success response detected', 'TRANSACTION');
        await _applyPendingStockDecreases();
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
    _pendingStockDecreases.clear();
    _transactionStartTime = null;
    Logger.transaction('Transaction reset');
  }

  bool _isLoyaltyCardFullError(String? code, String err) {
    if (code == 'CARD_FULL' || code == 'MAX_POINTS') return true;
    final lower = err.toLowerCase().trim();
    if (lower.contains('card full')) return true;
    // Legacy barista backends only — avoid matching unrelated errors that mention "10" or "stamps".
    if (RegExp(r'already has \d+\s+stamps').hasMatch(lower)) return true;
    if (lower == 'customer already has 10 stamps') return true;
    return false;
  }

  String _readableStampCountForDialog(Map<String, dynamic> result) {
    final p = result['points'] ?? result['currentPoints'];
    if (p == null) return 'the maximum';
    if (p is num) return p.round().toString();
    final s = p.toString().trim();
    return s.isEmpty ? 'the maximum' : s;
  }
  
  // Show transaction success dialog
  Future<void> _showTransactionSuccessDialog(Map<String, dynamic> result, String transactionSummary) async {
    final rawEarned = result['pointsAdded'];
    final int earned = rawEarned is num
        ? rawEarned.toInt()
        : int.tryParse(rawEarned?.toString() ?? '') ?? 0;
    final earnedLabel = earned == 1
        ? '1 ${AppConstants.pointLabel}'
        : '$earned ${AppConstants.pointsLabel}';
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
                      _buildDetailRow('🎯', AppConstants.customerEarnedLabel, earnedLabel),
                      SizedBox(height: MediaQuery.of(context).size.height * 0.01),
                      _buildDetailRow('📊', AppConstants.totalPointsLabel, '${result['points']}'),
                      SizedBox(height: MediaQuery.of(context).size.height * 0.01),
                      _buildDetailRow('📋', AppConstants.totalOrdersLabel, '${result['totalOrders']}'),
                      if (result['fulfilledRewardBuckets'] is List &&
                          (result['fulfilledRewardBuckets'] as List).isNotEmpty) ...[
                        SizedBox(height: MediaQuery.of(context).size.height * 0.01),
                        _buildDetailRow(
                          '🎁',
                          'Reward pickup',
                          (result['fulfilledRewardBuckets'] as List)
                              .map((e) {
                                if (e is Map) {
                                  return (e['rewardBucket'] ?? 'item').toString();
                                }
                                return e.toString();
                              })
                              .join(', '),
                        ),
                      ],
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
                    'This customer already has ${_readableStampCountForDialog(result)} stamps. No more can be added.',
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
    final errLower = (result['error']?.toString() ?? '').toLowerCase();
    final isPointsLimit = errLower.contains('points');
    final maxScans = result['maxScansPerDay'];
    final maxPoints = result['maxPointsPerDay'];
    final int? maxScansInt = maxScans is num ? maxScans.toInt() : int.tryParse(maxScans?.toString() ?? '');
    final int? maxPointsInt = maxPoints is num ? maxPoints.toInt() : int.tryParse(maxPoints?.toString() ?? '');

    final title = isPointsLimit ? 'Daily Points Limit Reached' : 'Daily Scan Limit Reached';
    final String body = isPointsLimit
        ? (maxPointsInt != null
            ? 'This customer has reached their daily points limit ($maxPointsInt points per day). Please ask them to return tomorrow.'
            : 'This customer has reached their daily points limit. Please ask them to return tomorrow.')
        : (maxScansInt != null
            ? 'This customer has reached their daily scan limit ($maxScansInt scans per day). Please ask them to return tomorrow.'
            : 'This customer has reached their daily scan limit. Please ask them to return tomorrow.');

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
                title,
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
                    body,
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
/// Darkens the scanner preview outside the scan box; center stays fully sharp.
class _ScannerOutsideDimPainter extends CustomPainter {
  _ScannerOutsideDimPainter({
    required this.holeSize,
    required this.borderRadius,
    required this.dimColor,
  });

  final double holeSize;
  final double borderRadius;
  final Color dimColor;

  @override
  void paint(Canvas canvas, Size size) {
    final holeRect = Rect.fromCenter(
      center: Offset(size.width / 2, size.height / 2),
      width: holeSize,
      height: holeSize,
    );
    final inner = Path()..addRRect(RRect.fromRectAndRadius(holeRect, Radius.circular(borderRadius)));
    final outer = Path()..addRect(Rect.fromLTWH(0, 0, size.width, size.height));
    final overlay = Path.combine(PathOperation.difference, outer, inner);
    canvas.drawPath(overlay, Paint()..color = dimColor);
  }

  @override
  bool shouldRepaint(covariant _ScannerOutsideDimPainter oldDelegate) {
    return oldDelegate.holeSize != holeSize ||
        oldDelegate.borderRadius != borderRadius ||
        oldDelegate.dimColor != dimColor;
  }
}

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
