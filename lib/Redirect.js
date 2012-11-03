/** Represents a redirect to the specified url.
 *
 * @param {String} target Url or route name to redirect the response to. If
 *    it's null the existing redirect will be removed.
 * @param {Number} [status] HTTP status code. Defaults to 302.
 * @param {Object} [options] Options for the redirect. If the target is a
 *    named route, the route url patterns will be replaced by the options
 *    properties.
 * @constructor
 */
WebModules.Redirect = function (target, status, options) {

  return WebModules.extend(this, {
    /** Either a fully qualified URI or pathname-relative redirect.
     * @type String
     * @fieldOf WebModules.Redirect#
     */
    path: target,

    /** Redirect status code. Cannot be null. Default is 302.
     * @type Number
     * @fieldOf WebModules.Redirect#
     */
    status: status || 302,

    /** Additional redirect path replacements. Cannot be null.
     * @type Object
     * @fieldOf WebModules.Redirect#
     */
    options: options || {}
  });
};
