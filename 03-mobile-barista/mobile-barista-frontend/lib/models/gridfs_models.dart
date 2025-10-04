/// GridFS-related models for barista mobile application
/// Handles inventory items, menu items, and image management

class GridFSImage {
  final String id;
  final String filename;
  final String contentType;
  final int size;
  final DateTime uploadDate;
  final String url;
  final Map<String, dynamic> metadata;

  GridFSImage({
    required this.id,
    required this.filename,
    required this.contentType,
    required this.size,
    required this.uploadDate,
    required this.url,
    this.metadata = const {},
  });

  factory GridFSImage.fromJson(Map<String, dynamic> json) {
    return GridFSImage(
      id: json['_id'] ?? json['id'] ?? '',
      filename: json['filename'] ?? '',
      contentType: json['contentType'] ?? 'image/jpeg',
      size: json['size'] ?? 0,
      uploadDate: json['uploadDate'] != null 
          ? DateTime.parse(json['uploadDate']) 
          : DateTime.now(),
      url: json['url'] ?? '',
      metadata: Map<String, dynamic>.from(json['metadata'] ?? {}),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'filename': filename,
      'contentType': contentType,
      'size': size,
      'uploadDate': uploadDate.toIso8601String(),
      'url': url,
      'metadata': metadata,
    };
  }
}

class InventoryItem {
  final String id;
  final String name;
  final String description;
  final String category;
  final String unit;
  final double currentStock;
  final double minimumStock;
  final double maximumStock;
  final double unitPrice;
  final String supplier;
  final DateTime lastUpdated;
  final String imageId;
  final String imageUrl;
  final bool isActive;
  final Map<String, dynamic> metadata;

  InventoryItem({
    required this.id,
    required this.name,
    required this.description,
    required this.category,
    required this.unit,
    required this.currentStock,
    required this.minimumStock,
    required this.maximumStock,
    required this.unitPrice,
    required this.supplier,
    required this.lastUpdated,
    this.imageId = '',
    this.imageUrl = '',
    this.isActive = true,
    this.metadata = const {},
  });

  factory InventoryItem.fromJson(Map<String, dynamic> json) {
    return InventoryItem(
      id: json['_id'] ?? json['id'] ?? '',
      name: json['name'] ?? '',
      description: json['description'] ?? '',
      category: json['category'] ?? '',
      unit: json['unit'] ?? 'pcs',
      currentStock: (json['currentStock'] ?? 0).toDouble(),
      minimumStock: (json['minimumStock'] ?? 0).toDouble(),
      maximumStock: (json['maximumStock'] ?? 0).toDouble(),
      unitPrice: (json['unitPrice'] ?? 0).toDouble(),
      supplier: json['supplier'] ?? '',
      lastUpdated: json['lastUpdated'] != null 
          ? DateTime.parse(json['lastUpdated']) 
          : DateTime.now(),
      imageId: json['imageId'] ?? '',
      imageUrl: json['imageUrl'] ?? '',
      isActive: json['isActive'] ?? true,
      metadata: Map<String, dynamic>.from(json['metadata'] ?? {}),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'description': description,
      'category': category,
      'unit': unit,
      'currentStock': currentStock,
      'minimumStock': minimumStock,
      'maximumStock': maximumStock,
      'unitPrice': unitPrice,
      'supplier': supplier,
      'lastUpdated': lastUpdated.toIso8601String(),
      'imageId': imageId,
      'imageUrl': imageUrl,
      'isActive': isActive,
      'metadata': metadata,
    };
  }

  InventoryItem copyWith({
    String? id,
    String? name,
    String? description,
    String? category,
    String? unit,
    double? currentStock,
    double? minimumStock,
    double? maximumStock,
    double? unitPrice,
    String? supplier,
    DateTime? lastUpdated,
    String? imageId,
    String? imageUrl,
    bool? isActive,
    Map<String, dynamic>? metadata,
  }) {
    return InventoryItem(
      id: id ?? this.id,
      name: name ?? this.name,
      description: description ?? this.description,
      category: category ?? this.category,
      unit: unit ?? this.unit,
      currentStock: currentStock ?? this.currentStock,
      minimumStock: minimumStock ?? this.minimumStock,
      maximumStock: maximumStock ?? this.maximumStock,
      unitPrice: unitPrice ?? this.unitPrice,
      supplier: supplier ?? this.supplier,
      lastUpdated: lastUpdated ?? this.lastUpdated,
      imageId: imageId ?? this.imageId,
      imageUrl: imageUrl ?? this.imageUrl,
      isActive: isActive ?? this.isActive,
      metadata: metadata ?? this.metadata,
    );
  }

  bool get isLowStock => currentStock <= minimumStock;
  bool get isOutOfStock => currentStock <= 0;
  bool get isOverstocked => currentStock >= maximumStock;
}

class MenuItem {
  final String id;
  final String name;
  final String description;
  final String category;
  final double price;
  final bool isAvailable;
  final List<String> ingredients;
  final String imageId;
  final String imageUrl;
  final Map<String, dynamic> nutritionInfo;
  final DateTime createdAt;
  final DateTime updatedAt;
  final Map<String, dynamic> metadata;

  MenuItem({
    required this.id,
    required this.name,
    required this.description,
    required this.category,
    required this.price,
    this.isAvailable = true,
    this.ingredients = const [],
    this.imageId = '',
    this.imageUrl = '',
    this.nutritionInfo = const {},
    required this.createdAt,
    required this.updatedAt,
    this.metadata = const {},
  });

  factory MenuItem.fromJson(Map<String, dynamic> json) {
    return MenuItem(
      id: json['_id'] ?? json['id'] ?? '',
      name: json['name'] ?? '',
      description: json['description'] ?? '',
      category: json['category'] ?? '',
      price: (json['price'] ?? 0).toDouble(),
      isAvailable: json['isAvailable'] ?? true,
      ingredients: List<String>.from(json['ingredients'] ?? []),
      imageId: json['imageId'] ?? '',
      imageUrl: json['imageUrl'] ?? '',
      nutritionInfo: Map<String, dynamic>.from(json['nutritionInfo'] ?? {}),
      createdAt: json['createdAt'] != null 
          ? DateTime.parse(json['createdAt']) 
          : DateTime.now(),
      updatedAt: json['updatedAt'] != null 
          ? DateTime.parse(json['updatedAt']) 
          : DateTime.now(),
      metadata: Map<String, dynamic>.from(json['metadata'] ?? {}),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'description': description,
      'category': category,
      'price': price,
      'isAvailable': isAvailable,
      'ingredients': ingredients,
      'imageId': imageId,
      'imageUrl': imageUrl,
      'nutritionInfo': nutritionInfo,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
      'metadata': metadata,
    };
  }

  MenuItem copyWith({
    String? id,
    String? name,
    String? description,
    String? category,
    double? price,
    bool? isAvailable,
    List<String>? ingredients,
    String? imageId,
    String? imageUrl,
    Map<String, dynamic>? nutritionInfo,
    DateTime? createdAt,
    DateTime? updatedAt,
    Map<String, dynamic>? metadata,
  }) {
    return MenuItem(
      id: id ?? this.id,
      name: name ?? this.name,
      description: description ?? this.description,
      category: category ?? this.category,
      price: price ?? this.price,
      isAvailable: isAvailable ?? this.isAvailable,
      ingredients: ingredients ?? this.ingredients,
      imageId: imageId ?? this.imageId,
      imageUrl: imageUrl ?? this.imageUrl,
      nutritionInfo: nutritionInfo ?? this.nutritionInfo,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      metadata: metadata ?? this.metadata,
    );
  }
}

class StockMovement {
  final String id;
  final String inventoryItemId;
  final String inventoryItemName;
  final String type; // 'in', 'out', 'adjustment'
  final double quantity;
  final String reason;
  final String adminId;
  final String adminName;
  final DateTime timestamp;
  final Map<String, dynamic> metadata;

  StockMovement({
    required this.id,
    required this.inventoryItemId,
    required this.inventoryItemName,
    required this.type,
    required this.quantity,
    required this.reason,
    required this.adminId,
    required this.adminName,
    required this.timestamp,
    this.metadata = const {},
  });

  factory StockMovement.fromJson(Map<String, dynamic> json) {
    return StockMovement(
      id: json['_id'] ?? json['id'] ?? '',
      inventoryItemId: json['inventoryItemId'] ?? '',
      inventoryItemName: json['inventoryItemName'] ?? '',
      type: json['type'] ?? '',
      quantity: (json['quantity'] ?? 0).toDouble(),
      reason: json['reason'] ?? '',
      adminId: json['adminId'] ?? '',
      adminName: json['adminName'] ?? '',
      timestamp: json['timestamp'] != null 
          ? DateTime.parse(json['timestamp']) 
          : DateTime.now(),
      metadata: Map<String, dynamic>.from(json['metadata'] ?? {}),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'inventoryItemId': inventoryItemId,
      'inventoryItemName': inventoryItemName,
      'type': type,
      'quantity': quantity,
      'reason': reason,
      'adminId': adminId,
      'adminName': adminName,
      'timestamp': timestamp.toIso8601String(),
      'metadata': metadata,
    };
  }
}

class ImageUploadRequest {
  final String filePath;
  final String filename;
  final String contentType;
  final String bucket;
  final Map<String, dynamic> metadata;

  ImageUploadRequest({
    required this.filePath,
    required this.filename,
    required this.contentType,
    required this.bucket,
    this.metadata = const {},
  });

  Map<String, dynamic> toJson() {
    return {
      'filePath': filePath,
      'filename': filename,
      'contentType': contentType,
      'bucket': bucket,
      'metadata': metadata,
    };
  }
}

class ImageUploadResponse {
  final bool success;
  final String? imageId;
  final String? imageUrl;
  final String? error;
  final GridFSImage? image;

  ImageUploadResponse({
    required this.success,
    this.imageId,
    this.imageUrl,
    this.error,
    this.image,
  });

  factory ImageUploadResponse.fromJson(Map<String, dynamic> json) {
    return ImageUploadResponse(
      success: json['success'] ?? false,
      imageId: json['imageId'],
      imageUrl: json['imageUrl'],
      error: json['error'],
      image: json['image'] != null ? GridFSImage.fromJson(json['image']) : null,
    );
  }
}
