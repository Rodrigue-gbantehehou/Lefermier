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
  });

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
    };
  }

  SyncQueueItem copyWith({
    int? retryCount,
    String? lastError,
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
      lastError: lastError ?? this.lastError,
    );
  }
}
