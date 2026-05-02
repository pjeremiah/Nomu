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

  /// Loyalty QR from the customer app encodes [User.qrToken], which the mobile API
  /// generates as a JWT (`jwt.sign`), not a UUID. Accept standard JWS shape (3 base64url segments).
  static final RegExp _loyaltyJwtShapePattern = RegExp(
    r'^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$',
  );

  static bool _isValidLoyaltyJwtShape(String s) {
    if (!_loyaltyJwtShapePattern.hasMatch(s)) return false;
    // Reject pathological short strings that happen to contain two dots
    if (s.length < 36) return false;
    return true;
  }

  /// Validates QR payload: UUID v4 (legacy) or JWT loyalty token (customer mobile app).
  static bool isValidQRToken(String qrCode) {
    if (qrCode.isEmpty) return false;
    if (qrCode.trim().isEmpty) return false;

    final String cleanQrCode = qrCode.trim();

    final bool uuidWithHyphens = _uuidV4WithHyphensPattern.hasMatch(cleanQrCode);
    final bool uuidWithoutHyphens = _uuidV4WithoutHyphensPattern.hasMatch(cleanQrCode);
    if (uuidWithHyphens || uuidWithoutHyphens) {
      Logger.success('Valid UUID v4 loyalty token', 'QR VALIDATION');
      Logger.qr(
        '   - Format: ${uuidWithHyphens ? "with hyphens (36 chars)" : "compact (${cleanQrCode.length} chars)"}',
      );
      return true;
    }

    if (_isValidLoyaltyJwtShape(cleanQrCode)) {
      Logger.success('Valid JWT-shaped loyalty QR (customer app)', 'QR VALIDATION');
      Logger.qr('   - Length: ${cleanQrCode.length}');
      return true;
    }

    Logger.qr('Invalid loyalty QR format: $cleanQrCode');
    Logger.qr('   - Length: ${cleanQrCode.length}');
    Logger.qr('   - Expected: UUID v4, or JWT (three base64url segments)');
    return false;
  }

  /// Validates QR token format with detailed error information
  /// Returns a map with validation result and error details
  static Map<String, dynamic> validateQRTokenWithDetails(String qrCode) {
    final result = <String, dynamic>{
      'isValid': false,
      'error': null,
      'format': null,
    };

    if (qrCode.isEmpty) {
      result['error'] = 'QR code is empty';
      return result;
    }

    if (qrCode.trim().isEmpty) {
      result['error'] = 'QR code contains only whitespace';
      return result;
    }

    final String cleanQrCode = qrCode.trim();

    final bool isValidWithHyphens = _uuidV4WithHyphensPattern.hasMatch(cleanQrCode);
    final bool isValidWithoutHyphens = _uuidV4WithoutHyphensPattern.hasMatch(cleanQrCode);

    if (isValidWithHyphens) {
      result['isValid'] = true;
      result['format'] = 'UUID v4 with hyphens';
    } else if (isValidWithoutHyphens) {
      result['isValid'] = true;
      result['format'] = 'UUID v4 compact';
    } else if (_isValidLoyaltyJwtShape(cleanQrCode)) {
      result['isValid'] = true;
      result['format'] = 'JWT loyalty token';
    } else {
      result['error'] =
          'Invalid format. Expected UUID v4 or JWT loyalty token (customer app QR).';
    }

    return result;
  }

  /// Sanitizes QR code by removing whitespace and converting to lowercase
  static String sanitizeQRCode(String qrCode) {
    return qrCode.trim().toLowerCase();
  }

  /// Checks if QR code length is within expected range (UUID or typical JWT)
  static bool isQRCodeLengthValid(String qrCode) {
    final length = qrCode.trim().length;
    if (length == 32 || length == 36) return true;
    return length >= 36 && _isValidLoyaltyJwtShape(qrCode.trim());
  }
}
