/*!*
  ( ( (
   ) ) )
  ._____.
 (|     | Espresso
   `---`    A pick-me-up for JavaScript libraries.

  Contributors
    Tim Evans <tim.evans@junctionnetworks.com>

  Permission is hereby granted, free of charge, to any person obtaining a copy
  of this software and associated documentation files (the "Software"), to deal
  in the Software without restriction, including without limitation the rights
  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
  copies of the Software, and to permit persons to whom the Software is
  furnished to do so, subject to the following conditions:

  The above copyright notice and this permission notice shall be included in
  all copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
  THE SOFTWARE.
 */
/*globals Espresso */

/** @namespace

  Espresso is a JavaScript library to be used as a
  foundation library to create JavaScript libraries.
  This library is made with the to aid in creating
  code that's pleasant to read, smaller, and
  consequently, less buggy.

  Espresso provides a partial shim for ECMAScript 5,
  falling back to native support when available, and
  provides support for Enumerables, Observers, mixins,
  and string formatting.
 */
Espresso = {

  /**
    The version string.
    @type String
   */
  VERSION: '0.5.8',

  /**
    Checks whether the variable is defined *and* is not null.

    @param {Object} o The object to test if it's defined or not.
    @returns {Boolean} True if the value is not null and not undefined.

    @example
      var unbound;
      undefined = 'bwahahaha!';
      alert(Espresso.hasValue(unbound));
      // -> false

      alert(Espresso.hasValue(undefined));
      // -> true
   */
  hasValue: function (o) {
    return o != null;
  },

  /** @function
    @desc

    Check to see if the object has function-like properties.
    If it's callable, then it's a function or an object with
    `call` and `apply` functions (which are assumed to work
    how the same ones work on {@link Function.prototype}).

    @param {Object} obj The Object to check whether it is callable or not.
    @returns {Boolean} True if the Object is callable, otherwise false.
   */
  isCallable: (function () {
    var isFunction = '[object Function]',
        isObject = '[object Object]',
        toString = Object.prototype.toString,
        nil = null;
    return function (obj) {
      return obj && (toString.call(obj) === isFunction ||
             (obj.call != nil && toString.call(obj.call) === isFunction &&
              obj.apply != nil && toString.call(obj.apply) === isFunction));
    };
  }()),

  /** @function
    @desc
    Convert an iterable object into an Array.

    @param {Object} iterable An iterable object with a length and indexing.
    @returns {Array} The object passed in as an Array.
   */
  A: (function () {
    var slice = Array.prototype.slice;
    return function (iterable) {
      return slice.apply(iterable);
    };
  }()),

  /**
    Defers execution until a later time (when the ready
    queue is empty).

    @param {Function} lambda The function to call.
    @param {Array} args The arguments to apply to the function.
    @param {Object} that The object to apply as `this`.
   */
  defer: function (lambda, args, that) {
    that = that || lambda;
    setTimeout(function () {
      lambda.apply(that, args);
    }, 0);
  },

  /** @function
    @desc
    Identical to `Object.defineProperty`.
    If not available natively, this is null.

    @param {Object} obj The object ot modify.
    @param {String} key The property name to modify.
    @param {Object} desc The descriptor hash.
    @returns {void}
   */
  defineProperty: (function () {
    var defineProperty = Object.defineProperty;

    // Catch IE8 where Object.defineProperty exists but only works on DOM elements.
    if (defineProperty) {
      try {
        defineProperty({}, 'a', { get: function () {} });
      } catch (x) {
        defineProperty = void(0);
      }
    }

    return defineProperty;
  }()),

  /** @function
    @desc
    Internal method for returning description of
    properties that are created by Espresso.

    Note: This is modeled after SC2.
    @param {Object} o The object to get the information of.
    @param {Boolean} create Whether the meta information
      should be created upon calling this method.
    @returns {Object} A object with the information about
      the passed object
   */
  meta: (function () {
    var META_KEY = "__esp__" + (new Date()).getTime() + "__meta__";
    return function (o, create) {
      var info = o && o[META_KEY];
      if (create && info == null) {
        info = o[META_KEY] = {
          desc: {},
          cache: {},
          lastSetCache: {}
        };
      }
      return info;
    };
  }())

};

// Apply it at the global scope
this.Espresso = Espresso;
/*globals mix */

/** @function
  @desc

  `mix` provides a way to combine arbritrary objects together.

  The combination can be as simple as adding the properties on
  an object onto another:

      var Caffeinated = { isCaffeinated: true };
      var Coffee = mix({
        isDecaf: function () {
          return !!this.isCaffeinated;
        }
      }).into({});

      decaf = mix(Coffee).into({});
      decaf.isDecaf();
      // -> true

      caf = mix(Caffeinated, Coffee).into({});
      caf.isDecaf();
      // -> false

  `mix` takes this a bit furthur, allowing properties on the
  objects being mixed in to be altered at mixin time using
  Espresso's decorator API.

  The API hook is adding an underscore (`_`) hash with a
  function that can change the decorated object in place by
  returning the new desired value. For examples on how to use
  the decorator API, look at the `alias` and `inferior` for
  general purpose decorators and `refine` for a funnction
  decorator.

  Using `mix`, you can design an Object-Oriented `Class`
  object with while still inheriting all of the decorators
  that `mix` applies:

      Class = mix({
        extend: (function () {
          var initializing = false;

          return function () {
            initializing = true;
            var prototype = new this();
            initializing = false;

            mix.apply(null, Espresso.A(arguments)).into(prototype);

            function Class() {
              if (!initializing && Espresso.isCallable(this.init)) {
                this.init.apply(this, arguments);
              }
            }

            Class.prototype = prototype;
            Class.constructor = Class;
            Class.extend = arguments.callee;
            return Class;
          };
        }())
      }).into(function () {});

  @param {...} mixins Objects to mixin to the target provided on into.
  @returns {Object} An object with `into` field, call into with the target
                    to apply the mixins on. That will return the target
                    with the mixins on it.
 */
mix = function () {
  var mixins = arguments,
      i = 0, len = mixins.length;

  return {
    into: function (target) {
      var mixin, key, value, _, decorator;

      if (target == null) {
        throw new TypeError("Cannot mix into null or undefined values.");
      }

      for (; i < len; i += 1) {
        mixin = mixins[i];
        for (key in mixin) {
          value = mixin[key];

          // Function annotation API
          _ = value && value._;
          if (_ != null) {
            for (decorator in _) {
              if (_.hasOwnProperty(decorator)) {
                value = _[decorator](target, value, key);
              }
            }
          }
          if (typeof value !== "undefined") target[key] = value;
        }

        // Take care of IE clobbering `toString` and `valueOf`
        if (mixin && mixin.toString !== Object.prototype.toString) {
          target.toString = mixin.toString;
        } else if (mixin && mixin.valueOf !== Object.prototype.valueOf) {
          target.valueOf = mixin.valueOf;
        }
      }
      return target;
    }
  };
};

// Apply it at the global scope
this.mix = mix;
mix(/** @scope Espresso */{

  /**
    Provides a mechanism to alias an object with
    using other names.

    Any arguments passed in after the target will
    be used as aliases for the target. Each of these
    aliases will be references to the original, meaning
    that all of them will be indistinguishable and if
    one of them is altered in place, then all will be.

    @param {Object} target The target to apply this decorator to.
    @param {...} aliases The aliases this object has.
    @returns {Object} The reciever.
   */
  alias: function (target) {
    target._ = target._ || {};

    var aliases = Espresso.A(arguments).slice(1),
        idx = aliases.length, mixin;

    /** @ignore */
    target._.alias = function (template, value, key) {
      delete value._.alias; // Remove this to prevent recursion.
      while (idx--) {
        mixin = {};
        mixin[aliases[idx]] = value;
        mix(mixin).into(template);
      }
      return value;
    };

    return target;
  }

}).into(Espresso);
mix(/** @scope Espresso */{

  /**
    If the attribute being mixed in exists on the
    Object being mixed in, the object marked as
    inferior will **not** be mixed in. If the base
    object is inferior, it will be overriden.

    @param {Object} target The target to apply the decorator to.
    @param {Object|Function} [condition] If it returns `true`,
      the function is inferior. Otherwise, it isn't.
    @returns {Function} The reciever.
   */
  inferior: function (target, condition) {
    var isInferior = arguments.length === 2 ?
      (Espresso.isCallable(condition) ? condition() : condition) : true;
    if (!isInferior) { return target; }

    target._ = target._ || {};
    target.isInferior = true;

    /** @ignore */
    target._.inferior = function (template, value, key) {
      return (!template[key] || template[key].isInferior) ? value: template[key];
    };

    return target;
  }

}).into(Espresso);
mix(/** @scope Espresso */{

  /**
    Refine allows for function-by-function refinements that
    reopens the function implementation without editing the
    original function's contents. With this, you can implement
    OO constructs like abstract base classes.

    Refinements to a function recieve a prepended argument to
    the argument list which is the original function that
    is being refined (if there isn't an original function that's
    being refined, a empty function will be provided for consistency).

    Calling the refined function should be done like so:

        Machiatto = mix({
          pull: Espresso.refine(function (original) {
            var espresso = original();
            return espresso + milk;
          })
        }).into(Espresso);

    Provide arguments as-is, omit arguments, or add arguments
    to the function. It'll be just like it's being called normally.

    NOTE: If you try to rebind the property using
          {@link Function#bind}, it will _not_ work.

    @param {Function} target The target to apply this decorator to.
    @returns {Function} The reciever.
   */
  refine: function (target) {
    if (!Espresso.isCallable(target)) return target;

    target._ = target._ || {};

    var empty = function () {};

    /** @ignore */
    target._.refine = function (template, value, key) {
      var base = template[key] || empty;
      if (!Espresso.isCallable(base)) {
        return value;
      }

      /** @ignore */
      var lambda = function () {
        return value.apply(this, [base.bind(this)].concat(Espresso.A(arguments)));
      };

      // Copy over function properties
      for (var k in value) {
        if (value.hasOwnProperty(k)) {
          lambda[k] = value[k];
        }
      }
      return lambda;
    };
    return target;
  }

}).into(Espresso);
/*globals mix Espresso */

mix(/** @lends Function.prototype */{

  /** @function
    @desc
    Bind the value of `this` on a function before hand,
    with any extra arguments being passed in as initial
    arguments.

    This implementation conforms to the ECMAScript 5
    standard.

        var barista = function (tpl) {
          alert(tpl.format(this));
          return arguments.callee.bind(this, "Order up! Your {} is ready!");
        };

        orderUp = barista.call("espresso", "I would like an {}");
        // -> "I would like an espresso."

        orderUp();
        // -> "Order up! Your espresso is ready!"

    @param {Object} thisArg The value to bind `this` to on the function.
    @returns {Function} The function passed in, wrapped to ensure `this`
      is the correct scope.
   */
  bind: Espresso.inferior(function (self) {
    var Target, A;

    // 1. Let Target be the this value.
    Target = this;

    // 2. If IsCallable(Target) is false, throw a TypeError exception
    if (!Espresso.isCallable(Target)) {
      throw new TypeError("The Target is not callable.");
    }

    // 3. Let A be a new (possibly empty) internal list of
    //    all argument values provided after self
    //    (arg1, arg2, etc), in order
    A = Espresso.A(arguments).slice(1);

    var bound = function () {

      if (this instanceof bound) {
        // 15.3.4.5.2 [[Construct]]
        // When the [[Construct]] internal method of a function object, F,
        // that was created using the bind function is called with a list of
        // arguments ExtraArgs, the following steps are taken:

        // 1. Let the target be the value of F's [[TargetFunction]] internal property.
        // 2. If target has no [[Construct]] internal method, a TypeError exception is thrown.
        // 3. Let boundArgs be the value of F's [[BoundArgs]] internal property.
        // 4. Left args be a new list containing the same values as the list boundArgs in the same order followed by the same values as the list ExtraArgs in the same order.
        // 5. Return the result of calling the [[Construct]] internal method of target providing args as the arguments.
        var Type = function () {}, that;
        Type.prototype = Target.prototype;
        that = new Type();

        Target.apply(that, A.concat(Espresso.A(arguments)));
        return that;
      } else {
        // 15.3.4.5.1 [[Call]]
        // When the [[Call]] internal method of a function object, F,
        // which was created using the bind function is called with a this
        // value and a list of arguments ExtraArgs, the following steps are taken:
        // 1. Let boundArgs be the value of F's [[BoundArgs]] internal property.
        // 2. Let boundThis be the value of F's [[BoundThis]] internal property.
        // 3. Let target be the value of F's [[TargetFunction]] internal property.
        return Target.apply(self, A.concat(Espresso.A(arguments)));
      }
    };
    return bound;
  })

}).into(Function.prototype);
/*globals Espresso mix */

/** @namespace
  This mixin defines an enumerable interface that is
  based off of the ECMAScript 5 specification.

  If any of the functions on this interface are defined
  by the host object, they will *not* be applied, with the
  assumption that the host object has a better implementation
  and the same characteristics.

  @requires `forEach`- the enumerator over the collection.
 */
Espresso.Enumerable = /** @lends Espresso.Enumerable# */{

  /**
    Walk like a duck.
    @type Boolean
   */
  isEnumerable: true,

  /** @function
    @desc
    Iterates over each item on the Enumerable.

    The Function `forEach` should follow the specification as
    defined in the ECMAScript 5 standard. All function using
    `forEach` in the Enumerable mixin depend on it being this way.

    @param {Function} lambda The callback to call for each element.
      @param {Object} lambda.value The value of the enumerated item.
      @param {Object} lambda.key The key of the enumerated item.
      @param {Object} lambda.self The object being enumerated over.
    @param {Object} [self] The Object to use as this when executing the callback.
    @returns {void}
   */
  forEach: Espresso.inferior(function (lambda, that) {
    throw new Error("You MUST override Espresso.Enumerable.forEach to be able " +
                    "to use the Enumerable mixin.");
  }),

  /** @function
    @desc
    Returns an array where each value on the enumerable
    is mutated by the lambda function.

    @param {Function} lambda The lambda that transforms an element in the enumerable.
      @param {Object} lambda.value The value of the enumerated item.
      @param {Object} lambda.key The key of the enumerated item.
      @param {Object} lambda.self The object being enumerated over.
    @param {Object} [self] The value of `this` inside the lambda.
    @returns {Array} The collection of results from the map function.
    @example
      var cube = function (n) { return n * n * n };
      alert([1, 2, 3, 4].map(cube));
      // -> [1, 8, 27, 64]
   */
  map: Espresso.inferior(function (lambda, self) {
    var arr = [];

    // 4. If IsCallable(lambda) is false, throw a TypeError exception
    if (!Espresso.isCallable(lambda)) {
      throw new TypeError("{} is not callable.".format(lambda));
    }

    this.forEach(function (k, v) {
      arr.push(lambda.call(self, k, v, this));
    }, this);
    return arr;
  }),

  /** @function
    @desc
    Reduce the content of an enumerable down to a single value.

    @param {Function} lambda The lambda that performs the reduction.
      @param {Object} lambda.value The value of the enumerated item.
      @param {Object} lambda.key The key of the enumerated item.
      @param {Object} lambda.self The object being enumerated over.
    @param {Object} [seed] The seed value to provide for the first time.
    @returns {Object} The reduced output.
    @example
      var range = mix(Espresso.Enumerable, {
        begin: 0,
        end: 0,

        forEach: function (lambda, self) {
          var i = 0;
          for (var v = this.begin; v <= this.end; v++) {
            lambda.call(self, v, i++, this);
          }
        },

        create: function (begin, end) {
          return mix(this, { begin: begin, end: end }).into({});
        }
      }).into({});

      var multiply = function (a, b) { return a * b; };
      var factorial = function (n) {
        return range.create(1, n).reduce(multiply);
      }

      alert("5! is {}".format(factorial(5)));
      alert("120! is {}".format(factorial(120)));
   */
  reduce: Espresso.inferior(function (lambda, seed) {
    var shouldSeed = (arguments.length === 1),
        self = this;

    // 4. If IsCallable(lambda) is false, throw a TypeError exception
    if (!Espresso.isCallable(lambda)) {
      throw new TypeError("{} is not callable.".format(lambda));
    }

    this.forEach(function (v, k) {
      if (shouldSeed) {
        seed = v;
        shouldSeed = false;
      } else {
        seed = lambda(seed, v, k, self);
      }
    });

    // 5. If len is 0 and seed is not present, throw a TypeError exception.
    if (shouldSeed) {
      throw new TypeError("There was nothing to reduce!");
    }
    return seed;
  }),

  /** @function
    @desc
    Returns all elements on the Enumerable for which the
    input function returns true for.

    @param {Function} lambda The function to filter the Enumerable.
      @param {Object} lambda.value The value of the enumerated item.
      @param {Object} lambda.key The key of the enumerated item.
      @param {Object} lambda.self The object being enumerated over.
    @param {Object} [self] The value of `this` inside the lambda.
    @returns {Object[]} An array with the values for which `lambda` returns `true`
   */
  filter: Espresso.inferior(function (lambda, self) {
    if (!Espresso.isCallable(lambda)) {
      throw new TypeError("{} is not callable.".format(lambda));
    }

    return this.reduce(function (seive, v, k, t) {
      if (lambda.call(self, v, k, t)) {
        seive.push(v);
      }
      return seive;
    }, []);
  }),

  /** @function
    @desc
    Returns `true` if `lambda` returns `true` for every element
    in the Enumerable, otherwise, it returns `false`.

    @param {Function} lambda The lambda that transforms an element in the enumerable.
      @param {Object} lambda.value The value of the enumerated item.
      @param {Object} lambda.key The key of the enumerated item.
      @param {Object} lambda.self The object being enumerated over.
    @param {Object} [self] The value of `this` inside the lambda.
    @returns {Boolean} `true` if `lambda` returns `true` for every iteration.
  */
  every: Espresso.inferior(function (lambda, self) {
    if (!Espresso.isCallable(lambda)) {
      throw new TypeError("{} is not callable.".format(lambda));
    }

    return this.reduce(function (every, v, k, t) {
      return every && lambda.call(self, v, k, t);
    }, true);
  }),

  /** @function
    @desc
    Returns `true` if `lambda` returns `true` for at least one
    element in the Enumerable, otherwise, it returns `false`.

    @param {Function} lambda The lambda that transforms an element in the enumerable.
      @param {Object} lambda.value The value of the enumerated item.
      @param {Object} lambda.key The key of the enumerated item.
      @param {Object} lambda.self The object being enumerated over.
    @param {Object} [self] The value of `this` inside the lambda.
    @returns {Boolean} `true` if `lambda` returns `true` at least once.
   */
  some: Espresso.inferior(function (lambda, self) {
    if (!Espresso.isCallable(lambda)) {
      throw new TypeError("{} is not callable.".format(lambda));
    }

    return this.reduce(function (every, v, k, t) {
      return every || lambda.call(self, v, k, t);
    }, false);
  })

};
/*global mix Espresso */

/** @namespace
  Implements the Observer / Publish-Subscribe pattern.

  Subscribe to events that are published to objects that
  mixin this, and you'll be notified when the events come
  in. If something is published and there are no handlers
  for that specific event, there is a `unpublishedEvent`
  function that will be called whenever an event doesn't
  have any subscribers.

  Publishing an event will use the first argument as the
  event to trigger, and call all the subscription handlers
  with all of the arguments passed into that `publish`.

  Subscribing to an event requires the event that it would
  like to recieve events from and the callback at minimum.

  If extra configuration is wanted, the `options` hash
  provides a way to dynamically have events delivered or
  ignored beforehand (possibly providing lint-checking before
  the event is delivered), and whether the event should
  be delivered synchronously or asynchronously. (By default,
  it's asynchronous).

  @example
      var Clock = mix(Espresso.Subscribable, {
        tick: function () {
          this.time = Date.now();
        }
      }).into({});

      Clock.subscribe("tick", Clock.tick);
      setInterval(Clock.publish.bind(Clock, "tick"), 1000);

 */
Espresso.Subscribable = /** @lends Espresso.Subscribable# */{

  /**
    Walk like a duck.
    @type Boolean
   */
  isSubscribable: true,

  /**
    Subscribe to an event.

    @param {Object} event The event to subscribe to.
    @param {Function} handler The handler to call when the event is published.
    @param {Object} [options] Optional parameters.
      @param {Boolean} [options.synchronous] Whether the handler should be called synchronously or not. Defaults to asynchronous calls.
      @param {Function} [options.condition] A mechanism to refine whether a specific event is wanted. Return true if you would like the event, and false if you don't.
    @returns {Object} The reciever.
   */
  subscribe: function (event, handler, options) {
    if (!Espresso.isCallable(handler)) {
      throw new TypeError("{} is not callable.".format(handler));
    }

    var m = Espresso.meta(this, true);
    if (!m.subscriptions) m.subscriptions = {};

    if (!m.subscriptions[event]) {
      m.subscriptions[event] = [];
    }

    if (options && options.condition && !Espresso.isCallable(options.condition)) {
      delete options.condition;
    }

    options = mix({
      condition: Espresso.inferior(function () { return true; })
    }).into(options || {});

    m.subscriptions[event].push(mix(options, {
      subscriber: handler
    }).into({}));

    return this;
  },

  /**
    Unsubscribe from an event.

    @param {Object} event The event to subscribe to.
    @param {Function} handler The handler to call when the event is published.
    @returns {Object} The reciever.
   */
  unsubscribe: function (event, handler) {
    var m = Espresso.meta(this), handlers, i, len;
    if (m && m.subscriptions && m.subscriptions[event]) {
      handlers = m.subscriptions[event];
      for (i = 0, len = handlers.length; i < len; i += 1) {
        if (handlers[i].subscriber === handler) {
          m.subscriptions[event].splice(i, 1);
          break;
        }
      }
    }
    return this;
  },

  /**
    Gets called when an event has no subscribers to it.

    Override to handle the case when nothing is published.
    (There are no subscribers for an event.)

    Any parameters passed to the event are also passed into
    the function. All unpublished events are invoked immediately
    rather than `defer`red.

    @param {Object} event The event that was ignored.
    @returns {void}
   */
  unpublishedEvent: function (event) {},

  /**
    Publish an event, passing all arguments along to the subscribed functions.

    @param {Object} event The event to publish.
    @returns {Object} The reciever.
   */
  publish: function (event) {
    var m = Espresso.meta(this),
        args = arguments, subscriber, published = false;
    if (m && m.subscriptions && m.subscriptions[event]) {
      m.subscriptions[event].forEach(function (subscription) {
        if (subscription.condition.apply(this, args)) {
          subscriber = subscription.subscriber;
          if (subscription.synchronous) {
            subscriber.apply(this, args);
          } else {
            Espresso.defer(subscriber, args, this);
          }
          published = true;
        }
      }, this);
    }
    if (!published && Espresso.isCallable(this.unpublishedEvent)) {
      this.unpublishedEvent.apply(this, arguments);
    }
    return this;
  }
};
/*globals mix Espresso */

/** @name Array
  @namespace

  Shim for the native Array object.

  @extends Espresso.Enumerable
 */
mix(/** @scope Array */{

  /** @function
    @desc
    Checks whether the object passed in is an Array or not.

    @param {Object} obj The Object to test if it's an Array.
    @returns {Boolean} True if the obj is an array.
   */
  isArray: Espresso.inferior(function () {
    var toString = Object.prototype.toString;
    return function (obj) {
      return toString.call(obj) === '[object Array]';
    };
  }())

}).into(Array);

mix(Espresso.Enumerable, /** @scope Array.prototype */{

  /** @function
    @desc
    Iterator over the Array.

    Implemented to be in conformance with ECMA-262 Edition 5,
    so you will use the native `forEach` where it exists.

    @param {Function} lambda The callback to call for each element.
    @param {Object} [self] The Object to use as this when executing the callback.
    @returns {void}
   */
  forEach: Espresso.inferior(function (lambda, self) {
    // 3. Let len be ToUint32(lenValue).
    var len = this.length,
    // 6. Let k be 0.
        k = 0;

    // 4. If IsCallable(lambda) is false, throw a TypeError exception
    if (!Espresso.isCallable(lambda)) {
      throw new TypeError("{} is not callable.".format(lambda));
    }

    // 7. Repeat, while k < len
    while (k < len) {
      // c. If kPresent is true, then
      if (this.hasOwnProperty(k)) {
        //  i. Let kValue be the result of calling the [[Get]]
        //     internal method of O with argument Pk.
        // ii. Call the [[Call]] internal method of lambda
        //     with T as the this value and argument list
        //     containing kValue, k, and O.
        lambda.call(self, this[k], k, this);
      }

      // d. Increase k by 1.
      k += 1;
    }

    // 8. Return
  }),

  /** @function
    @desc
    Shim for `indexOf`.

    @param {Object} o The object to test.
    @param {Number} [fromIndex] The index to start looking at for the element.
    @returns {Number} The first index of an item (or -1 if no matching item was found).
   */
  indexOf: Espresso.inferior(function (o, fromIndex) {
    var i = 0, len = this.length;
    fromIndex = fromIndex || 0;
    i = fromIndex >= 0 ? fromIndex:
      Math.max(i, len - Math.abs(fromIndex));
    for (; i < len; i += 1) {
      if (o === this[i]) {
        return i;
      }
    }
    return -1;
  }),

  /** @function
    @desc
    Reduce the content of an array down to a single
    value (starting from the end and working backwards).

    @param {Function} lambda The lambda that performs the reduction.
      @param {Object} lambda.value The value of the enumerated item.
      @param {Object} lambda.key The key of the enumerated item.
      @param {Object} lambda.self The object being enumerated over.
    @param {Object} [seed] The seed value to provide for the first time.
    @returns {Object} The reduced output.
   */
  reduceRight: Espresso.inferior(function (lambda, seed) {
    var shouldSeed = (arguments.length === 1),
        len = this.length, v;

    // 4. If IsCallable(lambda) is false, throw a TypeError exception
    if (!Espresso.isCallable(lambda)) {
      throw new TypeError("{} is not callable.".format(lambda));
    }

    while (len-- > 0) {
      v = this[len];
      if (shouldSeed) {
        seed = v;
        shouldSeed = false;
      } else {
        seed = lambda(seed, v, len, this);
      }
    }

    // 5. If len is 0 and seed is not present, throw a TypeError exception.
    if (shouldSeed) {
      throw new TypeError("There was nothing to reduce!");
    }
    return seed;
  }),

  /** @function
    @desc
    Shim for `reverse`.
    Note: the Array is reversed in-place.

    @returns {Array} The array in reverse order.
   */
  reverse: Espresso.inferior(function () {
    var O, len, middle,
        lower, upper,
        lowerP, upperP,
        upperValue, lowerValue;

    // 1. Let O be the result of calling ToObject
    //    passing this value as the argument.
    O = this;

    // 3. Let len be ToUint(lenVal)
    len = this.length;

    // 4. Let middle be floor(len/2)
    middle = Math.floor(len / 2);

    // 5. Let lower be 0.
    lower = 0;

    // 6. Repeat, while lower !== middle
    while (lower !== middle) {
      // a. Let upper be len - lower - 1.
      upper = len - lower - 1;

      // b. Let upperP be ToString(upper).
      upperP = upper.toString();

      // c. Let lowerP be ToString(lower).
      lowerP = lower.toString();

      // d. Let lowerValue be the result of calling the [[Get]]
      //    intenal method of O with argument lowerP
      lowerValue = this[lowerP];
      
      // e. Let upperValue be the result of calling the [[Get]]
      //    intenal method of O with argument upperP
      upperValue = this[upperP];

      // h. If lowerExists is true and upperExists is true, then
      //     i. Call the [[Put]] internal method of O with arguments
      //        lowerP, upperValue, and true.
      //     i. Call the [[Put]] internal method of O with arguments
      //        upperP, lowerValue, and true.
      O[lowerP] = upperValue;
      O[upperP] = lowerValue;

      // l. Increase lower by 1.
      lower += 1;
    }

    // 7. Return 0.
    return O;
  }),

  /** @function
    @desc
    Shim for `lastIndexOf`.

    @param searchElement The item to look for.
    @param [fromIndex] The index to begin searching from.
    @returns {Number} The last index of an item (or -1 if not found).
   */
  lastIndexOf: Espresso.inferior(function (searchElement, fromIndex) {
    var k = 0, len = this.length, n;

    // 4. If len is 0, return -1.
    if (len === 0) {
      return -1;
    }

    // 5. If argument fromIndex was passed, let n be
    //    ToInteger(fromIndex); else let n be len.
    n = fromIndex || len;

    // 6. If n >= 0, then let k be min(n, len - 1).
    if (n > 0) {
      k = Math.min(n, len - 1);

    // 7. Else, n < 0
    } else {
      // a. Let k be len - abs(n).
      k = len - Math.abs(n);
    }

    // 8. Repeat, while k >= 0
    while (k >= 0) {
      // a. Let kPresent be the result of calling the [[HasProperty]]
      //    internal method of O with argument toString(k).
      // b. If kPresent is true, then
        //   i. Let elementK be the result of calling the [[Get]]
        //      internal method of O with the argument toString(k).
        //  ii. Let same be the result of applying the
        //      Strict Equality Comparision Algorithm to
        //      searchElement and elementK.
        // iii. If same is true, return k.
      if (this[k.toString()] === searchElement) {
        return k;
      }

      // c. Decrease k by 1.
      k -= 1;
    }
    return -1;
  })

}).into(Array.prototype);
/*globals mix Espresso */

mix(/** @scope String.prototype */{

  /** @function
    @desc
    Returns the string repeated the specified number of times.

    @param {Number} n The number of times to repeat this string.
    @returns {String} The string repeated n times.
    @example
      alert("Stop hittin' yourself. ".repeat(50));
   */
  repeat: Espresso.inferior(function (n) {
    return n < 1 ? '': (new Array(n)).join(this + '') + this;
  }),

  /** @function
    @desc
    Trim leading and trailing whitespace.

    @returns {String} The string with leading and trailing whitespace removed.
    @see <a href="http://blog.stevenlevithan.com/archives/faster-trim-javascript">Faster JavaScript Trim</a>
    @see <a href="http://jsperf.com/mega-trim-test">Mega Trim Test</a>
   */
  trim: Espresso.inferior(function () {
   var s = this.match(/\S+(?:\s+\S+)*/);
   return s ? s[0] : '';
  }),

  /** @function
    @desc
    Format formats a string in the vein of Python's format,
    Ruby #{templates}, and .NET String.Format.

    To write { or } in your Strings, just double them, and
    you'll end up with a single one.

    If you have more than one argument, then you can reference
    by the argument number (which is optional on a single argument).

    If you want to tie into this, and want to specify your own
    format specifier, override toFormat on your object, and it will
    pass you in the specifier (after the colon). You return the
    string it should look like, and that's it!

    For an example of an formatting extension, look at the Date mix.
    It implements the Ruby/Python formatting specification for Dates.

    @returns {String} The formatted string.
    @example
      alert("b{0}{0}a".format('an'));
      // => "banana"

    @example
      alert("I love {pi:.{precision}}".format({ pi: 22 / 7, precision: 2 }));
      // => "I love 3.14"

    @example
      alert("The {thing.name} is {thing.desc}.".format({
        thing: {
          name: 'cake',
          desc: 'a lie'
        }
      }));
      // => "The cake is a lie."

    @example
      alert(":-{{".format());  // Double {{ or }} to escape it.
      // => ":-{"
   */
  format: Espresso.inferior(function () {
    return Espresso.vformat(this, Espresso.A(arguments));
  }),

  /** @function
    @desc
    Formatter for `String`s.

    Don't call this function- It's here for `Espresso.format`
    to take care of buisiness for you.

    @param {String} spec The specifier string.
    @returns {String} The string formatted using the format specifier.
   */
  toFormat: Espresso.inferior(function (spec) {
    var match = spec.match(Espresso.FORMAT_SPECIFIER),
        align = match[1],
        fill = match[2] || ' ',
        minWidth = match[6] || 0,
        maxWidth = match[7] || null, len, before, after, value,
        length = this.length;

    if (align) {
      align = align.slice(-1);
    }

    len = Math.max(minWidth, length);
    before = len - length;
    after = 0;

    switch (align) {
    case '<':
      after = before;
      before = 0;
      break;
    case '^':
      after = Math.ceil(before / 2);
      before = Math.floor(before / 2);
      break;
    }

    value = this;
    if (maxWidth != null) {
      maxWidth = +maxWidth.slice(1);
      value = isNaN(maxWidth) ? value : value.slice(0, maxWidth);
    }

    return fill.repeat(before) + value + fill.repeat(after);
  })

}).into(String.prototype);
/*globals Espresso */

(function ()/** @lends Espresso */{

// Error strings.
var baseError = "Malformed format template:\n{}\n{:->{}}\n",
    unmatchedOpening = baseError + "Unmatched opening brace.",
    unmatchedClosing = baseError + "Unmatched closing brace.",
    openingBrace = '{',
    closingBrace = '}',
    specifierSeparator = ':';

/** @ignore */  // Docs are above
function vformat(template, args) {
  var prev = '', ch,
      buffer = [],
      result, idx = 0,
      len = template.length;

  for (; idx < len; idx++) {
    ch = template.charAt(idx);

    if (prev === closingBrace) {
      if (ch !== closingBrace) {
        throw new Error(vformat(unmatchedClosing, [template, idx, '^']));

      // Double-escaped closing brace.
      } else {
        buffer[buffer.length] = closingBrace;
        prev = '';
        continue;
      }
    }

    // Begin template parsing
    if (ch === openingBrace) {
      result = parseField(template, idx, template.slice(idx + 1), args);
      buffer[buffer.length] = result[1];
      idx += result[0]; // continue after the template.

    // Normal string processing
    } else if (ch !== closingBrace) {
      buffer[buffer.length] = ch;
    }
    prev = ch;
  }

  // Can't end with an unclosed closing brace
  if (ch === closingBrace && template.charAt(idx - 2) !== closingBrace) {
    throw new Error(vformat(unmatchedClosing, [template, idx, '^']));
  }
  return buffer.join('');
}

/** @ignore
  Parses the template with the arguments provided,
  parsing any nested templates.

  @param {String} template The template string to format.
  @param {Array} args The arguments to parse the template string.
  @returns {Array} A tuple with the length it ate up and the formatted template.
 */
function parseField(fullTemplate, fullIdx, template, args) {
  var idx = 0, ch, len = template.length,
      inSpecifier = false, iBrace = 0;
  for (; idx < len; idx++) {
    ch = template.charAt(idx);
    if (!inSpecifier) {
      if (ch === specifierSeparator) {
        inSpecifier = true;
        continue;
      }

      // Double-escaped opening brace
      if (ch === openingBrace) {
        if (idx === 0) {
          return [1, openingBrace];
        } else {
          throw new Error(vformat(unmatchedOpening, [fullTemplate, fullIdx + 1,  '^']));
        }

      // Done formatting.
      } else if (ch === closingBrace) {
        return [idx + 1, formatField(template.slice(0, idx), args)];
      }

    // Format the template's specifier *after* the whole specifier is found.
    } else {
      if (ch === openingBrace) {
        iBrace++;
      } else if (ch === closingBrace) {
        iBrace--;
      }

      // Spec is done.
      if (iBrace === -1) {
        return [idx + 1, formatField(vformat(template.slice(0, idx), args), args)];
      }
    }
  }
  throw new Error(vformat(unmatchedOpening, [fullTemplate, fullIdx + 1, '^']));
}

/** @ignore
  Returns the value of the template string formatted with the
  given arguments.

  @param {String} value The template string and format specifier.
  @param {Array} args An Array of arguments to use to format the template string.
  @returns {String} The formatted template.
 */
function formatField(value, args) {
  var iSpec = value.indexOf(specifierSeparator),
      spec, res;
  iSpec = iSpec === -1 ? value.length : iSpec;
  spec = value.slice(iSpec + 1);
  value = value.slice(0, iSpec);

  // Got `{}`; shift off the first argument passed in.
  if (value === '') {
    res = args.shift();

  // Return the object referenced by the property path given.
  } else {
    // First, try to get the value by absolute paths
    res = Espresso.getPath(args, value);

    // Allow for references to object literals
    if (typeof res === "undefined" &&
        Array.isArray(args) && args.length === 1 && args[0] != null) {
      res = Espresso.getPath(args[0], value);
    }
  }

  if (!spec) {
    return res;
  }

  return res != null && res.toFormat ? res.toFormat(spec) : String(res).toFormat(spec);
}

mix({
  /**
    Advanced String Formatting borrowed from the eponymous Python PEP.

    The formatter follows the rules of Python [PEP 3101][pep]
    (Advanced String Formatting) and following the ECMAScript
    Harmony strawman specification for string formatting
    (found [here][strawman]).

    To use literal object notation, just pass in one argument for
    the formatter. This is optional however, as you can always
    absolutely name the arguments via the number in the argument
    list. This means that:

        alert(Espresso.format("Hello, {name}!", { name: "world" }));

    is equivalent to:

        alert(Espresso.format("Hello, {0.name}!", { name: "world" }));

    For more than one argument you must provide the position of your
    argument.

        alert(Espresso.format("{0}, {1}!", "hello", "world"));

    If your arguments and formatter are "as is"- that is, in order,
    and flat objects as you intend them to be, you can write your
    template string like so:

        alert(Espresso.format("{}, {}!", "hello", "world"));

    To use the literals `{` and `}`, simply double them, like the following:

        alert(Espresso.format("{lang} uses the {{variable}} format too!", {
           lang: "Python", variable: "(not used)"
        }));
        // => "Python uses the {variable} format too!"

    Check out the examples given for some ideas on how to use it.

    The formatting API uses the special `toFormat` function on an
    object to handle the interpretation of the format specifiers.

    The default `toFormat` handler is on `Object.prototype`.

    For an example of a specialized format schema, consider the
    following example:

        Localizer = mix({
          toFormat: function (spec) {
            return this[spec];
          }
        }).into({});

        _hello = mix(Localizer).into({
          en: 'hello',
          fr: 'bonjour',
          ja: 'こんにちは'
        });

        alert(Espresso.format("{:en}", _hello));
        // => "hello"

        alert(Espresso.format("{:fr}", _hello));
        // => "bonjour"

        alert(Espresso.format("{:ja}", _hello));
        // => "こんにちは"

      [pep]: http://www.python.org/dev/peps/pep-3101/
      [strawman]: http://wiki.ecmascript.org/doku.php?id=strawman:string_format_take_two

    @param {String} template The template string to format the arguments with.
    @returns {String} The template formatted with the given leftover arguments.
   */
  format: function (template) {
    return vformat(template, Espresso.A(arguments).slice(1));
  },

  /**
    Same as {@link Espresso.format}, but with an explicit argument list.

    @param {String} template The template string to format the argument list with.
    @param {Array} argList The argument list to format.
    @returns {String} The template formatted with the given leftover arguments.
    @see Espresso.format
   */
  vformat: vformat,

  /**
    The specifier regular expression.

    The groups are:

      `[[fill]align][sign][#][0][minimumwidth][.precision][type]`

    The brackets (`[]`) indicates an optional element.

    The `fill` is the character to fill the rest of the minimum width
    of the string.

    The `align` is one of:

      - `^` Forces the field to be centered within the available space.
      - `<` Forces the field to be left-aligned within the available
            space. This is the default.
      - `>` Forces the field to be right-aligned within the available space.
      - `=` Forces the padding to be placed after the sign (if any)
            but before the digits. This alignment option is only valid
            for numeric types.

    Unless the minimum field width is defined, the field width
    will always be the same size as the data to fill it, so that
    the alignment option has no meaning in this case.

    The `sign` is only valid for numeric types, and can be one of
    the following:

      - `+` Indicates that a sign shoulb be used for both positive
            as well as negative numbers.
      - `-` Indicates that a sign shoulb be used only for as negative
            numbers. This is the default.
      - ` ` Indicates that a leading space should be used on positive
            numbers.

    If the `#` character is present, integers use the 'alternate form'
    for formatting. This means that binary, octal, and hexadecimal
    output will be prefixed with '0b', '0o', and '0x', respectively.

    `width` is a decimal integer defining the minimum field width. If
    not specified, then the field width will be determined by the
    content.

    If the width field is preceded by a zero (`0`) character, this enables
    zero-padding. This is equivalent to an alignment type of `=` and a
    fill character of `0`.

    The 'precision' is a decimal number indicating how many digits
    should be displayed after the decimal point in a floating point
    conversion. For non-numeric types the field indicates the maximum
    field size- in other words, how many characters will be used from
    the field content. The precision is ignored for integer conversions.

    Finally, the 'type' determines how the data should be presented.

    The available integer presentation types are:

      - `b` Binary. Outputs the number in base 2.
      - `c` Character. Converts the integer to the corresponding
            Unicode character before printing.
      - `d` Decimal Integer. Outputs the number in base 10.
      - `o` Octal format. Outputs the number in base 8.
      - `x` Hex format. Outputs the number in base 16, using lower-
            case letters for the digits above 9.
      - `X` Hex format. Outputs the number in base 16, using upper-
            case letters for the digits above 9.
      - `n` Number. This is the same as `d`, except that it uses the
            current locale setting to insert the appropriate
            number separator characters.
      - ` ` (None) the same as `d`

    The available floating point presentation types are:

      - `e` Exponent notation. Prints the number in scientific
            notation using the letter `e` to indicate the exponent.
      - `E` Exponent notation. Same as `e` except it converts the
            number to uppercase.
      - `f` Fixed point. Displays the number as a fixed-point
            number.
      - `F` Fixed point. Same as `f` except it converts the number
            to uppercase.
      - `g` General format. This prints the number as a fixed-point
            number, unless the number is too large, in which case
            it switches to `e` exponent notation.
      - `G` General format. Same as `g` except switches to `E`
            if the number gets to large.
      - `n` Number. This is the same as `g`, except that it uses the
            current locale setting to insert the appropriate
            number separator characters.
      - `%` Percentage. Multiplies the number by 100 and displays
            in fixed (`f`) format, followed by a percent sign.
      - ` ` (None) similar to `g`, except that it prints at least one
            digit after the decimal point.

    @type RegExp
   */
  FORMAT_SPECIFIER: /((.)?[><=\^])?([ +\-])?([#])?(0?)(\d+)?(\.\d+)?([bcoxXeEfFG%ngd])?/
}).into(Espresso);

}());
/*globals mix Espresso */

mix(/** @lends Number# */{

  /** @function
    @desc
    Formatter for `Number`s.

    @param {String} spec The specifier to format the number as.
    @returns {String} The number formatted as specified.
   */
  toFormat: Espresso.inferior(function (spec) {
    var value = this;

    // Don't want Infinity, -Infinity and NaN in here!
    if (!isFinite(value)) {
      return value;
    }

    var match = spec.match(Espresso.FORMAT_SPECIFIER),
        align = match[1],
        fill = match[2],
        sign = match[3] || '-',
        base = !!match[4],
        minWidth = match[6] || 0,
        maxWidth = match[7],
        type = match[8], precision;

    // Constants
    var emptyString = '',
        plus = '+',
        minus = '-';

    if (align) {
      align = align.slice(-1);
    }

    if (!fill && !!match[5]) {
      fill = '0';
      if (!align) {
        align = '=';
      }
    }

    precision = maxWidth && +maxWidth.slice(1);

    switch (sign) {
    case plus:
      sign = (value >= 0) ? plus: minus;
      break;
    case minus:
      sign = (value >= 0) ? emptyString: minus;
      break;
    case ' ':
      sign = (value >= 0) ? ' ': minus;
      break;
    default:
      sign = emptyString;
    }

    if (precision != null && precision !== "" && !isNaN(precision)) {
      // Opting to go with a more intuitive approach than Python...
      //  >>> "{.2}".format(math.pi)
      //  "3.1"
      // Which is waaay less intuitive than
      //  >>> "{.2}".format(Math.PI)
      //  "3.14"
      value = +value.toFixed(precision);
      precision++;
    } else {
      precision = null;
    }

    value = Math.abs(value);

    switch (type) {
    case 'd':
      value = Math.round(this - 0.5).toString();
      break;
    case 'b':
      base = base ? '0b' : emptyString;
      value = base + value.toString(2);
      break;
    case 'c':
      value = String.fromCharCode(value);
      break;
    case 'o':
      base = base ? '0o' : emptyString;
      value = base + value.toString(8);
      break;
    case 'x':
      base = base ? '0x' : emptyString;
      value = base + value.toString(16).toLowerCase();
      break;
    case 'X':
      base = base ? '0x' : emptyString;
      value = base + value.toString(16).toUpperCase();
      break;
    case 'e':
      value = value.toExponential().toLowerCase();
      break;
    case 'E':
      value = value.toExponential().toUpperCase();
      break;
    case 'f':
      // Follow Python's example (using 6 as the default)
      value = value.toPrecision(precision || 7).toLowerCase();
      break;
    case 'F':
      // Follow Python's example (using 6 as the default)
      value = value.toPrecision(precision || 7).toUpperCase();
      break;
    case 'G':
      value = String(value).toUpperCase();
      break;
    case '%':
      value = (value.toPrecision(7) * 100) + '%';
      break;
    case 'n':
      value = value.toLocaleString();
      break;
    case 's':
    case 'g':
    case emptyString:
    case void 0:
      value = String(value).toLowerCase();
      break;
    default:
      throw new Error('Unrecognized format type: "{}"'.format(type));
    }

    if (align !== '=') {
      value = sign + value;
    }

    // Clean up the leftover spec and toss it over to String.prototype.toFormat
    spec = (fill || emptyString) + (align || emptyString) + (minWidth || emptyString);
    if (precision) spec += "." + (precision + 1);
    spec += (type || emptyString);
    value = String(value).toFormat(spec);

    if (align === '=') {
      value = sign + value;
    }

    return value;
  })

}).into(Number.prototype);
/*globals mix */
mix(/** @lends Date# */{

  /** @function
    @desc
    Shim for `toISOString`.

    @returns {String} The ISO 6081 formatted UTC date.
   */
  toISOString: Espresso.inferior(function () {
    return "{}-{}-{}T{}:{}:{}.{}Z".format(
      this.getUTCFullYear(),
      this.getUTCMonth(),
      this.getUTCDate(),
      this.getUTCHours(),
      this.getUTCMinutes(),
      this.getUTCSeconds(),
      this.getUTCMilliseconds()
    );
  }),

  /** @function
    @desc
    Date Formatting support (for use with `format`).

    The following flags are acceptable in a format string:

     - `a` The abbreviated weekday name ("Sun")
     - `A` The full weekday name ("Sunday")
     - `b` The abbreviated month name ("Jan")
     - `B` The full month name ("January")
     - `c` The preferred local date and time representation
     - `d` Day of the month (01..31)
     - `H` Hour of the day, 24-hour clock (00..23)
     - `I` Hour of the day, 12-hour clock (01..12)
     - `j` Day of the year (001..366)
     - `m` Month of the year (01..12)
     - `M` Minute of the hour (00..59)
     - `p` Meridian indicator ("AM" or "PM")
     - `S` Second of the minute (00..60)
     - `U` Week number of the current year, starting with the first Sunday as the first day of the first week (00..53)
     - `W` Week number of the current year, starting with the first Monday as the first day of the first week (00..53)
     - `w` Day of the week (Sunday is 0, 0..6)
     - `x` Preferred representation for the date alone, no time
     - `X` Preferred representation for the time alone, no date
     - `y` Year without a century (00..99)
     - `Y` Year with century

    For example:

        alert("Today is {:A, B d, Y}.".format(new Date()));

        alert("The time is: {:c}.".format(new Date()));

    Note: all times used with `format` are **not** in UTC time.

    @param {String} spec The specifier to transform the date to a formatted string.
    @returns {String} The Date transformed into a string as specified.
   */
  toFormat: Espresso.inferior(function () {
    return function (spec) {
      var result = [], i = 0,
          day = Espresso.days[this.getDay()],
          month = Espresso.months[this.getMonth()];

      for (; i < spec.length; i += 1) {
        switch (spec.charAt(i)) {
        case 'a':
          result[result.length] = day.slice(0, 3);
          break;
        case 'A':
          result[result.length] = day;
          break;
        case 'b':
          result[result.length] = month.slice(0, 3);
          break;
        case 'B':
          result[result.length] = month;
          break;
        case 'c':
          result[result.length] = "{0:a b} {1:2} {0:H:M:S Y}".format(this, this.getDate());
          break;
        case 'd':
          result[result.length] = "{:02}".format(this.getDate());
          break;
        case 'H':
          result[result.length] = "{:02}".format(this.getHours());
          break;
        case 'I':
          result[result.length] = "{:02}".format(this.getHours() % 12);
          break;
        case 'j':
          result[result.length] = "{:03}".format(Math.ceil((this - new Date(this.getFullYear(), 0, 1)) / 86400000));
          break;
        case 'm':
          result[result.length] = "{:02}".format(this.getMonth() + 1);
          break;
        case 'M':
          result[result.length] = "{:02}".format(this.getMinutes());
          break;
        case 'p':
          result[result.length] = this.getHours() > 11 ? "PM" : "AM";
          break;
        case 'S':
          result[result.length] = "{:02}".format(this.getSeconds());
          break;
        case 'U':
          // Monday as the first day of the week
          day = ((this.getDay() + 6) % 7) + 1;
          result[result.length] = "{:02}".format(
            Math.ceil((((this - new Date(this.getFullYear(), 0, 1)) / 86400000) + day) / 7) - 1);
          break;
        case 'w':
          result[result.length] = this.getDay();
          break;
        case 'W':
          result[result.length] = "{:02}".format(
            Math.ceil((((this - new Date(this.getFullYear(), 0, 1)) / 86400000) + this.getDay() + 1) / 7) - 1);
          break;
        case 'x':
          result[result.length] = "{:m/d/y}".format(this);
          break;
        case 'X':
          result[result.length] = this.toLocaleTimeString();
          break;
        case 'y':
          result[result.length] = "{:02}".format(this.getYear() % 100);
          break;
        case 'Y':
          result[result.length] = this.getFullYear();
          break;
        default:
          result[result.length] = spec.charAt(i);
        }
      }
      return result.join('');
    };
  }())

}).into(Date.prototype);

mix(/** @lends Date */{

  /** @function
    @desc
    Shim for `now`.

    @returns {Number} The current time.
   */
  now: Espresso.inferior(function () {
    return new Date().getTime();
  })

}).into(Date);

mix(/** @lends Espresso */{

  /**
    Strings for the days of the week, starting
    with `'Sunday'`.

    If you want to use a different locale,
    set the `days` string to reflect the locale's.

    @type String[]
   */
  days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],

  /**
    Strings for the months of the year.

    If you want to use a different locale,
    set the `months` string to reflect the locale's.

    @type String[]
   */
  months: ["January", "February", "March", "April", "May", "June",
           "July", "August", "September", "October", "November", "December"]
}).into(Espresso);
/*globals mix */

mix(/** @scope Object */{

  /** @function
    @desc
    Returns all iterable keys on the passed Object.

    @param {Object} O The object to return the keys of.
    @returns {Array} A list of all keys on the object passed in.
    @throws {TypeError} When `O` is not an object.
   */
  keys: Espresso.inferior(function (O) {
    var array = [], key;

    // 1. If the Type(O) is not Object, throw a TypeError exception.
    if (typeof O !== "object" || O == null) {
      throw new TypeError("{} is not an object.".format(O));
    }

    // 5. For each own enumerable property of O whose name String is P
    for (key in O) {
      if (O.hasOwnProperty(key)) {
        array[array.length] = key;
      }
    }

    // 6. Return array.
    return array;
  })

}).into(Object);
(function () {

mix(/** @scope Espresso */{

  /**
    Returns the tokens that make up a property path.

    If there was any issue parsing the property path,
    an informative error will be throw that will mark
    the offending portion of the property path and
    explain what kind of token was expected.

    For example, property paths will be converted like so:

        Espresso.tokensForPropertyPath("foo.bar.baz");
        // ["foo", "bar", "baz"]

        Espresso.tokensForPropertyPath("foo['bar']['baz']");
        // ["foo", "bar", "baz"]

    Property strings enclosed inside braces (`[]`) can have
    any character set except for an unescaped ending quote.
    This means Unicode values, spaces, etc. are all valid:

        Espresso.tokensForPropertyPath("what.is['the answer'].to['life, the universe, and everything?']");
        // ["what", "is", "the answer", "to", "life, the universe, and everything?"]

    On the other hand, property paths delimited by a dot (`.`)
    can only be valid JavaScript variable values. The exception
    to this rule is the first parameter which can start with
    a numeric value.

    @param {String} path The property path to parse into tokens
    @returns {Array} The tokens that make up the property path.
    @throws {Error} When encountering a malformed property path.
   */
  tokensForPropertyPath: function (path) {
    // Reset debugging variables
    fullKey = path; idx = 0;
    var nextDelimiter = nextDelimiterFor(path),
        tokens = [], tuple;

    // No delimiter, the token is the path given
    if (nextDelimiter === -1) {
      tokens = [path];

    // Found a delimiter, extract the string before the delimiter.
    } else {
      tokens = [path.slice(0, nextDelimiter)];
      path = path.slice(nextDelimiter);
      idx += nextDelimiter;
    }

    // First property can be a number or string
    if (!/^[a-zA-Z0-9_$]+$/.test(tokens[0])) {
      throw new Error(fmt(0, "property", tokens[0] || path.charAt(0)));
    }

    // While there are delimiters left,
    while (nextDelimiter >= 0) {
      // Choose parsing method depending on delimiter character
      tuple = (['[', ']'].indexOf(path.charAt(0)) !== -1) ?
        getIndexedProperty(path) : getProperty(path);

      // Eat up used token
      path = path.slice(tuple[1]);
      // Push it on to the token list
      tokens.push(tuple[0]);
      // Increment the current pointer
      idx += tuple[1];

      // And find the next delimiter
      nextDelimiter = nextDelimiterFor(path);
    }

    return tokens;
  }

}).into(Espresso);


// ...............................................
// PARSER LOGIC
//

var DELIMITERS = ['[', ']', '.'];

/** @ignore
  Returns the index of the next delimiter character
  for the given path, starting at the given index.

  If there is no delimiter found, this will return -1.
 */
function nextDelimiterFor(path, idx) {
  idx = idx || 0;

  var next = -1, iDelimiter = -1,
      i = 0, len = DELIMITERS.length;

  for (; i < len; i++) {
    iDelimiter = path.indexOf(DELIMITERS[i], idx);
    if (iDelimiter !== -1) {
      next = (iDelimiter < next || next === -1) ?
        iDelimiter : next;
    }
  }

  return next;
}

// Template for parsing errors
var unexpectedTokenError =
  "Malformed property path:\n{}\n{:->{}}\nExpected {} as the next token, but got '{}'.";

// Private variables for storing the property path that's currently being parsed
// and the current index that's been parsed to
var fullKey, idx,
    /** @ignore */
    fmt = function (idx, expected, actual) {
      // Use vformat to reduce an extra function call
      return Espresso.vformat(unexpectedTokenError, [fullKey, idx, '^', expected, actual]);
    };

var VARIABLE = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/;

/** @ignore
  Returns the property that starts with a '.'.

  Looks for a property token that obeys the syntax
  rules of JavaScript variable naming:

      Property
        : VARIABLE '.'
          {$$ = $2;}
        ;

  This will return a tuple with the key and the amount
  of characters that were eaten by this method.
 */
function getProperty(path) {
  // Assume the path starts with '.'
  var endProperty = nextDelimiterFor(path, 1),
      property;

  if (endProperty === -1) endProperty = path.length;
  property = path.slice(1, endProperty);

  // Should hold to native JavaScript variable naming conditions
  // (sans reserved words)
  if (!VARIABLE.test(property)) {
    throw new Error(fmt(idx + 2, "a string", fullKey.charAt(idx + 1)));
  }

  return [property, endProperty];
}


var WHOLE_NUMBER = /^\[(-)?\d+\]/;

/** @ignore
  Returns the property that starts with a '[' or ']'.

  Looks for a property token that follows the following
  lexical grammar (where WHOLE_NUMBER is a whole number and
  STRING is a string without an unescaped closing quote):

      IndexedProperty
        : '[' NUMBER ']'
           {$$ = $2;}
        | '["' STRING '"]'
           {$$ = $2;}
        | "['" STRING "']"
           {$$ = $2;}
        ;

  This means the following tokens are valid:

      ["Hello, world"]  => Hello, world
      [0]               => 0
      [-1]              => -1
      ["\\\""]          => "
      ['こんにちは']    => こんにちは

  Note that the escaped double quote was will translate
  into JavaScript as '["\""]'. This is being interpolated
  again by the parser, which means that the string should
  respect explicit escapes in the string.

  This will return a tuple with the key and the amount
  of characters that were eaten by this method.
 */
function getIndexedProperty(path) {
  // Can't start with ']'
  if (path.charAt(0) === ']') {
    throw new Error(fmt(idx + 1, "'['", ']'));
  }

  // Assume the path starts with '[' or ']'
  var startBrace = 1, endBrace, quote, chr;

  quote = !WHOLE_NUMBER.test(path) || "";

  // Requires quotes for valid property paths if
  // the contents aren't numeric
  if (quote) {
    quote = path.charAt(startBrace);
    if (quote !== '"' && quote !== "'") {
      throw new Error(fmt(idx + 2, "''', '\"', or a number", quote));
    }
    startBrace += 1;
  }

  // Look for quote first
  if (quote) {
    endBrace = path.indexOf(quote, startBrace);

    // Check to see if the quote was escaped, if so, keep looking.
    while (path.charAt(endBrace - 1) === '\\') {
      endBrace = path.indexOf(quote, endBrace + 1);
      if (endBrace === -1) break;
    }

    // No ending quote
    if (endBrace === -1) {
      throw new Error(fmt(idx + 3, "closing " + quote, path.slice(2)));

    // Ending quote is not immediately preceded by ']'
    } else if (path.charAt(endBrace + 1) !== ']') {
      throw new Error(fmt(idx + endBrace + 2, "']'", path.charAt(endBrace + 1)));
    }

  // No quote; look for ']'
  } else {
    endBrace = path.indexOf(']', startBrace);
    // We matched against a RegExp, so we don't need to check for
    // the ending ']'
  }

  // Check to see if the next character is valid.
  chr = path.charAt(endBrace + quote.length + 1);
  if (chr !== "" && chr !== "[" && chr !== ".") {
    throw new Error(fmt(idx + 2, "'[', '.', or EOS", chr));
  }

  // Replace escaped quotes with quotes (like \' or \")
  // This allows paths that include ' and " in them.
  return [path.slice(startBrace, endBrace)
              .replace(new RegExp('\\\\' + quote, 'g'), quote), endBrace + quote.length + 1];
}

}());
(function () {

var get, set, meta = Espresso.meta,
    tokenize = Espresso.tokensForPropertyPath,
    isCallable = Espresso.isCallable;

// Handle ES5 compliant JavaScript implementations here.

/** @ignore */
get = function (object, key) {
  // If there is no path, assume we're trying to get on Espresso.
  if (arguments.length === 1) {
    key = object;
    object = Espresso;
  }

  if (object == null) return void 0;
  var value = object[key];
  if (typeof value === "undefined" &&
      isCallable(object.unknownProperty)) {
    value = object.unknownProperty(key);
  }
  return value;
};

/** @ignore */
set = function (object, key, value) {
  // Unknown Properties
  if (object != null && !(key in object) &&
      isCallable(object.unknownProperty)) {
    object.unknownProperty(key, value);
  } else {
    object[key] = value;
    if (object && object.publish) {
      object.publish(key, value);
    }
  }
  return value;
};

// Fallback on looking up information on the meta hash here.
if (!Espresso.defineProperty) {
  var o_get = get, o_set = set;

  /** @ignore */
  get = function (object, key) {
    if (arguments.length === 1) {
      key = object;
      object = Espresso;
    }

    if (object == null) return void 0;
    var desc = meta(object, false);
    desc = desc && desc.desc[key];
    return desc ? desc.get.call(object) :
      o_get(object, key);
  };

  /** @ignore */
  set = function (object, key, value) {
    var desc = meta(object, false);
    desc = desc && desc.desc[key];
    if (desc) {
      desc.set.call(object, value);
    } else {
      o_set(object, key, value);
    }
    return value;
  };
}

mix(/** @scope Espresso */{

  /** @function
    @desc
    Returns the property for a given value.

    This brings backwards-compatability to ES5 properties.

    If no property with the given name is found on the object,
    `unknownProperty` will be attempted to be invoked.

    @param {Object} [object] The object to lookup the key on.
      If no object is provided, it will fallback on `Espresso`.
    @param {String} key The key to lookup on the object.
    @returns {Object} The value of the property on the object.
   */
  get: get,

  /**
    Lookup a variable's value given its Object notation.
    This requires absolute queries to the Object, using
    idiomatic JavaScript notation. If no second argument
    is given, it will look up the object on `Espresso`.

    @example
      // No scope assumes the object has is at the global scope.
      window.environment = {
        isBrowser: (function () {
          return document in this;
        }())
      };

      alert(Espresso.getPath(window, "environment.isBrowser"));

    @example
      alert(Espresso.getPath({
        lang: {
          en: { _coffee: "coffee" },
          pr: { _coffee: "cafe" }
        }
      }, "lang.pr._coffee"));
      // -> "cafe"

    @example
      alert(Espresso.getPath({
        options: ["espresso", "coffee", "tea"]
      }, "options[0]"));
      // -> "espresso"

    @param {Object} object The target object to get a value from.
    @param {String} key The key to get on the target.
    @returns {Object} The referenced value in the args passed in.
   */
  getPath: function (object, path) {
    // If there is no path, assume we're trying to get on Espresso.
    if (arguments.length === 1) {
      path = object;
      object = Espresso;
    }

    var tokens = tokenize(path);

    while (tokens.length) {
      object = get(object, tokens.shift());
    }
    return object;
  },

  /** @function
    @desc
    Set a value on an object.

    Use this instead of subscript (`[]`) or dot notation
    for public variables. Otherwise, you won't reap benefits
    of being notified when they are set, or if the property
    is computed.

    Set is tolerant of when trying to access objects that
    don't exist- it will ignore your attempt in that case.

    @param {String} key The key to lookup on the object.
    @param {Object} value The value to set the object at the key's path to.
    @returns {Object} The reciever.
   */
  set: set,

  /**
    Set a value that is a property path.

    This function will return the value given the
    property path using `set` and `get` when necessary.

    This means you should write:

        zombie.setPath('brain.isDelicious', true);

    instead of:

        zombie.set('brain.isDelicious', true);

    @param {String} key The property path to lookup on the object.
    @param {Object} value The value to set the object at the key's path to.
    @returns {Object} The reciever.
   */
  setPath: function (object, path, value) {
    var tokens = tokenize(path);

    while (tokens.length > 1) {
      object = get(object, tokens.shift());
    }

    return (object == null) ? value :
      set(object, tokens.shift(), value);
  }

}).into(Espresso);

}());
(function () {

var meta = Espresso.meta,
    defineProperty = Espresso.defineProperty;

/** @ignore
  Creates a getter that will return what's
  in the cache if
 */
function mkGetter(key, desc) {
  var cacheable = desc.isCacheable,
      fun = desc;

  if (cacheable) {
    return function () {
      var value, cache = meta(this).cache;
      if (key in cache) return cache[key];
      value = cache[key] = fun.call(this, key);
      return value;
    };
  } else {
    return function () {
      return fun.call(this, key);
    };
  }
}

function mkSetter(key, desc) {
  var idempotent = desc.isIdempotent,
      cacheable = desc.isCacheable,
      fun = desc;

  if (idempotent) {
    return function (value) {
      var m = meta(this, cacheable),
          ret, cache = m.lastSetCache;

      // Fast path for idempotent properties
      if (key in cache && cache[key] === value && cacheable) {
        return m.cache[key];
      }

      cache[key] = value;
      if (cacheable) delete m.cache[key];
      ret = fun.call(this, key, value);
      if (cacheable) m.cache[key] = ret;
      return ret;
    };
  } else {
    return function (value) {
      var m = meta(this, cacheable),
          ret;

      if (cacheable) delete m.cache[key];
      ret = fun.call(this, key, value);
      if (cacheable) m.cache[key] = ret;
      return ret;
    };
  }
}


mix(/** @scope Espresso */{

  /**
    Marks a function as a computed property, where the
    getter and setter functions are the same function.

    If you're in an ECMAScript5 supported environment,
    you may use normal object accessors on properties,
    which will call `get` and `set` for you:

        Greeter = mix(Espresso.Observable, {
          "L10N": {
            hello: {
              en: "Hello",
              ja: "こんにちは",
              fr: "Bonjour"
            }
          },

          language: Espresso.property(),

          greeting: Espresso.property(function () {
            return "{{L10N.hello.{language}}}".format(this).format(this);
          }, "language").cacheable()
        }).into({});
        Greeter.initObservable();

        Greeter.language = "en";
        alert(Greeter.greeting);
        // -> "Hello"

        Greeter.language = "fr";
        alert(Greeter.greeting);
        // -> "Bonjour"

    Keep in mind that everything that needs property observing
    has to be an {@link Espresso.Property}. For instance
    if the example above didn't have `language` as
    {@link Espresso.property}, you would have to explicitly
    `set` `language` to have `greeting` be notified of the
    property changes.

    @param {Function} fn The function to be called when
      the property should be computed.
    @param {...} dependentKeys The dependent keys that
      this property has. When any of these keys get
      updated via KVO, the property will be notified.
    @returns {Espresso.Property} The function as a Espresso.property.
   */
  property: function (fn, dependentKeys) {
    dependentKeys = Espresso.A(arguments).slice(1);
    if (Espresso.isCallable(fn)) {
      mix(Espresso.Property).into(fn);
    } else {
      fn = {};
    }

    // Decorator API
    fn._ = fn._ || {};
    /** @ignore */
    fn._.property = function (template, value, key) {
      var m = meta(template, true);

      m.desc[key] = { watching: dependentKeys };
      m.desc[key].get = mkGetter(key, value);
      m.desc[key].set = mkSetter(key, value);

      // ECMAScript5 compatible API (no need for get or set!)
      if (defineProperty) {
        defineProperty(template, key, {
          get: m.desc[key].get,
          set: m.desc[key].set,
          enumerable: true,
          configurable: true
        });

        // Don't return anything...
        value = void(0);
      }
      return value;
    };

    return fn;
  }

}).into(Espresso);

}());
/** @namespace
  A mixin to apply to callable objects that
  want to be a computed property. This means
  that the property will act like a getter /
  setter, but with notifications via KVO.
 */
Espresso.Property = /** @lends Espresso.Property# */{

  /**
    Walk like a duck.
    @type Boolean
    @default true
   */
  isProperty: true,

  /**
    Whether or not the property should be
    cached when it gets recalculated.
    @type Boolean
    @default false
   */
  isCacheable: false,

  /**
    Whether the property is volatile or not.
    Defaults to being a volatile property.
    @type Boolean
    @default false
   */
  isIdempotent: false,

  /**
    The keys that this property depends on.
    If any of these keys change, the property
    should be notified it did so.
    @type Array
   */
  dependentKeys: null,

  /**
    Marks the property as cacheable.
    @returns {Espresso.Property} The property.
   */
   cacheable: function () {
     this.isCacheable = true;
     return this;
   },

  /**
    Marks the property as idempotent.
    @returns {Espresso.Property} The property.
   */
   idempotent: function () {
     this.isIdempotent = true;
     return this;
   }
};
/*globals Espresso */

/** @namespace

  [Key-Value Observing][kvo] (KVO) is a mechanism that allows
  objects to be notified of changes to specified properties of
  other Objects. It is based off of the observer pattern, which
  in turn is built on top of the Publish-Subscribe pattern.

  KVO is used on top of {@link Espresso.Subscribable} for notifying
  observers that a change occured.

  To understand Key-Value coding, you must understand property
  paths first. This simply means that you need to understand
  the Object model of the object that you are doing a `get` or
  `set` on. Take the following example:

      var Beatles = mix(Espresso.Observable).into({
        Paul: {
          instruments: ['vocals', 'bass', 'guitar', 'piano',
                        'keyboards', 'drums', 'ukelele',
                        'mandolin']
        },
        John: {
          instruments: ['vocals', 'guitar', 'piano', 'banjo',
                        'harmonica', 'mellotron',
                        'six-string bass', 'percussion']
        },
        Ringo: {
          instruments: ['drums', 'vocals', 'percussion',
                        'tambourine']
        },
        George: {
          instruments: ['guitar', 'vocals', 'bass', 'keyboards',
                        'ukelele', 'mandolin', 'sitar', 'tambura',
                        'sarod', 'swarmandal']
        }
      });

      Beatles.initObservable();
      alert(Beatles.getPath('Paul.instruments[0]'));
      // => 'vocals'

  Using `get` provides optimizations such as caching on an Object.

  Using `set` provides notifications to observing functions /
  properties.

  The Observable mixin provides the ability to have dynamically computed
  properties via the `property` decorator on functions and the
  ability to intercept `get`s or `set`s to unknown properties via
  `unknownProperty`.

  Computed properties are simply a function that takes 2 arguments,
  the key and the value of the property that triggered the function
  call. These properties may also have dependent keys. When a
  property has dependent keys, every single time a dependent key
  gets `set`, the property will get recomputed.

  Consider the following:

      var Box = mix(Espresso.Observable).into({
        width: 0,
        height: 0,
        depth: 0,

        volume: Espresso.property(function () {
          return this.get('width') * this.get('height') * this.get('depth');
        }, 'width', 'height', 'depth').cacheable()
      });

  The `volume` property will get recomputed every single time the
  `width`, `height`, or `depth` values change. If you had another
  object that you would like to monitor the changes, perhaps a
  renderer, you could attach observers to each of the properties
  by subscribing to the property path (via
  {@link Espresso.Subscribable#subscribe}), providing any property paths
  that you would like to be notified on.

    [kvo]: http://developer.apple.com/library/mac/#documentation/Cocoa/Conceptual/KeyValueObserving/KeyValueObserving.html

  @extends Espresso.Subscribable
 */
Espresso.Observable = mix(Espresso.Subscribable).into(/** @lends Espresso.Observable# */{

  /**
    Walk like a duck.
    @type Boolean
   */
  isObservable: true,

  /**
    Initialize the observer. This needs to be explicitly
    called to activate property observing.

    When creating your base object for your library, you
    should use the following boilerplate to make property
    observing automatically initialize (with the following
    boilerplate assuming your constructor is called `init`):

        mix({
          init: Espresso.refine(function (original) {
            this.initObservable();
            return original.apply(null, Espresso.A(arguments).slice(1));
          })
        }).into(Espresso.Observable);

    @returns {void}
   */
  initObservable: function () {
    if (this.__isObservableInitialized__) { return; }
    this.__isObservableInitialized__ = true;

    var key, property, i = 0, len, dependents,
        meta = Espresso.meta(this, true),
        dependent, iDependent, object, notifier, tokens;

    /** @ignore */
    notifier = function (key) {
      this.set(key);
    };

    for (key in meta.desc) { // Iterate over all keys
      property = meta.desc[key];

      if (property.watching) {
        dependents = property.watching;
        len = dependents.length;
        for (i = 0; i < len; i += 1) {
          dependent = dependents[i];
          object = this;

          // If it's a property path, follow the chain.
          tokens = Espresso.tokensForPropertyPath(dependent);
          if (tokens.length > 1) {
            object = Espresso.getPath(tokens.slice(0, -2).join('.'));
            dependent = tokens[tokens.length - 1];
          }

          // Subscribe to the events.
          if (object && object.isObservable && object.isSubscribable) {
            object.subscribe(dependent, notifier.bind(this, key), { synchronous: true });
          }
        }
      }
    }
  },

  /**
    Get a value on an object that is a property path.

    This function will return the value given the
    property path using `get` when necessary.

    This means you should write:

        zombie.getPath('brain.isDelicious');

    instead of:

        zombie.get('brain.isDelicious');

    @param {String} key The property path to lookup on the object.
    @returns {Object} The value of the key.
   */
  getPath: function (k) {
    return Espresso.getPath(this, k);
  },

  /**
    Get a value on an object.

    Use this instead of subscript (`[]`) or dot notation
    for public variables. Otherwise, you won't reap benefits
    of being notified when they are set, or if the property
    is computed.

    Get is tolerant of when trying to access objects that
    don't exist- it will return undefined in that case.

    @param {String} key The key to lookup on the object.
    @returns {Object} The value of the key.
   */
  get: function (k) {
    return Espresso.get(this, k);
  },

  /**
    Set a value that is a property path.

    This function will return the value given the
    property path using `set` and `get` when necessary.

    This means you should write:

        zombie.setPath('brain.isDelicious', true);

    instead of:

        zombie.set('brain.isDelicious', true);

    @param {String} key The property path to lookup on the object.
    @param {Object} value The value to set the object at the key's path to.
    @returns {Object} The reciever.
   */
  setPath: function (k, v) {
    Espresso.setPath(this, k, v);
    return this;
  },

  /**
    Set a value on an object.

    Use this instead of subscript (`[]`) or dot notation
    for public variables. Otherwise, you won't reap benefits
    of being notified when they are set, or if the property
    is computed.

    Set is tolerant of when trying to access objects that
    don't exist- it will ignore your attempt in that case.

    @param {String} key The key to lookup on the object.
    @param {Object} value The value to set the object at the key's path to.
    @returns {Object} The reciever.
   */
  set: function (k, v) {
    Espresso.set(this, k, v);
    return this;
  },

  /**
    Called whenever you try to get or set a nonexistent
    property.

    This is a generic property that you can override to
    intercept general gets and sets, making use out of them.

    @param {String} key The unknown key that was looked up.
    @param {Object} [value] The value to set the key to.
    @returns {Object} The value of the key.
   */
  unknownProperty: function (key, value) {
    if (arguments.length === 2) {
      this[key] = value;
    }
    return void(0);
  }
});
/*
    http://www.JSON.org/json2.js
    2011-02-23

    Public Domain.

    NO WARRANTY EXPRESSED OR IMPLIED. USE AT YOUR OWN RISK.

    See http://www.JSON.org/js.html


    This code should be minified before deployment.
    See http://javascript.crockford.com/jsmin.html

    USE YOUR OWN COPY. IT IS EXTREMELY UNWISE TO LOAD CODE FROM SERVERS YOU DO
    NOT CONTROL.


    This file creates a global JSON object containing two methods: stringify
    and parse.

        JSON.stringify(value, replacer, space)
            value       any JavaScript value, usually an object or array.

            replacer    an optional parameter that determines how object
                        values are stringified for objects. It can be a
                        function or an array of strings.

            space       an optional parameter that specifies the indentation
                        of nested structures. If it is omitted, the text will
                        be packed without extra whitespace. If it is a number,
                        it will specify the number of spaces to indent at each
                        level. If it is a string (such as '\t' or '&nbsp;'),
                        it contains the characters used to indent at each level.

            This method produces a JSON text from a JavaScript value.

            When an object value is found, if the object contains a toJSON
            method, its toJSON method will be called and the result will be
            stringified. A toJSON method does not serialize: it returns the
            value represented by the name/value pair that should be serialized,
            or undefined if nothing should be serialized. The toJSON method
            will be passed the key associated with the value, and this will be
            bound to the value

            For example, this would serialize Dates as ISO strings.

                Date.prototype.toJSON = function (key) {
                    function f(n) {
                        // Format integers to have at least two digits.
                        return n < 10 ? '0' + n : n;
                    }

                    return this.getUTCFullYear()   + '-' +
                         f(this.getUTCMonth() + 1) + '-' +
                         f(this.getUTCDate())      + 'T' +
                         f(this.getUTCHours())     + ':' +
                         f(this.getUTCMinutes())   + ':' +
                         f(this.getUTCSeconds())   + 'Z';
                };

            You can provide an optional replacer method. It will be passed the
            key and value of each member, with this bound to the containing
            object. The value that is returned from your method will be
            serialized. If your method returns undefined, then the member will
            be excluded from the serialization.

            If the replacer parameter is an array of strings, then it will be
            used to select the members to be serialized. It filters the results
            such that only members with keys listed in the replacer array are
            stringified.

            Values that do not have JSON representations, such as undefined or
            functions, will not be serialized. Such values in objects will be
            dropped; in arrays they will be replaced with null. You can use
            a replacer function to replace those with JSON values.
            JSON.stringify(undefined) returns undefined.

            The optional space parameter produces a stringification of the
            value that is filled with line breaks and indentation to make it
            easier to read.

            If the space parameter is a non-empty string, then that string will
            be used for indentation. If the space parameter is a number, then
            the indentation will be that many spaces.

            Example:

            text = JSON.stringify(['e', {pluribus: 'unum'}]);
            // text is '["e",{"pluribus":"unum"}]'


            text = JSON.stringify(['e', {pluribus: 'unum'}], null, '\t');
            // text is '[\n\t"e",\n\t{\n\t\t"pluribus": "unum"\n\t}\n]'

            text = JSON.stringify([new Date()], function (key, value) {
                return this[key] instanceof Date ?
                    'Date(' + this[key] + ')' : value;
            });
            // text is '["Date(---current time---)"]'


        JSON.parse(text, reviver)
            This method parses a JSON text to produce an object or array.
            It can throw a SyntaxError exception.

            The optional reviver parameter is a function that can filter and
            transform the results. It receives each of the keys and values,
            and its return value is used instead of the original value.
            If it returns what it received, then the structure is not modified.
            If it returns undefined then the member is deleted.

            Example:

            // Parse the text. Values that look like ISO date strings will
            // be converted to Date objects.

            myData = JSON.parse(text, function (key, value) {
                var a;
                if (typeof value === 'string') {
                    a =
/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*)?)Z$/.exec(value);
                    if (a) {
                        return new Date(Date.UTC(+a[1], +a[2] - 1, +a[3], +a[4],
                            +a[5], +a[6]));
                    }
                }
                return value;
            });

            myData = JSON.parse('["Date(09/09/2001)"]', function (key, value) {
                var d;
                if (typeof value === 'string' &&
                        value.slice(0, 5) === 'Date(' &&
                        value.slice(-1) === ')') {
                    d = new Date(value.slice(5, -1));
                    if (d) {
                        return d;
                    }
                }
                return value;
            });


    This is a reference implementation. You are free to copy, modify, or
    redistribute.
*/

/*jslint evil: true, strict: false, regexp: false */

/*members "", "\b", "\t", "\n", "\f", "\r", "\"", JSON, "\\", apply,
    call, charCodeAt, getUTCDate, getUTCFullYear, getUTCHours,
    getUTCMinutes, getUTCMonth, getUTCSeconds, hasOwnProperty, join,
    lastIndex, length, parse, prototype, push, replace, slice, stringify,
    test, toJSON, toString, valueOf
*/


// Create a JSON object only if one does not already exist. We create the
// methods in a closure to avoid creating global variables.

var JSON;
if (!JSON) {
    JSON = {};
}

(function () {
    "use strict";

    function f(n) {
        // Format integers to have at least two digits.
        return n < 10 ? '0' + n : n;
    }

    if (typeof Date.prototype.toJSON !== 'function') {

        Date.prototype.toJSON = function (key) {

            return isFinite(this.valueOf()) ?
                this.getUTCFullYear()     + '-' +
                f(this.getUTCMonth() + 1) + '-' +
                f(this.getUTCDate())      + 'T' +
                f(this.getUTCHours())     + ':' +
                f(this.getUTCMinutes())   + ':' +
                f(this.getUTCSeconds())   + 'Z' : null;
        };

        String.prototype.toJSON      =
            Number.prototype.toJSON  =
            Boolean.prototype.toJSON = function (key) {
                return this.valueOf();
            };
    }

    var cx = /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
        escapable = /[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
        gap,
        indent,
        meta = {    // table of character substitutions
            '\b': '\\b',
            '\t': '\\t',
            '\n': '\\n',
            '\f': '\\f',
            '\r': '\\r',
            '"' : '\\"',
            '\\': '\\\\'
        },
        rep;


    function quote(string) {

// If the string contains no control characters, no quote characters, and no
// backslash characters, then we can safely slap some quotes around it.
// Otherwise we must also replace the offending characters with safe escape
// sequences.

        escapable.lastIndex = 0;
        return escapable.test(string) ? '"' + string.replace(escapable, function (a) {
            var c = meta[a];
            return typeof c === 'string' ? c :
                '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
        }) + '"' : '"' + string + '"';
    }


    function str(key, holder) {

// Produce a string from holder[key].

        var i,          // The loop counter.
            k,          // The member key.
            v,          // The member value.
            length,
            mind = gap,
            partial,
            value = holder[key];

// If the value has a toJSON method, call it to obtain a replacement value.

        if (value && typeof value === 'object' &&
                typeof value.toJSON === 'function') {
            value = value.toJSON(key);
        }

// If we were called with a replacer function, then call the replacer to
// obtain a replacement value.

        if (typeof rep === 'function') {
            value = rep.call(holder, key, value);
        }

// What happens next depends on the value's type.

        switch (typeof value) {
        case 'string':
            return quote(value);

        case 'number':

// JSON numbers must be finite. Encode non-finite numbers as null.

            return isFinite(value) ? String(value) : 'null';

        case 'boolean':
        case 'null':

// If the value is a boolean or null, convert it to a string. Note:
// typeof null does not produce 'null'. The case is included here in
// the remote chance that this gets fixed someday.

            return String(value);

// If the type is 'object', we might be dealing with an object or an array or
// null.

        case 'object':

// Due to a specification blunder in ECMAScript, typeof null is 'object',
// so watch out for that case.

            if (!value) {
                return 'null';
            }

// Make an array to hold the partial results of stringifying this object value.

            gap += indent;
            partial = [];

// Is the value an array?

            if (Object.prototype.toString.apply(value) === '[object Array]') {

// The value is an array. Stringify every element. Use null as a placeholder
// for non-JSON values.

                length = value.length;
                for (i = 0; i < length; i += 1) {
                    partial[i] = str(i, value) || 'null';
                }

// Join all of the elements together, separated with commas, and wrap them in
// brackets.

                v = partial.length === 0 ? '[]' : gap ?
                    '[\n' + gap + partial.join(',\n' + gap) + '\n' + mind + ']' :
                    '[' + partial.join(',') + ']';
                gap = mind;
                return v;
            }

// If the replacer is an array, use it to select the members to be stringified.

            if (rep && typeof rep === 'object') {
                length = rep.length;
                for (i = 0; i < length; i += 1) {
                    if (typeof rep[i] === 'string') {
                        k = rep[i];
                        v = str(k, value);
                        if (v) {
                            partial.push(quote(k) + (gap ? ': ' : ':') + v);
                        }
                    }
                }
            } else {

// Otherwise, iterate through all of the keys in the object.

                for (k in value) {
                    if (Object.prototype.hasOwnProperty.call(value, k)) {
                        v = str(k, value);
                        if (v) {
                            partial.push(quote(k) + (gap ? ': ' : ':') + v);
                        }
                    }
                }
            }

// Join all of the member texts together, separated with commas,
// and wrap them in braces.

            v = partial.length === 0 ? '{}' : gap ?
                '{\n' + gap + partial.join(',\n' + gap) + '\n' + mind + '}' :
                '{' + partial.join(',') + '}';
            gap = mind;
            return v;
        }
    }

// If the JSON object does not yet have a stringify method, give it one.

    if (typeof JSON.stringify !== 'function') {
        JSON.stringify = function (value, replacer, space) {

// The stringify method takes a value and an optional replacer, and an optional
// space parameter, and returns a JSON text. The replacer can be a function
// that can replace values, or an array of strings that will select the keys.
// A default replacer method can be provided. Use of the space parameter can
// produce text that is more easily readable.

            var i;
            gap = '';
            indent = '';

// If the space parameter is a number, make an indent string containing that
// many spaces.

            if (typeof space === 'number') {
                for (i = 0; i < space; i += 1) {
                    indent += ' ';
                }

// If the space parameter is a string, it will be used as the indent string.

            } else if (typeof space === 'string') {
                indent = space;
            }

// If there is a replacer, it must be a function or an array.
// Otherwise, throw an error.

            rep = replacer;
            if (replacer && typeof replacer !== 'function' &&
                    (typeof replacer !== 'object' ||
                    typeof replacer.length !== 'number')) {
                throw new Error('JSON.stringify');
            }

// Make a fake root object containing our value under the key of ''.
// Return the result of stringifying the value.

            return str('', {'': value});
        };
    }


// If the JSON object does not yet have a parse method, give it one.

    if (typeof JSON.parse !== 'function') {
        JSON.parse = function (text, reviver) {

// The parse method takes a text and an optional reviver function, and returns
// a JavaScript value if the text is a valid JSON text.

            var j;

            function walk(holder, key) {

// The walk method is used to recursively walk the resulting structure so
// that modifications can be made.

                var k, v, value = holder[key];
                if (value && typeof value === 'object') {
                    for (k in value) {
                        if (Object.prototype.hasOwnProperty.call(value, k)) {
                            v = walk(value, k);
                            if (v !== undefined) {
                                value[k] = v;
                            } else {
                                delete value[k];
                            }
                        }
                    }
                }
                return reviver.call(holder, key, value);
            }


// Parsing happens in four stages. In the first stage, we replace certain
// Unicode characters with escape sequences. JavaScript handles many characters
// incorrectly, either silently deleting them, or treating them as line endings.

            text = String(text);
            cx.lastIndex = 0;
            if (cx.test(text)) {
                text = text.replace(cx, function (a) {
                    return '\\u' +
                        ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
                });
            }

// In the second stage, we run the text against regular expressions that look
// for non-JSON patterns. We are especially concerned with '()' and 'new'
// because they can cause invocation, and '=' because it can cause mutation.
// But just to be safe, we want to reject all unexpected forms.

// We split the second stage into 4 regexp operations in order to work around
// crippling inefficiencies in IE's and Safari's regexp engines. First we
// replace the JSON backslash pairs with '@' (a non-JSON character). Second, we
// replace all simple value tokens with ']' characters. Third, we delete all
// open brackets that follow a colon or comma or that begin the text. Finally,
// we look to see that the remaining characters are only whitespace or ']' or
// ',' or ':' or '{' or '}'. If that is so, then the text is safe for eval.

            if (/^[\],:{}\s]*$/
                    .test(text.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g, '@')
                        .replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']')
                        .replace(/(?:^|:|,)(?:\s*\[)+/g, ''))) {

// In the third stage we use the eval function to compile the text into a
// JavaScript structure. The '{' operator is subject to a syntactic ambiguity
// in JavaScript: it can begin a block or an object literal. We wrap the text
// in parens to eliminate the ambiguity.

                j = eval('(' + text + ')');

// In the optional fourth stage, we recursively walk the new structure, passing
// each name/value pair to a reviver function for possible transformation.

                return typeof reviver === 'function' ?
                    walk({'': j}, '') : j;
            }

// If the text is not JSON parseable, then a SyntaxError is thrown.

            throw new SyntaxError('JSON.parse');
        };
    }
}());
/* global Jnctn Espresso */

/** @namespace
  Jnctn is the core namespace for the [Junction Networks
  Web Services][1] JavaScript SDK. It provides a cross-platform
  interface for making requests to the API, and unpacks
  responses to give relevant portions to you.

  Note that this is not a 1:1 mapping of the API, but
  provides a layer of abstraction that keeps the library
  lightweight and up-to-date with the state of the Web
  Services API.

     [1]: http://www.jnctn.com/webservices/api/
 */
Jnctn = {

  /**
    The version string.
    @type String
   */
  VERSION: '0.3.0',

  /**
    The common URL to the Junction Networks Web Services API.
    By default, the URL uses HTTPS to ensure that sessions
    are kept private.
    @type String
   */
  URL: 'https://www.jnctn.com/restapi',

  /**
    Universally Unique Identifier local to the Jnctn namespace.
    @type Number
   */
  uuid: 0,

  /**
    Will locate the response inside the given object.

    @param {String|Function} locator The locator to use to extract the
      right object from the json.
    @param {Object} json The object to extract the data from.
    @returns {Object} The located result.
   */
  locate: function (locator, json) {
    var response;
    if (Espresso.isCallable(locator)) {
      response = locator(json);
    } else {
      response = Espresso.getPath(json, locator);
    }
    return response;
  },

  /**
    Write a message to the `console.log` interface (if it exists).
    @returns {void}
   */
  log: function () {
    return window && window.console && window.console.log &&
      Espresso.isCallable(window.console.log) &&
      window.console.log.apply(window.console, arguments);
  },

  /**
    Write a message to the `console.info` interface (if it exists).
    @returns {void}
   */
  info: function () {
    return window && window.console && window.console.info &&
      Espresso.isCallable(window.console.info) &&
      window.console.info.apply(window.console, arguments);
  },

  /**
    Write a message to the `console.debug` interface (if it exists).
    @returns {void}
   */
  debug: function () {
    return window && window.console && window.console.debug &&
      Espresso.isCallable(window.console.debug) &&
      window.console.debug.apply(window.console, arguments);
  },

  /**
    Write a message to the `console.error` interface (if it exists).
    @returns {void}
   */
  error: function () {
    return window && window.console && window.console.error &&
      Espresso.isCallable(window.console.error) &&
      window.console.error.apply(window.console, arguments);
  },

  /**
    Write a message to the `console.warn` interface (if it exists).
    @returns {void}
   */
  warn: function () {
    return window && window.console && window.console.warn &&
      Espresso.isCallable(window.console.warn) &&
      window.console.warn.apply(window.console, arguments);
  }

};
/* global Jnctn Espresso mix */

/** @namespace
  The base object that provides a mechanism for simple inheritance
  based off of Douglas Crockford's [prototypal inheritance][1].

  Using `extend`, {@link Jnctn.Base} provides a simple way to
  extend any object to create a new one. This allows for simple
  mutations to full fledged extensions. The decorators `refine`
  and `inferior` are available for use to provide `super`-like
  functionality (via `refine`) and feature detection (via `inferior`).

  If `init` is defined on the object, it will be called at
  extension time.

     [1]: http://javascript.crockford.com/prototypal.html

  @example
    var Bird = Jnctn.Base.extend({
      canFly: true
    });

    var Person = Jnctn.Base.extend({
      name: "nil"
    });

    var BirdMan = Person.extend(Bird, { name: 'Harvey Birdman' });
    alert(BirdMan.name);
    // => "Harvey Birdman"

    alert(BirdMan.canFly);
    // => true
 */
Jnctn.Base = mix(/** @lends Jnctn.Base# */{

  /**
    Creates a new object from `this` with the objects passed
    in mixed into the object.

    @param {...} extensions The objects to extend `this` with.
    @returns {Jnctn.Base} The new Object, extended with the given properties.
   */
  extend: function () {
    var F = function () {},
        extension, res;
    F.prototype = this;
    extension = new F();
    res = mix.apply(null, Espresso.A(arguments)).into(extension);
    if (Espresso.isCallable(this.init)) {
      this.init.apply(res);
    }
    return res;
  }

}).into({});
/* global Jnctn */

/** @namespace
  Interface for low-level requests to a remote domain.
  The Jnctn.RequestAdapter requires the `send` function
  to be overridden to send and request data to the
  remote URL.

  @extends Jnctn.Base
 */
Jnctn.RequestAdapter = Jnctn.Base.extend(/** @lends Jnctn.RequestAdapter# */{

  /**
    The method to use to retrieve the contents at the url.
    @type String
   */
  method: null,

  /**
    The URL to request.
    @type String
   */
  url: null,

  /**
    Whether or not the request should be asynchronous.
    @type Boolean
   */
  async: null,

  /**
    The preferred language to use when sending requests.
    @type String
   */
  lang: null,

  /**
    The timeout (in milliseconds) before the request should be aborted.
    @type Number
   */
  timeout: 1000,

  /**
    The method to call when the request is completed.
    @type Function
   */
  onComplete: null,

  /**
    Send the data provided.
    @param {String} [data] The data to send.
    @returns {void}
   */
  send: function (data) {
    throw new Jnctn.Error("You must override 'send'");
  }
});
/* global Jnctn */

/**
  @namespace
  The API object is the core API for Jnctn.

  To make a request to the Junction Networks Web Services API, simply
  extend {@link Jnctn.API} with a `requestAdapter` slot that is a
  {@link Jnctn.RequestAdapter}. The provided {@link Jnctn.Request} is
  available for use out-of-the-box.

  If you would like to execute the [`Echo` action][1], you can do so
  by doing the following:

      var api = Jnctn.API.extend({
        requestAdapter: Jnctn.Request.extend()
      });

      api.get("echo", {
        param: 'foo',
        other_one: 'bar',
        a_third: 'baz'
      }, {
        success: function (object, response) {
          alert(object);
          // => {}
        },
        error: function (object, response) {
          alert(object);
        }
      });
      // The request will look like:
      // ?Action=Echo&Param=foo&OtherOne=bar&AThird=baz

   Request parameters are normalized to upper camel case (using a best
   effort approach), meaning idiomatic requests to the Web Services API.


     [1]: http://www.jnctn.com/webservices/api/action.Echo.html  

  @extends Jnctn.Base
 */
Jnctn.API = Jnctn.Base.extend(/** @lends Jnctn.API# */{

  /**
    Does sanity checking ensuring that the requestAdapter is set
    on `this`.
    @private
    @returns {void}
   */
  init: function () {
    if (!this.requestAdapter) {
      throw new Jnctn.Error("To use the API, you must provide a 'requestAdapter'.");
    }
  },

  /**
    The language to use for requests.
    @type String
   */
  lang: "en-US",

  /**
    The adapter is used to request data from the
    Junction Networks Web Services API.
    @type Jnctn.RequestAdapter
   */
  requestAdapter: null,

  /**
    The response locators to use when unpacking
    the returned JSON.
    @type Object
   */
  locators: Jnctn.RESPONSE_LOCATORS,

  /**
    The URL to use for requests to the Web Services API.
    @type String
   */
  url: Jnctn.URL,

  /**
    Request something from the Web Services API using `GET`.

    @param {String} action The action to execute.
    @param {Object} [params] Parameters to provide in the request.
    @param {Object} [callbacks] An object with `success` and `error` functions.
    @returns {void}
   */
  get: function (action, params, callbacks) {
    params = params || {};
    var queryString = this._buildQueryString(action, params);
    callbacks = callbacks || {};

    this.raw("GET", params.action, this.url + "?" + queryString, undefined, callbacks);
  },

  /**
    Request something from the Web Services API using `POST`.

    @param {String} action The action to execute.
    @param {Object} [params] Parameters to provide in the request.
    @param {Object} [callbacks] An object with `success` and `error` functions.
    @returns {void}
   */
  post: function (action, params, callbacks) {
    params = params || {};
    var queryString = this._buildQueryString(action, params);
    callbacks = callbacks || {};

    this.raw("POST", params.action, this.url, queryString, callbacks);
  },

  /** @private
    Builds a query string given an action and parameters to pass along.

    @param {String} action The action to execute.
    @param {Object} params Parameters to provide in the request.
    @returns {String} The query string result.
   */
  _buildQueryString: function (action, params) {
    var query = [], key, value, S = Jnctn.String;
    mix({
      action: S.capitalize(S.camelize(S.dasherize(action))),
      output: 'json'
    }).into(params);

    for (key in params) {
      value = params[key];
      if (params.hasOwnProperty(key) && value && key && typeof value !== "object") {
        query.push(S.capitalize(S.camelize(S.dasherize(key))) + "=" + encodeURIComponent(value));
      }
    }

    return query.join('&');
  },

  /**
    Called on completion of a request.

    @private
    @param {Object} callbacks The callbacks to call on completion.
    @param {Object} json The resulting JSON.
    @returns {void}
   */
  _onComplete: function (callbacks, json) {
    var response = Jnctn.Response.extend(json);

    if (response.isCompleted && response.isValid && callbacks.success) {
      callbacks.success(response.result, response);
    } else if (callbacks.error) {
      // If no result is given, this probably means
      // that this is a TimeoutError, so that's the result.
      callbacks.error(response.result || json, response);
    }
  },

  /**
    Send a raw request using the method to access the contents,
    given the action, body, and callbacks to call when the
    request is completed.

    @param {String} method The HTTP method to use.
    @param {String} action The action being taken.
    @param {String} [body] The body to send along with the request.
    @param {Object} [callbacks] An object with callbacks for `success` and `error`.
      @param {Function} [callbacks.success] The function to call on a successful request.
      @param {Function} [callbacks.error] The function to call on a unsuccessful request.
    @returns {void}
   */
  raw: function (method, action, url, body, callbacks) {
    this.requestAdapter.extend({
      method: method,
      url: url,
      async: true,
      lang: this.lang,
      onComplete: this._onComplete.bind(this, callbacks)
    }).send(body);
  }

});
/* global Jnctn XMLHttpRequest */

/** @namespace
  Provides support for `XMLHttpRequest` objects browsers that
  support level 2 support of `XMLHttpRequest` (ie. most modern
  browsers).

  @extends Jnctn.RequestAdapter
 */
Jnctn.XMLHttpRequest = Jnctn.RequestAdapter.extend(/** @lends Jnctn.XMLHttpRequest# */{

  /**
    Whether or not cross-origin `XMLHttpRequest`s are
    supported on this platform.
    @type Boolean
   */
  isSupported: (function () {
    var supported = false, xhr;
    if ("XMLHttpRequest" in this) {
      xhr = new XMLHttpRequest();
      supported = xhr && xhr.hasOwnProperty &&
                  (xhr.hasOwnProperty("withCredentials") || Espresso.hasValue(xhr.withCredentials));
    }
    return supported;
  }()),

  /**
    The timeout ID for browsers that don't take the
    `timeout` parameter and `ontimeout` event.
    @private
    @type Number
   */
  _timeoutID: null,

  /**
    Whether or not the request timed out.
    @private
    @type Boolean
   */
  _aborted: null,

  /**
    The underlying `XMLHttpRequest` object.
    @private
    @type XMLHttpRequest
   */
  _xhr: null,

  /**
    Setup the XMLHttpRequest with the following parameters
    and callbacks.
    @private
    @returns {void}
   */
  init: function () {
    if (!this.url) return;
    var that = this;

    this._xhr = new XMLHttpRequest();
    this._xhr.open(this.method, this.url, this.async);

    // Bypass the cache (Mozilla)
    if (this._xhr.hasOwnProperty("channel")) {
      this._xhr.channel.loadFlags |= Components.interfaces.nsIRequest.LOAD_BYPASS_CACHE;
    }

    // Set Content Headers
    this._xhr.setRequestHeader("Cache-Control", "no-cache");
    if (this.lang) {
      this._xhr.setRequestHeader("Accept-Language", this.lang);
      this._xhr.setRequestHeader("Content-Language", this.lang); 
    }

    if (this._xhr.hasOwnProperty("timeout")) {
      this._xhr.timeout = this.timeout;

      /** @ignore */
      this._xhr.ontimeout = function () {
        that.onComplete(new Jnctn.TimeoutError("The XMLHttpRequest to '" + that.url +"' timed out.", that.timeout));
      };
    }

    /** @ignore */
    this._xhr.onreadystatechange = function () {
      if (that._timeoutID) clearTimeout(that._timeoutID);
      if (that._xhr.readyState === 4 && that.onComplete &&
          that._xhr.status === 200) {
        that.onComplete(JSON.parse(that._xhr.responseText));
      } else if (!that._aborted && that._xhr.readyState === 4) {
        that.onComplete(new Jnctn.Error("Could not complete the XMLHttpRequest to '" + that.url +"'; look at your web console for a more detailed response."));
      }
    };
  },

  /**
    Send the request with the given data.
    @param {String} [data] The data to send as the body of the request.
    @returns {void}
   */
  send: function (data) {
    this._xhr.send(encodeURI(data));

    // Timeout the request
    if (!this._xhr.hasOwnProperty("timeout")) {
      var that = this;
      /** @ignore */
      this._timeoutID = setTimeout(function () {
        that.onComplete(new Jnctn.TimeoutError("The XMLHttpRequest to '" + that.url +"' timed out.", that.timeout));
        that._aborted = true;
        that._xhr.abort();
      }, this.timeout);
    }
  }

});
/* global Jnctn XDomainRequest */

/** @namespace
  Provides support for Internet Explorer's `XDomainRequest`
  for Cross-Origin requests.

  @extends Jnctn.RequestAdapter
 */
Jnctn.XDomainRequest = Jnctn.RequestAdapter.extend(/** @lends Jnctn.XDomainRequest# */{

  /**
    Whether or not `XDomainRequest`s are supported on this platform.
    @type Boolean
   */
  isSupported: (function () {
    return "XDomainRequest" in this;
  }()),

  /**
    The `XDomainRequest` object.
    @private
    @type XDomainRequest
   */
  _xdr: null,

  /**
    Initializes the `XDomainRequest` with the given
    timeout and callbacks to the `onComplete` function.
    @private
    @returns {void}
   */
  init: function () {
    if (!this.url) return;

    var that = this;

    this._xdr = new XDomainRequest();
    this._xdr.open(this.method, this.url);
    this._xdr.timeout = this.timeout;

    /** @ignore */
    this._xdr.ontimeout = function () {
      that.onComplete(new Jnctn.TimeoutError("The XDomainRequest request to '" + that.url +"' timed out.", that.timeout));
    };

    /** @ignore */
    this._xdr.onload = function () {
      if (that.onComplete) {
        that.onComplete(JSON.parse(that._xhr.responseText));
      }
    };
  },

  /**
    Sends the request.
    @param {String} [data] The data to send in the body of the request.
    @returns {void}
   */
  send: function (data) {
    this._xdr.send(encodeURI(data));
  }

});
/* global Jnctn Espresso document */

/** @namespace
  JSONP (JSON with padding) is an alternative
  to CORS using `<script/>` tags to retrieve
  data from foriegn hosts.

  The JSONP module will transform all requests
  (no matter the method) into JSONP wrapped GETs.

  @extends Jnctn.RequestAdapter
 */
Jnctn.JSONPRequest = Jnctn.RequestAdapter.extend(/** @lends Jnctn.JSONPRequest# */{

  /**
    Whether or not the platform supports JSONP requests.
    (ie. It's not a browser).
    @type Boolean
   */
  isSupported: (function () {
    return !!document;
  }()),

  /**
    The GUID (Globally Unique Identifier) for this JSONP request.
    @type String
   */
  guid: null,

  /**
    The query parameter being added to the end of the URL.
    @type String
   */
  query: null,

  /**
    Initialize the JSONP request.
    @private
    @returns {void}
   */
  init: function () {
    if (!this.url) return;

    this.guid = "jn" + Jnctn.uuid++;
    this.query = "now=" + (new Date()).getTime() +
                 "&Callback=Jnctn.__jsonp__." + this.guid;
  },

  /**
    Send the request using JSONP.
    @param {String} [data] The data to send in the body of the request.
    @returns {void}
   */
  send: function (data) {
    if (this.isCompleted) {
      throw new Jnctn.Error("You cannot send a JSONP request multiple times.");
    }

    var script = document.createElement('script'),
        that = this, timer;

    Jnctn.__jsonp__ = Jnctn.__jsonp__ || {};
    Jnctn.__jsonp__[this.guid] = function (json) {
      if (timer) clearTimeout(timer);
      if (that.onComplete) {
        that.onComplete(json);
      }
      that.teardown();
    };

    if (data) {
      this.url += "?" + data;
    }
    this.url += "&" + this.query;

    script.setAttribute('type', 'text/javascript');
    script.setAttribute('charset', 'utf-8');
    script.setAttribute('src', this.url);
    script.setAttribute('id', this.guid);

    var onError = function () {
      if (timer) clearTimeout(timer);
      if (that.onComplete) {
        that.onComplete(new Jnctn.Error(
          "The JSONP request to '" + that.url + "' could not be made because that resource can't be accessed."));
      }
      that.teardown();
    };

    if (script.addEventListener) {
      script.addEventListener('error', onError, false);
    } else {
      script.attachEvent('error', onError);
    }

    document.getElementsByTagName('head').item(0).appendChild(script);
    timer = setTimeout(function () {
      if (that.onComplete) {
        that.onComplete(new Jnctn.TimeoutError(
          "The JSONP request to '" + that.url +"' timed out.", that.timeout));
      }
      that.teardown();
    }, this.timeout);
  },

  /**
    Reliquish resources being used by this JSONP request.
    @returns {void}
   */
  teardown: function () {
    delete Jnctn.__jsonp__[this.guid];
    var script = document.getElementById(this.guid);

    if (script) {
      document.getElementsByTagName('head').item(0).removeChild(script);
    }
  }

});
/* global Jnctn */

/** @namespace
  Provides a cascading mechanism for choosing the transport
  to use via an `isSupported` flag on registered
  {@link Jnctn.RequestAdapter}s.

  This provides a cross-platform mechanism for requesting
  resources across domains (if the domain is allowed via
  CORS) and an easily extensible interface for adding
  support for different platforms. Register your adapter
  with {@link Jnctn.Request} via a call like:

      Jnctn.Request.adapters.push(MyNewRequestAdapter);

  It will be added to the end of the queue of possible
  requesters. If none of the adapters before it are
  supported, then it will ask your adapter if it's supported.
  If it returns `true`, then your adapter will be used
  for further requests.

  If you would like to reorder the RequestAdapters, extend
  Jnctn.Request to create your own instance, with the adapters
  array modified like the following:

      MyRequestObject = Jnctn.Request.extend({
        adapters: [MyRequestAdapter, Jnctn.XDomainRequest,
                   Jnctn.XMLHttpRequest, Jnctn.JSONPRequest]
      });

  You MUST extend {@link Jnctn.Request} to have it delegate
  to the proper {@link Jnctn.RequestAdapter} when extending
  {@link Jnctn.API}.

  @extends Jnctn.RequestAdapter
 */
Jnctn.Request = Jnctn.RequestAdapter.extend(/** @lends Jnctn.Request# */{

  /**
    Registered adapters to try to use for requesting
    data from a remote domain.

    Override the contents of the array to specify
    trial order for request mechanisms. It defaults
    to trying {@link Jnctn.XMLHttpRequest}, then
    {@link Jnctn.XDomainRequest}, then {@link Jnctn.JSONPRequest}.
    @type Jnctn.RequestAdapter[]
   */
  adapters: [Jnctn.XMLHttpRequest, Jnctn.XDomainRequest, Jnctn.JSONPRequest],

  /**
    Initialize a new request, and mixin the first supported
    registered adapter for use.
    @private
    @returns {void}
   */
  init: function () {
    var that = this, supported = false;

    for (var i = 0, len = this.adapters.length; i < len; i++) {
      if (this.adapters[i].isSupported) {
        supported = true;
        mix(this.adapters[i].extend({
          lang: this.lang,
          timeout: this.timeout
        })).into(this);
        break;
      }
    }

    // Throwing an error is good here, since this library is
    // useless when a Request doesn't have any supported adapters.
    if (!supported) {
      throw new Jnctn.Error("Could not find a supported RequestAdapter for this environment");
    }
  }

});
/* global Jnctn */

/** @class
  Simple error class of Jnctn.

  @param {String} message The message that the error should throw.
  @example
    throw new Jnctn.Error('the error message');
 */
Jnctn.Error = function (message) {
  this.message = message;
};
Jnctn.Error.prototype = new Error();
Jnctn.Error.prototype.name = 'Jnctn.Error';


/** @class
  Timeout error class of Jnctn.

  @param {String} message The message that the error should throw.
  @param {Number} [timeout] The time (in milliseconds) that caused this error to be thrown.
  @example
    throw new Jnctn.TimeoutError('Y U MAKE ME WAIT?', 1000);
 */
Jnctn.TimeoutError = function (message, timeout) {
  this.message = message;
  this.timeout = timeout;
};
Jnctn.TimeoutError.prototype = new Jnctn.Error();
Jnctn.TimeoutError.prototype.name = 'Jnctn.TimeoutError';
/* global Jnctn */

/** @namespace
  Inflection lookup table to be used for `pluralize` and `singularize`.

  This table is taken from (quite shamelessly) from the `ActiveSupport`
  module of Ruby on Rails. It covers most cases that will occur in
  applications, and will certainly deal with the cases that will crop
  up in API responses from the Web Services API.
 */
Jnctn.INFLECTIONS = {
  PLURAL: [
    [/(quiz)$/i,               "$1zes"  ],
    [/^(oxen)$/i,              "$1"     ],
    [/^(ox)$/i,                "$1en"   ],
    [/([m|l])ice$/i,           "$1ice"  ],
    [/([m|l])ouse$/i,          "$1ice"  ],
    [/(matr|vert|ind)ix|ex$/i, "$1ices" ],
    [/(x|ch|ss|sh)$/i,         "$1es"   ],
    [/([^aeiouy]|qu)y$/i,      "$1ies"  ],
    [/(hive)$/i,               "$1s"    ],
    [/(?:([^f])fe|([lr])f)$/i, "$1$2ves"],
    [/sis$/i,                  "ses"    ],
    [/([ti])a$/i,              "$1a"    ],
    [/([ti])um$/i,             "$1a"    ],
    [/(buffal|tomat)o$/i,      "$1oes"  ],
    [/(bu)s$/i,                "$1ses"  ],
    [/(alias|status)$/i,       "$1es"   ],
    [/(octop|vir)us$/i,        "$1i"    ],
    [/(octop|vir)i$/i,         "$1i"    ],
    [/(ax|test)is$/i,          "$1es"   ],
    [/s$/i,                    "s"      ],
    [/$/,                      "s"      ]
  ],

  SINGULAR: [
    [/(database)s$/,                                                   "$1"     ],
    [/(quiz)zes$/i,                                                    "$1"     ],
    [/(matr)ices$/i,                                                   "$1ix"   ],
    [/(vert|ind)ices$/i,                                               "$1ex"   ],
    [/^(ox)en/i,                                                       "$1"     ],
    [/(alias|status)es$/i,                                             "$1"     ],
    [/(octop|vir)i$/i,                                                 "$1us"   ],
    [/(cris|ax|test)es$/i,                                             "$1is"   ],
    [/(shoe)s$/i,                                                      "$1"     ],
    [/(o)es$/i,                                                        "$1"     ],
    [/(bus)es$/i,                                                      "$1"     ],
    [/([m|l])ice$/i,                                                   "$1ouse" ],
    [/(x|ch|ss|sh)es$/i,                                               "$1"     ],
    [/(m)ovies$/i,                                                     "$1ovie" ],
    [/(s)eries$/i,                                                     "$1eries"],
    [/([^aeiouy]|qu)ies$/i,                                            "$1y"    ],
    [/([lr])ves$/i,                                                    "$1f"    ],
    [/(tive)s$/i,                                                      "$1"     ],
    [/(hive)s$/i,                                                      "$1"     ],
    [/([^f])ves$/i,                                                    "$1fe"   ],
    [/(^analy)ses$/i,                                                  "$1sis"  ],
    [/((a)naly|(b)a|(d)iagno|(p)arenthe|(p)rogno|(s)ynop|(t)he)ses$/i, "$1$2sis"],
    [/([ti])a$/i,                                                      "$1um"   ],
    [/(n)ews$/i,                                                       "$1ews"  ],
    [/s$/i,                                                            ""       ]
  ],

  IRREGULAR: [
    ['cows',   'kine'   ],
    ['move',   'moves'   ],
    ['sex',    'sexes'   ],
    ['child',  'children'],
    ['man',    'men'     ],
    ['person', 'people'  ]
  ],

  UNCOUNTABLE: [
    "jeans",
    "sheep",
    "fish",
    "series",
    "species",
    "money",
    "rice",
    "information",
    "info",
    "equipment"
  ]
};
/* globals Jnctn */

/** @namespace
  Custom String transformations that are not compatible
  across JS libraries.
 */
Jnctn.String = mix(/** @lends Jnctn.String# */{

  /**
    Convert the string into it's singular form (best effort).
    @returns {String} The singular of the last word in the string.

    @example
      alert("One " + Jnctn.String.singularize("people") + " is enough.");
      // => "One person is enough."
   */
  singularize: function (s) {
    var compare = s.split(/\s/).pop(), // check only the last word of a string
        rest = s.length === compare.length ? "" : s.slice(-1 * compare.length),
        isCapitalized = /[A-Z]/.test(compare.charAt(0)),
        len, i, regex;


    compare = compare.toLowerCase();
    for (i = 0, len = Jnctn.INFLECTIONS.UNCOUNTABLE.length; i < len; i++) {
      if (compare === Jnctn.INFLECTIONS.UNCOUNTABLE[i]) {
        return s.toString();
      }
    }

    for (i = 0, len = Jnctn.INFLECTIONS.IRREGULAR.length; i < len; i++) {
      var singular = Jnctn.INFLECTIONS.IRREGULAR[i][0],
          plural = Jnctn.INFLECTIONS.IRREGULAR[i][1];
      if ((compare === singular) || (compare === plural)) {
        if (isCapitalized) singular = Jnctn.String.capitalize(singular);
        return rest + singular;
      }
    }

    for (i = 0, len = Jnctn.INFLECTIONS.SINGULAR.length; i < len; i++) {
      regex = Jnctn.INFLECTIONS.SINGULAR[i][0];
      if (regex.test(compare)) {
        return s.replace(regex, Jnctn.INFLECTIONS.SINGULAR[i][1]);
      }
    }

    return s;
  },

  /**
    Convert the string into it's plural form (best effort).
    @returns {String} The plural form of the last word in the string.

    @example
      alert("The " + Jnctn.String.pluralize("octopus") + " are quite active today.");
      // => "The octopi are quite active today."
   */
  pluralize: function (s) {
    var compare = s.split(/\s/).pop(), //check only the last word of a string
        rest = s.length === compare.length ? "" : s.slice(-1 * compare.length),
        isCapitalized = /[A-Z]/.test(compare.charAt(0)),
        i, len, regex;

    compare = compare.toLowerCase();
    for (i = 0, len = Jnctn.INFLECTIONS.UNCOUNTABLE.length; i < len; i++) {
      if (compare === Jnctn.INFLECTIONS.UNCOUNTABLE[i]) {
        return s.toString();
      }
    }

    for (i = 0, len = Jnctn.INFLECTIONS.IRREGULAR.length; i < len; i++) {
      var singular = Jnctn.INFLECTIONS.IRREGULAR[i][0],
          plural = Jnctn.INFLECTIONS.IRREGULAR[i][1];
      if ((compare === singular) || (compare === plural)) {
        if (isCapitalized) plural = Jnctn.String.capitalize(plural);
        return rest + plural;
      }
    }

    for (i = 0, len = Jnctn.INFLECTIONS.PLURAL.length; i < len; i++) {
      regex = Jnctn.INFLECTIONS.PLURAL[i][0];
      if (regex.test(compare)) {
        return s.replace(regex, Jnctn.INFLECTIONS.PLURAL[i][1]);
      }
    }

    return s;
  },

  /**
    Capitalize a string.
    @returns {String} The string, capitalized.

    @example
      alert("mr. mustard man".split(' ').map(function (word) {
        return word.capitalize();
      }).join(' '));
      // => "Mr. Mustard Man"
   */
  capitalize: function (str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  },

  /** @function
    @desc
    Camelize a string.

    NOTE: All dashes (`-`), underscores (`_`), spaces (` `) and
          newlines are considered breaking points to join for
          camelCase.
    @returns {String} The string in camelCase.

    @example
       alert("na cl".camelize().capitalize());
       // => "NaCl"
   */
  camelize: (function () {
    var regexp = /([\s|\-|\_|\n])([^\s|\-|\_|\n]?)/g;
    return function (str) {
      return str.replace(regexp, function (junk, seperator, chr) {
         return chr ? chr.toUpperCase() : '';
      });
    };
  }()),


  /** @function
    @desc
    Dasherize a string.

    Replaces a camelCase string with dashes.
    @returns {String} The string, dasherized.

    @example
      alert(Jnctn.String.dasherize("PardonMeForBreathingWhichINeverDoAnywaySoIDon'tKnowWhyIBotherToSayItOhGodI'mSoDepressed."));
      // => "Pardon-me-for-breathing-which-iNever-do-anyway-so-iDon't-know-why-iBother-to-say-it-oh-god-i'm-so-depressed"
   */
  dasherize: (function () {
    var regexp = /([a-z])([A-Z])/g;
    return function (str) {
      return str.replace(regexp, function (junk, before, after) {
        return before + '-' + after.toLowerCase();
      });
    };
  }())

}).into({});
/** @function
  @desc
  Returns the object with notes on it saying that it
  can be located by calling `locate` on it with the
  object that it would like to find.

  It should be used to signal the {@link Jnctn.Locatable}
  mixin that it should resolve the locator at `mixin`
  time.

      var Response = Jnctn.Base.extend(Jnctn.Locatable, {
        result: Jnctn.Locator("Response.Result"),
      });

      var res = Response.extend({ Response: { Result: "Tada!" }});
      res.result;
      // => "Tada!"

  @param {String|Function} locator The locator to use.
  @returns {Object} A locator object to be found at runtime.
 */
Jnctn.Locator = (function () {
  var locate = function (locator, json) {
    return Jnctn.locate(locator, json);
  };

  return function (locator) {
    return { isLocator: true,
             locate: locate.bind(null, locator) };
  };
}());
/** @namespace
  A lookup table of locators that help find the object
  to use to find the object that should be delivered to
  the consumer of Jnctn.

  The locators hash is designed to the name of the action
  and the absolute `.` delimited path to the object that
  should be pulled out of the response.

  If the locator is a function, then the function will be
  called with a single argument, which is the JSON returned
  by the API request. The locator is then responsible for
  returning whatever is meaningful back to the API object
  for it to be passed back to the user.
 */
Jnctn.RESPONSE_LOCATORS = {
  SessionCreate: "Response.Context.Session",
  UserEditContact: "Response.Result.UserEditContact.User",
  UserAddressVoicemailboxRead: "Response.Result.UserAddressVoicemailboxRead.Voicemailbox",
  UserAddressVoicemailboxEdit: "Response.Result.UserAddressVoicemailboxEdit.Voicemailbox",
  TermsAndConditionsRead: "Response.Result.TermsAndConditionsRead.TermsAndConditions.Services.Service"
};
/** @namespace
  The locatable mixin should be used in conjunction
  with {@link Jnctn.Locator} function to provide a
  shortcut method for defining results that need to
  be resolved at `mixin` time.
 */
Jnctn.Locatable = {

  /**
    Transforms all locators into their respected
    values.
    @private
   */
  init: Espresso.refine(function (original) {
    var key, value;
    for (key in this) {
      value = this[key];
      if (value && value.isLocator) {
        this[key] = value.locate(this);
      }
    }
    original();
  })

};
/** @class
  Provides a easy way to get the response for an object.

  Simply extending `Jnctn.Response` with the JSON result will
  result in all of the response's fields being filled in, as
  well as a contextual result.

      var response = Jnctn.Response.extend(echo_json);
      response.result; // <= the actual result.

  Note that browse responses have an `@attributes` hash that
  holds metadata information on it. The `@attributes` hash will
  be mixed into the results Array so you can access them by using
  `.` notation on the result.

  @extends Jnctn.Base
  @extends Jnctn.Locatable
 */
Jnctn.Response = Jnctn.Base.extend(Jnctn.Locatable,
  /** @lends Jnctn.Response# */{

  /**
    The result that should be returned to the user.
    @type Object
   */
  result: null,

  /** @function
    @private
    @desc

    Finds the result (after all of the locators have
    been resolved, since they are resolved in any order).

    @param {Function} original The original function being wrapped.
   */
  init: Espresso.refine(function (original) {
    original();

    var result;
    if (this.isValid && this.isCompleted) {
      if (Jnctn.RESPONSE_LOCATORS[this.action]) {
        result = Jnctn.locate(Jnctn.RESPONSE_LOCATORS[this.action], this);
      } else {
        var singularName, pluralizedName, attrs = {},
            response = Jnctn.locate("Response.Result", this);
        if (!this.action) {
          throw new Jnctn.Error("Expected response to have the 'Action' in the 'Parameters'");
        }
        singularName = Jnctn.String.camelize(Jnctn.String.dasherize(this.action).split('-').slice(0, -1).join('-'));
        pluralizedName = Jnctn.String.pluralize(singularName);

        // Look for the action name in the result.
        response = response && response.hasOwnProperty(this.action) ?
          response[this.action] : response;

        // Look for the pluralized name. (RecordingBrowse => Recordings)
        response = response && response.hasOwnProperty(pluralizedName) ?
          response[pluralizedName] : response;

        // Save browse results stats
        if (response.hasOwnProperty("@attributes")) {
          attrs = response["@attributes"];
        }

        // Look for the singular name. (RecordingBrowse => Recording)
        result = response;
        if (result) {
          // If we had no results on a browse, turn the result into an empty array.
          result = result.hasOwnProperty(singularName) ? result[singularName] :
                   attrs.Found === "0" ? [] : result;
        }

        mix(attrs).into(result);
      }
    } else if (!this.isValid) {
      result = Jnctn.locate("Response.Context.Request.Errors.Error", this);
    } else {
      result = Jnctn.locate("Response.Context.Action.Errors.Error", this);
    }

    this.result = this.lint(result);
  }),

  lint: function (o) {
    var i, len, k;
    if (Array.isArray(o)) {
      for (i = 0, len = o.length; i < len; i++) {
        o[i] = this.lint(o[i]);
      }
    } else if (typeof o === "object") {
      // Known "bug" in WebServices API:
      // `null` results are returned as empty Objects ({})
      if (Object.keys(o).length === 0) {
        return null;
      }

      for (k in o) {
        if (o.hasOwnProperty(k)) {
          o[k] = this.lint(o[k]);
        }
      }
    }
    return o;
  },

  /**
    The action that was taken.
    @field
    @type String
   */
  action: Jnctn.Locator(function (json) {
    var params = Jnctn.locate("Response.Context.Request.Parameters.Parameter", json) || [],
        action;
    for (var i = 0, len = params.length; i < len; i++) {
      if (params[i].Name === "Action") {
        action = params[i].Value;
        break;
      }
    }

    return action;
  }),

  /**
    Whether or not the request was completed.
    @field
    @type Boolean
   */
  isCompleted: Jnctn.Locator(function (json) {
    return Jnctn.locate("Response.Context.Action.IsCompleted", json) === "true";
  }),

  /**
    Whether or not the request was valid.
    @field
    @type Boolean
   */
  isValid: Jnctn.Locator(function (json) {
    return Jnctn.locate("Response.Context.Request.IsValid", json) === "true";
  })

});
