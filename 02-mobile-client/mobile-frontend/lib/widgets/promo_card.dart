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
    return Container(
      margin: margin ?? const EdgeInsets.all(8.0),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF242C5B), Color(0xFF3A4A8C)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: borderRadius ?? BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF242C5B).withOpacity(0.3),
            blurRadius: 12,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: InkWell(
        onTap: onTap,
        borderRadius: borderRadius ?? BorderRadius.circular(16),
        child: _buildContentSection(context),
      ),
    );
  }


  Widget _buildContentSection(BuildContext context) {
    final screenSize = MediaQuery.of(context).size;
    final isSmallScreen = screenSize.width < 400;
    final padding = isSmallScreen ? 12.0 : 16.0;
    final titleSize = isSmallScreen ? 16.0 : 18.0;
    final descSize = isSmallScreen ? 12.0 : 14.0;
    final badgeSize = isSmallScreen ? 12.0 : 16.0;
    final iconSize = isSmallScreen ? 14.0 : 16.0;
    
    return Padding(
      padding: EdgeInsets.all(padding),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          // Title and discount value
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  promo.title,
                  style: TextStyle(
                    fontSize: titleSize,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              SizedBox(width: isSmallScreen ? 8 : 12),
              Container(
                padding: EdgeInsets.symmetric(
                  horizontal: isSmallScreen ? 12 : 16, 
                  vertical: isSmallScreen ? 6 : 8,
                ),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(25),
                  border: Border.all(color: Colors.white.withOpacity(0.3), width: 1),
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
          SizedBox(height: isSmallScreen ? 8 : 12),
          
          // Description
          if (promo.description.isNotEmpty)
            Text(
              promo.description,
              style: TextStyle(
                fontSize: descSize,
                color: Colors.white,
                height: 1.4,
              ),
              maxLines: isSmallScreen ? 2 : 3,
              overflow: TextOverflow.ellipsis,
            ),
          SizedBox(height: isSmallScreen ? 8 : 12),
          
          // Promo type and validity
          Row(
            children: [
              Container(
                padding: EdgeInsets.symmetric(
                  horizontal: isSmallScreen ? 8 : 12, 
                  vertical: isSmallScreen ? 4 : 6,
                ),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(15),
                  border: Border.all(color: Colors.white.withOpacity(0.3), width: 1),
                ),
                child: Text(
                  'PROMO',
                  style: TextStyle(
                    fontSize: isSmallScreen ? 10 : 12,
                    fontWeight: FontWeight.w600,
                    color: Colors.white,
                  ),
                ),
              ),
              const Spacer(),
              Row(
                children: [
                  Icon(Icons.schedule, size: iconSize, color: Colors.white),
                  SizedBox(width: isSmallScreen ? 4 : 6),
                  Text(
                    'Until ${_formatDate(promo.endDate)}',
                    style: TextStyle(
                      fontSize: isSmallScreen ? 10 : 12,
                      color: Colors.white,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ],
          ),
          SizedBox(height: isSmallScreen ? 6 : 8),
          
          // Minimum order amount
          if (promo.minOrderAmount > 0)
            Row(
              children: [
                Icon(Icons.shopping_cart, size: iconSize, color: Colors.white),
                SizedBox(width: isSmallScreen ? 4 : 6),
                Text(
                  'Min. order: ₱${promo.minOrderAmount.toStringAsFixed(0)}',
                  style: TextStyle(
                    fontSize: isSmallScreen ? 10 : 12,
                    color: Colors.white,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
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
    
    if (widget.promos.isEmpty) {
      return Container(
        height: widget.height,
        width: widget.width,
        margin: widget.padding,
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [Color(0xFF242C5B), Color(0xFF3A4A8C)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(16),
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
          height: widget.height,
          width: widget.width,
          child: PageView.builder(
            controller: _pageController,
            onPageChanged: _onPageChanged,
            itemCount: widget.promos.length,
            itemBuilder: (context, index) {
              final promo = widget.promos[index];
              return Padding(
                padding: widget.padding ?? EdgeInsets.symmetric(
                  horizontal: isSmallScreen ? 4.0 : 8.0,
                ),
                child: PromoCard(
                  promo: promo,
                  onTap: widget.onPromoTap != null ? () => widget.onPromoTap!(promo) : null,
                ),
              );
            },
          ),
        ),
        if (widget.promos.length > 1) ...[
          SizedBox(height: isSmallScreen ? 8 : 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(
              widget.promos.length,
              (index) => Container(
                margin: EdgeInsets.symmetric(horizontal: isSmallScreen ? 3 : 4),
                width: _currentIndex == index ? (isSmallScreen ? 20 : 24) : (isSmallScreen ? 6 : 8),
                height: isSmallScreen ? 6 : 8,
                decoration: BoxDecoration(
                  color: _currentIndex == index 
                    ? Colors.white 
                    : Colors.white.withOpacity(0.5),
                  borderRadius: BorderRadius.circular(4),
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
