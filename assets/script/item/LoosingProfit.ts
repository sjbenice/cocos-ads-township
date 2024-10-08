import { _decorator, Billboard, Component, Node, tween, v3, Vec3 } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('LoosingProfit')
export class LoosingProfit extends Component {
    public static TIME:number = 1;
    private static vfxUpBy:Vec3 = v3(0, 8, 0);

    start() {
        const billboard = this.getComponent(Billboard);
        if (billboard) {
            const orgSize = billboard.width;

            tween(this.node)
            .by(LoosingProfit.TIME, {position:LoosingProfit.vfxUpBy}, {onUpdate(target, ratio) {
                billboard.width = billboard.height = orgSize * (1 - ratio / 2);
            },})
            .call(()=>{
                this.node.removeFromParent();
                this.node.destroy();
            })
            .start();
        }
    }
}


