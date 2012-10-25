/** Represents a web module.
 *
 * Modules are the base application unit in WebModules. They provides the
 * following features:
 *
 *   - Default and custom request handlers
 *   - Filters
 *   - Internationalization (i18n)
 *   - Transaction management
 *   - Security
 *   - Error handling
 *   - View resolvers
 *
 * For further information refer to components documentation.
 *
 * @param {Object | Function} config Either the configuration object or a
 *    function to build the configuration. Cannot be null.
 * @param {String} config.contextPath URI part, relative to the webapp root,
 *   from which this module manages requests. Cannot be null or empty.
 * @constructor
 */
WebModules.Module = function (contextPath, config) {

  /** Default server type.
   * @constant
   * @private
   * @memberOf WebModules.Module
   */
  var DEFAULT_SERVER_TYPE = WebModules.ModuleManager.SERVER_TYPE.EXPRESS;

  /** Default request method if not specified.
   */
  var DEFAULT_VERB = "all";

  /** Checks constructor preconditions.
   */
  var checkPreconditions = (function () {
    if (!contextPath) {
      throw new Error("The context path cannot be null or empty.");
    }
    return true;
  }());

  /** Module server type.
   * @private
   * @fieldOf WebModules.Module
   */
  var serverType = config ? config.serverType || DEFAULT_SERVER_TYPE :
    DEFAULT_SERVER_TYPE;

  /** One of the supported request handlers depending on the server type
   * specified for this module.
   * @type WebModules.RequestHandler
   * @private
   * @fieldOf WebModules.Module
   */
  var requestHandler = null;

  /** List of endpoints definitions.
   * @type Object[]
   * @private
   * @fieldOf WebModules.Module
   */
  var endpoints = [];

  /** List of filters executed before endpoints handlers.
   * @type Object[]
   * @private
   * @fieldOf WebModules.Module
   */
  var filters = [];

  /** Registers unregistered endpoints into the request handler, if the module
   * is already initialized.
   */
  var processUnregisteredEndpoints = function () {
    if (requestHandler !== null) {
      endpoints.forEach(function (endpoint) {
        var path = contextPath;

        if (!endpoint.registered) {
          if (path.substr(-1) === "/" && endpoint.path.indexOf("/") === 0) {
            path += endpoint.path.substr(1);
          } else {
            path += endpoint.path;
          }
          requestHandler.endpoint(path, endpoint.handler, endpoint.options);
          endpoint.registered = true;
        }
      });
    }
  };

  return {
    /** Initializes this module and registers the related request handler.
     * @param {WebModules.RequestHandler} theRequestHandler Request handler used
     *   by the module to process requests.
     */
    init: function (theRequestHandler) {
      var route;

      if (config && config.routes) {
        for (var path in config.routes) {
          if (config.routes.hasOwnProperty(path)) {
            route = config.routes[path];
            this.route(path, route.handler, route.options);
          }
        }
      }
      requestHandler = theRequestHandler;
      processUnregisteredEndpoints();
      requestHandler.setFilters(filters);
    },

    /** Registers this module into the global context. Once registered requests
     * are also handled by it.
     */
    register: function () {
      WebModules.ModuleManager.register(this);
    },

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
    route: function (path, handler, options) {
      var checkPreconditions = (function () {
        if (!handler) {
          throw new Error("The handler cannot be null.");
        }

        return true;
      }());

      var configuration = options ? WebModules.extend({}, options) : {};

      if (!configuration.method) {
        configuration.method = DEFAULT_VERB;
      }

      endpoints.push({
        path: path,
        handler: handler,
        options: configuration,
        registered: false
      });

      processUnregisteredEndpoints();
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
     */
    getContextPath: function () {
      return contextPath;
    },

    /** Returns which kind of server must be used for this module.
     * @return {String} One of the valid servers defined in
     *   <code>ModuleManager.SERVER_TYPE</code>
     */
    getServerType: function () {
      return serverType;
    }
  };
};
