<?php

ini_set('memory_limit', '5012M');
ini_set('max_execution_time', 2800);

// GraphQL query
$query = <<<GRAPHQL
{
  items {
    id
    name
    iconLink
    types
    usedInTasks {
      id
      name
    }
    shortName
    description
    wikiLink
    weight
    basePrice
    image512pxLink
    categories {
      id
      name
    }
    buyFor {
      price
      currency
      vendor {
        name
      }
    }
    properties {
      ... on ItemPropertiesWeaponMod {
        slots {
          nameId
        }
      }
      ... on ItemPropertiesWeapon {
        slots {
          nameId
        }
        allowedAmmo {
          id
          name
        }
      }
      ... on ItemPropertiesHelmet {
        slots {
          nameId
        }
      }
    }
    handbookCategories {
      name
    }
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
if (!isset($data['data']['items'])) {
    die('No items found in the API response');
}

// Define directories for saving images
$dataFolder = __DIR__ . '/data';
$iconFolder = $dataFolder . '/icons';
$imageFolder = $dataFolder . '/images';

// Create directories if they do not exist
if (!is_dir($dataFolder)) {
    mkdir($dataFolder, 0777, true);
}
if (!is_dir($iconFolder)) {
    mkdir($iconFolder, 0777, true);
}
if (!is_dir($imageFolder)) {
    mkdir($imageFolder, 0777, true);
}

// Restructure the items array with 'id' as the key
$items = [];
foreach ($data['data']['items'] as $item) {

    // Skip items with 'preset' in the types array
    if (isset($item['types']) && in_array('preset', $item['types'])) {
        continue;
    }

    // Handle iconLink image
    if (!empty($item['iconLink'])) {
        $iconPath = $iconFolder . '/' . basename($item['iconLink']);
        // Check if the image already exists before downloading
        if (!file_exists($iconPath)) {
            file_put_contents($iconPath, file_get_contents($item['iconLink']));
        }
        // Update the iconLink to the local path
        $item['iconLink'] = $iconPath;
    }

    // Handle image512pxLink image
    if (!empty($item['image512pxLink'])) {
        $imagePath = $imageFolder . '/' . basename($item['image512pxLink']);
        // Check if the image already exists before downloading
        if (!file_exists($imagePath)) {
            file_put_contents($imagePath, file_get_contents($item['image512pxLink']));
        }
        // Update the image512pxLink to the local path
        $item['image512pxLink'] = $imagePath;
    }

    $items[$item['id']] = $item;
}

// Prepare the final data structure
$finalData = ['items' => $items];

// Save data to a file with a timestamp in the filename
$filename = $dataFolder . '/tarkov_data_' . date('Y_m_d_H_i_s') . '.json';
file_put_contents($filename, json_encode($finalData, JSON_PRETTY_PRINT));

echo "Data and images saved successfully.\nData file: $filename\n";

?>