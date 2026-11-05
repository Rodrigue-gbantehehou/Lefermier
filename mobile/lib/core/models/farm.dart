import 'subscription_plan.dart';

/// Clés de permissions métier exposées par l'API (miroir de `App\Security\Permission`).
class FarmPermission {
  static const String flockView = 'flock:view';
  static const String flockCreate = 'flock:create';
  static const String flockMovement = 'flock:movement';
  static const String eggView = 'egg:view';
  static const String eggCreate = 'egg:create';
  static const String inventoryView = 'inventory:view';
  static const String inventoryMovement = 'inventory:movement';
  static const String financeView = 'finance:view';
  static const String financeCreate = 'finance:create';
  static const String healthView = 'health:view';
  static const String healthManage = 'health:manage';
  static const String buildingManage = 'building:manage';
  static const String memberManage = 'member:manage';
}

class Farm {
  final String id;
  final String name;
  final String? code;
  final String? productionType;
  final String? city;
  final String? currency;
  final String? role;
  final String? plan;
  final String? planName;
  final List<String> modules;
  final PlanQuotas? quotas;

  /// Permissions effectives calculées par le serveur : droits du rôle ∩ modules de l'abonnement.
  /// `null` si l'API n'a pas transmis la matrice (ancienne réponse) → repli sur les règles de rôle.
  final List<String>? permissions;

  /// IDs des bâtiments/poulaillers assignés au membre connecté.
  /// `null` ou vide signifie qu'aucune restriction n'est appliquée (accès à tous les bâtiments).
  final List<String>? assignedBuildingIds;

  final String? phone;
  final String? email;
  final String? address;
  final String? ifu;
  final String? rccm;
  final String? description;

  const Farm({
    required this.id,
    required this.name,
    this.code,
    this.productionType,
    this.city,
    this.currency = "XOF",
    this.role,
    this.plan,
    this.planName,
    this.modules = const [],
    this.quotas,
    this.permissions,
    this.assignedBuildingIds,
    this.phone,
    this.email,
    this.address,
    this.ifu,
    this.rccm,
    this.description,
  });

  factory Farm.fromJson(Map<String, dynamic> json) {
    // L'abonnement est imbriqué dans `subscription` (profil /api/auth/me)
    final subscription = json['subscription'] is Map ? json['subscription'] as Map : const {};

    final rawModules = subscription['modules'] ?? json['modules'];
    final parsedModules = rawModules is List ? rawModules.map((m) => m.toString()).toList() : <String>[];

    final rawQuotas = subscription['quotas'] ?? json['quotas'];
    final parsedQuotas = rawQuotas is Map
        ? PlanQuotas.fromJson(Map<String, dynamic>.from(rawQuotas))
        : null;

    final rawPermissions = json['permissions'];
    final parsedPermissions = rawPermissions is List ? rawPermissions.map((p) => p.toString()).toList() : null;

    final rawAssignedBuildings = json['assignedBuildingIds'] ?? json['assignedBuildings'];
    final parsedAssignedBuildings = rawAssignedBuildings is List
        ? rawAssignedBuildings
            .map((b) => b is Map ? (b['id'] ?? '').toString() : b.toString())
            .where((s) => s.isNotEmpty)
            .toList()
        : null;

    return Farm(
      id: json['id'] as String,
      name: json['name'] as String,
      code: json['code'] as String?,
      productionType: json['productionType'] as String?,
      city: (json['locationCity'] ?? json['city']) as String?,
      currency: json['currency'] as String? ?? "XOF",
      role: json['role'] as String?,
      plan: (subscription['plan'] ?? json['plan'] ?? json['subscriptionPlan']) as String?,
      planName: subscription['planName'] as String?,
      modules: parsedModules,
      quotas: parsedQuotas,
      permissions: parsedPermissions,
      assignedBuildingIds: parsedAssignedBuildings,
      phone: json['phone'] as String?,
      email: json['email'] as String?,
      address: json['address'] as String?,
      ifu: json['ifu'] as String?,
      rccm: json['rccm'] as String?,
      description: json['description'] as String?,
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
    'permissions': permissions,
    'assignedBuildingIds': assignedBuildingIds,
    'phone': phone,
    'email': email,
    'address': address,
    'ifu': ifu,
    'rccm': rccm,
    'description': description,
    'subscription': {
      'plan': plan,
      'planName': planName,
      'modules': modules,
    },
  };

  // --- Règles d'accès métier (Abonnement propriétaire & Rôles membre) ---

  /// Exploitation dédiée exclusivement aux poulets de chair (aucune ponte)
  bool get isBroilerOnly {
    final type = (productionType ?? '').toUpperCase();
    return type == 'BROILER' || type == 'BROILERS';
  }

  String get _role => (role ?? '').toUpperCase();

  /// Propriétaire ou Administrateur avec pleins pouvoirs
  bool get isOwner => _role == 'OWNER' || _role == 'ADMIN';

  /// Indique si l'utilisateur connecté a des restrictions sur des bâtiments spécifiques
  bool get hasBuildingRestrictions =>
      !isOwner && assignedBuildingIds != null && assignedBuildingIds!.isNotEmpty;

  /// Vérifie si un bâtiment / poulailler est accessible pour l'utilisateur connecté dans cette ferme.
  /// Si l'utilisateur est propriétaire ou si aucune restriction n'est définie, tous les bâtiments sont accessibles.
  bool isBuildingAssigned(String? buildingId) {
    if (!hasBuildingRestrictions) return true;
    if (buildingId == null) return false;
    return assignedBuildingIds!.contains(buildingId);
  }

  /// Vérifie un droit : matrice serveur (rôle ∩ abonnement) si disponible, sinon règles de rôle par défaut.
  bool hasPermission(String permission) {
    final perms = permissions;
    if (perms != null) {
      return perms.contains('*') || perms.contains(permission);
    }
    return _legacyRoleAllows(permission);
  }

  /// Repli hors-ligne / ancienne API : reflète `FarmMembership::getPermissions()` côté Symfony.
  bool _legacyRoleAllows(String permission) {
    switch (_role) {
      case 'OWNER':
      case 'ADMIN':
      case 'MANAGER':
        return true;
      case 'PRODUCTION_LEAD':
        return const [
          FarmPermission.flockView,
          FarmPermission.flockCreate,
          FarmPermission.flockMovement,
          FarmPermission.eggView,
          FarmPermission.eggCreate,
          FarmPermission.inventoryView,
          FarmPermission.inventoryMovement,
        ].contains(permission);
      case 'STOCK_KEEPER':
        return const [
          FarmPermission.inventoryView,
          FarmPermission.inventoryMovement,
        ].contains(permission);
      case 'ACCOUNTANT':
        return const [
          FarmPermission.financeView,
          FarmPermission.financeCreate,
        ].contains(permission);
      case 'VET_CONSULTANT':
        return const [
          FarmPermission.healthView,
          FarmPermission.healthManage,
          FarmPermission.flockView,
          FarmPermission.inventoryView,
        ].contains(permission);
      default:
        return false;
    }
  }

  /// Bandes & effectifs
  bool get canViewFlocks => hasPermission(FarmPermission.flockView);
  bool get canRecordFlockMovement => hasPermission(FarmPermission.flockMovement);

  /// Ponte d'œufs (non applicable aux élevages 100 % chair)
  bool get canViewEggs => !isBroilerOnly && hasPermission(FarmPermission.eggView);
  bool get canCreateEggs => !isBroilerOnly && hasPermission(FarmPermission.eggCreate);

  /// Caisse / Trésorerie
  bool get canViewFinance => hasPermission(FarmPermission.financeView);
  bool get canCreateFinance => hasPermission(FarmPermission.financeCreate);

  /// Stocks, intrants & distribution d'aliment
  bool get canViewInventory => hasPermission(FarmPermission.inventoryView);
  bool get canFeed => hasPermission(FarmPermission.inventoryMovement);

  /// Suivi sanitaire et soins
  bool get canViewHealth => hasPermission(FarmPermission.healthView);
  bool get canManageHealth => hasPermission(FarmPermission.healthManage);

  /// Administration
  bool get canManageBuildings => hasPermission(FarmPermission.buildingManage);
  bool get canManageMembers => hasPermission(FarmPermission.memberManage);
  bool get canManageSubscription => isOwner;
  bool get canViewReports => canViewEggs || canViewFlocks || canViewFinance;

  /// Au moins une action de saisie rapide est autorisée
  bool get hasAnyQuickAction =>
      canCreateEggs || canFeed || canCreateFinance || canManageHealth || canRecordFlockMovement;
}
