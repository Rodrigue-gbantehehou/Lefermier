# Règles de conception — Admin Lefermier

## 1. Objectif

L'application `admin/` est le back-office privé de la plateforme Lefermier. Elle est destinée aux créateurs du logiciel et aux membres autorisés de l'équipe technique ou opérationnelle.

Elle sert à piloter la plateforme dans son ensemble, et non à gérer les opérations quotidiennes d'une ferme.

## 2. Principes fondamentaux

- Séparer clairement l'administration de la plateforme de la gestion des fermes clientes.
- Utiliser l'API Symfony existante comme source centrale de données et de logique métier.
- Ne jamais connecter directement le frontend à la base de données.
- Ne jamais dupliquer dans le frontend les règles métier déjà définies dans l'API.
- Ne jamais considérer qu'une page protégée ou un bouton masqué suffit à garantir la sécurité.
- Privilégier la simplicité, la maintenabilité, la sécurité et la cohérence.
- Examiner l'architecture existante avant toute modification importante.
- Ne pas réécrire un module fonctionnel sans raison technique démontrée.

## 3. Responsabilités du back-office

Le back-office peut inclure les modules suivants, selon les besoins réels de la plateforme :

- **Tableau de bord :** indicateurs globaux sur l'activité de la plateforme.
- **Gestion des fermes :** consultation des fermes inscrites, de leur statut et de leurs informations administratives.
- **Gestion des comptes :** utilisateurs autorisés à accéder à la plateforme et administrateurs.
- **Abonnements :** offres, périodes, statuts et historique des changements.
- **Paiements :** consultation des transactions et de leur état.
- **Support :** suivi des demandes et incidents.
- **Configuration :** paramètres généraux explicitement prévus.
- **Journal d'audit :** historique des actions sensibles.
- **Supervision :** état des services et remontée des erreurs utiles à l'exploitation, sans exposer de données confidentielles.

Ne pas intégrer ici les modules de gestion des lots, de l'alimentation, de la santé animale, de la production ou des ventes propres à une ferme. Ces fonctions appartiennent à l'application de gestion des fermes.

Ne développer que les modules justifiés par un besoin réel.

## 4. Architecture technique

- Conserver une seule API Symfony centrale pour les applications `web/`, `mobile/` et `admin/`.
- Organiser les appels HTTP dans une couche dédiée aux services API.
- Centraliser la gestion des erreurs, des réponses et de l'authentification.
- Respecter les contrats API existants et leur documentation.
- Ne jamais inventer un endpoint, un champ ou un format de réponse.
- Utiliser des variables d'environnement pour les URL et paramètres propres à chaque environnement.
- Ne jamais exposer de secret dans le code frontend.
- Gérer explicitement les états de chargement, de réussite, d'absence de données et d'erreur.
- Prévoir les erreurs réseau, les sessions expirées et les réponses d'accès refusé.
- Réutiliser les dépendances, composants et conventions déjà présents dans le projet.

## 5. Authentification et autorisations

La sécurité doit être appliquée côté serveur pour chaque opération protégée.

- Définir des rôles distincts pour l'administration de la plateforme et la gestion des fermes.
- Appliquer le principe du moindre privilège.
- Refuser par défaut toute opération dont l'autorisation n'est pas accordée.
- Vérifier les permissions sur chaque ressource concernée.
- Ne jamais se fier uniquement au rôle déclaré dans le frontend.
- Empêcher les utilisateurs ordinaires des fermes d'accéder aux fonctions du back-office.
- Protéger les sessions et les jetons selon le mécanisme d'authentification retenu.
- Prévoir l'expiration, le renouvellement et la révocation des sessions ou jetons lorsque cela s'applique.
- Ne jamais exposer les mots de passe, jetons privés ou secrets dans les URL, les logs ou les messages d'erreur.
- Prévoir une authentification renforcée pour les comptes administrateurs lorsque possible.

## 6. Protection des données

- Ne collecter et n'afficher que les données nécessaires à l'administration.
- Garantir l'isolation des données entre les fermes clientes.
- Limiter l'accès aux données sensibles aux personnes autorisées.
- Ne jamais afficher de mot de passe ou de données confidentielles de paiement.
- Ne jamais permettre à un administrateur de consulter arbitrairement les données privées d'une ferme sans autorisation prévue.
- Définir une politique de conservation adaptée pour les journaux et les données de support.
- Ne pas utiliser de données réelles dans les environnements de test sans mesures de protection appropriées.

## 7. Actions sensibles et journalisation

Les opérations suivantes doivent faire l'objet de protections adaptées :

- suspension ou réactivation d'une ferme ;
- modification des droits d'un utilisateur ;
- changement d'une offre ou d'un abonnement ;
- révocation d'accès ;
- suppression de données ;
- modification des paramètres critiques.

Avant une opération à risque :

1. Vérifier les droits de l'administrateur côté API.
2. Présenter clairement la ressource concernée.
3. Expliquer les conséquences de l'action.
4. Demander une confirmation lorsque cela est justifié.
5. Empêcher les doubles soumissions.
6. Enregistrer l'action dans le journal d'audit côté serveur.

Le journal doit permettre de retrouver l'acteur, l'action, la ressource concernée, la date et le résultat. Il ne doit contenir aucun secret ni donnée confidentielle inutile.

Privilégier l'archivage ou la désactivation à la suppression définitive lorsque cela convient au besoin métier.

## 8. Interface et navigation

- Utiliser une navigation cohérente, stable et compréhensible.
- Regrouper les fonctionnalités par domaine métier.
- Prévoir une navigation latérale sur ordinateur et une navigation adaptée sur mobile.
- Afficher l'identité de l'administrateur, ses accès et la possibilité de se déconnecter.
- Utiliser une hiérarchie visuelle claire et professionnelle.
- Éviter les tableaux de bord surchargés de cartes et de graphiques décoratifs.
- Afficher uniquement les indicateurs utiles à la prise de décision.
- Utiliser des libellés explicites pour les actions.
- Ne jamais employer une couleur comme unique indication d'un statut.
- Prévoir des états visuels cohérents pour les actions en cours, réussies ou échouées.

## 9. Tableaux et formulaires

Les listes doivent intégrer, lorsque nécessaire :

- recherche ;
- filtres ;
- tri ;
- pagination ;
- affichage des statuts ;
- états vides ;
- gestion des erreurs.

Les formulaires doivent :

- utiliser des libellés clairs ;
- valider les données côté client et côté API ;
- afficher les erreurs près des champs concernés ;
- conserver les saisies après une erreur non destructive ;
- empêcher les doubles soumissions ;
- afficher une confirmation uniquement après la réussite effective de l'opération.

Ne pas ajouter de confirmation pour chaque action ordinaire. Réserver les confirmations aux actions qui présentent un risque réel.

## 10. Design system et composants

- Réutiliser le design system existant du projet.
- Si Tailwind CSS et shadcn/ui sont déjà adoptés, les utiliser conformément aux conventions établies.
- Créer des composants réutilisables pour les tableaux, formulaires, filtres, dialogues, alertes, badges de statut et états vides.
- Éviter les duplications de composants.
- Conserver une cohérence entre les espacements, les typographies, les couleurs, les bordures et les rayons.
- Prévoir les états `hover`, `focus`, `disabled`, `loading` et `error`.
- Utiliser une interface sobre adaptée à un outil professionnel.
- Ne pas ajouter de bibliothèque sans vérifier si le besoin peut être couvert par les outils déjà installés.

## 11. Accessibilité et responsive

- Utiliser des éléments HTML sémantiques.
- Associer chaque champ de formulaire à un libellé.
- Garantir la navigation au clavier et un focus visible.
- Vérifier les contrastes.
- Adapter les tableaux aux petits écrans.
- Prévoir des cibles tactiles utilisables sur mobile.
- Rendre les erreurs compréhensibles par les utilisateurs et accessibles aux technologies d'assistance.

## 12. Tests et validation

Avant de considérer une fonctionnalité comme terminée, vérifier :

- les permissions côté API ;
- l'isolation des données entre les fermes ;
- le comportement d'un utilisateur non autorisé ;
- les états de chargement, de réussite, d'erreur et d'absence de données ;
- la validation des formulaires ;
- les protections contre les doubles soumissions ;
- la journalisation des opérations sensibles ;
- l'affichage sur ordinateur et mobile ;
- les tests automatisés disponibles.

Ne pas déclarer les tests réussis s'ils n'ont pas été exécutés.

## 13. Méthode de travail pour l'assistant IA

Avant toute modification :

1. Lire ce document et les autres règles d'architecture du projet.
2. Examiner le code existant et les composants disponibles.
3. Identifier les endpoints et les permissions réellement disponibles.
4. Déterminer les impacts sur `api/`, `web/` et `mobile/`.
5. Proposer un plan limité et cohérent.

Pendant le développement :

- respecter les conventions existantes ;
- éviter les modifications non nécessaires ;
- ne pas inventer de fonctionnalités ou de données ;
- ne pas contourner les règles de sécurité ;
- demander confirmation avant toute migration destructive ou refonte majeure.

Après le développement :

- exécuter les tests disponibles ;
- vérifier les erreurs et les permissions ;
- documenter les nouvelles variables d'environnement ;
- signaler les vérifications non réalisées ;
- mettre à jour la documentation concernée.

## 14. Critères de validation

Une fonctionnalité est considérée comme terminée lorsque :

- le besoin est clairement défini ;
- les autorisations sont vérifiées côté API ;
- les données sont protégées ;
- les états d'interface sont traités ;
- les actions sensibles sont encadrées ;
- les tests pertinents passent ;
- aucune donnée sensible n'est exposée ;
- la documentation est à jour.
