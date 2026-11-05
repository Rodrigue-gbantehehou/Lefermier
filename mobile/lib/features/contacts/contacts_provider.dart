import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dio/dio.dart';
import '../../core/api/api_client.dart';
import '../../core/api/api_endpoints.dart';
import '../../core/models/contact.dart';
import '../../core/sync/sync_service.dart';
import '../auth/auth_provider.dart';

class ContactsState {
  final bool isLoading;
  final bool isSubmitting;
  final String? error;
  final List<Contact> contacts;
  final String? typeFilter;
  final String searchQuery;

  const ContactsState({
    this.isLoading = false,
    this.isSubmitting = false,
    this.error,
    this.contacts = const [],
    this.typeFilter,
    this.searchQuery = "",
  });

  ContactsState copyWith({
    bool? isLoading,
    bool? isSubmitting,
    String? error,
    List<Contact>? contacts,
    String? typeFilter,
    String? searchQuery,
    bool clearError = false,
    bool clearFilter = false,
  }) {
    return ContactsState(
      isLoading: isLoading ?? this.isLoading,
      isSubmitting: isSubmitting ?? this.isSubmitting,
      error: clearError ? null : (error ?? this.error),
      contacts: contacts ?? this.contacts,
      typeFilter: clearFilter ? null : (typeFilter ?? this.typeFilter),
      searchQuery: searchQuery ?? this.searchQuery,
    );
  }

  int get clientsCount =>
      contacts.where((c) => c.type == ContactType.client || c.type == ContactType.both).length;

  int get suppliersCount =>
      contacts.where((c) => c.type == ContactType.supplier || c.type == ContactType.both).length;

  List<Contact> get filteredContacts {
    return contacts.where((c) {
      if (typeFilter != null) {
        if (typeFilter == 'CLIENT' && c.type != ContactType.client && c.type != ContactType.both) {
          return false;
        }
        if (typeFilter == 'SUPPLIER' && c.type != ContactType.supplier && c.type != ContactType.both) {
          return false;
        }
      }

      if (searchQuery.trim().isNotEmpty) {
        final query = searchQuery.trim().toLowerCase();
        final matchesName = c.name.toLowerCase().contains(query);
        final matchesPhone = c.phone?.toLowerCase().contains(query) ?? false;
        final matchesCity = c.city?.toLowerCase().contains(query) ?? false;
        if (!matchesName && !matchesPhone && !matchesCity) return false;
      }

      return true;
    }).toList();
  }
}

class ContactsNotifier extends StateNotifier<ContactsState> {
  final ApiClient _apiClient;
  final Ref _ref;

  ContactsNotifier(this._apiClient, this._ref) : super(const ContactsState()) {
    loadContacts();
  }

  Future<void> loadContacts({bool showLoading = true}) async {
    final activeFarm = _ref.read(authProvider).activeFarm;
    if (activeFarm == null) {
      state = state.copyWith(isLoading: false);
      return;
    }

    if (showLoading) {
      state = state.copyWith(isLoading: true, clearError: true);
    }

    try {
      final response = await _apiClient.dio.get(
        ApiEndpoints.farmContacts(activeFarm.id),
      );

      final rawList = response.data['data'] as List<dynamic>? ?? [];
      final contacts = rawList
          .map((item) => Contact.fromJson(item as Map<String, dynamic>))
          .toList();

      state = state.copyWith(
        isLoading: false,
        contacts: contacts,
      );
    } on DioException catch (e) {
      String message = "Impossible de charger le répertoire des contacts.";
      if (e.response?.data is Map && e.response?.data['message'] != null) {
        message = e.response!.data['message'] as String;
      }
      state = state.copyWith(isLoading: false, error: message);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: "Erreur: $e");
    }
  }

  void setFilter(String? type) {
    if (type == null) {
      state = state.copyWith(clearFilter: true);
    } else {
      state = state.copyWith(typeFilter: type);
    }
  }

  void setSearchQuery(String query) {
    state = state.copyWith(searchQuery: query);
  }

  Future<bool> createContact({
    required String name,
    required String type,
    String? phone,
    String? email,
    String? address,
    String? city,
    String? notes,
  }) async {
    final activeFarm = _ref.read(authProvider).activeFarm;
    if (activeFarm == null) return false;

    state = state.copyWith(isSubmitting: true, clearError: true);

    final payload = {
      'name': name.trim(),
      'type': type,
      if (phone != null && phone.trim().isNotEmpty) 'phone': phone.trim(),
      if (email != null && email.trim().isNotEmpty) 'email': email.trim().toLowerCase(),
      if (address != null && address.trim().isNotEmpty) 'address': address.trim(),
      if (city != null && city.trim().isNotEmpty) 'city': city.trim(),
      if (notes != null && notes.trim().isNotEmpty) 'notes': notes.trim(),
    };

    try {
      await _apiClient.dio.post(
        ApiEndpoints.farmContacts(activeFarm.id),
        data: payload,
      );

      await loadContacts(showLoading: false);
      state = state.copyWith(isSubmitting: false);
      return true;
    } on DioException catch (e) {
      if (e.type == DioExceptionType.connectionTimeout ||
          e.type == DioExceptionType.sendTimeout ||
          e.type == DioExceptionType.receiveTimeout ||
          e.type == DioExceptionType.connectionError ||
          e.response == null) {
        await SyncService(_apiClient).enqueueAction(
          label: "Création contact ($name)",
          method: "POST",
          endpoint: ApiEndpoints.farmContacts(activeFarm.id),
          payload: payload,
        );
        state = state.copyWith(isSubmitting: false);
        return true;
      }

      String msg = "Erreur lors de la création du contact.";
      if (e.response?.data is Map && e.response?.data['message'] != null) {
        msg = e.response!.data['message'] as String;
      }
      state = state.copyWith(isSubmitting: false, error: msg);
      return false;
    } catch (e) {
      state = state.copyWith(isSubmitting: false, error: "Erreur: $e");
      return false;
    }
  }

  Future<bool> updateContact({
    required String contactId,
    required String name,
    required String type,
    String? phone,
    String? email,
    String? address,
    String? city,
    String? notes,
    bool isActive = true,
  }) async {
    state = state.copyWith(isSubmitting: true, clearError: true);

    final payload = {
      'name': name.trim(),
      'type': type,
      if (phone != null && phone.trim().isNotEmpty) 'phone': phone.trim(),
      if (email != null && email.trim().isNotEmpty) 'email': email.trim().toLowerCase(),
      if (address != null && address.trim().isNotEmpty) 'address': address.trim(),
      if (city != null && city.trim().isNotEmpty) 'city': city.trim(),
      if (notes != null && notes.trim().isNotEmpty) 'notes': notes.trim(),
      'isActive': isActive,
    };

    try {
      await _apiClient.dio.put(
        ApiEndpoints.contactDetails(contactId),
        data: payload,
      );

      await loadContacts(showLoading: false);
      state = state.copyWith(isSubmitting: false);
      return true;
    } on DioException catch (e) {
      if (e.type == DioExceptionType.connectionTimeout ||
          e.type == DioExceptionType.sendTimeout ||
          e.type == DioExceptionType.receiveTimeout ||
          e.type == DioExceptionType.connectionError ||
          e.response == null) {
        await SyncService(_apiClient).enqueueAction(
          label: "Mise à jour contact ($name)",
          method: "PUT",
          endpoint: ApiEndpoints.contactDetails(contactId),
          payload: payload,
        );
        state = state.copyWith(isSubmitting: false);
        return true;
      }

      String msg = "Erreur lors de la modification du contact.";
      if (e.response?.data is Map && e.response?.data['message'] != null) {
        msg = e.response!.data['message'] as String;
      }
      state = state.copyWith(isSubmitting: false, error: msg);
      return false;
    } catch (e) {
      state = state.copyWith(isSubmitting: false, error: "Erreur: $e");
      return false;
    }
  }

  Future<bool> deleteContact(String contactId) async {
    state = state.copyWith(isSubmitting: true, clearError: true);

    try {
      await _apiClient.dio.delete(
        ApiEndpoints.contactDetails(contactId),
      );

      await loadContacts(showLoading: false);
      state = state.copyWith(isSubmitting: false);
      return true;
    } on DioException catch (e) {
      String msg = "Erreur lors de la suppression du contact.";
      if (e.response?.data is Map && e.response?.data['message'] != null) {
        msg = e.response!.data['message'] as String;
      }
      state = state.copyWith(isSubmitting: false, error: msg);
      return false;
    } catch (e) {
      state = state.copyWith(isSubmitting: false, error: "Erreur: $e");
      return false;
    }
  }
}

final contactsProvider =
    StateNotifierProvider<ContactsNotifier, ContactsState>((ref) {
  ref.watch(authProvider.select((s) => s.activeFarm?.id));
  return ContactsNotifier(ApiClient(), ref);
});
