# Audit `paulbert_base` — mapping SQL → modèles backend

**Source** : export [paulbert_base.sql](../paulbert_base.sql) (MariaDB 10.4, utf8mb4).  
**Référence** : [SPÉCIFICATION TECHNIQUE DÉVELOPPEURS](../SPÉCIFICATION%20TECHNIQUE%20DÉVELOPPEURS).

---

## 1. Synthèse

| Élément | Détail |
|--------|--------|
| Tables | 42 |
| Moteur | InnoDB (sauf lignes `CREATE` sans ENGINE sur quelques tables ; contraintes FK appliquées en fin de script) |
| PK | Toutes les tables ont `id` BIGINT UNSIGNED AUTO_INCREMENT |
| FK | Définies explicitement (ON DELETE/UPDATE documentés ci-dessous) |
| Données initiales | `roles` uniquement (10 lignes) — **pas** de `permissions` ni `users` dans le dump |

---

## 2. Index et contraintes d’unicité (métier)

| Table | Contrainte | Signification métier |
|-------|------------|----------------------|
| `academic_terms` | UNIQUE (`school_year_id`, `code`) | Un code de trimestre par année |
| `attendance_records` | UNIQUE (`student_id`, `class_id`, `attendance_date`, `schedule_entry_id`) | Une ligne d’absence par élève/date/séance |
| `bulletins` | UNIQUE (`bulletin_number`), UNIQUE (`evaluation_period_id`, `student_id`) | Numéro bulletin unique ; un bulletin par élève et période |
| `classes` | UNIQUE (`school_year_id`, `code`) | Code de classe unique par année |
| `enrollments` | UNIQUE (`enrollment_number`), UNIQUE (`student_id`, `school_year_id`) | **Une inscription par élève et année** (aligné spec 13.1) |
| `evaluation_periods` | UNIQUE (`school_year_id`, `code`) | Code période unique par année |
| `evaluation_types` | UNIQUE (`code`) | Codes globaux |
| `fee_types` | UNIQUE (`code`) | |
| `grades` | UNIQUE (`evaluation_period_id`, `evaluation_type_id`, `class_id`, `student_id`, `subject_id`) | Une note par combinaison |
| `grade_rankings` | UNIQUE (`evaluation_period_id`, `class_id`, `student_id`) | Un classement par élève/période/classe |
| `invoices` | UNIQUE (`invoice_number`) | |
| `levels` | UNIQUE (`code`) | |
| `payments` | UNIQUE (`payment_reference`) | |
| `permissions` | UNIQUE (`name`), UNIQUE (`code`) | |
| `receipts` | UNIQUE (`payment_id`), UNIQUE (`receipt_number`) | Un reçu par paiement |
| `roles` | UNIQUE (`name`), UNIQUE (`code`) | |
| `role_permissions` | UNIQUE (`role_id`, `permission_id`) | |
| `rooms` | UNIQUE (`code`) | |
| `school_years` | UNIQUE (`name`) | |
| `students` | UNIQUE (`student_code`) | |
| `student_class_assignments` | UNIQUE (`student_id`, `class_id`, `school_year_id`) | **Une affectation élève/classe par année** |
| `student_guardians` | UNIQUE (`student_id`, `guardian_id`) | |
| `subjects` | UNIQUE (`code`) | |
| `teachers` | UNIQUE (`employee_code`), UNIQUE (`user_id`) | Un compte utilisateur max par enseignant |
| `teacher_class_subjects` | UNIQUE (`teacher_id`, `class_id`, `subject_id`, `school_year_id`) | |
| `users` | UNIQUE (`email`), UNIQUE (`username`) | |
| `user_role_permissions` | UNIQUE (`user_id`, `permission_id`) | |

---

## 3. Relations FK (résumé)

Les clés étrangères couvrent : années scolaires → termes, périodes d’évaluation ; classes → niveaux, années, enseignant principal ; inscriptions → élèves, classes, années ; notes → périodes, types, classes, élèves, matières, enseignants ; bulletins ; absences ; emploi du temps → salles, matières, enseignants ; finance (factures, paiements, frais, dépenses) ; documents ; audit ; RBAC (`users.role_id`, `role_permissions`, `user_role_permissions`).

**Ordre de création des données** : respecter `school_years` / `levels` avant `classes`, `students` avant `enrollments`, etc.

---

## 4. Écarts BDD ↔ spécification

| Sujet | Spécification | Base réelle |
|-------|---------------|-------------|
| Inscription vs classe | Règle : pas plusieurs inscriptions actives par année | `enrollments` impose 1 ligne par (`student_id`, `school_year_id`) avec `class_id`. `student_class_assignments` impose aussi 1 triplet (`student_id`, `class_id`, `school_year_id`). **Les deux doivent rester alignés** : la classe « courante » doit correspondre entre `enrollments.class_id` et l’assignment actif pour l’année. |
| Comptes parent / élève | Rôles `parent`, `student` | Aucun `user_id` sur `students` ou `guardians`. Lien auth **applicatif** à définir (email, table pivot future, etc.). |
| Permissions | `students.view`, … | Tables `permissions` / `role_permissions` vides dans le dump — **à peupler** pour coller à la spec. |
| Mot de passe utilisateur | Convention Laravel `password` | Colonne **`password_hash`** — utiliser `getAuthPassword()` vers `password_hash` dans le modèle `User`. |
| Sanctum | `remember_token` présent | Compatible ; pas de colonne `email_verified_at` dans le dump — ajout migration optionnelle si besoin de vérification email. |

---

## 5. Colonnes / incohérences à traiter en code

- **`users.username`** : nullable UNIQUE — plusieurs NULL possibles en SQL ; gérer l’unicité côté appli si utilisé.
- **`documents`** vs **`teacher_documents`** : deux systèmes de fichiers ; l’API peut unifier par ressource ou routes séparées.
- **`accounting_entries`** : présent en BDD, peu détaillé dans la spec — prévoir service dédié plus tard.
- **Cascade** : certaines FK en `ON DELETE CASCADE` sur données métier (ex. bulletins/élève) — les politiques « suppression logique » de la spec peuvent nécessiter des **soft deletes** applicatifs sans suppression physique en cascade.

---

## 6. Mapping table → modèle Laravel (`App\Models`)

Convention : un modèle Eloquent par table, **`$table` implicite (snake_case pluriel)** = nom de table ; casts pour `datetime`, `decimal`, enums en `string` ou enum PHP 8.1+.

| Table | Modèle suggéré | Relations principales (à définir) |
|-------|----------------|-----------------------------------|
| `academic_terms` | `AcademicTerm` | `belongsTo` SchoolYear ; `hasMany` EvaluationPeriod, ScheduleEntry, … |
| `accounting_entries` | `AccountingEntry` | `belongsTo` User (created_by) |
| `announcements` | `Announcement` | `belongsTo` Class, User |
| `attendance_records` | `AttendanceRecord` | Student, Class, SchoolYear, Subject, Teacher, ScheduleEntry, Users |
| `audit_logs` | `AuditLog` | User |
| `bulletins` | `Bulletin` | SchoolYear, AcademicTerm, EvaluationPeriod, Class, Student, User |
| `classes` | `SchoolClass` | `$table = 'classes'` ; relations : Level, SchoolYear, Teacher (principal), … |
| `documents` | `Document` | Student, Teacher, Invoice, Payment, Expense, User |
| `document_access_logs` | `DocumentAccessLog` | Document, User |
| `enrollments` | `Enrollment` | Student, SchoolYear, Class, Users |
| `establishment_settings` | `EstablishmentSetting` | singleton métier |
| `evaluation_periods` | `EvaluationPeriod` | SchoolYear, AcademicTerm |
| `evaluation_types` | `EvaluationType` | — |
| `expenses` | `Expense` | ExpenseCategory, SchoolYear, Users |
| `expense_categories` | `ExpenseCategory` | — |
| `fee_assignments` | `FeeAssignment` | Student, SchoolYear, FeeType, Users |
| `fee_types` | `FeeType` | — |
| `grades` | `Grade` | SchoolYear, AcademicTerm, EvaluationPeriod, EvaluationType, SchoolClass, Student, Subject, Teacher, Users |
| `grade_rankings` | `GradeRanking` | SchoolYear, EvaluationPeriod, Class, Student |
| `guardians` | `Guardian` | `belongsToMany` Student via `student_guardians` |
| `invoices` | `Invoice` | Student, Enrollment, SchoolYear, Users |
| `levels` | `Level` | `hasMany` Class, Subject |
| `notifications` | `Notification` | User |
| `payments` | `Payment` | Student, Invoice, FeeAssignment, SchoolYear, User |
| `permissions` | `Permission` | `belongsToMany` Role, User (pivot) |
| `receipts` | `Receipt` | Payment, User |
| `roles` | `Role` | `hasMany` User ; `belongsToMany` Permission |
| `role_permissions` | *(pivot)* | Role, Permission |
| `rooms` | `Room` | — |
| `schedule_entries` | `ScheduleEntry` | SchoolYear, AcademicTerm, Class, Subject, Teacher, Room, Users |
| `school_years` | `SchoolYear` | — |
| `students` | `Student` | Enrollments, Guardians, … |
| `student_class_assignments` | `StudentClassAssignment` | Student, Class, SchoolYear |
| `student_guardians` | `StudentGuardian` | Student, Guardian |
| `subjects` | `Subject` | Level |
| `teachers` | `Teacher` | User (optional) |
| `teacher_class_subjects` | `TeacherClassSubject` | Teacher, SchoolClass, Subject, SchoolYear |
| `teacher_documents` | `TeacherDocument` | Teacher, User |
| `users` | `User` | Role ; `hasMany` UserRolePermission |
| `user_role_permissions` | `UserRolePermission` | User, Permission |

**Note** : pour `classes`, nommer le modèle `SchoolClass` (ou `ClassGroup`) et `$table = 'classes'` pour éviter le mot-clé `class`.

---

## 7. Prochaines étapes implémentation

1. Générer les modèles Eloquent restants (manuellement ou `php artisan make:model`) avec relations.
2. ~~Adapter `User` à `password_hash` + Sanctum.~~ (fait dans `backend-api`.)
3. Seed des `permissions` alignés sur la spec RBAC, puis `role_permissions`.
4. Documenter la règle métier **enrollments ↔ student_class_assignments** dans le service d’inscription.

---

*Document généré dans le cadre de la PHASE 0 — audit & setup.*
