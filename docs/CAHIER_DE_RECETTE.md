# École Paul Bert — Cahier de recette (minimal)

> Version : 3.0 — Date : 2026-11-06
> Un seul enregistrement par écran / parcours : les modules testés ensemble sont regroupés.
> Dérouler le scénario, puis cocher **Statut** (✅ OK / ❌ KO) et noter une remarque si besoin.

---

| # | Parcours (modules couverts) | Scénario de test | Résultat attendu | Statut |
|---|---|---|---|---|
| 1 | **Connexion & accès** (Authentification · Tableau de bord · Sécurité) | Se connecter en admin, voir le tableau de bord, se déconnecter. Se reconnecter en enseignant et tenter d'ouvrir la Finance. | Connexion/déconnexion OK, indicateurs affichés ; accès Finance refusé pour l'enseignant. | ☐ |
| 2 | **Utilisateurs & paramétrage** (Utilisateurs/rôles · Paramétrage) | Créer un utilisateur avec un rôle, puis créer une année scolaire, un niveau, une classe et une matière. | Utilisateur actif avec le bon rôle ; éléments enregistrés et visibles dans les listes. | ☐ |
| 3 | **Élèves & inscriptions** (Élèves · Responsables) | Créer un élève, l'inscrire dans une classe et lier un responsable. | Élève créé, inscrit et rattaché au responsable. | ☐ |
| 4 | **Enseignants & emploi du temps** (Enseignants · Emploi du temps) | Créer un enseignant, l'affecter à une classe/matière, puis ajouter un créneau de cours. | Affectation visible ; créneau affiché, conflit détecté si chevauchement. | ☐ |
| 5 | **Scolarité** (Assiduité · Notes · Bulletins) | Faire l'appel d'une classe et justifier une absence ; saisir les notes et calculer le classement ; générer un bulletin en PDF. | Présences et notes enregistrées, moyennes/rangs calculés, bulletin PDF conforme. | ☐ |
| 6 | **Finance** (Paiements · Bilan) | Enregistrer un paiement puis consulter le bilan financier. | Paiement enregistré, reçu et bilan corrects. | ☐ |
| 7 | **Documents & communications** (Documents · Annonces) | Téléverser puis télécharger un document ; créer et publier une annonce. | Document récupérable ; annonce publiée et visible. | ☐ |

---

## Synthèse

| Total parcours | OK | KO | Remarques générales |
|---|---|---|---|
| 7 | | | |

*Chaque parcours regroupe les modules qui se testent sur le même écran ou dans le même flux. Les 14 modules restent couverts (voir la colonne « modules couverts »).*
