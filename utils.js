
export function logError(text) {
    const p = document.createElement("p");
    p.textContent = text;
    document.getElementById("console").appendChild(p);
    // document.getElementById("console").replaceChildren(p);
}
export function clearLog() {
    const p = document.createElement("p");
    document.getElementById("console").replaceChildren(p);
}


export class vec3 {
    constructor(x=0, y=0, z=0) {
        this.x = x
        this.y = y
        this.z = z
    }

    add(vec) {
        return new vec3(
            this.x + vec.x,
            this.y + vec.y,
            this.z + vec.z
        )
    }

    sub(vec) {
        return new vec3(
            this.x - vec.x,
            this.y - vec.y,
            this.z - vec.z
        )
    }

    mult(n) {
        return new vec3(
            this.x * n,
            this.y * n,
            this.z * n
        )
    }

    div(n) {
        return new vec3(
            this.x / n,
            this.y / n,
            this.z / n
        )
    }

    length() {
        return Math.sqrt(
            Math.pow(this.x, 2) +
            Math.pow(this.y, 2) +
            Math.pow(this.z, 2)
        )
    }

    normalise() {
        const len = this.length()
        return this.div(len)
    }

    dot(vec) {
        return (
            this.x * vec.x +
            this.y * vec.y +
            this.z * vec.z
        )
    }

    cross(vec) {
        return new vec3(
            this.y * vec.z - this.z * vec.y,
            this.z * vec.x - this.x * vec.z,
            this.x * vec.y - this.y * vec.x
        )
    }

    copy() {
        return new vec3(this.x, this.y, this.z)
    }
}

export class Quad {
    constructor(vertices, brightness) {
        this.vertices3d = vertices
        this.distance = 0
        this.brightness = brightness
        this.doCulling = true

        const a = vertices[2].sub(vertices[1])
        const b = vertices[3].sub(vertices[2])
        this.isFrontFace = Math.abs(a.cross(b).z) > 0
        if (this.isFrontFace) {
            this.isMainQuad = true
            this.doCulling = false            
        }
    }

    project2d(f, w, h, cameraLoc, offset) {
        let cullFace = true;
        const vertices2d = [];

        const translatedVertices3d = this.vertices3d.map((point) => {return point.sub(cameraLoc).sub(offset);})
        // console.log(this.vertices3d, translatedVertices3d)
        // for (const point of this.vertices3d) {
        //     const translatedPoint = point.sub(cameraLoc).sub(offset);
        
        for (const translatedPoint of translatedVertices3d) {
            const projectedPoint = this.projectPoint(translatedPoint, f, w, h);

            vertices2d.push(projectedPoint)
            
            if (this.isOnScreen(projectedPoint, w, h)) cullFace = false;
        }
        if (cullFace && this.doCulling) return ["culled","culled","culled"]
        
        const center = translatedVertices3d[0].add(translatedVertices3d[2]).div(2);
        let distance = center.length();
        if (this.isMainQuad) distance = center.z;
        else if (this.isFrontFace) distance = center.z;

        return [vertices2d, distance, this.brightness]
    }

    isOnScreen(point, w, h) {
        const buffer = 50
        return (
            point.x >= 0-buffer && point.x <= w+buffer &&
            point.y >= 0-buffer && point.y <= h+buffer
        );
    }

    projectPoint({x, y, z}, f, w, h) {
        let px = (x / z) * f + w/2;
        let py = (-y / z) * f + h/2;
        return new vec3(px, py, 0)
    }
}

export async function loadImage(path) {
    // Source - https://stackoverflow.com/a/61516442
    // Posted by sney2002
    // Retrieved 2026-03-04, License - CC BY-SA 4.0
    
    // modified to fit my needs
    
    return new Promise((resolve, reject) => {
        const img = new Image();

        img.onload = () => {
    
            var canvas = document.createElement("canvas");
            var ctx = canvas.getContext("2d");
    
            ctx.drawImage(img, 0, 0);
    
            let array = []
            const imageData = ctx.getImageData(0, 0, img.width, img.height).data;
            let i = 0;
    
            for (let y = 0; y < img.height; y++) {
                    array[y] = [];
                for (let x = 0; x < img.width; x++) {
    
                    const data = {
                        r: imageData[i+0],
                        g: imageData[i+1],
                        b: imageData[i+2],
                        a: imageData[i+3],
                        hex: "#" + 
                            imageData[i+0].toString(16).padStart(2,"0") + 
                            imageData[i+1].toString(16).padStart(2,"0") + 
                            imageData[i+2].toString(16).padStart(2,"0") + 
                            imageData[i+3].toString(16).padStart(2,"0"),
                    }
    
                    array[y][x] = data;
                    i += 4;
                }
            }
    
            // console.log(array)
            resolve({
                image: img,
                array: array.reverse()
            });
        }
        img.onerror = () => { 
            console.error(`Failed to load image: ${path}`);
            reject(new Error(`Failed to load image: ${path}`));
        }
        img.src = path;
    })
}
