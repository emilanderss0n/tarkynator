<?php
include_once 'path.php';
include_once 'includes/functions.php';
?>

<!DOCTYPE html>
<html lang="en" data-bs-theme="dark">

<head>
    <meta charset="UTF-8" />
    <title>TARKYNATOR - SPT Modding Tool</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="description" content="Best web based tool for modding Escape From Tarkov (Single Player Tarkov)" />
    <meta name="keywords" content="Tarkov, SPT, Modding, Tool, Database, API" />
    <meta name="author" content="MoxoPixel">
    <meta property="og:image" content="assets/img/icon.png" />
    <meta property="og:description" content="Best web based tool for modding Escape From Tarkov (Single Player Tarkov)" />
    <meta property="og:title" content="TARKYNATOR" />

    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet" crossorigin="anonymous">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">
    <?php if ($activePage === 'template' || $activePage === 'quests' || $activePage === 'achievements'): ?>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.5/codemirror.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.5/theme/mbo.min.css">
    <?php endif; ?><?= css_tag(BASE_URL . '/assets/css/main.css') ?>

    <link rel="icon" href="<?= BASE_URL ?>/assets/img/favicon.png">

    <script type="module">
        import { navigationManager } from '<?= BASE_URL ?>/assets/js/core/navigationManager.js';
        window.navigationManager = navigationManager;
    </script>
</head>

<body>
    <?php include_once('nav.php'); ?>
    <div class="main-app">