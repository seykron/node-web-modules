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
   */
  var server = require('http').createServer(app);

  /** Socket.io application.
   */
  var websocket = require('socket.io').listen(server);

  /** Default dispatcher configuration.
   * @type Object
   */
  var configuration = {
  };

  /** Configures a single module.
   * @param {WebModules.Module} module Module to configure. Cannot be null.
   */
  var configureModule = function (module) {
    var requestHandler = null;
    var contextPath = module.getContextPath();

    if (module.getServerType() === SERVER_TYPE.EXPRESS) {
      // Uses the base path to lazyly initialize the module in runtime only
      // when it's invoked the first time.
      app.all(contextPath, function (req, res, next) {
        if (requestHandler === null) {
          requestHandler = new WebModules.ExpressRequestHandler(app);
          module.init(requestHandler);
        }
        next();
      });
    } else if (module.getServerType() === SERVER_TYPE.WEB_SOCKET) {
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
      server.listen(port);
    },

    /** Sets a specific configuration entry.
     * @param {String} entryKey Name of the configuration entry to set. Cannot
     *   be null or empty.
     * @param {Object} value Value of the configuration entry.
     */
    set: function (entryKey, value) {
      configuration[entryKey] = value;
    },

    /** Configures the dispatcher overriding the default settings.
     *
     * @param {Object} [theConfiguration] New configuration. Must be null in
     *   order to only retrieve the current configuration.
     * @return {Object} Returns the current configuration. Never returns null.
     */
    configure: function (theConfiguration) {
      var currentConfig = configuration;

      if (theConfiguration) {
        configuration = theConfiguration;
      }
      return currentConfig;
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
