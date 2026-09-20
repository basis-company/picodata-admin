<?php

namespace Job\Space;

use Throwable;
use Job\Job;

class Select extends Job
{
    public string $table = '';
    public int $offset = 0;
    public int $limit = 50;
    public string $search = '';

    private const CYR = 'йцукенгшщзхъё' . 'фывапролджэ' . 'ячсмитьбю';
    private const LAT = 'qwertyuiop[]`' . 'asdfghjkl;\'' . 'zxcvbnm,.';

    /** terms a user could have meant when typing on the wrong keyboard layout */
    private static function layoutVariants(string $term): array
    {
        $swap = static function (string $s, bool $cyrToLat): string {
            $from = mb_str_split($cyrToLat ? self::CYR : self::LAT);
            $to = mb_str_split($cyrToLat ? self::LAT : self::CYR);
            $out = '';
            foreach (mb_str_split($s) as $ch) {
                $i = array_search(mb_strtolower($ch), $from, true);
                if ($i === false) {
                    $out .= $ch;
                    continue;
                }
                $out .= mb_strtoupper($ch) === $ch ? mb_strtoupper($to[$i]) : $to[$i];
            }

            return $out;
        };

        return array_values(array_unique([
            $term,
            $swap($term, true),
            $swap($term, false),
        ]));
    }

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

        $where = '';
        $params = [];
        if ($this->search !== '') {
            $conds = [];
            foreach (self::layoutVariants($this->search) as $variant) {
                $pattern = '%' . str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $variant) . '%';
                foreach ($t->columns as $c) {
                    $conds[] = 'CAST(' . Job::quote($c->name) . ' AS TEXT) ILIKE ?';
                    $params[] = $pattern;
                }
            }
            $where = ' WHERE (' . implode(' OR ', $conds) . ')';
        }

        $order = $t->primary === []
            ? ''
            : ' ORDER BY ' . implode(', ', array_map([Job::class, 'quote'], $t->primary));

        // picodata's pgwire grammar has no OFFSET: fetch offset+limit, slice here
        $rows = $db->statement(
            'SELECT ' . $columns . ' FROM ' . Job::quote($t->name) . $where . $order
            . ' LIMIT ' . (int) ($this->offset + $this->limit),
            $params,
        )->all();

        $rows = $this->offset > 0 ? array_slice($rows, $this->offset) : $rows;

        $total = null;
        try {
            $count = $db->statement(
                'SELECT count(*) FROM ' . Job::quote($t->name) . $where,
                $params,
            )->all();
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
