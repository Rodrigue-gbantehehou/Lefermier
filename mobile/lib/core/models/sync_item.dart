/// Statut d'une action de l'outbox.
class SyncItemStatus {
  /// À envoyer (éventuellement après `nextAttemptAt`).
  static const String pending = 'pending';

  /// Refusée définitivement par le serveur (400/403/404/422) : n'est plus renvoyée
  /// automatiquement, l'utilisateur choisit de réessayer ou d'abandonner.
  static const String failed = 'failed';
}

class SyncQueueItem {
  final String id;
  final String label;
  final String method;
  final String endpoint;
  final Map<String, dynamic> payload;
  final String idempotencyKey;
  final DateTime createdAt;
  final int retryCount;
  final String? lastError;

  /// Ferme active au moment de la saisie : envoyée dans `X-Farm-Id` au moment du flush,
  /// quelle que soit la ferme sélectionnée entre-temps.
  final String? farmId;

  /// Titulaire de la session au moment de la saisie (claim `username` du JWT).
  /// Une action n'est jamais envoyée sous la session d'un autre utilisateur.
  final String? ownerKey;

  final String status;
  final DateTime? nextAttemptAt;
  final int? httpStatus;

  const SyncQueueItem({
    required this.id,
    required this.label,
    required this.method,
    required this.endpoint,
    required this.payload,
    required this.idempotencyKey,
    required this.createdAt,
    this.retryCount = 0,
    this.lastError,
    this.farmId,
    this.ownerKey,
    this.status = SyncItemStatus.pending,
    this.nextAttemptAt,
    this.httpStatus,
  });

  bool get isFailed => status == SyncItemStatus.failed;
  bool get isPending => status == SyncItemStatus.pending;

  factory SyncQueueItem.fromJson(Map<String, dynamic> json) {
    return SyncQueueItem(
      id: json['id'] as String? ?? '',
      label: json['label'] as String? ?? 'Action hors-ligne',
      method: json['method'] as String? ?? 'POST',
      endpoint: json['endpoint'] as String? ?? '',
      payload: (json['payload'] as Map<String, dynamic>?) ?? {},
      idempotencyKey: json['idempotencyKey'] as String? ?? '',
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'] as String) ?? DateTime.now()
          : DateTime.now(),
      retryCount: (json['retryCount'] as num?)?.toInt() ?? 0,
      lastError: json['lastError'] as String?,
      farmId: json['farmId'] as String?,
      ownerKey: json['ownerKey'] as String?,
      status: json['status'] as String? ?? SyncItemStatus.pending,
      nextAttemptAt: json['nextAttemptAt'] != null
          ? DateTime.tryParse(json['nextAttemptAt'] as String)
          : null,
      httpStatus: (json['httpStatus'] as num?)?.toInt(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'label': label,
      'method': method,
      'endpoint': endpoint,
      'payload': payload,
      'idempotencyKey': idempotencyKey,
      'createdAt': createdAt.toIso8601String(),
      'retryCount': retryCount,
      'lastError': lastError,
      'farmId': farmId,
      'ownerKey': ownerKey,
      'status': status,
      'nextAttemptAt': nextAttemptAt?.toIso8601String(),
      'httpStatus': httpStatus,
    };
  }

  SyncQueueItem copyWith({
    int? retryCount,
    String? lastError,
    String? farmId,
    String? ownerKey,
    String? status,
    DateTime? nextAttemptAt,
    bool clearNextAttempt = false,
    int? httpStatus,
    bool clearError = false,
  }) {
    return SyncQueueItem(
      id: id,
      label: label,
      method: method,
      endpoint: endpoint,
      payload: payload,
      idempotencyKey: idempotencyKey,
      createdAt: createdAt,
      retryCount: retryCount ?? this.retryCount,
      lastError: clearError ? null : (lastError ?? this.lastError),
      farmId: farmId ?? this.farmId,
      ownerKey: ownerKey ?? this.ownerKey,
      status: status ?? this.status,
      nextAttemptAt: clearNextAttempt ? null : (nextAttemptAt ?? this.nextAttemptAt),
      httpStatus: clearError ? null : (httpStatus ?? this.httpStatus),
    );
  }
}
