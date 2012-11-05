/** node-web-modules is a Domain-Driven MVC framework built on top of
 * Express.js and Socket.io.
 * @namespace
 */
WebModules = {};

// Supported middlewares.
require("./ExpressMiddleware.js");
require("./WebSocketMiddleware.js");

// All other dependencies.
require("./Utils.js");
require("./RequestHandler.js");
require("./ExpressRequestHandler.js");
require("./WebSocketRequestHandler.js");
require("./Module.js");
require("./CommandController.js");
require("./MessageController.js");
require("./ModelAndView.js");
require("./Model.js");
require("./Redirect.js");
require("./MultiPathViewResolver.js");
require("./StaticContentMapper.js");
require("./DeploymentAgent.js");
require("./ObjectDataBinder.js");


/** Enumeration of supported server types for modules. Any of these types
 * can be specified when a Module is instantiated.
 * @namespace
 */
WebModules.ServerType = {

  /** Express.js server. This is the default.
   * @constant
   */
  EXPRESS: new WebModules.ExpressMiddleware(),

  /** Web sockets server. It uses socket.io over express server.
   * @constant
   */
  WEB_SOCKET: new WebModules.WebSocketMiddleware()
};

/** Initialization function.
 * @param {Object} server HTTP(s) server used to initialize modules. Cannot
 *   be null.
 */
var init = function (server) {
  var type;

  for (type in WebModules.ServerType) {
    if (WebModules.ServerType.hasOwnProperty(type)) {
      WebModules.ServerType[type].init(server);
    }
  }
};

module.exports = WebModules.extend(init, WebModules);
