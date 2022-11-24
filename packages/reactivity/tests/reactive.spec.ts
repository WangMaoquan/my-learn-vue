import { isReactive, reactive } from "../src/reactive";

describe('reactive', () => {
  it('test', () => {
    const original = { foo: 1 };
    const observed = reactive(original);

    expect(observed).not.toBe(original);
    expect(observed.foo).toBe(1);
  })

  it('isReactive', () => {
    // 如果是 响应式对象 我们只需要触发一下get 然后进入我们判断 约定key 的逻辑, 最后返回一个 !readonly 就行
    const original = { age: 1 };
    const observed = reactive(original);

    expect(isReactive(original)).toBe(false);
    expect(isReactive(observed)).toBe(true);
  })
})