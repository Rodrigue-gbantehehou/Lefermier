<?php

declare(strict_types=1);

namespace App\Enum;

enum ContactType: string
{
    case CLIENT = 'CLIENT';     // Client / Acheteur d'œufs ou volailles
    case SUPPLIER = 'SUPPLIER'; // Fournisseur d'aliments, poussins, produits vétérinaires
    case BOTH = 'BOTH';         // Partenaire mixte (achats & ventes)
}
