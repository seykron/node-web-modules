/** Agent to deploy modules from a file system directory.
 * <p>
 * If a module deployment fails, the module root path will be registered as
 * route and it will send an error 500 to clients by default.
 * </p>
 *
 * @param {String} rootDir Directory from which modules will be loaded. Cannot
 *   be null or empty.
 * @param {Object} [options] Configuration for this agent. Can be null.
 * @param {String} [options.error] Function invoked if there's any error
 *   deploying a module. It takes the module path; the exception; the request,
 *   if any, and the response as last parameter, if any. If this callback is
 *   specified it's responsible of managing the error and send the response.
 * @constructor
 */
WebModules.DeploymentAgent = function (rootDir, options) {

  /** Default logger.
   * @private
   */
  var LOG = require('winston');

  /** Node path API.
   * @private
   */
  var path = require("path");

  /** Node file system API.
   * @private
   */
  var fs = require("fs");

  /** ExpressJS context application.
   * @private
   */
  var app = require("node-web-modules").ModuleManager.app();

  /** List modules in the root directory and passes each module to a callback.
   * @param {Function} callback Function to notify every module. Cannot be null.
   * @private
   * @methodOf WebModules.DeploymentAgent#
   */
  var listModules = function (callback) {
    var modulesRootDir = path.normalize(rootDir);

    fs.readdir(modulesRootDir, function (err, files) {
      if (err) {
        LOG.error("Error listing directory: " + modulesRootDir);
        throw err;
      }

      for (var i = 0; i < files.length; i++) {
        var file = fs.statSync(path.join(modulesRootDir, files[i]));
        var modulePath = path.join(modulesRootDir, files[i]);

        if (file.isDirectory()) {
          callback(modulePath, files[i]);
        }
      }
    });
  };

  return {
    /** Reads the root directory and tries to load all modules.
     * @methodOf WebModules.DeploymentAgent#
     */
    deploy: function () {
      listModules(function (modulePath, moduleName) {
        try {
          require(modulePath);
        } catch (cause) {
          LOG.error("Error loading module: " + modulePath);

          app.all("/" + moduleName + "/*", function (req, res) {
            if (options && options.error) {
              options.error(modulePath, cause, req, res);
            } else {
              throw cause;
            }
          });
        }
      });
    }
  };
};
