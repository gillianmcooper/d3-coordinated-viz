//begin script when window loads



//creating a pseudo-global variables
var attrArray = ["Contributing family workers, total (% of total employed)","Employment in services (% of total employment)","Labor force with primary education (% of total)","Employment in industry (% of total employment)","Employment in agriculture (% of total employment)"];
var expressed = attrArray[0];

    //chart frame dimensions
 var chartWidth = window.innerWidth * 0.97,
        chartHeight = 900;
        leftPadding = 80,
        rightPadding = 2,
        topBottomPadding = 100,
        innerWidth = chartWidth - leftPadding - rightPadding,
        innerHeight = chartHeight - topBottomPadding * 2,
        translate = "translate(" + leftPadding + "," + topBottomPadding + ")";

    var yScale = d3.scale.linear()
        .range([600, 0])
        .domain([0, 100]);

window.onload = setMap();
//set up choropleth map
function setMap(){

//map frame dimensions
var width = window.innerWidth * 0.7,
    height = 1700;

//create new svg container for the map
  var map = d3.select("#map-div")
    .append("svg")
    .attr("class", "map")
    .attr("width", width)
    .attr("height", height);
//defining the map projection and scale
  var projection = d3.geo.naturalEarth()
      .scale(400)
      .translate([width / 2, height / 2])
      .precision(.1);

  var path = d3.geo.path()
      .projection(projection);



//use queue.js to parallelize asynchronous data loading
  var q = d3_queue.queue();
    q
    .defer(d3.csv, "data/csvDataa.csv") 
    .defer(d3.json, "data/countries.topojson") 
    .await(callback);


//creating the callback function to create the map
  function callback(error, csvDataa, world){


//translate europe TopoJSON
      var worldcountries = topojson.feature(world, world.objects.countries).features;
//calling the set graticule function
    setGraticule(map, path);
//calling the join data function
    joinData(worldcountries, csvDataa);

    var colorScale = makeColorScale(csvDataa);
      //add countries to map
    setEnumerationUnits(worldcountries, map, path, colorScale);

    setChart(csvDataa, colorScale);
    createDropdown(csvDataa);

  };

};

//making the color scheme generator
function makeColorScale(data){
  var colorClasses = [
        "#ffffcc",
        "#a1dab4",
        "#41b6c4",
        "#2c7fb8",
        "#253494"
        ];

  var  colorScale = d3.scale.quantile()
    .range(colorClasses);

  var domainArray =[];
  for (var i=0; i<data.length; i++){
    var val = parseFloat(data[i][expressed]);
    domainArray.push(val);
  };

  colorScale.domain(domainArray);

  return colorScale;
};

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

}

//function to create coordinated bar chart
function setChart(csvDataa, colorScale){

//create an svg element to hold the bar chart
    var chart = d3.select("#chart-div")
        .append("svg")
        .attr("width", chartWidth)
        .attr("height", chartHeight)
        .attr("class", "chart");

//creating the bars for each region
     var bars = chart.selectAll(".bar")
        .data(csvDataa)
        .enter()
        .append("rect")
        .sort(function(a, b){
          // if(a[expressed] == " "){
          //   return a[expressed]= 100000}
          // else{
            return a[expressed]-b[expressed]
          // }
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

//create a text element for the chart title
    var chartTitle = chart.append("text")
        .attr("x", 40)
        .attr("y", 70)
        .attr("class", "chartTitle")
        

    //create vertical axis generator
    var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient("left");
    //place axis
    var axis = chart.append("g")
        .attr("class", "axis")
        .attr("transform", translate)
        .call(yAxis);

    //create frame for chart border
    var chartFrame = chart.append("rect")
        .attr("class", "chartFrame")
        .attr("width", chartWidth)
        .attr("height", chartHeight)
        .attr("transform", translate);
};

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
};
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

    updateChart(bars, csvDataa.length, colorScale);
 
  function updateChart(bars, n, colorScale){
    //position bars
    bars.attr("x", function(d, i){
            return i * (innerWidth / n) + leftPadding;
        })
        //size/resize bars
        .attr("height", function(d, i){
            return 700 - yScale(parseFloat(d[expressed]));
        })
        .attr("y", function(d, i){
            return yScale(parseFloat(d[expressed])) + topBottomPadding;
        })
        //color/recolor bars
        .style("fill", function(d){
            return choropleth(d, colorScale);
        });
    var chartTitle = d3.select(".chartTitle")
       .text("" + expressed + " in each region");

  };
};
function highlight(props){
    //change stroke
    var selected = d3.selectAll("." + props.adm0_a3)
        .style({
            "stroke": "yellow",
            "stroke-width": "3"
        });

    setLabel(props);
};

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
function moveLabel(){
    //use coordinates of mousemove event to set label coordinates
    var x = d3.event.clientX + 10,
        y = d3.event.clientY - 75;

    d3.select(".infolabel")
        .style({
            "left": x + "px",
            "top": y + "px"
        });
};
