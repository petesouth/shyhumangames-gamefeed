module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // Prevent Webpack from scope-hoisting ESM dependencies into CRA's root scope
      webpackConfig.optimization.concatenateModules = false;

      // Force unique global objects so Webpack runtimes don't collide
      webpackConfig.output.uniqueName = 'sidescrollersamurai';

      return webpackConfig;
    },
  },
};