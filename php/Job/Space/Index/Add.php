<?php

namespace Job\Space\Index;

use Exception;
use Job\Job;
use Basis\Picodata\Schema\Index;

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
        if (!in_array($this->using, ['TREE', 'HASH'], true)) {
            throw new Exception("Invalid index type: {$this->using}");
        }

        $t = $this->db()->schema()->load(Job::identifier($this->table));

        $this->db()->schema()->createIndex($t, new Index(
            $this->name === null || $this->name === '' ? null : Job::identifier($this->name),
            array_map([Job::class, 'identifier'], $this->columns),
            $this->using,
            $this->unique,
        ));

        return ['ok' => true];
    }
}
