import { effect } from "../src/effect";
import { isProxy, isReactive, reactive } from "../src/reactive";

describe('reactive', () => {
  it('test', () => {
    const original = { foo: 1 };
    const observed = reactive(original);

    expect(observed).not.toBe(original);
    expect(observed.foo).toBe(1);

    expect("foo" in observed).toBe(true);
    expect(Object.keys(observed)).toEqual(["foo"])
  })

  it('isReactive', () => {
    // 如果是 响应式对象 我们只需要触发一下get 然后进入我们判断 约定key 的逻辑, 最后返回一个 !readonly 就行
    const original = { age: 1 };
    const observed = reactive(original);

    expect(isReactive(original)).toBe(false);
    expect(isReactive(observed)).toBe(true);
  })

  it('nest reactive', () => {
    const original = {
      person: {
        age: 21,
        name: 'decade'
      },
      like: ["music"]
    }
    const observed = reactive(original);
    expect(isReactive(observed.person)).toBe(true);
    expect(isReactive(original.like)).not.toBe(true);
  })

  it('isProxy', () => {
    const original = {
      person: {
        age: 21,
        name: 'decade'
      },
      like: ["music"]
    }
    const observed = reactive(original);
    expect(isProxy(observed)).toBe(true);
    expect(isProxy(observed.like)).toBe(true)
  })

  test('observing subtypes of IterableCollections(Map, Set)', () => {
    // subtypes of Map
    class CustomMap extends Map {}
    const cmap = reactive(new CustomMap())

    expect(cmap instanceof Map).toBe(true)
    expect(isReactive(cmap)).toBe(true)

    cmap.set('key', {})
    expect(isReactive(cmap.get('key'))).toBe(true)

    // subtypes of Set
    class CustomSet extends Set {}
    const cset = reactive(new CustomSet())

    expect(cset instanceof Set).toBe(true)
    expect(isReactive(cset)).toBe(true)

    let dummy
    effect(() => (dummy = cset.has('value')))
    expect(dummy).toBe(false)
    cset.add('value')
    expect(dummy).toBe(true)
    cset.delete('value')
    expect(dummy).toBe(false)
  })
})