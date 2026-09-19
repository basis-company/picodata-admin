<?php

namespace Job\Space;

use Throwable;
use Job\Job;

class Info extends Job
{
    public string $table = '';

    public function run(): array
    {
        $t = $this->db()->schema()->load(Job::identifier($this->table));

        $rows = null;
        try {
            $count = $this->db()->query('SELECT count(*) FROM ' . Job::quote($t->name))->all();
            $rows = (int) reset($count[0]);
        } catch (Throwable) {
        }

        return [
            'name' => $t->name,
            'engine' => $t->engine,
            'tier' => $t->tier,
            'global' => $t->distributed === null,
            'distributed' => $t->distributed ?? [],
            'primary' => $t->primary,
            'columns' => array_map(static fn ($c): array => [
                'name' => $c->name,
                'type' => $c->type,
                'nullable' => $c->nullable,
                'unsigned' => $c->unsigned,
                'array' => $c->array,
                'primary' => $c->primary,
                'default' => $c->default,
            ], array_values($t->columns)),
            'indexes' => array_map(static fn ($i): array => [
                'name' => $i->name,
                'columns' => $i->columns,
                'using' => $i->using,
                'unique' => $i->unique,
            ], $t->indexes),
            'rows' => $rows,
        ];
    }
}
