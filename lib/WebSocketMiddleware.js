
/** Socket.io (kind of) middleware.
 *
 * It waits till server initialization to build the socket.io application.
 *
 * @constructor
 */
WebModules.WebSocketMiddleware = function () {

  /** Default logger.
   * @private
   */
  var LOG = require('winston');

  /** Socket.io library.
   * @type WebSocketApplication
   * @private
   * @fieldOf WebModules.WebSocketMiddleware#
   */
  var io = require('socket.io');

  /** Socket.io application.
   * @type WebSocketApplication
   * @private
   * @fieldOf WebModules.WebSocketMiddleware#
   */
  var websocket = null;

  /** List of registered modules descriptions.
   * @type Object[]
   * @private
   * @fieldOf WebModules.ModuleManager#
   */
  var modulesDescriptions = [];

  /** Web sockets server. It uses socket.io over express server.
   * @namespace
   */
  return {

    /** Initializes the socket.io middleware over the specified server.
     * @param {Object} server HTTP(s) server to register Express. Cannot be
     *    null.
     */
    init: function (server) {
      websocket = io.listen(server);

      /* Overriden handleRequest() method.
       */
      var handleRequest = websocket.handleRequest;

      // Kind of magic. This method in Manager is not publicly documented, so
      // it's subject to change without any advice.
      websocket.handleRequest = function (req, res) {
        modulesDescriptions.forEach(function (moduleDescription) {
          var module = moduleDescription.module;

          if (!moduleDescription.initialized) {
            module.init();
            moduleDescription.initialized = true;
          }
          module.dispatch(req, res, function () { });
        });

        return handleRequest.apply(websocket, arguments);
      };
      WebModules.extend(this, websocket);
    },

    /** Creates a new {@link WebModules.WebSocketRequestHandler}.
     *
     * @return {WebModules.WebSocketRequestHandler} A valid request handler.
     *   Never returns null.
     */
    newRequestHandler: function () {
      return new WebModules.WebSocketRequestHandler(websocket);
    },

    /** Creates a default controller instance for this type of server.
     *
     * @return {WebModules.MessageController} Returns a new message
     *   controller. Never returns null.
     */
    newDefaultController: function (routeDefinition, CommandClass) {
      return new WebModules.MessageController(function () {
        return new CommandClass();
      });
    },

    /** Registers a module into this middleware. Once registered, modules
     * will handle requests that match their context path.
     *
     * @param {WebModules.Module} module Module to register. Cannot be null.
     * @methodOf WebModules.ModuleManager#
     */
    register: function (module) {
      LOG.info("Registering WebSocket module " + module.getContextPath());
      modulesDescriptions.push({
        initialized: false,
        module: module
      });
    }
  };
};
