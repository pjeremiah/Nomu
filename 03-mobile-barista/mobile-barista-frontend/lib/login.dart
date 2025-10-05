import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'api/api.dart';
import 'otp_verification.dart';
import 'barista.dart';
import 'constants/app_constants.dart';
import 'utils/logger.dart';
import 'services/socket_service.dart';
 
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
      duration: AppConstants.animationDuration,
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
      Logger.exception('Error loading user credentials', e, 'LOGIN');
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
        body: SafeArea(
          child: Stack(
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
                  SizedBox(height: mediaSize.height * 0.02),
                  FadeTransition(
                    opacity: _fadeInAnimation,
                    child: _buildTop(),
                  ),
                  const SizedBox(height: 20),
                  Expanded(
                    child: SlideTransition(
                      position: _slideInAnimation,
                      child: Column(
                        children: [
                          SizedBox(height: mediaSize.height * 0.15),
                          Expanded(child: _buildBottom()),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
 
          ],
          ),
        ),
      ),
    );
  }
 
  Widget _buildTop() {
    return SizedBox(
      width: mediaSize.width,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Image.asset(
            "assets/images/nomutrans.png",
            height: mediaSize.height * 0.2,
            fit: BoxFit.contain,
          ),
          const SizedBox(height: 20),
          const Text(
            "NOMU SCANNER",
            style: TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.bold,
              fontSize: 28,
              letterSpacing: 2,
              fontFamily: "Montserrat",
              shadows: [
                Shadow(
                  color: Colors.black26,
                  offset: Offset(0, 2),
                  blurRadius: 4,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
 
  Widget _buildBottom() {
    return Container(
      width: mediaSize.width,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: const BorderRadius.only(
          topLeft: Radius.circular(32),
          topRight: Radius.circular(32),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.1),
            spreadRadius: 0,
            blurRadius: 20,
            offset: const Offset(0, -5),
          ),
        ],
      ),
      child: SingleChildScrollView(
        padding: EdgeInsets.all(mediaSize.width * 0.08),
        child: _buildForm(),
      ),
    );
  }
 
  Widget _buildForm() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildWelcomeHeader(),
        SizedBox(height: mediaSize.height * 0.02),
        _buildInputField(
          emailController, 
          hintText: "Enter your admin email",
          label: "Email Address",
          icon: Icons.email_outlined,
        ),
        SizedBox(height: mediaSize.height * 0.015),
        _buildInputField(
          passwordController, 
          hintText: "Enter your password", 
          isPassword: true,
          label: "Password",
          icon: Icons.lock_outline,
        ),
        SizedBox(height: mediaSize.height * 0.01),
        _buildRememberMeCheckbox(),
        SizedBox(height: mediaSize.height * 0.02),
        _buildLoginButton(),
        SizedBox(height: mediaSize.height * 0.01),
      ],
    );
  }
 
 
 
  Widget _buildWelcomeHeader() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          "Welcome Back!",
          style: TextStyle(
            fontSize: mediaSize.height * 0.025,
            fontWeight: FontWeight.bold,
            color: myColor,
            letterSpacing: 0.5,
          ),
        ),
        SizedBox(height: mediaSize.height * 0.005),
        Text(
          "Log in to your admin account",
          style: TextStyle(
            fontSize: mediaSize.height * 0.016,
            color: Colors.grey[600],
            fontWeight: FontWeight.w400,
          ),
        ),
      ],
    );
  }

  Widget _buildRememberMeCheckbox() {
    return Row(
      children: [
        Checkbox(
          value: rememberUser,
          onChanged: (value) {
            setState(() {
              rememberUser = value ?? false;
            });
          },
          activeColor: myColor,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(4),
          ),
        ),
        const SizedBox(width: 8),
        Text(
          "Remember me",
          style: TextStyle(
            color: Colors.grey[700],
            fontSize: 14,
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }

 
  Widget _buildInputField(TextEditingController controller,
      {bool isPassword = false, String hintText = "", String? label, IconData? icon}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (label != null) ...[
          Text(
            label,
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: myColor,
              letterSpacing: 0.5,
            ),
          ),
          const SizedBox(height: 8),
        ],
        Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            boxShadow: [
              BoxShadow(
                color: Colors.grey.withOpacity(0.1),
                spreadRadius: 1,
                blurRadius: 8,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: TextField(
            controller: controller,
            keyboardType: isPassword ? TextInputType.text : TextInputType.emailAddress,
            obscureText: isPassword ? _obscurePassword : false,
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w500,
            ),
            decoration: InputDecoration(
              hintText: hintText,
              hintStyle: TextStyle(
                color: Colors.grey[400],
                fontSize: 16,
                fontWeight: FontWeight.w400,
              ),
              prefixIcon: icon != null ? Icon(
                icon,
                color: myColor,
                size: 20,
              ) : null,
              suffixIcon: isPassword
                  ? IconButton(
                      icon: Icon(
                        _obscurePassword ? Icons.visibility_off : Icons.visibility,
                        color: Colors.grey[600],
                        size: 20,
                      ),
                      onPressed: () {
                        setState(() {
                          _obscurePassword = !_obscurePassword;
                        });
                      },
                    )
                  : null,
              filled: true,
              fillColor: Colors.grey[50],
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(
                  color: Colors.grey[300]!,
                  width: 1,
                ),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(
                  color: Colors.grey[300]!,
                  width: 1,
                ),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(
                  color: myColor,
                  width: 2,
                ),
              ),
              contentPadding: EdgeInsets.symmetric(
                horizontal: 16,
                vertical: mediaSize.height * 0.015,
              ),
            ),
          ),
        ),
      ],
    );
  }
 

 
  Widget _buildLoginButton() {
    return Container(
      height: mediaSize.height * 0.06,
      width: double.infinity,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        gradient: LinearGradient(
          colors: [myColor, myColor.withOpacity(0.8)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        boxShadow: [
          BoxShadow(
            color: myColor.withOpacity(0.3),
            spreadRadius: 0,
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: ElevatedButton(
        onPressed: _isLoading ? null : () async {
          FocusScope.of(context).unfocus();
          final email = emailController.text.trim();
          final password = passwordController.text.trim();

          if (email.isEmpty || password.isEmpty) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Please enter both email and password')),
            );
            return;
          }

          // Basic email validation
          if (!RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$').hasMatch(email)) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('Please enter a valid email address'),
                backgroundColor: Colors.red,
              ),
            );
            return;
          }

          // Password length validation
          if (password.length < AppConstants.minPasswordLength) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('Password must be at least ${AppConstants.minPasswordLength} characters long'),
                backgroundColor: Colors.red,
              ),
            );
            return;
          }

          try {
            setState(() => _isLoading = true);
            Logger.auth('Starting barista login process for email: $email');
           
            // Mobile admin login (sends OTP automatically)
            final user = await ApiService.login(email, password);
           
            if (user != null) {
              Logger.success('Mobile admin login successful, OTP sent to: $email', 'LOGIN');
              
              // Check if user is still within remember me period
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
                    setState(() => _isLoading = false);
                    
                    // Navigate directly to barista scanner
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
                    // Clear expired remember me data
                    await prefs.setBool('remember_me', false);
                    await prefs.remove('remember_until');
                    await prefs.setBool('is_logged_in', false);
                  }
                } catch (e) {
                  Logger.exception('Error parsing remember until date', e, 'LOGIN');
                  // Clear invalid remember me data
                  await prefs.setBool('remember_me', false);
                  await prefs.remove('remember_until');
                  await prefs.setBool('is_logged_in', false);
                }
              }
              
              // Save credentials if remember is checked
              if (rememberUser) {
                try {
                  await prefs.setString('email', email);
                  await prefs.setString('password', password);
                  await prefs.setBool('rememberUser', true);
                } catch (e) {
                  Logger.exception('Error saving credentials', e, 'LOGIN');
                  // Continue with login even if saving fails
                }
              }
              
              setState(() => _isLoading = false);
              
              // Initialize socket connection after successful login
              try {
                await SocketService.initialize();
                Logger.success('Socket initialized after login', 'LOGIN');
              } catch (e) {
                Logger.warning('Socket initialization failed: $e', 'LOGIN');
                // Continue with login even if socket fails
              }
              
              // Navigate to OTP verification page
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
            
            String errorMessage = 'Login failed. Please try again.';
            if (e.toString().contains('SocketException') || e.toString().contains('TimeoutException')) {
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
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          elevation: 0,
        ),
        child: _isLoading
            ? Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2.5,
                      valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Text(
                    "Logging in...",
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              )
            : Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(
                    Icons.login,
                    color: Colors.white,
                    size: 20,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    "Log In",
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      letterSpacing: 0.5,
                    ),
                  ),
                ],
              ),
      ),
    );
  }

}