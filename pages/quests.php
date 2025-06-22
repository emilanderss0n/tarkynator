<?php
$activePage = 'quests';
include_once('../header.php');
?>
   
    <div id="questsContainer" class="item-info-item">
        <div class="head-nav component-container" id="traderQuests">
            <nav class="btn-group filters animate-in">
                <a class="btn sm active" href="javascript:void(0);">Prapor</a>
                <a class="btn sm" href="javascript:void(0);">Therapist</a>
                <a class="btn sm" href="javascript:void(0);">Fence</a>
                <a class="btn sm" href="javascript:void(0);">Skier</a>
                <a class="btn sm" href="javascript:void(0);">Peacekeeper</a>
                <a class="btn sm" href="javascript:void(0);">Mechanic</a>
                <a class="btn sm" href="javascript:void(0);">Ragman</a>
                <a class="btn sm" href="javascript:void(0);">Jaeger</a>
                <a class="btn sm" href="javascript:void(0);">Lightkeeper</a>
                <a class="btn sm" href="javascript:void(0);">Ref</a>
            </nav>
        </div>
        <div class="json-quests animate-in">
            <div class="json-quests-header">
                <h3 id="questTitle">Template for: <span id="questName"></span></h3>
                <a href="javascript:void(0);" class="close-btn"><i class="bi bi-x-lg"></i></a>
            </div>
            <textarea id="jsoneditor" name="jsoneditor"></textarea>
        </div>
        <div id="questFilters" class="animate-in container-fluid page">
            <div class="search-filter-container flex-container">                
                <div class="search-container-quests">
                    <input type="text" id="questSearch" placeholder="Search by name or ID..." class="form-control">
                </div>
                <div class="filter-container flex-container">
                    <select id="selectMap" class="select-default">
                        <option value="All">All Quests</option>
                        <option value="Any">Multiple Maps</option>
                        <option value="Customs">Customs</option>
                        <option value="Factory">Factory</option>
                        <option value="Ground Zero">Ground Zero</option>
                        <option value="Interchange">Interchange</option>
                        <option value="Labs">Labs</option>
                        <option value="Reserve">Reserve</option>
                        <option value="Shoreline">Shoreline</option>
                        <option value="Streets of Tarkov">Streets of Tarkov</option>
                        <option value="Woods">Woods</option>
                    </select>
                </div>
            </div>
        </div>
        <div class="body animate-in grid grid-550 container-fluid page" grid-max-col-count="4" id="questsContent">
            <div id="activityContent"><span class="loader"></span></div>
        </div>
    </div>

<?php include_once('../footer.php') ?>