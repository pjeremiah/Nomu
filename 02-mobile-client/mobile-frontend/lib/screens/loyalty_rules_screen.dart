import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

/// One screen: How points work, Minimum spend, How to redeem, Expiry (if any).
class LoyaltyRulesScreen extends StatelessWidget {
  const LoyaltyRulesScreen({super.key});

  static const double minimumSpending = 100;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        toolbarHeight: 70,
        title: const Text('How loyalty works', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 20)),
        backgroundColor: Colors.transparent,
        elevation: 0,
        iconTheme: const IconThemeData(color: Colors.white),
        flexibleSpace: Container(
          decoration: const BoxDecoration(
            image: DecorationImage(
              image: AssetImage('assets/images/istetik.png'),
              fit: BoxFit.cover,
            ),
          ),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          _Section(
            icon: Icons.star_rounded,
            iconColor: AppTheme.accent,
            title: 'How points work',
            children: [
              'You earn 1 point for every ₱${minimumSpending.toStringAsFixed(0)} you spend at Nomu Cafe.',
              'Points are added when your order is completed and your QR code is scanned at checkout.',
            ],
          ),
          const SizedBox(height: 24),
          _Section(
            icon: Icons.savings_outlined,
            iconColor: AppTheme.primary,
            title: 'Minimum spend',
            children: [
              'Minimum spend to earn points: ₱${minimumSpending.toStringAsFixed(0)} per order.',
              'Orders below this amount will not earn points, but still count toward your visit.',
            ],
          ),
          const SizedBox(height: 24),
          _Section(
            icon: Icons.card_giftcard_rounded,
            iconColor: AppTheme.success,
            title: 'How to redeem',
            children: [
              '5 points = 1 free drink (any branch).',
              '10 points = 1 premium treat (any branch).',
              'Tell the barista you\'re claiming a reward and show this app when you order.',
            ],
          ),
          const SizedBox(height: 24),
          _Section(
            icon: Icons.schedule_outlined,
            iconColor: AppTheme.neutral500,
            title: 'Rewards',
            children: [
              'Points and rewards do not expire.',
              'You can only claim each reward tier once per cycle. New cycles may be announced in-app.',
            ],
          ),
        ],
      ),
    );
  }
}

class _Section extends StatelessWidget {
  final IconData icon;
  final Color iconColor;
  final String title;
  final List<String> children;

  const _Section({
    required this.icon,
    required this.iconColor,
    required this.title,
    required this.children,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppTheme.neutral0,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.neutral200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, color: iconColor, size: 28),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  title,
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        color: AppTheme.primary,
                        fontWeight: FontWeight.w700,
                      ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ...children.map(
            (e) => Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '• ',
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: AppTheme.neutral500,
                        ),
                  ),
                  Expanded(
                    child: Text(
                      e,
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: AppTheme.neutral700,
                          ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
