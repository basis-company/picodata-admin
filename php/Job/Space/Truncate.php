<?php

namespace Job\Space;

use Job\Job;

class Truncate extends Job
{
    public string $table = '';

    public function run(): array
    {
        $table = Job::identifier($this->table);
        $this->db()->schema()->load($table);

        $affected = $this->db()->statement('TRUNCATE ' . Job::quote($table))->rowCount();

        return ['affected' => $affected];
    }
}
