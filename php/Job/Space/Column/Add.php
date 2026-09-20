<?php

namespace Job\Space\Column;

use Exception;
use Job\Job;
use Basis\Picodata\Schema\Column;

class Add extends Job
{
    public string $table = '';
    public string $name = '';
    public string $type = '';
    public bool $nullable = true;

    private const TYPES = [
        Column::BOOLEAN, Column::INTEGER, Column::INT, Column::DOUBLE,
        Column::DECIMAL, Column::TEXT, Column::UUID, Column::DATETIME, Column::JSON,
    ];

    public function run(): array
    {
        $this->type = strtoupper($this->type);
        if (!in_array($this->type, self::TYPES, true)) {
            throw new Exception("Invalid column type: {$this->type}");
        }

        // picodata adds columns as NULL for existing rows; NOT NULL then
        // makes the space unreadable until backfilled, so it is opt-in
        $sql = 'ALTER TABLE ' . Job::quote(Job::identifier($this->table))
            . ' ADD COLUMN IF NOT EXISTS ' . Job::quote(Job::identifier($this->name))
            . ' ' . $this->type
            . ($this->nullable ? '' : ' NOT NULL');

        $this->db()->statement($sql);

        return ['sql' => $sql];
    }
}
