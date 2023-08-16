function getURLParameters(url) {
    const params = new URL(url).searchParams;
    const paramsObject = {};
    for (let [key, value] of params.entries()) {
        paramsObject[key] = value;
    }
    return paramsObject;
}

params = getURLParameters(window.location.href);
var header = document.getElementById('header');
header.innerHTML = `${params.protein_A} <> ${params.protein_B} (UniProt: <a href="https://www.uniprot.org/uniprotkb/${params.protein_B_uniprot}/entry">${params.protein_B_uniprot}</a>)`;
var pdb_url = `https://raw.githubusercontent.com/brianhie/orf-fold-website/main/data/pdbs/af-multimer/${params.protein_A}_${params.protein_B_uniprot}.pdb`;

var viewerContainer = document.getElementById('myViewer');
viewerInstance = new PDBeMolstarPlugin();

function render() {
    var options = {
        customData: {
            url: pdb_url,
            format: 'pdb',
        },
        alphafoldView: false,
        bgColor: {r:255, g:255, b:255},
        sequencePanel: true
    };
    viewerInstance.render(viewerContainer, options);
}
render();

function addDownloadListener(id, fetch_url, filename) {
    var button = document.getElementById(id);
    button.addEventListener('click', async function() {
        try {
            const response = await fetch(fetch_url);
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('There was a problem with the fetch operation:', error.message);
        }
    });
}

addDownloadListener(
    'downloadStructureButton',
    pdb_url,
    `${params.protein_A}_${params.protein_B_uniprot}.pdb`
);
addDownloadListener(
    'downloadSequenceButton',
    `https://raw.githubusercontent.com/brianhie/orf-fold-website/main/data/fastas/${params.protein_A}_${params.protein_B_uniprot}.fasta`,
    `${params.protein_A}_${params.protein_B_uniprot}.fasta`
);
