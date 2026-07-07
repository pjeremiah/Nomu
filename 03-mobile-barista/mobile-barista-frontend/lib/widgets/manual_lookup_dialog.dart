import 'package:flutter/material.dart';
import '../api/api.dart';
import '../constants/app_constants.dart';

/// Fallback lookup when the barista cannot scan the customer's QR code.
/// Returns a customer map (includes [qrToken]) when confirmed, or null if cancelled.
class ManualLookupDialog extends StatefulWidget {
  const ManualLookupDialog({super.key});

  static Future<Map<String, dynamic>?> show(BuildContext context) {
    return showDialog<Map<String, dynamic>>(
      context: context,
      barrierDismissible: false,
      builder: (_) => const ManualLookupDialog(),
    );
  }

  @override
  State<ManualLookupDialog> createState() => _ManualLookupDialogState();
}

class _ManualLookupDialogState extends State<ManualLookupDialog> {
  final _queryController = TextEditingController();
  String _searchType = 'email';
  bool _isSearching = false;
  String? _errorMessage;
  Map<String, dynamic>? _foundCustomer;

  @override
  void dispose() {
    _queryController.dispose();
    super.dispose();
  }

  Future<void> _runSearch() async {
    final query = _queryController.text.trim();
    if (query.isEmpty) {
      setState(() {
        _errorMessage = 'Please enter an email or username.';
        _foundCustomer = null;
      });
      return;
    }

    setState(() {
      _isSearching = true;
      _errorMessage = null;
      _foundCustomer = null;
    });

    final result = await ApiService.searchCustomer(query: query, type: _searchType);

    if (!mounted) return;

    if (result == null) {
      setState(() {
        _isSearching = false;
        _errorMessage = AppConstants.networkErrorMessage;
      });
      return;
    }

    if (result.containsKey('error')) {
      setState(() {
        _isSearching = false;
        _errorMessage = result['error']?.toString() ?? AppConstants.customerNotFoundMessage;
      });
      return;
    }

    setState(() {
      _isSearching = false;
      _foundCustomer = result;
      _errorMessage = null;
    });
  }

  void _confirm() {
    final customer = _foundCustomer;
    if (customer == null || (customer['qrToken']?.toString().isEmpty ?? true)) {
      setState(() => _errorMessage = 'Customer has no valid loyalty token.');
      return;
    }
    Navigator.of(context).pop(Map<String, dynamic>.from(customer));
  }

  String _displayName(Map<String, dynamic> c) {
    return (c['fullName'] ?? c['name'] ?? c['username'] ?? 'Customer').toString();
  }

  @override
  Widget build(BuildContext context) {
    final width = MediaQuery.sizeOf(context).width;
    final dialogWidth = width > 600 ? 480.0 : width * 0.92;

    return AlertDialog(
      title: const Text(AppConstants.manualLookupTitle),
      content: SizedBox(
        width: dialogWidth,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                AppConstants.manualLookupSubtitle,
                style: TextStyle(color: Colors.grey.shade700, fontSize: 14),
              ),
              const SizedBox(height: 16),
              SegmentedButton<String>(
                segments: const [
                  ButtonSegment(value: 'email', label: Text(AppConstants.searchByEmailLabel)),
                  ButtonSegment(value: 'username', label: Text(AppConstants.searchByUsernameLabel)),
                ],
                selected: {_searchType},
                onSelectionChanged: (selected) {
                  setState(() {
                    _searchType = selected.first;
                    _foundCustomer = null;
                    _errorMessage = null;
                  });
                },
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _queryController,
                keyboardType:
                    _searchType == 'email' ? TextInputType.emailAddress : TextInputType.text,
                textInputAction: TextInputAction.search,
                onSubmitted: (_) => _runSearch(),
                decoration: InputDecoration(
                  hintText: _searchType == 'email'
                      ? AppConstants.customerSearchHintEmail
                      : AppConstants.customerSearchHintUsername,
                  prefixIcon: Icon(_searchType == 'email' ? Icons.email_outlined : Icons.person_outline),
                  border: const OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 12),
              FilledButton.icon(
                onPressed: _isSearching ? null : _runSearch,
                icon: _isSearching
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                      )
                    : const Icon(Icons.search),
                label: Text(_isSearching ? 'Searching...' : AppConstants.searchCustomerButton),
              ),
              if (_errorMessage != null) ...[
                const SizedBox(height: 12),
                Text(
                  _errorMessage!,
                  style: const TextStyle(color: Colors.red, fontSize: 13),
                ),
              ],
              if (_foundCustomer != null) ...[
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: Colors.green.shade50,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.green.shade200),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Icon(Icons.check_circle, color: Colors.green.shade700, size: 22),
                          const SizedBox(width: 8),
                          Text(
                            AppConstants.customerFoundMessage,
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              color: Colors.green.shade800,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      Text(
                        _displayName(_foundCustomer!),
                        style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w600),
                      ),
                      if (_foundCustomer!['email'] != null)
                        Text(
                          _foundCustomer!['email'].toString(),
                          style: TextStyle(color: Colors.grey.shade700),
                        ),
                      if (_foundCustomer!['username'] != null)
                        Text(
                          '@${_foundCustomer!['username']}',
                          style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
                        ),
                      const SizedBox(height: 6),
                      Text(
                        'Current stamps: ${_foundCustomer!['points'] ?? 0}',
                        style: const TextStyle(fontWeight: FontWeight.w500),
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text(AppConstants.cancelButton),
        ),
        if (_foundCustomer != null)
          FilledButton(
            onPressed: _confirm,
            child: const Text(AppConstants.confirmCustomerButton),
          ),
      ],
    );
  }
}
