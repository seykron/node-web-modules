/** Central dispatcher for HTTP requests. It delegates requests to modules.
 */
WebModules.ModuleManager = (function () {

  /** Default logger. */
  var LOG = require('winston');

  /** Enumeration of supported server types for modules. Any of these types
   * can be specified when a Module is instantiated.
   * @namespace
   * @fieldOf WebModules.ModuleManager
   * @private
   */
  var SERVER_TYPE = {
    /** Web sockets server. It uses socket.io over express server.
     */
    WEB_SOCKET: "websocket",

    /** Express.js server. This is the default.
     */
    EXPRESS: "express"
  };

  /** ExpressJS application.
   * @private
   * @fieldOf WebModules.ModuleManager#
   */
  var app = require('express')();

  /** Master server, it will listen for connections.
   * @type http.Server.
   * @private
   * @fieldOf WebModules.ModuleManager#
   */
  var server = require('http').createServer(app);

  /** Socket.io application.
   * @type WebSocketApplication
   * @private
   * @fieldOf WebModules.ModuleManager#
   */
  var websocket = require('socket.io').listen(server);

  /** List of registered modules descriptions.
   * @type Object[]
   */
  var modulesDescriptions = [];

  /** Initializes the MVC front controller.
   */
  var configureFrontController = function () {
    app.all("*", function (req, res, next) {
      var path = req.route.params[0];
      var moduleDescription;
      var contextPath;
      var i;

      for (i = 0; i < modulesDescriptions.length; i++) {
        moduleDescription = modulesDescriptions[i];
        contextPath = moduleDescription.module.getContextPath();

        // Uses the base path to lazyly initialize the module in runtime only
        // when it's invoked the first time.
        if (path.indexOf(contextPath) === 0 &&
            !moduleDescription.initialized) {
          moduleDescription.module
            .init(new WebModules.ExpressRequestHandler(app));
          moduleDescription.initialized = true;
        }
      }

      next();
    });
  };

  /** Configures a single module.
   * @param {WebModules.Module} module Module to configure. Cannot be null.
   * @private
   * @fieldOf WebModules.ModuleManager#
   */
  var configureModule = function (module) {
    var requestHandler = null;

    modulesDescriptions.push({
      initialized: false,
      module: module
    });

    // WebSocket modules are initialized as they're registered.
    if (module.getServerType() === SERVER_TYPE.WEB_SOCKET) {
      requestHandler = new WebModules.WebSocketRequestHandler(websocket);
      module.init(requestHandler);
    }
  };

  return {
    /** Enumeration of supported server types for modules. Any of these types
     * can be specified when a Module is instantiated.
     * @namespace
     */
    SERVER_TYPE: SERVER_TYPE,

    /** Initializes the global request dispatcher.
     *
     * @param {Number} port Port to wait for connections on. Cannot be null.
     */
    listen: function (port) {
      configureFrontController();
      server.listen(port);
    },

    /** Registers a module into the global context. Once registered, modules
     * will handle requests that match their context path.
     *
     * @param {WebModules.Module} module Module to register. Cannot be null.
     */
    register: function (module) {
      LOG.info("Registering module " + module.getContextPath());
      configureModule(module);
    },

    /** Returns the express application.
     *
     * @return {Express} The express application. Never returns null.
     */
    app: function () {
      return app;
    }
  }
}());
