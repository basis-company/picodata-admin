<?php

namespace Job\Space;

use Exception;
use Job\Job;
use Basis\Picodata\Schema\Column;
use Basis\Picodata\Schema\Model;

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

        $model = Model::define($name)->engine($this->engine);
        $primary = [];

        if ($this->columns === []) {
            throw new Exception('At least one column is required');
        }

        foreach ($this->columns as $column) {
            $type = strtoupper((string) ($column['type'] ?? ''));
            if (!in_array($type, self::TYPES, true)) {
                throw new Exception("Invalid column type: $type");
            }

            $isPrimary = (bool) ($column['primary'] ?? false);
            if ($isPrimary) {
                $primary[] = Job::identifier((string) $column['name']);
            }

            $model->column(
                Job::identifier((string) $column['name']),
                $type,
                primary: $isPrimary,
                nullable: (bool) ($column['nullable'] ?? false),
            );
        }

        if ($primary !== []) {
            $model->primaryKey(...$primary);
        }

        if ($this->global) {
            $model->globally();
        } else {
            $model->distributedBy(...array_map([Job::class, 'identifier'], $this->distributed));
        }

        $model->tier($this->tier === null || $this->tier === '' ? null : Job::identifier($this->tier));

        foreach ($this->indexes as $index) {
            $using = strtoupper((string) ($index['using'] ?? 'TREE'));
            if (!in_array($using, ['TREE', 'HASH'], true)) {
                throw new Exception("Invalid index type: $using");
            }

            $model->index(
                array_map([Job::class, 'identifier'], (array) ($index['columns'] ?? [])),
                unique: (bool) ($index['unique'] ?? false),
                using: $using,
                name: ($index['name'] ?? null) === null ? null : Job::identifier((string) $index['name']),
            );
        }

        return ['sql' => $this->db()->schema()->create($model)];
    }
}
