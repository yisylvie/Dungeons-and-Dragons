/*
 * Herbalism - Object constructor function
 * @param _parentElement 	-- the HTML element in which to draw the visualization
 * @param _data						-- the actual data
 */

Herbalism = function (_parentElement, _table, _data) {
    this.parentElement = _parentElement;
    this.tableData = _table;
    this.data = _data;

    this.initVis();
}

/*
 * Initialize visualization (static content, e.g. SVG area or axes)
 */

Herbalism.prototype.initVis = function () {
    vis = this;

    // this is where we put all our ingredient data to be displayed
    vis.ingredientBag = [];
    vis.ingredientBagDisplay = [];

    // initializing filters objects
    vis.createAFilter = function(selected, display) {
        return {selected: selected, display: display};
    }
    // this is where we put all the data for the filter options
    vis.filters = {
        terrain: [ vis.createAFilter(true, "All") ],
        concoction: [ vis.createAFilter(true, "All") ],
        rarity: [ vis.createAFilter(true, "All") ],
        usage: [ vis.createAFilter(true, "All") ]
    };
    vis.filterDisplay = structuredClone(vis.filters);
    
    vis.rotatedFilters = [];

    vis.headers = ["checkbox", "Collection Dates", "Qty", "Ingredient", "Rarity", "Details", "DC", "Found in&hellip;"];
    let ingredientBagKeys = ['checked', 'dates', 'quantity', 'ingredient', 'rarity', 'details', 'DC', 'terrain'];

    // map displayed names of categories to names within ingredientBag
    vis.categories = vis.headers.map((el, i) => { return { display: el, keys: ingredientBagKeys[i] } });

    // create our ingredient table
    vis.table = d3.select("#" + vis.parentElement).append("table").attr("id", "ingredient-bag-table");

    // populate our header with categories
    vis.theadTr = vis.table.append("thead")
        .append("tr")
        .selectAll("th")
        .data(vis.categories)
        .enter()
        .append("th")
        .html(function (d) {
            if (d.display == "checkbox") {
                return "<input type='checkbox' tabindex='0'>";
            }
            return "<div><strong>" + d.display + "</strong>" + "<svg version='1.1' id='Layer_1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' x='0px' y='0px' width='31.806px' height='17.917px' viewBox='0 0 31.806 17.917' enable-background='new 0 0 31.806 17.917' xml:space='preserve'><path fill='currentColor' d='M31.292,3.084l-14.417,14.43c-0.148,0.148-0.301,0.252-0.458,0.312c-0.158,0.061-0.329,0.091-0.514,0.091 s-0.356-0.03-0.514-0.09c-0.157-0.06-0.31-0.164-0.458-0.312L0.5,3.084C0.167,2.75,0,2.329,0,1.82s0.171-0.935,0.514-1.278 C0.875,0.181,1.301,0,1.792,0C2.283,0,2.709,0.181,3.07,0.542l12.833,12.833L28.736,0.542c0.352-0.352,0.775-0.523,1.271-0.514 c0.495,0.009,0.914,0.185,1.257,0.528c0.361,0.361,0.542,0.787,0.542,1.278C31.806,2.324,31.634,2.741,31.292,3.084z'/></svg></div>";
        })
        .classed("unsorted", function (d) {
            return d.keys != "ingredient";
        })
        .classed("ascending", function (d) {
            return d.keys == "ingredient";
        })
        .classed("number-hd", function (d) {
            return d.display == "Qty" || d.display == "DC";
        });

    vis.tbody = vis.table.append("tbody");

    // grab our filters table
    vis.filterTable = d3.select("#filter-table");
    vis.filterThead = vis.filterTable.select("thead");
    vis.filterTbody = vis.filterTable.select("tbody");

    
    // when the forage form is submitted, do some gathering and populate the table if successful
    forageForm.addEventListener("submit", function (e) {
        e.preventDefault();        
        vis.forageData = gather();
        vis.wrangleData();
    });
    
    // grab the information inputted into the form
    function gather() {
        let startDate = new Date(datePicker.selectedDates[0]);
        let endDate = datePicker.selectedDates.length == 2 ? new Date(datePicker.selectedDates[1]) : new Date(datePicker.selectedDates[0]);
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

    // download a csv file on click of downloadIcon
    setClickListener(downloadIcon, function (e) {
        let csv = encodeURI("data:text/csv;charset=utf-8," + d3.csvFormat(vis.ingredientBag));
        window.open(csv);
    })

    // show/hide filters on click of filterIcon
    setClickListener(filterIcon, function (e) {
        vis.filterTable.classed("hidden", function(d) {
            return !this.classList.contains("hidden");
        });
    })

    // the rarity and details section have custom sort orders
    vis.raritySort = ["All", "Common", "Uncommon", "Rare", "Very Rare", "Legendary"];
    vis.detailsSort = ["Potion Effect", "Special (Potion Effect)", "Potion Modifier", "Special (Potion & Toxin Modifier)", "Toxin Effect", "Special (Toxin Effect)", "Toxin Modifier", "Special (Enchantment)", "Enchantment"];
    vis.usages = ["All", "Effect", "Modifier", "Enchantment", "Special", "Unknown"];
    vis.concoctionSort = ["All", "Potion", "Poison", "Enchantment", "Unknown"];

    // sort an array in a custom order
    vis.customSort = function (sortArray, a, b) {
        return sortArray.indexOf(a) - sortArray.indexOf(b);
    }
    
    // sort an array alphabetically
    vis.alphabeticalSort = function (a, b) {
        return a.localeCompare(b);
    }
    
    // sort an array chronologically
    vis.chronologicalSort = function (a, b) {
        return a.valueOf() - b.valueOf();
    }
    
    // sort ingredients by the various categories
    vis.sortIngredients = function (a, b, ascending, d) {
        if (d.keys == "dates") {
            // if we are sorting by oldest date, rearrange date array from oldest to newest
            // if sorting by newest, sort by newest to oldest
            if (ascending) {
                a[d.keys].sort((c, d) => vis.chronologicalSort(c.date, d.date));
                b[d.keys].sort((c, d) => vis.chronologicalSort(c.date, d.date));
            } else {
                a[d.keys].sort((d, c) => vis.chronologicalSort(c.date, d.date));
                b[d.keys].sort((d, c) => vis.chronologicalSort(c.date, d.date));
            }
            
            // sort by first collection date
            // if dates are the same, sort by second in array then third etc.
            let i = 0;
            while (i < a[d.keys].length && i < b[d.keys].length && vis.chronologicalSort(a[d.keys][i].date, b[d.keys][i].date) == 0) {
                i++;
            }
            
            // if we get to the end of one of the arrays without finding differing values
            // sort by array lengths
            if (i == a[d.keys].length || i == b[d.keys].length) {
                return b[d.keys].length - a[d.keys].length;
            } else {
                // first element in the array with differing values
                return vis.chronologicalSort(a[d.keys][i].date, b[d.keys][i].date);
            }
            
        } else if (d.keys == "terrain") {
            // sort alphabetically by first terrain in array
            // if terrains are the same, sort by second then third etc.
            let i = 0;
            while (i < a[d.keys].length && i < b[d.keys].length && vis.alphabeticalSort(a[d.keys][i], b[d.keys][i]) == 0) {
                i++;
            }

            // if we get to the end of one of the arrays without finding differing values
            // sort by array lengths
            if (i == a[d.keys].length || i == b[d.keys].length) {
                return a[d.keys].length - b[d.keys].length;
            } else {
                // first element in the array with differing values
                return vis.alphabeticalSort(a[d.keys][i], b[d.keys][i]);
            }
            
        }
        else if (typeof a[d.keys] == "number") {
            return a[d.keys] - b[d.keys];
        } else if (d.keys == "rarity") {
            return vis.customSort(vis.raritySort, a[d.keys], b[d.keys]);
        } else if (d.keys == "details") {
            if (a["knowledge"] == "none") {
                return 1;
            }
            if (b["knowledge"] == "none") {
                return -1;
            }
            if (vis.customSort(vis.detailsSort, a["type"], b["type"]) == 0) {
                if (a["knowledge"] == "basic") {
                    return 1;
                }
                if (b["knowledge"] == "basic") {
                    return -1;
                }
            }
            return vis.customSort(vis.detailsSort, a["type"], b["type"]);
        } else {
            return vis.alphabeticalSort(a[d.keys], b[d.keys]);
        }
    }

    // sort table by column value when headers are clicked
    vis.theadTr.on("click", function (event, d) {        
        // if it's already sorted in ascending order, sort in descending order 
        // otherwise sort in ascending
        // don't sort the checks
        if (d.display == "checkbox") {
            return;
        } else if (this.classList.contains("ascending")) {
            vis.ingredientBag = vis.ingredientBag.sort((b, a) => {
                return vis.sortIngredients(a, b, false, d);
            });
            this.classList.remove("ascending");
            this.classList.add("descending");
        } else {
            vis.ingredientBag = vis.ingredientBag.sort((a, b) => {
                return vis.sortIngredients(a, b, true, d);
            });
            
            let oldSorted = document.querySelectorAll(".ascending, .descending");
            oldSorted.forEach(th => {
                th.classList.remove("descending");
                th.classList.remove("ascending");
                th.classList.add("unsorted");
            });
            this.classList.remove("descending");
            this.classList.remove("unsorted");
            this.classList.add("ascending");
        }
        vis.filterData();        
    });

    // check or uncheck all checks when header check is checked
    vis.theadTr.select("input").on("change", function (event, d) {
        if (this.checked) {
            console.log(this);
            console.log(this.parentNode.parentNode);
            this.parentNode.parentNode.classList.add("checked");
            vis.ingredientBag.forEach(ingredient => {
                ingredient.checked = true;
            });
        } else {
            this.parentNode.parentNode.classList.remove("checked");
            vis.ingredientBag.forEach(ingredient => {
                ingredient.checked = false;
            });
        }
        vis.filterData();
    });

    /* this seems wrong
        turn object of arrays into rotated 90° array of arrays
        goes from
        {
            concoction: [a, b, ...],
            rarity: [a, b, ...]
        }
        to
        [
            [ { header: concoction, display: a }, { header: rarity, display: a }, ... ],
            [ { header: concoction, display: b }, { header: rarity, display: b }, ... ],
        ]
     */
    
    vis.rotate = function(){
        vis.rotatedFilters = [];
        let i = 0;
        let pau = 0;
        while (pau < Object.keys(vis.filterDisplay).length) {
            vis.rotatedFilters[i] = [];
            for (const filter in vis.filterDisplay) {
                if (i < vis.filterDisplay[filter].length) {
                    vis.rotatedFilters[i].push({
                        display: vis.filterDisplay[filter][i].display,
                        header: filter,
                        selected: vis.filterDisplay[filter][i].selected
                    });
                    if (i == vis.filterDisplay[filter].length - 1) {
                        pau++;
                    }
                } else {
                    vis.rotatedFilters[i].push({
                        display: "",
                        header: filter,
                        selected: false
                    });
                }
            }
            i++;
        }
    }

    vis.rotate();
    vis.updateFilterVis();
}

/*
* Data wrangling
 */

Herbalism.prototype.wrangleData = function () {
    var vis = this;

    let forageData = vis.forageData;

    // dice functions!
    let _1d4 = d3.randomInt(1, 5);
    let _1d20 = d3.randomInt(1, 21);
    let _2d6 = d => {
        return d3.randomInt(1, 7)() + d3.randomInt(1, 7)();
    };
    let _1d100 = d3.randomInt(1, 101);
    let _1d2 = d3.randomInt(1, 3);

    let advantage = forageData.locatePlants;
    let bonus = forageData.intWisMod + forageData.profBonus;

    // function to filter terrain ecosystems table by selected terrain and 
    // rolled value of 2d6 to determine the ingredient found
    function findIngredient(terrain, diceRoll) {
        if (terrain == "Underwater" || terrain == "Coastal") {
            terrain = "Coastal / Underwater";
        }
        return vis.tableData.find(
            (element) => element.Terrain == terrain && element["2d6"] == diceRoll
        );
    }

    // forage each day from start date to end date (inclusive)
    for (let i = forageData.startDate; i <= forageData.endDate; i.setDate(i.getDate() + 1)) {
        console.log(i);
        // forage a number of times per day equal to count
        for (let j = 0; j < forageData.count; j++) {

            // without advantage, make a DC 15 herbalism check to see if forage attempt is successful
            // otherwise attempt is automatically successful
            let check = bonus + _1d20();
            if ((!advantage && check >= 15) || advantage) {
                // each successful herbalism attempt nets you 1d4 ingredients
                let numIngredients = _1d4();
                for (let k = 0; k < numIngredients; k++) {
                    let currentIngredient = {};
                    let ingredientRoll = _2d6();

                    let ingredientFound = findIngredient(forageData.terrain, ingredientRoll);

                    // reroll if underwater and ingredient is for coastal locations only
                    if (forageData.terrain == "Underwater") {
                        while (ingredientFound["Additional Rule(s)"] == "Coastal Only") {
                            ingredientRoll = _2d6();
                            ingredientFound = findIngredient(forageData.terrain, ingredientRoll);
                        }

                        // reroll if wisp stalks are found during the day
                    } else if (!forageData.additionalRule && forageData.terrain == "Forest") {
                        while (ingredientFound.Ingredient == "Wisp Stalks") {
                            ingredientRoll = _2d6();
                            ingredientFound = findIngredient(forageData.terrain, ingredientRoll);
                        }
                    }

                    currentIngredient.ingredient = ingredientFound.Ingredient;

                    // if common ingredient is found, roll for which common 
                    // ingredient on common ingredient table
                    if (ingredientFound.Ingredient == "Common Ingredient") {
                        ingredientRoll = _2d6();
                        ingredientFound = findIngredient("Common", ingredientRoll);

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
                    } else if (ingredientRoll >= 10 || ingredientRoll <= 4) {
                        if (_1d100() >= 75) {
                            currentIngredient.ingredient = "Elemental Water";
                        }
                    }

                    // calculate the quantity of the ingredient found
                    // Usually 1 unless additional rulings specify otherwise
                    if (currentIngredient.ingredient == "Elemental Water") {
                        currentIngredient.quantity = 1;
                    } else if (ingredientFound["Additional Rule(s)"] == "Find 2x the rolled amount") {
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

                    // grab the ingredient from your bag if it exists
                    let ingredientInBag = vis.ingredientBag.filter((element) => element.ingredient == currentIngredient.ingredient);

                    // grab the ingredient information of the current ingredient 
                    // from our original data
                    let ingredientFoundList = vis.data.filter((element) => element.Ingredient == currentIngredient.ingredient)[0];

                    // if you already have this ingredient in your bag, 
                    // you cannot redo your knowledge check
                    if (ingredientInBag.length == 0) {

                        // if the ingredient is rare or very rare, the DC is 3 points harder
                        // additionally, the character has detailed knowledge of an 
                        // ingredient if passing the check by >= 5 or >= 10 if it is rare/very rare
                        let detailedKnowledgeDC = 5;
                        let additionalCheck = 0;
                        if (ingredientFoundList.Rarity.includes("Rare")) {
                            additionalCheck = 3;
                            detailedKnowledgeDC = 10;
                        }

                        // you can identify the herb with a herbalism DC check of 10 + the DC of the respective herb
                        // for some fucking reason there is but one ingredient that has two different DCs,
                        // so we choose one at random
                        let ingredientDC = ingredientFoundList.DC[d3.randomInt(0, ingredientFoundList.DC.length)()];
                        let DC = 10 + ingredientDC + additionalCheck;

                        // if you have advantage, identify ingredients roll is done with advantage
                        if (advantage) {
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
                                date: new Date(i),
                                quantity: currentIngredient.quantity
                            }
                        ];
                        currentIngredient.checked = false;
                        currentIngredient.DC = ingredientDC;

                        // add new filter options to vis.filters if they aren't already there

                        // don't add to usage or concoction filters if user lacks the knowledge
                        // add "Unknown" instead
                        currentIngredient.usage = [];
                        if (currentIngredient.knowledge == "none") {
                            if (!vis.filters.usage.some((element) => element.display == "Unknown")) {
                                vis.filters.usage.push(vis.createAFilter(false, "Unknown"));
                                vis.filters.concoction.push(vis.createAFilter(false, "Unknown"));
                            }
                            currentIngredient.usage.push("Unknown");
                        } else {
                            // figure out the ingredient usage(s) by checking if one of 
                            // the vis.usages elements is a substring of currentIngredient.type
                            vis.usages.forEach(usage => {
                                if (currentIngredient.type.includes(usage)) {
                                    currentIngredient.usage.push(usage);
                                    if (!vis.filters.usage.some((element) => element.display == usage)) {
                                        vis.filters.usage.push(vis.createAFilter(false, usage));
                                    }
                                }
                            });
                            currentIngredient.concoction.forEach(concoction => {
                                if (!vis.filters.concoction.some((element) => element.display == concoction)) {
                                    vis.filters.concoction.push(vis.createAFilter(false, concoction));
                                }
                            });
                        }
                        
                        if (!vis.filters.rarity.some((element) => element.display == currentIngredient.rarity)) {
                            vis.filters.rarity.push(vis.createAFilter(false, currentIngredient.rarity));
                        }

                        if (!vis.filters.terrain.some((element) => element.display == forageData.terrain)) {
                            vis.filters.terrain.push(vis.createAFilter(false, forageData.terrain));
                        }

                        // since the ingredient is not already in the bag,
                        // we push it in the bag as a new element
                        vis.ingredientBag.push(currentIngredient);
                    } else {
                        // alter the existing ingredient to reflect the new quantity and added date
                        ingredientInBag[0].quantity += currentIngredient.quantity;
                        let ingredientDate = ingredientInBag[0].dates.filter((element) => element.date.valueOf() === i.valueOf());
                        if (ingredientDate.length > 0) {
                            ingredientDate[0].quantity += currentIngredient.quantity;
                        } else {
                            ingredientInBag[0].dates.push(
                                {
                                    date: new Date(i),
                                    quantity: currentIngredient.quantity
                                }
                            );
                            // whenever we add a new date, we keep the dates chronological
                            ingredientInBag[0].dates = ingredientInBag[0].dates
                                .sort((a, b) => vis.chronologicalSort(a.date, b.date));
                        }
                        if (!ingredientInBag[0].terrain.includes(forageData.terrain)) {
                            ingredientInBag[0].terrain.push(forageData.terrain);

                            // add terrain to vis.filters if not already there
                            if (!vis.filters.terrain.some((element) => element.display == forageData.terrain)) {
                                vis.filters.terrain.push(vis.createAFilter(false, forageData.terrain));
                            }

                            // keep terrain array sorted alphabetically
                            ingredientInBag[0].terrain.sort((a, b) => vis.alphabeticalSort(a, b));
                        }
                        console.log(ingredientInBag[0]);
                    }

                    console.log(vis.ingredientBag);
                }
            }
        }
    }

    // keep array sorted by the currently selected header
    let currentSort = document.querySelector(".ascending, .descending");
    if (currentSort != null) {
        let d = d3.select(currentSort).data()[0];
        if (currentSort.className == "descending") {
            vis.ingredientBag = vis.ingredientBag.sort((b, a) => {
                return vis.sortIngredients(a, b, false, d);
            });
        } else {
            vis.ingredientBag = vis.ingredientBag.sort((a, b) => {
                return vis.sortIngredients(a, b, true, d);
            });
        }
    }

    // sort filters
    // change all selected filters to "All"
    // "All" always appears first and Unknown always last
    if (vis.ingredientBag.length > 0) {
        for (const filter in vis.filters) {
            // automatically select "All" and unselect everything else
            d3.selectAll("td")
                .filter(function (d) {
                    return d.display == "All" && d.header == filter;
                })
                .classed("selected", function(d) {
                    d.selected = false;
                    return false;
                });

            d3.selectAll("td")
                .filter(function (d) {
                    return d.selected == true && d.header == filter;
                })
                .classed("selected", function(d) {
                    d.selected = false;
                    return false;
                });

            vis.filters[filter].forEach(el => {
                if (el.display == "All") {
                    el.selected = true;
                } else {
                    el.selected = false;
                }
            });

            if (filter == "rarity") {
                vis.filters[filter].sort((a, b) => vis.customSort(vis.raritySort, a.display, b.display));
            } else if (filter == "usage") {
                vis.filters[filter].sort((a, b) => vis.customSort(vis.usages, a.display, b.display));
            } else if (filter == "concoction") {
                vis.filters[filter].sort((a, b) => vis.customSort(vis.concoctionSort, a.display, b.display));
            } else {
                vis.filters[filter].sort((a, b) => {
                    if (a.display == "All") {
                        return -1;
                    }
                    if (b.display == "All") {
                        return 1;
                    }
                    return vis.alphabeticalSort(a.display, b.display);
                });
            }
        }
        vis.filterDisplay = structuredClone(vis.filters);
        vis.rotate();
    }
    vis.updateFilterVis();
    vis.filterData();
}

/* 
 * Filter our ingredientBag into ingredientBagDisplay based on the filters from vis.filters
 */
Herbalism.prototype.filterData = function () {
    vis.ingredientBagDisplay = vis.ingredientBag.filter(function (d) {
        let isDisplayed = true;
        for (const filter in vis.filters) {
            let selectedFilters = vis.filters[filter].filter((el) => el.selected == true);
            if (selectedFilters.some((el) => el.display == "All")) {
                isDisplayed = isDisplayed && true;
            } else if (filter == "rarity") {
                isDisplayed = isDisplayed && selectedFilters.some((el) => el.display == d.rarity);
            } else if (filter == "terrain") {
                isDisplayed = isDisplayed && selectedFilters.some((el) => d[filter].includes(el.display));
            } else if (d.knowledge == "none") {
                isDisplayed = isDisplayed && selectedFilters.some((el) => {
                    return el.display == "Unknown";
                });
            } else {
                isDisplayed = isDisplayed && selectedFilters.some((el) => d[filter].includes(el.display));
            }
        }
        return isDisplayed;
    });
    vis.updateVis();
}

/*
 * populate filter table with data from vis.filters (vis.rotatedFilters)
 */

Herbalism.prototype.updateFilterVis = function () {
    let vis = this;

    let tr = vis.filterTbody.selectAll('tr')
        .data(vis.rotatedFilters)
        .join(
            // Styling table so rows alternate in colors
            function (enter) {
                return enter
                    .append("tr")
            },
            function (update) {
                return update;
            },
            function (exit) {
                return exit
                    .remove();
            }
        );

    let td = tr
        .selectAll("td")
        .remove()
        .exit()
        .data(function (d, i) {
            return d;
        });

    td.enter()
        .append("td")
        .html(function (d) {
            return d.display;
        })
        .classed("selected", function (d) {
            return d.selected;
        })
        .style("cursor", function (d) {
            // don't display cursor for empty cells
            if (d.display == "") {
                return "unset";
            }
        })
        .on("click", function (event, d) {
            // filter table by filter value when filters are clicked
            // we must make sure vis.filters and vis.rotatedFilters remain updated
            
            // can't select empty table cells
            if (d.display != "") {
                let allFilter = d3.selectAll("td").filter(function (c) {
                    return c.display == "All" && c.header == d.header;
                });

                let selectedFilters = d3.selectAll("td").filter(function (c) {
                    return c.selected == true && c.header == d.header;
                });

                // unselecting
                if (this.classList.contains("selected")) {
                    // don't unselect All if already selected
                    if (d.display != "All") {
                        // if we are unselecting the only selected value, automatically select "All"
                        if (selectedFilters.size() == 1) {
                            allFilter.classed("selected", function(d) {
                                d.selected = true;
                                return true;
                            });
                            vis.filters[d.header].find((element) => element.display == "All").selected = true;
                            vis.filterDisplay[d.header].find((element) => element.display == "All").selected = true;
                        }
                        this.classList.remove("selected");
                        vis.filters[d.header].find((element) => element.display == d.display).selected = false;
                        vis.filterDisplay[d.header].find((element) => element.display == d.display).selected = false;
                        d.selected = false;
                    }
                } else {
                    // selecting

                    // if we are selecting All, automatically unselect everything else
                    if (d.display == "All") {
                        selectedFilters.classed("selected", function(d) {
                            d.selected = false;
                            return false;
                        });
                        let origSelected = vis.filters[d.header].filter((element) => element.selected == true);
                        origSelected.forEach(filter => {
                            filter.selected = false;
                        });
                        let origDisplaySelected = vis.filterDisplay[d.header].filter((element) => element.selected == true);
                        origDisplaySelected.forEach(filter => {
                            filter.selected = false;
                        });
                    } else {
                        // if we are selecting anything but "All", automatically unselect "All"
                        allFilter.classed("selected", function(d) {
                            d.selected = false;
                            return false;
                        });
                        vis.filters[d.header].find((element) => element.display == "All").selected = false;
                        vis.filterDisplay[d.header].find((element) => element.display == "All").selected = false;
                    }
                    this.classList.add("selected");
                    vis.filters[d.header].find((element) => element.display == d.display).selected = true;
                    vis.filterDisplay[d.header].find((element) => element.display == d.display).selected = true;
                    d.selected = true;
                }
                vis.filterData();
                // vis.filterDisplay = structuredClone(vis.filters);
                for (const filter in vis.filterDisplay) {
                    if (filter != d.header) {
                        vis.filterDisplay[filter] = vis.filters[filter].filter((el) => {
                            if (el.display == "All") {
                                return true;
                            }
                            return vis.ingredientBagDisplay.some((ingredient) => {
                                if (typeof ingredient[filter] == "object") {
                                    if (filter == "concoction" && ingredient["knowledge"] == "none") {
                                        return el.display == "Unknown";
                                    }
                                    return ingredient[filter].includes(el.display);
                                }
                                return ingredient[filter] == el.display;
                            });
                        });
                    }
                }
                vis.rotate();
                vis.updateFilterVis();
                // console.log(vis.filterDisplay);
                // console.log(vis.filters);
                // console.log(vis.rotatedFilters);
            }
        });
}

/*
 * populate table with data from vis.ingredientBagDisplay
 */

Herbalism.prototype.updateVis = function () {
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

    // maka da rows
    let tr = vis.tbody.selectAll('tr')
        .data(vis.ingredientBagDisplay)
        .join(
            // Styling table so rows alternate in colors
            function (enter) {
                return enter
                    .append("tr")
                    .classed("even", (d, i) => i % 2 == 0);
            },
            function (update) {
                return update;
            },
            function (exit) {
                return exit
                    .remove();
            }
        )
        .classed("checked", function (d) {
            return d.checked;
        });

    // maka da data inside a da rows
    let td = tr
        .selectAll("td")
        .data(function (d, i) {
            let displayedData = vis.categories.map(function (category) {
                display = d[category.keys];
                for (const el in d) {
                    if (el == "dates" && category.display == "Collection Dates") {

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
                    } else if (el == "terrain" && category.display == "Found in&hellip;") {
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
                    } else if (category.display == "Details" && el == "details") {
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
                            display = details.replace(":", "");
                        }
                    } else if (category.display == "DC" && el == "DC") {
                        if (d[el] > 0) {
                            display = "+" + d[el];
                        } else {
                            display = d[el];
                        }
                    } else if (el == category.keys) {
                        display = d[el];
                    }
                }
                return { display: display, header: category.display };
            });
            return displayedData;
        })
        .join(
            function (enter) {
                return enter
                    .append("td");
            },
            function (update) {
                return update;
            },
            function (exit) {
                return exit.remove();
            }
        )
        .html(function (d) {
            if (d.header == "checkbox") {
                return "";
            }
            return d.display;
        })
        .classed("number-td", function (d) {
            return d.header == "Qty" || d.header == "DC";
        });
    
    // add checkboxes
    td
        .filter(function (d) {
            return d.header == "checkbox";
        })
        .append("input")
        .attr("type", "checkbox")
        .attr("tabindex", "0")
        .property("checked", function (d) {
            return d.display;
        })
        .on("change", function (event, d) {
            // unselect header checkbox if unselecting an item
            if (!this.checked) {
                vis.theadTr.classed("checked", false);
                vis.theadTr.select("input").property("checked", false);
            }
            // make sure our data remains up to date with checked state
            d.display = this.checked;
            // parent of the parent is the tr surrounding the td with this checkbox
            let thisTr = this.parentNode.parentNode;
            this.checked ? thisTr.classList.add("checked") : thisTr.classList.remove("checked");
            d3.select(thisTr).data()[0].checked = this.checked;
        });
}