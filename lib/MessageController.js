/** Handles WebSocket messages.
 *
 * @augments WebModules.CommandController
 * @constructor
 */
WebModules.MessageController = function (createCommand) {

  return {
    /** Handles a websocket message.
     * @param {Object} message Websocket message.
     * @return {WebModules.Model} Returns a model to send back.
     * @methodOf WebModules.MessageController#
     */
    handle: function (message) {
      var command = createCommand(message);
      var binder = new WebModules.ObjectDataBinder(command);
      var result;

      binder.bind(message);

      result = command.execute();

      if (result instanceof WebModules.Model === false) {
        result = new WebModules.Model(result);
      }
      return result;
    }
  };
};
