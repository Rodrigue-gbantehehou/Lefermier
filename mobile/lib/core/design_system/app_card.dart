import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../theme/app_theme.dart';

class AppCard extends StatelessWidget {
  final Widget child;
  final VoidCallback? onTap;
  final EdgeInsetsGeometry? padding;
  final EdgeInsetsGeometry? margin;
  final Color? color;
  final Color? borderColor;
  final double borderRadius;
  final double borderWidth;
  final bool enableHaptics;

  const AppCard({
    super.key,
    required this.child,
    this.onTap,
    this.padding,
    this.margin,
    this.color,
    this.borderColor,
    this.borderRadius = AppRadius.lg,
    this.borderWidth = 1.0,
    this.enableHaptics = true,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final defaultBg = isDark ? AppColors.surfaceDark : AppColors.surfaceLight;
    final defaultBorder = isDark ? AppColors.borderDark : AppColors.borderLight;

    final cardContent = Container(
      padding: padding ?? const EdgeInsets.all(AppSpacing.lg),
      decoration: BoxDecoration(
        color: color ?? defaultBg,
        borderRadius: BorderRadius.circular(borderRadius),
        border: Border.all(
          color: borderColor ?? defaultBorder,
          width: borderWidth,
        ),
      ),
      child: child,
    );

    if (onTap == null) {
      if (margin != null) {
        return Padding(padding: margin!, child: cardContent);
      }
      return cardContent;
    }

    return Padding(
      padding: margin ?? EdgeInsets.zero,
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(borderRadius),
        child: InkWell(
          onTap: () {
            if (enableHaptics) {
              HapticFeedback.lightImpact();
            }
            onTap!();
          },
          borderRadius: BorderRadius.circular(borderRadius),
          splashColor: (isDark ? Colors.white : AppColors.primary).withValues(alpha: 0.08),
          highlightColor: (isDark ? Colors.white : AppColors.primary).withValues(alpha: 0.04),
          child: cardContent,
        ),
      ),
    );
  }
}
