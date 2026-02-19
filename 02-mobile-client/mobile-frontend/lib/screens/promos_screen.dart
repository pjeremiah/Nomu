import 'package:flutter/material.dart';
import '../models/promo.dart';
import '../services/promo_service.dart';
import '../widgets/promo_card.dart';
import '../widgets/empty_state.dart';
import '../config.dart';

class PromosScreen extends StatefulWidget {
  const PromosScreen({Key? key}) : super(key: key);

  @override
  State<PromosScreen> createState() => _PromosScreenState();
}

class _PromosScreenState extends State<PromosScreen> {
  List<Promo> promos = [];
  bool isLoading = true;
  String? error;

  @override
  void initState() {
    super.initState();
    _loadPromos();
  }

  Future<void> _loadPromos() async {
    try {
      setState(() {
        isLoading = true;
        error = null;
      });

      final loadedPromos = await PromoService.getActivePromos();
      
      setState(() {
        promos = loadedPromos;
        isLoading = false;
      });
    } catch (e) {
      setState(() {
        error = e.toString();
        isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      body: SafeArea(
        child: Column(
          children: [
            _buildHeader(),
            Expanded(child: _buildBody()),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Container(
      height: 70,
      width: double.infinity,
      decoration: const BoxDecoration(
        image: DecorationImage(
          image: AssetImage('assets/images/istetik.png'),
          fit: BoxFit.cover,
        ),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        children: [
          const Expanded(
            child: Text(
              'Promotions',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: Colors.white,
              ),
            ),
          ),
          IconButton(
            icon: const Icon(Icons.refresh, color: Colors.white, size: 24),
            onPressed: isLoading ? null : _loadPromos,
          ),
        ],
      ),
    );
  }

  Widget _buildBody() {
    if (isLoading) {
      return const Center(
        child: CircularProgressIndicator(),
      );
    }

    if (error != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(
              Icons.error_outline,
              size: 64,
              color: Colors.red,
            ),
            const SizedBox(height: 16),
            Text(
              'Error loading promos',
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 8),
            Text(
              error!,
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodyMedium,
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: _loadPromos,
              child: const Text('Retry'),
            ),
          ],
        ),
      );
    }

    if (promos.isEmpty) {
      return EmptyStates.noPromos();
    }

    return RefreshIndicator(
      onRefresh: _loadPromos,
      child: ListView.builder(
        itemCount: promos.length,
        itemBuilder: (context, index) {
          final promo = promos[index];
          return PromoCard(
            promo: promo,
            onTap: () => _showPromoDetails(promo),
          );
        },
      ),
    );
  }

  void _showPromoDetails(Promo promo) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(promo.title),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (promo.hasImage)
              ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: FutureBuilder<String>(
                  future: _buildPromoImageUrl(promo.id),
                  builder: (context, snapshot) {
                    if (snapshot.hasData) {
                      return Image.network(
                        snapshot.data!,
                        height: 200,
                        width: double.infinity,
                        fit: BoxFit.cover,
                        errorBuilder: (context, error, stackTrace) => Container(
                          height: 200,
                          color: Colors.grey[300],
                          child: const Icon(Icons.image_not_supported),
                        ),
                        loadingBuilder: (context, child, loadingProgress) {
                          if (loadingProgress == null) return child;
                          return Container(
                            height: 200,
                            color: Colors.grey[300],
                            child: const Center(
                              child: CircularProgressIndicator(),
                            ),
                          );
                        },
                      );
                    }
                    return Container(
                      height: 200,
                      color: Colors.grey[300],
                      child: const Center(
                        child: CircularProgressIndicator(),
                      ),
                    );
                  },
                ),
              ),
            const SizedBox(height: 16),
            Text(promo.description),
            const SizedBox(height: 16),
            Text('Type: ${promo.promoType}'),
            Text('Discount: ${_formatDiscountValue(promo)}'),
            if (promo.minOrderAmount > 0)
              Text('Minimum Order: ₱${promo.minOrderAmount.toStringAsFixed(2)}'),
            Text('Valid until: ${_formatDate(promo.endDate)}'),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }

  String _formatDiscountValue(Promo promo) {
    switch (promo.promoType) {
      case 'Percentage Discount':
        return '${promo.discountValue.toInt()}% OFF';
      case 'Fixed Amount Discount':
        return '₱${promo.discountValue.toInt()} OFF';
      case 'Buy One Get One':
        return 'BOGO';
      case 'Free Item':
        return 'FREE ITEM';
      case 'Loyalty Points Bonus':
        return '+${promo.discountValue.toInt()} Points';
      default:
        return 'Special Offer';
    }
  }

  String _formatDate(DateTime date) {
    return '${date.day}/${date.month}/${date.year}';
  }


  Future<String> _buildPromoImageUrl(String promoId) async {
    final apiBaseUrl = await Config.apiBaseUrl;
    return '$apiBaseUrl/api/promo-image/$promoId';
  }
}
