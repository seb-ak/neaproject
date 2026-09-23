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

        const dir = (thisCenter.x < objCenter.x) ? -1 : 1
        this.location.x += overlap.x * dir
        this.velocity.x = 0;

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

        const dir = (thisCenter.y < objCenter.y) ? -1 : 1
        this.location.y += overlap.y * dir
        this.velocity.y = 0;
        if (dir === 1) this.isOnFloor = true;

        if (dir==1) this.collidingSides.bottom = true;
        if (dir==-1) this.collidingSides.top = true;

        if (this.doesPlatformVelocity) {
            if (obj.isPhysicsObject) this.touchingPhysicsObjects.push(obj)//this.platformVelocity = obj.velocity
            // else this.platformVelocity = new vec3(0, 0, 0);
        }
    }
    doCollision(deltaTime, level) {
        this.isOnFloor = false;

        this.collisionObjects = this.getCollisionObjects(level);
        logError(`${this.type} collisions: ${this.collisionObjects.length}`)

        const velocity = this.velocity.add(this.platformVelocity);

        const steps = Math.ceil(Math.max(
            Math.abs(velocity.x * deltaTime) / this.size.x,
            Math.abs(velocity.y * deltaTime) / this.size.y
        ))
        // logError(`${this.type} movement steps: ${steps}`)
        
        this.touchingPhysicsObjects = [];
        this.isOnFloor = false;
        this.collidingSides = {left:false, right:false, top:false, bottom:false}

        for (let i=0; i<steps; i++) {

            this.location.x += velocity.x * deltaTime / steps;
            for (const obj of this.collisionObjects) { this.resolveX(obj); }

            this.location.y += velocity.y * deltaTime / steps;
            for (const obj of this.collisionObjects) { this.resolveY(obj); }

        }

        if (this.collidingSides.left && this.collidingSides.right) this.health = 0;
        if (this.collidingSides.top && this.collidingSides.bottom) this.health = 0;

        const obj = this.touchingPhysicsObjects[0];
        if (obj) this.platformVelocity = obj.velocity;
        else this.platformVelocity = new vec3(0, 0, 0);

    }
    checkCollisions(objects) {
        for (const obj of objects) {
            if (!obj.collision) continue;
            if (this.isCollidingWith(obj)) return true;
        }
        return false;
    }

    getCollisionObjects(level) {
        return [...level.objects.filter(obj => (obj !== this && obj.collision)),...level.getCloseTo(this)]
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
        this.level = "main";

        this.type = "player";
        this.size = new vec3(0.5,1,0.5);
        this.brightness = 1;
        this.ticking = true;
        
        this.faces.push(new Quad(this.getFaceVertecies("front"), this.brightness))

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
        this.deceleration = new vec3(0.1, 0, 0)
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
    }
    
    spawn(level) {
        this.health = 1;

        this.velocity = new vec3(0, 0, 0);
        this.platformVelocity = new vec3(0, 0, 0);
        this.collidingSides = { left:false, right:false, top:false, bottom:false };
        this.isOnFloor = false;
        this.jumpTime = 0;
        this.cyoteTime = 0;
        this.justJumped = false;
        this.isDashing = false;
        this.dashTime = 0;

        for (const obj of level.objects) {
            if (obj.type !== "SpawnPoint") continue;
            // this.location = obj.location;
            this.location.x = obj.location.x;
            this.location.y = obj.location.y;
        }
    }

    doInputs(deltaTime) {
        /////////////////////
        // movement logic //
        ///////////////////
        let xInput = this.pressedInputs.right.active - this.pressedInputs.left.active
        let yInput = this.pressedInputs.up.active - this.pressedInputs.down.active
        const deadzone = 0.2
        if (Math.abs(xInput) < deadzone) xInput = 0
        if (Math.abs(yInput) < deadzone) yInput = 0

        if(xInput!==0 || yInput!==0) {
            this.facingVector = new vec3(xInput, yInput, 0).normalise()
            this.facingRotation = Math.atan2(yInput, xInput);
        }


        // press crouch when in air all velocity transferred to down and ground slam
        



        // crouch and sliding
        if (yInput < 0 && this.size.y != this.crouchHeight) {
            this.size.y = this.crouchHeight;
            
            const colliding = this.checkCollisions(this.collisionObjects);
            if (colliding) {
                this.size.y = this.crouchHeight;
            } else {
                this.isCrouching = true;
                if (Math.abs(this.velocity.x) > this.maxVel.x && xInput != 0) {
                    this.velocity.x *= 1.2
                    this.isSliding = true
                }
            }
        } else if (yInput >= 0 && this.size.y != this.baseHeight) {
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


        logError(`facing rotation: ${this.facingRotation.toFixed(3)} facing vector: x:${this.facingVector.x.toFixed(3)} y:${this.facingVector.y.toFixed(3)}`)
        
        // base acceleration
        let dx = xInput*this.acceleration.x
        if (this.isDashing) {
            dx = 0
        } else if (this.isSliding) {
            dx *= 0.0
        } else if (this.isCrouching) {
            dx *= 0.4
        }

        // if switching direction switch faster
        if (Math.sign(xInput) != Math.sign(this.velocity.x)) {
            dx *= 2
        }

        if (!this.isOnFloor) {
            dx *= 0.6
        }

        let maxVel = this.maxVel
        if (this.isCrouching) maxVel = maxVel.mult(0.4)

        if (dx > 0) { if (this.velocity.x + dx > maxVel.x) dx = Math.max(0, maxVel.x - this.velocity.x) }
        else if (dx < 0) { if (this.velocity.x + dx < -maxVel.x) dx = Math.min(0, -maxVel.x - this.velocity.x) }
        logError(`dx: ${dx.toFixed(3)}`)
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
            let decelerate = this.deceleration.x * 2
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

        logError(`dashing: ${this.isDashing}`)
        


        ////////////////////
        // gravity logic //
        //////////////////
        let gravity = this.baseGravity
        const threshold = 3;
        if (this.isDashing) { // no gravity when dashing
            gravity = 0;
            logError("gravity: none");
        }        
        else if (!this.isOnFloor && this.velocity.y < -threshold) { // increase gravity when falling
            gravity*=1.2;
            logError("gravity: high");
        }
        else if (!this.isOnFloor && this.velocity.y < threshold) { // decrease gravity at peak of jump
            gravity*=0.3;
            logError("gravity: low");
        }
        else {
            gravity = this.baseGravity;
            logError("gravity: normal")
        }

        this.velocity.y -= gravity * deltaTime * 144

        logError(`justJumped:${this.justJumped} gravity:${gravity.toFixed(3)} on floor:${this.isOnFloor} jump time:${this.jumpTime.toFixed(3)}`)
        logError(`vy:${this.velocity.y.toFixed(3)} xy:${this.velocity.x.toFixed(3)} x:${this.location.x.toFixed(3)} y:${this.location.y.toFixed(3)}`)
        logError(`platform vy:${this.platformVelocity.y.toFixed(3)} xy:${this.platformVelocity.x.toFixed(3)}`)
        
    }
    
    damage(amount, type="emeny") {
        
        if (this.invincibleTime <= 0) {
            this.health -= amount
            this.invincibleTime = 2000
        }

    }

    tick(deltaTime, level) {
        if (!level.loaded) return;
        if (this.initialSpawn) {this.spawn(level); this.initialSpawn = false;}
        if (this.health == 0) this.spawn(level);
        
        this.invincibleTime -= deltaTime

        this.collisionObjects = this.getCollisionObjects(level);
        this.doInputs(deltaTime);
        
        this.doCollision(deltaTime, level);


        this.faces[0].vertices3d = this.getFaceVertecies("front");
    }
}

// one thats a goomba that jumps when you try to jump over it
export class Enemy extends physicsObject {

    constructor(location) {
        super(location);
        this.location.z -= 0.5

        this.type = "enemy";

        this.enemyType = "goomba"
        this.size = new vec3(1,1,1);
        this.brightness = 1;
        this.ticking = true;
        
        const face = new Quad(this.getFaceVertecies("front"), this.brightness)
        face.doCulling = false
        this.faces.push(face)

        this.location.z += this.size.z/2
        
        this.isOnFloor = false;

        this.facingVector = new vec3(-1,0,0);
        this.baseGravity = 0.5;

        this.health = 1;

        this.speed = 50;

        this.collision = true;

        this.doesPlatformVelocity = true;
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

        for (const obj of this.touchingPhysicsObjects) {
            if (obj.type !== "player") continue;

            obj.damage(1);
        }

        this.faces[0].vertices3d = this.getFaceVertecies("front");
    }

    movementLogic(deltaTime, level) {
        if (!this.isOnFloor) return;

        if (this.velocity.x === 0) this.facingVector = this.facingVector.mult(-1)

        this.velocity.x = this.facingVector.x * this.speed * deltaTime
        
    }

}