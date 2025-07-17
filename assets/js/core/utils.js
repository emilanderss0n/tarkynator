export function slideUp(element, { duration = 300, delay = 0 } = {}) {
    element.style.height = element.offsetHeight + 'px';
    element.style.transitionProperty = 'height, margin, padding';
    element.style.transitionDuration = `${duration}ms`;
    element.style.transitionDelay = `${delay}ms`;
    element.offsetHeight; // force reflow

    requestAnimationFrame(() => {
        element.style.overflow = 'hidden';
        element.style.height = 0;
        element.style.paddingTop = 0;
        element.style.paddingBottom = 0;
        element.style.marginTop = 0;
        element.style.marginBottom = 0;
    });

    window.setTimeout(() => {
        element.style.display = 'none';
        cleanupStyles(element);
    }, duration + delay);
}

export function slideDown(element, { duration = 300, delay = 0 } = {}) {
    element.style.removeProperty('display');
    let display = window.getComputedStyle(element).display;
    if (display === 'none') display = 'block';
    element.style.display = display;

    let height = element.offsetHeight;
    element.style.overflow = 'hidden';
    element.style.height = 0;
    element.style.paddingTop = 0;
    element.style.paddingBottom = 0;
    element.style.marginTop = 0;
    element.style.marginBottom = 0;
    element.offsetHeight; // force reflow

    element.style.transitionProperty = 'height, margin, padding';
    element.style.transitionDuration = `${duration}ms`;
    element.style.transitionDelay = `${delay}ms`;

    requestAnimationFrame(() => {
        element.style.height = height + 'px';
        element.style.removeProperty('padding-top');
        element.style.removeProperty('padding-bottom');
        element.style.removeProperty('margin-top');
        element.style.removeProperty('margin-bottom');
    });

    window.setTimeout(() => {
        cleanupStyles(element);
    }, duration + delay);
}

export function slideToggle(element, options) {
    const display = window.getComputedStyle(element).display;
    if (display === 'none') {
        slideDown(element, options);
    } else {
        slideUp(element, options);
    }
}

function cleanupStyles(element) {
    [
        'height',
        'padding-top',
        'padding-bottom',
        'margin-top',
        'margin-bottom',
        'overflow',
        'transition-duration',
        'transition-property',
        'transition-delay',
    ].forEach(prop => element.style.removeProperty(prop));
}