import 'pdf_helper_io.dart' if (dart.library.html) 'pdf_helper_web.dart' as impl;

class PdfHelper {
  /// Enregistre les octets du PDF et l'ouvre automatiquement dans le visualiseur natif
  /// (sur mobile/desktop) ou déclenche le téléchargement du fichier (sur Chrome/Web).
  static Future<bool> saveAndOpen(List<int> bytes, String fileName) async {
    return impl.saveAndOpenPdf(bytes, fileName);
  }
}
