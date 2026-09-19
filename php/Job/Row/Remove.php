<?php

namespace Job\Row;

use Exception;
use Job\Job;

class Remove extends JobRows
{
    public string $table = '';
    public mixed $key = [];

    public function run(): array
    {
        $db = $this->db();
        $t = $db->schema()->load(Job::identifier($this->table));

        $key = (array) $this->key;
        if ($key === []) {
            throw new Exception('No key given');
        }

        [$placeholders, $params] = static::bind($key);
        $where = [];

        foreach (array_keys($key) as $i => $column) {
            $where[] = Job::quote(Job::identifier((string) $column)) . ' = ' . $placeholders[$i];
        }

        $sql = 'DELETE FROM ' . Job::quote($t->name) . ' WHERE ' . implode(' AND ', $where);

        return ['affected' => $db->statement($sql, $params)->rowCount()];
    }
}
