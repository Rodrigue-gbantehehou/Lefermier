class InventoryItem {
  final String id;
  final String name;
  final String category; // FEED, RAW_MATERIAL, MEDICINE, EQUIPMENT, LITTER, OTHER
  final String? customCategory;
  final String unit; // BAG_50KG, BAG_25KG, KG, LITER, DOSE, UNIT, TRAY_30
  final String unitLabel;
  final String unitShortLabel;
  final double? packageWeightKg;
  final double currentStock;
  final double? alertThreshold;
  final bool isLowStock;
  final int? unitPrice; // En FCFA
  final int? estimatedTotalValue; // En FCFA
  final String? notes;
  final bool isActive;

  const InventoryItem({
    required this.id,
    required this.name,
    required this.category,
    this.customCategory,
    required this.unit,
    required this.unitLabel,
    required this.unitShortLabel,
    this.packageWeightKg,
    required this.currentStock,
    this.alertThreshold,
    this.isLowStock = false,
    this.unitPrice,
    this.estimatedTotalValue,
    this.notes,
    this.isActive = true,
  });

  String get categoryLabel {
    switch (category) {
      case "FEED":
        return "Aliments complets";
      case "RAW_MATERIAL":
        return "Matières premières";
      case "MEDICINE":
        return "Produits vétérinaires";
      case "EQUIPMENT":
        return "Matériel d'élevage";
      case "LITTER":
        return "Litière / Copeaux";
      default:
        return customCategory ?? "Autre intrant";
    }
  }

  factory InventoryItem.fromJson(Map<String, dynamic> json) {
    return InventoryItem(
      id: json['id'] as String? ?? "",
      name: json['name'] as String? ?? "Article sans nom",
      category: json['category'] as String? ?? "FEED",
      customCategory: json['customCategory'] as String?,
      unit: json['unit'] as String? ?? "KG",
      unitLabel: json['unitLabel'] as String? ?? (json['unit'] as String? ?? "kg"),
      unitShortLabel: json['unitShortLabel'] as String? ?? (json['unit'] as String? ?? "kg"),
      packageWeightKg: (json['packageWeightKg'] as num?)?.toDouble(),
      currentStock: (json['currentStock'] as num?)?.toDouble() ?? 0.0,
      alertThreshold: (json['alertThreshold'] as num?)?.toDouble(),
      isLowStock: json['isLowStock'] as bool? ?? false,
      unitPrice: (json['unitPrice'] as num?)?.toInt(),
      estimatedTotalValue: (json['estimatedTotalValue'] as num?)?.toInt(),
      notes: json['notes'] as String?,
      isActive: json['isActive'] as bool? ?? true,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'category': category,
        'unit': unit,
        'currentStock': currentStock,
        'alertThreshold': alertThreshold,
        'unitPrice': unitPrice,
        'notes': notes,
      };
}
