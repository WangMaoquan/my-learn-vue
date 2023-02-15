import { baseCompile } from '@vue/complier-core';
import * as runtiemDom from '@vue/runtime-dom';

import { registerRuntimeCompiler } from '@vue/runtime-dom';

export function compileToFunction(template: string) {
	const { code } = baseCompile(template);

	const render = new Function('Vue', code)(runtiemDom);
	return render;
}

registerRuntimeCompiler(compileToFunction);

export { compileToFunction as compile };
export * from '@vue/runtime-dom';
