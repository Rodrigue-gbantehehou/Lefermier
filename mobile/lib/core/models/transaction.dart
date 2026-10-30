import '../utils/currency_formatter.dart';

class Transaction {
  final String id;
  final String type; // INCOME, EXPENSE
  final int amount; // En FCFA (entier strict)
  final String date;
  final String category;
  final String paymentMethod; // CASH, MTN_MOMO, MOOV_MONEY, CELTIIS_CASH, BANK_TRANSFER, CHECK
  final String? note;
  final String? contactName;
  final String? reference;
  final String? flockName;

  const Transaction({
    required this.id,
    required this.type,
    required this.amount,
    required this.date,
    required this.category,
    this.paymentMethod = "CASH",
    this.note,
    this.contactName,
    this.reference,
    this.flockName,
  });

  bool get isIncome => type == "INCOME";
  bool get isExpense => type == "EXPENSE";

  String get formattedAmount => CurrencyFormatter.formatFcfa(amount);

  String get categoryLabel {
    switch (category) {
      case "EGG_SALE":
        return "Vente d'œufs";
      case "MEAT_POULTRY_SALE":
        return "Vente poulets chair";
      case "LAYER_CULL_SALE":
        return "Vente réformes";
      case "CHICK_SALE":
        return "Vente poussins";
      case "MANURE_SALE":
        return "Vente fiente / fumier";
      case "FEED_PURCHASE":
        return "Achat aliment";
      case "CHICK_PURCHASE":
        return "Achat poussins";
      case "MEDICATION_VACCINE":
        return "Santé & Vaccins";
      case "EQUIPMENT_LITTER":
        return "Litière & Matériel";
      case "SALARY_LABOR":
        return "Salaires & Main-d'œuvre";
      case "UTILITIES":
        return "Électricité / Eau";
      case "TRANSPORT":
        return "Transport & Livraison";
      case "RENT_LEASE":
        return "Loyer";
      case "OTHER_INCOME":
        return "Autre recette";
      case "OTHER_EXPENSE":
        return "Autre dépense";
      default:
        return isIncome ? "Recette" : "Dépense";
    }
  }

  String get paymentMethodLabel {
    switch (paymentMethod) {
      case "MTN_MOMO":
        return "MTN MoMo";
      case "MOOV_MONEY":
        return "Moov Money";
      case "CELTIIS_CASH":
        return "Celtiis Cash";
      case "BANK_TRANSFER":
        return "Virement";
      case "CHECK":
        return "Chèque";
      case "CASH":
      default:
        return "Espèces";
    }
  }

  factory Transaction.fromJson(Map<String, dynamic> json) {
    return Transaction(
      id: json['id'] as String? ?? "",
      type: json['type'] as String? ?? "INCOME",
      amount: (json['amount'] as num?)?.toInt() ?? 0,
      date: json['transactionDate'] as String? ?? json['date'] as String? ?? "",
      category: json['category'] as String? ?? "OTHER_INCOME",
      paymentMethod: json['paymentMethod'] as String? ?? "CASH",
      note: json['description'] as String? ?? json['note'] as String?,
      contactName: json['contact']?['name'] as String?,
      reference: json['reference'] as String?,
      flockName: json['flock']?['name'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'type': type,
        'amount': amount,
        'transactionDate': date,
        'category': category,
        'paymentMethod': paymentMethod,
        'description': note,
      };
}
