import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'order_line_display.dart';
import 'order_type_icon.dart';

/// Full-screen Past Orders page (replaces the modal).
class PastOrdersPage extends StatelessWidget {
  final List<Map<String, dynamic>> pastOrders;
  final String Function(String itemType) getItemTypeDisplayName;
  final void Function(BuildContext context, Map<String, dynamic> order) onOrderTap;

  const PastOrdersPage({
    Key? key,
    required this.pastOrders,
    required this.getItemTypeDisplayName,
    required this.onOrderTap,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFFAF9F7),
      appBar: AppBar(
        title: const Text(
          'Past Orders',
          style: TextStyle(
            fontWeight: FontWeight.bold,
            color: Colors.white,
            fontSize: 18,
          ),
        ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios, color: Colors.white, size: 20),
          onPressed: () => Navigator.pop(context),
        ),
        flexibleSpace: Container(
          decoration: const BoxDecoration(
            image: DecorationImage(
              image: AssetImage('assets/images/istetik.png'),
              fit: BoxFit.cover,
            ),
          ),
        ),
        elevation: 0,
      ),
      body: pastOrders.isEmpty
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.receipt_long_outlined, size: 64, color: Colors.grey[400]),
                  const SizedBox(height: 16),
                  Text(
                    'No past orders',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w600,
                      color: Colors.grey[700],
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Your order history will appear here',
                    style: TextStyle(fontSize: 14, color: Colors.grey[600]),
                  ),
                ],
              ),
            )
          : ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: pastOrders.length,
              itemBuilder: (context, index) {
                final narrow = MediaQuery.sizeOf(context).width < 380;
                final order = pastOrders[pastOrders.length - 1 - index];
                final date = DateTime.tryParse(order['date'].toString());
                final isRecent = date != null && DateTime.now().difference(date.toLocal()).inHours < 24;
                final items = order['items'] as List<dynamic>?;
                final isMultipleItems = items != null && items.isNotEmpty;
                final firstItem = isMultipleItems ? items.first : order;
                final firstLine = orderLineAsMap(firstItem);
                final itemNameRaw =
                    firstLine['itemName'] ?? order['itemName'] ?? order['drink'] ?? 'Unknown Item';
                final itemName = orderLineDisplayName(itemNameRaw.toString(), firstLine);
                final itemType = firstLine['itemType'] ?? order['itemType'] ?? 'drink';
                final category = firstLine['category'] ?? order['category'] ?? 'coffee';

                return Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Material(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(14),
                    elevation: 2,
                    shadowColor: Colors.black26,
                    child: InkWell(
                      onTap: () => onOrderTap(context, order),
                      borderRadius: BorderRadius.circular(14),
                      child: Padding(
                        padding: EdgeInsets.all(narrow ? 10 : 14),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            buildOrderHistoryLeadingIcon(
                              itemType: itemType,
                              category: category,
                              isRecent: isRecent,
                              outerSize: narrow ? 42 : 48,
                            ),
                            SizedBox(width: narrow ? 10 : 14),
                            Expanded(
                              child: Column(
                                mainAxisSize: MainAxisSize.min,
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    isMultipleItems
                                        ? (items.length > 1
                                            ? '$itemName +${items.length - 1} more'
                                            : itemName)
                                        : itemName,
                                    style: TextStyle(
                                      fontWeight: FontWeight.w600,
                                      fontSize: narrow ? 14 : 16,
                                      color: const Color(0xFF242C5B),
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                  const SizedBox(height: 4),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFF242C5B).withValues(alpha: 0.1),
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    child: Text(
                                      isMultipleItems
                                          ? (items.length == 1 ? '1 Item' : '${items.length} items')
                                          : getItemTypeDisplayName(itemType),
                                      style: const TextStyle(
                                        fontSize: 11,
                                        fontWeight: FontWeight.w600,
                                        color: Color(0xFF242C5B),
                                      ),
                                    ),
                                  ),
                                  if (date != null) ...[
                                    const SizedBox(height: 6),
                                    Row(
                                      children: [
                                        Icon(Icons.calendar_today, size: 12, color: Colors.grey[600]),
                                        const SizedBox(width: 4),
                                        Expanded(
                                          child: Text(
                                            DateFormat('MMM d, y').format(date.toLocal()),
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                            style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ],
                                ],
                              ),
                            ),
                            SizedBox(width: narrow ? 10 : 14),
                            Padding(
                              padding: EdgeInsets.only(top: narrow ? 6 : 8),
                              child: Icon(
                                Icons.arrow_forward_ios,
                                size: 14,
                                color: Colors.grey[500],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                );
              },
            ),
    );
  }
}
