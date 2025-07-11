    </div> <!-- End of main-app div -->
    <div class="footer-container">

        <section id="welcomeMessage">
            <div class="body container-fluid">
                <p class="scroll-ani scroll-80">Search through Escape From Tarkov databases with Tarkov API. This tool is designed to help you
                    find items and their information in the game. You can search for items by their name or by their
                    ID. The search results will show you the item's name, ID, and other information. This tool is
                    perfect for modders, developers, and players who want to learn more about the game's items and
                    their properties.</p>
                <p class="scroll-ani scroll-80">This website takes advantage of Local storage and IndexedDB. If you want to clear the data before expiry (2 days), 
                you can do it in your browser settings. When a new SPT version is released and the website is not yet updated, 
                you can clear Local storage and IndexedDB to get the latest data.</p>
            </div>
        </section>

        <footer>
            <div class="container-fluid">
                <div class="row">
                    <div class="col-md-6 copyright">
                        <div>&copy; 2025 - <a href="https://github.com/emilanderss0n/tarkynator" target="_blank"
                                data-tooltip="Github Repo">Tarkynator</a> - Made by <a href="https://moxopixel.com/"
                                target="_blank">MoxoPixel</a> / <a href="https://emilandersson.com" target="_blank">Emil
                                Andersson</a></div>
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

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"
        crossorigin="anonymous"></script>
    <script src="<?= BASE_URL ?>/assets/js/core/themeManager.js"></script>

    <?php if ($activePage === 'template' || $activePage === 'quests' || $activePage === 'achievements'): ?>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.5/codemirror.min.js"></script>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.5/mode/javascript/javascript.min.js"></script>
        <script>
            var editor; // Declare editor variable in the global scope
            document.addEventListener("DOMContentLoaded", function () {
                var jsonEditorElement = document.getElementById("jsoneditor");
                editor = CodeMirror.fromTextArea(jsonEditorElement, {
                    lineNumbers: true,
                    mode: "application/json",
                    theme: "mbo",
                    readOnly: true
                });
                editor.on("renderLine", function (cm, line, element) {
                    const lineText = line.text.trim();
                    if (lineText.endsWith("{") || lineText.includes(":")) {
                        const copyLink = document.createElement("a");
                        copyLink.href = "#";
                        copyLink.className = "json-edit-btn";
                        copyLink.innerHTML = "<i class='bi bi-copy'></i>"; // Clipboard icon
                        copyLink.onclick = function (event) {
                            event.preventDefault();
                            let jsonText;
                            if (lineText.endsWith("{")) {
                                const startLine = line.lineNo();
                                let endLine = startLine;
                                let openBraces = 1;
                                while (openBraces > 0 && endLine < cm.lineCount()) {
                                    endLine++;
                                    const lineContent = cm.getLine(endLine).trim();
                                    if (lineContent.includes("{")) openBraces++;
                                    if (lineContent.includes("}")) openBraces--;
                                }
                                jsonText = cm.getRange(
                                    { line: startLine, ch: line.text.indexOf("{") },
                                    { line: endLine, ch: cm.getLine(endLine).length }
                                ).trim();
                            } else {
                                const valueMatch = lineText.match(/:\s*(.*),?$/);
                                jsonText = valueMatch ? valueMatch[1].replace(/,$/, '') : lineText;
                            }
                            navigator.clipboard.writeText(jsonText).then(() => {
                                event.target.classList.add('copied');
                                setTimeout(() => {
                                    event.target.classList.remove('copied');
                                }, 1400);
                            }).catch(err => {
                                console.error("Failed to copy text: ", err);
                            });
                        };
                        element.appendChild(copyLink);
                    }
                });
            });
        </script>
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
    <?php if ($activePage === 'quests'): ?>
    <script type="module" src="<?= BASE_URL ?>/assets/js/pages/quests.js"></script>
    <?php endif; ?>
    <?php if ($activePage === 'mongo-gen'): ?>
    <script type="module" src="<?= BASE_URL ?>/assets/js/pages/mongoGen.js"></script>
    <?php endif; ?>
    <?php if ($activePage === 'common-id'): ?>
    <script type="module" src="<?= BASE_URL ?>/assets/js/pages/commonIds.js"></script>
    <?php endif; ?>
    <?php if ($activePage === 'resources'): ?>
    <script type="module" src="<?= BASE_URL ?>/assets/js/features/sptApi.js"></script>
    <?php endif; ?>
    <?php if ($activePage === 'custom-trader'): ?>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>
    <script type="module" src="<?= BASE_URL ?>/assets/js/features/customTraderEdit.js"></script>
    <script type="module" src="<?= BASE_URL ?>/assets/js/features/customTrader.js"></script>
    <?php endif; ?>
</body>

</html>