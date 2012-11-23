
/** Express.js middleware for the MVC framework.
 *
 * This class creates an Express application, attaches itself as middleware and
 * waits for server initialization.
 *
 * @constructor
 * @augments WebModules.RequestHandler
 */
WebModules.ExpressMiddleware = function () {

  /** Default logger.
   * @private
   */
  var LOG = require('winston');

  /** List of registered modules descriptions.
   * @type Object[]
   * @private
   * @fieldOf WebModules.ModuleManager#
   */
  var modulesDescriptions = [];

  /** Base object to inherit behaviour.
   * @private
   */
  var base = new WebModules.RequestHandler(modulesDescriptions);

  /** ExpressJS application.
   * @private
   * @fieldOf WebModules.ExpressMiddleware#
   */
  var app = require('express')();

  /** URL parser.
   * @private
   * @methodOf WebModules.ExpressMiddleware#
   */
  var parse = require("url").parse;

  /** Searches for the specified view using the registered view resolver.
   *
   * @param {WebModules.ModuleRequestWrapper} req Current HTTP request. Cannot
   *   be null.
   * @param {String} view Name of the required view. Cannot be null or empty.
   * @private
   * @methodOf WebModules.ExpressRequestHandler#
   */
  var lookup = function (req, view) {
    var viewResolver = req.context.config.viewResolver;
    var resolvedView;

    for (var engine in app.engines) {
      if (app.engines.hasOwnProperty(engine)) {
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
   * @param {WebModules.ModuleRequestWrapper} req Current HTTP request. Cannot
   *   be null.
   * @param {String} viewName View name to process. Cannot be null.
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
   * @param {WebModules.ModuleRequestWrapper} req Current HTTP request. Cannot
   *   be null.
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

      res.render(lookup(req, viewName) || viewName, {
        locals: data
      });
    }
  };

  /** Redirects this request to another path.
   *
   * The redirect path can contain either request parameters, cookies,
   * or request body fields.
   *
   * @param {WebModules.ModuleRequestWrapper} req Current HTTP request. Cannot
   *   be null.
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

  // MVC middleware.
  app.use(function (req, res, next) {
    var pathname = parse(req.url).pathname;
    var index = 0;

    var processNextModule = function (moduleDescription) {
      var module;

      if (!moduleDescription) {
        // If there's no module to handle this request, continues with
        // express execution.
        return next();
      }

      module = moduleDescription.module;

      // Checks whether the request must be handled by this module.
      if (pathname.indexOf(module.getContextPath()) === 0) {
        if (!moduleDescription.initialized) {
          module.init();
          moduleDescription.initialized = true;
        }

        module.dispatch(req, res, function () {
          // The module couldn't process the request, trying the next
          // matching module.
          processNextModule(modulesDescriptions[++index]);
        });
      } else {
        processNextModule(modulesDescriptions[++index]);
      }
    };
    processNextModule(modulesDescriptions[index]);
  });

  return WebModules.extend(base, {
    /** Initializes the express middleware over the specified server.
     * @param {Object} server HTTP(s) server to register Express. Cannot be
     *    null.
     */
    init: function (server) {
      server.on("request", app);
    },

    /** Validates whether the context endpoint can be handled as part of this
     * request. If this handler cannot proccess the endpoint, the next matching
     * endpoint will be processed.
     *
     * @param {WebModules.ModuleRequestWrapper} req Current HTTP request. Cannot
     *   be null.
     * @methodOf WebModules.ExpressRequestHandler#
     */
    validate: function (req) {
      var endpoint = req.context.endpoint;
      var pathname = parse(req.url).pathname;
      var path = pathname.replace(req.context.modulePath, "") || "/";
      var valid = endpoint.route.pattern.test(path);

      if (valid) {
        LOG.debug("Dispatching: " + req.method + " " + req.url +
          " matching "  + endpoint.route.path + " to " + path);
      }

      return valid;
    },

    /** Handles a request to the current endpoint.
     *
     * If at some point the request cannot be handled, the <code>next</code>
     * continuation function will process the next matching route.
     *
     * @param {WebModules.ModuleRequestWrapper} req Current HTTP request. Cannot
     *   be null.
     * @param {Object} res Current HTTP response. Cannot be null.
     * @param {function} next Continuation function invoked when the request
     *    cannot be handled. Cannot be null.
     * @methodOf WebModules.ExpressRequestHandler#
     */
    handle: function (req, res, next) {
      var endpoint = req.context.endpoint;
      var modelAndView;
      var path = req.url;
      var controller = endpoint.handler;

      if (typeof endpoint.handler === "function") {
        controller = new WebModules.CommandController(function () {
          var CommandClass = endpoint.handler;
          return new CommandClass();
        }, endpoint.viewName);
      }

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
    },

    /** Returns the Express.js application initialized by this middleware.
     * @return {Object} Returns an Express.js application. Never returns null.
     */
    getApplication: function () {
      return app;
    }
  });
};
