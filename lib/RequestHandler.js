/** Base class that must be extended in order to handle requests lifecycles.
 * @param {Object} server Handler-specific server. Cannot be null.
 */
WebModules.RequestHandler = function (server) {

  /** Filters executed before endpoints handlers.
   * @type Object[]
   * @private
   * @fieldOf WebModules.RequestHandler#
   */
  var filters = [];

  /** View resolver to lookup views.
   * @type Object
   * @private
   * @fieldOf WebModules.RequestHandler#
   */
  var viewResolver = null;

  /** Represents the current execution of a chain of filters.
   *
   * @param {Function} nextCallback Function invoked to force the next filter
   *    execution. Cannot be null.
   * @param {Function} stopCallback Function invoked to stop the filter chain
   *    processing. Cannot be null.
   */
  var FilterChain = function (nextCallback, stopCallback) {

    return {
      /** Processes the next filter.
       */
      next: function () {
        nextCallback();
      },

      /** Halts the filter chain processing.
       */
      stop: function () {
        stopCallback();
      }
    };
  };

  return {
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
      throw new Error("Must be implemented by the subclass.");
    },

    /** Executes the filter chain and invokes the request handler after filters
     * execution.
     *
     * @param {Object} req Request object. Cannot be null.
     * @param {Object} res Response object. Cannot be null.
     * @param {Function} callback Function invoked once all filters were
     *    executed. Cannot be null.
     */
    processFilters: function (req, res, callback) {
      var filterList = [];

      filters.forEach(function (filter) {
        filterList = filterList.concat(filter);
      });

      var processFilter = function (filter) {
        var filterChain;

        if (!filter) {
          callback(false);
          return;
        }

        filterChain = new FilterChain(processFilter
          .bind(this, filterList.shift()), callback.bind(this, true));

        try {
          filter.execute(req, res, filterChain);
        } catch (cause) {
          callback(true, cause);
        }
      };
      processFilter(filterList.shift());
    },

    /** Sets the list of filters that will be executed before endpoint
     * handlers.
     *
     * Each position in the list represents the execution order, and each
     * list in that position contains filters objects.
     *
     * @param {Object[][]} theFilters List of filters. Cannot be null.
     */
    setFilters: function (theFilters) {
      filters = theFilters;
    },

    /** Sets the view resolver to lookup views.
     *
     * @param {Object} theViewResolver Custom view resolver. Cannot be null.
     */
    setViewResolver: function (theViewResolver) {
      viewResolver = theViewResolver;
    },

    /** Returns the configured view resolver, if any.
     *
     * @return {Object} A valid view resolver, or null if it isn't configured.
     */
    getViewResolver: function () {
      return viewResolver;
    }
  };
};
