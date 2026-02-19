import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

/// Nomu Cafe design system: primary, accent, neutrals, typography, and touch targets.
class AppTheme {
  AppTheme._();

  // Primary – dark blue (brand)
  static const Color primary = Color(0xFF212C59);
  static const Color primaryLight = Color(0xFF3A4A8C);
  static const Color primaryDark = Color(0xFF1B2447);

  // Accent – gold/amber for rewards and key CTAs
  static const Color accent = Color(0xFFD4A84B);
  static const Color accentLight = Color(0xFFE8C97A);
  static const Color accentDark = Color(0xFFB8923D);

  // Neutrals
  static const Color neutral0 = Color(0xFFFFFFFF);
  static const Color neutral50 = Color(0xFFF8F9FA);
  static const Color neutral100 = Color(0xFFE9ECEF);
  static const Color neutral200 = Color(0xFFDEE2E6);
  static const Color neutral300 = Color(0xFFADB5BD);
  static const Color neutral400 = Color(0xFF6C757D);
  static const Color neutral500 = Color(0xFF495057);
  static const Color neutral600 = Color(0xFF495057);
  static const Color neutral700 = Color(0xFF343A40);
  static const Color neutral800 = Color(0xFF212529);
  static const Color neutral900 = Color(0xFF0D0D0D);

  // Semantic
  static const Color success = Color(0xFF2E7D32);
  static const Color successLight = Color(0xFFE6F4E6);
  static const Color warning = Color(0xFFF57C00);
  static const Color warningLight = Color(0xFFFFF3E0);
  static const Color error = Color(0xFFC62828);
  static const Color errorLight = Color(0xFFFFEBEE);

  // Minimum touch target (accessibility)
  static const double minTouchTarget = 44.0;

  /// Text theme – title / subtitle / body / caption with Montserrat.
  static TextTheme get textTheme {
    return TextTheme(
      displayLarge: TextStyle(
        fontSize: 28,
        fontWeight: FontWeight.w700,
        color: neutral900,
        letterSpacing: -0.5,
      ),
      displayMedium: TextStyle(
        fontSize: 24,
        fontWeight: FontWeight.w700,
        color: neutral900,
      ),
      headlineLarge: TextStyle(
        fontSize: 22,
        fontWeight: FontWeight.w600,
        color: neutral900,
      ),
      headlineMedium: TextStyle(
        fontSize: 20,
        fontWeight: FontWeight.w600,
        color: neutral800,
      ),
      headlineSmall: TextStyle(
        fontSize: 18,
        fontWeight: FontWeight.w600,
        color: neutral800,
      ),
      titleLarge: TextStyle(
        fontSize: 17,
        fontWeight: FontWeight.w600,
        color: neutral800,
      ),
      titleMedium: TextStyle(
        fontSize: 16,
        fontWeight: FontWeight.w500,
        color: neutral700,
      ),
      titleSmall: TextStyle(
        fontSize: 15,
        fontWeight: FontWeight.w500,
        color: neutral700,
      ),
      bodyLarge: TextStyle(
        fontSize: 16,
        fontWeight: FontWeight.normal,
        color: neutral700,
      ),
      bodyMedium: TextStyle(
        fontSize: 14,
        fontWeight: FontWeight.normal,
        color: neutral500,
      ),
      bodySmall: TextStyle(
        fontSize: 12,
        fontWeight: FontWeight.normal,
        color: neutral400,
      ),
      labelLarge: TextStyle(
        fontSize: 14,
        fontWeight: FontWeight.w600,
        color: neutral800,
      ),
      labelMedium: TextStyle(
        fontSize: 12,
        fontWeight: FontWeight.w500,
        color: neutral500,
      ),
      labelSmall: TextStyle(
        fontSize: 11,
        fontWeight: FontWeight.w500,
        color: neutral400,
      ),
    );
  }

  /// App-wide theme data.
  static ThemeData get themeData {
    return ThemeData(
      useMaterial3: true,
      colorScheme: ColorScheme.fromSeed(
        seedColor: primary,
        primary: primary,
        secondary: accent,
        surface: neutral50,
        error: error,
        onPrimary: neutral0,
        onSecondary: neutral900,
        onSurface: neutral800,
        onError: neutral0,
      ),
      textTheme: textTheme,
      fontFamily: 'Montserrat',
      appBarTheme: AppBarTheme(
        backgroundColor: primary,
        foregroundColor: neutral0,
        elevation: 0,
        centerTitle: true,
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          minimumSize: const Size(double.infinity, minTouchTarget),
          backgroundColor: primary,
          foregroundColor: neutral0,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          minimumSize: const Size(double.infinity, minTouchTarget),
          foregroundColor: primary,
          side: const BorderSide(color: primary),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: neutral50,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      ),
      cardTheme: CardThemeData(
        color: neutral0,
        elevation: 2,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      ),
    );
  }
}

/// Haptic feedback helpers for key actions.
class AppHaptics {
  static void light() => HapticFeedback.lightImpact();
  static void medium() => HapticFeedback.mediumImpact();
  static void selection() => HapticFeedback.selectionClick();
  static void success() => HapticFeedback.heavyImpact(); // reward / OTP success
}
