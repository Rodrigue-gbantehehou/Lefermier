class HealthTreatment {
  final String id;
  final String title;
  final String type; // VACCINATION, ANTIBIOTIC, DEWORMING, VITAMIN, DISINFECTION, OTHER
  final String typeLabel;
  final String administrationMethod; // DRINKING_WATER, EYE_DROP, INJECTION, FEED, SPRAY, TOPICAL, OTHER
  final String administrationMethodLabel;
  final int? targetAgeDays;
  final String scheduledDate;
  final String? administeredDate;
  final String status; // SCHEDULED, COMPLETED, CANCELLED
  final String statusLabel;
  final bool isOverdue;
  final double? quantityUsed;
  final int? costFcfa;
  final String? veterinarian;
  final String? notes;
  final String flockId;
  final String flockName;
  final int? flockCurrentQuantity;

  const HealthTreatment({
    required this.id,
    required this.title,
    required this.type,
    required this.typeLabel,
    required this.administrationMethod,
    required this.administrationMethodLabel,
    this.targetAgeDays,
    required this.scheduledDate,
    this.administeredDate,
    required this.status,
    required this.statusLabel,
    this.isOverdue = false,
    this.quantityUsed,
    this.costFcfa,
    this.veterinarian,
    this.notes,
    required this.flockId,
    required this.flockName,
    this.flockCurrentQuantity,
  });

  bool get isCompleted => status == "COMPLETED";
  bool get isScheduled => status == "SCHEDULED";

  factory HealthTreatment.fromJson(Map<String, dynamic> json) {
    return HealthTreatment(
      id: json['id'] as String? ?? "",
      title: json['title'] as String? ?? "Soin / Vaccin",
      type: json['type'] as String? ?? "VACCINATION",
      typeLabel: json['typeLabel'] as String? ?? (json['type'] as String? ?? "Vaccin"),
      administrationMethod: json['administrationMethod'] as String? ?? "DRINKING_WATER",
      administrationMethodLabel: json['administrationMethodLabel'] as String? ?? "Eau de boisson",
      targetAgeDays: (json['targetAgeDays'] as num?)?.toInt(),
      scheduledDate: json['scheduledDate'] as String? ?? "",
      administeredDate: json['administeredDate'] as String?,
      status: json['status'] as String? ?? "SCHEDULED",
      statusLabel: json['statusLabel'] as String? ?? "Prévu",
      isOverdue: json['isOverdue'] as bool? ?? false,
      quantityUsed: (json['quantityUsed'] as num?)?.toDouble(),
      costFcfa: (json['costFcfa'] as num?)?.toInt(),
      veterinarian: json['veterinarian'] as String?,
      notes: json['notes'] as String?,
      flockId: json['flock']?['id'] as String? ?? "",
      flockName: json['flock']?['name'] as String? ?? "Bande",
      flockCurrentQuantity: (json['flock']?['currentQuantity'] as num?)?.toInt(),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'title': title,
        'type': type,
        'administrationMethod': administrationMethod,
        'targetAgeDays': targetAgeDays,
        'scheduledDate': scheduledDate,
        'administeredDate': administeredDate,
        'status': status,
        'notes': notes,
      };
}
