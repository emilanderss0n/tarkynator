<?php
$activePage = 'crafts';
include_once('../header.php');
?>
<div class="container-fluid main-app">
    <div id="craftsContainer" class="item-info-item">
        <div class="head-nav">
            <nav class="btn-group filters">
                <a class="btn sm btn-info active" href="javascript:void(0);">Intelligence Center</a>
                <a class="btn sm btn-info" href="javascript:void(0);">Workbench</a>
                <a class="btn sm btn-info" href="javascript:void(0);">Lavatory</a>
                <a class="btn sm btn-info" href="javascript:void(0);">Medstation</a>
            </nav>
        </div>
        <div class="body" id="craftsContent">
            Loading...
        </div>
    </div>
</div>
<?php include_once('../footer.php') ?>