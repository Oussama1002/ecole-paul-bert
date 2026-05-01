<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class RolesSeeder extends Seeder
{
    public function run(): void
    {
        $now = now();
        $rows = [
            [1, 'Super Administrateur', 'super_admin', 'Accès total au système'],
            [2, 'Administrateur', 'admin', 'Gestion globale de l’établissement'],
            [3, 'Direction', 'director', 'Pilotage global et supervision'],
            [4, 'Responsable pédagogique', 'pedagogical_manager', 'Suivi pédagogique'],
            [5, 'Scolarité', 'school_office', 'Gestion des élèves et inscriptions'],
            [6, 'Enseignant', 'teacher', 'Gestion des notes, absences et planning'],
            [7, 'Comptable', 'accountant', 'Gestion financière et facturation'],
            [8, 'RH', 'hr', 'Gestion administrative du personnel'],
            [9, 'Parent', 'parent', 'Consultation limitée aux informations autorisées'],
            [10, 'Élève', 'student', 'Consultation de ses informations'],
        ];

        foreach ($rows as [$id, $name, $code, $description]) {
            DB::table('roles')->updateOrInsert(
                ['id' => $id],
                [
                    'name' => $name,
                    'code' => $code,
                    'description' => $description,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]
            );
        }
    }
}
