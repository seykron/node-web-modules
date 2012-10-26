/** Resolves views from a list of paths.
 * @param {String} [theBaseDir] Base directory to search views from.
 * @constructor
 */
WebModules.MultiPathViewResolver = function (theBaseDir) {

  /** Default logger. */
  var LOG = require('winston');

  // System libs.
  var path = require('path'),
    fs = require('fs'),
    dirname = path.dirname,
    basename = path.basename,
    exists = fs.existsSync || path.existsSync,
    join = path.join;

  /** List of view paths to search for view files.
   * @type String[]
   * @private
   * @methodOf WebModules.MultiPathViewResolver
   */
  var viewPaths = [];

  return {
    /** Adds a new view path to the existing list.
     * @param {String} viewPath Path to add to list. Cannot be null or empty.
     */
    addViewPath: function (viewPath) {
      viewPaths.push(viewPath);
    },

    /** Searches for the specified view in the configured view paths.
     * @param {String} view The required view name. Cannot be null or empty.
     * @return {String} Returns the view file, or null if it isn't found.
     */
    lookup: function (view) {
      var filename;

      for (var i = 0; i < viewPaths.length; i++) {
        if (theBaseDir) {
          filename = join(theBaseDir, viewPaths[i], view);
        } else {
          filename = join(viewPaths[i], view);
        }

        LOG.debug("Looking for view: " + filename);

        if (exists(filename)) {
          return filename;
        }
      }
      return null;
    }
  };
};
