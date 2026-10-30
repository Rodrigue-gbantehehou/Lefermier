class Flock {
  final String id;
  final String? code;
  final String name;
  final String type; // LAYER, BROILER, MIXED
  final String breed; // Souche (Lohmann, Cobb 500, Goliath...)
  final int initialQuantity;
  final int currentQuantity;
  final String startDate;
  final String status; // ACTIVE, SOLD, DEPLETED, COMPLETED
  final String? buildingId;
  final String? buildingName;
  final int? ageInDays;
  final int? ageInWeeks;
  final double? mortalityRate;
  final String? notes;

  const Flock({
    required this.id,
    this.code,
    required this.name,
    required this.type,
    required this.breed,
    required this.initialQuantity,
    required this.currentQuantity,
    required this.startDate,
    this.status = "ACTIVE",
    this.buildingId,
    this.buildingName,
    this.ageInDays,
    this.ageInWeeks,
    this.mortalityRate,
    this.notes,
  });

  bool get isLayer => type == "LAYER" || type == "MIXED";
  bool get isBroiler => type == "BROILER";
  bool get isActive => status == "ACTIVE";

  int get deathsCount => (initialQuantity - currentQuantity).clamp(0, initialQuantity);

  double get calculatedMortalityRate =>
      mortalityRate ??
      (initialQuantity > 0
          ? (((initialQuantity - currentQuantity) / initialQuantity) * 100)
          : 0.0);

  String get typeLabel {
    switch (type) {
      case "LAYER":
        return "Pondeuses";
      case "BROILER":
        return "Poulets de chair";
      case "MIXED":
        return "Mixte / Repro";
      default:
        return type;
    }
  }

  factory Flock.fromJson(Map<String, dynamic> json) {
    return Flock(
      id: json['id'] as String? ?? "",
      code: json['code'] as String?,
      name: json['name'] as String? ?? "Bande sans nom",
      type: json['poultryType'] as String? ?? json['type'] as String? ?? "LAYER",
      breed: json['strain'] as String? ?? json['breed'] as String? ?? "Standard",
      initialQuantity: json['initialQuantity'] as int? ?? 0,
      currentQuantity: json['currentQuantity'] as int? ?? (json['initialQuantity'] as int? ?? 0),
      startDate: json['startDate'] as String? ?? "",
      status: json['status'] as String? ?? "ACTIVE",
      buildingId: json['building']?['id'] as String? ?? json['buildingId'] as String?,
      buildingName: json['building']?['name'] as String?,
      ageInDays: json['ageInDays'] as int?,
      ageInWeeks: json['ageInWeeks'] as int?,
      mortalityRate: (json['mortalityRate'] as num?)?.toDouble(),
      notes: json['notes'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'code': code,
        'name': name,
        'type': type,
        'breed': breed,
        'initialQuantity': initialQuantity,
        'currentQuantity': currentQuantity,
        'startDate': startDate,
        'status': status,
        'buildingId': buildingId,
        'notes': notes,
      };
}
