/** Handles WebSocket messages.
 *
 * @augments WebModules.CommandController
 * @constructor
 */
WebModules.MessageController = function (createCommand) {

  return {
    /** Handles a websocket message.
     * @param {Object} message Websocket message.
     */
    handle: function (message) {
      var command = createCommand(message);
      var result;

      WebModules.bind(command, message);

      result = command.execute();

      if (result instanceof WebModules.Model === false) {
        result = new WebModules.Model(result);
      }
      return result;
    }
  };
};
