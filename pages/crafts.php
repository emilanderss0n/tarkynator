<?php
$activePage = 'crafts';
include_once('../header.php');
?>
<div class="container-fluid main-app">
    <div id="craftsContainer" class="component-container item-info-item">
        <div class="head-nav">
            <nav class="btn-group filters">
                <a class="btn sm active" href="javascript:void(0);">Intelligence Center</a>
                <a class="btn sm" href="javascript:void(0);">Workbench</a>
                <a class="btn sm" href="javascript:void(0);">Lavatory</a>
                <a class="btn sm" href="javascript:void(0);">Medstation</a>
            </nav>
        </div>
        <div class="body grid grid-400" grid-max-col-count="3" id="craftsContent">
            <div id="activityContent"><span class="loader"></span></div>
        </div>
    </div>
</div>
<?php include_once('../footer.php') ?>