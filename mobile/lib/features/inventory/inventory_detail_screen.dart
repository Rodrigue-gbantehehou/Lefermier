import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api/api_client.dart';
import '../../core/api/api_endpoints.dart';
import '../../core/models/inventory_item.dart';
import '../../core/models/stock_movement.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/currency_formatter.dart';
import '../../core/widgets/brand_loader.dart';
import 'inventory_provider.dart';

class InventoryDetailScreen extends ConsumerStatefulWidget {
  final InventoryItem item;
  final Function(List<InventoryItem> items, {String? preselectedItemId})? onOpenProcurement;

  const InventoryDetailScreen({
    super.key,
    required this.item,
    this.onOpenProcurement,
  });

  @override
  ConsumerState<InventoryDetailScreen> createState() => _InventoryDetailScreenState();
}

class _InventoryDetailScreenState extends ConsumerState<InventoryDetailScreen> {
  late InventoryItem _item;
  bool _isLoading = true;
  List<StockMovement> _movements = [];

  double _totalIn = 0;
  double _totalOut = 0;
  String? _movementTypeFilter; // null = all, 'INCOMING', 'FEEDING', 'LOSS'

  List<StockMovement> get _filteredMovements {
    if (_movementTypeFilter == null) return _movements;
    if (_movementTypeFilter == 'INCOMING') {
      return _movements.where((m) => m.isIncoming).toList();
    }
    if (_movementTypeFilter == 'FEEDING') {
      return _movements.where((m) => m.isFeeding).toList();
    }
    return _movements.where((m) => m.type == _movementTypeFilter).toList();
  }

  @override
  void initState() {
    super.initState();
    _item = widget.item;
    _loadMovements();
  }

  Future<void> _loadMovements({bool showLoading = true}) async {
    if (showLoading) setState(() => _isLoading = true);

    try {
      final dio = ApiClient().dio;
      final res = await dio.get(ApiEndpoints.inventoryMovements(_item.id));
      if (res.data != null && res.data['data'] is List) {
        final list = (res.data['data'] as List)
            .map((m) => StockMovement.fromJson(m as Map<String, dynamic>))
            .toList();

        // Trier par date décroissante
        list.sort((a, b) => b.movementDate.compareTo(a.movementDate));
        _movements = list;

        _totalIn = _movements
            .where((m) => m.isIncoming)
            .fold(0.0, (sum, m) => sum + m.quantity);
        _totalOut = _movements
            .where((m) => m.isFeeding || m.isLoss)
            .fold(0.0, (sum, m) => sum + m.quantity);
      }

      // Synchroniser avec inventoryProvider si l'article y existe
      final currentItems = ref.read(inventoryProvider).items;
      final found = currentItems.where((i) => i.id == _item.id).firstOrNull;
      if (found != null) {
        _item = found;
      }
    } catch (_) {
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final surfaceColor = isDark ? AppColors.surfaceDark : AppColors.surfaceLight;
    final borderColor = isDark ? AppColors.borderDark : AppColors.borderLight;

    final isBag = _item.unit == "BAG" || _item.unit == "BAG_50KG" || _item.unit == "BAG_25KG";
    final bagWeight = _item.packageWeightKg ?? 50.0;
    final totalKg = isBag ? (_item.currentStock * bagWeight) : null;
    final totalStockValue = ((_item.currentStock) * (_item.unitPrice ?? 0)).toInt();

    return Scaffold(
      appBar: AppBar(
        title: Text(_item.name),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            tooltip: "Actualiser",
            onPressed: () => _loadMovements(),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () => _loadMovements(showLoading: false),
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 90),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Fiche principale du produit
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
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                _item.name,
                                style: const TextStyle(
                                  fontSize: 20,
                                  fontWeight: FontWeight.w900,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                "Catégorie : ${_item.categoryLabel}",
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
                            color: _item.isLowStock
                                ? AppColors.danger.withValues(alpha: 0.12)
                                : AppColors.success.withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(
                              color: _item.isLowStock
                                  ? AppColors.danger.withValues(alpha: 0.3)
                                  : AppColors.success.withValues(alpha: 0.3),
                            ),
                          ),
                          child: Text(
                            _item.isLowStock ? "Seuil critique" : "En stock",
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              color: _item.isLowStock ? AppColors.danger : AppColors.success,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),

                    // Grille des 4 indicateurs clés
                    Row(
                      children: [
                        Expanded(
                          child: _ProductKpiCard(
                            label: "QUANTITÉ EN RÉSERVE",
                            value: "${_item.currentStock.toStringAsFixed(_item.currentStock % 1 == 0 ? 0 : 1)} ${_item.unitShortLabel}",
                            sub: totalKg != null ? "= ${totalKg.toStringAsFixed(0)} kg réels" : "Stock disponible",
                            color: _item.isLowStock ? AppColors.danger : AppColors.primary,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: _ProductKpiCard(
                            label: "VALEUR DU STOCK",
                            value: CurrencyFormatter.formatFcfa(totalStockValue),
                            sub: "À ${_item.unitPrice != null ? CurrencyFormatter.formatFcfa(_item.unitPrice!) : '0 FCFA'} / ${_item.unitShortLabel}",
                            color: AppColors.success,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Expanded(
                          child: _ProductKpiCard(
                            label: "SEUIL D'ALERTE",
                            value: "${_item.alertThreshold != null ? _item.alertThreshold!.toStringAsFixed(0) : '0'} ${_item.unitShortLabel}",
                            sub: "Alerte de réapprovisionnement",
                            color: AppColors.warning,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: _ProductKpiCard(
                            label: "CONSOMMATION TOTALE",
                            value: "-${_totalOut.toStringAsFixed(0)} ${_item.unitShortLabel}",
                            sub: "+${_totalIn.toStringAsFixed(0)} approvisionnés",
                            color: AppColors.accent,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // Titre Historique des Mouvements
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    "Historique des utilisations & entrées",
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                  Text(
                    "${_filteredMovements.length}/${_movements.length} saisie(s)",
                    style: const TextStyle(fontSize: 12, color: AppColors.textMutedLight),
                  ),
                ],
              ),
              const SizedBox(height: 10),

              // Filtres par type de flux (Tous, Approvisionnements (+), Consommations (-), Pertes)
              if (_movements.isNotEmpty) ...[
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      _buildFilterChip(null, "Tous (${_movements.length})", isDark),
                      const SizedBox(width: 6),
                      _buildFilterChip(
                        "INCOMING",
                        "Approvisionnements (+) (${_movements.where((m) => m.isIncoming).length})",
                        isDark,
                        activeColor: AppColors.success,
                      ),
                      const SizedBox(width: 6),
                      _buildFilterChip(
                        "FEEDING",
                        "Consommations (-) (${_movements.where((m) => m.isFeeding).length})",
                        isDark,
                        activeColor: AppColors.accent,
                      ),
                      const SizedBox(width: 6),
                      _buildFilterChip(
                        "LOSS",
                        "Pertes (${_movements.where((m) => m.isLoss).length})",
                        isDark,
                        activeColor: AppColors.danger,
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
              ],

              // Liste des mouvements de ce produit
              if (_isLoading)
                const Center(
                  child: Padding(
                    padding: EdgeInsets.all(32),
                    child: BrandLoader(message: "Chargement de l'historique..."),
                  ),
                )
              else if (_filteredMovements.isEmpty)
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(32),
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: surfaceColor,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: borderColor),
                  ),
                  child: Column(
                    children: [
                      Icon(Icons.inventory_2_outlined, size: 48, color: AppColors.textMutedLight.withValues(alpha: 0.5)),
                      const SizedBox(height: 12),
                      Text(
                        _movements.isEmpty ? "Aucun mouvement pour ce produit" : "Aucun mouvement dans ce filtre",
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        _movements.isEmpty
                            ? "Les approvisionnements et les consommations par les bandes apparaîtront ici."
                            : "Changez de filtre pour afficher les autres mouvements.",
                        textAlign: TextAlign.center,
                        style: const TextStyle(fontSize: 12, color: AppColors.textMutedLight),
                      ),
                    ],
                  ),
                )
              else
                ListView.separated(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: _filteredMovements.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 8),
                  itemBuilder: (context, index) {
                    final m = _filteredMovements[index];
                    final isIncoming = m.isIncoming;
                    final isFeeding = m.isFeeding;

                    final color = isIncoming
                        ? AppColors.success
                        : (isFeeding ? AppColors.accent : AppColors.danger);

                    return Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: surfaceColor,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: borderColor),
                      ),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: color.withValues(alpha: 0.12),
                              shape: BoxShape.circle,
                            ),
                            child: Icon(
                              isIncoming
                                  ? Icons.add_shopping_cart_rounded
                                  : (isFeeding ? Icons.restaurant_rounded : Icons.remove_circle_outline),
                              color: color,
                              size: 18,
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
                                      m.typeLabel,
                                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                                    ),
                                    Text(
                                      "${isIncoming ? '+' : '-'}${m.quantity.toStringAsFixed(m.quantity % 1 == 0 ? 0 : 1)} ${m.unitShortLabel}",
                                      style: TextStyle(
                                        fontWeight: FontWeight.w900,
                                        fontFamily: 'monospace',
                                        color: color,
                                        fontSize: 13,
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 6),
                                Wrap(
                                  spacing: 6,
                                  runSpacing: 4,
                                  crossAxisAlignment: WrapCrossAlignment.center,
                                  children: [
                                    Text(
                                      m.movementDate,
                                      style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.textMutedLight),
                                    ),
                                    if (m.flockName != null && m.flockName!.isNotEmpty)
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
                                        decoration: BoxDecoration(
                                          color: AppColors.primarySoft,
                                          borderRadius: BorderRadius.circular(4),
                                        ),
                                        child: Text(
                                          "Lot : ${m.flockName}",
                                          style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.primary),
                                        ),
                                      ),
                                    if (m.totalCost != null && m.totalCost! > 0)
                                      Text(
                                        "• ${CurrencyFormatter.formatFcfa(m.totalCost!)} FCFA",
                                        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.primary),
                                      ),
                                  ],
                                ),
                                if (m.reason != null && m.reason!.trim().isNotEmpty) ...[
                                  const SizedBox(height: 4),
                                  Text(
                                    m.reason!,
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

  Widget _buildFilterChip(String? type, String label, bool isDark, {Color activeColor = AppColors.primary}) {
    final isSelected = _movementTypeFilter == type;
    return InkWell(
      onTap: () => setState(() => _movementTypeFilter = type),
      borderRadius: BorderRadius.circular(20),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
        decoration: BoxDecoration(
          color: isSelected ? activeColor : (isDark ? AppColors.surfaceDark : AppColors.surfaceLight),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected ? activeColor : (isDark ? AppColors.borderDark : AppColors.borderLight),
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 11,
            fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
            color: isSelected ? Colors.white : (isDark ? AppColors.textMutedDark : AppColors.textMutedLight),
          ),
        ),
      ),
    );
  }
}

class _ProductKpiCard extends StatelessWidget {
  final String label;
  final String value;
  final String sub;
  final Color color;

  const _ProductKpiCard({
    required this.label,
    required this.value,
    required this.sub,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: isDark ? Colors.grey.shade900 : Colors.grey.shade100,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: const TextStyle(
              fontSize: 9.5,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.5,
              color: AppColors.textMutedLight,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w900,
              fontFamily: 'monospace',
              color: color,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            sub,
            style: const TextStyle(fontSize: 9.5, color: AppColors.textMutedLight),
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }
}
