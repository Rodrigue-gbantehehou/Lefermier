import '../utils/egg_calculator.dart';

class EggProduction {
  final String id;
  final String flockId;
  final String? flockName;
  final String date;
  final String session; // MORNING, NOON, EVENING, DAILY
  final int totalQuantity;
  final int damagedQuantity;
  final int abnormalQuantity;
  final String? notes;

  const EggProduction({
    required this.id,
    required this.flockId,
    this.flockName,
    required this.date,
    required this.session,
    required this.totalQuantity,
    this.damagedQuantity = 0,
    this.abnormalQuantity = 0,
    this.notes,
  });

  int get goodQuantity => totalQuantity;
  int get allHarvested => totalQuantity + damagedQuantity + abnormalQuantity;

  EggTrayInfo get trayInfo => EggCalculator.calculate(totalQuantity);

  factory EggProduction.fromJson(Map<String, dynamic> json) {
    return EggProduction(
      id: json['id'] as String,
      flockId: json['flockId'] as String? ?? json['flock']?['id'] as String? ?? "",
      flockName: json['flock']?['name'] as String?,
      date: json['date'] as String? ?? "",
      session: json['session'] as String? ?? "MORNING",
      totalQuantity: json['totalQuantity'] as int? ?? (json['quantity'] as int? ?? 0),
      damagedQuantity: json['damagedQuantity'] as int? ?? 0,
      abnormalQuantity: json['abnormalQuantity'] as int? ?? 0,
      notes: json['notes'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'flockId': flockId,
    'date': date,
    'session': session,
    'totalQuantity': totalQuantity,
    'damagedQuantity': damagedQuantity,
    'abnormalQuantity': abnormalQuantity,
    'notes': notes,
  };
}
