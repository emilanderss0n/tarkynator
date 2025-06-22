<?php 
$activePage = 'mongo-gen';
include_once('../header.php');
?>

    <div class="generate-single animate-in">
        <div class="single-body">
            <h3>Mongo ID:</h3>
            <div class="cont">
                <span class="global-id disabled" id="idGenOutput"></span>
            </div>
            <button type="button" id="genID" class="bubbly-button"><i class="bi bi-stars"></i> Generate</button>
        </div>
    </div>

    <div id="bulkContainer" class="item-info-item">
        <div class="body container-fluid page" id="bulkContent">
            <div class="header">
                <div class="input-group animate-in">
                    <input type="number" class="form-control" id="objectIds"
                        placeholder="Number of MongoDB IDs (1-50)" name="objectIds" min="1" max="50"
                        required />
                    <button type="button" class="btn" id="bulkGen">Generate <i class="bi bi-arrow-right"></i></button>
                </div>
            </div>
            <div class="bulk-output grid"></div>
            <div class="bulk-output-tools"></div>
        </div>
    </div>

<?php include_once('../footer.php') ?>