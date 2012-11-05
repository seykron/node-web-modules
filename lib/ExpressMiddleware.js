
/** Express.js middleware for the MVC framework.
 *
 * This class creates an Express application, attaches itself as middleware and
 * waits for server initialization.
 *
 * @constructor
 */
WebModules.ExpressMiddleware = function () {

  /** Default logger.
   * @private
   */
  var LOG = require('winston');

  /** ExpressJS application.
   * @private
   * @fieldOf WebModules.ExpressMiddleware#
   */
  var app = require('express')();

  /** URL parser.
   * @private
   * @methodOf WebModules.ExpressMiddleware#
   */
  var parse = require("url").parse;

  /** List of registered modules descriptions.
   * @type Object[]
   * @private
   * @fieldOf WebModules.ModuleManager#
   */
  var modulesDescriptions = [];

  // MVC middleware.
  app.use(function (req, res, next) {
    var pathname = parse(req.url).pathname;
    var index = 0;

    var processNextModule = function (moduleDescription) {
      var module;

      if (!moduleDescription) {
        // If there's no module to handle this request, continues with
        // express execution.
        return next();
      }

      module = moduleDescription.module;

      // Checks whether the request must be handled by this module.
      if (pathname.indexOf(module.getContextPath()) === 0) {
        if (!moduleDescription.initialized) {
          module.init();
          moduleDescription.initialized = true;
        }

        module.dispatch(req, res, function () {
          // The module couldn't process the request, trying the next
          // matching module.
          processNextModule(modulesDescriptions[++index]);
        });
      } else {
        processNextModule(modulesDescriptions[++index]);
      }
    };
    processNextModule(modulesDescriptions[index]);
  });

  return WebModules.extend(app, {
    /** Initializes the express middleware over the specified server.
     * @param {Object} server HTTP(s) server to register Express. Cannot be
     *    null.
     */
    init: function (server) {
      server.on("request", app);
    },

    /** Creates a new {@link WebModules.ExpressRequestHandler}.
     *
     * @return {WebModules.ExpressRequestHandler} A valid request handler.
     *   Never returns null.
     */
    newRequestHandler: function () {
      return new WebModules.ExpressRequestHandler(app);
    },

    /** Creates a default controller instance for this type of server.
     *
     * @return {WebModules.CommandController} Returns a new command
     *   controller. Never returns null.
     */
    newDefaultController: function (routeDescription, CommandClass) {
      return new WebModules.CommandController(function () {
        return new CommandClass();
      }, routeDescription.viewName);
    },

    /** Registers a module into this middleware. Once registered, modules
     * will handle requests that match their context path.
     *
     * @param {WebModules.Module} module Module to register. Cannot be null.
     * @methodOf WebModules.ModuleManager#
     */
    register: function (module) {
      LOG.info("Registering Express module " + module.getContextPath());
      modulesDescriptions.push({
        initialized: false,
        module: module
      });
    }
  });
};
