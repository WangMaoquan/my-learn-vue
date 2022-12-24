import { getBasePlugins, getPackagesJson, resolvePath } from './utils';
import generatePackageJson from 'rollup-plugin-generate-package-json';
// 拿到 package.json 中的 name 和 module字段
const { name, module } = getPackagesJson('vue');

// 原本包所在的路径
const pkgPath = resolvePath(name);

// 打包后的产物的路径
const pkgDistPath = resolvePath(name, true);

const plugins = getBasePlugins();

export default [
	{
		input: `${pkgPath}/${module}`,
		output: {
			name: 'vue',
			file: `${pkgDistPath}/index.js`,
			format: 'umd'
		},
		plugins: [
			...plugins,
			generatePackageJson({
				inputFolder: pkgPath,
				distPath: pkgDistPath,
				baseContents: ({ name, description, version }) => {
					return {
						name,
						description,
						version,
						main: 'index.js'
					};
				}
			})
		]
	}
];
