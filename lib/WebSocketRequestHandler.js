/** Handles requests by using socket.io.
 * @param {Object} server socket.io server. Cannot be null.
 */
WebModules.WebSocketRequestHandler = function (server) {

  /** Default logger. */
  var LOG = require('winston');

  /** Base object to inherit from. */
  var base = new WebModules.RequestHandler(server);

  return WebModules.extend(base, {

    /** Maps a route to a controller. The controller is the flow control unit
     * which builds the command that will process the request.
     *
     * @param {String} path Route that must be matched to follow the
     *   specified controller. Cannot be null or empty.
     *
     * @param {Function|Object} handler Either a controller instance or a
     *   command class that will handle requests. If it's a controller
     *   instance, requests will be delegated to the controller. If it's a
     *   command constructor, it will execute the command by using a
     *   <code>WebModules.CommandController</code>.
     *
     * @param {Object} options Options to match this route. Can be null.
     */
    endpoint: function (path, handler, options) {
      var controller = handler;

      if (typeof handler === "function") {
        // Command constructor. Uses a CommandController by default.
        controller = new WebModules.MessageController(function () {
          return new handler();
        });
      }

      server.of(path).on('connection', function (socket) {
        LOG.info("WS client " + socket.id + " connected.")

        socket.on("message", function (data) {
          var model = controller.handle(data);
          if (!model) {
            throw new Error("There's not model to send back.");
          }
          model.wait(function () {
            LOG.debug("Sending WS response.")
            if (model.options.broadcast) {
              socket.broadcast.emit("message", model.data);
            } else {
              socket.emit("message", model.data);
            }
          });
        });
      });
    }
  });
};
