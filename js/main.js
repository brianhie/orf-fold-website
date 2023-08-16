var G = null;
var svg_graph = null;

var accItem = document.getElementsByClassName('accordion');
var accHD = document.getElementsByClassName('accordionHeading');
for (var i = 0; i < accHD.length; i++) {
    accHD[i].addEventListener('click', toggleItem, false);
}
function toggleItem() {
    var itemClass = this.parentNode.className;
    for (var i = 0; i < accItem.length; i++) {
        if (accItem[i].id === 'main-form') {
            continue;
        }
        accItem[i].className = 'accordion close';
    }
    if (itemClass === 'accordion close') {
        this.parentNode.className = 'accordion open';
    }
}

function currVisualization() {
    for (var i = 0; i < accHD.length; i++) {
        if (accItem[i].className === 'accordion open') {
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

function updateFilter() {
    document.getElementById("indiv1Input").value = "";
    document.getElementById("indiv2Input").value = "";

    updateVisualization();
}

function update() {
    updateVisualization();
}

function updateVisualization() {
    clearChart();

    var target = document.getElementById('graph')
    var spinner = new Spinner().spin(target);

    renderGraph();
}

String.prototype.trim=function(){return this.replace(/^\s+|\s+$/g, '');};

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

var xmlhttp = new XMLHttpRequest();

function renderGraph() {
    xmlhttp.onreadystatechange = function() {
        if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
            var graph_json = JSON.parse(xmlhttp.responseText);
            console.log(graph_json);

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
                    'name': node.name,
                    'role': node.role,
                    'score': node.score,
                    'UniProt ID': node.uniprot_id,
                    'Sequence identity': node.pident,
                    'E-value': node.evalue,
                });
            }

            for (var e in filtered_links) {
                var edge = filtered_links[e];
                var source = filtered_nodes[edge.source];
                var target = filtered_nodes[edge.target];
                G.addEdge(source.id, target.id, {
                    "AF-Multimer pDockQ": edge.alphafold_pdockq,
                    "ESMFold pDockQ": edge.esmfold_pdockq,
                });
            }

            clearChart();

            var filtered_json = {
                'nodes': filtered_nodes, 'links': filtered_links
            };
            svg_graph = draw_force_graph(filtered_json);

            const svgElement = document.querySelector('svg');
            svgElement.addEventListener("click", function(event) {
                if (event.target === svgElement) {
                    graph_reset(svg_graph);
                    document.getElementById("indiv1Input").value = "";
                    document.getElementById("indiv2Input").value = "";
                }
            });
        }
    };
    xmlhttp.open("GET", "https://gist.githubusercontent.com/brianhie/8b1c8ff22fe55718987cdea34f408049/raw/b3e909745d40ae654c818c761b2cf0e8f987e2d5/orffold_visualization.json", true);
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
