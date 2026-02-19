import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../theme/app_theme.dart';

/// Receipt-style order summary: items, total, points earned.
class ReceiptSummary extends StatelessWidget {
  final String? orderId;
  final List<Map<String, dynamic>> items;
  final double totalPrice;
  final int pointsEarned;
  final bool isEligibleForPoints;
  final DateTime? date;

  const ReceiptSummary({
    super.key,
    this.orderId,
    required this.items,
    required this.totalPrice,
    this.pointsEarned = 0,
    this.isEligibleForPoints = false,
    this.date,
  });

  @override
  Widget build(BuildContext context) {
    final dt = date ?? DateTime.now();
    final formatter = NumberFormat.currency(locale: 'en_PH', symbol: '₱', decimalDigits: 2);

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppTheme.neutral0,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.neutral200),
        boxShadow: [
          BoxShadow(
            color: AppTheme.neutral400.withOpacity(0.08),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          // Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Order summary',
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      color: AppTheme.primary,
                      fontWeight: FontWeight.w700,
                    ),
              ),
              Text(
                DateFormat('MMM d, y • h:mm a').format(dt),
                style: Theme.of(context).textTheme.labelMedium?.copyWith(
                      color: AppTheme.neutral500,
                    ),
              ),
            ],
          ),
          if (orderId != null && orderId!.isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(
              'ID: $orderId',
              style: Theme.of(context).textTheme.labelSmall?.copyWith(
                    color: AppTheme.neutral400,
                  ),
            ),
          ],
          const SizedBox(height: 16),
          const Divider(height: 1),
          const SizedBox(height: 12),
          // Items
          ...items.asMap().entries.map((e) {
            final item = e.value;
            final name = item['itemName'] as String? ?? item['name'] as String? ?? 'Item';
            final qty = (item['quantity'] as num?)?.toInt() ?? 1;
            final price = (item['price'] as num?)?.toDouble() ?? 0.0;
            final lineTotal = price * qty;
            return Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Text(
                      '${qty > 1 ? "$qty × " : ""}$name',
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: AppTheme.neutral700,
                          ),
                    ),
                  ),
                  Text(
                    formatter.format(lineTotal),
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          fontWeight: FontWeight.w600,
                          color: AppTheme.neutral800,
                        ),
                  ),
                ],
              ),
            );
          }),
          const Divider(height: 24),
          // Total
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Total',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      color: AppTheme.neutral700,
                    ),
              ),
              Text(
                formatter.format(totalPrice),
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.w700,
                      color: AppTheme.primary,
                    ),
              ),
            ],
          ),
          if (isEligibleForPoints && pointsEarned > 0) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: AppTheme.successLight,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: AppTheme.success.withOpacity(0.3)),
              ),
              child: Row(
                children: [
                  Icon(Icons.star_rounded, color: AppTheme.accent, size: 22),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'You earned $pointsEarned point${pointsEarned == 1 ? '' : 's'}!',
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            fontWeight: FontWeight.w600,
                            color: AppTheme.success,
                          ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}
