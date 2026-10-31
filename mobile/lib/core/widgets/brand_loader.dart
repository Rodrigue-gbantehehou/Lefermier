import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

/// Loader animé de prestige respectant scrupuleusement la charte Le Fermier.
/// Combine un anneau rotatif dégradé Émeraude/Ambre et un emblème central palpitant.
class BrandLoader extends StatefulWidget {
  final double size;
  final String? message;
  final Color? color;
  final bool showEmblem;

  const BrandLoader({
    super.key,
    this.size = 48.0,
    this.message,
    this.color,
    this.showEmblem = true,
  });

  /// Variante compacte pour l'intérieur des boutons d'action
  const BrandLoader.button({
    super.key,
    this.size = 20.0,
    this.color = Colors.white,
  })  : message = null,
        showEmblem = false;

  /// Variante plein écran avec fond flouté et texte d'attente
  static Widget fullScreen({String message = "Chargement en cours..."}) {
    return Container(
      color: Colors.black.withValues(alpha: 0.25),
      alignment: Alignment.center,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 24),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          boxShadow: [
            BoxShadow(
              color: AppColors.primary.withValues(alpha: 0.15),
              blurRadius: 24,
              offset: const Offset(0, 8),
            ),
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const BrandLoader(size: 56),
            const SizedBox(height: 16),
            Text(
              message,
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: AppColors.textMainLight,
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  State<BrandLoader> createState() => _BrandLoaderState();
}

class _BrandLoaderState extends State<BrandLoader> with TickerProviderStateMixin {
  late final AnimationController _rotationController;
  late final AnimationController _pulseController;
  late final Animation<double> _pulseAnimation;

  @override
  void initState() {
    super.initState();
    _rotationController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1400),
    )..repeat();

    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    )..repeat(reverse: true);

    _pulseAnimation = Tween<double>(begin: 0.82, end: 1.12).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _rotationController.dispose();
    _pulseController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final primary = widget.color ?? AppColors.primary;
    const accent = AppColors.accent;

    final ringWidget = SizedBox(
      width: widget.size,
      height: widget.size,
      child: AnimatedBuilder(
        animation: _rotationController,
        builder: (context, child) {
          return CustomPaint(
            painter: _BrandRingPainter(
              angle: _rotationController.value * 2 * math.pi,
              primaryColor: primary,
              accentColor: accent,
              strokeWidth: widget.size < 30 ? 2.5 : 3.5,
            ),
            child: widget.showEmblem && widget.size >= 36
                ? Center(
                    child: ScaleTransition(
                      scale: _pulseAnimation,
                      child: Container(
                        width: widget.size * 0.42,
                        height: widget.size * 0.42,
                        decoration: const BoxDecoration(
                          color: AppColors.primarySoft,
                          shape: BoxShape.circle,
                        ),
                        child: Icon(
                          Icons.egg_rounded,
                          size: widget.size * 0.28,
                          color: primary,
                        ),
                      ),
                    ),
                  )
                : null,
          );
        },
      ),
    );

    if (widget.message == null) {
      return ringWidget;
    }

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        ringWidget,
        const SizedBox(height: 12),
        Text(
          widget.message!,
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: widget.color ?? AppColors.textMutedLight,
            letterSpacing: 0.3,
          ),
        ),
      ],
    );
  }
}

class _BrandRingPainter extends CustomPainter {
  final double angle;
  final Color primaryColor;
  final Color accentColor;
  final double strokeWidth;

  _BrandRingPainter({
    required this.angle,
    required this.primaryColor,
    required this.accentColor,
    required this.strokeWidth,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = (size.width - strokeWidth) / 2;

    // Anneau de piste d'arrière-plan très subtil
    final trackPaint = Paint()
      ..color = primaryColor.withValues(alpha: 0.12)
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth;

    canvas.drawCircle(center, radius, trackPaint);

    // Arc actif avec dégradé angulaire
    final rect = Rect.fromCircle(center: center, radius: radius);
    final sweepGradient = SweepGradient(
      startAngle: 0.0,
      endAngle: math.pi * 2,
      colors: [
        primaryColor.withValues(alpha: 0.05),
        primaryColor,
        accentColor,
      ],
      stops: const [0.0, 0.6, 1.0],
      transform: GradientRotation(angle),
    );

    final activePaint = Paint()
      ..shader = sweepGradient.createShader(rect)
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round
      ..strokeWidth = strokeWidth;

    // Arc d'environ 280 degrés tournant
    const arcLength = 4.8;
    canvas.drawArc(rect, angle, arcLength, false, activePaint);
  }

  @override
  bool shouldRepaint(covariant _BrandRingPainter oldDelegate) {
    return oldDelegate.angle != angle ||
        oldDelegate.primaryColor != primaryColor ||
        oldDelegate.accentColor != accentColor;
  }
}
