/* Global variables. */
var no_highlight = false;
var keep_on_text = [];
var keep_on_circle = [];

function color(role) {
    if (role === 1 || role === "OpenProt") {
        return "#D46A6A";
    } else if (role === 2 || role === "UniProt") {
        return "#4F7590";
        //return "#FFDBAA";
    } else {
        return "#000"
    }
}

function wrap(text, width) {
    text.each(function () {
        var text = d3.select(this),
            words = text.text().split(/\s+/).reverse(),
            word,
            line = [],
            lineNumber = 0,
            lineHeight = 1.1, // ems
            x = text.attr("x"),
            y = text.attr("y"),
            dy = 0, //parseFloat(text.attr("dy")),
            tspan = text.text(null)
                        .append("tspan")
                        .attr("x", x)
                        .attr("y", y)
                        .attr("dy", dy + "em");
        while (word = words.pop()) {
            line.push(word);
            tspan.text(line.join(" "));
            if (tspan.node().getComputedTextLength() > width || word === "|") {
                line.pop();
                tspan.text(line.join(" "));
                if (word === "|") {
                    line = [];
                } else {
                    line = [word];
                }
                tspan = text.append("tspan")
                            .attr("x", x)
                            .attr("y", y)
                            .attr("dy", ++lineNumber * lineHeight + dy + "em")
                            .text(word);
            }
        }
    });
}

function dragstart(d) {
    no_highlight = true;
    d3.select(this).classed("fixed", d.fixed = true);
    d3.select(this.nextSibling).remove();
    d3.select(this.nextSibling).remove();
}

function dragend(d) {
    no_highlight = false;
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
        .call(force.drag().on("dragend", dragend))
        .on("click", function(d) {
            search_name(d.name, G, svg_graph);
        })
        .on("mouseover", function(d) {
            if (keep_on_text.indexOf(d.id) !== -1 || no_highlight) {
                return;
            }

            d3.select(this)
                .style("stroke", "#000")
                .style("stroke-width", "3px");

            d3.select(this.nextSibling).remove();
            var parentNode = d3.select(this.parentNode).moveToFront();

            var bbox;
            var padding = 3;
            var rect = parentNode.append("rect")
                .attr("x", function(d) {
                    return d.x - padding;
                })
                .attr("y", function(d) {
                    return d.y - padding;
                })
                .attr("fill", "#fff")
                .attr("opacity", 0.9);

            parentNode.append("text")
                .attr("x", function(d) { return d.x + 18; })
                .attr("y", function(d) { return d.y - 2; })
                .attr("class", "indivLabel")
                .text(function(d) {
                    return d.name;
                })
                .each(function() {
                    bbox = this.getBBox();
                    rect.attr("x", bbox.x - padding)
                        .attr("y", bbox.y - padding)
                        .attr("width", bbox.width + (2 * padding))
                        .attr("height", bbox.height + (2 * padding));
                });
        })
        .on("mouseout", function(d) {
            if (keep_on_text.indexOf(d.id) === -1) {
                d3.select(this.nextSibling).remove();
                d3.select(this.nextSibling).remove();
            }
            if (keep_on_circle.indexOf(d.id) === -1) {
                d3.select(this).style("stroke-width", "0px");
            }
        });

    var roles = [ 'OpenProt', 'UniProt' ];
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
        .text(function(d) { return d; });

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

    for (var i = 0; i < 200; i++) {
        force.tick();
    }
    force.stop();

    graph_json.nodes.forEach(function(d) {
        d.fixed = true;
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
        var rects = nodes.append("rect")
            .attr("fill", "#fff")
            .attr("opacity", 0.9)
            // Initially set the width and height to 0,
            // which will be updated later based on the text's size.
            .attr("width", 0)
            .attr("height", 0)
            .moveToFront();

        var texts = nodes.append("text")
            .attr("x", function(d) { return d.x + 18; })
            .attr("y", function(d) { return d.y - 2; })
            .attr("class", "indivLabel")
            .text(function(d) {
                return d.name;
            })
            .each(function(d, i) {
                var bbox = this.getBBox();
                var padding = 3;
                d3.select(rects[0][i])
                    .attr("x", bbox.x - padding)
                    .attr("y", bbox.y - padding)
                    .attr("width", bbox.width + (2 * padding))
                    .attr("height", bbox.height + (2 * padding));
            })
            .moveToFront();
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
        return neighbors.indexOf(d.id) !== -1;
    }, false);
    label_nodes(svg, function(d) {
        return id === d.id;
    }, true);

    var filter = svg.append("defs")
        .append("filter")
        .attr("id", "shadow")
        .append("feDropShadow")
        .attr("dx", 1)    // Offset of the shadow in the x direction
        .attr("dy", 1)    // Offset in the y direction
        .attr("stdDeviation", 2); // Blur amount

    var top_offset = 40;
    var right_offset = 150;
    var caption = svg.append("text")
        .attr("id", "caption1")
        .attr("x", +svg.attr("width") - right_offset - 10)
        .attr("y", 0 + top_offset)
        .attr("font-size", "20px")
        .attr("fill", "black")
        .text("Your caption goes here. | | | | Your caption goes here. | Your caption goes here.")
        .call(wrap, right_offset);

    var bbox = caption.node().getBBox();
    var padding = 10;
    svg.insert("rect", "#caption1")
        .attr("x", bbox.x - padding)
        .attr("y", bbox.y - padding)
        .attr("width", bbox.width + padding + padding)
        .attr("height", bbox.height + padding + padding)
        .attr("fill", "white")
        .attr("filter", "url(#shadow)");
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
    svg.selectAll(".node").select("rect").remove();
    svg.selectAll(".link")
        .style("stroke-width", 1)
        .style("stroke", "#C2C2C2");

    keep_on_text = [];
    keep_on_circle = []
}
