import { extend, isArray, isMap, isObject, isSet } from '../../shared';

type KeyToDepMap = Map<any, Set<ReactiveEffect<any>>>;
const targetMap = new WeakMap<any, KeyToDepMap>();
export let activeEffect: ReactiveEffect | undefined;
export let shouldTrack = true;

export const ITERATE_KEY = 'ITERATE_KEY';

export type EffectScheduler = (...args: any[]) => any;

export interface ReactiveEffectOptions {
  lazy?: boolean; // 是否惰性执行, computed
  scheduler?: EffectScheduler; // 存在这个参数时 后续派发更新会执行 scheduler 不会执行runner
  onStop?: () => void;
}

export interface ReactiveEffectRunner<T = any> {
  (): T;
  effect: ReactiveEffect;
}

export class ReactiveEffect<T = any> {
  active = true;
  onStop?: () => void;
  lazy?: boolean;
  deps: Set<ReactiveEffect>[] = []; // 啥时候存 track的时候 收集依赖的时候就可以存了
  computed?: boolean;
  constructor(
    public fn: () => T,
    public scheduler: EffectScheduler | null = null,
  ) {}
  run() {
    if (!this.active) {
      return this.fn();
    }
    try {
      activeEffect = this;
      shouldTrack = true;
      return this.fn();
    } finally {
      shouldTrack = false;
      activeEffect = undefined;
    }
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
    for (let i = 0; i < deps.length; i++) {
      deps[i].delete(effect);
    }
    deps.length = 0;
  }
};

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
  runner.effect.stop();
}

/**
 * 1. 首先判断是否存在对应 depsMap, 没有就初始化
 * 2. 然后通过key 去知道对应的dep, 没有就初始化
 * 3. 将activeEffect add 进dep 中
 * 4. 存入activeEffect 的deps 中 方便effect 执行stop 方法清空依赖
 * @param target 收集的对象
 * @param key 收集对象的key
 * @returns
 */
export const track = (target: object, key: unknown) => {
  if (activeEffect && shouldTrack) {
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
    trackEffects(dep);
  }
};

export const trackEffects = (dep: Set<ReactiveEffect>) => {
  dep.add(activeEffect!);
  // 将effect 对应的依赖 存到 effect 的 deps上
  activeEffect!.deps.push(dep);
};

export const canTrackEffect = () => {
  return shouldTrack && activeEffect;
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
  /**
   * 很明显这里收集的依赖是不全的 比如 对于通过 (map/set).size 或者 array.length 收集的依赖 只是通过key 是获取不到
   * 所以就会导致 通过(map/set).size 或者 array.length 的effect 无法执行 即 达不到我们想要的效果
   * 所以我们还需要特殊处理
   * todo 明天搞!!!
   */

  // 判断target 是否是 map / set
  if (isMap(target) || isSet(target) || isObject(target)) {
    deps.push(depsMap.get(ITERATE_KEY));
  }

  // 数组需要把通过 length 收集的依赖 push
  if (isArray(target)) {
    deps.push(depsMap.get('length'));
  }

  if (deps.length === 1) {
    if (deps[0]) {
      triggerEffects(deps[0]);
    }
  } else {
    const effects: ReactiveEffect[] = [];
    for (const dep of deps) {
      if (dep) {
        effects.push(...dep);
      }
    }
    triggerEffects(new Set(effects));
  }
};

export const triggerEffects = (dep: Set<ReactiveEffect> | ReactiveEffect[]) => {
  const effects = isArray(dep) ? dep : [...dep];
  // 先执行 computed
  for (const effect of effects) {
    if (effect.computed) {
      triggerEffect(effect);
    }
  }
  // 再执行非 computed
  for (const effect of effects) {
    if (!effect.computed) {
      triggerEffect(effect);
    }
  }
};

function triggerEffect(effect: ReactiveEffect) {
  if (effect !== activeEffect) {
    if (effect.scheduler) {
      effect.scheduler();
    } else {
      effect.run();
    }
  }
}
