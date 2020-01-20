const hash = require('hash-sum');
const uniq = require('lodash.uniq');

const isJS = function(file) {
  return /\.js(\?[^.]+)?$/.test(file);
};
const isHotUpdate = function(file) {
  return /\.hot-update\.js(\?[^.]+)?$/.test(file);
};
const isCSS = function(file) {
  return /\.css(\?[^.]+)?$/.test(file);
};
const onEmit = function(compiler, name, hook) {
  if (compiler.hooks) {
    // Webpack >= 4.0.0
    compiler.hooks.emit.tapAsync(name, hook);
  } else {
    // Webpack < 4.0.0
    compiler.plugin('emit', hook);
  }
};

module.exports = class VueSSRClientPlugin {
  constructor(options = {}) {
    this.options = Object.assign(
      {
        filename: 'vue-ssr-client-manifest.json',
      },
      options,
    );
  }

  apply(compiler) {
    onEmit(compiler, 'vue-client-plugin', (compilation, cb) => {
      const stats = compilation.getStats().toJson();

      const allFiles = uniq(stats.assets.map(a => a.name));

      const initialFiles = uniq(
        Object.keys(stats.entrypoints)
          .map(name => stats.entrypoints[name].assets)
          .reduce((assets, all) => all.concat(assets), [])
          .filter(file => isJS(file) || isCSS(file))
          .filter(file => !isHotUpdate(file)),
      );

      const asyncFiles = allFiles
        .filter(file => isJS(file) || isCSS(file))
        .filter(file => !isHotUpdate(file))
        .filter(file => initialFiles.indexOf(file) < 0);

      const manifest = {
        publicPath: stats.publicPath,
        all: allFiles,
        initial: initialFiles,
        async: asyncFiles,
        modules: {
          /* [identifier: string]: Array<index: number> */
        },
      };

      const assetModules = stats.modules.filter(m => m.assets.length);
      const fileToIndex = file => manifest.all.indexOf(file);
      stats.modules.forEach(m => {
        // ignore modules duplicated in multiple chunks
        if (m.chunks.length === 1) {
          const cid = m.chunks[0];
          const chunk = stats.chunks.find(c => c.id === cid);
          if (!chunk || !chunk.files) {
            return;
          }
          const id = m.identifier.replace(/\s\w+$/, ''); // remove appended hash
          const files = (manifest.modules[hash(id)] = chunk.files.map(fileToIndex)).filter(
            index => index != -1,
          );

          // find all asset modules associated with the same chunk
          assetModules.forEach(m => {
            if (m.chunks.some(id => id === cid)) {
              files.push.apply(files, m.assets.map(fileToIndex));
            }
          });
        }
      });

      // UVue patch: fix missing source maps
      for (const id in manifest.modules) {
        manifest.modules[id] = manifest.modules[id].filter(index => index != -1);
      }

      const json = JSON.stringify(manifest, null, 2);
      compilation.assets[this.options.filename] = {
        source: () => json,
        size: () => json.length,
      };
      cb();
    });
  }
};
