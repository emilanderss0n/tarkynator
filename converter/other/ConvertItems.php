<?php
function generateMongoId() {
    $timestamp = dechex(time());
    $suffix = '';
    for ($i = 0; $i < 16; $i++) {
        $suffix .= dechex(mt_rand(0, 15));
    }
    return $timestamp . $suffix;
}

// Function to replace all occurrences of old IDs with new IDs
function replaceIds(&$array, $idMapping) {
    foreach ($array as $key => &$value) {
        // Check if key or value matches an old ID and replace it
        if (is_string($value) && isset($idMapping[$value])) {
            $value = $idMapping[$value];
        } elseif (is_array($value)) {
            replaceIds($value, $idMapping);
        }
        // Replace keys that are old IDs with new IDs
        if (isset($idMapping[$key])) {
            $array[$idMapping[$key]] = $array[$key];
            unset($array[$key]);
        }
    }
}

$inputFile = 'items.json';
$outputFile = 'items_updated.json';
$assortInputFile = 'assort.json';
$assortOutputFile = 'assort_updated.json';
$data = json_decode(file_get_contents($inputFile), true);
$assortData = json_decode(file_get_contents($assortInputFile), true);
$idMapping = [];
$tplMapping = [];

// Generate new IDs for each top-level item and store them in the mapping
foreach ($data as $key => &$value) {
    $newId = generateMongoId();
    $idMapping[$key] = $newId;
    $tplMapping[$key] = $newId; // Map old key to new _id for _tpl updates
    // Update the main item _id and add a new MongoDB-like ID to each slot within Slots, if they exist
    if (isset($value['items']['_props']['Slots']) && is_array($value['items']['_props']['Slots'])) {
        foreach ($value['items']['_props']['Slots'] as &$slot) {
            // Ensure each slot’s _id gets a unique new MongoDB ID
            $slot['_id'] = generateMongoId();
            // Update _parent if it references the main item and needs a new ID
            if (isset($slot['_parent']) && $slot['_parent'] === $key) {
                $slot['_parent'] = $newId;
            }
        }
    }
    // Reassign the updated value back to the data array
    $data[$key] = $value;
}

replaceIds($data, $idMapping);

file_put_contents($outputFile, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));

echo "Updated items saved to $outputFile\n";

// Process assort.json
foreach ($assortData['items'] as &$item) {
    // Update _id
    $newId = generateMongoId();
    $idMapping[$item['_id']] = $newId;
    $item['_id'] = $newId;

    // Update _tpl to match the new item _id from items_updated.json
    if (isset($tplMapping[$item['_tpl']])) {
        $item['_tpl'] = $tplMapping[$item['_tpl']];
    }
}

replaceIds($assortData, $idMapping);

file_put_contents($assortOutputFile, json_encode($assortData, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));

echo "Updated assort saved to $assortOutputFile\n";