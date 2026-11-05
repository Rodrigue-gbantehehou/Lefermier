import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class FlockMovement {
  final String id;
  final String flockId;
  final String type; // MORTALITY, CULLING, SALE, TRANSFER, ADJUSTMENT
  final int quantity;
  final String movementDate;
  final String? reason;
  final String? recordedByName;
  final String? createdAt;

  const FlockMovement({
    required this.id,
    required this.flockId,
    required this.type,
    required this.quantity,
    required this.movementDate,
    this.reason,
    this.recordedByName,
    this.createdAt,
  });

  bool get isMortality => type == 'MORTALITY';
  bool get isCulling => type == 'CULLING' || type == 'CULL';
  bool get isSale => type == 'SALE';
  bool get isTransfer => type == 'TRANSFER';
  bool get isAdjustment => type == 'ADJUSTMENT';

  String get typeLabel {
    switch (type) {
      case 'MORTALITY':
        return 'Mortalité / Perte';
      case 'CULLING':
      case 'CULL':
        return 'Réforme / Déclassement';
      case 'SALE':
        return 'Vente de sujets';
      case 'TRANSFER':
        return 'Transfert bâtiment';
      case 'ADJUSTMENT':
        return 'Ajustement inventaire';
      default:
        return type;
    }
  }

  Color get color {
    switch (type) {
      case 'MORTALITY':
        return AppColors.danger;
      case 'CULLING':
      case 'CULL':
        return AppColors.warning;
      case 'SALE':
        return AppColors.success;
      case 'TRANSFER':
      case 'ADJUSTMENT':
      default:
        return AppColors.accent;
    }
  }

  IconData get icon {
    switch (type) {
      case 'MORTALITY':
        return Icons.heart_broken_rounded;
      case 'CULLING':
      case 'CULL':
        return Icons.remove_circle_outline_rounded;
      case 'SALE':
        return Icons.point_of_sale_rounded;
      case 'TRANSFER':
        return Icons.swap_horiz_rounded;
      case 'ADJUSTMENT':
      default:
        return Icons.tune_rounded;
    }
  }

  factory FlockMovement.fromJson(Map<String, dynamic> json) {
    final recordedByMap = json['recordedBy'] as Map<String, dynamic>?;

    return FlockMovement(
      id: json['id'] as String? ?? '',
      flockId: json['flockId'] as String? ?? '',
      type: json['type'] as String? ?? 'MORTALITY',
      quantity: json['quantity'] as int? ?? 0,
      movementDate: json['movementDate'] as String? ?? '',
      reason: json['reason'] as String?,
      recordedByName: recordedByMap?['name'] as String? ?? json['recordedByName'] as String?,
      createdAt: json['createdAt'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'flockId': flockId,
        'type': type,
        'quantity': quantity,
        'movementDate': movementDate,
        'reason': reason,
        'recordedByName': recordedByName,
        'createdAt': createdAt,
      };
}
