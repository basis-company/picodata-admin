<?php

use Job\ApiException;

final class Router
{
    /**
     * @return array{int, mixed} [http status, json-able payload]
     */
    public static function handle(string $method, string $path): array
    {
        $route = trim($path, '/');
        $segments = $route === '' ? [] : explode('/', $route);
        $body = self::body();

        if ($segments === ['config'] && $method === 'GET') {
            return self::run(new Job\Admin\Configuration());
        }

        $instance = match (true) {
            $segments === ['info'] && $method === 'GET' => new Job\Database\Info(),
            $segments === ['tables'] && $method === 'GET' => new Job\Database\Tables(),
            $segments === ['tables'] && $method === 'POST' => self::mutation(new Job\Space\Create(), $body),
            $segments === ['sql'] && $method === 'POST' => self::with(new Job\Database\Sql(), ['query' => $body['query'] ?? '']),
            self::is($segments, 'tables', null) && $method === 'GET' => self::table(new Job\Space\Info(), $segments[1]),
            self::is($segments, 'tables', null) && $method === 'DELETE' => self::table(self::mutation(new Job\Space\Drop()), $segments[1]),
            self::is($segments, 'tables', null, 'truncate') && $method === 'POST' => self::table(self::mutation(new Job\Space\Truncate()), $segments[1]),
            self::is($segments, 'tables', null, 'rows') && $method === 'GET' => self::rows(new Job\Space\Select(), $segments[1]),
            self::is($segments, 'tables', null, 'rows') && $method === 'POST' => self::table(self::mutation(new Job\Row\Create()), $segments[1], $body),
            self::is($segments, 'tables', null, 'rows') && $method === 'PATCH' => self::table(self::mutation(new Job\Row\Update()), $segments[1], $body),
            self::is($segments, 'tables', null, 'rows') && $method === 'DELETE' => self::table(self::mutation(new Job\Row\Remove()), $segments[1], $body),
            self::is($segments, 'tables', null, 'indexes') && $method === 'POST' => self::table(self::mutation(new Job\Space\Index\Add()), $segments[1], $body),
            self::is($segments, 'tables', null, 'columns') && $method === 'POST' => self::table(self::mutation(new Job\Space\Column\Add()), $segments[1], $body),
            self::is($segments, 'indexes', null) && $method === 'DELETE' => self::with(self::mutation(new Job\Space\Index\Remove()), ['name' => $segments[1]]),
            default => throw new ApiException(404, "No such route: $method /api/$route"),
        };

        $instance->dsn = $_SERVER['HTTP_X_CONNECTION'] ?? $_GET['dsn'] ?? null;
        if ($instance->dsn === null || $instance->dsn === '') {
            throw new ApiException(400, 'Missing X-Connection header');
        }

        return self::run($instance);
    }

    /** pattern entries are literal segments or null wildcards */
    private static function is(array $segments, ?string ...$pattern): bool
    {
        if (count($segments) !== count($pattern)) {
            return false;
        }

        foreach ($pattern as $i => $value) {
            if ($value !== null && $segments[$i] !== $value) {
                return false;
            }
        }

        return true;
    }

    /** mutation jobs refuse to exist in read-only mode */
    private static function mutation(object $job, array $body = []): object
    {
        try {
            Job\Job::writable();
        } catch (Throwable $e) {
            throw new ApiException(403, $e->getMessage());
        }

        return self::with($job, $body);
    }

    private static function with(object $job, array $params): object
    {
        foreach ($params as $k => $v) {
            if (!property_exists($job, $k)) {
                throw new ApiException(400, "Unknown param: $k");
            }
            $job->$k = $v;
        }

        return $job;
    }

    private static function table(object $job, string $name, array $body = []): object
    {
        return self::with($job, ['table' => urldecode($name)] + $body);
    }

    private static function rows(object $job, string $name): object
    {
        return self::with($job, [
            'table' => urldecode($name),
            'offset' => (int) ($_GET['offset'] ?? 0),
            'limit' => (int) ($_GET['limit'] ?? 50),
        ]);
    }

    /**
     * @return array{int, mixed}
     */
    private static function run(object $job, int $status = 200): array
    {
        try {
            return [$status, $job->run()];
        } catch (ApiException $e) {
            throw $e;
        } catch (Basis\Picodata\Exception\NotFoundException $e) {
            throw new ApiException(404, $e->getMessage());
        } catch (Basis\Picodata\Exception\InvalidException $e) {
            throw new ApiException(400, $e->getMessage());
        }
    }

    private static function body(): array
    {
        $contents = file_get_contents('php://input') ?: '';
        if ($contents === '') {
            return [];
        }

        $decoded = json_decode($contents, true);
        if (!is_array($decoded)) {
            throw new ApiException(400, 'Invalid JSON body');
        }

        return $decoded;
    }
}
