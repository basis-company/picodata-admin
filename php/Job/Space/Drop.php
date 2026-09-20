<?php

namespace Job\Space;

use Job\Job;

class Drop extends Job
{
    public string $table = '';

    public function run(): array
    {
        $this->db()->statement('DROP TABLE IF EXISTS ' . Job::quote(Job::identifier($this->table)));

        return ['ok' => true];
    }
}
