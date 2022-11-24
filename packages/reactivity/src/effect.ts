import { extend } from '../../shared';

type KeyToDepMap = Map<any, Set<ReactiveEffect<any>>>;
const targetMap = new WeakMap<any, KeyToDepMap>();
export let activeEffect: ReactiveEffect | undefined;

export type EffectScheduler = (...args: any[]) => any;

export interface ReactiveEffectOptions {
  lazy?: boolean; // 是否惰性执行, computed
  scheduler?: EffectScheduler; // 存在这个参数时 后续派发更新会执行 scheduler 不会执行runner
  onStop?: () => void;
}

export interface ReactiveEffectRunner<T = any> {
  (): T
  effect: ReactiveEffect
}

export class ReactiveEffect<T = any> {
  active = true;
  onStop?: () => void;
  lazy?: boolean;
  deps: Set<ReactiveEffect>[] = []; // 啥时候存 track的时候 收集依赖的时候就可以存了
  constructor(
    public fn: () => T,
    public scheduler: EffectScheduler | null = null
  ) {}
  run() {
    if (!this.active) {
      return this.fn();
    }
    activeEffect = this;
    return this.fn();
  }
  stop() {
    // 清除依赖 
    // 修改active 为false
    // 存在 onstop 时执行onstop
    if (this.active) {
      clearEffects(this);
      if (this.onStop) {
        this.onStop();
      }
      this.active = false;
    }
  }
}

/**
 * 清除effect deps
 * @param effect 
 */
const clearEffects = (effect: ReactiveEffect) => {
  const { deps } = effect;
  if (deps.length !== 0) {
    for(let i = 0; i < deps.length; i++) {
      deps[i].delete(effect);
    }
    deps.length = 0;
  }
}



/**
 * effect
 * @param fn 用户传入进来的fn
 * @param options
 * @returns
 */
export const effect = <T = any>(
  fn: () => T,
  options?: ReactiveEffectOptions,
) => {
  if ((fn as ReactiveEffectRunner).effect) {
    fn = (fn as ReactiveEffectRunner).effect.fn;
  }
  const _effect = new ReactiveEffect(fn);
  if (options) {
    extend(_effect, options);
  }
  _effect.run();
  const runner = _effect.run.bind(_effect) as ReactiveEffectRunner;
  runner.effect = _effect;
  return runner;
};

export function stop(runner: ReactiveEffectRunner) {
  runner.effect.stop()
}

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

  // 将effect 对应的依赖 存到 effect 的 deps上
  activeEffect?.deps.push(dep);
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
    return;
  }
  // 收集的 deps
  let deps: (Set<ReactiveEffect> | undefined)[] = [];
  deps.push(depsMap.get(key));
  const effects: ReactiveEffect[] = [];
  for (const dep of deps) {
    if (dep) {
      effects.push(...dep);
    }
  }
  // 触发依赖
  effects.forEach((effect) => {
    if (effect.scheduler) {
      effect.scheduler();
    } else {
      effect.run();
    }
  });
};
