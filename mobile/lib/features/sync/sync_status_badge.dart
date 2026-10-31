import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/theme/app_theme.dart';
import 'sync_provider.dart';
import 'sync_screen.dart';

class SyncStatusBadge extends ConsumerWidget {
  final VoidCallback? onTap;
  const SyncStatusBadge({super.key, this.onTap});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(syncProvider);

    Color badgeColor;
    IconData badgeIcon;
    String badgeText;

    if (state.isSyncing) {
      badgeColor = AppColors.primary;
      badgeIcon = Icons.sync_rounded;
      badgeText = "Synchro...";
    } else if (state.pendingCount > 0) {
      badgeColor = AppColors.accent;
      badgeIcon = Icons.cloud_upload_rounded;
      badgeText = "${state.pendingCount} en attente";
    } else if (!state.isOnline) {
      badgeColor = AppColors.danger;
      badgeIcon = Icons.cloud_off_rounded;
      badgeText = "Hors-ligne";
    } else {
      badgeColor = AppColors.success;
      badgeIcon = Icons.check_circle_rounded;
      badgeText = "En ligne";
    }

    return InkWell(
      onTap: onTap ?? () {
        Navigator.of(context).push(
          MaterialPageRoute(builder: (_) => const SyncScreen()),
        );
      },
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(
          color: badgeColor.withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(badgeIcon, size: 14, color: badgeColor),
            const SizedBox(width: 4),
            Text(
              badgeText,
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.bold,
                color: badgeColor,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
