import 'logger.dart';

class QRValidationUtils {
  // QR token validation patterns
  static final RegExp _uuidV4WithHyphensPattern = RegExp(
    r'^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$',
    caseSensitive: false,
  );
  
  static final RegExp _uuidV4WithoutHyphensPattern = RegExp(
    r'^[0-9a-f]{8}[0-9a-f]{4}4[0-9a-f]{3}[89ab][0-9a-f]{3}[0-9a-f]{12}$',
    caseSensitive: false,
  );

  /// Validates QR token format (UUID v4 validation - flexible format)
  /// Returns true if the QR code is a valid UUID v4 format
  static bool isValidQRToken(String qrCode) {
    // Basic validation: QR token should be a non-empty string
    if (qrCode.isEmpty) return false;
    
    // Check if it's not just whitespace
    if (qrCode.trim().isEmpty) return false;
    
    // Clean the QR code (remove any whitespace)
    String cleanQrCode = qrCode.trim();
    
    // Check if it's a UUID with hyphens (standard format: 36 chars)
    bool isValidWithHyphens = _uuidV4WithHyphensPattern.hasMatch(cleanQrCode);
    
    // Check if it's a UUID without hyphens (32 chars) or with missing hyphens (36 chars)
    bool isValidWithoutHyphens = _uuidV4WithoutHyphensPattern.hasMatch(cleanQrCode);
    
    if (!isValidWithHyphens && !isValidWithoutHyphens) {
      Logger.qr('Invalid UUID v4 format: $cleanQrCode');
      Logger.qr('   - Length: ${cleanQrCode.length}');
      Logger.qr('   - Expected: 36 chars with hyphens or 32/36 chars without hyphens');
      return false;
    }
    
    Logger.success('Valid UUID v4 format: $cleanQrCode', 'QR VALIDATION');
    Logger.qr('   - Format: ${isValidWithHyphens ? "with hyphens (36 chars)" : "without hyphens (${cleanQrCode.length} chars)"}');
    return true;
  }

  /// Validates QR token format with detailed error information
  /// Returns a map with validation result and error details
  static Map<String, dynamic> validateQRTokenWithDetails(String qrCode) {
    final result = <String, dynamic>{
      'isValid': false,
      'error': null,
      'format': null,
    };

    // Basic validation: QR token should be a non-empty string
    if (qrCode.isEmpty) {
      result['error'] = 'QR code is empty';
      return result;
    }
    
    // Check if it's not just whitespace
    if (qrCode.trim().isEmpty) {
      result['error'] = 'QR code contains only whitespace';
      return result;
    }
    
    // Clean the QR code (remove any whitespace)
    String cleanQrCode = qrCode.trim();
    
    // Check if it's a UUID with hyphens (standard format: 36 chars)
    bool isValidWithHyphens = _uuidV4WithHyphensPattern.hasMatch(cleanQrCode);
    
    // Check if it's a UUID without hyphens (32 chars) or with missing hyphens (36 chars)
    bool isValidWithoutHyphens = _uuidV4WithoutHyphensPattern.hasMatch(cleanQrCode);
    
    if (isValidWithHyphens) {
      result['isValid'] = true;
      result['format'] = 'with hyphens (36 chars)';
    } else if (isValidWithoutHyphens) {
      result['isValid'] = true;
      result['format'] = 'without hyphens (${cleanQrCode.length} chars)';
    } else {
      result['error'] = 'Invalid UUID v4 format. Expected 36 chars with hyphens or 32/36 chars without hyphens';
    }
    
    return result;
  }

  /// Sanitizes QR code by removing whitespace and converting to lowercase
  static String sanitizeQRCode(String qrCode) {
    return qrCode.trim().toLowerCase();
  }

  /// Checks if QR code length is within expected range
  static bool isQRCodeLengthValid(String qrCode) {
    final length = qrCode.trim().length;
    return length == 32 || length == 36;
  }
}
