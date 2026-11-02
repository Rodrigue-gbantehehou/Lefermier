import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/theme/app_theme.dart';
import '../navigation/bottom_nav_scaffold.dart';
import 'auth_provider.dart';

class FarmOnboardingScreen extends ConsumerStatefulWidget {
  const FarmOnboardingScreen({super.key});

  @override
  ConsumerState<FarmOnboardingScreen> createState() => _FarmOnboardingScreenState();
}

class _FarmOnboardingScreenState extends ConsumerState<FarmOnboardingScreen> {
  final _formKey = GlobalKey<FormState>();

  final _farmNameController = TextEditingController();
  final _cityController = TextEditingController();
  final _codeController = TextEditingController();
  final _phoneController = TextEditingController();

  // Type d'élevage : LAYER, BROILER, MIXED
  String _productionType = 'LAYER';

  @override
  void dispose() {
    _farmNameController.dispose();
    _cityController.dispose();
    _codeController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  Future<void> _submitFarm() async {
    if (!_formKey.currentState!.validate()) return;

    final success = await ref.read(authProvider.notifier).createFarm(
      name: _farmNameController.text.trim(),
      code: _codeController.text.trim().isNotEmpty ? _codeController.text.trim() : null,
      productionType: _productionType,
      locationCity: _cityController.text.trim().isNotEmpty ? _cityController.text.trim() : null,
      phone: _phoneController.text.trim().isNotEmpty ? _phoneController.text.trim() : null,
    );

    if (success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text("Exploitation '${_farmNameController.text.trim()}' configurée avec succès !"),
          backgroundColor: AppColors.success,
          duration: const Duration(seconds: 3),
        ),
      );

      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(builder: (_) => const BottomNavScaffold()),
        (route) => false,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final surfaceColor = isDark ? AppColors.surfaceDark : AppColors.surfaceLight;
    final borderColor = isDark ? AppColors.borderDark : AppColors.borderLight;

    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Badge Étape 2 sur 2
                  Center(
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                      decoration: BoxDecoration(
                        color: AppColors.primarySoft,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                          color: AppColors.primary.withValues(alpha: 0.3),
                          width: 1,
                        ),
                      ),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.flag_rounded, size: 14, color: AppColors.primary),
                          SizedBox(width: 6),
                          Text(
                            "ÉTAPE 2 SUR 2 · CONFIGURATION",
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w800,
                              color: AppColors.primary,
                              letterSpacing: 0.8,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 14),

                  // Titre et Description d'onboarding
                  const Text(
                    "Donnez vie à votre exploitation",
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.w900,
                      color: AppColors.primaryHover,
                      letterSpacing: -0.5,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    "Ces informations personnalisent automatiquement vos courbes de ponte, la gestion de vos bandes et vos ratios de rentabilité.",
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 13,
                      color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                      height: 1.4,
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Carte Formulaire Exploitation
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: surfaceColor,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: borderColor),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.04),
                          blurRadius: 16,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        // Champ : Nom de l'exploitation
                        TextFormField(
                          controller: _farmNameController,
                          textCapitalization: TextCapitalization.words,
                          decoration: const InputDecoration(
                            labelText: "Nom de l'exploitation *",
                            hintText: "Ex : Ferme Avicole Espoir",
                            prefixIcon: Icon(Icons.agriculture_rounded),
                          ),
                          validator: (value) {
                            if (value == null || value.trim().isEmpty) {
                              return "Le nom de l'exploitation est requis";
                            }
                            if (value.trim().length < 2) {
                              return "Au moins 2 caractères requis";
                            }
                            return null;
                          },
                        ),
                        const SizedBox(height: 18),

                        // Sélection du Type d'Élevage
                        const Text(
                          "Type d'élevage principal *",
                          style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700),
                        ),
                        const SizedBox(height: 8),
                        _buildProductionOption(
                          value: 'LAYER',
                          title: "Pondeuses (Œufs de table)",
                          description: "Suivi des plateaux, pontes journalières, déclassements et courbes de ponte.",
                          icon: Icons.egg_rounded,
                          iconColor: AppColors.accent,
                          isSelected: _productionType == 'LAYER',
                          isDark: isDark,
                        ),
                        const SizedBox(height: 8),
                        _buildProductionOption(
                          value: 'BROILER',
                          title: "Poulets de Chair",
                          description: "Suivi de croissance rapide, pesées, gain moyen quotidien (GMQ) et abattage.",
                          icon: Icons.restaurant_rounded,
                          iconColor: AppColors.dangerRose,
                          isSelected: _productionType == 'BROILER',
                          isDark: isDark,
                        ),
                        const SizedBox(height: 8),
                        _buildProductionOption(
                          value: 'MIXED',
                          title: "Élevage Mixte (Polyvalent)",
                          description: "Gestion simultanée de bandes de pondeuses et de lots de poulets de chair.",
                          icon: Icons.hub_rounded,
                          iconColor: AppColors.primary,
                          isSelected: _productionType == 'MIXED',
                          isDark: isDark,
                        ),
                        const SizedBox(height: 18),

                        // Ville / Commune
                        TextFormField(
                          controller: _cityController,
                          textCapitalization: TextCapitalization.words,
                          decoration: const InputDecoration(
                            labelText: "Ville ou Commune",
                            hintText: "Ex : Abomey-Calavi, Ouidah, Thiès...",
                            prefixIcon: Icon(Icons.location_on_outlined),
                          ),
                        ),
                        const SizedBox(height: 14),

                        // Code court optionnel
                        TextFormField(
                          controller: _codeController,
                          textCapitalization: TextCapitalization.characters,
                          decoration: const InputDecoration(
                            labelText: "Code abrégé (Optionnel)",
                            hintText: "Ex : FAV-01",
                            prefixIcon: Icon(Icons.tag_rounded),
                          ),
                        ),
                        const SizedBox(height: 24),

                        // Affichage d'erreur éventuelle
                        if (authState.error != null)
                          Container(
                            padding: const EdgeInsets.all(12),
                            margin: const EdgeInsets.only(bottom: 16),
                            decoration: BoxDecoration(
                              color: AppColors.danger.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(color: AppColors.danger.withValues(alpha: 0.3)),
                            ),
                            child: Row(
                              children: [
                                const Icon(Icons.error_outline_rounded, color: AppColors.danger, size: 20),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    authState.error!,
                                    style: const TextStyle(color: AppColors.danger, fontSize: 13),
                                  ),
                                ),
                              ],
                            ),
                          ),

                        // Bouton Finaliser
                        ElevatedButton(
                          onPressed: authState.isLoading ? null : _submitFarm,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.primary,
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 16),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(14),
                            ),
                            elevation: 3,
                          ),
                          child: authState.isLoading
                              ? const SizedBox(
                                  height: 22,
                                  width: 22,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2.5,
                                    valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                                  ),
                                )
                              : const Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Text(
                                      "Démarrer mon exploitation",
                                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                                    ),
                                    SizedBox(width: 8),
                                    Icon(Icons.arrow_forward_rounded, size: 20),
                                  ],
                                ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildProductionOption({
    required String value,
    required String title,
    required String description,
    required IconData icon,
    required Color iconColor,
    required bool isSelected,
    required bool isDark,
  }) {
    final borderColor = isSelected
        ? AppColors.primary
        : (isDark ? AppColors.borderDark : AppColors.borderLight);

    final bgColor = isSelected
        ? AppColors.primarySoft
        : (isDark ? AppColors.backgroundDark : AppColors.backgroundLight);

    return InkWell(
      onTap: () => setState(() => _productionType = value),
      borderRadius: BorderRadius.circular(14),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: bgColor,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: borderColor,
            width: isSelected ? 2 : 1,
          ),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: iconColor.withValues(alpha: 0.15),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, color: iconColor, size: 20),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        title,
                        style: TextStyle(
                          fontSize: 13.5,
                          fontWeight: FontWeight.bold,
                          color: isSelected ? AppColors.primaryHover : null,
                        ),
                      ),
                      if (isSelected)
                        const Icon(
                          Icons.check_circle_rounded,
                          color: AppColors.primary,
                          size: 18,
                        ),
                    ],
                  ),
                  const SizedBox(height: 2),
                  Text(
                    description,
                    style: TextStyle(
                      fontSize: 11,
                      color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                      height: 1.3,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
