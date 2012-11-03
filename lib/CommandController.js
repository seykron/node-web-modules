
/** Base controller that defines the general contract to handle requests
 * using commands.
 * <p>
 * Controllers are part of the application layer together with commands.
 * Controllers are distinguished from commands because they must only
 * perform flow handling while commands must execute operations over the
 * domain.
 * </p>
 * <p>
 * When a controller handles a request it instantiates the command, then
 * performs data binding and finally the command is invoked. Data binding
 * is performed according to the controller configuration. By default all
 * route parameters, request parameters and request body will be bound.
 * Command objects must expose public attributes in order to bind them.
 * </p>
 * <p>
 * As commands can return any object, the controller uses a
 * <code>ModelAndView</code> to wrap the command response as model
 * before passing control to the view.
 * </p>
 * <p>
 * Commands are able to return any plain object, but there exist some useful
 * results:
 * <ul>
 *   <li>{@link WebModules.ModelAndView}: contains the model exposed to the
 *      view and the view information.</li>
 *   <li>{@link WebModules.Model}: returns a model, view information
 *      is resolved from the controller configuration.</li>
 *   <li>{@link WebModules.Redirect}: forces a redirect.</li>
 * </ul>
 * </p>
 *
 * @param {Function} createCommand Function invoked to build a new command
 *    object. Cannot be null.
 *
 * @param {String} [viewName] Name of the target view. If it's null the view
 *    name is resolved from the current request route according to
 *    rules described by {@link WebModules.ExpressRequestHandler}.
 *
 * @param {Object} [options] Configuration options for this controller.
 *
 * @param {Boolean} [options.bindRouteParams] Indicates whether route
 *   parameters will be bound to the command. Default is true.
 *
 * @param {Boolean} [options.bindRequestParams] Indicates whether request
 *   parameters will be bound to the command. Default is true.
 *
 * @param {Boolean} [options.bindRequestBody] Indicates whether the request
 *   body will be bound to the command. Default is true.
 *
 * @param {Boolean} [options.bindCookies] Indicates whether cookies
 *   will be bound to the command. Default is false.
 *
 * @constructor
 */
WebModules.CommandController = function (createCommand, viewName, options) {

  /** Controller general options. Look at the constructor documentation for
   * further information.
   *
   * @private
   * @fieldOf WebModules.CommandController#
   */
  var config = WebModules.extend({
    bindRouteParams: true,
    bindRequestParams: true,
    bindRequestBody: true,
    bindCookies: false
  }, options);

  /** Checks constructor preconditions.
   * @private
   */
  var checkPreconditions = (function () {
    if (typeof createCommand !== "function") {
      throw new Error("The command factory cannot be null.");
    }

    return true;
  }());

  return {
    /** Determines whether this controller can handle the request or not.
     *
     * If this controller cannot handle the request, it will be delegated to
     * the next matching controller for this route.
     *
     * @param {Object} req Current request object. It's never null.
     * @param {Object} res Current response object. It's never null.
     * @return {Boolean} true if the controller can handle the request,
     *   false otherwise.
     * @methodOf WebModules.CommandController#
     */
    canHandle: function (req, res) {
      return true;
    },

    /** Handles the current request by using the specified command.
     *
     * @param {Object} request  Request object. It's never null.
     * @param {Object} response Response object. It's never null.
     * @param {Object} command Command to execute. It's never null.
     * @methodOf WebModules.CommandController#
     */
    handleInternal: function (req, res, command) {
      return command.execute();
    },

    /** Handles the current request.
     * @param {Object} request  Request object. It's never null.
     * @param {Object} response Response object. It's never null.
     *
     * @return {WebModules.ModelAndView} Object that provides information to
     *   the rendering strategy. Never returns null.
     * @methodOf WebModules.CommandController#
     */
    handle: function (request, response) {
      var command = createCommand(request, response);
      var binder = new WebModules.ObjectDataBinder(command);
      var result;
      var mav;

      // Bind available data, in any.
      if (config.bindRouteParams) {
        binder.bind(request.params);
      }
      if (config.bindRequestParams) {
        binder.bind(request.query);
      }
      if (config.bindRequestBody) {
        binder.bind(request.body);
      }
      if (config.bindCookies) {
        binder.bind(request.cookies);
      }

      result = this.handleInternal(request, response, command);

      if (result instanceof WebModules.Model) {
        mav = new WebModules.ModelAndView(viewName, result);
      } else if (result instanceof WebModules.Redirect) {
        mav = new WebModules.ModelAndView();
        mav.sendRedirect(result);
      } else {
        mav = new WebModules.ModelAndView(viewName,
          new WebModules.Model(result));
      }

      return mav;
    }
  };
};
