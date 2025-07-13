document.addEventListener("DOMContentLoaded", () => {
    const cards = document.getElementsByClassName("card-bfx");

    document.addEventListener("click", function (event) {
        if (event.target.matches("span.global-id") || event.target.matches("a.global-id")) {
            event.preventDefault();
            let textToCopy;
            
            if (event.target.matches("a.global-id")) {
                textToCopy = event.target.getAttribute("data-id");
            } else {
                textToCopy = event.target.textContent;
            }
            
            navigator.clipboard
                .writeText(textToCopy)
                .then(() => {
                    if (event.target.matches("a.global-id")) {
                        const originalHTML = event.target.innerHTML;
                        event.target.innerHTML = '<i class="bi bi-check"></i> Copied';
                        event.target.classList.add("copied");
                        setTimeout(() => {
                            event.target.innerHTML = originalHTML;
                            event.target.classList.remove("copied");
                        }, 3000);
                    } else {
                        event.target.classList.add("copied");
                        setTimeout(() => {
                            event.target.classList.remove("copied");
                        }, 1400);
                    }
                })
                .catch((err) => {
                    console.error("Failed to copy text: ", err);
                });
        }
    });

    function setupCardMouseMove(containerId) {
        const container = document.getElementById(containerId);
        if (container) {
            container.onmousemove = (e) => {
                mouseEvent = e;
                if (!isAnimationFrameRequested) {
                    isAnimationFrameRequested = true;
                    requestAnimationFrame(handleMouseMove);
                }
            };
        }
    }

    // Use the function for all containers
    setupCardMouseMove("recentSearches");
    setupCardMouseMove("browseItems");
    setupCardMouseMove("cardsMt");
    setupCardMouseMove("cardsTut");
    setupCardMouseMove("sptReleases");

    let isAnimationFrameRequested = false;
    let mouseEvent = null;

    // Event handler function
    function handleMouseMove() {
        for (const card of cards) {
            const rect = card.getBoundingClientRect(),
                x = mouseEvent.clientX - rect.left,
                y = mouseEvent.clientY - rect.top;

            card.style.setProperty("--mouse-x", `${x}px`);
            card.style.setProperty("--mouse-y", `${y}px`);
        }
        isAnimationFrameRequested = false;
    }

    ["recentSearches", "browseItems", "cardsMt", "cardsTut", "sptReleases"].forEach((id) => {
        const element = document.getElementById(id);
        if (element) {
            element.onmousemove = (e) => {
                mouseEvent = e;
                if (!isAnimationFrameRequested) {
                    isAnimationFrameRequested = true;
                    requestAnimationFrame(handleMouseMove);
                }
            };
        }
    });

    // Navbar toggle functionality
    const navbarToggler = document.querySelector('.navbar-toggler');
    const navbarCollapse = document.querySelector('.navbar-collapse');

    if (navbarToggler && navbarCollapse) {
        navbarToggler.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Toggle the collapse state
            const isExpanded = navbarToggler.getAttribute('aria-expanded') === 'true';
            
            if (isExpanded) {
                // Hide the navbar
                navbarCollapse.classList.remove('show');
                navbarToggler.setAttribute('aria-expanded', 'false');
                navbarToggler.classList.add('collapsed');
            } else {
                // Show the navbar
                navbarCollapse.classList.add('show');
                navbarToggler.setAttribute('aria-expanded', 'true');
                navbarToggler.classList.remove('collapsed');
            }
        });

        // Close navbar when clicking outside
        document.addEventListener('click', function(e) {
            if (!navbarToggler.contains(e.target) && !navbarCollapse.contains(e.target)) {
                if (navbarCollapse.classList.contains('show')) {
                    navbarCollapse.classList.remove('show');
                    navbarToggler.setAttribute('aria-expanded', 'false');
                    navbarToggler.classList.add('collapsed');
                }
            }
        });

        // Close navbar when clicking on nav links (for mobile)
        const navLinks = navbarCollapse.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', function() {
                if (navbarCollapse.classList.contains('show')) {
                    navbarCollapse.classList.remove('show');
                    navbarToggler.setAttribute('aria-expanded', 'false');
                    navbarToggler.classList.add('collapsed');
                }
            });
        });
    }
});
