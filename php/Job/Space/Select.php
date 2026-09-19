<?php

namespace Job\Space;

use Throwable;
use Job\Job;

class Select extends Job
{
    public string $table = '';
    public int $offset = 0;
    public int $limit = 50;

    public function run(): array
    {
        $db = $this->db();
        $t = $db->schema()->load(Job::identifier($this->table));

        $this->offset = max(0, $this->offset);
        $this->limit = min(500, max(1, $this->limit));

        $columns = implode(', ', array_map(
            static fn ($c): string => Job::quote($c->name),
            $t->columns,
        ));

        $order = $t->primary === []
            ? ''
            : ' ORDER BY ' . implode(', ', array_map([Job::class, 'quote'], $t->primary));

        // picodata's pgwire grammar has no OFFSET: fetch offset+limit, slice here
        $rows = $db->statement(
            'SELECT ' . $columns . ' FROM ' . Job::quote($t->name) . $order
            . ' LIMIT ' . (int) ($this->offset + $this->limit),
        )->all();

        $rows = $this->offset > 0 ? array_slice($rows, $this->offset) : $rows;

        $total = null;
        try {
            $count = $db->query('SELECT count(*) FROM ' . Job::quote($t->name))->all();
            $total = (int) reset($count[0]);
        } catch (Throwable) {
        }

        return [
            'rows' => $rows,
            'columns' => array_values(array_map(static fn ($c): string => $c->name, $t->columns)),
            'total' => $total,
            'order' => $t->primary,
        ];
    }
}
