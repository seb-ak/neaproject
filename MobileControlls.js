export class MobileControlls {

    constructor(pressedInputs) {

        this.pressedInputs = pressedInputs;

        this.html = `

        <style>

            .hidden {
                display: none;
            }

            #controls {
                width: 100vmin;
                height: 60vmin;
                position: relative;
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
                width: 30vmin;
                height: 30vmin;
                border-radius: 50%;
                background: #c3bdc7;
                border: 0.6vmin solid #c3bdc7;
                position: absolute;
            }

            #joystick-knob {
                width: 14vmin;
                height: 14vmin;
                border-radius: 50%;
                background: #474956;
                border: 0.6vmin solid #272731;
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
                background: #84145E;
                border: 1.5vmin solid #c3bdc7;
                pointer-events: auto;
                bottom: 0vmin;
                
                margin-top: 20vmin;
                text-align: center;
                font-weight: bold;
                color: #302B6D;
                font-size: 4vmin;
            }

            #btnA:active, #btnB:active {
                background: #6b124e;
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
                background: #C3BDC7;
                /* border: 1.5vmin solid #C3BDC7; */
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
                background: #988FA2;
                border: .9vmin solid #c3bdc7;
                pointer-events: auto;
                bottom: -4vmin;
                rotate: -27deg;
                
                margin-top: 20vmin;
                text-align: center;
                font-weight: bold;
                color: #302B6D;
                font-size: 2.8vmin;
                margin-top: 2.8vmin;
            }

            #select:active, #start:active {
                background: #726d79;
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

        <button id="hideshow">show mobile controls</button>

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
        `

        document.body.insertAdjacentHTML("beforeend", this.html);
        

        hideshow.addEventListener('click', () => {
            const isHidden = controls.classList.toggle('hidden');
        });




        this.joyActive = false

        this.joystick = document.getElementById("joystick");
        this.knob = document.getElementById("joystick-knob");
    
        this.joystick.addEventListener("touchstart", e => { this.joyActive = true; this.joyMove(e); }, {passive:false});
        this.joystick.addEventListener("touchmove", this.joyMove, {passive:false});
        this.joystick.addEventListener("touchend", e => { this.joyActive = false; this.knob.style.left="8vw"; this.knob.style.top="8vw"; this.resetVirtualKeys(); }, {passive:false});
        this.joystick.addEventListener("mousedown", e => { this.joyActive = true; this.joyMove(e); });
        window.addEventListener("mousemove", e => { if (this.joyActive) this.joyMove(e); });
        window.addEventListener("mouseup", e => { if (this.joyActive) { this.joyActive = false; this.knob.style.left="8vw"; this.knob.style.top="8vw"; this.resetVirtualKeys(); } });
        
        // A button
        document.getElementById("btnA").addEventListener("touchstart", e => { this.pressedInputs.jump.active = true; }, {passive:false});
        document.getElementById("btnA").addEventListener("touchend", e => { this.pressedInputs.jump.active = false; }, {passive:false});
        document.getElementById("btnA").addEventListener("mousedown", e => { this.pressedInputs.jump.active = true; });
        document.getElementById("btnA").addEventListener("mouseup", e => { this.pressedInputs.jump.active = false; });
    
        // B button
        // document.getElementById("btnB").addEventListener("touchstart", e => { this.pressedInputs.select.active = true; }, {passive:false});
        // document.getElementById("btnB").addEventListener("touchend", e => { this.pressedInputs.select.active = false; }, {passive:false});
        // document.getElementById("btnB").addEventListener("mousedown", e => { this.pressedInputs.select.active = true; });
        // document.getElementById("btnB").addEventListener("mouseup", e => { this.pressedInputs.select.active = false; });
    
        // SELECT button
        document.getElementById("select").addEventListener("touchstart", e => { this.pressedInputs.select.active = true; }, {passive:false});
        document.getElementById("select").addEventListener("touchend", e => { this.pressedInputs.select.active = false; }, {passive:false});
        document.getElementById("select").addEventListener("mousedown", e => { this.pressedInputs.select.active = true; });
        document.getElementById("select").addEventListener("mouseup", e => { this.pressedInputs.select.active = false; });
    
        // START button
        document.getElementById("start").addEventListener("touchstart", e => { this.simulateKey("Escape") }, {passive:false});
        // document.getElementById("start").addEventListener("touchend", e => {  }, {passive:false});
        document.getElementById("start").addEventListener("mousedown", e => { this.simulateKey("Escape") });
        // document.getElementById("start").addEventListener("mouseup", e => {  });

    }

    simulateKey(keyCode) {
        const enterEvent = new KeyboardEvent("keydown", {
        key: keyCode,
        code: keyCode,
        keyCode: 13,      // Included only for legacy library compatibility
        bubbles: true,    // Allows the event to bubble up to document/window
        cancelable: true  // Allows event.preventDefault() to work
        });

        document.dispatchEvent(enterEvent);
    }


    setVirtualKeys(dx, dy) {
        const deadzone = 4
        this.pressedInputs.left.active = dx < -deadzone;
        this.pressedInputs.right.active = dx > deadzone;
        this.pressedInputs.up.active = dy < -deadzone;
        this.pressedInputs.down.active = dy > deadzone;
    }

    resetVirtualKeys() {
        this.pressedInputs.left.active = false;
        this.pressedInputs.right.active = false;
        this.pressedInputs.up.active = false;
        this.pressedInputs.down.active = false;
    }

    joyMove(e) {
        if (!this.joyActive) return;
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