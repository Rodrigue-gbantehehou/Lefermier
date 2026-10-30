class Farm {
  final String id;
  final String name;
  final String? code;
  final String? productionType;
  final String? city;
  final String? currency;

  const Farm({
    required this.id,
    required this.name,
    this.code,
    this.productionType,
    this.city,
    this.currency = "XOF",
  });

  factory Farm.fromJson(Map<String, dynamic> json) {
    return Farm(
      id: json['id'] as String,
      name: json['name'] as String,
      code: json['code'] as String?,
      productionType: json['productionType'] as String?,
      city: (json['locationCity'] ?? json['city']) as String?,
      currency: json['currency'] as String? ?? "XOF",
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'code': code,
    'productionType': productionType,
    'city': city,
    'currency': currency,
  };
}
