<?php

namespace Job\Space\Index;

use Exception;
use Job\Job;

class Add extends Job
{
    public string $table = '';
    public ?string $name = null;
    public array $columns = [];
    public bool $unique = false;
    public string $using = 'TREE';

    public function run(): array
    {
        $this->using = strtoupper($this->using);
        if ($this->using !== 'TREE') {
            throw new Exception("Invalid index type: {$this->using} (picodata supports TREE only)");
        }

        $table = Job::identifier($this->table);
        $columns = array_map([Job::class, 'identifier'], $this->columns);

        if ($columns === []) {
            throw new Exception('Index requires at least one column');
        }

        $name = $this->name === null || $this->name === ''
            ? strtolower(str_replace('.', '_', $table) . '_' . implode('_', array_map('strtolower', $columns)) . '_idx')
            : Job::identifier($this->name);

        $sql = 'CREATE ' . ($this->unique ? 'UNIQUE ' : '') . 'INDEX ' . Job::quote($name)
            . ' ON ' . Job::quote($table)
            . ' USING ' . $this->using
            . ' (' . implode(', ', array_map([Job::class, 'quote'], $columns)) . ')';

        $this->db()->statement($sql);

        return ['sql' => $sql];
    }
}
