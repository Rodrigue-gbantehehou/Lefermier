import 'dart:io';
import 'package:open_filex/open_filex.dart';
import 'package:path_provider/path_provider.dart';

Future<bool> saveAndOpenPdf(List<int> bytes, String fileName) async {
  try {
    final dir = await getTemporaryDirectory();
    final filePath = '${dir.path}/$fileName';
    final file = File(filePath);
    await file.writeAsBytes(bytes, flush: true);
    final result = await OpenFilex.open(filePath);
    return result.type == ResultType.done;
  } catch (_) {
    return false;
  }
}
