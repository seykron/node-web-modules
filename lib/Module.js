/** Represents a web module.
 *
 * Modules are the base application unit in WebModules. They provide the
 * following features:
 * <ul>
 *   <li>Default and custom request handlers</li>
 *   <li>Filters</li>
 *   <li>View resolvers</li>
 * </ul>
 *
 * For further information refer to components documentation.
 *
 * @param {Object} [configuration] Either the configuration object or a
 *    function to build the configuration. Cannot be null.
 * @param {String} [configuration.serverType] Type of server used by this
 *    module.
 * @constructor
 */
WebModules.Module = function (contextPath, configuration) {

  /** Default logger.
   * @private
   */
  var LOG = require('winston');

  /** Default request method if not specified.
   * @private
   * @fieldOf WebModules.Module#
   */
  var DEFAULT_VERB = "all";

  /** Checks constructor preconditions.
   * @private
   */
  var checkPreconditions = (function () {
    if (!contextPath) {
      throw new Error("The context path cannot be null or empty.");
    }
    return true;
  }());

  /** Module default configuration overriden by custom options.
   * @type Object
   * @private
   */
  var config = WebModules.extend({
    serverType: WebModules.ServerType.EXPRESS,
    routes: {},
    viewPaths: [],
    staticContent: {},
    name: contextPath
  }, configuration || {});

  /** One of the supported request handlers depending on the server type
   * specified for this module.
   * @type WebModules.RequestHandler
   * @private
   * @fieldOf WebModules.Module#
   */
  var requestHandler = config.serverType.newRequestHandler();

  /** List of endpoints definitions.
   * @type Object[]
   * @private
   * @fieldOf WebModules.Module#
   */
  var endpoints = [];

  /** List of filters executed before endpoints handlers.
   * @type Object[]
   * @private
   * @fieldOf WebModules.Module#
   */
  var filters = [];

  /** Default view resolver for this module.
   * @type WebModules.MultiPathViewResolver
   * @private
   * @fieldOf WebModules.Module#
   */
  var viewResolver = new WebModules.MultiPathViewResolver();

  /** Mapper to register static resources endpoints.
   *
   * @type {WebModules.StaticContentMapper}
   * @private
   * @methodOf WebModules.Module#
   */
  var staticContentMapper = new WebModules.StaticContentMapper(WebModules
    .ServerType.EXPRESS);

  /** Registers a single route.
   * @param {String} path Route path to register. Cannot be null or empty.
   * @param {Object} routeDefinition Route definition to register. Cannot be
   *    null.
   * @private
   * @methodOf WebModules.Module#
   */
  var registerRoute = function (path, routeDefinition) {
    var routeConfig = WebModules.extend({
      method: DEFAULT_VERB
    }, routeDefinition.options || {});
    var handler;

    // Constructs the default controller for the specified command.
    var defaultController = function (Command) {
      return config.serverType.newDefaultController(routeDefinition, Command);
    };

    if (typeof routeDefinition === "function") {
      // No options, just the handler.
      handler = defaultController(routeDefinition);
    } else {
      if (typeof routeDefinition.handler === "function") {
        // The handler is a command class. Constructs the
        // CommandController using the specified view name.
        handler = defaultController(routeDefinition.handler);
      } else {
        // Assumes controller instance.
        handler = routeDefinition.handler;
      }
    }

    endpoints.push({
      path: path,
      pattern: new RegExp("^" + path + "$"),
      handler: handler,
      options: routeConfig,
      registered: false
    });
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
    staticContentMapper.add(scopedPath, path);
  };

  return {

    /** Initializes this module.
     * @methodOf WebModules.Module#
     */
    init: function () {
      var path;

      // Known bug: routes registered via route() have precedence over routes
      // defined in the contructor.
      for (path in config.routes) {
        if (config.routes.hasOwnProperty(path)) {
          registerRoute(path, config.routes[path]);
        }
      }

      config.viewPaths.forEach(function (viewPath) {
        viewResolver.addViewPath(viewPath);
      });

      for (path in config.staticContent) {
        if (config.staticContent.hasOwnProperty(path)) {
          staticContent(path, config.staticContent[path]);
        }
      }

      //processUnregisteredEndpoints();
      requestHandler.setFilters(filters);
      requestHandler.setViewResolver(viewResolver);
    },

    /** Dispatches a request to the underlying controller.
     * @param {Object} req Current request. Cannot be null.
     * @param {Object} res Current response. Cannot be null.
     * @param {Function} next Continuation callback. Cannot be null.
     */
    dispatch: function (req, res, next) {
      var index = 0;

      // Exposes the module path in the request.
      req.modulePath = contextPath;

      var processNextEndpoint = function (endpoint) {
        if (!endpoint) {
          return next();
        }

        requestHandler.dispatch(endpoint, req, res, function (info) {
          if (info && info.error) {
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
      config.serverType.register(this);
    },

    /** Maps a route to a controller. The controller is the flow control unit
     * which builds the command that will process the request.
     *
     * @param {String} path Route that must be matched to follow the
     *   specified controller. Cannot be null or empty.
     *
     * @param {Function|Object} [handler] Either a controller instance or a
     *   command class that will handle requests. If it's a controller
     *   instance, requests will be delegated to the controller. If it's a
     *   command constructor, it will execute the command by using a
     *   <code>WebModules.CommandController</code>. If it isn't specified
     *   a view named as the last part of the context path will be rendered
     *   without any processing.
     *
     * @param {Object} options Options to match this route. Can be null.
     * @methodOf WebModules.Module#
     */
    route: function (path, handler, options) {
      registerRoute(path, {
        handler: handler,
        options: options
      });
    },

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
      var index = (order !== undefined) ? order : filters.length;

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
    },

    /** Returns which kind of server must be used for this module.
     * @return {String} One of the valid servers defined in
     *   <code>ModuleManager.SERVER_TYPE</code>
     * @methodOf WebModules.Module#
     */
    getServerType: function () {
      return config.serverType;
    }
  };
};
