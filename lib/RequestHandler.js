/** Base class that must be extended in order to handle requests lifecycles.
 * @param {Object} server Handler-specific server. Cannot be null.
 * @constructor
 */
WebModules.RequestHandler = function (server) {

  /** Default logger.
   * @private
   */
  var LOG = require('winston');

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


  /** Executes the filter chain and invokes the request handler after filters
   * execution.
   *
   * @param {Object} req Request object. Cannot be null.
   * @param {Object} res Response object. Cannot be null.
   * @param {Function} callback Function invoked once all filters were
   *    executed. Cannot be null.
   * @methodOf WebModules.RequestHandler#
   */
  var processFilters = function (req, res, callback) {
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
  };

  return {

    /** Validates whether the specified endpoint can be handled as part of this
     * request. If this handler cannot proccess the endpoint, the next matching
     * endpoint will be processed.
     *
     * @param {Object} endpoint Endpoint definition to validate against the
     *   request. It's never null.
     * @param {Object} req Current request. Cannot be null.
     * @methodOf WebModules.RequestHandler#
     */
    validate: function (endpoint, req) {
      return true;
    },

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
     * @methodOf WebModules.RequestHandler#
     */
    handle: function (endpoint, req, res, next) {
      throw new Error("Must be implemented by subclasses.")
    },

    /** Dispatches a request to the specified endpoint.
     *
     * <p>
     * It checks whether the request is valid and if it doesn't, the request
     * dispatching will be rejected and the module will process the next
     * matching route.
     * </p>
     * <p>
     * If the request is valid for the endpoint, all filters will be processed
     * before handling the request.
     * </p>
     *
     * @param {Object} endpoint Endpoint description. Cannot be null.
     * @param {Object} req Current HTTP request. Cannot be null.
     * @param {Object} res Current HTTP response. Cannot be null.
     * @param {function} next Continuation function invoked when the request
     *    cannot be handled. Cannot be null.
     * @methodOf WebModules.RequestHandler#
     */
    dispatch: function (endpoint, req, res, next) {
      if (!this.validate(endpoint, req)) {
        return next();
      }

      // Executes filters before dispatching the request.
      processFilters(req, res, function (cancel, error) {
        var modelAndView;

        if (error) {
          // TODO (matias.mirabelli): Exception resolvers go here.
          next({ error: error })
        }

        if (cancel) {
          next({ cancel: true })
          return;
        }

        this.handle(endpoint, req, res, function (info) {
          next(info);
        });
      }.bind(this));
    },

    /** Sets the list of filters that will be executed before endpoint
     * handlers.
     *
     * Each position in the list represents the execution order, and each
     * list in that position contains filters objects.
     *
     * @param {Object[]} theFilters List of filters. Cannot be null.
     * @methodOf WebModules.RequestHandler#
     */
    setFilters: function (theFilters) {
      filters = theFilters;
    },

    /** Sets the view resolver to lookup views.
     *
     * @param {Object} theViewResolver Custom view resolver. Cannot be null.
     * @methodOf WebModules.RequestHandler#
     */
    setViewResolver: function (theViewResolver) {
      viewResolver = theViewResolver;
    },

    /** Returns the configured view resolver, if any.
     *
     * @return {Object} A valid view resolver, or null if it isn't configured.
     * @methodOf WebModules.RequestHandler#
     */
    getViewResolver: function () {
      return viewResolver;
    }
  };
};
