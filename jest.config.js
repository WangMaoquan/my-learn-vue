module.exports = {
	setupFilesAfterEnv: ['./scripts/setupJestEnv.ts'],
	globals: {
		__DEV__: true
	},
	rootDir: __dirname,
	watchPathIgnorePatterns: ['/node_modules/', '/dist/', '/.git/'],
	moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],
	moduleNameMapper: {
		'^@vue/(.*?)$': '<rootDir>/packages/$1/src'
	},
	testMatch: ['<rootDir>/packages/**/tests/**/*spec.[jt]s?(x)'],
	testPathIgnorePatterns: process.env.SKIP_E2E
		? // ignore example tests on netlify builds since they don't contribute
		  // to coverage and can cause netlify builds to fail
		  ['/node_modules/', '/examples/tests']
		: ['/node_modules/']
};
