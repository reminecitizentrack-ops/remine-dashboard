// memory-config.js
const isDev = process.env.NODE_ENV === 'development';

module.exports = {
  // Configuration mémoire pour le développement
  dev: {
    maxOldSpaceSize: 4096,
    webpackCache: {
      type: 'memory',
      maxGenerations: 1
    }
  },
  // Configuration mémoire pour la production
  prod: {
    maxOldSpaceSize: 8192,
    webpackCache: {
      type: 'filesystem',
      compression: 'gzip'
    }
  }
};