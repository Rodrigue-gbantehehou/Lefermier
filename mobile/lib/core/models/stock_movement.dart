class StockMovement {
  final String id;
  final String itemId;
  final String itemName;
  final String itemCategory;
  final String type; // 'INCOMING', 'FEEDING', 'LOSS', 'ADJUSTMENT'
  final double quantity;
  final String unit;
  final String unitLabel;
  final String unitShortLabel;
  final int? unitPrice;
  final int? totalCost;
  final String movementDate;
  final String? reason;
  final String? flockId;
  final String? flockName;
  final String? recordedByName;
  final String? createdAt;

  const StockMovement({
    required this.id,
    required this.itemId,
    required this.itemName,
    required this.itemCategory,
    required this.type,
    required this.quantity,
    required this.unit,
    required this.unitLabel,
    required this.unitShortLabel,
    this.unitPrice,
    this.totalCost,
    required this.movementDate,
    this.reason,
    this.flockId,
    this.flockName,
    this.recordedByName,
    this.createdAt,
  });

  bool get isIncoming => type == 'INCOMING' || type == 'IN';
  bool get isFeeding => type == 'FEEDING' || type == 'OUT';
  bool get isLoss => type == 'LOSS';
  bool get isAdjustment => type == 'ADJUSTMENT';
  bool get isHealthConsumption => type == 'HEALTH_CONSUMPTION';

  String get typeLabel {
    if (isIncoming) return "Approvisionnement";
    if (isFeeding) return "Utilisation / Nourri";
    if (isHealthConsumption) return "Soin / Vaccin";
    if (isLoss) return "Perte / Avarie";
    if (isAdjustment) return "Ajustement";
    return type;
  }

  factory StockMovement.fromJson(Map<String, dynamic> json) {
    final flockMap = json['flock'] as Map<String, dynamic>?;
    final recordedByMap = json['recordedBy'] as Map<String, dynamic>?;

    return StockMovement(
      id: json['id'] as String? ?? "",
      itemId: json['itemId'] as String? ?? "",
      itemName: json['itemName'] as String? ?? "Article",
      itemCategory: json['itemCategory'] as String? ?? "FEED",
      type: json['type'] as String? ?? "FEEDING",
      quantity: (json['quantity'] as num?)?.toDouble() ?? 0.0,
      unit: json['unit'] as String? ?? "KG",
      unitLabel: json['unitLabel'] as String? ?? "kg",
      unitShortLabel: json['unitShortLabel'] as String? ?? "kg",
      unitPrice: (json['unitPrice'] as num?)?.toInt(),
      totalCost: (json['totalCost'] as num?)?.toInt(),
      movementDate: json['movementDate'] as String? ?? "",
      reason: json['reason'] as String?,
      flockId: flockMap?['id'] as String?,
      flockName: flockMap?['name'] as String?,
      recordedByName: recordedByMap?['name'] as String?,
      createdAt: json['createdAt'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'itemId': itemId,
        'type': type,
        'quantity': quantity,
        'unit': unit,
        'movementDate': movementDate,
        'reason': reason,
        'flockId': flockId,
      };
}
