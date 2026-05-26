let activeTransition = null;

function supportsViewTransition() {
    return typeof document !== "undefined" && typeof document.startViewTransition === "function";
}

export function withViewTransition(updateFn, options = {}) {
    const {
        skipIfBusy = false,
        scopeElement = null,
        transitionName = "",
    } = options;

    const hasScopedTransition =
        scopeElement instanceof Element &&
        typeof transitionName === "string" &&
        transitionName.trim().length > 0;

    const scopedName = hasScopedTransition ? transitionName.trim() : "";
    const previousTransitionName = hasScopedTransition
        ? scopeElement.style.viewTransitionName
        : "";

    const applyScopedTransitionName = () => {
        if (hasScopedTransition) {
            scopeElement.style.viewTransitionName = scopedName;
        }
    };

    const cleanupScopedTransitionName = () => {
        if (!hasScopedTransition) {
            return;
        }

        if (previousTransitionName) {
            scopeElement.style.viewTransitionName = previousTransitionName;
            return;
        }

        scopeElement.style.removeProperty("view-transition-name");
    };

    if (typeof updateFn !== "function") {
        return Promise.resolve();
    }

    if (skipIfBusy && activeTransition) {
        updateFn();
        return Promise.resolve();
    }

    if (!supportsViewTransition()) {
        updateFn();
        return Promise.resolve();
    }

    try {
        applyScopedTransitionName();

        const transition = document.startViewTransition(() => {
            updateFn();
        });

        const finishedPromise = transition?.finished
            ? transition.finished.catch(() => {})
            : Promise.resolve();

        let settledPromise = null;
        settledPromise = finishedPromise.finally(() => {
            cleanupScopedTransitionName();

            if (activeTransition === settledPromise) {
                activeTransition = null;
            }
        });

        activeTransition = settledPromise;

        return settledPromise;
    } catch (error) {
        cleanupScopedTransitionName();
        updateFn();
        return Promise.resolve();
    }
}
