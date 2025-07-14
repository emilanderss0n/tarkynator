<?php
/**
 * Functions for Tarkynator website
 * Including utilities for asset minification (CSS only)
 */

// Trader ID constants
define('TRADER_PRAPOR', '54cb50c76803fa8b248b4571');
define('TRADER_THERAPIST', '54cb57776803fa99248b456e');
define('TRADER_FENCE', '579dc571d53a0658a154fbec');
define('TRADER_SKIER', '58330581ace78e27b8b10cee');
define('TRADER_PEACEKEEPER', '5935c25fb3acc3127c3d8cd9');
define('TRADER_MECHANIC', '5a7c2eca46aef81a7ca2145d');
define('TRADER_RAGMAN', '5ac3b934156ae10c4430e83c');
define('TRADER_JAEGER', '5c0647fdd443bc2504c2d371');
define('TRADER_LIGHTKEEPER', '638f541a29ffd1183d187f57');
define('TRADER_REF', '6617beeaa9cfa777ca915b7c');

/**
 * Get all trader IDs and names
 * 
 * @return array Associative array with trader IDs as keys and names as values
 */
function get_traders() {
    return [
        TRADER_PRAPOR => 'Prapor',
        TRADER_THERAPIST => 'Therapist',
        TRADER_FENCE => 'Fence',
        TRADER_SKIER => 'Skier',
        TRADER_PEACEKEEPER => 'Peacekeeper',
        TRADER_MECHANIC => 'Mechanic',
        TRADER_RAGMAN => 'Ragman',
        TRADER_JAEGER => 'Jaeger',
        TRADER_LIGHTKEEPER => 'Lightkeeper',
        TRADER_REF => 'Ref'
    ];
}

/**
 * Get all trader data including IDs, names, and image paths
 * 
 * @return array Associative array with trader IDs as keys and trader data as values
 */
function get_traders_data() {
    return [
        TRADER_PRAPOR => [
            'name' => 'Prapor',
            'image' => 'assets/img/avatar/' . TRADER_PRAPOR . '.png'
        ],
        TRADER_THERAPIST => [
            'name' => 'Therapist',
            'image' => 'assets/img/avatar/' . TRADER_THERAPIST . '.png'
        ],
        TRADER_FENCE => [
            'name' => 'Fence',
            'image' => 'assets/img/avatar/' . TRADER_FENCE . '.png'
        ],
        TRADER_SKIER => [
            'name' => 'Skier',
            'image' => 'assets/img/avatar/' . TRADER_SKIER . '.png'
        ],
        TRADER_PEACEKEEPER => [
            'name' => 'Peacekeeper',
            'image' => 'assets/img/avatar/' . TRADER_PEACEKEEPER . '.png'
        ],
        TRADER_MECHANIC => [
            'name' => 'Mechanic',
            'image' => 'assets/img/avatar/' . TRADER_MECHANIC . '.png'
        ],
        TRADER_RAGMAN => [
            'name' => 'Ragman',
            'image' => 'assets/img/avatar/' . TRADER_RAGMAN . '.png'
        ],
        TRADER_JAEGER => [
            'name' => 'Jaeger',
            'image' => 'assets/img/avatar/' . TRADER_JAEGER . '.png'
        ],
        TRADER_LIGHTKEEPER => [
            'name' => 'Lightkeeper',
            'image' => 'assets/img/avatar/' . TRADER_LIGHTKEEPER . '.png'
        ],
        TRADER_REF => [
            'name' => 'Ref',
            'image' => 'assets/img/avatar/' . TRADER_REF . '.png'
        ]
    ];
}

/**
 * Get trader name by ID
 * 
 * @param string $trader_id The trader ID
 * @return string|null The trader name or null if not found
 */
function get_trader_name($trader_id) {
    $traders_data = get_traders_data();
    return isset($traders_data[$trader_id]) ? $traders_data[$trader_id]['name'] : null;
}

/**
 * Get trader image path by ID
 * 
 * @param string $trader_id The trader ID
 * @return string|null The trader image path or null if not found
 */
function get_trader_image($trader_id) {
    $traders_data = get_traders_data();
    return isset($traders_data[$trader_id]) ? $traders_data[$trader_id]['image'] : 'assets/img/avatar/unknown.png';
}

/**
 * Get all trader data for a specific trader
 * 
 * @param string $trader_id The trader ID
 * @return array|null The trader data array or null if not found
 */
function get_trader_data($trader_id) {
    $traders_data = get_traders_data();
    return isset($traders_data[$trader_id]) ? $traders_data[$trader_id] : null;
}

/**
 * Get trader ID by name
 * 
 * @param string $trader_name The trader name
 * @return string|null The trader ID or null if not found
 */
function get_trader_id($trader_name) {
    $traders_data = get_traders_data();
    foreach ($traders_data as $trader_id => $data) {
        if ($data['name'] === $trader_name) {
            return $trader_id;
        }
    }
    return null;
}

/**
 * Check if a trader ID is valid
 * 
 * @param string $trader_id The trader ID to validate
 * @return bool True if valid, false otherwise
 */
function is_valid_trader_id($trader_id) {
    return array_key_exists($trader_id, get_traders_data());
}

/**
 * Generate trader navigation HTML
 * 
 * @param string $active_trader_id The currently active trader ID (optional)
 * @param string $activePage The current active page (optional)
 * @return string HTML for trader navigation
 */
function generate_trader_nav($active_trader_id = TRADER_PRAPOR, $activePage = '') {
    $traders_data = get_traders_data();
    // Exclude Fence and Lightkeeper on assorts page
    if ($activePage === 'assorts') {
        unset($traders_data[TRADER_FENCE], $traders_data[TRADER_LIGHTKEEPER]);
    }
    $nav_html = '<nav class="btn-group trader-nav animate-in" id="tradersNav">' . "\n";
    foreach ($traders_data as $trader_id => $data) {
        $active_class = ($trader_id === $active_trader_id) ? ' active' : '';
        $nav_html .= '<a class="btn sm' . $active_class . '" href="javascript:void(0);" data-trader-id="' . $trader_id . '"><img class="trader-img" src="'. $data['image'] .'" alt="' . $data['name'] . '" /><span class="trader-name">' . $data['name'] . '</span></a>' . "\n";
    }
    $nav_html .= '</nav>';
    return $nav_html;
}

/**
 * Minify CSS content
 * 
 * @param string $css CSS content to minify
 * @return string Minified CSS
 */
function minify_css($css) {
    // Remove comments
    $css = preg_replace('!/\*[^*]*\*+([^/][^*]*\*+)*/!', '', $css);
    
    // Remove whitespace
    $css = preg_replace('/\s+/', ' ', $css);
    
    // Remove unnecessary spaces
    $css = str_replace(
        array(' {', '{ ', ' }', '} ', ' :', ': ', ' ;', '; ', ', ', ' ,'),
        array('{', '{', '}', '}', ':', ':', ';', ';', ',', ','),
        $css
    );
    
    return trim($css);
}

/**
 * Get minified file content or create minified version if it doesn't exist
 * 
 * @param string $file Original file path (relative to domain)
 * @param string $type File type (js or css)
 * @return string Path to the minified file (relative to domain)
 */
function get_minified_file($file, $type) {
    // For JavaScript files, just return the original file path
    if ($type === 'js') {
        return $file;
    }
    
    // Only proceed with minification for CSS files
    
    // Convert URL path to file system path
    $file_path = str_replace(BASE_URL, '', $file);
    $file_path = ltrim($file_path, '/');
    
    // Determine the correct document root path based on BASE_URL
    $parsed_url = parse_url(BASE_URL);
    $base_path = isset($parsed_url['path']) ? $parsed_url['path'] : '';
    $base_path = ltrim($base_path, '/');
    
    // Create paths for original and minified files
    $document_path = $base_path ? $_SERVER['DOCUMENT_ROOT'] . '/' . $base_path : $_SERVER['DOCUMENT_ROOT'];
    $document_path = rtrim($document_path, '/'); // Remove trailing slash
    $original_path = $document_path . '/' . $file_path;
    
    // Generate minified filename (keep the same directory)
    $min_filename = pathinfo($file_path, PATHINFO_FILENAME) . '.min.' . $type;
    $min_dir = pathinfo($file_path, PATHINFO_DIRNAME);
    $min_file_path = $min_dir . '/' . $min_filename;
    $min_path = $document_path . '/' . $min_file_path;
    
    // Create directory for minified file if it doesn't exist
    $min_dir_full = dirname($min_path);
    if (!is_dir($min_dir_full)) {
        mkdir($min_dir_full, 0755, true);
    }
    
    // Check if original file exists
    if (!file_exists($original_path)) {
        return $file; // Return original if it doesn't exist
    }
    
    try {
        // If minified doesn't exist or original is newer, create minified
        if (!file_exists($min_path) || filemtime($original_path) > filemtime($min_path)) {
            $content = file_get_contents($original_path);
            $minified = minify_css($content);
            
            // Write the minified content to file
            file_put_contents($min_path, $minified);
            
            // Log file size reduction
            $original_size = strlen($content);
            $minified_size = strlen($minified);
            $reduction = $original_size > 0 ? round((1 - ($minified_size / $original_size)) * 100, 1) : 0;
            
            error_log("Minified CSS {$file_path}: {$original_size} -> {$minified_size} bytes ({$reduction}% reduction)");
        }
    } catch (Exception $e) {
        error_log("Error minifying {$file_path}: " . $e->getMessage());
        return $file; // Return original file path if minification fails
    }
    
    // Build the URL to the minified file
    $min_url = BASE_URL . '/' . $min_file_path;
    return $min_url;
}

/**
 * Get the minified version of a CSS file
 * 
 * @param string $css_file Path to the CSS file
 * @return string Path to the minified CSS file
 */
function get_minified_css($css_file) {
    return get_minified_file($css_file, 'css');
}

/**
 * Output CSS link tag with minified version
 * 
 * @param string $css_file Path to the CSS file
 * @return string HTML link tag
 */
function css_tag($css_file) {
    $min_css = get_minified_css($css_file);
    return '<link rel="stylesheet" type="text/css" href="' . $min_css . '" />';
}