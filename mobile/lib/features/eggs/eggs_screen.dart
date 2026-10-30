import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/theme_provider.dart';
import '../../core/utils/egg_calculator.dart';
import '../../core/models/flock.dart';
import 'egg_provider.dart';

class EggsScreen extends ConsumerStatefulWidget {
  const EggsScreen({super.key});

  @override
  ConsumerState<EggsScreen> createState() => _EggsScreenState();
}

class _EggsScreenState extends ConsumerState<EggsScreen> {
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

    String selectedFlockId = defaultFlockId ?? layerFlocks.first.id;
    if (!layerFlocks.any((f) => f.id == selectedFlockId)) {
      selectedFlockId = layerFlocks.first.id;
    }

    DateTime selectedDate = DateTime.now();
    String session = "MORNING";
    int goodEggs = 0;
    int crackedEggs = 0;
    int dirtyEggs = 0;
    int deformedEggs = 0;
    final notesController = TextEditingController();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) {
          final isDark = Theme.of(ctx).brightness == Brightness.dark;
          final surfaceColor = isDark ? AppColors.surfaceDark : AppColors.surfaceLight;
          final borderColor = isDark ? AppColors.borderDark : AppColors.borderLight;
          final trayInfo = EggCalculator.calculate(goodEggs);
          final eggState = ref.watch(eggProvider);

          return Container(
            decoration: BoxDecoration(
              color: surfaceColor,
              borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
              border: Border.all(color: borderColor),
            ),
            padding: EdgeInsets.fromLTRB(
              20,
              12,
              20,
              MediaQuery.of(ctx).viewInsets.bottom + MediaQuery.of(ctx).padding.bottom + 20,
            ),
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Center(
                    child: Container(
                      width: 40,
                      height: 4,
                      decoration: BoxDecoration(
                        color: isDark ? AppColors.borderDark : AppColors.borderLight,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        "Nouvelle Collecte d'Œufs",
                        style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close_rounded),
                        onPressed: () => Navigator.pop(ctx),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  // Sélection du Lot / Bande
                  if (layerFlocks.length > 1) ...[
                    const Text(
                      "Bande de pondeuses *",
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                    ),
                    const SizedBox(height: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      decoration: BoxDecoration(
                        color: isDark ? Colors.grey.shade900 : Colors.grey.shade100,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: borderColor),
                      ),
                      child: DropdownButtonHideUnderline(
                        child: DropdownButton<String>(
                          value: selectedFlockId,
                          isExpanded: true,
                          items: layerFlocks.map((flock) {
                            return DropdownMenuItem<String>(
                              value: flock.id,
                              child: Text(
                                "${flock.name} (${flock.currentQuantity} sujets)",
                                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                              ),
                            );
                          }).toList(),
                          onChanged: (val) {
                            if (val != null) {
                              setModalState(() => selectedFlockId = val);
                            }
                          },
                        ),
                      ),
                    ),
                    const SizedBox(height: 14),
                  ] else ...[
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: AppColors.accent.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.pets, size: 16, color: AppColors.accent),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              "Bande : ${layerFlocks.first.name} (${layerFlocks.first.currentQuantity} sujets)",
                              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.accent),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 14),
                  ],

                  // Session de ramassage (Matin, Midi, Soir, Journée)
                  const Text(
                    "Session de collecte *",
                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      _SessionChip(
                        label: "Matin",
                        icon: Icons.wb_sunny_outlined,
                        isSelected: session == "MORNING",
                        onTap: () => setModalState(() => session = "MORNING"),
                      ),
                      const SizedBox(width: 6),
                      _SessionChip(
                        label: "Midi",
                        icon: Icons.wb_sunny,
                        isSelected: session == "AFTERNOON",
                        onTap: () => setModalState(() => session = "AFTERNOON"),
                      ),
                      const SizedBox(width: 6),
                      _SessionChip(
                        label: "Soir",
                        icon: Icons.nightlight_round_outlined,
                        isSelected: session == "EVENING",
                        onTap: () => setModalState(() => session = "EVENING"),
                      ),
                      const SizedBox(width: 6),
                      _SessionChip(
                        label: "Jour",
                        icon: Icons.all_inclusive,
                        isSelected: session == "ALL_DAY",
                        onTap: () => setModalState(() => session = "ALL_DAY"),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Bons Œufs counter box avec calcul automatique des alvéoles de 30
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: AppColors.primarySoft,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: AppColors.primary.withValues(alpha: 0.3)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text(
                              "Bons œufs récoltés *",
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.bold,
                                color: AppColors.primary,
                              ),
                            ),
                            if (goodEggs > 0)
                              InkWell(
                                onTap: () => setModalState(() => goodEggs = 0),
                                child: const Padding(
                                  padding: EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                                  child: Text(
                                    "Remettre à 0",
                                    style: TextStyle(fontSize: 11, color: AppColors.danger, fontWeight: FontWeight.w600),
                                  ),
                                ),
                              ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.baseline,
                          textBaseline: TextBaseline.alphabetic,
                          children: [
                            Text(
                              "$goodEggs",
                              style: const TextStyle(
                                fontSize: 32,
                                fontWeight: FontWeight.w900,
                                fontFamily: 'monospace',
                                color: AppColors.primary,
                              ),
                            ),
                            const SizedBox(width: 6),
                            const Text(
                              "œufs",
                              style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.primary),
                            ),
                            const Spacer(),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(
                                color: AppColors.accent.withValues(alpha: 0.15),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(
                                trayInfo.text,
                                style: const TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.bold,
                                  color: AppColors.accent,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        const Text(
                          "Ajout rapide par alvéoles / plateaux de 30 :",
                          style: TextStyle(fontSize: 11, color: AppColors.textMutedLight, fontWeight: FontWeight.w500),
                        ),
                        const SizedBox(height: 6),
                        Row(
                          children: [
                            _TrayBtn(
                              label: "+1 pl. (30)",
                              onTap: () => setModalState(() => goodEggs += 30),
                            ),
                            const SizedBox(width: 6),
                            _TrayBtn(
                              label: "+2 pl. (60)",
                              onTap: () => setModalState(() => goodEggs += 60),
                            ),
                            const SizedBox(width: 6),
                            _TrayBtn(
                              label: "+5 pl. (150)",
                              onTap: () => setModalState(() => goodEggs += 150),
                            ),
                            const SizedBox(width: 6),
                            _TrayBtn(
                              label: "+10 pl. (300)",
                              onTap: () => setModalState(() => goodEggs += 300),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.end,
                          children: [
                            IconButton(
                              onPressed: goodEggs > 0 ? () => setModalState(() => goodEggs = (goodEggs - 1).clamp(0, 99999)) : null,
                              icon: const Icon(Icons.remove_circle_outline, size: 22, color: AppColors.primary),
                            ),
                            const Text("Unité (+/-)", style: TextStyle(fontSize: 11, color: AppColors.primary, fontWeight: FontWeight.w600)),
                            IconButton(
                              onPressed: () => setModalState(() => goodEggs++),
                              icon: const Icon(Icons.add_circle_outline, size: 22, color: AppColors.primary),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Déclassement (Fêlés / Sales / Déformés)
                  const Text(
                    "Déclassement & Anomalies",
                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),
                  _EggQualityRow(
                    label: "Œufs fêlés / cassés",
                    count: crackedEggs,
                    color: AppColors.danger,
                    onDecrement: crackedEggs > 0 ? () => setModalState(() => crackedEggs--) : null,
                    onIncrement: () => setModalState(() => crackedEggs++),
                  ),
                  const SizedBox(height: 6),
                  _EggQualityRow(
                    label: "Œufs sales",
                    count: dirtyEggs,
                    color: Colors.brown.shade400,
                    onDecrement: dirtyEggs > 0 ? () => setModalState(() => dirtyEggs--) : null,
                    onIncrement: () => setModalState(() => dirtyEggs++),
                  ),
                  const SizedBox(height: 6),
                  _EggQualityRow(
                    label: "Œufs déformés / anormaux",
                    count: deformedEggs,
                    color: Colors.orange.shade700,
                    onDecrement: deformedEggs > 0 ? () => setModalState(() => deformedEggs--) : null,
                    onIncrement: () => setModalState(() => deformedEggs++),
                  ),
                  const SizedBox(height: 14),

                  // Notes optionnelles
                  TextField(
                    controller: notesController,
                    maxLines: 2,
                    decoration: InputDecoration(
                      labelText: "Observations / Notes (optionnel)",
                      hintText: "Ex: Ramassage retardé, propreté des pondoirs...",
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      contentPadding: const EdgeInsets.all(12),
                    ),
                  ),
                  const SizedBox(height: 18),

                  // Boutons d'action
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: () => Navigator.pop(ctx),
                          style: OutlinedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                          child: const Text("Annuler"),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: ElevatedButton(
                          onPressed: (goodEggs > 0 && !eggState.isSubmitting)
                              ? () async {
                                  final messenger = ScaffoldMessenger.of(context);
                                  final navigator = Navigator.of(ctx);

                                  final success = await ref.read(eggProvider.notifier).recordProduction(
                                    flockId: selectedFlockId,
                                    date: selectedDate,
                                    session: session,
                                    goodEggs: goodEggs,
                                    crackedEggs: crackedEggs,
                                    dirtyEggs: dirtyEggs,
                                    deformedEggs: deformedEggs,
                                    notes: notesController.text,
                                  );

                                  if (ctx.mounted) {
                                    if (success) {
                                      navigator.pop();
                                      messenger.showSnackBar(
                                        SnackBar(
                                          content: Text("Collecte de $goodEggs œufs (${trayInfo.text}) enregistrée avec succès"),
                                          backgroundColor: AppColors.success,
                                        ),
                                      );
                                    } else {
                                      final err = ref.read(eggProvider).error ?? "Une erreur est survenue.";
                                      messenger.showSnackBar(
                                        SnackBar(content: Text(err), backgroundColor: AppColors.danger),
                                      );
                                    }
                                  }
                                }
                              : null,
                          style: ElevatedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                          child: eggState.isSubmitting
                              ? const SizedBox(
                                  height: 20,
                                  width: 20,
                                  child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                                )
                              : const Text("Enregistrer"),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final eggState = ref.watch(eggProvider);
    final summary = eggState.summary;

    return Scaffold(
      appBar: AppBar(
        title: const Text("Ramassage d'œufs"),
        actions: [
          IconButton(
            icon: Icon(
              isDark ? Icons.light_mode_rounded : Icons.dark_mode_rounded,
              color: isDark ? Colors.amber : null,
              size: 20,
            ),
            tooltip: isDark ? "Activer le mode clair" : "Activer le mode sombre",
            onPressed: () => ref.read(themeModeProvider.notifier).toggleTheme(context),
          ),
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            tooltip: "Actualiser",
            onPressed: () => ref.read(eggProvider.notifier).loadData(),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
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
            ? const Center(child: CircularProgressIndicator())
            : SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 90),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Bannière récapitulative des statistiques de ponte
                    _EggStatsCard(summary: summary),
                    const SizedBox(height: 16),

                    // Filtre par bande si multiple
                    if (eggState.layerFlocks.length > 1) ...[
                      SingleChildScrollView(
                        scrollDirection: Axis.horizontal,
                        child: Row(
                          children: [
                            FilterChip(
                              label: const Text("Toutes les bandes"),
                              selected: eggState.selectedFlockId == null,
                              onSelected: (_) => ref.read(eggProvider.notifier).filterByFlock(null),
                            ),
                            const SizedBox(width: 8),
                            ...eggState.layerFlocks.map((flock) {
                              final isSelected = eggState.selectedFlockId == flock.id;
                              return Padding(
                                padding: const EdgeInsets.only(right: 8),
                                child: FilterChip(
                                  label: Text(flock.name),
                                  selected: isSelected,
                                  onSelected: (_) => ref.read(eggProvider.notifier).filterByFlock(isSelected ? null : flock.id),
                                ),
                              );
                            }),
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
                                            color: Colors.blue.withValues(alpha: 0.1),
                                            borderRadius: BorderRadius.circular(6),
                                          ),
                                          child: Text(
                                            "${prod.layingRate!.toStringAsFixed(1)}% ponte",
                                            style: TextStyle(
                                              fontSize: 11,
                                              fontWeight: FontWeight.bold,
                                              color: Colors.blue.shade700,
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
                                            color: Colors.brown.shade400,
                                          ),
                                        if (prod.deformedEggs > 0)
                                          _QualityBadge(
                                            text: "${prod.deformedEggs} anormal(aux)",
                                            color: Colors.orange.shade700,
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

class _EggStatsCard extends StatelessWidget {
  final EggSummaryStats summary;

  const _EggStatsCard({required this.summary});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final surfaceColor = isDark ? AppColors.surfaceDark : AppColors.surfaceLight;
    final borderColor = isDark ? AppColors.borderDark : AppColors.borderLight;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: surfaceColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: borderColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                "Bilan de ponte global",
                style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: AppColors.accent.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  "${summary.collectionsCount} ramassage(s)",
                  style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.accent),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _KpiMiniTile(
                  label: "Bons œufs",
                  value: "${summary.totalGoodEggs}",
                  unit: "unités",
                  color: AppColors.primary,
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _KpiMiniTile(
                  label: "Plateaux (30)",
                  value: "${summary.totalTrays}",
                  unit: "${summary.totalLooseEggs} reste",
                  color: AppColors.accent,
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _KpiMiniTile(
                  label: "Taux de ponte",
                  value: "${summary.averageLayingRate.toStringAsFixed(1)}%",
                  unit: "moyen",
                  color: Colors.blue.shade600,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _KpiMiniTile extends StatelessWidget {
  final String label;
  final String value;
  final String unit;
  final Color color;

  const _KpiMiniTile({
    required this.label,
    required this.value,
    required this.unit,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.15)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: color),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w800,
              fontFamily: 'monospace',
              color: color,
            ),
          ),
          Text(
            unit,
            style: TextStyle(fontSize: 9, color: color.withValues(alpha: 0.8)),
          ),
        ],
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

class _EggQualityRow extends StatelessWidget {
  final String label;
  final int count;
  final Color color;
  final VoidCallback? onDecrement;
  final VoidCallback onIncrement;

  const _EggQualityRow({
    required this.label,
    required this.count,
    required this.color,
    required this.onDecrement,
    required this.onIncrement,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500),
        ),
        Row(
          children: [
            IconButton(
              onPressed: onDecrement,
              icon: const Icon(Icons.remove_circle_outline, size: 20),
              visualDensity: VisualDensity.compact,
            ),
            Container(
              constraints: const BoxConstraints(minWidth: 28),
              alignment: Alignment.center,
              child: Text(
                "$count",
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.bold,
                  fontFamily: 'monospace',
                  color: count > 0 ? color : null,
                ),
              ),
            ),
            IconButton(
              onPressed: onIncrement,
              icon: Icon(Icons.add_circle_outline, size: 20, color: color),
              visualDensity: VisualDensity.compact,
            ),
          ],
        ),
      ],
    );
  }
}

class _SessionChip extends StatelessWidget {
  final String label;
  final IconData icon;
  final bool isSelected;
  final VoidCallback onTap;

  const _SessionChip({
    required this.label,
    required this.icon,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(10),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 8),
          decoration: BoxDecoration(
            color: isSelected ? AppColors.accent : Colors.transparent,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: isSelected ? AppColors.accent : AppColors.borderLight,
            ),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: 13, color: isSelected ? Colors.white : AppColors.textMutedLight),
              const SizedBox(width: 4),
              Text(
                label,
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                  color: isSelected ? Colors.white : AppColors.textMutedLight,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _TrayBtn extends StatelessWidget {
  final String label;
  final VoidCallback onTap;

  const _TrayBtn({required this.label, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Expanded(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(8),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 6),
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: isDark ? AppColors.surfaceDark : Colors.white,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: AppColors.primary.withValues(alpha: 0.3)),
          ),
          child: Text(
            label,
            style: const TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.bold,
              color: AppColors.primary,
            ),
          ),
        ),
      ),
    );
  }
}
