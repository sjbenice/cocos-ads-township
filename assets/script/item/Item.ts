import { _decorator, Billboard, BoxCollider, CapsuleCollider, Collider, Component, CylinderCollider, EAxisDirection, ICollisionEvent, instantiate, Node, Prefab, random, RigidBody, SphereCollider, sys, Tween, tween, v3, Vec3 } from 'cc';
import { PHY_GROUP } from '../library/Layers';
import { LoosingProfit } from './LoosingProfit';
import { SoundMgr } from '../library/SoundMgr';
const { ccclass, property } = _decorator;

@ccclass('Item')
export class Item extends Component {
    @property
    type:number = 0;
    
    @property
    price:number = 0;
    
    @property
    hitGroundSound:string = null;
    
    @property(Prefab)
    profitPrefab:Prefab = null;

    private _halfDimension:Vec3 = null;
    private _orgScale:Vec3 = null;

    private _animating:boolean = false;
    private _collider:Collider = null;
    private _rigidBody:RigidBody = null;
    private static _profitTimer:number = 0;
    private static _profitInterval:number = 200;
    private _postDisablePhysics:boolean = false;
    private _tempPos:Vec3 = Vec3.ZERO.clone();

    public isAnimating(): boolean {
        return this._animating;
    }

    public getHalfDimension(force:boolean = false) : Vec3 {
        if (force || this._halfDimension == null){
            let ret:Vec3 = null;
            const collider: Collider = this.node.getComponent(Collider);
            if (collider) {
                if (collider instanceof BoxCollider){
                    const box:BoxCollider = collider as BoxCollider;
                    ret = box.size.clone();
                    ret.x /= 2;
                    ret.y /= 2;
                    ret.z /= 2;
                }else if (collider instanceof CapsuleCollider){
                    const capsule:CapsuleCollider = collider as CapsuleCollider;
                    const longSide:number = capsule.cylinderHeight / 2 + capsule.radius;
                    switch (capsule.direction) {
                        case EAxisDirection.X_AXIS:
                            ret = v3(longSide, capsule.radius, capsule.radius);
                            break;
                        case EAxisDirection.Y_AXIS:
                            ret = v3(capsule.radius, longSide, capsule.radius);
                            break;
                        case EAxisDirection.Z_AXIS:
                            ret = v3(capsule.radius, capsule.radius, longSide);
                            break;
                    }
                } else if (collider instanceof SphereCollider) {
                    const sphere:SphereCollider = collider as SphereCollider;
                    ret = v3(sphere.radius, sphere.radius, sphere.radius);
                } else if (collider instanceof CylinderCollider) {
                    const cylinder:CylinderCollider = collider as CylinderCollider;
                    const longSide:number = cylinder.height / 2;
                    switch (cylinder.direction) {
                        case EAxisDirection.X_AXIS:
                            ret = v3(longSide, cylinder.radius, cylinder.radius);
                            break;
                        case EAxisDirection.Y_AXIS:
                            ret = v3(cylinder.radius, longSide, cylinder.radius);
                            break;
                        case EAxisDirection.Z_AXIS:
                            ret = v3(cylinder.radius, cylinder.radius, longSide);
                            break;
                    }
                } else{
                    ret = collider.worldBounds.halfExtents.clone();
                }
            }

            ret.x *= collider.node.scale.x;
            ret.y *= collider.node.scale.y;
            ret.z *= collider.node.scale.z;

            const currentRotation = this.node.eulerAngles;
            if (currentRotation.z == 90) {
                const temp = ret.y;
                ret.y = ret.x;
                ret.x = temp;
            }

            this._halfDimension = ret;
        }
        return this._halfDimension;
    }

    public rotateIfColumn() : boolean {
        if (this._halfDimension == null)
            this.getHalfDimension();

        let ret = false;
        const currentRotation = this.node.eulerAngles;
        if (this._halfDimension.y > this._halfDimension.x) {
            const temp = this._halfDimension.y;
            this._halfDimension.y = this._halfDimension.x;
            this._halfDimension.x = temp;

            this.node.setRotationFromEuler(0, currentRotation.y, 90);
            ret = true;
        }else
            this.node.setRotationFromEuler(0, currentRotation.y, 0);

        return ret;
    }

    public prepareForProduct() {
        const currentRotation = this.node.eulerAngles;
        this.node.setRotationFromEuler(0, 0, currentRotation.z);
        // this.getHalfDimension(true);
    }

    public scaleEffect(period:number) {
        this._animating = true;

        this._orgScale = this.node.scale.clone();
        this.node.setScale(Vec3.ZERO);
        tween(this.node)
            .to(period, {scale:this._orgScale}, {easing:'bounceOut',
                onComplete: (target?: object) => {
                    this._orgScale = null;
                    this._animating = false;
                }
            })
            .start();
    }

    public stopScaleEffect() {
        if (this._orgScale) {
            Tween.stopAllByTarget(this.node);
            this.node.setScale(this._orgScale);
            this._orgScale = null;
            this._animating = false;
        }
    }

    public enablePhysics(enable:boolean) {
        // this.getMembers();
/*
        if (enable) {
            if (this._rigidBody) {
                this._rigidBody.enabled = enable;
            } else if (this._mass > 0) {
                this._rigidBody = this.addComponent(RigidBody);
                this._rigidBody.mass = this._mass;
            }
        } else {
            if (!this._rigidBody) {
                this.getMembers();
                if (this._rigidBody) {
                    this._rigidBody.destroy();
                    this._rigidBody = null;
                }
            }
        }*/

        if (this._rigidBody)
            this._rigidBody.enabled = enable;
        else if (!enable)
            this._postDisablePhysics = true;

        if (this._collider)
            this._collider.enabled = enable;
    }

    public isPhysicsEnabled() {
        return this._postDisablePhysics || (this._rigidBody && this._rigidBody.enabled);
    }

    protected getMembers() {
        if (!this._collider)
            this._collider = this.getComponent(Collider);
        if (!this._rigidBody) {
            this._rigidBody = this.getComponent(RigidBody);
        }
    }

    protected onLoad(): void {
        this.getMembers();

    }

    protected start(): void {
        if (this._postDisablePhysics) {
            this.enablePhysics(false);
            this._postDisablePhysics = false;
        }

        if (this.profitPrefab && this._collider) {
            this._collider.on('onCollisionEnter', this.onCollisionEnter, this);
        }
    }

    protected onDestroy(): void {
        this.removeCollisionListener();
    }

    protected removeCollisionListener() {
        if (this.profitPrefab && this._collider) {
            this._collider.off('onCollisionEnter', this.onCollisionEnter, this);
        }
    }
    
    onCollisionEnter(event: ICollisionEvent) {
        const otherCollider = event.otherCollider;
        if (otherCollider) {
            const otherNode = otherCollider.node;
            if (otherNode) {
                if (otherCollider.getGroup() == PHY_GROUP.PLANE) {
                    if (this.hitGroundSound)
                        SoundMgr.playSound(this.hitGroundSound);

                    if (this.profitPrefab) {
                        if (Item._profitTimer == 0 || Item._profitTimer + Item._profitInterval < sys.now()) {
                            Item._profitTimer = sys.now();

                            const loosingProfit = instantiate(this.profitPrefab);
                            otherNode.addChild(loosingProfit);
                            this.node.getWorldPosition(this._tempPos);
                            loosingProfit.setWorldPosition(this._tempPos);
                        }
                        this.scheduleOnce(()=>{
                            this.node.removeFromParent();
                            this.node.destroy();
                        }, LoosingProfit.TIME);
                        
                        this.removeCollisionListener();
                    }
                }
            }
        }
    }
}


