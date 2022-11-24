declare var __DEV__: boolean

interface Matchers<R, T> {
  toHaveBeenWarned(): R
  toHaveBeenWarnedLast(): R
  toHaveBeenWarnedTimes(n: number): R
}