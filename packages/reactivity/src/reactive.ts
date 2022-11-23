import { track, trigger } from "./effect";

export const reactive = (raw: any) => {
  return new Proxy(raw, {
    get(target, key) {
      const res = Reflect.get(target, key);

      // Todo 依赖搜集
      track(target, key)
      return res;
    },
    set(target, key, value) {
      const res = Reflect.set(target, key, value);

      // todo 派发更新
      trigger(target, key)
      return res;
    }
  })
}