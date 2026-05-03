import 'dart:async';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'api/api.dart';
import 'barista.dart';
import 'constants/app_constants.dart';
import 'utils/logger.dart';

/// Same navy accent and primary CTA treatment as [LoginPage] (barista sign-in).
const Color _nomuNavy = Color(0xFF212c59);

class OTPVerificationPage extends StatefulWidget {
  final String email;
  final String name;

  const OTPVerificationPage({
    super.key,
    required this.email,
    required this.name,
  });

  @override
  State<OTPVerificationPage> createState() => _OTPVerificationPageState();
}

class _OTPVerificationPageState extends State<OTPVerificationPage> {
  final _otpController = TextEditingController();
  bool _isLoading = false;
  bool _isResending = false;
  int _resendCooldown = 0;
  String? _errorMessage;
  Timer? _cooldownTimer;
  bool _rememberMe = false;

  @override
  void initState() {
    super.initState();
    _startResendCooldown();
  }

  void _startResendCooldown() {
    setState(() {
      _resendCooldown = AppConstants.resendCooldown.inSeconds;
    });
    
    _cooldownTimer?.cancel();
    _cooldownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (mounted) {
        setState(() {
          _resendCooldown--;
        });
        if (_resendCooldown <= 0) {
          timer.cancel();
        }
      } else {
        timer.cancel();
      }
    });
  }

  Future<void> _verifyOTP() async {
    // Validate OTP format
    final otpText = _otpController.text.trim();
    if (otpText.isEmpty) {
      setState(() {
        _errorMessage = 'Please enter the verification code';
      });
      return;
    }
    
    if (otpText.length != AppConstants.qrCodeLength) {
      setState(() {
        _errorMessage = 'Please enter a valid ${AppConstants.qrCodeLength}-digit code';
      });
      return;
    }
    
    // Check if OTP contains only numbers
    if (!RegExp('^\\d{${AppConstants.qrCodeLength}}\$').hasMatch(otpText)) {
      setState(() {
        _errorMessage = 'Please enter only numbers in the verification code';
      });
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      Logger.auth('Verifying mobile admin OTP for: ${widget.email}');
      Logger.debug('OTP being verified: $otpText', 'OTP');
      Logger.debug('Email being verified: ${widget.email}', 'OTP');
      
      final verifyResult = await ApiService.verifyMobileAdminOTP(
        widget.email,
        otpText,
        rememberFor1Day: _rememberMe,
      );
      final user = verifyResult?.user;

      Logger.debug('API response user object: $user', 'OTP');
      Logger.debug('User is null: ${user == null}', 'OTP');
      
      if (user != null) {
        Logger.success('OTP verification successful for: ${user.email}', 'OTP');
        Logger.debug('User details - ID: ${user.id}, Name: ${user.name}, Email: ${user.email}, Type: ${user.userType}, Role: ${user.role}', 'OTP');
        
        // Validate user data before saving
        if (user.email.isEmpty || user.name.isEmpty || user.id.isEmpty) {
          Logger.error('Invalid user data received - missing required fields', 'OTP');
          setState(() {
            _errorMessage = 'Invalid user data received. Please try again.';
          });
          return;
        }
        
        // Save user credentials
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('user_email', user.email);
        await prefs.setString('user_name', user.name);
        await prefs.setString('user_id', user.id);
        await prefs.setString(
          'user_type',
          user.userType.isNotEmpty ? user.userType : 'admin',
        );
        await prefs.setBool('is_logged_in', true);
        
        // Align with web admin: server stores Admin.rememberUntil; client mirrors for offline UX.
        try {
          if (_rememberMe) {
            final untilIso = verifyResult?.rememberUntilIso ??
                DateTime.now()
                    .add(const Duration(hours: 24))
                    .toIso8601String();
            await prefs.setBool('remember_me', true);
            await prefs.setString('remember_until', untilIso);
            Logger.debug('Remember account 24h enabled until: $untilIso', 'OTP');
          } else {
            await prefs.setBool('remember_me', false);
            await prefs.remove('remember_until');
            Logger.debug('Remember account 24h disabled', 'OTP');
          }
        } catch (e) {
          Logger.exception('Error saving remember me data', e, 'OTP');
          // Continue with navigation even if remember me fails
        }
        
        Logger.debug('User credentials saved to SharedPreferences', 'OTP');
        
        // Navigate to barista scanner
        if (mounted) {
          Navigator.pushReplacement(
            context,
            MaterialPageRoute(
              builder: (context) => const BaristaScannerPage(),
            ),
          );
        }
      } else {
        Logger.error('OTP verification returned null user', 'OTP');
        setState(() {
          _errorMessage = 'Invalid verification code. Please try again.';
        });
      }
    } catch (e) {
      Logger.exception('OTP verification error', e, 'OTP');
      Logger.error('Exception details: ${e.toString()}', 'OTP');
      setState(() {
        if (e.toString().contains('SocketException') || e.toString().contains('TimeoutException')) {
          _errorMessage = AppConstants.networkErrorMessage;
        } else if (e.toString().contains('FormatException')) {
          _errorMessage = AppConstants.serverErrorMessage;
        } else {
          _errorMessage = 'Verification failed. Please try again.';
        }
      });
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _resendOTP() async {
    if (_resendCooldown > 0) return;

    setState(() {
      _isResending = true;
      _errorMessage = null;
    });

    try {
      Logger.auth('Resending mobile admin OTP for: ${widget.email}');
      final result = await ApiService.sendMobileAdminOTP(widget.email);
      
      if (result != null) {
        Logger.success('OTP resent successfully', 'OTP');
        _startResendCooldown();
        
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: const Text('Verification code sent to your email'),
              backgroundColor: Colors.green.shade800,
              behavior: SnackBarBehavior.floating,
            ),
          );
        }
      } else {
        setState(() {
          _errorMessage = 'Failed to resend code. Please try again.';
        });
      }
    } catch (e) {
      Logger.exception('Resend OTP error', e, 'OTP');
      setState(() {
        if (e.toString().contains('SocketException') || e.toString().contains('TimeoutException')) {
          _errorMessage = AppConstants.networkErrorMessage;
        } else if (e.toString().contains('FormatException')) {
          _errorMessage = AppConstants.serverErrorMessage;
        } else {
          _errorMessage = 'Failed to resend code. Please try again.';
        }
      });
    } finally {
      if (mounted) {
        setState(() {
          _isResending = false;
        });
      }
    }
  }

  /// Matches [LoginPage._buildLoginButton]: `istetik` image fill, white label, pill shape.
  Widget _buildVerifyButton() {
    return Container(
      height: 60,
      width: double.infinity,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(30),
        image: const DecorationImage(
          image: AssetImage('assets/images/istetik.png'),
          fit: BoxFit.cover,
        ),
      ),
      child: ElevatedButton(
        onPressed: _isLoading ? null : _verifyOTP,
        style: ElevatedButton.styleFrom(
          backgroundColor: Colors.transparent,
          shadowColor: Colors.transparent,
          disabledBackgroundColor: Colors.transparent,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
        ),
        child: _isLoading
            ? Row(
                mainAxisAlignment: MainAxisAlignment.center,
                mainAxisSize: MainAxisSize.min,
                children: [
                  const SizedBox(
                    width: 24,
                    height: 24,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Text(
                    'Verifying...',
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: 0.95),
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              )
            : Text(
                AppConstants.verifyCodeButton.toUpperCase(),
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FC),
      resizeToAvoidBottomInset: true,
      body: SafeArea(
        child: SingleChildScrollView(
          physics: const BouncingScrollPhysics(),
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 16),
              Center(
                child: Image.asset(
                  'assets/images/nomutrans.png',
                  height: 40,
                  fit: BoxFit.contain,
                ),
              ),
              const SizedBox(height: 32),
              
              // Header
              Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 80,
                    height: 80,
                    decoration: BoxDecoration(
                      color: _nomuNavy.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(40),
                    ),
                    child: const Icon(
                      Icons.email_outlined,
                      size: 40,
                      color: _nomuNavy,
                    ),
                  ),
                  const SizedBox(height: 24),
                  Text(
                    AppConstants.checkYourEmailTitle,
                    style: TextStyle(
                      fontSize: 28,
                      fontWeight: FontWeight.bold,
                      color: Colors.grey.shade900,
                      fontFamily: 'Montserrat',
                      letterSpacing: -0.5,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 12),
                  Text(
                    AppConstants.verificationCodeMessage,
                    style: TextStyle(
                      fontSize: 16,
                      color: Colors.grey.shade600,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    widget.email,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      color: _nomuNavy,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
              
              const SizedBox(height: 40),
              
              // OTP Input
              TextField(
                controller: _otpController,
                keyboardType: TextInputType.number,
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 8,
                  color: Colors.grey.shade900,
                ),
                maxLength: AppConstants.qrCodeLength,
                decoration: InputDecoration(
                  hintText: '000000',
                  hintStyle: TextStyle(
                    color: Colors.grey.shade400,
                    letterSpacing: 8,
                  ),
                  counterText: '',
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide(color: Colors.grey.shade300),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide(color: Colors.grey.shade300),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: _nomuNavy, width: 2),
                  ),
                  filled: true,
                  fillColor: Colors.white,
                ),
                onChanged: (value) {
                  if (value.length == AppConstants.qrCodeLength) {
                    _verifyOTP();
                  }
                },
              ),
              
              const SizedBox(height: 20),
              
              // Remember this account (24h) — matches web admin + server rememberUntil
              GestureDetector(
                behavior: HitTestBehavior.opaque,
                onTap: () => setState(() => _rememberMe = !_rememberMe),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Checkbox(
                      value: _rememberMe,
                      onChanged: (value) {
                        setState(() {
                          _rememberMe = value ?? false;
                        });
                      },
                      materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                      checkColor: Colors.white,
                      fillColor: WidgetStateProperty.resolveWith((states) {
                        if (states.contains(WidgetState.selected)) {
                          return _nomuNavy;
                        }
                        return null;
                      }),
                    ),
                    Expanded(
                      child: Padding(
                        padding: const EdgeInsets.only(top: 12),
                        child: Text(
                          AppConstants.rememberAccount24HoursLabel,
                          style: TextStyle(
                            fontSize: 14,
                            height: 1.35,
                            color: Colors.grey.shade800,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              
              const SizedBox(height: 20),
              
              // Error Message
              if (_errorMessage != null)
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.red.shade50,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.red.shade200),
                  ),
                  child: Text(
                    _errorMessage!,
                    style: TextStyle(
                      color: Colors.red.shade700,
                      fontSize: 14,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ),
              
              const SizedBox(height: 20),
              
              // Verify Button (same visual as login CTA)
              _buildVerifyButton(),
              
              const SizedBox(height: 20),
              
              // Resend Code
              Row(
                mainAxisSize: MainAxisSize.min,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    AppConstants.didntReceiveCodeMessage,
                    style: TextStyle(
                      color: Colors.grey.shade600,
                      fontSize: 14,
                    ),
                  ),
                  TextButton(
                    onPressed: _resendCooldown > 0 || _isResending ? null : _resendOTP,
                    child: _isResending
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: _nomuNavy,
                            ),
                          )
                        : Text(
                            _resendCooldown > 0 
                                ? 'Resend in ${_resendCooldown}s'
                                : AppConstants.resendCodeButton,
                            style: TextStyle(
                              color: _resendCooldown > 0
                                  ? Colors.grey.shade400
                                  : _nomuNavy,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                  ),
                ],
              ),
              
              const SizedBox(height: 40),
              
              // Back to Login
              TextButton(
                onPressed: () {
                  Navigator.pop(context);
                },
                child: Text(
                  AppConstants.backToLoginButton,
                  style: TextStyle(
                    color: Colors.grey.shade600,
                    fontSize: 14,
                  ),
                ),
              ),
              const SizedBox(height: 40), // Extra space for keyboard
            ],
          ),
        ),
      ),
    );
  }

  @override
  void dispose() {
    _cooldownTimer?.cancel();
    _otpController.dispose();
    super.dispose();
  }
}
