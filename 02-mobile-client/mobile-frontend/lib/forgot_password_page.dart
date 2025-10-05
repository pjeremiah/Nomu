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
    return password.length >= 6;
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
        _newPasswordError = 'Password must be at least 6 characters';
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
    setState(() => _resendTimer = 60);
    Future.delayed(const Duration(seconds: 1), () {
      if (_resendTimer > 0) {
        setState(() => _resendTimer--);
        _startResendTimer();
      } else {
        LoggingService.instance.auth('OTP resend timer expired - user can resend OTP');
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFEBECF0),
      appBar: AppBar(
        title: const Text('Forgot Password', style: TextStyle(color: Colors.white)),
        backgroundColor: const Color(0xFF1B2A59),
        elevation: 3,
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: const Color(0xFF1B2A59),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(
                    Icons.lock_reset,
                    color: Colors.white,
                    size: 48,
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    'Reset Your Password',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Enter your email to receive an OTP and reset your password.',
                    style: TextStyle(
                      color: Colors.white70,
                      fontSize: 16,
                    ),
                  ),
                ],
              ),
            ),
            
            const SizedBox(height: 24),
            
            // Email Input
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.1),
                    blurRadius: 10,
                    offset: const Offset(0, 5),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Email Address',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF1B2A59),
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _emailController,
                    decoration: InputDecoration(
                      labelText: 'Enter your email',
                      border: const OutlineInputBorder(),
                      errorText: _emailError,
                      suffixIcon: IconButton(
                        icon: Icon(_isSendingOtp ? Icons.hourglass_empty : Icons.send),
                        onPressed: _otpSent ? null : _sendOTP,
                      ),
                    ),
                    keyboardType: TextInputType.emailAddress,
                  ),
                  if (_otpSent) ...[
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: _otpController,
                            decoration: InputDecoration(
                              labelText: 'Enter OTP',
                              border: const OutlineInputBorder(),
                              errorText: _otpError,
                              hintText: '6-digit code',
                            ),
                            keyboardType: TextInputType.number,
                            maxLength: 6,
                          ),
                        ),
                        const SizedBox(width: 12),
                        ElevatedButton(
                          onPressed: _isVerifyingOtp ? null : _verifyOTP,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF1B2A59),
                            foregroundColor: Colors.white,
                          ),
                          child: _isVerifyingOtp
                              ? const SizedBox(
                                  width: 20,
                                  height: 20,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                                  ),
                                )
                              : const Text('Verify'),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        TextButton(
                          onPressed: _resendTimer > 0 ? null : _sendOTP,
                          child: Text(
                            _resendTimer > 0 
                              ? 'Resend in ${_resendTimer}s' 
                              : 'Resend OTP',
                          ),
                        ),
                        if (_otpVerified)
                          const Row(
                            children: [
                              Icon(Icons.check_circle, color: Colors.green, size: 16),
                              SizedBox(width: 8),
                              Text('OTP verified!', style: TextStyle(color: Colors.green)),
                            ],
                          ),
                      ],
                    ),
                  ],
                ],
              ),
            ),
            
            if (_otpVerified) ...[
              const SizedBox(height: 24),
              
              // New Password Input
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.1),
                      blurRadius: 10,
                      offset: const Offset(0, 5),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'New Password',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF1B2A59),
                      ),
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      controller: _newPasswordController,
                      obscureText: !_showNewPassword,
                      decoration: InputDecoration(
                        labelText: 'Enter new password',
                        border: const OutlineInputBorder(),
                        errorText: _newPasswordError,
                        suffixIcon: IconButton(
                          icon: Icon(_showNewPassword ? Icons.visibility : Icons.visibility_off),
                          onPressed: () {
                            setState(() {
                              _showNewPassword = !_showNewPassword;
                            });
                          },
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      controller: _confirmPasswordController,
                      obscureText: !_showConfirmPassword,
                      decoration: InputDecoration(
                        labelText: 'Confirm new password',
                        border: const OutlineInputBorder(),
                        errorText: _confirmPasswordError,
                        suffixIcon: IconButton(
                          icon: Icon(_showConfirmPassword ? Icons.visibility : Icons.visibility_off),
                          onPressed: () {
                            setState(() {
                              _showConfirmPassword = !_showConfirmPassword;
                            });
                          },
                        ),
                      ),
                    ),
                    const SizedBox(height: 20),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: _isResettingPassword ? null : _resetPassword,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF1B2A59),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        child: _isResettingPassword
                            ? const SizedBox(
                                height: 20,
                                width: 20,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: Colors.white,
                                ),
                              )
                            : const Text(
                                'Reset Password',
                                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
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
