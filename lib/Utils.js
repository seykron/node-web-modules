(function () {
  /**
   * Extends an object with the methods and attributes from another. It
   * includes the full prototype chain. This performs only a shallow copy.
   *
   * @param  {Object} to   Object to augment. Cannot be null.
   * @param  {Object} from Object to copy. Cannot be null.
   * @return {Object}      Returns the target object, for convenience.
   */
  var extend = function (to, from) {
    var property;
    for (property in from) {
      to[property] = from[property];
    }
    return to;
  };

  extend(WebModules, {
    /**
     * Extends an object with the methods and attributes from another. It
     * includes the full prototype chain. This performs only a shallow copy.
     * if the second parameter is undefined, the specified object will be
     * copied into the WebModules namespace.
     *
     * @param  {Object} to   Object to augment. Cannot be null.
     * @param  {Object} from Object to copy. Cannot be null.
     * @return {Object}      Returns the target object, for convenience.
     */
    extend: function (to, from) {
      if (from === undefined) {
        return extend(WebModules, to);
      }
      return extend(to, from);
    },

    /** Extends an object with an arbitrary number of objects.
     *
     * Contrary to <code>WebModules.extend</code>, this method doesn't extend
     * fields that doesn't exist in the target object. It also accepts any
     * number of sources.
     *
     * @param {Object} target Object to be populated. Cannot be null.
     * @param {Object[]} [sources...] A variable number of arguments used to
     *   extend the target object. Can be null.
     * @return {Object} Returns the target object, for convenience.
     */
    bind: function (target, sources /**, paramN...*/) {
      var fields = {};

      for (var i = 0; i < arguments.length; i++) {
        if (arguments[i]) {
          WebModules.extend(fields, arguments[i]);
        }
      }

      for (name in fields) {
        if (fields.hasOwnProperty(name) &&
            target.hasOwnProperty(name)) {
          target[name] = fields[name];
        }
      }
      return target;
    }
  });
}());
