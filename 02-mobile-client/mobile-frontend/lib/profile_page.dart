import 'package:flutter/material.dart';
import 'login.dart';
import 'account_settings_page.dart';
import 'usermodel.dart';
import 'help_support.dart';
import 'theme/app_theme.dart';
import 'package:image_picker/image_picker.dart';
import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'config.dart';
import 'package:permission_handler/permission_handler.dart';
import 'services/logout_service.dart';
import 'services/logging_service.dart';
import 'services/file_upload_service.dart';
import 'services/image_processing_service.dart';
import 'api/api.dart';

/// Same open animation for Account Settings and Nomu Chatbot (fade in, show in front).
PageRoute<T> _slideAndFadeRoute<T>(Widget page) {
  return PageRouteBuilder<T>(
    pageBuilder: (context, animation, secondaryAnimation) => page,
    transitionDuration: const Duration(milliseconds: 280),
    reverseTransitionDuration: const Duration(milliseconds: 220),
    opaque: false,
    transitionsBuilder: (context, animation, secondaryAnimation, child) {
      final curve = CurvedAnimation(parent: animation, curve: Curves.easeOutCubic);
      return FadeTransition(
        opacity: curve,
        child: child,
      );
    },
  );
}

class ProfilePage extends StatefulWidget {
  final Map<String, dynamic> userData;
  final ValueChanged<UserModel>? onUserUpdated;

  const ProfilePage({super.key, required this.userData, this.onUserUpdated});

  @override
  State<ProfilePage> createState() => _ProfilePageState();
}

class _ProfilePageState extends State<ProfilePage> {
  late UserModel _user;
  late Future<String> _originFuture;
  int _profilePictureRefreshKey = 0;
  bool _obscureEmail = true;

  @override
  void initState() {
    super.initState();
    
    // Validate userData before creating UserModel
    if (widget.userData.isEmpty) {
      LoggingService.instance.error('Error: userData is empty');
      _user = UserModel(); // Create empty user model
    } else {
      _user = UserModel.fromJson(widget.userData);
    }
    
    // Debug: Log user data to see what's being received
    LoggingService.instance.info('Profile page user data received', {
      'rawUserData': widget.userData,
      'userId': _user.id,
      'fullName': _user.fullName,
      'username': _user.username,
      'email': _user.email,
      'birthday': _user.birthday,
      'gender': _user.gender,
      'points': _user.points,
      'qrToken': _user.qrToken,
      'profilePicture': _user.profilePicture.isNotEmpty ? 'EXISTS (${_user.profilePicture.length} chars)' : 'EMPTY',
    });
    
    _originFuture = _computeOrigin();
  }

  void _updateUser(UserModel updatedUser) {
    if (mounted) {
      setState(() {
        _user = updatedUser;
        if (widget.onUserUpdated != null) {
          widget.onUserUpdated!(_user);
        }
      });
    }
  }

  Future<String> _computeOrigin() async {
    final api = await Config.apiBaseUrl;
    final uri = Uri.parse(api);
    return '${uri.scheme}://${uri.host}:${uri.port}';
  }

  /// Builds profile picture widget that works on both web and mobile
  Widget _buildProfilePicture(double width, double height, double radius, double iconSize) {
    _logProfilePictureInfo();
    
    final profilePictureKey = ValueKey('${_user.profilePicture}_$_profilePictureRefreshKey');
    
    // Handle different profile picture types
    if (_isBase64Image()) {
      return _buildBase64Image(width, height, radius, iconSize, profilePictureKey);
    } else if (_isGridFSImage()) {
      return _buildGridFSImage(width, height, radius, iconSize, profilePictureKey);
    } else if (_isLegacyImage()) {
      return _buildLegacyImage(radius, iconSize);
    } else {
      return _buildNetworkImage(width, height, radius, iconSize, profilePictureKey);
    }
  }

  /// Log profile picture information for debugging
  void _logProfilePictureInfo() {
    LoggingService.instance.info('Building profile picture widget', {
      'dataLength': _user.profilePicture.length,
      'containsData': _user.profilePicture.contains('data:'),
      'isFilePath': _user.profilePicture.startsWith('/uploads/'),
      'isGridFS': _user.profilePicture.startsWith('/api/profile-picture/'),
      'refreshKey': _profilePictureRefreshKey,
      'preview': _user.profilePicture.length > 50 ? _user.profilePicture.substring(0, 50) + '...' : _user.profilePicture,
    });
  }

  /// Check if profile picture is base64 encoded
  bool _isBase64Image() {
    return _user.profilePicture.isNotEmpty && _user.profilePicture.contains('data:');
  }

  /// Check if profile picture is GridFS image
  bool _isGridFSImage() {
    return _user.profilePicture.isNotEmpty && _user.profilePicture.startsWith('/api/profile-picture/');
  }

  /// Check if profile picture is legacy file path
  bool _isLegacyImage() {
    return _user.profilePicture.isNotEmpty && _user.profilePicture.startsWith('/uploads/');
  }

  /// Build base64 image widget
  Widget _buildBase64Image(double width, double height, double radius, double iconSize, Key key) {
    try {
      if (kIsWeb) {
        return Image.network(
          _user.profilePicture,
          key: key,
          width: width,
          height: height,
          fit: BoxFit.cover,
          errorBuilder: (context, error, stackTrace) {
            _logError('Error loading base64 profile picture on web', error);
            return _buildDefaultAvatar(radius, iconSize);
          },
        );
      } else {
        return Image.memory(
          base64Decode(_user.profilePicture.split(',').last),
          key: key,
          width: width,
          height: height,
          fit: BoxFit.cover,
          errorBuilder: (context, error, stackTrace) {
            _logError('Error loading base64 profile picture', error);
            return _buildDefaultAvatar(radius, iconSize);
          },
        );
      }
    } catch (e) {
      _logError('Error decoding base64 profile picture', e);
      return _buildDefaultAvatar(radius, iconSize);
    }
  }

  /// Build GridFS image widget
  Widget _buildGridFSImage(double width, double height, double radius, double iconSize, Key key) {
    return FutureBuilder<String>(
      future: _originFuture,
      builder: (context, snapshot) {
        final origin = snapshot.data;
        if (origin == null) {
          _logError('Missing origin for GridFS image', null);
          return _buildDefaultAvatar(radius, iconSize);
        }
        
        final url = '$origin${_user.profilePicture}?v=$_profilePictureRefreshKey';
        LoggingService.instance.info('Loading GridFS profile picture from: $url', {
          'platform': kIsWeb ? 'WEB' : 'MOBILE',
          'origin': origin,
          'profilePicture': _user.profilePicture,
          'refreshKey': _profilePictureRefreshKey
        });
        
        return Image.network(
          url,
          key: key,
          width: width,
          height: height,
          fit: BoxFit.cover,
          // Performance optimizations
          cacheWidth: (width * MediaQuery.of(context).devicePixelRatio).round(),
          cacheHeight: (height * MediaQuery.of(context).devicePixelRatio).round(),
          filterQuality: FilterQuality.medium, // Balance between quality and speed
          isAntiAlias: true,
          // Caching for faster subsequent loads
          frameBuilder: (context, child, frame, wasSynchronouslyLoaded) {
            if (wasSynchronouslyLoaded) return child;
            return AnimatedOpacity(
              opacity: frame == null ? 0 : 1,
              duration: const Duration(milliseconds: 200),
              curve: Curves.easeOut,
              child: child,
            );
          },
          loadingBuilder: (context, child, loadingProgress) {
            if (loadingProgress == null) return child;
            return _buildLoadingWidget(width, height, loadingProgress);
          },
          errorBuilder: (context, error, stackTrace) {
            _logError('Error loading GridFS profile picture', error);
            LoggingService.instance.error('GridFS image load failed', {
              'url': url,
              'platform': kIsWeb ? 'WEB' : 'MOBILE',
              'error': error.toString(),
              'stackTrace': stackTrace.toString()
            });
            return _buildDefaultAvatar(radius, iconSize);
          },
        );
      },
    );
  }

  /// Build legacy image widget
  Widget _buildLegacyImage(double radius, double iconSize) {
    LoggingService.instance.info('Legacy file path detected, displaying image', {
      'profilePicture': _user.profilePicture,
      'message': 'Displaying uploaded file'
    });
    return _buildNetworkImage(radius * 2, radius * 2, radius, iconSize, ValueKey('legacy_${_user.profilePicture}'));
  }

  /// Build network image widget
  Widget _buildNetworkImage(double width, double height, double radius, double iconSize, Key key) {
    return FutureBuilder<String>(
      future: _originFuture,
      builder: (context, snapshot) {
        final origin = snapshot.data;
        if (origin == null) {
          _logError('Missing origin for network image', null);
          return _buildDefaultAvatar(radius, iconSize);
        }
        
        // Handle different URL types
        String url;
        
        // Check if user has a profile picture set
        if (_user.profilePicture.isEmpty || _user.profilePicture.trim().isEmpty) {
          // No profile picture set - use default avatar
          LoggingService.instance.info('User has no profile picture set - using default avatar', {
            'userId': _user.id,
          });
          return _buildDefaultAvatar(radius, iconSize);
        }
        
        if (_user.profilePicture.startsWith('/uploads/')) {
          // Direct file URL
          url = '$origin${_user.profilePicture}?v=$_profilePictureRefreshKey';
        } else if (_user.profilePicture.startsWith('/api/')) {
          // API endpoint URL
          url = '$origin${_user.profilePicture}?v=$_profilePictureRefreshKey';
        } else if (_user.id.isNotEmpty) {
          // Fallback to user profile endpoint (only if profilePicture field has some value)
          url = '$origin/api/user/${_user.id}/profile-picture?${DateTime.now().millisecondsSinceEpoch}';
        } else {
          LoggingService.instance.warning('Cannot construct URL for profile picture', {
            'userId': _user.id,
            'profilePicture': _user.profilePicture,
          });
          return _buildDefaultAvatar(radius, iconSize);
        }
        
        LoggingService.instance.info('Loading network profile picture', {
          'url': url,
          'profilePicture': _user.profilePicture,
          'refreshKey': _profilePictureRefreshKey
        });
        
        return Image.network(
          url,
          key: key,
          width: width,
          height: height,
          fit: BoxFit.cover,
          // Performance optimizations
          cacheWidth: (width * MediaQuery.of(context).devicePixelRatio).round(),
          cacheHeight: (height * MediaQuery.of(context).devicePixelRatio).round(),
          filterQuality: FilterQuality.medium, // Balance between quality and speed
          isAntiAlias: true,
          // Caching for faster subsequent loads
          frameBuilder: (context, child, frame, wasSynchronouslyLoaded) {
            if (wasSynchronouslyLoaded) return child;
            return AnimatedOpacity(
              opacity: frame == null ? 0 : 1,
              duration: const Duration(milliseconds: 200),
              curve: Curves.easeOut,
              child: child,
            );
          },
          loadingBuilder: (context, child, loadingProgress) {
            if (loadingProgress == null) return child;
            return _buildLoadingWidget(width, height, loadingProgress);
          },
          errorBuilder: (context, error, stackTrace) {
            // Check if error is a 404 (expected when user has no profile picture)
            final errorString = error.toString().toLowerCase();
            final is404Error = errorString.contains('404') || 
                             errorString.contains('not found') ||
                             (errorString.contains('http') && errorString.contains('failed'));
            
            if (is404Error) {
              // 404 is expected when user doesn't have a profile picture - log as info, not error
              LoggingService.instance.info('Profile picture not found (404) - using default avatar', {
                'url': url,
                'userId': _user.id,
              });
            } else {
              // Log actual errors (network failures, etc.)
              _logError('Error loading network profile picture', error);
              LoggingService.instance.error('Network image load failed', {
                'url': url,
                'error': error.toString(),
                'stackTrace': stackTrace.toString()
              });
            }
            return _buildDefaultAvatar(radius, iconSize);
          },
        );
      },
    );
  }

  /// Build loading widget for image loading
  Widget _buildLoadingWidget(double width, double height, ImageChunkEvent loadingProgress) {
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
        // Check if file needs processing and show warning
        final fileExtension = pickedFile.name.split('.').last.toLowerCase();
        final needsProcessing = ImageProcessingService.needsProcessing('.$fileExtension');
        final warning = ImageProcessingService.getBrowserCompatibilityWarning('.$fileExtension');
        
        if (needsProcessing && warning != null && mounted) {
          // Show warning dialog for problematic file types
          final shouldContinue = await showDialog<bool>(
            context: context,
            builder: (context) => AlertDialog(
              title: const Text('File Format Warning'),
              content: Text(warning),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(context, false),
                  child: const Text('Cancel'),
                ),
                TextButton(
                  onPressed: () => Navigator.pop(context, true),
                  child: const Text('Continue'),
                ),
              ],
            ),
          );
          
          if (shouldContinue != true) {
            return; // User cancelled
          }
        }
        
        // Use simplified GridFS upload method
        await _uploadProfileImage(pickedFile);
      } catch (e) {
        LoggingService.instance.error('Error uploading profile image', e);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Error uploading profile image: $e'),
              backgroundColor: Colors.red,
              duration: const Duration(seconds: 5),
            ),
          );
        }
      }
    }
  }

  /// Simplified profile image upload using GridFS
  Future<void> _uploadProfileImage(XFile pickedFile) async {
    try {
      // Check if user ID is valid before attempting upload
      if (_user.id.isEmpty) {
        LoggingService.instance.error('Cannot upload profile picture: User ID is empty');
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Error: User ID is missing. Please log in again.')),
          );
        }
        return;
      }

      LoggingService.instance.info('Uploading profile picture for user: ${_user.id}');
      
      // Use GridFS upload with proper error handling
      // Read file bytes once for both upload and preloading
      final imageBytes = await pickedFile.readAsBytes();
      
      LoggingService.instance.info('Starting profile picture upload', {
        'userId': _user.id,
        'fileName': pickedFile.name,
        'fileSize': imageBytes.length,
        'mimeType': pickedFile.mimeType
      });
      
      // Show preview immediately for better UX
      if (mounted) {
        setState(() {
          _user = _user.copyWith(profilePicture: 'data:image/jpeg;base64,${base64Encode(imageBytes)}');
        });
      }
      
      // Preload image for instant display
      _preloadImage(imageBytes);
      
      final result = await FileUploadService.uploadProfilePictureBytesToGridFS(
        userId: _user.id,
        bytes: imageBytes,
        fileName: pickedFile.name,
      );
      
      if (result['success'] == true) {
        final profilePictureUrl = result['imageUrl'] ?? result['profilePicture'];
        final fileInfo = result['fileInfo'];
        final warning = result['warning'];
        
        if (mounted) {
          setState(() {
            _user = _user.copyWith(profilePicture: profilePictureUrl);
          });
          
          // Wait a moment for server processing, then refresh
          Future.delayed(const Duration(milliseconds: 500), () {
            if (mounted) {
              _refreshProfilePicture();
              _refreshUserData(); // Fetch updated user data from database
              // Force another rebuild to ensure UI updates
              setState(() {});
            }
          });
        }
        
        LoggingService.instance.info('Profile picture updated successfully via GridFS upload', {
          'userId': _user.id,
          'profilePicture': profilePictureUrl,
          'fileInfo': fileInfo,
          'warning': warning
        });
        
        if (mounted) {
          // Show success message
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(warning != null ? 'Profile picture updated (with warning)' : 'Profile picture updated successfully!'),
              backgroundColor: warning != null ? Colors.orange : Colors.green,
              duration: const Duration(seconds: 3),
            ),
          );
          
          // Show warning if present
          if (warning != null) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(warning),
                backgroundColor: Colors.orange,
                duration: const Duration(seconds: 5),
              ),
            );
          }
        }
      } else {
        final errorMessage = result['error'] ?? 'Upload failed';
        LoggingService.instance.error('GridFS upload failed: $errorMessage', {
          'userId': _user.id,
          'fileName': pickedFile.name,
          'fileSize': (await pickedFile.readAsBytes()).length,
          'error': errorMessage,
          'result': result
        });
        
        // Show user-friendly error message
        if (mounted) {
          String userMessage = 'Upload failed';
          if (errorMessage.contains('Invalid File Type')) {
            userMessage = 'Unsupported image format. Please try a different image (JPEG, PNG, GIF, WebP, BMP, TIFF, SVG, ICO, AVIF, HEIC, HEIF).';
          } else if (errorMessage.contains('File too large')) {
            userMessage = 'Image too large. Please select a smaller image (max 10MB).';
          } else if (errorMessage.contains('null response')) {
            userMessage = 'Server error: Unable to process image. Please try again.';
          } else if (errorMessage.contains('server returned null')) {
            userMessage = 'Server error: Upload service unavailable. Please try again.';
          } else {
            userMessage = 'Upload failed: $errorMessage';
          }
          
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(userMessage),
              backgroundColor: Colors.red,
              duration: const Duration(seconds: 5),
            ),
          );
        }
        
        throw Exception(errorMessage);
      }
    } catch (e) {
      LoggingService.instance.error('Exception during profile picture upload', e);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error updating profile picture: $e'),
            backgroundColor: Colors.red,
            duration: const Duration(seconds: 5),
          ),
        );
      }
      rethrow;
    }
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
              ElevatedButton.icon(
                icon: const Icon(Icons.edit),
                label: const Text('Edit Picture'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF242C5B),
                  foregroundColor: Colors.white,
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
    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      body: SafeArea(
        child: Column(
          children: [
            _buildHeader(),
            Expanded(
              child: RefreshIndicator(
                onRefresh: _refreshProfile,
                color: AppTheme.primary,
                backgroundColor: AppTheme.neutral0,
                child: ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    _buildProfileCard(),
                    const SizedBox(height: 24),
                    _buildMenuSection(context),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Container(
      height: 70,
      width: double.infinity,
      decoration: const BoxDecoration(
        image: DecorationImage(
          image: AssetImage('assets/images/istetik.png'),
          fit: BoxFit.cover,
        ),
      ),
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          Image.asset(
            'assets/images/usericon.png',
            height: 32,
            width: 32,
          ),
          const SizedBox(width: 12),
          const Text(
            'Profile',
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w600,
              color: Colors.white,
            ),
          ),
        ],
      ),
    );
  }

  /// Returns a masked email (e.g. "je***@gmail.com") so the full address is not exposed.
  static String _maskEmail(String email) {
    if (email.isEmpty) return '•••@•••';
    final atIndex = email.indexOf('@');
    if (atIndex <= 0) return '•••@•••';
    final local = email.substring(0, atIndex);
    final domain = email.substring(atIndex + 1);
    if (local.length <= 2) return '${local}***@$domain';
    return '${local.substring(0, 2)}***@$domain';
  }

  Widget _buildProfileCard() {
    final displayEmail = _obscureEmail ? _maskEmail(_user.email) : _user.email;
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppTheme.neutral0,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppTheme.neutral200),
        boxShadow: [
          BoxShadow(
            color: AppTheme.primary.withValues(alpha: 0.06),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          GestureDetector(
            onTap: _showProfilePictureDialog,
            child: Stack(
              alignment: Alignment.bottomRight,
              children: [
                Container(
                  width: 88,
                  height: 88,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(color: AppTheme.primary, width: 2),
                    boxShadow: [
                      BoxShadow(
                        color: AppTheme.primary.withValues(alpha: 0.12),
                        blurRadius: 8,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: ClipOval(
                    child: _buildProfilePicture(88, 88, 40, 44),
                  ),
                ),
                Positioned(
                  bottom: 2,
                  right: 2,
                  child: Container(
                    decoration: BoxDecoration(
                      color: AppTheme.neutral0,
                      shape: BoxShape.circle,
                      border: Border.all(color: AppTheme.primary),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.15),
                          blurRadius: 4,
                        ),
                      ],
                    ),
                    padding: const EdgeInsets.all(6),
                    child: const Icon(
                      Icons.camera_alt_rounded,
                      size: 18,
                      color: AppTheme.primary,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 20),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _user.fullName,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                    color: AppTheme.primary,
                    height: 1.25,
                  ),
                ),
                const SizedBox(height: 8),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.baseline,
                  textBaseline: TextBaseline.alphabetic,
                  children: [
                    Expanded(
                      child: Text(
                        displayEmail,
                        style: TextStyle(
                          fontSize: 14,
                          color: AppTheme.neutral600,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    GestureDetector(
                      onTap: () => setState(() => _obscureEmail = !_obscureEmail),
                      child: Padding(
                        padding: const EdgeInsets.only(left: 8),
                        child: Text(
                          _obscureEmail ? 'Reveal' : 'Hide',
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: AppTheme.primary,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                _buildProfileRow('Username', _user.username),
                const SizedBox(height: 6),
                _buildProfileRow('Birthday', _user.birthday),
                const SizedBox(height: 6),
                _buildProfileRow('Gender', _user.gender),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildProfileRow(String label, String value) {
    return RichText(
      text: TextSpan(
        style: TextStyle(
          fontSize: 14,
          height: 1.4,
          color: AppTheme.neutral600,
        ),
        children: [
          TextSpan(
            text: '$label: ',
            style: TextStyle(
              fontWeight: FontWeight.w600,
              color: AppTheme.neutral700,
            ),
          ),
          TextSpan(text: value.isNotEmpty ? value : '—'),
        ],
      ),
    );
  }

  Widget _buildMenuSection(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppTheme.neutral0,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppTheme.neutral200),
        boxShadow: [
          BoxShadow(
            color: AppTheme.primary.withValues(alpha: 0.06),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        children: [
          _buildMenuItem(
            'Account Settings',
            Icons.settings_rounded,
            onTap: () async {
              final updatedUser = await Navigator.push<UserModel?>(
                context,
                _slideAndFadeRoute<UserModel?>(
                  AccountSettingsPage(
                    user: _user,
                    onSave: (user) {
                      Navigator.pop(context, user);
                    },
                  ),
                ),
              );
              if (updatedUser != null) {
                _updateUser(updatedUser);
              }
            },
          ),
          Divider(height: 1, color: AppTheme.neutral200),
          _buildMenuItem(
            'Nomu Chatbot',
            Icons.support_agent_rounded,
            onTap: () {
              Navigator.push(
                context,
                _slideAndFadeRoute<void>(HelpSupportPage(userId: _user.id)),
              );
            },
          ),
          Divider(height: 1, color: AppTheme.neutral200),
          _buildMenuItem(
            'Log Out',
            Icons.logout_rounded,
            onTap: () {
              _showLogoutDialog(context);
            },
            isLogout: true,
          ),
        ],
      ),
    );
  }

  Widget _buildMenuItem(String title, IconData icon,
      {required VoidCallback onTap, bool isLogout = false}) {
    final color = isLogout ? AppTheme.error : AppTheme.primary;
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(20),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          child: Row(
            children: [
              Icon(
                icon,
                size: 24,
                color: color,
              ),
              const SizedBox(width: 16),
              Text(
                title,
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w500,
                  color: color,
                ),
              ),
              const Spacer(),
              Icon(
                Icons.chevron_right_rounded,
                size: 24,
                color: AppTheme.neutral400,
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showLogoutDialog(BuildContext context) {
    const darkBlue = Color(0xFF1B2A59);
    const goldishBrown = Color(0xFFB8860B);
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => Dialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        elevation: 0,
        backgroundColor: Colors.transparent,
        child: Container(
          constraints: const BoxConstraints(maxWidth: 340),
          decoration: BoxDecoration(
            color: AppTheme.neutral0,
            borderRadius: BorderRadius.circular(24),
            boxShadow: [
              BoxShadow(
                color: AppTheme.neutral900.withValues(alpha: 0.12),
                blurRadius: 24,
                offset: const Offset(0, 8),
              ),
            ],
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const SizedBox(height: 28),
              Container(
                width: 56,
                height: 56,
                decoration: BoxDecoration(
                  color: darkBlue.withValues(alpha: 0.12),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.logout_rounded,
                  color: darkBlue,
                  size: 28,
                ),
              ),
              const SizedBox(height: 20),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: Text(
                  'Log Out',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w700,
                    color: AppTheme.neutral900,
                    letterSpacing: -0.3,
                  ),
                ),
              ),
              const SizedBox(height: 12),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: Text(
                  'Are you sure you want to log out? You will need to sign in again to access your account.',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 15,
                    height: 1.5,
                    color: AppTheme.neutral600,
                  ),
                ),
              ),
              const SizedBox(height: 28),
              Padding(
                padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
                child: Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () => Navigator.pop(context),
                        style: OutlinedButton.styleFrom(
                          backgroundColor: AppTheme.neutral0,
                          foregroundColor: goldishBrown,
                          side: const BorderSide(color: goldishBrown),
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        child: const Text('Cancel'),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () {
                          Navigator.pop(context);
                          LogoutService.performLogout(context, const LoginPage());
                        },
                        style: OutlinedButton.styleFrom(
                          backgroundColor: AppTheme.neutral0,
                          foregroundColor: darkBlue,
                          side: const BorderSide(color: darkBlue),
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        child: const Text('Log Out'),
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

  // Method to refresh profile picture display
  void _refreshProfilePicture() {
    if (mounted) {
      LoggingService.instance.info('Refreshing profile picture display', {
        'currentProfilePicture': _user.profilePicture,
        'refreshKey': _profilePictureRefreshKey,
        'newRefreshKey': DateTime.now().millisecondsSinceEpoch
      });
      
      setState(() {
        // Force rebuild by updating the refresh key
        _profilePictureRefreshKey = DateTime.now().millisecondsSinceEpoch;
      });
      
      // Clear image cache to force reload
      _clearImageCache();
    }
  }

  /// Preload image for instant display
  void _preloadImage(Uint8List imageBytes) {
    try {
      // Preload the image into memory for instant display
      precacheImage(
        MemoryImage(imageBytes),
        context,
      ).then((_) {
        LoggingService.instance.info('Image preloaded successfully');
      }).catchError((error) {
        LoggingService.instance.warning('Failed to preload image', error);
      });
    } catch (e) {
      LoggingService.instance.warning('Error preloading image', e);
    }
  }

  // Method to refresh user data from database
  Future<void> _refreshUserData() async {
    try {
      LoggingService.instance.info('Refreshing user data from database...');
      
      // Fetch updated user data from the server
      final updatedUser = await ApiService.getUserInfo(_user.username);
      if (updatedUser != null && mounted) {
        setState(() {
          _user = updatedUser;
        });
        
        LoggingService.instance.info('User data refreshed successfully', {
          'userId': _user.id,
          'profilePicture': _user.profilePicture,
          'isGridFS': _user.profilePicture.startsWith('/api/')
        });
      }
    } catch (e) {
      LoggingService.instance.error('Error refreshing user data', e);
      // Show error message for rate limiting
      if (mounted && e.toString().contains('Too many requests')) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Too many requests. Please try again later.'),
            backgroundColor: Colors.orange,
            duration: const Duration(seconds: 3),
          ),
        );
      }
    }
  }

  // Clear image cache to force reload
  void _clearImageCache() {
    try {
      // Clear the image cache for the current profile picture
      if (_user.profilePicture.isNotEmpty) {
        if (_user.profilePicture.startsWith('/api/images/profile/')) {
          // Clear GridFS image cache
          final imageId = _user.profilePicture.split('/').last;
          LoggingService.instance.info('Clearing GridFS image cache', {'imageId': imageId});
        }
      }
    } catch (e) {
      LoggingService.instance.error('Error clearing image cache', e);
    }
  }

  // Pull-to-refresh functionality
  Future<void> _refreshProfile() async {
    try {
      LoggingService.instance.info('Refreshing profile data...');
      
      // Force refresh the profile picture display
      _refreshProfilePicture();
      
      // If there's a callback to update user data, call it
      if (widget.onUserUpdated != null) {
        // Trigger a rebuild with the current user data
        widget.onUserUpdated!(_user);
      }
      
      // Add a small delay to show the refresh indicator
      await Future.delayed(const Duration(milliseconds: 500));
      
      LoggingService.instance.info('Profile refresh completed');
    } catch (e) {
      LoggingService.instance.error('Error refreshing profile', e);
    }
  }
}
