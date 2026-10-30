import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';
import '../../core/models/flock.dart';

class FlocksScreen extends StatelessWidget {
  const FlocksScreen({super.key});

  final List<Flock> _flocks = const [
    Flock(
      id: "flock-1",
      name: "Pondeuses Bâtiment A",
      type: "LAYER",
      breed: "Lohmann Brown",
      initialQuantity: 500,
      currentQuantity: 494,
      startDate: "2026-08-15",
      status: "ACTIVE",
      buildingName: "Poulailler 1",
    ),
    Flock(
      id: "flock-2",
      name: "Poulets de chair B2",
      type: "BROILER",
      breed: "Cobb 500",
      initialQuantity: 1000,
      currentQuantity: 980,
      startDate: "2026-10-01",
      status: "ACTIVE",
      buildingName: "Poulailler 2",
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text("Bandes & Lots"),
      ),
      body: ListView.separated(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 80),
        itemCount: _flocks.length,
        separatorBuilder: (_, __) => const SizedBox(height: 12),
        itemBuilder: (context, index) {
          final flock = _flocks[index];
          final mortalityRate = ((flock.initialQuantity - flock.currentQuantity) / flock.initialQuantity) * 100;

          return Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          flock.name,
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: flock.isLayer ? AppColors.accentSoft : Colors.blue.shade50,
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          flock.isLayer ? "Pondeuses" : "Chair",
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            color: flock.isLayer ? AppColors.accent : Colors.blue.shade700,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    "${flock.breed} • ${flock.buildingName ?? 'Non assigné'}",
                    style: const TextStyle(fontSize: 12, color: AppColors.textMutedLight),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text("Vivant", style: TextStyle(fontSize: 10, color: AppColors.textMutedLight)),
                          Text(
                            "${flock.currentQuantity} sujets",
                            style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, fontFamily: 'monospace'),
                          ),
                        ],
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text("Départ", style: TextStyle(fontSize: 10, color: AppColors.textMutedLight)),
                          Text(
                            "${flock.initialQuantity}",
                            style: const TextStyle(fontSize: 14, color: AppColors.textMutedLight, fontFamily: 'monospace'),
                          ),
                        ],
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text("Pertes", style: TextStyle(fontSize: 10, color: AppColors.textMutedLight)),
                          Text(
                            "${mortalityRate.toStringAsFixed(1)}%",
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.bold,
                              color: mortalityRate > 5 ? AppColors.danger : AppColors.success,
                            ),
                          ),
                        ],
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
}
