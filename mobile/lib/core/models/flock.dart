class Flock {
  final String id;
  final String name;
  final String type; // LAYER, BROILER, MIXED
  final String breed;
  final int initialQuantity;
  final int currentQuantity;
  final String startDate;
  final String status; // ACTIVE, SOLD, DEPLETED
  final String? buildingId;
  final String? buildingName;

  const Flock({
    required this.id,
    required this.name,
    required this.type,
    required this.breed,
    required this.initialQuantity,
    required this.currentQuantity,
    required this.startDate,
    this.status = "ACTIVE",
    this.buildingId,
    this.buildingName,
  });

  bool get isLayer => type == "LAYER" || type == "MIXED";
  bool get isBroiler => type == "BROILER";

  factory Flock.fromJson(Map<String, dynamic> json) {
    return Flock(
      id: json['id'] as String,
      name: json['name'] as String,
      type: json['type'] as String? ?? "LAYER",
      breed: json['breed'] as String? ?? "",
      initialQuantity: json['initialQuantity'] as int? ?? 0,
      currentQuantity: json['currentQuantity'] as int? ?? (json['initialQuantity'] as int? ?? 0),
      startDate: json['startDate'] as String? ?? "",
      status: json['status'] as String? ?? "ACTIVE",
      buildingId: json['buildingId'] as String?,
      buildingName: json['building']?['name'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'type': type,
    'breed': breed,
    'initialQuantity': initialQuantity,
    'currentQuantity': currentQuantity,
    'startDate': startDate,
    'status': status,
    'buildingId': buildingId,
  };
}
