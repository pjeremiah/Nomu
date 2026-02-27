import 'dart:async';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
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
    final cardRadius = isSmallScreen ? 12.0 : 16.0;
    
    return Container(
      width: double.infinity, // Take full width of parent container
      margin: margin ?? EdgeInsets.all(isSmallScreen ? 4.0 : 8.0),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF242C5B), Color(0xFF3A4A8C)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: borderRadius ?? BorderRadius.circular(cardRadius),
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
        borderRadius: borderRadius ?? BorderRadius.circular(cardRadius),
        child: _buildContentSection(context),
      ),
    );
  }


  Widget _buildContentSection(BuildContext context) {
    final screenSize = MediaQuery.of(context).size;
    final isSmallScreen = screenSize.width < 400;
    final isMediumScreen = screenSize.width < 600;
    
    // Responsive sizing – taller cards so promo image is more visible
    final padding = isSmallScreen ? 12.0 : (isMediumScreen ? 14.0 : 16.0);
    final cardRadius = isSmallScreen ? 12.0 : 16.0;
    final titleSize = isSmallScreen ? 16.0 : (isMediumScreen ? 17.0 : 18.0);
    final descSize = isSmallScreen ? 12.0 : (isMediumScreen ? 13.0 : 14.0);
    final badgeSize = isSmallScreen ? 11.0 : (isMediumScreen ? 12.0 : 14.0);
    final iconSize = isSmallScreen ? 14.0 : (isMediumScreen ? 15.0 : 16.0);
    
    // Fixed height for white description block – same for every promo regardless of text length
    final whiteBlockHeight = isSmallScreen ? 125.0 : (isMediumScreen ? 135.0 : 145.0);
    
    return Container(
      height: isSmallScreen ? 220 : (isMediumScreen ? 250 : 280),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(cardRadius),
        clipBehavior: Clip.antiAlias,
        child: Stack(
          children: [
          // Background image – primary focus, minimal obstruction
          if (promo.imageUrl != null && promo.imageUrl!.isNotEmpty)
            Positioned.fill(
              child: ClipRRect(
                borderRadius: BorderRadius.circular(cardRadius),
                child: Image.network(
                  promo.imageUrl!,
                  fit: BoxFit.cover,
                  alignment: Alignment.center,
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
          
          // Light gradient only on upper area so image stays visible; no dark overlay on bottom (white block will cover it)
          Positioned.fill(
            child: Container(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(cardRadius),
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Colors.black.withOpacity(0.08),
                    Colors.black.withOpacity(0.05),
                    Colors.transparent,
                  ],
                  stops: const [0.0, 0.35, 0.65],
                ),
              ),
            ),
          ),
          
          // Badge over image (top right)
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            child: Padding(
              padding: EdgeInsets.all(padding),
              child: Row(
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
            ),
          ),
          
          // White background block for description – fixed height and consistent curve
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            child: Material(
              color: Colors.transparent,
              child: Container(
                height: whiteBlockHeight,
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.85),
                  borderRadius: BorderRadius.only(
                    bottomLeft: Radius.circular(cardRadius),
                    bottomRight: Radius.circular(cardRadius),
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.06),
                      blurRadius: 8,
                      offset: const Offset(0, -2),
                    ),
                  ],
                ),
                child: ClipRRect(
                  clipBehavior: Clip.antiAlias,
                  borderRadius: BorderRadius.only(
                    bottomLeft: Radius.circular(cardRadius),
                    bottomRight: Radius.circular(cardRadius),
                  ),
                  child: Padding(
                    padding: EdgeInsets.fromLTRB(padding, isSmallScreen ? 14 : 18, padding, isSmallScreen ? 14 : 18),
                    child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        promo.title,
                        style: TextStyle(
                          fontSize: titleSize,
                          fontWeight: FontWeight.bold,
                          color: const Color(0xFF2C2C2C),
                          height: 1.25,
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                      SizedBox(height: isSmallScreen ? 4 : 6),
                      Expanded(
                        child: promo.description.isNotEmpty
                            ? Text(
                                promo.description,
                                style: TextStyle(
                                  fontSize: descSize,
                                  color: const Color(0xFF555555),
                                  height: 1.35,
                                ),
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                              )
                            : const SizedBox.shrink(),
                      ),
                      SizedBox(height: isSmallScreen ? 6 : 8),
                      Row(
                        children: [
                          Icon(Icons.calendar_today, size: iconSize, color: const Color(0xFF666666)),
                          SizedBox(width: isSmallScreen ? 4 : 6),
                          Expanded(
                            child: Text(
                              '${_formatDate(promo.startDate)} - ${_formatDate(promo.endDate)}',
                              style: TextStyle(
                                fontSize: isSmallScreen ? 10 : 11,
                                color: const Color(0xFF666666),
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ),
                        ],
                      ),
                      if (promo.minOrderAmount > 0) ...[
                        SizedBox(height: isSmallScreen ? 4 : 6),
                        Row(
                          children: [
                            Icon(Icons.shopping_cart, size: iconSize, color: const Color(0xFF666666)),
                            SizedBox(width: isSmallScreen ? 4 : 6),
                            Text(
                              'Min. order: ₱${promo.minOrderAmount.toStringAsFixed(0)}',
                              style: TextStyle(
                                fontSize: isSmallScreen ? 10 : 11,
                                color: const Color(0xFF666666),
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
        ],
      ),
    ),
    );
  }

  String _formatDiscountValue() {
    final t = promo.promoType;
    switch (t) {
      case 'percentage':
      case 'Percentage Discount':
        return '${promo.discountValue.toInt()}% OFF';
      case 'fixed':
      case 'Fixed Amount Discount':
        return '₱${promo.discountValue.toInt()} OFF';
      case 'buy_one_get_one':
      case 'Buy One Get One':
        return 'BOGO';
      case 'free_item':
      case 'Free Item':
        return 'FREE';
      case 'loyalty_bonus':
      case 'Loyalty Points Bonus':
        return '${promo.discountValue.toInt()}x Points';
      default:
        return 'Special';
    }
  }


  String _formatDate(DateTime date) {
    return DateFormat('MMM d, y').format(date);
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
    this.autoPlayInterval = const Duration(seconds: 5),
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
    _pageController = PageController(viewportFraction: 1.0);
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
          duration: const Duration(milliseconds: 450),
          curve: Curves.easeInOutCubic,
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
    
    // Responsive height – taller so promo images are more visible
    final responsiveHeight = isSmallScreen 
        ? screenSize.height * 0.36
        : isMediumScreen 
            ? screenSize.height * 0.38
            : screenSize.height * 0.40;
    
    final actualHeight = widget.height > 0 ? widget.height : responsiveHeight;
    final cardRadius = isSmallScreen ? 12.0 : 16.0;
    
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
          borderRadius: BorderRadius.circular(cardRadius),
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

    // Extra space at bottom so the card's drop shadow can draw with its curved shape (not clipped)
    final shadowPadding = 20.0;
    final contentHeight = actualHeight + shadowPadding;
    
    return Column(
      children: [
        SizedBox(
          height: contentHeight,
          width: widget.width,
          child: Stack(
            children: [
              PageView.builder(
                controller: _pageController,
                onPageChanged: _onPageChanged,
                itemCount: widget.promos.length,
                padEnds: false,
                physics: const BouncingScrollPhysics(parent: AlwaysScrollableScrollPhysics()),
                itemBuilder: (context, index) {
                  final promo = widget.promos[index];
                  return LayoutBuilder(
                    builder: (context, constraints) {
                      final contentWidth = constraints.maxWidth;
                      return AnimatedOpacity(
                        opacity: _currentIndex == index ? 1.0 : 0.95,
                        duration: const Duration(milliseconds: 200),
                        child: Padding(
                          padding: EdgeInsets.only(bottom: shadowPadding),
                          child: SizedBox(
                            width: contentWidth,
                            height: actualHeight,
                            child: PromoCard(
                              promo: promo,
                              onTap: widget.onPromoTap != null ? () => widget.onPromoTap!(promo) : null,
                              margin: EdgeInsets.zero,
                            ),
                          ),
                        ),
                      );
                    },
                  );
                },
              ),
            ],
          ),
        ),
        if (widget.promos.length > 1) ...[
          SizedBox(height: isSmallScreen ? 12 : 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(
              widget.promos.length,
              (index) => AnimatedContainer(
                duration: const Duration(milliseconds: 300),
                curve: Curves.easeInOutCubic,
                margin: EdgeInsets.symmetric(horizontal: isSmallScreen ? 4 : 6),
                width: isSmallScreen ? 8 : 10,
                height: isSmallScreen ? 8 : 10,
                decoration: BoxDecoration(
                  color: _currentIndex == index
                      ? const Color(0xFFB08D57)
                      : Colors.grey[300],
                  shape: BoxShape.circle,
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
