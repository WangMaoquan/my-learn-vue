class ReactEffect {
  private _fn: any;
  constructor(fn: any) {
    this._fn = fn;
  }
  run() {
    activeEffect = this;
    this._fn();
  }
}

let activeEffect: any;

export const effect = (fn: any) => {
  const _effct = new ReactEffect(fn);
  _effct.run();
}

const targetMap = new Map();

export const track = (target: any, key: any) => {
  let depsMap = targetMap.get(target);
  // target => key => dep
  if (!depsMap) {
    depsMap = new Map();
    targetMap.set(target, depsMap)
  }
  let dep = depsMap.get(key);
  if (!dep) {
    dep = new Set()
    depsMap.set(key, dep)
  }
  dep.add(activeEffect)
}

export const trigger = (target: any, key: any) => {
  const depsMap = targetMap.get(target);
  const dep = depsMap.get(key);
  dep.forEach((effect: any) => {
    effect.run();
  });
}