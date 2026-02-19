import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

/// Empty state with icon, title, subtitle, and optional action.
class EmptyState extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final Widget? action;
  final Color? iconColor;

  const EmptyState({
    super.key,
    required this.icon,
    required this.title,
    required this.subtitle,
    this.action,
    this.iconColor,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              icon,
              size: 80,
              color: iconColor ?? AppTheme.neutral300,
            ),
            const SizedBox(height: 24),
            Text(
              title,
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    color: AppTheme.neutral700,
                  ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              subtitle,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: AppTheme.neutral500,
                  ),
              textAlign: TextAlign.center,
            ),
            if (action != null) ...[
              const SizedBox(height: 24),
              action!,
            ],
          ],
        ),
      ),
    );
  }
}

/// Presets for common empty states.
class EmptyStates {
  static Widget noOrders({VoidCallback? onTap}) => EmptyState(
        icon: Icons.receipt_long_outlined,
        title: 'No orders yet',
        subtitle: 'Your order history will show here after your first visit.',
        action: onTap != null
            ? FilledButton.icon(
                onPressed: onTap,
                icon: const Icon(Icons.explore),
                label: const Text('Find a branch'),
                style: FilledButton.styleFrom(
                  minimumSize: const Size(0, AppTheme.minTouchTarget),
                ),
              )
            : null,
      );

  static Widget noPromos() => const EmptyState(
        icon: Icons.local_offer_outlined,
        title: 'No promos right now',
        subtitle: 'Check back later for new deals and offers.',
      );

  static Widget noRewards() => const EmptyState(
        icon: Icons.card_giftcard_outlined,
        title: 'No rewards yet',
        subtitle: 'Earn points with every order and unlock your first reward at 5 points.',
        iconColor: AppTheme.accent,
      );
}
