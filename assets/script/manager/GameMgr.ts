import { _decorator, Button, Component, director, EPSILON, Node, Sprite, Toggle, Tween, tween, v3, Vec3 } from 'cc';
import event_html_playable from '../event_html_playable';
import { Utils } from '../util/Utils';
import { GameState, GameStateMgr } from '../library/GameState';
import { SoundMgr } from '../library/SoundMgr';
import { ForkliftController } from '../controller/ForkliftController';
import { PayZone } from '../library/PayZone';
import { WorkZone } from '../controller/WorkZone';
const { ccclass, property } = _decorator;

@ccclass('GameMgr')
export class GameMgr extends Component {
    static VERSION = {
        FULL: 1,
    };

    @property(Node)
    btnPlay:Node = null;
    @property(Node)
    btnSound:Node = null;

    @property(Node)
    packshot:Node = null;

    @property(Node)
    arrow:Node = null;

    @property(ForkliftController)
    player:ForkliftController = null;

    @property(Node)
    init30:Node = null;

    @property(Node)
    payGroup:Node = null;

    @property(Node)
    workGroup:Node = null;

    @property(Node)
    moneyGroup:Node[] = [];

    @property(Node)
    inputGroup:Node[] = [];

    private static _instance: GameMgr = null;
    private _version:number = 0;
    private _isGameEnd:boolean = false;

    private _tempPos:Vec3 = v3(0, 0, 0);

    protected static TUTOR_RANGE:number = 2;
    private _tutorPos:Vec3 = null;
    private _tutorialDirection:Vec3 = v3(0, 0, 0);

    protected _payZones:PayZone[] = [];
    protected _workZones:WorkZone[] = [];

    onLoad() {
        if (super.onLoad)
            super.onLoad();

        if (GameMgr._instance) {
            this.node.destroy();
            return;
        }
        GameMgr._instance = this;
        // director.addPersistRootNode(this.node);

        this._version = event_html_playable.version();
        if (this._version <= 0) {
            this._version = parseInt(Utils.getUrlParameter('version'), 10);
            if (!this._version)
                this._version = GameMgr.VERSION.FULL;
        }
        console.log(this._version);

        if (this.arrow)
            this._tutorPos = this.arrow.getWorldPosition();
    }

    protected onDestroy(): void {
        if (super.onDestroy)
            super.onDestroy();

        this.unscheduleAllCallbacks();

        if (GameMgr._instance == this)
            GameMgr._instance = null;

        if (!this._isGameEnd)
            event_html_playable.trackExit();
    }

    start() {
        if (super.start)
            super.start();
        
        event_html_playable.game_start();

        if (this.btnSound && (event_html_playable.hideSoundButton() || event_html_playable.hideAllButton()))
            this.btnSound.active = false;
        if (this.btnPlay) {
            if (event_html_playable.hideAllButton())
                this.btnPlay.active = false;
        }

        this.showTutor(true);

        if (this.packshot)
            this.packshot.active = false;

        if (this.payGroup)
            this._payZones = this.payGroup.getComponentsInChildren(PayZone);
        if (this.workGroup)
            this._workZones = this.workGroup.getComponentsInChildren(WorkZone);
    }

    protected showTutor(show:boolean) {
        if (this.arrow) {
            Tween.stopAllByTarget(this.arrow);
            if (show) {
                this.arrow.setWorldPosition(this._tutorPos);

                tween(this.arrow)
                .parallel(
                    tween(this.arrow)
                    .by(0.5, {position:v3(0, -0.5, 0)})
                    .reverseTime(),
                    tween(this.arrow)
                    .by(1, {eulerAngles:v3(0, 360, 0)}, {easing:'quadInOut'})
                )
                .repeatForever()
                .start();
            }
        }
    }
    
    public gotoFirstScene(delay:number) {
        if (this._isGameEnd) return;

        this._isGameEnd = true;

        event_html_playable.game_end();

        this.scheduleOnce(()=>{
            // const scheduler = director.getScheduler();
            // scheduler.unscheduleAll();
            // Tween.stopAll();

            GameStateMgr.setState(GameState.NONE);

            // this.node.destroy();
            // SoundMgr.destroyMgr();

            // director.loadScene("first");
            event_html_playable.download();//.redirect();
        }, delay);
    }

    onToggleSound(target: Toggle) {
        SoundMgr.onSound(target.isChecked);

        event_html_playable.trackSound(target.isChecked);
    }

    onBtnPlay() {
        SoundMgr.playSound('button');

        event_html_playable.track_gtag('winInstall');
        event_html_playable.download();
    }

    protected lateUpdate(deltaTime: number): void {
        if (this.init30 && this.init30.children.length == 0) {
            if (this.player) {
                const item = this.player.fetchItem();
                if (item) {
                    switch (item.type) {
                        case 0:// dollar
                            for (let index = 0; index < this._payZones.length; index++) {
                                const element = this._payZones[index];
                                if (element && element.node.active) {
                                    this.setTutorPos(element.node);
                                    break;
                                }
                            }
                            break;
                    
                        default:
                            for (let index = 0; index < this._workZones.length; index++) {
                                const element = this._workZones[index];
                                if (element && element.node.active && element.workItemType == item.type) {
                                    this.setTutorPos(element.node);
                                    break;
                                }
                            }
                            break;
                    }
                } else {
                    const state = GameStateMgr.getState();
                    switch (state) {
                        case GameState.CONVEYER:
                        case GameState.FORKLIFT_RED:
                        case GameState.TABLE_BOX:
                        case GameState.FORKLIFT_BLUE:
                            if (state >= GameState.TABLE_BOX || this.moneyGroup[0].children.length > 0)
                                this.setTutorPos(this.moneyGroup[0]);
                            else if (state == GameState.FORKLIFT_RED || this.inputGroup[1].children.length > 0)
                                this.setTutorPos(this.inputGroup[1]);
                            else
                                this.setTutorPos(this.inputGroup[0]);
                            break;
                        case GameState.NEXT_LEVEL:
                            this.setTutorPos(this.moneyGroup[1]);
                            break;
                            
                        default:
                            break;
                    }
                }
            }
        }

        const tutorDirection = GameMgr.getTutorialDirection(this.player.node.getWorldPosition());
        this.player.adjustTutorArrow(tutorDirection, deltaTime);
        // this.arrow.active = tutorDirection != null;
    }

    protected static getTutorialDirection(curPos:Vec3) {
        if (GameMgr._instance) {
            GameMgr._instance._tutorialDirection.set(GameMgr._instance._tutorPos);
            GameMgr._instance._tutorialDirection.subtract(curPos);
            GameMgr._instance._tutorialDirection.y = 0;
            if (GameMgr._instance._tutorialDirection.lengthSqr() < GameMgr.TUTOR_RANGE)
                return null;

            GameMgr._instance._tutorialDirection.normalize();

            return GameMgr._instance._tutorialDirection;
        }

        return null;
    }

    protected setTutorPos(node:Node) {
        if (node && node.active) {
            const y = this._tutorPos.y;
            node.getWorldPosition(this._tempPos);

            this._tempPos.y = y;

            if (!Vec3.equals(this._tutorPos, this._tempPos, EPSILON)) {
                this._tutorPos.set(this._tempPos);
                this.showTutor(true);
            }
        }
    }
}


