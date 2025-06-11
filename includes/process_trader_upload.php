<?php
// Path: f:\wamp64\www\tarkynator\includes\process_trader_upload.php
// Handle custom trader mod uploads - no session storage used (browser session storage used instead)

// Increase memory limit for large trader mods
ini_set('memory_limit', '256M');

// Ensure no output before headers
ob_start();

// Set error handling
ini_set('display_errors', 0);
error_reporting(E_ALL);

// Set headers to return JSON
header('Content-Type: application/json');

// Function to handle errors and convert to JSON
function handleError($errMsg)
{
    ob_clean(); // Clear any previous output
    echo json_encode([
        'success' => false,
        'message' => $errMsg,
    ]);
    exit;
}

// Register shutdown function to catch fatal errors
register_shutdown_function(function () {
    $error = error_get_last();
    if ($error !== null && in_array($error['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR])) {
        ob_clean();
        echo json_encode([
            'success' => false,
            'message' => 'Server error occurred while processing the request.',
        ]);
    }
});

// Define allowed file extensions (RAR support depends on server configuration)
$allowed_extensions = ['zip'];
if (extension_loaded('rar') && class_exists('RarArchive')) {
    $allowed_extensions[] = 'rar';
}

// We still need a temporary directory for file extraction
// But we'll clean it up immediately after processing
$tempDir = '../temp';
if (!file_exists($tempDir)) {
    if (!mkdir($tempDir, 0777, true)) {
        handleError("Failed to create temp directory: $tempDir");
    }
    // Explicitly set permissions after creation
    chmod($tempDir, 0777);
}

// Verify temp directory is writable
if (!is_writable($tempDir)) {
    handleError("Temp directory is not writable: $tempDir");
}

// No session storage on server side - we'll use browser's sessionStorage instead

// Check if file was uploaded
if (
    !isset($_FILES['traderFile']) ||
    empty($_FILES['traderFile']['name']) ||
    $_FILES['traderFile']['size'] == 0
) {
    echo json_encode([
        'success' => false,
        'message' => 'No file provided. Please select a file to upload.',
    ]);
    exit;
}

// Check for upload errors
if ($_FILES['traderFile']['error'] !== UPLOAD_ERR_OK) {
    $error = '';
    switch ($_FILES['traderFile']['error']) {
        case UPLOAD_ERR_INI_SIZE:
        case UPLOAD_ERR_FORM_SIZE:
            $error = 'The uploaded file exceeds the maximum file size limit.';
            break;
        case UPLOAD_ERR_PARTIAL:
            $error = 'The file was only partially uploaded.';
            break;
        case UPLOAD_ERR_NO_FILE:
            $error = 'No file was uploaded.';
            break;
        case UPLOAD_ERR_NO_TMP_DIR:
            $error = 'Server error: Missing temporary folder.';
            break;
        case UPLOAD_ERR_CANT_WRITE:
            $error = 'Server error: Failed to write file.';
            break;
        case UPLOAD_ERR_EXTENSION:
            $error = 'Server error: Upload prevented by extension.';
            break;
        default:
            $error = 'Unknown upload error.';
    }

    echo json_encode([
        'success' => false,
        'message' => $error,
    ]);
    exit;
}

// Check file extension
$fileInfo = pathinfo($_FILES['traderFile']['name']);
$extension = strtolower($fileInfo['extension']);

// Determine supported formats based on available extensions
$supportedFormats = ['zip'];
$supportedFormatsText = 'ZIP';

// Only add RAR support if the extension is available
if (extension_loaded('rar') && class_exists('RarArchive')) {
    $supportedFormats[] = 'rar';
    $supportedFormatsText = 'ZIP or RAR';
}

if (!in_array($extension, $supportedFormats)) {
    echo json_encode([
        'success' => false,
        'message' => "Invalid file format. Only $supportedFormatsText files are allowed.",
    ]);
    exit;
}

// Create a unique ID for this trader session
$sessionId = uniqid('trader_');

// Create a temporary directory for extraction that we'll delete after processing
$extractDir = $tempDir . '/' . $sessionId;
mkdir($extractDir, 0777, true);

// Move uploaded file to temp directory
$uploadedFilePath = $extractDir . '/' . $_FILES['traderFile']['name'];
if (!move_uploaded_file($_FILES['traderFile']['tmp_name'], $uploadedFilePath)) {
    // Clean up temporary directory
    if (file_exists($extractDir)) {
        array_map('unlink', glob("$extractDir/*.*"));
        rmdir($extractDir);
    }

    echo json_encode([
        'success' => false,
        'message' => 'Failed to move uploaded file.',
    ]);
    exit;
}

// Extract the file based on its type - we'll still extract to filesystem temporarily
try {
    $extractionSuccess = false;

    if ($extension === 'zip') {
        $zip = new ZipArchive;
        $zipResult = $zip->open($uploadedFilePath);
        if ($zipResult === true) {
            // Get file info for debugging
            $numFiles = $zip->numFiles;
            $status = $zip->status;

            // Extract the files
            $extractResult = $zip->extractTo($extractDir);
            $zip->close();

            if ($extractResult) {
                $extractionSuccess = true;
            } else {
                // Clean up temporary directory
                if (file_exists($extractDir)) {
                    array_map('unlink', glob("$extractDir/*.*"));
                    rmdir($extractDir);
                }
                handleError("Failed to extract ZIP contents. Status: $status, Files: $numFiles. Check folder permissions.");
            }
        } else {
            // Get error message based on ZipArchive error code
            $zipError = '';
            switch ($zipResult) {
                case ZipArchive::ER_EXISTS:
                    $zipError = "File already exists";
                    break;
                case ZipArchive::ER_INCONS:
                    $zipError = "Zip archive inconsistent";
                    break;
                case ZipArchive::ER_INVAL:
                    $zipError = "Invalid argument";
                    break;
                case ZipArchive::ER_MEMORY:
                    $zipError = "Memory allocation failure";
                    break;
                case ZipArchive::ER_NOENT:
                    $zipError = "No such file";
                    break;
                case ZipArchive::ER_NOZIP:
                    $zipError = "Not a zip archive";
                    break;
                case ZipArchive::ER_OPEN:
                    $zipError = "Can't open file";
                    break;
                case ZipArchive::ER_READ:
                    $zipError = "Read error";
                    break;
                case ZipArchive::ER_SEEK:
                    $zipError = "Seek error";
                    break;
                default:
                    $zipError = "Unknown error ($zipResult)";
            }
            // Clean up temporary directory
            if (file_exists($extractDir)) {
                array_map('unlink', glob("$extractDir/*.*"));
                rmdir($extractDir);
            }
            handleError("Failed to open ZIP file: $zipError");
        }
    } else if ($extension === 'rar') {
        // Check if rar extension and RarArchive class are available
        if (!extension_loaded('rar') || !class_exists('RarArchive')) {
            // Clean up temporary directory
            if (file_exists($extractDir)) {
                array_map('unlink', glob("$extractDir/*.*"));
                rmdir($extractDir);
            }
            handleError('RAR extension is not available on the server. Please use ZIP format instead.');
        }

        $rar = RarArchive::open($uploadedFilePath);
        if ($rar) {
            $entries = $rar->getEntries();
            $entryCount = count($entries);

            if ($entryCount > 0) {
                $extractedCount = 0;
                foreach ($entries as $entry) {
                    if ($entry->extract($extractDir)) {
                        $extractedCount++;
                    }
                }

                if ($extractedCount > 0) {
                    $extractionSuccess = true;
                } else {
                    // Clean up temporary directory
                    if (file_exists($extractDir)) {
                        array_map('unlink', glob("$extractDir/*.*"));
                        rmdir($extractDir);
                    }
                    handleError("Failed to extract any files from RAR archive. Check folder permissions.");
                }
            } else {
                // Clean up temporary directory
                if (file_exists($extractDir)) {
                    array_map('unlink', glob("$extractDir/*.*"));
                    rmdir($extractDir);
                }
                handleError("RAR archive appears to be empty.");
            }
            $rar->close();
        } else {
            // Clean up temporary directory
            if (file_exists($extractDir)) {
                array_map('unlink', glob("$extractDir/*.*"));
                rmdir($extractDir);
            }
            handleError('Failed to open RAR file. The archive may be corrupted.');
        }
    }

    if (!$extractionSuccess) {
        // Clean up temporary directory
        if (file_exists($extractDir)) {
            array_map('unlink', glob("$extractDir/*.*"));
            rmdir($extractDir);
        }
        handleError('Failed to extract the uploaded file.');
    }

    // Let's verify that the extraction worked by checking for common directory structures
    if (!is_dir($extractDir . '/db') && count(glob($extractDir . '/**/db', GLOB_ONLYDIR | GLOB_BRACE)) === 0) {
        // Clean up temporary directory
        if (file_exists($extractDir)) {
            array_map('unlink', glob("$extractDir/*.*"));
            rmdir($extractDir);
        }
        handleError('The uploaded file does not appear to contain a valid trader mod structure.');
    }
} catch (Exception $e) {
    // Clean up temporary directory
    if (file_exists($extractDir)) {
        array_map('unlink', glob("$extractDir/*.*"));
        rmdir($extractDir);
    }
    handleError('Error extracting file: ' . $e->getMessage());
}

// Find base.json which contains trader info
$baseJsonPath = "$extractDir/db/base.json";
if (!file_exists($baseJsonPath)) {
    $baseJsonFiles = glob("$extractDir/**/db/base.json", GLOB_BRACE);
    if (!empty($baseJsonFiles)) {
        $baseJsonPath = $baseJsonFiles[0];
    }
}

// Extract trader info from base.json if exists
$traderId = null;
$initialTraderInfo = [
    'id' => 'unknown',
    'name' => 'Unknown Trader',
];

if (file_exists($baseJsonPath)) {
    $baseContent = file_get_contents($baseJsonPath);
    if ($baseContent) {
        $baseJson = json_decode($baseContent, true);
        if ($baseJson && isset($baseJson['_id'])) {
            $traderId = $baseJson['_id'];
            $initialTraderInfo['id'] = $baseJson['_id'];

            // Store both name and nickname if available
            if (isset($baseJson['nickname'])) {
                $initialTraderInfo['name'] = $baseJson['nickname'];
                $initialTraderInfo['nickname'] = $baseJson['nickname'];
            }

            if (isset($baseJson['name'])) {
                // If no nickname was found, use name as the primary display name
                if (!isset($initialTraderInfo['name'])) {
                    $initialTraderInfo['name'] = $baseJson['name'];
                }
                // Otherwise store it separately
                else if ($baseJson['name'] !== $baseJson['nickname']) {
                    $initialTraderInfo['display_name'] = $baseJson['name'];
                }
            }            // Add more trader details
            $initialTraderInfo['avatar'] = $baseJson['avatar'] ?? '';
            $initialTraderInfo['location'] = $baseJson['location'] ?? '';
            $initialTraderInfo['description'] = $baseJson['description'] ?? '';

            // Look for avatar image in res folder
            $avatarFound = false;
            $traderId = $baseJson['_id'] ?? 'unknown';
            $traderName = $initialTraderInfo['name'] ?? 'unknown';

            // Check for files matching trader ID or name in res folder
            $possibleAvatarPaths = [
                "$extractDir/res/$traderId.jpg",
                "$extractDir/res/$traderId.png",
                "$extractDir/res/$traderName.jpg",
                "$extractDir/res/$traderName.png",
                "$extractDir/res/avatar/$traderId.jpg",
                "$extractDir/res/avatar/$traderId.png",
                "$extractDir/res/avatar/$traderName.jpg",
                "$extractDir/res/avatar/$traderName.png"
            ];

            // Also check nested res folders
            $nestedResAvatars = glob("$extractDir/**/res/$traderId.*", GLOB_BRACE);
            $nestedResAvatars = array_merge($nestedResAvatars, glob("$extractDir/**/res/$traderName.*", GLOB_BRACE));
            $nestedResAvatars = array_merge($nestedResAvatars, glob("$extractDir/**/res/avatar/$traderId.*", GLOB_BRACE));
            $nestedResAvatars = array_merge($nestedResAvatars, glob("$extractDir/**/res/avatar/$traderName.*", GLOB_BRACE));

            $possibleAvatarPaths = array_merge($possibleAvatarPaths, $nestedResAvatars);
            foreach ($possibleAvatarPaths as $avatarPath) {
                if (file_exists($avatarPath)) {
                    // Found the avatar image - convert to base64 instead of storing on server
                    $avatarFilename = basename($avatarPath);
                    $imageType = strtolower(pathinfo($avatarPath, PATHINFO_EXTENSION));

                    // Read the image file and convert to base64
                    $imageData = file_get_contents($avatarPath);
                    if ($imageData !== false) {
                        // Determine MIME type
                        $mimeType = 'image/png'; // default
                        switch ($imageType) {
                            case 'jpg':
                            case 'jpeg':
                                $mimeType = 'image/jpeg';
                                break;
                            case 'gif':
                                $mimeType = 'image/gif';
                                break;
                            case 'webp':
                                $mimeType = 'image/webp';
                                break;
                            case 'png':
                            default:
                                $mimeType = 'image/png';
                                break;
                        }

                        // Create base64 data URL
                        $base64Avatar = 'data:' . $mimeType . ';base64,' . base64_encode($imageData);

                        // Store the base64 data URL instead of filename
                        $initialTraderInfo['avatarData'] = $base64Avatar;
                        $initialTraderInfo['avatarFilename'] = $avatarFilename; // Keep original filename for reference
                        $avatarFound = true;
                    }
                    break;
                }
            }

            // Capture additional details that might be useful
            if (isset($baseJson['currency'])) {
                $initialTraderInfo['currency'] = $baseJson['currency'];
            }

            if (isset($baseJson['discount'])) {
                $initialTraderInfo['discount'] = $baseJson['discount'];
            }
        }
    }
}

// Find all quest files
$questFiles = glob("$extractDir/db/quests/*.json");

// If no quest files found, try to look deeper in the directory structure
if (empty($questFiles)) {
    $questFiles = glob("$extractDir/**/db/quests/*.json", GLOB_BRACE);
}

if (empty($questFiles)) {
    echo json_encode([
        'success' => false,
        'message' => 'No quest files found in the uploaded mod.',
    ]);
    exit;
}

// Find all locale files
$localeFiles = glob("$extractDir/db/locales/en/*.json");

// If no locale files found, try to look deeper in the directory structure
if (empty($localeFiles)) {
    $localeFiles = glob("$extractDir/**/db/locales/en/*.json", GLOB_BRACE);
}

// Also detect all available locales
$availableLocales = [];
$allLocaleDirectories = glob("$extractDir/db/locales/*", GLOB_ONLYDIR);
if (empty($allLocaleDirectories)) {
    $allLocaleDirectories = glob("$extractDir/**/db/locales/*", GLOB_ONLYDIR | GLOB_BRACE);
}

foreach ($allLocaleDirectories as $localeDir) {
    $locale = basename($localeDir);
    if (!empty(glob("$localeDir/*.json"))) {
        $availableLocales[] = $locale;
    }
}

// Load all locale data for all languages
$allLocaleData = [];
foreach ($availableLocales as $locale) {
    $localeFiles = glob("$extractDir/db/locales/$locale/*.json");
    if (empty($localeFiles)) {
        $localeFiles = glob("$extractDir/**/db/locales/$locale/*.json", GLOB_BRACE);
    }

    $allLocaleData[$locale] = [];
    foreach ($localeFiles as $localeFile) {
        $localeContent = file_get_contents($localeFile);
        if ($localeContent) {
            $localeJson = json_decode($localeContent, true);
            if ($localeJson) {
                $allLocaleData[$locale] = array_merge($allLocaleData[$locale], $localeJson);
            }
        }
    }
}

// Use English as the primary locale for processing
$localeData = $allLocaleData['en'] ?? [];
$localeKeyPatterns = []; // Store patterns from locale keys

foreach ($localeData as $key => $value) {
    if (preg_match('/^([^_\s]+)_(\d+)\s+(description|name)$/', $key, $matches)) {
        // Found a pattern like "painter_7 description"
        $prefix = $matches[1]; // e.g., "painter"
        $localeKeyPatterns[$prefix] = true;
    }
}

// Process quest files
$allQuests = [];
$questCount = 0;
foreach ($questFiles as $questFile) {
    $questContent = file_get_contents($questFile);
    if ($questContent) {        // Check if the quest file is very large (over 10MB) and warn
        $fileSize = strlen($questContent);
        if ($fileSize > 10 * 1024 * 1024) {
            // Large file detected
        }
        $questJson = json_decode($questContent, true);
        if ($questJson) {
            $questFileName = basename($questFile, '.json');
            $questJsonCount = count($questJson);

            // Check if this might cause memory issues
            if ($questJsonCount > 1000) {
                // Large quest file detected
            }

            foreach ($questJson as $questId => $questData) {
                try {
                    // Skip invalid quest entries (ensure it's an array)
                    if (!is_array($questData)) {
                        continue;
                    }

                    $questData['_file'] = basename($questFile);
                    $questData['_trader_id'] = $initialTraderInfo['id'] ?? ($traderId ?? 'unknown'); // Associate with trader ID// Extract the quest number if it's in the format "painter_7"
                    if (!isset($questData['QuestNumber']) && preg_match('/_(\d+)$/', $questId, $matches)) {
                        $questData['QuestNumber'] = $matches[1];
                    }

                    // Look for translations using various patterns
                    // First check if there's a direct QuestName to translate
                    if (isset($questData['QuestName']) && isset($localeData[$questData['QuestName']])) {
                        $questData['name_translated'] = $localeData[$questData['QuestName']];
                    }

                    // Check common patterns for quest names in locale files
                    $possibleLocaleKeys = [
                        // Pattern 1: Direct quest ID with " name" suffix (Scorpion format)
                        $questId . ' name',
                        // Pattern 2: questFileName with location/number (Painter format)
                        $questFileName . '_' . ($questData['location'] ?? '') . ' name',
                        // Pattern 3: questFileName with quest number
                        $questFileName . '_' . ($questData['QuestNumber'] ?? '') . ' name',
                        // Pattern 4: Simple patterns
                        $questFileName . '_name',
                        $questFileName . ' name',
                        'quest_' . $questFileName . '_name',
                    ];                // Filter out empty keys to prevent issues
                    $possibleLocaleKeys = array_filter($possibleLocaleKeys, function ($key) {
                        return !empty(trim($key)) && !preg_match('/_ name$/', $key) && !preg_match('/_name$/', $key);
                    });

                    // Loop through possible keys and find a match
                    foreach ($possibleLocaleKeys as $key) {
                        if (isset($localeData[$key])) {
                            $questData['name_translated'] = $localeData[$key];
                            break;
                        }
                    }

                    // Extract quest number from file name if not already present
                    if (!isset($questData['QuestNumber'])) {
                        // Try to extract number from questId (e.g., "painter_7")
                        if (preg_match('/_(\d+)$/', $questId, $matches)) {
                            $questData['QuestNumber'] = $matches[1];
                        }
                        // Try to extract from direct questId if it's numeric (e.g., "7")
                        elseif (is_numeric($questId)) {
                            $questData['QuestNumber'] = $questId;
                        }
                        // If no match in questId, try from questFileName (e.g., "painter" in nested object)
                        elseif (isset($questData['location']) && is_numeric($questData['location'])) {
                            $questData['QuestNumber'] = $questData['location'];
                        }
                    }

                    // Enhanced approach for description matching
                    $possibleDescKeys = [
                        // Pattern 1: Direct quest ID with " description" suffix (Scorpion format)
                        $questId . ' description',
                        // Pattern 2: Traditional "prefix_number description" (Painter format)
                        $questFileName . '_' . ($questData['QuestNumber'] ?? '') . ' description',
                        // Pattern 3: Direct questId matching if that's the key
                        $questId,
                        // Pattern 4: Match by location if provided
                        $questFileName . '_' . ($questData['location'] ?? '') . ' description',
                        // Pattern 5: Other possible formats
                        'quest_' . $questFileName . '_' . ($questData['QuestNumber'] ?? '') . ' description',
                        $questFileName . ' description',
                        $questFileName . '_description',
                    ];

                    // Filter out empty keys to prevent issues
                    $possibleDescKeys = array_filter($possibleDescKeys, function ($key) {
                        return !empty(trim($key)) && !preg_match('/_ description$/', $key) && !preg_match('/_description$/', $key);
                    });                    // First check if description itself is a locale key
                    if (isset($questData['description']) && isset($localeData[$questData['description']])) {
                        $questData['description_translated'] = $localeData[$questData['description']];
                    }// Then try the exact pattern match (most common)
                    else {
                        $exactKey = $questFileName . '_' . ($questData['QuestNumber'] ?? '') . ' description';
                        if (isset($localeData[$exactKey])) {
                            $questData['description_translated'] = $localeData[$exactKey];
                        }
                        // If that fails, try other patterns
                        else {
                            foreach ($possibleDescKeys as $key) {
                                if (!empty($key) && isset($localeData[$key])) {
                                    $questData['description_translated'] = $localeData[$key];
                                    break;
                                }
                            }
                        }
                    }// If no description translation found, continue processing
                    if (!isset($questData['description_translated'])) {
                        // Continue without description translation
                    }

                    // Handle quest image if present
                    if (isset($questData['image'])) {
                        $originalImagePath = $questData['image'];

                        // Remove /files/quest/icon/ prefix if present and get just the filename
                        $imageName = basename($originalImagePath);

                        // Determine the base directory where base.json was found
                        $baseDirectory = dirname(dirname($baseJsonPath)); // Go up from db/ to the mod root

                        // Build possible image paths in the res folder
                        $possibleImagePaths = [
                            "$baseDirectory/res/$imageName",
                            "$baseDirectory/res/quests/$imageName",
                            "$baseDirectory/res/" . ($initialTraderInfo['name'] ?? 'trader') . "/$imageName",
                            "$baseDirectory/res/" . ($traderId ?? 'unknown') . "/$imageName"
                        ];

                        // Also search recursively for the image file
                        $foundImageFiles = [];
                        $extensions = ['png', 'jpg', 'jpeg', 'gif', 'webp'];
                        foreach ($extensions as $ext) {
                            $nameWithoutExt = pathinfo($imageName, PATHINFO_FILENAME);
                            $foundImageFiles = array_merge($foundImageFiles, glob("$extractDir/**/$nameWithoutExt.$ext", GLOB_BRACE));
                        }
                        $possibleImagePaths = array_merge($possibleImagePaths, $foundImageFiles);

                        foreach ($possibleImagePaths as $imagePath) {
                            if (file_exists($imagePath)) {
                                // Found the quest image - convert to base64 instead of storing on server
                                $imageFilename = basename($imagePath);
                                $imageType = strtolower(pathinfo($imagePath, PATHINFO_EXTENSION));

                                // Read the image file and convert to base64
                                $imageData = file_get_contents($imagePath);
                                if ($imageData !== false) {
                                    // Determine MIME type
                                    $mimeType = 'image/png'; // default
                                    switch ($imageType) {
                                        case 'jpg':
                                        case 'jpeg':
                                            $mimeType = 'image/jpeg';
                                            break;
                                        case 'gif':
                                            $mimeType = 'image/gif';
                                            break;
                                        case 'webp':
                                            $mimeType = 'image/webp';
                                            break;
                                        case 'png':
                                        default:
                                            $mimeType = 'image/png';
                                            break;
                                    }

                                    // Create base64 data URL
                                    $base64Image = 'data:' . $mimeType . ';base64,' . base64_encode($imageData);

                                    // Store the base64 data URL instead of filename
                                    $questData['questImageData'] = $base64Image;
                                    $questData['questImageFilename'] = $imageFilename; // Keep original filename for reference
                                }
                                break;
                            }
                        }                        // If no image was found, continue without quest image
                        if (!isset($questData['questImageData'])) {
                            // Continue without quest image
                        }
                    }                    // Process conditions and add translations
                    if (isset($questData['conditions']['AvailableForFinish'])) {
                        foreach ($questData['conditions']['AvailableForFinish'] as &$condition) {
                            if (isset($condition['id']) && isset($localeData[$condition['id']])) {
                                $condition['description'] = $localeData[$condition['id']];
                            }
                        }
                    }

                    $allQuests[$questId] = $questData;
                    $questCount++;
                } catch (Exception $e) {
                    error_log("Error processing quest $questId: " . $e->getMessage());
                    // Continue processing other quests
                    continue;
                }
            }
        } else {
            error_log("Failed to decode JSON for quest file: " . basename($questFile));
        }
    } else {
        error_log("Failed to read quest file: " . $questFile);
    }
}

// Check if we found any quests
if (empty($allQuests)) {
    echo json_encode([
        'success' => false,
        'message' => 'No valid quest data found in the uploaded mod.',
    ]);
    exit;
}

// Use the trader info we already collected or set defaults
$traderInfo = $initialTraderInfo ?? [
    'name' => 'Unknown Trader',
    'id' => 'unknown',
];

// If base.json not found, try trader.json file
if ($traderInfo['name'] === 'Unknown Trader') {
    $traderJsonFiles = glob("$extractDir/**/trader.json", GLOB_BRACE);
    if (!empty($traderJsonFiles)) {
        $traderContent = file_get_contents($traderJsonFiles[0]);
        if ($traderContent) {
            $traderJson = json_decode($traderContent, true);
            if ($traderJson && isset($traderJson['_id'])) {
                $traderInfo['id'] = $traderJson['_id'];
                $traderInfo['name'] = isset($traderJson['nickname']) ? $traderJson['nickname'] : basename($extractDir);
            }
        }
    }
}

// If still no trader info, try package.json
if ($traderInfo['name'] === 'Unknown Trader') {
    $packageJsonFile = "$extractDir/package.json";
    if (file_exists($packageJsonFile)) {
        $packageContent = file_get_contents($packageJsonFile);
        if ($packageContent) {
            $packageJson = json_decode($packageContent, true);
            if ($packageJson && isset($packageJson['name'])) {
                $traderInfo['name'] = $packageJson['name'];
            }
        }
    }
}

// No server-side storage - we'll just return the data for browser session storage

// Clean up temporary directory now that we've processed everything
if (file_exists($extractDir)) {
    // Use recursive directory deletion
    $it = new RecursiveDirectoryIterator($extractDir, RecursiveDirectoryIterator::SKIP_DOTS);
    $files = new RecursiveIteratorIterator($it, RecursiveIteratorIterator::CHILD_FIRST);
    foreach ($files as $file) {
        if ($file->isDir()) {
            rmdir($file->getRealPath());
        } else {
            unlink($file->getRealPath());
        }
    }
    rmdir($extractDir);
}

// Add trader info to the quests data so it can be easily accessed in the frontend
$allQuests['trader'] = $traderInfo;

// Create response with all data
$response = [
    'success' => true,
    'uploadId' => $sessionId,
    'trader' => $traderInfo,
    'quests' => $allQuests,
    'locales' => count($localeData) > 1000 ? [] : $localeData, // Limit locale data for large files
    'allLocales' => $allLocaleData, // Include all locale data for multi-language support
    'availableLocales' => $availableLocales, // List of available languages
    'message' => 'Trader mod uploaded and processed successfully.',
];

// Ensure proper JSON encoding
$jsonResponse = json_encode($response, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
if ($jsonResponse === false) {
    error_log('JSON encoding failed: ' . json_last_error_msg());
    error_log('Response data size: ' . strlen(serialize($response)) . ' bytes');    // Try to reduce the response size by removing extra data
    foreach ($response['quests'] as $questId => &$questData) {
        if ($questId === 'trader')
            continue;
        // Remove any remaining debug or unnecessary fields
        unset($questData['_quest_id']);
        unset($questData['_quest_filename']);
        unset($questData['_locale_key_count']);
        unset($questData['_file']);
        unset($questData['_trader_id']);
        unset($questData['_matched_desc_key']);
        unset($questData['_locale_pattern_match']);
    }

    // Try encoding again
    $jsonResponse = json_encode($response, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($jsonResponse === false) {
        handleError('Failed to encode response data even after cleanup: ' . json_last_error_msg());
    }
    error_log('JSON encoding succeeded after cleanup. Size: ' . strlen($jsonResponse) . ' bytes');
}

// Check response size and warn if it's very large
$responseSize = strlen($jsonResponse);
if ($responseSize > 50 * 1024 * 1024) { // 50MB
    error_log("WARNING: Very large response generated: " . round($responseSize / (1024 * 1024), 2) . "MB");
}

echo $jsonResponse;
