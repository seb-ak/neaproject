import { logError, vec3, Quad, loadImage } from "./utils.js";
import { MobileControlls } from "./mobileControlls.js";

export class gameObject {
    constructor(location) {
        this.type = ""
        this.location = location
        this.size = new vec3(1,1,1);
        this.collision = false;

        this.faces = []
    }

    getPoint() {
        const center = this.location.add(new vec3(this.size.x/2, this.size.y/2, 0));
        return {
            center: center,
            tl: this.location.add(new vec3(0,           this.size.y, 0)),
            bl: this.location.copy(),
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
        // return (
        //     (objMin.x <= thisMax.x && objMax.x >= thisMin.x) &&
        //     (objMin.y <= thisMax.y && objMax.y >= thisMin.y)
        // )
    }
}

export class levelTile extends gameObject {
    constructor(location, adjacent={up:false,down:false,left:false,right:false,front:false}, size=new vec3(1,1,1), brightness=1) {
        super(location);

        this.adjacent = adjacent;
        this.type = "levelTile";
        this.brightness = brightness;

        this.size = size

        this.collision = false
        if (adjacent.up && adjacent.down && adjacent.left && adjacent.right) this.collision = false

        if (!this.adjacent.left)  this.faces.push(new Quad(this.getFaceVertecies("left"), this.brightness))
        if (!this.adjacent.right) this.faces.push(new Quad(this.getFaceVertecies("right"), this.brightness))
        if (!this.adjacent.up)    this.faces.push(new Quad(this.getFaceVertecies("up"), this.brightness))
        if (!this.adjacent.down)  this.faces.push(new Quad(this.getFaceVertecies("down"), this.brightness))

    }

}

export class SpawnPoint extends gameObject {
    constructor(location, id) {
        super(location);
        this.size = new vec3(1, 1.5, 0);

        this.ticking = true;
        this.collision = false;
        
        this.type = "SpawnPoint"
        this.id = id;
        this.active = false

        this.brightness = 0.8

        this.faces = [
            new Quad(this.getFaceVertecies("front"), this.brightness)
        ];

        this.loaded = false;
        
        this.load();
    }

    async load() {
        this.textures = [
            await loadImage(`./textures/spawnPoint/active.png`),
            await loadImage(`./textures/spawnPoint/inactive.png`),
        ]
        this.loaded = true
        this.faces[0].brightness = this.textures[0].image
    }

    tick() {
        if (!this.loaded) return;
        if (this.active) {
            this.faces[0].brightness = this.textures[0].image
        } else {
            this.faces[0].brightness = this.textures[1].image
        }
    }
}


class physicsObject extends gameObject {

    constructor(location) {
        super(location)

        this.isPhysicsObject = true;

        this.health = 1;

        this.velocity = new vec3(0, 0, 0);
        this.deceleration = new vec3(0.1, 0.1, 0.1);
        this.isOnFloor = false;
        this.baseGravity = 0.5;

        this.doesPlatformVelocity = false;
        this.platformVelocity = new vec3(0, 0, 0);
        
        this.invincibleTime = 0;
        this.maxInvincibleTime = 800;

        this.firstCheckDirection = "y"

        this.bounce = 0
    }

    damage(amount, type="emeny") {

        if (this.killedBoss) return;
        
        if (this.invincibleTime <= 0) {
            this.health -= amount
            this.invincibleTime = this.maxInvincibleTime
        }

    }

    resolveX(obj) {
        if (!obj.collision) return;
        if (!this.isCollidingWith(obj)) return;

        const thisCenter = this.getPoint().center
        const objCenter = obj.getPoint().center

        const overlap = new vec3(
            (this.size.x/2 + obj.size.x/2) - Math.abs(thisCenter.x - objCenter.x),
            (this.size.y/2 + obj.size.y/2) - Math.abs(thisCenter.y - objCenter.y)
        )
        if (overlap.x <= 0.001 || overlap.y <= 0.001) return;
        
        overlap.x += 0.001

        const dir = (thisCenter.x < objCenter.x) ? -1 : 1
        this.location.x += overlap.x * dir
        this.velocity.x = -this.velocity.x * this.bounce;

        if (dir==1) this.collidingSides.right = true;
        if (dir==-1) this.collidingSides.left = true;

        if (this.doesPlatformVelocity) {
            if (obj.isPhysicsObject) this.touchingPhysicsObjects.push(obj)//this.platformVelocity = obj.velocity
            // else this.platformVelocity = new vec3(0, 0, 0);
        }

        if (obj.type == "player") {
            const damage = this.attackType.contactDamage;
            if (damage) obj.damage(damage);
        }
    }
    resolveY(obj) {
        if (!obj.collision) return;
        if (!this.isCollidingWith(obj)) return;
        const thisCenter = this.getPoint().center
        const objCenter = obj.getPoint().center

        const overlap = new vec3(
            (this.size.x/2 + obj.size.x/2) - Math.abs(thisCenter.x - objCenter.x),
            (this.size.y/2 + obj.size.y/2) - Math.abs(thisCenter.y - objCenter.y)
        )
        if (overlap.x <= 0.001 || overlap.y <= 0.001) return;

        overlap.y += 0.001

        const dir = (thisCenter.y < objCenter.y) ? -1 : 1
        this.location.y += overlap.y * dir
        this.velocity.y = -this.velocity.y * this.bounce;
        if (dir === 1) this.isOnFloor = true;

        if (dir==1) this.collidingSides.bottom = true;
        if (dir==-1) this.collidingSides.top = true;

        if (this.doesPlatformVelocity) {
            if (obj.isPhysicsObject) this.touchingPhysicsObjects.push(obj)//this.platformVelocity = obj.velocity
            // else this.platformVelocity = new vec3(0, 0, 0);
        }
        // if (this.type==="player") console.log(this.isOnFloor, this.velocity.y)

        if (obj.type == "player") {
            const damage = this.attackType.contactDamage;
            if (damage) obj.damage(damage);
        }
    }
    doY(velocity, deltaTime, steps, player) {
        this.location.y += (velocity.y * deltaTime) / steps;
        for (const obj of this.collisionObjects) {
            this.resolveY(obj);
        }
        if (this.isCollidingWith(player) && this != player) {
            player.firstCheckDirection = "y";
        }
    }
    doX(velocity, deltaTime, steps, player) {
        this.location.x += velocity.x * deltaTime / steps;
        for (const obj of this.collisionObjects) {
            this.resolveX(obj);
        }
        if (this.isCollidingWith(player) && this != player) {
            player.firstCheckDirection = "x";
        }
    }
    doCollision(deltaTime, level, logs=false) {
        this.collisionObjects = this.getCollisionObjects(level);

        const velocity = this.velocity.add(this.platformVelocity);
        const steps = Math.ceil(Math.max(
            Math.abs(velocity.x * deltaTime) / level.gridSize,
            Math.abs(velocity.y * deltaTime) / level.gridSize
        ))
        
        if (logs) logError(`${this.type} collisions: ${this.collisionObjects.length}`)
        // logError(`${this.type} movement steps: ${steps}`)
        
        this.touchingPhysicsObjects = [];
        this.isOnFloor = false;
        this.collidingSides = {left:false, right:false, top:false, bottom:false}

        for (let i=0; i<steps; i++) {

            if (this.firstCheckDirection === "y") {
                this.doY(velocity, deltaTime, steps, level.player);
                this.doX(velocity, deltaTime, steps, level.player);
            } else {
                this.doX(velocity, deltaTime, steps, level.player);
                this.doY(velocity, deltaTime, steps, level.player);
            }

        }

        if (this.collidingSides.left && this.collidingSides.right) this.health = 0;
        if (this.collidingSides.top && this.collidingSides.bottom) this.health = 0;

        const obj = this.touchingPhysicsObjects[0];
        if (obj) {
            this.platformVelocity = obj.velocity//.sub(new vec3(0,-0.1));
            // if (this.platformVelocity.y < 0) this.platformVelocity.y -= this.baseGravity - 2
        }
        else this.platformVelocity = new vec3(0, 0, 0);

        if (this.type === "player") this.firstCheckDirection = "y"
    }
    checkCollisions(objects) {
        for (const obj of objects) {
            if (!obj.collision) continue;
            if (this.isCollidingWith(obj)) return true;
        }
        return false;
    }

    getCollisionObjects(level) {
        const chunkData = level.getChunksData(this.location, 1)
        const o = [...chunkData.object
            .filter( obj => (
                obj !== this && obj.collision &&
                (obj.type != "platform" ||
                    (
                        (obj.location.y+obj.size.y*0.9) <= this.location.y && 
                        (this.velocity.y + this.platformVelocity.y - obj.velocity.y) <= 0 // had to add + this.platformVelocity.y 
                    )
                )
            )),
            ...chunkData.collision
        ]
        if (this.type !== "player") o.push(level.player)
        // console.log("close:  ",level.getCloseTo(this), "objwithcollison: ",level.objectsWithCollision)
        return o
    }

}


export class Player extends physicsObject {
    constructor(location) {
        super(location)
        this.initialSpawn = true;
        this.spawnPoint = undefined;
        this.levelID = "main";

        this.deaths = 0;

        this.type = "player";
        this.size = new vec3(0.5,1,0.5);
        this.brightness = 1;
        this.ticking = true;

        this.collision = true;
        
        this.faces.push(new Quad(this.getFaceVertecies("front"), this.brightness))

        this.location.z += this.size.z/2

        this.pressedInputs = {
            up:    {keys:["KeyW","ArrowUp"],active:false},
            down:  {keys:["KeyS","ArrowDown"],active:false},
            left:  {keys:["KeyA","ArrowLeft"],active:false},
            right: {keys:["KeyD","ArrowRight"],active:false},
            jump:  {keys:["Space","ControlRight","Digit0","Insert"],active:false},
            // dash:  {keys:["Shift",],active:false},
            select:{keys:["KeyE","Enter"],active:false},
        }
        new MobileControlls(this.pressedInputs)
        document.addEventListener("keydown", (event) => {
            for (const input of Object.values(this.pressedInputs)) {
                const key = event.code;
                if ( input.keys.includes(key) ) input.active = true;
            }
        });
        document.addEventListener("keyup", (event) => {
            for (const input of Object.values(this.pressedInputs)) {
                const key = event.code;
                if ( input.keys.includes(key) ) input.active = false;
            }
        });


        this.crouchHeight = 0.4;
        this.baseHeight = 1;
        this.isCrouching = false;
        this.isSliding = false;

        this.jumpForce = 11.2;
        this.baseGravity = 0.5;
        this.jumpTime = 0;
        this.maxJumpTime = 210;

        this.cyoteTime = 0;
        this.maxCyoteTime = 200;
        
        this.velocity = new vec3(0, 0, 0);
        this.platformVelocity = new vec3(0, 0, 0);
        this.isOnFloor = false;

        this.acceleration = new vec3(0.25, 0, 0)
        this.deceleration = new vec3(0.14, 0, 0)
        this.maxVel = new vec3(6, 20, Infinity)

        this.justJumped = false;
        this.lastOnFloor = false;

        this.dashFacingVector = new vec3(0, 0, 0)
        this.canDash = false;
        this.dashForce = 10;
        this.isDashing = false;
        this.dashTime = 0;
        this.maxDashTime = 300;

        this.facingRotation = 0;
        this.facingVector = new vec3(1,0,0);
        
        this.doesPlatformVelocity = true;

        this.selectHoldTime = 0;

        this.activeSpawn = undefined;

        this.maxHealth = 1;

        this.teleportTransition = 0;
        this.teleportTransitionSpeed = 1;
        this.teleportDirection = 0;


        this.secondAcceleration = 2.0
        this.secondDeceleration = 3.0
        this.secondStartBoostMultiplyer = 20
        this.secondStartBoostDeadzone = 1.5
        this.secondMaxVelocity = new vec3(5, 5, 0)

        this.hasDoubleJump = true;
        this.doubleJumpForce = 17;

        this.startSlideSpeed = this.maxVel.x - 0.4

        this.inBossFight = false;

        this.unlocks = {
            doubleJump: false,
            dash: false,
            slide: false,
            
            slideAttack: false,
            slamAttack: false,
            
            hat: false,

            key1: false,
            key2: false,
            key3: false,
            key4: false,
        }
        this.keysNeeded = 2;

        this.topTextTime = -1
        this.topText = ""
        this.topTextMaxTime = 30

        this.bottomTextTime = -1
        this.bottomText = ""
        this.bottomTextMaxTime = 8

        this.startingSpawnpoint = 0

        const urlParams = new URLSearchParams(window.location.search);
        const spawnParam = urlParams.get('spawn');
        if (spawnParam && !isNaN(parseInt(spawnParam))) {
            this.startingSpawnpoint = parseInt(spawnParam)
        }

        if (this.startingSpawnpoint == 0) {
            this.topTextTime = 0
            this.topText = "Hold jump to jump higher.  Tap for less height.  S to crouch"
            this.topTextMaxTime = 30
        }
        if (this.startingSpawnpoint > 1) this.unlocks.doubleJump = true
        if (this.startingSpawnpoint > 2) this.unlocks.dash = true
        if (this.startingSpawnpoint > 3) this.unlocks.slide = true
        
    }
    
    countKeys() {
        let count = 0
        if (this.unlocks.key1) count++
        if (this.unlocks.key2) count++
        if (this.unlocks.key3) count++
        if (this.unlocks.key4) count++
        // console.log(`keys: ${count}`)
        return count
    }

    spawn(level) {

        this.health = this.maxHealth;

        this.deathTimer = -1;

        this.velocity = new vec3(0, 0, 0);
        this.platformVelocity = new vec3(0, 0, 0);
        this.collidingSides = { left:false, right:false, top:false, bottom:false };
        this.isOnFloor = false;
        this.jumpTime = 0;
        this.cyoteTime = 0;
        this.justJumped = false;
        this.isDashing = false;
        this.dashTime = 0;

        this.inBossFight = false;

        this.invincibleTime = this.maxInvincibleTime;

        if (this.activeSpawn == undefined) {
            for (const obj of level.getChunksData().object) {
                if (obj.type !== "SpawnPoint") continue;
                if (obj.id != this.startingSpawnpoint) continue;
                obj.active = true;
                this.activeSpawn = { location: obj.location, levelID: level.levelID, object: obj };
                break;
            }
            return;
        }

        this.location = this.activeSpawn.location.copy()
        this.levelID = this.activeSpawn.levelID
        this.teleportTransition = (this.activeSpawn=="main")? 0:1

        this.updateFaces();
    }

    doInputs(deltaTime, logs = false) {
        this.xInput = this.pressedInputs.right.active - this.pressedInputs.left.active
        this.yInput = this.pressedInputs.up.active - this.pressedInputs.down.active
        const deadzone = 0.2
        if (Math.abs(this.xInput) < deadzone) this.xInput = 0
        if (Math.abs(this.yInput) < deadzone) this.yInput = 0

        if(this.xInput!==0 || this.yInput!==0) {
            this.facingVector = new vec3(this.xInput, this.yInput, 0).normalise()
            this.facingRotation = Math.atan2(this.yInput, this.xInput);
        }

        // select button
        if (this.pressedInputs.select.active) {
            if (this.selectHoldTime != -1) this.selectHoldTime += deltaTime;
        } else {
            this.selectHoldTime = 0;
        }


        if (this.teleportDirection == 0) {

            if (this.levelID === "main") {
                
                this.inputMode = "main"
                this.mainLevelInputs(deltaTime, logs)
            
            } else if (this.levelID === "second") {

                this.inputMode = "second"
                this.secondLevelInputs(deltaTime, logs)

            } else this.inputMode = "none"

        }
        
        // if (this.levelID === "second") this.secondLevelInputs(deltaTime)

    }

    mainLevelInputs(deltaTime, logs = false) {

        this.bounce = 0

        // press crouch when in air all velocity transferred to down and ground slam

        if (logs) logError(`facing rotation: ${this.facingRotation.toFixed(3)} facing vector: x:${this.facingVector.x.toFixed(3)} y:${this.facingVector.y.toFixed(3)}`)
        
        // base acceleration
        let dx = this.xInput*this.acceleration.x
        if (this.isDashing) {
            dx = 0
        } else if (this.isSliding) {
            dx *= 0.0
        } else if (this.isCrouching) {
            dx *= 0.4
        }

        // if switching direction switch faster
        if (Math.sign(this.xInput) != Math.sign(this.velocity.x)) {
            dx *= 2
        }

        if (!this.isOnFloor) {
            dx *= 0.6
        }
        dx *= deltaTime * 144

        let maxVel = this.maxVel
        if (this.isCrouching) maxVel = maxVel.mult(0.4)

        if (dx > 0) { if (this.velocity.x + dx > maxVel.x) dx = Math.max(0, maxVel.x - this.velocity.x) }
        else if (dx < 0) { if (this.velocity.x + dx < -maxVel.x) dx = Math.min(0, -maxVel.x - this.velocity.x) }
        if (logs) logError(`dx: ${dx.toFixed(3)}`)
        this.velocity.x += dx

        // this.velocity.x = Math.max(-this.maxVel.x, Math.min(this.maxVel.x, this.velocity.x))


        // deceleration 
        
        // if not moving decelerate
        if (dx === 0 && this.velocity.x !== 0 && !this.isDashing) {
            let decelerate = this.deceleration.x * deltaTime * 144
            if (this.isSliding) decelerate *= 0.1
            else if (!this.isOnFloor) decelerate *= 1.4

            if (this.velocity.x>0) this.velocity.x = Math.max(0, this.velocity.x - decelerate)
            if (this.velocity.x<0) this.velocity.x = Math.min(0, this.velocity.x + decelerate)
        }

        // if just hit floor decelerate
        if (this.isOnFloor && !this.lastOnFloor) {
            let decelerate = this.deceleration.x * 5
            if (this.isSliding) decelerate = -1

            if (this.velocity.x>0) this.velocity.x = Math.max(0, this.velocity.x - decelerate)
            if (this.velocity.x<0) this.velocity.x = Math.min(0, this.velocity.x + decelerate)
        }
        this.lastOnFloor = this.isOnFloor

        ////////////////////
        // jumping logic //
        //////////////////
        if (this.cyoteTime > this.maxCyoteTime) this.cyoteTime = 0
        if (this.cyoteTime > 0) this.cyoteTime += deltaTime * 1000
        else if (this.isOnFloor) this.cyoteTime = deltaTime * 1000
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

            this.cyoteTime = 0
            this.justJumped = true
        
            if (this.isSliding) { // sliding jump logic

                const direction = Math.sign(this.velocity.x);
                const magnitude = this.jumpForce + this.velocity.length() * 2;
                
                this.velocity = new vec3(
                    direction * magnitude * 0.4,
                    magnitude * 0.6,
                    0
                ); // most of velocity directed upwards

            } else { // normal jump logic
                
                this.jumpTime += deltaTime * 1000
                this.velocity.y = this.jumpForce
    
                if (this.isCrouching) {
                    this.jumpTime = 0;
                }

            }
        }
        
        if (!this.pressedInputs.jump.active) {
            this.justJumped = false
        }

        //////////////////
        // Double jump //
        ////////////////

        let vec = new vec3(this.xInput, this.yInput)
        if (vec.x == 0 && vec.y == 0) vec = new vec3(0, 1);
        else if (Math.abs(vec.x) > Math.abs(vec.y)) vec.y = 0;
        else if (Math.abs(vec.y) > Math.abs(vec.x)) vec.x = 0;

        this.dashFacingVector = vec.normalise();

        // dash
        if (this.isDashing) this.dashTime += deltaTime * 1000
        if (this.dashTime > this.maxDashTime || this.velocity.x == 0) {
            this.isDashing = false;
            this.dashTime = 0;
        }

        // start double jump
        const canDoubleJump = !this.justJumped && this.hasDoubleJump 
        if (canDoubleJump && this.pressedInputs.jump.active) {
            this.hasDoubleJump = false;

            if (this.canDash && !this.isCrouching) {
                this.canDash = false;
                this.jumpTime = 0;

                if (this.dashFacingVector.y == 0) { // sideways

                    if (this.unlocks.dash) {
                        this.isDashing = true;
                        const dashVector = this.dashFacingVector.mult(this.dashForce);
                        this.velocity = dashVector;
                    }

                } else if (this.dashFacingVector.y > 0) { // up

                    if (this.unlocks.doubleJump) {
                        const direction = Math.sign(this.velocity.x)
                        this.velocity.y = this.doubleJumpForce;
                        this.velocity.x += direction * this.doubleJumpForce * 0.1;
                    }

                } else { // down

                    this.velocity.y = -this.velocity.length() - this.doubleJumpForce;
                    this.velocity.x = 0;
                    this.justJumped = true;
                }
            }
        } else if (this.isOnFloor) {
            this.canDash = true;
            this.hasDoubleJump = true;
        }

        if (logs) logError(`dashing: ${this.isDashing}`)
        


        ////////////////////
        // gravity logic //
        //////////////////
        let gravity = this.baseGravity
        const threshold = 3;
        if (this.isDashing) { // no gravity when dashing
            gravity = 0;
            if (logs) logError("gravity: none");
        }        
        else if (!this.isOnFloor && this.velocity.y < -threshold) { // increase gravity when falling
            gravity*=1.2;
            if (logs) logError("gravity: high");
        }
        else if (!this.isOnFloor && this.velocity.y < threshold) { // decrease gravity at peak of jump
            gravity*=0.3;
            if (logs) logError("gravity: low");
        }
        else {
            gravity = this.baseGravity;
            if (logs) logError("gravity: normal")
        }

        this.velocity.y -= gravity * deltaTime * 144

        if (logs) logError(`gravity:${gravity.toFixed(3)}`)

    }

    secondLevelInputs(deltaTime, logs = false) {

        this.bounce = 0.8

        this.size.y = this.size.x

        const movementVector = new vec3(this.xInput, this.yInput).normalise()

        // const acceleration = (Math.abs(this.velocity.length()) < this.secondStartBoostDeadzone) ?
        //     this.secondAcceleration * this.secondStartBoostMultiplyer : this.secondAcceleration

        this.velocity = this.velocity.add(movementVector.mult(deltaTime * this.secondAcceleration))

        this.velocity.x = Math.max(-this.secondMaxVelocity.x, Math.min(this.secondMaxVelocity.x, this.velocity.x))
        this.velocity.y = Math.max(-this.secondMaxVelocity.y, Math.min(this.secondMaxVelocity.y, this.velocity.y))

        if (movementVector.x == 0) {
            if (this.velocity.x > 0) this.velocity.x = Math.max(0, this.velocity.x - deltaTime * this.secondDeceleration)
            if (this.velocity.x < 0) this.velocity.x = Math.min(0, this.velocity.x + deltaTime * this.secondDeceleration)
        }
        if (movementVector.y == 0) {
            if (this.velocity.y > 0) this.velocity.y = Math.max(0, this.velocity.y - deltaTime * this.secondDeceleration)
            if (this.velocity.y < 0) this.velocity.y = Math.min(0, this.velocity.y + deltaTime * this.secondDeceleration)
        }

        if (logs) logError(`${this.velocity.x} ${this.velocity.y}`)

    }

    tryCrouch() {
        
        // crouch and sliding
        if (this.isOnFloor && this.yInput < 0 && this.size.y != this.crouchHeight) { // try crouch
            this.size.y = this.crouchHeight;
            
            const colliding = this.checkCollisions(this.collisionObjects);
            if (colliding) { // cant crouch
                this.size.y = this.baseHeight;
            } else {// start crouch
                this.isCrouching = true;
                const speed = this.velocity.length()
                if (this.unlocks.slide && speed >= this.startSlideSpeed && this.xInput != 0) {
                    const direction = Math.sign(this.velocity.x)
                    this.velocity.x = direction * speed * 1.4
                    this.isSliding = true
                }
            }
        } else if ( this.jumpTime==0 && this.yInput >= 0 && this.size.y != this.baseHeight ) { // try uncrouch
            this.size.y = this.baseHeight;
            
            const colliding = this.checkCollisions(this.collisionObjects);
            if (colliding) { // cant uncrouch
                this.size.y = this.crouchHeight;
            } else { // stop crouching
                this.isCrouching = false;
                this.isSliding = false;
            }

        }
        if (this.isCrouching && this.isSliding && Math.abs(this.velocity.x) < 1) {
            this.isSliding = false;
        }
    }

    updateFaces(visible=true) {
        if (visible) {
            this.faces[0].vertices3d = this.getFaceVertecies("front");
        } else {
            this.faces[0].vertices3d = [
                new vec3(0,0,0),new vec3(0,0,0),new vec3(0,0,0),new vec3(0,0,0)
            ];
        }
    }

    portalTeleport(deltaTime) {

        this.teleportTransition = Math.min(1, Math.max(0,
            this.teleportTransition + this.teleportDirection * deltaTime * this.teleportTransitionSpeed
        ))

        const distance = 15
        if (this.teleportDirection == 1) { // back to front //
            this.location.z = distance - distance * this.teleportTransition + 0.3
        } else { // front to back //
            this.location.z = - distance * this.teleportTransition + 0.3
        }

        if (this.teleportTransition == 0 || this.teleportTransition == 1) {
            this.teleportDirection = 0
        }
        // console.log(this.teleportDirection, this.teleportTransition, this.location.z)

    }

    unlock(item) {
        this.unlocks[item] = true;
        // console.log(`unlocked ${item}`);

        if (item == "door") {
            this.topTextTime = this.topTextMaxTime - 8;
            if (this.countKeys() >= this.keysNeeded) this.topText = "door unlocked";
            else this.topText = `need ${Math.max(0, this.keysNeeded-this.countKeys())} more keys to unlock the door`;
            return
        }

        const itemText = {
            doubleJump: "Hold UP and tap JUMP in the air",
            dash: "Hold LEFT or RIGHT and tap JUMP in the air",
            slide: "Hold crouch whilst running to slide, also jump when sliding",
            // slideAttack: "",
            // slamAttack: "",
            hat: "Wow nice hat",
            // key1: "key 1 found",
            // key2: "key 2 found",
            // key3: "key 3 found",
            // key4: "key 4 found",
        }

        if (Object.keys(itemText).includes(item)) {
            this.topTextTime = 0;
            this.topText = itemText[item];;
        }
        
        if (item.substring(0,3) == "key") {
            this.bottomTextTime = 0;
            this.bottomText = `picked up a key`;
        } else {
            this.bottomTextTime = 0;
            this.bottomText = `unlocked ${item}`;
        }

    }

    tick(deltaTime, level) {
        const logs = false;
        
        if (!level.loaded) return;
        if (this.initialSpawn) {this.spawn(level); this.initialSpawn = false;}

        if (this.topTextTime != -1) this.topTextTime += deltaTime// * 1000;
        if (this.bottomTextTime != -1) this.bottomTextTime += deltaTime// * 1000;
        if (this.topTextTime >= this.topTextMaxTime) this.topTextTime = -1;
        if (this.bottomTextTime >= this.bottomTextMaxTime) this.bottomTextTime = -1;

        
        // death
            if (this.health <= 0 && this.deathTimer == -1) {this.deathTimer = 2000; this.deaths++}
            if (this.deathTimer != -1) this.deathTimer -= deltaTime * 1000;
            if (this.deathTimer != -1 && this.deathTimer <= 0) this.spawn(level);

            this.invincibleTime -= deltaTime * 1000

            if (this.deathTimer != -1) { this.updateFaces(false); return; }

        // movement
            this.collisionObjects = this.getCollisionObjects(level);

            if (this.teleportDirection != 0) this.portalTeleport(deltaTime)
            else this.doInputs(deltaTime, logs);
            
            this.doCollision(deltaTime, level);
            if (this.inputMode == "main") this.tryCrouch();

        // damage
            for (const obj of this.touchingPhysicsObjects) {
                const attack = obj.attackType
                if (attack && attack.contactDamage > 0) this.damage(attack.contactDamage)
            }
            if (this.location.y < -10) this.damage(1)

        // SpawnPoints
            const objects = level.getChunksData(this.location, 1)
                .object.filter(o => o.type == "SpawnPoint");
            
            for (const obj of objects) {
                if (obj.active) continue;
                if (!this.isCollidingWith(obj)) continue;

                this.activeSpawn.object.active = false;
                obj.active = true;
                
                this.activeSpawn = { location: obj.location, levelID: level.levelID, object: obj };

                this.bottomText = "Checkpoint reached"
                this.bottomTextTime = 0

                // console.log("new spawnpoint unlocked")
            }


        // debug
            if (logs) logError(`justJumped:${this.justJumped} on floor:${this.isOnFloor} jump time:${this.jumpTime.toFixed(3)}`)
            if (logs) logError(`vy:${this.velocity.y.toFixed(3)} vx:${this.velocity.x.toFixed(3)}`)
            if (logs) logError(`location:  x:${this.location.x.toFixed(3)} y:${this.location.y.toFixed(3)} z:${this.location.z.toFixed(3)}`)
            if (logs) logError(`platform vy:${this.platformVelocity.y.toFixed(3)} xy:${this.platformVelocity.x.toFixed(3)}`)

        this.updateFaces()
    }

}

export class Enemy extends physicsObject {

    constructor(location, data) {
        super(location);
        this.location.z -= 0.5

        this.type = "enemy";

        this.enemyType = "goomba"
        this.size = new vec3(0.6,0.6,1);
        this.brightness = 1;
        this.ticking = true;
        
        const face = new Quad(this.getFaceVertecies("front"), this.brightness)
        face.doCulling = false
        this.faces.push(face)

        this.location.z += this.size.z/2
        
        this.isOnFloor = false;

        this.facingVector = new vec3(-1,0,0);
        this.baseGravity = 0.5;
        this.jumpForce = 15;

        this.health = 1;

        this.speed = 120;

        this.collision = true;

        this.doesPlatformVelocity = true;

        this.jumpCooldown = 0;

        this.attackType = {
            contactDamage: 1,
        }

        this.movementType = {
            goomba: false,
            chase: false,
            jump: false,
        }

        this.setType(data)

        this.load();
    }

    async load() {
        this.faces[0].brightness = (await loadImage(`./textures/enemies/enemy1.png`)).image;
        this.loaded = true
    }


    setType(data) {

        if (data == "200") {
            this.size.x += 0.5
            this.movementType.goomba = true
        } else if (data === "210") {
            this.size.x += 0.1
            this.size.y += 0.5
            this.movementType.chase = true
        } else if (data === "220") {
            this.movementType.goomba = true
            this.movementType.jump = true
        } else if (data === "230") {
            this.size.x += 0.1
            this.movementType.chase = true
            this.movementType.jump = true
        }
    }

    tick(deltaTime, level) {
        if (!level.loaded) return;

        if (this.health > 0) this.movementLogic(deltaTime, level);
        else {
            
            if (this.velocity.x>0) this.velocity.x = Math.max(0, this.velocity.x - this.deceleration.x)
            else if (this.velocity.x<0) this.velocity.x = Math.min(0, this.velocity.x + this.deceleration.x)
        
            if (this.velocity.y>0) this.velocity.y = Math.max(0, this.velocity.y - this.deceleration.y)
            else if (this.velocity.y<0) this.velocity.y = Math.min(0, this.velocity.y + this.deceleration.y)
        
        }
        this.velocity.y -= this.baseGravity * deltaTime * 144


        this.doCollision(deltaTime, level);

        this.faces[0].vertices3d = this.getFaceVertecies("front");
    }

    movementLogic(deltaTime, level) {
        if (!this.isOnFloor) return;

        const playerLoc = level.player.getPoint().center
        const thisLoc = this.getPoint().center

        const vec = playerLoc.sub(thisLoc)

        if (this.movementType.goomba) {

            if (this.velocity.x === 0) this.facingVector = this.facingVector.mult(-1)
            this.velocity.x = this.facingVector.x * this.speed * deltaTime
        
        }
        if (this.movementType.chase) {

            this.facingVector = new vec3(Math.sign(vec.x), 0, 0)
            this.velocity.x = this.facingVector.x * this.speed * deltaTime

        }
        this.jumpCooldown -= deltaTime * 1000
        if (this.movementType.jump && this.jumpCooldown <= 0) {

            const playerAbove = vec.y < 2 && vec.y > 0.5 && Math.abs(vec.x) < 4

            if (this.isOnFloor && (playerAbove)) {
                this.velocity.y = this.jumpForce
                this.jumpCooldown = 4500
            }

        }

    }

}

export class BossChase extends physicsObject {
    constructor(positions) {
        const size = new vec3(9,9,5)

        positions = positions.map(p => new 
            vec3(p.x-size.x/2, p.y-size.y/2, p.z-2)
        )
        positions.push(new vec3(0, 0, -200))

        super(positions[0].copy());
        
        this.positions = positions;
        this.speed = 1;
        this.targetPositionIndex = 1;
        this.lastDiff = undefined
        this.ticking = true;

        this.type = "bossChase";

        this.size = size;

        this.collision = true;
        this.baseGravity = 0;

        this.speed = 0;
        this.changeSpeedTime = 0;

        this.brightness = 0.9;
        this.faces.push(new Quad(this.getFaceVertecies("front"), this.brightness))

        this.faces.push(new Quad(this.getFaceVertecies("up"), this.brightness))
        this.faces.push(new Quad(this.getFaceVertecies("down"), this.brightness))

        this.faces.push(new Quad(this.getFaceVertecies("right"), this.brightness))
        this.faces.push(new Quad(this.getFaceVertecies("right"), 0.28))
        this.faces.push(new Quad(this.getFaceVertecies("right"), this.brightness))

        this.faces.push(new Quad(this.getFaceVertecies("left"), this.brightness))
        this.faces.push(new Quad(this.getFaceVertecies("left"), 0.28))
        this.faces.push(new Quad(this.getFaceVertecies("left"), this.brightness))

        for (const f of this.faces) {
            f.doCulling = false;
        }

        this.updateFaces();

        this.attackType = {
            contactDamage: 99,
        }

        this.ignoreChunks = true;

        this.moving = false;

        this.load();
    }

    async load() {
        this.faces[0].brightness = (await loadImage(`./textures/enemies/boss/chase.png`)).image;
        this.loaded = true
    }

    tick(deltaTime, level, logs=false) {
        if (!level.loaded) return;
        
        if (level.player.deathTimer != -1) {
            this.targetPositionIndex = 1;
            this.location = this.positions[0].copy();
            this.speed = 0;
            this.moving = false;
            this.changeSpeedTime = 0;
            return
        }

        const distance = level.player.location.sub(this.location).length()
        // console.log(distance)
        
        if (logs) logError(`${this.location.x.toFixed(2)} ${this.location.y.toFixed(2)} ${this.location.z.toFixed(2)},  ${this.speed}`)

        if (this.changeSpeedTime <= 0) {
            if (!this.moving && distance < 20 && level.player.isOnFloor) {
                this.moving = true;
                this.changeSpeedTime = 0.4;
                this.speed = 0;
                // console.log("moving")
            }
            else if (this.moving && this.speed == 0) this.speed = 4;
            // else if (this.moving && distance < 15) this.speed = 6;
            // else if (this.moving && distance < 20) this.speed = 7;
            // else if (this.moving && this.speed != 0) this.speed = 15;
            else if (this.moving) {
                const distance = level.player.getPoint().center.sub(this.getPoint().center).length()
                // this.speed = Math.max(level.player.maxVel.x, level.player.velocity.length()/2);
                this.speed = Math.max(level.player.maxVel.x-2, distance/1.5);
            }
            
            if (this.speed != 0) this.changeSpeedTime = 1 + Math.random();
        }
        if (this.moving) this.changeSpeedTime -= deltaTime;
        // console.log(this.speed)

        if (this.targetPositionIndex < this.positions.length) {
            const target = this.positions[this.targetPositionIndex]
    
            const diff = target.sub(this.location); diff.z = 0
    
            this.velocity = diff.normalise().mult(this.speed)
    
            if (this.velocity.length()*deltaTime >= diff.length()) {
                this.location.x = target.x
                this.location.y = target.y
                this.targetPositionIndex = this.targetPositionIndex + 1
            } else {
                this.location.x += this.velocity.x * deltaTime
                this.location.y += this.velocity.y * deltaTime
            }
        }


        this.updateFaces();
    }

    updateFaces() {
        const top = 5.72
        const bottom = 0.65

        this.faces[0].vertices3d = this.getFaceVertecies("front");
        this.faces[1].vertices3d = this.getFaceVertecies("down");
        this.faces[2].vertices3d = this.getFaceVertecies("up");

        this.faces[3].vertices3d = this.getFaceVertecies("right");
        this.faces[3].vertices3d[2].y += this.size.y - top
        this.faces[3].vertices3d[3].y += this.size.y - top
        this.faces[4].vertices3d = this.getFaceVertecies("right");
        this.faces[4].vertices3d[0].y -= top
        this.faces[4].vertices3d[1].y -= top
        this.faces[4].vertices3d[2].y += bottom
        this.faces[4].vertices3d[3].y += bottom
        this.faces[5].vertices3d = this.getFaceVertecies("right");
        this.faces[5].vertices3d[0].y += this.size.y - bottom
        this.faces[5].vertices3d[1].y += this.size.y - bottom
        

        this.faces[6].vertices3d = this.getFaceVertecies("left");
        this.faces[6].vertices3d[2].y += this.size.y - top
        this.faces[6].vertices3d[3].y += this.size.y - top
        this.faces[7].vertices3d = this.getFaceVertecies("left");
        this.faces[7].vertices3d[0].y -= top
        this.faces[7].vertices3d[1].y -= top
        this.faces[7].vertices3d[2].y += bottom
        this.faces[7].vertices3d[3].y += bottom
        this.faces[8].vertices3d = this.getFaceVertecies("left");
        this.faces[8].vertices3d[0].y += this.size.y - bottom
        this.faces[8].vertices3d[1].y += this.size.y - bottom
        
    }
}

export class Platform extends physicsObject {

    constructor(positions) {

        positions = positions.map(p => new vec3(p.x, p.y-1, p.z))

        super(new vec3(
            positions[0].x,
            positions[0].y,
            positions[0].z - 0.25
        ));
        
        this.positions = positions;
        this.speed = 1;
        this.targetPositionIndex = 1;
        this.lastDiff = undefined
        this.ticking = true;

        this.type = "platform";
        this.size = new vec3(2,1,0.25)

        this.collision = true;
        this.baseGravity = 0;


        this.brightness = 0.7;
        this.faces.push(new Quad(this.getFaceVertecies("front"), this.brightness))

        this.faces.push(new Quad(this.getFaceVertecies("left"), this.brightness))
        this.faces.push(new Quad(this.getFaceVertecies("right"), this.brightness))
        this.faces.push(new Quad(this.getFaceVertecies("up"), this.brightness))
        this.faces.push(new Quad(this.getFaceVertecies("down"), this.brightness))

    }

    tick(deltaTime, level) {
        if (!level.loaded) return;

        // console.log(this.positions)

        if (this.positions.length > 1) {

            const target = this.positions[this.targetPositionIndex]

            const diff = target.sub(this.location); diff.z = 0

            this.velocity = diff.normalise().mult(this.speed)

            if (this.velocity.length()*deltaTime >= diff.length()) {
                this.location.x = target.x
                this.location.y = target.y
                this.targetPositionIndex = (this.targetPositionIndex + 1) % this.positions.length
            } else {

                // this.location.add(this.velocity)
                
                this.location.x += this.velocity.x * deltaTime
                this.location.y += this.velocity.y * deltaTime

            }

        }

        // this.doCollision(deltaTime, level);

        this.updateFaces();
    }

    updateFaces() {
        this.faces[0].vertices3d = this.getFaceVertecies("front");
        this.faces[1].vertices3d = this.getFaceVertecies("left");
        this.faces[2].vertices3d = this.getFaceVertecies("right");
        this.faces[3].vertices3d = this.getFaceVertecies("up");
        this.faces[4].vertices3d = this.getFaceVertecies("down");
    }



}


export class Interactable extends gameObject {

    constructor(location, data, levelID) {
        // location.z -= 0.5
        super(location)

        this.id = data

        this.levelID = levelID

        this.type = "interactable"
        this.ticking = true

        this.brightness = 0.8;
        this.faces.push(new Quad(this.getFaceVertecies("front"), this.brightness))
        
        this.load();

        this.interactDistance = 1;

        this.collected = false;
    }

    async load() {
        if (this.id == "120") {
            this.faces[0].brightness = (await loadImage(`./textures/other/button.png`)).image;
        } else if (
            this.id == "110"||
            this.id == "111"||
            this.id == "112"||
            this.id == "113"
        ) {
            this.faces[0].brightness = (await loadImage(`./textures/other/key.png`)).image;
        } else {
            this.faces[0].brightness = (await loadImage(`./textures/other/unlock.png`)).image;
        }
        this.loaded = true
    }

    tick(deltaTime, level) {
        this.level = level

        if (this.collected) return;

        const player = this.level.player;
        
        const distance = player.getPoint().center.sub(this.getPoint().center).length();

        if (player.levelID != this.levelID) return;
        if (distance > this.interactDistance) return;

        player.bottomText = (this.id == 120? "press E to interact":"press E to pickup")
        player.bottomTextTime = player.bottomTextMaxTime - 0.1

        const selectHoldTime = player.selectHoldTime;

        if ( selectHoldTime > 0 && selectHoldTime < 1 ) {

            this.interact(player);
            
            if (this.id == "120" && player.countKeys() < player.keysNeeded) return;

            player.selectHoldTime = -1;
            this.collected = true;

            this.faces = []
            // this.faces[0].brightness = 0.5

        }

    }

    interact(player) {
        if (this.id == "100") player.unlock("doubleJump")
        else if (this.id == "101") player.unlock("dash")
        else if (this.id == "102") player.unlock("slide")

        else if (this.id == "103") player.unlock("slideAttack")
        else if (this.id == "104") player.unlock("slamAttack")

        else if (this.id == "105") player.unlock("doubleJump")//hat

        else if (this.id == "110") player.unlock("key1")
        else if (this.id == "111") player.unlock("key2")
        else if (this.id == "112") player.unlock("key3")
        else if (this.id == "113") player.unlock("key4")

        else if (this.id == "120") {player.unlock("door"); this.openDoor(player);}
    }

    openDoor(player) {
        
        const keys = player.countKeys()
        if (keys < player.keysNeeded) {
            // console.log(`need ${Math.max(0, player.keysNeeded-keys)} more keys to unlock`)
            return;
        }

        const objects = this.level.getChunksData().object;
        const door = objects.filter(o => o.type == "door")[0];

        door.location.z += door.size.z;
        
        door.faces[0].vertices3d = door.getFaceVertecies("front");
        door.faces[1].vertices3d = door.getFaceVertecies("left");
        door.faces[2].vertices3d = door.getFaceVertecies("right");

        door.collision = false;
    }

}

export class Portal extends gameObject {

    constructor(location, data, levelID) {
        location.z -= 0.5
        super(location)

        if (data==="255") this.goToOtherLevel = true
        else this.goToOtherLevel = false

        this.id = data
        this.levelID = levelID
        // console.log("portal id", this.id)

        this.type = "portal"
        this.ticking = true

        this.brightness = 0.8;

        this.faces.push(new Quad(this.getFaceVertecies("front"), this.brightness))
        
        this.textureId = Math.floor(Math.random()*4);
        this.nextTextureTimeMax = 400
        this.nextTextureTime = 0

        this.interactDistance = 1;

        this.load();
    }

    async load() {
        this.textures = [
            await loadImage(`./textures/portal/portal0.png`),
            await loadImage(`./textures/portal/portal1.png`),
            await loadImage(`./textures/portal/portal2.png`),
            await loadImage(`./textures/portal/portal3.png`),
        ]
        this.loaded = true
    }

    teleportLocation() {
        
        const otherLevelID = (this.levelID == "main") ? "second":"main"

        if (this.goToOtherLevel) return { levelID: otherLevelID, location: this.location }
        else return { levelID: this.levelID, location: this.findOtherPortal(this.level) }

    }

    findOtherPortal(level) {

        const portal = level.getChunksData().object.find(o => (
            o !== this && o.type === "portal" && o.id === this.id
        ));

        return portal?.location

    }

    tick(deltaTime, level) {
        this.level = level

        if (this.loaded) {
            if (this.nextTextureTime < 0) {
                this.nextTextureTime = this.nextTextureTimeMax;
                this.textureId = (this.textureId + 1) % this.textures.length

                this.faces[0].brightness = this.textures[this.textureId].image;
            }
            this.nextTextureTime -= deltaTime * 1000
        }

        const player = this.level.player

        const distance = player.getPoint().center.sub(this.getPoint().center).length();

        if (player.levelID != this.levelID) return;
        if (distance > this.interactDistance) return;

        player.bottomText = "press E to teleport"
        player.bottomTextTime = player.bottomTextMaxTime - 0.1

        const selectHoldTime = player.selectHoldTime

        if ( selectHoldTime > 0 && selectHoldTime < 1 ) {

            const {levelID, location} = this.teleportLocation()

            player.location.x = location.x
            player.location.y = location.y
            player.levelID = levelID
            if (levelID != this.levelID) player.teleportDirection = player.teleportTransition==0 ? 1:-1
            
            player.velocity = new vec3()

            player.selectHoldTime = -1

            if (this.id == "250") {
                player.inBossFight = true;
                player.topTextTime = 0
                player.topText = "To damage boss jump on a Flashing weakpoint"
                                
            }

        }

    }

}

export class Spike extends physicsObject {

    constructor(location, gridSize) {
        location = location.add( new vec3(0,0,0.25) )
        super(location);
        this.size = new vec3(gridSize, gridSize*2, gridSize);

        this.collision = true;
        this.gravity = 0;
        this.ticking = false;

        this.brightness = 0.7;

        const front = this.getFaceVertecies("front");
        const topMiddle = this.location.add(new vec3(this.size.x/2, this.size.y, 0))
        front[0] = topMiddle; front[1] = topMiddle;

        const face = new Quad(front, this.brightness)
        face.doCulling = false
        this.faces.push(face)

        this.attackType = {
            contactDamage: 1,
        }

        this.size = new vec3(gridSize*0.5, gridSize*1.5, gridSize)
        this.location.x += gridSize*0.25
    }

}

export class DeathBarrier extends physicsObject {

    constructor(location, gridSize) {
        super(location);
        this.size = new vec3(gridSize, gridSize, gridSize);

        this.collision = true;
        this.gravity = 0;
        this.ticking = false;

        this.attackType = {
            contactDamage: 99,
        }

    }

}

export class Boss extends physicsObject {
    
    constructor(locations) {
        // console.log("boss spawned and is working")
        // console.log(locations)
        super(locations[1].add(locations[2]).div(2))

        this.ticking = true;
        this.ignoreChunks = true;

        this.left = locations[0];
        this.centerLeft = locations[1];
        this.center = new vec3(
            (locations[1].x + locations[2].x) / 2,
            locations[1].y+2,
            locations[1].z
        )
        this.centerRight = locations[2];
        this.right = locations[3];

        const originOffset = new vec3(0,6,1);

        this.leftHand = new physicsObject(this.left);
        this.leftHand.size = new vec3(3,2.5,2);
        this.leftHand.origin = this.leftHand.location.sub(this.leftHand.size.div(2)).add(originOffset);
        this.leftHand.collision = true;

        this.rightHand = new physicsObject(this.right);
        this.rightHand.size = new vec3(3,2.5,2);
        this.rightHand.origin = this.rightHand.location.sub(this.rightHand.size.div(2)).add(originOffset);
        this.rightHand.collision = true;


        this.doesPlatformVelocity = true
        this.location = this.center.copy()
        this.size = new vec3(5,5,2);
        this.origin = this.location.sub(this.size.div(2)).add(originOffset);


        this.weakpoint = new physicsObject(this.center);
        this.weakpoint.size = new vec3(1,0.5,2);
        // this.weakpoint.origin = this.weakpoint.location.sub(this.weakpoint.size.div(2)).add(originOffset).add(new vec3(0,2.5,0));
        this.weakpoint.collision = true;

        this.weakPointoffset = new vec3(-0.5,2.5,0).add(new vec3(2.5,2.5,0));



        this.collision = true;

        this.childObjects = []
        this.childObjects.push(this.leftHand)
        this.childObjects.push(this.rightHand)
        this.childObjects.push(this.weakpoint)
        // this.childObjects.push(this.body)


        this.attacks = ["leftSwipe", "rightSwipe", "leftPunch", "rightPunch", "leftSweep", "rightSweep"]


        this.attackData = {
            leftSwipe: {
                time: 2,
                object: this.leftHand,
                waypoints: [new vec3(0,0,0), new vec3(-1,0,0), new vec3(-2,-3,0), new vec3(10,-3,0)],
            },
            rightSwipe: {
                time: 2,
                object: this.rightHand,
                waypoints: [new vec3(0,0,0), new vec3(1,0,0), new vec3(2,-3,0), new vec3(-10,-3,0)],
            },

            leftSweep: {
                time: 2,
                object: this.leftHand,
                waypoints: [new vec3(0,0,0), new vec3(0,-1.5,0), new vec3(5,-1.5,0), new vec3(10,-1.5,0)],
            },
            rightSweep: {
                time: 2,
                object: this.rightHand,
                waypoints: [new vec3(0,0,0), new vec3(0,-1.5,0), new vec3(-5,-1.5,0), new vec3(-10,-1.5,0)],
            },

            leftPunch: {
                time: 2,
                object: this.leftHand,
                waypoints: [new vec3(0,0,0), new vec3(0,0.5,0), new vec3(0,1,0), new vec3(0,-3,0), new vec3(0,0,0)],
            },
            rightPunch: {
                time: 2,
                object: this.rightHand,
                waypoints: [new vec3(0,0,0), new vec3(0,0.5,0), new vec3(0,1,0), new vec3(0,-3,0), new vec3(0,0,0)],
            },

            
            body: {
                time: 7,
                object: this,
                waypoints: [new vec3(0,0,0), new vec3(0,-4.5,0), new vec3(0,-4.5,0), new vec3(0,-4.5,0), new vec3(0,-4.5,0), new vec3(0,-4.5,0), new vec3(0,-4.5,0)],
            },
        }


        this.faces = [
            new Quad(this.leftHand.getFaceVertecies("front"),   0.7),
            new Quad(this.leftHand.getFaceVertecies("up"),      0.7),
            new Quad(this.leftHand.getFaceVertecies("left"),    0.7),
            new Quad(this.leftHand.getFaceVertecies("right"),   0.7),
            new Quad(this.leftHand.getFaceVertecies("down"),    0.7),

            // new Quad(this.body.getFaceVertecies("front"),       1),
            // new Quad(this.body.getFaceVertecies("up"),          1),
            // new Quad(this.body.getFaceVertecies("left"),        1),
            // new Quad(this.body.getFaceVertecies("right"),       1),
            // new Quad(this.body.getFaceVertecies("down"),        1),

            new Quad(this.getFaceVertecies("front"),       0.9),
            new Quad(this.getFaceVertecies("up"),          0.9),
            new Quad(this.getFaceVertecies("left"),        0.9),
            new Quad(this.getFaceVertecies("right"),       0.9),
            new Quad(this.getFaceVertecies("down"),        0.9),

            new Quad(this.rightHand.getFaceVertecies("front"),  0.7),
            new Quad(this.rightHand.getFaceVertecies("up"),     0.7),
            new Quad(this.rightHand.getFaceVertecies("left"),   0.7),
            new Quad(this.rightHand.getFaceVertecies("right"),  0.7),
            new Quad(this.rightHand.getFaceVertecies("down"),   0.7),
            
            new Quad(this.weakpoint.getFaceVertecies("front"),  1),
            new Quad(this.weakpoint.getFaceVertecies("up"),     1),
            new Quad(this.weakpoint.getFaceVertecies("left"),   1),
            new Quad(this.weakpoint.getFaceVertecies("right"),  1),

        ]

        this.reset()

        this.attacksBeforeBodyMove = 4;
        this.health = 3;

        this.deathTime = 0;
        this.addedToLevel = false;

        this.load();
    }

    async load() {

        this.faceTextures = [
            (await loadImage(`./textures/enemies/boss/boss0.png`)).image,
            (await loadImage(`./textures/enemies/boss/boss1.png`)).image,
            (await loadImage(`./textures/enemies/boss/boss2.png`)).image,
            (await loadImage(`./textures/enemies/boss/boss3.png`)).image,
        ]
        this.loaded = true
    }


    reset() {
        
        // full reset boss
        this.health = 3;
        // harder

        this.attackNumber = 1;

        this.activeAttack = "none";
        this.maxAttackTime = undefined;
        this.waypoints = undefined;
        this.attackObject = undefined;

        this.phase = "idle";
        this.state = "";

        this.attackTime = 0;
        this.attackCooldown = 1.4;

        this.location = new vec3();
        this.weakpoint.location = new vec3();
        this.rightHand.location = new vec3();
        this.leftHand.location = new vec3();

        this.introTime = 0;

        this.weakpointActive = false;
        this.updateFaces();
    }

    playerDistanceTo(location) {
        return this.level.player.getPoint().center.sub(location).length();
    }

    chooseRandom(list) {
        const i = Math.floor(Math.random()*list.length);
        return list[i];
    }

    startAttack(attack) {
        this.activeAttack = attack;
        this.maxAttackTime = this.attackData[attack].time;
        this.attackTime = this.attackData[attack].time;
        this.waypoints = this.attackData[attack].waypoints;
        this.attackObject = this.attackData[attack].object;
        this.attackOrigin = this.attackObject.origin.copy();
        this.attackNumber++;
        this.returningToOrigin = false;
    }

    doAttack(deltaTime) {
        if (this.waypoints) {
            const scale = 2;

            const progress = (1 - this.attackTime / this.maxAttackTime) % 1;
            const segmentPosition = progress * this.waypoints.length;
            const segmentIndex = Math.floor(segmentPosition);
            const segmentProgress = segmentPosition - segmentIndex;
            const start = this.waypoints[segmentIndex].mult(scale);
            const end = this.waypoints[(segmentIndex + 1) % this.waypoints.length].mult(scale);
            const offset = start.add(end.sub(start).mult(segmentProgress));

            this.attackObject.location = this.attackOrigin.add(offset);

            if (segmentIndex == this.waypoints.length - 1) {
                this.returningToOrigin = true;
                this.weakpointActive = false;
            }

        }
        // else if (this.activeAttack == "body") {
        //     const speed = 6 * deltaTime

        //     if (this.attackTime > this.maxAttackTime*4/5) { // move down
        //         this.velocity.y = -speed;
        //         this.pushAwayFromBody = false;
        //         this.weakpointActive = true
        //     }
        //     else if (this.attackTime < this.maxAttackTime*1/5) { // move up
        //         this.velocity.y = speed;
        //         this.pushAwayFromBody = true;
        //     }
        //     else this.velocity.y = 0
        
        //     this.location = this.location.add(this.velocity)
        //     this.weakpoint.location = this.weakpoint.location.add(this.velocity)
        // }
    }

    tick(deltaTime, level) {

        // if (!this.addedToLevel) {
        //     this.addedToLevel = true;

        //     this.leftHand.ticking = false;
        //     this.leftHand.collision = true;
        //     level.addToChunk(this.leftHand);

        //     this.rightHand.ticking = false;
        //     this.rightHand.collision = true;
        //     level.addToChunk(this.rightHand);
        // }

        this.level = level
        const player = level.player

        if (!player.inBossFight && this.phase != "idle") {
            this.reset();
        }

        // console.log(this.phase, this.activeAttack, this.attackNumber, this.attackTime, this.health, this.weakpointActive)

        if (this.phase == "idle") {

            if (player.inBossFight && player.isOnFloor) {
                this.phase = "intro"
            }

        } else if (this.phase == "intro") {

            this.introTime += deltaTime
            const maxIntroTime = 2

            if (this.introTime > maxIntroTime) {
                if (this.health == 3) {
                    this.startAttack("leftPunch")
                    this.phase = "firstPunch"
                } else {
                    this.phase = "fight"
                }
            }

            const distance = 30
            const x = distance - distance * (this.introTime / maxIntroTime)

            this.leftHand.location = this.leftHand.origin.sub(new vec3(x,0,0))
            this.rightHand.location = this.rightHand.origin.sub(new vec3(x,0,0))
            this.location = this.origin.sub(new vec3(x,0,0))

        } else if (this.phase == "firstPunch") {

            if (this.attackTime < 0) {
                this.activeAttack = "none";
                this.maxAttackTime = undefined
                this.waypoints = undefined
                this.attackObject = undefined
            }

            if (this.attackTime < -this.attackCooldown) {
                this.startAttack("rightPunch")
                this.phase = "fight"
            }


        } else if (this.phase == "fight") {

            if (this.health <= 0) {
                this.phase = "dead"
                this.activeAttack = "none";
                this.maxAttackTime = undefined
                this.waypoints = undefined
                this.attackObject = undefined
                this.weakpointActive = false;
                player.velocity.y = 5;
            }

            if (this.attackTime < 0) {
                this.activeAttack = "none";
                this.maxAttackTime = undefined
                this.waypoints = undefined
                this.attackObject = undefined
                this.location = this.origin.copy()
                this.weakpointActive = false;
            }

            if (this.attackTime < -this.attackCooldown) {

                if (this.attackNumber % this.attacksBeforeBodyMove == 0) {
                    this.startAttack("body")
                    this.weakpointActive = true;
                } else {
                    const attack = this.chooseRandom(this.attacks);
                    this.startAttack(attack)
                }
            }

        } else if (this.phase == "dead") {

            if (!this.doingDeathAnimation) {
                this.velocity.x = -1
                this.leftHand.velocity.x = -4
                this.rightHand.velocity.x = 4
            }

            for (const obj of [...this.childObjects,this]) {
                if (!obj.doingDeathAnimation) {
                    obj.doingDeathAnimation = true
                    obj.velocity.y = 6
                }
                obj.velocity.y -= 0.3

                obj.location = obj.location.add(obj.velocity.mult(deltaTime))
            }
            
            this.deathTime += deltaTime * 1000

            if (this.deathTime > 3000) {
                this.phase = "ended"
                player.killedBoss = true;
            }

        }

        let speed = 1
        if (this.health == 2) {
            speed = 1.15
        } if (this.health == 1) {
            speed = 1.4
        }

        this.attackTime -= deltaTime * speed

        if (this.phase != "intro") {
            this.doAttack(deltaTime);
        }
        this.weakpoint.location = this.location.add(this.weakPointoffset);

        for (const obj of this.childObjects) {
            if (this.phase == "dead") break;
            
            if (!obj.isCollidingWith(player)) continue;

            if (this.returningToOrigin) continue;

            if (this.weakpointActive && obj == this.weakpoint) {
                this.health --;
                this.weakpointActive = false;
                if (this.attackTime > this.maxAttackTime*1/5) {
                    this.attackTime = this.maxAttackTime*1/5;
                }
                player.velocity.y = 30;
                const left = player.getPoint().center.x < this.getPoint().center.x;
                player.velocity.x += 5 * left? -1:1;
                return;
            }

            if (obj != this.attackObject) continue;

            if (this.activeAttack == "leftPunch" || this.activeAttack == "rightPunch") {
                player.damage(100);
            }

            else if (this.activeAttack == "leftSwipe") {
                player.velocity.x += 15
                player.velocity.y += 1
            }
            else if (this.activeAttack == "rightSwipe") {
                player.velocity.x -= 15
                player.velocity.y += 1
            }

            else if (this.activeAttack == "leftSweep") {
                player.velocity.x += 10
                player.velocity.y += 1
            }
            else if (this.activeAttack == "rightSweep") {
                player.velocity.x -= 10
                player.velocity.y += 1
            }
        }

        const colliding = this.isCollidingWith(player) || (player.touchingPhysicsObjects && player.touchingPhysicsObjects.includes(this))
        if (this.phase != "dead" && !this.weakpointActive && colliding) {

            const dir = player.getPoint().center.x < this.getPoint().center.x? -1:1

            player.velocity.x = 20 * dir
            player.velocity.y = 10
        }

        this.updateFaces();

    }

    updateFaces() {
        this.faces[0].vertices3d = this.leftHand.getFaceVertecies("front")
        this.faces[1].vertices3d = this.leftHand.getFaceVertecies("up")
        this.faces[2].vertices3d = this.leftHand.getFaceVertecies("left")
        this.faces[3].vertices3d = this.leftHand.getFaceVertecies("right")
        this.faces[4].vertices3d = this.leftHand.getFaceVertecies("down")

        // this.faces[5].vertices3d = this.body.getFaceVertecies("front")
        // this.faces[6].vertices3d = this.body.getFaceVertecies("up")
        // this.faces[7].vertices3d = this.body.getFaceVertecies("left")
        // this.faces[8].vertices3d = this.body.getFaceVertecies("right")
        // this.faces[9].vertices3d = this.body.getFaceVertecies("down")

        this.faces[5].vertices3d = this.getFaceVertecies("front")
        this.faces[6].vertices3d = this.getFaceVertecies("up")
        this.faces[7].vertices3d = this.getFaceVertecies("left")
        this.faces[8].vertices3d = this.getFaceVertecies("right")
        this.faces[9].vertices3d = this.getFaceVertecies("down")

        this.faces[10].vertices3d = this.rightHand.getFaceVertecies("front")
        this.faces[11].vertices3d = this.rightHand.getFaceVertecies("up")
        this.faces[12].vertices3d = this.rightHand.getFaceVertecies("left")
        this.faces[13].vertices3d = this.rightHand.getFaceVertecies("right")
        this.faces[14].vertices3d = this.rightHand.getFaceVertecies("down")

        this.faces[15].vertices3d = this.weakpoint.getFaceVertecies("front")
        this.faces[16].vertices3d = this.weakpoint.getFaceVertecies("up")
        this.faces[17].vertices3d = this.weakpoint.getFaceVertecies("left")
        this.faces[18].vertices3d = this.weakpoint.getFaceVertecies("right")

        const brightness = this.weakpointActive ? Math.sin(this.attackTime*8)*0.5 + 0.5 : 0.8

        this.faces[15].brightness = brightness
        this.faces[16].brightness = brightness
        this.faces[17].brightness = brightness
        this.faces[18].brightness = brightness

        if (this.loaded) {
            const textureIndex = Math.max(0, Math.min(3, this.health))
            this.faces[5].brightness = this.faceTextures[textureIndex]
        }

        //test
        // this.faces[0].brightness = this.returningToOrigin? 1 : 0
        // this.faces[10].brightness = this.returningToOrigin? 1 : 0

    }
}