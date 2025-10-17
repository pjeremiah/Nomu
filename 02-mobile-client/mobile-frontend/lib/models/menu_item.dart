class MenuItem {
  final String id;
  final String name;
  final double price;
  final String category;
  final String description;
  final String? imageId; // GridFS file ID
  final String? imageUrl; // Full URL to image
  final bool isAvailable;
  final List<String> tags;
  final int preparationTime; // in minutes
  final Map<String, dynamic> nutritionalInfo;
  final String createdAt;
  final String updatedAt;

  MenuItem({
    required this.id,
    required this.name,
    required this.price,
    required this.category,
    this.description = '',
    this.imageId,
    this.imageUrl,
    this.isAvailable = true,
    this.tags = const [],
    this.preparationTime = 5,
    this.nutritionalInfo = const {},
    this.createdAt = '',
    this.updatedAt = '',
  });

  /// Create a MenuItem instance from JSON data
  factory MenuItem.fromJson(Map<String, dynamic> json) {
    return MenuItem(
      id: _safeString(json['_id'] ?? json['id']),
      name: _safeString(json['name']),
      price: _safeDouble(json['price']),
      category: _safeString(json['category']),
      description: _safeString(json['description']),
      imageId: json['imageId']?.toString(),
      imageUrl: json['imageUrl']?.toString(),
      isAvailable: json['isAvailable'] ?? true,
      tags: _safeStringList(json['tags']),
      preparationTime: _safeInt(json['preparationTime']),
      nutritionalInfo: _safeMap(json['nutritionalInfo']),
      createdAt: _safeString(json['createdAt']),
      updatedAt: _safeString(json['updatedAt']),
    );
  }

  /// Convert the MenuItem instance to JSON format
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'price': price,
      'category': category,
      'description': description,
      'imageId': imageId,
      'imageUrl': imageUrl,
      'isAvailable': isAvailable,
      'tags': tags,
      'preparationTime': preparationTime,
      'nutritionalInfo': nutritionalInfo,
      'createdAt': createdAt,
      'updatedAt': updatedAt,
    };
  }

  /// Create a copy of the current MenuItem with optional overrides
  MenuItem copyWith({
    String? id,
    String? name,
    double? price,
    String? category,
    String? description,
    String? imageId,
    String? imageUrl,
    bool? isAvailable,
    List<String>? tags,
    int? preparationTime,
    Map<String, dynamic>? nutritionalInfo,
    String? createdAt,
    String? updatedAt,
  }) {
    return MenuItem(
      id: id ?? this.id,
      name: name ?? this.name,
      price: price ?? this.price,
      category: category ?? this.category,
      description: description ?? this.description,
      imageId: imageId ?? this.imageId,
      imageUrl: imageUrl ?? this.imageUrl,
      isAvailable: isAvailable ?? this.isAvailable,
      tags: tags ?? this.tags,
      preparationTime: preparationTime ?? this.preparationTime,
      nutritionalInfo: nutritionalInfo ?? this.nutritionalInfo,
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
      return '$baseUrl/images/menu/$imageId';
    }
    return '';
  }

  /// Check if the item has an image
  bool get hasImage => (imageId != null && imageId!.isNotEmpty) || 
                      (imageUrl != null && imageUrl!.isNotEmpty);

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

  /// Safely convert dynamic value to int
  static int _safeInt(dynamic value) {
    if (value == null) return 0;
    if (value is int) return value;
    if (value is String) return int.tryParse(value) ?? 0;
    return 0;
  }

  /// Safely convert dynamic value to List<String>
  static List<String> _safeStringList(dynamic value) {
    if (value == null) return [];
    if (value is! List) return [];
    return value.map((e) => e.toString()).toList();
  }

  /// Safely convert dynamic value to Map<String, dynamic>
  static Map<String, dynamic> _safeMap(dynamic value) {
    if (value == null) return {};
    if (value is Map<String, dynamic>) return value;
    if (value is Map) return Map<String, dynamic>.from(value);
    return {};
  }
}
