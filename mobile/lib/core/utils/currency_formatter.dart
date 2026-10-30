import 'package:intl/intl.dart';

class CurrencyFormatter {
  static final _numberFormat = NumberFormat('#,###', 'fr_FR');

  static String formatFcfa(num? amount) {
    if (amount == null) return "0 FCFA";
    final formatted = _numberFormat.format(amount.round()).replaceAll(',', ' ');
    return "$formatted FCFA";
  }

  static String formatNumber(num? value) {
    if (value == null) return "0";
    return _numberFormat.format(value).replaceAll(',', ' ');
  }
}
