import { _decorator, CCString, Collider, Component, ITriggerEvent, MeshRenderer, Node, Quat, randomRange, sys, tween, Tween, Vec3 } from 'cc';
import { ForkliftController } from './ForkliftController';
import { ParabolaTween } from '../library/ParabolaTween';
import { SoundMgr } from '../library/SoundMgr';
import { MachineController } from './MachineController';
import { Utils } from '../util/Utils';
import { Item } from '../item/Item';
const { ccclass, property } = _decorator;

@ccclass('WorkZone')
export class WorkZone extends Component {
    @property
    workItemType:number = 0;

    @property(Node)
    outline:Node = null;

    @property
    dropInterval: number = 100; // Interval in milliseconds
    
    @property
    placeParabola:boolean = false;

    @property(Node)
    placePos:Node = null;
    
    @property(CCString)
    itemSound:string = '';

    @property(MachineController)
    machine:MachineController = null;

    private _collider:Collider = null;

    private _dropTimers: number[] = [];
    private _isDropping:boolean = false;
    private _players:ForkliftController[] = [];

    private _tempPos:Vec3 = Vec3.ZERO.clone();

    protected _outlineOrgScale:Vec3 = null;
    protected _outlineBlinkScale:Vec3 = null;
    protected _placeHalfDimention:Vec3 = null;

    start() {
        if (this.outline) {
            this._outlineOrgScale = this.outline.scale.clone();
            this._outlineBlinkScale = this._outlineOrgScale.clone();
            this._outlineBlinkScale.x *= 1.1;
            this._outlineBlinkScale.z *= 1.1;

            this.blinkOutline(true);
        }

        this._placeHalfDimention = Utils.calcArrangeDimension(this.placePos);

        this._collider = this.getComponent(Collider);

        if (this._collider) {
            this._collider.on('onTriggerEnter', this.onTriggerEnter, this);
            this._collider.on('onTriggerExit', this.onTriggerExit, this);
        }
    }
    
    onDestroy() {
        if (this._collider) {
            this._collider.off('onTriggerEnter', this.onTriggerEnter, this);
            this._collider.off('onTriggerExit', this.onTriggerExit, this);
        }
    }

    onTriggerEnter (event: ITriggerEvent) {
        const player:ForkliftController = ForkliftController.getGuestFromColliderEvent(event.otherCollider);
        if (player && player.hasItem(this.workItemType)){
            let index:number = 0;
            for (index = 0; index < this._players.length; index++) {
                if (this._players[index] == player) {
                    break;
                }
            }
            if (index >= this._players.length) {
                this._players.push(player);
                this._dropTimers.push(sys.now());
            }else
                this._dropTimers[index] = sys.now();
            
            this.blinkOutline(false);

            player.arrived(this.node, true);
        }
    }

    onTriggerExit (event: ITriggerEvent) {
        const player:ForkliftController = ForkliftController.getGuestFromColliderEvent(event.otherCollider);
        if (player){
            let hasPlayer:boolean = false;
            for (let index = 0; index < this._players.length; index++) {
                if (this._players[index] == player) {
                    this._dropTimers[index] = 0;
                }
                if (this._dropTimers[index] != 0)
                    hasPlayer = true;
            }

            if (!hasPlayer)
                this.blinkOutline(true);

            player.arrived(this.node, false);
        }
    }
    
    protected blinkOutline(blink:boolean) {
        if (this.outline) {
            Tween.stopAllByTarget(this.outline);

            if (blink) {
                tween(this.outline)
                .to(0.5, {scale:this._outlineBlinkScale})
                .to(0.5, {scale:this._outlineOrgScale})
                .union()
                .repeatForever()
                .start();
            }

            const mesh = this.outline.getComponent(MeshRenderer);
            if (mesh)
                mesh.material = mesh.materials[blink ? 1 : 2];
        }
    }

    public sellGood() : Node {
        if (this.placePos && this.placePos.children.length > 0 && !this._isDropping) {
            const node = this.placePos.children[this.placePos.children.length - 1];
            node.setScale(Vec3.ONE);

            return node;
        }

        return null;
    }

    update(deltaTime: number) {
        this._isDropping = false;

        for (let index = 0; index < this._dropTimers.length; index++) {
            const dropTimer = this._dropTimers[index];
            if (dropTimer > 0) {
                this._isDropping = true;
                if (sys.now() > dropTimer + this.dropInterval) {
                    const item = this._players[index].fetchItem();
                    
                    if (item && item.type == this.workItemType) {
                        this._dropTimers[index] = sys.now();

                        const element = item.node;
                        element.setScale(Vec3.ONE);
                        element.setRotation(Quat.IDENTITY);
                        element.getWorldPosition(this._tempPos);
                        element.setParent(this.placePos);
                        element.setWorldPosition(this._tempPos);
    
                        if (this._placeHalfDimention != null) {
                            Utils.calcArrangePos(this._placeHalfDimention, item.getHalfDimension(), 
                                this.placePos.children.length - 1, this._tempPos);
    
                            if (this.placeParabola)
                                ParabolaTween.moveNodeParabola(element, this._tempPos, 2, 0.5, -1, 0, false);
                            else {
                                element.setPosition(this._tempPos);
                                item.scaleEffect(randomRange(0.2, 0.4));
                            }
                        } else {
                            ParabolaTween.moveNodeParabola(element, Vec3.ZERO, 2, 0.5, 0.5);
                        }
    
                        if (this.machine) {
                            this.scheduleOnce(()=>{
                                this.machine.addWork();
                            }, 0.5);
                        }
        
                        if (this.itemSound.length)
                            SoundMgr.playSound(this.itemSound);
                    } else
                        this._dropTimers[index] = 0;
                }            
            }
        }
    }
}


