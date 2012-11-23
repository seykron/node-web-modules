
/** Socket.io (kind of) middleware.
 *
 * It waits till server initialization to build the socket.io application.
 *
 * @constructor
 * @augments WebModules.RequestHandler
 */
WebModules.WebSocketMiddleware = function () {

  /** Default logger.
   * @private
   */
  var LOG = require('winston');

  /** List of registered modules descriptions.
   * @type Object[]
   * @private
   * @fieldOf WebModules.ModuleManager#
   */
  var modulesDescriptions = [];

  /** Base object to inherit behaviour.
   * @private
   */
  var base = new WebModules.RequestHandler(modulesDescriptions);

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
  var websocket;

  /** Web sockets server. It uses socket.io over express server.
   * @namespace
   */
  return WebModules.extend(base, {

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
    },

    /** Handles request to an endpoint.
     *
     * If at some point the request cannot be handled, the <code>next</code>
     * continuation function will process the next matching route.
     *
     * @param {WebModules.ModuleRequestWrapper} req Current HTTP request.
     *    Cannot be null.
     * @param {Object} res Current HTTP response. Cannot be null.
     * @param {function} next Continuation function invoked when the request
     *    cannot be handled. Cannot be null.
     * @methodOf WebModules.WebSocketRequestHandler#
     */
    handle: function (req, res, next) {
      var endpoint = req.context.endpoint;
      var modulePath = req.context.modulePath;
      var pathname;
      var controller = endpoint.handler;

      if (!endpoint.registered) {
        pathname = require("url").parse(req.url).pathname;

        if (typeof endpoint.handler === "function") {
          controller = new WebModules.MessageController(function () {
            var CommandClass = endpoint.handler;
            return new CommandClass();
          });
        }

        websocket.of(modulePath).on('connection', function (socket) {
          LOG.info("WS client " + socket.id + " connected.")

          socket.on(endpoint.route.path, function (data) {
            var model = controller.handle(data);

            if (!model) {
              throw new Error("There's not model to send back.");
            }

            model.wait(function () {
              LOG.debug("Sending WS response.")
              if (model.options.broadcast) {
                socket.broadcast.emit(endpoint.route.path, model.data);
              } else {
                socket.emit(endpoint.route.path, model.data);
              }
            });
          });
        });
        endpoint.registered = true;
      }
      next();
    }
  });
};
