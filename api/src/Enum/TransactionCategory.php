<?php

declare(strict_types=1);

namespace App\Enum;

enum TransactionCategory: string
{
    // Catégories de Recettes (INCOME)
    case EGG_SALE = 'EGG_SALE';                     // Vente de plateaux d'œufs de table
    case MEAT_POULTRY_SALE = 'MEAT_POULTRY_SALE';   // Vente de poulets de chair vifs ou abattus
    case LAYER_CULL_SALE = 'LAYER_CULL_SALE';       // Vente de poules pondeuses réformées
    case CHICK_SALE = 'CHICK_SALE';                 // Vente de poussins ou sujets reproducteurs
    case MANURE_SALE = 'MANURE_SALE';               // Vente de fiente / fumier / engrais organique
    case OTHER_INCOME = 'OTHER_INCOME';             // Autres encaissements ou prestations

    // Catégories de Dépenses (EXPENSE)
    case FEED_PURCHASE = 'FEED_PURCHASE';           // Achat d'aliments complets, concentrés, maïs, tourteaux
    case CHICK_PURCHASE = 'CHICK_PURCHASE';         // Achat de poussins d'un jour au couvoir
    case MEDICATION_VACCINE = 'MEDICATION_VACCINE'; // Vaccins, vitamines, antibiotiques et soins vétérinaires
    case EQUIPMENT_LITTER = 'EQUIPMENT_LITTER';     // Litière (copeaux), mangeoires, abreuvoirs, alvéoles
    case SALARY_LABOR = 'SALARY_LABOR';             // Salaires du personnel et main-d'œuvre journalière
    case UTILITIES = 'UTILITIES';                   // Électricité (SBEE), Eau (SONEB), carburant du groupe
    case TRANSPORT = 'TRANSPORT';                   // Transport des intrants, livraisons des volailles et œufs
    case RENT_LEASE = 'RENT_LEASE';                 // Loyer du site d'élevage ou bail foncier
    case OTHER_EXPENSE = 'OTHER_EXPENSE';           // Autres charges diverses

    public function getType(): TransactionType
    {
        return match ($this) {
            self::EGG_SALE,
            self::MEAT_POULTRY_SALE,
            self::LAYER_CULL_SALE,
            self::CHICK_SALE,
            self::MANURE_SALE,
            self::OTHER_INCOME => TransactionType::INCOME,

            self::FEED_PURCHASE,
            self::CHICK_PURCHASE,
            self::MEDICATION_VACCINE,
            self::EQUIPMENT_LITTER,
            self::SALARY_LABOR,
            self::UTILITIES,
            self::TRANSPORT,
            self::RENT_LEASE,
            self::OTHER_EXPENSE => TransactionType::EXPENSE,
        };
    }
}
