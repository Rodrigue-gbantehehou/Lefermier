import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/models/contact.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/theme_provider.dart';
import '../../core/widgets/brand_loader.dart';
import 'contacts_provider.dart';

class ContactsScreen extends ConsumerStatefulWidget {
  final VoidCallback? onBack;
  final VoidCallback? onOpenMenu;

  const ContactsScreen({super.key, this.onBack, this.onOpenMenu});

  @override
  ConsumerState<ContactsScreen> createState() => _ContactsScreenState();
}

class _ContactsScreenState extends ConsumerState<ContactsScreen> {
  final _searchController = TextEditingController();

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(contactsProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    ref.listen<ContactsState>(contactsProvider, (_, next) {
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
        title: const Text("Répertoire & Contacts"),
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
            onPressed: () => ref.read(contactsProvider.notifier).loadContacts(),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        heroTag: 'fab_contacts',
        onPressed: () => _openContactModal(context),
        backgroundColor: AppColors.primary,
        icon: const Icon(Icons.person_add_alt_1_rounded, color: Colors.white),
        label: const Text(
          "Ajouter un contact",
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
        ),
      ),
      body: RefreshIndicator(
        onRefresh: () => ref.read(contactsProvider.notifier).loadContacts(showLoading: false),
        child: state.isLoading
            ? const Center(child: BrandLoader(message: "Chargement du carnet d'adresses..."))
            : SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 90),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // En-tête descriptif
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                "CARNET D'ADRESSES",
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w700,
                                  letterSpacing: 1.1,
                                  color: AppColors.primary,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                "Clients & Fournisseurs",
                                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                                      fontWeight: FontWeight.bold,
                                    ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                "Gérez votre réseau commercial et reliez vos ventes ou approvisionnements.",
                                style: TextStyle(
                                  fontSize: 12,
                                  color: isDark ? Colors.grey[400] : Colors.grey[600],
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),

                    // Compteurs statistiques
                    Row(
                      children: [
                        Expanded(
                          child: _buildStatCard(
                            context: context,
                            title: "Clients",
                            count: state.clientsCount,
                            icon: Icons.person_rounded,
                            color: AppColors.success,
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: _buildStatCard(
                            context: context,
                            title: "Fournisseurs",
                            count: state.suppliersCount,
                            icon: Icons.local_shipping_rounded,
                            color: AppColors.primary,
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: _buildStatCard(
                            context: context,
                            title: "Total",
                            count: state.contacts.length,
                            icon: Icons.contacts_rounded,
                            color: AppColors.accent,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),

                    // Barre de recherche
                    TextField(
                      controller: _searchController,
                      decoration: InputDecoration(
                        hintText: "Rechercher par nom, téléphone ou ville...",
                        prefixIcon: const Icon(Icons.search_rounded),
                        suffixIcon: _searchController.text.isNotEmpty
                            ? IconButton(
                                icon: const Icon(Icons.clear_rounded),
                                onPressed: () {
                                  _searchController.clear();
                                  ref.read(contactsProvider.notifier).setSearchQuery("");
                                  setState(() {});
                                },
                              )
                            : null,
                        filled: true,
                        fillColor: isDark ? const Color(0xFF1E293B) : Colors.white,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide(
                            color: isDark ? Colors.grey[800]! : Colors.grey[200]!,
                          ),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide(
                            color: isDark ? Colors.grey[800]! : Colors.grey[200]!,
                          ),
                        ),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      ),
                      onChanged: (val) {
                        ref.read(contactsProvider.notifier).setSearchQuery(val);
                        setState(() {});
                      },
                    ),
                    const SizedBox(height: 14),

                    // Filtres par onglets / segments
                    SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: Row(
                        children: [
                          _buildFilterChip(
                            label: "Tous (${state.contacts.length})",
                            isSelected: state.typeFilter == null,
                            onTap: () => ref.read(contactsProvider.notifier).setFilter(null),
                          ),
                          const SizedBox(width: 8),
                          _buildFilterChip(
                            label: "Clients (${state.clientsCount})",
                            isSelected: state.typeFilter == 'CLIENT',
                            onTap: () => ref.read(contactsProvider.notifier).setFilter('CLIENT'),
                          ),
                          const SizedBox(width: 8),
                          _buildFilterChip(
                            label: "Fournisseurs (${state.suppliersCount})",
                            isSelected: state.typeFilter == 'SUPPLIER',
                            onTap: () => ref.read(contactsProvider.notifier).setFilter('SUPPLIER'),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Liste des contacts
                    if (state.filteredContacts.isEmpty)
                      _buildEmptyState(context, isDark, state.typeFilter)
                    else
                      ListView.separated(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        itemCount: state.filteredContacts.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 10),
                        itemBuilder: (ctx, index) {
                          final contact = state.filteredContacts[index];
                          return _buildContactCard(context, contact, isDark);
                        },
                      ),
                  ],
                ),
              ),
      ),
    );
  }

  Widget _buildStatCard({
    required BuildContext context,
    required String title,
    required int count,
    required IconData icon,
    required Color color,
  }) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: isDark ? Colors.grey[800]! : Colors.grey[200]!,
        ),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, color: color, size: 20),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  count.toString(),
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                Text(
                  title,
                  style: TextStyle(
                    fontSize: 11,
                    color: isDark ? Colors.grey[400] : Colors.grey[600],
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChip({
    required String label,
    required bool isSelected,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.primary : Colors.transparent,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected ? AppColors.primary : Colors.grey[400]!,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
            color: isSelected ? Colors.white : null,
          ),
        ),
      ),
    );
  }

  Widget _buildContactCard(BuildContext context, Contact contact, bool isDark) {
    Color badgeColor;
    String badgeLabel;
    switch (contact.type) {
      case ContactType.client:
        badgeColor = AppColors.success;
        badgeLabel = "Client";
        break;
      case ContactType.supplier:
        badgeColor = AppColors.primary;
        badgeLabel = "Fournisseur";
        break;
      case ContactType.both:
        badgeColor = AppColors.accent;
        badgeLabel = "Client & Fournisseur";
        break;
    }

    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: BorderSide(
          color: isDark ? Colors.grey[800]! : Colors.grey[200]!,
        ),
      ),
      color: isDark ? const Color(0xFF1E293B) : Colors.white,
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                CircleAvatar(
                  radius: 20,
                  backgroundColor: badgeColor.withValues(alpha: 0.15),
                  child: Text(
                    contact.name.isNotEmpty ? contact.name[0].toUpperCase() : "?",
                    style: TextStyle(
                      color: badgeColor,
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        contact.name,
                        style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: badgeColor.withValues(alpha: 0.12),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              badgeLabel,
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                                color: badgeColor,
                              ),
                            ),
                          ),
                          if (contact.city != null && contact.city!.isNotEmpty) ...[
                            const SizedBox(width: 6),
                            Icon(
                              Icons.location_on_rounded,
                              size: 13,
                              color: isDark ? Colors.grey[400] : Colors.grey[500],
                            ),
                            const SizedBox(width: 2),
                            Text(
                              contact.city!,
                              style: TextStyle(
                                fontSize: 11,
                                color: isDark ? Colors.grey[400] : Colors.grey[600],
                              ),
                            ),
                          ],
                        ],
                      ),
                    ],
                  ),
                ),
                PopupMenuButton<String>(
                  icon: const Icon(Icons.more_vert_rounded, size: 20),
                  onSelected: (val) {
                    if (val == 'edit') {
                      _openContactModal(context, contact: contact);
                    } else if (val == 'delete') {
                      _confirmDelete(context, contact);
                    }
                  },
                  itemBuilder: (ctx) => [
                    const PopupMenuItem(
                      value: 'edit',
                      child: Row(
                        children: [
                          Icon(Icons.edit_outlined, size: 18),
                          SizedBox(width: 8),
                          Text("Modifier"),
                        ],
                      ),
                    ),
                    const PopupMenuItem(
                      value: 'delete',
                      child: Row(
                        children: [
                          Icon(Icons.delete_outline, size: 18, color: AppColors.danger),
                          SizedBox(width: 8),
                          Text("Supprimer", style: TextStyle(color: AppColors.danger)),
                        ],
                      ),
                    ),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 10),
            const Divider(height: 1),
            const SizedBox(height: 10),
            Row(
              children: [
                if (contact.phone != null && contact.phone!.isNotEmpty) ...[
                  Expanded(
                    child: Row(
                      children: [
                        const Icon(Icons.phone_rounded, size: 15, color: AppColors.primary),
                        const SizedBox(width: 6),
                        Flexible(
                          child: Text(
                            contact.phone!,
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  ),
                ] else ...[
                  Expanded(
                    child: Text(
                      "Aucun téléphone",
                      style: TextStyle(
                        fontSize: 12,
                        fontStyle: FontStyle.italic,
                        color: isDark ? Colors.grey[500] : Colors.grey[400],
                      ),
                    ),
                  ),
                ],
                if (contact.email != null && contact.email!.isNotEmpty) ...[
                  const SizedBox(width: 8),
                  Icon(
                    Icons.email_outlined,
                    size: 15,
                    color: isDark ? Colors.grey[400] : Colors.grey[500],
                  ),
                  const SizedBox(width: 4),
                  Flexible(
                    child: Text(
                      contact.email!,
                      style: TextStyle(
                        fontSize: 12,
                        color: isDark ? Colors.grey[400] : Colors.grey[600],
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ],
            ),
            if (contact.notes != null && contact.notes!.isNotEmpty) ...[
              const SizedBox(height: 6),
              Text(
                contact.notes!,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: 11,
                  fontStyle: FontStyle.italic,
                  color: isDark ? Colors.grey[400] : Colors.grey[600],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyState(BuildContext context, bool isDark, String? filter) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(vertical: 40, horizontal: 20),
      child: Column(
        children: [
          Icon(
            Icons.contact_phone_outlined,
            size: 60,
            color: isDark ? Colors.grey[700] : Colors.grey[300],
          ),
          const SizedBox(height: 14),
          Text(
            filter == null
                ? "Aucun contact enregistré"
                : "Aucun ${filter == 'CLIENT' ? 'client' : 'fournisseur'} trouvé",
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            "Ajoutez vos clients, revendeurs ou fournisseurs d'aliments et intrants.",
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 12,
              color: isDark ? Colors.grey[400] : Colors.grey[600],
            ),
          ),
          const SizedBox(height: 18),
          ElevatedButton.icon(
            onPressed: () => _openContactModal(context),
            icon: const Icon(Icons.add_rounded),
            label: const Text("Créer un contact"),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
            ),
          ),
        ],
      ),
    );
  }

  void _openContactModal(BuildContext context, {Contact? contact}) {
    final isEditing = contact != null;
    final nameController = TextEditingController(text: contact?.name ?? "");
    final phoneController = TextEditingController(text: contact?.phone ?? "");
    final emailController = TextEditingController(text: contact?.email ?? "");
    final addressController = TextEditingController(text: contact?.address ?? "");
    final cityController = TextEditingController(text: contact?.city ?? "");
    final notesController = TextEditingController(text: contact?.notes ?? "");
    String selectedType = contact?.type.code ?? "CLIENT";

    final presets = ["Cotonou", "Abomey-Calavi", "Porto-Novo", "Parakou", "Bohicon"];

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (modalCtx, setModalState) {
          final isDarkModal = Theme.of(modalCtx).brightness == Brightness.dark;
          final contactState = ref.watch(contactsProvider);

          return Container(
            margin: EdgeInsets.only(
              top: MediaQuery.of(modalCtx).padding.top + 20,
              bottom: MediaQuery.of(modalCtx).viewInsets.bottom,
            ),
            decoration: BoxDecoration(
              color: isDarkModal ? const Color(0xFF0F172A) : Colors.white,
              borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
            ),
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Center(
                    child: Container(
                      width: 40,
                      height: 4,
                      decoration: BoxDecoration(
                        color: Colors.grey[400],
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    isEditing ? "Modifier le contact" : "Nouveau contact",
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    "Renseignez les coordonnées de votre partenaire d'exploitation.",
                    style: TextStyle(
                      fontSize: 12,
                      color: isDarkModal ? Colors.grey[400] : Colors.grey[600],
                    ),
                  ),
                  const SizedBox(height: 18),

                  // Sélecteur de type
                  const Text(
                    "Type de contact *",
                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: ChoiceChip(
                          label: const Center(child: Text("Client")),
                          selected: selectedType == 'CLIENT',
                          onSelected: (val) {
                            if (val) setModalState(() => selectedType = 'CLIENT');
                          },
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: ChoiceChip(
                          label: const Center(child: Text("Fournisseur")),
                          selected: selectedType == 'SUPPLIER',
                          onSelected: (val) {
                            if (val) setModalState(() => selectedType = 'SUPPLIER');
                          },
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: ChoiceChip(
                          label: const Center(child: Text("Mixte")),
                          selected: selectedType == 'BOTH',
                          onSelected: (val) {
                            if (val) setModalState(() => selectedType = 'BOTH');
                          },
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Nom
                  TextField(
                    controller: nameController,
                    decoration: const InputDecoration(
                      labelText: "Nom complet ou Raison sociale *",
                      hintText: "Ex: Établissement Koffi & Fils",
                      prefixIcon: Icon(Icons.badge_outlined),
                    ),
                  ),
                  const SizedBox(height: 14),

                  // Téléphone & Ville
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: phoneController,
                          keyboardType: TextInputType.phone,
                          decoration: const InputDecoration(
                            labelText: "Téléphone",
                            hintText: "Ex: +229 97 00 00 00",
                            prefixIcon: Icon(Icons.phone_outlined),
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: TextField(
                          controller: cityController,
                          decoration: const InputDecoration(
                            labelText: "Ville",
                            hintText: "Ex: Calavi",
                            prefixIcon: Icon(Icons.location_city_outlined),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),

                  // Suggestions de villes rapides
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: presets.map((city) {
                        return Padding(
                          padding: const EdgeInsets.only(right: 6),
                          child: ActionChip(
                            label: Text(city, style: const TextStyle(fontSize: 11)),
                            onPressed: () {
                              cityController.text = city;
                              setModalState(() {});
                            },
                          ),
                        );
                      }).toList(),
                    ),
                  ),
                  const SizedBox(height: 14),

                  // Email
                  TextField(
                    controller: emailController,
                    keyboardType: TextInputType.emailAddress,
                    decoration: const InputDecoration(
                      labelText: "Adresse email (facultatif)",
                      hintText: "contact@entreprise.com",
                      prefixIcon: Icon(Icons.email_outlined),
                    ),
                  ),
                  const SizedBox(height: 14),

                  // Adresse
                  TextField(
                    controller: addressController,
                    decoration: const InputDecoration(
                      labelText: "Adresse physique / Repère",
                      hintText: "Ex: Rue du marché, Tokpa",
                      prefixIcon: Icon(Icons.place_outlined),
                    ),
                  ),
                  const SizedBox(height: 14),

                  // Notes
                  TextField(
                    controller: notesController,
                    maxLines: 2,
                    decoration: const InputDecoration(
                      labelText: "Notes ou observations",
                      hintText: "Ex: Grossiste régulier pour les plateaux d'œufs...",
                      prefixIcon: Icon(Icons.notes_rounded),
                    ),
                  ),
                  const SizedBox(height: 22),

                  // Boutons d'action
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: () => Navigator.pop(modalCtx),
                          child: const Text("Annuler"),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: ElevatedButton(
                          onPressed: contactState.isSubmitting
                              ? null
                              : () async {
                                  final name = nameController.text.trim();
                                  if (name.isEmpty) {
                                    ScaffoldMessenger.of(modalCtx).showSnackBar(
                                      const SnackBar(
                                        content: Text("Le nom du contact est obligatoire."),
                                        backgroundColor: AppColors.danger,
                                      ),
                                    );
                                    return;
                                  }

                                  bool success;
                                  if (isEditing) {
                                    success = await ref.read(contactsProvider.notifier).updateContact(
                                          contactId: contact.id,
                                          name: name,
                                          type: selectedType,
                                          phone: phoneController.text.trim(),
                                          email: emailController.text.trim(),
                                          address: addressController.text.trim(),
                                          city: cityController.text.trim(),
                                          notes: notesController.text.trim(),
                                        );
                                  } else {
                                    success = await ref.read(contactsProvider.notifier).createContact(
                                          name: name,
                                          type: selectedType,
                                          phone: phoneController.text.trim(),
                                          email: emailController.text.trim(),
                                          address: addressController.text.trim(),
                                          city: cityController.text.trim(),
                                          notes: notesController.text.trim(),
                                        );
                                  }

                                  if (!modalCtx.mounted) return;
                                  if (success) {
                                    Navigator.pop(modalCtx);
                                    if (!mounted) return;
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      SnackBar(
                                        content: Text(
                                          isEditing
                                              ? "Contact mis à jour avec succès !"
                                              : "Contact ajouté au carnet d'adresses !",
                                        ),
                                        backgroundColor: AppColors.success,
                                      ),
                                    );
                                  }
                                },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.primary,
                            foregroundColor: Colors.white,
                          ),
                          child: contactState.isSubmitting
                              ? const SizedBox(
                                  width: 20,
                                  height: 20,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    color: Colors.white,
                                  ),
                                )
                              : Text(isEditing ? "Enregistrer" : "Créer le contact"),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  void _confirmDelete(BuildContext context, Contact contact) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text("Supprimer ce contact ?"),
        content: Text(
          "Êtes-vous sûr de vouloir retirer \"${contact.name}\" de votre répertoire ? Cette action est irréversible.",
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text("Annuler"),
          ),
          ElevatedButton(
            onPressed: () async {
              final messenger = ScaffoldMessenger.of(context);
              Navigator.pop(ctx);
              final success =
                  await ref.read(contactsProvider.notifier).deleteContact(contact.id);
              if (success && mounted) {
                messenger.showSnackBar(
                  const SnackBar(
                    content: Text("Contact supprimé avec succès."),
                    backgroundColor: AppColors.success,
                  ),
                );
              }
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.danger,
              foregroundColor: Colors.white,
            ),
            child: const Text("Supprimer"),
          ),
        ],
      ),
    );
  }
}
