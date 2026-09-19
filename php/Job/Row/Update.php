<?php

namespace Job\Row;

use Exception;
use Job\Job;

class Update extends JobRows
{
    public string $table = '';
    public mixed $key = [];
    public mixed $values = [];

    public function run(): array
    {
        $db = $this->db();
        $t = $db->schema()->load(Job::identifier($this->table));

        $values = (array) $this->values;
        $key = (array) $this->key;

        if ($values === []) {
            throw new Exception('No values given');
        }

        if ($key === []) {
            throw new Exception('No key given');
        }

        [$placeholders, $params] = static::bind($values);
        $sets = [];

        foreach (array_keys($values) as $i => $column) {
            $sets[] = Job::quote(Job::identifier((string) $column)) . ' = ' . $placeholders[$i];
        }

        [$keyPlaceholders, $keyParams] = static::bind($key);
        $where = [];

        foreach (array_keys($key) as $i => $column) {
            $where[] = Job::quote(Job::identifier((string) $column)) . ' = ' . $keyPlaceholders[$i];
        }

        $sql = 'UPDATE ' . Job::quote($t->name)
            . ' SET ' . implode(', ', $sets)
            . ' WHERE ' . implode(' AND ', $where);

        return ['affected' => $db->statement($sql, [...$params, ...$keyParams])->rowCount()];
    }
}
