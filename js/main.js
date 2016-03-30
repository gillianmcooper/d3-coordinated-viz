//begin script when window loads
window.onload = setMap();

//set up choropleth map
function setMap(){

//map frame dimensions
  var width = 1200,
      height = 575;

//create new svg container for the map
  var map = d3.select("body")
    .append("svg")
    .attr("class", "map")
    .attr("width", width)
    .attr("height", height);
//defining the map projection and scale
  var projection = d3.geo.naturalEarth()
      .scale(200)
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
      //translate europe TopoJSON
      var worldcountries = topojson.feature(world, world.objects.countries).features;

      //add countries to map
      var selectCountries = map.selectAll(".selectCountries")
          .data(worldcountries)
          .enter()
          .append("path")
          .attr("class", function(d){
            return "selectCountries " + d.properties.adm0_a3;

          })
          .attr("d",path);
  };
};
