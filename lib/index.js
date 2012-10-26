/** Top-level namespace. */
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

WebModules.extend(exports, WebModules);
