<?php
require_once '../path.php';
// Prevent any output before headers
ob_start();

// Set headers first
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');

// Clear any previous output
ob_clean();

try {
    $url = "https://forge.sp-tarkov.com/api/v0/spt/versions";

    $context = stream_context_create([
        'http' => [
            'method' => 'GET',
            'header' => [
                "Authorization: Bearer " . SPT_API_TOKEN,
                "Content-Type: application/json",
                "Accept: application/json",
                "User-Agent: Mozilla/5.0 (compatible; PHP)"
            ],
            'timeout' => 30,
            'ignore_errors' => true
        ],
        'ssl' => [
            'verify_peer' => false,
            'verify_peer_name' => false,
            'allow_self_signed' => true
        ]
    ]);

    $result = file_get_contents($url, false, $context);

    if ($result === FALSE) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'Failed to fetch data from SPT API'
        ]);
        exit;
    }

    // Validate that we got JSON
    $data = json_decode($result, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'Invalid JSON response from API'
        ]);
        exit;
    }

    // Return the data
    echo $result;

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Server error: ' . $e->getMessage()
    ]);
}

// End output buffering
ob_end_flush();
?>