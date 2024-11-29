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
            <ul class="navbar-nav me-auto mb-2 mb-lg-0">
                <li class="nav-item">
                    <a class="nav-link active" id="templateNavLink" href="javascript:void(0);">Template</a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" id="handbookNavLink" href="javascript:void(0);">Handbook</a>
                </li>
                <li class="nav-item dropdown">
                    <a class="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown"
                        aria-expanded="false">
                        More
                    </a>
                    <ul class="dropdown-menu">
                        <li><a class="dropdown-item" id="craftsNavLink" href="<?= BASE_URL ?>/pages/crafts">Crafts</a>
                        </li>
                        <li><a class="dropdown-item" id="commonIdNavLink" href="<?= BASE_URL ?>/pages/common-id">Common IDs</a></li>
                        <li><a class="dropdown-item" id="resourcesNavLink" href="<?= BASE_URL ?>/pages/resources">Resources</a></li>
                    </ul>
                </li>
            </ul>
            <span class="navbar-text">
                <a href="<?= BASE_URL ?>/pages/mongo-gen" class="btn btn-outline-info d-none d-lg-block">ID Generator</a>
            </span>
        </div>
    </div>
</nav>