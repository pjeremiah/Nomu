import 'dart:async';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'api/api.dart';
import 'homepage.dart';
import 'sign_up.dart';
import 'forgot_password_page.dart';
import 'usermodel.dart';
import 'services/socket_service.dart';
import 'services/logging_service.dart';
 
class LoginPage extends StatefulWidget {
  const LoginPage({super.key});
 
  @override
  State<LoginPage> createState() => _LoginPageState();
}
 
class _LoginPageState extends State<LoginPage> with TickerProviderStateMixin {
  late AnimationController _controller;
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
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1000),
    );
    _fadeInAnimation = Tween<double>(begin: 0, end: 1).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeIn),
    );
    _slideInAnimation = Tween<Offset>(
      begin: const Offset(0, 1),
      end: Offset.zero,
    ).animate(CurvedAnimation(parent: _controller, curve: Curves.easeOut));

    _controller.forward();
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
      LoggingService.instance.error('Error loading user credentials', e);
      // Continue without loading saved credentials if there's an error
    }
  }
 
 
  @override
  void dispose() {
    _controller.dispose();
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
            "assets/images/nomutrans.png",
            height: mediaSize.height * 0.2,
            fit: BoxFit.contain,
          ),
          const SizedBox(height: 16),
          const Text(
            "NOMU CAFE",
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
          const SizedBox(height: 40),
          _buildLabel("Email Address"),
          _buildInputField(emailController, hintText: "Enter your email"),
          const SizedBox(height: 20),
          _buildLabel("Password"),
          _buildInputField(passwordController, hintText: "Enter your password", isPassword: true),
          const SizedBox(height: 10),
          _buildForgotPasswordLink(),
          const SizedBox(height: 20),
          _buildLoginButton(),
          const SizedBox(height: 20),
          _buildSignupLink(),
        ],
      ),
    );
  }
 
 
 
  Widget _buildLabel(String text) {
    return Text(text, style: const TextStyle(color: Colors.black));
  }
 
  Widget _buildInputField(TextEditingController controller,
      {bool isPassword = false, String hintText = ""}) {
    return TextField(
      controller: controller,
      keyboardType: isPassword ? TextInputType.text : TextInputType.emailAddress,
      obscureText: isPassword ? _obscurePassword : false,
      decoration: InputDecoration(
        hintText: hintText,
        prefixIcon: Icon(
          isPassword ? Icons.lock : Icons.email,
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
          borderSide: const BorderSide(color: Color(0xFF212c59), width: 2), // Dark blue when focused
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        filled: true,
        fillColor: Colors.grey[50],
      ),
    );
  }
 
 
  Widget _buildLoginButton() {
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
        onPressed: () async {
          FocusScope.of(context).unfocus();
          final email = emailController.text.trim();
          final password = passwordController.text.trim();

          if (email.isEmpty || password.isEmpty) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Please enter both email and password')),
            );
            return;
          }

          try {
            setState(() => _isLoading = true);
            LoggingService.instance.auth('Starting customer login process for email: $email');
            LoggingService.instance.auth('Password length: ${password.length}');
            LoggingService.instance.auth('Remember user: $rememberUser');
            
            // Debug: Check if there are any leftover session data
            final prefs = await SharedPreferences.getInstance();
            final isLoggedIn = prefs.getBool('is_logged_in') ?? false;
            final storedEmail = prefs.getString('user_email');
            final storedToken = prefs.getString('jwt_token');
            LoggingService.instance.auth('Pre-login state check', {
              'is_logged_in': isLoggedIn,
              'stored_email': storedEmail,
              'stored_token': storedToken != null ? "EXISTS" : "NULL",
            });
           
            // Regular customer login
            LoggingService.instance.auth('Attempting login with email: $email');
            final loginResult = await ApiService.login(email, password);
            LoggingService.instance.auth('Login API call completed. Result: ${loginResult != null ? "SUCCESS" : "FAILED"}');
           
            if (loginResult != null) {
              final user = loginResult['user'] as UserModel;
              final token = loginResult['token'] as String?;
              
              LoggingService.instance.auth('Customer login successful for: ${user.email}');
              
              // Save user credentials
              final prefs = await SharedPreferences.getInstance();
              await prefs.setString('user_email', user.email);
              await prefs.setString('fullName', user.fullName);
              await prefs.setString('user_id', user.id);
              await prefs.setString('user_role', user.role);
              await prefs.setString('profilePicture', user.profilePicture);
              await prefs.setBool('is_logged_in', true);
              
              // Store JWT token for admin functionality
              if (token != null) {
                await prefs.setString('jwt_token', token);
                LoggingService.instance.auth('JWT token stored for admin functionality');
              }
              
              // Save credentials if remember is checked
              if (rememberUser) {
                try {
                  await prefs.setString('email', email);
                  await prefs.setString('password', password);
                  await prefs.setBool('rememberUser', true);
                } catch (e) {
                  LoggingService.instance.error('Error saving credentials', e);
                  // Continue with login even if saving fails
                }
              }
              
              setState(() => _isLoading = false);
              
              // Reinitialize socket service for new user session
              try {
                LoggingService.instance.auth('Reinitializing socket service for new session...');
                
                // Reset socket service first
                SocketService.instance.reset();
                
                // Initialize with timeout
                await SocketService.instance.initialize().timeout(
                  const Duration(seconds: 5),
                  onTimeout: () {
                    LoggingService.instance.warning('Socket initialization timeout');
                    throw TimeoutException('Socket initialization timeout', const Duration(seconds: 5));
                  },
                );
                
                // Wait for connection to establish
                await Future.delayed(const Duration(milliseconds: 1000));
                
                final connectionStatus = SocketService.instance.getConnectionStatus();
                if (connectionStatus['isConnected']) {
                  LoggingService.instance.auth('Socket service reinitialized successfully');
                } else {
                  LoggingService.instance.warning('Socket service initialized but not connected yet - will retry automatically');
                }
              } catch (e) {
                LoggingService.instance.warning('Socket reinitialization failed - continuing without real-time features', e);
                // Continue with login even if socket fails - app should work without real-time features
              }
              
              // Navigate to homepage
              if (mounted) {
                Navigator.pushReplacement(
                  context,
                  MaterialPageRoute(
                    builder: (context) => WidgetBot(user: user),
                  ),
                );
              }
            } else {
              if (mounted) {
                setState(() => _isLoading = false);
                LoggingService.instance.error('Login returned null - unexpected error');
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Login failed. Please try again.'),
                    backgroundColor: Colors.red,
                  ),
                );
              }
            }
          } catch (e) {
            if (mounted) {
              setState(() => _isLoading = false);
              LoggingService.instance.error('Exception during login', e);
              
              // Show specific error messages based on the exception
              String errorMessage = 'Login failed. Please try again.';
              if (e.toString().contains('Invalid credentials')) {
                errorMessage = 'Invalid email or password. Please check your credentials and try again.';
              } else if (e.toString().contains('Server error')) {
                errorMessage = 'Server error. Please try again later.';
              } else if (e.toString().contains('Failed to parse user data')) {
                errorMessage = 'Login successful but failed to load user data. Please try again.';
              } else if (e.toString().contains('No user data received')) {
                errorMessage = 'Login successful but no user data received. Please try again.';
              } else if (e.toString().contains('Invalid request')) {
                errorMessage = 'Invalid request. Please check your email format and try again.';
              } else if (e.toString().contains('timeout')) {
                errorMessage = 'Login timed out. Please check your internet connection and try again.';
              } else if (e.toString().contains('SocketException')) {
                errorMessage = 'Network error. Please check your internet connection and try again.';
              }
              
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(errorMessage),
                  backgroundColor: Colors.red,
                  duration: const Duration(seconds: 5),
                ),
              );
            }
          }
        },
        style: ElevatedButton.styleFrom(
          backgroundColor: Colors.transparent,
          shadowColor: Colors.transparent,
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
        ),
        child: _isLoading
            ? const SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                ),
              )
            : const Text(
                "LOGIN",
                style: TextStyle(
                    color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
              ),
      ),
    );
  }

  Widget _buildForgotPasswordLink() {
    return Align(
      alignment: Alignment.centerRight,
      child: GestureDetector(
        onTap: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => const ForgotPasswordPage(),
            ),
          );
        },
        child: const Text(
          "Forgot Password?",
          style: TextStyle(
            color: Colors.blue,
            fontWeight: FontWeight.w500,
            decoration: TextDecoration.underline,
          ),
        ),
      ),
    );
  }

  Widget _buildSignupLink() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        const Text(
          "Don't have an account? ",
          style: TextStyle(color: Colors.black),
        ),
        GestureDetector(
          onTap: () {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) => const SignupPage(),
              ),
            );
          },
          child: const Text(
            "Sign Up",
            style: TextStyle(
              color: Colors.blue,
              fontWeight: FontWeight.bold,
              decoration: TextDecoration.underline,
            ),
          ),
        ),
      ],
    );
  }

}