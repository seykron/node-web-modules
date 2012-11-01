Node Web Modules
================

Yet Another MVC Framework for NodeJS with Domain Driven Design spirit.

Features:
  * Unstructured modular development
  * Command-driven MVC
  * Data binding
  * Smart routing
  * Filters
  * Multi-server: express and socket.io

Overall Architecture
--------------------
Node Web Modules is inspired in DDD (Domain Driven Design) concepts. It defines
ONLY the application layer. Here's the application layer in words of Eric
Evans:

*Defines the jobs the software is supposed to do and directs the expressive
domain objects to work out problems. The tasks this layer is responsible for
are meaningful to the business or necessary for interaction with the
application layers of other systems. This layer is kept thin. It does not
contain business rules or knowledge, but only coordinates tasks and delegates
work to collaborations of domain objects in the next layer down. It does not
have state reflecting the business situation, but it can have state that
reflects the progress of a task for the user or the program.*

Basically the application layer manages application flows and it operates
over domain objects. With that in mind, the following graph shows the overall
architecture:


```
                                           Application Layer
                                  |-----------------------------------|
                 Resolve Route                 Open Transaction
/--------\    /-----------------\    /------------\        /---------\
| Client |--->|      Module     |--->| Controller |------->| Command |-->Domain
|        |    |                 |    |            |        \---------/
|        |    \-----------------/    \------------/             |
|        |        Write Response          | ^ Commit Transaction|
|        |<------------------------------/   \------------------|
|--------|
```


How it works
------------
Node Web Modules is a micro-infrastructure framework that allow to scope
behaviour under a route. It supports to safely register several endpoints under
the same route inside a _Module_. It supports to handle requests implementing
the _Command_ pattern to make code clear, easy to refactor and easy to test.

It's built on top of Express and Socket.io, and supports transparent routing
for both. It supports out-of-the-box configuration for Express.

### Initializing the server
It works on top of Express, so general configuration is delegated to Express.
```
  var ModuleManager = require("node-web-modules").ModuleManager;
  var express = require("express");
  var app = ModuleManager.app();

  // Configure express.
  app.configure(function(){
    app.use(express.methodOverride());
    app.use(express.bodyParser());
    app.use(express.cookieParser());
    app.use(app.router);
  });

  ModuleManager.listen(8000);
```

### Registering Modules

The basic usage is to register modules and map some endpoints to display
views without processing in the application layer.

When there's no handler registered for a route, it's considered a simple
view rendering. By convention it takes the last part of the request context
path and it tries to map this piece to a view name. For instance,

```
/module/webapp/foo
```

will try to render the view _foo_ using the default lookup strategy.

If there's not last part of the context path, it defaults to _index_. For
instance:

```
/module/webapp/
```

will try to render the view _index_ also using the default lookup strategy.


**app/index.js**
```
  var Module = require("node-web-modules").Module;

  // Creates a module registered under /module/webapp
  var module = new Module("/module/webapp/");

  // Routes all requests to views, without any processing.
  module.route("*");

  // Registers the module into the global context.
  module.register();
```

It's possible to register several modules under the same context path. If the
composite route collides, it's handled by all modules in the order they're
registered.

```
  // Creates a module registered under /module/webapp
  var echoModule = new Module("/module/webapp/");

  // This path takes precedence over the homeModule ones.
  echoModule.route("/echo", new CommandController(function () {
    return new EchoCommand();
  }, "echo"));

  // Registers the module into the global context.
  echoModule.register();

  // Creates another module registered under an existing context path.
  var homeModule = new Module("/module/webapp/");

  // Routes all requests to views, without any processing.
  homeModule.route("*");

  // Registers the module into the global context.
  homeModule.register();
```

### Writing Commands
Though you can write your own controller, Node Web Modules suggests the command
pattern in order to handle requests and this flow is managed by
CommandController.

This controller expects a simple interface: commands must implement an
```execute()``` method and it may return any object that will be passed to
the view.

**app/EchoCommand.js**
```
  EchoCommand = function (prefix) {

    return {
      /** Message to echo.
       * @type String
       */
      message: null,

      /** Makes echo.
       * @return {String} Returns echo.
       */
      execute: function () {
        return {
          message: prefix + this.message
        };
      }
    };
  };
```

**app/index.js**
```
  var Module = require("node-web-modules").Module;
  var CommandController = require("node-web-modules").CommandController;

  // Creates a module registered under /module/webapp
  var module = new Module("/module/webapp/");

  // Routes the root path under the module path /module/webapp and maps
  // the controller to handle this view.
  module.route("/", new CommandController(function () {
    return new EchoCommand();
  }, "index"));

  // Registers the module into the global context.
  module.register();
```

When server starts, the _/module/webapp/_ path will be handled by
EchoCommand. Properties in EchoCommand will be bound to request parameters,
request body or cookies, depending on the controller and Express configuration.

It's possible to defer the command execution by returning ```Model``` objects.
These objects are kind of __futures__ that allow unattended execution of
long tasks.

**app/ProcessMessageCommand.js**
```
  ProcessMessageCommand = function (prefix) {

    return {

      /** Message to process.
       * @type String
       */
      message: null,

      /** Performs something over the message.
       * @return {String} Returns the processed message.
       */
      execute: function () {
        var model = new WebModules.Model({
          message: prefix + this.message
        });

        // Do some long long task.
        setTimeout(function () {
          model.data.message += " (unattended!)";
          model.resume();
        }, 2000);

        return model.defer();
      }
    };
  };
```

It's also possible to force a redirect from commands. Sadly deferred redirects
are not supported yet, but it will exist in newer versions.

**app/ProcessMessageCommand.js**
```
  ProcessMessageCommand = function (prefix) {

    return {

      /** Message to process.
       * @type String
       */
      message: null,

      /** Performs something over the message.
       * @return {String} Returns the processed message.
       */
      execute: function () {
        var model;

        if (this.message === "bye") {
          return new WebModules.Redirect("/module/webapp/echo", 302);
        }

        return new WebModules.Model({
          message: prefix + this.message
        });
      }
    };
  };
```

### View resolvers
Suppose you want to have a single view path (or paths) per module. It's possible
to map new view paths and they've got precedence over the default lookup.

```
  // Creates a module registered under /module/webapp
  var homeModule = new Module("/module/webapp/");

  // Routes all requests to views, without any processing
  homeModule.route("*");

  // Maps a view path.
  homeModule.addViewPath(__dirname + "/home/views");

  // Registers the module into the global context.
  homeModule.register();
```

It complements the ability to register several modules under the same context
path. Specifying a custom view path provides a namespace for the module, which
allows to create views with the same name in different modules.

```
  // Creates a module registered under /module/webapp
  var homeModule = new Module("/module/webapp/");

  // Routes the root path under the module path /module/webapp
  homeModule.route("*");
  homeModule.addViewPath(__dirname + "/home/views");

  // Registers the module into the global context.
  homeModule.register();

  // Creates another module registered under an existing context path.
  var echoModule = new Module("/module/webapp/");

  // Routes the root path under the module path /module/webapp/echo
  echoModule.route("/echo");
  echoModule.addViewPath(__dirname + "/echo/views");

  // Registers the module into the global context.
  echoModule.register();
```

### Deployment Agent
One of the useful scenarios for node-web-modules is the ability of having a
single node instance running on a server with several client modules. It makes
easier the integration with another services like apache since it only needs to
forward requests to a single port.

In order to provide this kind of integration there's a Deployment Agent that
allows to dinamically load modules from a directory.

**index.js**
```
var DeploymentAgent = require("node-web-modules").DeploymentAgent;

var agent = new DeploymentAgent(__dirname);
agent.deploy();
```

This agent tries to load modules from the specified path, and if any fails, it
maps the module root endpoint and sends the exception to the client.

Installation
------------
```
npm install node-web-modules
```
