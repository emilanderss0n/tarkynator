<?php
$activePage = 'crafts';
include_once('../header.php');
?>

    <div id="craftsContainer" class="item-info-item">
        <div class="head-nav animate-in component-container">
            <nav class="btn-group filters">
                <a class="btn sm active" href="javascript:void(0);" data-id="5d484fdf654e7600691aadf8"><img src="assets/img/Intelligence_Center_Portrait.webp" alt="Intelligence Center" />Intelligence Center</a>
                <a class="btn sm" href="javascript:void(0);" data-id="5d484fda654e7600681d9315"><img src="assets/img/icon_workbench.png" alt="Workbench" />Workbench</a>
                <a class="btn sm" href="javascript:void(0);" data-id="5d484fba654e7600691aadf7"><img src="assets/img/Lavatory_Portrait.webp" alt="Lavatory" />Lavatory</a>
                <a class="btn sm" href="javascript:void(0);" data-id="5d484fcd654e7668ec2ec322"><img src="assets/img/Medstation_Portrait.webp" alt="Medstation" />Medstation</a>
                <a class="btn sm" href="javascript:void(0);" data-id="5d484fd1654e76006732bf2e"><img src="assets/img/Nutrition_Unit_Portrait.webp" alt="Nutrition Unit" />Nutrition Unit</a>
            </nav>
        </div>
        <div class="body grid grid-400 animate-in container-fluid page" grid-max-col-count="3" id="craftsContent">
            <div id="activityContent"><span class="loader"></span></div>
        </div>
    </div>

<?php include_once('../footer.php') ?>