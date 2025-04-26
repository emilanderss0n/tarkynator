document.addEventListener('DOMContentLoaded', () => {

    const bulkContainer = document.getElementById('bulkContainer');

    document.getElementById('genID').addEventListener('click', function (event) {
        const idGenOutput = document.getElementById('idGenOutput');
        idGenOutput.innerHTML = `${genObjectId()}`;
        idGenOutput.classList.remove('disabled');
    });

    document.getElementById('bulkGen').addEventListener('click', function (event) {
        const numberOfIds = parseInt(document.getElementById('objectIds').value, 10);
        const bulkOutput = document.querySelector('.bulk-output');
        const objectIdsInput = document.getElementById('objectIds');

        if (numberOfIds < 1 || numberOfIds > 50 || isNaN(numberOfIds)) {
            objectIdsInput.classList.add('error');
            bulkOutput.innerHTML = '';
        } else {
            objectIdsInput.classList.remove('error');
            const ids = genMultipleObjectIds(numberOfIds);
            bulkOutput.innerHTML = ids.map(id => `<div><span class="global-id">${id}</span></div>`).join('');
            createDownloadLink(ids);
        }
    });

    function genMultipleObjectIds(count) {
        const ids = [];
        for (let i = 0; i < count; i++) {
            ids.push(genObjectId());
        }
        return ids;
    }

    function genObjectId() {
        const timestamp = (new Date().getTime() / 1000 | 0).toString(16);
        const suffix = 'xxxxxxxxxxxxxxxx'.replace(/[x]/g, () => (Math.random() * 16 | 0).toString(16)).toLowerCase();
        return `${timestamp}${suffix}`;
    }

    function createDownloadLink(ids) {
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

});