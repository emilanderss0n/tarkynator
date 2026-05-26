let activeTransition = null;

function supportsViewTransition() {
    return typeof document !== "undefined" && typeof document.startViewTransition === "function";
}

export function withViewTransition(updateFn, options = {}) {
    const { skipIfBusy = false } = options;

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
        const transition = document.startViewTransition(() => {
            updateFn();
        });

        const finishedPromise = transition?.finished
            ? transition.finished.catch(() => {})
            : Promise.resolve();

        activeTransition = finishedPromise.finally(() => {
            if (activeTransition === finishedPromise) {
                activeTransition = null;
            }
        });

        return activeTransition;
    } catch (error) {
        updateFn();
        return Promise.resolve();
    }
}
