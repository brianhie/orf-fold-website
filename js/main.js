var G = null;
var svg_graph = null;

function getURLParameters(url) {
    const params = new URL(url).searchParams;
    const paramsObject = {};
    for (let [key, value] of params.entries()) {
        paramsObject[key] = value;
    }
    return paramsObject;
}
params = getURLParameters(window.location.href);

window.onload = function() {
    document.getElementById("indiv1Input").value = params.protein_A ? params.protein_A : "";
    document.getElementById("indiv2Input").value = params.protein_B ? params.protein_B : "";

    update();
};

function debounce(func, wait) {
    let timeout;
    return function() {
        clearTimeout(timeout);
        timeout = setTimeout(func, wait);
    };
}
window.addEventListener("resize", debounce(function() {
    update();
}, 250));

var accItem = document.getElementsByClassName("accordion");
var accHD = document.getElementsByClassName("accordionHeading");
for (var i = 0; i < accHD.length; i++) {
    accHD[i].addEventListener("click", toggleItem, false);
}
function toggleItem() {
    var itemClass = this.parentNode.className;
    for (var i = 0; i < accItem.length; i++) {
        if (accItem[i].id === "main-form") {
            continue;
        }
        accItem[i].className = "accordion close";
    }
    if (itemClass === "accordion close") {
        this.parentNode.className = "accordion open";
    }
}

function currVisualization() {
    for (var i = 0; i < accHD.length; i++) {
        if (accItem[i].className === "accordion open") {
            return accItem[i].id;
        }
    }
    return "";
}

function currLineType() {
    var e = document.getElementById("lineTypeInput");
    return e.options[e.selectedIndex].value;
}

function clearChart() {
    document.getElementById("graph").innerHTML = "";
}

function checkFloat(id) {
    var value = document.getElementById(id).value;
    if (value === "") {
        return true;
    }
    return !isNaN(parseFloat(value)) && isFinite(value);
}

function updateFilter() {
    if (!checkFloat("af2-pdockq-cutoff")) {
        alert("AlphaFold-Multimer pDockQ cutoff is not valid.");
        return;
    }
    if (!checkFloat("esmfold-pdockq-cutoff")) {
        alert("ESMFold pDockQ cutoff is not valid.");
        return;
    }
    if (!checkFloat("evalue-cutoff")) {
        alert("E-value cutoff is not valid.");
        return;
    }

    document.getElementById("indiv1Input").value = "";
    document.getElementById("indiv2Input").value = "";

    update();
}

function update() {
    clearChart();

    var target = document.getElementById("graph")
    var spinner = new Spinner().spin(target);

    renderGraph();
}

String.prototype.trim=function(){return this.replace(/^\s+|\s+$/g, "");};

function updateSearchIndivs() {
    var indiv1Str = document.getElementById("indiv1Input").value.trim();
    var indiv2Str = document.getElementById("indiv2Input").value.trim();
    if (indiv1Str === "" && indiv2Str === "") {
        graph_reset(svg_graph);
        return;
    }
    if (indiv1Str !== "" && indiv2Str === "") {
        search_name(indiv1Str, G, svg_graph);
    } else if (indiv1Str === "" && indiv2Str !== "") {
        search_name(indiv2Str, G, svg_graph);
    } else {
        shortest_path(indiv1Str, indiv2Str, G, svg_graph);
    }
}

d3.selection.prototype.moveToFront = function() {
    return this.each(function(){
        this.parentNode.appendChild(this);
    });
};
d3.selection.prototype.moveToBack = function() {
    return this.each(function() {
        var firstChild = this.parentNode.firstChild;
        if (firstChild) {
            this.parentNode.insertBefore(this, firstChild);
        }
    });
};

var xmlhttp = new XMLHttpRequest();

function renderGraph() {
    xmlhttp.onreadystatechange = function() {
        if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
            var graph_json = JSON.parse(xmlhttp.responseText);
            G = new jsnx.Graph();

            var filtered_nodes = [];
            var filtered_links = [];
            var node_to_filtered_id = {};
            var evalue_cutoff = document.getElementById("evalue-cutoff").value;
            if (evalue_cutoff === "") {
                evalue_cutoff = 0.;
            }
            var af2_pdockq_cutoff = document.getElementById("af2-pdockq-cutoff").value;
            if (af2_pdockq_cutoff === "") {
                af2_pdockq_cutoff = 0.;
            }
            var esmfold_pdockq_cutoff = document.getElementById("esmfold-pdockq-cutoff").value;
            if (esmfold_pdockq_cutoff === "") {
                esmfold_pdockq_cutoff = 0.;
            }
            for (var e in graph_json.links) {
                var edge = graph_json.links[e];
                var source = graph_json.nodes[edge.source];
                var target = graph_json.nodes[edge.target];

                if (source.evalue !== null &&
                    source.evalue < evalue_cutoff) {
                    continue;
                }
                if (target.evalue !== null &&
                    target.evalue < evalue_cutoff) {
                    continue;
                }
                if (edge.alphafold_pdockq !== null &&
                    edge.alphafold_pdockq < af2_pdockq_cutoff) {
                    continue;
                }
                if (edge.esmfold_pdockq !== null &&
                    edge.esmfold_pdockq < esmfold_pdockq_cutoff) {
                    continue;
                }

                if (!(source.name in node_to_filtered_id)) {
                    node_to_filtered_id[source.name] = Object.keys(node_to_filtered_id).length;
                    filtered_nodes.push(source);
                }
                if (!(target.name in node_to_filtered_id)) {
                    node_to_filtered_id[target.name] = Object.keys(node_to_filtered_id).length;
                    filtered_nodes.push(target);
                }

                edge.source = node_to_filtered_id[source.name];
                edge.target = node_to_filtered_id[target.name];
                filtered_links.push(edge);
            }

            for (var n in filtered_nodes) {
                var node = filtered_nodes[n];
                G.addNode(node.id, {
                    "name": node.name,
                    "role": node.role,
                    "score": node.score,
                    "Sequence length": node.seq_len,
                    "UniProt ID": node.uniprot_id,
                    "Sequence identity": node.pident,
                    "E-value": node.evalue,
                });
            }

            for (var e in filtered_links) {
                var edge = filtered_links[e];
                var source = filtered_nodes[edge.source];
                var target = filtered_nodes[edge.target];
                G.addEdge(source.id, target.id, {
                    "ESMFold pDockQ": edge.esmfold_pdockq,
                    "AF-Multimer pDockQ": edge.alphafold_pdockq,
                });
            }

            clearChart();

            var filtered_json = {
                "nodes": filtered_nodes, "links": filtered_links
            };
            svg_graph = draw_force_graph(filtered_json);

            updateSearchIndivs();
        }
    };
    xmlhttp.open("GET", "https://raw.githubusercontent.com/brianhie/orf-fold-website/main/data/orffold_visualization.json", true);
    xmlhttp.send();
}

function toTitleCase(str) {
    return str.replace(
        /\w\S*/g,
        function(txt) {
            return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
        }
    );
}
