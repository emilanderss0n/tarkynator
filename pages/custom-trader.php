<?php 
$activePage = 'custom-trader';
include_once('../header.php');
?>
<div class="container-fluid main-app">
    <div class="custom-trader-header">
        <div class="custom-trader-help-text">
            <h3>Upload Custom Trader</h3> 
            <p>Upload a ZIP archive with your traders server code. Include package.json, src folder, everything else your mod ships with. Do not include build folders or development files. Trader information is stored inside browser's sessionStorage. Once you close your browser/tab, the data is cleared. <a href="assets/img/custom-trader-guide.jpg" target="_blank">View image guide</a> for archive structure. Keep in mind that this tool is under heavy development.</p>
        </div>
        <div class="upload-trader">
            <form id="traderUploadForm" enctype="multipart/form-data" method="post">
                <div class="input-group">
                    <input type="file" class="form-control" id="traderFileInput" 
                        name="traderFile" accept=".zip,.rar" required />
                    <button type="submit" class="btn btn-primary" id="uploadButton">Upload</button>
                </div>
                <div class="mt-1 text-muted small">Maximum upload size: 50MB</div>
            </form>
        </div>
    </div>

    <div id="customTraderContainer" class="component-container item-info-item">
        <div class="body" id="customTraderContent">
            <div id="uploadStatus" class="alert" style="display: none;"></div>
            <div class="text-center" id="loaderContainer" style="display: none;">
                <div class="spinner-border" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
            </div>
            <div id="questsList"></div>
        </div>    
    </div>
</div>

<?php include_once('../footer.php') ?>