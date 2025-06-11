<?php
$activePage = 'template';
include_once('header.php');
?>

<div class="container-fluid main-app">

    <div id="mainSearch">

        <section id="itemSearch">
            <form class="container-fluid search-container">
                <div class="input-control">
                    <input id="itemSearchInput" class="form-control form-control-lg" type="text"
                        placeholder="Search item id or name" aria-label="Item search" autofocus>
                    <nav id="toggleNav" class="btn-group inactive">
                        <i class="bi bi-filter icon"></i>
                        <a class="nav-link btn sm" id="templateNavLink" href="javascript:void(0);">Template</a>
                        <a class="nav-link btn sm " id="handbookNavLink" href="javascript:void(0);">Handbook</a>
                    </nav>
                    <a href="javascript:void(0);" id="browseNavLink" data-bs-toggle="tooltip" data-bs-placement="top"
                        data-bs-title="Browse"><i class="bi bi-ui-radios-grid"></i></a>
                    <div class="input-search-icon">
                        <i class="bi bi-search"></i>
                    </div>
                    <div id="activity"><span class="loader"></span></div>
                </div>
                <div class="searchResults">
                    <ul class="list-group">
                    </ul>
                </div>
            </form>
        </section>

        <nav id="breadcrumb"
            style="--bs-breadcrumb-divider: url(&#34;data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8'%3E%3Cpath d='M2.5 0L1 1.5 3.5 4 1 6.5 2.5 8l4-4-4-4z' fill='%236c757d'/%3E%3C/svg%3E&#34;);"
            aria-label="breadcrumb">
            <span>Search for an item</span>
        </nav>

    </div>

    <section id="itemInfo">

        <div id="templateContainer" class="component-container item-info-item">
            <div class="body" id="templateContent">
                <div id="activityContent" class="template-load"><span class="loader"></span></div>
                <textarea id="jsoneditor" name="jsoneditor"></textarea>
            </div>
        </div>
        <div id="handbookContainer" class="component-container item-info-item">
            <div class="body" id="handbookContent">
                <div id="activityContent"><span class="loader"></span></div>
            </div>
        </div>

        <div id="browseContainer" class="component-container item-info-item">
            <div class="body" id="browseContent">
                <div class="browse-container">
                    <div id="browseSidebar" class="sidebar">

                    </div>
                    <div id="browseItems" class="items">

                    </div>
                </div>
            </div>
        </div>

        <div id="recentSearches"></div>

    </section> <!-- /.itemInfo -->

</div> <!-- /.main-app -->

<?php include_once('footer.php') ?>