/** Binds arbitrary parameters to properties in a host object.
 *
 * Only parameters that also exist as properties in the host object will be
 * set in the object.
 *
 * @param {Object} host Object for binding parameters to. Cannot be null.
 * @constructor
 */
WebModules.ObjectDataBinder = function (host) {

  return {

    /** Binds parameters to the host object.
     *
     * This method doesn't check whether parameters already are bound to the
     * host or not, it just performs the binding over the host.
     *
     * @return {Object} Returns the host object, for convenience. Never returns
     *   null.
     */
    bind: function (params/**, params... */) {
      var fields = {};
      var i;

      for (i = 0; i < arguments.length; i++) {
        if (arguments[i]) {
          WebModules.extend(fields, arguments[i]);
        }
      }

      for (name in fields) {
        if (fields.hasOwnProperty(name) &&
            host.hasOwnProperty(name)) {
          host[name] = fields[name];
        }
      }

      return host;
    }
  };
};
