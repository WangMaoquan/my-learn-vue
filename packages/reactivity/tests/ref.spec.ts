import { effect } from '../src/effect';
import { isRef, proxyRefs, ref, unref } from  '../src/ref'

describe('reactivity/ref', () => {
  it('ref', () => {
    const count = ref(1);
    expect(count.value).toBe(1);
  })

  it('should be reactive', () => {
    const a = ref(1)
    let dummy
    let calls = 0
    effect(() => {
      calls++
      dummy = a.value
    })
    expect(calls).toBe(1)
    expect(dummy).toBe(1)
    a.value = 2
    expect(calls).toBe(2)
    expect(dummy).toBe(2)
    // same value should not trigger
    a.value = 2
    expect(calls).toBe(2)
  })

  it('should make nested properties reactive', () => {
    const a = ref({
      count: 1
    })
    let dummy
    effect(() => {
      dummy = a.value.count
    })
    expect(dummy).toBe(1)
    a.value.count = 2
    expect(dummy).toBe(2)
  })

  it('isRef', () => {
    const count = ref(1);
    expect(isRef(count)).toBe(true);

    const state = ref({
      age: 1,
      like: ref(['music'])
    });
    expect(isRef(state)).toBe(true);
    expect(isRef(state.value.like)).toBe(true);
  })

  it('unref', () => {
    const count = ref(1);
    expect(unref(count)).toBe(1);
  })

  it('proxyRefs', () => {
    const original = {
      age: 10,
      like: ref(['music'])
    }

    const proxyRefsResult = proxyRefs(original);

    expect(proxyRefsResult.age).toBe(10);
    expect(proxyRefsResult.like).toEqual(["music"])

    proxyRefsResult.like = ["sing"]
    proxyRefsResult.age = 20;
    expect(proxyRefsResult.age).toBe(20);
    expect(proxyRefsResult.like).toEqual(["sing"])
  })
})