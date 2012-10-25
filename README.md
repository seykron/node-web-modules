Node Web Modules
================

Yet Another MVC Framework for NodeJS with Domain Driven Design spirit.

Features:
  * Unextructured modular development
  * Command-based MVC pattern handler
  * Data binding
  * Smart routing
  * Filters
  * Multi-server: express and socket.io

Command-based MVC pattern handler
---------------------------------

### Design concerns
If you don't want to read about my experience in software development, please
just jump to the next section.

After a while working with web applications I learnt that a
ultra-super-flexible infrastructure that allows to design application flows
ad-infinitum is a sign to stop and think about what we're addressing.

Though "freedom" may sound cool, it's usually misunderstood and it's
transformed into a kind of trial by error pattern that may work fine for a
project that is about to die in few months. However in long-term projects (i.e:
products) it's essential to write code easy to refactor.

Some words about refactoring:

####**What?**
  Refactoring is the action of change code as needed (a lot of books can tell
  you what and how) in order to reduce the time you need to implement new
  features.

####**Why?**
  Because design decisions have a not known expiration date, but believe me,
  they all expire. So refactoring will help you to make your code-

  * More maintainable
  * Easier to understand
  * Easier to modify
  * Easier to add new features

####**When?**
  I like the so named "rule of three" introduced by Martin Fowler: The first
  time you do something, you just do it. The second time you do something
  similar, you wince at the duplication, but you do the duplicate thing
  anyway. The third time you do something similar, you refactor.

  And the _when_ recommendation also stolen to Martin Fowler:
  * Refactor When You Add Function
  * Refactor When You Need to Fix a Bug
  * Refactor As You Do a Code Review

####**When not?**
  When you think "it must scale up to the sky".

  When it works without issues and you simply think "I can make it better".

  When you think "it needs optimization" but no one is crying for speed.

  When there's no related feature, bug or planned enhancement.

  Unless you're playing yourself or resolving a challenge, changing code that
  just work without a conrete reason (a.k.a. new features or
  issues in production) is a bad idea.

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

Basically the application layer manages application flows and all operations
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

**app/HomeModule.js**
```
  var Module = require("node-web-modules").Module;
  var CommandController = require("node-web-modules").CommandController;

  // Creates a module registered under /module/webapp
  var module = new Module("/module/webapp/");

  // Routes the root path under the module path /module/webapp
  module.route("/", new CommandController(function () {
    return new EchoCommand();
  }, "index"));

  // Registers the module into the global context.
  module.register();
```

### Writing Commands
Though you can write your own controller, Node Web Modules suggests the command
pattern in order to handle requests, and this flow is managed by
CommandController.

This controller expects a simple interface: commands must implement an
{{{ execute() }}} method and it may return any object.

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
      execute : function() {
        return {
          message: prefix + this.message
        }
      }
    };
  };
```

When server starts, the _/module/webapp/_ path will be handled by the
EchoCommand. Properties in the EchoCommand will be bound to request parameters,
request body or cookies, depending on the controller and Express configuration.
