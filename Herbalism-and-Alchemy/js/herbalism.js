/*
 * Herbalism - Object constructor function
 * @param _parentElement 	-- the HTML element in which to draw the visualization
 * @param _data						-- the actual data
 */

Herbalism = function(_parentElement, _table, _data){
    this.parentElement = _parentElement;
    this.tableData = _table;
    this.data = _data;

    this.initVis();
}

/*
 * Initialize visualization (static content, e.g. SVG area or axes)
 */

Herbalism.prototype.initVis = function(){
    vis = this;

    vis.ingredientBag = [];
    vis.ingredientBagDisplay = [];

    vis.headers = ["Collection Dates", "Qty", "Ingredient", "Rarity", "Details", "DC", "Found in&hellip;"];
    let ingredientBagKeys = ['dates', 'quantity', 'ingredient', 'rarity', 'details', 'DC', 'terrain'];
    
    // map displayed names of categories to names within ingredientBag
    vis.categories = vis.headers.map((el,i) => {return {display: el, keys: ingredientBagKeys[i]}});
    vis.table = d3.select("#" + vis.parentElement).append("table");
    
    vis.thead = vis.table.append("thead")
        .append("tr")
        .selectAll("th")
        .data(vis.categories)
        .enter()
        .append("th")
        .html(function (d) {
            return "<strong>" + d.display + "</strong>" + "<svg version='1.1' id='Layer_1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' x='0px' y='0px' width='31.806px' height='17.917px' viewBox='0 0 31.806 17.917' enable-background='new 0 0 31.806 17.917' xml:space='preserve'><path fill='currentColor' d='M31.292,3.084l-14.417,14.43c-0.148,0.148-0.301,0.252-0.458,0.312c-0.158,0.061-0.329,0.091-0.514,0.091 s-0.356-0.03-0.514-0.09c-0.157-0.06-0.31-0.164-0.458-0.312L0.5,3.084C0.167,2.75,0,2.329,0,1.82s0.171-0.935,0.514-1.278 C0.875,0.181,1.301,0,1.792,0C2.283,0,2.709,0.181,3.07,0.542l12.833,12.833L28.736,0.542c0.352-0.352,0.775-0.523,1.271-0.514 c0.495,0.009,0.914,0.185,1.257,0.528c0.361,0.361,0.542,0.787,0.542,1.278C31.806,2.324,31.634,2.741,31.292,3.084z'/></svg>";
        })
        .style("text-align", function (d) {
            return d == "Qty" || d == "DC" ? "center" : "left";
        })
        .classed("unsorted", true);

    console.log(vis.thead);
    vis.tbody = vis.table.append("tbody");
    // vis.margin = { top: 20, right: 20, bottom: 50, left: 60 };


    // vis.width = $("#" + vis.parentElement).width() - vis.margin.left - vis.margin.right,
    //     vis.height = 200 - vis.margin.top - vis.margin.bottom;

    // // SVG drawing area
    // vis.svg = d3.select("#" + vis.parentElement).append("svg")
    //     .attr("width", vis.width + vis.margin.left + vis.margin.right)
    //     .attr("height", vis.height + vis.margin.top + vis.margin.bottom)
    //     .append("g")
    //     .attr("transform", "translate(" + vis.margin.left + "," + vis.margin.top + ")");

    // vis.x = d3.scaleBand()
    // .range([0, vis.width])
    // .paddingInner(0.1)
    // .domain(vis.data.map(function(d) { return d.AgeAsOf2015; }));

    // vis.y = d3.scaleLinear()
    //     .range([vis.height, 0])
    //     .domain([0, d3.max(vis.data, function(d) { return d.n; })]);

    // vis.xAxis = d3.axisBottom()
    //     .scale(vis.x)
    //     // .tickFormat(function(d) { return shortenString(d, 20); });
    
    // vis.yAxis = d3.axisLeft()
    //     .scale(vis.y);
    
    // vis.xAxisGroup = vis.svg.append("g")
    //     .attr("class", "x-axis axis");
    
    // vis.yAxisGroup = vis.svg.append("g")
    //     .attr("class", "y-axis axis");
    
    // vis.colorScale = d3.scaleLinear()
    //     .range(["#E3DDE3", "#221C22"])
    //     .domain([0, d3.max(vis.data, function(d) { return d.n; })]);

    // // (Filter, aggregate, modify data)
    // setClickListener (submit, function(e) {
    //     // e.preventDefault();
    //     vis.forageData = gather();
    //     vis.wrangleData();
    // });

    forageForm.addEventListener("submit", function (e) {
        e.preventDefault();
        console.log("bro");

        vis.forageData = gather();
        vis.wrangleData();
    })

    function gather() {
        // let startDate = convertTimezoneBack(startDateInput.valueAsDate);
        // let endDate = convertTimezoneBack(endDateInput.valueAsDate);
        let startDate = new Date(datePicker.selectedDates[0]);
        let endDate = datePicker.selectedDates.length == 2 ? new Date(datePicker.selectedDates[1]) : new Date(datePicker.selectedDates[0]);
        console.log(endDate);
        let terrain = terrainInput.value;
        let intWisMod = parseInt(intWisModInput.value);
        
        let profBonus = parseInt(profBonusInput.value);
        // only add prof bonus if proficient with herbalism kit
        if (!profHerbInput.checked) {
            profBonus = 0;
        }

        let count = parseInt(countInput.value);
        let locatePlants = locatePlantsInput.checked;
        let trackProv = trackProvisionsInput.checked;
        let additionalRule = false;
        // only add the additional rule if we are in a relevant terrain
        if (terrain == "Forest" || terrain == "Mountain" || terrain == "Swamp") {
            additionalRule = additionalRuleInput.checked;
        }        
        return { 
            'startDate': startDate, 
            'endDate': endDate, 
            'terrain': terrain, 
            "intWisMod": intWisMod, 
            "profBonus": profBonus, 
            "count": count,
            "locatePlants": locatePlants,
            "trackProv": trackProv,
            "additionalRule": additionalRule
        };
    }

    let raritySort = ["Common", "Uncommon", "Rare", "Very Rare", "Legendary"];
    
    // sort table by column value when headers are clicked
    vis.thead.on("click", function(event, d) {
        console.log(vis.ingredientBag);
        vis.ingredientBag = vis.ingredientBag.sort((a,b) => {
            if (typeof a[d.keys] == "object") {
                if (d.keys == "dates") {
                    console.log(a[d.keys]);
                    console.log(b[d.keys]);
                    let i = 0;
                    while (i < a[d.keys].length && i < b[d.keys].length && a[d.keys][i].date.valueOf() - b[d.keys][i].date.valueOf() == 0) {
                        console.log(a[d.keys][i]);
                        console.log(b[d.keys][i]);
                        i++;
                    }

                    if (i == a[d.keys].length || i == b[d.keys].length) {
                        return a[d.keys][i-1].date.valueOf() - b[d.keys][i-1].date.valueOf();
                    } else {
                        return a[d.keys][i].date.valueOf() - b[d.keys][i].date.valueOf();
                    }
                    // if (a[d.keys][0].date.valueOf() - b[d.keys][0].date.valueOf() == 0) {

                    // }
                    // return a[d.keys][0].date.valueOf() - b[d.keys][0].date.valueOf();
                } else if (d.keys == "terrain") {
                    return a[d.keys][0].localeCompare(b[d.keys][0]);
                }
            } else if (typeof a[d.keys] == "number") {
                return a[d.keys] - b[d.keys];
            } else if (d.keys == "rarity") {
                return raritySort.indexOf(a[d.keys]) - raritySort.indexOf(b[d.keys]);    
            } else if (d.keys == "details") {
                if (a["knowledge" == "none" && b["knowledge"] == "none"]) {

                }
                if (a["knowledge"] == "none") {
                    return -1;
                }
                if (b["knowledge"] == "none") {
                    return 1;
                }
                return a["type"].localeCompare(b["type"]);   
            } else {
                return a[d.keys].localeCompare(b[d.keys]);
            }
        });
        vis.updateVis();
        console.log(vis.ingredientBag);

        console.log(this);
    });
}

/*
 * Data wrangling
 */

Herbalism.prototype.wrangleData = function(){
    var vis = this;

    let forageData = vis.forageData;

    // dice functions!
    let _1d4 = d3.randomInt(1,5);
    let _1d20 = d3.randomInt(1,21);
    let _2d6 = d => {
        return d3.randomInt(1,7)() + d3.randomInt(1,7)();
    };
    let _1d100 = d3.randomInt(1,101); 
    let _1d2 = d3.randomInt(1,3);

    let advantage = forageData.locatePlants;
    let bonus = forageData.intWisMod + forageData.profBonus;

    // function to filter terrain ecosystems table by selected terrain and 
    // rolled value of 2d6 to determine the ingredient found
    function findIngredient(terrain, diceRoll) {
        if (terrain == "Underwater" || terrain == "Coastal") {
            terrain = "Coastal / Underwater";
        }
        return vis.tableData.filter(
            (element) => element.Terrain == terrain && element["2d6"] == diceRoll
        )[0];
    }

    // forage each day from start date to end date (inclusive)
    for (let i = forageData.startDate; i <= forageData.endDate; i.setDate(i.getDate() + 1)) {
        console.log(i);
        // forage a number of times per day equal to count
        for (let j = 0; j < forageData.count; j++) {

            // without advantage, make a DC 15 herbalism check to see if forage attempt is successful
            // otherwise attempt is automatically successful
            let check = bonus + _1d20();
            // console.log(check);
            if((!advantage && check >= 15) || advantage) {
                // let log = document.createElement("tr").appendChild(document.createElement("td"));
                // console.log(forageLog.querySelector("table"));
                // forageLog.querySelector("table").appendChild(log);
                // each successful herbalism attempt nets you 1d4 ingredients
                let numIngredients = _1d4();
                for (let k = 0; k < numIngredients; k++) {
                    let currentIngredient = {};
                    let ingredientRoll = _2d6();

                    let ingredientFound = findIngredient(forageData.terrain, ingredientRoll);
                    //console.log(ingredientFound);

                    // reroll if underwater and ingredient is for coastal locations only
                    if (forageData.terrain == "Underwater") {
                        while (ingredientFound["Additional Rule(s)"] == "Coastal Only") {
                            ingredientRoll = _2d6();
                            ingredientFound = findIngredient(forageData.terrain, ingredientRoll);
                        }
                        //console.log(ingredientFound);

                    // reroll if wisp stalks are found during the day
                    } else if (!forageData.additionalRule && forageData.terrain == "Forest") {
                        while (ingredientFound.Ingredient == "Wisp Stalks") {
                            ingredientRoll = _2d6();
                            ingredientFound = findIngredient(forageData.terrain, ingredientRoll);
                        }
                        //console.log(ingredientFound);
                    }

                    currentIngredient.ingredient = ingredientFound.Ingredient;

                    // if common ingredient is found, roll for which common 
                    // ingredient on common ingredient table
                    if (ingredientFound.Ingredient == "Common Ingredient") {
                        ingredientRoll = _2d6();
                        ingredientFound = findIngredient("Common", ingredientRoll);

                        //console.log(ingredientFound);

                        // do not collect bloodgrass unless tracking provisions
                        if (!forageData.trackProv) {
                            while (ingredientFound.Ingredient == "Bloodgrass") {
                                ingredientRoll = _2d6();
                                ingredientFound = findIngredient("Common", ingredientRoll);
                            }
                        }

                        currentIngredient.ingredient = ingredientFound.Ingredient;

                    // if a 2-4 or 10-12 is rolled, the ingredient has a 25% 
                    // chance to become elemental water instead
                    } else if (ingredientRoll >= 10 || ingredientRoll <=4) {
                        if (_1d100() >= 75) {
                            currentIngredient.ingredient = "Elemental Water";
                        }
                    }  

                    // calculate the quantity of the ingredient found
                    // Usually 1 unless additional rulings specify otherwise
                    if (currentIngredient.ingredient == "Elemental Water") {
                        currentIngredient.quantity = 1;
                    } else if (ingredientFound["Additional Rule(s)"] == "Find 2x the rolled amount"){
                        currentIngredient.quantity = 2;
                    } else if (ingredientFound["Additional Rule(s)"] == "Find 1-2x the rolled amount") {
                        let coinFlip = _1d2();
                        currentIngredient.quantity = coinFlip;
                    } else if (forageData.additionalRule && 
                                (ingredientFound["Additional Rule(s)"] == "Find 2x during Night, Re-roll during Day" || 
                                    ingredientFound["Additional Rule(s)"].includes("Find 2x the rolled amount in "))) {
                        currentIngredient.quantity = 2;
                    } else {
                        currentIngredient.quantity = 1;
                    }

                    //console.log(currentIngredient);
                    let ingredientInBag = vis.ingredientBag.filter((element) => element.ingredient == currentIngredient.ingredient);
                    //console.log(ingredientInBag);

                    let ingredientFoundList = vis.data.filter((element) => element.Ingredient == currentIngredient.ingredient)[0];

                    // if you already have this ingredient in your bag, 
                    // you cannot redo your knowledge check
                    if (ingredientInBag.length == 0) {

                        // if the ingredient is rare or very rare, the DC is 3 points harder
                        // additionally, the character has detailed knowledge of an 
                        // ingredient if passing the check by >= 5 or >= 10 if it is rare/very rare
                        let detailedKnowledgeDC = 5;
                        let additionalCheck = 0;
                        if(ingredientFoundList.Rarity.includes("Rare")) {
                            additionalCheck = 3;
                            detailedKnowledgeDC = 10;
                        }

                        // you can identify the herb with a herbalism DC check of 10 + the DC of the respective herb
                        // for some fucking reason there is but one ingredient that has two different DCs,
                        // so we choose one at random
                        let ingredientDC = ingredientFoundList.DC[d3.randomInt(0,ingredientFoundList.DC.length)()];
                        let DC = 10 + ingredientDC + additionalCheck;
                        //console.log(DC);

                        // if you have advantage, identify ingredients roll is done with advantage
                        if(advantage) {
                            check = Math.max(bonus + _1d20(), bonus + _1d20());
                        } else {
                            check = bonus + _1d20();
                        }

                        if (check >= DC + detailedKnowledgeDC) {
                            currentIngredient.knowledge = "detailed"
                        } else if (check >= DC) {
                            currentIngredient.knowledge = "basic";
                        } else {
                            currentIngredient.knowledge = "none";
                        }

                        // add the extra relevant details from ingredientFoundList
                        currentIngredient.rarity = ingredientFoundList.Rarity;
                        currentIngredient.type = ingredientFoundList.Type;
                        currentIngredient.details = ingredientFoundList.Details;
                        currentIngredient.concoction = ingredientFoundList.Concoction;
                        currentIngredient.description = ingredientFoundList.Description;
                        currentIngredient.terrain = [forageData.terrain];
                        currentIngredient.dates = [
                            {
                                date : new Date(i),
                                quantity : currentIngredient.quantity
                            }
                        ];
                        currentIngredient.DC = ingredientDC;

                        // since the ingredient is not already in the bag,
                        // we push it in the bag as a new element
                        vis.ingredientBag.push(currentIngredient);
                    } else {
                        // alter the existing ingredient to reflect the new quantity and added date
                        ingredientInBag[0].quantity += currentIngredient.quantity;
                        let ingredientDate = ingredientInBag[0].dates.filter((element) => element.date.valueOf() === i.valueOf());
                        if (ingredientDate.length > 0) {
                            console.log("add to date");
                            ingredientDate[0].quantity += currentIngredient.quantity;
                        } else {
                            console.log("new date");
                            ingredientInBag[0].dates.push(
                                {
                                    date : new Date(i),
                                    quantity : currentIngredient.quantity
                                }
                            );
                            // whenever we add a new date, we keep the dates chronological
                            ingredientInBag[0].dates = ingredientInBag[0].dates
                                .sort((a,b) => a.date.valueOf() - b.date.valueOf());
                        }
                        if (!ingredientInBag[0].terrain.includes(forageData.terrain)) {
                            ingredientInBag[0].terrain.push(forageData.terrain);
                        }
                        console.log(ingredientInBag[0]);
                    }
                    
                    console.log(vis.ingredientBag);
                }
            }
        }
    }


    vis.updateVis();
}



/*
 * The drawing function
 */

Herbalism.prototype.updateVis = function(){
	let vis = this;

    // https://stackoverflow.com/questions/1199352/smart-way-to-truncate-long-strings
    // function truncate( str, n, useWordBoundary ){
    //     if (str.length <= n) { return str; }
    //     const subString = str.slice(0, n-1); // the original check
    //     return (useWordBoundary 
    //     ? subString.slice(0, subString.lastIndexOf(" ")) 
    //     : subString) + "...";
    // }

    // populating the table with our data
    let tr = vis.tbody.selectAll('tr')
        .data(vis.ingredientBag)
        .join(
            // Styling table so rows alternate in colors
            function(enter) {
                return enter
                .append("tr")
                .style("background-color", (d,i) => i%2 == 0 ? columnColor : backgroundColor);        
            },
            function(update) {
                return update;
            },
            function(exit) {
                return exit
                    .remove();
            }
        );

    let td = tr
        .selectAll("td")
        .remove()
        .exit()
        .data(function (d,i) {
            let displayedData = vis.headers.map(function (item) {
                display = d[item];
                for (const el in d) {
                    if (el == "dates" && item == "Collection Dates") {

                        // format dates as dd/mm
                        let sortedDates = d[el].map((e) => e.date)
                            .map((r) => r
                            .toLocaleString("en-US", {
                                month: "numeric",
                                day: "numeric"
                        }));
                        let datesString = "";

                        // display terrains in comma separated lists of three
                        // if > 3 terrains truncate with ...
                        if (sortedDates.length > 3) {
                            for (let j = 0; j < 3; j++) {
                                if (j == 2) {
                                    datesString += sortedDates[j] + "&hellip;";
                                } else {
                                    datesString += sortedDates[j] + ", ";
                                }
                            }
                        } else {
                            for (let j = 0; j < sortedDates.length; j++) {
                                if (j == sortedDates.length - 1) {
                                    datesString += sortedDates[j];
                                } else {
                                    datesString += sortedDates[j] + ", ";
                                }
                            }
                        }
                        display = datesString;

                        // display terrains in comma separated lists of three
                        // if > 3 terrains truncate with ...
                    } else if (el == "terrain" && item == "Found in&hellip;") {
                        let terrainString = "";
                        if (d[el].length > 3) {
                            for (let j = 0; j < 3; j++) {
                                if (j == 2) {
                                    terrainString += d[el][j] + "&hellip;";
                                } else {
                                    terrainString += d[el][j] + ", ";
                                }
                            }
                        } else {
                            for (let j = 0; j < d[el].length; j++) {
                                if (j == d[el].length - 1) {
                                    terrainString += d[el][j];
                                } else {
                                    terrainString += d[el][j] + ", ";
                                }
                            }
                        }
                        display = terrainString;
                    } else if (item == "Details" && el == "details") {
                        let details = "<strong>" + d["type"] + ":</strong>";

                        // if no knowlege display an em dash
                        if (d["knowledge"] == "none") {
                            display = "&mdash;";

                            // show ingredient usage in concoction and what it does in finished potion
                        } else if (d["knowledge"] == "detailed") {
                            details += " " + d[el];
                            display = details;

                        // display only ingredient usage in concoction
                        } else if (d["knowledge"] == "basic") {
                            display = details.replace(":","");
                        }
                    } else if (item == "DC" && el == "DC" && d[el] == 0) {
                        display = "&mdash;";
                        // return "&mdash;"
                    } else if (el == "quantity" && item == "Qty") {
                        display = d[el];
                        // return d[el];
                    } else if (el == item.toLowerCase()) {
                        display = d[el];
                        // return d[el];
                    }
                }
                return {display: display, header: item};
            });
            // console.log(displayedData);
            // console.log(vis.headers[i]);
            return displayedData;
        });
    
    td.enter()
        .append("td")
        .html(function (d) {
            return d.display;
        })
        .style("text-align", function (d,i) {
            if (d.header == "DC" || d.header == "Qty") {
                return "center";
            }
        });

    // // ---- DRAW BARS ----
    // var bars = vis.svg.selectAll(".bar")
    //     .remove()
    //     .exit()
    //     .data(vis.filteredData)

    // bars.enter()
    //     .append("rect")
    //     .attr("class", "bar")
    //     .attr("x", function(d){ return vis.x(d.AgeAsOf2015); })
    //     .attr("y", function(d){ return vis.y(d.n); })
    //     .attr("height", function(d){ return vis.height - vis.y(d.n); })
    //     .attr("fill", function(d){ return vis.colorScale(d.n); })
    //     .attr("width", vis.x.bandwidth())
    //     .on("mouseover", function(event, d) {
    //         console.log(d3.select("#" + vis.parentElement + " .age-count").node())
    //         d3.select("#" + vis.parentElement + " .age-count")
    //             .text(d.n + " dogs");
    //     })
    //     .on("mouseout", function(event, d) {
    //         d3.select("#" + vis.parentElement + " .age-count")
    //             .text("hover for age count");
    //     });

    // // ---- DRAW AXIS	----
    // vis.xAxisGroup = vis.svg.select(".x-axis")
    //     .attr("transform", "translate(0," + vis.height + ")")
    //     .call(vis.xAxis);

    // vis.yAxisGroup = vis.svg.select(".y-axis")
    //     .call(vis.yAxis);

    // vis.svg.select("text.axis-title").remove();
    // vis.svg.append("text")
    //     .attr("class", "axis-title")
    //     // .attr("x", -5)
    //     // .attr("y", vis.height/2)
    //     // .attr("dy", ".1em")
    //     .style("text-anchor", "middle")
    //     // .attr("transform", "rotate(-90)")
    //     .attr("transform", "rotate(-90) translate(" + -vis.height/2 + "," + -45 + ")")
    //     .text("count");

    // vis.svg.append("text")
    //     .attr("class", "axis-title")
    //     .attr("y", vis.height + 35)
    //     .attr("x", vis.width/2)
    //     // .attr("dy", ".1em")
    //     .style("text-anchor", "middle")
    //     // .attr("transform", "rotate(-90)")
    //     // .attr("transform", "rotate(-90) translate(" + -vis.height/2 + "," + -45 + ")")
    //     .text("age");
}