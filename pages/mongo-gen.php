<?php 
include_once('../header.php');
$activePage = 'mongo-gen';
?>

<div class="generate-single">
    <div class="single-body">
        Mongo ID: <span class="global-id" id="idGenOutput"></span>
    </div>
    <button type="button" id="genID" class="btn">Generate</button>
</div>

<div id="bulkContainer" class="item-info-item">
    <div class="body" id="bulkContent">
        <div class="header">
            <div class="input-group">
                <input type="number" class="form-control" id="objectIds"
                    placeholder="Number of MongoDB IDs (1-50)" name="objectIds" min="1" max="50"
                    required />
                <input type="button" class="btn" id="bulkGen" value="Generate" />
            </div>
        </div>
        <div class="bulk-output"></div>
        <div class="bulk-output-tools"></div>
    </div>
</div>
<?php include_once('../footer.php') ?>