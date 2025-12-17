import { logError, clearLog, vec3 } from "./other.js";
import { level1, level2, level2_alt } from "./levels.js";
import { gameTextures } from "./textures.js"
try {

class Quad {
    constructor(vertices, texture) {
        this.vertices3d = vertices
        this.distance = 0
        this.texture = texture
        this.doCulling = true
    }

    project2d(f, w, h, cameraLoc, offset) {
        let cullFace = true;
        const vertices2d = [];
        for (const point of this.vertices3d) {
            const translatedPoint = point.sub(cameraLoc).sub(offset);
            const projectedPoint = this.projectPoint(translatedPoint, f, w, h);

            vertices2d.push(projectedPoint)
            
            if (this.isOnScreen(projectedPoint, w, h)) cullFace = false;
        }
        if (cullFace && this.doCulling) return ["culled","culled","culled"]
        
        const center = this.vertices3d[0].add(this.vertices3d[2]).div(2);
        const distance = center.sub(cameraLoc).length();

        return [vertices2d, distance, this.texture]
    }

    isOnScreen(point, w, h) {
        return (
            point.x > 0 && point.x < w &&
            point.y > 0 && point.y < h
        );
    }

    projectPoint({x, y, z}, f, w, h) {
        let px = (x / z) * f + w/2;
        let py = (-y / z) * f + h/2;
        return new vec3(px, py, 0)
    }
}

class gameObject {
    constructor(location) {
        this.type = ""
        this.location = location
        this.collision = {
            up:true,
            down:true,
            left:true,
            right:true,
        };
        this.size = new vec3(1,1,1);
        this.collision = false;

        this.faces = []
    }
    
    getPoint() {
        const center = this.location.add(this.size.mult(-0.5));
        return {
            center: center,
            tl: this.location.add(new vec3(0,           this.size.y, 0)),
            bl: this.location,
            tr: this.location.add(new vec3(this.size.x, this.size.y, 0)),
            br: this.location.add(new vec3(this.size.x, 0,           0))
        }
    }
    getFaceVertecies(face) {
        switch(face) {
            case "front":
                return [
                    this.getPoint().tl,
                    this.getPoint().tr,
                    this.getPoint().br,
                    this.getPoint().bl,
                ];
            case "left":
                return [
                    this.getPoint().tl,
                    this.getPoint().tl.add(new vec3(0,0,1)),
                    this.getPoint().bl.add(new vec3(0,0,1)),
                    this.getPoint().bl,
                ];
            case "right":
                return [
                    this.getPoint().tr,
                    this.getPoint().tr.add(new vec3(0,0,1)),
                    this.getPoint().br.add(new vec3(0,0,1)),
                    this.getPoint().br,
                ];
            case "up":
                return [
                    this.getPoint().tl,
                    this.getPoint().tl.add(new vec3(0,0,1)),
                    this.getPoint().tr.add(new vec3(0,0,1)),
                    this.getPoint().tr,
                ];
            case "down":
                return [
                    this.getPoint().bl,
                    this.getPoint().bl.add(new vec3(0,0,1)),
                    this.getPoint().br.add(new vec3(0,0,1)),
                    this.getPoint().br,
                ];
            default:
                return [];
        }
    }

    isCollidingWith(obj) {
        // AABB collison - Axis-Aligned Bounding Box
        // If all axis colliding
        // Xcolliding: A_minX <= B_maxX && A_maxX >= B_minX
        // Ycolliding: A_minY <= B_maxY && A_maxY >= B_minY

        const objPoints = obj.getPoint()
        const objMax = {
            x: Math.max(objPoints.tl.x, objPoints.tr.x),
            y: Math.max(objPoints.tl.y, objPoints.bl.y)
        }
        const objMin = {
            x: Math.min(objPoints.tl.x, objPoints.tr.x),
            y: Math.min(objPoints.tl.y, objPoints.bl.y)
        }

        const thisPoints = this.getPoint()
        const thisMax = {
            x: Math.max(thisPoints.tl.x, thisPoints.tr.x),
            y: Math.max(thisPoints.tl.y, thisPoints.bl.y)
        }
        const thisMin = {
            x: Math.min(thisPoints.tl.x, thisPoints.tr.x),
            y: Math.min(thisPoints.tl.y, thisPoints.bl.y)
        }

        return (
            (objMin.x < thisMax.x && objMax.x > thisMin.x) &&
            (objMin.y < thisMax.y && objMax.y > thisMin.y)
        )
        return (
            (objMin.x <= thisMax.x && objMax.x >= thisMin.x) &&
            (objMin.y <= thisMax.y && objMax.y >= thisMin.y)
        )
    }
}

class levelTile extends gameObject {
    constructor(location, type, adjacent={up:false,down:false,left:false,right:false,front:false}, size=1) {
        super(location);

        this.adjacent = adjacent;
        this.type = type;
        this.texture = this.type;

        this.size = new vec3(size,size,size)

        this.collision = true
        if (adjacent.up && adjacent.down && adjacent.left && adjacent.right) this.collision = false

        if (!this.adjacent.left)  this.faces.push(new Quad(this.getFaceVertecies("left"), this.texture))
        if (!this.adjacent.right) this.faces.push(new Quad(this.getFaceVertecies("right"), this.texture))
        if (!this.adjacent.up)    this.faces.push(new Quad(this.getFaceVertecies("up"), this.texture))
        if (!this.adjacent.down)  this.faces.push(new Quad(this.getFaceVertecies("down"), this.texture))

    }

}

class Player extends gameObject {
    constructor(location) {
        super(location)
        this.type = "player";
        this.size = new vec3(0.5,1,0.5);
        this.texture = "player";
        this.ticking = true;
        
        this.faces.push(new Quad(this.getFaceVertecies("front"),this.texture))

        this.location.z += this.size.z/2

        this.pressedInputs = {
            up:   {keys:["w",],active:false},
            down: {keys:["s",],active:false},
            left: {keys:["a",],active:false},
            right:{keys:["d",],active:false},
            jump: {keys:[" ",],active:false},
            dash: {keys:["shift",],active:false},
        }
        document.addEventListener("keydown", (event) => {
            for (const input of Object.values(this.pressedInputs)) {
                const key = event.key.toLowerCase();
                if ( input.keys.includes(key) ) input.active = true;
            }
        });
        document.addEventListener("keyup", (event) => {
            for (const input of Object.values(this.pressedInputs)) {
                const key = event.key.toLowerCase();
                if ( input.keys.includes(key) ) input.active = false;
            }
        });

        this.jumpForce = 7;
        this.baseGravity = 0.5;
        this.jumpTime = 0;
        this.maxJumpTime = 170;

        this.cyoteTime = 0;
        this.maxCyoteTime = 200;
        
        this.velocity = new vec3(0, 0, 0);
        this.onFloor = false;

        this.acceleration = new vec3(0.1, 0, 0)
        this.deceleration = new vec3(0.5, 0, 0)
        this.maxVel = new vec3(6, Infinity, Infinity)

        this.justJumped = false;
        this.lastOnFloor = false;
    }
    
    tick(deltaTime, level) {
        /////////////////////
        // movement logic //
        ///////////////////
        const xInput = this.pressedInputs.right.active - this.pressedInputs.left.active
        
        // base acceleration
        let dx = xInput*this.acceleration.x

        // if switching direction switch faster
        if (Math.sign(xInput) != Math.sign(this.velocity)) {
            dx *= 5
        }

        if (!this.onFloor) {
            dx *= 0.6
        }

        this.velocity.x += dx
        this.velocity.x = Math.max(-this.maxVel.x, Math.min(this.maxVel.x, this.velocity.x))

        // if not moving decelerate
        if (dx === 0 && this.velocity.x !== 0) {
            let decelerate = this.deceleration.x
            if (!this.onFloor) decelerate *= 1.4
            if (this.velocity.x>0) this.velocity.x = Math.max(0, this.velocity.x - decelerate)
            if (this.velocity.x<0) this.velocity.x = Math.min(0, this.velocity.x + decelerate)
        }

        // if just hit floor decelerate
        if (this.onFloor && !this.lastOnFloor) {
            let decelerate = this.deceleration.x * 5
            if (this.velocity.x>0) this.velocity.x = Math.max(0, this.velocity.x - decelerate)
            if (this.velocity.x<0) this.velocity.x = Math.min(0, this.velocity.x + decelerate)
        }
        this.lastOnFloor = this.onFloor

        ////////////////////
        // jumping logic //
        //////////////////
        if (this.cyoteTime > this.maxCyoteTime) this.cyoteTime = 0
        if (this.cyoteTime > 0) this.cyoteTime += deltaTime * 1000
        else if (this.onFloor) this.cyoteTime = deltaTime * 1000
        else this.cyoteTime = 0
        
        // hold jump to go higher
        if (this.pressedInputs.jump.active && this.jumpTime > 0 && this.jumpTime < this.maxJumpTime) {
            this.velocity.y = this.jumpForce
            this.jumpTime += deltaTime * 1000
        } else {
            this.jumpTime = 0
        }
        
        // start jump
        const canJump = this.cyoteTime > 0 && !this.justJumped
        if (canJump && this.pressedInputs.jump.active) {
            this.jumpTime += deltaTime * 1000
            this.velocity.y = this.jumpForce
            this.cyoteTime = 0
            this.justJumped = true
        }
        
        if (!this.pressedInputs.jump.active) {
            this.justJumped = false
        }

        ////////////////////
        // gravity logic //
        //////////////////
        let gravity = this.baseGravity
        const threshold = 3;
        // increase gravity when falling
        if (!this.onFloor && this.velocity.y < -threshold) {gravity*=1.6; logError("gravity: high");}
        // decrease gravity at peak of jump
        else if (!this.onFloor && this.velocity.y < threshold) {gravity*=0.8; logError("gravity: low");}
        else {gravity = this.baseGravity; logError("gravity: normal")}

        this.velocity.y -= gravity

        logError(`justJumped:${this.justJumped} gravity:${gravity.toFixed(3)} on floor:${this.onFloor} jump time:${this.jumpTime.toFixed(3)}`)
        logError(`vy:${this.velocity.y.toFixed(3)} xy:${this.velocity.x.toFixed(3)}`)

        //////////////////////
        // collision logic //
        ////////////////////

        // x collisons
        this.location.x += this.velocity.x * deltaTime
        for (const obj of level) {
            if (!obj.collision) continue;
            if (!this.isCollidingWith(obj)) continue;

            if (this.velocity.x > 0) {
                const diff = obj.getPoint().bl.x - this.getPoint().br.x
                this.location.x += diff;
                this.velocity.x = 0;
            }
            else if (this.velocity.x < 0) {
                const diff = obj.getPoint().br.x - this.getPoint().bl.x
                this.location.x += diff;
                this.velocity.x = 0;
            }
        }

        // y collisions
        this.onFloor = false;
        this.location.y += this.velocity.y * deltaTime
        for (const obj of level) {
            if (!obj.collision) continue;
            if (!this.isCollidingWith(obj)) continue;

            if (this.velocity.y > 0) {
                const diff = obj.getPoint().bl.y - this.getPoint().tl.y
                this.location.y += diff;
                this.velocity.y = 0;
            }
            else if (this.velocity.y < 0) {
                const diff = obj.getPoint().tl.y - this.getPoint().bl.y
                this.location.y += diff;
                this.velocity.y = 0;
                this.onFloor = true;
            }
        }

        this.faces[0].vertices = this.getFaceVertecies("front")
    }
}

class Main {
    constructor() {
        this.deltaTime = 1
        this.lastTime = 0
        this.fps = 0

        this.frames = 0;
        this.nextSecond = 0;
        
        this.frameRateCap = 60;

        this.screen = {
            width: 192,
            height: 144,
            subscreen: {
                x: 0,
                y: 0,
                width: 192,
                height: 144,
            }
        };
        this.canvas = document.getElementById("gameCanvas");
        this.ctx = this.canvas.getContext("2d");
        
        this.level = {
            main:[],
            second:[]
        };
        this.levelLayer = "main"

        this.camera = {
            location: new vec3(20,2,-4),
            fov: 90,
        };

        requestAnimationFrame(this.update.bind(this));

    }

    // adds objects to the level from the 2d array
    generateLevel(level, layer) {
        level = level.reverse();
        const types = {"X":"wall", " ":"air", "s":"spawn", "w":"bg"}
        const solid = ["X","w"]
        const size = 0.4

        for (let y = 0; y < level.length; y++) {
            for (let x = 0; x < level[y].length; x++) {
                const type = types[level[y][x]] || "air";

                if (type === "spawn") this.level[layer].push(new Player(new vec3(x*size,y*size,0)))

                else if (type==="wall" || type==="bg") {

                    const up =    (y + 1 < level.length)    ? solid.includes(level[y + 1][x]) : false;
                    const down =  (y - 1 >= 0)              ? solid.includes(level[y - 1][x]) : false;
                    const left =  (x - 1 >= 0)              ? solid.includes(level[y][x - 1]) : false;
                    const right = (x + 1 < level[y].length) ? solid.includes(level[y][x + 1]) : false;

                    this.level[layer].push(new levelTile(
                        new vec3(x*size, y*size, 0),
                        type,
                        {
                            up, down, left, right,
                            front: false,
                        },
                        size
                    ));

                }
            }
        }
    }

    // runs every frame
    update(currentTime) {
    // try {
        clearLog()
        logError(`FPS: ${this.fps}`);
        
        this.deltaTime = (currentTime - this.lastTime) / 1000
        this.lastTime = currentTime

        this.frames++;
        if (this.nextSecond < currentTime) {
            this.fps = this.frames
            this.nextSecond = currentTime + 1000;
            this.frames = 0;
        };


        for (const obj of this.level[this.levelLayer]) {

            if (obj.ticking) obj.tick(this.deltaTime, this.level[this.levelLayer]);
            if (obj.type === "player") {
                this.camera.location.x = obj.location.x
                this.camera.location.y = obj.location.y+1.5
            }

        }

        

        
        this.draw();
        
        
        requestAnimationFrame(this.update.bind(this));
    // } catch (e) {logError(e);}
    }

    draw() {
        const bgColour = "1"
        this.ctx.fillStyle = `#${bgColour}${bgColour}${bgColour}`
        this.ctx.fillRect(0, 0, this.screen.width, this.screen.height);

        this.drawLevel(this.level["second"], 90, new vec3(0, 0, -10));
        
        this.drawLevel(this.level["main"], 90, new vec3(0, 0, 0));
        
        this.drawUi();
        
    }



    drawUi() {}

    drawLevel(level, fov, offset) {

        const w=this.screen.subscreen.width
        const h=this.screen.subscreen.height
        const fovRad = fov * Math.PI/180;
        const f = w / (2 * Math.tan(fovRad/2));
        
        const toDraw = {
            vertices: [],
            texture: [],
            distance: [],
            order: [],
        }
        
        for (const obj of level) {
            for (const face of obj.faces) {
                const [
                    face_vertices, 
                    face_distance, 
                    face_texture
                ] = face.project2d(f, w, h, this.camera.location, offset)
                
                if (face_vertices == "culled") continue;

                toDraw.vertices.push(face_vertices)
                toDraw.texture.push(face_texture)
                toDraw.distance.push(face_distance)
                toDraw.order.push(toDraw.order.length)
            }
        }
        
        toDraw.order.sort((a, b) => b - a)
        
        for (let i = 0; i < toDraw.order.length; i++) {
            const o = toDraw.order[i]
            this.drawQuad(toDraw.vertices[o], toDraw.texture[o], toDraw.distance[o])
        }
    }

    drawQuad(vertices, textureName, distance) {
        function drawSubQuad(ctx, points, colour) {
            ctx.beginPath();
            
            ctx.moveTo(Math.round(points[0].x), Math.round(points[0].y));
            for (let i=1; i < points.length; i++) {
                ctx.lineTo(Math.round(points[i].x), Math.round(points[i].y));
            }
            
            ctx.closePath();
            ctx.fillStyle = colour;
            ctx.fill();
            
        }
        
        const texture = gameTextures[textureName];
        const textureHeight = texture.length;
        const textureWidth = texture[0].length;
        
        // Bilinear interpolation formula
        //  P(u, v) = (1-u)(1-v) * P0
        //            + u(1-v)   * P1
        //            + u v      * P2
        //            + (1-u)v   * P3
        
        function interp(u, v) {
            return  (vertices[0].mult((1-u)*(1-v)))
            .add(vertices[1].mult(   u *(1-v)))
            .add(vertices[2].mult(   u *   v ))
            .add(vertices[3].mult((1-u)*   v ));
        }
        
		for (let y=0; y<textureHeight; y++) {
			for (let x=0; x<textureWidth; x++) {
                if (texture[y][x]===" ") continue

                const u0 = x / textureWidth;
                const v0 = y / textureHeight;
                const u1 = (x + 1) / textureWidth;
                const v1 = (y + 1) / textureHeight;
                
                const subPoints = [
                    interp(u0, v0),
                    interp(u1, v0),
                    interp(u1, v1),
                    interp(u0, v1),
                ];
                const colour = `#${texture[y][x]}${texture[y][x]}${texture[y][x]}`;
				drawSubQuad(this.ctx, subPoints, colour);
			}
		}
	}

}

const main = new Main();
main.generateLevel(level2, "main");
main.generateLevel(level2_alt, "second");

} catch (e) {logError(e);}