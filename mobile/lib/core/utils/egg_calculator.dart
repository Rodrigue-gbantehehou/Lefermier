class EggTrayInfo {
  final int total;
  final int trays;
  final int remainder;
  final String text;

  const EggTrayInfo({
    required this.total,
    required this.trays,
    required this.remainder,
    required this.text,
  });
}

class EggCalculator {
  static const int traySize = 30;

  static EggTrayInfo calculate(int totalEggs) {
    if (totalEggs <= 0) {
      return const EggTrayInfo(
        total: 0,
        trays: 0,
        remainder: 0,
        text: "0 plateau",
      );
    }

    final trays = totalEggs ~/ traySize;
    final remainder = totalEggs % traySize;

    String text;
    if (trays == 0) {
      text = "$remainder œuf${remainder > 1 ? 's' : ''}";
    } else if (remainder == 0) {
      text = "$trays plateau${trays > 1 ? 'x' : ''}";
    } else {
      text = "$trays pl. + $remainder œuf${remainder > 1 ? 's' : ''}";
    }

    return EggTrayInfo(
      total: totalEggs,
      trays: trays,
      remainder: remainder,
      text: text,
    );
  }
}
