import { _decorator, Component, Node, Quat } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('RotateY')
export class RotateY extends Component {
    @property
    speed:number = 720;

    protected _quat:Quat = Quat.IDENTITY.clone();

    start() {

    }

    update(deltaTime: number) {
        const angle = deltaTime * this.speed;
        this.node.rotate(Quat.fromEuler(this._quat, 0, angle, 0));
    }
}


