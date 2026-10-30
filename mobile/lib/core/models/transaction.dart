import '../utils/currency_formatter.dart';

class Transaction {
  final String id;
  final String type; // INCOME, EXPENSE
  final int amount; // En FCFA (entier strict)
  final String date;
  final String category;
  final String? paymentMethod; // CASH, MTN_MOMO, MOOV_MONEY, CELTIIS, BANK_TRANSFER, CHECK
  final String? note;
  final String? contactName;

  const Transaction({
    required this.id,
    required this.type,
    required this.amount,
    required this.date,
    required this.category,
    this.paymentMethod = "CASH",
    this.note,
    this.contactName,
  });

  bool get isIncome => type == "INCOME";
  bool get isExpense => type == "EXPENSE";

  String get formattedAmount => CurrencyFormatter.formatFcfa(amount);

  factory Transaction.fromJson(Map<String, dynamic> json) {
    return Transaction(
      id: json['id'] as String,
      type: json['type'] as String? ?? "INCOME",
      amount: (json['amount'] as num?)?.toInt() ?? 0,
      date: json['date'] as String? ?? "",
      category: json['category'] as String? ?? "OTHER",
      paymentMethod: json['paymentMethod'] as String? ?? "CASH",
      note: json['note'] as String?,
      contactName: json['contact']?['name'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'type': type,
    'amount': amount,
    'date': date,
    'category': category,
    'paymentMethod': paymentMethod,
    'note': note,
  };
}
