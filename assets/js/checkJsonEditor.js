const jsonEditorDiv = document.querySelector(".cm-s-mbo");
const jsonEditorContent = document.querySelector(".CodeMirror-code");

export function checkJsonEditor() {
    if (jsonEditorDiv && jsonEditorContent) {
        jsonEditorDiv.style.display = jsonEditorContent.innerHTML.trim().length > 0 ? "block" : "none";
    }
}

export function checkJsonEditorSimple() {
    if (jsonEditorDiv) {
        jsonEditorDiv.style.display = "block";
    }
}