<?php

include dirname(__DIR__) . '/vendor/autoload.php';

ini_set('display_errors', '0');
error_reporting(E_ALL);

$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);

if (php_sapi_name() === 'cli-server' && $path !== '/' && is_file(__DIR__ . $path)) {
    return false;
}

if ($path === '/api' || str_starts_with($path, '/api/')) {
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

    try {
        [$status, $data] = Router::handle($method, substr($path, 4));
    } catch (Throwable $e) {
        $status = method_exists($e, 'status') ? $e->status() : 500;
        if ($status < 400) {
            $status = 500;
        }
        $data = ['error' => $e->getMessage()];
    }

    http_response_code($status);
    header('Content-Type: application/json');
    echo json_encode($data, JSON_INVALID_UTF8_SUBSTITUTE);

    exit;
}

$index = __DIR__ . '/index.html';
if (!is_readable($index)) {
    http_response_code(503);
    echo 'Frontend is not built yet: run `npm --prefix ui run build`';
    exit;
}

readfile($index);
