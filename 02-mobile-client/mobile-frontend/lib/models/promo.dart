class Promo {
  final String id;
  final String title;
  final String description;
  final String promoType;
  final double discountValue;
  final double minOrderAmount;
  final DateTime startDate;
  final DateTime endDate;
  final String? imageUrl;
  final String? imageId;
  final String status;
  final bool isActive;

  Promo({
    required this.id,
    required this.title,
    required this.description,
    required this.promoType,
    required this.discountValue,
    required this.minOrderAmount,
    required this.startDate,
    required this.endDate,
    this.imageUrl,
    this.imageId,
    required this.status,
    required this.isActive,
  });

  factory Promo.fromJson(Map<String, dynamic> json) {
    return Promo(
      id: json['_id'] ?? '',
      title: json['title'] ?? '',
      description: json['description'] ?? '',
      promoType: json['promoType'] ?? '',
      discountValue: (json['discountValue'] ?? 0).toDouble(),
      minOrderAmount: (json['minOrderAmount'] ?? 0).toDouble(),
      startDate: DateTime.parse(json['startDate']),
      endDate: DateTime.parse(json['endDate']),
      imageUrl: json['imageUrl'],
      imageId: json['imageId'],
      status: json['status'] ?? '',
      isActive: json['isActive'] ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'description': description,
      'promoType': promoType,
      'discountValue': discountValue,
      'minOrderAmount': minOrderAmount,
      'startDate': startDate.toIso8601String(),
      'endDate': endDate.toIso8601String(),
      'imageUrl': imageUrl,
      'imageId': imageId,
      'status': status,
      'isActive': isActive,
    };
  }

  Promo copyWith({
    String? id,
    String? title,
    String? description,
    String? promoType,
    double? discountValue,
    double? minOrderAmount,
    DateTime? startDate,
    DateTime? endDate,
    String? imageUrl,
    String? imageId,
    String? status,
    bool? isActive,
  }) {
    return Promo(
      id: id ?? this.id,
      title: title ?? this.title,
      description: description ?? this.description,
      promoType: promoType ?? this.promoType,
      discountValue: discountValue ?? this.discountValue,
      minOrderAmount: minOrderAmount ?? this.minOrderAmount,
      startDate: startDate ?? this.startDate,
      endDate: endDate ?? this.endDate,
      imageUrl: imageUrl ?? this.imageUrl,
      imageId: imageId ?? this.imageId,
      status: status ?? this.status,
      isActive: isActive ?? this.isActive,
    );
  }

  /// Check if the promo is currently active
  bool get isCurrentlyActive {
    final now = DateTime.now();
    return isActive && now.isAfter(startDate) && now.isBefore(endDate);
  }

  /// Check if the promo has an image (either GridFS or URL)
  bool get hasImage => (imageId != null && imageId!.isNotEmpty) || 
                      (imageUrl != null && imageUrl!.isNotEmpty);

  /// Get formatted discount text
  String get discountText {
    switch (promoType) {
      case 'percentage':
        return '${discountValue.toInt()}% OFF';
      case 'fixed':
        return '₱${discountValue.toInt()} OFF';
      case 'buy_one_get_one':
        return 'Buy 1 Get 1';
      default:
        return 'Special Offer';
    }
  }
}
