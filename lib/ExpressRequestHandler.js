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
        // Performance tweak: looks for the view only once according to the
        // engine suffix.
        if (view.substr(-engine.length) === engine) {
          resolvedView = viewResolver.lookup(view);
        } else {
          resolvedView = viewResolver.lookup(view + engine);
        }
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
    var viewName = req.url.substr(req.url.lastIndexOf("/") + 1) || "index";

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
    var parsedViewname = viewName;
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

    /** Validates whether the specified endpoint can be handled as part of this
     * request. If this handler cannot proccess the endpoint, the next matching
     * endpoint will be processed.
     *
     * @param {Object} endpoint Endpoint definition to validate against the
     *   request. It's never null.
     * @param {Object} req Current request. Cannot be null.
     * @methodOf WebModules.ExpressRequestHandler#
     */
    validate: function (endpoint, req) {
      var pathname = require("url").parse(req.url).pathname;
      var path = pathname.replace(req.modulePath, "") || "/";
      var valid = endpoint.pattern.test(path);

      if (valid) {
        LOG.debug("Dispatching: " + req.method + " " + req.url +
          " matching "  + endpoint.path + " to " + path);
      }

      return valid;
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
     * @methodOf WebModules.ExpressRequestHandler#
     */
    handle: function (endpoint, req, res, next) {
      var modelAndView;
      var path = req.url;
      var controller = endpoint.handler;

      if (controller) {
        if (!controller.canHandle(req, res)) {
          LOG.debug("Passing control to next handler for " + path);
          return next();
        }

        modelAndView = controller.handle(req, res);

        // If there's a handler, the view name is taken from the path in
        // order to avoid arbitrary view rendering in module endpoints.
        if (!modelAndView.viewName) {
          if (path.substr(-1) === "/") {
            modelAndView.viewName = "index";
          } else {
            modelAndView.viewName = path.substr(path.lastIndexOf("/") + 1);
          }
        }
      } else {
        modelAndView = new WebModules
          .ModelAndView(resolveViewFromRequest(req));
      }

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
