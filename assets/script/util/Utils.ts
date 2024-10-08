import { _decorator, Color, Component, gfx, MeshRenderer, Node, NodeSpace, Quat, sys, toDegree, toRadian, tween, v3, Vec2, Vec3 } from 'cc';
import { getForward, signedAngleVec3 } from './Math';
const { ccclass, property } = _decorator;

@ccclass('Utils')
export class Utils {
    public static lerp(start: number, end: number, t: number): number {
        return start + t * (end - start);
    }

    public static lerpVec3(start: Vec3, end: Vec3, t: number): Vec3 {
        return v3(Utils.lerp(start.x, end.x, t), Utils.lerp(start.y, end.y, t), Utils.lerp(start.z, end.z, t));
    }

    public static parabola(t: number, startY: number, endY: number, height: number): number {
        const peak = height + Math.max(startY, endY);
        const a = startY - 2 * peak + endY;
        const b = 2 * (peak - startY);
        const c = startY;
        return a * t ** 2 + b * t + c;
    }

    public static removeChildrenDestroy(node:Node) : void {
        // node.removeAllChildren();
        for (let index = node.children.length - 1; index >= 0; index--) {
            const element = node.children[index];
            element.removeFromParent();
            element.destroy();
        }
    }

    // http://yourdomain.com/playableAd/index.html?version=1
    public static getUrlParameter(name: string): string {
        name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
        const regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
        const results = regex.exec(window.location.search);
        return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
    }

    public static shuffleArray(array: number[]): number[] {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]]; // Swap elements
        }
        return array;
    }

    public static setMeshNodeAlpha(node: Node, alpha_0_1: number) {
        const meshRenderer = node.getComponent(MeshRenderer);
        if (meshRenderer)
            Utils.setMeshRendererAlpha(meshRenderer, alpha_0_1);
    }

    public static setMeshRendererAlpha(meshRenderer: MeshRenderer, alpha_0_1: number) {
        const material = meshRenderer.material;
        if (material) {
            // Ensure the material supports transparency
            material.setProperty('albedo', new Color(255, 255, 255, alpha_0_1 * 255));
            
            // If the material does not initially support transparency, you might need to adjust the blend state
            // const pass = material.passes[0];
            // const blendState = pass.blendState;
            // blendState.targets[0].blend = true;
            // blendState.targets[0].blendSrc = gfx.BlendFactor.SRC_ALPHA;
            // blendState.targets[0].blendDst = gfx.BlendFactor.ONE_MINUS_SRC_ALPHA;
            // blendState.targets[0].blendSrcAlpha = gfx.BlendFactor.SRC_ALPHA;
            // blendState.targets[0].blendDstAlpha = gfx.BlendFactor.ONE_MINUS_SRC_ALPHA;

            // Apply the modified material back to the mesh renderer
            // meshRenderer.material = material;
        }
    }

    public static isPointOnLineSegment(point: Vec3, start: Vec3, end: Vec3): boolean {
        const crossProduct = (point.y - start.y) * (end.z - start.z) - (point.z - start.z) * (end.y - start.y);
        if (Math.abs(crossProduct) > Number.EPSILON) return false;
    
        const dotProduct = (point.x - start.x) * (end.x - start.x) + (point.y - start.y) * (end.y - start.y) + (point.z - start.z) * (end.z - start.z);
        if (dotProduct < 0) return false;
    
        const squaredLength = (end.x - start.x) ** 2 + (end.y - start.y) ** 2 + (end.z - start.z) ** 2;
        if (dotProduct > squaredLength) return false;
        
        return true;
    }
    
    protected static _point:Vec3 = Vec3.ZERO.clone();
    protected static _start:Vec3 = Vec3.ZERO.clone();
    protected static _end:Vec3 = Vec3.ZERO.clone();

    // Helper function to calculate the distance from a point to a line segment
    public static distancePointToLineSegment(point: Vec3, start: Vec3, end: Vec3): number {
        const BA = point.clone().subtract(start);
        const BC = end.clone().subtract(start);
        
        const dotBA_BC = Vec3.dot(BA, BC);
        const dotBC_BC = Vec3.dot(BC, BC);
        
        const t = dotBA_BC / dotBC_BC;
        
        let closestPoint: Vec3;
        if (t < 0) {
            closestPoint = start; // Closest to B
        } else if (t > 1) {
            closestPoint = end; // Closest to C
        } else {
            closestPoint = start.clone().add(BC.multiplyScalar(t)); // Closest to segment
        }
        
        return Vec3.distance(point, closestPoint);

        // Utils._point.set(point);
        // Utils._start.set(start);
        // Utils._end.set(end);
        // const lineLengthSquared = Utils._start.subtract(Utils._end).lengthSqr();
        // if (lineLengthSquared === 0) return Utils._point.subtract(Utils._start).length();
    
        // const t = Math.max(0, Math.min(1, Utils._point.subtract(Utils._start).dot(Utils._end.subtract(Utils._start)) / lineLengthSquared));
        // const projection = Utils._start.add(Utils._end.subtract(Utils._start).multiplyScalar(t));
        // return Utils._point.subtract(projection).length();
    }
    
    public static isTouchDevice() {
        return sys.hasFeature(sys.Feature.INPUT_TOUCH);
    }

    public static isPointInPolygon(P: Vec3, polygon: Vec3[]): boolean {
        let intersectCount = 0;

        for (let i = 0; i < polygon.length; i++) {
            const A = polygon[i];
            const B = polygon[(i + 1) % polygon.length];

            // Check if the ray starting from P intersects with the edge AB
            if (Utils.rayIntersectsSegment(P, A, B)) {
                intersectCount++;
            }
        }

        // If the number of intersections is odd, the point is inside
        return intersectCount % 2 === 1;
    }

    // Function to check if a point P is on the line segment AB
    public static isPointOnSegment(A: Vec3, B: Vec3, P: Vec3): boolean {
        const crossProduct = (P.y - A.y) * (B.x - A.x) - (P.x - A.x) * (B.y - A.y);
        if (Math.abs(crossProduct) > Number.EPSILON) {
          return false;
        }
      
        const dotProduct = (P.x - A.x) * (B.x - A.x) + (P.y - A.y) * (B.y - A.y);
        if (dotProduct < 0) {
          return false;
        }
      
        const squaredLengthBA = (B.x - A.x) * (B.x - A.x) + (B.y - A.y) * (B.y - A.y);
        if (dotProduct > squaredLengthBA) {
          return false;
        }
      
        return true;
    }
      
    // Function to check if a ray starting from point P intersects the segment AB
    public static rayIntersectsSegment(P, A, B) {
        if (A.y > B.y) {
            [A, B] = [B, A];
        }
      
        // Check if point is out of bounds
        if (P.y < A.y || P.y > B.y) {
            return false;
        }
      
        // If the point is to the left of both A and B, it definitely intersects
        if (P.x < Math.min(A.x, B.x)) {
            return true;
        }
      
        // If the point is to the right of both A and B, it definitely does not intersect
        if (P.x >= Math.max(A.x, B.x)) {
            return false;
        }
      
        // Calculate the intersection point on the x-axis using the slope
        const slope = (B.x - A.x) / (B.y - A.y);
        const xIntersect = A.x + (P.y - A.y) * slope;
      
        return P.x < xIntersect;
    }
    
    public static calculatePolygonAreaXZ(vertices: Vec3[]): number {
        let area = 0;
        const n = vertices.length;
    
        for (let i = 0; i < n; i++) {
            const current = vertices[i];
            const next = vertices[(i + 1) % n];
    
            area += current.x * next.z - current.z * next.x;
        }
    
        return Math.abs(area) / 2;
    }

    public static getPyramidLayers(nodeCount: number): number | null {
        // Calculate n using the quadratic formula
        const n = (-1 + Math.sqrt(1 + 8 * nodeCount)) / 2;

        // Check if n is a positive integer
        if (n > 0 && Number.isInteger(n)) {
            return n;
        }

        return null;  // Invalid node count
    }

    public static createPyramid(parent:Node, dimension:Vec3) {
        if (parent) {
            const itemCount = parent.children.length;
            if (itemCount > 1) {
                const layers = Utils.getPyramidLayers(itemCount);
                if (layers) {
                    let nodeCount = 0;
        
                    for (let i = 1; i <= layers; i++) {
                        for (let j = 0; j < i; j++) {
                            const node = parent.children[nodeCount ++];
                            let z = (j - (i - 1) / 2) * (dimension.z);
                            let y = (layers - i) * (dimension.y);
                            node.setPosition(new Vec3(0, y, z));
                        }
                    }
                } else {
                    const rows = Math.sqrt(itemCount);
                    if (rows > 0 && Number.isInteger(rows)) {
                        for (let index = 0; index < itemCount; index++) {
                            const node = parent.children[index];

                            const y:number = Math.floor(index / (rows * rows)) * dimension.y;
                            const i = index % (rows * rows);
                            const z:number = (Math.floor(i / rows) + (1 - rows) / 2) * dimension.z;
                            const x:number = (Math.floor(i % rows) + (1 - rows) / 2) * dimension.x;
                
                            node.setPosition(v3(x, y, z));
                        }
                    }
                }
            }
        }
    }

    private static _viewDir :Vec3 = Vec3.ZERO.clone();
    public static faceViewCommon(movementInput: Vec3, deltaTime: number, moveNode:Node, turnAngleSpeed) {
        Utils._viewDir.set(movementInput);
        Utils._viewDir.y = 0.0;
        Utils._viewDir.normalize();

        const characterDir = getForward(moveNode);
        characterDir.y = 0.0;
        characterDir.normalize();

        const currentAimAngle = signedAngleVec3(characterDir, Utils._viewDir, Vec3.UNIT_Y);
        const currentAimAngleDegMag = toDegree(Math.abs(currentAimAngle));

        const maxRotDegMag = turnAngleSpeed > 0 ? turnAngleSpeed * deltaTime : currentAimAngleDegMag;
        const rotDegMag = Math.min(maxRotDegMag, currentAimAngleDegMag);
        const q = Quat.fromAxisAngle(new Quat(), Vec3.UNIT_Y, Math.sign(currentAimAngle) * toRadian(rotDegMag));
        moveNode.rotate(q, NodeSpace.WORLD);

        return currentAimAngleDegMag;
    }

    public static calcArrangePos(placeHalfDimention:Vec3, itemHalfDimention:Vec3, index:number, outPos:Vec3) : boolean{
        const dimen: Vec3 = placeHalfDimention;
        const itemDimen: Vec3 = itemHalfDimention;
        const rows : number = Math.max(1, Math.floor(dimen.z / itemDimen.z));
        const cols : number = Math.max(1, Math.floor(dimen.x / itemDimen.x));

        const y:number = Math.floor(index / (rows * cols)) * itemDimen.y * 2 + itemDimen.y;
        index = index % (rows * cols);
        const z:number = Math.floor(index / cols) * itemDimen.z * 2 + itemDimen.z - rows * itemDimen.z;
        const x:number = Math.floor(index % cols) * itemDimen.x * 2 + itemDimen.x - cols * itemDimen.x;

        outPos.set(x, y, z);

        return y < placeHalfDimention.y * 2;
    }

    public static calcArrangeDimension(place:Node) : Vec3 {
        if (place && place.children.length > 0) {
            const node = place.children[0];
            const out = node.getScale();
            out.multiplyScalar(0.5);
            out.y *= 0.5;
            node.removeFromParent();
            node.destroy();

            return out;
        }

        return null;
    }
}


