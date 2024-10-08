import { _decorator, Collider, Component, instantiate, Node, Prefab, Vec3 } from 'cc';
import { TruckController } from '../controller/TruckController';
import { WorkZone } from '../controller/WorkZone';
const { ccclass, property } = _decorator;

@ccclass('TruckMgr')
export class TruckMgr extends Component {
    @property(Prefab)
    truckPrefab:Prefab = null;

    @property(Node)
    truckGroup:Node = null;

    @property(Node)
    inPath:Node = null;

    @property(Node)
    outPath:Node = null;

    @property(Node)
    cameraNode:Node = null;

    @property(WorkZone)
    workZone:WorkZone = null;

    @property(Node)
    moneyPlace:Node = null;

    @property
    truckInteval:number = 0.5;

    @property
    buyInterval:number = 0.1;

    protected _trucks:TruckController[] = [];

    protected _timer:number = 0;
    protected _buyTimer:number = 0;

    protected _moneyPlaceHafDimension:Vec3 = null;

    start() {
        if (this.inPath) {
            for (let index = 0; index < this.inPath.children.length; index++) {
                this._trucks.push(null);
            }
        }

        if (this.moneyPlace)
            this._moneyPlaceHafDimension = this.moneyPlace.getComponent(Collider).worldBounds.halfExtents;
    }

    update(deltaTime: number) {
        this._buyTimer += deltaTime;
        if (this.workZone && this._buyTimer >= this.buyInterval) {
            this._buyTimer = 0;
            const firstTruck = this._trucks[this._trucks.length - 1];
            if (firstTruck) {
                if (firstTruck.checkPay(this.moneyPlace, this._moneyPlaceHafDimension)) {
                }
                if (firstTruck.checkBuy()) {
                    const good = this.workZone.sellGood();
                    if (good) {
                        firstTruck.buyGood(good);
                    }
                }
            } 
        }

        this._timer += deltaTime;
        if (this._timer >= this.truckInteval) {
            this._timer = 0;

            const firstTruck = this._trucks[this._trucks.length - 1];
            if (firstTruck) {
                if (firstTruck.isArrived()) {
                    firstTruck.startBuy();
                } else if (firstTruck.isPaid()) {
                    firstTruck.moveBack();
                    this._trucks[this._trucks.length - 1] = null;
                }
            }

            for (let i = this._trucks.length - 1; i > 0; i--) {
                const truck = this._trucks[i];
                if (truck == null) {
                    let nextTruck:TruckController = null;
                    for (let j = i - 1; j > 0; j--) {
                        nextTruck = this._trucks[j];
                        if (nextTruck) {
                            this._trucks[j] = null;
                            break;
                        }
                    }

                    if (!nextTruck) {
                        nextTruck = instantiate(this.truckPrefab).getComponent(TruckController);
                        this.truckGroup.addChild(nextTruck.node);
                        nextTruck.setup(this.cameraNode, this.inPath, this.outPath);
                    }

                    nextTruck.move2Index(i);

                    this._trucks[i] = nextTruck;
                    break;
                }
            }
        }
    }
}


