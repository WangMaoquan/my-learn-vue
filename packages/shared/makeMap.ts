export function makeMap(
  str: string,
  expectsLowerCase?: boolean,
): (key: string) => boolean {
  // 保存map
  const map: Record<string, boolean> = Object.create(null);
  // 拆分字符串
  const list: Array<string> = str.split(',');
  for (let i = 0; i < list.length; i++) {
    map[list[i]] = true;
  }
  return expectsLowerCase
    ? (val) => !!map[val.toLowerCase()]
    : (val) => !!map[val];
}
