// Edit up to 16 layers
layers = [];
// Edit index
var editLayer = 0;

// Layer size (15-69)
var gridSize = 15;
// And cell size:
var cellSize = 0;

// Edit canvas size
var canvasSize = 0;

// Mouse position as coordinate
var eX = 0;
var eY = 0;
// Fill origin:
var fX = 0;
var fY = 0;
// Push to fill
var spaceHeld = false;

// current colour
var col;
// colour under mouse
var mouseCol;

// Move the other box into view when hovering over colours:
var colComparisonX = 0;

// Colour map from that n64 game how did they do that anyway
var spectrum;

function preload() {
    spectrum = loadImage("spectra.png");
}

// Setup interface and document.
// Vox has several offscreen buffers it uses to make a pseudo-3d image.
function setup() {
    noStroke();
    noSmooth();
    textFont('monospace');
    textAlign(CENTER, CENTER);
    // Edit canvases buffers (from 9x9 to 29x29 grid sizes, or 256x internally):
    for (let i = 0; i < 16; i++) {
        layers.push(createGraphics(256, 256));
        layers[i].noStroke();
        layers[i].rectMode(CORNERS);
    }
    col = "#225";
    mouseCol = "#225";
    // Main
    createCanvas(windowWidth, windowHeight);
    textSize(24);
}

// Resize document on window size.
function windowResized() {
    // Reset drawing canvas and UI:
    resizeCanvas(windowWidth, windowHeight);
}

// On key press (for layer change/fill/eyedrop):
function keyPressed() {
    // Set fill origin.
    if (keyCode == " ") {
        spacePress = true;
    }
    // Get colour from current image:
    if (keyCode == CONTROL) {
        col = layers[editLayer].get(eX*(256/gridSize), eY*(256/gridSize));
    }
    // Or erase
    if (keyCode == SHIFT) {
        layers[editLayer].erase();
    }
    
    if (key == "w" && editLayer > 0) {
        editLayer--;
    }
    if (key == "s" && editLayer < 15) {
        editLayer++;
    }
    if (key == "a" && gridSize > 5) {
        gridSize--;
    }
    if (key == "d" && gridSize < 29) {
        gridSize++;
    }
}

// New colour?
function mouseClicked(params) {
    if (mouseY > height * 0.2 + canvasSize) {
        col = spectrum.get((mouseX/width)*590, ((mouseY-(height*0.2+canvasSize)) / (height*0.8-canvasSize))*590);
    }
    
}

function keyReleased(params) {
    // Stop setting fill origin.
    if (keyCode == " ") {
        spacePress = false;
    }
    if (keyCode == SHIFT){
        layers[editLayer].noErase();
    }
}

// And update.
function draw()
{
    // Scale to width:
    canvasSize = width * 0.4;
    if (canvasSize > height*0.5) { canvasSize = height*0.5; }

    // Get colour under mouse - shift box into view if choosing.
    if (mouseY > height * 0.2 + canvasSize) {
        mouseCol = spectrum.get((mouseX/width)*590, ((mouseY-(height*0.2+canvasSize)) / (height*0.8-canvasSize))*590);
        colComparisonX = lerp(colComparisonX, 1, 0.1);
    }
    else{
        colComparisonX = lerp(colComparisonX, 0, 0.1);
    }

    // Get mouse coords for draw:
    if (mouseX > width * 0.1 && mouseX < width * 0.1 + canvasSize) {
        if (mouseY > height * 0.1 && mouseY < height * 0.1 + canvasSize) {
            eX = Math.floor( ((mouseX - width*0.1)) / cellSize);
            eY = Math.floor( ((mouseY - height*0.1)) / cellSize);
            // Fill?
            if (!spaceHeld) {
                fX = eX;
                fY = eY;
            }
            // Draw on layer?
            if (mouseIsPressed) {
                layers[editLayer].fill(col);
                layers[editLayer].rect(eX*(256/gridSize), eY*(256/gridSize), eX*256/gridSize+256/gridSize, eY*256/gridSize+256/gridSize);
                
                if (spaceHeld) {
                    layers[editLayer].rectMode(CORNERS);
                    layers[editLayer].rect(eX*(256/gridSize), eY*(256/gridSize), fX*(256/gridSize), fY*(256/gridSize));
                    layers[editLayer].rectMode(CORNER);
                }
            }
        }
    }

    // Begin draw:
    background(200);
    fill(160,160,200);
    rect(0, 0, width, height * 0.08);
    fill(255);
    text("VOX by JACKO", (width / 2) + sin(frameCount/99)*9, height * 0.02);
    text("CTRL:EYEDROP || SHIFT:ERASE || SPACE:FILL || W/S:LAYER || A/D:SIZE", width / 2, height * 0.05);
    text("GRID:"+gridSize, width*0.05, height*0.05+canvasSize*1.2);

    // Colour under mouse:
    stroke(1);
    fill(mouseCol);
    rect(width * 0.02 + width*0.02*colComparisonX, height * 0.2, width * 0.015, height * 0.2);

    // Current colour
    fill(col);
    rect(width * 0.02, height * 0.2, width * 0.015, height * 0.2);
    noStroke();
    
    // Draw layer and scale to size. Source based on initial res.
    image(layers[editLayer], width * 0.1, height * 0.1, canvasSize, canvasSize);

    // Draw overlay:
    stroke(0);
    noFill();
    cellSize = canvasSize/gridSize;
    for (let ox = 0; ox < gridSize; ox++) {
        for (let oy = 0; oy < gridSize; oy++) {
            rect(width*0.1 + ox*cellSize, height * 0.1 + oy*cellSize, cellSize, cellSize);
        }
    }
    noStroke();
    fill(255, 50*sin(frameCount)+200);
    // Mouse pos overlay:
    rect(width*0.1 + eX*cellSize, height * 0.1 + eY*cellSize, cellSize, cellSize);

    // Colour overlay:
    image(spectrum, 0, height * 0.2 + canvasSize, width, (height*0.8) - canvasSize);

    // And layer marker bar (dots in middle):
    for (let i=0; i < 16; i++) {
        if (i==editLayer) { fill(0); } else { fill(180); }
        rect(width*0.52, height*0.15+canvasSize*(i/16), width*0.01, canvasSize/32);
    }

    // Draw final model from layers:
    fill(255);
    rect(width * 0.55, height * 0.1, canvasSize, canvasSize + height*0.05);
    imageMode(CENTER);
    push();
    translate(width*0.55 + canvasSize/2, height*0.1 + canvasSize*0.72);
    rotate(frameCount/60);
    for (let i = 15; i >= 0; i--) {
        rotate(-frameCount/60);
        translate(0, canvasSize*-0.021);
        rotate(frameCount/60);
        image(layers[i], 0, 0, canvasSize/2, canvasSize/2);
    }
    pop();
    imageMode(CORNER);
}