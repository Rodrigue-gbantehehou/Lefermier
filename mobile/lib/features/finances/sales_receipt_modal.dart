import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dio/dio.dart';
import '../../core/api/api_client.dart';
import '../../core/api/api_endpoints.dart';
import '../../core/models/farm.dart';
import '../../core/models/transaction.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/currency_formatter.dart';
import '../../core/utils/pdf_helper.dart';
import '../../core/utils/report_generator.dart';
import '../auth/auth_provider.dart';

class SalesReceiptModal extends ConsumerStatefulWidget {
  final Transaction transaction;
  final Farm? farm;

  const SalesReceiptModal({
    super.key,
    required this.transaction,
    this.farm,
  });

  static Future<void> show(
    BuildContext context, {
    required Transaction transaction,
    Farm? farm,
  }) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => SalesReceiptModal(
        transaction: transaction,
        farm: farm,
      ),
    );
  }

  @override
  ConsumerState<SalesReceiptModal> createState() => _SalesReceiptModalState();
}

class _SalesReceiptModalState extends ConsumerState<SalesReceiptModal> {
  bool _isDownloadingPdf = false;

  void _copyReceiptText(Farm farm) {
    final text = ReportGenerator.generateSalesReceiptReport(
      farm: farm,
      transaction: widget.transaction,
    );
    Clipboard.setData(ClipboardData(text: text));
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text("Reçu copié dans le presse-papier !"),
        backgroundColor: AppColors.primary,
        duration: Duration(seconds: 2),
      ),
    );
  }

  void _shareViaWhatsApp(Farm farm) {
    final text = ReportGenerator.generateSalesReceiptReport(
      farm: farm,
      transaction: widget.transaction,
    );
    Clipboard.setData(ClipboardData(text: text));
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text("Reçu copié pour WhatsApp ! Collez-le dans votre discussion."),
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
      final endpoint = ApiEndpoints.transactionReceiptPdf(widget.transaction.id);
      final response = await dio.get(
        "$endpoint?download=1",
        options: Options(responseType: ResponseType.bytes),
      );

      if (response.statusCode == 200 && response.data != null) {
        final txId = widget.transaction.id;
        final fileName = "recu-vente-${txId.length >= 6 ? txId.substring(0, 6) : txId}.pdf";
        final bytes = response.data is List<int>
            ? (response.data as List<int>)
            : List<int>.from(response.data as List);
        final opened = await PdfHelper.saveAndOpen(bytes, fileName);
        messenger.showSnackBar(
          SnackBar(
            content: Text(opened
                ? "Reçu PDF officiel ouvert avec succès !"
                : "Reçu PDF téléchargé avec succès."),
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
    final tx = widget.transaction;

    final refCode = tx.reference ??
        'REC-${tx.id.length >= 6 ? tx.id.substring(tx.id.length - 6).toUpperCase() : tx.id.toUpperCase()}';

    final badgeColor = tx.isPaid
        ? AppColors.success
        : (tx.isPartial ? AppColors.warning : AppColors.danger);

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

            // En-tête modal
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
                      child: const Icon(Icons.receipt_long_rounded, color: AppColors.primary, size: 22),
                    ),
                    const SizedBox(width: 12),
                    const Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          "Reçu de Vente",
                          style: TextStyle(
                            fontSize: 17,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                        Text(
                          "Pièce justificative de vente",
                          style: TextStyle(fontSize: 11, color: AppColors.textMutedLight),
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
            const SizedBox(height: 16),

            // Ticket de caisse numérique
            Container(
              decoration: BoxDecoration(
                color: isDark ? AppColors.backgroundDark : const Color(0xFFF9FAFB),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: borderColor, width: 1.5),
              ),
              padding: const EdgeInsets.all(18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // En-tête exploitation
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              farm.name.toUpperCase(),
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w900,
                                letterSpacing: 0.3,
                              ),
                            ),
                            if (farm.city != null && farm.city!.isNotEmpty)
                              Text(
                                "📍 ${farm.city}",
                                style: const TextStyle(fontSize: 11, color: AppColors.textMutedLight),
                              ),
                            if (farm.phone != null && farm.phone!.isNotEmpty)
                              Text(
                                "📞 ${farm.phone}",
                                style: const TextStyle(fontSize: 11, color: AppColors.textMutedLight),
                              ),
                            if (farm.ifu != null && farm.ifu!.isNotEmpty)
                              Text(
                                "IFU : ${farm.ifu}",
                                style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.textMutedLight),
                              ),
                          ],
                        ),
                      ),
                      // Badge de règlement
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                        decoration: BoxDecoration(
                          color: badgeColor.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: badgeColor.withValues(alpha: 0.4)),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              tx.isPaid ? Icons.check_circle_rounded : Icons.info_outline_rounded,
                              size: 13,
                              color: badgeColor,
                            ),
                            const SizedBox(width: 4),
                            Text(
                              tx.paymentStatusLabel.toUpperCase(),
                              style: TextStyle(
                                fontSize: 10.5,
                                fontWeight: FontWeight.w900,
                                color: badgeColor,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),

                  // Ligne pointillée séparatrice
                  Row(
                    children: List.generate(
                      30,
                      (i) => Expanded(
                        child: Container(
                          color: i % 2 == 0 ? borderColor : Colors.transparent,
                          height: 1.5,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 14),

                  // Métadonnées ticket
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            "N° PIÈCE",
                            style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.textMutedLight),
                          ),
                          Text(
                            refCode,
                            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, fontFamily: 'monospace'),
                          ),
                        ],
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          const Text(
                            "DATE",
                            style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.textMutedLight),
                          ),
                          Text(
                            tx.date,
                            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  // Client
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    decoration: BoxDecoration(
                      color: isDark ? AppColors.surfaceDark : Colors.white,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: borderColor.withValues(alpha: 0.7)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.person_rounded, size: 16, color: AppColors.textMutedLight),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            tx.contactName?.isNotEmpty == true
                                ? "Client : ${tx.contactName}"
                                : "Client : Vente directe passage",
                            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 14),

                  // Désignation de l'article & lot
                  const Text(
                    "DÉTAIL DE LA VENTE",
                    style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w800, color: AppColors.textMutedLight),
                  ),
                  const SizedBox(height: 6),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: isDark ? AppColors.surfaceDark : Colors.white,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: borderColor.withValues(alpha: 0.7)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (tx.category == 'EGG_SALE') ...[
                          Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2.5),
                                decoration: BoxDecoration(
                                  color: AppColors.accent.withValues(alpha: 0.15),
                                  borderRadius: BorderRadius.circular(6),
                                  border: Border.all(color: AppColors.accent.withValues(alpha: 0.4)),
                                ),
                                child: const Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Text("🥚 ", style: TextStyle(fontSize: 11)),
                                    Text(
                                      "VENTE D'ŒUFS",
                                      style: TextStyle(
                                        fontSize: 10,
                                        fontWeight: FontWeight.w900,
                                        color: AppColors.accent,
                                        letterSpacing: 0.3,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 6),
                        ],
                        Text(
                          tx.note ?? tx.categoryLabel,
                          style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.bold),
                        ),
                        if (tx.flockName != null) ...[
                          const SizedBox(height: 2),
                          Text(
                            "Bande rattachée : ${tx.flockName}",
                            style: const TextStyle(fontSize: 11, color: AppColors.textMutedLight),
                          ),
                        ],
                        const SizedBox(height: 6),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              "Règlement : ${tx.paymentMethodLabel}",
                              style: const TextStyle(fontSize: 11, color: AppColors.textMutedLight),
                            ),
                            Text(
                              tx.formattedAmount,
                              style: const TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w900,
                                fontFamily: 'monospace',
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 14),

                  // Total TTC
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          "TOTAL ENCAISSÉ",
                          style: TextStyle(fontSize: 12, fontWeight: FontWeight.w900, color: AppColors.primary),
                        ),
                        Text(
                          tx.formattedAmount,
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w900,
                            fontFamily: 'monospace',
                            color: AppColors.primary,
                          ),
                        ),
                      ],
                    ),
                  ),

                  // Reste dû si applicable
                  if (tx.isPartial || tx.isUnpaid) ...[
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      decoration: BoxDecoration(
                        color: AppColors.danger.withValues(alpha: 0.08),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            tx.isPartial ? "SOLDE RESTANT DÛ" : "MONTANT À RÉGLER",
                            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.danger),
                          ),
                          Text(
                            CurrencyFormatter.formatFcfa(tx.remainingAmount),
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w900,
                              fontFamily: 'monospace',
                              color: AppColors.danger,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 18),

            // Actions de partage et téléchargement
            Row(
              children: [
                // Bouton Partager sur WhatsApp
                Expanded(
                  flex: 3,
                  child: ElevatedButton.icon(
                    onPressed: () => _shareViaWhatsApp(farm),
                    icon: const Icon(Icons.share_rounded, size: 18, color: Colors.white),
                    label: const Text(
                      "Partager sur WhatsApp",
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

                // Bouton Copier
                IconButton(
                  onPressed: () => _copyReceiptText(farm),
                  tooltip: "Copier le texte",
                  icon: const Icon(Icons.copy_rounded, size: 20),
                  style: IconButton.styleFrom(
                    backgroundColor: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                    padding: const EdgeInsets.all(12),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                      side: BorderSide(color: borderColor),
                    ),
                  ),
                ),
                const SizedBox(width: 6),

                // Bouton Télécharger PDF
                IconButton(
                  onPressed: _isDownloadingPdf ? null : _downloadPdf,
                  tooltip: "Télécharger PDF",
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
