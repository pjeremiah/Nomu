import 'package:flutter/material.dart';
import 'api/api.dart';
import 'services/logging_service.dart';

class ForgotPasswordPage extends StatefulWidget {
  const ForgotPasswordPage({super.key});

  @override
  _ForgotPasswordPageState createState() => _ForgotPasswordPageState();
}

class _ForgotPasswordPageState extends State<ForgotPasswordPage> {
  final _emailController = TextEditingController();
  final _otpController = TextEditingController();
  final _newPasswordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  
  bool _isSendingOtp = false;
  bool _isVerifyingOtp = false;
  bool _isResettingPassword = false;
  bool _otpSent = false;
  bool _otpVerified = false;
  bool _showNewPassword = false;
  bool _showConfirmPassword = false;
  int _resendTimer = 0;
  
  String? _emailError;
  String? _otpError;
  String? _newPasswordError;
  String? _confirmPasswordError;

  @override
  void dispose() {
    _emailController.dispose();
    _otpController.dispose();
    _newPasswordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  bool _isValidEmail(String email) {
    final emailRegex = RegExp(r'^[^@]+@[^@]+\.[^@]+');
    return emailRegex.hasMatch(email);
  }

  bool _isValidPassword(String password) {
    final hasMinLength = password.length >= 8;
    final hasUpper = password.contains(RegExp(r'[A-Z]'));
    final hasLower = password.contains(RegExp(r'[a-z]'));
    final hasDigit = password.contains(RegExp(r'[0-9]'));
    final hasSpecial = password.contains(RegExp(r'[!@#\$%^&*(),.?\":{}|<>]'));
    return hasMinLength && hasUpper && hasLower && hasDigit && hasSpecial;
  }

  Future<void> _sendOTP() async {
    final email = _emailController.text.trim();
    
    LoggingService.instance.auth('Starting forgot password OTP request for email: $email');
    
    if (email.isEmpty || !_isValidEmail(email)) {
      LoggingService.instance.warning('Invalid email provided for forgot password', {
        'email': email,
        'isEmpty': email.isEmpty,
        'isValid': _isValidEmail(email),
      });
      setState(() {
        _emailError = email.isEmpty ? 'Email is required' : 'Enter a valid email';
      });
      return;
    }

    setState(() {
      _emailError = null;
      _isSendingOtp = true;
    });

    try {
      LoggingService.instance.auth('Sending forgot password OTP to: $email');
      final result = await ApiService.sendForgotPasswordOTP(email);
      
      if (result == null) {
        LoggingService.instance.auth('OTP sent successfully to: $email');
        if (mounted) {
          setState(() {
            _otpSent = true;
          });
          _startResendTimer();
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('OTP sent to your email!')),
          );
        }
      } else {
        LoggingService.instance.error('Failed to send OTP', {
          'email': email,
          'error': result,
        });
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Failed to send OTP: $result')),
          );
        }
      }
    } catch (e) {
      LoggingService.instance.error('Exception while sending OTP', e);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    } finally {
      setState(() {
        _isSendingOtp = false;
      });
    }
  }

  Future<void> _verifyOTP() async {
    final email = _emailController.text.trim();
    final otp = _otpController.text.trim();
    
    LoggingService.instance.auth('Starting OTP verification for email: $email');
    
    if (otp.isEmpty) {
      LoggingService.instance.warning('Empty OTP provided for verification');
      setState(() {
        _otpError = 'OTP is required';
      });
      return;
    }

    setState(() {
      _otpError = null;
      _isVerifyingOtp = true;
    });

    try {
      LoggingService.instance.auth('Verifying OTP for email: $email', {
        'otpLength': otp.length,
        'email': email,
      });
      final result = await ApiService.verifyForgotPasswordOTP(email, otp);
      
      if (result != null) {
        LoggingService.instance.auth('OTP verified successfully for email: $email');
        if (mounted) {
          setState(() {
            _otpVerified = true;
          });
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('OTP verified successfully!')),
          );
        }
      } else {
        LoggingService.instance.warning('OTP verification failed', {
          'email': email,
          'otpLength': otp.length,
        });
        if (mounted) {
          setState(() {
            _otpError = 'Invalid or expired OTP';
          });
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('OTP verification failed')),
          );
        }
      }
    } catch (e) {
      LoggingService.instance.error('Exception during OTP verification', e);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isVerifyingOtp = false;
        });
      }
    }
  }

  Future<void> _resetPassword() async {
    final email = _emailController.text.trim();
    final otp = _otpController.text.trim();
    final newPassword = _newPasswordController.text;
    final confirmPassword = _confirmPasswordController.text;

    LoggingService.instance.auth('Starting password reset process for email: $email');

    // Validate inputs
    if (newPassword.isEmpty) {
      LoggingService.instance.warning('Empty new password provided');
      setState(() {
        _newPasswordError = 'New password is required';
      });
      return;
    }

    if (!_isValidPassword(newPassword)) {
      LoggingService.instance.warning('Invalid password format', {
        'passwordLength': newPassword.length,
        'email': email,
      });
      setState(() {
        _newPasswordError = 'Use 8+ characters with upper, lower, number & special character';
      });
      return;
    }

    if (confirmPassword.isEmpty) {
      LoggingService.instance.warning('Empty confirm password provided');
      setState(() {
        _confirmPasswordError = 'Please confirm your password';
      });
      return;
    }

    if (newPassword != confirmPassword) {
      LoggingService.instance.warning('Password mismatch during reset', {
        'email': email,
        'passwordsMatch': newPassword == confirmPassword,
      });
      setState(() {
        _confirmPasswordError = 'Passwords do not match';
      });
      return;
    }

    setState(() {
      _newPasswordError = null;
      _confirmPasswordError = null;
      _isResettingPassword = true;
    });

    try {
      LoggingService.instance.auth('Resetting password for email: $email', {
        'otpLength': otp.length,
        'newPasswordLength': newPassword.length,
      });
      final result = await ApiService.resetPassword(email, otp, newPassword);
      
      if (result == null) {
        LoggingService.instance.auth('Password reset successfully for email: $email');
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Password reset successfully! You can now login with your new password.')),
          );
          Navigator.of(context).pop(); // Go back to login page
        }
      } else {
        LoggingService.instance.error('Password reset failed', {
          'email': email,
          'error': result,
        });
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Password reset failed: $result')),
          );
        }
      }
    } catch (e) {
      LoggingService.instance.error('Exception during password reset', e);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isResettingPassword = false;
        });
      }
    }
  }

  void _startResendTimer() {
    LoggingService.instance.auth('Starting OTP resend timer (60 seconds)');
    if (_resendTimer > 0) return; // Already running
    setState(() => _resendTimer = 60);
    void tick() {
      Future.delayed(const Duration(seconds: 1), () {
        if (!mounted) return;
        if (_resendTimer <= 1) {
          setState(() => _resendTimer = 0);
          LoggingService.instance.auth('OTP resend timer expired - user can resend OTP');
          return;
        }
        setState(() => _resendTimer--);
        tick();
      });
    }
    tick();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFEBECF0),
      appBar: AppBar(
        title: const Text('Forgot Password', style: TextStyle(color: Colors.white)),
        backgroundColor: Colors.transparent,
        elevation: 0,
        iconTheme: const IconThemeData(color: Colors.white),
        flexibleSpace: Container(
          decoration: const BoxDecoration(
            image: DecorationImage(
              image: AssetImage('assets/images/istetik.png'),
              fit: BoxFit.cover,
            ),
          ),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Header card - same background as My Loyalty Card
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(20),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.15),
                    blurRadius: 12,
                    offset: const Offset(0, 6),
                  ),
                ],
                image: const DecorationImage(
                  image: AssetImage('assets/images/istetik.png'),
                  fit: BoxFit.cover,
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: const Icon(Icons.lock_reset, color: Colors.white, size: 40),
                  ),
                  const SizedBox(height: 20),
                  const Text(
                    'Reset Your Password',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    _otpSent
                        ? 'We sent a 6-digit code to your email. Enter it below.'
                        : 'Enter your email to receive a verification code.',
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: 0.9),
                      fontSize: 15,
                      height: 1.35,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
            // Step 1: Email
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.06),
                    blurRadius: 12,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        width: 28,
                        height: 28,
                        decoration: const BoxDecoration(
                          color: Color(0xFF1B2A59),
                          shape: BoxShape.circle,
                        ),
                        alignment: Alignment.center,
                        child: const Text('1', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14)),
                      ),
                      const SizedBox(width: 12),
                      const Text(
                        'Email Address',
                        style: TextStyle(
                          fontSize: 17,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF1B2A59),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: _emailController,
                    readOnly: _otpSent,
                    decoration: InputDecoration(
                      hintText: 'Enter your email',
                      filled: true,
                      fillColor: const Color(0xFFF5F6F9),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide.none,
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide(color: Colors.grey.shade300),
                      ),
                      errorText: _emailError,
                      suffixIcon: _otpSent
                          ? const Icon(Icons.check_circle, color: Colors.green, size: 22)
                          : IconButton(
                              icon: _isSendingOtp
                                  ? const SizedBox(
                                      width: 22,
                                      height: 22,
                                      child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF1B2A59)),
                                    )
                                  : const Icon(Icons.send_rounded, color: Color(0xFF1B2A59)),
                              onPressed: _isSendingOtp ? null : _sendOTP,
                            ),
                    ),
                    keyboardType: TextInputType.emailAddress,
                  ),
                ],
              ),
            ),
            // Step 2: OTP (visible after OTP is sent)
            if (_otpSent) ...[
              const SizedBox(height: 20),
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.06),
                      blurRadius: 12,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          width: 28,
                          height: 28,
                          decoration: const BoxDecoration(
                            color: Color(0xFF1B2A59),
                            shape: BoxShape.circle,
                          ),
                          alignment: Alignment.center,
                          child: const Text('2', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14)),
                        ),
                        const SizedBox(width: 12),
                        const Text(
                          'Verification Code',
                          style: TextStyle(
                            fontSize: 17,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF1B2A59),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Enter the 6-digit code sent to ${_emailController.text.trim()}',
                      style: TextStyle(
                        fontSize: 13,
                        color: Colors.grey.shade600,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      controller: _otpController,
                      decoration: InputDecoration(
                        hintText: '000000',
                        filled: true,
                        fillColor: const Color(0xFFF5F6F9),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide.none,
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide(color: Colors.grey.shade300),
                        ),
                        errorText: _otpError,
                        counterText: '',
                      ),
                      keyboardType: TextInputType.number,
                      maxLength: 6,
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontSize: 24,
                        letterSpacing: 8,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 16),
                    SizedBox(
                      width: double.infinity,
                      child: OutlinedButton.icon(
                        onPressed: _isVerifyingOtp ? null : _verifyOTP,
                        icon: _isVerifyingOtp
                            ? const SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF1B2A59)),
                                ),
                              )
                            : const Icon(Icons.verified_user_rounded, size: 20),
                        label: Text(_isVerifyingOtp ? 'Verifying...' : 'Verify Code'),
                        style: OutlinedButton.styleFrom(
                          backgroundColor: Colors.white,
                          foregroundColor: const Color(0xFF1B2A59),
                          side: const BorderSide(color: Color(0xFF1B2A59), width: 2),
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        if (_otpVerified)
                          const Row(
                            children: [
                              Icon(Icons.check_circle, color: Colors.green, size: 18),
                              SizedBox(width: 6),
                              Text('Code verified!', style: TextStyle(color: Colors.green, fontWeight: FontWeight.w500)),
                            ],
                          )
                        else
                          TextButton.icon(
                            onPressed: _resendTimer > 0 ? null : _sendOTP,
                            icon: Icon(
                              Icons.refresh_rounded,
                              size: 18,
                              color: _resendTimer > 0 ? Colors.grey : const Color(0xFF1B2A59),
                            ),
                            label: Text(
                              _resendTimer > 0 ? 'Resend code in ${_resendTimer}s' : 'Resend code',
                              style: TextStyle(
                                color: _resendTimer > 0 ? Colors.grey : const Color(0xFF1B2A59),
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
            
            if (_otpVerified) ...[
              const SizedBox(height: 20),
              // Step 3: New Password
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.06),
                      blurRadius: 12,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          width: 28,
                          height: 28,
                          decoration: const BoxDecoration(
                            color: Color(0xFF1B2A59),
                            shape: BoxShape.circle,
                          ),
                          alignment: Alignment.center,
                          child: const Text('3', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14)),
                        ),
                        const SizedBox(width: 12),
                        const Text(
                          'New Password',
                          style: TextStyle(
                            fontSize: 17,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF1B2A59),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      controller: _newPasswordController,
                      obscureText: !_showNewPassword,
                      decoration: InputDecoration(
                        hintText: 'Enter new password',
                        filled: true,
                        fillColor: const Color(0xFFF5F6F9),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide.none,
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide(color: Colors.grey.shade300),
                        ),
                        errorText: _newPasswordError,
                        suffixIcon: IconButton(
                          icon: Icon(_showNewPassword ? Icons.visibility_rounded : Icons.visibility_off_rounded),
                          onPressed: () => setState(() => _showNewPassword = !_showNewPassword),
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      controller: _confirmPasswordController,
                      obscureText: !_showConfirmPassword,
                      decoration: InputDecoration(
                        hintText: 'Confirm new password',
                        filled: true,
                        fillColor: const Color(0xFFF5F6F9),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide.none,
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide(color: Colors.grey.shade300),
                        ),
                        errorText: _confirmPasswordError,
                        suffixIcon: IconButton(
                          icon: Icon(_showConfirmPassword ? Icons.visibility_rounded : Icons.visibility_off_rounded),
                          onPressed: () => setState(() => _showConfirmPassword = !_showConfirmPassword),
                        ),
                      ),
                    ),
                    const SizedBox(height: 20),
                    SizedBox(
                      width: double.infinity,
                      child: OutlinedButton.icon(
                        onPressed: _isResettingPassword ? null : _resetPassword,
                        icon: _isResettingPassword
                            ? const SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF1B2A59)),
                                ),
                              )
                            : const Icon(Icons.lock_reset_rounded, size: 20),
                        label: Text(_isResettingPassword ? 'Resetting...' : 'Reset Password'),
                        style: OutlinedButton.styleFrom(
                          backgroundColor: Colors.white,
                          foregroundColor: const Color(0xFF1B2A59),
                          side: const BorderSide(color: Color(0xFF1B2A59), width: 2),
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
