module.exports = {
  setupFilesAfterEnv: ['./scripts/setupJestEnv.ts'],
  globals: {
    __DEV__: true,
  },
  rootDir: __dirname,
}
