import { logError, clearLog, vec3, loadImage, Quad } from "./utils.js";
import { gameObject, levelTile, SpawnPoint, Player } from "./gameObjects.js";
import { UiController } from "./ui.js"

class Level {
    constructor(levelFolder, z) {
        this.levelFolder = levelFolder;
        this.z = z;

        this.objects = [];
        this.gridSize = 0.3;
        this.gridCollision = [];
        this.gridObjects = [];
        this.mainQuad
        
        this.loaded = false;
        this.texture = undefined;
        this.collision = undefined;

        this.tempScaledTextures = new Map();
        
        this.load();

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

        // COLLISION //
        for (let y = 0; y < this.collision.array.length; y++) {
            this.gridCollision[y] = [];
            this.gridObjects[y] = [];
            for (let x = 0; x < this.collision.array[y].length; x++) {
                const tile = this.collision.array[y][x];
                
                this.gridCollision[y][x] = (tile.hex === "#000000ff")
                if (this.gridCollision[y][x]) {
                    const o = new gameObject(new vec3(x*this.gridSize, y*this.gridSize, 0));
                    o.size = new vec3(this.gridSize, this.gridSize, this.gridSize);
                    o.collision = true;
                    this.gridObjects[y][x] = o;
                }
                
                if (tile.hex === "#ff0000ff") {
                    this.objects.push( new SpawnPoint(new vec3(x*this.gridSize, y*this.gridSize, 0+this.gridSize)) );
                }
            }
        }

        // TEXTURE //
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

                this.objects.push(new levelTile(location, adjacent, size, brightness));
            
            }
        }

        // front face main quad
        const width = this.texture.array[0].length * this.gridSize;
        const height = this.texture.array.length * this.gridSize;
        const adjacent = { up:true, down:true, left:true, right:true, front: false }
        
        // console.log(typeof this.texture.image)

        this.mainQuad = new levelTile(new vec3(0, 0, 0), adjacent, new vec3(width, height, 0), 1);
        this.mainQuad.faces.push(
            new Quad(this.mainQuad.getFaceVertecies("front"),
                this.texture.image)
        );
        
        this.mainQuad.faces[0].doCulling = false;
        this.mainQuad.faces[0].isMainQuad = true;
        this.mainQuad.isMainQuad = true;

        this.objects.push(this.mainQuad);

    }
    
    tick(deltaTime) {
        if (!this.loaded) return;

        for (const obj of this.objects) {
            if (!obj.ticking) continue;
            obj.tick(deltaTime, this);
        }
    }

    draw(ctx, camera, screen, player) {

        const w=screen.width
        const h=screen.height
        const fovRad = camera.fov * Math.PI/180;
        const f = w / (2 * Math.tan(fovRad/2));

        const resolution = 20; // camera snaps to a grid to reduce jittering of level when slowly
        // const cameraLoc = new vec3(
        //     Math.floor(camera.location.x*resolution)/resolution,
        //     Math.floor(camera.location.y*resolution)/resolution,
        //     Math.floor(camera.location.z*resolution)/resolution,
        // )
        const cameraLoc = camera.location
        
        const toDraw = {
            vertices: [],
            distance: [],
            brightness: [],
            order: [],
        }
        
        const objects = [...this.objects]
        if (player) objects.push(player)

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
            this.drawQuad(ctx, toDraw.vertices[o], toDraw.brightness[o], toDraw.distance[o])
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

    /*
    // Source - https://stackoverflow.com/a/44558286
    // Posted by Smuj Em, modified by community. See post 'Timeline' for change history
    // Retrieved 2026-03-18, License - CC BY-SA 4.0
    
    // Create a buffer element to draw based on the Image img
    const buffer = document.createElement('canvas');
    buffer.width = img.width;
    buffer.height = img.height;
    const btx = buffer.getContext('2d');
        
    // First draw your image to the buffer
    btx.drawImage(img, 0, 0);

    // Now we'll multiply a rectangle of your chosen color
    btx.fillStyle = '#FF7700';
    btx.globalCompositeOperation = 'multiply';
    btx.fillRect(0, 0, buffer.width, buffer.height);

    // Finally, fix masking issues you'll probably incur and optional globalAlpha
    btx.globalAlpha = 0.5;
    btx.globalCompositeOperation = 'destination-in';
    btx.drawImage(img, 0, 0);
    */

    drawQuad(ctx, vertices, brightness, distance) {
        function drawSubQuad(ctx, points, subQuadBrightness) {
            // console.log(brightness)
            const c = Math.floor(subQuadBrightness * 255);
            const colour = `rgb(${c}, ${c}, ${c})`;
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
        adjustedBrightness = Math.min(1, Math.max(0, adjustedBrightness));

        if (isTexture) {
            const x = Math.floor(vertices[0].x)
            const y = Math.floor(vertices[0].y)
            const width = Math.floor(vertices[2].x - x)
            const height = Math.floor(vertices[2].y - y)

            const key = `${texture.src} ${width} ${height} ${adjustedBrightness}`;

            const temp = this.tempScaledTextures.get(key);

            // logError(`quad dist: ${distance}`)
            // logError(`quad brightens: ${adjustedBrightness}`)

            if (temp) {

                ctx.drawImage(temp, x, y);

            } else {
                
                logError("new scaled texture")

                const canvas = document.createElement("canvas");
                canvas.width = width;
                canvas.height = height;
                const tempCtx = canvas.getContext("2d");
                tempCtx.imageSmoothingEnabled = false;
                tempCtx.drawImage(texture, 0, 0, width, height);
                tempCtx.fillStyle = `rgba(0, 0, 0, ${1 - adjustedBrightness})`;
                tempCtx.fillRect(0, 0, width, height);

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

    getCloseTo(obj) {
        const distance = obj.size.mult(3)
        const close = []
        const min = obj.getPoint().bl.sub(distance).div(this.gridSize)
        const max = obj.getPoint().tr.add(distance).div(this.gridSize)

        min.x = Math.min(this.gridObjects[0].length, Math.max(0, Math.floor(min.x)))
        max.x = Math.min(this.gridObjects[0].length, Math.max(0, Math.floor(max.x)))
        
        min.y = Math.min(this.gridObjects.length, Math.max(0, Math.floor(min.y)))
        max.y = Math.min(this.gridObjects.length, Math.max(0, Math.floor(max.y)))
        
        for (let y=min.y; y<max.y; y++) {
            for (let x=min.x; x<max.x; x++) {
                const o = this.gridObjects[y][x];
                if (o) close.push(o);
            }
        }

        return close;
    }

}

class Main {
    constructor() {
        this.loaded = false;

        this.settings = {
            dithering: true,
            colourScheme: 0,
        }

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
            location: new vec3(20,2,-4),
            fov: 70,
            maxQuadDist: 20
        };
        
        this.level = {
            main: new Level("test1", 0),
            second: new Level("test1", -15),
        };
        this.player = new Player(new vec3(0,0,0))

        this.levelLayer = "main"

        this.loadTextures();

        this.ui = new UiController(this);

        requestAnimationFrame(this.update.bind(this));

    }

    async loadTextures() {
        const texture = await loadImage(`./textures/vignette3.png`);
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

        for (const level of Object.values(this.level)) level.tick(this.deltaTime);

        this.player.tick(this.deltaTime, this.level[this.player.level])

        // move camera //

        const vel = new vec3(
            this.player.velocity.x / 6 * (this.player.isDashing? 1.2 : 1),
            0,//this.player.velocity.y / 30,
            this.player.velocity.z / 30
        )
        const diff = this.player.location
            .add(new vec3(0,1.5,0))
            .add(vel)
            .sub(this.camera.location)
            .div(8)
            .mult(this.deltaTime*60)

        this.camera.location.x += diff.x
        this.camera.location.y += diff.y
        // this.camera.fov = (this.player.isDashing? 71 : 70)
        this.camera.fov = Math.abs(this.player.velocity) > 5? 71 : 70

        // this.camera.location.x = obj.location.x
        // this.camera.location.y = obj.location.y+1.5

        this.ui.tick()
        
        this.draw();
        
        requestAnimationFrame(this.update.bind(this));
    // } catch (e) {logError(e);}
    }

    draw() {
        // this.ctx.fillStyle = `#111`
        this.ctx.fillStyle = `#000`
        this.ctx.fillRect(0, 0, this.screen.width, this.screen.height);

        if (this.level["second"] && this.level["second"].loaded) {
            this.level["second"].draw(this.ctx, this.camera, this.screen, this.player.level=="second"? this.player : undefined);
        }

        if (this.level["main"] && this.level["main"].loaded) {
            this.level["main"].draw(this.ctx, this.camera, this.screen, this.player.level=="main"? this.player : undefined);
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
        
        const colour = [
            {dark: {r:5, g:28, b:12}, light: {r:51, g:255, b:102}}, // #051c0c (Dark Forest Green) and #33ff66 (Terminal Green)
            {dark: {r:43, g:27, b:61}, light: {r:246, g:240, b:207}}, // #2b1b3d (Plum Purple) and #f6f0cf (Butter Yellow)
            {dark: {r:18, g:12, b:0}, light: {r:255, g:176, b:0}}, // #120c00 (Deep Brown-Black) and #ffb000 (Classic Amber)
            {dark: {r:15, g:26, b:44}, light: {r:238, g:242, b:247}}, // #0f1a2c (Dark Navy) and #eef2f7 (Ice White)
        ][this.settings.colourScheme];

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