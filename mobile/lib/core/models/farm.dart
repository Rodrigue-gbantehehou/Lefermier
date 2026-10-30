class Farm {
  final String id;
  final String name;
  final String? code;
  final String? productionType;
  final String? city;
  final String? currency;
  final String? role;
  final String? plan;
  final List<String> modules;

  const Farm({
    required this.id,
    required this.name,
    this.code,
    this.productionType,
    this.city,
    this.currency = "XOF",
    this.role,
    this.plan,
    this.modules = const [],
  });

  factory Farm.fromJson(Map<String, dynamic> json) {
    List<String> parsedModules = [];
    if (json['modules'] is List) {
      parsedModules = (json['modules'] as List).map((m) => m.toString()).toList();
    }

    return Farm(
      id: json['id'] as String,
      name: json['name'] as String,
      code: json['code'] as String?,
      productionType: json['productionType'] as String?,
      city: (json['locationCity'] ?? json['city']) as String?,
      currency: json['currency'] as String? ?? "XOF",
      role: json['role'] as String?,
      plan: json['plan'] as String? ?? json['subscriptionPlan'] as String?,
      modules: parsedModules,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'code': code,
    'productionType': productionType,
    'city': city,
    'currency': currency,
    'role': role,
    'plan': plan,
    'modules': modules,
  };

  // --- Règles d'accès métier (Abonnement propriétaire & Rôles membre) ---

  /// Exploitation dédiée exclusivement aux poulets de chair (aucune ponte)
  bool get isBroilerOnly {
    final type = (productionType ?? '').toUpperCase();
    return type == 'BROILER' || type == 'BROILERS';
  }

  /// Propriétaire ou Administrateur avec pleins pouvoirs
  bool get isOwner {
    final r = (role ?? '').toUpperCase();
    return r == 'OWNER' || r == 'ADMIN';
  }

  /// Droit d'accès au module Caisse / Trésorerie
  bool get canViewFinance {
    if (isOwner) return true;
    final r = (role ?? '').toUpperCase();
    return r == 'MANAGER' || r == 'ACCOUNTANT';
  }

  /// Droit d'enregistrement de flux financiers (recettes / dépenses)
  bool get canCreateFinance => canViewFinance;

  /// Droit d'accès au module Ponte d'œufs (Non applicable pour les élevages de chair)
  bool get canViewEggs {
    if (isBroilerOnly) return false;
    if (isOwner) return true;
    final r = (role ?? '').toUpperCase();
    return r == 'MANAGER' || r == 'PRODUCTION_LEAD';
  }

  /// Droit d'enregistrement des ramassages de ponte
  bool get canCreateEggs => canViewEggs;

  /// Droit d'accès aux intrants & alimentation
  bool get canViewInventory {
    if (isOwner) return true;
    final r = (role ?? '').toUpperCase();
    return r == 'MANAGER' || r == 'STOCK_KEEPER';
  }

  /// Droit d'accès au suivi sanitaire et soins
  bool get canViewHealth {
    if (isOwner) return true;
    final r = (role ?? '').toUpperCase();
    return r == 'MANAGER' || r == 'VET_CONSULTANT';
  }

  /// Droit de déclarer un soin ou vaccin
  bool get canManageHealth => canViewHealth;
}
