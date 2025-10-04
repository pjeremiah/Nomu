class InventoryItem {
  final String id;
  final String name;
  final String category;
  final String? imageId; // GridFS file ID
  final String? imageUrl; // Full URL to image
  final String description;
  final String unit; // 'kg', 'liters', 'pieces', etc.
  final double currentStock;
  final double minimumStock;
  final double maximumStock;
  final double unitPrice;
  final String supplier;
  final DateTime? expiryDate;
  final String location; // Storage location
  final bool isActive;
  final Map<String, dynamic> specifications;
  final String createdAt;
  final String updatedAt;

  InventoryItem({
    required this.id,
    required this.name,
    required this.category,
    this.imageId,
    this.imageUrl,
    this.description = '',
    this.unit = 'pieces',
    this.currentStock = 0.0,
    this.minimumStock = 0.0,
    this.maximumStock = 0.0,
    this.unitPrice = 0.0,
    this.supplier = '',
    this.expiryDate,
    this.location = '',
    this.isActive = true,
    this.specifications = const {},
    this.createdAt = '',
    this.updatedAt = '',
  });

  /// Create an InventoryItem instance from JSON data
  factory InventoryItem.fromJson(Map<String, dynamic> json) {
    return InventoryItem(
      id: _safeString(json['_id'] ?? json['id']),
      name: _safeString(json['name']),
      category: _safeString(json['category']),
      imageId: json['imageId']?.toString(),
      imageUrl: json['imageUrl']?.toString(),
      description: _safeString(json['description']),
      unit: _safeString(json['unit']),
      currentStock: _safeDouble(json['currentStock']),
      minimumStock: _safeDouble(json['minimumStock']),
      maximumStock: _safeDouble(json['maximumStock']),
      unitPrice: _safeDouble(json['unitPrice']),
      supplier: _safeString(json['supplier']),
      expiryDate: _parseDateTime(json['expiryDate']),
      location: _safeString(json['location']),
      isActive: json['isActive'] ?? true,
      specifications: _safeMap(json['specifications']),
      createdAt: _safeString(json['createdAt']),
      updatedAt: _safeString(json['updatedAt']),
    );
  }

  /// Convert the InventoryItem instance to JSON format
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'category': category,
      'imageId': imageId,
      'imageUrl': imageUrl,
      'description': description,
      'unit': unit,
      'currentStock': currentStock,
      'minimumStock': minimumStock,
      'maximumStock': maximumStock,
      'unitPrice': unitPrice,
      'supplier': supplier,
      'expiryDate': expiryDate?.toIso8601String(),
      'location': location,
      'isActive': isActive,
      'specifications': specifications,
      'createdAt': createdAt,
      'updatedAt': updatedAt,
    };
  }

  /// Create a copy of the current InventoryItem with optional overrides
  InventoryItem copyWith({
    String? id,
    String? name,
    String? category,
    String? imageId,
    String? imageUrl,
    String? description,
    String? unit,
    double? currentStock,
    double? minimumStock,
    double? maximumStock,
    double? unitPrice,
    String? supplier,
    DateTime? expiryDate,
    String? location,
    bool? isActive,
    Map<String, dynamic>? specifications,
    String? createdAt,
    String? updatedAt,
  }) {
    return InventoryItem(
      id: id ?? this.id,
      name: name ?? this.name,
      category: category ?? this.category,
      imageId: imageId ?? this.imageId,
      imageUrl: imageUrl ?? this.imageUrl,
      description: description ?? this.description,
      unit: unit ?? this.unit,
      currentStock: currentStock ?? this.currentStock,
      minimumStock: minimumStock ?? this.minimumStock,
      maximumStock: maximumStock ?? this.maximumStock,
      unitPrice: unitPrice ?? this.unitPrice,
      supplier: supplier ?? this.supplier,
      expiryDate: expiryDate ?? this.expiryDate,
      location: location ?? this.location,
      isActive: isActive ?? this.isActive,
      specifications: specifications ?? this.specifications,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  /// Get the full image URL for GridFS
  String getFullImageUrl(String baseUrl) {
    if (imageUrl != null && imageUrl!.isNotEmpty) {
      return imageUrl!;
    }
    if (imageId != null && imageId!.isNotEmpty) {
      return '$baseUrl/images/inventory/$imageId';
    }
    return '';
  }

  /// Check if the item has an image
  bool get hasImage => (imageId != null && imageId!.isNotEmpty) || 
                      (imageUrl != null && imageUrl!.isNotEmpty);

  /// Check if stock is low
  bool get isLowStock => currentStock <= minimumStock;

  /// Check if stock is out
  bool get isOutOfStock => currentStock <= 0;

  /// Check if item is expired
  bool get isExpired {
    if (expiryDate == null) return false;
    return DateTime.now().isAfter(expiryDate!);
  }

  /// Get stock status
  String get stockStatus {
    if (isOutOfStock) return 'Out of Stock';
    if (isLowStock) return 'Low Stock';
    if (isExpired) return 'Expired';
    return 'In Stock';
  }

  /// Get stock percentage
  double get stockPercentage {
    if (maximumStock <= 0) return 0.0;
    return (currentStock / maximumStock) * 100;
  }

  /// Safely convert dynamic value to String
  static String _safeString(dynamic value) {
    if (value == null) return '';
    return value.toString();
  }

  /// Safely convert dynamic value to double
  static double _safeDouble(dynamic value) {
    if (value == null) return 0.0;
    if (value is double) return value;
    if (value is int) return value.toDouble();
    if (value is String) return double.tryParse(value) ?? 0.0;
    return 0.0;
  }

  /// Safely convert dynamic value to Map<String, dynamic>
  static Map<String, dynamic> _safeMap(dynamic value) {
    if (value == null) return {};
    if (value is Map<String, dynamic>) return value;
    if (value is Map) return Map<String, dynamic>.from(value);
    return {};
  }

  /// Parse DateTime from various formats
  static DateTime? _parseDateTime(dynamic value) {
    if (value == null) return null;
    if (value is DateTime) return value;
    if (value is String) {
      try {
        return DateTime.parse(value);
      } catch (e) {
        return null;
      }
    }
    return null;
  }
}
