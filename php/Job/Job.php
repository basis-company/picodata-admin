<?php

namespace Job;

use Exception;
use Basis\Picodata\Picodata;

abstract class Job
{
    public ?string $dsn = null;

    private ?Picodata $picodata = null;

    public function run(): mixed
    {
        throw new Exception(get_class($this) . ' does not implement run()');
    }

    public function db(): Picodata
    {
        if ($this->picodata === null) {
            $dsn = trim((string) $this->dsn);
            if ($dsn === '') {
                throw new Exception('No connection string given');
            }

            $this->picodata = Picodata::connect(self::normalizeDsn($dsn));
        }

        return $this->picodata;
    }

    public static function normalizeDsn(string $dsn): string
    {
        $dsn = preg_replace('~^(picodata|postgres)://~', 'postgresql://', $dsn);
        if (!str_starts_with($dsn, 'postgresql://')) {
            $dsn = 'postgresql://' . $dsn;
        }

        return $dsn;
    }

    public static function writable(): void
    {
        $value = getenv('PICODATA_READONLY');
        if ($value === 'true' || $value === '1') {
            throw new Exception('Server runs in read-only mode');
        }
    }

    // PostgreSQL reserved words: bare in SQL, they break the parser unless quoted
    private const RESERVED = [
        'all', 'analyse', 'analyze', 'and', 'any', 'array', 'as', 'asc',
        'asymmetric', 'both', 'case', 'cast', 'check', 'collate', 'collation',
        'column', 'constraint', 'create', 'current_catalog', 'current_date',
        'current_role', 'current_schema', 'current_time', 'current_timestamp',
        'current_user', 'default', 'deferrable', 'desc', 'distinct', 'do',
        'else', 'end', 'except', 'false', 'fetch', 'filter', 'for', 'foreign',
        'from', 'full', 'grant', 'group', 'having', 'in', 'initially',
        'intersect', 'into', 'lateral', 'leading', 'limit', 'localtime',
        'localtimestamp', 'null', 'nullif', 'offset', 'on', 'only', 'or',
        'order', 'placing', 'primary', 'references', 'returning', 'select',
        'session_user', 'some', 'symmetric', 'system_user', 'table', 'then',
        'to', 'trailing', 'true', 'union', 'unique', 'user', 'using',
        'variadic', 'when', 'where', 'window', 'with',
    ];

    public static function quote(string $name): string
    {
        $name = self::identifier($name);

        if (preg_match('/^[a-z_][a-z0-9_]*$/', $name) === 1
            && !\in_array($name, self::RESERVED, true)) {
            return $name;
        }

        return '"' . str_replace('"', '""', $name) . '"';
    }

    public static function identifier(string $name): string
    {
        // PostgreSQL unquoted identifier charset; mixed case names are
        // passed through to Quoter::identifier(), which double-quotes them.
        if (!preg_match('/^[A-Za-z_][A-Za-z0-9_$]*$/', $name)) {
            throw new Exception("Invalid identifier: $name");
        }

        return $name;
    }

    public static function sqlLimit(): int
    {
        $limit = getenv('PICODATA_SQL_LIMIT');

        return $limit === false || $limit === '' ? 500 : max(0, (int) $limit);
    }

    public static function value(mixed $value): mixed
    {
        if (is_bool($value)) {
            return $value ? 'true' : 'false';
        }

        if (is_array($value)) {
            return json_encode($value, JSON_THROW_ON_ERROR);
        }

        return $value;
    }
}
