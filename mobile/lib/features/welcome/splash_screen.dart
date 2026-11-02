import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/brand_loader.dart';

class SplashScreen extends StatelessWidget {
  final String message;

  const SplashScreen({
    super.key,
    this.message = "Préparation de votre exploitation...",
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        fit: StackFit.expand,
        children: [
          // Visuel photographique de la ferme avicole
          Image.asset(
            'assets/images/poultry_farm_hero.jpg',
            fit: BoxFit.cover,
            errorBuilder: (_, __, ___) => Container(
              color: AppColors.primaryHover,
            ),
          ),

          // Voile dégradé premium (émeraude sombre)
          Container(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  Colors.black.withValues(alpha: 0.45),
                  Colors.black.withValues(alpha: 0.70),
                  AppColors.brandDeepGreen.withValues(alpha: 0.92),
                  AppColors.brandDarkBackground,
                ],
                stops: const [0.0, 0.4, 0.75, 1.0],
              ),
            ),
          ),

          // Contenu centré : Logo + BrandLoader + Slogan
          SafeArea(
            child: Center(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 32),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    // Emblème Le Fermier
                    Container(
                      width: 80,
                      height: 80,
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.12),
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: AppColors.primaryLight.withValues(alpha: 0.5),
                          width: 2.5,
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: AppColors.primary.withValues(alpha: 0.35),
                            blurRadius: 28,
                            spreadRadius: 4,
                          ),
                        ],
                      ),
                      child: const Center(
                        child: Icon(
                          Icons.egg_alt_rounded,
                          size: 42,
                          color: AppColors.accent,
                        ),
                      ),
                    ),
                    const SizedBox(height: 18),
                    const Text(
                      "Le Fermier",
                      style: TextStyle(
                        fontSize: 30,
                        fontWeight: FontWeight.w900,
                        color: Colors.white,
                        letterSpacing: -0.5,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      "PILOTAGE AVICOLE DIGITAL & HORS-LIGNE",
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: Colors.white.withValues(alpha: 0.75),
                        letterSpacing: 1.4,
                      ),
                    ),
                    const SizedBox(height: 48),

                    // Loader signature aux couleurs Le Fermier
                    BrandLoader(
                      size: 52,
                      message: message,
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
