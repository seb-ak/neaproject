import { logError, clearLog, vec3, loadImage, Quad, LOADING } from "./utils.js";
import { gameObject, levelTile, SpawnPoint, Player, Enemy, Platform, Portal, Spike, BossChase, Interactable, DeathBarrier, Boss } from "./gameObjects.js";
import { UiController } from "./ui.js"

class Level {
    constructor(levelID, levelFolder, z, player) {
        this.levelFolder = levelFolder;
        this.levelID = levelID;
        this.z = z;
        this.player = player;

        this.gridSize = 0.3;
        this.mainQuad;
        
        this.loaded = false;
        this.texture = undefined;
        this.collision = undefined;

        this.tempScaledTextures = new Map();

        this.load();

        this.chunks = []
        this.chunkSize = 10
        this.alwaysLoaded = [];
    }

    getChunkLoc(location) {
        if (location.location) location = location.location;
        const loc = location.div(this.gridSize * this.chunkSize);
        loc.x = Math.floor(loc.x);
        loc.y = Math.floor(loc.y);
        return loc;
    }

    getChunksData(location=undefined, radius=0) {
        const chunksData = {
            collision: [],
            levelTile: [],
            object: [...this.alwaysLoaded],
        };

        if (location == undefined) { // all of the chunks
            for (const chunkData of this.chunks.flat(Infinity)) {
                for (const [key, value] of Object.entries(chunkData)) {
                    chunksData[key].push(...value);
                }
            }
            return chunksData;
        }

        const chunkLoc = this.getChunkLoc(location);

        for (let x = -radius; x <= radius; x++) {
        for (let y = -radius; y <= radius; y++) {
            
            if (!this.chunks[chunkLoc.y + y]) continue;
            if (!this.chunks[chunkLoc.y + y][chunkLoc.x + x]) continue;
            if (chunkLoc.y + y < 0 || chunkLoc.y + y > this.chunks.length-1) continue;
            if (chunkLoc.x + x < 0 || chunkLoc.x + x > this.chunks[chunkLoc.y + y].length-1) continue;
            const chunkData = this.chunks[chunkLoc.y + y][chunkLoc.x + x];

            // for (const {key, value} of Object.entries(chunkData)) { // made an error here /////////
            for (const [key, value] of Object.entries(chunkData)) {
                chunksData[key].push(...value);
            }

        }
        }

        return chunksData;
    }

    getChunkCatagory(object) {
        if (object.type == "collision") return "collision";
        if (object.type == "levelTile") return "levelTile";
        return "object";
    }
    
    addToChunk(object) {
        const chunkLoc = this.getChunkLoc(object.location);
        object.chunkLoc = chunkLoc;
        const catagory = this.getChunkCatagory(object);
        
        if (!this.chunks[chunkLoc.y]) this.chunks[chunkLoc.y] = [];
        if (!this.chunks[chunkLoc.y][chunkLoc.x]) this.chunks[chunkLoc.y][chunkLoc.x] = {};

        const chunk = this.chunks[chunkLoc.y][chunkLoc.x];
        if (!chunk[catagory]) chunk[catagory] = [];
        chunk[catagory].push(object);
    }
    removeFromChunk(object, chunkLoc=undefined) {
        if (chunkLoc == undefined) chunkLoc = object.chunkLoc;
        const catagory = this.getChunkCatagory(object);
    
        if (!this.chunks[chunkLoc.y]) this.chunks[chunkLoc.y] = [];
        if (!this.chunks[chunkLoc.y][chunkLoc.x]) this.chunks[chunkLoc.y][chunkLoc.x] = {};

        const chunk = this.chunks[chunkLoc.y][chunkLoc.x];
        chunk[catagory] = chunk[catagory].filter(o => o != object);
    }

    moveChunk(object) {
        this.removeFromChunk(object);
        this.addToChunk(object);
    }

    async load() {
        // try {
            this.texture = await loadImage(`./levels/${this.levelFolder}/texture.png`);
            this.collision = await loadImage(`./levels/${this.levelFolder}/collision.png`);

            this.doorTexture = (await loadImage(`./textures/other/door.png`)).image;

            this.generateLevel();

            this.loaded = true;

        // } catch (error) {
        //     console.error(`Failed to load level ${this.levelFolder}:`, error);
        // }
    }

    generateLevel() {

        const testFoundHex = []

        const platforms = {}
        const bossPath = {}
        const bossLocations = []
        // COLLISION //
        for (let y = 0; y < this.collision.array.length; y++) {
        for (let x = 0; x < this.collision.array[y].length; x++) {
            const tile = this.collision.array[y][x];
            const hex = tile.hex.substring(0, 7);
            const data = tile.a.toString(10).padStart(2, '0')
            
            if (hex === "#000000") {

                const up =    (y + 1 < this.collision.array.length      ) ? this.collision.array[y + 1][x].hex=="#000000ff" : false
                const down =  (y - 1 >= 0                               ) ? this.collision.array[y - 1][x].hex=="#000000ff" : false
                const left =  (x - 1 >= 0                               ) ? this.collision.array[y][x - 1].hex=="#000000ff" : false
                const right = (x + 1 < this.collision.array[y].length   ) ? this.collision.array[y][x + 1].hex=="#000000ff" : false
                
                if (up && down && left && right) continue; // skip if fully enclosed

                const o = new gameObject(new vec3(x*this.gridSize, y*this.gridSize, 0));
                o.size = new vec3(this.gridSize, this.gridSize, this.gridSize);
                o.collision = true;
                o.type = "collision";

                this.addToChunk(o);
            }

            else if (hex === "#ff0000" && parseInt(data) >= 240) {
                const o = new SpawnPoint(new vec3(x*this.gridSize, y*this.gridSize, 0+this.gridSize), 255-parseInt(data));
                this.addToChunk(o);
            }
            
            else if (hex === "#0000ff" && parseInt(data) < 20) {
                const index = parseInt(data)-10
                bossLocations[index] = new vec3(x*this.gridSize, y*this.gridSize, 0)
            }
            
            else if (hex === "#0000ff" && data != "100") {
                const o = new Enemy(new vec3(x*this.gridSize, y*this.gridSize, 0+this.gridSize), data);
                this.addToChunk(o);
            }

            else if (hex === "#ffff00") {
                const location = new vec3(x*this.gridSize, y*this.gridSize, 0+this.gridSize);
                if (data == "255") {
                    const o = new Platform([location]);
                    this.addToChunk(o);
                } else {
                    const id = data.substring(0,2);
                    const index = data[2];
                    if (!platforms[id]) platforms[id] = {}
                    platforms[id][index] = location;
                }
            }

            else if (hex === "#ff0000" && data=="200") {
                const o = new Spike(new vec3(x*this.gridSize, y*this.gridSize, 0+this.gridSize), this.gridSize);
                this.addToChunk(o);
            }

            else if (hex === "#ff0000" && data=="100") {
                const o = new DeathBarrier(new vec3(x*this.gridSize, y*this.gridSize, 0+this.gridSize), this.gridSize);
                this.addToChunk(o);
            }

            else if (hex === "#ff00ff") {
                const o = new Portal(new vec3(x*this.gridSize, y*this.gridSize, 0+this.gridSize), data, this.levelID);
                this.addToChunk(o);
            }
            
            // if (hex === "#00ff96") { // doesnt work for some reason the colour is slightly offff each time
            else if (
                tile.r <= 3 && 
                tile.g >= 252 &&
                tile.b >= 147 && tile.b <= 153
            ) {
                const o = new Interactable(new vec3(x*this.gridSize, y*this.gridSize, 0+this.gridSize), data, this.levelID);
                this.addToChunk(o);
            }

            else if (hex === "#0000ff" && data == "100") { // door
                // console.log("door")
                const o = new gameObject(new vec3(x*this.gridSize, y*this.gridSize, 0));
                o.size = new vec3(this.gridSize*2, this.gridSize*11, this.gridSize*4);
                o.collision = true;
                o.type = "door";
                o.faces.push(new Quad(o.getFaceVertecies("front"), this.doorTexture));
                o.faces.push(new Quad(o.getFaceVertecies("left"), 0.2));
                o.faces.push(new Quad(o.getFaceVertecies("right"), 0.2));
                this.addToChunk(o);
            }

            // if (hex == "#C86464") { // boss chase path
            else if (
                tile.r >= 198 && tile.r <= 202 &&
                tile.g >= 98 && tile.g <= 102 &&
                tile.b >= 98 && tile.b <= 102
            ) {
                const location = new vec3(x*this.gridSize, y*this.gridSize, 0+this.gridSize);
                const index = data;
                bossPath[index] = location;
            }
            
            else if (hex != "#ffffff") {
                if (!testFoundHex.includes(hex)) {
                    // console.log(hex)
                    testFoundHex.push(hex)
                }
                /*
                    #01ff00
                    #fcfcff
                    #0909ff
                    #0707ff
                    #0303ff
                    #0505ff
                    #99ffd5
                    #193f20
                    #0f2613
                */
            }
        }}

        // platforms
        for (const x of Object.values(platforms)) {
            const entries = Object.entries(x).sort((a, b) => {
                return parseInt(a[0]) - parseInt(b[0]);
            });
            const positions = entries.map(p => p[1])
            
            const o = new Platform(positions);
            this.addToChunk(o);
        }

        // boss path
        const entries = Object.entries(bossPath).sort((a, b) => {
            return parseInt(a) - parseInt(b);
        });
        const positions = entries.map(p => p[1])
        if (positions.length > 0) {
            const o = new BossChase(positions);
            this.alwaysLoaded.push(o);
        }

        // boss
        if (bossLocations.length>0) {
            const o = new Boss(bossLocations);
            this.alwaysLoaded.push(o);
        }


        // texture
        if (this.levelID != "second") {
            for (let y = 0; y < this.texture.array.length; y++) {
                for (let x = 0; x < this.texture.array[y].length; x++) {
    
                    if (this.texture.array[y][x].a === 0) continue;
    
                    const up =    (y + 1 < this.texture.array.length   ) ? this.texture.array[y + 1][x].a!=0 : false
                    const down =  (y - 1 >= 0                          ) ? this.texture.array[y - 1][x].a!=0 : false
                    const left =  (x - 1 >= 0                          ) ? this.texture.array[y][x - 1].a!=0 : false
                    const right = (x + 1 < this.texture.array[y].length) ? this.texture.array[y][x + 1].a!=0 : false
                    
                    if (up && down && left && right) continue;
    
                    const location = new vec3(x*this.gridSize, y*this.gridSize, this.z)
                    const adjacent = { up:up, down:down, left:left, right:right, front: false }
                    const size = new vec3(this.gridSize, this.gridSize, this.gridSize*4)
                    const brightness = this.texture.array[y][x].r / 255
    
                    const o = new levelTile(location, adjacent, size, brightness - 0.1);
                    this.addToChunk(o);
                }
            }
        }

        // front face main quad
        const width = this.texture.array[0].length * this.gridSize;
        const height = this.texture.array.length * this.gridSize;
        const adjacent = { up:true, down:true, left:true, right:true, front: false }
        
        // console.log(typeof this.texture.image)

        this.mainQuad = new levelTile(new vec3(0, 0, 0), adjacent, new vec3(width, height, 0), 1);
        this.mainQuad.faces.push(
            new Quad(this.mainQuad.getFaceVertecies("front"), this.texture.image)
        );
        
        this.mainQuad.faces[0].doCulling = false;
        this.mainQuad.faces[0].isMainQuad = true;
        this.mainQuad.isMainQuad = true;

        // this.objects.push(this.mainQuad);
        //             this.addToChunk(o);

        // this.objectsWithCollision = this.objects.filter(obj => obj.collision)

        // console.log("chunks:", this.chunks)

    }
    
    tick(deltaTime) {
        if (!this.loaded) return;

        const tickRadius = 7
        const chunksData = this.getChunksData(this.player.location, tickRadius);

        for (const obj of chunksData.object) {
            if (!obj.ticking) continue;

            obj.tick(deltaTime, this);

            if (obj.ignoreChunks) continue;
            
            const oldChunkLoc = this.getChunkLoc(obj.location);
            if (oldChunkLoc.x !== obj.chunkLoc.x || oldChunkLoc.y !== obj.chunkLoc.y) {
                this.moveChunk(obj);
            }
        }
    }

    draw(ctx, camera, screen, player, colour, cameraIsMoving, performance=false) {

        const w=screen.width
        const h=screen.height
        const fovRad = camera.fov * Math.PI/180;
        const f = w / (2 * Math.tan(fovRad/2));

        const cameraLoc = camera.location
        
        const toDraw = {
            vertices: [],
            distance: [],
            brightness: [],
            order: [],
        }
        
        const radius = this.levelID == "second"? 6 : 3;
        const chunksData = this.getChunksData(camera.location, radius);
        const objects = [this.mainQuad];

        if (chunksData.object) objects.push(...chunksData.object);
        if (!performance && chunksData.levelTile) objects.push(...chunksData.levelTile);
        if (player) objects.push(player);

        for (const obj of objects) {
            for (const face of obj.faces) {
                let [
                    face_vertices, 
                    face_distance, 
                    face_brightness
                ] = face.project2d(f, w, h, cameraLoc, new vec3(0, 0, this.z))
                
                if (face.doCulling) {
                    if (face_vertices == "culled") continue;
                    if (face_distance >= camera.maxQuadDist) continue;
                }
                face_distance = Math.max(0, face_distance)

                toDraw.vertices.push(face_vertices)
                toDraw.distance.push(face_distance)
                toDraw.brightness.push(face_brightness)
                toDraw.order.push(toDraw.order.length)
            }
        }
        
        toDraw.order.sort((a, b) => toDraw.distance[toDraw.order.indexOf(b)] - toDraw.distance[toDraw.order.indexOf(a)])
        
        for (let i = 0; i < toDraw.order.length; i++) {
            const o = toDraw.order[i]
            this.drawQuad(ctx, toDraw.vertices[o], toDraw.brightness[o], toDraw.distance[o], colour, cameraIsMoving)
        }

    }

    drawQuad(ctx, vertices, brightness, distance, light, cameraIsMoving) {

        const isTexture = typeof brightness != "number";

        let texture;
        let adjustedBrightness;

        if (isTexture) {
            texture = brightness;
            brightness = 1;
            adjustedBrightness = brightness - distance/20 + 0.3;
        }
        else {
            const close = distance < 10
            if (close) adjustedBrightness = brightness - distance/20 + 0.3;
            else adjustedBrightness = brightness - (distance + 3)/25 + 0.35;
        }
        adjustedBrightness = Math.min(1, Math.max(0, adjustedBrightness));


        if (isTexture) {
            const x = Math.floor(vertices[0].x)
            const y = Math.floor(vertices[0].y)
            const width = Math.floor(vertices[2].x - x)
            const height = Math.floor(vertices[2].y - y)

            ctx.filter = `brightness(${adjustedBrightness})`;
            ctx.drawImage(texture, x, y, width, height);
            ctx.filter = `none`;

        } else {
            const r = Math.floor(light.r * adjustedBrightness);
            const g = Math.floor(light.g * adjustedBrightness);
            const b = Math.floor(light.b * adjustedBrightness);
            const colour = `rgb(${r}, ${g}, ${b})`;

            ctx.lineWidth = 2;
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            ctx.strokeStyle = colour;

            ctx.fillStyle = colour;

            ctx.beginPath();
            
            ctx.moveTo(Math.round(vertices[0].x), Math.round(vertices[0].y));
            for (let i=1; i < vertices.length; i++) {
                ctx.lineTo(Math.round(vertices[i].x), Math.round(vertices[i].y));
            }
            
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        }

	}
}

class Main {
    constructor() {
        
        this.stats = {
			settings: {},
			checkpoint: [],
            totalDeaths: 0,
            time: 0,
            rawTime: 0,
            fpsSum: 0,
            fpsReadings: 0,
            fpsAverage: 0,
        }

        this.loaded = false;
        this.loadingTime = 0;

        this.colours = [
            { dark: {r:5, g:28, b:12}, light: {r:51, g:255, b:102}},
            { dark: {r:43, g:27, b:61}, light: {r:246, g:240, b:207}},
            { dark: {r:0, g:0, b:0}, light: {r:255, g:255, b:255}},
            { dark: {r:42, g:12, b:64}, light: {r:118, g: 146, b:249}},
            { dark: {r:174, g:108, b:25}, light: {r:101, g:62, b:60}},
            { dark: {r:99, g:222, b:165}, light: {r:222, g: 103, b:99}},
        ]

        this.settings = {
            dithering: true,
            colourScheme: 0,
            performance: false,
        }

        this.loadSettings();

        this.deltaTime = 1
        this.lastTime = 0
        this.fps = 0

        this.frames = 0;
        this.nextSecond = 0;
        
        this.limitFps = true;
        this.lastFrameTime = 0

        this.canvas = document.getElementById("gameCanvas");
        // this.ctx = this.canvas.getContext("2d");
        this.ctx = this.canvas.getContext("2d", { willReadFrequently: true });
        this.ctx.imageSmoothingEnabled = false;
        
        this.screen = {
            width: 192*2,
            height: 144*2,
        };
        this.camera = {
            location: new vec3(),
            fov: 70,
            maxQuadDist: 20,
            z: -5
        };
        
        this.player = new Player(new vec3(0,0,0))
        this.level = {
            main: new Level("main", "main", 0, this.player),
            second: new Level("second","back", -15, this.player),
        };

        // this.levelLayer = "main"

        this.loadTextures();

        this.ui = new UiController(this);

        requestAnimationFrame(this.update.bind(this));

    }

    saveSettings()  {
        localStorage.setItem('settings', JSON.stringify(this.settings));
    }

    loadSettings() {
        const settings = localStorage.getItem('settings');
        if (settings) {
            const savedSettings = JSON.parse(settings);
            // if (Array.isArray(savedSettings.colours) && savedSettings.colours.length === this.settings.colours.length) {
            //     this.settings.colours = savedSettings.colours;
            // }
            // delete savedSettings.colours;
            this.settings = { ...this.settings, ...savedSettings };
        }

        if (!Number.isInteger(this.settings.colourScheme) || this.settings.colourScheme < 0 || this.settings.colourScheme >= this.colours.length) {
            this.settings.colourScheme = 0;
        }
        this.setColourCSS();
    }

    async loadTextures() {
        const texture = await loadImage(`./textures/vignette/vignette3.png`);
        this.vignette = texture.image;

        this.loaded = true;
    }

    update(currentTime) {

        this.setColourCSS();

        if (this.limitFps) {
            const frameInterval = 1000 / 60;
            const elapsed = currentTime - this.lastFrameTime;

            if (elapsed < frameInterval) {
                requestAnimationFrame(this.update.bind(this));
                return;
            }

            this.lastFrameTime = currentTime - (elapsed % frameInterval);
        }

        clearLog()
        
        {
            logError(`FPS: ${this.fps}`);
            
            this.deltaTime = (currentTime - this.lastTime) / 1000
            this.lastTime = currentTime
    
            this.frames++;
            if (this.nextSecond <= currentTime) {
                this.fps = this.frames
                this.nextSecond = currentTime + 1000;
                this.frames = 0;

                // stats
                this.stats.fpsSum += Math.min(60, this.fps);
                this.stats.fpsReadings++;
                this.stats.fpsAverage = (this.stats.fpsSum / this.stats.fpsReadings).toFixed(2)
            }
        }

        this.deltaTime = Math.max(1/70, Math.min(1/30, this.deltaTime))

        if (LOADING.size > 0 || !this.loaded) {
            this.loadingTime += this.deltaTime;
            this.ctx.fillStyle = "#000000";
            this.ctx.fillRect(0, 0, this.screen.width, this.screen.height);
            this.ctx.font = `30px Arial`;
            this.ctx.fillStyle = "#eeeeee";
            const text = "Loading" + ".".repeat(Math.floor(this.loadingTime*25));
            this.ctx.fillText(text, 6, this.screen.height-8);
            if (this.settings.dithering) this.dither()
            requestAnimationFrame(this.update.bind(this));
            return;
        }

        // if (this.deltaTime > 1/30 || this.deltaTime < 1/1000) {
        //     console.log(this.deltaTime);

        //     requestAnimationFrame(this.update.bind(this));
        //     return;
        // }

        if (this.player.initialSpawn) {
            this.player.spawn(this.level[this.player.levelID]);
        }
                
        if (this.player.killedBoss && (this.ui.activeScreen == this.ui.gameScreen || this.ui.activeScreen == this.ui.deathScreen)) {
            this.ui.activeScreen = this.ui.endScreen
            this.ui.endScreen.elements[1].text = `${this.stats.totaldeaths} Deaths`
            this.ui.endScreen.elements[2].text = `${this.stats.time}`
        }


        const paused = !(
            this.ui.activeScreen == this.ui.gameScreen ||
            this.ui.activeScreen == this.ui.deathScreen ||
            this.ui.activeScreen == this.ui.endScreen
        );



        // stats
            this.stats.totalDeaths = this.player.totalDeaths
			for (let i = 0; i < this.player.checkpointDeaths.length; i++) {
				if (this.stats.checkpoint[i] == undefined) this.stats.checkpoint[i] = {time: 0, deaths:0}
				this.stats.checkpoint[i].deaths = this.player.checkpointDeaths[i]
			}

			const checkpointId = this.player.activeSpawn.object.id
			if (this.stats.checkpoint[checkpointId] == undefined) this.stats.checkpoint[checkpointId] = {time: 0, deaths:0}
			this.stats.checkpoint[checkpointId].time += this.deltaTime

			this.stats.settings.colour = this.settings.colourScheme
			this.stats.settings.dithering = this.settings.dithering
			this.stats.settings.performanceMode = this.settings.performance
		
            if (!paused) this.stats.rawTime += this.deltaTime
            const minutes = String(Math.floor(this.stats.rawTime / 60)).padStart(2, '0');
            const seconds = String(Math.floor(this.stats.rawTime % 60)).padStart(2, '0');
            const milliseconds = String(Math.round((this.stats.rawTime % 1) * 1000)).padStart(3, '0');
            this.stats.time = `${minutes}:${seconds}.${milliseconds}`;
            // if (this.player.activeSpawn.object.id > this.stats.checkpoint) this.stats.checkpoint = this.player.activeSpawn.object.id;
            // console.log(this.stats)
        //



        if (!paused) {
        
            for (const level of Object.values(this.level)) level.tick(this.deltaTime);
    
            const activeLevel = this.level[this.player.levelID]

            this.player.tick(this.deltaTime, activeLevel)

            this.ui.topText.text = this.player.topText
            this.ui.bottomText.text = this.player.bottomText
            this.ui.topTextVisible = this.player.topTextTime != -1
            this.ui.bottomTextVisible = this.player.bottomTextTime != -1


            // switch between game ui and death screen when player is dead // 
            if (this.player.deathTimer != -1 && this.ui.activeScreen == this.ui.gameScreen) {
                this.ui.activeScreen = this.ui.deathScreen
            } else if (this.player.deathTimer == -1 && this.ui.activeScreen == this.ui.deathScreen) {
                this.ui.activeScreen = this.ui.gameScreen
            }


            // move camera
            const baseFov = 90
            const extraVelocity = Math.abs(this.player.velocity) > 5? 1 : 0
            const fovMultiplier = 30
            const zMoveMultiplier = 1/4
            const extraTransition = (1 - Math.min(1, this.player.teleportTransition))

            const vel = new vec3(
                this.player.velocity.x / 6 * (this.player.isDashing? 1.2 : 1),
                0 + this.player.inBossFight? 1:0,
                this.camera.z
            )

            const diff = new vec3(
                this.player.location.x,
                this.player.location.y+1,
                extraTransition * zMoveMultiplier
            ).add(vel)
            .sub(this.camera.location)
            .div(8)
            .mult(this.deltaTime*60)

            this.camera.location.x += diff.x
            this.camera.location.y += diff.y
            this.camera.location.z = Math.round((this.camera.location.z + diff.z)*100)/100
            
            this.camera.fov = baseFov + extraVelocity - extraTransition * fovMultiplier
            if (this.player.inBossFight) this.camera.fov += 20

            this.camera.isMoving = !(this.camera.location.z == this.camera.lastZ)
            this.camera.lastZ = this.camera.z

        } else {
            this.camera.location = this.player.location.add(
                new vec3(this.ui.mouse.x, this.ui.mouse.y + 1.5, 0).mult(0.001)
            )
            this.camera.location.z = -7;

            // this.camera.location = new vec3(15,10,-7).add(
            //     new vec3(this.ui.mouse.x, this.ui.mouse.y, 0).mult(0.001)
            // )

        }



        

        this.ui.tick(this.deltaTime)
        
        this.draw();
        
        requestAnimationFrame(this.update.bind(this));
    // } catch (e) {logError(e);}
    }

    draw() {
        logError(window.devicePixelRatio)
        this.canvas.style.scale = window.devicePixelRatio

        const colour = {dark:{r:0,g:0,b:0},light:{r:255,g:255,b:255}}

        this.ctx.fillStyle = `rgb(${colour.dark.r}, ${colour.dark.g}, ${colour.dark.b})`
        this.ctx.fillRect(0, 0, this.screen.width, this.screen.height);

        for (const levelID of ["second", "main"]) {

            if (!this.level[levelID]) continue
            if (!this.level[levelID].loaded) continue

            this.level[levelID].draw(
                this.ctx,
                this.camera,
                this.screen,
                this.player.levelID==levelID? this.player : undefined,
                colour.light,
                this.camera.isMoving,
                this.settings.performance
            );
        
        }

        
        // vignette
        this.ctx.globalAlpha = 0.4;
        this.ctx.drawImage(this.vignette, 0, 0)
        this.ctx.globalAlpha = 1;
        
        // user interface
        this.ui.draw(this.ctx);
        
        if (this.settings.dithering) {
            this.dither();
        }

    }

    dither() {
        
        const colour = this.colours[this.settings.colourScheme];

        const width = this.screen.width
        const height = this.screen.height

        // const size = 2
        // const f = 1/size/size
        // const m = [
        //     [f*0,f*2],
        //     [f*3,f*1]
        // ]

        // https://en.wikipedia.org/wiki/Ordered_dithering
        // https://github.com/tromero/BayerMatrix

        // # Bayer Matrix 8
        const size = 8;
        const f = 1/size/size
        const m = [
            [f*0, f*32, f*8, f*40, f*2, f*34, f*10, f*42],
            [f*48, f*16, f*56, f*24, f*50, f*18, f*58, f*26],
            [f*12, f*44, f*4, f*36, f*14, f*46, f*6, f*38],
            [f*60, f*28, f*52, f*20, f*62, f*30, f*54, f*22],
            [f*3, f*35, f*11, f*43, f*1, f*33, f*9, f*41],
            [f*51, f*19, f*59, f*27, f*49, f*17, f*57, f*25], 
            [f*15, f*47, f*7, f*39, f*13, f*45, f*5, f*37],
            [f*63, f*31, f*55, f*23, f*61, f*29, f*53, f*21]
        ]
        
        
        const imageData = this.ctx.getImageData(0, 0, width, height);
        let i = 0;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {

                const brightness = imageData.data[i]
                i += 4;

                const d = m[(y+4)%size][(x+4)%size]

                imageData.data[i - 4] = d * 255 > brightness ? colour.dark.r : colour.light.r //r
                imageData.data[i - 3] = d * 255 > brightness ? colour.dark.g : colour.light.g //g
                imageData.data[i - 2] = d * 255 > brightness ? colour.dark.b : colour.light.b //b
                // imageData[i+3] //a

            }
        }

        this.ctx.putImageData(imageData, 0, 0);

    }

    setColourCSS() {
        const colour = this.colours[this.settings.colourScheme];
        const dark = `rgb(${colour.dark.r}, ${colour.dark.g}, ${colour.dark.b})`;
        const light = `rgb(${colour.light.r}, ${colour.light.g}, ${colour.light.b})`;

        document.documentElement.style.setProperty('--background-color', this.settings.dithering ? dark : "#22272E");
        document.documentElement.style.setProperty('--color', this.settings.dithering ? light : "#ADBAC7");
    }

}

let main;
let i = setInterval(()=>{
    if (!document.hasFocus()) return
    main = new Main();
    clearInterval(i)
})
