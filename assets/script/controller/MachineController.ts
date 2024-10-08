import { _decorator, Component, Node, ParticleSystem, Prefab, Animation, instantiate, tween, Vec3, Collider, randomRange, Tween, AudioSource } from 'cc';
import { Item } from '../item/Item';
import { Utils } from '../util/Utils';
const { ccclass, property } = _decorator;

@ccclass('MachineController')
export class MachineController extends Component {
    @property(Node)
    inputSource:Node = null;

    @property(Prefab)
    inputPrefab:Prefab = null;

    @property(Node)
    linePosGroup:Node = null;

    @property
    inputPeriod:number = 0.5;

    @property
    lineSpeed:number = 2;

    @property(Prefab)
    outputPrefab:Prefab = null;

    @property
    outputCount:number = 1;

    @property(Node)
    outputPos:Node = null;

    @property(Node)
    placePos:Node = null;

    @property
    rotatePlace:boolean = false;

    @property
    outputMax:number = 30;

    @property(Animation)
    machineAnimation:Animation = null;

    @property(ParticleSystem)
    machineVfx:ParticleSystem = null;

    @property(Node)
    scaleMachine:Node = null;

    @property(AudioSource)
    audio:AudioSource = null;

    protected _isWorking:boolean = false;
    protected _workCount:number = 0;

    protected _timer:number = 0;
    protected _tempPos:Vec3 = Vec3.ZERO.clone();
    protected _outputHalfDimen:Vec3 = null;
    protected _placePosHafDimen:Vec3 = null;

    protected _machineOrgScale:Vec3 = null;
    protected _machineScale:Vec3 = null;

    public addWork() {
        this.setWorking(true);

        this._workCount ++;
    }
    
    start() {
        if (this.placePos) {
            this._placePosHafDimen = this.placePos.getComponent(Collider).worldBounds.halfExtents;
            if (this.rotatePlace) {
                this._placePosHafDimen = this._placePosHafDimen.clone();
                const x = this._placePosHafDimen.x;
                this._placePosHafDimen.x = this._placePosHafDimen.z;
                this._placePosHafDimen.z = x;
            }
        }

        if (this.scaleMachine) {
            this._machineOrgScale = this.scaleMachine.getScale();
            this._machineScale = this._machineOrgScale.clone();
            this._machineScale.multiplyScalar(1.05);
        }
    }

    protected setWorking(work:boolean) {
        if (this._isWorking == work) return;

        this._isWorking = work;
        if (this.machineAnimation) {
            if (work)
                this.machineAnimation.play();
            else
                this.machineAnimation.stop();
        }

        if (this.scaleMachine) {
            Tween.stopAllByTarget(this.scaleMachine);

            if (work)
                tween(this.scaleMachine)
                .to(0.2, {scale:this._machineScale})
                .to(0.2, {scale:this._machineOrgScale})
                .union()
                .repeatForever()
                .start();
            else
                this.scaleMachine.setScale(this._machineOrgScale);
        }

        // if (this.machineVfx) {
        //     if (work)
        //         this.machineVfx.play();
        //     else
        //         this.machineVfx.stop();
        // }

        if (this.audio)
            this.audio.play();
    }

    update(deltaTime: number) {
        this._timer += deltaTime;
        if (this._timer > this.inputPeriod) {
            this._timer = 0;
            
            if (this._workCount > 0) {
                this._workCount --;
                this.makeOutputItem(0);
            }

            if ((this.linePosGroup && !this.linePosGroup.active) ||
                (this.placePos && this.placePos.active && this.placePos.children.length >= this.outputMax) ||
                (this.outputPos && this.outputPos.children.length >= this.outputMax))
                return;

            let totalTime:number = 0;
            let node:Node = null;
            if (this.inputPrefab)
                node = instantiate(this.inputPrefab);
            else if (this.inputSource && this.inputSource.children.length > 0) {
                node = this.inputSource.children[0];
                if (node.scale.lengthSqr() == 0)
                    node = null;
            }

            if (node) {
                const tw = tween(node);

                for (let index = 0; index < this.linePosGroup.children.length - 1; index++) {
                    const parent = this.linePosGroup.children[index];
                    const parentNext = this.linePosGroup.children[index + 1];
    
                    Vec3.subtract(this._tempPos, parent.position, parentNext.position);
                    const subTime = this._tempPos.length() / this.lineSpeed;
                    tw.call(()=>{
                        node.setParent(parent);
                        node.setPosition(Vec3.ZERO);
                    })
                    .to(subTime, {worldPosition:parentNext.position});
    
                    totalTime += subTime;
                }
    
                tw
                .call(()=>{
                    this.setWorking(true);
                    if (this.machineVfx)
                        this.machineVfx.play();
                })
                .to(0.5, {scale:Vec3.ZERO})
                .call(()=>{
                    node.removeFromParent();
                    node.destroy();
                    if (this.machineVfx)
                        this.machineVfx.stop();

                    this._workCount ++;
                })
                .start();    
            }
        }
    }

    protected makeOutputItem(delay:number) {
        for (let index = 0; index < this.outputCount; index++) {
            const out = instantiate(this.outputPrefab);
            if (this._outputHalfDimen == null) {
                this._outputHalfDimen = out.getComponent(Item).getHalfDimension().clone();
            }
            const outputTw = tween(out);
            this._tempPos.set(Vec3.ZERO);
            this._tempPos.x = (index * 2 - (this.outputCount - 1)) * this._outputHalfDimen.x;
            this.outputPos.addChild(out);
            out.setPosition(this._tempPos);
            out.setScale(Vec3.ZERO);

            outputTw
            .delay(delay)
            .to(this.inputPeriod / 2, {scale:Vec3.ONE});

            if (this.placePos && this.placePos.active) {
                outputTw.delay(this.inputPeriod / 2)
                .call(()=>{
                    this.arrange2Palette(out);
                });
            }
            outputTw.start();
        }
    }

    protected arrange2Palette(node:Node, effect:boolean=true) {
        Utils.calcArrangePos(this._placePosHafDimen, this._outputHalfDimen, 
            this.placePos.children.length, this._tempPos);
        
        node.setParent(this.placePos);
        node.setPosition(this._tempPos);

        if (effect && this.node.active) {
            const item = node.getComponent(Item);
            if (item)
                item.scaleEffect(randomRange(0.2, 0.4));
        }
    }
}


