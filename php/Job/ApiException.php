<?php

namespace Job;

class ApiException extends \Exception
{
    public function __construct(private int $status, string $message)
    {
        parent::__construct($message);
    }

    public function status(): int
    {
        return $this->status;
    }
}
