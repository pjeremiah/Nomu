import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'usermodel.dart';
import 'package:image_picker/image_picker.dart';
import 'dart:convert';
import 'package:flutter/foundation.dart' show kIsWeb, debugPrint;
import 'config.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:http/http.dart' as http;
import 'api/api.dart';
import 'services/logging_service.dart';
import 'services/file_upload_service.dart';

class AccountSettingsPage extends StatefulWidget {
  final UserModel user;
  final ValueChanged<UserModel> onSave;

  const AccountSettingsPage({super.key, required this.user, required this.onSave});

  @override
  AccountSettingsPageState createState() => AccountSettingsPageState();
}

class AccountSettingsPageState extends State<AccountSettingsPage> with TickerProviderStateMixin {
  final _formKey = GlobalKey<FormState>();
  late TextEditingController _fullnameController;
  late TextEditingController _usernameController;
  late TextEditingController _birthdayController;
  late TextEditingController _currentPasswordController;
  late TextEditingController _newPasswordController;
  late TextEditingController _confirmPasswordController;
  int _profilePictureRefreshKey = 0;
  late TextEditingController _otpController;
  String _selectedGender = 'Prefer not to say';
  String _selectedEmploymentStatus = 'Employed';
  bool _isSaving = false;
  bool _isSendingOtp = false;
  bool _isChangingPassword = false;
  String? _profilePicture;
  late Future<String> _originFuture;
  bool _showCurrentPassword = false;
  bool _showNewPassword = false;
  bool _showConfirmPassword = false;
  bool _otpSent = false;
  // Animation controller (fade only, same as page transition: 280ms easeOutCubic)
  late AnimationController _fadeController;
  late Animation<double> _fadeInAnimation;

  @override
  void initState() {
    super.initState();
    _fullnameController = TextEditingController(text: widget.user.fullName);
    _usernameController = TextEditingController(text: widget.user.username);
    _birthdayController = TextEditingController(text: widget.user.birthday);
    _currentPasswordController = TextEditingController();
    _newPasswordController = TextEditingController();
    _confirmPasswordController = TextEditingController();
    _otpController = TextEditingController();
    _selectedGender = widget.user.gender.isNotEmpty ? widget.user.gender : 'Prefer not to say';
    // Only allow: Student, Prefer not to say, Employed
    const validEmployment = ['Student', 'Prefer not to say', 'Employed'];
    _selectedEmploymentStatus = widget.user.employmentStatus.isNotEmpty && validEmployment.contains(widget.user.employmentStatus)
        ? widget.user.employmentStatus
        : 'Prefer not to say';
    _profilePicture = widget.user.profilePicture.isNotEmpty ? widget.user.profilePicture : null;
    _originFuture = _computeOrigin();
    
    // Initialize fade animation (280ms easeOutCubic, matches page open transition)
    _fadeController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 280),
    );
    _fadeInAnimation = Tween<double>(begin: 0, end: 1).animate(
      CurvedAnimation(parent: _fadeController, curve: Curves.easeOutCubic),
    );
    _fadeController.forward();
    
    // Wake up backend (e.g. Render cold start) so Send OTP is more likely to succeed
    Config.healthCheckUrl.then((url) {
      http.get(Uri.parse(url)).timeout(const Duration(seconds: 30)).catchError((_) {});
    });
    
    // Ensure profile picture is properly loaded
    _ensureProfilePictureLoaded();
  }

  // Ensure profile picture is properly loaded and cached
  void _ensureProfilePictureLoaded() {
    if (widget.user.profilePicture.isNotEmpty) {
      setState(() {
        _profilePicture = widget.user.profilePicture;
      });
      // Safe substring operation to prevent RangeError
      final preview = widget.user.profilePicture.length > 50 
          ? '${widget.user.profilePicture.substring(0, 50)}...'
          : widget.user.profilePicture;
      LoggingService.instance.info('Profile picture loaded from user model: $preview');
    } else {
      LoggingService.instance.info('No profile picture found in user model');
    }
  }


  // Update profile picture when user model changes
  void _updateProfilePicture(String? newProfilePicture) {
    if (newProfilePicture != null && newProfilePicture.isNotEmpty) {
      setState(() {
        _profilePicture = newProfilePicture;
      });
      LoggingService.instance.info('Profile picture updated from user model');
    }
  }

  @override
  void didUpdateWidget(AccountSettingsPage oldWidget) {
    super.didUpdateWidget(oldWidget);
    // Update profile picture if user model changed
    if (oldWidget.user.profilePicture != widget.user.profilePicture) {
      _updateProfilePicture(widget.user.profilePicture);
    }
  }

  @override
  void dispose() {
    // Dispose text controllers
    _fullnameController.dispose();
    _usernameController.dispose();
    _birthdayController.dispose();
    _currentPasswordController.dispose();
    _newPasswordController.dispose();
    _confirmPasswordController.dispose();
    _otpController.dispose();
    
    // Dispose animation controllers
    _fadeController.dispose();
    
    // Clear profile picture from memory
    _profilePicture = null;
    
    super.dispose();
  }

  Future<void> _selectBirthday() async {
    DateTime? pickedDate = await showDatePicker(
      context: context,
      initialDate: DateTime.tryParse(_birthdayController.text) ?? DateTime(2000),
      firstDate: DateTime(1900),
      lastDate: DateTime.now(),
    );

    if (pickedDate != null) {
      setState(() {
        _birthdayController.text = "${pickedDate.toLocal()}".split(' ')[0];
      });
    }
  }

  Future<String> _computeOrigin() async {
    final api = await Config.apiBaseUrl;
    final uri = Uri.parse(api);
    return '${uri.scheme}://${uri.host}:${uri.port}';
  }

  /// Builds profile picture widget with simplified logic
  Widget _buildProfilePicture(double width, double height, double radius, double iconSize) {
    // If no profile picture, show default avatar
    if (_profilePicture == null || _profilePicture!.isEmpty) {
      return _buildDefaultAvatar(radius, iconSize);
    }

    // Handle base64 data URLs (simplified)
    if (_profilePicture!.contains('data:')) {
      return _buildBase64Image(width, height, radius, iconSize);
    }
    
     // Handle GridFS URLs (new format)
     if (_profilePicture!.startsWith('/api/images/profile/')) {
       return _buildGridFSImage(width, height, radius, iconSize);
     }
    
    // Handle legacy file paths
    if (_profilePicture!.startsWith('/uploads/')) {
      LoggingService.instance.warning('Legacy file path detected, showing default avatar');
      return _buildDefaultAvatar(radius, iconSize);
    }
    
    // Fallback to server endpoint
    return _buildServerImage(width, height, radius, iconSize);
  }

  /// Build base64 image with proper decoding
  Widget _buildBase64Image(double width, double height, double radius, double iconSize) {
    try {
      String base64Data = _profilePicture!;
      
      // Clean up double-encoded data URLs
      if (base64Data.contains('data:image/jpeg;base64,data:image/jpeg;base64,')) {
        base64Data = base64Data.replaceFirst('data:image/jpeg;base64,data:image/jpeg;base64,', 'data:image/jpeg;base64,');
      } else if (base64Data.contains('data:image/png;base64,data:image/jpeg;base64,')) {
        base64Data = base64Data.replaceFirst('data:image/png;base64,data:image/jpeg;base64,', 'data:image/jpeg;base64,');
      }
      
      // Extract base64 data
      String imageData;
      if (base64Data.contains('data:image/jpeg;base64,')) {
        imageData = base64Data.split('data:image/jpeg;base64,').last;
      } else if (base64Data.contains('data:image/png;base64,')) {
        imageData = base64Data.split('data:image/png;base64,').last;
      } else {
        imageData = base64Data;
      }
      
      return Image.memory(
        base64Decode(imageData),
        width: width,
        height: height,
        fit: BoxFit.cover,
        errorBuilder: (context, error, stackTrace) {
          _logError('Error loading base64 profile picture', error);
          return _buildDefaultAvatar(radius, iconSize);
        },
      );
    } catch (e) {
      _logError('Error decoding base64 profile picture', e);
      return _buildDefaultAvatar(radius, iconSize);
    }
  }

  /// Build GridFS image
  Widget _buildGridFSImage(double width, double height, double radius, double iconSize) {
    return FutureBuilder<String>(
      future: _originFuture,
      builder: (context, snapshot) {
        final origin = snapshot.data;
        if (origin == null) {
          return _buildDefaultAvatar(radius, iconSize);
        }
        
        final url = '$origin$_profilePicture?v=$_profilePictureRefreshKey';
        return Image.network(
          url,
          width: width,
          height: height,
          fit: BoxFit.cover,
          errorBuilder: (context, error, stackTrace) {
            _logError('Error loading GridFS profile picture', error);
            return _buildDefaultAvatar(radius, iconSize);
          },
          loadingBuilder: (context, child, loadingProgress) {
            if (loadingProgress == null) return child;
            return Container(
              width: width,
              height: height,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.grey[300],
              ),
              child: Center(
                child: CircularProgressIndicator(
                  value: loadingProgress.expectedTotalBytes != null
                      ? loadingProgress.cumulativeBytesLoaded / loadingProgress.expectedTotalBytes!
                      : null,
                  color: const Color(0xFF242C5B),
                ),
              ),
            );
          },
        );
      },
    );
  }

  /// Build server image
  Widget _buildServerImage(double width, double height, double radius, double iconSize) {
    return FutureBuilder<String>(
      future: _originFuture,
      builder: (context, snapshot) {
        final origin = snapshot.data;
        if (origin == null || widget.user.id.isEmpty) {
          return _buildDefaultAvatar(radius, iconSize);
        }
        
        final url = '$origin/api/user/${widget.user.id}/profile-picture?${DateTime.now().millisecondsSinceEpoch}';
        return Image.network(
          url,
          width: width,
          height: height,
          fit: BoxFit.cover,
          errorBuilder: (context, error, stackTrace) {
            _logError('Error loading server profile picture', error);
            return _buildDefaultAvatar(radius, iconSize);
          },
        );
      },
    );
  }

  /// Unified error logging for consistent debugging
  void _logError(String message, dynamic error) {
    final platform = kIsWeb ? 'WEB' : 'MOBILE';
    LoggingService.instance.error('[$platform] $message', error);
  }

  /// Builds default avatar when profile picture is not available
  Widget _buildDefaultAvatar(double radius, double iconSize) {
    return CircleAvatar(
      radius: radius,
      backgroundColor: Colors.grey,
      child: Icon(
        Icons.person,
        size: iconSize,
        color: Colors.white,
      ),
    );
  }

  Future<void> _pickImage() async {
    final picker = ImagePicker();
    XFile? pickedFile;
    
    if (kIsWeb) {
      // Web: Only gallery access is available
      try {
        pickedFile = await picker.pickImage(source: ImageSource.gallery);
      } catch (e) {
        LoggingService.instance.error('Web image picker error', e);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Error accessing gallery: $e')),
          );
        }
        return;
      }
    } else {
      // For mobile, show a dialog to choose between camera and gallery
      final ImageSource? source = await showDialog<ImageSource>(
        context: context,
        builder: (BuildContext context) {
          return AlertDialog(
            title: const Text('Select Image Source'),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                ListTile(
                  leading: const Icon(Icons.camera_alt),
                  title: const Text('Camera'),
                  onTap: () => Navigator.pop(context, ImageSource.camera),
                ),
                ListTile(
                  leading: const Icon(Icons.photo_library),
                  title: const Text('Gallery'),
                  onTap: () => Navigator.pop(context, ImageSource.gallery),
                ),
              ],
            ),
          );
        },
      );
      
      if (source != null) {
        try {
          // Check and request permissions
          if (source == ImageSource.camera) {
            final status = await Permission.camera.request();
            if (!status.isGranted) {
              if (mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Camera permission is required to take photos')),
                );
              }
              return;
            }
          } else if (source == ImageSource.gallery) {
            // Request storage permission for gallery access
            final status = await Permission.storage.request();
            if (!status.isGranted) {
              // Try photos permission as fallback (for newer Android versions)
              final photosStatus = await Permission.photos.request();
              if (!photosStatus.isGranted) {
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Storage permission is required to select images from gallery'),
                    ),
                  );
                }
                return;
              }
            }
          }
          
          pickedFile = await picker.pickImage(source: source);
        } catch (e) {
          LoggingService.instance.error('Permission or image picker error', e);
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text('Error accessing image: $e')),
            );
          }
        }
      }
    }
    
    if (pickedFile != null) {
      try {
        final bytes = await pickedFile.readAsBytes();
        final base64Image = 'data:${pickedFile.mimeType ?? 'image/png'};base64,${base64Encode(bytes)}';
        await _uploadProfileImage(base64Image);
      } catch (e) {
        if (mounted) {
          LoggingService.instance.error('Error processing image', e);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Error processing image: $e')),
          );
        }
      }
    }
  }

  Future<void> _uploadProfileImage(String base64Image) async {
    try {
      LoggingService.instance.info('Starting profile picture upload in account settings...', {
        'userId': widget.user.id,
        'imageLength': base64Image.length,
        'mimeType': base64Image.contains('data:image/jpeg') ? 'image/jpeg' : 
                   base64Image.contains('data:image/png') ? 'image/png' : 'unknown'
      });
      
      // Try GridFS upload first
      try {
        final bytes = base64Decode(base64Image.split(',').last);
        final result = await FileUploadService.uploadProfilePictureBytesToGridFS(
          userId: widget.user.id,
          bytes: bytes,
          fileName: 'profile_${widget.user.id}_${DateTime.now().millisecondsSinceEpoch}.jpg',
        );
        
        if (result['success'] == true) {
          await _handleSuccessfulUpload(result);
          return;
        }
      } catch (e) {
        LoggingService.instance.warning('GridFS upload failed, trying base64 fallback', {
          'error': e.toString()
        });
      }
      
      // Fallback to base64 upload
      final origin = await _originFuture;
      final result = await FileUploadService.uploadProfilePictureBase64(
        userId: widget.user.id,
        base64Image: base64Image,
        apiBaseUrl: origin,
      );
      
      if (mounted) {
        if (result['success'] == true) {
          await _handleSuccessfulUpload(result);
        } else {
          final errorMessage = result['error'] ?? 'Upload failed';
          LoggingService.instance.error('Profile picture upload failed', {
            'userId': widget.user.id,
            'error': errorMessage
          });
          
          String userMessage = 'Upload failed';
          if (errorMessage.contains('Invalid File Type')) {
            userMessage = 'Unsupported image format. Please try a different image (JPEG, PNG, GIF, WebP, BMP, TIFF, SVG, ICO, AVIF, HEIC, HEIF).';
          } else if (errorMessage.contains('File too large')) {
            userMessage = 'Image too large. Please select a smaller image (max 10MB).';
          } else {
            userMessage = 'Upload failed: $errorMessage';
          }
          
          _showErrorSnackBar(userMessage);
        }
      }
    } catch (e) {
      if (mounted) {
        LoggingService.instance.error('Exception during profile picture upload', e);
        _showErrorSnackBar('Error updating profile picture: $e');
      }
    }
  }

  /// Handle successful profile picture upload
  Future<void> _handleSuccessfulUpload(Map<String, dynamic> result) async {
    if (!mounted) return;
    
    final profilePictureUrl = result['imageUrl'] ?? result['profilePicture'];
    final warning = result['warning'];
    
    LoggingService.instance.info('Handling successful upload', {
      'userId': widget.user.id,
      'oldProfilePicture': widget.user.profilePicture,
      'newProfilePicture': profilePictureUrl,
      'result': result
    });
    
    // Update user profile in database
    if (mounted) {
      try {
        final updateResult = await ApiService.updateUser(widget.user.id, {
          'profilePicture': profilePictureUrl,
        });
        
        if (mounted) {
          if (updateResult != null) {
            LoggingService.instance.info('Profile picture updated in user record', {
              'userId': widget.user.id,
              'oldProfilePicture': widget.user.profilePicture,
              'newProfilePicture': profilePictureUrl,
              'updatedUserProfilePicture': updateResult.profilePicture
            });
            
            // Update the local user object to reflect the new profile picture
            // Note: We can't directly assign to widget.user since it's final
            // The parent widget will handle the user update through the callback
          } else {
            LoggingService.instance.warning('Failed to update user profile in database', {
              'userId': widget.user.id,
              'imageUrl': profilePictureUrl
            });
          }
        }
      } catch (e) {
        if (mounted) {
          LoggingService.instance.error('Error updating user profile in database', e);
        }
      }
    }
    
    // Update local state
    if (mounted) {
      setState(() {
        _profilePicture = profilePictureUrl;
      });
    }
    
    // Update user model and notify parent
    final updatedUser = widget.user.copyWith(profilePicture: profilePictureUrl);
    widget.onSave(updatedUser);
    
    // Force refresh the profile picture display
    _refreshProfilePicture();
    
    // Show success message
    if (mounted) {
      if (warning != null) {
        _showSuccessSnackBar('Profile picture updated (using fallback method)');
      } else {
        _showSuccessSnackBar('Profile picture updated successfully!');
      }
    }
    
    LoggingService.instance.info('Profile picture updated successfully', {
      'userId': widget.user.id,
      'profilePicture': profilePictureUrl,
      'warning': warning
    });
  }

  void _showProfilePictureDialog() {
    showDialog(
      context: context,
      builder: (context) => Dialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              ClipOval(
                child: _buildProfilePicture(160, 160, 80, 80),
              ),
              const SizedBox(height: 16),
              OutlinedButton.icon(
                icon: const Icon(Icons.edit, size: 18),
                label: const Text('Edit Picture'),
                style: OutlinedButton.styleFrom(
                  backgroundColor: Colors.white,
                  foregroundColor: const Color(0xFF1B2A59),
                  side: const BorderSide(color: Color(0xFF1B2A59), width: 2),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
                onPressed: () async {
                  Navigator.pop(context);
                  await _pickImage();
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final mediaSize = MediaQuery.of(context).size;
    // Match Smart Assistant: white app bar, light grey body
    const Color bodyBackground = Color(0xFFF5F5F5); // grey[50]-like

    return Scaffold(
      backgroundColor: bodyBackground,
      appBar: AppBar(
        elevation: 0,
        backgroundColor: Colors.transparent,
        iconTheme: const IconThemeData(color: Colors.white),
        centerTitle: true,
        flexibleSpace: Container(
          decoration: const BoxDecoration(
            image: DecorationImage(
              image: AssetImage('assets/images/istetik.png'),
              fit: BoxFit.cover,
            ),
          ),
        ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, size: 20),
          onPressed: () => Navigator.maybePop(context),
          padding: EdgeInsets.zero,
        ),
        title: const Text(
          'Account Settings',
          style: TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.w600,
            color: Colors.white,
          ),
        ),
      ),
      body: Stack(
        fit: StackFit.expand,
        children: [
          Positioned.fill(
            child: Container(color: bodyBackground),
          ),
          FadeTransition(
            opacity: _fadeInAnimation,
            child: RefreshIndicator(
              onRefresh: _refreshAccountSettings,
              color: const Color(0xFF1B2A59),
              backgroundColor: bodyBackground,
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: EdgeInsets.all(mediaSize.width * 0.05),
                child: Form(
                  key: _formKey,
                  child: Column(
                    children: [
                      _buildProfilePictureSection(mediaSize),
                      SizedBox(height: mediaSize.height * 0.03),
                      _buildPersonalInfoSection(mediaSize),
                      SizedBox(height: mediaSize.height * 0.03),
                      _buildPasswordChangeSection(mediaSize),
                      SizedBox(height: mediaSize.height * 0.03),
                      _buildSaveButton(mediaSize),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // Helper methods for improved form components
  Widget _buildProfilePictureSection(Size mediaSize) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        children: [
          Text(
            "Profile Picture",
            style: TextStyle(
              fontSize: mediaSize.width < 400 ? 16 : 18,
              fontWeight: FontWeight.bold,
              color: const Color(0xFF1B2A59),
            ),
          ),
          const SizedBox(height: 20),
          SizedBox(
            width: double.infinity,
            child: Center(
              child: GestureDetector(
                onTap: _showProfilePictureDialog,
                child: Stack(
                  alignment: Alignment.bottomRight,
                  children: [
                    Container(
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: const Color(0xFF1B2A59),
                          width: 3,
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.1),
                            blurRadius: 8,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      child: ClipOval(
                        child: _buildProfilePicture(100, 100, 50, 60),
                      ),
                    ),
                    Positioned(
                      bottom: 0,
                      right: 0,
                      child: Container(
                        decoration: BoxDecoration(
                          color: const Color(0xFF1B2A59),
                          shape: BoxShape.circle,
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.2),
                              blurRadius: 4,
                              offset: const Offset(0, 2),
                            ),
                          ],
                        ),
                        padding: const EdgeInsets.all(8),
                        child: const Icon(
                          Icons.camera_alt,
                          size: 20,
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          const SizedBox(height: 12),
          Text(
            "Tap to change profile picture",
            style: TextStyle(
              fontSize: 14,
              color: Colors.grey[600],
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPersonalInfoSection(Size mediaSize) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            "Personal Information",
            style: TextStyle(
              fontSize: mediaSize.width < 400 ? 16 : 18,
              fontWeight: FontWeight.bold,
              color: const Color(0xFF1B2A59),
            ),
          ),
          const SizedBox(height: 20),
          _buildLabel("Full Name", mediaSize),
          const SizedBox(height: 8),
          _buildInputField(
            controller: _fullnameController,
            hintText: "Enter your full name",
            icon: Icons.person_outline,
            validator: (value) {
              if (value == null || value.trim().isEmpty) {
                return 'Full name is required';
              }
              if (value.trim().length < 2) {
                return 'Full name must be at least 2 characters';
              }
              return null;
            },
            maxLength: 50,
          ),
          const SizedBox(height: 20),
          _buildLabel("Username", mediaSize),
          const SizedBox(height: 8),
          _buildInputField(
            controller: _usernameController,
            hintText: "Choose a username",
            icon: Icons.alternate_email,
            validator: (value) {
              if (value == null || value.trim().isEmpty) {
                return 'Username is required';
              }
              if (!_isValidUsername(value.trim())) {
                return 'Username must be 3-20 characters and contain only letters, numbers, and underscores';
              }
              return null;
            },
            maxLength: 20,
          ),
          const SizedBox(height: 20),
          _buildLabel("Birthday", mediaSize),
          const SizedBox(height: 8),
          _buildDateField(),
          const SizedBox(height: 20),
          _buildLabel("Gender", mediaSize),
          const SizedBox(height: 8),
          _buildGenderDropdown(),
          const SizedBox(height: 20),
          _buildLabel("Employment Status", mediaSize),
          const SizedBox(height: 8),
          _buildEmploymentStatusDropdown(),
        ],
      ),
    );
  }

  Widget _buildPasswordChangeSection(Size mediaSize) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.lock_outline, color: const Color(0xFF1B2A59), size: 24),
              const SizedBox(width: 12),
              Text(
                "Change Password",
                style: TextStyle(
                  fontSize: mediaSize.width < 400 ? 16 : 18,
                  fontWeight: FontWeight.bold,
                  color: const Color(0xFF1B2A59),
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          _buildLabel("Current Password", mediaSize),
          const SizedBox(height: 8),
          _buildPasswordField(
            controller: _currentPasswordController,
            hintText: "Enter current password",
            isPassword: _showCurrentPassword,
            onTogglePassword: () => setState(() => _showCurrentPassword = !_showCurrentPassword),
          ),
          const SizedBox(height: 20),
          _buildLabel("New Password", mediaSize),
          const SizedBox(height: 8),
          _buildPasswordField(
            controller: _newPasswordController,
            hintText: "Enter new password",
            isPassword: _showNewPassword,
            onTogglePassword: () => setState(() => _showNewPassword = !_showNewPassword),
          ),
          const SizedBox(height: 20),
          _buildLabel("Confirm New Password", mediaSize),
          const SizedBox(height: 8),
          _buildPasswordField(
            controller: _confirmPasswordController,
            hintText: "Confirm new password",
            isPassword: _showConfirmPassword,
            onTogglePassword: () => setState(() => _showConfirmPassword = !_showConfirmPassword),
          ),
          const SizedBox(height: 16),
          if (_otpSent) ...[
            const SizedBox(height: 12),
            _buildLabel('Enter 6-digit OTP from email', mediaSize),
            const SizedBox(height: 8),
            TextField(
              controller: _otpController,
              keyboardType: TextInputType.number,
              maxLength: 6,
              inputFormatters: [FilteringTextInputFormatter.digitsOnly],
              decoration: InputDecoration(
                hintText: '000000',
                prefixIcon: Icon(Icons.sms_outlined, color: Colors.grey[600]),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Colors.grey[300]!)),
                focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFF1B2A59), width: 2)),
                counterText: '',
              ),
              style: const TextStyle(fontSize: 18, letterSpacing: 8),
            ),
            const SizedBox(height: 20),
          ],
          Row(
            children: [
              Expanded(
                child: _buildActionButton(
                  onPressed: _isSendingOtp ? null : _sendOtpForPasswordChange,
                  text: 'Send OTP',
                  icon: Icons.send,
                  isLoading: _isSendingOtp,
                  backgroundColor: const Color(0xFF1B2A59),
                  outlined: true,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildActionButton(
                  onPressed: _isChangingPassword ? null : _verifyOtpAndChangePassword,
                  text: 'Verify OTP',
                  icon: Icons.verified,
                  isLoading: _isChangingPassword,
                  backgroundColor: Colors.green[600]!,
                  outlined: true,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildSaveButton(Size mediaSize) {
    const darkBlue = Color(0xFF1B2A59);
    return SizedBox(
      width: double.infinity,
      height: 56,
      child: OutlinedButton(
        style: OutlinedButton.styleFrom(
          backgroundColor: Colors.white,
          foregroundColor: darkBlue,
          side: const BorderSide(color: darkBlue, width: 2),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        ),
        onPressed: _isSaving ? null : _saveChanges,
        child: _isSaving
            ? const SizedBox(
                height: 24,
                width: 24,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF1B2A59)),
                ),
              )
            : Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.save, color: Color(0xFF1B2A59), size: 20),
                  const SizedBox(width: 8),
                  Text(
                    "Save Changes",
                    style: TextStyle(
                      fontSize: mediaSize.width < 400 ? 14 : 16,
                      fontWeight: FontWeight.bold,
                      color: darkBlue,
                    ),
                  ),
                ],
              ),
      ),
    );
  }

  Widget _buildLabel(String text, Size mediaSize) {
    return Text(
      text,
      style: TextStyle(
        color: const Color(0xFF1B2A59),
        fontSize: mediaSize.width < 400 ? 14 : 16,
        fontWeight: FontWeight.w600,
      ),
    );
  }

  Widget _buildInputField({
    required TextEditingController controller,
    required String hintText,
    required IconData icon,
    String? Function(String?)? validator,
    int? maxLength,
    TextInputType? keyboardType,
  }) {
    return TextFormField(
      controller: controller,
      validator: validator,
      maxLength: maxLength,
      keyboardType: keyboardType,
      decoration: InputDecoration(
        hintText: hintText,
        prefixIcon: Icon(icon, color: Colors.grey[600]),
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
          borderSide: BorderSide(color: const Color(0xFF1B2A59), width: 2),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: Colors.red[300]!, width: 2),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: Colors.red[600]!, width: 2),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        filled: true,
        fillColor: Colors.grey[50],
        counterText: '', // Hide character counter
      ),
      style: const TextStyle(fontSize: 16),
    );
  }

  Widget _buildDateField() {
    return TextField(
      controller: _birthdayController,
      readOnly: true,
      onTap: _selectBirthday,
      decoration: InputDecoration(
        hintText: "Select your birthday",
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
          borderSide: BorderSide(color: const Color(0xFF1B2A59), width: 2),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        filled: true,
        fillColor: Colors.grey[50],
      ),
      style: const TextStyle(fontSize: 16),
    );
  }

  Widget _buildPasswordField({
    required TextEditingController controller,
    required String hintText,
    required bool isPassword,
    required VoidCallback onTogglePassword,
  }) {
    return TextField(
      controller: controller,
      obscureText: !isPassword,
      decoration: InputDecoration(
        hintText: hintText,
        prefixIcon: Icon(Icons.lock_outline, color: Colors.grey[600]),
        suffixIcon: IconButton(
          icon: Icon(
            isPassword ? Icons.visibility : Icons.visibility_off,
            color: Colors.grey[600],
          ),
          onPressed: onTogglePassword,
        ),
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
          borderSide: BorderSide(color: const Color(0xFF1B2A59), width: 2),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        filled: true,
        fillColor: Colors.grey[50],
      ),
      style: const TextStyle(fontSize: 16),
    );
  }

  Widget _buildActionButton({
    required VoidCallback? onPressed,
    required String text,
    required IconData icon,
    required bool isLoading,
    required Color backgroundColor,
    bool outlined = false,
  }) {
    final Color color = backgroundColor;
    return SizedBox(
      height: 48,
      child: outlined
          ? OutlinedButton.icon(
              onPressed: onPressed,
              style: OutlinedButton.styleFrom(
                backgroundColor: Colors.white,
                foregroundColor: color,
                side: BorderSide(color: color, width: 2),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              icon: isLoading
                  ? SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        valueColor: AlwaysStoppedAnimation<Color>(color),
                      ),
                    )
                  : Icon(icon, size: 18),
              label: Text(
                text,
                style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
              ),
            )
          : ElevatedButton.icon(
              onPressed: onPressed,
              style: ElevatedButton.styleFrom(
                backgroundColor: backgroundColor,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                elevation: 0,
              ),
              icon: isLoading
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                      ),
                    )
                  : Icon(icon, size: 18),
              label: Text(
                text,
                style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
              ),
            ),
    );
  }

  Future<void> _saveChanges() async {
    // Validate form first
    if (!_formKey.currentState!.validate()) {
      _showErrorSnackBar('Please fix the errors above');
      return;
    }

    // Additional validation
    if (_birthdayController.text.trim().isEmpty) {
      _showErrorSnackBar('Please select your birthday');
      return;
    }

    // Check if there are any changes
    final updates = <String, dynamic>{};
    if (_fullnameController.text.trim() != widget.user.fullName) {
      updates['fullName'] = _fullnameController.text.trim();
    }
    if (_usernameController.text.trim() != widget.user.username) {
      updates['username'] = _usernameController.text.trim();
    }
    if (_birthdayController.text.trim() != widget.user.birthday) {
      updates['birthday'] = _birthdayController.text.trim();
    }
    if (_selectedGender != widget.user.gender) {
      updates['gender'] = _selectedGender;
    }
    if (_selectedEmploymentStatus != widget.user.employmentStatus) {
      updates['employmentStatus'] = _selectedEmploymentStatus;
    }

    if (updates.isEmpty) {
      _showSuccessSnackBar('No changes to save');
      return;
    }

    setState(() => _isSaving = true);
    LoggingService.instance.info('Updating user id: ${widget.user.id}');
    LoggingService.instance.info('Updates: $updates');
    
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => const Center(
        child: CircularProgressIndicator(
          valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF1B2A59)),
        ),
      ),
    );
    
    try {
      final updatedUser = await ApiService.updateUser(widget.user.id, updates);
      if (mounted) {
        Navigator.pop(context); // Remove loading dialog
        setState(() => _isSaving = false);
        
        if (updatedUser != null) {
          widget.onSave(updatedUser);
          _showSuccessSnackBar('Account updated successfully!');
          // Don't pop the account settings page - let user stay on it
        } else {
          _showErrorSnackBar('Failed to update account. Please check your info and try again.');
        }
      }
    } catch (e) {
      if (mounted) {
        Navigator.pop(context); // Remove loading dialog
        setState(() => _isSaving = false);
        _showErrorSnackBar('Error updating account: $e');
      }
    }
  }


  Widget _buildGenderDropdown() {
    return DropdownButtonFormField<String>(
      initialValue: _selectedGender,
      decoration: InputDecoration(
        hintText: "Select your gender",
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
          borderSide: BorderSide(color: const Color(0xFF1B2A59), width: 2),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        filled: true,
        fillColor: Colors.grey[50],
      ),
      onChanged: (String? newValue) {
        if (newValue != null) {
          setState(() {
            _selectedGender = newValue;
          });
        }
      },
      items: const [
        DropdownMenuItem<String>(value: 'Male', child: Text('Male')),
        DropdownMenuItem<String>(value: 'Female', child: Text('Female')),
        DropdownMenuItem<String>(value: 'Prefer not to say', child: Text('Prefer not to say')),
      ],
    );
  }

  Widget _buildEmploymentStatusDropdown() {
    return DropdownButtonFormField<String>(
      initialValue: _selectedEmploymentStatus,
      isExpanded: true,
      decoration: InputDecoration(
        hintText: "Select employment status",
        prefixIcon: Icon(Icons.work_outline, color: Colors.grey[600]),
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
          borderSide: BorderSide(color: const Color(0xFF1B2A59), width: 2),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        filled: true,
        fillColor: Colors.grey[50],
      ),
      onChanged: (String? newValue) {
        if (newValue != null) {
          setState(() {
            _selectedEmploymentStatus = newValue;
          });
        }
      },
      items: const [
        DropdownMenuItem<String>(
          value: 'Student',
          child: Text(
            'Student',
            overflow: TextOverflow.ellipsis,
            maxLines: 1,
          ),
        ),
        DropdownMenuItem<String>(
          value: 'Prefer not to say',
          child: Text(
            'Prefer not to say',
            overflow: TextOverflow.ellipsis,
            maxLines: 1,
          ),
        ),
        DropdownMenuItem<String>(
          value: 'Employed',
          child: Text(
            'Employed',
            overflow: TextOverflow.ellipsis,
            maxLines: 1,
          ),
        ),
      ],
    );
  }

  // Send OTP for password change. OTP input appears inline on the page (no modal).
  Future<void> _sendOtpForPasswordChange() async {
    if (_currentPasswordController.text.isEmpty) {
      _showErrorSnackBar('Please enter your current password');
      return;
    }
    if (_newPasswordController.text.isEmpty) {
      _showErrorSnackBar('Please enter your new password');
      return;
    }
    if (_confirmPasswordController.text.isEmpty) {
      _showErrorSnackBar('Please confirm your new password');
      return;
    }
    if (_newPasswordController.text != _confirmPasswordController.text) {
      _showErrorSnackBar('New passwords do not match');
      return;
    }
    if (!_isValidPassword(_newPasswordController.text)) {
      _showErrorSnackBar('Password must contain at least 8 characters, 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character (!@#\$%^&*(),.?\":{}|<>)');
      return;
    }
    if (_currentPasswordController.text == _newPasswordController.text) {
      _showErrorSnackBar('New password must be different from current password');
      return;
    }

    setState(() => _isSendingOtp = true);
    FocusScope.of(context).unfocus();

    try {
      final result = await ApiService.sendPasswordChangeOTP(widget.user.email, widget.user.fullName);
      if (!mounted) return;
      if (result['success'] == true) {
        _otpController.clear();
        setState(() => _otpSent = true);
        _showSuccessSnackBar('OTP sent! Enter the 6-digit code below.');
      } else {
        _showErrorSnackBar('Failed to send OTP: ${result['error'] ?? 'Unknown error'}');
      }
    } catch (e) {
      if (mounted) _showErrorSnackBar('Error sending OTP: $e');
    } finally {
      if (mounted) setState(() => _isSendingOtp = false);
    }
  }

  // Verify OTP and change password
  Future<void> _verifyOtpAndChangePassword() async {
    if (_otpController.text.isEmpty) {
      _showErrorSnackBar('Please enter the OTP code');
      return;
    }

    if (_otpController.text.length != 6) {
      _showErrorSnackBar('OTP must be 6 digits');
      return;
    }

    setState(() => _isChangingPassword = true);

    try {
      // Verify OTP first
      final otpResult = await ApiService.verifyPasswordChangeOTP(widget.user.email, _otpController.text);
      
      if (otpResult['success'] == true) {
        // OTP verified, now change password
        final result = await ApiService.changePassword(
          widget.user.id, 
          _currentPasswordController.text, 
          _newPasswordController.text
        );
        
        if (result['success'] == true) {
          _currentPasswordController.clear();
          _newPasswordController.clear();
          _confirmPasswordController.clear();
          _otpController.clear();
          setState(() => _otpSent = false);
          _showSuccessSnackBar('Password changed successfully!');
        } else {
          _showErrorSnackBar('Password change failed: ${result['error'] ?? 'Unknown error'}');
        }
      } else {
        _showErrorSnackBar('OTP verification failed: ${otpResult['error'] ?? 'Invalid OTP'}');
      }
    } catch (e) {
      _showErrorSnackBar('Error changing password: $e');
    } finally {
      setState(() => _isChangingPassword = false);
    }
  }

  // Helper methods for better user feedback
  void _showErrorSnackBar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const Icon(Icons.error, color: Colors.white, size: 20),
            const SizedBox(width: 8),
            Expanded(child: Text(message)),
          ],
        ),
        backgroundColor: Colors.red[600],
        duration: const Duration(seconds: 4),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      ),
    );
  }

  void _showSuccessSnackBar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const Icon(Icons.check_circle, color: Colors.white, size: 20),
            const SizedBox(width: 8),
            Expanded(child: Text(message)),
          ],
        ),
        backgroundColor: Colors.green[600],
        duration: const Duration(seconds: 3),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      ),
    );
  }

  // Password validation
  bool _isValidPassword(String password) {
    final hasMinLength = password.length >= 8;
    final hasUpper = password.contains(RegExp(r'[A-Z]'));
    final hasLower = password.contains(RegExp(r'[a-z]'));
    final hasDigit = password.contains(RegExp(r'[0-9]'));
    final hasSpecial = password.contains(RegExp(r'[!@#\$%^&*(),.?\":{}|<>]'));
    return hasMinLength && hasUpper && hasLower && hasDigit && hasSpecial;
  }

   // Username validation
   bool _isValidUsername(String username) {
     if (username.length < 3) return false;
     if (username.length > 20) return false;
     if (!RegExp(r'^[a-zA-Z0-9_]+$').hasMatch(username)) return false;
     return true;
   }

   // Method to refresh profile picture display
   void _refreshProfilePicture() {
     if (mounted) {
       setState(() {
         // Force rebuild by updating the refresh key
         _profilePictureRefreshKey = DateTime.now().millisecondsSinceEpoch;
       });
     }
   }

   // Pull-to-refresh functionality for account settings
   Future<void> _refreshAccountSettings() async {
     try {
       LoggingService.instance.info('Refreshing account settings...');
       
       // Force refresh the profile picture display
       _refreshProfilePicture();
       
       // Update the local profile picture from the user model
       if (mounted) {
         setState(() {
           _profilePicture = widget.user.profilePicture;
         });
       }
       
       // Add a small delay to show the refresh indicator
       await Future.delayed(const Duration(milliseconds: 500));
       
       LoggingService.instance.info('Account settings refresh completed');
     } catch (e) {
       LoggingService.instance.error('Error refreshing account settings', e);
     }
   }
}
