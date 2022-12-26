declare let __DEV__: boolean;
declare let __FEATURE_OPTIONS_API__: boolean;

interface Matchers<R, T> {
	toHaveBeenWarned(): R;
	toHaveBeenWarnedLast(): R;
	toHaveBeenWarnedTimes(n: number): R;
}
