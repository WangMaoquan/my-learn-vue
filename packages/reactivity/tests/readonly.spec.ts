import { isReadonly } from './../src/reactive';
import { readonly } from '../src/reactive';

describe('readonly', () => {
  it('readonly test', () => {
    const original = { foo: 1, bar: { baz: 2 } };
    const wrapped = readonly(original);
    expect(wrapped).not.toBe(original);

    expect(wrapped.foo).toBe(1);

    // @ts-ignore
    wrapped.foo = 2;
    expect(wrapped.foo).toBe(1);
    expect(
      `Set operation on key "foo" failed: target is readonly.`
    // @ts-ignore
    ).toHaveBeenWarnedLast()
  });

  it('nest readonly', () => {
    const original = {
      person: {
        age: 21,
        name: 'decade'
      },
      like: ["music"]
    };

    const wrapped = readonly(original);

    expect(isReadonly(wrapped.like)).toBe(true);
    expect(isReadonly(original.like)).not.toBe(true);
  })
});
