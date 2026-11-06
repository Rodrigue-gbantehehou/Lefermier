import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../core/models/sync_item.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/theme_provider.dart';
import '../../core/widgets/brand_loader.dart';
import 'sync_provider.dart';

class SyncScreen extends ConsumerWidget {
  final VoidCallback? onBack;
  final VoidCallback? onOpenMenu;
  const SyncScreen({super.key, this.onBack, this.onOpenMenu});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(syncProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        leading: onBack != null
            ? IconButton(
                icon: const Icon(Icons.arrow_back_rounded),
                tooltip: "Retour",
                onPressed: onBack,
              )
            : (onOpenMenu != null
                ? IconButton(
                    icon: const Icon(Icons.menu_rounded),
                    tooltip: "Menu",
                    onPressed: onOpenMenu,
                  )
                : null),
        title: const Text("Synchronisation & Hors-ligne"),
        actions: [
          IconButton(
            icon: Icon(
              isDark ? Icons.light_mode_rounded : Icons.dark_mode_rounded,
              color: isDark ? AppColors.accent : null,
              size: 20,
            ),
            tooltip: isDark ? "Activer le mode clair" : "Activer le mode sombre",
            onPressed: () => ref.read(themeModeProvider.notifier).toggleTheme(context),
          ),
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            tooltip: "Actualiser le statut",
            onPressed: () => ref.read(syncProvider.notifier).refreshState(),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () => ref.read(syncProvider.notifier).triggerSync(),
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 30),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Statut Réseau & Synchronisation
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          "ÉTAT DU DISPOSITIF",
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 0.8,
                            color: AppColors.textMutedLight,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Row(
                          children: [
                            Container(
                              width: 10,
                              height: 10,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: state.isOnline ? AppColors.success : AppColors.danger,
                              ),
                            ),
                            const SizedBox(width: 8),
                            Text(
                              state.isOnline ? "Connecté au serveur" : "Mode Hors-ligne",
                              style: TextStyle(
                                fontSize: 20,
                                fontWeight: FontWeight.bold,
                                color: state.isOnline ? AppColors.success : AppColors.danger,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(
                          state.lastSyncTime != null
                              ? "Actions envoyées : ${DateFormat('dd/MM/yyyy HH:mm').format(state.lastSyncTime!)}"
                              : "Aucune action envoyée pour le moment",
                          style: const TextStyle(fontSize: 12, color: AppColors.textMutedLight),
                        ),
                        const SizedBox(height: 2),
                        const Text(
                          "↑ Date d'envoi de vos actions locales au serveur. Les données affichées se rafraîchissent indépendamment.",
                          style: TextStyle(fontSize: 10, color: AppColors.textMutedLight, fontStyle: FontStyle.italic),
                        ),
                      ],
                    ),
                  ),
                  ElevatedButton.icon(
                    onPressed: state.isSyncing ? null : () => ref.read(syncProvider.notifier).triggerSync(),
                    icon: state.isSyncing
                        ? const BrandLoader.button(size: 16)
                        : const Icon(Icons.sync_rounded, size: 18),
                    label: Text(state.isSyncing ? "En cours..." : "Synchroniser"),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                  ),
                ],
              ),
              if (state.lastError != null) ...[
                const SizedBox(height: 16),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.danger.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppColors.danger.withValues(alpha: 0.3)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.info_outline_rounded, color: AppColors.danger, size: 20),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          state.lastError!,
                          style: const TextStyle(fontSize: 12, color: AppColors.danger, fontWeight: FontWeight.w500),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
              const SizedBox(height: 20),

              // Bannière explicative "Offline-First"
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: isDark ? AppColors.surfaceDark : Colors.white,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(
                    color: isDark ? AppColors.borderDark : AppColors.borderLight,
                  ),
                ),
                child: const Row(
                  children: [
                    Icon(Icons.offline_bolt_rounded, color: AppColors.accent, size: 28),
                    SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            "Fonctionnement hors-connexion",
                            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                          ),
                          SizedBox(height: 2),
                          Text(
                            "Saisissez vos pontes, aliments et mouvements au poulailler même sans réseau. Vos données sont conservées et envoyées avec garantie anti-doublon.",
                            style: TextStyle(fontSize: 11, color: AppColors.textMutedLight, height: 1.3),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              // Section 1 : Actions rejetées / bloquées
              if (state.failedList.isNotEmpty) ...[
                Row(
                  children: [
                    const Icon(Icons.warning_amber_rounded, color: AppColors.danger, size: 20),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        "Actions rejetées (${state.failedCount})",
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: AppColors.danger),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                const Text(
                  "Ces actions ont été refusées par le serveur (règles métier, validation). Vous pouvez les réinjecter ou les abandonner.",
                  style: TextStyle(fontSize: 11.5, color: AppColors.textMutedLight, height: 1.3),
                ),
                const SizedBox(height: 10),
                ListView.separated(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: state.failedList.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 8),
                  itemBuilder: (ctx, index) {
                    final item = state.failedList[index];
                    return Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: isDark ? const Color(0xFF2B1D1D) : const Color(0xFFFFF4F4),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppColors.danger.withValues(alpha: 0.3)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: (item.ownerKey == null || item.ownerKey!.isEmpty)
                                      ? Colors.orange.withValues(alpha: 0.2)
                                      : AppColors.danger.withValues(alpha: 0.2),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Text(
                                  (item.ownerKey == null || item.ownerKey!.isEmpty)
                                      ? "QUARANTAINE"
                                      : (item.httpStatus != null ? "HTTP ${item.httpStatus}" : "REJETÉ"),
                                  style: TextStyle(
                                    fontSize: 10,
                                    fontWeight: FontWeight.bold,
                                    color: (item.ownerKey == null || item.ownerKey!.isEmpty)
                                        ? Colors.orange.shade800
                                        : AppColors.danger,
                                  ),
                                ),
                              ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                item.label,
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            Text(
                              DateFormat('HH:mm:ss').format(item.createdAt),
                              style: const TextStyle(fontSize: 10, color: AppColors.textMutedLight),
                            ),
                          ],
                        ),
                        if (item.lastError != null) ...[
                          const SizedBox(height: 6),
                          Text(
                            item.lastError!,
                            style: const TextStyle(fontSize: 11, color: AppColors.danger, height: 1.25),
                          ),
                        ],
                        const SizedBox(height: 10),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.end,
                          children: [
                            OutlinedButton.icon(
                              style: OutlinedButton.styleFrom(
                                foregroundColor: AppColors.danger,
                                side: BorderSide(color: AppColors.danger.withValues(alpha: 0.4)),
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                minimumSize: const Size(0, 32),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                              ),
                              icon: const Icon(Icons.delete_outline_rounded, size: 14),
                              label: const Text("Abandonner", style: TextStyle(fontSize: 11)),
                              onPressed: () => _confirmRemoveItem(context, ref, item),
                            ),
                            if (item.ownerKey != null && item.ownerKey!.isNotEmpty) ...[
                              const SizedBox(width: 8),
                              ElevatedButton.icon(
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: AppColors.primary,
                                  foregroundColor: Colors.white,
                                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                  minimumSize: const Size(0, 32),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                ),
                                icon: const Icon(Icons.replay_rounded, size: 14),
                                label: const Text("Réessayer", style: TextStyle(fontSize: 11)),
                                onPressed: () => ref.read(syncProvider.notifier).retryAction(item.id),
                              ),
                            ],
                          ],
                        ),
                        ],
                      ),
                    );
                  },
                ),
                const SizedBox(height: 20),
              ],

              // Section 2 : Actions en attente
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    "Actions en attente (${state.pendingCount})",
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                  ),
                  if (state.pendingActions.isNotEmpty)
                    TextButton(
                      onPressed: () => _confirmClearQueue(context, ref),
                      child: const Text("Tout purger", style: TextStyle(color: AppColors.danger, fontSize: 12)),
                    ),
                ],
              ),
              const SizedBox(height: 10),

              if (state.pendingActions.isEmpty)
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(28),
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                      color: isDark ? AppColors.borderDark : AppColors.borderLight,
                    ),
                  ),
                  child: Column(
                    children: [
                      Icon(Icons.cloud_done_rounded, size: 44, color: AppColors.success.withValues(alpha: 0.8)),
                      const SizedBox(height: 10),
                      const Text(
                        "Tout est synchronisé",
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                      ),
                      const SizedBox(height: 4),
                      const Text(
                        "Aucune opération en attente sur votre appareil.",
                        textAlign: TextAlign.center,
                        style: TextStyle(fontSize: 12, color: AppColors.textMutedLight),
                      ),
                    ],
                  ),
                )
              else if (state.pendingList.isEmpty)
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(16),
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: isDark ? AppColors.borderDark : AppColors.borderLight,
                    ),
                  ),
                  child: const Text(
                    "Aucune action en attente automatique. Voir ci-dessus les actions rejetées.",
                    style: TextStyle(fontSize: 12, color: AppColors.textMutedLight),
                    textAlign: TextAlign.center,
                  ),
                )
              else
                ListView.separated(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: state.pendingList.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 8),
                  itemBuilder: (ctx, index) {
                    final item = state.pendingList[index];
                    final isDelayed = item.nextAttemptAt != null && item.nextAttemptAt!.isAfter(DateTime.now());
                    final delaySec = isDelayed ? item.nextAttemptAt!.difference(DateTime.now()).inSeconds : 0;
                    return Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      decoration: BoxDecoration(
                        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: isDark ? AppColors.borderDark : AppColors.borderLight,
                        ),
                      ),
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(6),
                            decoration: BoxDecoration(
                              color: AppColors.accent.withValues(alpha: 0.15),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: const Icon(Icons.upload_file_rounded, color: AppColors.accent, size: 18),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  item.label,
                                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  "Créé à ${DateFormat('HH:mm:ss').format(item.createdAt)} • ${item.method}",
                                  style: const TextStyle(fontSize: 11, color: AppColors.textMutedLight),
                                ),
                                if (item.retryCount > 0 || isDelayed) ...[
                                  const SizedBox(height: 2),
                                  Text(
                                    isDelayed
                                        ? "En cours de traitement serveur (409) • Reprise dans ${delaySec}s"
                                        : "Tentatives : ${item.retryCount}",
                                    style: TextStyle(
                                      fontSize: 10,
                                      color: isDelayed ? AppColors.warning : AppColors.accent,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ],
                              ],
                            ),
                          ),
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: (isDelayed ? AppColors.warning : AppColors.accent).withValues(alpha: 0.12),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              isDelayed ? "Reportée (409)" : "En attente",
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                                color: isDelayed ? AppColors.warning : AppColors.accent,
                              ),
                            ),
                          ),
                          IconButton(
                            icon: const Icon(Icons.close_rounded, size: 16),
                            color: AppColors.textMutedLight,
                            tooltip: "Supprimer",
                            onPressed: () => _confirmRemoveItem(context, ref, item),
                          ),
                        ],
                      ),
                    );
                  },
                ),
            ],
          ),
        ),
      ),
    );
  }

  void _confirmClearQueue(BuildContext context, WidgetRef ref) {
    showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text("Purger la file d'attente"),
        content: const Text(
          "Toutes les actions hors-ligne (en attente et rejetées) seront définitivement supprimées sans être transmises au serveur.\n\nÊtes-vous sûr ?",
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text("Annuler"),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.danger,
              foregroundColor: Colors.white,
            ),
            onPressed: () {
              Navigator.pop(ctx);
              ref.read(syncProvider.notifier).clearQueue();
            },
            child: const Text("Tout purger"),
          ),
        ],
      ),
    );
  }

  void _confirmRemoveItem(BuildContext context, WidgetRef ref, SyncQueueItem item) {
    showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text("Abandonner l'action"),
        content: Text("Voulez-vous supprimer définitivement l'action « ${item.label} » de la file d'attente ?"),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text("Annuler"),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.danger,
              foregroundColor: Colors.white,
            ),
            onPressed: () {
              Navigator.pop(ctx);
              ref.read(syncProvider.notifier).removeAction(item.id);
            },
            child: const Text("Supprimer"),
          ),
        ],
      ),
    );
  }
}
