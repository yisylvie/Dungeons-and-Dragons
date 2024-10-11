const submit = document.getElementById("submit");
const conditionButtons = document.getElementsByClassName("condition-button");
const sizeButtons = document.getElementsByClassName("size-button");


// listener to detect button click or keypress (so I don't have to create two functions every time)
function setClickListener (el, listener) {
    // el.addEventListener("keypress", listener);
    el.addEventListener("click", listener);
}

// highlight and unhighlight buttons
function hightlightButton(buttons, className) {
    for (let i = 0; i < buttons.length; i++) {    
        setClickListener(buttons[i], function(event){
            event.preventDefault();       
            unhighlightButton(className);
    
            // highlight button being clicked
            buttons[i].classList.add("primary-button");
            buttons[i].classList.remove("secondary-button");
        });
    }
}

// if a button was previously clicked, unhighlight it
function unhighlightButton(className) {
    let oldButton = document.querySelector(".primary-button" + className);
    if(oldButton) {
        oldButton.classList.add("secondary-button");
        oldButton.classList.remove("primary-button");
    }
}

hightlightButton(conditionButtons, ".condition-button");
hightlightButton(sizeButtons, ".size-button");

// Load data asynchronously
let files = ["data/Cargo.csv"];
let promises = [];

files.forEach(function(url){
	promises.push(d3.csv(url))
});

Promise.all(promises).then(function(data){
	createVis(data);
})
.catch(function (e) {
    console.error(e);
    // .log("error:",error);
});

function createVis(data){

    let d100Table = data[0];

	// convert appropriate strings to nums
    d100Table.forEach(function (d) {
        d["die"] = parseInt(d["die"]);
    });
    
	// Create visualization instances
    let cargo = new Cargo("results", d100Table); 
}
