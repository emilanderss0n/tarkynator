<?php
$activePage = 'assorts';
include_once '../header.php';
?>
   
    <div id="assortContainer" class="item-info-item">
        <div class="head-nav component-container" id="traderAssorts">
            <?php include_once '../includes/trader-nav.php'; ?>
        </div>
        <div id="assortCreator"></div>
        <div class="component-container search-container animate-in delay-1">
            <input id="assortSearch" class="form-control" type="text" placeholder="Search barters or cash offers by name or ID...">
            <nav class="btn-group" id="loyaltyFilterBtns">
                <a class="btn sm active" href="javascript:void(0);" data-loyalty="all">All</a>
                <a class="btn sm" href="javascript:void(0);" data-loyalty="1"><img src="assets/img/loyalty_one.png" height="18px" alt="LL 1" /></a>
                <a class="btn sm" href="javascript:void(0);" data-loyalty="2"><img src="assets/img/loyalty_two.png" height="18px" alt="LL 2" /></a>
                <a class="btn sm" href="javascript:void(0);" data-loyalty="3"><img src="assets/img/loyalty_three.png" height="18px" alt="LL 3" /></a>
                <a class="btn sm" href="javascript:void(0);" data-loyalty="4"><img src="assets/img/loyalty_king_new.png" alt="LL 4" /></a>
            </nav>
            <nav class="btn-group" id="assortTypeBtns">
                <a class="btn sm active" href="javascript:void(0);" data-type="all">All</a>
                <a class="btn sm" href="javascript:void(0);" data-type="barters"><span class="barter"></span>Barters</a>
                <a class="btn sm" href="javascript:void(0);" data-type="cash"><span class="cash"></span>Cash</a>
            </nav>
            <a class="btn sm" href="javascript:void(0);" id="createAssortBtn"><i class="bi bi-cart-plus-fill"></i> Create Assort</a>
        </div>
        <div class="body animate-in delay-2 container-fluid page" id="assortContent">
            <div id="activityContent"><span class="loader"></span></div>
        </div>
    </div>

<?php include_once '../footer.php' ?>