<ul class="nav">
    <li class="nav-item">
        <a class="nav-link <?php if ($activePage == 'template') { echo 'active'; } ?>" id="homeNavLink" href="<?= BASE_URL ?>">Items</a>
    </li>
    <li class="nav-item">
        <a class="nav-link <?php if ($activePage == 'achievements') { echo 'active'; } ?>" id="achievementsNavLink" href="<?= BASE_URL ?>/achievements">Achievements</a>
    </li>
    <li class="nav-item">
        <a class="nav-link <?php if ($activePage == 'assorts') { echo 'active'; } ?>" id="assortsNavLink" href="<?= BASE_URL ?>/assorts">Assorts</a>
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
    <li class="nav-item">
        <a class="nav-link <?php if ($activePage == 'mongo-gen') { echo 'active'; } ?>" id="mongoIdNavLink" href="<?= BASE_URL ?>/mongo-gen">Mongo IDs</a>
    </li>
</ul>