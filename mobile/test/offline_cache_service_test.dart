import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:poulvia/core/sync/offline_cache_service.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late OfflineCacheService cacheService;

  setUp(() {
    SharedPreferences.setMockInitialValues({});
    cacheService = OfflineCacheService();
  });

  group('OfflineCacheService - Versioned Offline Cache & Isolation', () {
    test('Stores map data with v2 envelope, timestamp, and userId', () async {
      await cacheService.setCache(
        farmId: 'farm_001',
        category: 'dashboard',
        data: {'totalFlocks': 4, 'totalLayers': 1200},
        userId: 'user_alice',
      );

      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString('offline_cache_v2_farm_001_dashboard');
      expect(raw, isNotNull);

      final decoded = jsonDecode(raw!) as Map<String, dynamic>;
      expect(decoded['v'], 2);
      expect(decoded['userId'], 'user_alice');
      expect(decoded['savedAt'], isNotNull);
      expect(decoded['data'], {'totalFlocks': 4, 'totalLayers': 1200});
    });

    test('getMapCache retrieves data for matching userId', () async {
      await cacheService.setCache(
        farmId: 'farm_001',
        category: 'dashboard',
        data: {'kpi': 42},
        userId: 'user_alice',
      );

      final result = await cacheService.getMapCache(
        farmId: 'farm_001',
        category: 'dashboard',
        currentUserId: 'user_alice',
      );

      expect(result, isNotNull);
      expect(result!['kpi'], 42);
    });

    test('getMapCache isolates accounts: returns null if accessed by different userId', () async {
      await cacheService.setCache(
        farmId: 'farm_001',
        category: 'dashboard',
        data: {'secretFinancial': 9999},
        userId: 'user_alice',
      );

      // Attempt to access with user_bob
      final result = await cacheService.getMapCache(
        farmId: 'farm_001',
        category: 'dashboard',
        currentUserId: 'user_bob',
      );

      expect(result, isNull);
    });

    test('getListCache retrieves list data for matching userId', () async {
      final flocks = [
        {'id': 'flock_1', 'name': 'Pondeuses Bat A'},
        {'id': 'flock_2', 'name': 'Poussins Bat B'},
      ];

      await cacheService.setCache(
        farmId: 'farm_001',
        category: 'flocks',
        data: flocks,
        userId: 'user_alice',
      );

      final result = await cacheService.getListCache(
        farmId: 'farm_001',
        category: 'flocks',
        currentUserId: 'user_alice',
      );

      expect(result, isNotNull);
      expect(result!.length, 2);
      expect(result[0]['name'], 'Pondeuses Bat A');
    });

    test('Backward compatibility: seamlessly reads legacy un-enveloped cache', () async {
      final prefs = await SharedPreferences.getInstance();
      // Write legacy format directly without v2 envelope
      await prefs.setString(
        'offline_cache_farm_001_legacy_items',
        jsonEncode([
          {'id': 'item_1', 'name': 'Maïs'},
        ]),
      );

      final result = await cacheService.getListCache(
        farmId: 'farm_001',
        category: 'legacy_items',
      );

      expect(result, isNotNull);
      expect(result!.length, 1);
      expect(result[0]['name'], 'Maïs');
    });

    test('getCacheAge returns recorded timestamp', () async {
      final before = DateTime.now().subtract(const Duration(seconds: 1));
      await cacheService.setCache(
        farmId: 'farm_001',
        category: 'eggs',
        data: {'today': 350},
      );
      final after = DateTime.now().add(const Duration(seconds: 1));

      final age = await cacheService.getCacheAge(farmId: 'farm_001', category: 'eggs');
      expect(age, isNotNull);
      expect(age!.isAfter(before), isTrue);
      expect(age.isBefore(after), isTrue);
    });

    test('clearFarmCache removes only target farm keys and leaves others intact', () async {
      await cacheService.setCache(farmId: 'farm_A', category: 'data', data: {'a': 1});
      await cacheService.setCache(farmId: 'farm_B', category: 'data', data: {'b': 2});

      await cacheService.clearFarmCache('farm_A');

      expect(await cacheService.getMapCache(farmId: 'farm_A', category: 'data'), isNull);
      expect(await cacheService.getMapCache(farmId: 'farm_B', category: 'data'), isNotNull);
    });

    test('clearAllCache purges all cached entries', () async {
      await cacheService.setCache(farmId: 'farm_A', category: 'data', data: {'a': 1});
      await cacheService.setCache(farmId: 'farm_B', category: 'data', data: {'b': 2});

      await cacheService.clearAllCache();

      expect(await cacheService.getMapCache(farmId: 'farm_A', category: 'data'), isNull);
      expect(await cacheService.getMapCache(farmId: 'farm_B', category: 'data'), isNull);
    });

    test('Anonymous caller cannot read user-designated cache', () async {
      await cacheService.setCache(
        farmId: 'farm_001',
        category: 'secret_flocks',
        data: [{'id': '1'}],
        userId: 'user_alice',
      );

      // Caller without currentUserId
      final result = await cacheService.getListCache(
        farmId: 'farm_001',
        category: 'secret_flocks',
      );

      expect(result, isNull);
    });

    test('Authenticated caller cannot read cache with null or missing userId', () async {
      final prefs = await SharedPreferences.getInstance();
      final envelope = {
        'v': 2,
        'savedAt': DateTime.now().toIso8601String(),
        'userId': null,
        'data': {'kpi': 100},
      };
      await prefs.setString('offline_cache_v2_farm_001_dashboard', jsonEncode(envelope));

      final result = await cacheService.getMapCache(
        farmId: 'farm_001',
        category: 'dashboard',
        currentUserId: 'user_alice',
      );

      expect(result, isNull);
    });
  });
}
