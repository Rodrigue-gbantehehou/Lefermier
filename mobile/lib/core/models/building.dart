import 'package:flutter/material.dart';

enum BuildingType {
  poultryHouse('POULTRY_HOUSE', 'Poulailler principal', Icons.home_work_rounded),
  brooder('BROODER', 'Poussinière (démarrage)', Icons.child_care_rounded),
  storage('STORAGE', 'Magasin / Stockage', Icons.warehouse_rounded);

  final String code;
  final String label;
  final IconData icon;

  const BuildingType(this.code, this.label, this.icon);

  static BuildingType fromCode(String? code) {
    switch (code) {
      case 'BROODER':
        return BuildingType.brooder;
      case 'STORAGE':
        return BuildingType.storage;
      case 'POULTRY_HOUSE':
      default:
        return BuildingType.poultryHouse;
    }
  }
}

class Building {
  final String id;
  final String? farmId;
  final String name;
  final BuildingType type;
  final int capacity;
  final double? surfaceArea;
  final bool isActive;
  final DateTime? createdAt;

  const Building({
    required this.id,
    this.farmId,
    required this.name,
    required this.type,
    required this.capacity,
    this.surfaceArea,
    this.isActive = true,
    this.createdAt,
  });

  factory Building.fromJson(Map<String, dynamic> json) {
    return Building(
      id: json['id'] as String? ?? '',
      farmId: json['farmId'] as String?,
      name: json['name'] as String? ?? 'Bâtiment',
      type: BuildingType.fromCode(json['type'] as String?),
      capacity: (json['capacity'] as num?)?.toInt() ?? 0,
      surfaceArea: (json['surfaceArea'] as num?)?.toDouble(),
      isActive: json['isActive'] as bool? ?? true,
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'] as String)
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'type': type.code,
      'capacity': capacity,
      if (surfaceArea != null) 'surfaceArea': surfaceArea,
      'isActive': isActive,
    };
  }

  String get densityLabel {
    if (surfaceArea != null && surfaceArea! > 0) {
      final d = capacity / surfaceArea!;
      return "${d.toStringAsFixed(1)} suj/m²";
    }
    return "Non définie";
  }
}
