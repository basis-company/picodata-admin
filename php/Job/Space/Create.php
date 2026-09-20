<?php

namespace Job\Space;

use Exception;
use Job\Job;
use Basis\Picodata\Schema\Column;

class Create extends Job
{
    public string $name = '';
    public string $engine = 'memtx';
    public bool $global = false;
    public array $distributed = [];
    public ?string $tier = null;
    public array $columns = [];
    public array $indexes = [];

    private const TYPES = [
        Column::BOOLEAN, Column::INTEGER, Column::INT, Column::DOUBLE,
        Column::DECIMAL, Column::TEXT, Column::UUID, Column::DATETIME, Column::JSON,
    ];

    public function run(): array
    {
        $name = Job::identifier($this->name);

        if (!in_array($this->engine, ['memtx', 'vinyl'], true)) {
            throw new Exception("Invalid engine: {$this->engine}");
        }

        if ($this->columns === []) {
            throw new Exception('At least one column is required');
        }

        $defs = [];
        $primary = [];

        foreach ($this->columns as $column) {
            $type = strtoupper((string) ($column['type'] ?? ''));
            if (!in_array($type, self::TYPES, true)) {
                throw new Exception("Invalid column type: $type");
            }

            $isPrimary = (bool) ($column['primary'] ?? false);
            $nullable = (bool) ($column['nullable'] ?? false);

            if ($isPrimary) {
                $primary[] = Job::identifier((string) $column['name']);
            }

            $defs[] = Job::quote(Job::identifier((string) $column['name']))
                . ' ' . $type . ($nullable ? '' : ' NOT NULL');
        }

        if ($this->global && strcasecmp($this->engine, 'memtx') !== 0) {
            throw new Exception('global tables require memtx engine');
        }

        if (!$this->global && $primary === [] && $this->distributed === []) {
            throw new Exception('sharded table requires a primary key');
        }

        if ($primary !== []) {
            $defs[] = 'PRIMARY KEY ('
                . implode(', ', array_map([Job::class, 'quote'], $primary)) . ')';
        }

        $sql = 'CREATE TABLE ' . Job::quote($name)
            . ' (' . implode(', ', $defs) . ')'
            . ' USING ' . $this->engine;

        if ($this->global) {
            $sql .= ' DISTRIBUTED GLOBALLY';
        } else {
            $keys = $this->distributed === [] ? $primary : array_map(
                [Job::class, 'identifier'],
                $this->distributed,
            );

            $sql .= ' DISTRIBUTED BY ('
                . implode(', ', array_map([Job::class, 'quote'], $keys)) . ')';
        }

        if ($this->tier !== null && $this->tier !== '') {
            $sql .= ' IN TIER ' . Job::quote(Job::identifier($this->tier));
        }

        $statements = [$sql];
        $db = $this->db();
        $db->statement($statements[0]);

        foreach ($this->indexes as $index) {
            $using = strtoupper((string) ($index['using'] ?? 'TREE'));
            if (!in_array($using, ['TREE'], true)) {
                throw new Exception("Invalid index type: $using (picodata supports TREE only)");
            }

            $columns = array_map([Job::class, 'identifier'], (array) ($index['columns'] ?? []));
            if ($columns === []) {
                throw new Exception('Index requires at least one column');
            }

            $indexName = ($index['name'] ?? null) === null || $index['name'] === ''
                ? strtolower(str_replace('.', '_', $name) . '_' . implode('_', array_map('strtolower', $columns)) . '_idx')
                : Job::identifier((string) $index['name']);

            $statements[] = 'CREATE ' . (($index['unique'] ?? false) ? 'UNIQUE ' : '')
                . 'INDEX ' . Job::quote($indexName)
                . ' ON ' . Job::quote($name)
                . ' USING ' . $using
                . ' (' . implode(', ', array_map([Job::class, 'quote'], $columns)) . ')';

            $db->statement($statements[count($statements) - 1]);
        }

        return ['sql' => $statements];
    }
}
