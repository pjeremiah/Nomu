import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

/// One screen: how stamps are earned (matches mobile-backend scan rules), tiers, pickup, cycles.
class LoyaltyRulesScreen extends StatelessWidget {
  const LoyaltyRulesScreen({super.key});

  /// Paid-merchandise minimum to earn 1 stamp per visit (`MINIMUM_SPENDING` on server).
  static const double minimumPaidMerchandise = 100;

  @override
  Widget build(BuildContext context) {
    final minStr = minimumPaidMerchandise.toStringAsFixed(0);
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
            title: 'How stamps work',
            children: [
              'You earn 1 stamp per qualifying visit when your paid order totals at least ₱$minStr (before free reward items).',
              'Stamps are added when the barista completes your order and scans your QR at checkout.',
            ],
          ),
          const SizedBox(height: 24),
          _Section(
            icon: Icons.savings_outlined,
            iconColor: AppTheme.primary,
            title: 'Minimum spend',
            children: [
              'Only paid merchandise counts toward the ₱$minStr minimum. Free reward pickups (₱0) do not earn a stamp.',
              'If paid items are below ₱$minStr for that visit, you will not earn a stamp for that transaction.',
            ],
          ),
          const SizedBox(height: 24),
          _Section(
            icon: Icons.card_giftcard_rounded,
            iconColor: AppTheme.success,
            title: 'How to redeem',
            children: [
              '5 stamps: claim a free pastry or donut (first tier; any branch).',
              '10 stamps: claim a free drink or pizza (second tier; any branch).',
              'Tap Claim in the app, then tell the barista you\'re picking up a reward and show this app when you order.',
            ],
          ),
          const SizedBox(height: 24),
          _Section(
            icon: Icons.schedule_outlined,
            iconColor: AppTheme.neutral500,
            title: 'Pickup & loyalty cycles',
            children: [
              'After you claim a reward in the app, visit a Nomu Café within 24 hours and show your QR so a barista can complete pickup.',
              'You can claim the 5-stamp tier and the 10-stamp tier once each per loyalty cycle. Claiming the 10-stamp reward starts a new cycle on your card.',
              'Stamps you have already earned do not expire; the 24-hour window applies to pickup after you claim, not to your stamp balance.',
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
