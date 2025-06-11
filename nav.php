<?php require_once 'path.php'; ?>
<nav class="navbar navbar-expand-lg">
    <div class="container-fluid">
        <a class="navbar-brand" href="<?= BASE_URL ?>"><strong>TARKYNATOR</strong></a>
        <button class="navbar-toggler" type="button" data-bs-toggle="collapse"
            data-bs-target="#navbarSupportedContent" aria-controls="navbarSupportedContent"
            aria-expanded="false" aria-label="Toggle navigation">
            <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="navbarSupportedContent">
            <ul class="navbar-nav mb-2 mb-lg-0">
                <li class="nav-item">
                    <a class="nav-link <?php if ($activePage == 'template') { echo 'active'; } ?>" id="homeNavLink" href="<?= BASE_URL ?>">Items</a>
                </li>
                <li class="nav-item">
                    <a class="nav-link <?php if ($activePage == 'achievements') { echo 'active'; } ?>" id="achievementsNavLink" href="<?= BASE_URL ?>/achievements">Achievements</a>
                </li>
                <li class="nav-item">
                    <a class="nav-link <?php if ($activePage == 'common-id') { echo 'active'; } ?>" id="commonIdNavLink" href="<?= BASE_URL ?>/common-id">Common IDs</a>
                </li>
                <li class="nav-item">
                    <a class="nav-link <?php if ($activePage == 'crafts') { echo 'active'; } ?>" id="craftsNavLink" href="<?= BASE_URL ?>/crafts">Crafts</a>
                </li>
                <li class="nav-item">
                    <a class="nav-link <?php if ($activePage == 'quests') { echo 'active'; } ?>" id="questsNavLink" href="<?= BASE_URL ?>/quests">Quests</a>
                </li>
                <li class="nav-item">
                    <a class="nav-link <?php if ($activePage == 'resources') { echo 'active'; } ?>" id="resourcesNavLink" href="<?= BASE_URL ?>/resources">Resources</a>
                </li>
            </ul>
            <span class="navbar-text">
                <a href="<?= BASE_URL ?>/custom-trader" class="btn btn-outline-info d-none d-lg-block"><i class="bi bi-tools"></i> Custom Trader</a>
                <a href="<?= BASE_URL ?>/mongo-gen" class="btn btn-outline-info d-none d-lg-block"><i class="bi bi-stars"></i> ID Generator</a>
            </span>
        </div>
    </div>
</nav>