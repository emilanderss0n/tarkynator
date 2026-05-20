// ItemDependencies - Handles item dependency management
export class ItemDependencies {
    constructor(context) {
        this.context = context;
        this.elements = context.elements;
        this.handleCopyDependencies = (copyButton) => {
            handleCopyDependencies(this, copyButton);
        };
    }

}

function handleCopyDependencies(instance, copyButton) {
    const depItem = copyButton.closest(".dep-item");
    if (!depItem) return;

    try {
        const assetPath = depItem.querySelector("p:nth-of-type(1) .global-id")?.textContent;
        const dependencyKeys = Array.from(
            depItem.querySelectorAll(".list-group .global-id")
        ).map((el) => el.textContent);

        if (!assetPath) {
            console.error("Asset path not found");
            showCopyError(copyButton);
            return;
        }

        const jsonOutput = {
            key: assetPath,
            dependencyKeys: dependencyKeys,
        };

        navigator.clipboard
            .writeText(JSON.stringify(jsonOutput, null, 3))
            .then(() => {
                showCopySuccess(copyButton);
            })
            .catch((err) => {
                console.error("Failed to copy:", err);
                showCopyError(copyButton);
            });

    } catch (error) {
        console.error("Error processing dependencies:", error);
        showCopyError(copyButton);
    }
}

function showCopySuccess(copyButton) {
    const originalHTML = copyButton.innerHTML;
    copyButton.innerHTML = '<i class="bi bi-check"></i> Copied!';

    setTimeout(() => {
        copyButton.innerHTML = originalHTML || '<i class="bi bi-clipboard"></i> Copy';
    }, 2000);
}

function showCopyError(copyButton) {
    const originalHTML = copyButton.innerHTML;
    copyButton.innerHTML = '<i class="bi bi-x"></i> Failed';

    setTimeout(() => {
        copyButton.innerHTML = originalHTML || '<i class="bi bi-clipboard"></i> Copy';
    }, 2000);
}
