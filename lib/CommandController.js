
/** Base controller that defines the general contract for command-based MVC
 * pattern flows.
 * <p>
 * Controllers are part of the application layer together with commands.
 * Controllers and commands are distinguished because the ones must only
 * perform flow handling while commands must execute operations over the
 * domain.
 * </p>
 * <p>
 * When a controller handles a request it instantiates the command, then
 * performs data binding and finally it invokes the command. Data binding
 * is performed according to the controller configuration. By default all
 * route parameters, request parameters and request body will be bound.
 * Command objects must expose public attributes in order to bind them.
 * </p>
 * <p>
 * As commands can return any object, the controller uses a
 * <code>ModelAndView</code> to wrap the command response as model before
 * passing control to the view. Commands could also choose to return a
 * <code>ModelAndView</code> in order to prevent the instantiation by the
 * controller.
 * </p>
 *
 * @param {Function} createCommand Function invoked to build a new command
 *    object. Cannot be null.
 *
 * @param {String} [viewName] Name of the target view. Can be null only if the
 *   request is AJAX.
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
   * @fieldOf WebModules.CommandController
   */
  var options = options || {};

  /** Checks constructor preconditions. */
  var checkPreconditions = (function () {
    if (typeof createCommand !== "function") {
      throw new Error("The command factory cannot be null.");
    }

    return true;
  }());

  /** Indicates whether route parameters will be bound to the comand or not.
   * @type Boolean
   */
  var bindRouteParams = (options.bindRouteParams !== undefined) ?
      options.bindRouteParams : true;

  /** Indicates whether request parameters will be bound to the comand or not.
   * @type Boolean
   */
  var bindRequestParams = (options.bindRequestParams !== undefined) ?
        options.bindRequestParams : true;

  /** Indicates whether the request body will be bound to the comand or not.
   * @type Boolean
   */
  var bindRequestBody = (options.bindRequestBody !== undefined) ?
      options.bindRequestBody : true;

  /** Indicates whether cookies will be bound to the comand or not.
   * @type Boolean
   */
  var bindCookies = (options.bindCookies !== undefined) ?
      options.bindCookies : false;

  /** Replaces placeholders in the view name by proper values, if any.
   *
   * @param {Object} params Object that contains the values to replace
   *   placeholders. Cannot be null.
   * @return {String} The parsed view name. Never returns null.
   * @private
   * @methodOf WebModules.CommandController
   */
  var parseViewName = function (params) {
    var parsedViewname = viewName || "";

    for (property in params) {
      if (params.hasOwnProperty(property)) {
        parsedViewname = parsedViewname.replace(":" + property,
          params[property]);
      }
    }
    return parsedViewname;
  };

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
     */
    canHandle: function (req, res) {
      return true;
    },

    /** Handles the current request for the specified command.
     *
     * @param {Object} request  Request object. It's never null.
     * @param {Object} response Response object. It's never null.
     * @param {Object} command Command to execute. It's never null.
     */
    handleInternal: function (req, res, command) {
      return command.execute();
    },

    /** Handles the current request.
     * @param  {Object} request  Request object. It's never null.
     * @param  {Object} response Response object. It's never null.
     *
     * @return {SocialHub.ModelAndView} Object that provides information to
     *   the rendering strategy. Never returns null.
     */
    handle: function (request, response) {
      var command = createCommand(request, response);
      var params = {};
      var name;
      var result;
      var mav;

      // Bind available data, in any.
      if (bindRouteParams) {
        WebModules.bind(command, request.params);
      }
      if (bindRequestParams) {
        WebModules.bind(command, request.query);
      }
      if (bindRequestBody) {
        WebModules.bind(command, request.body);
      }
      if (bindCookies) {
        WebModules.bind(command, request.cookies);
      }

      result = this.handleInternal(request, response, command);

      if (result instanceof WebModules.Model) {
        mav = new WebModules.ModelAndView(parseViewName(params), result);
      } else if (result instanceof WebModules.Redirect) {
        mav = new WebModules.ModelAndView();
        mav.sendRedirect(result);
      } else {
        mav = new WebModules.ModelAndView(parseViewName(params),
          new WebModules.Model(result));
      }

      return mav;
    }
  };
};
