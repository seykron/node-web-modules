/** Handles requests by using Express.js.
 *
 * @param {Object} server Express application. Cannot be null.
 * @constructor
 * @augments WebModules.RequestHandler
 */
WebModules.ExpressRequestHandler = function (server) {

  /** Default logger.
   * @private
   */
  var LOG = require('winston');

  /** Base object to inherit from.
   * @private
   */
  var base = new WebModules.RequestHandler(server);

  /** Searches for the specified view using the registered view resolver.
   *
   * @param {String} view Name of the required view. Cannot be null or empty.
   * @private
   * @methodOf WebModules.ExpressRequestHandler#
   */
  var lookup = function (view) {
    var viewResolver = base.getViewResolver();
    var resolvedView;

    for (var engine in server.engines) {
      if (server.engines.hasOwnProperty(engine)) {
        resolvedView = viewResolver.lookup(view + engine);

        if (resolvedView) {
          return resolvedView;
        }
      }
    }

    return null;
  };

  /** Resolves the default view name from the request.
   * This method assumes that the last part of the context path is the view
   * name, so for /webapp/foo the view name is foo, for /webapp/ the view name
   * is index.
   * @param {Object} req Current request to extract view name from. Cannot be
   *   null.
   * @private
   * @methodOf WebModules.ExpressRequestHandler#
   */
  var resolveViewFromRequest = function (req) {
    var viewName = req.route.params[req.route.params.length - 1] || "index";

    return viewName;
  };

  /** Replaces placeholders in the view name by proper values, if any.
   *
   * @param {String} viewName View name to process. Cannot be null.
   * @param {Object} req Current request. Cannot be null.
   * @return {String} The parsed view name. Never returns null.
   * @private
   * @methodOf WebModules.ExpressRequestHandler#
   */
  var processViewName = function (req, viewName) {
    var parsedViewname = viewName || resolveViewFromRequest(req);
    var params = WebModules.extend({}, req.params, req.query, req.body,
      req.cookies);

    for (property in params) {
      if (params.hasOwnProperty(property)) {
        parsedViewname = parsedViewname.replace(":" + property,
          params[property]);
      }
    }
    return parsedViewname;
  };

  /** Renders the view.
   *
   * @param {Object} req Current request. Cannot be null.
   * @param {Object} res Current response. Cannot be null.
   * @param {WebModules.ModelAndView} mav Model and view that contains redirect
   *   information. Cannot be null.
   * @private
   * @methodOf WebModules.ExpressRequestHandler#
   */
  var render = function (req, res, mav) {
    var data = mav.model ? mav.model.data : undefined;
    var viewName = processViewName(req, mav.viewName);

    if (req.xhr) {
      if (!mav.model) {
        throw new Error("Cannot send JSON response since there's not model.");
      }

      LOG.debug("Sending JSON to " + viewName);
      res.json(data);
    } else {
      LOG.debug("Rendering view " + viewName);

      res.render(lookup(viewName) || viewName, {
        locals: data
      });
    }
  };

  /** Redirects this request to another path.
   *
   * The redirect path can contain either request parameters, cookies,
   * or request body fields.
   *
   * @param {Object} req Current request. Cannot be null.
   * @param {Object} res Current response. Cannot be null.
   * @param {WebModules.ModelAndView} mav Model and view that contains redirect
   *   information. Cannot be null.
   * @private
   * @methodOf WebModules.ExpressRequestHandler#
   */
  var redirect = function (req, res, mav) {
    var redirectDescriptor = mav.getRedirect();
    var redirectTarget = redirectDescriptor.path;
    var params = WebModules.extend({}, req.params, req.query, req.body,
      req.cookies, redirectDescriptor.options);

    for (property in params) {
      if (params.hasOwnProperty(property)) {
        redirectTarget = redirectTarget.replace(":" + property,
          params[property]);
      }
    }
    LOG.debug("Redirecting to " + redirectTarget);

    res.redirect(redirectDescriptor.status, redirectTarget);
  };

  return WebModules.extend(base, {

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
     * @methodOf WebModules.ExpressRequestHandler#
     */
    endpoint: function (path, handler, options) {
      var verb = server[options.method.toLowerCase()];
      var controller = handler;

      if (typeof handler === "function") {
        // Command constructor. Uses a CommandController by default.
        controller = new WebModules.CommandController(function () {
          return new handler();
        });
      }

      var handleRequest = function (req, res, next) {
        // Handles the request after filters execution.
        base.processFilters(req, res, function (cancel, error) {
          var modelAndView;

          if (error) {
            // TODO (matias.mirabelli): Exception resolvers go here.
            throw error;
          }
          if (cancel) {
            LOG.info("Request processing aborted.");
            return;
          }

          if (controller) {
            if (!controller.canHandle(req, res)) {
              LOG.debug("Passing control to next handler for " + path);
              return next();
            }

            modelAndView = controller.handle(req, res);
          } else {
            modelAndView = new WebModules
              .ModelAndView(resolveViewFromRequest(req));
          }

          if (modelAndView != null) {
            if (modelAndView.getRedirect() !== null) {
              redirect(req, res, modelAndView);
            } else {
              if (modelAndView.model) {
                modelAndView.model.wait(function () {
                  render(req, res, modelAndView);
                });
              } else {
                render(req, res, modelAndView);
              }
            }
          }
        });
      };
      LOG.debug("Initializing route " + options.method.toUpperCase() + " " +
        path);

      verb.apply(server, [path, handleRequest]);
    }
  });
};
