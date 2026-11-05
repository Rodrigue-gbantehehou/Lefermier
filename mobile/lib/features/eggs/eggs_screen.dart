import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/theme_provider.dart';
import '../../core/models/flock.dart';
import '../../core/widgets/brand_loader.dart';
import 'egg_provider.dart';
import 'record_egg_modal.dart';
import '../auth/auth_provider.dart';
import '../finances/record_transaction_modal.dart';


class EggsScreen extends ConsumerStatefulWidget {
  final VoidCallback? onBack;
  final VoidCallback? onOpenMenu;
  const EggsScreen({super.key, this.onBack, this.onOpenMenu});

  @override
  ConsumerState<EggsScreen> createState() => _EggsScreenState();
}

class _EggsScreenState extends ConsumerState<EggsScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(eggProvider.notifier).loadData(showLoading: false);
    });
  }

  void _openRecordEggDialog(List<Flock> layerFlocks, String? defaultFlockId) {
    if (layerFlocks.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text("Aucun lot de pondeuses actif trouvé pour cette ferme."),
          backgroundColor: AppColors.danger,
        ),
      );
      return;
    }
    RecordEggModal.show(
      context,
      defaultFlockId: defaultFlockId,
      onSaved: () => ref.read(eggProvider.notifier).loadData(showLoading: false),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final eggState = ref.watch(eggProvider);
    final summary = eggState.summary;
    final farm = ref.watch(authProvider).activeFarm;
    final canCreateFinance = farm == null || farm.canCreateFinance;

    return Scaffold(
      appBar: AppBar(
        leading: widget.onBack != null
            ? IconButton(
                icon: const Icon(Icons.arrow_back_rounded),
                tooltip: "Retour",
                onPressed: widget.onBack,
              )
            : (Navigator.of(context).canPop()
                ? IconButton(
                    icon: const Icon(Icons.arrow_back_rounded),
                    tooltip: "Retour",
                    onPressed: () => Navigator.of(context).pop(),
                  )
                : IconButton(
                    icon: const Icon(Icons.menu_rounded),
                    tooltip: "Menu",
                    onPressed: widget.onOpenMenu ?? () => Scaffold.of(context).openDrawer(),
                  )),
        title: const Text("Ramassage d'œufs"),
        actions: [
          IconButton(
            icon: Icon(
              isDark ? Icons.light_mode_rounded : Icons.dark_mode_rounded,
              color: isDark ? AppColors.accent : Colors.white,
              size: 20,
            ),
            tooltip: isDark ? "Activer le mode clair" : "Activer le mode sombre",
            onPressed: () => ref.read(themeModeProvider.notifier).toggleTheme(context),
          ),
          IconButton(
            icon: const Icon(Icons.refresh_rounded, color: Colors.white),
            tooltip: "Actualiser",
            onPressed: () => ref.read(eggProvider.notifier).loadData(),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        heroTag: 'fab_eggs',
        onPressed: () => _openRecordEggDialog(eggState.layerFlocks, eggState.selectedFlockId),
        backgroundColor: AppColors.accent,
        icon: const Icon(Icons.add, color: Colors.white),
        label: const Text(
          "Collecte",
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
        ),
      ),
      body: RefreshIndicator(
        onRefresh: () => ref.read(eggProvider.notifier).loadData(showLoading: false),
        child: eggState.isLoading
            ? const Center(child: BrandLoader(message: "Chargement des pontes..."))
            : SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 90),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // En-tête simple et aéré (sans carte encombrante)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 12, top: 4),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Text(
                                    "${summary.totalTrays}",
                                    style: const TextStyle(
                                      fontSize: 22,
                                      fontWeight: FontWeight.w900,
                                      fontFamily: 'monospace',
                                      color: AppColors.accent,
                                    ),
                                  ),
                                  const SizedBox(width: 4),
                                  const Text(
                                    "plateaux",
                                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
                                  ),
                                  if (summary.totalLooseEggs > 0) ...[
                                    const SizedBox(width: 6),
                                    Text(
                                      "+ ${summary.totalLooseEggs} œufs",
                                      style: const TextStyle(
                                        fontSize: 13,
                                        fontWeight: FontWeight.w700,
                                        color: AppColors.primary,
                                      ),
                                    ),
                                  ],
                                ],
                              ),
                              Text(
                                "${summary.totalGoodEggs} œufs • ${summary.collectionsCount} saisie(s) • Taux: ${summary.averageLayingRate.toStringAsFixed(1)}%",
                                style: const TextStyle(fontSize: 11, color: AppColors.textMutedLight),
                              ),
                            ],
                          ),
                          Row(
                            children: [
                              if (canCreateFinance) ...[
                                OutlinedButton.icon(
                                  onPressed: () => RecordTransactionModal.show(
                                    context,
                                    initialType: "INCOME",
                                    initialCategory: "EGG_SALE",
                                  ),
                                  icon: const Icon(Icons.point_of_sale_rounded, size: 15),
                                  label: const Text("Vendre", style: TextStyle(fontSize: 12)),
                                  style: OutlinedButton.styleFrom(
                                    foregroundColor: AppColors.success,
                                    side: const BorderSide(color: AppColors.success),
                                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                  ),
                                ),
                                const SizedBox(width: 8),
                              ],
                              ElevatedButton.icon(
                                onPressed: () => _openRecordEggDialog(eggState.layerFlocks, eggState.selectedFlockId),
                                icon: const Icon(Icons.add_rounded, size: 15),
                                label: const Text("Ramassage", style: TextStyle(fontSize: 12)),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: AppColors.accent,
                                  foregroundColor: Colors.white,
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),

                    // Sélecteur de bande compact si plusieurs bandes
                    if (eggState.layerFlocks.length > 1) ...[
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
                        decoration: BoxDecoration(
                          color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.filter_list_rounded, size: 18, color: AppColors.accent),
                            const SizedBox(width: 10),
                            Expanded(
                              child: DropdownButtonHideUnderline(
                                child: DropdownButton<String?>(
                                  value: eggState.selectedFlockId,
                                  isExpanded: true,
                                  hint: const Text("Toutes les bandes de pondeuses", style: TextStyle(fontSize: 13)),
                                  items: [
                                    const DropdownMenuItem<String?>(
                                      value: null,
                                      child: Text("Toutes les bandes de pondeuses", style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                                    ),
                                    ...eggState.layerFlocks.map((flock) {
                                      return DropdownMenuItem<String?>(
                                        value: flock.id,
                                        child: Text(
                                          "${flock.name} (${flock.currentQuantity} sujets)",
                                          style: const TextStyle(fontSize: 13),
                                        ),
                                      );
                                    }),
                                  ],
                                  onChanged: (val) => ref.read(eggProvider.notifier).filterByFlock(val),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 14),
                    ],

                    // Titre liste
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          "Historique des collectes",
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                        ),
                        Text(
                          "${eggState.productions.length} enregistrée(s)",
                          style: const TextStyle(fontSize: 12, color: AppColors.textMutedLight),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),

                    // Liste des collectes ou état vide
                    if (eggState.productions.isEmpty)
                      Container(
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
                            Icon(Icons.egg_outlined, size: 48, color: AppColors.accent.withValues(alpha: 0.6)),
                            const SizedBox(height: 12),
                            const Text(
                              "Aucune collecte enregistrée",
                              style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                            ),
                            const SizedBox(height: 6),
                            const Text(
                              "Appuyez sur le bouton ci-dessous pour saisir le premier ramassage d'œufs de la journée.",
                              textAlign: TextAlign.center,
                              style: TextStyle(fontSize: 12, color: AppColors.textMutedLight),
                            ),
                            const SizedBox(height: 16),
                            ElevatedButton.icon(
                              onPressed: () => _openRecordEggDialog(eggState.layerFlocks, eggState.selectedFlockId),
                              icon: const Icon(Icons.add, size: 18),
                              label: const Text("Enregistrer une collecte"),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppColors.accent,
                                foregroundColor: Colors.white,
                              ),
                            ),
                          ],
                        ),
                      )
                    else
                      ListView.separated(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        itemCount: eggState.productions.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 10),
                        itemBuilder: (context, index) {
                          final prod = eggState.productions[index];
                          final tray = prod.trayInfo;

                          return Card(
                            child: Padding(
                              padding: const EdgeInsets.all(14),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Expanded(
                                        child: Text(
                                          prod.flockName ?? "Bande de pondeuses",
                                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                      ),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                        decoration: BoxDecoration(
                                          color: AppColors.accentSoft,
                                          borderRadius: BorderRadius.circular(6),
                                        ),
                                        child: Text(
                                          "${prod.date} • ${prod.sessionLabel}",
                                          style: const TextStyle(
                                            fontSize: 11,
                                            fontWeight: FontWeight.bold,
                                            color: AppColors.accent,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 8),
                                  Row(
                                    children: [
                                      Text(
                                        "${prod.goodEggs} œufs",
                                        style: const TextStyle(
                                          fontSize: 18,
                                          fontWeight: FontWeight.w800,
                                          fontFamily: 'monospace',
                                        ),
                                      ),
                                      const SizedBox(width: 8),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                        decoration: BoxDecoration(
                                          color: AppColors.primarySoft,
                                          borderRadius: BorderRadius.circular(6),
                                        ),
                                        child: Text(
                                          tray.text,
                                          style: const TextStyle(
                                            fontSize: 11,
                                            fontWeight: FontWeight.bold,
                                            color: AppColors.primary,
                                          ),
                                        ),
                                      ),
                                      if (prod.layingRate != null && prod.layingRate! > 0) ...[
                                        const Spacer(),
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                          decoration: BoxDecoration(
                                            color: AppColors.primarySoft,
                                            borderRadius: BorderRadius.circular(6),
                                          ),
                                          child: Text(
                                            "${prod.layingRate!.toStringAsFixed(1)}% ponte",
                                            style: const TextStyle(
                                              fontSize: 11,
                                              fontWeight: FontWeight.bold,
                                              color: AppColors.primary,
                                            ),
                                          ),
                                        ),
                                      ],
                                    ],
                                  ),
                                  if (prod.crackedEggs > 0 || prod.dirtyEggs > 0 || prod.deformedEggs > 0) ...[
                                    const SizedBox(height: 8),
                                    Wrap(
                                      spacing: 6,
                                      runSpacing: 4,
                                      children: [
                                        if (prod.crackedEggs > 0)
                                          _QualityBadge(
                                            text: "${prod.crackedEggs} fêlé(s)/cassé(s)",
                                            color: AppColors.danger,
                                          ),
                                        if (prod.dirtyEggs > 0)
                                          _QualityBadge(
                                            text: "${prod.dirtyEggs} sale(s)",
                                            color: AppColors.textMutedLight,
                                          ),
                                        if (prod.deformedEggs > 0)
                                          _QualityBadge(
                                            text: "${prod.deformedEggs} anormal(aux)",
                                            color: AppColors.accent,
                                          ),
                                      ],
                                    ),
                                  ],
                                  if (prod.notes != null && prod.notes!.isNotEmpty) ...[
                                    const SizedBox(height: 6),
                                    Text(
                                      prod.notes!,
                                      style: TextStyle(
                                        fontSize: 11,
                                        fontStyle: FontStyle.italic,
                                        color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                                      ),
                                    ),
                                  ],
                                ],
                              ),
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


class _QualityBadge extends StatelessWidget {
  final String text;
  final Color color;

  const _QualityBadge({required this.text, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(4),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Text(
        text,
        style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: color),
      ),
    );
  }
}
