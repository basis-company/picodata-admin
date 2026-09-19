<?php

namespace Job\Row;

use Exception;
use Job\Job;

class Create extends JobRows
{
    public string $table = '';
    public mixed $values = [];

    public function run(): array
    {
        $db = $this->db();
        $t = $db->schema()->load(Job::identifier($this->table));

        $values = (array) $this->values;
        if ($values === []) {
            throw new Exception('No values given');
        }

        $names = array_map(
            static fn ($column): string => Job::quote(Job::identifier((string) $column)),
            array_keys($values),
        );

        [$placeholders, $params] = static::bind($values);

        $sql = 'INSERT INTO ' . Job::quote($t->name)
            . ' (' . implode(', ', $names) . ')'
            . ' VALUES (' . implode(', ', $placeholders) . ')';

        return ['affected' => $db->statement($sql, $params)->rowCount()];
    }
}
