class UserModel {
  final String id;
  final String fullName;
  final String username;
  final String email;
  final String role;
  final String source;
  final String birthday;
  final String gender;
  final String employmentStatus;
  final String profilePicture;
  final String password;
  final int points;
  final int reviewPoints;
  final String lastOrder;
  final String qrToken;
  final List<Map<String, dynamic>> pastOrders;
  final List<Map<String, dynamic>> rewardsHistory;
  final String createdAt;
  final String updatedAt;
  final int version;

  UserModel({
    this.id = '',
    this.fullName = '',
    this.username = '',
    this.email = '',
    this.role = 'Customer',
    this.source = 'mobile',
    this.birthday = '',
    this.gender = 'male',
    this.employmentStatus = 'Prefer not to say',
    this.profilePicture = '',
    this.password = '',
    this.points = 0,
    this.reviewPoints = 0,
    this.lastOrder = '',
    this.qrToken = '',
    this.pastOrders = const [],
    this.rewardsHistory = const [],
    this.createdAt = '',
    this.updatedAt = '',
    this.version = 0,
  });

  /// Creates a copy of the current user with optional overrides.
  UserModel copyWith({
    String? id,
    String? fullName,
    String? username,
    String? email,
    String? role,
    String? source,
    String? birthday,
    String? gender,
    String? employmentStatus,
    String? profilePicture,
    String? password,
    int? points,
    int? reviewPoints,
    String? lastOrder,
    String? qrToken,
    List<Map<String, dynamic>>? pastOrders,
    List<Map<String, dynamic>>? rewardsHistory,
    String? createdAt,
    String? updatedAt,
    int? version,
  }) {
    return UserModel(
      id: id ?? this.id,
      fullName: fullName ?? this.fullName,
      username: username ?? this.username,
      email: email ?? this.email,
      role: role ?? this.role,
      source: source ?? this.source,
      birthday: birthday ?? this.birthday,
      gender: gender ?? this.gender,
      employmentStatus: employmentStatus ?? this.employmentStatus,
      profilePicture: profilePicture ?? this.profilePicture,
      password: password ?? this.password,
      points: points ?? this.points,
      reviewPoints: reviewPoints ?? this.reviewPoints,
      lastOrder: lastOrder ?? this.lastOrder,
      qrToken: qrToken ?? this.qrToken,
      pastOrders: pastOrders ?? this.pastOrders,
      rewardsHistory: rewardsHistory ?? this.rewardsHistory,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      version: version ?? this.version,
    );
  }

  /// Create a UserModel instance from JSON data.
  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: _safeString(json['_id'] ?? json['id']),
      fullName: _safeString(json['fullName'] ?? json['FullName'] ?? json['fullname'] ?? json['name']), // Support multiple field names for compatibility
      username: _safeString(json['username'] ?? json['Username']),
      email: _safeString(json['email'] ?? json['Email']),
      role: _safeString(json['role'] ?? json['Role'] ?? json['userType']), // Support multiple field names
      source: _safeString(json['source'] ?? json['Source'] ?? 'mobile'), // Default to mobile for existing users
      birthday: _safeString(json['birthday'] ?? json['Birthday']),
      gender: _safeString(json['gender'] ?? json['Gender']),
      employmentStatus: _safeString(json['employmentStatus'] ?? json['EmploymentStatus']),
      profilePicture: _safeString(json['profilePicture'] ?? json['ProfilePicture']),
      password: _safeString(json['password'] ?? json['Password']),
      points: _safeInt(json['points'] ?? json['Points']),
      reviewPoints: _safeInt(json['reviewPoints'] ?? json['ReviewPoints']),
      lastOrder: _safeString(json['lastOrder'] ?? json['LastOrder']),
      qrToken: _safeString(json['qrToken'] ?? json['QrToken']),
      pastOrders: _safeListOfMaps(json['pastOrders'] ?? json['PastOrders']),
      rewardsHistory: _safeListOfMaps(json['rewardsHistory'] ?? json['RewardsHistory']),
      createdAt: _safeString(json['createdAt'] ?? json['CreatedAt']),
      updatedAt: _safeString(json['updatedAt'] ?? json['UpdatedAt']),
      version: _safeInt(json['__v']),
    );
  }

  /// Safely convert dynamic value to String, handling null values
  static String _safeString(dynamic value) {
    if (value == null) return '';
    return value.toString();
  }

  /// Safely convert dynamic value to int, handling null values
  static int _safeInt(dynamic value) {
    if (value == null) return 0;
    if (value is int) return value;
    if (value is String) return int.tryParse(value) ?? 0;
    return 0;
  }

  /// Safely convert dynamic value to List<Map<String, dynamic>>, handling null values and type issues
  static List<Map<String, dynamic>> _safeListOfMaps(dynamic value) {
    if (value == null) return [];
    if (value is! List) return [];
    
    return value.map((e) {
      if (e is Map<String, dynamic>) {
        return e;
      } else if (e is Map) {
        return Map<String, dynamic>.from(e);
      } else {
        // If the element is not a Map, return an empty map
        return <String, dynamic>{};
      }
    }).toList();
  }

  /// Convert the UserModel instance to JSON format.
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'fullName': fullName,
      'username': username,
      'email': email,
      'role': role,
      'source': source,
      'birthday': birthday,
      'gender': gender,
      'employmentStatus': employmentStatus,
      'profilePicture': profilePicture,
      'password': password,
      'points': points,
      'reviewPoints': reviewPoints,
      'lastOrder': lastOrder,
      'qrToken': qrToken,
      'pastOrders': pastOrders,
      'rewardsHistory': rewardsHistory,
      'createdAt': createdAt,
      'updatedAt': updatedAt,
      '__v': version,
    };
  }
}
