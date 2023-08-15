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
        clearDate();
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
            G = new jsnx.Graph();
            for (var n in graph_json.nodes) {
                var node = graph_json.nodes[n];
                G.addNode(node.id, {
                    'name': node.name,
                    'role': node.role,
                    'score': node.score,
                    'UniProt ID': node.uniprot_id,
                    //'pident': node.pident,
                    'E-value': node.evalue,
                });
            }
            for (var e in graph_json.links) {
                var edge = graph_json.links[e];
                var source = graph_json.nodes[edge.source];
                var target = graph_json.nodes[edge.target];
                G.addEdge(source.id, target.id, {
                    "AF-Multimer pDockQ": edge.alphafold_pdockq,
                    "ESMFold pDockQ": edge.esmfold_pdockq,
                });
            }
            clearChart();
            svg_graph = draw_force_graph(graph_json);

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
