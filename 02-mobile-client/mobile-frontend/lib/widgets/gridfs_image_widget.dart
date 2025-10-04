import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart' show kDebugMode;
import '../services/gridfs_image_service.dart';
import '../services/logging_service.dart';

class GridFSImageWidget extends StatefulWidget {
  final String imageType;
  final String imageId;
  final Widget? placeholder;
  final double? width;
  final double? height;
  final BoxFit fit;
  final Widget? errorWidget;
  final Widget? loadingWidget;
  final BorderRadius? borderRadius;
  final bool enableCaching;
  final Duration? cacheDuration;

  const GridFSImageWidget({
    Key? key,
    required this.imageType,
    required this.imageId,
    this.placeholder,
    this.width,
    this.height,
    this.fit = BoxFit.cover,
    this.errorWidget,
    this.loadingWidget,
    this.borderRadius,
    this.enableCaching = true,
    this.cacheDuration,
  }) : super(key: key);

  @override
  State<GridFSImageWidget> createState() => _GridFSImageWidgetState();
}

class _GridFSImageWidgetState extends State<GridFSImageWidget> {
  Uint8List? _imageBytes;
  bool _isLoading = true;
  bool _hasError = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _loadImage();
  }

  @override
  void didUpdateWidget(GridFSImageWidget oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.imageType != widget.imageType || 
        oldWidget.imageId != widget.imageId) {
      _loadImage();
    }
  }

  Future<void> _loadImage() async {
    if (!mounted) return;

    setState(() {
      _isLoading = true;
      _hasError = false;
      _errorMessage = null;
    });

    try {
      LoggingService.instance.info('Loading GridFS image', {
        'imageType': widget.imageType,
        'imageId': widget.imageId
      });

      final imageBytes = await GridFSImageService.instance.downloadImage(
        widget.imageType,
        widget.imageId,
      );

      if (!mounted) return;

      if (imageBytes != null && imageBytes.isNotEmpty) {
        setState(() {
          _imageBytes = imageBytes;
          _isLoading = false;
          _hasError = false;
        });

        LoggingService.instance.info('GridFS image loaded successfully', {
          'imageType': widget.imageType,
          'imageId': widget.imageId,
          'bytesLength': imageBytes.length
        });
      } else {
        setState(() {
          _isLoading = false;
          _hasError = true;
          _errorMessage = 'Failed to load image';
        });

        LoggingService.instance.error('Failed to load GridFS image', {
          'imageType': widget.imageType,
          'imageId': widget.imageId
        });
      }
    } catch (e) {
      if (!mounted) return;

      setState(() {
        _isLoading = false;
        _hasError = true;
        _errorMessage = e.toString();
      });

      LoggingService.instance.error('Error loading GridFS image', e);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return _buildLoadingWidget();
    }

    if (_hasError) {
      return _buildErrorWidget();
    }

    if (_imageBytes == null) {
      return _buildPlaceholderWidget();
    }

    return _buildImageWidget();
  }

  Widget _buildLoadingWidget() {
    if (widget.loadingWidget != null) {
      return widget.loadingWidget!;
    }

    return Container(
      width: widget.width,
      height: widget.height,
      decoration: BoxDecoration(
        color: Colors.grey[300],
        borderRadius: widget.borderRadius,
      ),
      child: const Center(
        child: CircularProgressIndicator(),
      ),
    );
  }

  Widget _buildErrorWidget() {
    if (widget.errorWidget != null) {
      return widget.errorWidget!;
    }

    return Container(
      width: widget.width,
      height: widget.height,
      decoration: BoxDecoration(
        color: Colors.grey[300],
        borderRadius: widget.borderRadius,
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(
            Icons.error_outline,
            color: Colors.red,
            size: 32,
          ),
          const SizedBox(height: 8),
          Text(
            'Failed to load image',
            style: TextStyle(
              color: Colors.red[700],
              fontSize: 12,
            ),
            textAlign: TextAlign.center,
          ),
          if (kDebugMode && _errorMessage != null)
            Text(
              _errorMessage!,
              style: TextStyle(
                color: Colors.red[500],
                fontSize: 10,
              ),
              textAlign: TextAlign.center,
            ),
        ],
      ),
    );
  }

  Widget _buildPlaceholderWidget() {
    if (widget.placeholder != null) {
      return widget.placeholder!;
    }

    return Container(
      width: widget.width,
      height: widget.height,
      decoration: BoxDecoration(
        color: Colors.grey[200],
        borderRadius: widget.borderRadius,
      ),
      child: const Icon(
        Icons.image,
        color: Colors.grey,
        size: 32,
      ),
    );
  }

  Widget _buildImageWidget() {
    Widget imageWidget = Image.memory(
      _imageBytes!,
      width: widget.width,
      height: widget.height,
      fit: widget.fit,
      errorBuilder: (context, error, stackTrace) {
        LoggingService.instance.error('Error displaying image', error);
        return _buildErrorWidget();
      },
    );

    if (widget.borderRadius != null) {
      imageWidget = ClipRRect(
        borderRadius: widget.borderRadius!,
        child: imageWidget,
      );
    }

    return imageWidget;
  }
}

class GridFSImageBuilder extends StatelessWidget {
  final String imageType;
  final String imageId;
  final Widget Function(BuildContext context, Uint8List? imageBytes, bool isLoading, bool hasError) builder;
  final bool enableCaching;

  const GridFSImageBuilder({
    Key? key,
    required this.imageType,
    required this.imageId,
    required this.builder,
    this.enableCaching = true,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<Uint8List?>(
      future: GridFSImageService.instance.downloadImage(imageType, imageId),
      builder: (context, snapshot) {
        final imageBytes = snapshot.data;
        final isLoading = snapshot.connectionState == ConnectionState.waiting;
        final hasError = snapshot.hasError || (snapshot.hasData && imageBytes == null);

        return builder(context, imageBytes, isLoading, hasError);
      },
    );
  }
}

class GridFSImageList extends StatelessWidget {
  final List<Map<String, String>> imageList;
  final Widget Function(BuildContext context, String imageType, String imageId, Uint8List? imageBytes, bool isLoading, bool hasError) itemBuilder;
  final bool enableCaching;

  const GridFSImageList({
    Key? key,
    required this.imageList,
    required this.itemBuilder,
    this.enableCaching = true,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return ListView.builder(
      itemCount: imageList.length,
      itemBuilder: (context, index) {
        final imageInfo = imageList[index];
        final imageType = imageInfo['type'] ?? '';
        final imageId = imageInfo['id'] ?? '';

        return GridFSImageBuilder(
          imageType: imageType,
          imageId: imageId,
          enableCaching: enableCaching,
          builder: (context, imageBytes, isLoading, hasError) {
            return itemBuilder(context, imageType, imageId, imageBytes, isLoading, hasError);
          },
        );
      },
    );
  }
}

class GridFSImageCarousel extends StatefulWidget {
  final List<Map<String, String>> imageList;
  final double height;
  final double? width;
  final BoxFit fit;
  final bool autoPlay;
  final Duration autoPlayInterval;
  final bool enableCaching;
  final Widget? placeholder;
  final Widget? errorWidget;

  const GridFSImageCarousel({
    Key? key,
    required this.imageList,
    this.height = 200,
    this.width,
    this.fit = BoxFit.cover,
    this.autoPlay = true,
    this.autoPlayInterval = const Duration(seconds: 3),
    this.enableCaching = true,
    this.placeholder,
    this.errorWidget,
  }) : super(key: key);

  @override
  State<GridFSImageCarousel> createState() => _GridFSImageCarouselState();
}

class _GridFSImageCarouselState extends State<GridFSImageCarousel> {
  late PageController _pageController;

  @override
  void initState() {
    super.initState();
    _pageController = PageController();
    
    if (widget.autoPlay && widget.imageList.length > 1) {
      _startAutoPlay();
    }
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  void _startAutoPlay() {
    Future.delayed(widget.autoPlayInterval, () {
      if (mounted && widget.imageList.length > 1) {
        _pageController.nextPage(
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeInOut,
        );
        _startAutoPlay();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    if (widget.imageList.isEmpty) {
      return Container(
        height: widget.height,
        width: widget.width,
        decoration: BoxDecoration(
          color: Colors.grey[200],
          borderRadius: BorderRadius.circular(8),
        ),
        child: widget.placeholder ?? const Center(
          child: Icon(Icons.image, color: Colors.grey),
        ),
      );
    }

    return SizedBox(
      height: widget.height,
      width: widget.width,
      child: PageView.builder(
        controller: _pageController,
        onPageChanged: (index) {
          // Page changed - could be used for indicators or other UI updates
        },
        itemCount: widget.imageList.length,
        itemBuilder: (context, index) {
          final imageInfo = widget.imageList[index];
          final imageType = imageInfo['type'] ?? '';
          final imageId = imageInfo['id'] ?? '';

          return GridFSImageWidget(
            imageType: imageType,
            imageId: imageId,
            width: widget.width,
            height: widget.height,
            fit: widget.fit,
            enableCaching: widget.enableCaching,
            placeholder: widget.placeholder,
            errorWidget: widget.errorWidget,
          );
        },
      ),
    );
  }
}
