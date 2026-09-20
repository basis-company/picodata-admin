<?php

namespace Job\Space\Index;

use Job\Job;

class Remove extends Job
{
    public string $name = '';

    public function run(): array
    {
        $this->db()->statement('DROP INDEX IF EXISTS ' . Job::quote(Job::identifier($this->name)));

        return ['ok' => true];
    }
}
