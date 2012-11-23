/** Represents a web module.
 *
 * Modules are the base application unit in WebModules. They provide the
 * following features:
 * <ul>
 *   <li>Filters</li>
 *   <li>View resolvers</li>
 *   <li>Serve static content</li>
 * </ul>
 *
 * For further information refer to components documentation.
 *
 * @param {String} contextPath Base path where this module is scoped to. Cannot
 *   be null or empty.
 * @param {WebModules.RequestHandler} middleware Middleware used by this module
 *    to dispatch requests. Cannot be null.
 * @param {Object} [configuration] Either the configuration object or a
 *    function to build the configuration. Cannot be null.
 * @constructor
 */
WebModules.Module = function (contextPath, middleware, configuration) {

  /** Default logger.
   * @private
   */
  var LOG = require('winston');

  /** Checks constructor preconditions.
   * @private
   */
  var checkPreconditions = (function () {
    if (!contextPath) {
      throw new Error("The context path cannot be null or empty.");
    }
    if (!middleware) {
      throw new Error("The middleware cannot be null.");
    }
    return true;
  }());

  /** Module default configuration overriden by custom options.
   * @namespace
   * @private
   */
  var Config = WebModules.extend({

    /** Route definitions relative to the module context path.
     *
     * @example
     *    {
     *      "/home": {
     *        handler: MyCommand,
     *        viewName: "index"
     *      }
     *    }
     * @namespace
     */
    routes: {},

    /** List of view paths in the file system.
     * @type String[]
     */
    viewPaths: [],

    /** Static content mappings relative to the module context path.
     *
     * @example
     *    {
     *      "/asset": __dirname + "/view/my-module"
     *    }
     * @namespace
     */
    staticContent: {},

    /** Module name, used for logging purposes.
     * @type String
     */
    name: contextPath,

    /** View resolver used to lookup views.
     * @type WebModules.MultiPathViewResolver
     */
    viewResolver: new WebModules.MultiPathViewResolver(),

    /** List of filters executed before endpoints handlers.
     *
     * Filters can have a priority (default is 0) to indicate the execution
     * order. Higher priority means that will be executed first.
     *
     * @type Object[Number => Object[]]
     * @example
     *    {
     *      4: [new FooFilter(), new BarFilter()],
     *      12: [new DummyFilter()]
     *    }
     */
    filters: {},

    /** Mapper to register static resources endpoints.
     *
     * @type {WebModules.StaticContentMapper}
     * @private
     * @methodOf WebModules.Module#
     */
    staticContentMapper: new WebModules.StaticContentMapper()
  }, configuration || {});

  /** List of endpoints definitions.
   * @type Object[]
   * @private
   * @fieldOf WebModules.Module#
   */
  var endpoints = [];

  /** Registers an endpoint.
   *
   * @param {String} path Endpoint path to register. Cannot be null or empty.
   * @param {Object|Function} endpointDescription Either object containing
   *    endpoint information or a command constructor to handle requests
   *    using default options. Cannot be null.
   * @private
   * @methodOf WebModules.Module#
   */
  var registerEndpoint = function (path, endpointDescription) {
    var endpoint = {};

    if (typeof endpointDescription === "function") {
      // No options, just the handler.
      endpoint.handler = endpointDescription;
    } else {
      WebModules.extend(endpoint, endpointDescription);
    }

    endpoints.push(WebModules.extend(endpoint, {
      route: {
        path: path,
        pattern: new RegExp("^" + path + "$")
      }
    }));
  };

  /** Maps an URI to serve static resources from the specified directory.
   * @param {String} uri URI relative to the module root. Cannot be null or
   *   empty.
   * @param {String} path File system directory to expose. Cannot be null or
   *    empty.
   * @methodOf WebModules.Module#
   */
  var staticContent = function (uri, path) {
    var scopedPath = contextPath;
    if (scopedPath.substr(-1) !== "/") {
      scopedPath += "/";
    }
    if (uri.substr(0, 1) === "/") {
      scopedPath += uri.substr(1);
    } else {
      scopedPath += uri;
    }
    Config.staticContentMapper.add(scopedPath, path);
  };

  return {

    /** Initializes this module.
     * @methodOf WebModules.Module#
     */
    init: function () {
      var path;

      // Known bug: routes registered via route() have precedence over routes
      // defined in the contructor.
      for (path in Config.routes) {
        if (Config.routes.hasOwnProperty(path)) {
          registerEndpoint(path, Config.routes[path]);
        }
      }

      Config.viewPaths.forEach(function (viewPath) {
        Config.viewResolver.addViewPath(viewPath);
      });

      for (path in Config.staticContent) {
        if (Config.staticContent.hasOwnProperty(path)) {
          staticContent(path, Config.staticContent[path]);
        }
      }
    },

    /** Dispatches a request to the underlying controller.
     * @param {Object} req Current request. Cannot be null.
     * @param {Object} res Current response. Cannot be null.
     * @param {Function} next Continuation callback. Cannot be null.
     */
    dispatch: function (req, res, next) {
      var index = 0;

      var processNextEndpoint = function (endpoint) {
        var wrappedRequest = new WebModules.ModuleRequestWrapper(req, {
          modulePath: contextPath,
          endpoint: endpoint,
          config: Config
        });

        if (!endpoint) {
          return next();
        }

        // Dispatches the request via the middleware.
        middleware.dispatch(wrappedRequest, res, function (info) {
          if (info && info.error) {
            LOG.error("Error processing request: " + info.error.message);

            // TODO (matias.mirabelli): Exception resolvers go here.
            throw info.error;
          }
          if (info && info.cancel) {
            LOG.info("Request processing aborted.");

            return;
          }
          processNextEndpoint(endpoints[++index]);
        });
      };

      processNextEndpoint(endpoints[index]);
    },

    /** Registers this module into the global context. Once registered requests
     * are also handled by it.
     * @methodOf WebModules.Module#
     */
    register: function () {
      middleware.register(this);
    },

    /** Registers an endpoint.
     *
     * @param {String} path Endpoint path to register. Cannot be null or empty.
     * @param {Object|Function} endpointDescription Either object containing
     *    endpoint information or a command constructor to handle requests
     *    using default options. Cannot be null.
     * @methodOf WebModules.Module#
     */
    route: registerEndpoint,

    /** Maps a filter. The filter chain is executed before the request handler.
     * If a filter doesn't delegate to the next filter the request won't be
     * processed.
     *
     * This method must be called before the module runtime initialization.
     * After that moment, it takes no effect.
     *
     * @param {Object} filter Filter instance. Cannot be null.
     * @param {Number} [order] 0-based order of the filter. Default is 0.
     * @methodOf WebModules.Module#
     */
    filter: function (filter, order) {
      var filters = Config.filters;
      var index = (order !== undefined) ? order : 0;

      if (!filters[index]) {
        filters[index] = [];
      }
      filters[index].push(filter);
    },

    /** Returns the module base context path. Requests under this path will
     * be addressed by this module.
     * @return {String} A valid path, never returns null or empty.
     * @methodOf WebModules.Module#
     */
    getContextPath: function () {
      return contextPath;
    }
  };
};
