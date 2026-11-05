import 'package:flutter/material.dart';

enum ContactType {
  client('CLIENT', 'Client', Icons.person_rounded),
  supplier('SUPPLIER', 'Fournisseur', Icons.local_shipping_rounded),
  both('BOTH', 'Client & Fournisseur', Icons.people_alt_rounded);

  final String code;
  final String label;
  final IconData icon;

  const ContactType(this.code, this.label, this.icon);

  static ContactType fromCode(String? code) {
    switch (code) {
      case 'SUPPLIER':
        return ContactType.supplier;
      case 'BOTH':
        return ContactType.both;
      case 'CLIENT':
      default:
        return ContactType.client;
    }
  }
}

class Contact {
  final String id;
  final String? farmId;
  final String name;
  final ContactType type;
  final String? phone;
  final String? email;
  final String? address;
  final String? city;
  final String? notes;
  final bool isActive;
  final DateTime? createdAt;

  const Contact({
    required this.id,
    this.farmId,
    required this.name,
    required this.type,
    this.phone,
    this.email,
    this.address,
    this.city,
    this.notes,
    this.isActive = true,
    this.createdAt,
  });

  factory Contact.fromJson(Map<String, dynamic> json) {
    return Contact(
      id: json['id'] as String? ?? '',
      farmId: json['farmId'] as String?,
      name: json['name'] as String? ?? 'Contact',
      type: ContactType.fromCode(json['type'] as String?),
      phone: json['phone'] as String?,
      email: json['email'] as String?,
      address: json['address'] as String?,
      city: json['city'] as String?,
      notes: json['notes'] as String?,
      isActive: json['isActive'] as bool? ?? true,
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'] as String)
          : null,
    );
  }

  bool get isCustomer => type == ContactType.client || type == ContactType.both;
  bool get isSupplier => type == ContactType.supplier || type == ContactType.both;

  Map<String, dynamic> toJson() => {
        'name': name,
        'type': type.code,
        if (phone != null) 'phone': phone,
        if (email != null) 'email': email,
        if (address != null) 'address': address,
        if (city != null) 'city': city,
        if (notes != null) 'notes': notes,
      };
}
