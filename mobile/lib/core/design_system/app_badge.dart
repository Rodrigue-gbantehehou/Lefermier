import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

enum AppBadgeVariant {
  success,
  warning,
  danger,
  info,
  neutral,
  brand,
}

class AppBadge extends StatelessWidget {
  final String label;
  final AppBadgeVariant variant;
  final IconData? icon;
  final bool showDot;

  const AppBadge({
    super.key,
    required this.label,
    this.variant = AppBadgeVariant.neutral,
    this.icon,
    this.showDot = true,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    Color bg;
    Color border;
    Color text;

    switch (variant) {
      case AppBadgeVariant.success:
        bg = AppColors.success.withValues(alpha: isDark ? 0.20 : 0.12);
        border = AppColors.success.withValues(alpha: isDark ? 0.45 : 0.35);
        text = isDark ? const Color(0xFF4ADE80) : const Color(0xFF15803D);
        break;
      case AppBadgeVariant.warning:
        bg = AppColors.warning.withValues(alpha: isDark ? 0.22 : 0.14);
        border = AppColors.warning.withValues(alpha: isDark ? 0.50 : 0.40);
        text = isDark ? const Color(0xFFFBBF24) : const Color(0xFFB45309);
        break;
      case AppBadgeVariant.danger:
        bg = AppColors.danger.withValues(alpha: isDark ? 0.22 : 0.12);
        border = AppColors.danger.withValues(alpha: isDark ? 0.45 : 0.35);
        text = isDark ? const Color(0xFFF87171) : const Color(0xFFDC2626);
        break;
      case AppBadgeVariant.info:
        bg = AppColors.info.withValues(alpha: isDark ? 0.20 : 0.12);
        border = AppColors.info.withValues(alpha: isDark ? 0.45 : 0.35);
        text = isDark ? const Color(0xFF38BDF8) : const Color(0xFF0369A1);
        break;
      case AppBadgeVariant.brand:
        bg = AppColors.primary.withValues(alpha: isDark ? 0.28 : 0.12);
        border = AppColors.primary.withValues(alpha: isDark ? 0.50 : 0.35);
        text = isDark ? AppColors.brandEmeraldLight : AppColors.primary;
        break;
      case AppBadgeVariant.neutral:
        bg = isDark ? Colors.white.withValues(alpha: 0.08) : Colors.black.withValues(alpha: 0.06);
        border = isDark ? AppColors.borderDark : AppColors.borderLight;
        text = isDark ? AppColors.textMutedDark : AppColors.textMutedLight;
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(AppRadius.full),
        border: Border.all(color: border, width: 1),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          if (showDot && icon == null) ...[
            Container(
              width: 6,
              height: 6,
              decoration: BoxDecoration(
                color: text,
                shape: BoxShape.circle,
              ),
            ),
            const SizedBox(width: 5),
          ],
          if (icon != null) ...[
            Icon(icon, size: 12, color: text),
            const SizedBox(width: 4),
          ],
          Text(
            label,
            style: TextStyle(
              fontSize: 10.5,
              fontWeight: FontWeight.w700,
              color: text,
              letterSpacing: 0.2,
            ),
          ),
        ],
      ),
    );
  }
}
