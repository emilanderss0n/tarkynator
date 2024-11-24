<?php

ini_set('memory_limit', '5012M');
ini_set('max_execution_time', 2800);

// GraphQL query
$query = <<<GRAPHQL
{
  tasks {
    id
    name
    taskRequirements {
      task {
        id
        name
        trader {
          name
          id
        }
      }
    }
    minPlayerLevel
    objectives {
      id
      maps {
        name
        id
      }
      description
      type
      optional
    }
    factionName
  }
}
GRAPHQL;

// API URL
$url = 'https://api.tarkov.dev/graphql';

// Make a POST request to the GraphQL API
$options = [
    'http' => [
        'method'  => 'POST',
        'header'  => "Content-Type: application/json\r\n",
        'content' => json_encode(['query' => $query]),
    ]
];

$context  = stream_context_create($options);
$response = file_get_contents($url, false, $context);

// Check if the response was successful
if ($response === FALSE) {
    die('Error occurred while querying the API');
}

// Decode the JSON response
$data = json_decode($response, true);

// Check if 'items' is set
if (!isset($data['data']['tasks'])) {
    die('No items found in the API response');
}

// Define directories for saving images
$dataFolder = __DIR__ . '/data';

// Create directories if they do not exist
if (!is_dir($dataFolder)) {
    mkdir($dataFolder, 0777, true);
}

// Restructure the items array with 'id' as the key
$items = [];
foreach ($data['data']['tasks'] as $item) {

    $items[$item['id']] = $item;
}

// Prepare the final data structure
$finalData = ['tasks' => $items];

// Save data to a file with a timestamp in the filename
$filename = $dataFolder . '/tarkov_data_tasks_' . date('Y_m_d_H_i_s') . '.json';
file_put_contents($filename, json_encode($finalData, JSON_PRETTY_PRINT));

echo "Data saved successfully.\nData file: $filename\n";

?>