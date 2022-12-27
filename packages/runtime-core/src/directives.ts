import { makeMap } from '@vue/shared';

export type Directive = {};

// vue 内置指令
export const isBuiltInDirective = /*#__PURE__*/ makeMap(
	'bind,cloak,else-if,else,for,html,if,model,on,once,pre,show,slot,text,memo'
);

export const validateDirectiveName = (name: string) => {
	if (isBuiltInDirective(name)) {
		console.warn(
			'Do not use built-in directive ids as custom directive id: ' + name
		);
	}
};
