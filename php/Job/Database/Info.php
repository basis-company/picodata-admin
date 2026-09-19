<?php

namespace Job\Database;

use Throwable;
use Job\Job;

class Info extends Job
{
    public function run(): array
    {
        $db = $this->db();
        $info = [];

        try {
            $rows = $db->query('SELECT version()')->all();
            $info['version'] = reset($rows[0]);
        } catch (Throwable) {
        }

        try {
            $info['instances'] = array_map(static function (array $row): array {
                $state = json_decode((string) $row['current_state'], true);
                $row['current_state'] = is_array($state) ? $state[0] : $row['current_state'];
                $state = json_decode((string) $row['target_state'], true);
                $row['target_state'] = is_array($state) ? $state[0] : $row['target_state'];

                return $row;
            }, $db->query('SELECT * FROM _pico_instance')->all());
        } catch (Throwable) {
        }

        try {
            $info['tiers'] = array_map(static function (array $row): array {
                foreach (['can_vote', 'vshard_bootstrapped', 'is_default'] as $k) {
                    if (array_key_exists($k, $row)) {
                        $row[$k] = $row[$k] === 't';
                    }
                }

                return $row;
            }, $db->query('SELECT * FROM _pico_tier')->all());
        } catch (Throwable) {
        }

        try {
            $info['replicasets'] = $db->query('SELECT * FROM _pico_replicaset')->all();
        } catch (Throwable) {
        }

        try {
            $info['properties'] = [];
            foreach ($db->query('SELECT key, value FROM _pico_property')->all() as $row) {
                $value = json_decode((string) $row['value'], true);
                $info['properties'][$row['key']] = is_string($value) ? $value : $value ?? $row['value'];
            }
        } catch (Throwable) {
        }

        try {
            $info['buckets'] = $db
                ->query('SELECT state, count(*) FROM _pico_bucket GROUP BY state')
                ->all();
        } catch (Throwable) {
        }

        try {
            $rows = $db->query('SELECT count(*) FROM _pico_table')->all();
            $info['tables'] = (int) reset($rows[0]);
        } catch (Throwable) {
        }

        return $info;
    }
}
