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
  * Custom view paths
  * Static content mapping

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

Usage
-----
node-web-modules is useful when there exist several features that must work
isolated under the same node server. Modules aim to isolate features at web
application level, context isolation is already very well addressed by node
itself.

The module abstraction also helps to define an agnostic project structure, which
is very useful to improve cohesion and leave the technical tier at the bottom.

Commands allows to write application code only once, transforming result
depending on routes and module configuration.

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

**./server.js**
```
  var ModuleManager = require("node-web-modules").ModuleManager;
  var express = require("express");
  var app = ModuleManager.app();

  // Configures express.
  app.configure(function(){
    app.use(express.methodOverride());
    app.use(express.bodyParser());
    app.use(express.cookieParser());
    app.use(app.router);
  });

  // Registers modules
  require("./app"); // app module.

  ModuleManager.listen(8000);
```

### Registering Modules

The basic usage is to register modules and map some endpoints to display
views without any processing in the application layer.

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

**echo/index.js**
```
  // Creates a module registered under /module/webapp
  var module = new Module("/module/webapp/");

  // Maps and endpoint.
  module.route("/echo")

  // Registers the module into the global context.
  module.register();
```

**app/index.js**
```
  // Creates another module registered under an existing context path.
  var module = new Module("/module/webapp/");

  // Routes all requests to views, without any processing.
  module.route("*");

  // Registers the module into the global context.
  module.register();
```

### Writing Commands
Though you can write your own controller, Node Web Modules suggests the command
pattern in order to handle requests. This flow is managed by CommandController.

This controller expects a simple interface: commands must implement an
```execute()``` method and it may return any object that will be passed to
the view.

**app/HomeCommand.js**
```
  HomeCommand = function () {

    return {
      /** Prefix for the message.
       * @type String
       */
      prefix: null,

      /** Sends a hello message.
       * @return {String} Returns a hello message.
       */
      execute: function () {
        return {
          message: this.prefix + ": Hello, World!"
        };
      }
    };
  };
```

And the command mapping in the module definition:

**app/index.js**
```
  // Creates another module registered under an existing context path.
  var module = new Module("/module/webapp/", {
    routes: {
      "/": HelloCommand
    }
  });

  // Registers the module into the global context.
  module.register();
```

When server starts, the _/module/webapp/_ path will be handled by
HomeCommand. Properties in HomeCommand will be bound to request parameters,
request body and cookies, depending on Express configuration.

It's possible to defer the command execution by returning ```Model``` objects.
These objects are kind of _futures_ that allow unattended execution of
long tasks.

**app/HomeCommand.js**
```
  HomeCommand = function () {

    return {

      /** Prefix for the message.
       * @type String
       */
      prefix: null,

      /** Sends a hello message.
       * @return {String} Returns a hello message.
       */
      execute: function () {
        var model = new WebModules.Model({
          message: this.prefix + ": Hello, World!"
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

Redirects paths may contain placeholders that will be replaced by request
parameters, request body and cookies depending on Express configuration. Model
attributes will be also used to replace placeholders.

For instance, assume that ther's a logged-in user and the session cookie
_userId_ is already set, and the cookieParser in Express is enabled.

**app/HomeCommand.js**
```
  HomeCommand = function (prefix) {

    return {

      /** Prefix for the message.
       * @type String
       */
      prefix: null,

      /** Logged-in user id.
       * @type Number
       */
      userId: null,

      /** Sends a hello message.
       * @return {String} Returns a hello message.
       */
      execute: function () {
        var model = new WebModules.Model({
          message: this.prefix + ": Hello, World!"
        });

        if (this.userId !== null) {
          return new WebModules.Redirect("/module/webapp/profile/:userId", 302);
        }

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

### Using Socket.io
Modules support both Express and Socket.io as backend servers, so it's possible
to specify the kind of server for a module. Same command can be used to handle
mappings in both servers.

**app/index.js**
```
  // Creates another module registered under an existing context path.
  var expressModule = new Module("/module/webapp/", {
    routes: {
      "/": HelloCommand
    }
  });

  // Registers the module into the global context.
  expressModule.register();

  // Creates another module registered under an existing context path.
  var websocketModule = new Module("/module/ws/", {
    serverType: WebModules.ModuleManager.ServerType.WEB_SOCKET,
    routes: {
      "/": HelloCommand
    }
  });

  // Registers the module into the global context.
  websocketModule.register();
```

The client code for this mapping may look like this:

**view/index.html**
```
  ... mark-up ...

  var socket = io.connect('/module/ws/');

  socket.on("connect", function () {
    socket.emit("message", {
      prefix: "Websocket: "
    });
    socket.on("message", function (data) {
      // Result object returned by HomeCommand.
      console.log(data);
    });
  });
```

### View resolvers
Suppose you want to have a single view path (or paths) per module. It's possible
to map new view paths and they will have precedence over the default lookup.

**app/index.js**
```
  // Creates another module registered under an existing context path.
  var module = new Module("/module/webapp/", {
    // Search for views in ./app/views/ instead of ./views/
    viewPaths: [__dirname + "/views"],
    routes: {
      "/": HelloCommand
    }
  });

  // Registers the module into the global context.
  module.register();
```

### Static Content
Modules support to expose file system directories as static content.

**app/index.js**
```
  // Creates another module registered under an existing context path.
  var module = new Module("/module/webapp/", {
    viewPaths: [__dirname + "/views"],
    routes: {
      "/": HelloCommand
    },
    staticContent: {
      "/asset": __dirname + "/view/asset"
    }
  });

  // Registers the module into the global context.
  module.register();
```

### Deployment Agent
One of the useful scenarios for node-web-modules is the ability of having a
single node instance running on a server with several client modules. It makes
easier the integration with another services like apache since it only needs to
forward requests to a single port.

In order to provide this kind of integration there's a Deployment Agent that
allows to dinamically load modules from a directory.

**server.js**
```
var DeploymentAgent = require("node-web-modules").DeploymentAgent;

var agent = new DeploymentAgent(__dirname + "/modules");
agent.deploy();
```

This agent tries to load modules from the specified path, and if any fails, it
maps the module root endpoint and sends the exception to the client.

Installation
------------
```
npm install node-web-modules
```
