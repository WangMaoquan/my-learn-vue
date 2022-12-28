// $attr 在render是否被使用的标志
let accessedAttrs = false;

export function markAttrsAccessed() {
	accessedAttrs = true;
}
