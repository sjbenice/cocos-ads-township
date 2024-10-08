import { _decorator, Component, Node, Vec3 } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('RotateNode')
export class RotateNode extends Component {
    @property
    public speed: number = 90; // Rotation speed in degrees per second

    private _currentAngle: number = 0;
    private _rot:Vec3 = Vec3.ZERO.clone();

    update(deltaTime: number) {
        // Calculate the new rotation angle
        this._currentAngle += this.speed * deltaTime;

        // Apply the rotation to the node
        this._rot.x = this._currentAngle;
        this.node.setRotationFromEuler(this._rot);
    }
}


