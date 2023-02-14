export const TO_DISPLAY_STRING = Symbol(`toDisplayString`);
export const CREATE_ELEMENT_VNODE = Symbol(`createElementVnode`);

export const helperNameMap: Record<symbol, string> = {
	[TO_DISPLAY_STRING]: `toDisplayString`,
	[CREATE_ELEMENT_VNODE]: `createElementVnode`
};
