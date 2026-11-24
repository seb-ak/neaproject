class MobileControlls {

    constructor(pressedInputs) {

        this.pressedInputs = pressedInputs;

        this.style = `
<style>
    #hideshow {
        margin: 0;
        padding:0;
        bottom: 0;
        left: 0;
        font-size: 2vmin;
        position: absolute;
        
        text-align: center;
        font-weight: bold;
        color: var(--color);
        font-size: 2.8vmin;
        background-color: var(--background-color);
        border-color: var(--color);
    }

    .hidden {
        display: none;
    }

    #controls {
        bottom: 10vmin;
        width: 100vmin;
        height: 43vmin;
        position: absolute;
        margin-top: 2vmin;
        pointer-events: none;
        z-index: 10;
        
        box-sizing: border-box;
        touch-action: none;
        font-family: "Monaco", monospace;
        color: whitesmoke;
        user-select: none;
        -webkit-user-select: none;
        -ms-user-select: none;
        
        background-color: var(--background-color);
    }

    * {
        user-select: none;
        -webkit-user-select: none;
        -ms-user-select: none;
        -webkit-touch-callout: none;
        -webkit-user-select: none;
    }

    #joystick {
        position: absolute;
        left: 5vmin;
        bottom: 10vmin;
        width: 30vmin;
        height: 30vmin;
        pointer-events: auto;
    }

    #joystick > div:first-child {
        box-sizing: border-box;
        width: 30vmin;
        height: 30vmin;
        border-radius: 50%;
        background: var(--background-color);
        border: 0.6vmin solid var(--color);
        position: absolute;
    }

    #joystick-knob {
        box-sizing: border-box;
        width: 14vmin;
        height: 14vmin;
        border-radius: 50%;
        background: var(--background-color);
        border: 1.5vmin solid var(--color);
        position: absolute;
        left: 8vmin;
        top: 8vmin;
        touch-action: none;
    }

    #btnA, #btnB {
        position: absolute;
        width: 20vmin;
        height: 20vmin;
        border-radius: 50%;
        background: var(--background-color);
        border: 1.5vmin solid var(--color);
        pointer-events: auto;
        bottom: 0vmin;
        
        margin-top: 20vmin;
        text-align: center;
        font-weight: bold;
        color: var(--color);
        font-size: 4vmin;
    }

    #btnA:active, #btnB:active {
        background: var(--color);
        color: var(--background-color);
    }

    #btnA {
        right: -10vmin;
    }

    #btnB {
        right: 10vmin;
    }

    #buttons {
        position: absolute;
        width: 20vmin;
        height: 20vmin;
        background: var(--color);
        pointer-events: auto;
        rotate: -27deg;
        right: 15vmin;
        bottom: 15vmin;
    }

    #select, #start {
        position: absolute;
        width: 14vmin;
        height: 5.5vmin;
        border-radius: 2vmin;
        background: var(--background-color);
        border: .9vmin solid var(--color);
        pointer-events: auto;
        bottom: -4vmin;
        rotate: -27deg;
        
        margin-top: 20vmin;
        text-align: center;
        font-weight: bold;
        color: var(--color);
        font-size: 2.8vmin;
        margin-top: 2.8vmin;
    }

    #select:active, #start:active {
        background: var(--color);
        color: var(--background-color);
    }

    #select {
        left: calc(36vmin - 8vmin);
    }

    #start {
        left: calc(52vmin - 8vmin);
    }

    #home-wrapper {
        display: flex;
        /* justify-content: center; */
        margin-top: 0vmin;
        /* background-color: red; */
        height: 8vmin;
        width: 100vmin;
        border-bottom: 1vmin solid #c3bdc7;
    }

    #home-wrapper::before {
        position: absolute;
        content: "";
        left: 9vmin;
        height: 8vmin;
        width: 80vmin;
        border-left: 1vmin solid #c3bdc7;
        border-right: 1vmin solid #c3bdc7;
    }

    #home {
        position: relative;
        bottom: 0vmin;
        left: 11vmin;
        color: #c3bdc7;
        text-decoration: none;
        font-size: 6vmin;
        z-index: 20;
    }

    #home:hover {
        text-decoration: underline;
    }
</style>
`

        this.html = `
<div id="controls" class="hidden">

    <div id="joystick">
        <div></div>
        <div id="joystick-knob"></div>
    </div>

    <div id="buttons">
        <button id="btnA">A</button>
        <button id="btnB">B</button>
    </div>
    
    <button id="select">SELECT</button>
    <button id="start">START</button>

</div>

<button id="hideshow">Touch Controls</button>
`

        document.body.insertAdjacentHTML("beforeend", this.style);
        document.body.insertAdjacentHTML("beforeend", this.html);
        
        controls.addEventListener("contextmenu", (event) => {
            event.preventDefault();
            event.stopImmediatePropagation();
        });

        hideshow.addEventListener('click', () => { controls.classList.toggle('hidden'); });

        this.keysDown = {}


        this.joyActive = false

        this.joystick = document.getElementById("joystick");
        this.knob = document.getElementById("joystick-knob");
    
        this.joystick.addEventListener("touchstart", e => { this.joyActive = true; this.joyMove(e); }, {passive:false});
        this.joystick.addEventListener("touchmove", e => { this.joyActive = true; this.joyMove(e); }, {passive:false});
        this.joystick.addEventListener("touchend", e => { this.joyActive = false; this.resetVirtualKeys(); }, {passive:false});
        // this.joystick.addEventListener("mousedown", e => { this.joyActive = true; this.joyMove(e); });
        // window.addEventListener("mousemove", e => { if (this.joyActive) this.joyMove(e); });
        // window.addEventListener("mouseup", e => { if (this.joyActive) { this.joyActive = false; this.knob.style.left="8vw"; this.knob.style.top="8vw"; this.resetVirtualKeys(); } });
        
        // A button
        document.getElementById("btnA").addEventListener("touchstart", e => { this.simulateKeyDown("Space"); }, {passive:false});
        document.getElementById("btnA").addEventListener("touchend", e => { this.simulateKeyUp("Space"); }, {passive:false});
        // document.getElementById("btnA").addEventListener("mousedown", e => { this.simulateKeyDown("Space"); });
        // document.getElementById("btnA").addEventListener("mouseup", e => { this.simulateKeyUp("Space"); });
    
        // B button
        document.getElementById("btnB").addEventListener("touchstart", e => { this.simulateKeyDown("Space"); }, {passive:false});
        document.getElementById("btnB").addEventListener("touchend", e => { this.simulateKeyUp("Space"); }, {passive:false});
        // document.getElementById("btnB").addEventListener("mousedown", e => { this.simulateKeyDown("Space"); });
        // document.getElementById("btnB").addEventListener("mouseup", e => { this.simulateKeyUp("Space"); });
    
        // SELECT button
        document.getElementById("select").addEventListener("touchstart", e => { this.simulateKeyDown("KeyE"); }, {passive:false});
        document.getElementById("select").addEventListener("touchend", e => { this.simulateKeyUp("KeyE"); }, {passive:false});
        // document.getElementById("select").addEventListener("mousedown", e => { this.simulateKeyDown("KeyE"); });
        // document.getElementById("select").addEventListener("mouseup", e => { this.simulateKeyUp("KeyE"); });
    
        // START button
        document.getElementById("start").addEventListener("touchstart", e => { this.simulateKeyDown("Escape"); }, {passive:false});
        document.getElementById("start").addEventListener("touchend", e => { this.simulateKeyUp("Escape"); }, {passive:false});
        // document.getElementById("start").addEventListener("mousedown", e => { this.simulateKeyDown("Escape"); });
        // document.getElementById("start").addEventListener("mouseup", e => { this.simulateKeyUp("Escape"); });

    }
    
    simulateKeyDown(keyCode) {
        if (!this.keysDown[keyCode] == undefined) this.keysDown[keyCode] = false;
        if (this.keysDown[keyCode]) return
        document.dispatchEvent(new KeyboardEvent("keydown", {
            key: keyCode,
            code: keyCode,
            bubbles: true,
            cancelable: true
        }));
        this.keysDown[keyCode] = true;
    }
    simulateKeyUp(keyCode) {
        if (this.keysDown[keyCode] == undefined) this.keysDown[keyCode] = true;
        if (!this.keysDown[keyCode]) return
        document.dispatchEvent(new KeyboardEvent("keyup", {
            key: keyCode,
            code: keyCode,
            bubbles: true,
            cancelable: true
        }));
        this.keysDown[keyCode] = false;
    }


    setVirtualKeys(dx, dy) {
        const deadzoneX = 10
        const deadzoneY = 4
        if (dy < -deadzoneY) this.simulateKeyDown("KeyW"); else this.simulateKeyUp("KeyW");
        if (dx < -deadzoneX) this.simulateKeyDown("KeyA"); else this.simulateKeyUp("KeyA");
        if (dy > deadzoneY) this.simulateKeyDown("KeyS"); else this.simulateKeyUp("KeyS");
        if (dx > deadzoneX) this.simulateKeyDown("KeyD"); else this.simulateKeyUp("KeyD");
    }

    resetVirtualKeys() {
        this.knob.style.backgroundColor = "var(--background-color)";
        this.knob.style.left="8vw";
        this.knob.style.top="8vw";

        this.simulateKeyUp("KeyW");
        this.simulateKeyUp("KeyA");
        this.simulateKeyUp("KeyS");
        this.simulateKeyUp("KeyD");
    }

    joyMove(e) {
        if (!this.joyActive) {
            this.knob.style.backgroundColor = "var(--background-color)";
            return;
        }
        
        this.knob.style.backgroundColor = "var(--color)";
        
        let touch = e.touches ? e.touches[0] : e;
        let rect = joystick.getBoundingClientRect();
        let dx = touch.clientX - (rect.left + rect.width / 2);
        let dy = touch.clientY - (rect.top + rect.height / 2);
    
        const joySize = rect.width; // in px
        const knobSize = this.knob.offsetWidth; // in px
        const maxDist = (joySize - knobSize) / 2;
    
        // Clamp the distance
        let dist = Math.min(Math.sqrt(dx * dx + dy * dy), maxDist);
        let angle = Math.atan2(dy, dx);
        let knobX = Math.cos(angle) * dist;
        let knobY = Math.sin(angle) * dist;
    
        // Move the knob so it's always centered
        this.knob.style.left = ((joySize - knobSize) / 2 + knobX) + "px";
        this.knob.style.top = ((joySize - knobSize) / 2 + knobY) + "px";
    
        this.setVirtualKeys(knobX/rect.width*50, knobY/rect.height*50);
    }
    


}
new MobileControlls()