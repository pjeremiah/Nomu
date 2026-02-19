class UserModel {
  final String id;
  final String name;
  final String email;
  final String username;
  final String birthday;
  final String gender;
  final String userType;
  final String role;
  final String qrToken;
  final String lastOrder;
  final List<Map<String, dynamic>> pastOrders;
  final String profilePicture;
  final int points;
  final int reviewPoints;

  UserModel({
    this.id = '',
    required this.name,
    required this.email,
    required this.username,
    required this.birthday,
    required this.gender,
    this.userType = '',
    this.role = '',
    this.qrToken = '',
    this.lastOrder = '',
    this.pastOrders = const [],
    this.profilePicture = '',
    this.points = 0,
    this.reviewPoints = 0,
  });

  /// Creates a copy of the current user with optional overrides.
  UserModel copyWith({
    String? id,
    String? name,
    String? email,
    String? username,
    String? birthday,
    String? gender,
    String? userType,
    String? role,
    String? qrToken,
    String? lastOrder,
    List<Map<String, dynamic>>? pastOrders,
    String? profilePicture,
    int? points,
    int? reviewPoints,
  }) {
    return UserModel(
      id: id ?? this.id,
      name: name ?? this.name,
      email: email ?? this.email,
      username: username ?? this.username,
      birthday: birthday ?? this.birthday,
      gender: gender ?? this.gender,
      userType: userType ?? this.userType,
      role: role ?? this.role,
      qrToken: qrToken ?? this.qrToken,
      lastOrder: lastOrder ?? this.lastOrder,
      pastOrders: pastOrders ?? this.pastOrders,
      profilePicture: profilePicture ?? this.profilePicture,
      points: points ?? this.points,
      reviewPoints: reviewPoints ?? this.reviewPoints,
    );
  }

  /// Create a UserModel instance from JSON data.
  factory UserModel.fromJson(Map<String, dynamic> json) {
    final role = json['role'] ?? json['userType'] ?? '';
    final userType = json['userType'] ?? json['role'] ?? '';
    
    return UserModel(
      id: json['_id'] ?? json['id'] ?? '',
      name: json['name'] ?? json['fullName'] ?? '',
      email: json['email'] ?? '',
      username: json['username'] ?? json['email'] ?? '',
      birthday: json['birthday'] ?? '',
      gender: json['gender'] ?? '',
      userType: userType,
      role: role,
      qrToken: (role == 'staff' || userType == 'staff') ? '' : (json['qrToken'] ?? ''),
      lastOrder: json['lastOrder'] ?? '',
      pastOrders: (json['pastOrders'] as List<dynamic>?)?.map((e) => Map<String, dynamic>.from(e as Map)).toList() ?? [],
      profilePicture: json['profilePicture'] ?? '',
      points: (role == 'staff' || userType == 'staff') ? 0 : (json['points'] ?? 0),
      reviewPoints: (role == 'staff' || userType == 'staff') ? 0 : (json['reviewPoints'] ?? 0),
    );
  }

  /// Convert the UserModel instance to JSON format.
  Map<String, dynamic> toJson() {
    Map<String, dynamic> json = {
      'id': id,
      'name': name,
      'email': email,
      'username': username,
      'birthday': birthday,
      'gender': gender,
      'userType': userType,
      'role': role,
      'lastOrder': lastOrder,
      'pastOrders': pastOrders,
      'profilePicture': profilePicture,
    };
    
    // Only include points and QR token for customers, not staff
    if (role != 'staff' && userType != 'staff') {
      json['qrToken'] = qrToken;
      json['points'] = points;
      json['reviewPoints'] = reviewPoints;
    }
    
    return json;
  }
}
