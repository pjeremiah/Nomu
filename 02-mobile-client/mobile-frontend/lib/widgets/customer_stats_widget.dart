import 'dart:async';
import 'package:flutter/material.dart';
import '../services/realtime_service.dart';
import '../api/api.dart';

class CustomerStatsWidget extends StatefulWidget {
  const CustomerStatsWidget({Key? key}) : super(key: key);

  @override
  State<CustomerStatsWidget> createState() => _CustomerStatsWidgetState();
}

class _CustomerStatsWidgetState extends State<CustomerStatsWidget> {
  final RealtimeService _realtimeService = RealtimeService();
  Map<String, dynamic> _stats = {};
  bool _isLoading = true;
  StreamSubscription? _statsSubscription;

  @override
  void initState() {
    super.initState();
    _initializeRealtimeUpdates();
    _fetchInitialStats();
  }

  void _initializeRealtimeUpdates() {
    // Listen for real-time customer stats updates
    _statsSubscription = _realtimeService.customerStatsStream.listen((stats) {
      if (mounted) {
        setState(() {
          _stats = stats;
          _isLoading = false;
        });
      }
    });
  }

  Future<void> _fetchInitialStats() async {
    try {
      final response = await ApiService.get('/api/analytics/dashboard-stats');
      if (response != null && mounted) {
        setState(() {
          _stats = response;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
        // Show error message for rate limiting
        if (e.toString().contains('Too many requests')) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Too many requests. Please try again later.'),
              backgroundColor: Colors.orange,
              duration: const Duration(seconds: 3),
            ),
          );
        }
      }
    }
  }

  @override
  void dispose() {
    _statsSubscription?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Card(
        child: Padding(
          padding: EdgeInsets.all(16.0),
          child: Center(
            child: CircularProgressIndicator(),
          ),
        ),
      );
    }

    final totalCustomers = _stats['totalCustomers'] ?? 0;
    final mobileCustomers = _stats['mobileCustomers'] ?? 0;
    final webCustomers = _stats['webCustomers'] ?? 0;
    final newCustomersThisMonth = _stats['newCustomersThisMonth'] ?? 0;
    final newMobileCustomersThisMonth = _stats['newMobileCustomersThisMonth'] ?? 0;
    final newWebCustomersThisMonth = _stats['newWebCustomersThisMonth'] ?? 0;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.people, color: Colors.blue),
                const SizedBox(width: 8),
                const Text(
                  'Customer Statistics',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const Spacer(),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: _realtimeService.isConnected ? Colors.green : Colors.red,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    _realtimeService.isConnected ? 'Live' : 'Offline',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            
            // Total customers
            _buildStatRow(
              'Total Customers',
              totalCustomers.toString(),
              Icons.people_outline,
              Colors.blue,
            ),
            
            const SizedBox(height: 12),
            
            // Source breakdown
            Row(
              children: [
                Expanded(
                  child: _buildStatRow(
                    'Mobile App',
                    mobileCustomers.toString(),
                    Icons.phone_android,
                    Colors.green,
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: _buildStatRow(
                    'Web App',
                    webCustomers.toString(),
                    Icons.web,
                    Colors.orange,
                  ),
                ),
              ],
            ),
            
            const SizedBox(height: 16),
            
            // This month's new customers
            _buildStatRow(
              'New This Month',
              newCustomersThisMonth.toString(),
              Icons.trending_up,
              Colors.purple,
            ),
            
            const SizedBox(height: 12),
            
            // Monthly breakdown
            Row(
              children: [
                Expanded(
                  child: _buildStatRow(
                    'Mobile New',
                    newMobileCustomersThisMonth.toString(),
                    Icons.phone_android,
                    Colors.green,
                    isSmall: true,
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: _buildStatRow(
                    'Web New',
                    newWebCustomersThisMonth.toString(),
                    Icons.web,
                    Colors.orange,
                    isSmall: true,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatRow(
    String label,
    String value,
    IconData icon,
    Color color, {
    bool isSmall = false,
  }) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, color: color, size: isSmall ? 16 : 20),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  label,
                  style: TextStyle(
                    fontSize: isSmall ? 12 : 14,
                    fontWeight: FontWeight.w500,
                    color: Colors.grey[700],
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: TextStyle(
              fontSize: isSmall ? 18 : 24,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
        ],
      ),
    );
  }
}
