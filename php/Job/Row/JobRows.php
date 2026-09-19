<?php

namespace Job\Row;

use Exception;
use Job\Job;
use Basis\Picodata\Quoter;

abstract class JobRows extends Job
{
    /**
     * Split values into SQL fragments: scalars bind as ? parameters,
     * composites (json/map/array) inline as literals — picodata's pgwire
     * cannot bind json parameters.
     *
     * @return array{list<string>, list<mixed>} [placeholders, bound params]
     */
    protected static function bind(array $values): array
    {
        $placeholders = [];
        $params = [];

        foreach ($values as $value) {
            if (is_array($value)) {
                $placeholders[] = Quoter::literal(json_encode($value, JSON_THROW_ON_ERROR));
            } else {
                $placeholders[] = '?';
                $params[] = Job::value($value);
            }
        }

        return [$placeholders, $params];
    }
}
