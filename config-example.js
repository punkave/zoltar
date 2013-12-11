// Sample configuration. Copy to config.js and make your
// changes there. The values shown are the defaults and
// will apply if you have no config.js file.

module.exports = {
  proxyPort: 5050,
  firstAppPort: 4000,
  sitesPath: '~/node-sites',
  // You can change this to nodemon, etc.
  nodeCommand: 'node',
  // If package.json specifies "main:" that is checked for first, otherwise
  // try these filenames to launch the app
  alternatives: [ 'app.js', 'server.js', 'index.js' ]
};
