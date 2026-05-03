import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'api/api.dart';
import 'otp_verification.dart';
import 'barista.dart';
import 'constants/app_constants.dart';
import 'utils/logger.dart';
import 'services/socket_service.dart';

/// Matches [02-mobile-client mobile-frontend login.dart] sign-in UI: hero image, logo, white card,
/// section title, bold labels + spacing, outlined field icons, remember-me only (no forgot / sign up).
class LoginPage extends StatefulWidget {
  const LoginPage({super.key});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> with TickerProviderStateMixin {
  late AnimationController _fadeController;
  late AnimationController _slideController;
  late Animation<double> _fadeInAnimation;
  late Animation<Offset> _slideInAnimation;

  late Color myColor;
  late Size mediaSize;
  final emailController = TextEditingController();
  final passwordController = TextEditingController();
  bool rememberUser = false;
  bool _obscurePassword = true;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _fadeController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1000),
    );
    _slideController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    );
    _fadeInAnimation = Tween<double>(begin: 0, end: 1).animate(
      CurvedAnimation(parent: _fadeController, curve: Curves.easeIn),
    );
    _slideInAnimation = Tween<Offset>(
      begin: const Offset(0, 1),
      end: Offset.zero,
    ).animate(CurvedAnimation(parent: _slideController, curve: Curves.easeOut));

    _fadeController.forward();
    _slideController.forward();
    _loadUserCredentials();
  }

  Future<void> _loadUserCredentials() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final savedEmail = prefs.getString('email');
      final savedPassword = prefs.getString('password');
      final savedRemember = prefs.getBool('rememberUser') ?? false;

      if (savedRemember && savedEmail != null && savedPassword != null) {
        setState(() {
          emailController.text = savedEmail;
          passwordController.text = savedPassword;
          rememberUser = savedRemember;
        });
      }
    } catch (e) {
      Logger.exception('Error loading user credentials', e, 'LOGIN');
    }
  }

  @override
  void dispose() {
    _fadeController.dispose();
    _slideController.dispose();
    emailController.dispose();
    passwordController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    myColor = const Color(0xFF212c59);
    mediaSize = MediaQuery.of(context).size;

    return GestureDetector(
      onTap: () => FocusScope.of(context).unfocus(),
      child: Scaffold(
        resizeToAvoidBottomInset: true,
        body: Stack(
          children: [
            SizedBox.expand(
              child: Image.asset(
                'assets/images/istetik.png',
                fit: BoxFit.cover,
              ),
            ),
            SafeArea(
              child: Stack(
                children: [
                  Column(
                    children: [
                      SizedBox(height: mediaSize.height * 0.08),
                      FadeTransition(
                        opacity: _fadeInAnimation,
                        child: _buildTop(),
                      ),
                      const SizedBox(height: 20),
                      Expanded(
                        child: SlideTransition(
                          position: _slideInAnimation,
                          child: Align(
                            alignment: Alignment.bottomCenter,
                            child: _buildBottom(),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTop() {
    return SizedBox(
      width: mediaSize.width,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Image.asset(
            'assets/images/nomutrans.png',
            height: mediaSize.height * 0.2,
            fit: BoxFit.contain,
          ),
          const SizedBox(height: 16),
          const Text(
            'Nomu Scanner',
            style: TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.bold,
              fontSize: 30,
              letterSpacing: 2,
              fontFamily: 'Montserrat',
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBottom() {
    return Container(
      width: mediaSize.width,
      height: mediaSize.height * 0.6,
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.only(
          topLeft: Radius.circular(30),
          topRight: Radius.circular(30),
        ),
      ),
      child: Padding(
        padding: EdgeInsets.all(mediaSize.width * 0.08),
        child: _buildForm(),
      ),
    );
  }

  Widget _buildForm() {
    return SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Same rhythm as mobile client [LoginPage._buildForm]; admin-specific section title.
          _buildLabel('Login Your Admin Account', mediaSize),
          SizedBox(height: mediaSize.height * 0.03),
          _buildLabel('Email Address', mediaSize),
          const SizedBox(height: 8),
          _buildInputField(
            emailController,
            hintText: 'Enter your admin email',
          ),
          SizedBox(height: mediaSize.height * 0.02),
          _buildLabel('Password', mediaSize),
          const SizedBox(height: 8),
          _buildInputField(
            passwordController,
            hintText: 'Enter your password',
            isPassword: true,
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Checkbox(
                value: rememberUser,
                onChanged: (value) => setState(() => rememberUser = value ?? false),
                materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
              ),
              GestureDetector(
                onTap: () => setState(() => rememberUser = !rememberUser),
                child: const Text(
                  'Remember me',
                  style: TextStyle(color: Colors.black),
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          _buildLoginButton(),
          const SizedBox(height: 20),
        ],
      ),
    );
  }

  /// Same typography as mobile client [LoginPage._buildLabel] / customer [SignupPage._buildLabel].
  Widget _buildLabel(String text, Size size) {
    return Text(
      text,
      style: TextStyle(
        color: Colors.black,
        fontSize: size.width < 400 ? 14 : 16,
        fontWeight: FontWeight.w600,
      ),
    );
  }

  Widget _buildInputField(
    TextEditingController controller, {
    bool isPassword = false,
    String hintText = '',
  }) {
    return TextField(
      controller: controller,
      keyboardType: isPassword ? TextInputType.text : TextInputType.emailAddress,
      obscureText: isPassword ? _obscurePassword : false,
      decoration: InputDecoration(
        hintText: hintText,
        prefixIcon: Icon(
          isPassword ? Icons.lock_outline : Icons.email_outlined,
          color: Colors.grey[600],
        ),
        suffixIcon: isPassword
            ? IconButton(
                icon: Icon(
                  _obscurePassword ? Icons.visibility_off : Icons.visibility,
                  color: Colors.grey[600],
                ),
                onPressed: () {
                  setState(() {
                    _obscurePassword = !_obscurePassword;
                  });
                },
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
          borderSide: const BorderSide(color: Color(0xFF212c59), width: 2),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        filled: true,
        fillColor: Colors.grey[50],
      ),
    );
  }

  Future<void> _persistRememberMeCredentials(
    SharedPreferences prefs,
    String email,
    String password,
  ) async {
    if (rememberUser) {
      try {
        await prefs.setString('email', email);
        await prefs.setString('password', password);
        await prefs.setBool('rememberUser', true);
      } catch (e) {
        Logger.exception('Error saving credentials', e, 'LOGIN');
      }
    } else {
      try {
        await prefs.remove('email');
        await prefs.remove('password');
        await prefs.setBool('rememberUser', false);
      } catch (e) {
        Logger.exception('Error clearing remember-me credentials', e, 'LOGIN');
      }
    }
  }

  Widget _buildLoginButton() {
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
        onPressed: _isLoading
            ? null
            : () async {
                FocusScope.of(context).unfocus();
                final email = emailController.text.trim();
                final password = passwordController.text.trim();

                if (email.isEmpty || password.isEmpty) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Please enter both email and password')),
                  );
                  return;
                }

                if (!RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$').hasMatch(email)) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Please enter a valid email address'),
                      backgroundColor: Colors.red,
                    ),
                  );
                  return;
                }

                if (password.length < AppConstants.minPasswordLength) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(
                        'Password must be at least ${AppConstants.minPasswordLength} characters long',
                      ),
                      backgroundColor: Colors.red,
                    ),
                  );
                  return;
                }

                try {
                  setState(() => _isLoading = true);
                  Logger.auth('Starting barista login process for email: $email');

                  final user = await ApiService.login(email, password);

                  if (user != null) {
                    Logger.success('Mobile admin login successful, OTP sent to: $email', 'LOGIN');

                    final prefs = await SharedPreferences.getInstance();
                    final rememberMe = prefs.getBool('remember_me') ?? false;
                    final rememberUntilStr = prefs.getString('remember_until');
                    final isLoggedIn = prefs.getBool('is_logged_in') ?? false;

                    if (rememberMe && rememberUntilStr != null && isLoggedIn) {
                      try {
                        final rememberUntil = DateTime.parse(rememberUntilStr);
                        final now = DateTime.now();

                        if (now.isBefore(rememberUntil)) {
                          Logger.success('User is still within remember me period, skipping OTP', 'LOGIN');
                          await _persistRememberMeCredentials(prefs, email, password);
                          setState(() => _isLoading = false);

                          if (mounted) {
                            Navigator.pushReplacement(
                              context,
                              MaterialPageRoute(
                                builder: (context) => const BaristaScannerPage(),
                              ),
                            );
                          }
                          return;
                        } else {
                          Logger.debug('Remember me period expired, proceeding with OTP', 'LOGIN');
                          await prefs.setBool('remember_me', false);
                          await prefs.remove('remember_until');
                          await prefs.setBool('is_logged_in', false);
                        }
                      } catch (e) {
                        Logger.exception('Error parsing remember until date', e, 'LOGIN');
                        await prefs.setBool('remember_me', false);
                        await prefs.remove('remember_until');
                        await prefs.setBool('is_logged_in', false);
                      }
                    }

                    await _persistRememberMeCredentials(prefs, email, password);

                    setState(() => _isLoading = false);

                    try {
                      await SocketService.initialize();
                      Logger.success('Socket initialized after login', 'LOGIN');
                    } catch (e) {
                      Logger.warning('Socket initialization failed: $e', 'LOGIN');
                    }

                    if (mounted) {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (context) => OTPVerificationPage(
                            email: email,
                            name: user.name,
                          ),
                        ),
                      );
                    }
                  } else {
                    setState(() => _isLoading = false);
                    Logger.error('Invalid credentials or not admin', 'LOGIN');
                    if (mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Invalid email or password. Access denied.'),
                          backgroundColor: Colors.red,
                        ),
                      );
                    }
                  }
                } catch (e) {
                  setState(() => _isLoading = false);
                  Logger.exception('Exception during login', e, 'LOGIN');

                  var errorMessage = 'Login failed. Please try again.';
                  if (e.toString().contains('SocketException') ||
                      e.toString().contains('TimeoutException')) {
                    errorMessage = AppConstants.networkErrorMessage;
                  } else if (e.toString().contains('FormatException')) {
                    errorMessage = AppConstants.serverErrorMessage;
                  }

                  if (mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text(errorMessage),
                        backgroundColor: Colors.red,
                      ),
                    );
                  }
                }
              },
        style: ElevatedButton.styleFrom(
          backgroundColor: Colors.transparent,
          shadowColor: Colors.transparent,
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
                    'Logging in...',
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: 0.95),
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              )
            : const Text(
                'LOGIN',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
      ),
    );
  }
}
