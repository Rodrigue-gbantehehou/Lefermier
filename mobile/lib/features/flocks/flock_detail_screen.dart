import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api/api_client.dart';
import '../../core/api/api_endpoints.dart';
import '../../core/models/egg_production.dart';
import '../../core/models/flock.dart';
import '../../core/models/flock_movement.dart';
import '../../core/models/stock_movement.dart';
import '../../core/models/health_treatment.dart';
import '../../core/models/transaction.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/currency_formatter.dart';
import '../../core/widgets/brand_loader.dart';
import '../auth/auth_provider.dart';
import '../eggs/record_egg_modal.dart';
import '../finances/record_transaction_modal.dart';
import '../inventory/record_feeding_modal.dart';
import '../buildings/buildings_provider.dart';
import 'flock_provider.dart';
import 'record_movement_modal.dart';
import 'record_poultry_sale_modal.dart';
import 'close_flock_modal.dart';
import 'flock_summary_modal.dart';

class FlockDetailScreen extends ConsumerStatefulWidget {
  final Flock flock;

  const FlockDetailScreen({super.key, required this.flock});

  @override
  ConsumerState<FlockDetailScreen> createState() => _FlockDetailScreenState();
}

class _FlockDetailScreenState extends ConsumerState<FlockDetailScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  late Flock _flock;

  bool _isLoading = true;
  List<FlockMovement> _movements = [];
  List<StockMovement> _feedings = [];
  List<EggProduction> _eggs = [];
  List<HealthTreatment> _treatments = [];
  List<Transaction> _transactions = [];
  double _totalFeedKg = 0.0;

  double _totalIncome = 0;
  double _totalExpense = 0;
  double _grossMargin = 0;

  int _totalGoodEggs = 0;
  int _totalTrays = 0;
  double _avgLayingRate = 0.0;

  @override
  void initState() {
    super.initState();
    _flock = widget.flock;
    final farm = ref.read(authProvider).activeFarm;
    final canViewFinance = farm == null || farm.canViewFinance;
    final tabCount = (_flock.isLayer ? 4 : 3) + (canViewFinance ? 1 : 0);
    _tabController = TabController(length: tabCount, vsync: this);
    _loadAllData();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadAllData({bool showLoading = true}) async {
    if (showLoading) setState(() => _isLoading = true);

    final farmId = ref.read(authProvider).activeFarm?.id;
    final dio = ApiClient().dio;

    try {
      // 1. Charger les mouvements du lot
      try {
        final moveRes = await dio.get(ApiEndpoints.flockMovements(_flock.id));
        if (moveRes.data != null && moveRes.data['data'] is List) {
          _movements = (moveRes.data['data'] as List)
              .map((m) => FlockMovement.fromJson(m as Map<String, dynamic>))
              .toList();
        }
      } catch (_) {}

      // 2. Charger les pontes (si pondeuses)
      if (_flock.isLayer) {
        try {
          final eggRes = await dio.get(ApiEndpoints.flockEggs(_flock.id));
          if (eggRes.data != null && eggRes.data['data'] is List) {
            _eggs = (eggRes.data['data'] as List)
                .map((e) => EggProduction.fromJson(e as Map<String, dynamic>))
                .toList();

            final metaSummary = eggRes.data['meta']?['summary'];
            if (metaSummary != null) {
              _totalGoodEggs = (metaSummary['totalGoodEggs'] as num?)?.toInt() ?? 0;
              _totalTrays = (metaSummary['totalTrays'] as num?)?.toInt() ?? (_totalGoodEggs ~/ 30);
              _avgLayingRate = (metaSummary['averageLayingRate'] as num?)?.toDouble() ?? 0.0;
            } else {
              _totalGoodEggs = _eggs.fold<int>(0, (sum, e) => sum + e.goodEggs);
              _totalTrays = _totalGoodEggs ~/ 30;
            }
          }
        } catch (_) {}
      }

      // 3. Charger les soins vétérinaires rattachés
      if (farmId != null) {
        try {
          final healthRes = await dio.get("${ApiEndpoints.farmHealth(farmId)}?flockId=${_flock.id}");
          if (healthRes.data != null && healthRes.data['data'] is List) {
            _treatments = (healthRes.data['data'] as List)
                .map((t) => HealthTreatment.fromJson(t as Map<String, dynamic>))
                .toList();
          }
        } catch (_) {}
      }

      // 4. Charger les transactions financières rattachées
      if (farmId != null) {
        try {
          final txRes = await dio.get("${ApiEndpoints.farmTransactions(farmId)}?flockId=${_flock.id}");
          if (txRes.data != null && txRes.data['data'] is List) {
            _transactions = (txRes.data['data'] as List)
                .map((t) => Transaction.fromJson(t as Map<String, dynamic>))
                .toList();

            _totalIncome = _transactions
                .where((t) => t.isIncome)
                .fold(0.0, (sum, t) => sum + t.amount);
            _totalExpense = _transactions
                .where((t) => !t.isIncome)
                .fold(0.0, (sum, t) => sum + t.amount);
            _grossMargin = _totalIncome - _totalExpense;
          }
        } catch (_) {}
      }

      // 5. Charger les consommations et tournées d'alimentation rattachées
      if (farmId != null) {
        try {
          final feedRes = await dio.get("${ApiEndpoints.farmInventoryMovements(farmId)}?flockId=${_flock.id}");
          if (feedRes.data != null && feedRes.data['data'] is List) {
            _feedings = (feedRes.data['data'] as List)
                .map((m) => StockMovement.fromJson(m as Map<String, dynamic>))
                .toList();

            _totalFeedKg = _feedings.where((m) => m.isFeeding).fold<double>(0.0, (sum, m) {
              if (m.unit == 'KG') return sum + m.quantity;
              if (m.unit == 'G') return sum + (m.quantity / 1000.0);
              if (m.unit == 'BAG_50KG' || m.unit == 'BAG') return sum + (m.quantity * 50.0);
              if (m.unit == 'BAG_25KG') return sum + (m.quantity * 25.0);
              if (m.unit == 'TON') return sum + (m.quantity * 1000.0);
              return sum + m.quantity;
            });
          }
        } catch (_) {}
      }

      // Mettre à jour l'objet Flock si présent dans le provider
      final flocks = ref.read(flockProvider).flocks;
      final updated = flocks.where((f) => f.id == _flock.id).firstOrNull;
      if (updated != null) {
        _flock = updated;
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _openEditModal() {
    final nameController = TextEditingController(text: _flock.name);
    final strainController = TextEditingController(text: _flock.breed);
    final notesController = TextEditingController(text: _flock.notes ?? "");
    String? selectedBuildingId = _flock.buildingId;
    String selectedStatus = _flock.status;

    // S'assurer que les bâtiments sont disponibles
    ref.read(buildingsProvider.notifier).loadBuildings(showLoading: false);

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) {
          final isDark = Theme.of(ctx).brightness == Brightness.dark;
          final surfaceColor = isDark ? AppColors.surfaceDark : AppColors.surfaceLight;
          final borderColor = isDark ? AppColors.borderDark : AppColors.borderLight;
          final buildings = ref.watch(buildingsProvider).buildings;
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
                        "Modifier le lot / Poulailler",
                        style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close_rounded),
                        onPressed: () => Navigator.pop(ctx),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Nom du lot
                  TextFormField(
                    controller: nameController,
                    decoration: const InputDecoration(
                      labelText: "Nom de la bande",
                      prefixIcon: Icon(Icons.tag_rounded),
                    ),
                  ),
                  const SizedBox(height: 14),

                  // Souche / Race
                  TextFormField(
                    controller: strainController,
                    decoration: const InputDecoration(
                      labelText: "Souche / Race",
                      prefixIcon: Icon(Icons.pets_rounded),
                    ),
                  ),
                  const SizedBox(height: 14),

                  // Sélecteur de Bâtiment / Poulailler
                  DropdownButtonFormField<String?>(
                    initialValue: selectedBuildingId,
                    decoration: const InputDecoration(
                      labelText: "Poulailler d'accueil assigné",
                      prefixIcon: Icon(Icons.home_work_rounded),
                    ),
                    items: [
                      const DropdownMenuItem<String?>(
                        value: null,
                        child: Text("Aucun poulailler (Non assigné)"),
                      ),
                      ...buildings.map((b) => DropdownMenuItem<String?>(
                            value: b.id,
                            child: Text("${b.name} (${b.type.label})"),
                          )),
                    ],
                    onChanged: (val) {
                      setModalState(() => selectedBuildingId = val);
                    },
                  ),
                  const SizedBox(height: 14),

                  // Statut
                  DropdownButtonFormField<String>(
                    initialValue: selectedStatus,
                    decoration: const InputDecoration(
                      labelText: "Statut du lot",
                      prefixIcon: Icon(Icons.info_outline_rounded),
                    ),
                    items: const [
                      DropdownMenuItem(value: "ACTIVE", child: Text("En élevage (Actif)")),
                      DropdownMenuItem(value: "COMPLETED", child: Text("Terminé / Clôturé")),
                      DropdownMenuItem(value: "SOLD", child: Text("Intégralement vendu")),
                    ],
                    onChanged: (val) {
                      if (val != null) {
                        setModalState(() => selectedStatus = val);
                      }
                    },
                  ),
                  const SizedBox(height: 14),

                  // Notes
                  TextFormField(
                    controller: notesController,
                    maxLines: 2,
                    decoration: const InputDecoration(
                      labelText: "Notes & Remarques",
                      prefixIcon: Icon(Icons.notes_rounded),
                    ),
                  ),
                  const SizedBox(height: 20),

                  // Boutons d'action
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: () => Navigator.pop(ctx),
                          child: const Text("Annuler"),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: ElevatedButton(
                          onPressed: flockState.isSubmitting
                              ? null
                              : () async {
                                  final name = nameController.text.trim();
                                  if (name.isEmpty) return;

                                  final success = await ref
                                      .read(flockProvider.notifier)
                                      .updateFlock(
                                        flockId: _flock.id,
                                        name: name,
                                        strain: strainController.text.trim(),
                                        buildingId: selectedBuildingId,
                                        status: selectedStatus,
                                        notes: notesController.text.trim(),
                                      );

                                  if (!ctx.mounted) return;
                                  if (success) {
                                    Navigator.pop(ctx);
                                    if (!mounted) return;
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      const SnackBar(
                                        content: Text("Bande mise à jour avec succès !"),
                                        backgroundColor: AppColors.success,
                                      ),
                                    );
                                    await _loadAllData();
                                  } else {
                                    final err = ref.read(flockProvider).error ??
                                        "Erreur lors de la mise à jour";
                                    if (!mounted) return;
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      SnackBar(
                                        content: Text(err),
                                        backgroundColor: AppColors.danger,
                                      ),
                                    );
                                  }
                                },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.primary,
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 14),
                          ),
                          child: flockState.isSubmitting
                              ? const BrandLoader.button()
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
    final surfaceColor = isDark ? AppColors.surfaceDark : AppColors.surfaceLight;
    final borderColor = isDark ? AppColors.borderDark : AppColors.borderLight;
    final mortalityRate = _flock.calculatedMortalityRate;
    final authState = ref.watch(authProvider);
    final farm = authState.activeFarm;
    final canViewFinance = farm == null || farm.canViewFinance;
    final canCreateFinance = farm == null || farm.canCreateFinance;

    return Scaffold(
      appBar: AppBar(
        title: Text(_flock.name),
        actions: [
          IconButton(
            icon: const Icon(Icons.assessment_rounded),
            tooltip: "Bilan technico-économique",
            onPressed: () => FlockSummaryModal.show(
              context,
              flock: _flock,
              farm: farm,
              totalFeedKg: _totalFeedKg,
              totalEggs: _totalGoodEggs,
              totalTrays: _totalTrays,
              avgLayingRate: _avgLayingRate,
              totalIncome: _totalIncome,
              totalExpense: _totalExpense,
              grossMargin: _grossMargin,
            ),
          ),
          if (_flock.isActive && (farm?.canRecordFlockMovement == true || farm?.isOwner == true))
            IconButton(
              icon: const Icon(Icons.archive_outlined),
              tooltip: "Clôturer le lot",
              onPressed: () => CloseFlockModal.show(
                context,
                flock: _flock,
                onClosed: () {
                  ref.read(flockProvider.notifier).loadFlocks(showLoading: false);
                  _loadAllData(showLoading: false);
                },
              ),
            ),
          IconButton(
            icon: const Icon(Icons.edit_rounded),
            tooltip: "Modifier / Poulailler",
            onPressed: _openEditModal,
          ),
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            tooltip: "Actualiser",
            onPressed: () => _loadAllData(),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () => _loadAllData(showLoading: false),
        child: _isLoading
            ? const Center(child: BrandLoader(message: "Chargement du lot..."))
            : NestedScrollView(
                headerSliverBuilder: (context, innerBoxIsScrolled) => [
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Carte d'identité principale de la bande
                          Container(
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
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            _flock.name,
                                            style: const TextStyle(
                                              fontSize: 20,
                                              fontWeight: FontWeight.w900,
                                            ),
                                          ),
                                          const SizedBox(height: 2),
                                          Text(
                                            "Souche : ${_flock.breed}${_flock.code != null ? ' • Code : ${_flock.code}' : ''}",
                                            style: const TextStyle(
                                              fontSize: 12,
                                              color: AppColors.textMutedLight,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                      decoration: BoxDecoration(
                                        color: _flock.isActive
                                            ? AppColors.success.withValues(alpha: 0.12)
                                            : Colors.grey.withValues(alpha: 0.15),
                                        borderRadius: BorderRadius.circular(8),
                                      ),
                                      child: Text(
                                        _flock.isActive ? "En élevage" : "Clôturée",
                                        style: TextStyle(
                                          fontSize: 11,
                                          fontWeight: FontWeight.bold,
                                          color: _flock.isActive ? AppColors.success : AppColors.textMutedLight,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 14),

                                // Ligne d'infos : Bâtiment, Âge, Date
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                  decoration: BoxDecoration(
                                    color: isDark ? Colors.grey.shade900 : Colors.grey.shade100,
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                  child: Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Row(
                                        children: [
                                          const Icon(Icons.home_work_outlined, size: 15, color: AppColors.primary),
                                          const SizedBox(width: 6),
                                          Text(
                                            _flock.buildingName ?? "Sans bâtiment",
                                            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
                                          ),
                                        ],
                                      ),
                                      if (_flock.ageInWeeks != null)
                                        Row(
                                          children: [
                                            const Icon(Icons.calendar_today_outlined, size: 14, color: AppColors.accent),
                                            const SizedBox(width: 6),
                                            Text(
                                              "${_flock.ageInWeeks} sem. (${_flock.ageInDays} j.)",
                                              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
                                            ),
                                          ],
                                        ),
                                      Text(
                                        _flock.startDate,
                                        style: const TextStyle(fontSize: 11, color: AppColors.textMutedLight),
                                      ),
                                    ],
                                  ),
                                ),
                                const SizedBox(height: 16),

                                // Grille des 4 Métriques clés
                                Row(
                                  children: [
                                    Expanded(
                                      child: _MetricTile(
                                        label: "Effectif vivant",
                                        value: "${_flock.currentQuantity}",
                                        sub: "sur ${_flock.initialQuantity} départs",
                                        color: AppColors.primary,
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    Expanded(
                                      child: _MetricTile(
                                        label: "Mortalité",
                                        value: "${mortalityRate.toStringAsFixed(1)}%",
                                        sub: "${_flock.deathsCount} perte(s)",
                                        color: mortalityRate > 5 ? AppColors.danger : AppColors.success,
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 8),
                                Row(
                                  children: [
                                    if (_flock.isLayer)
                                      Expanded(
                                        child: _MetricTile(
                                          label: "Ponte cumulée",
                                          value: "$_totalTrays plx",
                                          sub: "$_totalGoodEggs œufs (Taux: ${_avgLayingRate.toStringAsFixed(1)}%)",
                                          color: AppColors.accent,
                                        ),
                                      )
                                    else
                                      Expanded(
                                        child: _MetricTile(
                                          label: "Type production",
                                          value: _flock.typeLabel,
                                          sub: "Cycle court chair",
                                          color: AppColors.accent,
                                        ),
                                      ),
                                    const SizedBox(width: 8),
                                    Expanded(
                                      child: canViewFinance
                                          ? _MetricTile(
                                              label: "Marge brute lot",
                                              value: CurrencyFormatter.formatFcfa(_grossMargin),
                                              sub: "Recettes - Dépenses",
                                              color: _grossMargin >= 0 ? AppColors.success : AppColors.danger,
                                            )
                                          : _MetricTile(
                                              label: "Aliment distribué",
                                              value: "${_totalFeedKg.toStringAsFixed(1)} kg",
                                              sub: "${_feedings.length} ration(s) servie(s)",
                                              color: AppColors.primary,
                                            ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 14),

                          // Raccourcis d'actions rapides
                          Row(
                            children: [
                              Expanded(
                                child: ElevatedButton.icon(
                                  onPressed: () => RecordFeedingModal.show(
                                    context,
                                    defaultFlockId: _flock.id,
                                    onSaved: () => _loadAllData(showLoading: false),
                                  ),
                                  icon: const Icon(Icons.restaurant_rounded, size: 15),
                                  label: const Text("Nourrir", style: TextStyle(fontSize: 12)),
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: AppColors.primary,
                                    foregroundColor: Colors.white,
                                    padding: const EdgeInsets.symmetric(vertical: 10),
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                  ),
                                ),
                              ),
                              if (_flock.isLayer) ...[
                                const SizedBox(width: 8),
                                Expanded(
                                  child: ElevatedButton.icon(
                                    onPressed: () => RecordEggModal.show(
                                      context,
                                      defaultFlockId: _flock.id,
                                      onSaved: () => _loadAllData(showLoading: false),
                                    ),
                                    icon: const Icon(Icons.egg_rounded, size: 15),
                                    label: const Text("Collecte", style: TextStyle(fontSize: 12)),
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: AppColors.accent,
                                      foregroundColor: Colors.white,
                                      padding: const EdgeInsets.symmetric(vertical: 10),
                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                    ),
                                  ),
                                ),
                              ],
                              if (canCreateFinance) ...[
                                const SizedBox(width: 8),
                                Expanded(
                                  child: ElevatedButton.icon(
                                    onPressed: () => RecordPoultrySaleModal.show(
                                      context,
                                      defaultFlockId: _flock.id,
                                      onSaved: () {
                                        ref.read(flockProvider.notifier).loadFlocks(showLoading: false);
                                        _loadAllData(showLoading: false);
                                      },
                                    ),
                                    icon: const Icon(Icons.shopping_bag_outlined, size: 15, color: Colors.white),
                                    label: const Text("Vendre", style: TextStyle(fontSize: 12, color: Colors.white)),
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: AppColors.success,
                                      padding: const EdgeInsets.symmetric(vertical: 10),
                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                    ),
                                  ),
                                ),
                              ],
                              const SizedBox(width: 8),
                              Expanded(
                                child: OutlinedButton.icon(
                                  onPressed: () => RecordMovementModal.show(
                                    context,
                                    defaultFlockId: _flock.id,
                                    onSaved: () {
                                      ref.read(flockProvider.notifier).loadFlocks(showLoading: false);
                                      _loadAllData(showLoading: false);
                                    },
                                  ),
                                  icon: const Icon(Icons.heart_broken_rounded, size: 15),
                                  label: const Text("Mortalité", style: TextStyle(fontSize: 12)),
                                  style: OutlinedButton.styleFrom(
                                    foregroundColor: AppColors.danger,
                                    side: const BorderSide(color: AppColors.danger),
                                    padding: const EdgeInsets.symmetric(vertical: 10),
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 14),
                        ],
                      ),
                    ),
                  ),

                  // Barre d'onglets
                  SliverPersistentHeader(
                    pinned: true,
                    delegate: _SliverAppBarDelegate(
                      TabBar(
                        controller: _tabController,
                        isScrollable: true,
                        tabAlignment: TabAlignment.start,
                        indicatorColor: AppColors.primary,
                        labelColor: AppColors.primary,
                        unselectedLabelColor: AppColors.textMutedLight,
                        indicatorWeight: 3,
                        tabs: [
                          const Tab(text: "Pertes & Mouvements"),
                          Tab(text: "Alimentation (${_feedings.length})"),
                          if (_flock.isLayer) const Tab(text: "Pontes"),
                          Tab(text: "Santé (${_treatments.length})"),
                          if (canViewFinance) const Tab(text: "Finances"),
                        ],
                      ),
                      surfaceColor,
                      borderColor,
                    ),
                  ),
                ],
                body: TabBarView(
                  controller: _tabController,
                  children: [
                    // Onglet 1 : Pertes & Mouvements
                    _buildMovementsTab(isDark, borderColor),

                    // Onglet 2 : Alimentation & Consommations
                    _buildFeedingTab(isDark, borderColor),

                    // Onglet 3 : Pontes (si pondeuses)
                    if (_flock.isLayer) _buildEggsTab(isDark, borderColor),

                    // Onglet 4 : Santé & Soins
                    _buildHealthTab(isDark, borderColor),

                    // Onglet 5 : Finances du lot
                    if (canViewFinance) _buildFinanceTab(isDark, borderColor),
                  ],
                ),
              ),
      ),
    );
  }

  // --- TAB 1 : MOUVEMENTS & PERTES ---
  Widget _buildMovementsTab(bool isDark, Color borderColor) {
    if (_movements.isEmpty) {
      return _buildEmptyState(
        icon: Icons.history_rounded,
        title: "Aucun mouvement enregistré",
        message: "Les déclarations de mortalité, réformes ou ventes de sujets s'afficheront ici.",
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: _movements.length,
      separatorBuilder: (_, __) => const SizedBox(height: 8),
      itemBuilder: (context, index) {
        final m = _movements[index];
        return Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: borderColor),
          ),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: m.color.withValues(alpha: 0.12),
                  shape: BoxShape.circle,
                ),
                child: Icon(m.icon, color: m.color, size: 20),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          m.typeLabel,
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                        ),
                        Text(
                          "${m.isMortality || m.isCulling ? '-' : '+'}${m.quantity} sujets",
                          style: TextStyle(
                            fontWeight: FontWeight.w900,
                            fontFamily: 'monospace',
                            color: m.color,
                            fontSize: 13,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          m.reason ?? "Aucun motif précisé",
                          style: const TextStyle(fontSize: 11, color: AppColors.textMutedLight),
                        ),
                        Text(
                          m.movementDate,
                          style: const TextStyle(fontSize: 10, color: AppColors.textMutedLight),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  // --- TAB : ALIMENTATION & CONSOMMATIONS ---
  Widget _buildFeedingTab(bool isDark, Color borderColor) {
    if (_feedings.isEmpty) {
      return _buildEmptyState(
        icon: Icons.restaurant_rounded,
        title: "Aucune tournée d'alimentation",
        message: "Les distributions de provende et les traitements d'eau administrés à ce lot s'afficheront ici.",
      );
    }

    final surfaceColor = isDark ? AppColors.surfaceDark : AppColors.surfaceLight;
    final totalTours = _feedings.length;
    final avgPerSubject = _flock.currentQuantity > 0
        ? (_totalFeedKg / _flock.currentQuantity)
        : 0.0;

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Carte résumé de nutrition
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: surfaceColor,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: borderColor),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Row(
                children: [
                  Icon(Icons.analytics_outlined, color: AppColors.accent, size: 16),
                  SizedBox(width: 6),
                  Text(
                    "Bilan de nutrition du lot",
                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.accent),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: _MetricTile(
                      label: "Total provende",
                      value: "${_totalFeedKg.toStringAsFixed(1)} kg",
                      sub: "$totalTours distribution${totalTours > 1 ? 's' : ''}",
                      color: AppColors.primary,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: _MetricTile(
                      label: "Conso / sujet",
                      value: "${avgPerSubject.toStringAsFixed(2)} kg",
                      sub: "Moyenne cumulée",
                      color: AppColors.accent,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 14),

        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              "Historique des rations ($totalTours)",
              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
            ),
            TextButton.icon(
              onPressed: () => RecordFeedingModal.show(
                context,
                defaultFlockId: _flock.id,
                onSaved: () => _loadAllData(showLoading: false),
              ),
              icon: const Icon(Icons.add_rounded, size: 16),
              label: const Text("Nourrir", style: TextStyle(fontSize: 12)),
            ),
          ],
        ),
        const SizedBox(height: 8),

        ..._feedings.map((m) {
          final isFeed = m.itemCategory == 'FEED' || m.itemName.toLowerCase().contains("provende");
          final badgeColor = isFeed ? AppColors.accent : AppColors.kpiRateBadge;
          final icon = isFeed ? Icons.scale_rounded : Icons.water_drop_rounded;

          return Container(
            margin: const EdgeInsets.only(bottom: 8),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: surfaceColor,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: borderColor),
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: badgeColor.withValues(alpha: 0.12),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(icon, color: badgeColor, size: 18),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Text(
                              m.itemName,
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          Text(
                            "-${m.quantity % 1 == 0 ? m.quantity.toInt() : m.quantity} ${m.unitShortLabel}",
                            style: TextStyle(
                              fontWeight: FontWeight.w900,
                              fontFamily: 'monospace',
                              color: badgeColor,
                              fontSize: 13,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Text(
                              m.reason ?? (isFeed ? "Distribution d'aliment" : "Abreuvement"),
                              style: const TextStyle(fontSize: 11, color: AppColors.textMutedLight),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            m.movementDate,
                            style: const TextStyle(fontSize: 10, color: AppColors.textMutedLight),
                          ),
                        ],
                      ),
                      if (m.recordedByName != null && m.recordedByName!.isNotEmpty) ...[
                        const SizedBox(height: 2),
                        Text(
                          "Par : ${m.recordedByName}",
                          style: TextStyle(
                            fontSize: 10,
                            fontStyle: FontStyle.italic,
                            color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            ),
          );
        }),
      ],
    );
  }

  // --- TAB 2 : PONTES D'ŒUFS ---
  Widget _buildEggsTab(bool isDark, Color borderColor) {
    if (_eggs.isEmpty) {
      return _buildEmptyState(
        icon: Icons.egg_outlined,
        title: "Aucune collecte d'œufs",
        message: "Enregistrez votre premier ramassage d'œufs pour ce lot avec le bouton Collecte.",
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: _eggs.length,
      separatorBuilder: (_, __) => const SizedBox(height: 8),
      itemBuilder: (context, index) {
        final e = _eggs[index];
        final defective = e.crackedEggs + e.dirtyEggs + e.deformedEggs;

        return Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: borderColor),
          ),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: AppColors.accent.withValues(alpha: 0.12),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.egg_rounded, color: AppColors.accent, size: 20),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          "${e.traysCount} plateaux ${e.looseEggsCount > 0 ? '+ ${e.looseEggsCount} œufs' : ''}",
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                        ),
                        Text(
                          "${e.layingRate?.toStringAsFixed(1) ?? '0.0'}% ponte",
                          style: const TextStyle(
                            fontWeight: FontWeight.w900,
                            fontFamily: 'monospace',
                            color: AppColors.primary,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          "${e.sessionLabel} • ${e.goodEggs} vendables • $defective déclassés",
                          style: const TextStyle(fontSize: 11, color: AppColors.textMutedLight),
                        ),
                        Text(
                          e.date,
                          style: const TextStyle(fontSize: 10, color: AppColors.textMutedLight),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  // --- TAB 3 : SANTÉ & SOINS ---
  Widget _buildHealthTab(bool isDark, Color borderColor) {
    if (_treatments.isEmpty) {
      return _buildEmptyState(
        icon: Icons.medical_services_outlined,
        title: "Aucun traitement prophylactique",
        message: "Les vaccins, vermifuges et soins vétérinaires attribués à cette bande apparaîtront ici.",
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: _treatments.length,
      separatorBuilder: (_, __) => const SizedBox(height: 8),
      itemBuilder: (context, index) {
        final t = _treatments[index];
        final isCompleted = t.isCompleted;

        return Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: borderColor),
          ),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: isCompleted
                      ? AppColors.success.withValues(alpha: 0.12)
                      : AppColors.warning.withValues(alpha: 0.12),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  isCompleted ? Icons.check_circle_rounded : Icons.pending_rounded,
                  color: isCompleted ? AppColors.success : AppColors.warning,
                  size: 20,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          t.title,
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: isCompleted
                                ? AppColors.success.withValues(alpha: 0.12)
                                : AppColors.warning.withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            t.statusLabel,
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                              color: isCompleted ? AppColors.success : AppColors.warning,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          "${t.typeLabel} • ${t.administrationMethodLabel}",
                          style: const TextStyle(fontSize: 11, color: AppColors.textMutedLight),
                        ),
                        Text(
                          t.scheduledDate,
                          style: const TextStyle(fontSize: 10, color: AppColors.textMutedLight),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  // --- TAB 4 : FINANCES DU LOT ---
  Widget _buildFinanceTab(bool isDark, Color borderColor) {
    if (_transactions.isEmpty) {
      return _buildEmptyState(
        icon: Icons.account_balance_wallet_outlined,
        title: "Aucune transaction pour ce lot",
        message: "Enregistrez des ventes ou des achats imputés à cette bande pour calculer sa rentabilité exacte.",
        action: ElevatedButton.icon(
          onPressed: () => RecordTransactionModal.show(
            context,
            initialType: "INCOME",
            initialCategory: _flock.isLayer ? "EGG_SALE" : "MEAT_POULTRY_SALE",
          ),
          icon: const Icon(Icons.add_rounded, size: 16),
          label: const Text("Enregistrer une recette"),
          style: ElevatedButton.styleFrom(backgroundColor: AppColors.success),
        ),
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: _transactions.length,
      separatorBuilder: (_, __) => const SizedBox(height: 8),
      itemBuilder: (context, index) {
        final tx = _transactions[index];

        return Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: borderColor),
          ),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: tx.isIncome
                      ? AppColors.success.withValues(alpha: 0.12)
                      : AppColors.danger.withValues(alpha: 0.12),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  tx.isIncome ? Icons.add_rounded : Icons.remove_rounded,
                  color: tx.isIncome ? AppColors.success : AppColors.danger,
                  size: 20,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          tx.note ?? tx.categoryLabel,
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                        ),
                        Text(
                          "${tx.isIncome ? '+' : '-'}${CurrencyFormatter.formatFcfa(tx.amount)}",
                          style: TextStyle(
                            fontWeight: FontWeight.w900,
                            fontFamily: 'monospace',
                            color: tx.isIncome ? AppColors.success : AppColors.danger,
                            fontSize: 13,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          "${tx.categoryLabel} • ${tx.paymentMethodLabel}",
                          style: const TextStyle(fontSize: 11, color: AppColors.textMutedLight),
                        ),
                        Text(
                          tx.date,
                          style: const TextStyle(fontSize: 10, color: AppColors.textMutedLight),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildEmptyState({
    required IconData icon,
    required String title,
    required String message,
    Widget? action,
  }) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 48, color: AppColors.textMutedLight.withValues(alpha: 0.5)),
            const SizedBox(height: 12),
            Text(
              title,
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
            ),
            const SizedBox(height: 6),
            Text(
              message,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 12, color: AppColors.textMutedLight),
            ),
            if (action != null) ...[
              const SizedBox(height: 16),
              action,
            ],
          ],
        ),
      ),
    );
  }
}

class _MetricTile extends StatelessWidget {
  final String label;
  final String value;
  final String sub;
  final Color color;

  const _MetricTile({
    required this.label,
    required this.value,
    required this.sub,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: isDark ? Colors.grey.shade900 : Colors.grey.shade100,
        borderRadius: BorderRadius.circular(10),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: const TextStyle(fontSize: 10, color: AppColors.textMutedLight, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 3),
          Text(
            value,
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w900,
              fontFamily: 'monospace',
              color: color,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            sub,
            style: const TextStyle(fontSize: 9, color: AppColors.textMutedLight),
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }
}

class _SliverAppBarDelegate extends SliverPersistentHeaderDelegate {
  final TabBar _tabBar;
  final Color _bgColor;
  final Color _borderColor;

  _SliverAppBarDelegate(this._tabBar, this._bgColor, this._borderColor);

  @override
  double get minExtent => _tabBar.preferredSize.height + 1;
  @override
  double get maxExtent => _tabBar.preferredSize.height + 1;

  @override
  Widget build(BuildContext context, double shrinkOffset, bool overlapsContent) {
    return Container(
      decoration: BoxDecoration(
        color: _bgColor,
        border: Border(bottom: BorderSide(color: _borderColor)),
      ),
      child: _tabBar,
    );
  }

  @override
  bool shouldRebuild(_SliverAppBarDelegate oldDelegate) => false;
}
