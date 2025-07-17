<?php
$activePage = 'assorts';
include_once '../header.php';
?>
   
    <div id="assortContainer" class="item-info-item">
        <div class="head-nav component-container" id="traderAssorts">
            <?php include_once '../includes/trader-nav.php'; ?>
        </div>
        <div id="assortCreator"></div>
        <div class="body animate-in delay-2 container-fluid page" grid-max-col-count="4" id="assortContent">
            <div id="activityContent"><span class="loader"></span></div>
        </div>
    </div>

<?php include_once '../footer.php' ?>