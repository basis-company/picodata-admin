<?php

namespace Job\Database;

use Throwable;
use Job\Job;

class Sql extends Job
{
    public string $query = '';

    private const READONLY_KEYWORDS = ['select', 'show', 'explain', 'values'];

    public function run(): array
    {
        $query = trim($this->query);
        if ($query === '') {
            throw new \Exception('Empty query');
        }

        if (preg_match('/;\s*$/', $query)) {
            $query = rtrim($query, "; \t\n");
        }

        if (str_contains($query, ';')) {
            throw new \Exception('Only a single statement is allowed');
        }

        $keyword = strtolower(str_word_count($query, 1)[0] ?? '');
        $readonly = in_array($keyword, self::READONLY_KEYWORDS, true);

        if (!$readonly) {
            Job::writable();
        }

        $result = $this->db()->statement($query);
        $rows = $result->all();

        $truncated = false;
        if ($keyword === 'select') {
            $limit = Job::sqlLimit();
            if ($limit > 0 && count($rows) > $limit) {
                $rows = array_slice($rows, 0, $limit);
                $truncated = true;
            }
        }

        return [
            'rows' => $rows,
            'columns' => $rows === [] ? [] : array_keys($rows[0]),
            'affected' => $readonly ? null : $result->rowCount(),
            'truncated' => $truncated,
        ];
    }
}
