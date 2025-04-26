<?php
/**
 * Functions for Tarkynator website
 * Including utilities for asset minification (CSS only)
 */

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
    
    // Create paths for original and minified files
    $original_path = $_SERVER['DOCUMENT_ROOT'] . '/tarkynator/' . $file_path;
    
    // Generate minified filename (keep the same directory)
    $min_filename = pathinfo($file_path, PATHINFO_FILENAME) . '.min.' . $type;
    $min_dir = pathinfo($file_path, PATHINFO_DIRNAME);
    $min_file_path = $min_dir . '/' . $min_filename;
    $min_path = $_SERVER['DOCUMENT_ROOT'] . '/tarkynator/' . $min_file_path;
    
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