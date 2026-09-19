<?php

namespace Job\Space;

use Job\Job;

class Drop extends Job
{
    public string $table = '';

    public function run(): array
    {
        $this->db()->schema()->drop(Job::identifier($this->table));

        return ['ok' => true];
    }
}
