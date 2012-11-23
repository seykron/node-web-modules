/** Base class that must be extended in order to implement middlewares.
 *
 * @param {Object[]} modulesDescriptions List of objects describing registered
 *    modules in this middleware.
 *
 * @constructor
 */
WebModules.RequestHandler = function (modulesDescriptions) {

  /** Default logger.
   * @private
   */
  var LOG = require('winston');

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
    var filters = req.context.config.filters;
    var filterList = [];
    var order;

    for (order in filters) {
      if (filters.hasOwnProperty(order)) {
        filterList = filterList.concat(filters[order]);
      }
    }

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

    /** Registers a module into this middleware. Once registered, modules
     * will handle requests that match their context path.
     *
     * @param {WebModules.Module} module Module to register. Cannot be null.
     * @methodOf WebModules.RequestHandler#
     */
    register: function (module) {
      LOG.info("Registering module " + module.getContextPath());
      modulesDescriptions.push({
        initialized: false,
        module: module
      });
    },

    /** Validates whether the context endpoint can be handled as part of this
     * request. If this handler cannot proccess the endpoint, the next matching
     * endpoint will be processed.
     *
     * @param {WebModules.ModuleRequestWrapper} req Current HTTP request. Cannot
     *   be null.
     * @methodOf WebModules.RequestHandler#
     */
    validate: function (req) {
      return true;
    },

    /** Handles request to an endpoint.
     *
     * If at some point the request cannot be handled, the <code>next</code>
     * continuation function will process the next matching route.
     *
     * @param {WebModules.ModuleRequestWrapper} req Current HTTP request. Cannot
     *   be null.
     * @param {Object} res Current HTTP response. Cannot be null.
     * @param {function} next Continuation function invoked when the request
     *    cannot be handled. Cannot be null.
     * @methodOf WebModules.RequestHandler#
     */
    handle: function (req, res, next) {
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
     * @param {Object} res Current HTTP response. Cannot be null.
     * @param {function} next Continuation function invoked when the request
     *    cannot be handled. Cannot be null.
     * @methodOf WebModules.RequestHandler#
     */
    dispatch: function (req, res, next) {
      if (!this.validate(req)) {
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

        this.handle(req, res, next);
      }.bind(this));
    }
  };
};
