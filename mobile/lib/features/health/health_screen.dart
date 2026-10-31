import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/theme_provider.dart';
import '../../core/models/health_treatment.dart';
import '../flocks/flock_provider.dart';
import '../../core/widgets/brand_loader.dart';
import 'health_provider.dart';

class HealthScreen extends ConsumerStatefulWidget {
  final VoidCallback? onOpenMenu;
  const HealthScreen({super.key, this.onOpenMenu});

  @override
  ConsumerState<HealthScreen> createState() => _HealthScreenState();
}

class _HealthScreenState extends ConsumerState<HealthScreen> {
  String _activeTabFilter = 'ALL'; // 'ALL', 'SCHEDULED', 'COMPLETED', 'OVERDUE'

  void _openCompleteDialog(HealthTreatment treatment) {
    DateTime administeredDate = DateTime.now();
    final vetController = TextEditingController(text: treatment.veterinarian ?? "");
    final notesController = TextEditingController(text: treatment.notes ?? "");

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) {
          final isDark = Theme.of(ctx).brightness == Brightness.dark;
          final surfaceColor = isDark ? AppColors.surfaceDark : AppColors.surfaceLight;
          final borderColor = isDark ? AppColors.borderDark : AppColors.borderLight;
          final healthState = ref.watch(healthProvider);

          return Container(
            decoration: BoxDecoration(
              color: surfaceColor,
              borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
              border: Border.all(color: borderColor),
            ),
            padding: EdgeInsets.fromLTRB(
              20,
              12,
              20,
              MediaQuery.of(ctx).viewInsets.bottom + MediaQuery.of(ctx).padding.bottom + 20,
            ),
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
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
                  const SizedBox(height: 16),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        "Valider l'administration",
                        style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close_rounded),
                        onPressed: () => Navigator.pop(ctx),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),

                  // Récapitulatif du soin
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: isDark ? Colors.grey.shade900 : Colors.grey.shade100,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: borderColor),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          treatment.title,
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          "Bande : ${treatment.flockName} • Méthode : ${treatment.administrationMethodLabel}",
                          style: const TextStyle(fontSize: 12, color: AppColors.textMutedLight),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 14),

                  // Date d'administration
                  const Text("Date d'administration *", style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                  const SizedBox(height: 6),
                  InkWell(
                    onTap: () async {
                      final picked = await showDatePicker(
                        context: context,
                        initialDate: administeredDate,
                        firstDate: DateTime(2020),
                        lastDate: DateTime(2035),
                      );
                      if (picked != null) {
                        setModalState(() => administeredDate = picked);
                      }
                    },
                    borderRadius: BorderRadius.circular(12),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      decoration: BoxDecoration(
                        color: isDark ? Colors.grey.shade900 : Colors.grey.shade100,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: borderColor),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.calendar_month_rounded, size: 20, color: AppColors.primary),
                          const SizedBox(width: 10),
                          Text(
                            "${administeredDate.day.toString().padLeft(2, '0')}/${administeredDate.month.toString().padLeft(2, '0')}/${administeredDate.year}",
                            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
                          ),
                          const Spacer(),
                          const Text("Changer", style: TextStyle(fontSize: 12, color: AppColors.primary)),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),

                  // Vétérinaire / Opérateur
                  TextField(
                    controller: vetController,
                    decoration: InputDecoration(
                      labelText: "Nom du vétérinaire / vaccinateur (optionnel)",
                      hintText: "Ex: Dr. Traoré, Équipe technique...",
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      contentPadding: const EdgeInsets.all(12),
                    ),
                  ),
                  const SizedBox(height: 12),

                  // Notes
                  TextField(
                    controller: notesController,
                    maxLines: 2,
                    decoration: InputDecoration(
                      labelText: "Observations / Réaction du troupeau (optionnel)",
                      hintText: "Ex: RAS, bonne prise dans l'eau de boisson...",
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      contentPadding: const EdgeInsets.all(12),
                    ),
                  ),
                  const SizedBox(height: 18),

                  // Actions
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: () => Navigator.pop(ctx),
                          style: OutlinedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                          child: const Text("Annuler"),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: ElevatedButton(
                          onPressed: !healthState.isSubmitting
                              ? () async {
                                  final messenger = ScaffoldMessenger.of(context);
                                  final navigator = Navigator.of(ctx);

                                  final success = await ref.read(healthProvider.notifier).completeTreatment(
                                    treatmentId: treatment.id,
                                    administeredDate: administeredDate,
                                    veterinarian: vetController.text,
                                    notes: notesController.text,
                                  );

                                  if (ctx.mounted) {
                                    if (success) {
                                      navigator.pop();
                                      messenger.showSnackBar(
                                        SnackBar(
                                          content: Text("Administration de \"${treatment.title}\" validée !"),
                                          backgroundColor: AppColors.success,
                                        ),
                                      );
                                    } else {
                                      final err = ref.read(healthProvider).error ?? "Une erreur est survenue.";
                                      messenger.showSnackBar(
                                        SnackBar(content: Text(err), backgroundColor: AppColors.danger),
                                      );
                                    }
                                  }
                                }
                              : null,
                          style: ElevatedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            backgroundColor: AppColors.success,
                            foregroundColor: Colors.white,
                          ),
                          child: healthState.isSubmitting
                              ? const BrandLoader.button()
                              : const Text("Confirmer"),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  void _openCreateTreatmentDialog() {
    final flockState = ref.watch(flockProvider);
    if (flockState.flocks.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text("Veuillez d'abord enregistrer au moins une bande pour planifier un soin."),
          backgroundColor: AppColors.danger,
        ),
      );
      return;
    }

    String selectedFlockId = flockState.flocks.first.id;
    final titleController = TextEditingController();
    final targetAgeController = TextEditingController();
    final notesController = TextEditingController();
    DateTime scheduledDate = DateTime.now();

    String type = "VACCINATION";
    String method = "DRINKING_WATER";

    final types = [
      {"code": "VACCINATION", "label": "Vaccination"},
      {"code": "ANTIBIOTIC", "label": "Traitement Antibiotique"},
      {"code": "DEWORMING", "label": "Vermifuge / Antiparasitaire"},
      {"code": "VITAMIN", "label": "Vitamines & Minéraux"},
      {"code": "DISINFECTION", "label": "Désinfection / Hygiène"},
      {"code": "OTHER", "label": "Autre intervention"},
    ];

    final methods = [
      {"code": "DRINKING_WATER", "label": "Eau de boisson"},
      {"code": "EYE_DROP", "label": "Goutte oculaire (oculaire)"},
      {"code": "INJECTION", "label": "Injection sous-cutanée / intra"},
      {"code": "FEED", "label": "Mélange dans l'aliment"},
      {"code": "SPRAY", "label": "Nébulisation / Pulvérisation"},
      {"code": "TOPICAL", "label": "Application externe"},
      {"code": "OTHER", "label": "Autre méthode"},
    ];

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) {
          final isDark = Theme.of(ctx).brightness == Brightness.dark;
          final surfaceColor = isDark ? AppColors.surfaceDark : AppColors.surfaceLight;
          final borderColor = isDark ? AppColors.borderDark : AppColors.borderLight;
          final healthState = ref.watch(healthProvider);

          return Container(
            decoration: BoxDecoration(
              color: surfaceColor,
              borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
              border: Border.all(color: borderColor),
            ),
            padding: EdgeInsets.fromLTRB(
              20,
              12,
              20,
              MediaQuery.of(ctx).viewInsets.bottom + MediaQuery.of(ctx).padding.bottom + 20,
            ),
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
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
                  const SizedBox(height: 16),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        "Planifier un soin vétérinaire",
                        style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close_rounded),
                        onPressed: () => Navigator.pop(ctx),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  // Sélection Bande
                  const Text("Bande de volailles *", style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                  const SizedBox(height: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    decoration: BoxDecoration(
                      color: isDark ? Colors.grey.shade900 : Colors.grey.shade100,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: borderColor),
                    ),
                    child: DropdownButtonHideUnderline(
                      child: DropdownButton<String>(
                        value: selectedFlockId,
                        isExpanded: true,
                        items: flockState.flocks.map((flock) {
                          return DropdownMenuItem<String>(
                            value: flock.id,
                            child: Text(
                              "${flock.name} (${flock.currentQuantity} sujets)",
                              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                            ),
                          );
                        }).toList(),
                        onChanged: (val) {
                          if (val != null) setModalState(() => selectedFlockId = val);
                        },
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),

                  // Titre de l'intervention
                  TextField(
                    controller: titleController,
                    decoration: InputDecoration(
                      labelText: "Titre du soin / vaccin *",
                      hintText: "Ex: Vaccin Newcastle, Vermifuge Lévamisole...",
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      contentPadding: const EdgeInsets.all(12),
                    ),
                  ),
                  const SizedBox(height: 12),

                  // Type
                  const Text("Type d'intervention *", style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                  const SizedBox(height: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    decoration: BoxDecoration(
                      color: isDark ? Colors.grey.shade900 : Colors.grey.shade100,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: borderColor),
                    ),
                    child: DropdownButtonHideUnderline(
                      child: DropdownButton<String>(
                        value: type,
                        isExpanded: true,
                        items: types.map((t) {
                          return DropdownMenuItem<String>(
                            value: t['code'],
                            child: Text(t['label']!, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                          );
                        }).toList(),
                        onChanged: (val) {
                          if (val != null) setModalState(() => type = val);
                        },
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),

                  // Mode d'administration
                  const Text("Mode d'administration *", style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                  const SizedBox(height: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    decoration: BoxDecoration(
                      color: isDark ? Colors.grey.shade900 : Colors.grey.shade100,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: borderColor),
                    ),
                    child: DropdownButtonHideUnderline(
                      child: DropdownButton<String>(
                        value: method,
                        isExpanded: true,
                        items: methods.map((m) {
                          return DropdownMenuItem<String>(
                            value: m['code'],
                            child: Text(m['label']!, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                          );
                        }).toList(),
                        onChanged: (val) {
                          if (val != null) setModalState(() => method = val);
                        },
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),

                  // Date prévue & Âge cible
                  Row(
                    children: [
                      Expanded(
                        child: InkWell(
                          onTap: () async {
                            final picked = await showDatePicker(
                              context: context,
                              initialDate: scheduledDate,
                              firstDate: DateTime(2020),
                              lastDate: DateTime(2035),
                            );
                            if (picked != null) {
                              setModalState(() => scheduledDate = picked);
                            }
                          },
                          borderRadius: BorderRadius.circular(12),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                            decoration: BoxDecoration(
                              color: isDark ? Colors.grey.shade900 : Colors.grey.shade100,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: borderColor),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text("Date prévue *", style: TextStyle(fontSize: 10, color: AppColors.textMutedLight)),
                                const SizedBox(height: 2),
                                Text(
                                  "${scheduledDate.day.toString().padLeft(2, '0')}/${scheduledDate.month.toString().padLeft(2, '0')}/${scheduledDate.year}",
                                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: TextField(
                          controller: targetAgeController,
                          keyboardType: TextInputType.number,
                          decoration: InputDecoration(
                            labelText: "Âge cible (jours)",
                            hintText: "Ex: 7",
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                            contentPadding: const EdgeInsets.all(12),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  // Notes
                  TextField(
                    controller: notesController,
                    decoration: InputDecoration(
                      labelText: "Notes / Posologie",
                      hintText: "Ex: 1 flacon pour 1000 sujets...",
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      contentPadding: const EdgeInsets.all(12),
                    ),
                  ),
                  const SizedBox(height: 18),

                  // Boutons
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: () => Navigator.pop(ctx),
                          style: OutlinedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                          child: const Text("Annuler"),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: ElevatedButton(
                          onPressed: !healthState.isSubmitting
                              ? () async {
                                  final title = titleController.text.trim();
                                  if (title.isEmpty) {
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      const SnackBar(
                                        content: Text("Veuillez renseigner un titre pour le soin."),
                                        backgroundColor: AppColors.danger,
                                      ),
                                    );
                                    return;
                                  }

                                  final targetAge = int.tryParse(targetAgeController.text.trim());
                                  final messenger = ScaffoldMessenger.of(context);
                                  final navigator = Navigator.of(ctx);

                                  final success = await ref.read(healthProvider.notifier).createTreatment(
                                    flockId: selectedFlockId,
                                    title: title,
                                    type: type,
                                    method: method,
                                    scheduledDate: scheduledDate,
                                    targetAgeDays: targetAge,
                                    notes: notesController.text,
                                  );

                                  if (ctx.mounted) {
                                    if (success) {
                                      navigator.pop();
                                      messenger.showSnackBar(
                                        SnackBar(
                                          content: Text("Soin \"$title\" planifié avec succès !"),
                                          backgroundColor: AppColors.success,
                                        ),
                                      );
                                    } else {
                                      final err = ref.read(healthProvider).error ?? "Une erreur est survenue.";
                                      messenger.showSnackBar(
                                        SnackBar(content: Text(err), backgroundColor: AppColors.danger),
                                      );
                                    }
                                  }
                                }
                              : null,
                          style: ElevatedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            backgroundColor: AppColors.primary,
                            foregroundColor: Colors.white,
                          ),
                          child: healthState.isSubmitting
                              ? const BrandLoader.button()
                              : const Text("Planifier"),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  void _openGenerateProgramDialog() {
    final flockState = ref.watch(flockProvider);
    if (flockState.flocks.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text("Veuillez d'abord enregistrer au moins une bande."),
          backgroundColor: AppColors.danger,
        ),
      );
      return;
    }

    String selectedFlockId = flockState.flocks.first.id;
    String programType = "STANDARD_LAYER";

    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) {
          final isDark = Theme.of(ctx).brightness == Brightness.dark;
          final surfaceColor = isDark ? AppColors.surfaceDark : AppColors.surfaceLight;
          final borderColor = isDark ? AppColors.borderDark : AppColors.borderLight;
          final healthState = ref.watch(healthProvider);

          return Container(
            decoration: BoxDecoration(
              color: surfaceColor,
              borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
              border: Border.all(color: borderColor),
            ),
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
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
                const SizedBox(height: 16),
                const Text(
                  "Générer le Programme Prophylactique",
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 6),
                const Text(
                  "Crée automatiquement toutes les étapes vaccinales et vermifuges standard adaptées à l'Afrique de l'Ouest.",
                  style: TextStyle(fontSize: 12, color: AppColors.textMutedLight),
                ),
                const SizedBox(height: 16),

                // Bande
                const Text("Bande concernée *", style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                const SizedBox(height: 6),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  decoration: BoxDecoration(
                    color: isDark ? Colors.grey.shade900 : Colors.grey.shade100,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: borderColor),
                  ),
                  child: DropdownButtonHideUnderline(
                    child: DropdownButton<String>(
                      value: selectedFlockId,
                      isExpanded: true,
                      items: flockState.flocks.map((flock) {
                        return DropdownMenuItem<String>(
                          value: flock.id,
                          child: Text(
                            "${flock.name} (${flock.typeLabel})",
                            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                          ),
                        );
                      }).toList(),
                      onChanged: (val) {
                        if (val != null) setModalState(() => selectedFlockId = val);
                      },
                    ),
                  ),
                ),
                const SizedBox(height: 14),

                // Modèle de programme
                const Text("Protocole prophylactique *", style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                const SizedBox(height: 8),

                InkWell(
                  onTap: () => setModalState(() => programType = "STANDARD_LAYER"),
                  borderRadius: BorderRadius.circular(12),
                  child: Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: programType == "STANDARD_LAYER"
                          ? AppColors.primary.withValues(alpha: 0.12)
                          : (isDark ? Colors.grey.shade900 : Colors.grey.shade100),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: programType == "STANDARD_LAYER"
                            ? AppColors.primary
                            : (isDark ? AppColors.borderDark : AppColors.borderLight),
                        width: programType == "STANDARD_LAYER" ? 1.5 : 1.0,
                      ),
                    ),
                    child: Row(
                      children: [
                        Icon(
                          programType == "STANDARD_LAYER" ? Icons.radio_button_checked : Icons.radio_button_off,
                          color: programType == "STANDARD_LAYER" ? AppColors.primary : AppColors.textMutedLight,
                          size: 20,
                        ),
                        const SizedBox(width: 10),
                        const Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                "Poules Pondeuses (Standard Ouest-Africain)",
                                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                              ),
                              SizedBox(height: 2),
                              Text(
                                "Newcastle, Gumboro, Variole aviaire, Vermifuge, Bronchite (0 à 20 sem.)",
                                style: TextStyle(fontSize: 11, color: AppColors.textMutedLight),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 8),

                InkWell(
                  onTap: () => setModalState(() => programType = "STANDARD_BROILER"),
                  borderRadius: BorderRadius.circular(12),
                  child: Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: programType == "STANDARD_BROILER"
                          ? AppColors.primary.withValues(alpha: 0.12)
                          : (isDark ? Colors.grey.shade900 : Colors.grey.shade100),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: programType == "STANDARD_BROILER"
                            ? AppColors.primary
                            : (isDark ? AppColors.borderDark : AppColors.borderLight),
                        width: programType == "STANDARD_BROILER" ? 1.5 : 1.0,
                      ),
                    ),
                    child: Row(
                      children: [
                        Icon(
                          programType == "STANDARD_BROILER" ? Icons.radio_button_checked : Icons.radio_button_off,
                          color: programType == "STANDARD_BROILER" ? AppColors.primary : AppColors.textMutedLight,
                          size: 20,
                        ),
                        const SizedBox(width: 10),
                        const Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                "Poulets de Chair (Cycle court 45 jours)",
                                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                              ),
                              SizedBox(height: 2),
                              Text(
                                "Vaccination accélérée J1, J7, J14, J21 + Vitamines de démarrage",
                                style: TextStyle(fontSize: 11, color: AppColors.textMutedLight),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 16),

                // Boutons
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () => Navigator.pop(ctx),
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        child: const Text("Annuler"),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: ElevatedButton(
                        onPressed: !healthState.isSubmitting
                            ? () async {
                                final messenger = ScaffoldMessenger.of(context);
                                final navigator = Navigator.of(ctx);

                                final success = await ref.read(healthProvider.notifier).generateStandardProgram(
                                  selectedFlockId,
                                  programType,
                                );

                                if (ctx.mounted) {
                                  if (success) {
                                    navigator.pop();
                                    messenger.showSnackBar(
                                      const SnackBar(
                                        content: Text("Programme prophylactique généré avec succès !"),
                                        backgroundColor: AppColors.success,
                                      ),
                                    );
                                  } else {
                                    final err = ref.read(healthProvider).error ?? "Une erreur est survenue.";
                                    messenger.showSnackBar(
                                      SnackBar(content: Text(err), backgroundColor: AppColors.danger),
                                    );
                                  }
                                }
                              }
                            : null,
                        style: ElevatedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          backgroundColor: AppColors.primary,
                          foregroundColor: Colors.white,
                        ),
                        child: healthState.isSubmitting
                            ? const BrandLoader.button()
                            : const Text("Générer"),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final healthState = ref.watch(healthProvider);
    final summary = healthState.summary;

    final filteredList = healthState.treatments.where((t) {
      if (_activeTabFilter == 'SCHEDULED') return t.isScheduled;
      if (_activeTabFilter == 'COMPLETED') return t.isCompleted;
      if (_activeTabFilter == 'OVERDUE') return t.isOverdue;
      return true;
    }).toList();

    return Scaffold(
      appBar: AppBar(
        leading: Navigator.of(context).canPop()
            ? IconButton(
                icon: const Icon(Icons.arrow_back_rounded),
                tooltip: "Retour",
                onPressed: () => Navigator.of(context).pop(),
              )
            : IconButton(
                icon: const Icon(Icons.menu_rounded),
                tooltip: "Menu",
                onPressed: widget.onOpenMenu ?? () => Scaffold.of(context).openDrawer(),
              ),
        title: const Text("Santé & Traitements"),
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
            icon: const Icon(Icons.refresh_rounded),
            tooltip: "Actualiser",
            onPressed: () => ref.read(healthProvider.notifier).loadTreatments(),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        heroTag: 'fab_health',
        onPressed: _openCreateTreatmentDialog,
        backgroundColor: AppColors.primary,
        icon: const Icon(Icons.add, color: Colors.white),
        label: const Text("Nouveau soin", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
      ),
      body: RefreshIndicator(
        onRefresh: () => ref.read(healthProvider.notifier).loadTreatments(showLoading: false),
        child: healthState.isLoading
            ? const Center(child: BrandLoader(message: "Chargement des soins sanitaires..."))
            : SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 90),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // En-tête simple et aéré (sans carte encombrante)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 12, top: 4),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Text(
                                    "${summary.pendingCount}",
                                    style: TextStyle(
                                      fontSize: 22,
                                      fontWeight: FontWeight.w900,
                                      fontFamily: 'monospace',
                                      color: summary.overdueCount > 0 ? AppColors.danger : AppColors.primary,
                                    ),
                                  ),
                                  const SizedBox(width: 4),
                                  const Text(
                                    "soin(s) à réaliser",
                                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
                                  ),
                                ],
                              ),
                              Text(
                                "${summary.completedCount} administrés${summary.overdueCount > 0 ? ' • ${summary.overdueCount} en retard !' : ''}",
                                style: TextStyle(
                                  fontSize: 11,
                                  color: summary.overdueCount > 0 ? AppColors.danger : AppColors.textMutedLight,
                                  fontWeight: summary.overdueCount > 0 ? FontWeight.bold : FontWeight.normal,
                                ),
                              ),
                            ],
                          ),
                          Row(
                            children: [
                              OutlinedButton(
                                onPressed: _openGenerateProgramDialog,
                                style: OutlinedButton.styleFrom(
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                ),
                                child: const Text("Programme", style: TextStyle(fontSize: 12)),
                              ),
                              const SizedBox(width: 6),
                              ElevatedButton(
                                onPressed: _openCreateTreatmentDialog,
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: AppColors.primary,
                                  foregroundColor: Colors.white,
                                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                ),
                                child: const Text("Nouveau", style: TextStyle(fontSize: 12)),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),

                    // Filtres par onglets segmentés mobile
                    Container(
                      decoration: BoxDecoration(
                        color: isDark ? Colors.grey.shade900 : Colors.grey.shade200,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      padding: const EdgeInsets.all(4),
                      child: Row(
                        children: [
                          Expanded(
                            child: InkWell(
                              onTap: () => setState(() => _activeTabFilter = 'ALL'),
                              borderRadius: BorderRadius.circular(10),
                              child: Container(
                                padding: const EdgeInsets.symmetric(vertical: 8),
                                decoration: BoxDecoration(
                                  color: _activeTabFilter == 'ALL'
                                      ? (isDark ? AppColors.surfaceDark : Colors.white)
                                      : Colors.transparent,
                                  borderRadius: BorderRadius.circular(10),
                                  boxShadow: _activeTabFilter == 'ALL'
                                      ? [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 4)]
                                      : null,
                                ),
                                alignment: Alignment.center,
                                child: Text(
                                  "Tous (${healthState.treatments.length})",
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: _activeTabFilter == 'ALL' ? FontWeight.bold : FontWeight.w500,
                                    color: _activeTabFilter == 'ALL' ? AppColors.primary : AppColors.textMutedLight,
                                  ),
                                ),
                              ),
                            ),
                          ),
                          Expanded(
                            child: InkWell(
                              onTap: () => setState(() => _activeTabFilter = 'SCHEDULED'),
                              borderRadius: BorderRadius.circular(10),
                              child: Container(
                                padding: const EdgeInsets.symmetric(vertical: 8),
                                decoration: BoxDecoration(
                                  color: _activeTabFilter == 'SCHEDULED'
                                      ? (isDark ? AppColors.surfaceDark : Colors.white)
                                      : Colors.transparent,
                                  borderRadius: BorderRadius.circular(10),
                                  boxShadow: _activeTabFilter == 'SCHEDULED'
                                      ? [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 4)]
                                      : null,
                                ),
                                alignment: Alignment.center,
                                child: Text(
                                  "À faire",
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: _activeTabFilter == 'SCHEDULED' ? FontWeight.bold : FontWeight.w500,
                                    color: _activeTabFilter == 'SCHEDULED' ? AppColors.primary : AppColors.textMutedLight,
                                  ),
                                ),
                              ),
                            ),
                          ),
                          Expanded(
                            child: InkWell(
                              onTap: () => setState(() => _activeTabFilter = 'OVERDUE'),
                              borderRadius: BorderRadius.circular(10),
                              child: Container(
                                padding: const EdgeInsets.symmetric(vertical: 8),
                                decoration: BoxDecoration(
                                  color: _activeTabFilter == 'OVERDUE'
                                      ? (isDark ? AppColors.surfaceDark : Colors.white)
                                      : Colors.transparent,
                                  borderRadius: BorderRadius.circular(10),
                                  boxShadow: _activeTabFilter == 'OVERDUE'
                                      ? [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 4)]
                                      : null,
                                ),
                                alignment: Alignment.center,
                                child: Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Text(
                                      "En retard",
                                      style: TextStyle(
                                        fontSize: 11,
                                        fontWeight: _activeTabFilter == 'OVERDUE' ? FontWeight.bold : FontWeight.w500,
                                        color: _activeTabFilter == 'OVERDUE' ? AppColors.danger : AppColors.textMutedLight,
                                      ),
                                    ),
                                    if (summary.overdueCount > 0) ...[
                                      const SizedBox(width: 4),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                                        decoration: BoxDecoration(
                                          color: AppColors.danger,
                                          borderRadius: BorderRadius.circular(8),
                                        ),
                                        child: Text(
                                          "${summary.overdueCount}",
                                          style: const TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.bold),
                                        ),
                                      ),
                                    ],
                                  ],
                                ),
                              ),
                            ),
                          ),
                          Expanded(
                            child: InkWell(
                              onTap: () => setState(() => _activeTabFilter = 'COMPLETED'),
                              borderRadius: BorderRadius.circular(10),
                              child: Container(
                                padding: const EdgeInsets.symmetric(vertical: 8),
                                decoration: BoxDecoration(
                                  color: _activeTabFilter == 'COMPLETED'
                                      ? (isDark ? AppColors.surfaceDark : Colors.white)
                                      : Colors.transparent,
                                  borderRadius: BorderRadius.circular(10),
                                  boxShadow: _activeTabFilter == 'COMPLETED'
                                      ? [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 4)]
                                      : null,
                                ),
                                alignment: Alignment.center,
                                child: Text(
                                  "Faits",
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: _activeTabFilter == 'COMPLETED' ? FontWeight.bold : FontWeight.w500,
                                    color: _activeTabFilter == 'COMPLETED' ? AppColors.success : AppColors.textMutedLight,
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 14),

                    // Titre Liste
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          "Interventions & Soins",
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                        ),
                        Text(
                          "${filteredList.length} intervention(s)",
                          style: const TextStyle(fontSize: 12, color: AppColors.textMutedLight),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),

                    // État vide
                    if (filteredList.isEmpty)
                      Container(
                        padding: const EdgeInsets.all(28),
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                          color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                            color: isDark ? AppColors.borderDark : AppColors.borderLight,
                          ),
                        ),
                        child: Column(
                          children: [
                            Icon(Icons.medical_services_outlined, size: 48, color: AppColors.primary.withValues(alpha: 0.6)),
                            const SizedBox(height: 12),
                            const Text(
                              "Aucun soin dans cette catégorie",
                              style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                            ),
                            const SizedBox(height: 6),
                            const Text(
                              "Générez un programme vaccinal complet en un clic ou planifiez une intervention ponctuelle.",
                              textAlign: TextAlign.center,
                              style: TextStyle(fontSize: 12, color: AppColors.textMutedLight),
                            ),
                            const SizedBox(height: 16),
                            ElevatedButton.icon(
                              onPressed: _openGenerateProgramDialog,
                              icon: const Icon(Icons.auto_awesome, size: 18),
                              label: const Text("Générer le programme"),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppColors.primary,
                                foregroundColor: Colors.white,
                              ),
                            ),
                          ],
                        ),
                      )
                    else
                      ListView.separated(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        itemCount: filteredList.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 10),
                        itemBuilder: (context, index) {
                          final item = filteredList[index];

                          final Color typeColor = switch (item.type) {
                            'VACCINATION' => AppColors.primary,
                            'ANTIBIOTIC' => AppColors.accent,
                            'DEWORMING' => AppColors.primaryLight,
                            'VITAMIN' => AppColors.success,
                            _ => AppColors.primary,
                          };

                          return Card(
                            child: Padding(
                              padding: const EdgeInsets.all(14),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      // Badge Type Icon
                                      Container(
                                        padding: const EdgeInsets.all(8),
                                        decoration: BoxDecoration(
                                          color: typeColor.withValues(alpha: 0.12),
                                          borderRadius: BorderRadius.circular(10),
                                        ),
                                        child: Icon(Icons.vaccines_rounded, color: typeColor, size: 20),
                                      ),
                                      const SizedBox(width: 10),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              item.title,
                                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                                            ),
                                            const SizedBox(height: 2),
                                            Text(
                                              item.flockName,
                                              style: const TextStyle(
                                                fontSize: 12,
                                                fontWeight: FontWeight.w600,
                                                color: AppColors.textMutedLight,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                      // Statut Badge
                                      if (item.isCompleted)
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                          decoration: BoxDecoration(
                                            color: AppColors.success.withValues(alpha: 0.12),
                                            borderRadius: BorderRadius.circular(6),
                                            border: Border.all(color: AppColors.success.withValues(alpha: 0.3)),
                                          ),
                                          child: const Row(
                                            mainAxisSize: MainAxisSize.min,
                                            children: [
                                              Icon(Icons.check_circle_rounded, size: 12, color: AppColors.success),
                                              SizedBox(width: 4),
                                              Text(
                                                "Administré",
                                                style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.success),
                                              ),
                                            ],
                                          ),
                                        )
                                      else if (item.isOverdue)
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                          decoration: BoxDecoration(
                                            color: AppColors.danger.withValues(alpha: 0.12),
                                            borderRadius: BorderRadius.circular(6),
                                            border: Border.all(color: AppColors.danger.withValues(alpha: 0.3)),
                                          ),
                                          child: const Row(
                                            mainAxisSize: MainAxisSize.min,
                                            children: [
                                              Icon(Icons.warning_rounded, size: 12, color: AppColors.danger),
                                              SizedBox(width: 4),
                                              Text(
                                                "En retard",
                                                style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.danger),
                                              ),
                                            ],
                                          ),
                                        )
                                      else
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                          decoration: BoxDecoration(
                                            color: AppColors.primarySoft,
                                            borderRadius: BorderRadius.circular(6),
                                            border: Border.all(color: AppColors.primary.withValues(alpha: 0.3)),
                                          ),
                                          child: const Text(
                                            "Prévu",
                                            style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.primary),
                                          ),
                                        ),
                                    ],
                                  ),
                                  const SizedBox(height: 10),

                                  // Détails : Date, Âge, Méthode
                                  Wrap(
                                    spacing: 8,
                                    runSpacing: 6,
                                    children: [
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                        decoration: BoxDecoration(
                                          color: isDark ? Colors.grey.shade900 : Colors.grey.shade200,
                                          borderRadius: BorderRadius.circular(6),
                                        ),
                                        child: Row(
                                          mainAxisSize: MainAxisSize.min,
                                          children: [
                                            const Icon(Icons.event_rounded, size: 12, color: AppColors.textMutedLight),
                                            const SizedBox(width: 4),
                                            Text(
                                              item.isCompleted && item.administeredDate != null
                                                  ? "Fait le: ${item.administeredDate}"
                                                  : "Date: ${item.scheduledDate}",
                                              style: const TextStyle(fontSize: 11),
                                            ),
                                          ],
                                        ),
                                      ),
                                      if (item.targetAgeDays != null)
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                          decoration: BoxDecoration(
                                            color: isDark ? Colors.grey.shade900 : Colors.grey.shade200,
                                            borderRadius: BorderRadius.circular(6),
                                          ),
                                          child: Row(
                                            mainAxisSize: MainAxisSize.min,
                                            children: [
                                              const Icon(Icons.timer_outlined, size: 12, color: AppColors.textMutedLight),
                                              const SizedBox(width: 4),
                                              Text(
                                                "Âge: J${item.targetAgeDays}",
                                                style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600),
                                              ),
                                            ],
                                          ),
                                        ),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                        decoration: BoxDecoration(
                                          color: isDark ? Colors.grey.shade900 : Colors.grey.shade200,
                                          borderRadius: BorderRadius.circular(6),
                                        ),
                                        child: Text(
                                          item.administrationMethodLabel,
                                          style: const TextStyle(fontSize: 11, color: AppColors.textMutedLight),
                                        ),
                                      ),
                                    ],
                                  ),

                                  // Notes / Vétérinaire si présent
                                  if (item.veterinarian != null && item.veterinarian!.isNotEmpty) ...[
                                    const SizedBox(height: 6),
                                    Text(
                                      "Vétérinaire : ${item.veterinarian}",
                                      style: const TextStyle(fontSize: 11, fontStyle: FontStyle.italic, color: AppColors.textMutedLight),
                                    ),
                                  ],
                                  if (item.notes != null && item.notes!.isNotEmpty) ...[
                                    const SizedBox(height: 4),
                                    Text(
                                      "Note : ${item.notes}",
                                      style: const TextStyle(fontSize: 11, color: AppColors.textMutedLight),
                                    ),
                                  ],

                                  // Bouton action rapide : Si SCHEDULED, bouton "Marquer administré"
                                  if (item.isScheduled) ...[
                                    const SizedBox(height: 10),
                                    SizedBox(
                                      width: double.infinity,
                                      child: OutlinedButton.icon(
                                        onPressed: () => _openCompleteDialog(item),
                                        icon: const Icon(Icons.done_all_rounded, size: 16),
                                        label: const Text("Valider l'administration"),
                                        style: OutlinedButton.styleFrom(
                                          foregroundColor: AppColors.success,
                                          side: BorderSide(color: AppColors.success.withValues(alpha: 0.5)),
                                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                          padding: const EdgeInsets.symmetric(vertical: 8),
                                        ),
                                      ),
                                    ),
                                  ],
                                ],
                              ),
                            ),
                          );
                        },
                      ),
                  ],
                ),
              ),
      ),
    );
  }
}

