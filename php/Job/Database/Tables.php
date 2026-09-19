<?php

namespace Job\Database;

use Job\Job;

class Tables extends Job
{
    public function run(): array
    {
        $rows = $this->db()
            ->query('SELECT name, engine, distribution FROM _pico_table ORDER BY name')
            ->all();

        return array_map(static function (array $row): array {
            $distribution = json_decode((string) $row['distribution'], true);
            $global = true;
            $distributed = [];
            $tier = null;

            if (is_array($distribution)) {
                if (array_key_exists('ShardedByField', $distribution)) {
                    $tuple = array_values($distribution['ShardedByField']);
                    $global = false;
                    $distributed = [(string) ($tuple[0] ?? '')];
                    $tier = isset($tuple[1]) ? (string) $tuple[1] : null;
                } elseif (array_key_exists('ShardedImplicitly', $distribution)) {
                    $tuple = array_values($distribution['ShardedImplicitly']);
                    $global = false;
                    $distributed = array_map('strval', array_values((array) ($tuple[0] ?? [])));
                    $tier = isset($tuple[2]) ? (string) $tuple[2] : null;
                }
            }

            return [
                'name' => $row['name'],
                'engine' => $row['engine'],
                'global' => $global,
                'distributed' => $distributed,
                'tier' => $tier,
            ];
        }, $rows);
    }
}
