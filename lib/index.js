/** node-web-modules is a Domain-Driven MVC framework built on top of
 * Express.js and Socket.io.
 * @namespace
 */
WebModules = {};

require("./Utils.js");
require("./RequestHandler.js");
require("./ExpressRequestHandler.js");
require("./WebSocketRequestHandler.js");
require("./ModuleManager.js");
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

WebModules.extend(exports, WebModules);
