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
    <meta name="description" content="Search Tarkov database through Tarkov API" />
    <meta property="og:image" content="assets/img/icon.png" />
    <meta property="og:description" content="Search Tarkov database through Tarkov API" />
    <meta property="og:title" content="TARKYNATOR" />
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet"
        crossorigin="anonymous">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">
    <?php if ($activePage === 'template' || $activePage === 'quests'): ?>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.5/codemirror.min.css">
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.5/theme/mbo.min.css">
    <?php endif; ?>
    <?= css_tag(BASE_URL . '/assets/css/main.css') ?>
    <link rel="icon" href="<?= BASE_URL ?>/assets/img/favicon.png">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link
        href="https://fonts.googleapis.com/css2?family=Titillium+Web:ital,wght@0,200;0,300;0,400;0,600;0,700;0,900;1,200;1,300;1,400;1,600;1,700&display=swap"
        rel="stylesheet"> <!-- Navigation Manager Preload -->
    <script type="module">
        import { navigationManager } from '<?= BASE_URL ?>/assets/js/core/navigationManager.js';
        window.navigationManager = navigationManager;
    </script>
</head>

<body>
    <?php include_once('nav.php'); ?>
    <div class="main-app">