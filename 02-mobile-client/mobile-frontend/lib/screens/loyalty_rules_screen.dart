import 'package:flutter/material.dart';

import '../theme/app_theme.dart';



/// One screen: how stamps are earned (matches mobile-backend scan rules), tiers, pickup, cycles.

class LoyaltyRulesScreen extends StatelessWidget {

  const LoyaltyRulesScreen({super.key});



  /// Paid-merchandise minimum to earn 1 stamp per visit (`MINIMUM_SPENDING` on server).

  static const double minimumPaidMerchandise = 100;



  /// Matches `CUSTOMER_MAX_POINTS_PER_DAY` on mobile-backend (1 stamp earned = 1 point).

  static const int maxStampsPerDay = 10;



  /// Matches `CUSTOMER_MAX_SCANS_PER_DAY` on mobile-backend.

  static const int maxQrScansPerDay = 10;



  /// Matches `LOYALTY_TIER_CLAIM_MS` and `LOYALTY_PICKUP_AFTER_CLAIM_MS` on mobile-backend.

  static const int rewardWindowHours = 24;



  static const int tier5Stamps = 5;

  static const int tier10Stamps = 10;



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

              'You earn 1 stamp per qualifying visit, not per item, when your paid merchandise totals at least ₱$minStr.',

              'Stamps are added after the barista completes your order and scans your loyalty QR at checkout.',

              'Your stamp balance is stored on your Nomu account and shown on the Loyalty screen.',

            ],

          ),

          const SizedBox(height: 24),

          _Section(

            icon: Icons.qr_code_scanner_rounded,

            iconColor: AppTheme.primary,

            title: 'Daily limits',

            children: [

              'You can earn up to $maxStampsPerDay stamps per day from qualifying purchases (at most 1 stamp per eligible order).',

              'Your QR code can be scanned at checkout up to $maxQrScansPerDay times per day when earning stamps. Limits reset at the start of each calendar day.',

              'If you hit a daily limit, you will not earn more stamps until the next day, but you can still order as usual.',

              'Free reward pickups (₱0) do not use your daily stamp or scan limits.',

            ],

          ),

          const SizedBox(height: 24),

          _Section(

            icon: Icons.savings_outlined,

            iconColor: AppTheme.primary,

            title: 'Minimum spend',

            children: [

              'Only paid merchandise counts toward the ₱$minStr minimum. Free reward lines (₱0) are excluded.',

              'If your order includes both paid items and a free reward, only the paid portion is checked, for example, ₱80 paid plus a free donut does not earn a stamp.',

              'If paid items are below ₱$minStr for that visit, you will not earn a stamp for that transaction.',

            ],

          ),

          const SizedBox(height: 24),

          _Section(

            icon: Icons.phone_android_rounded,

            iconColor: AppTheme.primary,

            title: 'At the café',

            children: [

              'Sign in to the Nomu app and open your loyalty QR before you order.',

              'Show your QR when you pay or pick up so the barista can scan it.',

              'You must tap Claim in the app before the barista can add a free reward to your order. Walk-in requests without Claim in the app are not valid for loyalty free items.',

              'After you tap Claim, tell staff you are picking up a reward and keep the app open for scanning.',

            ],

          ),

          const SizedBox(height: 24),

          _Section(

            icon: Icons.card_giftcard_rounded,

            iconColor: AppTheme.success,

            title: 'How to redeem',

            children: [

              '$tier5Stamps stamps: free pastry or donut (first reward tier).',

              '$tier10Stamps stamps: free drink or pizza (second reward tier).',

              'Reward options shown in the app follow what Nomu has active, you may see different titles, but tiers are still $tier5Stamps and $tier10Stamps.',

              'When a tier unlocks on your card, you have $rewardWindowHours hours to tap Claim. The loyalty screen shows a countdown while that offer is open.',

              'Claiming the $tier5Stamps-stamp reward does not remove stamps from your card; you can keep earning toward $tier10Stamps in the same cycle.',

              'Claiming the $tier10Stamps-stamp reward resets your stamp count to 0 and starts a new loyalty cycle as soon as you tap Claim (pickup is still within $rewardWindowHours hours).',

              'Each tier can be claimed once per loyalty cycle (5-tier once, 10-tier once).',

            ],

          ),

          const SizedBox(height: 24),

          _Section(

            icon: Icons.schedule_outlined,

            iconColor: AppTheme.neutral500,

            title: '24-hour timers & cycles',

            children: [

              'Claim in app: from the moment you unlock a tier, tap Claim within $rewardWindowHours hours. If you miss that window without claiming, the offer expires the app may show Expired. Your stamp balance does not expire; only the time to tap Claim is limited.',

              'If the $tier5Stamps-stamp Claim window expires without claiming, your stamps usually stay on the card, but you cannot claim that tier again until a new loyalty cycle.',

              'If the $tier10Stamps-stamp Claim window expires without claiming while you still have $tier10Stamps+ stamps, your card can reset to start a new cycle.',

              'Pickup at café: after you tap Claim, visit a Nomu Café within $rewardWindowHours hours and show your QR so a barista can complete pickup. Pickup must finish in that second window.',

              'Each free reward can only be picked up once per Claim. If it was already scanned at the counter, it cannot be issued again for that same Claim.',

              'You can claim the $tier5Stamps-stamp tier and the $tier10Stamps-stamp tier once each per cycle. Many customers claim $tier5Stamps first, then continue earning to $tier10Stamps before claiming the top tier.',

            ],

          ),

          const SizedBox(height: 24),

          _Section(

            icon: Icons.info_outline_rounded,

            iconColor: AppTheme.neutral500,

            title: 'Good to know',

            children: [

              'Loyalty is personal to your account,stamps do not transfer between accounts or devices.',

              'Stamps on your card do not expire over time; only the Claim and pickup timers are limited.',

              'Promotions and discounts on menu items do not replace loyalty rules; earning still depends on paid merchandise and barista scan.',

              'Nomu may adjust rewards or program details; check this screen and the Loyalty tab for the latest behavior.',

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

