export function warn(msg: string, ...args: any[]) {
	console.warn(`[MyVue warn] ${msg}`, ...args);
}
