type KeyToDepMap = Map<any, Set<ReactiveEffect<any>>>
const targetMap = new WeakMap<any, KeyToDepMap>()
export let activeEffect: ReactiveEffect | undefined

export class ReactiveEffect<T = any> {
  constructor(public fn: () => T) {

  }
  run() {
    activeEffect = this;
    this.fn();
  }
}

export const effect = <T = any>(fn: () => T) => {
  // todo 如果进来的已经是一个 ReactiveEffect 是不需要执行 new ReactiveEffect 的
  const _effect = new ReactiveEffect(fn);
  _effect.run();
};

export const track = (target: object, key: unknown) => {
  let depsMap = targetMap.get(target);
  // target => key => dep
  if (!depsMap) {
    depsMap = new Map();
    targetMap.set(target, depsMap);
  }
  let dep = depsMap.get(key);
  if (!dep) {
    dep = new Set();
    depsMap.set(key, dep);
  }
  dep.add(activeEffect!);
};

/**
 * 触发依赖更新的方法
 * @param target 获取target 对应的 dep依赖map
 * @param key 从依赖map中获取 对应的 reactiveeffect
 * @param newValue 新值
 * @param oldValue 旧值
 * @returns 
 */
export const trigger = (
  target: object,
  key?: unknown,
  newValue?: unknown,
  oldValue?: unknown,
) => {
  // 获取 对应的 dep map
  const depsMap = targetMap.get(target);
  if (!depsMap) {
    return
  }
  // 收集的 deps
  let deps: (Set<ReactiveEffect> | undefined)[]  = [];
  deps.push(depsMap.get(key))
  const effects: ReactiveEffect[] = []
  for (const dep of deps) {
    if (dep) {
      effects.push(...dep)
    }
  }
  // 触发依赖
  effects.forEach(effect => {
    effect.run();
  })
};
