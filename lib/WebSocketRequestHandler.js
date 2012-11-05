/** Handles requests by using socket.io.
 * @param {Object} server HTTP server. Cannot be null.
 * @constructor
 * @augments WebModules.RequestHandler
 */
WebModules.WebSocketRequestHandler = function (server) {

  /** Default logger.
   * @private
   */
  var LOG = require('winston');

  /** Base object to inherit from.
   * @private
   */
  var base = new WebModules.RequestHandler(server);

  return WebModules.extend(base, {

    /** Handles request to an endpoint.
     *
     * If at some point the request cannot be handled, the <code>next</code>
     * continuation function will process the next matching route.
     *
     * @param {Object} endpoint Endpoint description. Cannot be null.
     * @param {Object} req Current HTTP request. Cannot be null.
     * @param {Object} res Current HTTP response. Cannot be null.
     * @param {function} next Continuation function invoked when the request
     *    cannot be handled. Cannot be null.
     * @methodOf WebModules.WebSocketRequestHandler#
     */
    handle: function (endpoint, req, res, next) {
      var pathname;

      if (!endpoint.registered) {
        pathname = require("url").parse(req.url).pathname;

        server.of(req.modulePath).on('connection', function (socket) {
          LOG.info("WS client " + socket.id + " connected.")

          socket.on(endpoint.path, function (data) {
            var model = endpoint.handler.handle(data);

            if (!model) {
              throw new Error("There's not model to send back.");
            }

            model.wait(function () {
              LOG.debug("Sending WS response.")
              if (model.options.broadcast) {
                socket.broadcast.emit(endpoint.path, model.data);
              } else {
                socket.emit(endpoint.path, model.data);
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
