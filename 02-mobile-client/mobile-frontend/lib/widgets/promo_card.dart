import 'dart:async';
import 'package:flutter/material.dart';
import '../models/promo.dart';

class PromoCard extends StatelessWidget {
  final Promo promo;
  final VoidCallback? onTap;
  final EdgeInsets? margin;
  final BorderRadius? borderRadius;

  const PromoCard({
    Key? key,
    required this.promo,
    this.onTap,
    this.margin,
    this.borderRadius,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final screenSize = MediaQuery.of(context).size;
    final isSmallScreen = screenSize.width < 400;
    
    return Container(
      width: double.infinity, // Take full width of parent container
      margin: margin ?? EdgeInsets.all(isSmallScreen ? 4.0 : 8.0),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF242C5B), Color(0xFF3A4A8C)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: borderRadius ?? BorderRadius.circular(isSmallScreen ? 12 : 16),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF242C5B).withOpacity(0.3),
            blurRadius: isSmallScreen ? 8 : 12,
            offset: Offset(0, isSmallScreen ? 4 : 6),
          ),
        ],
      ),
      child: InkWell(
        onTap: onTap,
        borderRadius: borderRadius ?? BorderRadius.circular(isSmallScreen ? 12 : 16),
        child: _buildContentSection(context),
      ),
    );
  }


  Widget _buildContentSection(BuildContext context) {
    final screenSize = MediaQuery.of(context).size;
    final isSmallScreen = screenSize.width < 400;
    final isMediumScreen = screenSize.width < 600;
    
    // Responsive sizing
    final padding = isSmallScreen ? 12.0 : (isMediumScreen ? 14.0 : 16.0);
    final titleSize = isSmallScreen ? 16.0 : (isMediumScreen ? 17.0 : 18.0);
    final descSize = isSmallScreen ? 12.0 : (isMediumScreen ? 13.0 : 14.0);
    final badgeSize = isSmallScreen ? 11.0 : (isMediumScreen ? 12.0 : 14.0);
    final iconSize = isSmallScreen ? 14.0 : (isMediumScreen ? 15.0 : 16.0);
    
    return Container(
      height: isSmallScreen ? 160 : (isMediumScreen ? 180 : 200),
      child: Stack(
        children: [
          // Background image if available
          if (promo.imageUrl != null && promo.imageUrl!.isNotEmpty)
            Positioned.fill(
              child: ClipRRect(
                borderRadius: BorderRadius.circular(isSmallScreen ? 12 : 16),
                child: Image.network(
                  promo.imageUrl!,
                  fit: BoxFit.cover,
                  errorBuilder: (context, error, stackTrace) {
                    return Container(
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: [Color(0xFF242C5B), Color(0xFF3A4A8C)],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                      ),
                    );
                  },
                ),
              ),
            ),
          
          // Gradient overlay for better text readability
          Positioned.fill(
            child: Container(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(isSmallScreen ? 12 : 16),
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Colors.black.withOpacity(0.3),
                    Colors.black.withOpacity(0.7),
                  ],
                ),
              ),
            ),
          ),
          
          // Content
          Positioned.fill(
            child: Padding(
              padding: EdgeInsets.all(padding),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  // Top row with badge
                  Row(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      Container(
                        padding: EdgeInsets.symmetric(
                          horizontal: isSmallScreen ? 8 : 12, 
                          vertical: isSmallScreen ? 4 : 6,
                        ),
                        decoration: BoxDecoration(
                          color: const Color(0xFFB08D57).withOpacity(0.9),
                          borderRadius: BorderRadius.circular(20),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withOpacity(0.2),
                              blurRadius: 4,
                              offset: const Offset(0, 2),
                            ),
                          ],
                        ),
                        child: Text(
                          _formatDiscountValue(),
                          style: TextStyle(
                            fontSize: badgeSize,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                      ),
                    ],
                  ),
                  
                  // Bottom content
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Title
                      Text(
                        promo.title,
                        style: TextStyle(
                          fontSize: titleSize,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                          shadows: [
                            Shadow(
                              color: Colors.black.withOpacity(0.5),
                              blurRadius: 2,
                              offset: const Offset(0, 1),
                            ),
                          ],
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                      SizedBox(height: isSmallScreen ? 4 : 6),
                      
                      // Description
                      if (promo.description.isNotEmpty)
                        Text(
                          promo.description,
                          style: TextStyle(
                            fontSize: descSize,
                            color: Colors.white.withOpacity(0.9),
                            height: 1.3,
                            shadows: [
                              Shadow(
                                color: Colors.black.withOpacity(0.5),
                                blurRadius: 1,
                                offset: const Offset(0, 1),
                              ),
                            ],
                          ),
                          maxLines: isSmallScreen ? 2 : 3,
                          overflow: TextOverflow.ellipsis,
                        ),
                      SizedBox(height: isSmallScreen ? 6 : 8),
                      
                      // Date and minimum order
                      Row(
                        children: [
                          Icon(Icons.calendar_today, size: iconSize, color: Colors.white),
                          SizedBox(width: isSmallScreen ? 4 : 6),
                          Expanded(
                            child: Text(
                              '${_formatDate(promo.startDate)} - ${_formatDate(promo.endDate)}',
                              style: TextStyle(
                                fontSize: isSmallScreen ? 10 : 11,
                                color: Colors.white.withOpacity(0.9),
                                fontWeight: FontWeight.w500,
                                shadows: [
                                  Shadow(
                                    color: Colors.black.withOpacity(0.5),
                                    blurRadius: 1,
                                    offset: const Offset(0, 1),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                      
                      // Minimum order amount
                      if (promo.minOrderAmount > 0) ...[
                        SizedBox(height: isSmallScreen ? 4 : 6),
                        Row(
                          children: [
                            Icon(Icons.shopping_cart, size: iconSize, color: Colors.white),
                            SizedBox(width: isSmallScreen ? 4 : 6),
                            Text(
                              'Min. order: ₱${promo.minOrderAmount.toStringAsFixed(0)}',
                              style: TextStyle(
                                fontSize: isSmallScreen ? 10 : 11,
                                color: Colors.white.withOpacity(0.9),
                                fontWeight: FontWeight.w500,
                                shadows: [
                                  Shadow(
                                    color: Colors.black.withOpacity(0.5),
                                    blurRadius: 1,
                                    offset: const Offset(0, 1),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ],
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _formatDiscountValue() {
    switch (promo.promoType) {
      case 'percentage':
        return '${promo.discountValue.toInt()}% OFF';
      case 'fixed':
        return '₱${promo.discountValue.toInt()} OFF';
      case 'buy_one_get_one':
        return 'BOGO';
      case 'free_item':
        return 'FREE';
      case 'loyalty_bonus':
        return '${promo.discountValue.toInt()}x Points';
      default:
        return 'Special';
    }
  }


  String _formatDate(DateTime date) {
    return '${date.day}/${date.month}/${date.year}';
  }
}

class PromoCarousel extends StatefulWidget {
  final List<Promo> promos;
  final double height;
  final double? width;
  final Function(Promo)? onPromoTap;
  final EdgeInsets? padding;
  final bool autoPlay;
  final Duration autoPlayInterval;

  const PromoCarousel({
    Key? key,
    required this.promos,
    this.height = 200,
    this.width,
    this.onPromoTap,
    this.padding,
    this.autoPlay = true,
    this.autoPlayInterval = const Duration(seconds: 3),
  }) : super(key: key);

  @override
  State<PromoCarousel> createState() => _PromoCarouselState();
}

class _PromoCarouselState extends State<PromoCarousel> {
  late PageController _pageController;
  int _currentIndex = 0;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _pageController = PageController();
    if (widget.autoPlay && widget.promos.length > 1) {
      _startAutoPlay();
    }
  }

  @override
  void dispose() {
    _pageController.dispose();
    _timer?.cancel();
    super.dispose();
  }

  void _startAutoPlay() {
    _timer = Timer.periodic(widget.autoPlayInterval, (timer) {
      if (_pageController.hasClients) {
        int nextIndex = (_currentIndex + 1) % widget.promos.length;
        _pageController.animateToPage(
          nextIndex,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeInOut,
        );
      }
    });
  }

  void _onPageChanged(int index) {
    setState(() {
      _currentIndex = index;
    });
  }

  @override
  Widget build(BuildContext context) {
    final screenSize = MediaQuery.of(context).size;
    final isSmallScreen = screenSize.width < 400;
    final isMediumScreen = screenSize.width < 600;
    
    // Responsive height calculation
    final responsiveHeight = isSmallScreen 
        ? screenSize.height * 0.28  // 28% of screen height for small screens
        : isMediumScreen 
            ? screenSize.height * 0.30  // 30% for medium screens
            : screenSize.height * 0.32; // 32% for large screens
    
    final actualHeight = widget.height > 0 ? widget.height : responsiveHeight;
    
    if (widget.promos.isEmpty) {
      return Container(
        height: actualHeight,
        width: widget.width,
        margin: widget.padding,
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [Color(0xFF242C5B), Color(0xFF3A4A8C)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(isSmallScreen ? 12 : 16),
        ),
        child: const Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                Icons.local_offer,
                color: Colors.white,
                size: 48,
              ),
              SizedBox(height: 8),
              Text(
                'No promotions available',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 16,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
      );
    }

    return Column(
      children: [
        SizedBox(
          height: actualHeight,
          width: widget.width,
          child: Stack(
            children: [
              PageView.builder(
                controller: _pageController,
                onPageChanged: _onPageChanged,
                itemCount: widget.promos.length,
                padEnds: false,
                itemBuilder: (context, index) {
                  final promo = widget.promos[index];
                  return Container(
                    width: screenSize.width * 0.70, // Further reduced to 70% of screen width for better mobile fit
                    margin: EdgeInsets.symmetric(
                      horizontal: isSmallScreen ? 12.0 : (isMediumScreen ? 16.0 : 20.0),
                    ),
                    child: PromoCard(
                      promo: promo,
                      onTap: widget.onPromoTap != null ? () => widget.onPromoTap!(promo) : null,
                    ),
                  );
                },
              ),
              
              // Navigation arrows (only show if there are multiple promos)
              if (widget.promos.length > 1) ...[
                // Left arrow
                Positioned(
                  left: 4,
                  top: actualHeight / 2 - 20,
                  child: GestureDetector(
                    onTap: () {
                      if (_currentIndex > 0) {
                        _pageController.previousPage(
                          duration: const Duration(milliseconds: 300),
                          curve: Curves.easeInOut,
                        );
                      } else {
                        _pageController.animateToPage(
                          widget.promos.length - 1,
                          duration: const Duration(milliseconds: 300),
                          curve: Curves.easeInOut,
                        );
                      }
                    },
                    child: Container(
                      width: 36,
                      height: 36,
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.9),
                        borderRadius: BorderRadius.circular(18),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.1),
                            blurRadius: 6,
                            offset: const Offset(0, 2),
                          ),
                        ],
                      ),
                      child: const Icon(
                        Icons.chevron_left,
                        color: Color(0xFF242C5B),
                        size: 20,
                      ),
                    ),
                  ),
                ),
                
                // Right arrow
                Positioned(
                  right: 4,
                  top: actualHeight / 2 - 20,
                  child: GestureDetector(
                    onTap: () {
                      if (_currentIndex < widget.promos.length - 1) {
                        _pageController.nextPage(
                          duration: const Duration(milliseconds: 300),
                          curve: Curves.easeInOut,
                        );
                      } else {
                        _pageController.animateToPage(
                          0,
                          duration: const Duration(milliseconds: 300),
                          curve: Curves.easeInOut,
                        );
                      }
                    },
                    child: Container(
                      width: 36,
                      height: 36,
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.9),
                        borderRadius: BorderRadius.circular(18),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.1),
                            blurRadius: 6,
                            offset: const Offset(0, 2),
                          ),
                        ],
                      ),
                      child: const Icon(
                        Icons.chevron_right,
                        color: Color(0xFF242C5B),
                        size: 20,
                      ),
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
        if (widget.promos.length > 1) ...[
          SizedBox(height: isSmallScreen ? 12 : 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(
              widget.promos.length,
              (index) => Container(
                margin: EdgeInsets.symmetric(horizontal: isSmallScreen ? 4 : 6),
                width: _currentIndex == index 
                    ? (isSmallScreen ? 24 : (isMediumScreen ? 28 : 32)) 
                    : (isSmallScreen ? 8 : (isMediumScreen ? 10 : 12)),
                height: isSmallScreen ? 8 : (isMediumScreen ? 10 : 12),
                decoration: BoxDecoration(
                  color: _currentIndex == index 
                    ? const Color(0xFFB08D57)  // Use brand color for active indicator
                    : const Color(0xFFB08D57).withOpacity(0.3),
                  borderRadius: BorderRadius.circular(isSmallScreen ? 4 : 6),
                  boxShadow: _currentIndex == index ? [
                    BoxShadow(
                      color: const Color(0xFFB08D57).withOpacity(0.3),
                      blurRadius: 4,
                      offset: const Offset(0, 2),
                    ),
                  ] : null,
                ),
              ),
            ),
          ),
        ],
      ],
    );
  }
}

class PromoGrid extends StatelessWidget {
  final List<Promo> promos;
  final Function(Promo)? onPromoTap;
  final int crossAxisCount;
  final double childAspectRatio;
  final EdgeInsets? padding;

  const PromoGrid({
    Key? key,
    required this.promos,
    this.onPromoTap,
    this.crossAxisCount = 2,
    this.childAspectRatio = 0.8,
    this.padding,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return GridView.builder(
      padding: padding ?? const EdgeInsets.all(8.0),
      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: crossAxisCount,
        childAspectRatio: childAspectRatio,
        crossAxisSpacing: 8,
        mainAxisSpacing: 8,
      ),
      itemCount: promos.length,
      itemBuilder: (context, index) {
        final promo = promos[index];
        return PromoCard(
          promo: promo,
          onTap: onPromoTap != null ? () => onPromoTap!(promo) : null,
        );
      },
    );
  }
}
