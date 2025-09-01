// MagicEye (p5.js)
// Jackitron.github.io
// A simple WEBGL game that simulates 3D perspective
// Using multiple horizontal drawing regions/viewports with parallax

// The play area is duplicated 4 times, each one with parallax.
	// Unlike the original, this is done with 4 framebuffers
	// To allow for some 3D 
// Tutorial: look through and unfocus your eyes until you see 5 play areas.

// Graphics buffer that acts as the texture for the boxes of the wall
// Usually a checkerboard to keep things simple
var boxTex;

// And font (required for WebGL)
var font;

// Extra win size vars besides the p5 built=ins
var quarterWidth;

// Framebuffer array for the 4 parallax viewports.
// Handles the 3D side of things!
var viewports = [];

// Background values (gradient is made up of multiple rects, or swatches)
var bgTargetSwatchSize; //windowHeight/24
// This, if less than swatchSize, will only partially draw each swatch 
var bgSwatchSize = 0;

// Current two colours of the walls
var wallFG;
var wallBG;

// horizontally looping Player X
var playerX;
// constrained Player Y so no cheating
var playerY;

// Game mode
const MODE_STARTUP = 0;
const MODE_TUTORIAL = 1;
const MODE_GAME = 2;
const MODE_END = 3;
var gameMode = MODE_STARTUP;

// Used in tutorial
var atLeastOneTutorialCubeOscillation = false;

// Level and walls to cross this level
var level = 0; //incremented to one on first run
var wallsToPass = 4;

// current z position (size) of wall
// -1000 is far away, 0 is real size
// where z crosses 0, that's when collision detection happens.
// Anything larger and it starts to fade.
var wallZ = 10;
var wallStartZ = -7200;
var wallEndZ = 100;

// Stereo seperation for walls
var wallParallaxFactor = 2;

// Fade in the tutorial screen
var tutorialHiderAlpha = 255;

// These values are lerped between!
// This is the seperation at the minimum Z
var farParallaxes = [-28, -14, 14, 28];
var nearParallaxes = [28, 14, -14, -28];
var textParallaxes = [10, 10, -10, -10];
// And the z values used for the wall
var cameraNearZ = 0;
var cameraFarZ = -3600;

// An array of 14 tiled "boxes" (stacks of planes for now)
// These are typically arranged into 3x5 "walls" in a missing tile slide puzzle formation.
// 00 01 02
// 03 04 05
// 06 07 08
// 09 10 11
// 12 13 --
// the z component is not used here. All walls move out of the screen in unison.
boxes = [1,1,1, 1,1,1, 1,0,1, 1,1,1, 1,1,1];

// A particle emitter is also used to enhance illusion of depth
const PARTICLE_AMT = 96;

function preload() {
	font = loadFont('./UnispaceIT.otf');
}

function setup() {
	createCanvas(windowWidth, windowHeight, WEBGL);
	textFont(font);
	textAlign(LEFT, CENTER);
	
	// Easier to call this than copy lines!
	windowResized();
	
	// 128x texture is quite adequate!
	// Each box should not be bigger than 160px/12th of the screen (3 boxes to each of the 4 quarter viewports)
	boxTex = createGraphics(128,128);
	
	// You won't see this in the tutorial yet.
	NextLevel();
}

// Mandatory at this point
function windowResized() {
	resizeCanvas(windowWidth, windowHeight);
	quarterWidth = windowWidth / 4;
	bgTargetSwatchSize = windowHeight/24;
	
	// 3D buffers, hopefully each with its own camera system and depth.
	options = { width: quarterWidth, height: windowHeight };

	for (let i = 0; i < 4; i++) {
		viewports[i] = createFramebuffer(options);
	}
	textSize(width/50);
}

function draw() {
	translate(windowWidth/-2, windowHeight/-2);
	RenderBG();
	// Add in some vingette to make it obvious where focus is
	//fill(120,100);
	//rect(quarterWidth, 0, 10, height);
	//rect(quarterWidth*3-10, 0, 10, height);
	
	if (gameMode == MODE_STARTUP) {
		cursor();
	}
	else if (mouseY < height*0.25 && mouseY > height * 0.75) {
		cursor();
	}
	// Hide mouse when in play
	else {
		noCursor();
	}
	
	switch (gameMode) {
		case MODE_STARTUP:
			RenderStartup();
			break;
		case MODE_TUTORIAL:
			RenderTutorial();
			break;
		case MODE_GAME:
			RenderGame();
			break;
		case MODE_END:
			RenderEnd();
			break;
	}
}

// Simple screen to capture mouse focus and
function RenderStartup() {
	noStroke();
	fill(0, 255);
	rect(0,0,width,height);
	stroke(120);
	fill(255);
	for (let sx = 0; sx < windowWidth; sx += quarterWidth) {
		line(sx,0,sx,height);
		circle(sx + quarterWidth/2, height * 0.5, 10);
	}
	DrawString("  Jacko's",0.05);
	DrawString("  MagicEye",0.1);
	DrawString("LOOK THROUGH",0.2);
	DrawString("THE DISPLAY;",0.25);
	DrawString(" MAKE FOUR",0.3);
	DrawString("DOTS BECOME",0.35);
	DrawString("FIVE....",0.4);
	
	DrawString("You may need",0.6);
	DrawString(" to adjust",0.65);
	DrawString(" your window",0.7);
	DrawString(" width....",0.75);
	
	DrawString(" CLICK TO",0.85);
	DrawString("   BEGIN",0.9);
	
	// Start game/tutorial
	if (mouseIsPressed) {
		gameMode = MODE_TUTORIAL;
	}
}

function RenderTutorial() {
	// In final build, this should be replaced by:
	bgSwatchSize = bgTargetSwatchSize;
	
	// Animate tutorial cube
	let zNormal = sin(frameCount/50);
	let zUnit = (zNormal + 1) / 2; // -1 to 1 becomes 0 to 1
	let tutorialCubeZ = lerp(cameraFarZ, cameraNearZ, zUnit);
	
	// Prevents user going straight into game without reading tutorial
	// (if mosue was in the right place on frame 1 etc)
	if (zUnit < 0.001) {
		atLeastOneTutorialCubeOscillation = true;
	}
	
	// Draw a cube moving through the Z axis
	for (let i = 0; i < 4; i++) {
		viewports[i].begin();
		clear();
		lights();
		directionalLight(color(255), createVector(0,0.25,-1));
		// Draw mouse ball (in game this is drawn after boxes, but we need transparency!)
		ViewportDrawPlayer(i);
		// Draw cube
		let parallax = lerp(farParallaxes[i], nearParallaxes[i], zUnit);
		push();
		translate(parallax, 0, tutorialCubeZ);
		rotateX(frameCount/60);
		rotateY(frameCount/60);
		//texture(boxTex);
		stroke(wallBG);
		fill(0,0,200, 32);
		box(quarterWidth/3);
		pop();
		viewports[i].end();
		// Then send this viewport to the screen! (Restrict drawing to each quarter region)
		image(viewports[i], quarterWidth * i, 0,  quarterWidth, windowHeight);
	}
	
	// target
	let ballRadius = quarterWidth/8;
	
	// And switch to game mode when touching!
	if (tutorialCubeZ > cameraNearZ - 2 && atLeastOneTutorialCubeOscillation) {
		console.log(playerX+" y"+playerY);
		console.log(quarterWidth/2-ballRadius);
		if (playerX > quarterWidth/2-ballRadius && playerX < quarterWidth/2+ballRadius*2) {
			if (playerY > height/2-ballRadius && playerY < height/2+ballRadius*2) {
				gameMode = MODE_GAME;
			}
		}
	}
	
	DrawString("You must get",0.1);
	DrawString("the red ball ",0.15);
	DrawString("past walls! ",0.2);
	
	DrawString(" Touch the",0.8);
	DrawString("box to start",0.85);
	
	// Fade in the tutorial screen!
	if (tutorialHiderAlpha > 0) {
		fill(0, tutorialHiderAlpha);
		rect(0,0,width,height);
		tutorialHiderAlpha--;
	}
}

function RenderGame() {
	// And increment for next time
	bgSwatchSize = lerp(bgSwatchSize+0.05, bgTargetSwatchSize, 0.03);
	DrawViewports();
	
	// Set and reset wallZ
	if (wallZ > cameraNearZ - 1) {
		wallZ = wallStartZ;
		NextLevel();//remove this
	}
	wallZ = lerp(wallZ, cameraNearZ, 0.01);
}

// Game mode Framebuffer activities
function DrawViewports() {
	let parallax = -1.5; //-1.5, -0.5, 0.5, 1.5
	
	for (let i = 0; i < 4; i++) {
		viewports[i].begin();
		clear();
		lights();
		directionalLight(color(255), createVector(0,0.25,-1));
		ViewportDrawWall(i);
		
		// And player ball
		ViewportDrawPlayer(i);
		viewports[i].end();
		parallax++;
		
		// Then send this viewport to the screen! (Restrict drawing to each quarter region)
		image(viewports[i], quarterWidth * i, 0,  quarterWidth, windowHeight);
	}
}


// Draw the entire wall (within a render context)
// Do not use this function unless <framebuffer>.begin() has been called!
function ViewportDrawWall(idx) {
	let alphaMod = 255;
	let boxSize = quarterWidth/3;
	
	texture(boxTex);
	tint(255, alphaMod);
	stroke(wallBG);

	// Proximity fade and distance fade, ramped up for better lerping in.
	//if (wallZ < -15) alphaMod = 127;//min(1150f + z*56, 255);
	//else if (wallZ > 17) alphaMod = 255;//max(255 - (z-17)*64, 0);
	let wallZUnitVec = wallZ / -wallStartZ;
	
	let parallax = lerp(farParallaxes[idx], nearParallaxes[idx], wallZUnitVec);
  
	let arrInd = 0;
	// Unit coords, not array indicies (although we can do that)
	for (let py = -2; py <= 2; py++) {
		for (let px = -1; px <= 1; px++) {
			// Only draw if no gap there
			if (boxes[arrInd] == 1) {
				push();
				translate(parallax + px * boxSize, py * boxSize, wallZ);
				box(quarterWidth/3);
				pop();
			} 
			arrInd++;
		}
	}
}

// Mouse controls (within a render context)
// Do not use this function unless <framebuffer>.begin() has been called!
function ViewportDrawPlayer(idx) {
	// Make mouse appear to repeat across each viewport (in case user gets lost)
	playerX = mouseX % quarterWidth;
	// Stop! Player can't just go over/under the walls!
    playerY = round(constrain(mouseY, height*0.2, height*0.8));
	
	fill(255,0,0);
	stroke(200,0,0);
	push();
	translate(quarterWidth/-2, windowHeight/-2);
	translate(playerX + nearParallaxes[idx], playerY);
	rotateX(frameCount/60);
	rotateY(frameCount/60);
	sphere(quarterWidth/9, 8, 8);
	pop();
	//circle(playerX + (quarterWidth * idx), playerY, quarterWidth/30);
}


// Depending on level, draw non-framebuffer background
// Background also has a timeout feature, to allow a user to be counted into the game
// Usually 3 seconds
function RenderBG() {
	// Start with black
	noStroke();
	background(0);
	// viewports
	for (let quarterStartX = 0; quarterStartX < windowWidth; quarterStartX += quarterWidth) {
		// Gradient made downawards from 24 'colour swatches'
		for (let h = 0; h < windowHeight; h += bgTargetSwatchSize) {
			switch (level % 6) {
				case 1:
					fill(200, round(lerp(245, 215, h/windowHeight)), round(lerp(200, 255, h/windowHeight)) );
					break;
				case 2:
					fill(round(lerp(255, 180, h/windowHeight)), round(lerp(255, 180, h/windowHeight)), round(lerp(185, 220, h/windowHeight)));
					break;
				case 3:
					fill(round(lerp(255, 180, h/windowHeight)), 255, round(lerp(200, 255, h/windowHeight)) );
					break;
				case 4:
					fill(255, 200, round(lerp(100, 255, h/windowHeight)) );
					break;
				case 5:
					fill( round(lerp(170, 200, h/windowHeight)), round(lerp(140, 240, h/windowHeight)), round(lerp(255, 160, h/windowHeight)) );
					break;
				case 0: // (end of modulus)
					fill( round(lerp(240, 230, h/windowHeight)) , 230, round(lerp(100, 230, h/windowHeight)) );
					break;
			}
			rect(quarterStartX, h, round(quarterWidth-1), bgSwatchSize)
		}
	}
}

// render some text (do this last, to be above everything else)
// To all viewports of course (no parallax)
function DrawString(st, y) {
	let chs = st.split('');
	// make letters oscillate along in a mexican wave thing
	let crawlY;
	let spacer = width/55;
	let letterX = spacer;
	let q = 0;
	for (let i = 0; i < chs.length; i++)
	{
		crawlY = round(sin(i/2 + frameCount/8));
		q = 0;
		for (let qx = 0; qx < width; qx += quarterWidth) {
			letterX = textParallaxes[q] + spacer + qx;
			q++;
			fill(60,60,120);
			text(chs[i], letterX + -1 + (i * spacer), (height*y) + crawlY);
			//fill(120,60,60);
			text(chs[i], letterX + 1 + (i * spacer), 1 + (height*y) + crawlY);
			fill(255);
			text(chs[i], letterX + (i * spacer), (height*y) + crawlY);
		}
	}
}


// Increment level!
function NextLevel() {
	level++;
	console.log(level);
	
	// Remake the box textures
	let texSquareSizeNormalised = 0.25; //4
	
	if (level % 12 > 6) {
		texSquareSizeNormalised = 0.125;
	}
	
	wallFG = color(120,120,120);
	wallBG = color(0,0,0);
	switch (level % 6) {
		case 1:
			wallFG = color(60,180,10);
			wallBG = color(30,100,30);
			break;
		case 2:
			
			break;
		case 3:
			
			break;
		case 4:
			
			break;
		case 5:
			
			break;
		case 0: // (end of modulus)
			// Already defined above!
			break;
	}
	
	boxTex.background(wallBG);
	boxTex.noStroke();
	boxTex.fill(wallFG);
	
	let colourToggle = 0;
	// Classic "zebra problem" black on white, white on black
	// don't bother drawing A,B,A,B, just fill A then draw B.
	for (let cy = 0; cy < 1; cy += texSquareSizeNormalised) {
		for (let cx = 0; cx < 1; cx += texSquareSizeNormalised) {
			if (colourToggle % 2) boxTex.rect(cx*128, cy*128, texSquareSizeNormalised*128, texSquareSizeNormalised*128);
			colourToggle++;
		}
		colourToggle++;
	}
	// And finally...
	SetRandomGapInWall();
}

// Called each new level
function SetRandomGapInWall() {
	boxes = [1,1,1, 1,1,1, 1,1,1, 1,1,1, 1,1,1];
	//boxes = [0,0,0, 1,0,0, 0,0,0, 0,0,0, 0,1,0];
	let i = round(random(15));
	boxes[i] = 0;
}

