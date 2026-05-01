# Décision produit — Finance en mode simple

## Objectif

En mode simple, la finance doit être comprise en 2 minutes par une direction d'école primaire, sans jargon comptable.

## Décision retenue

Le **Journal financier** est l'entrée principale de la finance en mode simple.

Priorités visibles:

- Recettes
- Dépenses
- Distinction charges fixes / variables
- Totaux mensuels et annuels
- Vision globale
- Suivi des impayés factures (si module factures activé)

## Application de la décision

### 1) Audit des écrans

- Le mode simple affiche la page `Journal financier` comme page finance centrale.
- Les modules avancés de comptabilité (rapports complexes, écrans techniques) restent hors parcours simple.
- Les écrans factures/paiements restent disponibles en mode avancé et ne perturbent pas le flux simple.

### 2) UX du journal simple

Le formulaire d'écriture couvre:

- date
- type (recette / dépense)
- nature de coût (fixe / variable pour les dépenses)
- catégorie
- libellé
- montant
- description
- pièce jointe facultative

Le tableau prend en charge:

- filtrage par mois, type et nature
- archivage non destructif (soft delete)
- consultation de la pièce jointe
- export CSV du journal filtré

### 3) Résumés affichés

Cartes et métriques:

- recettes du mois
- charges fixes
- charges variables
- solde du mois
- impayés factures (montant + nombre)
- synthèse annuelle
- synthèse globale

## Factures / paiements

- Les formulaires staff utilisent des sélecteurs de recherche (pas d'IDs bruts).
- Le flux paiement reste guidé: élève → facture ouverte → montant → méthode → reçu.
- Les listes affichent les noms (élève, numéro facture) plutôt que des identifiants techniques.

## Validation API

Le backend du journal simple valide:

- type et nature de coût autorisés
- montant numérique positif
- longueur des champs texte
- pièce jointe facultative (format/poids contrôlés)

Le backend expose aussi:

- résumé mensuel, annuel, global
- montant et nombre des factures impayées
- export CSV

## Garde-fous

- Suppression destructive évitée: archivage logique.
- Le mode simple conserve un langage fonctionnel (recette/dépense) et évite la logique comptable avancée.
