import { Notification } from "./notifications.js";

const CODEMIRROR_SOURCES = [
    "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.5/codemirror.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.5/addon/edit/closebrackets.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.5/addon/fold/brace-fold.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.5/addon/fold/foldgutter.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.5/addon/fold/foldcode.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.5/mode/javascript/javascript.min.js",
];

function loadExternalScript(src) {
    return new Promise((resolve, reject) => {
        const existing = document.querySelector(`script[data-codemirror-src="${src}"]`);
        if (existing) {
            if (existing.dataset.loaded === "true") {
                resolve();
                return;
            }

            existing.addEventListener("load", () => resolve(), { once: true });
            existing.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)), { once: true });
            return;
        }

        const script = document.createElement("script");
        script.src = src;
        script.async = false;
        script.dataset.codemirrorSrc = src;
        script.addEventListener("load", () => {
            script.dataset.loaded = "true";
            resolve();
        });
        script.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)));
        document.head.appendChild(script);
    });
}

export async function ensureCodeMirrorLoaded() {
    if (typeof globalThis.CodeMirror !== "undefined") {
        return true;
    }

    try {
        for (const src of CODEMIRROR_SOURCES) {
            await loadExternalScript(src);
        }

        return typeof globalThis.CodeMirror !== "undefined";
    } catch (error) {
        console.error("CodeMirror failed to load:", error);
        return false;
    }
}

function getJsonTextFromLine(cm, line, lineText) {
    if (lineText.endsWith("{")) {
        const startLine = line.lineNo();
        let endLine = startLine;
        let openBraces = 1;

        while (openBraces > 0 && endLine < cm.lineCount()) {
            endLine++;
            const lineContent = cm.getLine(endLine).trim();
            if (lineContent.includes("{")) openBraces++;
            if (lineContent.includes("}")) openBraces--;
        }

        return cm.getRange(
            { line: startLine, ch: line.text.indexOf("{") },
            { line: endLine, ch: cm.getLine(endLine).length }
        ).trim();
    }

    const valueMatch = lineText.match(/:\s*(.*),?$/);
    return valueMatch ? valueMatch[1].replace(/,$/, "") : lineText;
}

function attachCopyControl(cm, line, element) {
    const lineText = line.text.trim();
    if (!lineText.endsWith("{") && !lineText.includes(":")) {
        return;
    }

    const copyLink = document.createElement("a");
    copyLink.href = "#";
    copyLink.className = "json-edit-btn";
    copyLink.innerHTML = "<i class='bi bi-copy'></i>";

    copyLink.onclick = function onCopyClick(event) {
        event.preventDefault();
        const jsonText = getJsonTextFromLine(cm, line, lineText);

        navigator.clipboard.writeText(jsonText)
            .then(() => {
                event.target.classList.add("copied");
                setTimeout(() => {
                    event.target.classList.remove("copied");
                }, 1400);

                const notif = new Notification("jsonCopyNotification", {
                    type: "info",
                    autoClose: true,
                    duration: 5000,
                });
                notif.setContent("Copied to clipboard!");
                notif.show();
            })
            .catch((err) => {
                console.error("Failed to copy text:", err);
            });
    };

    element.appendChild(copyLink);
}

function initializeJsonEditor() {
    const jsonEditorElement = document.getElementById("jsoneditor");
    if (!jsonEditorElement || typeof globalThis.CodeMirror === "undefined") {
        return;
    }

    globalThis.editor = globalThis.CodeMirror.fromTextArea(jsonEditorElement, {
        lineNumbers: true,
        mode: "application/json",
        theme: "mbo",
        closeBrackets: true,
        autoCloseBrackets: true,
        foldCode: true,
        readOnly: true,
        foldGutter: true,
        gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],
    });

    globalThis.editor.on("renderLine", (cm, line, element) => {
        attachCopyControl(cm, line, element);
    });
}

async function bootstrapJsonEditor() {
    const loaded = await ensureCodeMirrorLoaded();
    if (!loaded) {
        return;
    }

    initializeJsonEditor();
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootstrapJsonEditor);
} else {
    bootstrapJsonEditor();
}
