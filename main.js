import { logError, clearLog, vec3, loadImage, Quad } from "./utils.js";
import { gameObject, levelTile, SpawnPoint, Player, Enemy, Platform, Portal, Spike } from "./gameObjects.js";
import { UiController } from "./ui.js"

class Level {
    constructor(levelID, levelFolder, z, player) {
        this.levelFolder = levelFolder;
        this.levelID = levelID;
        this.z = z;
        this.player = player;

        // this.objects = [];
        this.gridSize = 0.3;
        // this.gridCollision = [];
        // this.gridObjects = [];
        this.mainQuad;
        
        this.loaded = false;
        this.texture = undefined;
        this.collision = undefined;

        this.tempScaledTextures = new Map();

        this.load();

        this.chunks = []
        this.chunkSize = 10
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
            object: [],
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

            this.generateLevel();

            this.loaded = true;

        // } catch (error) {
        //     console.error(`Failed to load level ${this.levelFolder}:`, error);
        // }
    }

    generateLevel() {

        const platforms = {}

        // COLLISION //
        for (let y = 0; y < this.collision.array.length; y++) {
            // this.gridCollision[y] = [];
            // this.gridObjects[y] = [];
            for (let x = 0; x < this.collision.array[y].length; x++) {
                const tile = this.collision.array[y][x];
                const hex = tile.hex.substring(0, 7);
                const data = tile.a.toString(10).padStart(2, '0')
                
                // this.gridCollision[y][x] = (hex === "#000000")
                if (hex === "#000000") {

                    const up =    (y + 1 < this.collision.array.length      ) ? this.collision.array[y + 1][x].hex=="#000000ff" : false
                    const down =  (y - 1 >= 0                               ) ? this.collision.array[y - 1][x].hex=="#000000ff" : false
                    const left =  (x - 1 >= 0                               ) ? this.collision.array[y][x - 1].hex=="#000000ff" : false
                    const right = (x + 1 < this.collision.array[y].length   ) ? this.collision.array[y][x + 1].hex=="#000000ff" : false
                    
                    if (up && down && left && right) {
                        // console.log("skipped collision");
                        // skip if fully enclosed
                        continue;
                    }

                    const o = new gameObject(new vec3(x*this.gridSize, y*this.gridSize, 0));
                    o.size = new vec3(this.gridSize, this.gridSize, this.gridSize);
                    o.collision = true;
                    o.type = "collision";
                    this.addToChunk(o);
                    // this.gridObjects[y][x] = o;
                    // console.log("collision")
                }
                
                if (hex === "#ff0000" && data=="255") {
                    const o = new SpawnPoint(new vec3(x*this.gridSize, y*this.gridSize, 0+this.gridSize));
                    this.addToChunk(o);
                    // console.log("spawnpoint")
                }
                
                if (hex === "#0000ff") {
                    const o = new Enemy(new vec3(x*this.gridSize, y*this.gridSize, 0+this.gridSize), data);
                    this.addToChunk(o);
                }

                if (hex === "#ffff00") {
                    const location = new vec3(x*this.gridSize, y*this.gridSize, 0+this.gridSize);
                    if (data == "255") {
                        const o = new Platform([location]);
                        this.addToChunk(o);
                    } else {
                        const id = data[1];
                        const index = data[2];
                        if (!platforms[id]) platforms[id] = {}
                        platforms[id][index] = location;
                    }
                }

                if (hex === "#ff0000" && data=="200") {
                    const o = new Spike(new vec3(x*this.gridSize, y*this.gridSize, 0+this.gridSize), this.gridSize);
                    this.addToChunk(o);
                }

                if (hex === "#ff00ff") {
                    const o = new Portal(new vec3(x*this.gridSize, y*this.gridSize, 0+this.gridSize), data, this.levelID);
                    this.addToChunk(o);
                }
            }
        }

        // platforms //
            for (const x of Object.values(platforms)) {
                
                const entries = Object.entries(x).sort((a, b) => {
                    return parseInt(a) - parseInt(b);
                });
                const positions = entries.map(p => p[1])
                
                const o = new Platform(positions);
                this.addToChunk(o);
            }

        //


        // TEXTURE //
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
    
                    const o = new levelTile(location, adjacent, size, brightness);
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
        
        const radius = this.levelID == "second"? 5 : 2;
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
                // if (obj.isMainQuad) {
                //     face_distance -= 20
                // }
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

        // const [
        //     face_vertices, 
        //     face_distance, 
        //     face_brightness
        // ] = this.mainQuad.project2d(f, w, h, cameraLoc, new vec3(0, 0, this.z));

        // const x = face_vertices[0].x
        // const y = face_vertices[0].y
        // const width = face_vertices[2].x - x
        // const height = face_vertices[2].y - y
        
        // ctx.drawImage(this.texture.image, x, y, width, height);

    }

    drawQuad(ctx, vertices, brightness, distance, light, cameraIsMoving) {

        function drawSubQuad(ctx, points, subQuadBrightness) {
            // console.log(brightness)
            // const c = Math.floor(subQuadBrightness * 255);
            const c = subQuadBrightness
            const colour = `rgb(${Math.floor(light.r * c)}, ${Math.floor(light.g * c)}, ${Math.floor(light.b * c)})`;
            // console.log(colour)

            ctx.lineWidth = 2;
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            ctx.strokeStyle = colour;

            ctx.fillStyle = colour;

            ctx.beginPath();
            
            ctx.moveTo(Math.round(points[0].x), Math.round(points[0].y));
            for (let i=1; i < points.length; i++) {
                ctx.lineTo(Math.round(points[i].x), Math.round(points[i].y));
            }
            
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

        }

        const isTexture = typeof brightness != "number"

        let texture

        if (isTexture) {
            texture = brightness;
            brightness = 1;
        }

        // let adjustedBrightness = brightness - (distance*distance)/1000;
        let adjustedBrightness = brightness - distance/20 + 0.3
        if (!isTexture) {

            const close = distance < 10
            if (close) {
                adjustedBrightness = brightness - distance/20 + 0.3
            } else {
                adjustedBrightness = brightness - (distance + 3)/25 + 0.35
            }
        }
        adjustedBrightness = Math.min(1, Math.max(0, adjustedBrightness));

        if (isTexture) {
            const x = Math.floor(vertices[0].x)
            const y = Math.floor(vertices[0].y)
            const width = Math.floor(vertices[2].x - x)
            const height = Math.floor(vertices[2].y - y)

            let key = `${texture.src} ${width} ${height} ${adjustedBrightness} ${light.r} ${light.g} ${light.b}`;
            if (cameraIsMoving) {
                key = `${texture.src} transition ${light.r} ${light.g} ${light.b}`;
                // console.log(key)
            }

            ctx.filter = `brightness(${adjustedBrightness})`;
            ctx.drawImage(texture, x, y, width, height);
            ctx.filter = `none`;
            return

            const temp = this.tempScaledTextures.get(key);

            // logError(`quad dist: ${distance}`)
            // logError(`quad brightens: ${adjustedBrightness}`)

            if (temp) {

                ctx.drawImage(temp, x, y, width, height);

            } else {
                
                // console.log("new scaled texture")
                logError("new scaled texture")

                const canvas = document.createElement("canvas");
                canvas.width = width;
                canvas.height = height;
                const tempCtx = canvas.getContext("2d");
                tempCtx.imageSmoothingEnabled = false;

                tempCtx.drawImage(texture, 0, 0, width, height);

                const tintColour = `rgb(${light.r}, ${light.g}, ${light.b})`;
                if (tintColour != "rgb(255, 255, 255)") {
                    tempCtx.globalCompositeOperation = 'multiply';
                    tempCtx.fillStyle = tintColour;
                    tempCtx.fillRect(0, 0, width, height);

                    tempCtx.globalCompositeOperation = 'source-over';
                }
                
                tempCtx.fillStyle = `rgba(0, 0, 0, ${1 - adjustedBrightness})`;
                tempCtx.fillRect(0, 0, width, height);

                tempCtx.globalCompositeOperation = 'destination-in';
                tempCtx.drawImage(texture, 0, 0, width, height);

                tempCtx.globalCompositeOperation = 'source-over';


                // tempCtx.globalCompositeOperation = 'colour';

                // const tintColour = `rgba(${light.r}, ${light.g}, ${light.b} ${1 - adjustedBrightness})`;
                // tempCtx.fillStyle = tintColour;
                // tempCtx.fillRect(0, 0, width, height);

                // tempCtx.globalCompositeOperation = 'source-over';

                this.tempScaledTextures.set(key, canvas);
        
                ctx.drawImage(canvas, x, y);

            }

        } else {
            drawSubQuad(ctx, vertices, adjustedBrightness);
        }

        // const texture = brightness;

        // const textureHeight = texture.length;
        // const textureWidth = texture[0].length;
        
        // // Bilinear interpolation formula
        // //  P(u, v) = (1-u)(1-v) * P0
        // //            + u(1-v)   * P1
        // //            + u v      * P2
        // //            + (1-u)v   * P3
        
        // function interp(u, v) {
        //     return  (vertices[0].mult((1-u)*(1-v)))
        //         .add(vertices[1].mult(   u *(1-v)))
        //         .add(vertices[2].mult(   u *   v ))
        //         .add(vertices[3].mult((1-u)*   v ));
        // }
        
		// for (let y=0; y<textureHeight; y++) {
		// 	for (let x=0; x<textureWidth; x++) {
        //         if (texture[y][x]===" ") continue

        //         const u0 = x / textureWidth;
        //         const v0 = y / textureHeight;
        //         const u1 = (x + 1) / textureWidth;
        //         const v1 = (y + 1) / textureHeight;
                
        //         const subPoints = [
        //             interp(u0, v0),
        //             interp(u1, v0),
        //             interp(u1, v1),
        //             interp(u0, v1),
        //         ];
        //         const brightness = texture[y][x];
		// 		drawSubQuad(ctx, subPoints, brightness);
		// 	}
		// }
	}

    // getCloseTo(obj) {
    //     // const distance = obj.size.mult(2)
    //     const distance = new vec3(0.5, 0.5, 0.5)
    //     const close = []
    //     const min = obj.getPoint().bl.sub(distance).div(this.gridSize)
    //     const max = obj.getPoint().tr.add(distance).div(this.gridSize)

    //     const width = this.texture.image.width
    //     const height = this.texture.image.height

    //     min.x = Math.min(width-1, Math.max(0, Math.floor(min.x)))
    //     max.x = Math.min(width-1, Math.max(0, Math.floor(max.x)))
        
    //     min.y = Math.min(height-1, Math.max(0, Math.floor(min.y)))
    //     max.y = Math.min(height-1, Math.max(0, Math.floor(max.y)))
    
    //     for (let y=min.y; y<max.y; y++) {
    //         for (let x=min.x; x<max.x; x++) {
    //             const o = this.gridObjects[y][x];
    //             if (!o) continue;
    //             if (!o.collision) continue;
    //             close.push(o);
    //         }
    //     }
    
    //     // console.log(
    //     //     this.gridObjects.length,
    //     //     this.gridObjects[0].length,
    //     //     this.gridObjects[50].length,
    //     // )
    //     // console.log({
    //     //     distance,
    //     //     close,
    //     //     min,
    //     //     max,
    //     // })
        
    //     return close;
    // }

}

class Main {
    constructor() {
        this.loaded = false;

        this.settings = {
            dithering: true,
            colourScheme: 0,
            performance: false,
            colours: [
                { dark: {r:5, g:28, b:12}, light: {r:51, g:255, b:102}}, // #051c0c (Dark Forest Green) and #33ff66 (Terminal Green)
                { dark: {r:43, g:27, b:61}, light: {r:246, g:240, b:207}}, // #2b1b3d (Plum Purple) and #f6f0cf (Butter Yellow)
                {dark: {r:18, g:12, b:0}, light: {r:255, g:176, b:0}}, // #120c00 (Deep Brown-Black) and #ffb000 (Classic Amber)
                {dark: {r:15, g:26, b:44}, light: {r:238, g:242, b:247}}, // #0f1a2c (Dark Navy) and #eef2f7 (Ice White)
                {dark: {r:36, g:89, b:92}, light: {r:240, g:125, b:234}},
                {dark: {r:74, g:68, b:94}, light: {r:180, g:76, b:67}},
                { dark: {r:0, g:0, b:0}, light: {r:255, g:255, b:255}},
                {dark: {r:Math.random()*255, g:Math.random()*255, b:Math.random()*255}, light: {r:Math.random()*255, g:Math.random()*255, b:Math.random()*255}},
                {dark: {r:99, g:222, b:165}, light: {r:222, g: 103, b:99}},
                { dark: {r:42, g:12, b:64}, light: {r:118, g: 146, b:249}},
            ],
        }
        this.loadSettings();

        this.deltaTime = 1
        this.lastTime = 0
        this.fps = 0

        this.frames = 0;
        this.nextSecond = 0;
        
        this.limitFps = false;

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
            second: new Level("second","main", -15, this.player),
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
        if (settings) this.settings = JSON.parse(settings);
    }

    async loadTextures() {
        const texture = await loadImage(`./textures/vignette/vignette3.png`);
        this.vignette = texture.image;

        this.loaded = true;
    }

    update(currentTime) {

        
        if (!this.loaded) {
            requestAnimationFrame(this.update.bind(this));
            return;
        }

        if (this.limitFps) {
            this.limitFpsFrame = !this.limitFpsFrame
            if (this.limitFpsFrame) {
                requestAnimationFrame(this.update.bind(this));
                return;
            }
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
            }
        }

        this.deltaTime = Math.max(1/144, Math.min(1/30, this.deltaTime))
        // if (this.deltaTime > 1/30 || this.deltaTime < 1/1000) {
        //     console.log(this.deltaTime);

        //     requestAnimationFrame(this.update.bind(this));
        //     return;
        // }

        if (this.player.initialSpawn) {
            this.player.spawn(this.level[this.player.levelID]);
        }

        const paused = !(
            this.ui.activeScreen == this.ui.gameScreen ||
            this.ui.activeScreen == this.ui.deathScreen
        );

        if (!paused) {
        
            for (const level of Object.values(this.level)) level.tick(this.deltaTime);
    
            const activeLevel = this.level[this.player.levelID]

            this.player.tick(this.deltaTime, activeLevel)


            // switch between game ui and death screen when player is dead // 
            if (this.player.deathTimer != -1 && this.ui.activeScreen == this.ui.gameScreen) {
                this.ui.activeScreen = this.ui.deathScreen
            } else if (this.player.deathTimer == -1 && this.ui.activeScreen == this.ui.deathScreen) {
                this.ui.activeScreen = this.ui.gameScreen
            }


            // move camera
            const baseFov = 70
            const extraVelocity = Math.abs(this.player.velocity) > 5? 1 : 0
            const fovMultiplier = 30
            const zMoveMultiplier = 1/4
            const extraTransition = (1 - Math.min(1, this.player.teleportTransition))

            const vel = new vec3(
                this.player.velocity.x / 6 * (this.player.isDashing? 1.2 : 1),
                0,//this.player.velocity.y / 30,
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



        

        this.ui.tick()
        
        this.draw();
        
        requestAnimationFrame(this.update.bind(this));
    // } catch (e) {logError(e);}
    }

    draw() {
        const colour = this.settings.dithering ?
            {dark:{r:0,g:0,b:0},light:{r:255,g:255,b:255}} : this.settings.colours[this.settings.colourScheme]

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
        
        const colour = this.settings.colours[this.settings.colourScheme];

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

}

new Main();