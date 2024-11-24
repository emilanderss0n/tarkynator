const jsonEditorDiv = document.querySelector(".cm-s-mbo");
const jsonEditorContent = document.querySelector(".CodeMirror-code");

export function checkJsonEditor() {
    jsonEditorDiv.style.display = jsonEditorContent.innerHTML.trim().length > 0 ? "block" : "none";
}

export function checkJsonEditorSimple() {
    jsonEditorDiv.style.display = "block";
}