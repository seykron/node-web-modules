/** Convenience class to wrap a request with the current module context
 * information.
 *
 * @param {Object} request Current HTTP request. Cannot be null.
 * @param {Object} context Module context information. Cannot be null.
 * @constructor
 * @augments http.ServerRequest
 */
WebModules.ModuleRequestWrapper = function (request, context) {
  return WebModules.extend(request, {
    /** Module context information for this request.
     * @namespace
     * @fieldOf WebModules.ModuleRequestWrapper#
     */
    context: {
      /** Module context path.
       * @type String
       * @fieldOf WebModules.ModuleRequestWrapper#
       */
      modulePath: context.modulePath,

      /** Current endpoint information as it's provided in the module
       * configuration.
       * @type Object
       * @fieldOf WebModules.ModuleRequestWrapper#
       */
      endpoint: context.endpoint,

      /** Module configuration as it's provided when module was created.
       * @type Object
       * @fieldOf WebModules.ModuleRequestWrapper#
       */
      config: context.config
    }
  });
};
