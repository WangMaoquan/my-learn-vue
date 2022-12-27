import path from 'path';
import fs from 'fs';
import ts from 'rollup-plugin-typescript2';
import cjs from '@rollup/plugin-commonjs';
import replace from '@rollup/plugin-replace';

// 保存 packages 文件的路径
const packagesPath = path.resolve(__dirname, '../packages');
// 打包后的地址
const distPath = path.resolve(__dirname, '../dist');

export const getPackagesAllPkgNames = (option = {}) => {
	const { exclude = ['shared'] } = option;
	const pkgNames = fs.readdirSync(packagesPath, {
		encoding: 'utf-8',
		withFileTypes: true
	});
	return pkgNames
		.filter((f) => !f.isFile())
		.map((f) => f.name)
		.filter((f) => !exclude.includes(f));
};

export const resolvePath = (pkgName, isDist = false) => {
	const path = isDist ? distPath : packagesPath;
	return `${path}/${pkgName}`;
};

export const getPackagesJson = (pkgName) => {
	// 找到对应模块下的 package.json
	const path = `${resolvePath(pkgName)}/package.json`;
	const pkgJsonStr = fs.readFileSync(path, { encoding: 'utf-8' });
	return JSON.parse(pkgJsonStr);
};

export function getBasePlugins({
	alias = {
		__DEV__: true,
		__FEATURE_OPTIONS_API__: true
	},
	typescript = {}
} = {}) {
	return [replace(alias), cjs(), ts(typescript)];
}
