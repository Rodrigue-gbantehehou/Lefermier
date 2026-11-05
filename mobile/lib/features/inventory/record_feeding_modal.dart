import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../core/models/health_treatment.dart';
import '../../core/models/inventory_item.dart';
import '../../core/theme/app_theme.dart';
import '../dashboard/dashboard_provider.dart';
import '../flocks/flock_provider.dart';
import '../health/health_provider.dart';
import 'inventory_provider.dart';

class RecordFeedingModal extends ConsumerStatefulWidget {
  final String? defaultFlockId;
  final VoidCallback? onSaved;

  const RecordFeedingModal({
    super.key,
    this.defaultFlockId,
    this.onSaved,
  });

  static Future<bool?> show(
    BuildContext context, {
    String? defaultFlockId,
    VoidCallback? onSaved,
  }) {
    return showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => RecordFeedingModal(
        defaultFlockId: defaultFlockId,
        onSaved: onSaved,
      ),
    );
  }

  @override
  ConsumerState<RecordFeedingModal> createState() => _RecordFeedingModalState();
}

class _RecordFeedingModalState extends ConsumerState<RecordFeedingModal> {
  String? _selectedFlockId;
  String _session = "MORNING"; // MORNING, NOON, EVENING
  DateTime _selectedDate = DateTime.now();

  // 1. Provende
  String? _selectedFeedItemId;
  String _feedUnit = "KG"; // KG, G, BAG_50KG, BAG_25KG, BAG, etc.
  final _feedQtyController = TextEditingController(text: "25");

  String get _feedUnitLabel {
    switch (_feedUnit) {
      case "KG":
        return "kg";
      case "G":
        return "g";
      case "BAG":
      case "BAG_50KG":
      case "BAG_25KG":
        return "sac(s)";
      case "TON":
        return "t";
      default:
        return _feedUnit.toLowerCase();
    }
  }

  // 2. Abreuvement
  bool _isWaterTreated = false;
  final _waterVolumeController = TextEditingController(text: "50");
  String? _selectedHealthItemId;
  final _healthQtyController = TextEditingController(text: "15");
  String _healthUnit = "ML";

  // 3. Soin / Vaccin programmé lié
  String? _linkedTreatmentId;
  HealthTreatment? _linkedTreatment;

  // 4. Notes
  final _notesController = TextEditingController();
  bool _isSubmitting = false;

  @override
  void initState() {
    super.initState();
    _selectedFlockId = widget.defaultFlockId;
  }

  @override
  void dispose() {
    _feedQtyController.dispose();
    _waterVolumeController.dispose();
    _healthQtyController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  void _applyScheduledTreatment(HealthTreatment treatment, List<InventoryItem> healthItems) {
    setState(() {
      _linkedTreatmentId = treatment.id;
      _linkedTreatment = treatment;
      _isWaterTreated = true;

      // Recherche automatique d'un produit en stock correspondant au titre du soin
      final titleLower = treatment.title.toLowerCase();
      final matched = healthItems.where((i) {
        final nameLower = i.name.toLowerCase();
        return titleLower.contains(nameLower) || nameLower.contains(titleLower.split(" ").first);
      }).firstOrNull;

      if (matched != null) {
        _selectedHealthItemId = matched.id;
        if (matched.unit == "LITER" || matched.unit == "ML") {
          _healthUnit = "ML";
          _healthQtyController.text = "15";
        } else if (matched.unit == "KG" || matched.unit == "G") {
          _healthUnit = "G";
          _healthQtyController.text = "15";
        } else {
          _healthUnit = matched.unit;
          _healthQtyController.text = "1";
        }
      } else if (healthItems.isNotEmpty) {
        _selectedHealthItemId = healthItems.first.id;
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final surfaceColor = isDark ? AppColors.surfaceDark : AppColors.surfaceLight;
    final borderColor = isDark ? AppColors.borderDark : AppColors.borderLight;

    final flockState = ref.watch(flockProvider);
    final invState = ref.watch(inventoryProvider);
    final healthState = ref.watch(healthProvider);

    final flocks = flockState.flocks;
    if (_selectedFlockId == null && flocks.isNotEmpty) {
      _selectedFlockId = flocks.first.id;
    }

    final targetFlock = flocks.where((f) => f.id == _selectedFlockId).firstOrNull;

    // Filtre des aliments
    final feedItems = invState.items.where((i) {
      return i.category == 'FEED' ||
          i.unit.startsWith("BAG") ||
          i.name.toLowerCase().contains("provende") ||
          i.name.toLowerCase().contains("aliment") ||
          i.name.toLowerCase().contains("farine");
    }).toList();

    // Filtre des produits de santé / eau
    final healthItems = invState.items.where((i) {
      return i.category == 'MEDICINE' ||
          i.category == 'RAW_MATERIAL' ||
          ['ML', 'LITER', 'G', 'DOSE', 'SACHET'].contains(i.unit) ||
          i.name.toLowerCase().contains("vitamine") ||
          i.name.toLowerCase().contains("vaccin") ||
          i.name.toLowerCase().contains("anti");
    }).toList();

    if (_selectedFeedItemId == null && feedItems.isNotEmpty) {
      _selectedFeedItemId = feedItems.first.id;
    }
    if (_selectedHealthItemId == null && healthItems.isNotEmpty) {
      _selectedHealthItemId = healthItems.first.id;
    }

    // Détection des soins / vaccins programmés pour ce lot aujourd'hui ou en retard
    final dateStr =
        "${_selectedDate.year.toString().padLeft(4, '0')}-${_selectedDate.month.toString().padLeft(2, '0')}-${_selectedDate.day.toString().padLeft(2, '0')}";

    final relevantTreatments = healthState.treatments.where((t) {
      final isSameFlock = _selectedFlockId == null || t.flockId == _selectedFlockId;
      final isDue = t.scheduledDate == dateStr || t.isOverdue;
      return isSameFlock && isDue && t.isScheduled;
    }).toList();

    final suggestedTreatment = relevantTreatments.where((t) => t.administrationMethod == "DRINKING_WATER").firstOrNull ??
        relevantTreatments.firstOrNull;

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
        MediaQuery.of(context).viewInsets.bottom + MediaQuery.of(context).padding.bottom + 20,
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Poignée de glissement
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
            const SizedBox(height: 14),

            // En-tête
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: AppColors.accent.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(Icons.restaurant_rounded, color: AppColors.accent, size: 20),
                    ),
                    const SizedBox(width: 10),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          "Nourrir & Abreuver",
                          style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold),
                        ),
                        Text(
                          targetFlock != null
                              ? "${targetFlock.name} • ${targetFlock.currentQuantity} sujets"
                              : "Tournée d'élevage",
                          style: const TextStyle(fontSize: 11, color: AppColors.textMutedLight),
                        ),
                      ],
                    ),
                  ],
                ),
                IconButton(
                  icon: const Icon(Icons.close_rounded),
                  onPressed: () => Navigator.pop(context, false),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // 1. Sélection Bande, Date & Moment
            Row(
              children: [
                // Bande
                Expanded(
                  flex: 3,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text("Bande de volailles *", style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700)),
                      const SizedBox(height: 4),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10),
                        decoration: BoxDecoration(
                          color: isDark ? AppColors.surfaceDark : AppColors.backgroundLight,
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: borderColor),
                        ),
                        child: DropdownButtonHideUnderline(
                          child: DropdownButton<String>(
                            value: _selectedFlockId,
                            isExpanded: true,
                            items: flocks.map((f) {
                              return DropdownMenuItem<String>(
                                value: f.id,
                                child: Text(
                                  f.name,
                                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              );
                            }).toList(),
                            onChanged: (val) {
                              if (val != null) {
                                setState(() {
                                  _selectedFlockId = val;
                                  _linkedTreatmentId = null;
                                  _linkedTreatment = null;
                                });
                              }
                            },
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),

                // Date
                Expanded(
                  flex: 2,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text("Date *", style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700)),
                      const SizedBox(height: 4),
                      InkWell(
                        onTap: () async {
                          final picked = await showDatePicker(
                            context: context,
                            initialDate: _selectedDate,
                            firstDate: DateTime.now().subtract(const Duration(days: 60)),
                            lastDate: DateTime.now().add(const Duration(days: 7)),
                          );
                          if (picked != null) {
                            setState(() => _selectedDate = picked);
                          }
                        },
                        borderRadius: BorderRadius.circular(10),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 11),
                          decoration: BoxDecoration(
                            color: isDark ? AppColors.surfaceDark : AppColors.backgroundLight,
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: borderColor),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const Icon(Icons.calendar_today_rounded, size: 13, color: AppColors.primary),
                              const SizedBox(width: 4),
                              Text(
                                DateFormat('dd/MM', 'fr_FR').format(_selectedDate),
                                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),

            // Sélecteur de Moment (Matin, Midi, Soir)
            Row(
              children: [
                _buildSessionButton("MORNING", "Matin", Icons.wb_sunny_outlined),
                const SizedBox(width: 6),
                _buildSessionButton("NOON", "Midi", Icons.wb_twilight_rounded),
                const SizedBox(width: 6),
                _buildSessionButton("EVENING", "Soir", Icons.nights_stay_outlined),
              ],
            ),
            const SizedBox(height: 16),

            // 2. Section Provende
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: isDark ? AppColors.kpiEggBgDark : AppColors.accentSoft,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: isDark ? AppColors.kpiEggBorderDark : AppColors.accentWarm),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Row(
                    children: [
                      Icon(Icons.inventory_2_outlined, color: AppColors.accent, size: 16),
                      SizedBox(width: 6),
                      Text(
                        "1. Distribution d'aliment (Provende)",
                        style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.accent),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),

                  // Sélecteur de provende
                  if (feedItems.isEmpty)
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: AppColors.warning.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: AppColors.warning.withValues(alpha: 0.3)),
                      ),
                      child: const Row(
                        children: [
                          Icon(Icons.info_outline_rounded, color: AppColors.warning, size: 18),
                          SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              "Aucun aliment / provende enregistré en stock. Rendez-vous dans le stock pour en ajouter.",
                              style: TextStyle(fontSize: 11, color: AppColors.warning),
                            ),
                          ),
                        ],
                      ),
                    )
                  else
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10),
                      decoration: BoxDecoration(
                        color: surfaceColor,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: borderColor),
                      ),
                      child: DropdownButtonHideUnderline(
                        child: DropdownButton<String?>(
                          value: _selectedFeedItemId,
                          isExpanded: true,
                          items: [
                            const DropdownMenuItem<String?>(
                              value: null,
                              child: Text(
                                "-- Aucun aliment à cette tournée --",
                                style: TextStyle(fontSize: 12, fontStyle: FontStyle.italic, color: AppColors.textMutedLight),
                              ),
                            ),
                            ...feedItems.map((item) {
                              final stockLabel = item.isMassFamily
                                  ? "${item.availableStockKg.toStringAsFixed(0)} kg dispo (${item.currentStock % 1 == 0 ? item.currentStock.toInt() : item.currentStock} ${item.unitShortLabel})"
                                  : "${item.currentStock} ${item.unitShortLabel} en stock";
                              return DropdownMenuItem<String?>(
                                value: item.id,
                                child: Text(
                                  "${item.name} • $stockLabel",
                                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              );
                            }),
                          ],
                          onChanged: (val) {
                            setState(() {
                              _selectedFeedItemId = val;
                              final it = feedItems.where((i) => i.id == val).firstOrNull;
                              if (it != null) {
                                if (it.isMassFamily) {
                                  _feedUnit = "KG";
                                } else {
                                  _feedUnit = it.unit;
                                }
                              }
                            });
                          },
                        ),
                      ),
                    ),

                  if (_selectedFeedItemId != null) ...[
                    () {
                      final selectedItem = feedItems.where((i) => i.id == _selectedFeedItemId).firstOrNull;
                      final availableKg = selectedItem?.availableStockKg ?? 0.0;
                      final parsedQty = double.tryParse(_feedQtyController.text) ?? 0.0;
                      final isOverStock = _feedUnit == "KG"
                          ? parsedQty > availableKg
                          : (_feedUnit == "G"
                              ? (parsedQty / 1000.0) > availableKg
                              : parsedQty > (selectedItem?.currentStock ?? 0.0));

                      return Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const SizedBox(height: 10),
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Expanded(
                                flex: 3,
                                child: TextField(
                                  controller: _feedQtyController,
                                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                                  onChanged: (_) => setState(() {}),
                                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, fontFamily: 'monospace'),
                                  decoration: InputDecoration(
                                    labelText: "Quantité distribuée",
                                    hintText: "25",
                                    prefixIcon: const Icon(Icons.scale_rounded, size: 20),
                                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                flex: 2,
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8),
                                  decoration: BoxDecoration(
                                    color: surfaceColor,
                                    borderRadius: BorderRadius.circular(10),
                                    border: Border.all(color: borderColor),
                                  ),
                                  child: DropdownButtonHideUnderline(
                                    child: DropdownButton<String>(
                                      value: _feedUnit,
                                      isExpanded: true,
                                      items: [
                                        const DropdownMenuItem(value: "KG", child: Text("kg (pesé)", style: TextStyle(fontSize: 12))),
                                        if (selectedItem != null && selectedItem.unit.startsWith("BAG"))
                                          DropdownMenuItem(value: selectedItem.unit, child: Text(selectedItem.unitShortLabel, style: const TextStyle(fontSize: 12))),
                                        const DropdownMenuItem(value: "G", child: Text("g (grammes)", style: TextStyle(fontSize: 12))),
                                        if (selectedItem != null && !selectedItem.isMassFamily)
                                          DropdownMenuItem(value: selectedItem.unit, child: Text(selectedItem.unitShortLabel, style: const TextStyle(fontSize: 12))),
                                      ],
                                      onChanged: (val) {
                                        if (val != null) setState(() => _feedUnit = val);
                                      },
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 6),

                          // Informations de conversion & alerte stock
                          if (selectedItem != null)
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                              decoration: BoxDecoration(
                                color: isOverStock
                                    ? AppColors.danger.withValues(alpha: 0.1)
                                    : AppColors.accent.withValues(alpha: 0.08),
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(
                                  color: isOverStock
                                      ? AppColors.danger.withValues(alpha: 0.4)
                                      : AppColors.accent.withValues(alpha: 0.2),
                                ),
                              ),
                              child: Row(
                                children: [
                                  Icon(
                                    isOverStock ? Icons.warning_amber_rounded : Icons.info_outline_rounded,
                                    size: 14,
                                    color: isOverStock ? AppColors.danger : AppColors.accent,
                                  ),
                                  const SizedBox(width: 6),
                                  Expanded(
                                    child: Text(
                                      isOverStock
                                          ? "Stock insuffisant : $parsedQty $_feedUnitLabel demandés, seulement ${selectedItem.availableStockKg.toStringAsFixed(1)} kg en réserve !"
                                          : selectedItem.isMassFamily && _feedUnit == "KG"
                                              ? "Soit ${(parsedQty / selectedItem.effectiveWeightPerUnitKg).toStringAsFixed(2)} sac (Stock restant: ${(availableKg - parsedQty).clamp(0.0, double.infinity).toStringAsFixed(1)} kg)"
                                              : "Stock disponible : ${selectedItem.currentStock} ${selectedItem.unitShortLabel}",
                                      style: TextStyle(
                                        fontSize: 11,
                                        fontWeight: FontWeight.w600,
                                        color: isOverStock ? AppColors.danger : AppColors.accent,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          const SizedBox(height: 8),

                          // Raccourcis rapides adaptés à l'unité
                          SingleChildScrollView(
                            scrollDirection: Axis.horizontal,
                            child: Row(
                              children: _feedUnit == "KG"
                                  ? [
                                      _buildQuickQtyChip("+5 kg", 5),
                                      const SizedBox(width: 5),
                                      _buildQuickQtyChip("+10 kg", 10),
                                      const SizedBox(width: 5),
                                      _buildQuickQtyChip("+25 kg (1/2 sac)", 25),
                                      const SizedBox(width: 5),
                                      _buildQuickQtyChip("+50 kg (1 sac)", 50),
                                    ]
                                  : _feedUnit.startsWith("BAG")
                                      ? [
                                          _buildQuickQtyChip("+0.5 sac", 0.5),
                                          const SizedBox(width: 5),
                                          _buildQuickQtyChip("+1 sac", 1.0),
                                          const SizedBox(width: 5),
                                          _buildQuickQtyChip("+2 sacs", 2.0),
                                        ]
                                      : [
                                          _buildQuickQtyChip("+100 g", 100),
                                          const SizedBox(width: 5),
                                          _buildQuickQtyChip("+250 g", 250),
                                          const SizedBox(width: 5),
                                          _buildQuickQtyChip("+500 g", 500),
                                        ],
                            ),
                          ),
                        ],
                      );
                    }(),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 14),

            // 3. Section Abreuvement & Traitement de l'eau
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: isDark ? AppColors.kpiRateBgDark : AppColors.kpiRateBgLight,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: isDark ? AppColors.kpiRateBorderDark : AppColors.kpiRateBorderLight),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Row(
                        children: [
                          Icon(Icons.water_drop_rounded, color: AppColors.kpiRateBadge, size: 16),
                          SizedBox(width: 6),
                          Text(
                            "2. Abreuvement",
                            style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.kpiRateBadge),
                          ),
                        ],
                      ),
                      // Toggle Claire / Traitée
                      Container(
                        decoration: BoxDecoration(
                          color: surfaceColor,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: borderColor),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            InkWell(
                              onTap: () {
                                setState(() {
                                  _isWaterTreated = false;
                                  _linkedTreatmentId = null;
                                  _linkedTreatment = null;
                                });
                              },
                              borderRadius: BorderRadius.circular(7),
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                decoration: BoxDecoration(
                                  color: !_isWaterTreated ? AppColors.primary : Colors.transparent,
                                  borderRadius: BorderRadius.circular(7),
                                ),
                                child: Text(
                                  "Claire",
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.bold,
                                    color: !_isWaterTreated ? Colors.white : AppColors.textMutedLight,
                                  ),
                                ),
                              ),
                            ),
                            InkWell(
                              onTap: () {
                                setState(() => _isWaterTreated = true);
                              },
                              borderRadius: BorderRadius.circular(7),
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                decoration: BoxDecoration(
                                  color: _isWaterTreated ? AppColors.primary : Colors.transparent,
                                  borderRadius: BorderRadius.circular(7),
                                ),
                                child: Text(
                                  "Traitée",
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.bold,
                                    color: _isWaterTreated ? Colors.white : AppColors.textMutedLight,
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),

                  // Rappel Vaccin Planifié (si disponible et non encore lié)
                  if (suggestedTreatment != null && _linkedTreatmentId == null) ...[
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: AppColors.accent.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppColors.accent.withValues(alpha: 0.3)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              const Icon(Icons.auto_awesome_rounded, color: AppColors.accent, size: 16),
                              const SizedBox(width: 6),
                              Expanded(
                                child: Text(
                                  "Vaccin prévu aujourd'hui : « ${suggestedTreatment.title} »",
                                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.accent),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 6),
                          SizedBox(
                            width: double.infinity,
                            child: ElevatedButton.icon(
                              onPressed: () => _applyScheduledTreatment(suggestedTreatment, healthItems),
                              icon: const Icon(Icons.check_circle_outline_rounded, size: 14),
                              label: const Text(
                                "Valider le vaccin prévu en 1 clic →",
                                style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
                              ),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppColors.accent,
                                foregroundColor: Colors.white,
                                padding: const EdgeInsets.symmetric(vertical: 8),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 10),
                  ],

                  // Si vaccin lié
                  if (_linkedTreatment != null) ...[
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: AppColors.success.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppColors.success.withValues(alpha: 0.3)),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.check_circle_rounded, color: AppColors.success, size: 18),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  "Vaccin lié : « ${_linkedTreatment!.title} »",
                                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.success),
                                ),
                                const Text(
                                  "Sera automatiquement archivé et validé au carnet sanitaire.",
                                  style: TextStyle(fontSize: 10, color: AppColors.textMutedLight),
                                ),
                              ],
                            ),
                          ),
                          TextButton(
                            onPressed: () {
                              setState(() {
                                _linkedTreatmentId = null;
                                _linkedTreatment = null;
                              });
                            },
                            child: const Text("Délier", style: TextStyle(fontSize: 11, color: AppColors.danger)),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 10),
                  ],

                  // Volume d'eau (Litres)
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _waterVolumeController,
                          keyboardType: const TextInputType.numberWithOptions(decimal: true),
                          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, fontFamily: 'monospace'),
                          decoration: InputDecoration(
                            labelText: "Volume d'eau préparé (Litres)",
                            hintText: "50",
                            suffixText: "L",
                            suffixStyle: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.kpiRateBadge),
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          ),
                        ),
                      ),
                    ],
                  ),

                  // Si mode traitée : sélection du produit et de la dose
                  if (_isWaterTreated) ...[
                    const SizedBox(height: 10),
                    const Text(
                      "Produit vétérinaire / Vitamine ajouté :",
                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 6),

                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10),
                      decoration: BoxDecoration(
                        color: surfaceColor,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: borderColor),
                      ),
                      child: DropdownButtonHideUnderline(
                        child: DropdownButton<String?>(
                          value: _selectedHealthItemId,
                          isExpanded: true,
                          items: healthItems.map((item) {
                            return DropdownMenuItem<String?>(
                              value: item.id,
                              child: Text(
                                "${item.name} (${item.currentStock.toStringAsFixed(1)} ${item.unitShortLabel})",
                                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                                overflow: TextOverflow.ellipsis,
                              ),
                            );
                          }).toList(),
                          onChanged: (val) {
                            setState(() => _selectedHealthItemId = val);
                          },
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),

                    Row(
                      children: [
                        Expanded(
                          flex: 3,
                          child: TextField(
                            controller: _healthQtyController,
                            keyboardType: const TextInputType.numberWithOptions(decimal: true),
                            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, fontFamily: 'monospace'),
                            decoration: InputDecoration(
                              labelText: "Dose / Quantité",
                              hintText: "15",
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                              contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          flex: 2,
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8),
                            decoration: BoxDecoration(
                              color: surfaceColor,
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(color: borderColor),
                            ),
                            child: DropdownButtonHideUnderline(
                              child: DropdownButton<String>(
                                value: _healthUnit,
                                isExpanded: true,
                                items: const [
                                  DropdownMenuItem(value: "ML", child: Text("mL (liquide)", style: TextStyle(fontSize: 11))),
                                  DropdownMenuItem(value: "G", child: Text("g (poudre)", style: TextStyle(fontSize: 11))),
                                  DropdownMenuItem(value: "LITER", child: Text("Litre", style: TextStyle(fontSize: 11))),
                                  DropdownMenuItem(value: "SACHET", child: Text("Sachet", style: TextStyle(fontSize: 11))),
                                  DropdownMenuItem(value: "DOSE", child: Text("Dose", style: TextStyle(fontSize: 11))),
                                ],
                                onChanged: (val) {
                                  if (val != null) setState(() => _healthUnit = val);
                                },
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 14),

            // Observations
            TextField(
              controller: _notesController,
              decoration: InputDecoration(
                labelText: "Observations (optionnel)",
                hintText: "Ex : Appétit normal, lot vif, litière propre...",
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              ),
            ),
            const SizedBox(height: 18),

            // Boutons d'action
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => Navigator.pop(context, false),
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
                    onPressed: !_isSubmitting ? _submitFeeding : null,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: _isSubmitting
                        ? const SizedBox(
                            height: 20,
                            width: 20,
                            child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                          )
                        : const Text("Enregistrer la tournée"),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSessionButton(String sessionKey, String label, IconData icon) {
    final isSelected = _session == sessionKey;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Expanded(
      child: InkWell(
        onTap: () => setState(() => _session = sessionKey),
        borderRadius: BorderRadius.circular(10),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 8),
          decoration: BoxDecoration(
            color: isSelected ? AppColors.accent : (isDark ? AppColors.surfaceDark : AppColors.surfaceLight),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: isSelected ? AppColors.accent : AppColors.borderLight),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: 14, color: isSelected ? Colors.white : AppColors.textMutedLight),
              const SizedBox(width: 4),
              Text(
                label,
                style: TextStyle(
                  fontSize: 12,
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

  Widget _buildQuickQtyChip(String label, double addAmount) {
    return InkWell(
      onTap: () {
        final cur = double.tryParse(_feedQtyController.text) ?? 0.0;
        setState(() => _feedQtyController.text = (cur + addAmount).toStringAsFixed(0));
      },
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        decoration: BoxDecoration(
          color: Theme.of(context).brightness == Brightness.dark ? AppColors.surfaceDark : Colors.white,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: AppColors.accent.withValues(alpha: 0.3)),
        ),
        child: Text(
          label,
          style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.accent),
        ),
      ),
    );
  }

  Future<void> _submitFeeding() async {
    final scaffoldMessenger = ScaffoldMessenger.of(context);
    final navigator = Navigator.of(context);

    if (_selectedFlockId == null) {
      scaffoldMessenger.showSnackBar(
        const SnackBar(content: Text("Veuillez sélectionner une bande."), backgroundColor: AppColors.danger),
      );
      return;
    }

    final hasFeed = _selectedFeedItemId != null;
    final feedQty = double.tryParse(_feedQtyController.text) ?? 0.0;
    final hasHealth = _isWaterTreated && _selectedHealthItemId != null;
    final healthQty = double.tryParse(_healthQtyController.text) ?? 0.0;

    if (!hasFeed && !hasHealth) {
      scaffoldMessenger.showSnackBar(
        const SnackBar(
          content: Text("Veuillez sélectionner au moins un aliment à distribuer ou un produit de soin dans l'eau."),
          backgroundColor: AppColors.danger,
        ),
      );
      return;
    }

    if (hasFeed && feedQty <= 0) {
      scaffoldMessenger.showSnackBar(
        const SnackBar(
          content: Text("Veuillez saisir une quantité d'aliment supérieure à 0."),
          backgroundColor: AppColors.danger,
        ),
      );
      return;
    }

    if (hasHealth && healthQty <= 0) {
      scaffoldMessenger.showSnackBar(
        const SnackBar(
          content: Text("Veuillez saisir une dose de produit de soin supérieure à 0."),
          backgroundColor: AppColors.danger,
        ),
      );
      return;
    }

    setState(() => _isSubmitting = true);

    final sessionLabel = _session == "MORNING"
        ? "Matin"
        : _session == "NOON"
            ? "Midi"
            : "Soir";

    try {
      // 1. Décompte de la provende si renseignée avec son unité exacte
      if (hasFeed && feedQty > 0) {
        final feedOk = await ref.read(inventoryProvider.notifier).recordMovement(
          itemId: _selectedFeedItemId!,
          type: "FEEDING",
          quantity: feedQty,
          unit: _feedUnit,
          date: _selectedDate,
          flockId: _selectedFlockId,
          reason: "Ration $sessionLabel ($feedQty $_feedUnitLabel)${_notesController.text.trim().isNotEmpty ? ' - ${_notesController.text.trim()}' : ''}",
        );

        if (!feedOk) {
          final err = ref.read(inventoryProvider).error ?? "Stock insuffisant pour cette ration.";
          if (mounted) {
            setState(() => _isSubmitting = false);
            scaffoldMessenger.showSnackBar(
              SnackBar(content: Text(err), backgroundColor: AppColors.danger),
            );
          }
          return;
        }
      }

      // 2. Décompte du produit de santé dans l'eau si eau traitée
      if (hasHealth && healthQty > 0) {
        final healthOk = await ref.read(inventoryProvider.notifier).recordMovement(
          itemId: _selectedHealthItemId!,
          type: "FEEDING",
          quantity: healthQty,
          unit: _healthUnit,
          date: _selectedDate,
          flockId: _selectedFlockId,
          reason: "Abreuvement $sessionLabel ($healthQty $_healthUnit dans ${_waterVolumeController.text}L d'eau)",
        );

        if (!healthOk) {
          final err = ref.read(inventoryProvider).error ?? "Stock insuffisant pour ce produit de santé.";
          if (mounted) {
            setState(() => _isSubmitting = false);
            scaffoldMessenger.showSnackBar(
              SnackBar(content: Text(err), backgroundColor: AppColors.danger),
            );
          }
          return;
        }

        // 3. Validation automatique du vaccin / soin planifié au carnet de santé
        if (_linkedTreatmentId != null) {
          await ref.read(healthProvider.notifier).completeTreatment(
            treatmentId: _linkedTreatmentId!,
            administeredDate: _selectedDate,
            notes: "Administré lors de la tournée $sessionLabel dans ${_waterVolumeController.text}L d'eau${_notesController.text.trim().isNotEmpty ? ' - ${_notesController.text.trim()}' : ''}",
          );
        }
      }

      // Rechargements
      ref.read(inventoryProvider.notifier).loadMovements(showLoading: false);
      ref.read(inventoryProvider.notifier).loadItems(showLoading: false);
      ref.read(dashboardProvider.notifier).loadDashboard(showLoading: false);
      ref.read(flockProvider.notifier).loadFlocks(showLoading: false);
      widget.onSaved?.call();

      if (mounted) {
        navigator.pop(true);
        scaffoldMessenger.showSnackBar(
          SnackBar(
            content: Text(
              _linkedTreatment != null
                  ? "Tournée enregistrée et vaccin « ${_linkedTreatment!.title} » validé au carnet !"
                  : "Tournée d'alimentation et abreuvement enregistrée avec succès !",
            ),
            backgroundColor: AppColors.success,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isSubmitting = false);
        scaffoldMessenger.showSnackBar(
          SnackBar(content: Text("Erreur d'enregistrement: $e"), backgroundColor: AppColors.danger),
        );
      }
    }
  }
}
