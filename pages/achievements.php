<?php
$activePage = 'achievements';
include_once('../header.php');
?>

    <div id="achievementsContainer" class="item-info-item animate-in">
        <div class="json-quests animate-in">
            <div class="json-quests-header">
                <h3 id="achievementTitle"></h3>
                <a href="javascript:void(0);" class="close-btn"><i class="bi bi-x-lg"></i></a>
            </div>
            <textarea id="jsoneditor" name="jsoneditor"></textarea>
        </div>
        <div class="body grid grid-500 container-fluid page" grid-max-col-count="3" id="achievementsContent">
            <div id="activityContent"><span class="loader"></span></div>
        </div>
    </div>
    
<?php include_once('../footer.php') ?>