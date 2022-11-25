import { isProxy, isReactive, shallowReadonly } from "../src/reactive"

describe('shallowReadonly', () => {
  it('should not make non-reactive properties reactive', () => {
    const props = shallowReadonly({ n: { foo: 1 } })
    expect(isReactive(props.n)).toBe(false)
  })


  it('should make root level properties readonly', () => {
    const props = shallowReadonly({ n: 1 })
    // @ts-expect-error
    props.n = 2
    expect(props.n).toBe(1)
    expect(
      `Set operation on key "n" failed: target is readonly.`
    // @ts-ignore
    ).toHaveBeenWarned()
  })

  it('isProxy', () => {
    const original = {
      person: {
        age: 21,
        name: 'decade'
      },
      like: ["music"]
    }
    const observed = shallowReadonly(original);
    expect(isProxy(observed)).toBe(true);
    expect(isProxy(observed.like)).toBe(false);
  })
})