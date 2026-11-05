import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/models/member.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/theme_provider.dart';
import '../../core/widgets/brand_loader.dart';
import '../buildings/buildings_provider.dart';
import 'members_provider.dart';
import '../subscriptions/subscription_screen.dart';

class MembersScreen extends ConsumerStatefulWidget {
  final VoidCallback? onBack;
  final VoidCallback? onOpenMenu;
  const MembersScreen({super.key, this.onBack, this.onOpenMenu});

  @override
  ConsumerState<MembersScreen> createState() => _MembersScreenState();
}

class _MembersScreenState extends ConsumerState<MembersScreen> {
  @override
  Widget build(BuildContext context) {
    final state = ref.watch(membersProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    ref.listen<MembersState>(membersProvider, (_, next) {
      if (next.error != null) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(next.error!),
            backgroundColor: AppColors.danger,
          ),
        );
      }
    });

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
        title: const Text("Équipe & Collaborateurs"),
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
            onPressed: () => ref.read(membersProvider.notifier).loadMembers(),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        heroTag: 'fab_members',
        onPressed: () => _openAddMemberDialog(context),
        backgroundColor: AppColors.primary,
        icon: const Icon(Icons.person_add_rounded, color: Colors.white),
        label: const Text(
          "Inviter un membre",
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
        ),
      ),
      body: RefreshIndicator(
        onRefresh: () => ref.read(membersProvider.notifier).loadMembers(showLoading: false),
        child: state.isLoading
            ? const Center(child: BrandLoader(message: "Chargement de l'équipe..."))
            : SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 90),
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
                                "ÉQUIPE DE L'EXPLOITATION",
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w700,
                                  letterSpacing: 0.8,
                                  color: AppColors.textMutedLight,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                "${state.members.length} collaborateur(s)",
                                style: const TextStyle(
                                  fontSize: 26,
                                  fontWeight: FontWeight.w900,
                                  color: AppColors.primary,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                "${state.activeMembersCount} actif(s) • Accès et autorisations sécurisés",
                                style: const TextStyle(
                                  fontSize: 12,
                                  color: AppColors.textMutedLight,
                                ),
                              ),
                            ],
                          ),
                        ),
                        OutlinedButton.icon(
                          onPressed: () => _openAddMemberDialog(context),
                          icon: const Icon(Icons.person_add_outlined, size: 16),
                          label: const Text("Inviter", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: AppColors.primary,
                            side: BorderSide(color: AppColors.primary.withValues(alpha: 0.4)),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),

                    // Filtres par rôle
                    SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: Row(
                        children: [
                          _RoleFilterChip(
                            label: "Tous (${state.members.length})",
                            isSelected: state.roleFilter == null,
                            onTap: () => ref.read(membersProvider.notifier).setFilter(null),
                          ),
                          const SizedBox(width: 8),
                          _RoleFilterChip(
                            label: "Gérance (${state.members.where((m) => m.role == MemberRole.manager || m.role == MemberRole.owner || m.role == MemberRole.admin).length})",
                            isSelected: state.roleFilter == 'MANAGER',
                            onTap: () => ref.read(membersProvider.notifier).setFilter('MANAGER'),
                          ),
                          const SizedBox(width: 8),
                          _RoleFilterChip(
                            label: "Élevage (${state.members.where((m) => m.role == MemberRole.productionLead).length})",
                            isSelected: state.roleFilter == 'PRODUCTION_LEAD',
                            onTap: () => ref.read(membersProvider.notifier).setFilter('PRODUCTION_LEAD'),
                          ),
                          const SizedBox(width: 8),
                          _RoleFilterChip(
                            label: "Comptabilité (${state.members.where((m) => m.role == MemberRole.accountant).length})",
                            isSelected: state.roleFilter == 'ACCOUNTANT',
                            onTap: () => ref.read(membersProvider.notifier).setFilter('ACCOUNTANT'),
                          ),
                          const SizedBox(width: 8),
                          _RoleFilterChip(
                            label: "Vétérinaires (${state.members.where((m) => m.role == MemberRole.vetConsultant).length})",
                            isSelected: state.roleFilter == 'VET_CONSULTANT',
                            onTap: () => ref.read(membersProvider.notifier).setFilter('VET_CONSULTANT'),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Liste des membres
                    if (state.filteredMembers.isEmpty)
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(32),
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
                            Icon(Icons.people_outline, size: 48, color: AppColors.textMutedLight.withValues(alpha: 0.5)),
                            const SizedBox(height: 12),
                            const Text(
                              "Aucun collaborateur trouvé",
                              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                            ),
                            const SizedBox(height: 4),
                            const Text(
                              "Invitez vos ouvriers agricoles, gérants ou vétérinaires pour leur donner accès à la ferme.",
                              textAlign: TextAlign.center,
                              style: TextStyle(fontSize: 12, color: AppColors.textMutedLight),
                            ),
                            const SizedBox(height: 16),
                            ElevatedButton.icon(
                              onPressed: () => _openAddMemberDialog(context),
                              icon: const Icon(Icons.person_add, size: 16),
                              label: const Text("Inviter un membre"),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppColors.primary,
                                foregroundColor: Colors.white,
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                              ),
                            ),
                          ],
                        ),
                      )
                    else
                      ListView.separated(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        itemCount: state.filteredMembers.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 10),
                        itemBuilder: (ctx, index) {
                          final member = state.filteredMembers[index];
                          return _MemberCard(
                            member: member,
                            onEdit: () => _openEditMemberDialog(context, member),
                            onDelete: () => _confirmRemoveMember(member),
                          );
                        },
                      ),
                  ],
                ),
              ),
      ),
    );
  }

  void _openAddMemberDialog(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const _AddMemberModal(),
    );
  }

  void _openEditMemberDialog(BuildContext context, FarmMember member) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _EditMemberModal(member: member),
    );
  }

  Future<void> _confirmRemoveMember(FarmMember member) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text("Retirer ce collaborateur ?"),
        content: Text(
          "Êtes-vous sûr de vouloir retirer \"${member.fullName}\" de l'exploitation ? Son accès à cette ferme sera immédiatement révoqué.",
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text("Annuler"),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.danger),
            child: const Text("Retirer", style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );

    if (confirmed == true && mounted) {
      final messenger = ScaffoldMessenger.of(context);
      final success = await ref.read(membersProvider.notifier).removeMember(member.id);
      if (success && mounted) {
        messenger.showSnackBar(
          const SnackBar(
            content: Text("Collaborateur retiré avec succès"),
            backgroundColor: AppColors.primary,
          ),
        );
      }
    }
  }
}

class _RoleFilterChip extends StatelessWidget {
  final String label;
  final bool isSelected;
  final VoidCallback onTap;

  const _RoleFilterChip({
    required this.label,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(10),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected
              ? AppColors.primary
              : (isDark ? AppColors.surfaceDark : AppColors.surfaceLight),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: isSelected
                ? AppColors.primary
                : (isDark ? AppColors.borderDark : AppColors.borderLight),
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
            color: isSelected
                ? Colors.white
                : (isDark ? Colors.white : AppColors.textMainLight),
          ),
        ),
      ),
    );
  }
}

class _MemberCard extends StatelessWidget {
  final FarmMember member;
  final VoidCallback onEdit;
  final VoidCallback onDelete;

  const _MemberCard({
    required this.member,
    required this.onEdit,
    required this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isDark ? AppColors.borderDark : AppColors.borderLight,
        ),
      ),
      child: Row(
        children: [
          // Avatar avec initiales
          CircleAvatar(
            radius: 22,
            backgroundColor: member.role.color.withValues(alpha: 0.15),
            child: Text(
              member.initials,
              style: TextStyle(
                color: member.role.color,
                fontWeight: FontWeight.bold,
                fontSize: 14,
              ),
            ),
          ),
          const SizedBox(width: 12),

          // Informations du membre
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Flexible(
                      child: Text(
                        member.fullName,
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    if (member.isOwner) ...[
                      const SizedBox(width: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: AppColors.primary.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: const Text(
                          "Propriétaire",
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            color: AppColors.primary,
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
                const SizedBox(height: 2),
                Text(
                  member.email,
                  style: const TextStyle(fontSize: 12, color: AppColors.textMutedLight),
                  overflow: TextOverflow.ellipsis,
                ),
                if (member.phone != null && member.phone!.isNotEmpty) ...[
                  const SizedBox(height: 2),
                  Row(
                    children: [
                      const Icon(Icons.phone_outlined, size: 12, color: AppColors.textMutedLight),
                      const SizedBox(width: 4),
                      Text(
                        member.phone!,
                        style: const TextStyle(fontSize: 11, color: AppColors.textMutedLight),
                      ),
                    ],
                  ),
                ],
                const SizedBox(height: 6),

                // Badge de Rôle & Statut
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: member.role.color.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(member.role.icon, size: 12, color: member.role.color),
                          const SizedBox(width: 4),
                          Text(
                            member.role.label,
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                              color: member.role.color,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: member.isActive
                            ? AppColors.success.withValues(alpha: 0.1)
                            : Colors.grey.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        member.isActive ? "Actif" : "Suspendu",
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          color: member.isActive ? AppColors.success : AppColors.textMutedLight,
                        ),
                      ),
                    ),
                  ],
                ),
                if (!member.isOwner) ...[
                  const SizedBox(height: 5),
                  Row(
                    children: [
                      Icon(
                        member.assignedBuildingNames.isNotEmpty
                            ? Icons.home_work_rounded
                            : Icons.all_inclusive_rounded,
                        size: 11,
                        color: member.assignedBuildingNames.isNotEmpty
                            ? AppColors.accent
                            : AppColors.textMutedLight,
                      ),
                      const SizedBox(width: 4),
                      Expanded(
                        child: Text(
                          member.assignedBuildingNames.isNotEmpty
                              ? member.assignedBuildingNames.join(', ')
                              : "Tous les bâtiments",
                          style: TextStyle(
                            fontSize: 10.5,
                            fontWeight: member.assignedBuildingNames.isNotEmpty
                                ? FontWeight.w600
                                : FontWeight.normal,
                            color: member.assignedBuildingNames.isNotEmpty
                                ? AppColors.accent
                                : AppColors.textMutedLight,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ],
              ],
            ),
          ),

          // Menu d'options (sauf pour le propriétaire)
          if (!member.isOwner)
            PopupMenuButton<String>(
              icon: const Icon(Icons.more_vert_rounded, size: 18),
              padding: EdgeInsets.zero,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              onSelected: (val) {
                if (val == 'edit') onEdit();
                if (val == 'delete') onDelete();
              },
              itemBuilder: (_) => [
                const PopupMenuItem(
                  value: 'edit',
                  child: Row(
                    children: [
                      Icon(Icons.edit_outlined, size: 16),
                      SizedBox(width: 8),
                      Text("Modifier le rôle / statut"),
                    ],
                  ),
                ),
                const PopupMenuItem(
                  value: 'delete',
                  child: Row(
                    children: [
                      Icon(Icons.person_remove_outlined, color: AppColors.danger, size: 16),
                      SizedBox(width: 8),
                      Text("Retirer de la ferme", style: TextStyle(color: AppColors.danger)),
                    ],
                  ),
                ),
              ],
            ),
        ],
      ),
    );
  }
}

class _AddMemberModal extends ConsumerStatefulWidget {
  const _AddMemberModal();

  @override
  ConsumerState<_AddMemberModal> createState() => _AddMemberModalState();
}

class _AddMemberModalState extends ConsumerState<_AddMemberModal> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _firstNameController = TextEditingController();
  final _lastNameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _passwordController = TextEditingController();
  final Set<String> _selectedBuildingIds = {};
  String _selectedRole = 'MANAGER';

  @override
  void dispose() {
    _emailController.dispose();
    _firstNameController.dispose();
    _lastNameController.dispose();
    _phoneController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    final messenger = ScaffoldMessenger.of(context);
    final navigator = Navigator.of(context);

    final success = await ref.read(membersProvider.notifier).addMember(
          email: _emailController.text.trim(),
          firstName: _firstNameController.text.trim(),
          lastName: _lastNameController.text.trim(),
          phone: _phoneController.text.trim().isNotEmpty ? _phoneController.text.trim() : null,
          role: _selectedRole,
          password: _passwordController.text.trim().isNotEmpty ? _passwordController.text.trim() : null,
          buildingIds: _selectedBuildingIds.isEmpty ? null : _selectedBuildingIds.toList(),
        );

    if (success && mounted) {
      navigator.pop();
      messenger.showSnackBar(
        const SnackBar(
          content: Text("Collaborateur invité avec succès"),
          backgroundColor: AppColors.primary,
        ),
      );
    } else if (mounted) {
      final err = ref.read(membersProvider).error ?? "Une erreur est survenue lors de l'ajout.";
      final isQuotaOrUpgrade = err.contains("Limite atteinte") ||
          err.contains("quota") ||
          err.contains("formule") ||
          err.contains("Passez à");
      messenger.showSnackBar(
        SnackBar(
          content: Text(err),
          backgroundColor: AppColors.danger,
          duration: isQuotaOrUpgrade ? const Duration(seconds: 7) : const Duration(seconds: 4),
          action: isQuotaOrUpgrade
              ? SnackBarAction(
                  label: "Voir offres",
                  textColor: Colors.white,
                  onPressed: () {
                    navigator.push(
                      MaterialPageRoute(
                        builder: (_) => const SubscriptionScreen(),
                      ),
                    );
                  },
                )
              : null,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final state = ref.watch(membersProvider);
    final buildingsState = ref.watch(buildingsProvider);

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
      child: Form(
        key: _formKey,
        child: SingleChildScrollView(
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

              const Text(
                "Inviter un collaborateur",
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 4),
              const Text(
                "Donnez accès à vos ouvriers, gérants ou vétérinaires selon leur métier",
                style: TextStyle(fontSize: 12, color: AppColors.textMutedLight),
              ),
              const SizedBox(height: 18),

              // Rôle à attribuer
              const Text("Rôle & Fonction *", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              DropdownButtonFormField<String>(
                initialValue: _selectedRole,
                isExpanded: true,
                decoration: InputDecoration(
                  prefixIcon: const Icon(Icons.security_rounded, size: 20),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                ),
                items: MemberRole.values
                    .where((r) => r != MemberRole.owner)
                    .map((r) => DropdownMenuItem(
                          value: r.code,
                          child: Row(
                            children: [
                              Icon(r.icon, size: 16, color: r.color),
                              const SizedBox(width: 8),
                              Text(r.label, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                            ],
                          ),
                        ))
                    .toList(),
                onChanged: (val) {
                  if (val != null) setState(() => _selectedRole = val);
                },
              ),
              const SizedBox(height: 14),

              // Poulaillers / Bâtiments assignés
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text("Poulaillers assignés", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                  Text(
                    _selectedBuildingIds.isEmpty ? "Tous les bâtiments" : "${_selectedBuildingIds.length} assigné(s)",
                    style: TextStyle(
                      fontSize: 11,
                      color: _selectedBuildingIds.isEmpty ? AppColors.textMutedLight : AppColors.accent,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              const Text(
                "L'ouvrier n'aura accès qu'aux bandes et saisies de ces poulaillers.",
                style: TextStyle(fontSize: 11, color: AppColors.textMutedLight),
              ),
              const SizedBox(height: 8),
              if (buildingsState.buildings.isEmpty)
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: isDark ? AppColors.surfaceDark : AppColors.backgroundLight,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                  ),
                  child: const Text(
                    "Aucun poulailler enregistré. Le membre aura accès à tous les futurs poulaillers.",
                    style: TextStyle(fontSize: 11, color: AppColors.textMutedLight),
                  ),
                )
              else
                Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: [
                    FilterChip(
                      label: const Text("Tous"),
                      selected: _selectedBuildingIds.isEmpty,
                      onSelected: (selected) {
                        if (selected) setState(() => _selectedBuildingIds.clear());
                      },
                      selectedColor: AppColors.primary.withValues(alpha: 0.15),
                      labelStyle: TextStyle(
                        color: _selectedBuildingIds.isEmpty ? AppColors.primary : null,
                        fontWeight: _selectedBuildingIds.isEmpty ? FontWeight.bold : FontWeight.normal,
                        fontSize: 11.5,
                      ),
                    ),
                    ...buildingsState.buildings.map((b) {
                      final isSelected = _selectedBuildingIds.contains(b.id);
                      return FilterChip(
                        avatar: Icon(b.type.icon, size: 13, color: isSelected ? AppColors.primary : AppColors.textMutedLight),
                        label: Text(b.name),
                        selected: isSelected,
                        onSelected: (selected) {
                          setState(() {
                            if (selected) {
                              _selectedBuildingIds.add(b.id);
                            } else {
                              _selectedBuildingIds.remove(b.id);
                            }
                          });
                        },
                        selectedColor: AppColors.primary.withValues(alpha: 0.15),
                        labelStyle: TextStyle(
                          color: isSelected ? AppColors.primary : null,
                          fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                          fontSize: 11.5,
                        ),
                      );
                    }),
                  ],
                ),
              const SizedBox(height: 14),

              // Prénom & Nom
              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      controller: _firstNameController,
                      decoration: InputDecoration(
                        labelText: "Prénom *",
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      ),
                      validator: (val) {
                        if (val == null || val.trim().isEmpty) return "Requis";
                        return null;
                      },
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: TextFormField(
                      controller: _lastNameController,
                      decoration: InputDecoration(
                        labelText: "Nom *",
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      ),
                      validator: (val) {
                        if (val == null || val.trim().isEmpty) return "Requis";
                        return null;
                      },
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),

              // Email
              TextFormField(
                controller: _emailController,
                keyboardType: TextInputType.emailAddress,
                decoration: InputDecoration(
                  labelText: "Adresse email *",
                  hintText: "collaborateur@ferme.com",
                  prefixIcon: const Icon(Icons.email_outlined, size: 20),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                ),
                validator: (val) {
                  if (val == null || val.trim().isEmpty) return "L'email est requis";
                  if (!val.contains('@')) return "Email invalide";
                  return null;
                },
              ),
              const SizedBox(height: 12),

              // Téléphone
              TextFormField(
                controller: _phoneController,
                keyboardType: TextInputType.phone,
                decoration: InputDecoration(
                  labelText: "Numéro de téléphone (optionnel)",
                  hintText: "Ex: +229 97 00 00 00",
                  prefixIcon: const Icon(Icons.phone_outlined, size: 20),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                ),
              ),
              const SizedBox(height: 12),

              // Mot de passe initial
              TextFormField(
                controller: _passwordController,
                obscureText: true,
                decoration: InputDecoration(
                  labelText: "Mot de passe initial (optionnel)",
                  hintText: "Défaut: Lefermier@2026",
                  helperText: "Si le compte existe déjà, son mot de passe existant est conservé",
                  prefixIcon: const Icon(Icons.lock_outline, size: 20),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                ),
              ),
              const SizedBox(height: 18),

              // Bouton Enregistrer
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: state.isSubmitting ? null : _submit,
                  icon: state.isSubmitting
                      ? const BrandLoader.button(size: 18)
                      : const Icon(Icons.check_circle_rounded, size: 18),
                  label: Text(
                    state.isSubmitting ? "Invitation en cours..." : "Inviter dans l'exploitation",
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
        ),
      ),
    );
  }
}

class _EditMemberModal extends ConsumerStatefulWidget {
  final FarmMember member;

  const _EditMemberModal({required this.member});

  @override
  ConsumerState<_EditMemberModal> createState() => _EditMemberModalState();
}

class _EditMemberModalState extends ConsumerState<_EditMemberModal> {
  late String _role;
  late bool _isActive;
  late Set<String> _selectedBuildingIds;

  @override
  void initState() {
    super.initState();
    _role = widget.member.role.code;
    _isActive = widget.member.isActive;
    _selectedBuildingIds = widget.member.assignedBuildingIds.toSet();
  }

  Future<void> _submit() async {
    final messenger = ScaffoldMessenger.of(context);
    final navigator = Navigator.of(context);

    final success = await ref.read(membersProvider.notifier).updateMember(
          membershipId: widget.member.id,
          role: _role,
          isActive: _isActive,
          buildingIds: _selectedBuildingIds.toList(),
        );

    if (success && mounted) {
      navigator.pop();
      messenger.showSnackBar(
        const SnackBar(
          content: Text("Statut et rôle mis à jour avec succès"),
          backgroundColor: AppColors.primary,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final state = ref.watch(membersProvider);
    final buildingsState = ref.watch(buildingsProvider);

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
      child: Material(
        color: Colors.transparent,
        child: SingleChildScrollView(
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
          Text(
            "Modifier ${widget.member.fullName}",
            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 4),
          Text(
            widget.member.email,
            style: const TextStyle(fontSize: 12, color: AppColors.textMutedLight),
          ),
          const SizedBox(height: 18),

          // Rôle
          const Text("Rôle attribué *", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          DropdownButtonFormField<String>(
            initialValue: _role,
            isExpanded: true,
            decoration: InputDecoration(
              prefixIcon: const Icon(Icons.security_rounded, size: 20),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            ),
            items: MemberRole.values
                .where((r) => r != MemberRole.owner)
                .map((r) => DropdownMenuItem(
                      value: r.code,
                      child: Row(
                        children: [
                          Icon(r.icon, size: 16, color: r.color),
                          const SizedBox(width: 8),
                          Text(r.label, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                        ],
                      ),
                    ))
                .toList(),
            onChanged: (val) {
              if (val != null) setState(() => _role = val);
            },
          ),
          const SizedBox(height: 14),

          // Poulaillers / Bâtiments assignés
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text("Poulaillers assignés", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
              Text(
                _selectedBuildingIds.isEmpty ? "Tous les bâtiments" : "${_selectedBuildingIds.length} assigné(s)",
                style: TextStyle(
                  fontSize: 11,
                  color: _selectedBuildingIds.isEmpty ? AppColors.textMutedLight : AppColors.accent,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          const Text(
            "L'ouvrier n'aura accès qu'aux bandes et saisies de ces poulaillers.",
            style: TextStyle(fontSize: 11, color: AppColors.textMutedLight),
          ),
          const SizedBox(height: 8),
          if (buildingsState.buildings.isEmpty)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: isDark ? AppColors.surfaceDark : AppColors.backgroundLight,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
              ),
              child: const Text(
                "Aucun poulailler enregistré. Le membre a accès à tous les futurs poulaillers.",
                style: TextStyle(fontSize: 11, color: AppColors.textMutedLight),
              ),
            )
          else
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: [
                FilterChip(
                  label: const Text("Tous"),
                  selected: _selectedBuildingIds.isEmpty,
                  onSelected: (selected) {
                    if (selected) setState(() => _selectedBuildingIds.clear());
                  },
                  selectedColor: AppColors.primary.withValues(alpha: 0.15),
                  labelStyle: TextStyle(
                    color: _selectedBuildingIds.isEmpty ? AppColors.primary : null,
                    fontWeight: _selectedBuildingIds.isEmpty ? FontWeight.bold : FontWeight.normal,
                    fontSize: 11.5,
                  ),
                ),
                ...buildingsState.buildings.map((b) {
                  final isSelected = _selectedBuildingIds.contains(b.id);
                  return FilterChip(
                    avatar: Icon(b.type.icon, size: 13, color: isSelected ? AppColors.primary : AppColors.textMutedLight),
                    label: Text(b.name),
                    selected: isSelected,
                    onSelected: (selected) {
                      setState(() {
                        if (selected) {
                          _selectedBuildingIds.add(b.id);
                        } else {
                          _selectedBuildingIds.remove(b.id);
                        }
                      });
                    },
                    selectedColor: AppColors.primary.withValues(alpha: 0.15),
                    labelStyle: TextStyle(
                      color: isSelected ? AppColors.primary : null,
                      fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                      fontSize: 11.5,
                    ),
                  );
                }),
              ],
            ),
          const SizedBox(height: 14),

          // Statut Actif
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text("Compte actif sur cette exploitation", style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
            subtitle: const Text("Désactivez pour suspendre temporairement l'accès de ce membre", style: TextStyle(fontSize: 11)),
            value: _isActive,
            activeThumbColor: AppColors.primary,
            onChanged: (val) => setState(() => _isActive = val),
          ),
          const SizedBox(height: 18),

          // Bouton Valider
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: state.isSubmitting ? null : _submit,
              icon: state.isSubmitting
                  ? const BrandLoader.button(size: 18)
                  : const Icon(Icons.check_circle_rounded, size: 18),
              label: Text(
                state.isSubmitting ? "Mise à jour..." : "Appliquer les modifications",
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
    ),
  ),
);
  }
}
