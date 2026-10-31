import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

enum MemberRole {
  owner('OWNER', 'Propriétaire', Icons.verified_user_rounded, AppColors.primary),
  admin('ADMIN', 'Administrateur', Icons.admin_panel_settings_rounded, AppColors.primary),
  manager('MANAGER', 'Gérant d\'exploitation', Icons.manage_accounts_rounded, AppColors.primary),
  productionLead('PRODUCTION_LEAD', 'Responsable d\'élevage', Icons.agriculture_rounded, AppColors.accent),
  stockKeeper('STOCK_KEEPER', 'Gestionnaire des stocks', Icons.inventory_rounded, AppColors.textMutedLight),
  accountant('ACCOUNTANT', 'Comptable / Trésorier', Icons.account_balance_wallet_rounded, AppColors.success),
  vetConsultant('VET_CONSULTANT', 'Vétérinaire conseil', Icons.medical_services_rounded, AppColors.primary);

  final String code;
  final String label;
  final IconData icon;
  final Color color;

  const MemberRole(this.code, this.label, this.icon, this.color);

  static MemberRole fromCode(String? code) {
    for (final r in MemberRole.values) {
      if (r.code == code) return r;
    }
    return MemberRole.manager;
  }
}

class FarmMember {
  final String id;
  final String? userId;
  final String email;
  final String firstName;
  final String lastName;
  final String fullName;
  final String? phone;
  final MemberRole role;
  final List<String> permissions;
  final List<String> assignedBuildingIds;
  final List<String> assignedBuildingNames;
  final bool isActive;
  final bool isOwner;
  final DateTime? createdAt;

  const FarmMember({
    required this.id,
    this.userId,
    required this.email,
    required this.firstName,
    required this.lastName,
    required this.fullName,
    this.phone,
    required this.role,
    this.permissions = const [],
    this.assignedBuildingIds = const [],
    this.assignedBuildingNames = const [],
    this.isActive = true,
    this.isOwner = false,
    this.createdAt,
  });

  factory FarmMember.fromJson(Map<String, dynamic> json) {
    final permissionsRaw = json['permissions'] as List<dynamic>? ?? [];
    final assignedRaw = json['assignedBuildings'] as List<dynamic>? ?? [];
    final assignedIdsRaw = json['assignedBuildingIds'] as List<dynamic>? ?? [];

    final parsedNames = assignedRaw
        .map((b) => b is Map ? (b['name'] ?? '').toString() : '')
        .where((n) => n.isNotEmpty)
        .toList();

    final parsedIds = assignedIdsRaw.isNotEmpty
        ? assignedIdsRaw.map((id) => id.toString()).toList()
        : assignedRaw
            .map((b) => b is Map ? (b['id'] ?? '').toString() : b.toString())
            .where((id) => id.isNotEmpty)
            .toList();

    return FarmMember(
      id: json['id'] as String? ?? '',
      userId: json['userId'] as String?,
      email: json['email'] as String? ?? '',
      firstName: json['firstName'] as String? ?? '',
      lastName: json['lastName'] as String? ?? '',
      fullName: json['fullName'] as String? ??
          "${json['firstName'] ?? ''} ${json['lastName'] ?? ''}".trim(),
      phone: json['phone'] as String?,
      role: MemberRole.fromCode(json['role'] as String?),
      permissions: permissionsRaw.map((p) => p.toString()).toList(),
      assignedBuildingIds: parsedIds,
      assignedBuildingNames: parsedNames,
      isActive: json['isActive'] as bool? ?? true,
      isOwner: json['isOwner'] as bool? ?? (json['role'] == 'OWNER'),
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'] as String)
          : null,
    );
  }

  String get initials {
    final f = firstName.isNotEmpty ? firstName[0].toUpperCase() : '';
    final l = lastName.isNotEmpty ? lastName[0].toUpperCase() : '';
    return "$f$l".isNotEmpty ? "$f$l" : "U";
  }
}
