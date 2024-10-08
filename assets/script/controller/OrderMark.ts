import { _decorator, Component, MeshRenderer, Node } from 'cc';
import { Number3d } from '../library/Number3d';
const { ccclass, property } = _decorator;

@ccclass('OrderMark')
export class OrderMark extends Component {
    @property(MeshRenderer)
    mesh:MeshRenderer = null;

    @property(Number3d)
    number:Number3d = null;

    public setCount(count:number) {
        if (this.number)
            this.number.setValue(count);
    }

    public setType(type:number) {
        if (this.mesh)
            this.mesh.material = this.mesh.materials[type - 1];
    }
}


