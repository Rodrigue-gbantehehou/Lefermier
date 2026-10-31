import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/theme_provider.dart';
import '../../core/models/flock.dart';
import '../buildings/buildings_provider.dart';
import '../reports/reports_screen.dart';
import 'flock_provider.dart';

class FlocksScreen extends ConsumerStatefulWidget {
  const FlocksScreen({super.key});

  @override
  ConsumerState<FlocksScreen> createState() => _FlocksScreenState();
}

class _FlocksScreenState extends ConsumerState<FlocksScreen> {
  void _openRecordMovementDialog(List<Flock> flocks, [String? preselectedFlockId]) {
    if (flocks.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text("Aucune bande disponible pour enregistrer un mouvement."),
          backgroundColor: AppColors.danger,
        ),
      );
      return;
    }

    String selectedFlockId = preselectedFlockId ?? flocks.first.id;
    if (!flocks.any((f) => f.id == selectedFlockId)) {
      selectedFlockId = flocks.first.id;
    }

    String movementType = "MORTALITY";
    int quantity = 1;
    final reasonController = TextEditingController();
    DateTime movementDate = DateTime.now();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) {
          final isDark = Theme.of(ctx).brightness == Brightness.dark;
          final surfaceColor = isDark ? AppColors.surfaceDark : AppColors.surfaceLight;
          final borderColor = isDark ? AppColors.borderDark : AppColors.borderLight;
          final flockState = ref.watch(flockProvider);
          final currentFlock = flocks.firstWhere((f) => f.id == selectedFlockId, orElse: () => flocks.first);

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
                        "Mouvement / Perte d'effectif",
                        style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close_rounded),
                        onPressed: () => Navigator.pop(ctx),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  // Sélection de la bande
                  const Text("Bande concernée *", style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
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
                        items: flocks.map((flock) {
                          return DropdownMenuItem<String>(
                            value: flock.id,
                            child: Text(
                              "${flock.name} (${flock.currentQuantity} vivants)",
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

                  // Type de mouvement
                  const Text("Type d'opération *", style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      _TypeChip(
                        label: "Mortalité",
                        icon: Icons.warning_amber_rounded,
                        color: AppColors.danger,
                        isSelected: movementType == "MORTALITY",
                        onTap: () => setModalState(() => movementType = "MORTALITY"),
                      ),
                      const SizedBox(width: 6),
                      _TypeChip(
                        label: "Réforme",
                        icon: Icons.sync_problem_rounded,
                        color: AppColors.accent,
                        isSelected: movementType == "CULLING",
                        onTap: () => setModalState(() => movementType = "CULLING"),
                      ),
                      const SizedBox(width: 6),
                      _TypeChip(
                        label: "Vente sujets",
                        icon: Icons.storefront_rounded,
                        color: AppColors.success,
                        isSelected: movementType == "SALE",
                        onTap: () => setModalState(() => movementType = "SALE"),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Quantité de sujets
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: (movementType == "MORTALITY" ? AppColors.danger : AppColors.primary).withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                        color: (movementType == "MORTALITY" ? AppColors.danger : AppColors.primary).withValues(alpha: 0.25),
                      ),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              movementType == "MORTALITY" ? "Nombre de pertes *" : "Nombre de sujets *",
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.bold,
                                color: movementType == "MORTALITY" ? AppColors.danger : AppColors.primary,
                              ),
                            ),
                            Text(
                              "Effectif max: ${currentFlock.currentQuantity} sujets",
                              style: const TextStyle(fontSize: 11, color: AppColors.textMutedLight),
                            ),
                          ],
                        ),
                        Row(
                          children: [
                            IconButton(
                              onPressed: quantity > 1 ? () => setModalState(() => quantity--) : null,
                              icon: const Icon(Icons.remove_circle_outline, size: 24),
                            ),
                            Container(
                              constraints: const BoxConstraints(minWidth: 40),
                              alignment: Alignment.center,
                              child: Text(
                                "$quantity",
                                style: const TextStyle(
                                  fontSize: 24,
                                  fontWeight: FontWeight.w900,
                                  fontFamily: 'monospace',
                                ),
                              ),
                            ),
                            IconButton(
                              onPressed: quantity < currentFlock.currentQuantity ? () => setModalState(() => quantity++) : null,
                              icon: const Icon(Icons.add_circle_outline, size: 24),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 14),

                  // Motif
                  TextField(
                    controller: reasonController,
                    decoration: InputDecoration(
                      labelText: "Motif ou cause observée (optionnel)",
                      hintText: "Ex: Coup de chaleur, piquage, maladie, vente directe...",
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
                          onPressed: !flockState.isSubmitting
                              ? () async {
                                  final messenger = ScaffoldMessenger.of(context);
                                  final navigator = Navigator.of(ctx);

                                  final success = await ref.read(flockProvider.notifier).recordMovement(
                                    flockId: selectedFlockId,
                                    type: movementType,
                                    quantity: quantity,
                                    date: movementDate,
                                    reason: reasonController.text,
                                  );

                                  if (ctx.mounted) {
                                    if (success) {
                                      navigator.pop();
                                      messenger.showSnackBar(
                                        SnackBar(
                                          content: Text("Mouvement de $quantity sujet(s) enregistré"),
                                          backgroundColor: AppColors.success,
                                        ),
                                      );
                                    } else {
                                      final err = ref.read(flockProvider).error ?? "Une erreur est survenue.";
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
                            backgroundColor: movementType == "MORTALITY" ? AppColors.danger : AppColors.primary,
                            foregroundColor: Colors.white,
                          ),
                          child: flockState.isSubmitting
                              ? const SizedBox(
                                  height: 20,
                                  width: 20,
                                  child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                                )
                              : const Text("Valider"),
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

  void _openCreateFlockDialog() {
    final codeController = TextEditingController();
    final nameController = TextEditingController();
    final strainController = TextEditingController();
    final qtyController = TextEditingController();
    String poultryType = "LAYER";
    DateTime startDate = DateTime.now();
    String? selectedBuildingId;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) {
          final isDark = Theme.of(ctx).brightness == Brightness.dark;
          final surfaceColor = isDark ? AppColors.surfaceDark : AppColors.surfaceLight;
          final borderColor = isDark ? AppColors.borderDark : AppColors.borderLight;
          final flockState = ref.watch(flockProvider);

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
                        "Nouvelle Bande de Volailles",
                        style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close_rounded),
                        onPressed: () => Navigator.pop(ctx),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),

                  // Type de production
                  const Text("Type d'élevage *", style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      Expanded(
                        child: InkWell(
                          onTap: () => setModalState(() => poultryType = "LAYER"),
                          borderRadius: BorderRadius.circular(10),
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 8),
                            decoration: BoxDecoration(
                              color: poultryType == "LAYER" ? AppColors.accent : Colors.transparent,
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(color: poultryType == "LAYER" ? AppColors.accent : borderColor),
                            ),
                            alignment: Alignment.center,
                            child: Text(
                              "Pondeuses",
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                                color: poultryType == "LAYER" ? Colors.white : AppColors.textMutedLight,
                              ),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: InkWell(
                          onTap: () => setModalState(() => poultryType = "BROILER"),
                          borderRadius: BorderRadius.circular(10),
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 8),
                            decoration: BoxDecoration(
                              color: poultryType == "BROILER" ? AppColors.primary : Colors.transparent,
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(color: poultryType == "BROILER" ? AppColors.primary : borderColor),
                            ),
                            alignment: Alignment.center,
                            child: Text(
                              "Poulets de chair",
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                                color: poultryType == "BROILER" ? Colors.white : AppColors.textMutedLight,
                              ),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),

                  // Nom et Code
                  Row(
                    children: [
                      Expanded(
                        flex: 2,
                        child: TextField(
                          controller: nameController,
                          decoration: InputDecoration(
                            labelText: "Nom de la bande *",
                            hintText: "Ex: Lot Pondeuses Bâtiment A",
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                            contentPadding: const EdgeInsets.all(12),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: TextField(
                          controller: codeController,
                          decoration: InputDecoration(
                            labelText: "Code *",
                            hintText: "LOT-01",
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                            contentPadding: const EdgeInsets.all(12),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  // Effectif & Souche
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: qtyController,
                          keyboardType: TextInputType.number,
                          decoration: InputDecoration(
                            labelText: "Effectif initial *",
                            hintText: "Ex: 500",
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                            contentPadding: const EdgeInsets.all(12),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: TextField(
                          controller: strainController,
                          decoration: InputDecoration(
                            labelText: "Souche / Race",
                            hintText: "Ex: Lohmann, Cobb 500",
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                            contentPadding: const EdgeInsets.all(12),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  // Bâtiment d'accueil
                  Consumer(
                    builder: (ctx, ref, _) {
                      final buildings = ref.watch(buildingsProvider).buildings.where((b) => b.isActive).toList();
                      if (buildings.isEmpty) return const SizedBox.shrink();

                      return Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          DropdownButtonFormField<String>(
                            initialValue: selectedBuildingId,
                            isExpanded: true,
                            decoration: InputDecoration(
                              labelText: "Bâtiment d'accueil",
                              prefixIcon: const Icon(Icons.home_work_outlined, size: 20),
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                            ),
                            hint: const Text("Sélectionner un bâtiment (optionnel)"),
                            items: [
                              const DropdownMenuItem<String>(
                                value: null,
                                child: Text("Aucun bâtiment spécifique"),
                              ),
                              ...buildings.map((b) => DropdownMenuItem<String>(
                                    value: b.id,
                                    child: Text("${b.name} (${b.capacity} pl. - ${b.type.label})"),
                                  )),
                            ],
                            onChanged: (val) => setModalState(() => selectedBuildingId = val),
                          ),
                          const SizedBox(height: 12),
                        ],
                      );
                    },
                  ),
                  const SizedBox(height: 6),

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
                          onPressed: !flockState.isSubmitting
                              ? () async {
                                  final name = nameController.text.trim();
                                  final code = codeController.text.trim();
                                  final qty = int.tryParse(qtyController.text.trim()) ?? 0;

                                  if (name.isEmpty || code.isEmpty || qty <= 0) {
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      const SnackBar(
                                        content: Text("Veuillez renseigner un nom, un code et un effectif valide."),
                                        backgroundColor: AppColors.danger,
                                      ),
                                    );
                                    return;
                                  }

                                  final messenger = ScaffoldMessenger.of(context);
                                  final navigator = Navigator.of(ctx);

                                  final success = await ref.read(flockProvider.notifier).createFlock(
                                    code: code,
                                    name: name,
                                    initialQuantity: qty,
                                    startDate: startDate,
                                    poultryType: poultryType,
                                    strain: strainController.text.trim(),
                                    buildingId: selectedBuildingId,
                                  );

                                  if (ctx.mounted) {
                                    if (success) {
                                      navigator.pop();
                                      messenger.showSnackBar(
                                        SnackBar(
                                          content: Text("Bande $name créée avec succès !"),
                                          backgroundColor: AppColors.success,
                                        ),
                                      );
                                    } else {
                                      final err = ref.read(flockProvider).error ?? "Une erreur est survenue.";
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
                          child: flockState.isSubmitting
                              ? const SizedBox(
                                  height: 20,
                                  width: 20,
                                  child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                                )
                              : const Text("Créer la bande"),
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
    final flockState = ref.watch(flockProvider);
    final summary = flockState.summary;

    final filteredFlocks = flockState.flocks.where((f) {
      if (flockState.filterType == null) return true;
      return f.type == flockState.filterType;
    }).toList();

    return Scaffold(
      appBar: AppBar(
        leading: Builder(
          builder: (ctx) => IconButton(
            icon: const Icon(Icons.menu_rounded),
            tooltip: "Menu",
            onPressed: () => Scaffold.of(ctx).openDrawer(),
          ),
        ),
        title: const Text("Bandes & Lots"),
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
            icon: const Icon(Icons.share_rounded),
            tooltip: "Partager une synthèse",
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (_) => const ReportsScreen(initialType: ReportType.flockSummary),
                ),
              );
            },
          ),
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            tooltip: "Actualiser",
            onPressed: () => ref.read(flockProvider.notifier).loadFlocks(),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _openRecordMovementDialog(flockState.flocks),
        backgroundColor: AppColors.danger,
        icon: const Icon(Icons.remove_circle_outline, color: Colors.white),
        label: const Text("Mortalité / Perte", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
      ),
      body: RefreshIndicator(
        onRefresh: () => ref.read(flockProvider.notifier).loadFlocks(showLoading: false),
        child: flockState.isLoading
            ? const Center(child: CircularProgressIndicator())
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
                                    "${summary.totalBirds}",
                                    style: const TextStyle(
                                      fontSize: 22,
                                      fontWeight: FontWeight.w900,
                                      fontFamily: 'monospace',
                                      color: AppColors.primary,
                                    ),
                                  ),
                                  const SizedBox(width: 6),
                                  const Text(
                                    "volailles vivantes",
                                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
                                  ),
                                ],
                              ),
                              Text(
                                "${summary.activeFlocksCount} lot(s) actif(s) • Perte: ${summary.averageMortality.toStringAsFixed(1)}%",
                                style: const TextStyle(fontSize: 11, color: AppColors.textMutedLight),
                              ),
                            ],
                          ),
                          ElevatedButton.icon(
                            onPressed: _openCreateFlockDialog,
                            icon: const Icon(Icons.add_rounded, size: 16),
                            label: const Text("Nouveau lot", style: TextStyle(fontSize: 12)),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppColors.primary,
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                            ),
                          ),
                        ],
                      ),
                    ),

                    // Filtre segmenté mobile 3 boutons
                    Container(
                      decoration: BoxDecoration(
                        color: isDark ? Colors.grey.shade900 : Colors.grey.shade200,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      padding: const EdgeInsets.all(4),
                      child: Row(
                        children: [
                          Expanded(
                            child: InkWell(
                              onTap: () => ref.read(flockProvider.notifier).setFilterType(null),
                              borderRadius: BorderRadius.circular(10),
                              child: Container(
                                padding: const EdgeInsets.symmetric(vertical: 8),
                                decoration: BoxDecoration(
                                  color: flockState.filterType == null
                                      ? (isDark ? AppColors.surfaceDark : Colors.white)
                                      : Colors.transparent,
                                  borderRadius: BorderRadius.circular(10),
                                  boxShadow: flockState.filterType == null
                                      ? [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 4)]
                                      : null,
                                ),
                                alignment: Alignment.center,
                                child: Text(
                                  "Toutes",
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: flockState.filterType == null ? FontWeight.bold : FontWeight.w500,
                                    color: flockState.filterType == null
                                        ? AppColors.primary
                                        : AppColors.textMutedLight,
                                  ),
                                ),
                              ),
                            ),
                          ),
                          Expanded(
                            child: InkWell(
                              onTap: () => ref.read(flockProvider.notifier).setFilterType("LAYER"),
                              borderRadius: BorderRadius.circular(10),
                              child: Container(
                                padding: const EdgeInsets.symmetric(vertical: 8),
                                decoration: BoxDecoration(
                                  color: flockState.filterType == "LAYER"
                                      ? (isDark ? AppColors.surfaceDark : Colors.white)
                                      : Colors.transparent,
                                  borderRadius: BorderRadius.circular(10),
                                  boxShadow: flockState.filterType == "LAYER"
                                      ? [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 4)]
                                      : null,
                                ),
                                alignment: Alignment.center,
                                child: Text(
                                  "Pondeuses",
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: flockState.filterType == "LAYER" ? FontWeight.bold : FontWeight.w500,
                                    color: flockState.filterType == "LAYER"
                                        ? AppColors.accent
                                        : AppColors.textMutedLight,
                                  ),
                                ),
                              ),
                            ),
                          ),
                          Expanded(
                            child: InkWell(
                              onTap: () => ref.read(flockProvider.notifier).setFilterType("BROILER"),
                              borderRadius: BorderRadius.circular(10),
                              child: Container(
                                padding: const EdgeInsets.symmetric(vertical: 8),
                                decoration: BoxDecoration(
                                  color: flockState.filterType == "BROILER"
                                      ? (isDark ? AppColors.surfaceDark : Colors.white)
                                      : Colors.transparent,
                                  borderRadius: BorderRadius.circular(10),
                                  boxShadow: flockState.filterType == "BROILER"
                                      ? [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 4)]
                                      : null,
                                ),
                                alignment: Alignment.center,
                                child: Text(
                                  "Poulets Chair",
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: flockState.filterType == "BROILER" ? FontWeight.bold : FontWeight.w500,
                                    color: flockState.filterType == "BROILER"
                                        ? AppColors.primary
                                        : AppColors.textMutedLight,
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 14),

                    // Titre Liste
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          "Lots en élevage",
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                        ),
                        Text(
                          "${filteredFlocks.length} bande(s)",
                          style: const TextStyle(fontSize: 12, color: AppColors.textMutedLight),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),

                    // Liste ou état vide
                    if (filteredFlocks.isEmpty)
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
                            Icon(Icons.pets_outlined, size: 48, color: AppColors.primary.withValues(alpha: 0.6)),
                            const SizedBox(height: 12),
                            const Text(
                              "Aucune bande d'élevage enregistrée",
                              style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                            ),
                            const SizedBox(height: 6),
                            const Text(
                              "Démarrez une nouvelle bande pour suivre la croissance, la ponte et la mortalité.",
                              textAlign: TextAlign.center,
                              style: TextStyle(fontSize: 12, color: AppColors.textMutedLight),
                            ),
                            const SizedBox(height: 16),
                            ElevatedButton.icon(
                              onPressed: _openCreateFlockDialog,
                              icon: const Icon(Icons.add, size: 18),
                              label: const Text("Créer une bande"),
                            ),
                          ],
                        ),
                      )
                    else
                      ListView.separated(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        itemCount: filteredFlocks.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 12),
                        itemBuilder: (context, index) {
                          final flock = filteredFlocks[index];
                          final mortalityRate = flock.calculatedMortalityRate;

                          return Card(
                            child: Padding(
                              padding: const EdgeInsets.all(16),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              flock.name,
                                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                                            ),
                                            if (flock.code != null)
                                              Text(
                                                "Code: ${flock.code}",
                                                style: const TextStyle(fontSize: 11, color: AppColors.textMutedLight),
                                              ),
                                          ],
                                        ),
                                      ),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                        decoration: BoxDecoration(
                                          color: flock.isLayer ? AppColors.accentSoft : AppColors.primarySoft,
                                          borderRadius: BorderRadius.circular(6),
                                        ),
                                        child: Text(
                                          flock.typeLabel,
                                          style: TextStyle(
                                            fontSize: 10,
                                            fontWeight: FontWeight.bold,
                                            color: flock.isLayer ? AppColors.accent : AppColors.primary,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    "${flock.breed} • ${flock.buildingName ?? 'Bâtiment standard'}${flock.ageInWeeks != null ? ' • ${flock.ageInWeeks} sem.' : ''}",
                                    style: const TextStyle(fontSize: 12, color: AppColors.textMutedLight),
                                  ),
                                  const SizedBox(height: 12),
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          const Text("Vivant", style: TextStyle(fontSize: 10, color: AppColors.textMutedLight)),
                                          Text(
                                            "${flock.currentQuantity} sujets",
                                            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, fontFamily: 'monospace'),
                                          ),
                                        ],
                                      ),
                                      Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          const Text("Départ", style: TextStyle(fontSize: 10, color: AppColors.textMutedLight)),
                                          Text(
                                            "${flock.initialQuantity}",
                                            style: const TextStyle(fontSize: 14, color: AppColors.textMutedLight, fontFamily: 'monospace'),
                                          ),
                                        ],
                                      ),
                                      Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          const Text("Pertes", style: TextStyle(fontSize: 10, color: AppColors.textMutedLight)),
                                          Text(
                                            "${mortalityRate.toStringAsFixed(1)}%",
                                            style: TextStyle(
                                              fontSize: 14,
                                              fontWeight: FontWeight.bold,
                                              color: mortalityRate > 5 ? AppColors.danger : AppColors.success,
                                            ),
                                          ),
                                        ],
                                      ),
                                      InkWell(
                                        onTap: () {
                                          Navigator.of(context).push(
                                            MaterialPageRoute(
                                              builder: (_) => ReportsScreen(
                                                initialType: ReportType.flockSummary,
                                                initialFlockId: flock.id,
                                              ),
                                            ),
                                          );
                                        },
                                        borderRadius: BorderRadius.circular(8),
                                        child: Container(
                                          padding: const EdgeInsets.all(6),
                                          margin: const EdgeInsets.only(right: 6),
                                          decoration: BoxDecoration(
                                            color: AppColors.primary.withValues(alpha: 0.1),
                                            borderRadius: BorderRadius.circular(8),
                                            border: Border.all(color: AppColors.primary.withValues(alpha: 0.3)),
                                          ),
                                          child: const Icon(Icons.share_rounded, size: 14, color: AppColors.primary),
                                        ),
                                      ),
                                      InkWell(
                                        onTap: () => _openRecordMovementDialog(flockState.flocks, flock.id),
                                        borderRadius: BorderRadius.circular(8),
                                        child: Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                          decoration: BoxDecoration(
                                            color: AppColors.danger.withValues(alpha: 0.1),
                                            borderRadius: BorderRadius.circular(8),
                                            border: Border.all(color: AppColors.danger.withValues(alpha: 0.3)),
                                          ),
                                          child: const Row(
                                            mainAxisSize: MainAxisSize.min,
                                            children: [
                                              Icon(Icons.remove, size: 14, color: AppColors.danger),
                                              SizedBox(width: 4),
                                              Text(
                                                "Perte",
                                                style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.danger),
                                              ),
                                            ],
                                          ),
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
                  ],
                ),
              ),
      ),
    );
  }
}


class _TypeChip extends StatelessWidget {
  final String label;
  final IconData icon;
  final Color color;
  final bool isSelected;
  final VoidCallback onTap;

  const _TypeChip({
    required this.label,
    required this.icon,
    required this.color,
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
            color: isSelected ? color : Colors.transparent,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: isSelected ? color : AppColors.borderLight,
            ),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: 14, color: isSelected ? Colors.white : AppColors.textMutedLight),
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
