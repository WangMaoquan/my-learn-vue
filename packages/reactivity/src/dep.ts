import { ReactiveEffect } from './effect';

export type Dep = Set<ReactiveEffect> & {
  isRestDep: boolean;
};

export const createDep = (effects?: ReactiveEffect[]) => {
  const dep = new Set<ReactiveEffect>(effects) as Dep;
  dep.isRestDep = false;
  return dep;
};

/**
 * 初始化deps
 * 将deps 中所有的dep打上 都是多余dep的标记
 * @param effect
 */
export const initDeps = (effect: ReactiveEffect) => {
  const { deps } = effect;
  if (deps.length) {
    for (let i = 0; i < deps.length; i++) {
      const dep = deps[i];
      dep.isRestDep = true;
    }
  }
};

/**
 * 移除没有执行的dep
 * @param effect
 */
export const clearRestDep = (effect: ReactiveEffect) => {
  const { deps } = effect;
  if (deps.length) {
    let index = 0;
    for (let i = 0; i < deps.length; i++) {
      const dep = deps[i];
      if (dep.isRestDep) {
        dep.delete(effect);
      } else {
        deps[index++] = dep;
      }
      // clear bits
      dep.isRestDep = false;
    }
    deps.length = index;
  }
};
