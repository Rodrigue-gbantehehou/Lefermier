import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/models/subscription_plan.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/theme_provider.dart';
import '../../core/utils/currency_formatter.dart';
import '../../core/widgets/brand_loader.dart';
import 'subscription_provider.dart';

class SubscriptionScreen extends ConsumerWidget {
  const SubscriptionScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(subscriptionProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    ref.listen<SubscriptionState>(subscriptionProvider, (_, next) {
      if (next.error != null) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(next.error!), backgroundColor: AppColors.danger),
        );
      }
      if (next.successMessage != null) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(next.successMessage!), backgroundColor: AppColors.primary),
        );
      }
    });

    final currentPlan = state.currentPlan;

    return Scaffold(
      appBar: AppBar(
        title: const Text("Abonnement & Licences"),
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
            onPressed: () => ref.read(subscriptionProvider.notifier).loadSubscription(),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () => ref.read(subscriptionProvider.notifier).loadSubscription(showLoading: false),
        child: state.isLoading
            ? const Center(child: BrandLoader(message: "Chargement des formules..."))
            : SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 30),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // En-tête aéré direct
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                "FORMULE ACTUELLE",
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w700,
                                  letterSpacing: 0.8,
                                  color: AppColors.textMutedLight,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                currentPlan?.name ?? "Formule Gratuite",
                                style: const TextStyle(
                                  fontSize: 24,
                                  fontWeight: FontWeight.w900,
                                  color: AppColors.primary,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                "Statut : ${state.orgStatus == 'ACTIVE' ? 'Actif' : state.orgStatus} • Quotas opérationnels",
                                style: const TextStyle(fontSize: 12, color: AppColors.textMutedLight),
                              ),
                            ],
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: AppColors.success.withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: const Text(
                            "Souscription active",
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              color: AppColors.success,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),

                    // Quotas actuels
                    if (currentPlan != null)
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: isDark ? AppColors.surfaceDark : Colors.white,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(
                            color: isDark ? AppColors.borderDark : AppColors.borderLight,
                          ),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceAround,
                          children: [
                            _QuotaItem(
                              label: "Lots max",
                              value: "${currentPlan.quotas.maxFlocks}",
                              icon: Icons.grid_view_rounded,
                            ),
                            _QuotaItem(
                              label: "Bâtiments",
                              value: "${currentPlan.quotas.maxBuildings}",
                              icon: Icons.home_work_rounded,
                            ),
                            _QuotaItem(
                              label: "Équipe",
                              value: "${currentPlan.quotas.maxMembers}",
                              icon: Icons.people_rounded,
                            ),
                            _QuotaItem(
                              label: "Historique",
                              value: "${currentPlan.quotas.retentionMonths} mois",
                              icon: Icons.history_rounded,
                            ),
                          ],
                        ),
                      ),
                    const SizedBox(height: 20),

                    // Sélecteur de cycle de facturation
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          "Formules & Évolutions",
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                        ),
                        Container(
                          decoration: BoxDecoration(
                            color: isDark ? Colors.grey.shade900 : Colors.grey.shade200,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          padding: const EdgeInsets.all(3),
                          child: Row(
                            children: [
                              _CycleOption(
                                label: "Mensuel",
                                isSelected: state.billingCycle == 'MONTHLY',
                                onTap: () => ref.read(subscriptionProvider.notifier).setBillingCycle('MONTHLY'),
                              ),
                              _CycleOption(
                                label: "Annuel (-15%)",
                                isSelected: state.billingCycle == 'ANNUALLY',
                                onTap: () => ref.read(subscriptionProvider.notifier).setBillingCycle('ANNUALLY'),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),

                    // Liste des formules disponibles
                    ListView.separated(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      itemCount: state.publicPlans.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 12),
                      itemBuilder: (ctx, index) {
                        final plan = state.publicPlans[index];
                        final isCurrent = currentPlan?.sku == plan.sku;

                        return _PlanCard(
                          plan: plan,
                          isCurrent: isCurrent,
                          billingCycle: state.billingCycle,
                          onSelectUpgrade: () => _openUpgradeModal(context, plan),
                        );
                      },
                    ),
                  ],
                ),
              ),
      ),
    );
  }

  void _openUpgradeModal(BuildContext context, SubscriptionPlanModel plan) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _UpgradeModal(plan: plan),
    );
  }
}

class _QuotaItem extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;

  const _QuotaItem({
    required this.label,
    required this.value,
    required this.icon,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Icon(icon, size: 18, color: AppColors.primary),
        const SizedBox(height: 4),
        Text(
          value,
          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
        ),
        Text(
          label,
          style: const TextStyle(fontSize: 10, color: AppColors.textMutedLight),
        ),
      ],
    );
  }
}

class _CycleOption extends StatelessWidget {
  final String label;
  final bool isSelected;
  final VoidCallback onTap;

  const _CycleOption({
    required this.label,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: isSelected
              ? (isDark ? AppColors.surfaceDark : Colors.white)
              : Colors.transparent,
          borderRadius: BorderRadius.circular(8),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 11,
            fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
            color: isSelected ? AppColors.primary : AppColors.textMutedLight,
          ),
        ),
      ),
    );
  }
}

class _PlanCard extends StatelessWidget {
  final SubscriptionPlanModel plan;
  final bool isCurrent;
  final String billingCycle;
  final VoidCallback onSelectUpgrade;

  const _PlanCard({
    required this.plan,
    required this.isCurrent,
    required this.billingCycle,
    required this.onSelectUpgrade,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final price = billingCycle == 'ANNUALLY' && plan.priceAnnually > 0
        ? "${CurrencyFormatter.formatFcfa(plan.priceAnnually)} / an"
        : (plan.isFree ? "Gratuit" : "${CurrencyFormatter.formatFcfa(plan.priceMonthly)} / mois");

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isCurrent
              ? AppColors.primary
              : (plan.isRecommended
                  ? AppColors.accent
                  : (isDark ? AppColors.borderDark : AppColors.borderLight)),
          width: isCurrent || plan.isRecommended ? 2 : 1,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Text(
                    plan.name,
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                  ),
                  if (plan.badge != null && plan.badge!.isNotEmpty) ...[
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: AppColors.accent.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        plan.badge!,
                        style: const TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          color: AppColors.accent,
                        ),
                      ),
                    ),
                  ],
                ],
              ),
              if (isCurrent)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Text(
                    "Actuelle",
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      color: AppColors.primary,
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 6),

          Text(
            price,
            style: const TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.w900,
              fontFamily: 'monospace',
              color: AppColors.primary,
            ),
          ),
          if (plan.description != null && plan.description!.isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(
              plan.description!,
              style: const TextStyle(fontSize: 12, color: AppColors.textMutedLight),
            ),
          ],
          const SizedBox(height: 12),
          const Divider(height: 1),
          const SizedBox(height: 10),

          // Quotas inclus
          Text(
            "Inclus : ${plan.quotas.maxFlocks} bande(s) simultanée(s) • ${plan.quotas.maxBuildings} bâtiment(s) • ${plan.quotas.maxMembers} collaborateur(s)",
            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 8),

          // Liste des fonctionnalités incluses
          ...plan.features.take(4).map(
                (f) => Padding(
                  padding: const EdgeInsets.only(bottom: 4),
                  child: Row(
                    children: [
                      const Icon(Icons.check_circle_rounded, size: 14, color: AppColors.primary),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          f,
                          style: const TextStyle(fontSize: 11, color: AppColors.textMutedLight),
                        ),
                      ),
                    ],
                  ),
                ),
              ),

          const SizedBox(height: 12),

          if (isCurrent)
            SizedBox(
              width: double.infinity,
              child: OutlinedButton(
                onPressed: null,
                style: OutlinedButton.styleFrom(
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
                child: const Text("Votre formule actuelle", style: TextStyle(fontWeight: FontWeight.bold)),
              ),
            )
          else
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: onSelectUpgrade,
                style: ElevatedButton.styleFrom(
                  backgroundColor: plan.isRecommended ? AppColors.accent : AppColors.primary,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 11),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
                child: Text(
                  "Choisir la formule ${plan.name}",
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _UpgradeModal extends ConsumerStatefulWidget {
  final SubscriptionPlanModel plan;

  const _UpgradeModal({required this.plan});

  @override
  ConsumerState<_UpgradeModal> createState() => _UpgradeModalState();
}

class _UpgradeModalState extends ConsumerState<_UpgradeModal> {
  final _messageController = TextEditingController();

  @override
  void dispose() {
    _messageController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final navigator = Navigator.of(context);
    final success = await ref.read(subscriptionProvider.notifier).requestUpgrade(
          targetPlan: widget.plan.sku,
          message: _messageController.text.trim(),
        );

    if (success && mounted) {
      navigator.pop();
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final state = ref.watch(subscriptionProvider);

    return Container(
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: EdgeInsets.fromLTRB(
        20,
        16,
        20,
        MediaQuery.of(context).viewInsets.bottom + 20,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Center(
            child: Container(
              width: 40,
              height: 4,
              margin: const EdgeInsets.only(bottom: 16),
              decoration: BoxDecoration(
                color: Colors.grey.withValues(alpha: 0.3),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Icons.stars_rounded, color: AppColors.primary, size: 24),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      "Évolution vers ${widget.plan.name}",
                      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                    ),
                    Text(
                      "${widget.plan.priceMonthly > 0 ? CurrencyFormatter.formatFcfa(widget.plan.priceMonthly) : '0'} FCFA / mois",
                      style: const TextStyle(fontSize: 12, color: AppColors.primary, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          const Text(
            "Votre demande sera transmise à l'équipe commerciale pour activation de vos nouveaux quotas et fonctionnalités sous 24h.",
            style: TextStyle(fontSize: 12, color: AppColors.textMutedLight, height: 1.3),
          ),
          const SizedBox(height: 14),

          TextField(
            controller: _messageController,
            maxLines: 2,
            decoration: InputDecoration(
              labelText: "Message ou besoin spécifique (optionnel)",
              hintText: "Ex: Nous augmentons notre cheptel de 3000 pondeuses...",
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              contentPadding: const EdgeInsets.all(12),
            ),
          ),
          const SizedBox(height: 16),

          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: state.isSubmitting ? null : _submit,
              icon: state.isSubmitting
                  ? const BrandLoader.button(size: 18)
                  : const Icon(Icons.send_rounded, size: 18),
              label: Text(
                state.isSubmitting ? "Envoi de la demande..." : "Confirmer la demande d'évolution",
                style: const TextStyle(fontWeight: FontWeight.bold),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
