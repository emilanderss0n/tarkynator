export function genMultipleObjectIds(count) {
    const ids = [];
    for (let i = 0; i < count; i++) {
        ids.push(genObjectId());
    }
    return ids;
}

export function genObjectId() {
    const timestamp = (new Date().getTime() / 1000 | 0).toString(16);
    const suffix = 'xxxxxxxxxxxxxxxx'.replace(/[x]/g, () => (Math.random() * 16 | 0).toString(16)).toLowerCase();
    return `${timestamp}${suffix}`;
}

export function createDownloadLink(ids) {
    const bulkOutput = document.querySelector('.bulk-output-tools');
    const existingLink = bulkOutput.querySelector('a.download-link');
    if (existingLink) {
        bulkOutput.removeChild(existingLink);
    }
    const blob = new Blob([ids.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'generated_ids.txt';
    link.innerHTML = '<i class="bi bi-download"></i> Download IDs';
    link.classList.add('btn-sm', 'btn', 'btn-primary', 'download-link');
    bulkOutput.appendChild(link);
}