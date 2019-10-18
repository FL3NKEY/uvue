const fs = require('fs-extra');
const webpack = require('webpack');
const consola = require('consola');
const formatStats = require('@vue/cli-service/lib/commands/build/formatStats');
const execa = require('execa');

const modifyConfig = (config, fn) => {
  if (Array.isArray(config)) {
    config.forEach(c => fn(c));
  } else {
    fn(config);
  }
};

module.exports = (api, options) => {
  api.registerCommand(
    'ssr:build',
    {
      description: 'build for production (SSR)',
      usage: 'vue-cli-service ssr:build [options]',
      options: {
        '--mode': `specify env mode (default: production)`,
        '--report': `generate report to help analyze bundle content`,
        '--modern': `build two bundle: legacy and modern`,
      },
    },
    async function(args, rawArgs) {
      // Remove previous build
      if (!process.env.VUE_CLI_MODERN_BUILD) {
        await fs.remove(api.resolve(options.outputDir));
      }

      if (!args.modern) {
        await build(api, options, args);
      } else {
        process.env.VUE_CLI_MODERN_MODE = true;

        if (!process.env.VUE_CLI_MODERN_BUILD) {
          consola.info('Building legacy bundle...');
        } else {
          consola.info('Building modern bundle...');
        }

        await build(api, options, args);

        if (!process.env.VUE_CLI_MODERN_BUILD) {
          // Sub process for modern mode
          const cliBin = api.resolve('node_modules/.bin/vue-cli-service');
          await execa(cliBin, ['ssr:build', ...rawArgs], {
            stdio: 'inherit',
            env: {
              VUE_CLI_MODERN_MODE: true,
              VUE_CLI_MODERN_BUILD: true,
            },
          });
        }

        delete process.env.VUE_CLI_MODERN_MODE;
      }
    },
  );
};

function build(api, options, args) {
  return new Promise(async (resolve, reject) => {
    const uvueDir = api.uvue.getServerConfig('uvueDir');

    const isLegacyBuild = !process.env.VUE_CLI_MODERN_BUILD && process.env.VUE_CLI_MODERN_MODE;

    // Get Webpakc configurations
    const getWebpackConfig = require('../webpack/ssr');
    const clientConfig = getWebpackConfig(api, { client: true });
    const serverConfig = getWebpackConfig(api, { client: false });

    // Add bundle analyzer if asked
    if (args.report || args['report-json']) {
      const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
      modifyConfig(clientConfig, config => {
        const bundleName = `${isLegacyBuild ? 'legacy-' : ''}`;
        config.plugins.push(
          new BundleAnalyzerPlugin({
            logLevel: 'warn',
            openAnalyzer: false,
            analyzerMode: args.report ? 'static' : 'disabled',
            reportFilename: `${uvueDir}/${bundleName}report.html`,
            statsFilename: `${uvueDir}/${bundleName}report.json`,
            generateStatsFile: !!args['report-json'],
          }),
        );
      });
    }

    // Create compiler
    const compiler = webpack([clientConfig, serverConfig]);

    // When compilation is done
    const onCompilationComplete = (err, stats) => {
      if (err) {
        // eslint-disable-next-line
        consola.error(err);
        return reject(err);
      }

      // eslint-disable-next-line
      console.log(`\n` + formatStats(stats, options.outputDir, api));
      resolve();
    };

    // Start compilation
    compiler.run(onCompilationComplete);
  });
}
