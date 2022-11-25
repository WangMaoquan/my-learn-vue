import { isProxy, isReactive, isShallow, reactive, shallowReadonly } from './../src/reactive';
import { shallowReactive } from '../src/reactive';

describe('shallowReactive', () => {
  it('should not make non-reactive properties reactive', () => {
    const props = shallowReactive({ n: { foo: 1 } });
    expect(isReactive(props.n)).not.toBe(true);
  });

  it('should keep reactive properties reactive', () => {
    const props = shallowReactive({ n: reactive({ foo: 1 }) })
    // props.n = reactive({ foo: 2 })
    // props.n = {
    //   foo: 1
    // }
    expect(isReactive(props.n)).toBe(true)
  })

  it('should allow shallow and normal reactive for same target', () => {
    const original = { foo: {} }
    const shallowProxy = shallowReactive(original)
    const reactiveProxy = reactive(original)
    expect(shallowProxy).not.toBe(reactiveProxy)
    expect(isReactive(shallowProxy.foo)).toBe(false)
    expect(isReactive(reactiveProxy.foo)).toBe(true)
  })

  it('isShallow', () => {
    const origianl = {};
    const shallowReactiveObserved = shallowReactive(origianl);
    const shallowReadonlyObserved = shallowReadonly(origianl);
    expect(isShallow(shallowReactiveObserved)).toBe(true)
    expect(isShallow(shallowReadonlyObserved)).toBe(true)
  })

  it('isProxy', () => {
    const original = {
      person: {
        age: 21,
        name: 'decade'
      },
      like: ["music"]
    }
    const observed = shallowReactive(original);
    expect(isProxy(observed)).toBe(true);
    expect(isProxy(observed.like)).toBe(false);
  })
});
