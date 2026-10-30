import '../utils/egg_calculator.dart';

class EggProduction {
  final String id;
  final String flockId;
  final String? flockName;
  final String date;
  final String session; // MORNING, AFTERNOON, EVENING, ALL_DAY
  final int goodEggs;
  final int crackedEggs;
  final int dirtyEggs;
  final int deformedEggs;
  final int totalEggs;
  final int traysCount;
  final int looseEggsCount;
  final double? layingRate;
  final String? notes;
  final String? recordedByName;

  const EggProduction({
    required this.id,
    required this.flockId,
    this.flockName,
    required this.date,
    required this.session,
    required this.goodEggs,
    this.crackedEggs = 0,
    this.dirtyEggs = 0,
    this.deformedEggs = 0,
    int? totalEggs,
    int? traysCount,
    int? looseEggsCount,
    this.layingRate,
    this.notes,
    this.recordedByName,
  })  : totalEggs = totalEggs ?? (goodEggs + crackedEggs + dirtyEggs + deformedEggs),
        traysCount = traysCount ?? (goodEggs ~/ 30),
        looseEggsCount = looseEggsCount ?? (goodEggs % 30);

  // Getters de rétrocompatibilité avec les vues UI existantes
  int get totalQuantity => goodEggs;
  int get damagedQuantity => crackedEggs;
  int get abnormalQuantity => deformedEggs;
  int get allHarvested => totalEggs;

  EggTrayInfo get trayInfo => EggCalculator.calculate(goodEggs);

  String get sessionLabel {
    switch (session) {
      case "MORNING":
        return "Matin";
      case "AFTERNOON":
      case "NOON":
        return "Midi / Après-midi";
      case "EVENING":
        return "Soir";
      case "ALL_DAY":
      default:
        return "Journée";
    }
  }

  factory EggProduction.fromJson(Map<String, dynamic> json) {
    final good = json['goodEggs'] as int? ??
        (json['totalQuantity'] as int? ?? (json['quantity'] as int? ?? 0));
    final cracked = json['crackedEggs'] as int? ?? (json['damagedQuantity'] as int? ?? 0);
    final dirty = json['dirtyEggs'] as int? ?? 0;
    final deformed = json['deformedEggs'] as int? ?? (json['abnormalQuantity'] as int? ?? 0);
    final total = json['totalEggs'] as int? ?? (good + cracked + dirty + deformed);

    return EggProduction(
      id: json['id'] as String? ?? "",
      flockId: json['flockId'] as String? ?? json['flock']?['id'] as String? ?? "",
      flockName: json['flockName'] as String? ?? json['flock']?['name'] as String?,
      date: json['productionDate'] as String? ?? json['date'] as String? ?? "",
      session: json['session'] as String? ?? "MORNING",
      goodEggs: good,
      crackedEggs: cracked,
      dirtyEggs: dirty,
      deformedEggs: deformed,
      totalEggs: total,
      traysCount: json['traysCount'] as int? ?? (good ~/ 30),
      looseEggsCount: json['looseEggsCount'] as int? ?? (good % 30),
      layingRate: (json['layingRate'] as num?)?.toDouble(),
      notes: json['notes'] as String?,
      recordedByName: json['recordedBy']?['fullName'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'flockId': flockId,
        'productionDate': date,
        'session': session,
        'goodEggs': goodEggs,
        'crackedEggs': crackedEggs,
        'dirtyEggs': dirtyEggs,
        'deformedEggs': deformedEggs,
        'notes': notes,
      };
}
