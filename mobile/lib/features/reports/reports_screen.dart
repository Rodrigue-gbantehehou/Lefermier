import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/models/flock.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/theme_provider.dart';
import '../../core/utils/report_generator.dart';
import '../auth/auth_provider.dart';
import '../eggs/egg_provider.dart';
import '../finances/finance_provider.dart';
import '../flocks/flock_provider.dart';
import '../inventory/inventory_provider.dart';

enum ReportType {
  dailyEgg('daily_egg', 'Rapport de ponte', Icons.egg_rounded, AppColors.accent),
  flockSummary('flock_summary', 'Fiche de lot', Icons.pets_rounded, AppColors.primary),
  financeBalance('finance_balance', 'Bilan financier', Icons.account_balance_wallet_rounded, AppColors.success),
  inventoryAlerts('inventory_alerts', 'État des stocks', Icons.inventory_2_rounded, AppColors.primary);

  final String code;
  final String label;
  final IconData icon;
  final Color color;

  const ReportType(this.code, this.label, this.icon, this.color);
}

class ReportsScreen extends ConsumerStatefulWidget {
  final ReportType initialType;
  final String? initialFlockId;
  final VoidCallback? onBack;
  final VoidCallback? onOpenMenu;

  const ReportsScreen({
    super.key,
    this.initialType = ReportType.dailyEgg,
    this.initialFlockId,
    this.onBack,
    this.onOpenMenu,
  });

  @override
  ConsumerState<ReportsScreen> createState() => _ReportsScreenState();
}

class _ReportsScreenState extends ConsumerState<ReportsScreen> {
  late ReportType _selectedType;
  String? _selectedFlockId;
  final DateTime _selectedDate = DateTime.now();

  @override
  void initState() {
    super.initState();
    _selectedType = widget.initialType;
    _selectedFlockId = widget.initialFlockId;
  }

  String _buildReportText() {
    final farm = ref.watch(authProvider).activeFarm;
    if (farm == null) return "Veuillez sélectionner une exploitation.";

    switch (_selectedType) {
      case ReportType.dailyEgg:
        final eggState = ref.watch(eggProvider);
        return ReportGenerator.generateDailyEggReport(
          farm: farm,
          summary: eggState.summary,
          productions: eggState.productions,
          date: _selectedDate,
        );

      case ReportType.flockSummary:
        final flockState = ref.watch(flockProvider);
        final flocks = flockState.flocks;
        Flock? targetFlock;
        if (_selectedFlockId != null) {
          targetFlock = flocks.where((f) => f.id == _selectedFlockId).firstOrNull;
        }
        targetFlock ??= flocks.firstOrNull;

        if (targetFlock == null) {
          return "Aucune bande enregistrée pour générer ce rapport.";
        }

        return ReportGenerator.generateFlockSummaryReport(
          farm: farm,
          flock: targetFlock,
        );

      case ReportType.financeBalance:
        final finState = ref.watch(financeProvider);
        return ReportGenerator.generateFinanceReport(
          farm: farm,
          summary: finState.summary,
          transactionCount: finState.transactions.length,
          date: _selectedDate,
        );

      case ReportType.inventoryAlerts:
        final invState = ref.watch(inventoryProvider);
        return ReportGenerator.generateStockAlertReport(
          farm: farm,
          items: invState.items,
        );
    }
  }

  void _copyToClipboard(String text) {
    Clipboard.setData(ClipboardData(text: text));
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Row(
          children: [
            Icon(Icons.check_circle_rounded, color: Colors.white, size: 18),
            SizedBox(width: 8),
            Expanded(
              child: Text(
                "Rapport copié ! Vous pouvez maintenant le coller dans WhatsApp ou vos messages.",
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
              ),
            ),
          ],
        ),
        backgroundColor: AppColors.primary,
        duration: Duration(seconds: 3),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final reportText = _buildReportText();
    final flockState = ref.watch(flockProvider);

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
        title: const Text("Partage & Rapports"),
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
            icon: const Icon(Icons.copy_all_rounded),
            tooltip: "Copier le rapport",
            onPressed: () => _copyToClipboard(reportText),
          ),
        ],
      ),
      bottomNavigationBar: Container(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 20),
        decoration: BoxDecoration(
          color: isDark ? AppColors.surfaceDark : Colors.white,
          border: Border(
            top: BorderSide(
              color: isDark ? AppColors.borderDark : AppColors.borderLight,
            ),
          ),
        ),
        child: SizedBox(
          width: double.infinity,
          child: ElevatedButton.icon(
            onPressed: () => _copyToClipboard(reportText),
            icon: const Icon(Icons.share_rounded, size: 18),
            label: const Text(
              "Copier pour WhatsApp / SMS",
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
            ),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
          ),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 30),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // En-tête aéré direct
            const Text(
              "SYNTHÈSES & TRANSMISSION",
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w700,
                letterSpacing: 0.8,
                color: AppColors.textMutedLight,
              ),
            ),
            const SizedBox(height: 2),
            const Text(
              "Rapports prêts à envoyer",
              style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 4),
            const Text(
              "Transmettez instantanément vos fiches de ponte, bilans financiers ou alertes au propriétaire ou au vétérinaire.",
              style: TextStyle(fontSize: 12, color: AppColors.textMutedLight, height: 1.3),
            ),
            const SizedBox(height: 16),

            // Sélecteur de type de rapport (Tuiles horizontales)
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: ReportType.values.map((type) {
                  final isSelected = _selectedType == type;
                  return Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: InkWell(
                      onTap: () => setState(() => _selectedType = type),
                      borderRadius: BorderRadius.circular(12),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        decoration: BoxDecoration(
                          color: isSelected
                              ? type.color.withValues(alpha: 0.15)
                              : (isDark ? AppColors.surfaceDark : AppColors.surfaceLight),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: isSelected
                                ? type.color
                                : (isDark ? AppColors.borderDark : AppColors.borderLight),
                            width: isSelected ? 2 : 1,
                          ),
                        ),
                        child: Row(
                          children: [
                            Icon(type.icon, size: 16, color: isSelected ? type.color : AppColors.textMutedLight),
                            const SizedBox(width: 6),
                            Text(
                              type.label,
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                                color: isSelected ? type.color : AppColors.textMutedLight,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
            ),
            const SizedBox(height: 16),

            // Filtre par lot si type Fiche de lot
            if (_selectedType == ReportType.flockSummary && flockState.flocks.isNotEmpty) ...[
              DropdownButtonFormField<String>(
                initialValue: _selectedFlockId ?? flockState.flocks.first.id,
                isExpanded: true,
                decoration: InputDecoration(
                  labelText: "Bande de volailles à synthétiser",
                  prefixIcon: const Icon(Icons.pets_rounded, size: 20),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                ),
                items: flockState.flocks
                    .map((f) => DropdownMenuItem(
                          value: f.id,
                          child: Text("${f.name} (${f.currentQuantity} sujets - ${f.typeLabel})"),
                        ))
                    .toList(),
                onChanged: (val) {
                  if (val != null) setState(() => _selectedFlockId = val);
                },
              ),
              const SizedBox(height: 16),
            ],

            // Zone de prévisualisation du message WhatsApp
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  "Aperçu du message :",
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                ),
                TextButton.icon(
                  onPressed: () => _copyToClipboard(reportText),
                  icon: const Icon(Icons.copy_rounded, size: 14),
                  label: const Text("Copier", style: TextStyle(fontSize: 12)),
                  style: TextButton.styleFrom(padding: EdgeInsets.zero),
                ),
              ],
            ),
            const SizedBox(height: 6),

            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: isDark ? Colors.grey.shade900 : Colors.grey.shade100,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(
                  color: isDark ? AppColors.borderDark : AppColors.borderLight,
                ),
              ),
              child: SelectableText(
                reportText,
                style: const TextStyle(
                  fontFamily: 'monospace',
                  fontSize: 12,
                  height: 1.45,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
