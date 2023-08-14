function color(role) {
    if (role === 1 || role === "author") {
        return "#4F7590";
    } else if (role === 2 || role === "printer") {
        return "#FFDBAA";
    } else if (role === 3 || role === "publisher") {
        return "#D46A6A";
    } else if (role === 4 || role === "bookseller") {
        return "#8A458A";
    } else {
        return "#000"
    }
}

function dragstart(d) {
    d3.select(this).classed("fixed", d.fixed = true);
}

function draw_force_graph(graph_json) {
    var width = window.innerWidth - 375,
        height = window.innerHeight - 10,
        radius = 9;

    var force = d3.layout.force()
        .linkStrength(0.1)
        .friction(0.9)
        .linkDistance(20)
        .charge(-30)
        .gravity(0.1)
        .theta(0.8)
        .alpha(0.00001)
        .size([width, height]);

    var svg_graph = d3.select("#graph").append("svg")
        .attr("width", width)
        .attr("height", height);

    force
        .nodes(graph_json.nodes)
        .links(graph_json.links)
        .start();

    var graph_link = svg_graph.selectAll(".link")
        .data(graph_json.links)
        .enter().append("line")
        .attr("class", "link")
        .attr("id", function(d) {
            return d.source.id + "-" + d.target.id;
        })
        .style("stroke-width", 1)
        .style("stroke", "#C2C2C2");

    var rScale = d3.scale.linear()
         .domain([0, d3.max(graph_json.nodes, function(d) { return G.degree(d.id); })])
         .range([6, radius*2]);

    var node = svg_graph.selectAll(".node")
        .filter(function(d) { return G.degree(d.id) > 0; })
        .data(graph_json.nodes)
        .enter()
        .append("g")
        .attr("class", "node");

    var circle = node.append("circle")
        .attr("r", function(d) { return rScale(G.degree(d.id)); })
        .style("fill", function(d) { return color(d.role); })
        .call(force.drag().on("dragstart", dragstart))
        .on("dblclick", function(d) { window.open("persons/person.jsp?pid=" + d.id,"_self");})
        .on("mouseover", function(d)
        {
            d3.select(this)
                .style("stroke", "#000")
                .style("stroke-width", "3px");

            d3.select(this.nextSibling).remove();
            d3.select(this.parentNode).moveToFront()
                .append("text")
                .attr("x", function(d) { return d.x + 18; })
                .attr("y", function(d) { return d.y - 2; })
                .attr("class", "indivLabel")
                .text(function(d) {
                    return d.name;
                });
        })
        .on("mouseout", function(d)
        {
            if (keep_on_text.indexOf(d.id) === -1) {
                d3.select(this.nextSibling).remove();
            }
            if (keep_on_circle.indexOf(d.id) === -1) {
                d3.select(this).style("stroke-width", "0px");
            }
        });

    var roles = [ 'author', 'printer', 'publisher', 'bookseller' ];
    var legendRectSize = 18;
    var legendSpacing = 4;
    var legend = svg_graph.selectAll('.legend')
        .data(roles)
        .enter()
        .append('g')
        .attr('class', 'legend')
        .attr('transform', function(d, i) {
            var height = legendRectSize + legendSpacing;
            var offset =  -30;
            var horz = 30;
            var vert = i * height - offset;
            return 'translate(' + horz + ',' + vert + ')';
        });

    legend.append('rect')
        .attr('width', legendRectSize)
        .attr('height', legendRectSize)
        .style('fill', color)
        .style('stroke', color);

    legend.append('text')
        .attr('x', legendRectSize + legendSpacing)
        .attr('y', legendRectSize - legendSpacing)
        .text(function(d) { return toTitleCase(d); });

    force.on("tick", function() {
        graph_link
            .attr("x1", function(d) { return d.source.x; })
            .attr("y1", function(d) { return d.source.y; })
            .attr("x2", function(d) { return d.target.x; })
            .attr("y2", function(d) { return d.target.y; });

        circle
            .attr("cx", function(d) { return d.x = Math.max(radius, Math.min(width - radius, d.x)); })
            .attr("cy", function(d) { return d.y = Math.max(radius, Math.min(height - radius, d.y)); });

        d3.selectAll(".indivLabel")
            .attr("x", function(d) { return d.x + 18; })
            .attr("y", function(d) { return d.y - 2; });
    });
    return svg_graph;
}

function strip_name(name) {
    return name.replace(" ", "").toLowerCase();
}

function name_to_id(name, G) {
    var nodes = G.nodes(true);
    for (var n in nodes) {
        var data = nodes[n][1];
        if (strip_name(data.name) === strip_name(name)) {
            return nodes[n][0];
        }
    }
    return null;
}

var keep_on_text = [];
var keep_on_circle = [];

function label_nodes(svg, filter_fn, text_on) {
    var nodes = svg.selectAll(".node")
        .filter(filter_fn)
        .moveToFront()
        .each(function(d) {
            if (text_on) {
                keep_on_text.push(d.id);
            }
            keep_on_circle.push(d.id);
        });

    nodes.selectAll("circle")
        .style("stroke", "#000")
        .style("stroke-width", "3px")

    if (text_on) {
        nodes.append("text")
            .attr("x", function(d) { return d.x + 18; })
            .attr("y", function(d) { return d.y - 2; })
            .attr("class", "indivLabel")
            .text(function(d) {
                return d.name;
            });
    }
}

function label_links(svg, filter_fn) {
    var links = svg.selectAll(".link")
        .filter(filter_fn)
        .style("stroke", "#000")
        .style("stroke-width", "2px")
        .moveToFront();
}

function search_name(name, G, svg) {
    if (svg === null) {
        return;
    }
    graph_reset(svg);
    var id = name_to_id(name, G);
    if (id === null) {
        alert("Could not find " + name + " in graph.");
        return;
    }

    var neighbors = jsnx.neighbors(G, id);
    label_links(svg, function(d) {
        var link_id = d3.select(this).attr("id");
        var link_list = link_id.split("-");
        var id1 = parseInt(link_list[0]);
        var id2 = parseInt(link_list[1]);
        return ((id1 === id) || (id2 === id));
    });
    label_nodes(svg, function(d) {
        return id === d.id;
    }, true);
    label_nodes(svg, function(d) {
        return neighbors.indexOf(d.id) !== -1;
    }, false);
}

function shortest_path(name1, name2, G, svg) {
    if (svg === null) {
        return;
    }
    graph_reset(svg);

    if (strip_name(name1) === strip_name(name2)) {
        search_name(name1, G, svg);
        return;
    }
    var id1 = name_to_id(name1, G);
    if (id1 === null) {
        alert("Could not find " + name1 + " in graph.");
    }
    var id2 = name_to_id(name2, G);
    if (id2 === null) {
        alert("Could not find " + name2 + " in graph.");
    }
    label_nodes(svg, function(d) {
        return (id1 === d.id) || (id2 === d.id);
    }, true);

    var path = jsnx.shortestPath(G, { source: id1, target: id2 });
    var filter_node_fn = function(d) {
        for (var p in path) {
            var id = path[p];
            if (id === d.id) {
                return true;
            }
        }
        return false;
    };
    var filter_link_fn = function(d) {
        var link_id = d3.select(this).attr("id");
        var link_list = link_id.split("-");
        var id1 = parseInt(link_list[0]);
        var id2 = parseInt(link_list[1]);
        return ((path.indexOf(id1) != -1) && (path.indexOf(id2) != -1));
    }
    label_links(svg, filter_link_fn);
    label_nodes(svg, filter_node_fn, false);
}

function graph_reset(svg) {
    svg.selectAll(".node").select("circle").style("stroke-width", "0px");
    svg.selectAll(".node").select("text").remove();
    svg.selectAll(".link")
        .style("stroke-width", 1)
        .style("stroke", "#C2C2C2");

    keep_on_text = [];
    keep_on_circle = []
}
