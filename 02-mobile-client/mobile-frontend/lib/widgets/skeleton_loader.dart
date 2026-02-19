import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

/// Shimmer skeleton box.
class SkeletonBox extends StatefulWidget {
  final double width;
  final double height;
  final BorderRadius? borderRadius;

  const SkeletonBox({
    super.key,
    required this.width,
    required this.height,
    this.borderRadius,
  });

  @override
  State<SkeletonBox> createState() => _SkeletonBoxState();
}

class _SkeletonBoxState extends State<SkeletonBox>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    )..repeat();
    _animation = Tween<double>(begin: 0.3, end: 0.7).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _animation,
      builder: (context, child) {
        return Container(
          width: widget.width,
          height: widget.height,
          decoration: BoxDecoration(
            borderRadius: widget.borderRadius ?? BorderRadius.circular(8),
            color: AppTheme.neutral200.withOpacity(0.4 + _animation.value * 0.35),
          ),
        );
      },
    );
  }
}

/// Skeleton for loyalty points card.
class SkeletonLoyaltyCard extends StatelessWidget {
  const SkeletonLoyaltyCard({super.key});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SkeletonBox(width: 140, height: 20, borderRadius: BorderRadius.all(Radius.circular(6))),
          const SizedBox(height: 16),
          const SkeletonBox(width: 80, height: 36, borderRadius: BorderRadius.all(Radius.circular(8))),
          const SizedBox(height: 12),
          const SkeletonBox(width: double.infinity, height: 12, borderRadius: BorderRadius.all(Radius.circular(4))),
          const SizedBox(height: 6),
          SkeletonBox(width: MediaQuery.of(context).size.width * 0.5, height: 12, borderRadius: const BorderRadius.all(Radius.circular(4))),
        ],
      ),
    );
  }
}

/// Skeleton for a single order list item.
class SkeletonOrderItem extends StatelessWidget {
  const SkeletonOrderItem({super.key});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(
        children: [
          const SkeletonBox(width: 48, height: 48, borderRadius: BorderRadius.all(Radius.circular(12))),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SkeletonBox(width: 120, height: 14, borderRadius: BorderRadius.all(Radius.circular(4))),
                const SizedBox(height: 6),
                const SkeletonBox(width: 80, height: 12, borderRadius: BorderRadius.all(Radius.circular(4))),
              ],
            ),
          ),
          const SkeletonBox(width: 50, height: 16, borderRadius: BorderRadius.all(Radius.circular(4))),
        ],
      ),
    );
  }
}

/// Skeleton for promo cards (horizontal list).
class SkeletonPromoList extends StatelessWidget {
  const SkeletonPromoList({super.key});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 160,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: 3,
        itemBuilder: (_, __) => Padding(
          padding: const EdgeInsets.only(right: 12),
          child: SkeletonBox(
            width: 220,
            height: 160,
            borderRadius: BorderRadius.circular(16),
          ),
        ),
      ),
    );
  }
}
