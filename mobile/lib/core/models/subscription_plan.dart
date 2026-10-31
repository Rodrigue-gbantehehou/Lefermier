class PlanQuotas {
  final int maxFarms;
  final int maxFlocks;
  final int maxMembers;
  final int maxBuildings;
  final int retentionMonths;

  const PlanQuotas({
    this.maxFarms = 1,
    this.maxFlocks = 2,
    this.maxMembers = 2,
    this.maxBuildings = 2,
    this.retentionMonths = 3,
  });

  factory PlanQuotas.fromJson(Map<String, dynamic> json) {
    return PlanQuotas(
      maxFarms: (json['maxFarms'] as num?)?.toInt() ?? 1,
      maxFlocks: (json['maxFlocks'] as num?)?.toInt() ?? 2,
      maxMembers: (json['maxMembers'] as num?)?.toInt() ?? 2,
      maxBuildings: (json['maxBuildings'] as num?)?.toInt() ?? 2,
      retentionMonths: (json['retentionMonths'] as num?)?.toInt() ?? 3,
    );
  }
}

class PlanFlags {
  final bool accountingExports;
  final bool healthAlerts;
  final bool iotSensors;
  final bool apiAccess;
  final bool prioritySupport;

  const PlanFlags({
    this.accountingExports = false,
    this.healthAlerts = false,
    this.iotSensors = false,
    this.apiAccess = false,
    this.prioritySupport = false,
  });

  factory PlanFlags.fromJson(Map<String, dynamic> json) {
    return PlanFlags(
      accountingExports: json['accountingExports'] as bool? ?? false,
      healthAlerts: json['healthAlerts'] as bool? ?? false,
      iotSensors: json['iotSensors'] as bool? ?? false,
      apiAccess: json['apiAccess'] as bool? ?? false,
      prioritySupport: json['prioritySupport'] as bool? ?? false,
    );
  }
}

class SubscriptionPlanModel {
  final String id;
  final String sku;
  final String name;
  final String tier;
  final String? badge;
  final String? description;
  final int priceMonthly;
  final int priceAnnually;
  final String currency;
  final PlanQuotas quotas;
  final PlanFlags flags;
  final List<String> features;
  final bool isRecommended;
  final bool isPopular;
  final bool isAvailable;

  const SubscriptionPlanModel({
    required this.id,
    required this.sku,
    required this.name,
    required this.tier,
    this.badge,
    this.description,
    required this.priceMonthly,
    required this.priceAnnually,
    required this.currency,
    required this.quotas,
    required this.flags,
    this.features = const [],
    this.isRecommended = false,
    this.isPopular = false,
    this.isAvailable = true,
  });

  factory SubscriptionPlanModel.fromJson(Map<String, dynamic> json) {
    final featuresRaw = json['features'] as List<dynamic>? ?? [];
    return SubscriptionPlanModel(
      id: json['id'] as String? ?? '',
      sku: (json['sku'] as String? ?? 'FREE').toUpperCase(),
      name: json['name'] as String? ?? 'Formule Avicole',
      tier: json['tier'] as String? ?? 'STANDARD',
      badge: json['badge'] as String?,
      description: json['description'] as String?,
      priceMonthly: (json['priceMonthly'] as num?)?.toInt() ?? 0,
      priceAnnually: (json['priceAnnually'] as num?)?.toInt() ?? 0,
      currency: json['currency'] as String? ?? 'XOF',
      quotas: json['quotas'] != null
          ? PlanQuotas.fromJson(json['quotas'] as Map<String, dynamic>)
          : const PlanQuotas(),
      flags: json['flags'] != null
          ? PlanFlags.fromJson(json['flags'] as Map<String, dynamic>)
          : const PlanFlags(),
      features: featuresRaw.map((f) => f.toString()).toList(),
      isRecommended: json['isRecommended'] as bool? ?? false,
      isPopular: json['isPopular'] as bool? ?? false,
      isAvailable: json['isAvailable'] as bool? ?? true,
    );
  }

  bool get isFree => priceMonthly == 0;
}
