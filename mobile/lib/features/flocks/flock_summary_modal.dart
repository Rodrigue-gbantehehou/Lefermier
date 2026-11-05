import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dio/dio.dart';
import '../../core/api/api_client.dart';
import '../../core/api/api_endpoints.dart';
import '../../core/models/farm.dart';
import '../../core/models/flock.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/currency_formatter.dart';
import '../../core/utils/pdf_helper.dart';
import '../../core/utils/report_generator.dart';
import '../auth/auth_provider.dart';

class FlockSummaryModal extends ConsumerStatefulWidget {
  final Flock flock;
  final Farm? farm;
  final double? totalFeedKg;
  final int? totalEggs;
  final int? totalTrays;
  final double? avgLayingRate;
  final double? totalIncome;
  final double? totalExpense;
  final double? grossMargin;

  const FlockSummaryModal({
    super.key,
    required this.flock,
    this.farm,
    this.totalFeedKg,
    this.totalEggs,
    this.totalTrays,
    this.avgLayingRate,
    this.totalIncome,
    this.totalExpense,
    this.grossMargin,
  });

  static Future<void> show(
    BuildContext context, {
    required Flock flock,
    Farm? farm,
    double? totalFeedKg,
    int? totalEggs,
    int? totalTrays,
    double? avgLayingRate,
    double? totalIncome,
    double? totalExpense,
    double? grossMargin,
  }) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => FlockSummaryModal(
        flock: flock,
        farm: farm,
        totalFeedKg: totalFeedKg,
        totalEggs: totalEggs,
        totalTrays: totalTrays,
        avgLayingRate: avgLayingRate,
        totalIncome: totalIncome,
        totalExpense: totalExpense,
        grossMargin: grossMargin,
      ),
    );
  }

  @override
  ConsumerState<FlockSummaryModal> createState() => _FlockSummaryModalState();
}

class _FlockSummaryModalState extends ConsumerState<FlockSummaryModal> {
  bool _isDownloadingPdf = false;
  bool _isLoading = false;

  double _feedKg = 0.0;
  int _eggs = 0;
  int _trays = 0;
  double _layingRate = 0.0;
  double _income = 0.0;
  double _expense = 0.0;
  double _margin = 0.0;

  @override
  void initState() {
    super.initState();
    _feedKg = widget.totalFeedKg ?? 0.0;
    _eggs = widget.totalEggs ?? 0;
    _trays = widget.totalTrays ?? (_eggs ~/ 30);
    _layingRate = widget.avgLayingRate ?? 0.0;
    _income = widget.totalIncome ?? 0.0;
    _expense = widget.totalExpense ?? 0.0;
    _margin = widget.grossMargin ?? (_income - _expense);

    if (widget.totalIncome == null && widget.totalFeedKg == null) {
      _loadFlockStats();
    }
  }

  Future<void> _loadFlockStats() async {
    setState(() => _isLoading = true);
    final farmId = widget.farm?.id ?? ref.read(authProvider).activeFarm?.id;
    if (farmId == null) {
      setState(() => _isLoading = false);
      return;
    }

    final dio = ApiClient().dio;
    try {
      // 1. Transactions financières rattachées
      try {
        final txRes = await dio.get("${ApiEndpoints.farmTransactions(farmId)}?flockId=${widget.flock.id}");
        if (txRes.data != null && txRes.data['data'] is List) {
          final txs = txRes.data['data'] as List;
          double inc = 0;
          double exp = 0;
          for (final t in txs) {
            final amt = (t['amount'] as num?)?.toDouble() ?? 0.0;
            if (t['type'] == 'INCOME') inc += amt;
            if (t['type'] == 'EXPENSE') exp += amt;
          }
          _income = inc;
          _expense = exp;
          _margin = inc - exp;
        }
      } catch (_) {}

      // 2. Pontes
      if (widget.flock.isLayer) {
        try {
          final eggRes = await dio.get(ApiEndpoints.flockEggs(widget.flock.id));
          final metaSummary = eggRes.data?['meta']?['summary'];
          if (metaSummary != null) {
            _eggs = (metaSummary['totalGoodEggs'] as num?)?.toInt() ?? 0;
            _trays = (metaSummary['totalTrays'] as num?)?.toInt() ?? (_eggs ~/ 30);
            _layingRate = (metaSummary['averageLayingRate'] as num?)?.toDouble() ?? 0.0;
          }
        } catch (_) {}
      }

      // 3. Aliments
      try {
        final feedRes = await dio.get("${ApiEndpoints.farmInventoryMovements(farmId)}?flockId=${widget.flock.id}");
        if (feedRes.data != null && feedRes.data['data'] is List) {
          final movements = feedRes.data['data'] as List;
          double kg = 0.0;
          for (final m in movements) {
            if (m['type'] == 'FEEDING') {
              final qty = (m['quantity'] as num?)?.toDouble() ?? 0.0;
              final unit = m['unit'] as String? ?? 'KG';
              if (unit == 'KG') kg += qty;
              if (unit == 'BAG_50KG' || unit == 'BAG') kg += (qty * 50.0);
              if (unit == 'BAG_25KG') kg += (qty * 25.0);
              if (unit == 'TON') kg += (qty * 1000.0);
            }
          }
          _feedKg = kg;
        }
      } catch (_) {}
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _shareBilan(Farm farm) {
    final text = ReportGenerator.generateFlockSummaryReport(
      farm: farm,
      flock: widget.flock,
    );
    Clipboard.setData(ClipboardData(text: text));
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text("Bilan copié pour WhatsApp ! Collez-le dans votre discussion."),
        backgroundColor: Color(0xFF25D366),
        duration: Duration(seconds: 3),
      ),
    );
  }

  Future<void> _downloadPdf() async {
    setState(() => _isDownloadingPdf = true);
    final messenger = ScaffoldMessenger.of(context);
    try {
      final dio = ApiClient().dio;
      final endpoint = ApiEndpoints.flockReportPdf(widget.flock.id);
      final response = await dio.get(
        "$endpoint?download=1",
        options: Options(responseType: ResponseType.bytes),
      );

      if (response.statusCode == 200 && response.data != null) {
        final code = widget.flock.code ?? widget.flock.id.substring(0, 6);
        final fileName = "bilan-bande-$code.pdf";
        final bytes = response.data is List<int>
            ? (response.data as List<int>)
            : List<int>.from(response.data as List);
        final opened = await PdfHelper.saveAndOpen(bytes, fileName);
        messenger.showSnackBar(
          SnackBar(
            content: Text(opened
                ? "Bilan PDF officiel ouvert avec succès !"
                : "Bilan PDF téléchargé avec succès."),
            backgroundColor: AppColors.success,
          ),
        );
      } else {
        messenger.showSnackBar(
          const SnackBar(
            content: Text("Impossible de télécharger le PDF pour le moment."),
            backgroundColor: AppColors.danger,
          ),
        );
      }
    } catch (e) {
      messenger.showSnackBar(
        SnackBar(
          content: Text("Erreur lors de la génération du PDF: $e"),
          backgroundColor: AppColors.danger,
        ),
      );
    } finally {
      if (mounted) setState(() => _isDownloadingPdf = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final surfaceColor = isDark ? AppColors.surfaceDark : AppColors.surfaceLight;
    final borderColor = isDark ? AppColors.borderDark : AppColors.borderLight;
    final authState = ref.watch(authProvider);
    final farm = widget.farm ?? authState.activeFarm ?? const Farm(id: "", name: "Exploitation Avicole");
    final canViewFinance = farm.canViewFinance;

    final initialQty = widget.flock.initialQuantity > 0 ? widget.flock.initialQuantity : 1;
    final marginPerBird = (_margin / initialQty).round();
    final mortalityRate = widget.flock.calculatedMortalityRate;

    // Indice de consommation estimé (IC = kg aliment / kg vif produit ou ratio par tête)
    final feedPerBirdKg = (initialQty > 0) ? (_feedKg / initialQty) : 0.0;

    return Container(
      decoration: BoxDecoration(
        color: surfaceColor,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
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
                        color: AppColors.primary.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(Icons.assessment_rounded, color: AppColors.primary, size: 22),
                    ),
                    const SizedBox(width: 12),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          "Bilan de Bande Avicole",
                          style: TextStyle(
                            fontSize: 17,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                        Text(
                          "${widget.flock.name} • ${widget.flock.typeLabel}",
                          style: const TextStyle(fontSize: 12, color: AppColors.textMutedLight),
                        ),
                      ],
                    ),
                  ],
                ),
                IconButton(
                  icon: const Icon(Icons.close_rounded, size: 22),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
            const SizedBox(height: 14),

            // Fiche Bande & Statut
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: isDark ? AppColors.backgroundDark : const Color(0xFFF9FAFB),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: borderColor),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        "Code : ${widget.flock.code ?? '—'}",
                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, fontFamily: 'monospace'),
                      ),
                      Text(
                        "Souche : ${widget.flock.breed} • Début : ${widget.flock.startDate}",
                        style: const TextStyle(fontSize: 11, color: AppColors.textMutedLight),
                      ),
                    ],
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: widget.flock.isActive
                          ? AppColors.success.withValues(alpha: 0.12)
                          : Colors.grey.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                        color: widget.flock.isActive
                            ? AppColors.success.withValues(alpha: 0.4)
                            : Colors.grey.withValues(alpha: 0.4),
                      ),
                    ),
                    child: Text(
                      widget.flock.isActive ? "En élevage" : "Clôturée",
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        color: widget.flock.isActive ? AppColors.success : AppColors.textMutedLight,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),

            if (_isLoading)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 24),
                child: Center(child: CircularProgressIndicator()),
              )
            else ...[
              // Section 1 : Performances Zootechniques
              const Text(
                "PERFORMANCES ZOOTECHNIQUES",
                style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: AppColors.textMutedLight, letterSpacing: 0.5),
              ),
              const SizedBox(height: 8),

              GridView.count(
                crossAxisCount: 2,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                crossAxisSpacing: 10,
                mainAxisSpacing: 10,
                childAspectRatio: 1.8,
                children: [
                  _MetricCard(
                    title: "Mortalité globale",
                    value: "${mortalityRate.toStringAsFixed(1)}%",
                    sub: "${widget.flock.deathsCount} / ${widget.flock.initialQuantity} pertes",
                    color: mortalityRate > 8 ? AppColors.danger : (mortalityRate > 4 ? AppColors.warning : AppColors.success),
                  ),
                  _MetricCard(
                    title: "Effectif restant",
                    value: "${widget.flock.currentQuantity}",
                    sub: "sujets vivants actuels",
                    color: AppColors.primary,
                  ),
                  _MetricCard(
                    title: "Aliments consommés",
                    value: "${_feedKg.toStringAsFixed(1)} kg",
                    sub: "Soit ~${feedPerBirdKg.toStringAsFixed(2)} kg / sujet",
                    color: AppColors.accent,
                  ),
                  if (widget.flock.isLayer)
                    _MetricCard(
                      title: "Ponte cumulée",
                      value: "$_trays plx",
                      sub: "$_eggs œufs (Moy: ${_layingRate.toStringAsFixed(1)}%)",
                      color: AppColors.accent,
                    )
                  else
                    _MetricCard(
                      title: "Durée d'élevage",
                      value: "${widget.flock.ageInWeeks ?? 0} sem",
                      sub: "${widget.flock.ageInDays ?? 0} jours de bande",
                      color: AppColors.primary,
                    ),
                ],
              ),
              const SizedBox(height: 16),

              // Section 2 : Rentabilité & Marge Brute (Conditionné au droit financier)
              if (canViewFinance) ...[
                const Text(
                  "COMPTE D'EXPLOITATION & RENTABILITÉ",
                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: AppColors.textMutedLight, letterSpacing: 0.5),
                ),
                const SizedBox(height: 8),

                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: isDark ? AppColors.backgroundDark : const Color(0xFFF9FAFB),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: borderColor),
                  ),
                  child: Column(
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text("Chiffre d'affaires (Ventes)", style: TextStyle(fontSize: 12.5, color: AppColors.textMutedLight)),
                          Text(
                            "+${CurrencyFormatter.formatFcfa(_income)}",
                            style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.bold, fontFamily: 'monospace', color: AppColors.success),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text("Total des charges imputées", style: TextStyle(fontSize: 12.5, color: AppColors.textMutedLight)),
                          Text(
                            "-${CurrencyFormatter.formatFcfa(_expense)}",
                            style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.bold, fontFamily: 'monospace', color: AppColors.danger),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      const Divider(height: 1),
                      const SizedBox(height: 10),

                      // Marge brute consolidée
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text(
                            "MARGE BRUTE RÉELLE",
                            style: TextStyle(fontSize: 12, fontWeight: FontWeight.w900),
                          ),
                          Text(
                            CurrencyFormatter.formatFcfa(_margin),
                            style: TextStyle(
                              fontSize: 17,
                              fontWeight: FontWeight.w900,
                              fontFamily: 'monospace',
                              color: _margin >= 0 ? AppColors.success : AppColors.danger,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text(
                            "Rentabilité nette par sujet mis en place",
                            style: TextStyle(fontSize: 11, color: AppColors.textMutedLight),
                          ),
                          Text(
                            "${CurrencyFormatter.formatFcfa(marginPerBird)} / tête",
                            style: TextStyle(
                              fontSize: 11.5,
                              fontWeight: FontWeight.bold,
                              fontFamily: 'monospace',
                              color: _margin >= 0 ? AppColors.success : AppColors.danger,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
              ],

              // Notes de bande
              if (widget.flock.notes != null && widget.flock.notes!.isNotEmpty) ...[
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: surfaceColor,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: borderColor),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        "OBSERVATIONS & ITINÉRAIRE TECHNIQUE",
                        style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.textMutedLight),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        widget.flock.notes!,
                        style: const TextStyle(fontSize: 12),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
              ],
            ],

            // Actions de partage et téléchargement
            Row(
              children: [
                Expanded(
                  flex: 3,
                  child: ElevatedButton.icon(
                    onPressed: () => _shareBilan(farm),
                    icon: const Icon(Icons.share_rounded, size: 18, color: Colors.white),
                    label: const Text(
                      "Partager le bilan (WhatsApp)",
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.white),
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF25D366),
                      padding: const EdgeInsets.symmetric(vertical: 13),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      elevation: 0,
                    ),
                  ),
                ),
                const SizedBox(width: 8),

                // Bouton Télécharger PDF Officiel
                IconButton(
                  onPressed: _isDownloadingPdf ? null : _downloadPdf,
                  tooltip: "Télécharger le Bilan PDF",
                  icon: _isDownloadingPdf
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.picture_as_pdf_rounded, size: 20, color: AppColors.danger),
                  style: IconButton.styleFrom(
                    backgroundColor: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                    padding: const EdgeInsets.all(12),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                      side: BorderSide(color: borderColor),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _MetricCard extends StatelessWidget {
  final String title;
  final String value;
  final String sub;
  final Color color;

  const _MetricCard({
    required this.title,
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
        color: isDark ? AppColors.backgroundDark : const Color(0xFFF9FAFB),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.25)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            title,
            style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w600, color: AppColors.textMutedLight),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 2),
          Text(
            value,
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w900,
              fontFamily: 'monospace',
              color: color,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            sub,
            style: const TextStyle(fontSize: 9.5, color: AppColors.textMutedLight),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }
}
