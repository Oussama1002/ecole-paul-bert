<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Charge le schéma complet extrait de paulbert_base.sql (toutes les tables métier).
 *
 * Ré-exécutez `php artisan migrate:fresh` ou importez le dump SQL si vous devez réinitialiser.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('school_years')) {
            return;
        }

        $path = database_path('schema/paulbert_base_structure.sql');
        if (! is_readable($path)) {
            throw new RuntimeException('Fichier introuvable : '.$path);
        }

        $sql = file_get_contents($path);
        if ($sql === false || $sql === '') {
            throw new RuntimeException('Impossible de lire le schéma SQL.');
        }

        $this->runMysqlScript($sql);
    }

    /**
     * Exécute le script SQL instruction par instruction (PDO n’exécute qu’une requête par défaut
     * sans MYSQL_ATTR_MULTI_STATEMENTS ; les commentaires « -- » en tête provoquent alors l’erreur 1064).
     */
    private function runMysqlScript(string $raw): void
    {
        $sql = preg_replace('/^\xEF\xBB\xBF/', '', $raw);
        $sql = str_replace(["\r\n", "\r"], "\n", $sql);

        $lines = explode("\n", $sql);
        $kept = [];
        foreach ($lines as $line) {
            $t = trim($line);
            if ($t === '' || str_starts_with($t, '--')) {
                continue;
            }
            $kept[] = $line;
        }
        $sql = implode("\n", $kept);

        $chunks = preg_split('/;\s*\n/', $sql, -1, PREG_SPLIT_NO_EMPTY);
        foreach ($chunks as $chunk) {
            $stmt = trim($chunk);
            if ($stmt === '') {
                continue;
            }
            if (! str_ends_with($stmt, ';')) {
                $stmt .= ';';
            }

            // Reprise après échec partiel ou tables déjà présentes (ex. announcements).
            if (preg_match('/^CREATE\s+TABLE\s+`([^`]+)`/i', $stmt, $m)) {
                if (Schema::hasTable($m[1])) {
                    continue;
                }
            }

            $this->executeStatement($stmt);
        }
    }

    private function executeStatement(string $stmt): void
    {
        $isAlter = (bool) preg_match('/^ALTER\s+TABLE\s+`/i', $stmt);

        if ($isAlter && preg_match('/^ALTER\s+TABLE\s+`([^`]+)`/i', $stmt, $m)) {
            $table = $m[1];
            if (preg_match('/ADD\s+PRIMARY\s+KEY/i', $stmt) && $this->tableHasPrimaryKey($table)) {
                $stmt = preg_replace('/ADD\s+PRIMARY\s+KEY\s*\([^)]*\)\s*,?\s*/i', '', $stmt);
                $stmt = preg_replace('/,\s*,/', ',', $stmt);
                $stmt = preg_replace('/,\s*;/', ';', $stmt);
                $stmt = trim($stmt);
                if (preg_match('/^ALTER\s+TABLE\s+`[^`]+`\s*;$/i', $stmt)) {
                    return;
                }
            }
        }

        try {
            DB::unprepared($stmt);
        } catch (QueryException $e) {
            if ($isAlter && $this->isBenignMysqlSchemaConflict($e)) {
                return;
            }
            throw $e;
        }
    }

    private function tableHasPrimaryKey(string $table): bool
    {
        if (! Schema::hasTable($table)) {
            return false;
        }

        $db = DB::connection()->getDatabaseName();
        if ($db === '') {
            return false;
        }

        $row = DB::selectOne(
            'select 1 as ok from information_schema.statistics where table_schema = ? and table_name = ? and index_name = ? limit 1',
            [$db, $table, 'PRIMARY']
        );

        return $row !== null;
    }

    /**
     * Index / PK / contraintes déjà appliqués (reprise sur base partiellement migrée).
     *
     * @see https://mariadb.com/kb/en/mariadb-error-codes/
     */
    private function isBenignMysqlSchemaConflict(QueryException $e): bool
    {
        $code = (int) ($e->errorInfo[1] ?? 0);

        return in_array($code, [
            1060, // ER_DUP_FIELDNAME
            1061, // ER_DUP_KEYNAME
            1068, // ER_MULTIPLE_PRI_KEY
            1826, // ER_FK_DUP_NAME (duplicate foreign key)
        ], true);
    }

    public function down(): void
    {
        // Non pris en charge : utilisez migrate:fresh ou restaurez une sauvegarde.
    }
};
