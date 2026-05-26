// Reusable Popover Component
export class Popover {
    constructor(popoverId, options = {}) {
        this.popoverId = popoverId;
        this.options = {
            autoClose: true,
            closeOnBackdrop: true,
            closeOnEscape: true,
            ...options
        };
        this.popover = null;
        this.isInitialized = false;
        
        this.init();
    }

    init() {
        this.popover = document.getElementById(this.popoverId);
        if (!this.popover) {
            console.warn(`Popover with ID "${this.popoverId}" not found`);
            return;
        }

        this.setupEventListeners();
        this.isInitialized = true;
    }

    setupEventListeners() {
        if (!this.popover) return;

        // Close button handler
        const closeButton = this.popover.querySelector('.popover-close');
        if (closeButton) {
            closeButton.addEventListener('click', () => {
                this.hide();
            });
        }

        // Backdrop click handler
        if (this.options.closeOnBackdrop) {
            this.popover.addEventListener('click', (event) => {
                // Close if clicked on the backdrop (outside the popover content)
                if (event.target === this.popover) {
                    this.hide();
                }
            });
        }

        // Escape key handler is automatically handled by the native Popover API
    }

    show() {
        if (!this.popover || !this.isInitialized) return false;
        
        try {
            this.popover.showPopover();
            return true;
        } catch (error) {
            console.error('Error showing popover:', error);
            return false;
        }
    }

    hide() {
        if (!this.popover || !this.isInitialized) return false;
        
        try {
            this.popover.hidePopover();
            return true;
        } catch (error) {
            console.error('Error hiding popover:', error);
            return false;
        }
    }

    setTitle(title) {
        if (!this.popover) return;
        
        const titleElement = this.popover.querySelector('.popover-title');
        if (titleElement) {
            titleElement.textContent = title;
        }
    }

    setContent(content) {
        if (!this.popover) return Promise.resolve(false);
        
        const bodyElement = this.popover.querySelector('.preset-popover-body, .popover-body');
        if (bodyElement) {
            if (typeof content === 'string') {
                bodyElement.innerHTML = content;
            } else if (content instanceof Element) {
                bodyElement.innerHTML = '';
                bodyElement.appendChild(content);
            }

            return Promise.resolve(true);
        }

        return Promise.resolve(false);
    }

    showLoading(message = 'Loading...') {
        return this.setContent(`<div class="popover-loading">${message}</div>`);
    }

    showError(message = 'An error occurred') {
        return this.setContent(`<div class="popover-error">${message}</div>`);
    }

    // Utility method to check if popover is properly initialized
    isReady() {
        return this.isInitialized && this.popover !== null;
    }

}