class AppConstants {
  // Scanner Configuration
  static const int scannerDetectionTimeoutMs = 1000;
  static const Duration scanCooldown = Duration(seconds: 5);
  static const Duration debounceDelay = Duration(milliseconds: 500);
  static const Duration processingCooldown = Duration(seconds: 2);
  
  // Transaction Configuration
  static const Duration transactionTimeout = Duration(minutes: 5);
  static const int maxRetries = 3;
  static const Duration retryDelay = Duration(seconds: 1);
  static const Duration apiTimeout = Duration(seconds: 10);
  
  // UI Configuration
  static const Duration animationDuration = Duration(milliseconds: 1000);
  static const Duration scanningAnimationDuration = Duration(milliseconds: 3000);
  static const Duration snackbarDuration = Duration(seconds: 3);
  static const Duration resendCooldown = Duration(seconds: 10);
  
  // QR Code Configuration
  static const int qrCodeLength = 6;
  static const int qrTokenMinLength = 32;
  static const int qrTokenMaxLength = 36;
  
  // Validation Configuration
  static const int minPasswordLength = 6;
  static const int maxProcessedCodesCache = 100;
  static const Duration processedCodesCleanupInterval = Duration(minutes: 5);
  
  // Network Configuration
  static const String defaultServerHost = 'nomu-backend.onrender.com';
  static const String defaultServerPort = '443';
  static const String mobileAdminPort = '443';
  
  // UI Dimensions
  static const double scanningBoxSize = 280.0;
  static const double cornerBracketLength = 25.0;
  static const double cornerBracketThickness = 4.0;
  static const double cornerHighlightSize = 15.0;
  
  // Animation Values
  static const double scanningLineStrokeWidth = 2.0;
  static const double cornerHighlightStrokeWidth = 3.0;
  static const double scanningBoxBorderWidth = 3.0;
  
  // Error Messages
  static const String invalidQRCodeMessage = 'This QR code is not a valid customer loyalty card. Please scan a valid customer QR code.';
  static const String networkErrorMessage = 'Network error. Please check your connection and try again.';
  static const String serverErrorMessage = 'Invalid response from server. Please try again.';
  static const String transactionFailedMessage = 'Unable to process the transaction. Please try again.';
  
  // Success Messages
  static const String qrCodeScannedMessage = 'QR Code Scanned!';
  static const String processingOrderMessage = 'Processing order...';
  static const String scanQRCodeMessage = 'Scan a QR code';
  static const String pointCameraMessage = 'Point camera at customer QR code';
  
  // Dialog Messages
  static const String selectDrinkTitle = 'Select Drink';
  static const String transactionUpdatedTitle = 'Transaction Updated';
  static const String transactionCompleteTitle = 'Transaction Complete!';
  static const String cardFullTitle = 'Card Full';
  static const String confirmLogoutTitle = 'Confirm Logout';
  static const String confirmLogoutMessage = 'Are you sure you want to log out?';
  
  // Button Labels
  static const String addItemButton = 'Add Item';
  static const String addMoreButton = 'Add More';
  static const String completeTransactionButton = 'Complete Transaction';
  static const String cancelButton = 'Cancel';
  static const String okButton = 'OK';
  static const String logoutButton = 'Logout';
  static const String backToLoginButton = 'Back to Login';
  static const String resendCodeButton = 'Resend Code';
  static const String verifyCodeButton = 'Verify Code';
  static const String resumeScanningButton = 'Resume Scanning';
  
  // Instructions
  static const String positionQRCodeMessage = 'Position QR code within the frame';
  static const String didntReceiveCodeMessage = "Didn't receive the code? ";
  static const String checkYourEmailTitle = 'Check Your Email';
  static const String verificationCodeMessage = 'We sent a 6-digit verification code to';
  
  // Transaction Messages
  static const String itemsLabel = 'Items';
  static const String customerEarnedLabel = 'Customer earned';
  static const String totalPointsLabel = 'Total Points';
  static const String totalOrdersLabel = 'Total Orders';
  static const String pointLabel = 'point';
  static const String pointsLabel = 'points';
  
  // Debug Messages (for development only)
  static const String debugCameraStatus = 'Camera status check';
  static const String debugSimulatingQR = 'Simulating QR code detection';
  static const String debugControllerInitialized = 'Controller: Initialized';
  static const String debugControllerNull = 'Controller: Null';
  static const String debugCameraStarted = 'Camera started successfully';
  static const String debugCameraStartError = 'Camera start error';
  
  // GridFS Configuration
  static const int maxImageSizeBytes = 2 * 1024 * 1024; // 2MB
  static const int maxImageWidth = 1920;
  static const int maxImageHeight = 1080;
  static const int imageCompressionQuality = 85;
  static const int thumbnailWidth = 200;
  static const int thumbnailHeight = 200;
  
  // GridFS Buckets
  static const String inventoryImagesBucket = 'inventory_images';
  static const String menuImagesBucket = 'menu_images';
  static const String profileImagesBucket = 'profile_images';
  static const String promoImagesBucket = 'promo_images';
  
  // Image Upload Configuration
  static const Duration imageUploadTimeout = Duration(minutes: 5);
  static const int maxImageUploadRetries = 3;
  static const Duration imageUploadRetryDelay = Duration(seconds: 2);
  
  // Supported Image Formats
  static const List<String> supportedImageFormats = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
  
  // Image Cache Configuration
  static const int maxCacheSizeBytes = 50 * 1024 * 1024; // 50MB
  static const Duration cacheCleanupInterval = Duration(hours: 24);
  
  // Inventory Configuration
  static const double defaultMinimumStock = 10.0;
  static const double defaultMaximumStock = 1000.0;
  static const String defaultInventoryUnit = 'pcs';
  
  // Menu Configuration
  static const double defaultMenuPrice = 0.0;
  static const bool defaultMenuAvailability = true;
  
  // GridFS Error Messages
  static const String imageUploadFailedMessage = 'Failed to upload image. Please try again.';
  static const String imageDownloadFailedMessage = 'Failed to download image. Please check your connection.';
  static const String imageDeleteFailedMessage = 'Failed to delete image. Please try again.';
  static const String imageSizeTooLargeMessage = 'Image size is too large. Please compress the image.';
  static const String unsupportedImageFormatMessage = 'Unsupported image format. Please use JPG, PNG, GIF, or WebP.';
  static const String imageDimensionsTooLargeMessage = 'Image dimensions are too large. Please resize the image.';
  
  // GridFS Success Messages
  static const String imageUploadSuccessMessage = 'Image uploaded successfully!';
  static const String imageDeleteSuccessMessage = 'Image deleted successfully!';
  static const String imageCompressionSuccessMessage = 'Image compressed successfully!';
  
  // Inventory Error Messages
  static const String inventoryItemNotFoundMessage = 'Inventory item not found.';
  static const String inventoryItemCreateFailedMessage = 'Failed to create inventory item. Please try again.';
  static const String inventoryItemUpdateFailedMessage = 'Failed to update inventory item. Please try again.';
  static const String inventoryItemDeleteFailedMessage = 'Failed to delete inventory item. Please try again.';
  static const String stockMovementFailedMessage = 'Failed to add stock movement. Please try again.';
  
  // Inventory Success Messages
  static const String inventoryItemCreatedMessage = 'Inventory item created successfully!';
  static const String inventoryItemUpdatedMessage = 'Inventory item updated successfully!';
  static const String inventoryItemDeletedMessage = 'Inventory item deleted successfully!';
  static const String stockMovementAddedMessage = 'Stock movement added successfully!';
  
  // Menu Error Messages
  static const String menuItemNotFoundMessage = 'Menu item not found.';
  static const String menuItemCreateFailedMessage = 'Failed to create menu item. Please try again.';
  static const String menuItemUpdateFailedMessage = 'Failed to update menu item. Please try again.';
  static const String menuItemDeleteFailedMessage = 'Failed to delete menu item. Please try again.';
  
  // Menu Success Messages
  static const String menuItemCreatedMessage = 'Menu item created successfully!';
  static const String menuItemUpdatedMessage = 'Menu item updated successfully!';
  static const String menuItemDeletedMessage = 'Menu item deleted successfully!';
  static const String menuItemAvailabilityToggledMessage = 'Menu item availability updated!';
}
