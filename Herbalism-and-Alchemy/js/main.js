const submit = document.getElementById("submit");
const today = document.getElementById("today");
const forageForm = document.getElementById("forage-form");
// const startDateInput = document.getElementById("start-date");
// const endDateInput = document.getElementById("end-date");
const terrainInput = document.getElementById("terrain");
const countInput = document.getElementById("count");
const profHerbInput = document.getElementById("prof-herbs");
const profBonusDiv = document.getElementById("prof-bonus-div");
const additionalRuleDiv = document.getElementById("additional-rule-div");
const additionalRuleLabel = document.querySelector("label[for=additional-rule] span");
const additionalRuleTooltip = document.querySelector("label[for=additional-rule] div");
const additionalRuleInput = document.getElementById("additional-rule");
const profBonusInput = document.getElementById("prof-bonus");
const intWisModInput = document.getElementById("INT-WIS");
const locatePlantsInput = document.getElementById("locate-plants");
const trackProvisionsInput = document.getElementById("track-prov");
const forageLog = document.getElementById("forage-log");
const columnColor = "#f0e4cb";
const backgroundColor = "#fcf9f2";

// // Today's date in html form is set in UTC so we must convert to local time
// function convertTimezone(date) {
//     let timeDifference = date.getTimezoneOffset();
//     date.setTime(date.getTime() - timeDifference * 60000);
//     return date;
// }

const tooltipTriggerList = document.querySelectorAll("[data-bs-toggle='tooltip']")
const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl, {
    boundary: forageForm,
    // container: forageForm,
    fallbackPlacements: ["left", "right", "top", "bottom"],
    // trigger: "click"
}));

const datePicker = flatpickr("#date-input-div", {
    mode:"range",
    dateFormat: "m/d/y",
    // altFormat: "m/d/Y",
    // altInput: true,
    defaultDate: "today",
    // parseDate: (datestr, format) => {
    //     return moment(datestr,format, true).toDate();
    // },
    enableTime: false,
    // allowInput: true,
    defaultHour: 0,
    defaultTime: 0,
    clickOpens: false,
    positionElement: document.getElementById("date-input-div"),
    wrap: true
});

console.log(datePicker);

document.querySelectorAll("#forage-form button").forEach(btn => {
    setClickListener(btn,function(e) {
        e.preventDefault();
    });
});

// // then we must convert it back?!
// function convertTimezoneBack(date) {
//     let timeDifference = date.getTimezoneOffset();
//     date.setTime(date.getTime() + timeDifference * 60000);
//     return date;
// }

// set dates displayed as today's date
function setToToday() {
    // let today = new Date();
    // today = convertTimezone(today);
    // startDateInput.valueAsDate = today;
    // endDateInput.valueAsDate = today;           
    let year = new Date().getFullYear();
    year = year.toString().substring(2,4);
    datePicker.setDate(new Date().getMonth()+1 + "-" + new Date().getDate() + "-" + year);
}

// setToToday();

// listener to detect button click or keypress (so I don't have to create two functions every time)
function setClickListener (el, listener) {
    // el.addEventListener("keypress", listener);
    el.addEventListener("click", listener);
}

// set dates to today's when Today is clicked
setClickListener(today, function(e){
    // e.preventDefault();
    setToToday();
});

// add numerical option elements to input 
function optionPopulation(input,min,max,plus){
    for (let i = min; i <= max; i++) {
        let option = document.createElement('option');
        option.value = i;
        if(plus && i > 0) {
            option.innerHTML = "+" + i;
        } else {
            option.innerHTML = i;
        }
        input.appendChild(option);
    }
}

// populate times per day dropdown with options
optionPopulation(countInput,1,10,false);

// populate proficiency bonus dropdown with options
optionPopulation(profBonusInput,1,14,true);

// populate intelligence/wisdom mod dropdown with options
optionPopulation(intWisModInput,-5,10,true);
intWisModInput.value = 0;

terrainOptions = ["Coastal","Underwater", "Underdark","Desert","Mountain","Forest","Swamp","Arctic","Hills","Grasslands"];
// populate terrain dropdown with option
terrainOptions.forEach(terrain => {
    let option = document.createElement('option');
    option.value = terrain;
    option.innerHTML = terrain;
    terrainInput.appendChild(option);
}); 

// can only add proficiency bonus if proficient with herbalism kit
profHerbInput.addEventListener("change", function(event) {
    if (this.checked) {
        profBonusDiv.classList.remove("hidden");
    } else {
        profBonusDiv.classList.add("hidden");
    } 
});

// add extra rules depending on terrain
terrainInput.addEventListener("change", function(event) {
    const tooltip = bootstrap.Tooltip.getInstance("label[for=additional-rule] div");

    if (terrainInput.value == "Forest") {
        additionalRuleDiv.classList.remove("hidden");
        additionalRuleLabel.innerHTML = "Foraging at night";
        tooltip.setContent({".tooltip-inner": "you might get snazy fun ingredients if you do ooolala"});
    } else if (terrainInput.value == "Mountain") {
        additionalRuleDiv.classList.remove("hidden");
        additionalRuleLabel.innerHTML = "Foraging in a cave";
        tooltip.setContent({".tooltip-inner": "caves am i right"});

    } else if (terrainInput.value == "Swamp") {
        additionalRuleDiv.classList.remove("hidden");
        additionalRuleLabel.innerHTML = "Foraging in the rain";
        tooltip.setContent({".tooltip-inner": "DANCING IN THE RAINN"});

    } else {
        additionalRuleDiv.classList.add("hidden");
    } 
});

// Load data asynchronously
let files = ["data/Ingredients List.csv","data/Terrain Ecosystems.csv"];
let promises = [];

files.forEach(function(url){
	promises.push(d3.csv(url))
});

Promise.all(promises).then(function(data){
	createVis(data);
})
.catch(function (e) {
    console.error(e);
});

function createVis(data){

    let ingredientsList = data[0];
    let terrainEcosystems = data[1];

    let terrains = [];

	// convert appropriate strings to nums

    // & convert comma separated strings to arrays
    ingredientsList.forEach(function (d) {
        d["DC"] = d["DC"].split(",");
        for (const dc in d["DC"]) {
            d["DC"][dc] = parseInt(d["DC"][dc]);
        }
        d["Terrain"] = d["Terrain"].split(",");

        // add the terrains to terrains if not already there
        for (const terrain in d["Terrain"]) {
            if (!terrains.includes(d["Terrain"][terrain])) {
                terrains.push(d["Terrain"][terrain]);
            }
        }
        d["Concoction"] = d["Concoction"].split(",");
    });

    terrainEcosystems.forEach(function (d) {
        d["2d6"] = parseInt(d["2d6"]);
    });
    
    let herbalism = new Herbalism("ingredient-bag", terrainEcosystems, ingredientsList); 

	// (4) Create visualization instances
}
