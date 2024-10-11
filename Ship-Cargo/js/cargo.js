/*
 * Cargo - Object constructor function
 * @param _parentElement 	-- the HTML element in which to draw the visualization
 * @param _data						-- the actual data
 */

Cargo = function(_parentElement, _data){
    this.parentElement = _parentElement;
    this.data = _data;
    this.initVis();
}

/*
 * Initialize visualization (static content, e.g. SVG area or axes)
 */

Cargo.prototype.initVis = function(){
    vis = this;

    vis.results = [];

    vis.resultLog = d3.select("#" + vis.parentElement)
        .append("ul")
        .attr("id", "result-log");

    // // (Filter, aggregate, modify data)
    setClickListener (submit, function(e) {
        e.preventDefault();
        vis.formData = loot();
        vis.wrangleData();
    });

    function loot() {
        let sizeButton = document.querySelector(".primary-button.size-button");
        let conditionButton = document.querySelector(".primary-button.condition-button");

        let size = sizeButton.value;
        let condition = conditionButton.value;    
        return { 
            'size': size, 
            'condition': condition
        };
    }
}

/*
 * Data wrangling
 */

Cargo.prototype.wrangleData = function(){
    var vis = this;

    let formData = vis.formData;

    // dice functions!
    let _1d4 = d3.randomInt(1,5);
    let _1d10 = d3.randomInt(1,11);
    let _1d20 = d3.randomInt(1,21);
    let _2d6 = d => {
        return d3.randomInt(1,7)() + d3.randomInt(1,7)();
    };
    let _1d100 = d3.randomInt(1,101); 
    let _1d2 = d3.randomInt(1,3);

    let bonus = 0;
    if (formData.condition == "poor") {
        bonus = -2;
    } else if (formData.condition == "luxurious") {
        bonus = 2;
    }

    let die = _1d10;
    if (formData.size == "medium") {
        die = _1d20;
    } else if (formData.size == "large") {
        die = _1d100;
    }
    
    let dieRoll = die();
    let result = vis.data[dieRoll + bonus + 1];
    vis.results.unshift({
        dieRoll : dieRoll,
        result : result,
        bonus : bonus,
        offset : vis.results.length%2
    });
    vis.updateVis();
}



/*
 * The drawing function
 */

Cargo.prototype.updateVis = function(){
	let vis = this;
    console.log(vis.results);
    let displayRoll = d3.select("#" + vis.parentElement)
        .selectAll(".display-roll")
        .remove()
        .exit()
        .data(new Array(vis.results[0]));

    displayRoll.enter()
        .append("div")
        .html(function (d,i) {
            if (d.bonus > 0) {
                return "<h2>" + d.dieRoll + " + " + d.bonus + " = " + (d.dieRoll + d.bonus) + "</h2><h1>" + d.result.findings + "</h1>";
            } else if (d.bonus < 0) {
                return "<h2>" + d.dieRoll + " - " + d.bonus * -1 + " = " + (d.dieRoll + d.bonus) + "</h2><h1>" + d.result.findings + "</h1>";
            }
            return "<h2>" + d.dieRoll + "</h2><h1>" + d.result.findings + "</h1>";
        })
        .lower()
        .classed("display-roll", true);

    let loot = vis.resultLog
        .selectAll(".loot")
        .remove()
        .exit()
        .data(function (d,i) {
            return vis.results;
        });

    loot.enter()
        .append("li")
        .classed("loot", true)
        .style("background-color", (d) => d.offset == 0 ? "#f0e4cb" : "#fcf9f2")
        // .append("div")
        .html(function (d) {
            return "<div>" + d.result.findings + "</div><div>" + d.result.die + "</div>";
        });
}