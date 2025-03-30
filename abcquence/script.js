// ABCquence source
// Adapted from jacko's seq (my replit page)

// Master frequency table (A3 to B5) - accurate to 1 hz.
var mfreq = [0, 220, 233, 247, 262, 277, 294, 311, 330, 349, 370, 392, 415, 440, 466, 494, 523, 554, 587, 622, 659, 698, 740, 784, 831, 880, 932, 988];

// Song array - relates to indexes of master frequency table.
var notes = [11, 15, 18, 23];

// Play export tab grows/changes colour:
var tabHeight = 0.1;
var playFill = 0;
var copyFill = 0;

// Change from play to stop?
var playText = "Play ►";

// Note table scroll. 0 = Scrolled to top, 1 = scrolled to bottom.
var scroll = 1.0;
// Scroll target for smooth lerping
var scrollTarget = 0.0;

// Ambient occlusion on UI?
var occlude;

// And sound generator
var mono;
var playing = false;
var playInd = 0;
// 5 ticks * 0.05s = 0.25s
var maxDelay = 5;
// Starts at 5, then becomes noteDelay after hitting 0.
var noteDelay = 0;

// Top bar button labels. Changes between these when playing or stopped
var sizingTimingLabels = ['<<<','<<','>>','>>>']
const sizingLabels = ['<<<','<<','>>','>>>']
const timingLabels = ['---','--','++','+++']

// 25ms "tick" - allows tempos from ~60 to ~200
setInterval(songTick, 25);

// If parameters found, populate!
var params = new URLSearchParams(document.location.search)
var paramSeq = params.get("seq");
if (paramSeq != null) {
    // Get freq from note, push to sequence.
    notes = [];
    paramSeq.split("").forEach( letter => notes.push("-abcdefghijklmnopqrstuvwxyz".indexOf(letter)) );
}

// Load images for shadows first
function preload() {
    // Ambient occlusion image (256, 0) preserves aspect
    occludeTop = loadImage("top.png");
    occludeSide = loadImage("side.png");
}

// Setup interface and document.
function setup() {
    noStroke();
    smooth(1);
    textFont('monospace');
    createCanvas(windowWidth, windowHeight);
    textAlign(CENTER, CENTER);
    imageMode(CORNER);
    // Force scale elements:
    windowResized();

    // Colours:
    vanilla = color("#ffe7a9");
    orange = color("#ffbf6e");
    yellow = color("#ffce6e");
    peach = color("#e5942e");
    gold = color("#ffb31c");
    lime = color("#d0ff6b");
	green = color("#92d0a2");
    lilac = color("#e0a1ff");
    cyan = color("#a8efff");
    blossom = color("#ffbdc2");
    cherry = color("#ff7171");
	
	// And assignable colours used in top bar
	songLenBarColor = gold
	songLenBtnColor = peach

    // Sound:
    mono = new p5.Oscillator("tri");
    mono.start();
}

// Resize document on window size.
function windowResized() {
    // Reset drawing canvas and UI:
    resizeCanvas(windowWidth, windowHeight);
    if (windowWidth > windowHeight) { textSize(windowHeight / 15); }
    else { textSize(windowWidth / 15); }
}

// Scroll a little?
function mouseWheel(event) {
    if (document.hasFocus()) {
        scrollTarget += event.delta / (1000 + notes.length * 50);
    }
    else {
        scrollTarget += event.delta / (1000 + notes.length * 25);
    }
    scrollTarget = constrain(scrollTarget, 0, 1);
}

// Play or stop 
function StopSeq() {
	// Stop sound gen
	mono.amp(0, 0.01);
	// Revert UI
	playText = "Play ►";
	playing = false;
	songLenBarColor = gold;
	songLenBtnColor = peach;
	sizingTimingLabels = sizingLabels;
}

function PlaySeq() {
	playText = "Stop ■";
	playing = true;
	playInd = 0;
	// Green UI!
	songLenBarColor = lime;
	songLenBtnColor = green;
	sizingTimingLabels = timingLabels;
}

// Handle press logic for buttons:
function mouseClicked() {
    // Start sound if not already:
    userStartAudio();

    if (mouseY < height * 0.1) {
        // Large Less
        if (mouseX > 0 && mouseX < width * 0.25) {
            if (playing) {
                maxDelay = constrain(maxDelay + 5, 1, 20);
            }
            else if (notes.length > 4) {
                notes.pop();
                notes.pop();
                notes.pop();
                notes.pop();
                playInd = 0;
            }
        }

        // Less
        if (mouseX > width * 0.25 && mouseX < width * 0.4) {
            if (playing) {
                maxDelay = constrain(maxDelay + 1, 1, 20);
            }
            else if (notes.length > 1) {
                notes.pop();
                playInd = 0;
            }
        }

        // More
        if (mouseX > width * 0.6 && mouseX < width * 0.75) {
            if (playing) {
                maxDelay = constrain(maxDelay - 1, 1, 20);
            }
            else if (notes.length < 96) {
                notes.push(0);
            }
        }

        // Large More
        if (mouseX > width * 0.75 && mouseX < width) {
            if (playing) {
                maxDelay = constrain(maxDelay - 5, 1, 20);
            }
            else if (notes.length < 96) {
                notes.push(0);
                notes.push(0);
                notes.push(0);
                notes.push(0);
            }
        }
    }
    if (mouseY > height * 0.1 && mouseY < height * (tabHeight + 0.1)) {
        // Export using copy button
        if (mouseX > width * 0.45 && mouseX < width * 0.9) {
            // Stop playing and open new tab/document
            StopSeq();
            var seqText = "";
            for (let n = 0; n < notes.length; n++) {
                seqText += "-abcdefghijklmnopqrstuvwxyz".substring(notes[n], notes[n] + 1);
            }
            var shareTab = window.open("");
            shareTab.document.write("<p style='font-family: sans-serif; font-size:24pt'>Space '-' is a rest, a-z match A3-B5</p>");
            shareTab.document.write("<p style=\"font-family: sans-serif; font-size:36pt\">" + seqText +"</p>");
            seqText = "https://jackitron.github.io/abcquence?seq=" + seqText;
            shareTab.document.write("<a style=\"font-family: sans-serif; font-size:24pt\" href=\"" + seqText + "\">"+seqText+"</a>");
        }

        // Show examples screen while mouse held?

        // Play/stop?
        else if (mouseX < width * 0.45) {
            if (playing) {
				StopSeq();
            }
            else {
				PlaySeq();
            }
        }
    }
}

// Every tick may advance song depending on tempo:
function songTick() {
    if (playing) {
        // Decrease timeout until delay is reached.
        if (noteDelay > 0) {
            // Wait...
            noteDelay--;
        } else {
            // New note!
            noteDelay = maxDelay;
            playInd++;
            if (playInd == notes.length) { playInd = 0; }
            // Play:
            mono.amp(0.5);
            mono.freq(mfreq[notes[playInd]]);
        }
    }
}

function draw() {
    background(vanilla);

    // Reduce power on mobile?
    if (document.hasFocus()) {
        frameRate(60);
    }
    else {
        frameRate(30);
    }

    // Play logic moved to tick function.

    // For every row:
    for (let n = 0; n < notes.length; n++) {
        let offset = height * 0.18 - (scroll * height * 0.099 * notes.length);
        let yloc = offset + n * height * 0.1;
        // Update/draw if on screen:
        if (yloc > 0 && yloc < height) {
            // If mouse down, move in increments of 36 notes, 0=rest
            if (mouseIsPressed && mouseY > height * (tabHeight + 0.1)) {
                if (mouseY > yloc && mouseY < yloc + height * 0.1) {
                    if (mouseX > width * 0.16 && mouseX < width * 0.72) {
                        // Set freq refrence accordingly
                        notes[n] = round(((mouseX - width * 0.16) / (width * 0.55)) * 26);
						
                        // And ring current tone:
                        if (!playing) {
                            mono.freq(mfreq[notes[n]]);
                            mono.amp(0.5, 0.01);
                        }
                    }
                }
            }
            else {
                if (!playing) { mono.amp(0, 0.01); }
            }
            // Note row and index
			stroke(200);
			strokeWeight(1);
            fill(255);
			noStroke();
            if (playing && playInd == n) { fill(90); }
            rect(width * 0.03, yloc, width * 0.8, height * 0.08);
            fill(200);
            text(n, width * 0.1, yloc + height * 0.04);
            // Note Bar
            fill(blossom);
            rect(width * 0.16, yloc + height * 0.015, width * 0.55, height * 0.055);
            fill(cherry);
            rect(width * 0.16, yloc + height * 0.015, notes[n] / 26 * width * 0.55, height * 0.055);
            text(notes[n], width * 0.77, yloc + height * 0.04);
        }
    }

    // Scrollbar with occlusion:
    fill(songLenBarColor);
    rect(width * 0.9, height * 0.1, width * 0.1, height);
    image(occludeSide, width * 0.8, height * 0.1, width * 0.1, height * 0.9);
    // Drag handle:
    fill(songLenBtnColor);
    rect(width * 0.925, height * (0.1 + scroll * 0.7), width * 0.05, height * 0.2);

    // Update scrollbar:
    if (mouseIsPressed && mouseY > height * 0.1 && mouseX > width * 0.9) {
        scrollTarget = (mouseY - height * 0.2) / (height * 0.7);
        scrollTarget = constrain(scrollTarget, 0, 1);
    }
    scroll = lerp(scroll, scrollTarget, 0.2);

    // Buttons grow when hovered, and change colour.
    if (mouseY > height * 0.1 && mouseY < height * (tabHeight + 0.1)) {
        tabHeight = lerp(tabHeight, 0.08, 0.15);

        // Play (loop sequence)
        if (mouseX < width * 0.4) {
            playFill = lerp(playFill, 0, 0.1);
            copyFill = lerp(copyFill, 200, 0.1);
        }
        // Copy (open in new tab)
        else if (mouseX > width * 0.4 && mouseX < width * 0.9) {
            playFill = lerp(playFill, 200, 0.1);
            copyFill = lerp(copyFill, 0, 0.1);
        }
    }
    else {
        tabHeight = lerp(tabHeight, 0.04, 0.15);
        playFill = lerp(playFill, 200, 0.1);
        copyFill = lerp(copyFill, 200, 0.1);
    }
    // Play
    fill(lime);
	if (playing) { fill(lilac); }
    rect(0, height * 0.1, width * 0.45, height * tabHeight);
    fill(playFill);
    text(playText, width * 0.225, height * (tabHeight + 0.06));
    // Copy
    fill(cyan);
    rect(width * 0.45, height * 0.1, width * 0.45, height * tabHeight);
    fill(copyFill);
    text("Share ♫", width * 0.675, height * (tabHeight + 0.06));
    // And occlude:
    image(occludeTop, 0, height * (tabHeight + 0.1), width * 0.9, height * 0.1);


    // Top bar with occlusion:
    fill(songLenBarColor);
    rect(0, 0, width, height * 0.1);
    image(occludeTop, 0, height * 0.1, width, height * 0.05);
    fill(0);

    // Large Less button:
    fill(songLenBtnColor);
    if (mouseY < height * 0.1) {
        if (mouseX > 0 && mouseX < width * 0.25) {
			fill(255);
			if (mouseIsPressed) fill(songLenBtnColor);
        }
    }
    rect(width * 0.01, height * 0.01, width * 0.23, height * 0.08);
    fill(0);
    text(sizingTimingLabels[0], width * 0.15, height * 0.05);

    // Small less button:
    fill(songLenBtnColor);
    if (mouseY < height * 0.1) {
        if (mouseX > width * 0.25 && mouseX < width * 0.4) {
			fill(255);
			if (mouseIsPressed) fill(songLenBtnColor);
        }
    }
    rect(width * 0.26, height * 0.01, width * 0.13, height * 0.08);
    fill(0);
    text(sizingTimingLabels[1], width * 0.325, height * 0.05);



    // If playing, use top bar for song speed.
    if (playing) {
        // Playspeed (ticks):
        text(str(round(0.025 * maxDelay * 100) / 100) + "s", width * 0.5, height * 0.05);
    }
    else {
        // Song size:
        text(notes.length, width * 0.5, height * 0.05);
    }



    // Small More button:
    fill(songLenBtnColor);
    if (mouseY < height * 0.1) {
        if (mouseX > width * 0.6 && mouseX < width * 0.75) {
			fill(255);
			if (mouseIsPressed) fill(songLenBtnColor);
        }
    }
    rect(width * 0.6, height * 0.01, width * 0.13, height * 0.08);
    fill(0);
    text(sizingTimingLabels[2], width * 0.66, height * 0.05);

    // Large More button:
    fill(songLenBtnColor);
    if (mouseY < height * 0.1) {
        if (mouseX > width * 0.75 && mouseX < width) {
			fill(255);
			if (mouseIsPressed) fill(songLenBtnColor);
        }
    }
    rect(width * 0.75, height * 0.01, width * 0.23, height * 0.08);
    fill(0);
    text(sizingTimingLabels[3], width * 0.85, height * 0.05);

    fill(0);
}