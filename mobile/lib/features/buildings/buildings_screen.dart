import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/models/building.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/theme_provider.dart';
import '../../core/widgets/brand_loader.dart';
import 'buildings_provider.dart';

class BuildingsScreen extends ConsumerStatefulWidget {
  const BuildingsScreen({super.key});

  @override
  ConsumerState<BuildingsScreen> createState() => _BuildingsScreenState();
}

class _BuildingsScreenState extends ConsumerState<BuildingsScreen> {
  @override
  Widget build(BuildContext context) {
    final state = ref.watch(buildingsProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    ref.listen<BuildingsState>(buildingsProvider, (_, next) {
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
        title: const Text("Bâtiments & Poulaillers"),
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
            onPressed: () => ref.read(buildingsProvider.notifier).loadBuildings(),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _openBuildingDialog(context, null),
        backgroundColor: AppColors.primary,
        icon: const Icon(Icons.add_rounded, color: Colors.white),
        label: const Text(
          "Nouveau bâtiment",
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
        ),
      ),
      body: RefreshIndicator(
        onRefresh: () => ref.read(buildingsProvider.notifier).loadBuildings(showLoading: false),
        child: state.isLoading
            ? const Center(child: BrandLoader(message: "Chargement des bâtiments..."))
            : SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 90),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // En-tête léger & aéré
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                "CAPACITÉ GLOBALE",
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w700,
                                  letterSpacing: 0.8,
                                  color: AppColors.textMutedLight,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                "${state.totalCapacity} places",
                                style: const TextStyle(
                                  fontSize: 26,
                                  fontWeight: FontWeight.w900,
                                  color: AppColors.primary,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                "${state.activeBuildingsCount} actif(s) sur ${state.buildings.length} infrastructure(s)",
                                style: const TextStyle(
                                  fontSize: 12,
                                  color: AppColors.textMutedLight,
                                ),
                              ),
                            ],
                          ),
                        ),
                        OutlinedButton.icon(
                          onPressed: () => _openBuildingDialog(context, null),
                          icon: const Icon(Icons.add_home_rounded, size: 16),
                          label: const Text("Ajouter", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
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

                    // Filtres par type
                    SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: Row(
                        children: [
                          _FilterChip(
                            label: "Tous (${state.buildings.length})",
                            isSelected: state.typeFilter == null,
                            onTap: () => ref.read(buildingsProvider.notifier).setFilter(null),
                          ),
                          const SizedBox(width: 8),
                          _FilterChip(
                            label: "Poulaillers (${state.buildings.where((b) => b.type == BuildingType.poultryHouse).length})",
                            isSelected: state.typeFilter == 'POULTRY_HOUSE',
                            onTap: () => ref.read(buildingsProvider.notifier).setFilter('POULTRY_HOUSE'),
                          ),
                          const SizedBox(width: 8),
                          _FilterChip(
                            label: "Poussinières (${state.buildings.where((b) => b.type == BuildingType.brooder).length})",
                            isSelected: state.typeFilter == 'BROODER',
                            onTap: () => ref.read(buildingsProvider.notifier).setFilter('BROODER'),
                          ),
                          const SizedBox(width: 8),
                          _FilterChip(
                            label: "Stockage (${state.buildings.where((b) => b.type == BuildingType.storage).length})",
                            isSelected: state.typeFilter == 'STORAGE',
                            onTap: () => ref.read(buildingsProvider.notifier).setFilter('STORAGE'),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Liste des bâtiments
                    if (state.filteredBuildings.isEmpty)
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
                            Icon(Icons.home_work_outlined, size: 48, color: AppColors.textMutedLight.withValues(alpha: 0.5)),
                            const SizedBox(height: 12),
                            const Text(
                              "Aucun bâtiment configuré",
                              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                            ),
                            const SizedBox(height: 4),
                            const Text(
                              "Ajoutez vos poulaillers et poussinières pour y associer vos lots de volailles.",
                              textAlign: TextAlign.center,
                              style: TextStyle(fontSize: 12, color: AppColors.textMutedLight),
                            ),
                            const SizedBox(height: 16),
                            ElevatedButton.icon(
                              onPressed: () => _openBuildingDialog(context, null),
                              icon: const Icon(Icons.add, size: 16),
                              label: const Text("Créer un poulailler"),
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
                        itemCount: state.filteredBuildings.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 10),
                        itemBuilder: (ctx, index) {
                          final item = state.filteredBuildings[index];
                          return _BuildingCard(
                            building: item,
                            onEdit: () => _openBuildingDialog(context, item),
                            onDelete: () => _confirmDelete(item),
                          );
                        },
                      ),
                  ],
                ),
              ),
      ),
    );
  }

  void _openBuildingDialog(BuildContext context, Building? building) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _BuildingFormModal(building: building),
    );
  }

  Future<void> _confirmDelete(Building building) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text("Supprimer le bâtiment ?"),
        content: Text(
          "Êtes-vous sûr de vouloir supprimer \"${building.name}\" ? Cette action est irréversible.",
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text("Annuler"),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.danger),
            child: const Text("Supprimer", style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );

    if (confirmed == true && mounted) {
      final messenger = ScaffoldMessenger.of(context);
      final success = await ref.read(buildingsProvider.notifier).deleteBuilding(building.id);
      if (success && mounted) {
        messenger.showSnackBar(
          const SnackBar(
            content: Text("Bâtiment supprimé avec succès"),
            backgroundColor: AppColors.primary,
          ),
        );
      }
    }
  }
}

class _FilterChip extends StatelessWidget {
  final String label;
  final bool isSelected;
  final VoidCallback onTap;

  const _FilterChip({
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

class _BuildingCard extends StatelessWidget {
  final Building building;
  final VoidCallback onEdit;
  final VoidCallback onDelete;

  const _BuildingCard({
    required this.building,
    required this.onEdit,
    required this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final typeColor = switch (building.type) {
      BuildingType.brooder => AppColors.accent,
      BuildingType.storage => AppColors.textMutedLight,
      BuildingType.poultryHouse => AppColors.primary,
    };

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isDark ? AppColors.borderDark : AppColors.borderLight,
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
                  color: typeColor.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(building.type.icon, color: typeColor, size: 20),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      building.name,
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      building.type.label,
                      style: TextStyle(fontSize: 11, color: typeColor, fontWeight: FontWeight.w600),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: building.isActive
                      ? AppColors.success.withValues(alpha: 0.12)
                      : Colors.grey.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  building.isActive ? "Actif" : "Inactif",
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    color: building.isActive ? AppColors.success : AppColors.textMutedLight,
                  ),
                ),
              ),
              const SizedBox(width: 4),
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
                        Text("Modifier"),
                      ],
                    ),
                  ),
                  const PopupMenuItem(
                    value: 'delete',
                    child: Row(
                      children: [
                        Icon(Icons.delete_outline, color: AppColors.danger, size: 16),
                        SizedBox(width: 8),
                        Text("Supprimer", style: TextStyle(color: AppColors.danger)),
                      ],
                    ),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 12),
          const Divider(height: 1),
          const SizedBox(height: 10),

          // Métriques Capacité / Surface / Densité
          Row(
            children: [
              Expanded(
                child: _InfoCol(
                  label: "Capacité max",
                  value: "${building.capacity} sujets",
                  icon: Icons.group_rounded,
                ),
              ),
              Expanded(
                child: _InfoCol(
                  label: "Surface au sol",
                  value: building.surfaceArea != null ? "${building.surfaceArea!.toStringAsFixed(0)} m²" : "Non saisie",
                  icon: Icons.square_foot_rounded,
                ),
              ),
              Expanded(
                child: _InfoCol(
                  label: "Densité cible",
                  value: building.densityLabel,
                  icon: Icons.speed_rounded,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _InfoCol extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;

  const _InfoCol({
    required this.label,
    required this.value,
    required this.icon,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(icon, size: 12, color: AppColors.textMutedLight),
            const SizedBox(width: 4),
            Text(
              label,
              style: const TextStyle(fontSize: 10, color: AppColors.textMutedLight),
            ),
          ],
        ),
        const SizedBox(height: 3),
        Text(
          value,
          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
          overflow: TextOverflow.ellipsis,
        ),
      ],
    );
  }
}

class _BuildingFormModal extends ConsumerStatefulWidget {
  final Building? building;

  const _BuildingFormModal({this.building});

  @override
  ConsumerState<_BuildingFormModal> createState() => _BuildingFormModalState();
}

class _BuildingFormModalState extends ConsumerState<_BuildingFormModal> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _nameController;
  late final TextEditingController _capacityController;
  late final TextEditingController _surfaceController;
  late String _type;
  late bool _isActive;

  @override
  void initState() {
    super.initState();
    final b = widget.building;
    _nameController = TextEditingController(text: b?.name ?? "");
    _capacityController = TextEditingController(text: b != null ? "${b.capacity}" : "1000");
    _surfaceController = TextEditingController(
      text: b?.surfaceArea != null ? "${b!.surfaceArea}" : "",
    );
    _type = b?.type.code ?? 'POULTRY_HOUSE';
    _isActive = b?.isActive ?? true;
  }

  @override
  void dispose() {
    _nameController.dispose();
    _capacityController.dispose();
    _surfaceController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    final name = _nameController.text.trim();
    final capacity = int.tryParse(_capacityController.text.trim()) ?? 0;
    final surface = double.tryParse(_surfaceController.text.trim());

    bool success;
    if (widget.building == null) {
      success = await ref.read(buildingsProvider.notifier).createBuilding(
            name: name,
            type: _type,
            capacity: capacity,
            surfaceArea: surface,
          );
    } else {
      success = await ref.read(buildingsProvider.notifier).updateBuilding(
            buildingId: widget.building!.id,
            name: name,
            type: _type,
            capacity: capacity,
            surfaceArea: surface,
            isActive: _isActive,
          );
    }

    if (success && mounted) {
      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(widget.building == null
              ? "Bâtiment créé avec succès"
              : "Bâtiment mis à jour avec succès"),
          backgroundColor: AppColors.primary,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final state = ref.watch(buildingsProvider);

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
              // Poignée
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
                widget.building == null
                    ? "Nouveau bâtiment d'élevage"
                    : "Modifier le bâtiment",
                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 4),
              const Text(
                "Configurez vos poulaillers, poussinières ou hangars de stockage",
                style: TextStyle(fontSize: 12, color: AppColors.textMutedLight),
              ),
              const SizedBox(height: 18),

              // Type de bâtiment
              const Text("Type d'infrastructure *", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: _TypeSelectionTile(
                      label: "Poulailler",
                      icon: Icons.home_work_rounded,
                      color: AppColors.primary,
                      isSelected: _type == 'POULTRY_HOUSE',
                      onTap: () => setState(() => _type = 'POULTRY_HOUSE'),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: _TypeSelectionTile(
                      label: "Poussinière",
                      icon: Icons.child_care_rounded,
                      color: AppColors.accent,
                      isSelected: _type == 'BROODER',
                      onTap: () => setState(() => _type = 'BROODER'),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: _TypeSelectionTile(
                      label: "Stockage",
                      icon: Icons.warehouse_rounded,
                      color: AppColors.textMutedLight,
                      isSelected: _type == 'STORAGE',
                      onTap: () => setState(() => _type = 'STORAGE'),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // Nom
              TextFormField(
                controller: _nameController,
                decoration: InputDecoration(
                  labelText: "Nom du bâtiment *",
                  hintText: "Ex: Poulailler A, Poussinière Nord",
                  prefixIcon: const Icon(Icons.badge_outlined, size: 20),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                ),
                validator: (val) {
                  if (val == null || val.trim().isEmpty) return "Le nom est requis";
                  return null;
                },
              ),
              const SizedBox(height: 12),

              // Capacité et Surface
              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      controller: _capacityController,
                      keyboardType: TextInputType.number,
                      decoration: InputDecoration(
                        labelText: "Capacité (sujets) *",
                        hintText: "Ex: 2500",
                        prefixIcon: const Icon(Icons.group_outlined, size: 20),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      ),
                      validator: (val) {
                        if (val == null || val.trim().isEmpty) return "Requis";
                        if (int.tryParse(val) == null) return "Nombre invalide";
                        return null;
                      },
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: TextFormField(
                      controller: _surfaceController,
                      keyboardType: TextInputType.number,
                      decoration: InputDecoration(
                        labelText: "Surface au sol (m²)",
                        hintText: "Ex: 250",
                        suffixText: "m²",
                        prefixIcon: const Icon(Icons.square_foot_outlined, size: 20),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),

              // Statut Actif (en mode édition)
              if (widget.building != null)
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text("Bâtiment opérationnel / actif", style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                  subtitle: const Text("Désactivez lors d'un vide sanitaire ou d'une maintenance", style: TextStyle(fontSize: 11)),
                  value: _isActive,
                  activeThumbColor: AppColors.primary,
                  onChanged: (val) => setState(() => _isActive = val),
                ),

              const SizedBox(height: 16),

              // Bouton Enregistrer
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: state.isSubmitting ? null : _submit,
                  icon: state.isSubmitting
                      ? const BrandLoader.button(size: 18)
                      : const Icon(Icons.check_circle_rounded, size: 18),
                  label: Text(
                    state.isSubmitting ? "Enregistrement..." : "Valider le bâtiment",
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

class _TypeSelectionTile extends StatelessWidget {
  final String label;
  final IconData icon;
  final Color color;
  final bool isSelected;
  final VoidCallback onTap;

  const _TypeSelectionTile({
    required this.label,
    required this.icon,
    required this.color,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10),
        decoration: BoxDecoration(
          color: isSelected
              ? color.withValues(alpha: 0.15)
              : (isDark ? Colors.grey.shade900 : Colors.grey.shade100),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected ? color : (isDark ? AppColors.borderDark : AppColors.borderLight),
            width: isSelected ? 2 : 1,
          ),
        ),
        child: Column(
          children: [
            Icon(icon, color: isSelected ? color : AppColors.textMutedLight, size: 20),
            const SizedBox(height: 4),
            Text(
              label,
              style: TextStyle(
                fontSize: 11,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                color: isSelected ? color : AppColors.textMutedLight,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
