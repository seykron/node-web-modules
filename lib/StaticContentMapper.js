/** Exposes file system directories to provide public static content.
 *
 * @param {Object} app Express.js application. Cannot be null.
 * @constructor
 */
WebModules.StaticContentMapper = function () {

  /** Default logger.
   * @private
   * @fieldOf WebModules.StaticContentMapper
   */
  var LOG = require('winston');

  /** Express.js library.
   * @private
   * @fieldOf WebModules.StaticContentMapper
   */
  var express = require("express");

  return {
    /** Maps an URI to serve static resources from the specified directory.
     * @param {String} uri URI relative to the module root. Cannot be null or
     *   empty.
     * @param {String} path File system directory to expose. Cannot be null or
     *    empty.
     * @methodOf WebModules.StaticContentMapper#
     */
    add: function (uri, path) {
      var app = WebModules.Middleware.EXPRESS.getApplication();
      LOG.debug("Mapping static content path " + uri + " to " + path);
      app.use(uri, express.static(path));
    }
  };
};
