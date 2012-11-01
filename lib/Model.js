/** Represents a model that can be exposed to the view.
 *
 * Models are single objects that are available in the view.
 *
 * @param {Object} [theData] Model data. Can be null.
 * @param {Object} [theOptions] Any options required by the current request
 *   handler. Can be null.
 * @constructor
 */
WebModules.Model = function (theData, theOptions) {

  /** List of callbacks invoked once the request is finished.
   * @type Function[]
   * @private
   * @memberOf WebModules.Model#
   */
  var callbacks = [];

  /** Indicates whether the request associated with this object must be
   * deferred until the <code>success()</code> or <code>error()</code>
   * method is invoked. Default is false.
   * @type {Boolean}
   * @private
   * @memberOf WebModules.Model#
   */
  var deferred = false;

  /** Triggers all callbacks that are waiting for the request processing.
   * @private
   */
  var notify = function () {
    var callback;
    var i;

    for (i = 0; i < callbacks.length; i += 1) {
      callback = callbacks[i];
      callback();
    }
  };

  return WebModules.extend(this, {
    /** Model data. Can be null.
     * @type Object
     * @fieldOf WebModules.Model#
     */
    data: theData || {},

    /** Any options required by the current request handler. Can be null.
     * @type Object
     * @fieldOf WebModules.Model#
     */
    options: theOptions || {},

    /** Defers the current request until the <code>success()</code> or
     * <code>error()</code> strategy is invoked by the request handler.
     * @return {WebModules.Model} Returns this model instance.
     * @methodOf WebModules.Model#
     */
    defer: function () {
      deferred = true;
      return this;
    },

    /** Resumes the request processing if this Model object was
     * previously deferred. It takes no action if the object isn't deferred.
     * @methodOf WebModules.Model#
     */
    resume: function () {
      if (deferred) {
        notify();
      }
    },

    /** Adds a new listener that will be called once the request is already
     * processed by the handler.
     *
     * @param {Function} callback Callback to add. Cannot be null.
     * @return {WebModules.Model} Returns this model instance.
     * @methodOf WebModules.Model#
     */
    wait: function (callback) {
      callbacks.push(callback);

      if (!deferred) {
        notify();
      }
      return this;
    }
  });
};
