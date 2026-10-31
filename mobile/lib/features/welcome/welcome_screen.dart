import 'package:flutter/material.dart';
import '../../core/api/api_client.dart';
import '../../core/theme/app_theme.dart';
import '../auth/login_screen.dart';
import '../auth/register_screen.dart';

class WelcomeScreen extends StatelessWidget {
  const WelcomeScreen({super.key});

  Future<void> _continueToLogin(BuildContext context) async {
    await ApiClient().setHasSeenWelcome(true);
    if (context.mounted) {
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(
          builder: (_) => const LoginScreen(),
        ),
      );
    }
  }

  Future<void> _continueToRegister(BuildContext context) async {
    await ApiClient().setHasSeenWelcome(true);
    if (context.mounted) {
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(
          builder: (_) => const RegisterScreen(),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        fit: StackFit.expand,
        children: [
          // Arrière-plan : Photographie réelle et authentique de la ferme Le Fermier
          Image.asset(
            'assets/images/poultry_farm_hero.jpg',
            fit: BoxFit.cover,
            errorBuilder: (_, __, ___) => Container(
              color: AppColors.primaryHover,
            ),
          ),

          // Voile dégradé premium pour une lisibilité parfaite des textes et boutons
          Container(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  Colors.black.withValues(alpha: 0.30),
                  Colors.black.withValues(alpha: 0.50),
                  const Color(0xFF03140E).withValues(alpha: 0.88),
                  const Color(0xFF03140E).withValues(alpha: 0.98),
                ],
                stops: const [0.0, 0.30, 0.60, 1.0],
              ),
            ),
          ),

          // Contenu interactif avec défilement pour garantir aucune coupure d'écran
          SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Barre supérieure : Badge Le Fermier + Bouton Passer
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(
                            color: Colors.white.withValues(alpha: 0.25),
                            width: 1,
                          ),
                        ),
                        child: const Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              Icons.egg_alt_rounded,
                              size: 16,
                              color: AppColors.accent,
                            ),
                            SizedBox(width: 6),
                            Text(
                              "LE FERMIER",
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w800,
                                color: Colors.white,
                                letterSpacing: 1.1,
                              ),
                            ),
                          ],
                        ),
                      ),
                      TextButton(
                        onPressed: () => _continueToLogin(context),
                        style: TextButton.styleFrom(
                          foregroundColor: Colors.white.withValues(alpha: 0.8),
                          textStyle: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        child: const Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text("Passer"),
                            SizedBox(width: 4),
                            Icon(Icons.arrow_forward_ios_rounded, size: 12),
                          ],
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 60),

                  // Titre et Accroche forte
                  const Text(
                    "L'excellence avicole\nà portée de main.",
                    style: TextStyle(
                      fontSize: 30,
                      fontWeight: FontWeight.w900,
                      color: Colors.white,
                      height: 1.15,
                      letterSpacing: -0.6,
                    ),
                  ),
                  const SizedBox(height: 10),
                  Text(
                    "Pilotez vos bandes de pondeuses et poulets de chair, sécurisez votre rentabilité et gérez vos stocks, même sans connexion réseau.",
                    style: TextStyle(
                      fontSize: 13,
                      color: Colors.white.withValues(alpha: 0.85),
                      height: 1.45,
                    ),
                  ),

                  const SizedBox(height: 20),

                  // 3 Piliers Clés (Ponte, Caisse, Hors-Ligne)
                  _buildFeatureRow(
                    icon: Icons.egg_outlined,
                    iconColor: AppColors.accent,
                    title: "Ponte & Mortalité en temps réel",
                    subtitle: "Ratios automatiques, traçabilité des déclassements et courbes de ponte.",
                  ),
                  const SizedBox(height: 10),
                  _buildFeatureRow(
                    icon: Icons.account_balance_wallet_outlined,
                    iconColor: const Color(0xFF34D399),
                    title: "Caisse & Rentabilité nette",
                    subtitle: "Ventes d'alvéoles, dépenses en aliment et bénéfice net par bande.",
                  ),
                  const SizedBox(height: 10),
                  _buildFeatureRow(
                    icon: Icons.wifi_off_rounded,
                    iconColor: const Color(0xFF60A5FA),
                    title: "100% Fonctionnel Hors-Ligne",
                    subtitle: "Enregistrez au poulailler, synchronisation transparente au retour du réseau.",
                  ),

                  const SizedBox(height: 28),

                  // Bouton Principal : Créer mon exploitation
                  ElevatedButton(
                    onPressed: () => _continueToRegister(context),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      elevation: 4,
                      shadowColor: AppColors.primary.withValues(alpha: 0.5),
                      padding: const EdgeInsets.symmetric(vertical: 15),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                    ),
                    child: const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          "Créer mon exploitation",
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 0.2,
                          ),
                        ),
                        SizedBox(width: 8),
                        Icon(Icons.arrow_forward_rounded, size: 18),
                      ],
                    ),
                  ),

                  const SizedBox(height: 10),

                  // Bouton Secondaire : J'ai déjà un compte
                  OutlinedButton(
                    onPressed: () => _continueToLogin(context),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Colors.white,
                      side: BorderSide(
                        color: Colors.white.withValues(alpha: 0.4),
                        width: 1.5,
                      ),
                      padding: const EdgeInsets.symmetric(vertical: 13),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                    ),
                    child: const Text(
                      "J'ai déjà un compte",
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),

                  const SizedBox(height: 12),

                  // Note rassurante de sécurité
                  Center(
                    child: Text(
                      "🔒 Données cryptées · Sauvegarde cloud automatique",
                      style: TextStyle(
                        fontSize: 11,
                        color: Colors.white.withValues(alpha: 0.6),
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFeatureRow({
    required IconData icon,
    required Color iconColor,
    required String title,
    required String subtitle,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: Colors.white.withValues(alpha: 0.12),
          width: 1,
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(6),
            decoration: BoxDecoration(
              color: iconColor.withValues(alpha: 0.18),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, size: 16, color: iconColor),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 12.5,
                    fontWeight: FontWeight.w700,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: TextStyle(
                    fontSize: 10.5,
                    color: Colors.white.withValues(alpha: 0.72),
                    height: 1.3,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
