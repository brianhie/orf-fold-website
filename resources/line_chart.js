var line_chart_x, line_chart_y;

function draw_line_chart(yearly_data, metric) {  
    // define dimensions of graph
    var m = [80, 120, 80, 100]; // margins
    var w = window.innerWidth - 375 - m[1] - m[3]; // width
    var h = window.innerHeight - 10 - m[0] - m[2]; // height
  
    line_chart_x = d3.scale
        .linear()
        .domain(d3.extent(yearly_data[0], function(d) { return d.year; }))
        .range([0, w]);

    line_chart_y = d3.scale
        .linear()
        .range([h, 0])
        .domain([0,
            d3.max(yearly_data, function(c) { return d3.max(c, function(v) { return v.value; }); })
        ]);

    // Add an SVG element with the desired dimensions and margin.
    var svg_line = d3.select("#graph").append("svg:svg")
          .attr("width", w + m[1] + m[3])
          .attr("height", h + m[0] + m[2])
        .append("svg:g")
          .attr("transform", "translate(" + m[3] + "," + m[0] + ")");

    var xAxis = d3.svg.axis()
        .scale(line_chart_x)
        .tickSize(-h)
        .tickSubdivide(true)
        .tickFormat(d3.format("d"));
        
    svg_line.append("svg:g")
          .attr("class", "x axis")
          .attr("transform", "translate(0," + h + ")")
          .style("shape-rendering", "crispEdges")
          .call(xAxis);
          
    d3.select(".x.axis")
        .selectAll("line")
        .style("stroke", "lightgrey");

    var yAxisLeft = d3.svg.axis().scale(line_chart_y).ticks(5).orient("left");
    svg_line.append("svg:g")
          .attr("class", "y axis")
          .attr("transform", "translate(-25,0)")
          .style("shape-rendering", "crispEdges")
          .call(yAxisLeft);
    d3.select(".y.axis")
        .selectAll("path")
        .style("fill", "none")
        .style("stroke", "#000");
    d3.select(".y.axis")
        .selectAll("line")
        .style("fill", "none")
        .style("stroke", "#000");
        
    svg_line.append("text")
        .attr("text-anchor", "middle")  // this makes it easy to centre the text as the transform is applied to the anchor
        .attr("transform", "translate("+(-m[3]/2 - 20)+","+(h/2)+") rotate(-90)")  // text is drawn off the screen top left, move down and out and rotate
        .text(metric);
        
    d3.select(".domain")
        .style("display", "none");
    
    return svg_line;
}

function highlight_line(name) {
    d3.selectAll(".indivLinePath")
        .filter(function(d) {
            return d3.select(this).attr("data-legend") !== name;
        })
        .style("opacity", 0.2);
    d3.selectAll("circle")
        .filter(function(d) {
            return d3.select(this).attr("class") !== "dot" + name.replace(" ", "_");
        })
        .style("opacity", 0.2);
}

function reset_lines() {
    d3.selectAll(".indivLinePath")
        .style("opacity", 1);
    d3.selectAll("circle")
        .style("opacity", 1);
}

// Add the line by appending an svg:path element with the data line we created above
// do this AFTER the axes above so that the line is above the tick-lines
function addLine(yearly_data, color, svg, name) {    
    var line = d3.svg.line()
        .x(function(d) { return line_chart_x(d.year); })
        .y(function(d) { return line_chart_y(d.value); })
    
    var path = svg.append("path")
        .datum(yearly_data)
        .attr("d", line)
        .attr("data-legend", name)
        .attr("class", "indivLinePath")
        .style("stroke", color)
        .style("stroke-width", "1px")
        .style("fill", "none")
        .on("mouseover", function(d) {
            highlight_line(name);
        })
        .on("mouseout", function(d) {
            reset_lines();
        });
        
    var totalLength = path.node().getTotalLength();
    path
        .attr("stroke-dasharray", totalLength + " " + totalLength)
        .attr("stroke-dashoffset", totalLength)
        .transition()
        .duration(2000)
        .ease("linear")
        .attr("stroke-dashoffset", 0)
        .each("end", function (d) {
            var node = svg.selectAll(".node" + name.replace(" ", "_"))
                .data(yearly_data)
                .enter().append("g")
                .attr("class", "node" + name.replace(" ", "_"));

            var circle = node.append("circle")
                .attr("class", "dot" + name.replace(" ", "_"))
                .attr("cx", function(d) { return line_chart_x(d.year); })
                .attr("cy", function(d) { return line_chart_y(d.value); })
                .attr("r", 3)
                .attr("fill", color)
                .on("mouseover", function(d)
                {
                    d3.select(this)
                        .style("stroke", "#000")
                        .style("stroke-width", "3px");

                    d3.select(this.parentNode)
                        .moveToFront()
                        .append("text")
                        .attr("x", function(e) { return line_chart_x(d.year) - 8; })
                        .attr("y", function(e) { return line_chart_y(d.value) - 15; })
                        .attr("class", "dataLabel")
                        .text(function(d) { 
                            return (Math.round(d.value * 100) / 100) + " (Year: " + d.year + ") "; 
                        });
                        
                    highlight_line(name);
                })
                .on("mouseout", function(d)
                {
                    d3.select(this.nextSibling).remove();
                    d3.select(this).style("stroke-width", "0px");
                    reset_lines();
                });
        });
}

function add_legend(svg) {
    var legend = svg.append("g")
        .attr("class","legend")
        .attr("transform","translate(50,30)")
        .style("font-size","12px")
        .call(d3.legend)
    d3.selectAll(".legend-box")
        .style("fill", "white")
        .style("stroke", "black")
        .style("opacity", "0.75")
    d3.selectAll(".legend-items")
        .selectAll("circle")
        .on("mouseover", function(d) {
            highlight_line(d3.select(this).attr("class").replace("dot", "").replace("_", " "));
        })
        .on("mouseout", function(d) {
            reset_lines();
        });
}
