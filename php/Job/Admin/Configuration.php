<?php

namespace Job\Admin;

class Configuration extends \Job\Job
{
    public string $repository = 'basis-company/picodata-admin';

    // once per hour
    public int $ttl = 3600;

    public function run(): array
    {
        $version = (@include dirname(__DIR__, 3) . '/var/version.php') ?: [];
        $latest = '';

        if (array_key_exists('tag', $version)) {
            $latest = $version['tag'];
        }

        if (getenv('PICODATA_CHECK_VERSION') !== 'false') {
            $latest = $this->getLatest();
        }

        return [
            'connections' => $this->connections(),
            'connectionsReadOnly' => getenv('PICODATA_CONNECTIONS_READONLY') == 'true'
                || getenv('PICODATA_CONNECTIONS_READONLY') == '1',
            'readOnly' => getenv('PICODATA_READONLY') == 'true' || getenv('PICODATA_READONLY') == '1',
            'version' => $version,
            'latest' => $latest,
        ];
    }

    private function connections(): array
    {
        $connections = [];

        foreach (array_filter(explode(',', (string) getenv('PICODATA_CONNECTIONS'))) as $dsn) {
            $dsn = self::normalizeDsn(trim($dsn));
            $host = parse_url($dsn, PHP_URL_HOST) ?: $dsn;
            $port = parse_url($dsn, PHP_URL_PORT);
            $database = parse_url($dsn, PHP_URL_PATH);

            $connections[] = [
                'title' => $host . ($port ? ":$port" : '') . ($database && $database !== '/' ? $database : ''),
                'dsn' => $dsn,
            ];
        }

        return $connections;
    }

    protected function getLatest(): string
    {
        $filename = dirname(__DIR__, 3) . '/var/latest.php';

        if (file_exists($filename)) {
            $latest = include $filename;
            if ($latest['tag'] && $latest['timestamp'] + $this->ttl >= time()) {
                return $latest['tag'];
            }
        }

        $context = stream_context_create([
            'http' => [
                'method' => 'GET',
                'header' => [
                    'User-Agent: PHP',
                    'Accept: application/vnd.github+json',
                ],
                'timeout' => 3,
            ],
        ]);

        $url = "https://api.github.com/repos/$this->repository/releases/latest";
        $tag = @json_decode((string) @file_get_contents($url, false, $context))->tag_name;
        $timestamp = time();

        $contents = '<' . '?php return ' . var_export(compact('tag', 'timestamp'), true) . ';';
        @file_put_contents($filename, $contents);

        return (string) $tag;
    }
}
