    <div class="footer-container">

        <section id="welcomeMessage">
            <div class="body">
                <p>Search through Escape From Tarkov databases with Tarkov API. This tool is designed to help you
                    find items and their information in the game. You can search for items by their name or by their
                    ID. The search results will show you the item's name, ID, and other information. This tool is
                    perfect for modders, developers, and players who want to learn more about the game's items and
                    their properties.</p>
                This website takes advantage of localStorage. If you want to clear the data, you can do it in your
                browser settings. When a new SPT version is released and the website is not updated, you can clear
                the localStorage to get the latest data.
            </div>
        </section>

        <footer>
            <div class="container-fluid">
                <div class="row">
                    <div class="col-md-6 copyright">
                        <div>&copy; 2024 - Tarkynator - Made by <a href="https://moxopixel.com/"
                                target="_blank">MoxoPixel</a> / <a href="https://emils.graphics"
                                target="_blank">Emils Graphics</a></div>
                    </div>
                    <div class="col-md-6 donate">
                        <div class="text-end">
                            <a class="kofi" href="https://ko-fi.com/moxopixel" target="_blank"></a>
                        </div>
                    </div>
                </div>
            </div>
        </footer>

    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js" crossorigin="anonymous"></script>
        
    <?php if ($activePage === 'template') : ?>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.5/codemirror.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.5/mode/javascript/javascript.min.js"></script>
    <script>
        var editor = CodeMirror.fromTextArea(document.getElementById("jsoneditor"), {
            lineNumbers: true,
            mode: "application/json",
            theme: "mbo",
            readOnly: true
        });
    </script>
    <?php endif; ?>

    <script type="module" src="<?= BASE_URL ?>/assets/js/main.js"></script>
    <?php if ($activePage === 'template') : ?>
    <script type="module" src="<?= BASE_URL ?>/assets/js/itemTemplate.js"></script>
    <?php endif; ?>
    <?php if ($activePage === 'crafts') : ?>
    <script type="module" src="<?= BASE_URL ?>/assets/js/crafts.js"></script>
    <?php endif; ?>
    <?php if ($activePage === 'mongo-gen') : ?>
    <script type="module" src="<?= BASE_URL ?>/assets/js/mongoGen.js"></script>
    <?php endif; ?>
    <?php if ($activePage === 'common-id') : ?>
    <script type="module" src="<?= BASE_URL ?>/assets/js/commonIds.js"></script>
    <?php endif; ?>
</body>

</html>