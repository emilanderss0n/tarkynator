</div> <!-- End of main-app div -->
    <div class="footer-container">

        <section id="latestModsSection">
            <div class="body container-fluid">
                <div class="latest-mods-header">
                    <h5 class="title">Latest SPT Mods</h5>
                    <p>Browse the newest Forge uploads</p>
                </div>
                <section class="slider-wrap latest-mods-slider-wrap">
                    <div id="sptReleases" class="moxo-swipe fluid latest-mods-strip" aria-label="Latest SPT mods" aria-roledescription="carousel" tabindex="0"></div>
                </section>
            </div>
        </section>

        <footer>
            <div class="container-fluid">
                <div class="row">
                    <div class="col">
                        Tarkynator use data from Tarkov API and SPT game server files
                    </div>
                    <div class="col">
                        <div class="text-end">
                            <?php include_once('nav-footer.php'); ?>
                        </div>
                    </div>
                    <div class="w-100"></div>
                    <div class="col copyright">
                        <div>&copy; <?= date('Y'); ?> - <a href="https://github.com/emilanderss0n/tarkynator" target="_blank"
                                data-tooltip="Github Repo">Tarkynator</a> - Made by <a href="https://github.com/emilanderss0n"
                                target="_blank">MoxoPixel</a> / <a href="https://github.com/emilanderss0n" target="_blank">Emil
                                Andersson</a></div>
                    </div>
                    <div class="col donate">
                        <div class="text-end">
                            <a class="kofi" href="https://ko-fi.com/moxopixel" target="_blank"></a>
                        </div>
                    </div>
                </div>
            </div>
        </footer>

    </div>


    <script type="module" src="<?= BASE_URL ?>/assets/js/core/themeManager.js"></script>

    <?php if ($activePage === 'template' || $activePage === 'quests' || $activePage === 'assorts' || $activePage === 'achievements' || $activePage === 'custom-trader'): ?>
    <script type="module" src="<?= BASE_URL ?>/assets/js/components/jsonEditorBootstrap.js"></script>
    <?php endif; ?>

    <script type="module" src="<?= BASE_URL ?>/assets/js/features/main.js"></script>
    <script src="<?= BASE_URL ?>/assets/js/components/swiper-bundle.min.js"></script>
    <?php if ($activePage === 'template'): ?>
    <script type="module" src="<?= BASE_URL ?>/assets/js/items/ItemManager.js"></script>
    <?php endif; ?>
    <?php if ($activePage === 'crafts'): ?>
    <script type="module" src="<?= BASE_URL ?>/assets/js/pages/crafts.js"></script>
    <?php endif; ?>
    <?php if ($activePage === 'achievements'): ?>
    <script type="module" src="<?= BASE_URL ?>/assets/js/pages/achievements.js"></script>
    <?php endif; ?>
    <?php if ($activePage === 'assorts'): ?>
    <script src="https://unpkg.com/isotope-layout@3/dist/isotope.pkgd.min.js"></script>
    <script type="module" src="<?= BASE_URL ?>/assets/js/pages/assorts.js"></script>
    <?php endif; ?>
    <?php if ($activePage === 'quests'): ?>
    <script type="module" src="<?= BASE_URL ?>/assets/js/pages/quests.js"></script>
    <?php endif; ?>
    <?php if ($activePage === 'mongo-gen'): ?>
    <script type="module" src="<?= BASE_URL ?>/assets/js/pages/mongoGen.js"></script>
    <?php endif; ?>
    <?php if ($activePage === 'common-id'): ?>
    <script type="module" src="<?= BASE_URL ?>/assets/js/pages/commonIds.js"></script>
    <?php endif; ?>
    <script type="module" src="<?= BASE_URL ?>/assets/js/features/sptApi.js"></script>
    <?php if ($activePage === 'custom-trader'): ?>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>
    <script type="module" src="<?= BASE_URL ?>/assets/js/features/customTraderEdit.js"></script>
    <script type="module" src="<?= BASE_URL ?>/assets/js/features/customTrader.js"></script>
    <?php endif; ?>
</body>

</html>

<?php flush_html_output_cleanup(); ?>