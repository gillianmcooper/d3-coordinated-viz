//begin script when window loads



//creating a pseudo-global variables that hold the attibute arrays from the csv
var attrArray = ["Contributing family workers, total (% of total employed)","Employment in services (% of total employment)","Labor force with at most primary education (% of total)","Employment in industry (% of total employment)","Employment in agriculture (% of total employment)","Labor force with at most Secondary education (% of total)","Labor force with at most Tertiary education (% of total)"];
var expressed = attrArray[0];

//creating the graph frame
var graphWidth = window.innerWidth * 1.2,
    graphHeight = 900;
    leftPadding = 80,
    rightPadding = 2,
    topBottomPadding = 100,
    innerWidth = graphWidth - leftPadding - rightPadding,
    innerHeight = graphHeight - topBottomPadding * 2,
    translate = "translate(" + leftPadding + "," + topBottomPadding + ")";


//creating the linear scale bar for the graph, domain goes from 0 -100 as the values are percentages
var yScale = d3.scale.linear()
    .domain([0, 100])
    .range([innerHeight, 0]);


window.onload = setMap();

//set up choropleth map function
function setMap(){
//Setting the dimensions for the map frame
  var width = window.innerWidth * 0.6,
      height = 1700;
//create new svg container for the map
  var map = d3.select("#map-div")
    .append("svg")
    .attr("class", "map")
    .attr("width", width)
    .attr("height", height);
//defining the map projection, natural earth and scale of the map
  var projection = d3.geo.naturalEarth()
      .scale(460)
      .translate([width / 2, height / 2])
      .precision(.1);

  var path = d3.geo.path()
      .projection(projection);

//use queue.js to load the data at the same time 
  var q = d3_queue.queue();
    q
    .defer(d3.csv, "data/csvDataa.csv") 
    .defer(d3.json, "data/countries.topojson") 
    .await(callback);

//creating the callback function to create the map within the set map function
  function callback(error, csvDataa, world){

//translate europe TopoJSON
      var worldcountries = topojson.feature(world, world.objects.countries).features;
      var colorScale = makeColorScale(csvDataa);
      
      //calling functions within the callback function
      //calling the function to join the topojson and csvdata
      joinData(worldcountries, csvDataa);
      //calling the function to create the graticule
      setGraticule(map, path);
      //calling the function to set the enumeration units for the map
      setEnumerationUnits(worldcountries, map, path, colorScale);
      //calling the function too create the graph
      setgraph(csvDataa, colorScale);
      //calling the function to creat the drop down menu
      createDropdown(csvDataa);

  };//end of the callback function
}; //end of the set map function


//making the color scheme generator
function makeColorScale(data){
  var colorClasses = [
        "#fee5d9",
        "#fcae91",
        "#fb6a4a",
        "#de2d26",
        "#a50f15"
        ];

  var  colorScale = d3.scale.quantile()
      .range(colorClasses);
//creating the variable taht stores the attributes as an array
  var domainArray =[];
  for (var i=0; i<data.length; i++){
      var val = parseFloat(data[i][expressed]);
      domainArray.push(val);
  };
//using the d3 method to make the color scale then returning the color scale 
  colorScale.domain(domainArray);
  return colorScale;
}; //end of make color scale


function setEnumerationUnits(worldcountries, map, path, colorScale){    
    var selectCountries = map.selectAll(".selectCountries")
          .data(worldcountries)
          .enter()
          .append("path")
          .attr("class", function(d){
            return "selectCountries " + d.properties.adm0_a3;

          })
          .attr("d",path)
          .style("fill", function(d){
            return choropleth(d.properties, colorScale);
          })
          //determining the mouse over features for moving over the map and then the dehighlighting 
          .on("mouseover", function(d){
              highlight(d.properties);
          })
          .on("mouseout", function(d){
              dehighlight(d.properties);
          })
          .on("mousemove", moveLabel);
          var desc = selectCountries.append("desc")
            .text('{"stroke": "none", "stroke-width": "0px"}');


};

function choropleth(props, colorScale){
          // highlight(props);

    //make sure attribute value is a number
    var val = parseFloat(props[expressed]);
    //if attribute value exists, assign a color; otherwise assign gray
    if (val && val != NaN){
        return colorScale(val);
    } else {
        return "#CCC";
    };
};
//writing a function to set the graticule
function setGraticule(map, path){

      var graticule = d3.geo.graticule()
      .step([10, 10]); //place graticule lines every 10 degrees of longitude and latitude

    //create graticule background
    var gratBackground = map.append("path")
      .datum(graticule.outline())
      .attr("class", "gratBackground") 
      .attr("d", path) 

    //create graticule lines
    var gratLines = map.selectAll(".gratLines") 
      .data(graticule.lines()) 
      .enter() 
      .append("path") 
      .attr("class", "gratLines")
      .attr("d", path); 
};


//writing a function to join the data from the csv and geojson
function joinData (worldcountries, csvDataa){

      for (var i= 0; i<csvDataa.length; i++){
      var csvRegion = csvDataa[i];
      var csvKey = csvRegion.admin;

        for (var a=0; a<worldcountries.length; a++){
          var geojsonProps = worldcountries[a].properties;
          var geojsonKey = geojsonProps.adm0_a3_us;

//creating the data join and setting a value for the no data
          if (geojsonKey==csvKey){
            attrArray.forEach(function(attr){
              if (csvRegion[attr]==" "){
                geojsonProps[attr] = "No Data";
              }

              else{
                var val = parseFloat(csvRegion[attr]);
                geojsonProps[attr] = val;
              }
            });
          };
        };
    };

}; //end of join data

//function to create coordinated bar graph
function setgraph(csvDataa, colorScale){

//create an svg element to hold the bar graph
    var graph = d3.select("#graph-div")
        .append("svg")
        .attr("width", graphWidth)
        .attr("height", graphHeight)
        .attr("class", "graph")


//creating the bars for each region
     var bars = graph.selectAll(".bar")
        .data(csvDataa)
        .enter()
        .append("rect")
        //sorting the bars on the bar graph
        .sort(function(a, b){
            return a[expressed]-b[expressed]
        })
        .attr("class", function(d){
            return "bar " + d.admin;
        })

        .attr("width", innerWidth / csvDataa.length - 1)
        .on("mouseover", highlight)
        .on("mouseout", dehighlight)
        .on("mousemove", moveLabel);

//setting the variable for deselecting the bars
    var desc = bars.append("desc")
        .text('{"stroke": "none", "stroke-width": "0px"}');

//create a text element for the graph title
    var graphTitle = graph.append("text")
        .attr("x", 40)
        .attr("y", 70)
        .attr("class", "graphTitle")
        

    //create vertical axis generator
    var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient("left");

    //place axis
    var axis = graph.append("g")
        .attr("class", "axis")
        .attr("transform", translate)
        .call(yAxis);

    //create frame for graph border
    var graphFrame = graph.append("rect")
        .attr("class", "graphFrame")
        .attr("width", graphWidth)
        .attr("height", graphHeight)
        .attr("transform", translate);
};//end of set graph



function createDropdown(csvDataa){
  //add select element
  var dropdown = d3.select("body")
    .append("select")
    .attr("class", "dropdown")
    .on("change", function(){
      changeAttribute(this.value, csvDataa)
    });

  //add initial option
  var titleOption = dropdown.append("option")
    .attr("class", "titleOption")
    .attr("disabled", "true")
    .text("Select Attribute");

  //add attribute name options
  var attrOptions = dropdown.selectAll("attrOptions")
    .data(attrArray)
    .enter()
    .append("option")
    .attr("value", function(d){ return d })
    .text(function(d){ return d });
};//end of create dropdown



function changeAttribute(attribute, csvDataa){
  //change the expressed attribute
  expressed = attribute;

  //recreate the color scale
  var colorScale = makeColorScale(csvDataa);

  //recolor enumeration units
  var regions = d3.selectAll(".selectCountries")
    .transition()
    .duration(1000)
    .style("fill", function(d){
      return choropleth(d.properties, colorScale)
    });
  var bars = d3.selectAll(".bar")
        //re-sort bars

        .sort(function(a, b){
            return b[expressed] - a[expressed];
        })
        .transition() //add animation
        .delay(function(d, i){
            return i * 20
        })
        .duration(500);
//calling the function to reload and update the graph
    reloadGraph(bars, csvDataa.length, colorScale);
 //defining the function to reload and update the graph
  function reloadGraph(bars, n, colorScale){
    //position bars
    bars.attr("x", function(d, i){
            return i * (innerWidth / n) + leftPadding;
        })
        //determining the size of the bars by the scale factor
        .attr("height", function(d, i){
            return 700 - yScale(parseFloat(d[expressed]));
        })
        .attr("y", function(d, i){
            return yScale(parseFloat(d[expressed])) + topBottomPadding;
        })
        //restyling the bars based on attribute
        .style("fill", function(d){
            return choropleth(d, colorScale);
        });
    var graphTitle = d3.select(".graphTitle")
       .text("" + expressed + " in each region");

  };
};//end of the change attribute function


//creating the highlighting function
function highlight(props){
    //change stroke
    var selected = d3.selectAll("." + props.adm0_a3)
        .style({
            "stroke": "yellow",
            "stroke-width": "3"
        });

    setLabel(props);
};
//creating the labels for mousing over the map and graph
function setLabel(props){
    //label content
    var labelAttribute = "<h1>" + props[expressed] +
        "</h1><b>" + expressed + "</b>";

    //create info label div
    var infolabel = d3.select("body")
        .append("div")
        .attr({
            "class": "infolabel",
            "id": props.adm0_a3 + "_label"
        })
        .html(labelAttribute);

    var regionName = infolabel.append("div")
        .attr("class", "labelname")
        .html(props.name);
};
//allowing the map to highlight stop when moused over dependant on stroke
function dehighlight(props){
  var selected = d3.selectAll("." + props.adm0_a3)
    .style({
      "stroke": function(){
        return getStyle(this, "stroke")
      },
      "stroke-width": function(){
        return getStyle(this, "stroke-width")
      }
    });
    //defining the styling for mousing off
    function getStyle(element, styleName){
    var styleText = d3.select(element)
      .select("desc")
      .text();

    var styleObject = JSON.parse(styleText);

    return styleObject[styleName];
  };

  d3.select(".infolabel")
    .remove();
};

//setting the posistion of mouseover labels 
function moveLabel(){
    var x = d3.event.clientX + 8,
        y = d3.event.clientY - 60;

    d3.select(".infolabel")
        .style({
            "left": x + "px",
            "top": y + "px"
        });
};
