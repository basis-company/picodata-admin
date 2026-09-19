<?php

namespace Job\Space\Index;

use Job\Job;

class Remove extends Job
{
    public string $name = '';

    public function run(): array
    {
        $this->db()->schema()->dropIndex(Job::identifier($this->name));

        return ['ok' => true];
    }
}
