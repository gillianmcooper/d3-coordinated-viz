//begin script when window loads



//creating a pseudo-global variables
var attrArray = ["Employers, female (% of employment)", "Employers, male (% of employment)","Employers, total (% of employment)", "GDP growth (annual %)", "Labor force with primary education (% of total)"];
var expressed = attrArray[0];

    //chart frame dimensions
 var chartWidth = window.innerWidth * 0.97,
        chartHeight = 700;
        leftPadding = 25,
        rightPadding = 2,
        topBottomPadding = 5,
        innerWidth = chartWidth - leftPadding - rightPadding,
        innerHeight = chartHeight - topBottomPadding * 2,
        translate = "translate(" + leftPadding + "," + topBottomPadding + ")";

    var yScale = d3.scale.linear()
        .range([0, chartHeight])
        .domain([0, 40]);

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
    .defer(d3.csv, "data/csvData.csv") 
    .defer(d3.json, "data/countries.topojson") 
    .await(callback);


//creating the callback function to create the map
  function callback(error, csvData, world){


//translate europe TopoJSON
      var worldcountries = topojson.feature(world, world.objects.countries).features;
//calling the set graticule function
    setGraticule(map, path);
//calling the join data function
    joinData(worldcountries, csvData);

    var colorScale = makeColorScale(csvData);
      //add countries to map
    setEnumerationUnits(worldcountries, map, path, colorScale);

    setChart(csvData, colorScale);
    createDropdown(csvData);

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
        });
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
function joinData (worldcountries, csvData){

      for (var i= 0; i<csvData.length; i++){
      var csvRegion = csvData[i];
      var csvKey = csvRegion.admin;

        for (var a=0; a<worldcountries.length; a++){
          var geojsonProps = worldcountries[a].properties;
          var geojsonKey = geojsonProps.adm0_a3_us;


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
function setChart(csvData, colorScale){


    //create a second svg element to hold the bar chart
    var chart = d3.select("#chart-div")
        .append("svg")
        .attr("width", chartWidth)
        .attr("height", chartHeight);

    //set bars for each province
     var bars = chart.selectAll(".bar")
        .data(csvData)
        .enter()
        .append("rect")
        .sort(function(a, b){
            return a[expressed]-b[expressed]
        })
        .attr("class", function(d){
            return "bar " + d.adm0_a3;
        })
        .attr("width", innerWidth / csvData.length - 1)

  //this hightlights all the bars 
        .on("mouseover", highlight);

// //applying numbers to the chart
//      var numbers = chart.selectAll(".numbers")
//         .data(csvData)
//         .enter()
//         .append("text")
//         .sort(function(a, b){
//             return a[expressed]-b[expressed]
//         })
//         .attr("class", function(d){
//             return "numbers " + d.adm1_code;
//         })
//         .attr("text-anchor", "middle")
//         .attr("x", function(d, i){
//             var fraction = chartWidth / csvData.length;
//             return i * fraction + (fraction - 1) / 2;
//         })
//         .attr("y", function(d){
//             return chartHeight - yScale(parseFloat(d[expressed])) + 15;
//         })
//         .text(function(d){
//             return d[expressed];
//         });

//create a text element for the chart title
    var chartTitle = chart.append("text")
        .attr("x", 40)
        .attr("y", 70)
        .attr("class", "chartTitle")
        .text("Number of Employers " + expressed[3] + " in each Country");

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

function createDropdown(csvData){
  //add select element
  var dropdown = d3.select("body")
    .append("select")
    .attr("class", "dropdown")
    .on("change", function(){
      changeAttribute(this.value, csvData)
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
function changeAttribute(attribute, csvData){
  //change the expressed attribute
  expressed = attribute;

  //recreate the color scale
  var colorScale = makeColorScale(csvData);

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

    updateChart(bars, csvData.length, colorScale);
 
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

  };
};
function highlight(props){
    //change stroke
    var selected = d3.selectAll("." + props.adm0_a3)
        .style({
            "stroke": "blue",
            "stroke-width": "2"
        });
};