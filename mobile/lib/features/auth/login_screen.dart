import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/config/app_config.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/brand_loader.dart';
import 'auth_provider.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  // Mode : 0 = Connexion, 1 = Inscription
  int _tabIndex = 0;

  // Formulaires
  final _loginFormKey = GlobalKey<FormState>();
  final _registerFormKey = GlobalKey<FormState>();

  // Contrôleurs Connexion
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _serverUrlController = TextEditingController();

  // Contrôleurs Inscription
  final _regFirstNameController = TextEditingController();
  final _regLastNameController = TextEditingController();
  final _regEmailController = TextEditingController();
  final _regPhoneController = TextEditingController();
  final _regPasswordController = TextEditingController();
  final _regFarmNameController = TextEditingController();
  final _regCityController = TextEditingController();
  String _regProductionType = "LAYER"; // LAYER, BROILER, MIXED

  bool _obscurePassword = true;
  bool _obscureRegPassword = true;
  bool _showServerSettings = false;

  @override
  void initState() {
    super.initState();
    _loadCurrentServerUrl();
  }

  Future<void> _loadCurrentServerUrl() async {
    final resolved = await AppConfig.resolveApiBaseUrl();
    _serverUrlController.text = resolved;
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _serverUrlController.dispose();
    _regFirstNameController.dispose();
    _regLastNameController.dispose();
    _regEmailController.dispose();
    _regPhoneController.dispose();
    _regPasswordController.dispose();
    _regFarmNameController.dispose();
    _regCityController.dispose();
    super.dispose();
  }

  Future<void> _submitLogin() async {
    if (!_loginFormKey.currentState!.validate()) return;

    if (_showServerSettings && _serverUrlController.text.trim().isNotEmpty) {
      await AppConfig.setCustomApiBaseUrl(_serverUrlController.text.trim());
    }

    final success = await ref.read(authProvider.notifier).login(
      _emailController.text,
      _passwordController.text,
    );

    if (success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text("Connexion réussie ! Bienvenue sur Le Fermier."),
          backgroundColor: AppColors.primary,
          duration: Duration(seconds: 2),
        ),
      );
    }
  }

  Future<void> _submitRegister() async {
    if (!_registerFormKey.currentState!.validate()) return;

    if (_showServerSettings && _serverUrlController.text.trim().isNotEmpty) {
      await AppConfig.setCustomApiBaseUrl(_serverUrlController.text.trim());
    }

    final success = await ref.read(authProvider.notifier).register(
      firstName: _regFirstNameController.text,
      lastName: _regLastNameController.text,
      email: _regEmailController.text,
      password: _regPasswordController.text,
      phone: _regPhoneController.text,
      farmName: _regFarmNameController.text,
      productionType: _regProductionType,
      locationCity: _regCityController.text,
    );

    if (success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text("Exploitation '${_regFarmNameController.text}' créée avec succès !"),
          backgroundColor: AppColors.success,
          duration: const Duration(seconds: 3),
        ),
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
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Logo & En-tête de marque
                Center(
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: AppColors.primarySoft,
                      shape: BoxShape.circle,
                      border: Border.all(
                        color: AppColors.primary.withValues(alpha: 0.3),
                        width: 2,
                      ),
                    ),
                    child: const Icon(
                      Icons.egg_alt_rounded,
                      size: 44,
                      color: AppColors.primary,
                    ),
                  ),
                ),
                const SizedBox(height: 14),
                const Text(
                  "Le Fermier",
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 26,
                    fontWeight: FontWeight.w900,
                    color: AppColors.primary,
                    letterSpacing: -0.5,
                  ),
                ),
                const SizedBox(height: 4),
                const Text(
                  "Gestion d'exploitations avicoles",
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 13,
                    color: AppColors.textMutedLight,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 24),

                // Carte Principale avec Onglets Connexion / Inscription
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
                      // Sélecteur d'onglets épuré
                      Container(
                        padding: const EdgeInsets.all(4),
                        decoration: BoxDecoration(
                          color: isDark ? AppColors.backgroundDark : AppColors.backgroundLight,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: borderColor),
                        ),
                        child: Row(
                          children: [
                            Expanded(
                              child: InkWell(
                                onTap: () => setState(() => _tabIndex = 0),
                                borderRadius: BorderRadius.circular(10),
                                child: Container(
                                  padding: const EdgeInsets.symmetric(vertical: 9),
                                  decoration: BoxDecoration(
                                    color: _tabIndex == 0 ? AppColors.primary : Colors.transparent,
                                    borderRadius: BorderRadius.circular(10),
                                    boxShadow: _tabIndex == 0
                                        ? [
                                            BoxShadow(
                                              color: AppColors.primary.withValues(alpha: 0.25),
                                              blurRadius: 8,
                                              offset: const Offset(0, 2),
                                            ),
                                          ]
                                        : null,
                                  ),
                                  alignment: Alignment.center,
                                  child: Text(
                                    "Connexion",
                                    style: TextStyle(
                                      fontWeight: FontWeight.bold,
                                      fontSize: 13,
                                      color: _tabIndex == 0 ? Colors.white : AppColors.textMutedLight,
                                    ),
                                  ),
                                ),
                              ),
                            ),
                            Expanded(
                              child: InkWell(
                                onTap: () => setState(() => _tabIndex = 1),
                                borderRadius: BorderRadius.circular(10),
                                child: Container(
                                  padding: const EdgeInsets.symmetric(vertical: 9),
                                  decoration: BoxDecoration(
                                    color: _tabIndex == 1 ? AppColors.primary : Colors.transparent,
                                    borderRadius: BorderRadius.circular(10),
                                    boxShadow: _tabIndex == 1
                                        ? [
                                            BoxShadow(
                                              color: AppColors.primary.withValues(alpha: 0.25),
                                              blurRadius: 8,
                                              offset: const Offset(0, 2),
                                            ),
                                          ]
                                        : null,
                                  ),
                                  alignment: Alignment.center,
                                  child: Text(
                                    "Créer un compte",
                                    style: TextStyle(
                                      fontWeight: FontWeight.bold,
                                      fontSize: 13,
                                      color: _tabIndex == 1 ? Colors.white : AppColors.textMutedLight,
                                    ),
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 18),

                      // Message d'erreur global si présent
                      if (authState.error != null) ...[
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                          decoration: BoxDecoration(
                            color: AppColors.danger.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: AppColors.danger.withValues(alpha: 0.3)),
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.error_outline_rounded, color: AppColors.danger, size: 18),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  authState.error!,
                                  style: const TextStyle(
                                    color: AppColors.danger,
                                    fontSize: 12,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 14),
                      ],

                      // FORMULAIRE 1 : CONNEXION
                      if (_tabIndex == 0)
                        Form(
                          key: _loginFormKey,
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              TextFormField(
                                controller: _emailController,
                                keyboardType: TextInputType.emailAddress,
                                decoration: const InputDecoration(
                                  labelText: "Adresse email",
                                  hintText: "exemple@ferme.com",
                                  prefixIcon: Icon(Icons.mail_outline_rounded, size: 20),
                                ),
                                validator: (value) {
                                  if (value == null || value.trim().isEmpty) {
                                    return "Veuillez saisir votre email.";
                                  }
                                  if (!value.contains("@") || !value.contains(".")) {
                                    return "Adresse email invalide.";
                                  }
                                  return null;
                                },
                              ),
                              const SizedBox(height: 14),
                              TextFormField(
                                controller: _passwordController,
                                obscureText: _obscurePassword,
                                decoration: InputDecoration(
                                  labelText: "Mot de passe",
                                  prefixIcon: const Icon(Icons.lock_outline_rounded, size: 20),
                                  suffixIcon: IconButton(
                                    icon: Icon(
                                      _obscurePassword ? Icons.visibility_outlined : Icons.visibility_off_outlined,
                                      size: 20,
                                    ),
                                    onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                                  ),
                                ),
                                validator: (value) {
                                  if (value == null || value.isEmpty) {
                                    return "Veuillez saisir votre mot de passe.";
                                  }
                                  return null;
                                },
                              ),
                              const SizedBox(height: 20),
                              ElevatedButton(
                                onPressed: authState.isLoading ? null : _submitLogin,
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: AppColors.primary,
                                  padding: const EdgeInsets.symmetric(vertical: 14),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                ),
                                child: authState.isLoading
                                    ? const BrandLoader.button()
                                    : const Text(
                                        "Se connecter",
                                        style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Colors.white),
                                      ),
                              ),
                            ],
                          ),
                        ),

                      // FORMULAIRE 2 : INSCRIPTION (ÉLEVEUR & FERME)
                      if (_tabIndex == 1)
                        Form(
                          key: _registerFormKey,
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              // Prénom & Nom
                              Row(
                                children: [
                                  Expanded(
                                    child: TextFormField(
                                      controller: _regFirstNameController,
                                      textCapitalization: TextCapitalization.words,
                                      decoration: const InputDecoration(
                                        labelText: "Prénom *",
                                        prefixIcon: Icon(Icons.person_outline_rounded, size: 20),
                                      ),
                                      validator: (v) => (v == null || v.trim().isEmpty) ? "Requis" : null,
                                    ),
                                  ),
                                  const SizedBox(width: 10),
                                  Expanded(
                                    child: TextFormField(
                                      controller: _regLastNameController,
                                      textCapitalization: TextCapitalization.characters,
                                      decoration: const InputDecoration(
                                        labelText: "Nom *",
                                      ),
                                      validator: (v) => (v == null || v.trim().isEmpty) ? "Requis" : null,
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 12),

                              // Email
                              TextFormField(
                                controller: _regEmailController,
                                keyboardType: TextInputType.emailAddress,
                                decoration: const InputDecoration(
                                  labelText: "Adresse email *",
                                  hintText: "contact@ferme.com",
                                  prefixIcon: Icon(Icons.mail_outline_rounded, size: 20),
                                ),
                                validator: (v) {
                                  if (v == null || v.trim().isEmpty) return "Email obligatoire";
                                  if (!v.contains("@") || !v.contains(".")) return "Email invalide";
                                  return null;
                                },
                              ),
                              const SizedBox(height: 12),

                              // Téléphone WhatsApp
                              TextFormField(
                                controller: _regPhoneController,
                                keyboardType: TextInputType.phone,
                                decoration: const InputDecoration(
                                  labelText: "Téléphone / WhatsApp",
                                  hintText: "+229 97 00 00 00",
                                  prefixIcon: Icon(Icons.phone_outlined, size: 20),
                                ),
                              ),
                              const SizedBox(height: 12),

                              // Mot de passe
                              TextFormField(
                                controller: _regPasswordController,
                                obscureText: _obscureRegPassword,
                                decoration: InputDecoration(
                                  labelText: "Mot de passe (8 car. min) *",
                                  prefixIcon: const Icon(Icons.lock_outline_rounded, size: 20),
                                  suffixIcon: IconButton(
                                    icon: Icon(
                                      _obscureRegPassword ? Icons.visibility_outlined : Icons.visibility_off_outlined,
                                      size: 20,
                                    ),
                                    onPressed: () => setState(() => _obscureRegPassword = !_obscureRegPassword),
                                  ),
                                ),
                                validator: (v) {
                                  if (v == null || v.isEmpty) return "Mot de passe obligatoire";
                                  if (v.length < 8) return "Au moins 8 caractères requis";
                                  return null;
                                },
                              ),
                              const SizedBox(height: 16),

                              // Section Exploitation
                              const Row(
                                children: [
                                  Icon(Icons.agriculture_rounded, size: 16, color: AppColors.primary),
                                  SizedBox(width: 6),
                                  Text(
                                    "VOTRE PREMIÈRE EXPLOITATION",
                                    style: TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.bold,
                                      letterSpacing: 0.6,
                                      color: AppColors.textMutedLight,
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 8),

                              TextFormField(
                                controller: _regFarmNameController,
                                decoration: const InputDecoration(
                                  labelText: "Nom de l'exploitation *",
                                  hintText: "Ex: Ferme Avicole Espoir",
                                  prefixIcon: Icon(Icons.home_work_outlined, size: 20),
                                ),
                                validator: (v) => (v == null || v.trim().isEmpty) ? "Nom de la ferme requis" : null,
                              ),
                              const SizedBox(height: 10),

                              TextFormField(
                                controller: _regCityController,
                                decoration: const InputDecoration(
                                  labelText: "Commune / Ville",
                                  hintText: "Ex: Allada, Cotonou...",
                                  prefixIcon: Icon(Icons.location_on_outlined, size: 20),
                                ),
                              ),
                              const SizedBox(height: 12),

                              // Puces de type d'élevage
                              const Text(
                                "Activité principale :",
                                style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600),
                              ),
                              const SizedBox(height: 6),
                              Row(
                                children: [
                                  _ProductionChip(
                                    label: "Pondeuses",
                                    icon: Icons.egg_rounded,
                                    selected: _regProductionType == "LAYER",
                                    color: AppColors.accent,
                                    onTap: () => setState(() => _regProductionType = "LAYER"),
                                  ),
                                  const SizedBox(width: 8),
                                  _ProductionChip(
                                    label: "Poulets Chair",
                                    icon: Icons.pets_rounded,
                                    selected: _regProductionType == "BROILER",
                                    color: AppColors.primary,
                                    onTap: () => setState(() => _regProductionType = "BROILER"),
                                  ),
                                  const SizedBox(width: 8),
                                  _ProductionChip(
                                    label: "Mixte",
                                    icon: Icons.grid_view_rounded,
                                    selected: _regProductionType == "MIXED",
                                    color: AppColors.primary,
                                    onTap: () => setState(() => _regProductionType = "MIXED"),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 20),

                              ElevatedButton(
                                onPressed: authState.isLoading ? null : _submitRegister,
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: AppColors.primary,
                                  padding: const EdgeInsets.symmetric(vertical: 14),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                ),
                                child: authState.isLoading
                                    ? const BrandLoader.button()
                                    : const Text(
                                        "Créer mon exploitation",
                                        style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Colors.white),
                                      ),
                              ),
                            ],
                          ),
                        ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),

                // Option Configuration Serveur
                Center(
                  child: TextButton.icon(
                    onPressed: () => setState(() => _showServerSettings = !_showServerSettings),
                    icon: Icon(
                      _showServerSettings ? Icons.expand_less_rounded : Icons.settings_outlined,
                      size: 16,
                      color: AppColors.textMutedLight,
                    ),
                    label: Text(
                      _showServerSettings ? "Masquer paramètres réseau" : "Paramètres de connexion serveur",
                      style: const TextStyle(fontSize: 12, color: AppColors.textMutedLight),
                    ),
                  ),
                ),

                if (_showServerSettings)
                  Container(
                    margin: const EdgeInsets.only(top: 6),
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: surfaceColor,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: borderColor),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          "Adresse du serveur API",
                          style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 4),
                        const Text(
                          "Permet de renseigner l'IP de la ferme en Wi-Fi sans modifier le code.",
                          style: TextStyle(fontSize: 11, color: AppColors.textMutedLight),
                        ),
                        const SizedBox(height: 10),
                        TextFormField(
                          controller: _serverUrlController,
                          style: const TextStyle(fontSize: 12),
                          decoration: const InputDecoration(
                            hintText: "http://10.0.2.2:8000",
                            prefixIcon: Icon(Icons.dns_rounded, size: 18),
                            contentPadding: EdgeInsets.symmetric(horizontal: 10, vertical: 8),
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
    );
  }
}

class _ProductionChip extends StatelessWidget {
  final String label;
  final IconData icon;
  final bool selected;
  final Color color;
  final VoidCallback onTap;

  const _ProductionChip({
    required this.label,
    required this.icon,
    required this.selected,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(10),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 8),
          decoration: BoxDecoration(
            color: selected ? color.withValues(alpha: 0.12) : Colors.transparent,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: selected ? color : AppColors.borderLight,
              width: selected ? 1.5 : 1,
            ),
          ),
          child: Column(
            children: [
              Icon(icon, size: 16, color: selected ? color : AppColors.textMutedLight),
              const SizedBox(height: 4),
              Text(
                label,
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: selected ? FontWeight.bold : FontWeight.w500,
                  color: selected ? color : AppColors.textMutedLight,
                ),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ),
    );
  }
}