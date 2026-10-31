import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
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
                              ? "Dernière synchro : ${DateFormat('dd/MM/yyyy HH:mm').format(state.lastSyncTime!)}"
                              : "Aucune synchronisation effectuée",
                          style: const TextStyle(fontSize: 12, color: AppColors.textMutedLight),
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
              const SizedBox(height: 20),

              // File d'attente des actions hors-ligne
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    "Actions en attente d'envoi (${state.pendingCount})",
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                  ),
                  if (state.pendingCount > 0)
                    TextButton(
                      onPressed: () => ref.read(syncProvider.notifier).clearQueue(),
                      child: const Text("Purger", style: TextStyle(color: AppColors.danger, fontSize: 12)),
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
              else
                ListView.separated(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: state.pendingActions.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 8),
                  itemBuilder: (ctx, index) {
                    final item = state.pendingActions[index];
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
                                  "Enregistré à ${DateFormat('HH:mm:ss').format(item.createdAt)} • ${item.method}",
                                  style: const TextStyle(fontSize: 11, color: AppColors.textMutedLight),
                                ),
                                if (item.lastError != null) ...[
                                  const SizedBox(height: 2),
                                  Text(
                                    "Tentative échouée: ${item.lastError}",
                                    style: const TextStyle(fontSize: 10, color: AppColors.danger),
                                  ),
                                ],
                              ],
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: AppColors.accent.withValues(alpha: 0.12),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: const Text(
                              "En attente",
                              style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.accent),
                            ),
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
}
