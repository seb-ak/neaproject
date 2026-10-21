import { logError, vec3, Quad, loadImage } from "./utils.js";

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
    constructor(location) {
        // location = location.add(new vec3(-9,10,0)) // moved to spawn next to spikes
        super(location);
        this.type = "SpawnPoint"
        this.collision = false;
        this.active = true;
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

    }
    doY(velocity, deltaTime, steps, player) {
        this.location.y += velocity.y * deltaTime / steps;
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
    doCollision(deltaTime, level) {
        this.collisionObjects = this.getCollisionObjects(level);

        const velocity = this.velocity.add(this.platformVelocity);
        const steps = Math.ceil(Math.max(
            Math.abs(velocity.x * deltaTime) / this.size.x,
            Math.abs(velocity.y * deltaTime) / this.size.y
        ))
        
        logError(`${this.type} collisions: ${this.collisionObjects.length}`)
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
        const o = [...level.objectsWithCollision
            .filter( obj => (
                obj !== this && obj.collision &&
                (obj.type != "platform" ||
                    (
                        (obj.location.y+obj.size.y*0.9) <= this.location.y && 
                        (this.velocity.y + this.platformVelocity.y - obj.velocity.y) <= 0 // had to add + this.platformVelocity.y 
                    )
                )
            )),
            ...level.getCloseTo(this)
        ]
        if (this.type !== "player") o.push(level.player)
        return o
    }

}


// cant slide while dashing
// dash has less force when on floor
// attacks are ground slam and slide kick
export class Player extends physicsObject {
    constructor(location) {
        super(location)
        this.initialSpawn = true;
        this.spawnPoint = undefined;
        this.levelID = "main";

        this.type = "player";
        this.size = new vec3(0.5,1,0.5);
        this.brightness = 1;
        this.ticking = true;

        this.collision = true;
        
        this.faces.push(new Quad(this.getFaceVertecies("front"), this.brightness))

        this.location.z += this.size.z/2

        this.pressedInputs = {
            up:    {keys:["w",],active:false},
            down:  {keys:["s","arrowdown"],active:false},
            left:  {keys:["a","arrowleft"],active:false},
            right: {keys:["d","arrowright"],active:false},
            jump:  {keys:[" ","arrowup"],active:false},
            dash:  {keys:["shift",],active:false},
            select:{keys:["e","enter"],active:false},
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


        this.crouchHeight = 0.4;
        this.baseHeight = 1;
        this.isCrouching = false;
        this.isSliding = false;

        this.jumpForce = 11;
        this.baseGravity = 0.5;
        this.jumpTime = 0;
        this.maxJumpTime = 170;

        this.cyoteTime = 0;
        this.maxCyoteTime = 200;
        
        this.velocity = new vec3(0, 0, 0);
        this.platformVelocity = new vec3(0, 0, 0);
        this.isOnFloor = false;

        this.acceleration = new vec3(0.25, 0, 0)
        this.deceleration = new vec3(0.14, 0, 0)
        this.maxVel = new vec3(6, Infinity, Infinity)

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

        this.maxHealth = 2;

        this.teleportTransition = 0;
        this.teleportTransitionSpeed = 1;
        this.teleportDirection = 0;


        this.secondAcceleration = 2.0
        this.secondDeceleration = 3.0
        this.secondStartBoostMultiplyer = 20
        this.secondStartBoostDeadzone = 1.5
        this.secondMaxVelocity = new vec3(5, 5, 0)

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

        this.invincibleTime = this.maxInvincibleTime

        if (this.activeSpawn == undefined) {
            for (const obj of level.objects) {
                if (obj.type !== "SpawnPoint") continue;
                this.activeSpawn = { location: obj.location, levelID:level.levelID }
                break;
            }
            return;
        }

        this.location = this.activeSpawn.location.copy()
        this.levelID = this.activeSpawn.levelID
        this.teleportTransition = (this.activeSpawn=="main")? 0:1

        this.updateFaces();
    }

    doInputs(deltaTime, logs) {
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

    mainLevelInputs(deltaTime, logs = true) {

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
            this.jumpTime += deltaTime * 1000
            this.velocity.y = this.jumpForce
            this.cyoteTime = 0
            this.justJumped = true
        }
        
        if (!this.pressedInputs.jump.active) {
            this.justJumped = false
        }

        /////////////////
        // Dash logic //
        ///////////////

        const vec = this.facingVector
        if (vec.x != 0) {
            vec.y = 0
            this.dashFacingVector = vec.normalise()
        }

        if (this.isDashing) this.dashTime += deltaTime * 1000
        if (this.dashTime > this.maxDashTime || this.velocity.x == 0) {
            this.isDashing = false;
            this.dashTime = 0;
        }

        if (this.pressedInputs.dash.active) {

            if (this.canDash && !this.isCrouching) {
                this.canDash = false;
                this.isDashing = true;
                this.jumpTime = 0;
                
                const dashVector = this.dashFacingVector.mult(this.dashForce)

                this.velocity.x = dashVector.x
                this.velocity.y = dashVector.y
            }

        } else if (this.isOnFloor) {
            this.canDash = true;
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

    secondLevelInputs(deltaTime, logs = true) {

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
        if (this.yInput < 0 && this.size.y != this.crouchHeight) {
            this.size.y = this.crouchHeight;
            
            const colliding = this.checkCollisions(this.collisionObjects);
            if (colliding) {
                this.size.y = this.baseHeight;
            } else {
                this.isCrouching = true;
                if (Math.abs(this.velocity.x) > this.maxVel.x && this.xInput != 0) {
                    this.velocity.x *= 1.2
                    this.isSliding = true
                }
            }
        } else if (this.yInput >= 0 && this.size.y != this.baseHeight) {
            this.size.y = this.baseHeight;
            
            const colliding = this.checkCollisions(this.collisionObjects);
            if (colliding) {
                this.size.y = this.crouchHeight;
            } else {
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

    tick(deltaTime, level) {
        const logs = true;
        
        if (!level.loaded) return;
        if (this.initialSpawn) {this.spawn(level); this.initialSpawn = false;}

        // death
            if (this.health == 0 && this.deathTimer == -1) this.deathTimer = 2000;
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

        // debug
            if (logs) logError(`justJumped:${this.justJumped} on floor:${this.isOnFloor} jump time:${this.jumpTime.toFixed(3)}`)
            if (logs) logError(`vy:${this.velocity.y.toFixed(3)} vx:${this.velocity.x.toFixed(3)}`)
            if (logs) logError(`location:  x:${this.location.x.toFixed(3)} y:${this.location.y.toFixed(3)} z:${this.location.z.toFixed(3)}`)
            if (logs) logError(`platform vy:${this.platformVelocity.y.toFixed(3)} xy:${this.platformVelocity.x.toFixed(3)}`)

        this.updateFaces()
    }

}

// one thats a goomba that jumps when you try to jump over it
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

        this.speed = 50;

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

export class Portal extends gameObject {

    constructor(location, data, levelID) {
        location.z -= 0.5
        super(location)

        if (data==="255") this.goToOtherLevel = true
        else this.goToOtherLevel = false

        this.id = data
        this.levelID = levelID

        this.type == "portal"
        this.ticking = true

        this.brightness = 0.8;

        this.faces.push(new Quad(this.getFaceVertecies("front"), this.brightness))
        
        this.textureId = Math.floor(Math.random()*4);
        this.nextTextureTimeMax = 400
        this.nextTextureTime = 0

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

        const portal = level.objects.filter(o => (o.type == "portal" && o.id == this.id) )

        return portal

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

        if (player.levelID != this.levelID) return

        if ( !this.isCollidingWith(player) ) return

        const selectHoldTime = player.selectHoldTime

        if ( selectHoldTime > 0 && selectHoldTime < 1 ) {

            const {levelID, location} = this.teleportLocation()

            player.location = location.copy()
            player.levelID = levelID
            player.teleportDirection = player.teleportTransition==0 ? 1:-1
            
            player.velocity = new vec3()

            player.selectHoldTime = -1

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
        this.ticking = true;

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

    }

    tick(deltaTime, level) {

    }

}