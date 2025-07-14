<?php
require_once 'functions.php';
// Pass $activePage to generate_trader_nav if available
if (isset($activePage)) {
    echo generate_trader_nav(TRADER_PRAPOR, $activePage);
} else {
    echo generate_trader_nav();
}
?>