
import { _decorator, Component, MeshRenderer, Node, v3, Vec3 } from 'cc';
import { RectShape } from './Shape';
const { ccclass, property } = _decorator;

@ccclass('Boundary')
export class Boundary extends Component {
    public static instance: Boundary | null = null;

    @property
    shape: RectShape = new RectShape();

    start () {
        Boundary.instance = this;
    }

    // update (deltaTime: number) {
    //     // [4]
    // }

    public static getMeshDimension(meshNode: Node, local:boolean) : Vec3 {
        let meshRenderer = meshNode.getComponent(MeshRenderer);
        if (meshRenderer == null)
            meshRenderer = meshNode.getComponentInChildren(MeshRenderer);

        if (meshRenderer) {
            // Get the model's bounding box
            const model = meshRenderer.model;
            if (model) {
                const minPos = new Vec3();
                const maxPos = new Vec3();
                if (local){
                    model.modelBounds.getBoundary(minPos, maxPos);
                    minPos.multiply(meshNode.scale);
                    maxPos.multiply(meshNode.scale);
                }
                else
                    model.worldBounds.getBoundary(minPos, maxPos);

                // Calculate dimensions
                const width = maxPos.x - minPos.x;
                const height = maxPos.y - minPos.y;
                const depth = maxPos.z - minPos.z;

                return v3(width, height, depth);
            }
        }

        return Vec3.ZERO;
    }
}
function V3(width: number, height: number, depth: number) {
    throw new Error('Function not implemented.');
}

