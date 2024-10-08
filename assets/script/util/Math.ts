import * as cc from "cc";
import { Vec3 } from "cc";

export function reflect (out: cc.math.Vec3, input: cc.math.Vec3, normal: cc.math.Vec3) {
    return cc.math.Vec3.scaleAndAdd(out, input, normal, -2.0 * cc.math.Vec3.dot(input, normal));
}

export function toward(source: number, dest: number, maxStep: number) {
    const difference = dest - source;
    const distance = Math.abs(difference);
    const step = Math.sign(difference) * Math.min(distance, maxStep);
    return source += step;
}

export function towardVec3(source: cc.math.Vec3, dest: cc.math.Vec3, maxStep: cc.math.Vec3, out?: cc.math.Vec3) {
    out ??= new cc.math.Vec3();
    out.x = toward(source.x, dest.x, maxStep.x);
    out.y = toward(source.y, dest.y, maxStep.y);
    out.z = toward(source.z, dest.z, maxStep.z);
    return out;
}

export function getForward (node: cc.Node) {
    return cc.math.Vec3.transformQuat(new cc.math.Vec3(), cc.math.Vec3.UNIT_Z, node.worldRotation);
}

export function signedAngleVec3(a: Readonly<Vec3>, b: Readonly<Vec3>, normal: Readonly<Vec3>) {
    const angle = Vec3.angle(a, b);
    const cross = Vec3.cross(new Vec3(), a, b);
    cross.normalize();
    return Vec3.dot(cross, normal) < 0 ? -angle : angle;
}

export function waitFor(duration: number) {
    return new Promise<void>((resolve) => {
        setTimeout(() => {
            resolve();
        }, duration * 1000.0);
    });
}
