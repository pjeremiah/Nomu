import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'dart:async';
import 'package:shared_preferences/shared_preferences.dart';
import 'usermodel.dart';
import 'api/api.dart';
import 'homepage.dart';
import 'services/logging_service.dart';
import 'theme/app_theme.dart';



class SignupPage extends StatefulWidget {
  const SignupPage({super.key});

  @override
  _SignupPageState createState() => _SignupPageState();
}

class _SignupPageState extends State<SignupPage> with TickerProviderStateMixin {
  final _fullnameController = TextEditingController();
  final _usernameController = TextEditingController();
  final _emailController = TextEditingController();
  final _birthdayController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  final _otpController = TextEditingController();

  String? _selectedGender;
  bool _acceptedTerms = false;
  bool _isLoading = false;
  bool _showPassword = false;
  bool _showConfirmPassword = false;
  bool _otpSent = false;
  bool _otpVerified = false;
  bool _isSendingOtp = false;
  bool _isVerifyingOtp = false;
  int _resendTimer = 0;
  Timer? _resendTimerTimer;

  // Animation controllers
  late AnimationController _fadeController;
  late Animation<double> _fadeInAnimation;

  String? _fullnameError;
  String? _usernameError;
  String? _emailError;
  String? _birthdayError;
  String? _genderError;
  String? _passwordError;
  String? _confirmPasswordError;
  String? _termsError;
  String? _otpError;

  UserModel? _loggedInUser; // Added for auto-login

  @override
  void initState() {
    super.initState();
    _fadeController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1000),
    );
    
    _fadeInAnimation = Tween<double>(begin: 0, end: 1).animate(
      CurvedAnimation(parent: _fadeController, curve: Curves.easeIn),
    );

    _fadeController.forward();
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
    final fullname = _fullnameController.text.trim();
    
    if (email.isEmpty || !_isValidEmail(email)) {
      setState(() {
        _emailError = email.isEmpty ? 'Email is required' : 'Enter a valid email';
      });
      return;
    }

    if (fullname.isEmpty) {
      setState(() {
        _fullnameError = 'Full name is required';
      });
      return;
    }

    setState(() => _isSendingOtp = true);
    
    try {
      final result = await ApiService.sendOTP(email, fullname);
      setState(() => _isSendingOtp = false);
      
      if (result['error'] == null) {
        if (mounted) {
          AppHaptics.light();
          setState(() => _otpSent = true);
          _startResendTimer();
          final devOtp = result['devOtp']?.toString();
          if (devOtp != null && devOtp.isNotEmpty) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('OTP (use this if email not received): $devOtp'),
                duration: const Duration(seconds: 30),
              ),
            );
          } else {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('OTP sent to your email!')),
            );
          }
        }
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Failed to send OTP: ${result['error']}')),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isSendingOtp = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    }
  }

  Future<void> _verifyOTP() async {
    final email = _emailController.text.trim();
    final otp = _otpController.text.trim();
    
    if (otp.isEmpty) {
      setState(() => _otpError = 'OTP is required');
      return;
    }

    setState(() => _isVerifyingOtp = true);
    
    try {
      String? error = await ApiService.verifyOTP(email, otp);
      setState(() => _isVerifyingOtp = false);
      
      if (error == null) {
        if (mounted) {
          setState(() => _otpVerified = true);
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('OTP verified successfully!')),
          );
        }
      } else {
        if (mounted) {
          setState(() => _otpError = error);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('OTP verification failed: $error')),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isVerifyingOtp = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    }
  }

  Future<void> _registerUser() async {
    if (_isLoading) return;

    // Check if OTP is verified
    if (!_otpVerified) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Please verify your email with OTP first')),
        );
      }
      return;
    }

    final fullname = _fullnameController.text.trim();
    final username = _usernameController.text.trim();
    final email = _emailController.text.trim();
    final birthday = _birthdayController.text.trim();
    final gender = _selectedGender;
    final password = _passwordController.text;
    final confirmPassword = _confirmPasswordController.text;

    setState(() {
      _fullnameError = fullname.isEmpty ? 'Full name is required' : null;
      _usernameError = username.isEmpty ? 'Username is required' : null;
      _emailError = email.isEmpty
          ? 'Email is required'
          : !_isValidEmail(email)
              ? 'Enter a valid email'
              : null;
      _birthdayError = birthday.isEmpty ? 'Birthday is required' : null;
      _genderError = gender == null ? 'Please select gender' : null;
      _passwordError = password.isEmpty
          ? 'Password is required'
          : !_isValidPassword(password)
              ? 'At least 8 characters, 1 uppercase & 1 special character'
              : null;
      _confirmPasswordError = confirmPassword.isEmpty
          ? 'Please confirm your password'
          : confirmPassword != password
              ? 'Passwords do not match'
              : null;
      _termsError = !_acceptedTerms ? 'You must accept the terms' : null;
    });

    if (_fullnameError == null &&
        _usernameError == null &&
        _emailError == null &&
        _birthdayError == null &&
        _genderError == null &&
        _passwordError == null &&
        _confirmPasswordError == null &&
        _termsError == null) {
      try {
        setState(() => _isLoading = true);
        
        UserModel user = UserModel(
          fullName: fullname,
          username: username,
          email: email,
          birthday: birthday,
          gender: gender!,
          employmentStatus: 'Prefer not to say',
          role: 'Customer',
        );
        
        LoggingService.instance.auth('User model created for signup', {
          'fullName': user.fullName,
          'username': user.username,
          'email': user.email,
          'birthday': user.birthday,
          'gender': user.gender,
          'employmentStatus': user.employmentStatus,
          'role': user.role,
          'password': '[HIDDEN]',
        });
        
        String? error = await ApiService.signUp(user, password);
        setState(() => _isLoading = false);
        
        if (error == null) {
          // Auto-login after successful registration
          try {
            final loginResult = await ApiService.login(email, password);
            if (loginResult != null) {
              final loggedInUser = loginResult['user'] as UserModel;
              final token = loginResult['token'] as String?;
              // Store user data in SharedPreferences
              final prefs = await SharedPreferences.getInstance();
              await prefs.setString('user_id', loggedInUser.id);
              await prefs.setString('username', loggedInUser.username);
              await prefs.setString('email', loggedInUser.email);
              await prefs.setString('fullName', loggedInUser.fullName);
              await prefs.setString('user_role', loggedInUser.role);
              await prefs.setString('profilePicture', loggedInUser.profilePicture);
              await prefs.setString('qr_token', loggedInUser.qrToken);
              await prefs.setInt('points', loggedInUser.points);
              await prefs.setInt('review_points', loggedInUser.reviewPoints);
              await prefs.setBool('isLoggedIn', true);
              
              // Store JWT token for admin functionality
              if (token != null) {
                await prefs.setString('jwt_token', token);
                LoggingService.instance.auth('JWT token stored for admin functionality');
              }
              
              // Store the logged-in user for navigation
              _loggedInUser = loggedInUser;
              
              _showSuccessDialog();
            } else {
              showDialog(
                context: context,
                builder: (_) => AlertDialog(
                  title: const Text('Registration Successful'),
                  content: const Text('Account created! Please log in manually.'),
                  actions: [
                    TextButton(
                      child: const Text('OK'),
                      onPressed: () {
                        Navigator.of(context).pop();
                        Navigator.of(context).pop();
                      },
                    ),
                  ],
                ),
              );
            }
          } catch (loginError) {
            // If auto-login fails, show success message and ask to login manually
            showDialog(
              context: context,
              builder: (_) => AlertDialog(
                title: const Text('Registration Successful'),
                content: const Text('Account created! Please log in manually.'),
                actions: [
                  TextButton(
                    child: const Text('OK'),
                    onPressed: () {
                      Navigator.of(context).pop();
                      Navigator.of(context).pop();
                    },
                  ),
                ],
              ),
            );
          }
        } else {
          showDialog(
            context: context,
            builder: (_) => AlertDialog(
              title: const Text('Registration Failed'),
              content: Text(error),
              actions: [
                TextButton(
                  child: const Text('OK'),
                  onPressed: () => Navigator.of(context).pop(),
                ),
              ],
            ),
          );
        }
      } catch (e) {
        setState(() => _isLoading = false);
        LoggingService.instance.error("Signup error", e);
        showDialog(
          context: context,
          builder: (_) => AlertDialog(
            title: const Text('Error'),
            content: Text(e.toString()),
            actions: [
              TextButton(
                child: const Text('OK'),
                onPressed: () => Navigator.of(context).pop(),
              ),
            ],
          ),
        );
      }
    }
  }

  Future<void> _resendOTP() async {
    final email = _emailController.text.trim();
    final fullname = _fullnameController.text.trim();
    
    if (email.isEmpty || !_isValidEmail(email)) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Please enter a valid email first')),
        );
      }
      return;
    }

    try {
      // Use sendOTP (signup flow), not requestOTP (existing-user flow)
      final result = await ApiService.sendOTP(email, fullname.isNotEmpty ? fullname : null);
      
      if (result['error'] == null) {
        _startResendTimer();
        if (mounted) {
          final devOtp = result['devOtp']?.toString();
          if (devOtp != null && devOtp.isNotEmpty) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('OTP (use this if email not received): $devOtp'),
                duration: const Duration(seconds: 30),
              ),
            );
          } else {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('OTP resent to your email!')),
            );
          }
        }
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Failed to resend OTP: ${result['error']}')),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    }
  }

  void _startResendTimer() {
    setState(() => _resendTimer = 60);
    _resendTimerTimer?.cancel();
    _resendTimerTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      setState(() {
        if (_resendTimer > 0) {
          _resendTimer--;
        } else {
          timer.cancel();
        }
      });
    });
  }



  void _showSuccessDialog() {
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Registration Successful'),
        content: const Text('Your account has been created and you are now logged in!'),
        actions: [
          TextButton(
            child: const Text('Continue'),
            onPressed: () {
              Navigator.of(context).pop(); // Close dialog
              Navigator.of(context).pushReplacement(
                MaterialPageRoute(
                  builder: (context) => WidgetBot(user: _loggedInUser!),
                ),
              );
            },
          ),
        ],
      ),
    );
  }

  // Helper methods for form components
  Widget _buildLabel(String text, [Size? mediaSize]) {
    return Text(
      text,
      style: TextStyle(
        color: Colors.black,
        fontSize: mediaSize != null && mediaSize.width < 400 ? 14 : 16,
        fontWeight: FontWeight.w600,
      ),
    );
  }

  Widget _buildInputField({
    required TextEditingController controller,
    required String hintText,
    String? errorText,
    required IconData icon,
    bool isPassword = false,
    bool showPassword = false,
    VoidCallback? onTogglePassword,
  }) {
    return TextField(
      controller: controller,
      obscureText: isPassword ? !showPassword : false,
      decoration: InputDecoration(
        hintText: hintText,
        errorText: errorText,
        prefixIcon: Icon(icon, color: Colors.grey[600]),
        suffixIcon: isPassword
            ? IconButton(
                icon: Icon(
                  showPassword ? Icons.visibility : Icons.visibility_off,
                  color: Colors.grey[600],
                ),
                onPressed: onTogglePassword,
              )
            : null,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: Colors.grey[300]!),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: Colors.grey[300]!),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Color(0xFF212c59), width: 2), // Dark blue when focused
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Colors.red),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Colors.red, width: 2),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        filled: true,
        fillColor: Colors.grey[50],
      ),
    );
  }

  Widget _buildEmailField() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        TextField(
          controller: _emailController,
          keyboardType: TextInputType.emailAddress,
          textInputAction: TextInputAction.next,
          decoration: InputDecoration(
            hintText: "Enter your email address",
            errorText: _emailError,
            prefixIcon: Icon(Icons.email_outlined, color: Colors.grey[600]),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(color: Colors.grey[300]!),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(color: Colors.grey[300]!),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: Color(0xFF212c59), width: 2),
            ),
            errorBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: Colors.red),
            ),
            focusedErrorBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: Colors.red, width: 2),
            ),
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
            filled: true,
            fillColor: Colors.grey[50],
          ),
        ),
        const SizedBox(height: 12),
        _buildSendOtpButton(),
      ],
    );
  }

  Widget _buildSendOtpButton() {
    return Container(
      height: 50,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(30),
        image: const DecorationImage(
          image: AssetImage("assets/images/istetik.png"),
          fit: BoxFit.cover,
        ),
      ),
      child: ElevatedButton(
        onPressed: (_otpSent || _isSendingOtp) ? null : _sendOTP,
        style: ElevatedButton.styleFrom(
          backgroundColor: Colors.transparent,
          shadowColor: Colors.transparent,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
        ),
        child: _isSendingOtp
            ? const SizedBox(
                width: 24,
                height: 24,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                ),
              )
            : Text(
                _otpSent ? 'OTP SENT' : 'SEND OTP',
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 1,
                ),
              ),
      ),
    );
  }

  Widget _buildOTPVerificationSection() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.blue[50],
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.blue[200]!),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.verified_user, color: Colors.blue[600], size: 24),
              const SizedBox(width: 12),
              Text(
                'Email Verification',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: Colors.blue[800],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Text(
            'We sent a 6-digit code to ${_emailController.text}',
            style: TextStyle(
              fontSize: 14,
              color: Colors.grey[700],
            ),
          ),
          const SizedBox(height: 20),
          Row(
            children: [
              Expanded(
                flex: 3,
                child: TextField(
                  controller: _otpController,
                  decoration: InputDecoration(
                    hintText: 'Enter OTP',
                    errorText: _otpError,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide(color: Colors.grey[300]!),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide(color: Colors.grey[300]!),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(color: Color(0xFF212c59), width: 2), // Dark blue when focused
                    ),
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 16,
                    ),
                    filled: true,
                    fillColor: Colors.white,
                  ),
                  keyboardType: TextInputType.number,
                  maxLength: 6,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 2,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                flex: 2,
                child: SizedBox(
                  height: 56,
                  child: ElevatedButton(
                    onPressed: _isVerifyingOtp ? null : _verifyOTP,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.blue[600],
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      elevation: 0,
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
                        : const Text(
                            'Verify',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              TextButton(
                onPressed: _resendTimer > 0 ? null : _resendOTP,
                style: TextButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                ),
                child: Text(
                  _resendTimer > 0 
                    ? 'Resend in ${_resendTimer}s' 
                    : 'Resend OTP',
                  style: TextStyle(
                    color: _resendTimer > 0 ? Colors.grey : Colors.blue[600],
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              if (_otpVerified)
                Row(
                  children: [
                    Icon(
                      Icons.check_circle,
                      color: Colors.green[600],
                      size: 20,
                    ),
                    const SizedBox(width: 6),
                    Text(
                      'Email verified!',
                      style: TextStyle(
                        color: Colors.green[600],
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildDateField() {
    return TextField(
      controller: _birthdayController,
      readOnly: true,
      decoration: InputDecoration(
        hintText: "Select your birthday",
        errorText: _birthdayError,
        prefixIcon: Icon(Icons.calendar_today, color: Colors.grey[600]),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: Colors.grey[300]!),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: Colors.grey[300]!),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Color(0xFF212c59), width: 2), // Dark blue when focused
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Colors.red),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Colors.red, width: 2),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        filled: true,
        fillColor: Colors.grey[50],
      ),
      onTap: () async {
        FocusScope.of(context).requestFocus(FocusNode());
        final pickedDate = await showDatePicker(
          context: context,
          initialDate: DateTime(2000),
          firstDate: DateTime(1900),
          lastDate: DateTime.now(),
        );
        if (pickedDate != null) {
          _birthdayController.text = DateFormat('yyyy-MM-dd').format(pickedDate);
        }
      },
    );
  }

  Widget _buildGenderField() {
    return DropdownButtonFormField<String>(
      value: _selectedGender,
      items: ['Male', 'Female', 'Prefer not to say']
          .map((gender) => DropdownMenuItem(
                value: gender,
                child: Text(gender),
              ))
          .toList(),
      onChanged: (value) => setState(() => _selectedGender = value),
      decoration: InputDecoration(
        hintText: "Select your gender",
        errorText: _genderError,
        prefixIcon: Icon(Icons.person, color: Colors.grey[600]),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: Colors.grey[300]!),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: Colors.grey[300]!),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Color(0xFF212c59), width: 2), // Dark blue when focused
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Colors.red),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Colors.red, width: 2),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        filled: true,
        fillColor: Colors.grey[50],
      ),
    );
  }

  Widget _buildPasswordField() {
    return _buildInputField(
      controller: _passwordController,
      hintText: "Create a strong password",
      errorText: _passwordError,
      icon: Icons.lock_outline,
      isPassword: true,
      showPassword: _showPassword,
      onTogglePassword: () => setState(() => _showPassword = !_showPassword),
    );
  }

  Widget _buildConfirmPasswordField() {
    return _buildInputField(
      controller: _confirmPasswordController,
      hintText: "Confirm your password",
      errorText: _confirmPasswordError,
      icon: Icons.lock_outline,
      isPassword: true,
      showPassword: _showConfirmPassword,
      onTogglePassword: () => setState(() => _showConfirmPassword = !_showConfirmPassword),
    );
  }

  Widget _buildTermsSection() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.grey[50],
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey[200]!),
      ),
      child: Column(
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Checkbox(
                value: _acceptedTerms,
                onChanged: (value) => setState(() => _acceptedTerms = value ?? false),
                materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
              ),
              const SizedBox(width: 8),
              Expanded(
                child: GestureDetector(
                  onTap: () {
                    showDialog(
                      context: context,
                      builder: (context) => AlertDialog(
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                        title: const Text('Privacy Policy'),
                        content: SingleChildScrollView(
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                "Privacy Policy for Nomu Cafe\n\n"
                                "Effective Date: May 11, 2024\n\n"
                                "At Nomu Cafe, we are committed to protecting your personal information. "
                                "This privacy policy explains what data we collect, how we use it, and your rights.\n\n"
                                "1. Information We Collect:\n"
                                "- Name, email address, birthday, and other details you provide.\n\n"
                                "2. How We Use Your Information:\n"
                                "- To provide and improve our services.\n"
                                "- To contact you about your account or promotions.\n\n"
                                "3. Data Protection:\n"
                                "- We use industry-standard security to protect your data.\n\n"
                                "4. Your Rights:\n"
                                "- You can request access or deletion of your information at any time.\n\n"
                                "5. Third Parties:\n"
                                "- We do not share your information with third parties without consent.\n\n"
                                "By using our services, you agree to this Privacy Policy.\n\n"
                                "For inquiries, contact us at nomucafe1@gmail.com.",
                              ),
                              const SizedBox(height: 20),
                              SizedBox(
                                width: double.infinity,
                                child: OutlinedButton(
                                  onPressed: () => Navigator.of(context).pop(),
                                  style: OutlinedButton.styleFrom(
                                    backgroundColor: Colors.white,
                                    foregroundColor: AppTheme.primary,
                                    side: BorderSide(color: AppTheme.primary, width: 2),
                                    padding: const EdgeInsets.symmetric(vertical: 14),
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(10),
                                    ),
                                  ),
                                  child: const Text('Close'),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    );
                  },
                  child: FittedBox(
                    fit: BoxFit.scaleDown,
                    alignment: Alignment.centerLeft,
                    child: const Text(
                      'I accept the terms and conditions',
                      style: TextStyle(
                        color: Colors.blue,
                        fontWeight: FontWeight.w600,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ),
              ),
            ],
          ),
          if (_termsError != null)
            Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Text(
                _termsError!,
                style: const TextStyle(color: Colors.red, fontSize: 12),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildSignUpButton() {
    return Container(
      height: 60,
      width: double.infinity,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(30),
        image: const DecorationImage(
          image: AssetImage("assets/images/istetik.png"),
          fit: BoxFit.cover,
        ),
      ),
      child: ElevatedButton(
        onPressed: _isLoading ? null : _registerUser,
        style: ElevatedButton.styleFrom(
          backgroundColor: Colors.transparent,
          shadowColor: Colors.transparent,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
        ),
        child: _isLoading
            ? const SizedBox(
                width: 24,
                height: 24,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                ),
              )
            : const Text(
                'SIGN UP',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 1,
                ),
              ),
      ),
    );
  }

  Widget _buildSignInLink() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        const Text(
          "Already have an account? ",
          style: TextStyle(color: Colors.black),
        ),
        GestureDetector(
          onTap: () => Navigator.of(context).pop(),
          child: const Text(
            "Sign In",
            style: TextStyle(
              color: Colors.blue,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
      ],
    );
  }

  @override
  void dispose() {
    _fullnameController.dispose();
    _usernameController.dispose();
    _emailController.dispose();
    _birthdayController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    _otpController.dispose();
    _resendTimerTimer?.cancel();
    _fadeController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final mediaSize = MediaQuery.of(context).size;
    return GestureDetector(
      onTap: () => FocusScope.of(context).unfocus(),
      child: Scaffold(
        resizeToAvoidBottomInset: true,
        body: Stack(
          children: [
            // Background image
            SizedBox.expand(
              child: Image.asset(
                "assets/images/istetik.png",
                fit: BoxFit.cover,
              ),
            ),
        
            SafeArea(
              child: Column(
                children: [
                  SizedBox(height: mediaSize.height * 0.08),
                  FadeTransition(
                    opacity: _fadeInAnimation,
                    child: _buildTop(mediaSize),
                  ),
                  const SizedBox(height: 20),
                  Expanded(
                    child: Align(
                      alignment: Alignment.bottomCenter,
                      child: _buildBottom(mediaSize),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTop(Size mediaSize) {
    return SizedBox(
      width: mediaSize.width,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Image.asset(
            "assets/images/nomutrans.png",
            height: mediaSize.height * 0.2,
            fit: BoxFit.contain,
          ),
          const SizedBox(height: 16),
          const Text(
            "Nomu Cafe",
            style: TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.bold,
              fontSize: 30,
              letterSpacing: 2,
              fontFamily: "Montserrat",
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBottom(Size mediaSize) {
    return Container(
      width: mediaSize.width,
      height: mediaSize.height * (mediaSize.height > 800 ? 0.65 : 0.7),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.only(
          topLeft: Radius.circular(30),
          topRight: Radius.circular(30),
        ),
      ),
      child: Padding(
        padding: EdgeInsets.all(mediaSize.width * (mediaSize.width > 400 ? 0.08 : 0.06)),
        child: _buildForm(mediaSize),
      ),
    );
  }

  Widget _buildForm(Size mediaSize) {
    return SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildLabel("Create Your Account", mediaSize),
          SizedBox(height: mediaSize.height * 0.03),
          
          // Full Name Field
          _buildLabel("Full Name", mediaSize),
          const SizedBox(height: 8),
          _buildInputField(
            controller: _fullnameController,
            hintText: "Enter your full name",
            errorText: _fullnameError,
            icon: Icons.person_outline,
          ),
          SizedBox(height: mediaSize.height * 0.02),
          
          // Username Field
          _buildLabel("Username", mediaSize),
          const SizedBox(height: 8),
          _buildInputField(
            controller: _usernameController,
            hintText: "Choose a username",
            errorText: _usernameError,
            icon: Icons.alternate_email,
          ),
          SizedBox(height: mediaSize.height * 0.02),
          
          // Email Field with OTP Button
          _buildLabel("Email Address", mediaSize),
          const SizedBox(height: 8),
          _buildEmailField(),
          if (_otpSent) ...[
            SizedBox(height: mediaSize.height * 0.02),
            _buildOTPVerificationSection(),
          ],
          SizedBox(height: mediaSize.height * 0.02),
          
          // Birthday Field
          _buildLabel("Birthday", mediaSize),
          const SizedBox(height: 8),
          _buildDateField(),
          SizedBox(height: mediaSize.height * 0.02),
          
          // Gender Field
          _buildLabel("Gender", mediaSize),
          const SizedBox(height: 8),
          _buildGenderField(),
          SizedBox(height: mediaSize.height * 0.02),
          
          // Password Field
          _buildLabel("Password", mediaSize),
          const SizedBox(height: 8),
          _buildPasswordField(),
          SizedBox(height: mediaSize.height * 0.02),
          
          // Confirm Password Field
          _buildLabel("Confirm Password", mediaSize),
          const SizedBox(height: 8),
          _buildConfirmPasswordField(),
          SizedBox(height: mediaSize.height * 0.02),
          
          // Terms and Conditions
          _buildTermsSection(),
          SizedBox(height: mediaSize.height * 0.03),
          
          // Sign Up Button
          _buildSignUpButton(),
          SizedBox(height: mediaSize.height * 0.02),
          _buildSignInLink(),
        ],
      ),
    );
  }
}

