import 'package:intl/intl.dart';
import '../models/farm.dart';
import '../models/flock.dart';
import '../models/egg_production.dart';
import '../models/inventory_item.dart';
import '../../features/eggs/egg_provider.dart';
import '../../features/finances/finance_provider.dart';
import 'currency_formatter.dart';

class ReportGenerator {
  static final DateFormat _dateFmt = DateFormat('dd/MM/yyyy');

  /// Génère un rapport journalier de ponte formaté pour WhatsApp / SMS
  static String generateDailyEggReport({
    required Farm farm,
    required EggSummaryStats summary,
    List<EggProduction> productions = const [],
    DateTime? date,
  }) {
    final d = date ?? DateTime.now();
    final buffer = StringBuffer();

    buffer.writeln("🥚 *RAPPORT DE PONTE JOURNALIER*");
    buffer.writeln("🏠 *Exploitation :* ${farm.name}");
    buffer.writeln("📅 *Date :* ${_dateFmt.format(d)}");
    buffer.writeln("--------------------------------");
    buffer.writeln("📊 *Total collecté :*");
    buffer.writeln("  • *${summary.totalTrays} plateaux* + ${summary.totalLooseEggs} œufs");
    buffer.writeln("  • Total net : *${summary.totalEggs} œufs*");
    buffer.writeln("  • Rendement estimé : *${summary.averageLayingRate.toStringAsFixed(1)}%*");
    buffer.writeln("");

    if (summary.totalDirtyEggs > 0 || summary.totalCrackedEggs > 0 || summary.totalDeformedEggs > 0) {
      buffer.writeln("⚠️ *Contrôle Qualité :*");
      if (summary.totalDirtyEggs > 0) buffer.writeln("  • Sales : ${summary.totalDirtyEggs}");
      if (summary.totalCrackedEggs > 0) buffer.writeln("  • Fêlés / cassés : ${summary.totalCrackedEggs}");
      if (summary.totalDeformedEggs > 0) buffer.writeln("  • Déformés : ${summary.totalDeformedEggs}");
      buffer.writeln("");
    }

    if (productions.isNotEmpty) {
      buffer.writeln("📋 *Détail par lot :*");
      for (final p in productions) {
        final rateStr = p.layingRate != null ? ' (${p.layingRate!.toStringAsFixed(1)}%)' : '';
        buffer.writeln("  • ${p.flockName ?? 'Lot'} : ${p.traysCount} plat. + ${p.looseEggsCount} œufs$rateStr");
      }
      buffer.writeln("");
    }

    buffer.writeln("📲 _Généré via l'application Le Fermier_");
    return buffer.toString();
  }

  /// Génère un bilan de synthèse d'une bande de volailles
  static String generateFlockSummaryReport({
    required Farm farm,
    required Flock flock,
  }) {
    final buffer = StringBuffer();

    buffer.writeln("🐔 *FICHE DE SUIVI DE BANDE*");
    buffer.writeln("🏠 *Exploitation :* ${farm.name}");
    buffer.writeln("📦 *Lot :* ${flock.name} (${flock.code ?? 'Sans code'})");
    buffer.writeln("🏷️ *Type :* ${flock.typeLabel} • ${flock.breed}");
    if (flock.buildingName != null) {
      buffer.writeln("🏡 *Bâtiment :* ${flock.buildingName}");
    }
    buffer.writeln("--------------------------------");
    buffer.writeln("📊 *Effectifs & Performance :*");
    buffer.writeln("  • Effectif vivant : *${flock.currentQuantity} sujets*");
    buffer.writeln("  • Effectif initial : ${flock.initialQuantity} sujets");
    buffer.writeln("  • Pertes cumulées : ${flock.deathsCount} sujets");
    buffer.writeln("  • Taux de perte : *${flock.calculatedMortalityRate.toStringAsFixed(1)}%*");
    if (flock.ageInWeeks != null) {
      buffer.writeln("  • Âge actuel : ${flock.ageInWeeks} semaines (${flock.ageInDays ?? 0} jours)");
    }
    buffer.writeln("  • Statut : ${flock.isActive ? 'Bande active' : 'Clôturée'}");
    buffer.writeln("");

    if (flock.notes != null && flock.notes!.isNotEmpty) {
      buffer.writeln("📝 *Notes :* ${flock.notes}");
      buffer.writeln("");
    }

    buffer.writeln("📲 _Généré via l'application Le Fermier_");
    return buffer.toString();
  }

  /// Génère un bilan financier / point de trésorerie
  static String generateFinanceReport({
    required Farm farm,
    required FinanceSummary summary,
    int transactionCount = 0,
    DateTime? date,
  }) {
    final d = date ?? DateTime.now();
    final buffer = StringBuffer();
    String formattedMonth;
    try {
      formattedMonth = DateFormat('MMMM yyyy', 'fr_FR').format(d);
    } catch (_) {
      const months = [
        'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
        'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
      ];
      formattedMonth = "${months[d.month - 1]} ${d.year}";
    }

    buffer.writeln("💰 *BILAN FINANCIER & CAISSE*");
    buffer.writeln("🏠 *Exploitation :* ${farm.name}");
    buffer.writeln("📅 *Période :* $formattedMonth");
    buffer.writeln("--------------------------------");
    buffer.writeln("💵 *Solde net disponible :*");
    buffer.writeln("  *${summary.netBalance >= 0 ? '+' : ''}${CurrencyFormatter.formatFcfa(summary.netBalance)}*");
    buffer.writeln("");
    buffer.writeln("📈 *Total Recettes :* +${CurrencyFormatter.formatFcfa(summary.totalIncome)}");
    buffer.writeln("📉 *Total Dépenses :* -${CurrencyFormatter.formatFcfa(summary.totalExpense)}");
    if (transactionCount > 0) {
      buffer.writeln("🔢 *Opérations enregistrées :* $transactionCount");
    }
    buffer.writeln("");
    buffer.writeln("📲 _Généré via l'application Le Fermier_");
    return buffer.toString();
  }

  /// Génère un rapport d'alerte de stock d'aliment et intrants
  static String generateStockAlertReport({
    required Farm farm,
    required List<InventoryItem> items,
  }) {
    final buffer = StringBuffer();
    final alertItems = items.where((i) => i.isLowStock).toList();
    final totalVal = items.fold(0, (sum, i) => sum + (i.estimatedTotalValue ?? 0));

    buffer.writeln("🌾 *POINT DES STOCKS & INTRANTS*");
    buffer.writeln("🏠 *Exploitation :* ${farm.name}");
    buffer.writeln("📅 *Date :* ${_dateFmt.format(DateTime.now())}");
    buffer.writeln("--------------------------------");
    buffer.writeln("💎 *Valeur estimée du stock :* ${CurrencyFormatter.formatFcfa(totalVal)}");
    buffer.writeln("📦 *Références actives :* ${items.length}");
    buffer.writeln("");

    if (alertItems.isNotEmpty) {
      buffer.writeln("⚠️ *ALERTES DE RÉAPPROVISIONNEMENT (${alertItems.length}) :*");
      for (final item in alertItems) {
        buffer.writeln("  • *${item.name}* : ${item.currentStock} ${item.unitShortLabel} restants (Seuil: ${item.alertThreshold ?? 0})");
      }
      buffer.writeln("");
    } else {
      buffer.writeln("✅ *Tous les stocks sont au-dessus des seuils de sécurité.*");
      buffer.writeln("");
    }

    buffer.writeln("📲 _Généré via l'application Le Fermier_");
    return buffer.toString();
  }
}
