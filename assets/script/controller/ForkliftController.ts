import { _decorator, CCString, Collider, Component, ICollisionEvent, ITriggerEvent, Node, randomRange, randomRangeInt, RigidBody, sys, tween, Tween, v3, Vec3 } from 'cc';
import { PHY_GROUP } from '../library/Layers';
import { SoundMgr } from '../library/SoundMgr';
import { AvatarController } from '../library/AvatarController';
import { Item } from '../item/Item';
import { Utils } from '../util/Utils';
import { MoneyController } from '../library/MoneyController';
import { CautionMark } from '../library/CautionMark';
import { ParabolaTween } from '../library/ParabolaTween';
const { ccclass, property } = _decorator;

@ccclass('ForkliftController')
export class ForkliftController extends AvatarController {
    @property
    isBot:boolean = false;

    @property(Node)
    tutorArrow:Node = null;

    @property(Node)
    placePos:Node = null;

    @property(Node)
    topGroup:Node = null;
    @property
    topAnimationTime:number = 0.2;
    @property
    topAnimationY:number = 0.5;

    @property(MoneyController)
    money:MoneyController = null;

    @property(CCString)
    itemSound:string = '';

    @property(CautionMark)
    caution:CautionMark = null;

    @property(Node)
    inputZone:Node = null;

    @property(Node)
    outputZone:Node = null;

    public static State = {
        NONE:-1,
        TO_IN:0,
        TO_OUT:1,
    };

    protected _state:number = ForkliftController.State.NONE;
    
    protected _topAnimPos:Vec3 = Vec3.ZERO.clone();
    protected _tempPos:Vec3 = Vec3.ZERO.clone();

    protected _moving:boolean = false;
    protected _targetPos:Vec3 = Vec3.ZERO.clone();
    protected _velocity:Vec3 = Vec3.ZERO.clone();

    
    protected _sleepMoveTimer: number = 0;
    protected _sleepMoveInterval: number = 0;

    protected _rigidBody:RigidBody = null;

    protected placeHalfDimention:Vec3 = null;

    private _moveInput:Vec3 = Vec3.ZERO.clone();

    start() {
        if (super.start)
            super.start();

        this._topAnimPos.y = this.topAnimationY;
        this.placeHalfDimention = Utils.calcArrangeDimension(this.placePos);

        this.topAnimation(true);

        if (this.isBot) {
            this._state = ForkliftController.State.TO_IN;
        }

        this._moving = true;
    }

    protected doCollisionEnter(event: ICollisionEvent){
        const guest = ForkliftController.getGuestFromColliderEvent(event.otherCollider);
        if (guest) {
            this.onCollision(guest, true);
        }
    }

    protected doTriggerEnter(event: ITriggerEvent){
        if (event.otherCollider.getGroup() == PHY_GROUP.TRIGGER) {
            if (this.isBot && (event.otherCollider.node == this.inputZone || event.otherCollider.node == this.outputZone)) {
                this._moving = false;
            }
        }

        this.onTrigger(event, true);
    }

    protected doTriggerStay(event: ITriggerEvent): void {
        this.onTrigger(event, false);
    }

    protected doTriggerExit(event: ITriggerEvent): void {
        if (event.otherCollider.getGroup() == PHY_GROUP.TRIGGER) {
            if (this.isBot && !this._moving) {
                switch (this._state) {
                    case ForkliftController.State.TO_IN:
                        this._moving = event.otherCollider.node == this.inputZone;
                        break;
                
                    case ForkliftController.State.TO_OUT:
                        this._moving = event.otherCollider.node == this.outputZone;
                        break;
                }
            }
        }
    }

    public arrived(node:Node, enable:boolean) {
        if (this.isBot) {
            switch (this._state) {
                case ForkliftController.State.TO_IN:
                    if (node == this.inputZone)
                        this._moving = !enable;
                    break;
            
                case ForkliftController.State.TO_OUT:
                    if (node == this.outputZone)
                        this._moving = !enable;
                    break;
            }
        }
    }

    public static getGuestFromColliderEvent(otherCollider:Collider) : ForkliftController {
        if (otherCollider && otherCollider.getGroup() == PHY_GROUP.PLAYER) {
            const otherNode = otherCollider.node;
            if (otherNode) {
                const guest:ForkliftController = otherNode.getComponent(ForkliftController);
                return guest;
            }
        }

        return null;
    }

    protected getItemFromColliderEvent(otherCollider:Collider) : Item {
        if (otherCollider && otherCollider.getGroup() == PHY_GROUP.TRIGGER) {
            const otherNode = otherCollider.node;
            if (otherNode && otherNode.children.length > 0) {
                const item = otherNode.children[otherNode.children.length - 1].getComponent(Item);
                return item;
            }
        }

        return null;
    }

    protected onCollision(other:ForkliftController, enter:boolean) {
        if (this.isBot && !this.isSleeping()) {
            const baseTime = 2000 / this.baseSpeed;
            this.sleepMove(randomRangeInt(baseTime, baseTime * 1.5));

            if (enter)
                SoundMgr.playSound('horn');
        }
    }

    protected onTrigger(event: ITriggerEvent, enter:boolean) {
        const item = this.getItemFromColliderEvent(event.otherCollider);
        if (item) {
            if (this.placePos) {
                if (item.type == 0 && this.isBot)
                    return;

                item.node.setScale(Vec3.ONE);

                let rotateY:boolean = false;
                let itemHalfDimen = item.getHalfDimension();
                if (itemHalfDimen.z > itemHalfDimen.x) {
                    rotateY = true;
                    itemHalfDimen = itemHalfDimen.clone();
                    const temp = itemHalfDimen.x;
                    itemHalfDimen.x = itemHalfDimen.z;
                    itemHalfDimen.z = temp;
                }

                if (this.placePos.children.length == 0 || this.placePos.children[0].getComponent(Item).type == item.type) {
                    const caution = !Utils.calcArrangePos(this.placeHalfDimention, itemHalfDimen, this.placePos.children.length, this._tempPos);
                    if (caution) {
                        if (this.isBot && this.outputZone) {
                            this._state = ForkliftController.State.TO_OUT;
                            this._moving = true;
                            // this.moveTo(this.outputZone.getWorldPosition(this._tempPos));
                        }

                        if (this.caution)
                            this.caution.showCaution(true, 1);
                    } else {
                        item.node.setParent(this.placePos);
                        item.node.setPosition(this._tempPos);
    
                        item.enablePhysics(false);
                        if (rotateY)
                            item.node.setRotationFromEuler(v3(0, 90, 0));

                        item.scaleEffect(randomRange(0.2, 0.4));
    
                        if (item.type == 0 && this.money)
                            this.money.addMoney(item.price);
                        else if (this.itemSound.length > 0)
                            SoundMgr.playSound(this.itemSound);
                    }
                }
            }
        }
    }

    protected sleepMove(sleepMilliseconds:number):void {
        this._sleepMoveTimer = sys.now();
        this._sleepMoveInterval = sleepMilliseconds;
    }

    protected isSleeping() : boolean {
        if (this._sleepMoveTimer > 0) {
            if (sys.now() >= this._sleepMoveTimer + this._sleepMoveInterval) {
                this._sleepMoveTimer = 0;
            }
        }

        return this._sleepMoveTimer > 0;
    }
    
    protected canMove() {
        if (super.canMove()){
            if (this._sleepMoveTimer > 0){
                if (sys.now() < this._sleepMoveTimer + this._sleepMoveInterval)
                    return false;
    
                this._sleepMoveTimer = 0;
            }
            return this._moving;
        }

        return false;
    }

    public adjustTutorArrow(tutorialDirection:Vec3, deltaTime:number) {
        if (this.tutorArrow) {
            if (tutorialDirection) {
                this.tutorArrow.active = true;
                if (!Vec3.equals(tutorialDirection, Vec3.ZERO)) {
                    this.faceView(tutorialDirection, deltaTime, this.tutorArrow, 0);
                }
            } else
                this.tutorArrow.active = false;
        }
    }

    // protected moveTo(targetPos:Vec3) {
    //     this.topAnimation(true);

    //     this._targetPos.set(targetPos);
    //     this._targetPos.y = 0;

    //     this._moving = true;
    // }

    protected topAnimation(start:boolean) {
        if (this.topGroup) {
            Tween.stopAllByTarget(this.topGroup);
            this.topGroup.setPosition(Vec3.ZERO);
    
            if (start)
                tween(this.topGroup)
                .to(this.topAnimationTime, {position:this._topAnimPos})
                .to(this.topAnimationTime, {position:Vec3.ZERO})
                .union()
                .repeatForever()
                .start();
        }
    }

    public getMoney() :number {
        return this.money.getMoney();
    }

    public hasItem(type:number) : boolean {
        if (this.placePos && this.placePos.children.length) {
            const firstItem = this.placePos.children[0].getComponent(Item);
            return (firstItem && firstItem.type == type);
        }

        return false;
    }

    public fetchItem() : Item {
        if (this.placePos && this.placePos.children.length) {
            const item = this.placePos.children[this.placePos.children.length - 1].getComponent(Item);
            return item;
        }

        return null;
    }

    public payOnce(target:Node) : number {
        if (target && this.placePos && this.placePos.children.length) {
            const firstItem = this.placePos.children[0].getComponent(Item);
            if (firstItem && firstItem.type == 0) {
                const unit = this.placePos.children[0].getComponent(Item).price;
                if (this.money)
                    this.money.addMoney(-unit);

                const element = this.placePos.children[this.placePos.children.length - 1];
                element.getWorldPosition(this._tempPos);
                element.setParent(target);
                element.setWorldPosition(this._tempPos);
                ParabolaTween.moveNodeParabola(element, Vec3.ZERO, 2, 0.5, -1, 360);

                if (this.itemSound.length)
                    SoundMgr.playSound(this.itemSound);

                return unit;
            }
        }

        return 0;
    }

    protected calcMoveInput(endPos:Vec3){
        if (endPos){
            this._moveInput.set(endPos);
            this._moveInput.subtract(this.node.position);
            this._moveInput.normalize();
        }else{
            this._moveInput.set(Vec3.ZERO);
        }

        return this._moveInput;
    }

    protected fetchMovementInput() : Vec3{
        return this.isBot ? this._moveInput : super.fetchMovementInput();
    }

    update(deltaTime: number) {
        if (this.isBot) {
            this._moveInput.set(Vec3.ZERO);

            switch (this._state) {
                case ForkliftController.State.TO_IN:
                    this.calcMoveInput(this.inputZone.getWorldPosition(this._tempPos));
                    break;
                case ForkliftController.State.TO_OUT:
                    if (this.placePos && this.placePos.children.length == 0) {
                        this._state = ForkliftController.State.TO_IN;
                        this._moving = true;
                    } else
                        this.calcMoveInput(this.outputZone.getWorldPosition(this._tempPos));
                    break;
            }
        }

        super.update(deltaTime);

        // if (this.isBot && this.inputZone && this.outputZone) {
        //     if (Vec3.equals(this.node.scale, Vec3.ONE)) {
        //         if (this._moving) {
        //             this.node.getWorldPosition(this._tempPos);
        
        //             Vec3.subtract(this._velocity, this._targetPos, this._tempPos);
        //             const distance = this._velocity.lengthSqr();
        
        //             this._velocity.normalize();
        //             this._velocity.multiplyScalar(deltaTime * this.baseSpeed);
        //             this._tempPos.add(this._velocity);
        
        //             Utils.faceViewCommon(this._velocity, deltaTime, this.node, this.turnAngleSpeed);                
        //             this.node.setWorldPosition(this._tempPos);
        
        //             if (this._velocity.length() >= distance) {
        //                 this.node.setWorldPosition(this._targetPos);
        //                 this._moving = false;
        //             }
        //         }
                
        //         switch (this._state) {
        //             case ForkliftController.State.TO_IN:
        //                 break;
        //             default:
        //                 if (this.placePos.children.length == 0) {
        //                     this._state = ForkliftController.State.TO_IN;
        //                     this.moveTo(this.inputZone.getWorldPosition(this._tempPos));
        //                 }
        //                 break;
        //         }
        //     }
        // }
    }
}


