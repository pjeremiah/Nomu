import 'package:flutter/material.dart';
import '../api/api.dart';
import '../constants/app_constants.dart';
import '../theme/nomu_app_theme.dart';

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

  Widget _typeChip({required String label, required String value, required IconData icon}) {
    final selected = _searchType == value;
    return Expanded(
      child: Material(
        color: selected ? NomuAppTheme.darkBlue : NomuAppTheme.white,
        borderRadius: NomuAppTheme.buttonRadius,
        child: InkWell(
          onTap: () {
            setState(() {
              _searchType = value;
              _foundCustomer = null;
              _errorMessage = null;
            });
          },
          borderRadius: NomuAppTheme.buttonRadius,
          child: Container(
            height: 44,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              borderRadius: NomuAppTheme.buttonRadius,
              border: Border.all(
                color: selected ? NomuAppTheme.darkBlue : NomuAppTheme.goldBrown,
                width: 1.5,
              ),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  icon,
                  size: 18,
                  color: selected ? NomuAppTheme.white : NomuAppTheme.darkBlue,
                ),
                const SizedBox(width: 6),
                Text(
                  label,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: selected ? NomuAppTheme.white : NomuAppTheme.darkBlue,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final width = MediaQuery.sizeOf(context).width;
    final maxW = width > 600 ? 480.0 : width * 0.92;
    final maxH = MediaQuery.sizeOf(context).height * 0.88;

    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: NomuAppTheme.dialogRadius),
      elevation: 0,
      backgroundColor: Colors.transparent,
      insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
      child: Container(
        constraints: BoxConstraints(maxWidth: maxW, maxHeight: maxH),
        decoration: BoxDecoration(
          color: NomuAppTheme.white,
          borderRadius: NomuAppTheme.dialogRadius,
          boxShadow: NomuAppTheme.dialogShadow,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Flexible(
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(24, 28, 24, 16),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Center(
                      child: Container(
                        width: 56,
                        height: 56,
                        decoration: BoxDecoration(
                          color: NomuAppTheme.darkBlue.withValues(alpha: 0.12),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(
                          Icons.person_search_rounded,
                          color: NomuAppTheme.darkBlue,
                          size: 28,
                        ),
                      ),
                    ),
                    const SizedBox(height: 18),
                    Text(
                      AppConstants.manualLookupTitle,
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w700,
                        color: NomuAppTheme.neutral900,
                        letterSpacing: -0.3,
                      ),
                    ),
                    const SizedBox(height: 10),
                    Text(
                      AppConstants.manualLookupSubtitle,
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontSize: 14,
                        height: 1.45,
                        color: NomuAppTheme.neutral600,
                      ),
                    ),
                    const SizedBox(height: 20),
                    Row(
                      children: [
                        _typeChip(
                          label: AppConstants.searchByEmailLabel,
                          value: 'email',
                          icon: Icons.email_outlined,
                        ),
                        const SizedBox(width: 10),
                        _typeChip(
                          label: AppConstants.searchByUsernameLabel,
                          value: 'username',
                          icon: Icons.person_outline,
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),
                    TextField(
                      controller: _queryController,
                      keyboardType: _searchType == 'email'
                          ? TextInputType.emailAddress
                          : TextInputType.text,
                      textInputAction: TextInputAction.search,
                      onSubmitted: (_) => _runSearch(),
                      style: const TextStyle(color: NomuAppTheme.neutral900),
                      cursorColor: NomuAppTheme.darkBlue,
                      decoration: InputDecoration(
                        hintText: _searchType == 'email'
                            ? AppConstants.customerSearchHintEmail
                            : AppConstants.customerSearchHintUsername,
                        hintStyle: TextStyle(
                            color: NomuAppTheme.neutral600.withValues(alpha: 0.7)),
                        prefixIcon: Icon(
                          _searchType == 'email'
                              ? Icons.email_outlined
                              : Icons.person_outline,
                          color: NomuAppTheme.darkBlue,
                        ),
                        filled: true,
                        fillColor: NomuAppTheme.neutral50,
                        contentPadding: const EdgeInsets.symmetric(
                            horizontal: 16, vertical: 14),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: NomuAppTheme.fieldRadius,
                          borderSide: BorderSide(
                              color:
                                  NomuAppTheme.neutral600.withValues(alpha: 0.25)),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: NomuAppTheme.fieldRadius,
                          borderSide: const BorderSide(
                              color: NomuAppTheme.darkBlue, width: 2),
                        ),
                      ),
                    ),
                    const SizedBox(height: 14),
                    Align(
                      alignment: Alignment.center,
                      child: SizedBox(
                        width: (maxW - 48).clamp(220.0, 300.0),
                        height: 48,
                        child: ElevatedButton.icon(
                          onPressed: _isSearching ? null : _runSearch,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: NomuAppTheme.darkBlue,
                            foregroundColor: NomuAppTheme.white,
                            disabledBackgroundColor:
                                NomuAppTheme.darkBlue.withValues(alpha: 0.45),
                            disabledForegroundColor:
                                NomuAppTheme.white.withValues(alpha: 0.8),
                            elevation: 0,
                            shape: RoundedRectangleBorder(
                                borderRadius: NomuAppTheme.buttonRadius),
                          ),
                          icon: _isSearching
                              ? const SizedBox(
                                  width: 18,
                                  height: 18,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    color: NomuAppTheme.white,
                                  ),
                                )
                              : const Icon(Icons.search, size: 20),
                          label: Text(
                            _isSearching
                                ? 'Searching...'
                                : AppConstants.searchCustomerButton,
                            style: const TextStyle(
                                fontSize: 15, fontWeight: FontWeight.w600),
                          ),
                        ),
                      ),
                    ),
                    if (_errorMessage != null) ...[
                      const SizedBox(height: 12),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 12, vertical: 10),
                        decoration: BoxDecoration(
                          color: NomuAppTheme.error.withValues(alpha: 0.08),
                          borderRadius: NomuAppTheme.buttonRadius,
                          border: Border.all(
                              color: NomuAppTheme.error.withValues(alpha: 0.35)),
                        ),
                        child: Text(
                          _errorMessage!,
                          style: const TextStyle(
                              color: NomuAppTheme.error, fontSize: 13),
                        ),
                      ),
                    ],
                    if (_foundCustomer != null) ...[
                      const SizedBox(height: 16),
                      Container(
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: NomuAppTheme.darkBlue.withValues(alpha: 0.06),
                          borderRadius: NomuAppTheme.buttonRadius,
                          border: Border.all(
                              color:
                                  NomuAppTheme.goldBrown.withValues(alpha: 0.55)),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Icon(Icons.check_circle_rounded,
                                    color: NomuAppTheme.goldDark, size: 22),
                                const SizedBox(width: 8),
                                Text(
                                  AppConstants.customerFoundMessage,
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w700,
                                    color: NomuAppTheme.darkBlue,
                                    fontSize: 15,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 10),
                            Text(
                              _displayName(_foundCustomer!),
                              style: const TextStyle(
                                fontSize: 17,
                                fontWeight: FontWeight.w700,
                                color: NomuAppTheme.neutral900,
                              ),
                            ),
                            if (_foundCustomer!['email'] != null)
                              Padding(
                                padding: const EdgeInsets.only(top: 4),
                                child: Text(
                                  _foundCustomer!['email'].toString(),
                                  style: const TextStyle(
                                    color: NomuAppTheme.neutral600,
                                    fontSize: 14,
                                  ),
                                ),
                              ),
                            if (_foundCustomer!['username'] != null)
                              Text(
                                '@${_foundCustomer!['username']}',
                                style: TextStyle(
                                  color: NomuAppTheme.neutral600
                                      .withValues(alpha: 0.9),
                                  fontSize: 13,
                                ),
                              ),
                            const SizedBox(height: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 10, vertical: 6),
                              decoration: BoxDecoration(
                                color: NomuAppTheme.gold.withValues(alpha: 0.18),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(
                                'Current stamps: ${_foundCustomer!['points'] ?? 0}',
                                style: const TextStyle(
                                  fontWeight: FontWeight.w600,
                                  color: NomuAppTheme.goldDark,
                                  fontSize: 14,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 8, 24, 24),
              child: Align(
                alignment: Alignment.bottomCenter,
                child: NomuAppTheme.modalBottomActions(
                  dialogMaxWidth: maxW,
                  buttons: [
                    OutlinedButton(
                      onPressed: () => Navigator.of(context).pop(),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: NomuAppTheme.goldBrown,
                        side: const BorderSide(
                            color: NomuAppTheme.goldBrown, width: 1.5),
                        shape: RoundedRectangleBorder(
                          borderRadius: NomuAppTheme.buttonRadius,
                        ),
                      ),
                      child: const Text(
                        AppConstants.cancelButton,
                        style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
                      ),
                    ),
                    if (_foundCustomer != null)
                      ElevatedButton(
                        onPressed: _confirm,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: NomuAppTheme.darkBlue,
                          foregroundColor: NomuAppTheme.white,
                          elevation: 0,
                          shape: RoundedRectangleBorder(
                            borderRadius: NomuAppTheme.buttonRadius,
                          ),
                        ),
                        child: const Text(
                          AppConstants.confirmCustomerButton,
                          textAlign: TextAlign.center,
                          style: TextStyle(
                              fontSize: 14, fontWeight: FontWeight.w600),
                        ),
                      ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
