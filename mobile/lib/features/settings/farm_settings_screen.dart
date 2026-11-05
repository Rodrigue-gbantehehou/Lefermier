import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/models/farm.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/theme_provider.dart';
import '../../core/widgets/brand_loader.dart';
import '../auth/auth_provider.dart';

class FarmSettingsScreen extends ConsumerStatefulWidget {
  final VoidCallback? onBack;
  final VoidCallback? onOpenMenu;

  const FarmSettingsScreen({super.key, this.onBack, this.onOpenMenu});

  @override
  ConsumerState<FarmSettingsScreen> createState() => _FarmSettingsScreenState();
}

class _FarmSettingsScreenState extends ConsumerState<FarmSettingsScreen> {
  final _formKey = GlobalKey<FormState>();

  late TextEditingController _nameController;
  late TextEditingController _codeController;
  late TextEditingController _cityController;
  late TextEditingController _phoneController;
  late TextEditingController _emailController;
  late TextEditingController _addressController;
  late TextEditingController _ifuController;
  late TextEditingController _rccmController;
  late TextEditingController _descController;
  String _productionType = 'LAYER';

  bool _isInitialized = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_isInitialized) {
      final farm = ref.read(authProvider).activeFarm;
      _nameController = TextEditingController(text: farm?.name ?? "");
      _codeController = TextEditingController(text: farm?.code ?? "");
      _cityController = TextEditingController(text: farm?.city ?? "");
      _phoneController = TextEditingController(text: farm?.phone ?? "");
      _emailController = TextEditingController(text: farm?.email ?? "");
      _addressController = TextEditingController(text: farm?.address ?? "");
      _ifuController = TextEditingController(text: farm?.ifu ?? "");
      _rccmController = TextEditingController(text: farm?.rccm ?? "");
      _descController = TextEditingController(text: farm?.description ?? "");
      _productionType = farm?.productionType ?? 'LAYER';
      _isInitialized = true;
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _codeController.dispose();
    _cityController.dispose();
    _phoneController.dispose();
    _emailController.dispose();
    _addressController.dispose();
    _ifuController.dispose();
    _rccmController.dispose();
    _descController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);
    final farm = authState.activeFarm;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    if (farm == null) {
      return Scaffold(
        appBar: AppBar(
          leading: widget.onBack != null
              ? IconButton(
                  icon: const Icon(Icons.arrow_back_rounded),
                  onPressed: widget.onBack,
                )
              : null,
          title: const Text("Paramètres"),
        ),
        body: const Center(
          child: Text("Aucune exploitation active sélectionnée."),
        ),
      );
    }

    final isOwner = farm.isOwner;

    return Scaffold(
      appBar: AppBar(
        leading: widget.onBack != null
            ? IconButton(
                icon: const Icon(Icons.arrow_back_rounded),
                tooltip: "Retour",
                onPressed: widget.onBack,
              )
            : (widget.onOpenMenu != null
                ? IconButton(
                    icon: const Icon(Icons.menu_rounded),
                    tooltip: "Menu",
                    onPressed: widget.onOpenMenu,
                  )
                : null),
        title: const Text("Paramètres de la ferme"),
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
        ],
      ),
      body: authState.isLoading
          ? const Center(child: BrandLoader(message: "Mise à jour en cours..."))
          : SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 90),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Badge exploitation active
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                      decoration: BoxDecoration(
                        color: AppColors.primarySoft,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: AppColors.primary.withValues(alpha: 0.25),
                        ),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.storefront_rounded, color: AppColors.primary),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  farm.name,
                                  style: const TextStyle(
                                    fontWeight: FontWeight.bold,
                                    fontSize: 14,
                                    color: AppColors.primary,
                                  ),
                                ),
                                Text(
                                  "Rôle : ${farm.role ?? 'Membre'} • Plan : ${farm.planName ?? farm.plan ?? 'Standard'}",
                                  style: const TextStyle(fontSize: 11, color: AppColors.textMutedLight),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 20),

                    // Section Identité & Profil
                    _buildSectionHeader("Identité de l'exploitation", Icons.badge_outlined),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: _nameController,
                      decoration: const InputDecoration(
                        labelText: "Nom de l'exploitation *",
                        prefixIcon: Icon(Icons.business_rounded),
                      ),
                      validator: (val) {
                        if (val == null || val.trim().isEmpty) {
                          return "Le nom de l'exploitation est obligatoire";
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: _codeController,
                      decoration: const InputDecoration(
                        labelText: "Code ou Référence courte",
                        hintText: "Ex: FERME-01",
                        prefixIcon: Icon(Icons.tag_rounded),
                      ),
                    ),
                    const SizedBox(height: 12),

                    // Type d'élevage
                    DropdownButtonFormField<String>(
                      initialValue: _productionType,
                      decoration: const InputDecoration(
                        labelText: "Type de production avicole",
                        prefixIcon: Icon(Icons.egg_alt_rounded),
                      ),
                      items: const [
                        DropdownMenuItem(value: "LAYER", child: Text("Pondeuses (Œufs de consommation)")),
                        DropdownMenuItem(value: "BROILER", child: Text("Poulets de chair")),
                        DropdownMenuItem(value: "MIXED", child: Text("Mixte / Polyvalent (Œufs & Chair)")),
                      ],
                      onChanged: (val) {
                        if (val != null) setState(() => _productionType = val);
                      },
                    ),
                    const SizedBox(height: 24),

                    // Section Coordonnées & Localisation
                    _buildSectionHeader("Coordonnées & Emplacement", Icons.location_on_outlined),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: _cityController,
                      decoration: const InputDecoration(
                        labelText: "Ville ou Commune",
                        hintText: "Ex: Allada, Calavi, Cotonou...",
                        prefixIcon: Icon(Icons.location_city_rounded),
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: _phoneController,
                      keyboardType: TextInputType.phone,
                      decoration: const InputDecoration(
                        labelText: "Numéro de téléphone d'exploitation",
                        hintText: "Ex: +229 97 00 00 00",
                        prefixIcon: Icon(Icons.phone_rounded),
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: _emailController,
                      keyboardType: TextInputType.emailAddress,
                      decoration: const InputDecoration(
                        labelText: "Adresse email professionnelle",
                        hintText: "contact@ferme.com",
                        prefixIcon: Icon(Icons.email_outlined),
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: _addressController,
                      decoration: const InputDecoration(
                        labelText: "Adresse géographique précise",
                        hintText: "Ex: Route de Tori, PK 14",
                        prefixIcon: Icon(Icons.place_outlined),
                      ),
                    ),
                    const SizedBox(height: 24),

                    // Section Mentions Légales
                    _buildSectionHeader("Mentions légales & Fiscales (Bénin / UEMOA)", Icons.receipt_long_outlined),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: TextFormField(
                            controller: _ifuController,
                            decoration: const InputDecoration(
                              labelText: "N° IFU",
                              hintText: "13 chiffres",
                              prefixIcon: Icon(Icons.credit_card_rounded),
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: TextFormField(
                            controller: _rccmController,
                            decoration: const InputDecoration(
                              labelText: "N° RCCM",
                              hintText: "Registre du Commerce",
                              prefixIcon: Icon(Icons.domain_verification_rounded),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: _descController,
                      maxLines: 2,
                      decoration: const InputDecoration(
                        labelText: "Description ou slogan",
                        hintText: "Ex: Spécialiste de la vente directe d'œufs frais calibrés...",
                        prefixIcon: Icon(Icons.notes_rounded),
                      ),
                    ),
                    const SizedBox(height: 24),

                    // Bouton Enregistrer
                    SizedBox(
                      width: double.infinity,
                      height: 48,
                      child: ElevatedButton.icon(
                        onPressed: _saveSettings,
                        icon: const Icon(Icons.save_rounded, color: Colors.white),
                        label: const Text(
                          "Enregistrer les modifications",
                          style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Colors.white),
                        ),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.primary,
                        ),
                      ),
                    ),
                    const SizedBox(height: 36),

                    // ZONE DE DANGER (Propriétaire uniquement)
                    if (isOwner) ...[
                      _buildDangerZone(context, farm, isDark),
                    ],
                  ],
                ),
              ),
            ),
    );
  }

  Widget _buildSectionHeader(String title, IconData icon) {
    return Row(
      children: [
        Icon(icon, size: 18, color: AppColors.primary),
        const SizedBox(width: 8),
        Text(
          title,
          style: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.bold,
          ),
        ),
      ],
    );
  }

  Widget _buildDangerZone(BuildContext context, Farm farm, bool isDark) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.danger.withValues(alpha: 0.06),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: AppColors.danger.withValues(alpha: 0.4),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: AppColors.danger.withValues(alpha: 0.15),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.warning_amber_rounded, color: AppColors.danger, size: 22),
              ),
              const SizedBox(width: 12),
              const Expanded(
                child: Text(
                  "Zone de danger",
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: AppColors.danger,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          const Text(
            "Supprimer cette exploitation effacera définitivement l'ensemble de ses données (bandes, pontes, stocks, caisses, bâtiments et historiques). Cette opération est irréversible.",
            style: TextStyle(fontSize: 12, height: 1.4),
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: () => _openDeleteFarmDialog(context, farm),
              icon: const Icon(Icons.delete_forever_rounded, color: AppColors.danger),
              label: const Text(
                "Supprimer l'exploitation",
                style: TextStyle(color: AppColors.danger, fontWeight: FontWeight.bold),
              ),
              style: OutlinedButton.styleFrom(
                side: const BorderSide(color: AppColors.danger),
                padding: const EdgeInsets.symmetric(vertical: 12),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _saveSettings() async {
    if (!_formKey.currentState!.validate()) return;
    final farm = ref.read(authProvider).activeFarm;
    if (farm == null) return;
    final messenger = ScaffoldMessenger.of(context);

    final success = await ref.read(authProvider.notifier).updateFarm(
          farmId: farm.id,
          name: _nameController.text.trim(),
          code: _codeController.text.trim(),
          productionType: _productionType,
          locationCity: _cityController.text.trim(),
          phone: _phoneController.text.trim(),
          email: _emailController.text.trim(),
          address: _addressController.text.trim(),
          ifu: _ifuController.text.trim(),
          rccm: _rccmController.text.trim(),
          description: _descController.text.trim(),
        );

    if (mounted) {
      if (success) {
        messenger.showSnackBar(
          const SnackBar(
            content: Text("Paramètres de l'exploitation mis à jour avec succès !"),
            backgroundColor: AppColors.success,
          ),
        );
      } else {
        final err = ref.read(authProvider).error ?? "Échec de l'enregistrement";
        messenger.showSnackBar(
          SnackBar(
            content: Text(err),
            backgroundColor: AppColors.danger,
          ),
        );
      }
    }
  }

  void _openDeleteFarmDialog(BuildContext context, Farm farm) {
    final confirmController = TextEditingController();
    bool canDelete = false;

    showDialog(
      context: context,
      builder: (dialogCtx) => StatefulBuilder(
        builder: (ctx, setDialogState) {
          return AlertDialog(
            title: const Row(
              children: [
                Icon(Icons.warning_rounded, color: AppColors.danger),
                SizedBox(width: 8),
                Text("Suppression définitive"),
              ],
            ),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  "Vous êtes sur le point de supprimer l'exploitation \"${farm.name}\". Toutes les bandes, pontes, stocks et finances seront anéantis.",
                  style: const TextStyle(fontSize: 13),
                ),
                const SizedBox(height: 14),
                const Text(
                  "Pour confirmer, veuillez saisir exactement le nom de votre exploitation ci-dessous :",
                  style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: Colors.grey.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: SelectableText(
                    farm.name,
                    style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.danger),
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: confirmController,
                  autofocus: true,
                  decoration: const InputDecoration(
                    hintText: "Saisissez le nom exact ici...",
                    border: OutlineInputBorder(),
                  ),
                  onChanged: (val) {
                    setDialogState(() {
                      canDelete = val.trim() == farm.name.trim();
                    });
                  },
                ),
              ],
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(dialogCtx),
                child: const Text("Annuler"),
              ),
              ElevatedButton(
                onPressed: !canDelete
                    ? null
                    : () async {
                        final messenger = ScaffoldMessenger.of(context);
                        final navigator = Navigator.of(context);
                        Navigator.pop(dialogCtx);
                        final success =
                            await ref.read(authProvider.notifier).deleteFarm(farm.id);
                        if (mounted) {
                          if (success) {
                            messenger.showSnackBar(
                              const SnackBar(
                                content: Text("L'exploitation a été supprimée avec succès."),
                                backgroundColor: AppColors.success,
                              ),
                            );
                            if (widget.onBack != null) {
                              widget.onBack!();
                            } else if (navigator.canPop()) {
                              navigator.pop();
                            }
                          } else {
                            final err = ref.read(authProvider).error ??
                                "Erreur lors de la suppression.";
                            messenger.showSnackBar(
                              SnackBar(
                                content: Text(err),
                                backgroundColor: AppColors.danger,
                              ),
                            );
                          }
                        }
                      },
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.danger,
                  foregroundColor: Colors.white,
                ),
                child: const Text("Confirmer la suppression"),
              ),
            ],
          );
        },
      ),
    );
  }
}
