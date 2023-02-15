export * from '../runtime-dom';
export * from '../reactivity';

import { baseCompile } from '../complier-core';
import * as runtiemDom from '../runtime-dom';

import { registerRuntimeCompiler } from '../runtime-dom';

export function compileToFunction(template: string) {
	const { code } = baseCompile(template);

	const render = new Function('Vue', code)(runtiemDom);
	return render;
}

registerRuntimeCompiler(compileToFunction);
