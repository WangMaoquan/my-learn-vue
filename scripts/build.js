import {
	getBasePlugins,
	getPackagesJson,
	resolvePath,
	getPackagesAllPkgNames
} from './utils';
import generatePackageJson from 'rollup-plugin-generate-package-json';

const plugins = getBasePlugins();

const createBuildConfig = (pkgNames) => {
	const configs = [];
	pkgNames.forEach((pkgName) => {
		// 拿到 package.json 中的 name 和 module字段
		const { name, module } = getPackagesJson(pkgName);
		// 原本包所在的路径
		const pkgPath = resolvePath(name);
		// 打包后的产物的路径
		const pkgDistPath = resolvePath(name, true);
		configs.push({
			input: `${pkgPath}/${module}`,
			output: {
				name: pkgName,
				file: `${pkgDistPath}/index.js`,
				format: 'cjs'
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
		});
	});
	return configs;
};

export default createBuildConfig(getPackagesAllPkgNames());
