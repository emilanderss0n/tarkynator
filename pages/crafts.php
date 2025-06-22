<?php
$activePage = 'crafts';
include_once('../header.php');
?>

    <div id="craftsContainer" class="item-info-item">
        <div class="head-nav animate-in component-container">
            <nav class="btn-group filters">
                <a class="btn sm active" href="javascript:void(0);">Intelligence Center</a>
                <a class="btn sm" href="javascript:void(0);">Workbench</a>
                <a class="btn sm" href="javascript:void(0);">Lavatory</a>
                <a class="btn sm" href="javascript:void(0);">Medstation</a>
            </nav>
        </div>
        <div class="body grid grid-400 animate-in container-fluid page" grid-max-col-count="3" id="craftsContent">
            <div id="activityContent"><span class="loader"></span></div>
        </div>
    </div>

<?php include_once('../footer.php') ?>