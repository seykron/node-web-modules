/**
 * Represents a combination of a model and a view. A model is an object with
 * information available in the view. The view is the presentation layer
 * proccessed by a rendering engine.
 *
 * @param {String} [theViewName] The view name. Depending on the content type,
 *    it can be null.
 * @param {WebModules.Model} [theModel] Model instance available in the view. Can
 *    be null.
 * @constructor
 */
WebModules.ModelAndView = function (theViewName, theModel) {

  /** Redirects that must be follow by this view; no redirect is followed by
   * default.
   *
   * @type WebModules.Redirect
   * @private
   * @fieldOf WebModules.ModelAndView
   */
  var redirect = null;

  return WebModules.extend(this, {
    /** Name of the view represented by this object.
     * @type String
     */
    viewName : theViewName,

    /** Model object. Can be null if it's 'not needed.
     * @type WebModules.Model
     */
    model : theModel || new WebModules.Model(),

    /** Forces this view to follow the specified redirect.
     *
     * @param {WebModules.Redirect} theRedirect Redirect to follow. Can be null.
     */
    sendRedirect: function (theRedirect) {
      redirect = theRedirect;
    },

    /** Returns the redirect information.
     *
     * @return {Object} An object that contains the redirect <code>path</code>,
     *   HTTP <code>status</code> code, and <code>options</code> to perform
     *   replacements in the path. Never returns null.
     */
    getRedirect: function () {
      return redirect;
    }
  });
};

