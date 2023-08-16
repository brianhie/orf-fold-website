/* Global variables. */
var curr_global_offset = 40;
var keep_on_text = [];
var keep_on_circle = [];
var no_highlight = false;

function color(role) {
    if (role === 1 || role === "Unknown protein") {
        return "#D46A6A";
    } else if (role === 2 || role === "Known protein") {
        return "#4F7590";
        //return "#FFDBAA";
    } else {
        return "#000"
    }
}

function three_dec(value) {
    if (typeof value !== 'number' || isNaN(value)) {
        return value;
    }
    return parseFloat(value.toFixed(3)).toString();
}

function object_to_string(obj) {
    let result = '';
    if ("name" in obj) {
        is_openprot = obj["name"].startsWith("IP_");
    } else{
        is_openprot = false;
    }
    for (let key in obj) {
        if (obj[key] === null) {
            continue;
        } else if (key === "role" || key === "score") {
            continue;
        }

        if (key === "name") {
            result += `*${obj[key]} || `
        } else if (is_openprot && key === "UniProt ID") {
            result += `Closest UniProt ID: ${obj[key]} | `;
        } else if (key.includes("pDockQ")){
            result += `${key}: ${three_dec(obj[key])} | `;
        } else {
            result += `${key}: ${obj[key]} | `;
        }

    }
    return result;
}

function wrap(text, width) {
    text.each(function () {
        var text = d3.select(this),
            words = text.text().split(/\s+/).reverse(),
            word,
            line = [],
            lineNumber = 0,
            lineHeight = 1.1, // ems
            isBold = false,
            isRed = false,
            x = text.attr("x"),
            y = text.attr("y"),
            dy = 0, //parseFloat(text.attr("dy")),
            tspan = text.text(null)
                        .append("tspan")
                        .attr("x", x)
                        .attr("y", y)
                        .attr("dy", dy + "em")
                        .attr("font-size", "14px");

        while (word = words.pop()) {
            dy = 0;
            if (word.startsWith("*")) {
                word = word.slice(1);
                isBold = true;
            }
            if (word.startsWith("!")) {
                word = word.slice(1);
                isRed = true;
            }
            line.push(word);
            tspan.text(line.join(" "));
            if (isBold) {
                tspan.attr("font-weight", "bold");
                tspan.attr("font-size", "18px");
                isBold = false;
            }
            if (isRed) {
                tspan.attr("fill", "#990000");
                isRed = false;
            }
            if (tspan.node().getComputedTextLength() > width ||
                word === "|" ||
                word === "||")
            {
                line.pop();
                tspan.text(line.join(" "));
                if (word === "|") {
                    line = [];
                } else if (word === "||") {
                    line = [];
                    lineNumber += 0.5;
                } else {
                    line = [word];
                }
                tspan = text.append("tspan")
                    .attr("x", x)
                    .attr("y", y)
                    .attr("dy", ++lineNumber * lineHeight + dy + "em")
                    .attr("font-size", "14px");
                tspan.text(line.join(" "));
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
    var width = window.innerWidth - 300,
        height = window.innerHeight - 10,
        radius = 9;

    var force = d3.layout.force()
        .linkStrength(0.1)
        .friction(0.9)
        .linkDistance(20)
        .charge(-30)
        .gravity(0.15)
        .theta(0.8)
        .alpha(0.1)
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
            if (d.name.startsWith("IP_")) {
                document.getElementById("indiv1Input").value = d.name;
            } else {
                document.getElementById("indiv2Input").value = d.name;
            }
            updateSearchIndivs();
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

    var roles = [ 'Unknown protein', 'Known protein' ];
    var legendRectSize = 18;
    var legendSpacing = 4;
    var legend = svg_graph.selectAll('.legend')
        .data(roles)
        .enter()
        .append('g')
        .attr('class', 'legend')
        .attr('transform', function(d, i) {
            var height = legendRectSize + legendSpacing;
            var offset = -30;
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
        .attr('x', legendRectSize + legendSpacing + 3)
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

    for (var i = 0; i < 300; i++) {
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
            return [ nodes[n][0], data ];
        }
    }
    return [ null, null ];
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

function draw_infobox_node(svg, caption_text) {
    var filter = svg.append("defs")
        .append("filter")
        .attr("id", "shadow")
        .append("feDropShadow")
        .attr("dx", 1)    // Offset of the shadow in the x direction
        .attr("dy", 1)    // Offset in the y direction
        .attr("stdDeviation", 2); // Blur amount

    var top_offset = 40;
    var right_offset = 250;
    var padding = 10;

    var caption = svg.append("text")
        .attr("id", "caption_infobox")
        .attr("x", +svg.attr("width") - right_offset - padding)
        .attr("y", curr_global_offset + padding)
        .attr("fill", "black")
        .text(caption_text)
        .call(wrap, right_offset);

    var bbox = caption.node().getBBox();
    var rect = svg.insert("rect", "#caption_infobox")
        .attr("id", "rect_infobox")
        .attr("x", bbox.x - padding)
        .attr("y", bbox.y - padding)
        .attr("width", bbox.width + 2 * padding)
        .attr("height", bbox.height + 2 * padding)
        .attr("fill", "white")
        .attr("filter", "url(#shadow)");

    // Make box right-justified.
    bbox = rect.node().getBBox();
    offset = +svg.attr("width") - (bbox.x + bbox.width) - padding;
    rect.attr("x", bbox.x + offset);
    caption.selectAll("tspan").attr("x", bbox.x + offset + padding);

    curr_global_offset += bbox.height + padding;
}

function draw_infobox_edge(svg, name1, name2, data1, data2, caption_text) {
    console.log("here!!!");

    var filter = svg.append("defs")
        .append("filter")
        .attr("id", "shadow")
        .append("feDropShadow")
        .attr("dx", 1)    // Offset of the shadow in the x direction
        .attr("dy", 1)    // Offset in the y direction
        .attr("stdDeviation", 2); // Blur amount

    var top_offset = 40;
    var right_offset = 250;
    var padding = 10;

    var caption = svg.append("text")
        .attr("id", "caption_infobox")
        .attr("x", 0)
        .attr("y",  curr_global_offset + padding)
        .attr("fill", "black")
        .text(caption_text)
        .call(wrap, right_offset)
        .moveToFront();
    var caption_bbox = caption.node().getBBox();

    var image_url = `https://raw.githubusercontent.com/brianhie/orf-fold-website/main/data/imgs/${name1}_${data2["UniProt ID"]}.png`;
    var image = svg.append("image")
        .attr("id", "image_infobox")
        .attr("xlink:href", image_url)
        .attr("width", 200)
        .attr("height", 200)
        .attr("x", 0)
        .attr("y", caption_bbox.y + caption_bbox.height + padding);
    var image_bbox = image.node().getBBox();

    var download_url = `/structure.html?protein_A=${name1}&protein_B_uniprot=${data2["UniProt ID"]}&protein_B=${name2}`
    var download_link = svg.append("a")
        .attr("id", "download_infobox")
        .attr("xlink:href", download_url); // You can use .attr("xlink:href", url) if needed
    var download_text = download_link.append("text")
        .attr("x", 0)
        .attr("y", image_bbox.y + image_bbox.height + padding + 5)
        .attr("fill", "#1338be")
        .attr("class", "download-link")
        .text("View structure");
    var download_bbox = download_link.node().getBBox();

    var rect_width = Math.max(image_bbox.width, download_bbox.width, caption_bbox.width);
    var rect_height = (download_bbox.y + download_bbox.height) - caption_bbox.y + padding;
    var rect = svg.insert("rect", "#caption_infobox")
        .attr("id", "rect_infobox")
        .attr("x", caption_bbox.x - padding)
        .attr("y", caption_bbox.y - padding)
        .attr("width", rect_width + padding * 2)
        .attr("height", rect_height + padding)
        .attr("fill", "white")
        .attr("filter", "url(#shadow)");

    // Make box right-justified.
    var bbox = rect.node().getBBox();
    var new_x = +svg.attr("width") - bbox.width - padding;
    rect.attr("x", new_x);
    image.attr("x", new_x + padding);
    download_text.attr("x", new_x + padding);
    caption.selectAll("tspan").attr("x", new_x + padding);

    curr_global_offset += bbox.height + padding;
}

function search_name(name, G, svg) {
    if (svg === null) {
        return;
    }
    graph_reset(svg);
    var [ id, data ] = name_to_id(name, G);
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

    draw_infobox_node(
        svg,
        object_to_string(data),
    );
}

function get_edge_data(id1, id2) {
    return edgeData;
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
    var [ id1, data1 ] = name_to_id(name1, G);
    if (id1 === null) {
        alert("Could not find " + name1 + " in graph.");
    }
    var [ id2, data2 ] = name_to_id(name2, G);
    if (id2 === null) {
        alert("Could not find " + name2 + " in graph.");
    }
    label_nodes(svg, function(d) {
        return (id1 === d.id) || (id2 === d.id);
    }, true);

    try {
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

        if (path.length === 2) {
            label_links(svg, filter_link_fn);
            label_nodes(svg, filter_node_fn, false);

            var edge_data = G.getEdgeData(id1, id2);
            draw_infobox_edge(
                svg,
                name1,
                name2,
                data1,
                data2,
                `*${name1} *<> *${name2} || ` + object_to_string(edge_data),
            );
        } else {
            draw_infobox_node(
                svg,
                `*${name1} *<> *${name2} || !No !interaction !found`,
            );
        }

    } catch (error) {
        if (error.name === 'JSNetworkXNoPath') {
            draw_infobox_node(
                svg,
                `*${name1} *<> *${name2} || !No !interaction !found`,
            );
        } else {
            throw error;
        }
    }

    draw_infobox_node(
        svg,
        object_to_string(data1),
    );
    draw_infobox_node(
        svg,
        object_to_string(data2),
    );
}

function graph_reset(svg) {
    svg.selectAll(".node").select("circle").style("stroke-width", "0px");
    svg.selectAll(".node").select("text").remove();
    svg.selectAll(".node").select("rect").remove();
    svg.selectAll(".link")
        .style("stroke-width", 1)
        .style("stroke", "#C2C2C2");

    d3.selectAll("#caption_infobox").remove();
    d3.selectAll("#image_infobox").remove();
    d3.selectAll("#download_infobox").remove();
    d3.selectAll("#rect_infobox").remove();
    curr_global_offset = 30;

    keep_on_text = [];
    keep_on_circle = []
}
