// Reusable Notficication Component
export class Notification {
    constructor(notificationId, options = {}) {
        this.notificationId = notificationId;
        this.options = {
            autoClose: true,
            ...options
        };
        this.toast = null;
        this.isInitialized = false;
        this.autoCloseTimeoutId = null;
        
        this.init();
    }

    init() {
        if (this.isInitialized) return;

        // Ensure notification container exists
        let container = document.querySelector('.notification-container');
        if (!container) {
            const mainApp = document.querySelector('.main-app');
            if (mainApp) {
                container = document.createElement('div');
                container.className = 'notification-container';
                mainApp.parentNode.insertBefore(container, mainApp.nextSibling);
            } else {
                console.error('.main-app element not found. Cannot inject notification container.');
                return;
            }
        }

        // Create a new toast element for this notification
        this.toast = document.createElement('div');
        this.toast.id = this.notificationId + '-' + Date.now() + '-' + Math.floor(Math.random() * 10000);
        this.toast.className = 'notification';
        container.appendChild(this.toast);

        this.setupEventListeners();
        this.isInitialized = true;
    }

    setupEventListeners() {
        this.toast.addEventListener("click", (event) => {
            if (event.target.classList.contains("close")) {
                this.hide();
            } else if (event.target.classList.contains("copy")) {
                this.copyToClipboard(event);
            }
        });

        if (this.options.autoClose) {
            this.clearAutoCloseTimeout();
            this.autoCloseTimeoutId = setTimeout(() => {
                this.hide();
            }, this.options.duration || 7000);
        }
        // Removed document click listener for outside clicks
    }

    show() {
        if (!this.isInitialized) {
            console.error("Notification is not initialized.");
            return;
        }
        this.toast.classList.add("show");
        this.toast.classList.remove("hide");
    }

    hide() {
        if (!this.isInitialized) {
            console.error("Notification is not initialized.");
            return;
        }
        this.toast.classList.remove("show");
        this.toast.classList.add("hide");
        this.clearAutoCloseTimeout();
        // Remove toast from DOM after transition
        setTimeout(() => {
            if (this.toast && this.toast.parentNode) {
                this.toast.parentNode.removeChild(this.toast);
            }
        }, 350); // match CSS transition duration
    }

    clearAutoCloseTimeout() {
        if (this.autoCloseTimeoutId) {
            clearTimeout(this.autoCloseTimeoutId);
            this.autoCloseTimeoutId = null;
        }
    }

    isActive() {
        return this.toast.classList.contains("show");
    }

    setType(type) {
        if (!this.isInitialized) {
            console.error("Notification is not initialized.");
            return;
        }
        this.toast.className = `notification ${type}`;
    }

    setContent(content) {
        if (!this.isInitialized) {
            console.error("Notification is not initialized.");
            return;
        }
        // Build header with icon, type text, and close button
        const typeIconMap = {
            success: 'bi-check-circle-fill',
            error: 'bi-x-circle-fill',
            info: 'bi-info-circle-fill',
            warning: 'bi-exclamation-triangle-fill'
        };
        const typeTextMap = {
            success: 'Success',
            error: 'Error',
            info: 'Info',
            warning: 'Warning'
        };
        const type = this.options.type || 'info';
        const iconClass = typeIconMap[type] || typeIconMap['info'];
        const typeText = typeTextMap[type] || typeTextMap['info'];
        // Notification header
        const header = `
            <div class="notification-header">
                <i class="bi ${iconClass}"></i>
                <span class="notification-type">${typeText}</span>
                <button class="notification-close" aria-label="Close"><i class="bi bi-x-lg"></i></button>
            </div>
        `;
        // Notification body
        const body = `<div class="notification-body">${content}</div>`;
        // Progress bar
        const progress = `<div class="notification-progress"></div>`;
        this.toast.innerHTML = `${header}${body}${progress}`;
        // Add close button event
        const closeBtn = this.toast.querySelector('.notification-close');
        if (closeBtn) {
            closeBtn.onclick = (e) => {
                e.stopPropagation();
                this.hide();
            };
        }
        // Animate progress bar
        this.animateProgressBar();
    }

    animateProgressBar() {
        const progressBar = this.toast.querySelector('.notification-progress');
        if (!progressBar) return;
        progressBar.style.transition = `width ${this.options.duration || 7000}ms linear`;
        progressBar.style.width = '100%';
        // Start at 100%, animate to 0%
        setTimeout(() => {
            progressBar.style.width = '0%';
        }, 10);
    }

    isReady() {
        return this.isInitialized && this.toast !== null;
    }

    // Clean up method
    destroy() {
        if (this.isInitialized) {
            this.toast.removeEventListener("click", this.hide);
            this.toast = null;
            this.isInitialized = false;
        } else {
            console.warn("Notification is not initialized, nothing to destroy.");
        }
    }
}