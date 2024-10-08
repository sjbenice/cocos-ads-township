import { _decorator, Component, Node, Vec3 } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('HandSawController')
export class HandSawController extends Component {
    @property(Node)
    forward:Node = null;
    @property(Node)
    backward:Node = null;

    @property
    zRange:number = 2.2;

    @property
    period:number = 2;


    protected _forward:boolean = true;
    protected _timer:number = 0;
    protected _orgPos:Vec3 = null;
    protected _tempPos:Vec3 = null;

    start() {
        this._orgPos = this.node.getPosition();
        this._tempPos = this._orgPos.clone();

        this.adjustDirection();
    }

    update(deltaTime: number) {
        this._timer += deltaTime;
        if (this._timer > this.period)
            this._timer = this.period;

        const distance = this._timer / this.period * this.zRange;
        if (this._forward)
            this._tempPos.z = this._orgPos.z - distance;
        else
            this._tempPos.z = this._orgPos.z - this.zRange + distance;
        this.node.setPosition(this._tempPos);

        if (this._timer >= this.period) {
            this._timer = 0;
            this._forward = !this._forward;
            this.adjustDirection();
        }
    }

    protected adjustDirection() {
        if (this.forward)
            this.forward.active = this._forward;

        if (this.backward)
            this.backward.active = !this._forward;
    }
}


