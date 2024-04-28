// Whenever a display is clicked on, reveal the dialog option to change?

// Image ref for LCD bases
var baseImg = document.getElementById("base");

// Number of screens
var numScreens = 1;

// For loading user data
var txtLoader = document.getElementById("txtLoader");

// Colours for the screens
var colIndex = 0;
const colourForward = ["#2c46ff", "#25a01c", "#b72727"];
const colourBack = ["#0012e3", "#054700", "#470800"];

// Bitmap for normal characters (A-Z,a-z and ascii etc)
var lcdTextImg = document.getElementById("text");
// And index reference (last 8 are custom characters)
var charIndex = "abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ`()*+,-^_{}!\"#$%&'[]./:;<=>?@☺☻♥♦♣♠•◘".split('');

// Which custom character is being edited?


// Redraw a display:
function Redraw(num) {
    let canv = document.getElementById("canvas"+num);
    let strUp = document.getElementById("upper"+num).value;
    let strLow = document.getElementById("lower"+num).value;
    let ctx = canv.getContext("2d");

    // Make gradient using fg/bg colours from constants.
    // Applies to all screens!
    let grad = ctx.createLinearGradient(0,0,0,240);
    grad.addColorStop(0, colourBack[colIndex]);
    grad.addColorStop(0.5, colourForward[colIndex]);
    grad.addColorStop(1, colourBack[colIndex]);
    ctx.fillStyle = grad;
    
    ctx.fillRect(40,40,480,200);
    ctx.drawImage(baseImg, 0, 0);
    
    console.log()

    // Top row, for all 16 chars etc
    let py = 82;
    for (let cha = 0; cha < 16; cha++) {
        ctx.fillStyle = "#000";
        let px = 76 + cha*24;
        let chInd = 0;
        // Use spaces if nothing present
        chInd = charIndex.indexOf(strUp[cha])+1;
        ctx.drawImage(lcdTextImg, chInd*20, 0, 20, 32, px, py, 20, 32);
    }

    // Bottom row, for all 16 chars etc
    py = 122;
    for (let cha = 0; cha < 16; cha++) {
        let px = 76 + cha*24;
        let chInd = 0;
        // Use spaces if nothing present
        chInd = charIndex.indexOf(strLow[cha])+1;
        ctx.drawImage(lcdTextImg, chInd*20, 0, 20, 32, px, py, 20, 32);
    }
}

// Redraw all!
function RedrawAll() {
    colIndex = Number(document.getElementById("colSel").value);
    for (let i=1; i <= numScreens; i++) {
        Redraw(i);
    }
}

// Add new display by copying original, then find and replace all 1's with N's.
function AddNew() {
    var copy = document.createElement("div");
    numScreens++;
    copy.id = ("screen"+numScreens);
    copy.innerHTML = document.getElementById("screen1").innerHTML
        .replaceAll("1\"", numScreens+"\"")
        .replaceAll("1)", numScreens+")")
        .replaceAll(">1<",">"+numScreens+"<");
    document.body.appendChild(copy);
    Redraw(numScreens);
}

// Remove a display?
function Remove() {
    
}

// Save to user device:
function SaveText() {
    let saver = document.getElementById("txtSaver");
    let text = "";
    // Gather data:
    for (let i=1; i <= numScreens; i++) {
        text += i.toString() + "\r\n";
        text += document.getElementById("upper"+i).value + "\r\n";
        text += document.getElementById("lower"+i).value + "\r\n";
        text += document.getElementById("desc"+i).value + "\r\n";
    }
    saver.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    saver.click();
}

// Load user screens from file.
async function LoadText() {  
    var reader = new FileReader();
    let text = "";
    // Reading files is asynchronous, so use callback.
    reader.addEventListener('load', function() {
        document.getElementById("desc1").value = text + "EOF";
    });
    text = reader.readAsText(txtLoader.files[0]);
}
