<?php
$activePage = 'template';
include_once('header.php');
?>

    <div id="mainSearch">

        <section id="itemSearch" class="animate-in">
            <form class="container-fluid search-container">
                <div class="input-control">
                    <input id="itemSearchInput" class="form-control form-control-lg" type="text"
                        placeholder="Search item id or name" aria-label="Item search" autofocus>
                    <nav id="toggleNav" class="inactive">
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
            aria-label="breadcrumb"
            class="container-fluid animate-in">
            <span>Search for an item</span>
        </nav>

    </div>

    <section id="itemInfo" class="container-fluid page">

        <div id="templateContainer" class="item-info-item animate-in">
            <div class="body" id="templateContent">
                <div id="activityContent" class="template-load"><span class="loader"></span></div>
                <textarea id="jsoneditor" name="jsoneditor"></textarea>
            </div>
        </div>
        <div id="handbookContainer" class="item-info-item animate-in">
            <div class="body" id="handbookContent">
                <div id="activityContent"><span class="loader"></span></div>
            </div>
        </div>

        <div id="browseContainer" class="item-info-item animate-in">
            <div class="body" id="browseContent">
                <div class="browse-container">
                    <div id="browseSidebar" class="sidebar">

                    </div>
                    <div id="browseItems" class="items grid grid-400" grid-max-col-count="3">

                    </div>
                </div>
            </div>
        </div>

        <div id="recentSearches" class="grid animate-in"></div>

    </section> <!-- /.itemInfo -->

<?php include_once('footer.php') ?>