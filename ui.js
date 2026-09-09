import { logError, vec3, Quad, loadImage } from "./utils.js";

export class UiController {

    constructor(main) {

        this.main = main;

        this.activeScreen = undefined

        this.screens = []

        this.createScreens();

        this.inputMode = "mouse";

        this.mouse = {
            x: 0,
            y: 0,
            down: false
        }



        const gameWindow = document.getElementById("gameCanvas");

        gameWindow.addEventListener("mousemove", (event) => { this.mouseMove(event) });
        gameWindow.addEventListener("mouseenter", (event) => { this.mouseMove(event) });
        gameWindow.addEventListener("mouseleave", (event) => { this.mouseMove(event); this.mouseUp(event); });

        gameWindow.addEventListener("mousedown", (event) => { this.mouseDown(event); });
        gameWindow.addEventListener("mouseup", (event) => { this.mouseUp(event); });

        document.addEventListener("keydown", (event) => { this.keyDown(event); });

    }

    keyDown(event) {
        
        if (event.code === "Escape" && this.activeScreen.backAction != undefined) {
            this.activeScreen.backAction();
        }

        this.inputMode = "keyboard";

        let selectedElement = undefined;
        for (const e of this.activeScreen.elements) {
            if (!e.selected) continue;
            selectedElement = e;
            break;
        }

        if (selectedElement === undefined) {
            for (const e of this.activeScreen.elements) {
                if (e.type == "none") continue;
                e.selected = true;
                return;
            }
            return;
        }

        const direction = {
            "KeyW": "up",
            "KeyS": "down",
            "KeyA": "left",
            "KeyD": "right"
        }[event.code];

        if (direction != undefined && selectedElement.nextElement[direction] != undefined) {
            selectedElement.nextElement[direction].selected = true;
            selectedElement.selected = false;
        }

        const pressButton = event.code === "Enter" || event.code === "Space";
        if (pressButton && selectedElement.action != undefined) {
            selectedElement.action();
            this.keyDown({code: undefined});
        }



    }

    mouseMove(event) {
        this.mouse.x = event.offsetX;
        this.mouse.y = event.offsetY;
    }

    mouseDown(event) { this.mouse.down = true; this.mouse.isFirstEvent = true; }

    mouseUp(event) { this.mouse.down = false; this.mouse.isFirstEvent = false; }


    createScreens() {

        // define screens
        const mainMenuScreen = new UiScreen(this, "Main Menu");
        const settingsScreen = new UiScreen(this, "Settings");
        const pauseMenuScreen = new UiScreen(this, "Pause Menu");
        const gameScreen = new UiScreen(this, "Game");

        this.activeScreen = mainMenuScreen

        // main menu
            const mainMenuTitle = new UiElement(mainMenuScreen, "Game Name", 3,0, 6,1);

            const startGameButton = new UiButton(mainMenuScreen, "Start Game", 1,2, 6,1);
            startGameButton.action = () => { this.activeScreen = gameScreen; }

            const settingsButton = new UiButton(mainMenuScreen, "Settings", 1,4, 6,1);
            settingsButton.action = () => { this.activeScreen = settingsScreen; }

            const exitButton = new UiButton(mainMenuScreen, "Exit", 1,6, 6,1);
            exitButton.action = () => { close(); }


            startGameButton.nextElement = {
                down: settingsButton
            };

            settingsButton.nextElement = {
                up: startGameButton,
                down: exitButton
            };

            exitButton.nextElement = {
                up: settingsButton
            };


            mainMenuScreen.backAction = () => { close(); }

        // settings menu
            const settingsTitle = new UiElement(settingsScreen, "Settings", 3,0, 6,1);


            const dithering = new UiButton(settingsScreen, "Dithering on", 1,2, 6,1);
            dithering.action = () => {
                this.main.settings.dithering = !this.main.settings.dithering;
                dithering.text = `Dithering ${this.main.settings.dithering ? "on" : "off"}`;
            }

            const colourScheme = new UiButton(settingsScreen, "Colour 0", 1,4, 6,1);
            colourScheme.action = () => {
                this.main.settings.colourScheme = (this.main.settings.colourScheme + 1) % 4;
                colourScheme.text = `Colour ${this.main.settings.colourScheme}`;
            }




            const backButton = new UiButton(settingsScreen, "Back", 8,8, 4,1);
            backButton.action = () => { this.activeScreen = mainMenuScreen; }



            dithering.nextElement = {
                down: colourScheme,
                right: backButton,
            }

            colourScheme.nextElement = {
                up: dithering,
                right: backButton,
                down: backButton,
            }

            backButton.nextElement = {
                up: colourScheme,
                left: dithering,
            }




            settingsScreen.backAction = () => { this.activeScreen = mainMenuScreen; }

        // pause menu
            const pauseTitle = new UiElement(pauseMenuScreen, "Game Paused", 3,0, 6,1);

            const resumeButton = new UiButton(pauseMenuScreen, "Resume", 4,2, 4,2);
            resumeButton.action = () => { this.activeScreen = gameScreen; }



            pauseMenuScreen.backAction = () => { this.activeScreen = gameScreen; }

        // game screen
            const healthBar = new UiElement(gameScreen, "Health", 0.3,0.3, 4,1);


            gameScreen.backAction = () => { this.activeScreen = pauseMenuScreen; }
    
    }

    tick() {

        this.inputMode = this.activeScreen.tick(this.mouse, this.keyboard, this.inputMode);

    }

    draw(ctx) {

        this.activeScreen.draw(ctx);

    }

}

class UiScreen {

    constructor(parent, name, gridSize = 32) {

        parent.screens.push(this);

        this.elements = []
        this.gridSize = gridSize;

        this.backAction = undefined;

        this.name = name

    }

    draw(ctx) {

        for (const e of this.elements) {
            e.draw(ctx, this.gridSize);
        }
    }

    getElement(x, y) {

        x = Math.floor(x / this.gridSize);
        y = Math.floor(y / this.gridSize);

        const hovered = [];

        for (const e of this.elements) {
            if (x >= e.x &&
                x < e.x + e.width &&
                y >= e.y &&
                y < e.y + e.height
            ) {
                hovered.push(e)
            }
        }

        return hovered;

    }

    tick(mouse, keyboard, inputMode) {

        const hovered = this.getElement(mouse.x, mouse.y)
        if (hovered.length === 0) mouse.isFirstEvent = false;

        if (inputMode === "keyboard" && hovered.length > 0) {
            inputMode = "mouse";
            for (const e of this.elements) {
                e.selected = false;
                e.hovered = false;
            }
        }

        for (const e of this.elements) {

            if (hovered.includes(e)) {
                e.hovered = true;
                if (mouse.down && mouse.isFirstEvent) e.selected = true;
                if (e.selected && !mouse.down) {
                    if (e.action != undefined) e.action();
                    mouse.isFirstEvent = false;
                    e.hovered = false;
                    e.selected = false;
                }
            }
            else if (inputMode === "mouse") {
                e.hovered = false;
                e.selected = false;
            }

        }

        return inputMode;
    }

}

class UiElement {

    constructor(parent, text, x, y, width, height) {
        
        parent.elements.push(this);

        this.text = text;

        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        
        this.hovered = false;
        this.selected = false;

        this.action = undefined;

        this.type = "none";

        this.nextElement = {
            up: undefined,
            down: undefined,
            left: undefined,
            right: undefined
        }

        this.action = undefined;

        this.borderWidth = 2;
        this.borderBrightness = 0;

        this.backgroundBrightness = 0;

        this.textSize = 1.0;
        this.textBrightness = 1.0;



    } 

    draw(ctx, gridSize) {

        const borderWidth = this.borderWidth 
            * ((this.selected && this.type != "none") ? 2 : 1) 
            * ((this.hovered && this.type != "none") ? 2 : 1);
        const borderBrightness = this.borderBrightness;
        
        const backgroundBrightness = this.backgroundBrightness 
            * ((this.hovered && this.type != "none") ? 2 : 1);

        const textSize = this.textSize;
        const textBrightness = this.textBrightness;

        const x = this.x * gridSize;
        const y = this.y * gridSize;
        const width = this.width * gridSize;
        const height = this.height * gridSize;


        const borderColor =     `rgba(${borderBrightness * 255},        ${borderBrightness * 255},      ${borderBrightness * 255},      1)`;
        const backgroundColor = `rgba(${backgroundBrightness * 255},    ${backgroundBrightness * 255},  ${backgroundBrightness * 255},  1)`;
        const textColor =       `rgba(${textBrightness * 255},          ${textBrightness * 255},        ${textBrightness * 255},        1)`;

        ctx.lineCap = "butt";
        ctx.lineJoin = "butt";
        ctx.lineWidth = borderWidth;

        ctx.strokeStyle = borderColor;
        ctx.fillStyle = backgroundColor;

        ctx.fillRect(x, y, width, height);
        if (borderWidth > 0) {
            ctx.strokeRect(x+Math.floor(borderWidth/2), y+Math.floor(borderWidth/2), width-borderWidth, height-borderWidth);
        }

        ctx.font = `${textSize * gridSize}px Arial`;
        ctx.fillStyle = textColor;
        ctx.fillText(this.text, x + borderWidth*2, y + textSize * gridSize - borderWidth*2);

    }

}

class UiButton extends UiElement {

    constructor(parent, text, x, y, width, height) {
        super(parent, text, x, y, width, height)

        this.type = "button"
        
        this.borderWidth = 2;
        this.borderBrightness = 0.5;

        this.backgroundBrightness = 0.05;

        this.textSize = 1.0;
        this.textBrightness = 1.0;
    }

}