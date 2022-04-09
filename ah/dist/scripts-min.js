/** @license React v16.14.0
 * react-dom-test-utils.development.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('react'), require('react-dom')) :
  typeof define === 'function' && define.amd ? define(['react', 'react-dom'], factory) :
  (global = global || self, global.ReactTestUtils = factory(global.React, global.ReactDOM));
}(this, (function (React, ReactDOM) { 'use strict';

  var ReactInternals = React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;
  var _assign = ReactInternals.assign;

  var ReactSharedInternals = React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED; // Prevent newer renderers from RTE when used with older react package versions.
  // Current owner and dispatcher used to share the same ref,
  // but PR #14548 split them out to better support the react-debug-tools package.

  if (!ReactSharedInternals.hasOwnProperty('ReactCurrentDispatcher')) {
    ReactSharedInternals.ReactCurrentDispatcher = {
      current: null
    };
  }

  if (!ReactSharedInternals.hasOwnProperty('ReactCurrentBatchConfig')) {
    ReactSharedInternals.ReactCurrentBatchConfig = {
      suspense: null
    };
  }

  // by calls to these methods by a Babel plugin.
  //
  // In PROD (or in packages without access to React internals),
  // they are left as they are instead.

  function warn(format) {
    {
      for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        args[_key - 1] = arguments[_key];
      }

      printWarning('warn', format, args);
    }
  }
  function error(format) {
    {
      for (var _len2 = arguments.length, args = new Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
        args[_key2 - 1] = arguments[_key2];
      }

      printWarning('error', format, args);
    }
  }

  function printWarning(level, format, args) {
    // When changing this logic, you might want to also
    // update consoleWithStackDev.www.js as well.
    {
      var hasExistingStack = args.length > 0 && typeof args[args.length - 1] === 'string' && args[args.length - 1].indexOf('\n    in') === 0;

      if (!hasExistingStack) {
        var ReactDebugCurrentFrame = ReactSharedInternals.ReactDebugCurrentFrame;
        var stack = ReactDebugCurrentFrame.getStackAddendum();

        if (stack !== '') {
          format += '%s';
          args = args.concat([stack]);
        }
      }

      var argsWithFormat = args.map(function (item) {
        return '' + item;
      }); // Careful: RN currently depends on this prefix

      argsWithFormat.unshift('Warning: ' + format); // We intentionally don't use spread (or .apply) directly because it
      // breaks IE9: https://github.com/facebook/react/issues/13610
      // eslint-disable-next-line react-internal/no-production-logging

      Function.prototype.apply.call(console[level], console, argsWithFormat);

      try {
        // --- Welcome to debugging React ---
        // This error was thrown as a convenience so that you can use this stack
        // to find the callsite that caused this warning to fire.
        var argIndex = 0;
        var message = 'Warning: ' + format.replace(/%s/g, function () {
          return args[argIndex++];
        });
        throw new Error(message);
      } catch (x) {}
    }
  }

  /**
   * `ReactInstanceMap` maintains a mapping from a public facing stateful
   * instance (key) and the internal representation (value). This allows public
   * methods to accept the user facing instance as an argument and map them back
   * to internal methods.
   *
   * Note that this module is currently shared and assumed to be stateless.
   * If this becomes an actual Map, that will break.
   */
  function get(key) {
    return key._reactInternalFiber;
  }

  var FunctionComponent = 0;
  var ClassComponent = 1;

  var HostRoot = 3; // Root of a host tree. Could be nested inside another node.

  var HostComponent = 5;
  var HostText = 6;

  // Don't change these two values. They're used by React Dev Tools.
  var NoEffect =
  /*              */
  0;

  var Placement =
  /*             */
  2;
  var Hydrating =
  /*             */
  1024;

  var ReactCurrentOwner = ReactSharedInternals.ReactCurrentOwner;
  function getNearestMountedFiber(fiber) {
    var node = fiber;
    var nearestMounted = fiber;

    if (!fiber.alternate) {
      // If there is no alternate, this might be a new tree that isn't inserted
      // yet. If it is, then it will have a pending insertion effect on it.
      var nextNode = node;

      do {
        node = nextNode;

        if ((node.effectTag & (Placement | Hydrating)) !== NoEffect) {
          // This is an insertion or in-progress hydration. The nearest possible
          // mounted fiber is the parent but we need to continue to figure out
          // if that one is still mounted.
          nearestMounted = node.return;
        }

        nextNode = node.return;
      } while (nextNode);
    } else {
      while (node.return) {
        node = node.return;
      }
    }

    if (node.tag === HostRoot) {
      // TODO: Check if this was a nested HostRoot when used with
      // renderContainerIntoSubtree.
      return nearestMounted;
    } // If we didn't hit the root, that means that we're in an disconnected tree
    // that has been unmounted.


    return null;
  }

  function assertIsMounted(fiber) {
    if (!(getNearestMountedFiber(fiber) === fiber)) {
      {
        throw Error( "Unable to find node on an unmounted component." );
      }
    }
  }

  function findCurrentFiberUsingSlowPath(fiber) {
    var alternate = fiber.alternate;

    if (!alternate) {
      // If there is no alternate, then we only need to check if it is mounted.
      var nearestMounted = getNearestMountedFiber(fiber);

      if (!(nearestMounted !== null)) {
        {
          throw Error( "Unable to find node on an unmounted component." );
        }
      }

      if (nearestMounted !== fiber) {
        return null;
      }

      return fiber;
    } // If we have two possible branches, we'll walk backwards up to the root
    // to see what path the root points to. On the way we may hit one of the
    // special cases and we'll deal with them.


    var a = fiber;
    var b = alternate;

    while (true) {
      var parentA = a.return;

      if (parentA === null) {
        // We're at the root.
        break;
      }

      var parentB = parentA.alternate;

      if (parentB === null) {
        // There is no alternate. This is an unusual case. Currently, it only
        // happens when a Suspense component is hidden. An extra fragment fiber
        // is inserted in between the Suspense fiber and its children. Skip
        // over this extra fragment fiber and proceed to the next parent.
        var nextParent = parentA.return;

        if (nextParent !== null) {
          a = b = nextParent;
          continue;
        } // If there's no parent, we're at the root.


        break;
      } // If both copies of the parent fiber point to the same child, we can
      // assume that the child is current. This happens when we bailout on low
      // priority: the bailed out fiber's child reuses the current child.


      if (parentA.child === parentB.child) {
        var child = parentA.child;

        while (child) {
          if (child === a) {
            // We've determined that A is the current branch.
            assertIsMounted(parentA);
            return fiber;
          }

          if (child === b) {
            // We've determined that B is the current branch.
            assertIsMounted(parentA);
            return alternate;
          }

          child = child.sibling;
        } // We should never have an alternate for any mounting node. So the only
        // way this could possibly happen is if this was unmounted, if at all.


        {
          {
            throw Error( "Unable to find node on an unmounted component." );
          }
        }
      }

      if (a.return !== b.return) {
        // The return pointer of A and the return pointer of B point to different
        // fibers. We assume that return pointers never criss-cross, so A must
        // belong to the child set of A.return, and B must belong to the child
        // set of B.return.
        a = parentA;
        b = parentB;
      } else {
        // The return pointers point to the same fiber. We'll have to use the
        // default, slow path: scan the child sets of each parent alternate to see
        // which child belongs to which set.
        //
        // Search parent A's child set
        var didFindChild = false;
        var _child = parentA.child;

        while (_child) {
          if (_child === a) {
            didFindChild = true;
            a = parentA;
            b = parentB;
            break;
          }

          if (_child === b) {
            didFindChild = true;
            b = parentA;
            a = parentB;
            break;
          }

          _child = _child.sibling;
        }

        if (!didFindChild) {
          // Search parent B's child set
          _child = parentB.child;

          while (_child) {
            if (_child === a) {
              didFindChild = true;
              a = parentB;
              b = parentA;
              break;
            }

            if (_child === b) {
              didFindChild = true;
              b = parentB;
              a = parentA;
              break;
            }

            _child = _child.sibling;
          }

          if (!didFindChild) {
            {
              throw Error( "Child was not found in either parent set. This indicates a bug in React related to the return pointer. Please file an issue." );
            }
          }
        }
      }

      if (!(a.alternate === b)) {
        {
          throw Error( "Return fibers should always be each others' alternates. This error is likely caused by a bug in React. Please file an issue." );
        }
      }
    } // If the root is not a host container, we're in a disconnected tree. I.e.
    // unmounted.


    if (!(a.tag === HostRoot)) {
      {
        throw Error( "Unable to find node on an unmounted component." );
      }
    }

    if (a.stateNode.current === a) {
      // We've determined that A is the current branch.
      return fiber;
    } // Otherwise B has to be current branch.


    return alternate;
  }

  var EVENT_POOL_SIZE = 10;
  /**
   * @interface Event
   * @see http://www.w3.org/TR/DOM-Level-3-Events/
   */

  var EventInterface = {
    type: null,
    target: null,
    // currentTarget is set when dispatching; no use in copying it here
    currentTarget: function () {
      return null;
    },
    eventPhase: null,
    bubbles: null,
    cancelable: null,
    timeStamp: function (event) {
      return event.timeStamp || Date.now();
    },
    defaultPrevented: null,
    isTrusted: null
  };

  function functionThatReturnsTrue() {
    return true;
  }

  function functionThatReturnsFalse() {
    return false;
  }
  /**
   * Synthetic events are dispatched by event plugins, typically in response to a
   * top-level event delegation handler.
   *
   * These systems should generally use pooling to reduce the frequency of garbage
   * collection. The system should check `isPersistent` to determine whether the
   * event should be released into the pool after being dispatched. Users that
   * need a persisted event should invoke `persist`.
   *
   * Synthetic events (and subclasses) implement the DOM Level 3 Events API by
   * normalizing browser quirks. Subclasses do not necessarily have to implement a
   * DOM interface; custom application-specific events can also subclass this.
   *
   * @param {object} dispatchConfig Configuration used to dispatch this event.
   * @param {*} targetInst Marker identifying the event target.
   * @param {object} nativeEvent Native browser event.
   * @param {DOMEventTarget} nativeEventTarget Target node.
   */


  function SyntheticEvent(dispatchConfig, targetInst, nativeEvent, nativeEventTarget) {
    {
      // these have a getter/setter for warnings
      delete this.nativeEvent;
      delete this.preventDefault;
      delete this.stopPropagation;
      delete this.isDefaultPrevented;
      delete this.isPropagationStopped;
    }

    this.dispatchConfig = dispatchConfig;
    this._targetInst = targetInst;
    this.nativeEvent = nativeEvent;
    var Interface = this.constructor.Interface;

    for (var propName in Interface) {
      if (!Interface.hasOwnProperty(propName)) {
        continue;
      }

      {
        delete this[propName]; // this has a getter/setter for warnings
      }

      var normalize = Interface[propName];

      if (normalize) {
        this[propName] = normalize(nativeEvent);
      } else {
        if (propName === 'target') {
          this.target = nativeEventTarget;
        } else {
          this[propName] = nativeEvent[propName];
        }
      }
    }

    var defaultPrevented = nativeEvent.defaultPrevented != null ? nativeEvent.defaultPrevented : nativeEvent.returnValue === false;

    if (defaultPrevented) {
      this.isDefaultPrevented = functionThatReturnsTrue;
    } else {
      this.isDefaultPrevented = functionThatReturnsFalse;
    }

    this.isPropagationStopped = functionThatReturnsFalse;
    return this;
  }

  _assign(SyntheticEvent.prototype, {
    preventDefault: function () {
      this.defaultPrevented = true;
      var event = this.nativeEvent;

      if (!event) {
        return;
      }

      if (event.preventDefault) {
        event.preventDefault();
      } else if (typeof event.returnValue !== 'unknown') {
        event.returnValue = false;
      }

      this.isDefaultPrevented = functionThatReturnsTrue;
    },
    stopPropagation: function () {
      var event = this.nativeEvent;

      if (!event) {
        return;
      }

      if (event.stopPropagation) {
        event.stopPropagation();
      } else if (typeof event.cancelBubble !== 'unknown') {
        // The ChangeEventPlugin registers a "propertychange" event for
        // IE. This event does not support bubbling or cancelling, and
        // any references to cancelBubble throw "Member not found".  A
        // typeof check of "unknown" circumvents this issue (and is also
        // IE specific).
        event.cancelBubble = true;
      }

      this.isPropagationStopped = functionThatReturnsTrue;
    },

    /**
     * We release all dispatched `SyntheticEvent`s after each event loop, adding
     * them back into the pool. This allows a way to hold onto a reference that
     * won't be added back into the pool.
     */
    persist: function () {
      this.isPersistent = functionThatReturnsTrue;
    },

    /**
     * Checks if this event should be released back into the pool.
     *
     * @return {boolean} True if this should not be released, false otherwise.
     */
    isPersistent: functionThatReturnsFalse,

    /**
     * `PooledClass` looks for `destructor` on each instance it releases.
     */
    destructor: function () {
      var Interface = this.constructor.Interface;

      for (var propName in Interface) {
        {
          Object.defineProperty(this, propName, getPooledWarningPropertyDefinition(propName, Interface[propName]));
        }
      }

      this.dispatchConfig = null;
      this._targetInst = null;
      this.nativeEvent = null;
      this.isDefaultPrevented = functionThatReturnsFalse;
      this.isPropagationStopped = functionThatReturnsFalse;
      this._dispatchListeners = null;
      this._dispatchInstances = null;

      {
        Object.defineProperty(this, 'nativeEvent', getPooledWarningPropertyDefinition('nativeEvent', null));
        Object.defineProperty(this, 'isDefaultPrevented', getPooledWarningPropertyDefinition('isDefaultPrevented', functionThatReturnsFalse));
        Object.defineProperty(this, 'isPropagationStopped', getPooledWarningPropertyDefinition('isPropagationStopped', functionThatReturnsFalse));
        Object.defineProperty(this, 'preventDefault', getPooledWarningPropertyDefinition('preventDefault', function () {}));
        Object.defineProperty(this, 'stopPropagation', getPooledWarningPropertyDefinition('stopPropagation', function () {}));
      }
    }
  });

  SyntheticEvent.Interface = EventInterface;
  /**
   * Helper to reduce boilerplate when creating subclasses.
   */

  SyntheticEvent.extend = function (Interface) {
    var Super = this;

    var E = function () {};

    E.prototype = Super.prototype;
    var prototype = new E();

    function Class() {
      return Super.apply(this, arguments);
    }

    _assign(prototype, Class.prototype);

    Class.prototype = prototype;
    Class.prototype.constructor = Class;
    Class.Interface = _assign({}, Super.Interface, Interface);
    Class.extend = Super.extend;
    addEventPoolingTo(Class);
    return Class;
  };

  addEventPoolingTo(SyntheticEvent);
  /**
   * Helper to nullify syntheticEvent instance properties when destructing
   *
   * @param {String} propName
   * @param {?object} getVal
   * @return {object} defineProperty object
   */

  function getPooledWarningPropertyDefinition(propName, getVal) {
    var isFunction = typeof getVal === 'function';
    return {
      configurable: true,
      set: set,
      get: get
    };

    function set(val) {
      var action = isFunction ? 'setting the method' : 'setting the property';
      warn(action, 'This is effectively a no-op');
      return val;
    }

    function get() {
      var action = isFunction ? 'accessing the method' : 'accessing the property';
      var result = isFunction ? 'This is a no-op function' : 'This is set to null';
      warn(action, result);
      return getVal;
    }

    function warn(action, result) {
      {
        error("This synthetic event is reused for performance reasons. If you're seeing this, " + "you're %s `%s` on a released/nullified synthetic event. %s. " + 'If you must keep the original synthetic event around, use event.persist(). ' + 'See https://fb.me/react-event-pooling for more information.', action, propName, result);
      }
    }
  }

  function getPooledEvent(dispatchConfig, targetInst, nativeEvent, nativeInst) {
    var EventConstructor = this;

    if (EventConstructor.eventPool.length) {
      var instance = EventConstructor.eventPool.pop();
      EventConstructor.call(instance, dispatchConfig, targetInst, nativeEvent, nativeInst);
      return instance;
    }

    return new EventConstructor(dispatchConfig, targetInst, nativeEvent, nativeInst);
  }

  function releasePooledEvent(event) {
    var EventConstructor = this;

    if (!(event instanceof EventConstructor)) {
      {
        throw Error( "Trying to release an event instance into a pool of a different type." );
      }
    }

    event.destructor();

    if (EventConstructor.eventPool.length < EVENT_POOL_SIZE) {
      EventConstructor.eventPool.push(event);
    }
  }

  function addEventPoolingTo(EventConstructor) {
    EventConstructor.eventPool = [];
    EventConstructor.getPooled = getPooledEvent;
    EventConstructor.release = releasePooledEvent;
  }

  /**
   * HTML nodeType values that represent the type of the node
   */
  var ELEMENT_NODE = 1;

  // Do not use the below two methods directly!
  // Instead use constants exported from DOMTopLevelEventTypes in ReactDOM.
  // (It is the only module that is allowed to access these methods.)
  function unsafeCastStringToDOMTopLevelType(topLevelType) {
    return topLevelType;
  }

  var canUseDOM = !!(typeof window !== 'undefined' && typeof window.document !== 'undefined' && typeof window.document.createElement !== 'undefined');

  /**
   * Generate a mapping of standard vendor prefixes using the defined style property and event name.
   *
   * @param {string} styleProp
   * @param {string} eventName
   * @returns {object}
   */

  function makePrefixMap(styleProp, eventName) {
    var prefixes = {};
    prefixes[styleProp.toLowerCase()] = eventName.toLowerCase();
    prefixes['Webkit' + styleProp] = 'webkit' + eventName;
    prefixes['Moz' + styleProp] = 'moz' + eventName;
    return prefixes;
  }
  /**
   * A list of event names to a configurable list of vendor prefixes.
   */


  var vendorPrefixes = {
    animationend: makePrefixMap('Animation', 'AnimationEnd'),
    animationiteration: makePrefixMap('Animation', 'AnimationIteration'),
    animationstart: makePrefixMap('Animation', 'AnimationStart'),
    transitionend: makePrefixMap('Transition', 'TransitionEnd')
  };
  /**
   * Event names that have already been detected and prefixed (if applicable).
   */

  var prefixedEventNames = {};
  /**
   * Element to check for prefixes on.
   */

  var style = {};
  /**
   * Bootstrap if a DOM exists.
   */

  if (canUseDOM) {
    style = document.createElement('div').style; // On some platforms, in particular some releases of Android 4.x,
    // the un-prefixed "animation" and "transition" properties are defined on the
    // style object but the events that fire will still be prefixed, so we need
    // to check if the un-prefixed events are usable, and if not remove them from the map.

    if (!('AnimationEvent' in window)) {
      delete vendorPrefixes.animationend.animation;
      delete vendorPrefixes.animationiteration.animation;
      delete vendorPrefixes.animationstart.animation;
    } // Same as above


    if (!('TransitionEvent' in window)) {
      delete vendorPrefixes.transitionend.transition;
    }
  }
  /**
   * Attempts to determine the correct vendor prefixed event name.
   *
   * @param {string} eventName
   * @returns {string}
   */


  function getVendorPrefixedEventName(eventName) {
    if (prefixedEventNames[eventName]) {
      return prefixedEventNames[eventName];
    } else if (!vendorPrefixes[eventName]) {
      return eventName;
    }

    var prefixMap = vendorPrefixes[eventName];

    for (var styleProp in prefixMap) {
      if (prefixMap.hasOwnProperty(styleProp) && styleProp in style) {
        return prefixedEventNames[eventName] = prefixMap[styleProp];
      }
    }

    return eventName;
  }

  /**
   * To identify top level events in ReactDOM, we use constants defined by this
   * module. This is the only module that uses the unsafe* methods to express
   * that the constants actually correspond to the browser event names. This lets
   * us save some bundle size by avoiding a top level type -> event name map.
   * The rest of ReactDOM code should import top level types from this file.
   */

  var TOP_ABORT = unsafeCastStringToDOMTopLevelType('abort');
  var TOP_ANIMATION_END = unsafeCastStringToDOMTopLevelType(getVendorPrefixedEventName('animationend'));
  var TOP_ANIMATION_ITERATION = unsafeCastStringToDOMTopLevelType(getVendorPrefixedEventName('animationiteration'));
  var TOP_ANIMATION_START = unsafeCastStringToDOMTopLevelType(getVendorPrefixedEventName('animationstart'));
  var TOP_BLUR = unsafeCastStringToDOMTopLevelType('blur');
  var TOP_CAN_PLAY = unsafeCastStringToDOMTopLevelType('canplay');
  var TOP_CAN_PLAY_THROUGH = unsafeCastStringToDOMTopLevelType('canplaythrough');
  var TOP_CANCEL = unsafeCastStringToDOMTopLevelType('cancel');
  var TOP_CHANGE = unsafeCastStringToDOMTopLevelType('change');
  var TOP_CLICK = unsafeCastStringToDOMTopLevelType('click');
  var TOP_CLOSE = unsafeCastStringToDOMTopLevelType('close');
  var TOP_COMPOSITION_END = unsafeCastStringToDOMTopLevelType('compositionend');
  var TOP_COMPOSITION_START = unsafeCastStringToDOMTopLevelType('compositionstart');
  var TOP_COMPOSITION_UPDATE = unsafeCastStringToDOMTopLevelType('compositionupdate');
  var TOP_CONTEXT_MENU = unsafeCastStringToDOMTopLevelType('contextmenu');
  var TOP_COPY = unsafeCastStringToDOMTopLevelType('copy');
  var TOP_CUT = unsafeCastStringToDOMTopLevelType('cut');
  var TOP_DOUBLE_CLICK = unsafeCastStringToDOMTopLevelType('dblclick');
  var TOP_DRAG = unsafeCastStringToDOMTopLevelType('drag');
  var TOP_DRAG_END = unsafeCastStringToDOMTopLevelType('dragend');
  var TOP_DRAG_ENTER = unsafeCastStringToDOMTopLevelType('dragenter');
  var TOP_DRAG_EXIT = unsafeCastStringToDOMTopLevelType('dragexit');
  var TOP_DRAG_LEAVE = unsafeCastStringToDOMTopLevelType('dragleave');
  var TOP_DRAG_OVER = unsafeCastStringToDOMTopLevelType('dragover');
  var TOP_DRAG_START = unsafeCastStringToDOMTopLevelType('dragstart');
  var TOP_DROP = unsafeCastStringToDOMTopLevelType('drop');
  var TOP_DURATION_CHANGE = unsafeCastStringToDOMTopLevelType('durationchange');
  var TOP_EMPTIED = unsafeCastStringToDOMTopLevelType('emptied');
  var TOP_ENCRYPTED = unsafeCastStringToDOMTopLevelType('encrypted');
  var TOP_ENDED = unsafeCastStringToDOMTopLevelType('ended');
  var TOP_ERROR = unsafeCastStringToDOMTopLevelType('error');
  var TOP_FOCUS = unsafeCastStringToDOMTopLevelType('focus');
  var TOP_INPUT = unsafeCastStringToDOMTopLevelType('input');
  var TOP_KEY_DOWN = unsafeCastStringToDOMTopLevelType('keydown');
  var TOP_KEY_PRESS = unsafeCastStringToDOMTopLevelType('keypress');
  var TOP_KEY_UP = unsafeCastStringToDOMTopLevelType('keyup');
  var TOP_LOAD = unsafeCastStringToDOMTopLevelType('load');
  var TOP_LOAD_START = unsafeCastStringToDOMTopLevelType('loadstart');
  var TOP_LOADED_DATA = unsafeCastStringToDOMTopLevelType('loadeddata');
  var TOP_LOADED_METADATA = unsafeCastStringToDOMTopLevelType('loadedmetadata');
  var TOP_MOUSE_DOWN = unsafeCastStringToDOMTopLevelType('mousedown');
  var TOP_MOUSE_MOVE = unsafeCastStringToDOMTopLevelType('mousemove');
  var TOP_MOUSE_OUT = unsafeCastStringToDOMTopLevelType('mouseout');
  var TOP_MOUSE_OVER = unsafeCastStringToDOMTopLevelType('mouseover');
  var TOP_MOUSE_UP = unsafeCastStringToDOMTopLevelType('mouseup');
  var TOP_PASTE = unsafeCastStringToDOMTopLevelType('paste');
  var TOP_PAUSE = unsafeCastStringToDOMTopLevelType('pause');
  var TOP_PLAY = unsafeCastStringToDOMTopLevelType('play');
  var TOP_PLAYING = unsafeCastStringToDOMTopLevelType('playing');
  var TOP_PROGRESS = unsafeCastStringToDOMTopLevelType('progress');
  var TOP_RATE_CHANGE = unsafeCastStringToDOMTopLevelType('ratechange');
  var TOP_SCROLL = unsafeCastStringToDOMTopLevelType('scroll');
  var TOP_SEEKED = unsafeCastStringToDOMTopLevelType('seeked');
  var TOP_SEEKING = unsafeCastStringToDOMTopLevelType('seeking');
  var TOP_SELECTION_CHANGE = unsafeCastStringToDOMTopLevelType('selectionchange');
  var TOP_STALLED = unsafeCastStringToDOMTopLevelType('stalled');
  var TOP_SUSPEND = unsafeCastStringToDOMTopLevelType('suspend');
  var TOP_TEXT_INPUT = unsafeCastStringToDOMTopLevelType('textInput');
  var TOP_TIME_UPDATE = unsafeCastStringToDOMTopLevelType('timeupdate');
  var TOP_TOGGLE = unsafeCastStringToDOMTopLevelType('toggle');
  var TOP_TOUCH_CANCEL = unsafeCastStringToDOMTopLevelType('touchcancel');
  var TOP_TOUCH_END = unsafeCastStringToDOMTopLevelType('touchend');
  var TOP_TOUCH_MOVE = unsafeCastStringToDOMTopLevelType('touchmove');
  var TOP_TOUCH_START = unsafeCastStringToDOMTopLevelType('touchstart');
  var TOP_TRANSITION_END = unsafeCastStringToDOMTopLevelType(getVendorPrefixedEventName('transitionend'));
  var TOP_VOLUME_CHANGE = unsafeCastStringToDOMTopLevelType('volumechange');
  var TOP_WAITING = unsafeCastStringToDOMTopLevelType('waiting');
  var TOP_WHEEL = unsafeCastStringToDOMTopLevelType('wheel'); // List of events that need to be individually attached to media elements.

  var PLUGIN_EVENT_SYSTEM = 1;

  var didWarnAboutMessageChannel = false;
  var enqueueTaskImpl = null;
  function enqueueTask(task) {
    if (enqueueTaskImpl === null) {
      try {
        // read require off the module object to get around the bundlers.
        // we don't want them to detect a require and bundle a Node polyfill.
        var requireString = ('require' + Math.random()).slice(0, 7);
        var nodeRequire = module && module[requireString]; // assuming we're in node, let's try to get node's
        // version of setImmediate, bypassing fake timers if any.

        enqueueTaskImpl = nodeRequire('timers').setImmediate;
      } catch (_err) {
        // we're in a browser
        // we can't use regular timers because they may still be faked
        // so we try MessageChannel+postMessage instead
        enqueueTaskImpl = function (callback) {
          {
            if (didWarnAboutMessageChannel === false) {
              didWarnAboutMessageChannel = true;

              if (typeof MessageChannel === 'undefined') {
                error('This browser does not have a MessageChannel implementation, ' + 'so enqueuing tasks via await act(async () => ...) will fail. ' + 'Please file an issue at https://github.com/facebook/react/issues ' + 'if you encounter this warning.');
              }
            }
          }

          var channel = new MessageChannel();
          channel.port1.onmessage = callback;
          channel.port2.postMessage(undefined);
        };
      }
    }

    return enqueueTaskImpl(task);
  }

  var ReactInternals$1 = React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;
  var _ReactInternals$Sched = ReactInternals$1.Scheduler,
      unstable_cancelCallback = _ReactInternals$Sched.unstable_cancelCallback,
      unstable_now = _ReactInternals$Sched.unstable_now,
      unstable_scheduleCallback = _ReactInternals$Sched.unstable_scheduleCallback,
      unstable_shouldYield = _ReactInternals$Sched.unstable_shouldYield,
      unstable_requestPaint = _ReactInternals$Sched.unstable_requestPaint,
      unstable_getFirstCallbackNode = _ReactInternals$Sched.unstable_getFirstCallbackNode,
      unstable_runWithPriority = _ReactInternals$Sched.unstable_runWithPriority,
      unstable_next = _ReactInternals$Sched.unstable_next,
      unstable_continueExecution = _ReactInternals$Sched.unstable_continueExecution,
      unstable_pauseExecution = _ReactInternals$Sched.unstable_pauseExecution,
      unstable_getCurrentPriorityLevel = _ReactInternals$Sched.unstable_getCurrentPriorityLevel,
      unstable_ImmediatePriority = _ReactInternals$Sched.unstable_ImmediatePriority,
      unstable_UserBlockingPriority = _ReactInternals$Sched.unstable_UserBlockingPriority,
      unstable_NormalPriority = _ReactInternals$Sched.unstable_NormalPriority,
      unstable_LowPriority = _ReactInternals$Sched.unstable_LowPriority,
      unstable_IdlePriority = _ReactInternals$Sched.unstable_IdlePriority,
      unstable_forceFrameRate = _ReactInternals$Sched.unstable_forceFrameRate,
      unstable_flushAllWithoutAsserting = _ReactInternals$Sched.unstable_flushAllWithoutAsserting;

  // ReactDOM.js, and ReactTestUtils.js:

  var _ReactDOM$__SECRET_IN = ReactDOM.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.Events,

  /* eslint-disable no-unused-vars */
  getInstanceFromNode = _ReactDOM$__SECRET_IN[0],
      getNodeFromInstance = _ReactDOM$__SECRET_IN[1],
      getFiberCurrentPropsFromNode = _ReactDOM$__SECRET_IN[2],
      injectEventPluginsByName = _ReactDOM$__SECRET_IN[3],
      eventNameDispatchConfigs = _ReactDOM$__SECRET_IN[4],
      accumulateTwoPhaseDispatches = _ReactDOM$__SECRET_IN[5],
      accumulateDirectDispatches = _ReactDOM$__SECRET_IN[6],
      enqueueStateRestore = _ReactDOM$__SECRET_IN[7],
      restoreStateIfNeeded = _ReactDOM$__SECRET_IN[8],
      dispatchEvent = _ReactDOM$__SECRET_IN[9],
      runEventsInBatch = _ReactDOM$__SECRET_IN[10],

  /* eslint-enable no-unused-vars */
  flushPassiveEffects = _ReactDOM$__SECRET_IN[11],
      IsThisRendererActing = _ReactDOM$__SECRET_IN[12];
  var batchedUpdates = ReactDOM.unstable_batchedUpdates;
  var IsSomeRendererActing = ReactSharedInternals.IsSomeRendererActing; // this implementation should be exactly the same in
  // ReactTestUtilsAct.js, ReactTestRendererAct.js, createReactNoop.js

  var isSchedulerMocked = typeof unstable_flushAllWithoutAsserting === 'function';

  var flushWork = unstable_flushAllWithoutAsserting || function () {
    var didFlushWork = false;

    while (flushPassiveEffects()) {
      didFlushWork = true;
    }

    return didFlushWork;
  };

  function flushWorkAndMicroTasks(onDone) {
    try {
      flushWork();
      enqueueTask(function () {
        if (flushWork()) {
          flushWorkAndMicroTasks(onDone);
        } else {
          onDone();
        }
      });
    } catch (err) {
      onDone(err);
    }
  } // we track the 'depth' of the act() calls with this counter,
  // so we can tell if any async act() calls try to run in parallel.


  var actingUpdatesScopeDepth = 0;

  function act(callback) {

    var previousActingUpdatesScopeDepth = actingUpdatesScopeDepth;
    var previousIsSomeRendererActing;
    var previousIsThisRendererActing;
    actingUpdatesScopeDepth++;
    previousIsSomeRendererActing = IsSomeRendererActing.current;
    previousIsThisRendererActing = IsThisRendererActing.current;
    IsSomeRendererActing.current = true;
    IsThisRendererActing.current = true;

    function onDone() {
      actingUpdatesScopeDepth--;
      IsSomeRendererActing.current = previousIsSomeRendererActing;
      IsThisRendererActing.current = previousIsThisRendererActing;

      {
        if (actingUpdatesScopeDepth > previousActingUpdatesScopeDepth) {
          // if it's _less than_ previousActingUpdatesScopeDepth, then we can assume the 'other' one has warned
          error('You seem to have overlapping act() calls, this is not supported. ' + 'Be sure to await previous act() calls before making a new one. ');
        }
      }
    }

    var result;

    try {
      result = batchedUpdates(callback);
    } catch (error) {
      // on sync errors, we still want to 'cleanup' and decrement actingUpdatesScopeDepth
      onDone();
      throw error;
    }

    if (result !== null && typeof result === 'object' && typeof result.then === 'function') {
      // setup a boolean that gets set to true only
      // once this act() call is await-ed
      var called = false;

      {
        if (typeof Promise !== 'undefined') {
          //eslint-disable-next-line no-undef
          Promise.resolve().then(function () {}).then(function () {
            if (called === false) {
              error('You called act(async () => ...) without await. ' + 'This could lead to unexpected testing behaviour, interleaving multiple act ' + 'calls and mixing their scopes. You should - await act(async () => ...);');
            }
          });
        }
      } // in the async case, the returned thenable runs the callback, flushes
      // effects and  microtasks in a loop until flushPassiveEffects() === false,
      // and cleans up


      return {
        then: function (resolve, reject) {
          called = true;
          result.then(function () {
            if (actingUpdatesScopeDepth > 1 || isSchedulerMocked === true && previousIsSomeRendererActing === true) {
              onDone();
              resolve();
              return;
            } // we're about to exit the act() scope,
            // now's the time to flush tasks/effects


            flushWorkAndMicroTasks(function (err) {
              onDone();

              if (err) {
                reject(err);
              } else {
                resolve();
              }
            });
          }, function (err) {
            onDone();
            reject(err);
          });
        }
      };
    } else {
      {
        if (result !== undefined) {
          error('The callback passed to act(...) function ' + 'must return undefined, or a Promise. You returned %s', result);
        }
      } // flush effects until none remain, and cleanup


      try {
        if (actingUpdatesScopeDepth === 1 && (isSchedulerMocked === false || previousIsSomeRendererActing === false)) {
          // we're about to exit the act() scope,
          // now's the time to flush effects
          flushWork();
        }

        onDone();
      } catch (err) {
        onDone();
        throw err;
      } // in the sync case, the returned thenable only warns *if* await-ed


      return {
        then: function (resolve) {
          {
            error('Do not await the result of calling act(...) with sync logic, it is not a Promise.');
          }

          resolve();
        }
      };
    }
  }

  var findDOMNode = ReactDOM.findDOMNode; // Keep in sync with ReactDOMUnstableNativeDependencies.js
  // ReactDOM.js, and ReactTestUtilsAct.js:

  var _ReactDOM$__SECRET_IN$1 = ReactDOM.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.Events,
      getInstanceFromNode$1 = _ReactDOM$__SECRET_IN$1[0],

  /* eslint-disable no-unused-vars */
  getNodeFromInstance$1 = _ReactDOM$__SECRET_IN$1[1],
      getFiberCurrentPropsFromNode$1 = _ReactDOM$__SECRET_IN$1[2],
      injectEventPluginsByName$1 = _ReactDOM$__SECRET_IN$1[3],

  /* eslint-enable no-unused-vars */
  eventNameDispatchConfigs$1 = _ReactDOM$__SECRET_IN$1[4],
      accumulateTwoPhaseDispatches$1 = _ReactDOM$__SECRET_IN$1[5],
      accumulateDirectDispatches$1 = _ReactDOM$__SECRET_IN$1[6],
      enqueueStateRestore$1 = _ReactDOM$__SECRET_IN$1[7],
      restoreStateIfNeeded$1 = _ReactDOM$__SECRET_IN$1[8],
      dispatchEvent$1 = _ReactDOM$__SECRET_IN$1[9],
      runEventsInBatch$1 = _ReactDOM$__SECRET_IN$1[10],

  /* eslint-disable no-unused-vars */
  flushPassiveEffects$1 = _ReactDOM$__SECRET_IN$1[11],
      IsThisRendererActing$1
  /* eslint-enable no-unused-vars */
  = _ReactDOM$__SECRET_IN$1[12];

  function Event(suffix) {}

  var hasWarnedAboutDeprecatedMockComponent = false;
  /**
   * @class ReactTestUtils
   */

  /**
   * Simulates a top level event being dispatched from a raw event that occurred
   * on an `Element` node.
   * @param {number} topLevelType A number from `TopLevelEventTypes`
   * @param {!Element} node The dom to simulate an event occurring on.
   * @param {?Event} fakeNativeEvent Fake native event to use in SyntheticEvent.
   */

  function simulateNativeEventOnNode(topLevelType, node, fakeNativeEvent) {
    fakeNativeEvent.target = node;
    dispatchEvent$1(topLevelType, PLUGIN_EVENT_SYSTEM, document, fakeNativeEvent);
  }
  /**
   * Simulates a top level event being dispatched from a raw event that occurred
   * on the `ReactDOMComponent` `comp`.
   * @param {Object} topLevelType A type from `BrowserEventConstants.topLevelTypes`.
   * @param {!ReactDOMComponent} comp
   * @param {?Event} fakeNativeEvent Fake native event to use in SyntheticEvent.
   */


  function simulateNativeEventOnDOMComponent(topLevelType, comp, fakeNativeEvent) {
    simulateNativeEventOnNode(topLevelType, findDOMNode(comp), fakeNativeEvent);
  }

  function findAllInRenderedFiberTreeInternal(fiber, test) {
    if (!fiber) {
      return [];
    }

    var currentParent = findCurrentFiberUsingSlowPath(fiber);

    if (!currentParent) {
      return [];
    }

    var node = currentParent;
    var ret = [];

    while (true) {
      if (node.tag === HostComponent || node.tag === HostText || node.tag === ClassComponent || node.tag === FunctionComponent) {
        var publicInst = node.stateNode;

        if (test(publicInst)) {
          ret.push(publicInst);
        }
      }

      if (node.child) {
        node.child.return = node;
        node = node.child;
        continue;
      }

      if (node === currentParent) {
        return ret;
      }

      while (!node.sibling) {
        if (!node.return || node.return === currentParent) {
          return ret;
        }

        node = node.return;
      }

      node.sibling.return = node.return;
      node = node.sibling;
    }
  }

  function validateClassInstance(inst, methodName) {
    if (!inst) {
      // This is probably too relaxed but it's existing behavior.
      return;
    }

    if (get(inst)) {
      // This is a public instance indeed.
      return;
    }

    var received;
    var stringified = '' + inst;

    if (Array.isArray(inst)) {
      received = 'an array';
    } else if (inst && inst.nodeType === ELEMENT_NODE && inst.tagName) {
      received = 'a DOM node';
    } else if (stringified === '[object Object]') {
      received = 'object with keys {' + Object.keys(inst).join(', ') + '}';
    } else {
      received = stringified;
    }

    {
      {
        throw Error( methodName + "(...): the first argument must be a React class instance. Instead received: " + received + "." );
      }
    }
  }
  /**
   * Utilities for making it easy to test React components.
   *
   * See https://reactjs.org/docs/test-utils.html
   *
   * Todo: Support the entire DOM.scry query syntax. For now, these simple
   * utilities will suffice for testing purposes.
   * @lends ReactTestUtils
   */


  var ReactTestUtils = {
    renderIntoDocument: function (element) {
      var div = document.createElement('div'); // None of our tests actually require attaching the container to the
      // DOM, and doing so creates a mess that we rely on test isolation to
      // clean up, so we're going to stop honoring the name of this method
      // (and probably rename it eventually) if no problems arise.
      // document.documentElement.appendChild(div);

      return ReactDOM.render(element, div);
    },
    isElement: function (element) {
      return React.isValidElement(element);
    },
    isElementOfType: function (inst, convenienceConstructor) {
      return React.isValidElement(inst) && inst.type === convenienceConstructor;
    },
    isDOMComponent: function (inst) {
      return !!(inst && inst.nodeType === ELEMENT_NODE && inst.tagName);
    },
    isDOMComponentElement: function (inst) {
      return !!(inst && React.isValidElement(inst) && !!inst.tagName);
    },
    isCompositeComponent: function (inst) {
      if (ReactTestUtils.isDOMComponent(inst)) {
        // Accessing inst.setState warns; just return false as that'll be what
        // this returns when we have DOM nodes as refs directly
        return false;
      }

      return inst != null && typeof inst.render === 'function' && typeof inst.setState === 'function';
    },
    isCompositeComponentWithType: function (inst, type) {
      if (!ReactTestUtils.isCompositeComponent(inst)) {
        return false;
      }

      var internalInstance = get(inst);
      var constructor = internalInstance.type;
      return constructor === type;
    },
    findAllInRenderedTree: function (inst, test) {
      validateClassInstance(inst, 'findAllInRenderedTree');

      if (!inst) {
        return [];
      }

      var internalInstance = get(inst);
      return findAllInRenderedFiberTreeInternal(internalInstance, test);
    },

    /**
     * Finds all instance of components in the rendered tree that are DOM
     * components with the class name matching `className`.
     * @return {array} an array of all the matches.
     */
    scryRenderedDOMComponentsWithClass: function (root, classNames) {
      validateClassInstance(root, 'scryRenderedDOMComponentsWithClass');
      return ReactTestUtils.findAllInRenderedTree(root, function (inst) {
        if (ReactTestUtils.isDOMComponent(inst)) {
          var className = inst.className;

          if (typeof className !== 'string') {
            // SVG, probably.
            className = inst.getAttribute('class') || '';
          }

          var classList = className.split(/\s+/);

          if (!Array.isArray(classNames)) {
            if (!(classNames !== undefined)) {
              {
                throw Error( "TestUtils.scryRenderedDOMComponentsWithClass expects a className as a second argument." );
              }
            }

            classNames = classNames.split(/\s+/);
          }

          return classNames.every(function (name) {
            return classList.indexOf(name) !== -1;
          });
        }

        return false;
      });
    },

    /**
     * Like scryRenderedDOMComponentsWithClass but expects there to be one result,
     * and returns that one result, or throws exception if there is any other
     * number of matches besides one.
     * @return {!ReactDOMComponent} The one match.
     */
    findRenderedDOMComponentWithClass: function (root, className) {
      validateClassInstance(root, 'findRenderedDOMComponentWithClass');
      var all = ReactTestUtils.scryRenderedDOMComponentsWithClass(root, className);

      if (all.length !== 1) {
        throw new Error('Did not find exactly one match (found: ' + all.length + ') ' + 'for class:' + className);
      }

      return all[0];
    },

    /**
     * Finds all instance of components in the rendered tree that are DOM
     * components with the tag name matching `tagName`.
     * @return {array} an array of all the matches.
     */
    scryRenderedDOMComponentsWithTag: function (root, tagName) {
      validateClassInstance(root, 'scryRenderedDOMComponentsWithTag');
      return ReactTestUtils.findAllInRenderedTree(root, function (inst) {
        return ReactTestUtils.isDOMComponent(inst) && inst.tagName.toUpperCase() === tagName.toUpperCase();
      });
    },

    /**
     * Like scryRenderedDOMComponentsWithTag but expects there to be one result,
     * and returns that one result, or throws exception if there is any other
     * number of matches besides one.
     * @return {!ReactDOMComponent} The one match.
     */
    findRenderedDOMComponentWithTag: function (root, tagName) {
      validateClassInstance(root, 'findRenderedDOMComponentWithTag');
      var all = ReactTestUtils.scryRenderedDOMComponentsWithTag(root, tagName);

      if (all.length !== 1) {
        throw new Error('Did not find exactly one match (found: ' + all.length + ') ' + 'for tag:' + tagName);
      }

      return all[0];
    },

    /**
     * Finds all instances of components with type equal to `componentType`.
     * @return {array} an array of all the matches.
     */
    scryRenderedComponentsWithType: function (root, componentType) {
      validateClassInstance(root, 'scryRenderedComponentsWithType');
      return ReactTestUtils.findAllInRenderedTree(root, function (inst) {
        return ReactTestUtils.isCompositeComponentWithType(inst, componentType);
      });
    },

    /**
     * Same as `scryRenderedComponentsWithType` but expects there to be one result
     * and returns that one result, or throws exception if there is any other
     * number of matches besides one.
     * @return {!ReactComponent} The one match.
     */
    findRenderedComponentWithType: function (root, componentType) {
      validateClassInstance(root, 'findRenderedComponentWithType');
      var all = ReactTestUtils.scryRenderedComponentsWithType(root, componentType);

      if (all.length !== 1) {
        throw new Error('Did not find exactly one match (found: ' + all.length + ') ' + 'for componentType:' + componentType);
      }

      return all[0];
    },

    /**
     * Pass a mocked component module to this method to augment it with
     * useful methods that allow it to be used as a dummy React component.
     * Instead of rendering as usual, the component will become a simple
     * <div> containing any provided children.
     *
     * @param {object} module the mock function object exported from a
     *                        module that defines the component to be mocked
     * @param {?string} mockTagName optional dummy root tag name to return
     *                              from render method (overrides
     *                              module.mockTagName if provided)
     * @return {object} the ReactTestUtils object (for chaining)
     */
    mockComponent: function (module, mockTagName) {
      {
        if (!hasWarnedAboutDeprecatedMockComponent) {
          hasWarnedAboutDeprecatedMockComponent = true;

          warn('ReactTestUtils.mockComponent() is deprecated. ' + 'Use shallow rendering or jest.mock() instead.\n\n' + 'See https://fb.me/test-utils-mock-component for more information.');
        }
      }

      mockTagName = mockTagName || module.mockTagName || 'div';
      module.prototype.render.mockImplementation(function () {
        return React.createElement(mockTagName, null, this.props.children);
      });
      return this;
    },
    nativeTouchData: function (x, y) {
      return {
        touches: [{
          pageX: x,
          pageY: y
        }]
      };
    },
    Simulate: null,
    SimulateNative: {},
    act: act
  };
  /**
   * Exports:
   *
   * - `ReactTestUtils.Simulate.click(Element)`
   * - `ReactTestUtils.Simulate.mouseMove(Element)`
   * - `ReactTestUtils.Simulate.change(Element)`
   * - ... (All keys from event plugin `eventTypes` objects)
   */

  function makeSimulator(eventType) {
    return function (domNode, eventData) {
      if (!!React.isValidElement(domNode)) {
        {
          throw Error( "TestUtils.Simulate expected a DOM node as the first argument but received a React element. Pass the DOM node you wish to simulate the event on instead. Note that TestUtils.Simulate will not work if you are using shallow rendering." );
        }
      }

      if (!!ReactTestUtils.isCompositeComponent(domNode)) {
        {
          throw Error( "TestUtils.Simulate expected a DOM node as the first argument but received a component instance. Pass the DOM node you wish to simulate the event on instead." );
        }
      }

      var dispatchConfig = eventNameDispatchConfigs$1[eventType];
      var fakeNativeEvent = new Event();
      fakeNativeEvent.target = domNode;
      fakeNativeEvent.type = eventType.toLowerCase(); // We don't use SyntheticEvent.getPooled in order to not have to worry about
      // properly destroying any properties assigned from `eventData` upon release

      var targetInst = getInstanceFromNode$1(domNode);
      var event = new SyntheticEvent(dispatchConfig, targetInst, fakeNativeEvent, domNode); // Since we aren't using pooling, always persist the event. This will make
      // sure it's marked and won't warn when setting additional properties.

      event.persist();

      _assign(event, eventData);

      if (dispatchConfig.phasedRegistrationNames) {
        accumulateTwoPhaseDispatches$1(event);
      } else {
        accumulateDirectDispatches$1(event);
      }

      ReactDOM.unstable_batchedUpdates(function () {
        // Normally extractEvent enqueues a state restore, but we'll just always
        // do that since we're by-passing it here.
        enqueueStateRestore$1(domNode);
        runEventsInBatch$1(event);
      });
      restoreStateIfNeeded$1();
    };
  }

  function buildSimulators() {
    ReactTestUtils.Simulate = {};
    var eventType;

    for (eventType in eventNameDispatchConfigs$1) {
      /**
       * @param {!Element|ReactDOMComponent} domComponentOrNode
       * @param {?object} eventData Fake event data to use in SyntheticEvent.
       */
      ReactTestUtils.Simulate[eventType] = makeSimulator(eventType);
    }
  }

  buildSimulators();
  /**
   * Exports:
   *
   * - `ReactTestUtils.SimulateNative.click(Element/ReactDOMComponent)`
   * - `ReactTestUtils.SimulateNative.mouseMove(Element/ReactDOMComponent)`
   * - `ReactTestUtils.SimulateNative.mouseIn/ReactDOMComponent)`
   * - `ReactTestUtils.SimulateNative.mouseOut(Element/ReactDOMComponent)`
   * - ... (All keys from `BrowserEventConstants.topLevelTypes`)
   *
   * Note: Top level event types are a subset of the entire set of handler types
   * (which include a broader set of "synthetic" events). For example, onDragDone
   * is a synthetic event. Except when testing an event plugin or React's event
   * handling code specifically, you probably want to use ReactTestUtils.Simulate
   * to dispatch synthetic events.
   */

  function makeNativeSimulator(eventType, topLevelType) {
    return function (domComponentOrNode, nativeEventData) {
      var fakeNativeEvent = new Event(eventType);

      _assign(fakeNativeEvent, nativeEventData);

      if (ReactTestUtils.isDOMComponent(domComponentOrNode)) {
        simulateNativeEventOnDOMComponent(topLevelType, domComponentOrNode, fakeNativeEvent);
      } else if (domComponentOrNode.tagName) {
        // Will allow on actual dom nodes.
        simulateNativeEventOnNode(topLevelType, domComponentOrNode, fakeNativeEvent);
      }
    };
  }

  [[TOP_ABORT, 'abort'], [TOP_ANIMATION_END, 'animationEnd'], [TOP_ANIMATION_ITERATION, 'animationIteration'], [TOP_ANIMATION_START, 'animationStart'], [TOP_BLUR, 'blur'], [TOP_CAN_PLAY_THROUGH, 'canPlayThrough'], [TOP_CAN_PLAY, 'canPlay'], [TOP_CANCEL, 'cancel'], [TOP_CHANGE, 'change'], [TOP_CLICK, 'click'], [TOP_CLOSE, 'close'], [TOP_COMPOSITION_END, 'compositionEnd'], [TOP_COMPOSITION_START, 'compositionStart'], [TOP_COMPOSITION_UPDATE, 'compositionUpdate'], [TOP_CONTEXT_MENU, 'contextMenu'], [TOP_COPY, 'copy'], [TOP_CUT, 'cut'], [TOP_DOUBLE_CLICK, 'doubleClick'], [TOP_DRAG_END, 'dragEnd'], [TOP_DRAG_ENTER, 'dragEnter'], [TOP_DRAG_EXIT, 'dragExit'], [TOP_DRAG_LEAVE, 'dragLeave'], [TOP_DRAG_OVER, 'dragOver'], [TOP_DRAG_START, 'dragStart'], [TOP_DRAG, 'drag'], [TOP_DROP, 'drop'], [TOP_DURATION_CHANGE, 'durationChange'], [TOP_EMPTIED, 'emptied'], [TOP_ENCRYPTED, 'encrypted'], [TOP_ENDED, 'ended'], [TOP_ERROR, 'error'], [TOP_FOCUS, 'focus'], [TOP_INPUT, 'input'], [TOP_KEY_DOWN, 'keyDown'], [TOP_KEY_PRESS, 'keyPress'], [TOP_KEY_UP, 'keyUp'], [TOP_LOAD_START, 'loadStart'], [TOP_LOAD_START, 'loadStart'], [TOP_LOAD, 'load'], [TOP_LOADED_DATA, 'loadedData'], [TOP_LOADED_METADATA, 'loadedMetadata'], [TOP_MOUSE_DOWN, 'mouseDown'], [TOP_MOUSE_MOVE, 'mouseMove'], [TOP_MOUSE_OUT, 'mouseOut'], [TOP_MOUSE_OVER, 'mouseOver'], [TOP_MOUSE_UP, 'mouseUp'], [TOP_PASTE, 'paste'], [TOP_PAUSE, 'pause'], [TOP_PLAY, 'play'], [TOP_PLAYING, 'playing'], [TOP_PROGRESS, 'progress'], [TOP_RATE_CHANGE, 'rateChange'], [TOP_SCROLL, 'scroll'], [TOP_SEEKED, 'seeked'], [TOP_SEEKING, 'seeking'], [TOP_SELECTION_CHANGE, 'selectionChange'], [TOP_STALLED, 'stalled'], [TOP_SUSPEND, 'suspend'], [TOP_TEXT_INPUT, 'textInput'], [TOP_TIME_UPDATE, 'timeUpdate'], [TOP_TOGGLE, 'toggle'], [TOP_TOUCH_CANCEL, 'touchCancel'], [TOP_TOUCH_END, 'touchEnd'], [TOP_TOUCH_MOVE, 'touchMove'], [TOP_TOUCH_START, 'touchStart'], [TOP_TRANSITION_END, 'transitionEnd'], [TOP_VOLUME_CHANGE, 'volumeChange'], [TOP_WAITING, 'waiting'], [TOP_WHEEL, 'wheel']].forEach(function (_ref) {
    var topLevelType = _ref[0],
        eventType = _ref[1];

    /**
     * @param {!Element|ReactDOMComponent} domComponentOrNode
     * @param {?Event} nativeEventData Fake native event to use in SyntheticEvent.
     */
    ReactTestUtils.SimulateNative[eventType] = makeNativeSimulator(eventType, topLevelType);
  });

  // TODO: decide on the top-level export form.
  // This is hacky but makes it work with both Rollup and Jest.


  var testUtils = ReactTestUtils.default || ReactTestUtils;

  return testUtils;

})));

(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('react-dom/test-utils'), require('react'), require('react-dom'), require('react-dom/client')) :
  typeof define === 'function' && define.amd ? define(['exports', 'react-dom/test-utils', 'react', 'react-dom', 'react-dom/client'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.TestingLibraryReact = {}, global.ReactTestUtils, global.React, global.ReactDOM, global.ReactDOMClient));
})(this, (function (exports, testUtils, React, ReactDOM, ReactDOMClient) { 'use strict';

  function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

  function _interopNamespace(e) {
    if (e && e.__esModule) return e;
    var n = Object.create(null);
    if (e) {
      Object.keys(e).forEach(function (k) {
        if (k !== 'default') {
          var d = Object.getOwnPropertyDescriptor(e, k);
          Object.defineProperty(n, k, d.get ? d : {
            enumerable: true,
            get: function () { return e[k]; }
          });
        }
      });
    }
    n["default"] = e;
    return Object.freeze(n);
  }

  function _mergeNamespaces(n, m) {
    m.forEach(function (e) {
      e && typeof e !== 'string' && !Array.isArray(e) && Object.keys(e).forEach(function (k) {
        if (k !== 'default' && !(k in n)) {
          var d = Object.getOwnPropertyDescriptor(e, k);
          Object.defineProperty(n, k, d.get ? d : {
            enumerable: true,
            get: function () { return e[k]; }
          });
        }
      });
    });
    return Object.freeze(n);
  }

  var testUtils__namespace = /*#__PURE__*/_interopNamespace(testUtils);
  var React__namespace = /*#__PURE__*/_interopNamespace(React);
  var ReactDOM__default = /*#__PURE__*/_interopDefaultLegacy(ReactDOM);
  var ReactDOMClient__namespace = /*#__PURE__*/_interopNamespace(ReactDOMClient);

  var domAct = testUtils__namespace.act;

  function getGlobalThis() {
    /* istanbul ignore else */
    if (typeof self !== 'undefined') {
      return self;
    }
    /* istanbul ignore next */


    if (typeof window !== 'undefined') {
      return window;
    }
    /* istanbul ignore next */


    if (typeof global !== 'undefined') {
      return global;
    }
    /* istanbul ignore next */


    throw new Error('unable to locate global object');
  }

  function setIsReactActEnvironment(isReactActEnvironment) {
    getGlobalThis().IS_REACT_ACT_ENVIRONMENT = isReactActEnvironment;
  }

  function getIsReactActEnvironment() {
    return getGlobalThis().IS_REACT_ACT_ENVIRONMENT;
  }

  function withGlobalActEnvironment(actImplementation) {
    return function (callback) {
      var previousActEnvironment = getIsReactActEnvironment();
      setIsReactActEnvironment(true);

      try {
        // The return value of `act` is always a thenable.
        var callbackNeedsToBeAwaited = false;
        var actResult = actImplementation(function () {
          var result = callback();

          if (result !== null && typeof result === 'object' && typeof result.then === 'function') {
            callbackNeedsToBeAwaited = true;
          }

          return result;
        });

        if (callbackNeedsToBeAwaited) {
          var thenable = actResult;
          return {
            then: function then(resolve, reject) {
              thenable.then(function (returnValue) {
                setIsReactActEnvironment(previousActEnvironment);
                resolve(returnValue);
              }, function (error) {
                setIsReactActEnvironment(previousActEnvironment);
                reject(error);
              });
            }
          };
        } else {
          setIsReactActEnvironment(previousActEnvironment);
          return actResult;
        }
      } catch (error) {
        // Can't be a `finally {}` block since we don't know if we have to immediately restore IS_REACT_ACT_ENVIRONMENT
        // or if we have to await the callback first.
        setIsReactActEnvironment(previousActEnvironment);
        throw error;
      }
    };
  }

  var act = withGlobalActEnvironment(domAct);
  /* eslint no-console:0 */

  function _extends() {
    _extends = Object.assign || function (target) {
      for (var i = 1; i < arguments.length; i++) {
        var source = arguments[i];

        for (var key in source) {
          if (Object.prototype.hasOwnProperty.call(source, key)) {
            target[key] = source[key];
          }
        }
      }

      return target;
    };

    return _extends.apply(this, arguments);
  }

  function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) {
    try {
      var info = gen[key](arg);
      var value = info.value;
    } catch (error) {
      reject(error);
      return;
    }

    if (info.done) {
      resolve(value);
    } else {
      Promise.resolve(value).then(_next, _throw);
    }
  }

  function _asyncToGenerator(fn) {
    return function () {
      var self = this,
          args = arguments;
      return new Promise(function (resolve, reject) {
        var gen = fn.apply(self, args);

        function _next(value) {
          asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value);
        }

        function _throw(err) {
          asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err);
        }

        _next(undefined);
      });
    };
  }

  var runtime = {exports: {}};

  /**
   * Copyright (c) 2014-present, Facebook, Inc.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   */

  (function (module) {
    var runtime = function (exports) {

      var Op = Object.prototype;
      var hasOwn = Op.hasOwnProperty;
      var undefined$1; // More compressible than void 0.

      var $Symbol = typeof Symbol === "function" ? Symbol : {};
      var iteratorSymbol = $Symbol.iterator || "@@iterator";
      var asyncIteratorSymbol = $Symbol.asyncIterator || "@@asyncIterator";
      var toStringTagSymbol = $Symbol.toStringTag || "@@toStringTag";

      function define(obj, key, value) {
        Object.defineProperty(obj, key, {
          value: value,
          enumerable: true,
          configurable: true,
          writable: true
        });
        return obj[key];
      }

      try {
        // IE 8 has a broken Object.defineProperty that only works on DOM objects.
        define({}, "");
      } catch (err) {
        define = function define(obj, key, value) {
          return obj[key] = value;
        };
      }

      function wrap(innerFn, outerFn, self, tryLocsList) {
        // If outerFn provided and outerFn.prototype is a Generator, then outerFn.prototype instanceof Generator.
        var protoGenerator = outerFn && outerFn.prototype instanceof Generator ? outerFn : Generator;
        var generator = Object.create(protoGenerator.prototype);
        var context = new Context(tryLocsList || []); // The ._invoke method unifies the implementations of the .next,
        // .throw, and .return methods.

        generator._invoke = makeInvokeMethod(innerFn, self, context);
        return generator;
      }

      exports.wrap = wrap; // Try/catch helper to minimize deoptimizations. Returns a completion
      // record like context.tryEntries[i].completion. This interface could
      // have been (and was previously) designed to take a closure to be
      // invoked without arguments, but in all the cases we care about we
      // already have an existing method we want to call, so there's no need
      // to create a new function object. We can even get away with assuming
      // the method takes exactly one argument, since that happens to be true
      // in every case, so we don't have to touch the arguments object. The
      // only additional allocation required is the completion record, which
      // has a stable shape and so hopefully should be cheap to allocate.

      function tryCatch(fn, obj, arg) {
        try {
          return {
            type: "normal",
            arg: fn.call(obj, arg)
          };
        } catch (err) {
          return {
            type: "throw",
            arg: err
          };
        }
      }

      var GenStateSuspendedStart = "suspendedStart";
      var GenStateSuspendedYield = "suspendedYield";
      var GenStateExecuting = "executing";
      var GenStateCompleted = "completed"; // Returning this object from the innerFn has the same effect as
      // breaking out of the dispatch switch statement.

      var ContinueSentinel = {}; // Dummy constructor functions that we use as the .constructor and
      // .constructor.prototype properties for functions that return Generator
      // objects. For full spec compliance, you may wish to configure your
      // minifier not to mangle the names of these two functions.

      function Generator() {}

      function GeneratorFunction() {}

      function GeneratorFunctionPrototype() {} // This is a polyfill for %IteratorPrototype% for environments that
      // don't natively support it.


      var IteratorPrototype = {};
      define(IteratorPrototype, iteratorSymbol, function () {
        return this;
      });
      var getProto = Object.getPrototypeOf;
      var NativeIteratorPrototype = getProto && getProto(getProto(values([])));

      if (NativeIteratorPrototype && NativeIteratorPrototype !== Op && hasOwn.call(NativeIteratorPrototype, iteratorSymbol)) {
        // This environment has a native %IteratorPrototype%; use it instead
        // of the polyfill.
        IteratorPrototype = NativeIteratorPrototype;
      }

      var Gp = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(IteratorPrototype);
      GeneratorFunction.prototype = GeneratorFunctionPrototype;
      define(Gp, "constructor", GeneratorFunctionPrototype);
      define(GeneratorFunctionPrototype, "constructor", GeneratorFunction);
      GeneratorFunction.displayName = define(GeneratorFunctionPrototype, toStringTagSymbol, "GeneratorFunction"); // Helper for defining the .next, .throw, and .return methods of the
      // Iterator interface in terms of a single ._invoke method.

      function defineIteratorMethods(prototype) {
        ["next", "throw", "return"].forEach(function (method) {
          define(prototype, method, function (arg) {
            return this._invoke(method, arg);
          });
        });
      }

      exports.isGeneratorFunction = function (genFun) {
        var ctor = typeof genFun === "function" && genFun.constructor;
        return ctor ? ctor === GeneratorFunction || // For the native GeneratorFunction constructor, the best we can
        // do is to check its .name property.
        (ctor.displayName || ctor.name) === "GeneratorFunction" : false;
      };

      exports.mark = function (genFun) {
        if (Object.setPrototypeOf) {
          Object.setPrototypeOf(genFun, GeneratorFunctionPrototype);
        } else {
          genFun.__proto__ = GeneratorFunctionPrototype;
          define(genFun, toStringTagSymbol, "GeneratorFunction");
        }

        genFun.prototype = Object.create(Gp);
        return genFun;
      }; // Within the body of any async function, `await x` is transformed to
      // `yield regeneratorRuntime.awrap(x)`, so that the runtime can test
      // `hasOwn.call(value, "__await")` to determine if the yielded value is
      // meant to be awaited.


      exports.awrap = function (arg) {
        return {
          __await: arg
        };
      };

      function AsyncIterator(generator, PromiseImpl) {
        function invoke(method, arg, resolve, reject) {
          var record = tryCatch(generator[method], generator, arg);

          if (record.type === "throw") {
            reject(record.arg);
          } else {
            var result = record.arg;
            var value = result.value;

            if (value && typeof value === "object" && hasOwn.call(value, "__await")) {
              return PromiseImpl.resolve(value.__await).then(function (value) {
                invoke("next", value, resolve, reject);
              }, function (err) {
                invoke("throw", err, resolve, reject);
              });
            }

            return PromiseImpl.resolve(value).then(function (unwrapped) {
              // When a yielded Promise is resolved, its final value becomes
              // the .value of the Promise<{value,done}> result for the
              // current iteration.
              result.value = unwrapped;
              resolve(result);
            }, function (error) {
              // If a rejected Promise was yielded, throw the rejection back
              // into the async generator function so it can be handled there.
              return invoke("throw", error, resolve, reject);
            });
          }
        }

        var previousPromise;

        function enqueue(method, arg) {
          function callInvokeWithMethodAndArg() {
            return new PromiseImpl(function (resolve, reject) {
              invoke(method, arg, resolve, reject);
            });
          }

          return previousPromise = // If enqueue has been called before, then we want to wait until
          // all previous Promises have been resolved before calling invoke,
          // so that results are always delivered in the correct order. If
          // enqueue has not been called before, then it is important to
          // call invoke immediately, without waiting on a callback to fire,
          // so that the async generator function has the opportunity to do
          // any necessary setup in a predictable way. This predictability
          // is why the Promise constructor synchronously invokes its
          // executor callback, and why async functions synchronously
          // execute code before the first await. Since we implement simple
          // async functions in terms of async generators, it is especially
          // important to get this right, even though it requires care.
          previousPromise ? previousPromise.then(callInvokeWithMethodAndArg, // Avoid propagating failures to Promises returned by later
          // invocations of the iterator.
          callInvokeWithMethodAndArg) : callInvokeWithMethodAndArg();
        } // Define the unified helper method that is used to implement .next,
        // .throw, and .return (see defineIteratorMethods).


        this._invoke = enqueue;
      }

      defineIteratorMethods(AsyncIterator.prototype);
      define(AsyncIterator.prototype, asyncIteratorSymbol, function () {
        return this;
      });
      exports.AsyncIterator = AsyncIterator; // Note that simple async functions are implemented on top of
      // AsyncIterator objects; they just return a Promise for the value of
      // the final result produced by the iterator.

      exports.async = function (innerFn, outerFn, self, tryLocsList, PromiseImpl) {
        if (PromiseImpl === void 0) PromiseImpl = Promise;
        var iter = new AsyncIterator(wrap(innerFn, outerFn, self, tryLocsList), PromiseImpl);
        return exports.isGeneratorFunction(outerFn) ? iter // If outerFn is a generator, return the full iterator.
        : iter.next().then(function (result) {
          return result.done ? result.value : iter.next();
        });
      };

      function makeInvokeMethod(innerFn, self, context) {
        var state = GenStateSuspendedStart;
        return function invoke(method, arg) {
          if (state === GenStateExecuting) {
            throw new Error("Generator is already running");
          }

          if (state === GenStateCompleted) {
            if (method === "throw") {
              throw arg;
            } // Be forgiving, per 25.3.3.3.3 of the spec:
            // https://people.mozilla.org/~jorendorff/es6-draft.html#sec-generatorresume


            return doneResult();
          }

          context.method = method;
          context.arg = arg;

          while (true) {
            var delegate = context.delegate;

            if (delegate) {
              var delegateResult = maybeInvokeDelegate(delegate, context);

              if (delegateResult) {
                if (delegateResult === ContinueSentinel) continue;
                return delegateResult;
              }
            }

            if (context.method === "next") {
              // Setting context._sent for legacy support of Babel's
              // function.sent implementation.
              context.sent = context._sent = context.arg;
            } else if (context.method === "throw") {
              if (state === GenStateSuspendedStart) {
                state = GenStateCompleted;
                throw context.arg;
              }

              context.dispatchException(context.arg);
            } else if (context.method === "return") {
              context.abrupt("return", context.arg);
            }

            state = GenStateExecuting;
            var record = tryCatch(innerFn, self, context);

            if (record.type === "normal") {
              // If an exception is thrown from innerFn, we leave state ===
              // GenStateExecuting and loop back for another invocation.
              state = context.done ? GenStateCompleted : GenStateSuspendedYield;

              if (record.arg === ContinueSentinel) {
                continue;
              }

              return {
                value: record.arg,
                done: context.done
              };
            } else if (record.type === "throw") {
              state = GenStateCompleted; // Dispatch the exception by looping back around to the
              // context.dispatchException(context.arg) call above.

              context.method = "throw";
              context.arg = record.arg;
            }
          }
        };
      } // Call delegate.iterator[context.method](context.arg) and handle the
      // result, either by returning a { value, done } result from the
      // delegate iterator, or by modifying context.method and context.arg,
      // setting context.delegate to null, and returning the ContinueSentinel.


      function maybeInvokeDelegate(delegate, context) {
        var method = delegate.iterator[context.method];

        if (method === undefined$1) {
          // A .throw or .return when the delegate iterator has no .throw
          // method always terminates the yield* loop.
          context.delegate = null;

          if (context.method === "throw") {
            // Note: ["return"] must be used for ES3 parsing compatibility.
            if (delegate.iterator["return"]) {
              // If the delegate iterator has a return method, give it a
              // chance to clean up.
              context.method = "return";
              context.arg = undefined$1;
              maybeInvokeDelegate(delegate, context);

              if (context.method === "throw") {
                // If maybeInvokeDelegate(context) changed context.method from
                // "return" to "throw", let that override the TypeError below.
                return ContinueSentinel;
              }
            }

            context.method = "throw";
            context.arg = new TypeError("The iterator does not provide a 'throw' method");
          }

          return ContinueSentinel;
        }

        var record = tryCatch(method, delegate.iterator, context.arg);

        if (record.type === "throw") {
          context.method = "throw";
          context.arg = record.arg;
          context.delegate = null;
          return ContinueSentinel;
        }

        var info = record.arg;

        if (!info) {
          context.method = "throw";
          context.arg = new TypeError("iterator result is not an object");
          context.delegate = null;
          return ContinueSentinel;
        }

        if (info.done) {
          // Assign the result of the finished delegate to the temporary
          // variable specified by delegate.resultName (see delegateYield).
          context[delegate.resultName] = info.value; // Resume execution at the desired location (see delegateYield).

          context.next = delegate.nextLoc; // If context.method was "throw" but the delegate handled the
          // exception, let the outer generator proceed normally. If
          // context.method was "next", forget context.arg since it has been
          // "consumed" by the delegate iterator. If context.method was
          // "return", allow the original .return call to continue in the
          // outer generator.

          if (context.method !== "return") {
            context.method = "next";
            context.arg = undefined$1;
          }
        } else {
          // Re-yield the result returned by the delegate method.
          return info;
        } // The delegate iterator is finished, so forget it and continue with
        // the outer generator.


        context.delegate = null;
        return ContinueSentinel;
      } // Define Generator.prototype.{next,throw,return} in terms of the
      // unified ._invoke helper method.


      defineIteratorMethods(Gp);
      define(Gp, toStringTagSymbol, "Generator"); // A Generator should always return itself as the iterator object when the
      // @@iterator function is called on it. Some browsers' implementations of the
      // iterator prototype chain incorrectly implement this, causing the Generator
      // object to not be returned from this call. This ensures that doesn't happen.
      // See https://github.com/facebook/regenerator/issues/274 for more details.

      define(Gp, iteratorSymbol, function () {
        return this;
      });
      define(Gp, "toString", function () {
        return "[object Generator]";
      });

      function pushTryEntry(locs) {
        var entry = {
          tryLoc: locs[0]
        };

        if (1 in locs) {
          entry.catchLoc = locs[1];
        }

        if (2 in locs) {
          entry.finallyLoc = locs[2];
          entry.afterLoc = locs[3];
        }

        this.tryEntries.push(entry);
      }

      function resetTryEntry(entry) {
        var record = entry.completion || {};
        record.type = "normal";
        delete record.arg;
        entry.completion = record;
      }

      function Context(tryLocsList) {
        // The root entry object (effectively a try statement without a catch
        // or a finally block) gives us a place to store values thrown from
        // locations where there is no enclosing try statement.
        this.tryEntries = [{
          tryLoc: "root"
        }];
        tryLocsList.forEach(pushTryEntry, this);
        this.reset(true);
      }

      exports.keys = function (object) {
        var keys = [];

        for (var key in object) {
          keys.push(key);
        }

        keys.reverse(); // Rather than returning an object with a next method, we keep
        // things simple and return the next function itself.

        return function next() {
          while (keys.length) {
            var key = keys.pop();

            if (key in object) {
              next.value = key;
              next.done = false;
              return next;
            }
          } // To avoid creating an additional object, we just hang the .value
          // and .done properties off the next function object itself. This
          // also ensures that the minifier will not anonymize the function.


          next.done = true;
          return next;
        };
      };

      function values(iterable) {
        if (iterable) {
          var iteratorMethod = iterable[iteratorSymbol];

          if (iteratorMethod) {
            return iteratorMethod.call(iterable);
          }

          if (typeof iterable.next === "function") {
            return iterable;
          }

          if (!isNaN(iterable.length)) {
            var i = -1,
                next = function next() {
              while (++i < iterable.length) {
                if (hasOwn.call(iterable, i)) {
                  next.value = iterable[i];
                  next.done = false;
                  return next;
                }
              }

              next.value = undefined$1;
              next.done = true;
              return next;
            };

            return next.next = next;
          }
        } // Return an iterator with no values.


        return {
          next: doneResult
        };
      }

      exports.values = values;

      function doneResult() {
        return {
          value: undefined$1,
          done: true
        };
      }

      Context.prototype = {
        constructor: Context,
        reset: function reset(skipTempReset) {
          this.prev = 0;
          this.next = 0; // Resetting context._sent for legacy support of Babel's
          // function.sent implementation.

          this.sent = this._sent = undefined$1;
          this.done = false;
          this.delegate = null;
          this.method = "next";
          this.arg = undefined$1;
          this.tryEntries.forEach(resetTryEntry);

          if (!skipTempReset) {
            for (var name in this) {
              // Not sure about the optimal order of these conditions:
              if (name.charAt(0) === "t" && hasOwn.call(this, name) && !isNaN(+name.slice(1))) {
                this[name] = undefined$1;
              }
            }
          }
        },
        stop: function stop() {
          this.done = true;
          var rootEntry = this.tryEntries[0];
          var rootRecord = rootEntry.completion;

          if (rootRecord.type === "throw") {
            throw rootRecord.arg;
          }

          return this.rval;
        },
        dispatchException: function dispatchException(exception) {
          if (this.done) {
            throw exception;
          }

          var context = this;

          function handle(loc, caught) {
            record.type = "throw";
            record.arg = exception;
            context.next = loc;

            if (caught) {
              // If the dispatched exception was caught by a catch block,
              // then let that catch block handle the exception normally.
              context.method = "next";
              context.arg = undefined$1;
            }

            return !!caught;
          }

          for (var i = this.tryEntries.length - 1; i >= 0; --i) {
            var entry = this.tryEntries[i];
            var record = entry.completion;

            if (entry.tryLoc === "root") {
              // Exception thrown outside of any try block that could handle
              // it, so set the completion value of the entire function to
              // throw the exception.
              return handle("end");
            }

            if (entry.tryLoc <= this.prev) {
              var hasCatch = hasOwn.call(entry, "catchLoc");
              var hasFinally = hasOwn.call(entry, "finallyLoc");

              if (hasCatch && hasFinally) {
                if (this.prev < entry.catchLoc) {
                  return handle(entry.catchLoc, true);
                } else if (this.prev < entry.finallyLoc) {
                  return handle(entry.finallyLoc);
                }
              } else if (hasCatch) {
                if (this.prev < entry.catchLoc) {
                  return handle(entry.catchLoc, true);
                }
              } else if (hasFinally) {
                if (this.prev < entry.finallyLoc) {
                  return handle(entry.finallyLoc);
                }
              } else {
                throw new Error("try statement without catch or finally");
              }
            }
          }
        },
        abrupt: function abrupt(type, arg) {
          for (var i = this.tryEntries.length - 1; i >= 0; --i) {
            var entry = this.tryEntries[i];

            if (entry.tryLoc <= this.prev && hasOwn.call(entry, "finallyLoc") && this.prev < entry.finallyLoc) {
              var finallyEntry = entry;
              break;
            }
          }

          if (finallyEntry && (type === "break" || type === "continue") && finallyEntry.tryLoc <= arg && arg <= finallyEntry.finallyLoc) {
            // Ignore the finally entry if control is not jumping to a
            // location outside the try/catch block.
            finallyEntry = null;
          }

          var record = finallyEntry ? finallyEntry.completion : {};
          record.type = type;
          record.arg = arg;

          if (finallyEntry) {
            this.method = "next";
            this.next = finallyEntry.finallyLoc;
            return ContinueSentinel;
          }

          return this.complete(record);
        },
        complete: function complete(record, afterLoc) {
          if (record.type === "throw") {
            throw record.arg;
          }

          if (record.type === "break" || record.type === "continue") {
            this.next = record.arg;
          } else if (record.type === "return") {
            this.rval = this.arg = record.arg;
            this.method = "return";
            this.next = "end";
          } else if (record.type === "normal" && afterLoc) {
            this.next = afterLoc;
          }

          return ContinueSentinel;
        },
        finish: function finish(finallyLoc) {
          for (var i = this.tryEntries.length - 1; i >= 0; --i) {
            var entry = this.tryEntries[i];

            if (entry.finallyLoc === finallyLoc) {
              this.complete(entry.completion, entry.afterLoc);
              resetTryEntry(entry);
              return ContinueSentinel;
            }
          }
        },
        "catch": function _catch(tryLoc) {
          for (var i = this.tryEntries.length - 1; i >= 0; --i) {
            var entry = this.tryEntries[i];

            if (entry.tryLoc === tryLoc) {
              var record = entry.completion;

              if (record.type === "throw") {
                var thrown = record.arg;
                resetTryEntry(entry);
              }

              return thrown;
            }
          } // The context.catch method must only be called with a location
          // argument that corresponds to a known catch block.


          throw new Error("illegal catch attempt");
        },
        delegateYield: function delegateYield(iterable, resultName, nextLoc) {
          this.delegate = {
            iterator: values(iterable),
            resultName: resultName,
            nextLoc: nextLoc
          };

          if (this.method === "next") {
            // Deliberately forget the last sent value so that we don't
            // accidentally pass it on to the delegate.
            this.arg = undefined$1;
          }

          return ContinueSentinel;
        }
      }; // Regardless of whether this script is executing as a CommonJS module
      // or not, return the runtime object so that we can declare the variable
      // regeneratorRuntime in the outer scope, which allows this module to be
      // injected easily by `bin/regenerator --include-runtime script.js`.

      return exports;
    }( // If this script is executing as a CommonJS module, use module.exports
    // as the regeneratorRuntime namespace. Otherwise create a new empty
    // object. Either way, the resulting object will be used to initialize
    // the regeneratorRuntime variable at the top of this file.
    module.exports );

    try {
      regeneratorRuntime = runtime;
    } catch (accidentalStrictMode) {
      // This module should not be running in strict mode, so the above
      // assignment should always work unless something is misconfigured. Just
      // in case runtime.js accidentally runs in strict mode, in modern engines
      // we can explicitly access globalThis. In older engines we can escape
      // strict mode using a global Function call. This could conceivably fail
      // if a Content Security Policy forbids using Function, but in that case
      // the proper solution is to fix the accidental strict mode problem. If
      // you've misconfigured your bundler to force strict mode and applied a
      // CSP to forbid Function, and you're not willing to fix either of those
      // problems, please detail your unique predicament in a GitHub issue.
      if (typeof globalThis === "object") {
        globalThis.regeneratorRuntime = runtime;
      } else {
        Function("r", "regeneratorRuntime = r")(runtime);
      }
    }
  })(runtime);

  var regenerator = runtime.exports;

  function _objectWithoutPropertiesLoose(source, excluded) {
    if (source == null) return {};
    var target = {};
    var sourceKeys = Object.keys(source);
    var key, i;

    for (i = 0; i < sourceKeys.length; i++) {
      key = sourceKeys[i];
      if (excluded.indexOf(key) >= 0) continue;
      target[key] = source[key];
    }

    return target;
  }

  function _setPrototypeOf(o, p) {
    _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) {
      o.__proto__ = p;
      return o;
    };

    return _setPrototypeOf(o, p);
  }

  function _inheritsLoose(subClass, superClass) {
    subClass.prototype = Object.create(superClass.prototype);
    subClass.prototype.constructor = subClass;
    _setPrototypeOf(subClass, superClass);
  }

  function _getPrototypeOf(o) {
    _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) {
      return o.__proto__ || Object.getPrototypeOf(o);
    };
    return _getPrototypeOf(o);
  }

  function _isNativeFunction(fn) {
    return Function.toString.call(fn).indexOf("[native code]") !== -1;
  }

  function _isNativeReflectConstruct() {
    if (typeof Reflect === "undefined" || !Reflect.construct) return false;
    if (Reflect.construct.sham) return false;
    if (typeof Proxy === "function") return true;

    try {
      Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {}));
      return true;
    } catch (e) {
      return false;
    }
  }

  function _construct(Parent, args, Class) {
    if (_isNativeReflectConstruct()) {
      _construct = Reflect.construct;
    } else {
      _construct = function _construct(Parent, args, Class) {
        var a = [null];
        a.push.apply(a, args);
        var Constructor = Function.bind.apply(Parent, a);
        var instance = new Constructor();
        if (Class) _setPrototypeOf(instance, Class.prototype);
        return instance;
      };
    }

    return _construct.apply(null, arguments);
  }

  function _wrapNativeSuper(Class) {
    var _cache = typeof Map === "function" ? new Map() : undefined;

    _wrapNativeSuper = function _wrapNativeSuper(Class) {
      if (Class === null || !_isNativeFunction(Class)) return Class;

      if (typeof Class !== "function") {
        throw new TypeError("Super expression must either be null or a function");
      }

      if (typeof _cache !== "undefined") {
        if (_cache.has(Class)) return _cache.get(Class);

        _cache.set(Class, Wrapper);
      }

      function Wrapper() {
        return _construct(Class, arguments, _getPrototypeOf(this).constructor);
      }

      Wrapper.prototype = Object.create(Class.prototype, {
        constructor: {
          value: Wrapper,
          enumerable: false,
          writable: true,
          configurable: true
        }
      });
      return _setPrototypeOf(Wrapper, Class);
    };

    return _wrapNativeSuper(Class);
  }

  var build = {};

  function _inherits(subClass, superClass) {
    if (typeof superClass !== "function" && superClass !== null) {
      throw new TypeError("Super expression must either be null or a function");
    }

    subClass.prototype = Object.create(superClass && superClass.prototype, {
      constructor: {
        value: subClass,
        writable: true,
        configurable: true
      }
    });
    Object.defineProperty(subClass, "prototype", {
      writable: false
    });
    if (superClass) _setPrototypeOf(subClass, superClass);
  }

  var ansiStyles = {exports: {}};

  function _wrapRegExp() { _wrapRegExp = function _wrapRegExp(re, groups) { return new BabelRegExp(re, void 0, groups); }; var _super = RegExp.prototype, _groups = new WeakMap(); function BabelRegExp(re, flags, groups) { var _this = new RegExp(re, flags); return _groups.set(_this, groups || _groups.get(re)), _setPrototypeOf(_this, BabelRegExp.prototype); } function buildGroups(result, re) { var g = _groups.get(re); return Object.keys(g).reduce(function (groups, name) { return groups[name] = result[g[name]], groups; }, Object.create(null)); } return _inherits(BabelRegExp, RegExp), BabelRegExp.prototype.exec = function (str) { var result = _super.exec.call(this, str); return result && (result.groups = buildGroups(result, this)), result; }, BabelRegExp.prototype[Symbol.replace] = function (str, substitution) { if ("string" == typeof substitution) { var groups = _groups.get(this); return _super[Symbol.replace].call(this, str, substitution.replace(/\$<([^>]+)>/g, function (_, name) { return "$" + groups[name]; })); } if ("function" == typeof substitution) { var _this = this; return _super[Symbol.replace].call(this, str, function () { var args = arguments; return "object" != typeof args[args.length - 1] && (args = [].slice.call(args)).push(buildGroups(args, _this)), substitution.apply(this, args); }); } return _super[Symbol.replace].call(this, str, substitution); }, _wrapRegExp.apply(this, arguments); }

  (function (module) {

    var ANSI_BACKGROUND_OFFSET = 10;

    var wrapAnsi256 = function wrapAnsi256(offset) {
      if (offset === void 0) {
        offset = 0;
      }

      return function (code) {
        return "\x1B[" + (38 + offset) + ";5;" + code + "m";
      };
    };

    var wrapAnsi16m = function wrapAnsi16m(offset) {
      if (offset === void 0) {
        offset = 0;
      }

      return function (red, green, blue) {
        return "\x1B[" + (38 + offset) + ";2;" + red + ";" + green + ";" + blue + "m";
      };
    };

    function assembleStyles() {
      var codes = new Map();
      var styles = {
        modifier: {
          reset: [0, 0],
          // 21 isn't widely supported and 22 does the same thing
          bold: [1, 22],
          dim: [2, 22],
          italic: [3, 23],
          underline: [4, 24],
          overline: [53, 55],
          inverse: [7, 27],
          hidden: [8, 28],
          strikethrough: [9, 29]
        },
        color: {
          black: [30, 39],
          red: [31, 39],
          green: [32, 39],
          yellow: [33, 39],
          blue: [34, 39],
          magenta: [35, 39],
          cyan: [36, 39],
          white: [37, 39],
          // Bright color
          blackBright: [90, 39],
          redBright: [91, 39],
          greenBright: [92, 39],
          yellowBright: [93, 39],
          blueBright: [94, 39],
          magentaBright: [95, 39],
          cyanBright: [96, 39],
          whiteBright: [97, 39]
        },
        bgColor: {
          bgBlack: [40, 49],
          bgRed: [41, 49],
          bgGreen: [42, 49],
          bgYellow: [43, 49],
          bgBlue: [44, 49],
          bgMagenta: [45, 49],
          bgCyan: [46, 49],
          bgWhite: [47, 49],
          // Bright color
          bgBlackBright: [100, 49],
          bgRedBright: [101, 49],
          bgGreenBright: [102, 49],
          bgYellowBright: [103, 49],
          bgBlueBright: [104, 49],
          bgMagentaBright: [105, 49],
          bgCyanBright: [106, 49],
          bgWhiteBright: [107, 49]
        }
      }; // Alias bright black as gray (and grey)

      styles.color.gray = styles.color.blackBright;
      styles.bgColor.bgGray = styles.bgColor.bgBlackBright;
      styles.color.grey = styles.color.blackBright;
      styles.bgColor.bgGrey = styles.bgColor.bgBlackBright;

      for (var _i = 0, _Object$entries = Object.entries(styles); _i < _Object$entries.length; _i++) {
        var _Object$entries$_i = _Object$entries[_i],
            groupName = _Object$entries$_i[0],
            group = _Object$entries$_i[1];

        for (var _i2 = 0, _Object$entries2 = Object.entries(group); _i2 < _Object$entries2.length; _i2++) {
          var _Object$entries2$_i = _Object$entries2[_i2],
              styleName = _Object$entries2$_i[0],
              style = _Object$entries2$_i[1];
          styles[styleName] = {
            open: "\x1B[" + style[0] + "m",
            close: "\x1B[" + style[1] + "m"
          };
          group[styleName] = styles[styleName];
          codes.set(style[0], style[1]);
        }

        Object.defineProperty(styles, groupName, {
          value: group,
          enumerable: false
        });
      }

      Object.defineProperty(styles, 'codes', {
        value: codes,
        enumerable: false
      });
      styles.color.close = "\x1B[39m";
      styles.bgColor.close = "\x1B[49m";
      styles.color.ansi256 = wrapAnsi256();
      styles.color.ansi16m = wrapAnsi16m();
      styles.bgColor.ansi256 = wrapAnsi256(ANSI_BACKGROUND_OFFSET);
      styles.bgColor.ansi16m = wrapAnsi16m(ANSI_BACKGROUND_OFFSET); // From https://github.com/Qix-/color-convert/blob/3f0e0d4e92e235796ccb17f6e85c72094a651f49/conversions.js

      Object.defineProperties(styles, {
        rgbToAnsi256: {
          value: function value(red, green, blue) {
            // We use the extended greyscale palette here, with the exception of
            // black and white. normal palette only has 4 greyscale shades.
            if (red === green && green === blue) {
              if (red < 8) {
                return 16;
              }

              if (red > 248) {
                return 231;
              }

              return Math.round((red - 8) / 247 * 24) + 232;
            }

            return 16 + 36 * Math.round(red / 255 * 5) + 6 * Math.round(green / 255 * 5) + Math.round(blue / 255 * 5);
          },
          enumerable: false
        },
        hexToRgb: {
          value: function value(hex) {
            var matches = /*#__PURE__*/_wrapRegExp(/([a-f\d]{6}|[a-f\d]{3})/i, {
              colorString: 1
            }).exec(hex.toString(16));

            if (!matches) {
              return [0, 0, 0];
            }

            var colorString = matches.groups.colorString;

            if (colorString.length === 3) {
              colorString = colorString.split('').map(function (character) {
                return character + character;
              }).join('');
            }

            var integer = Number.parseInt(colorString, 16);
            return [integer >> 16 & 0xFF, integer >> 8 & 0xFF, integer & 0xFF];
          },
          enumerable: false
        },
        hexToAnsi256: {
          value: function value(hex) {
            return styles.rgbToAnsi256.apply(styles, styles.hexToRgb(hex));
          },
          enumerable: false
        }
      });
      return styles;
    } // Make the export immutable


    Object.defineProperty(module, 'exports', {
      enumerable: true,
      get: assembleStyles
    });
  })(ansiStyles);

  var collections = {};

  Object.defineProperty(collections, '__esModule', {
    value: true
  });
  collections.printIteratorEntries = printIteratorEntries;
  collections.printIteratorValues = printIteratorValues;
  collections.printListItems = printListItems;
  collections.printObjectProperties = printObjectProperties;
  /**
   * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   *
   */

  var getKeysOfEnumerableProperties = function getKeysOfEnumerableProperties(object, compareKeys) {
    var keys = Object.keys(object).sort(compareKeys);

    if (Object.getOwnPropertySymbols) {
      Object.getOwnPropertySymbols(object).forEach(function (symbol) {
        if (Object.getOwnPropertyDescriptor(object, symbol).enumerable) {
          keys.push(symbol);
        }
      });
    }

    return keys;
  };
  /**
   * Return entries (for example, of a map)
   * with spacing, indentation, and comma
   * without surrounding punctuation (for example, braces)
   */


  function printIteratorEntries(iterator, config, indentation, depth, refs, printer, // Too bad, so sad that separator for ECMAScript Map has been ' => '
  // What a distracting diff if you change a data structure to/from
  // ECMAScript Object or Immutable.Map/OrderedMap which use the default.
  separator) {
    if (separator === void 0) {
      separator = ': ';
    }

    var result = '';
    var current = iterator.next();

    if (!current.done) {
      result += config.spacingOuter;
      var indentationNext = indentation + config.indent;

      while (!current.done) {
        var name = printer(current.value[0], config, indentationNext, depth, refs);
        var value = printer(current.value[1], config, indentationNext, depth, refs);
        result += indentationNext + name + separator + value;
        current = iterator.next();

        if (!current.done) {
          result += ',' + config.spacingInner;
        } else if (!config.min) {
          result += ',';
        }
      }

      result += config.spacingOuter + indentation;
    }

    return result;
  }
  /**
   * Return values (for example, of a set)
   * with spacing, indentation, and comma
   * without surrounding punctuation (braces or brackets)
   */


  function printIteratorValues(iterator, config, indentation, depth, refs, printer) {
    var result = '';
    var current = iterator.next();

    if (!current.done) {
      result += config.spacingOuter;
      var indentationNext = indentation + config.indent;

      while (!current.done) {
        result += indentationNext + printer(current.value, config, indentationNext, depth, refs);
        current = iterator.next();

        if (!current.done) {
          result += ',' + config.spacingInner;
        } else if (!config.min) {
          result += ',';
        }
      }

      result += config.spacingOuter + indentation;
    }

    return result;
  }
  /**
   * Return items (for example, of an array)
   * with spacing, indentation, and comma
   * without surrounding punctuation (for example, brackets)
   **/


  function printListItems(list, config, indentation, depth, refs, printer) {
    var result = '';

    if (list.length) {
      result += config.spacingOuter;
      var indentationNext = indentation + config.indent;

      for (var i = 0; i < list.length; i++) {
        result += indentationNext;

        if (i in list) {
          result += printer(list[i], config, indentationNext, depth, refs);
        }

        if (i < list.length - 1) {
          result += ',' + config.spacingInner;
        } else if (!config.min) {
          result += ',';
        }
      }

      result += config.spacingOuter + indentation;
    }

    return result;
  }
  /**
   * Return properties of an object
   * with spacing, indentation, and comma
   * without surrounding punctuation (for example, braces)
   */


  function printObjectProperties(val, config, indentation, depth, refs, printer) {
    var result = '';
    var keys = getKeysOfEnumerableProperties(val, config.compareKeys);

    if (keys.length) {
      result += config.spacingOuter;
      var indentationNext = indentation + config.indent;

      for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        var name = printer(key, config, indentationNext, depth, refs);
        var value = printer(val[key], config, indentationNext, depth, refs);
        result += indentationNext + name + ': ' + value;

        if (i < keys.length - 1) {
          result += ',' + config.spacingInner;
        } else if (!config.min) {
          result += ',';
        }
      }

      result += config.spacingOuter + indentation;
    }

    return result;
  }

  var AsymmetricMatcher = {};

  Object.defineProperty(AsymmetricMatcher, '__esModule', {
    value: true
  });
  AsymmetricMatcher.test = AsymmetricMatcher.serialize = AsymmetricMatcher.default = void 0;
  var _collections$3 = collections;

  var global$2 = function () {
    if (typeof globalThis !== 'undefined') {
      return globalThis;
    } else if (typeof global$2 !== 'undefined') {
      return global$2;
    } else if (typeof self !== 'undefined') {
      return self;
    } else if (typeof window !== 'undefined') {
      return window;
    } else {
      return Function('return this')();
    }
  }();

  var Symbol$2 = global$2['jest-symbol-do-not-touch'] || global$2.Symbol;
  var asymmetricMatcher = typeof Symbol$2 === 'function' && Symbol$2.for ? Symbol$2.for('jest.asymmetricMatcher') : 0x1357a5;
  var SPACE$2 = ' ';

  var serialize$6 = function serialize(val, config, indentation, depth, refs, printer) {
    var stringedValue = val.toString();

    if (stringedValue === 'ArrayContaining' || stringedValue === 'ArrayNotContaining') {
      if (++depth > config.maxDepth) {
        return '[' + stringedValue + ']';
      }

      return stringedValue + SPACE$2 + '[' + (0, _collections$3.printListItems)(val.sample, config, indentation, depth, refs, printer) + ']';
    }

    if (stringedValue === 'ObjectContaining' || stringedValue === 'ObjectNotContaining') {
      if (++depth > config.maxDepth) {
        return '[' + stringedValue + ']';
      }

      return stringedValue + SPACE$2 + '{' + (0, _collections$3.printObjectProperties)(val.sample, config, indentation, depth, refs, printer) + '}';
    }

    if (stringedValue === 'StringMatching' || stringedValue === 'StringNotMatching') {
      return stringedValue + SPACE$2 + printer(val.sample, config, indentation, depth, refs);
    }

    if (stringedValue === 'StringContaining' || stringedValue === 'StringNotContaining') {
      return stringedValue + SPACE$2 + printer(val.sample, config, indentation, depth, refs);
    }

    return val.toAsymmetricMatcher();
  };

  AsymmetricMatcher.serialize = serialize$6;

  var test$6 = function test(val) {
    return val && val.$$typeof === asymmetricMatcher;
  };

  AsymmetricMatcher.test = test$6;
  var plugin$6 = {
    serialize: serialize$6,
    test: test$6
  };
  var _default$2k = plugin$6;
  AsymmetricMatcher.default = _default$2k;

  var ConvertAnsi = {};

  var ansiRegex = function ansiRegex(_temp) {
    var _ref = _temp === void 0 ? {} : _temp,
        _ref$onlyFirst = _ref.onlyFirst,
        onlyFirst = _ref$onlyFirst === void 0 ? false : _ref$onlyFirst;

    var pattern = ["[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]+)*|[a-zA-Z\\d]+(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)", '(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-ntqry=><~]))'].join('|');
    return new RegExp(pattern, onlyFirst ? undefined : 'g');
  };

  Object.defineProperty(ConvertAnsi, '__esModule', {
    value: true
  });
  ConvertAnsi.test = ConvertAnsi.serialize = ConvertAnsi.default = void 0;

  var _ansiRegex = _interopRequireDefault$9(ansiRegex);

  var _ansiStyles$1 = _interopRequireDefault$9(ansiStyles.exports);

  function _interopRequireDefault$9(obj) {
    return obj && obj.__esModule ? obj : {
      default: obj
    };
  }
  /**
   * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   */


  var toHumanReadableAnsi = function toHumanReadableAnsi(text) {
    return text.replace((0, _ansiRegex.default)(), function (match) {
      switch (match) {
        case _ansiStyles$1.default.red.close:
        case _ansiStyles$1.default.green.close:
        case _ansiStyles$1.default.cyan.close:
        case _ansiStyles$1.default.gray.close:
        case _ansiStyles$1.default.white.close:
        case _ansiStyles$1.default.yellow.close:
        case _ansiStyles$1.default.bgRed.close:
        case _ansiStyles$1.default.bgGreen.close:
        case _ansiStyles$1.default.bgYellow.close:
        case _ansiStyles$1.default.inverse.close:
        case _ansiStyles$1.default.dim.close:
        case _ansiStyles$1.default.bold.close:
        case _ansiStyles$1.default.reset.open:
        case _ansiStyles$1.default.reset.close:
          return '</>';

        case _ansiStyles$1.default.red.open:
          return '<red>';

        case _ansiStyles$1.default.green.open:
          return '<green>';

        case _ansiStyles$1.default.cyan.open:
          return '<cyan>';

        case _ansiStyles$1.default.gray.open:
          return '<gray>';

        case _ansiStyles$1.default.white.open:
          return '<white>';

        case _ansiStyles$1.default.yellow.open:
          return '<yellow>';

        case _ansiStyles$1.default.bgRed.open:
          return '<bgRed>';

        case _ansiStyles$1.default.bgGreen.open:
          return '<bgGreen>';

        case _ansiStyles$1.default.bgYellow.open:
          return '<bgYellow>';

        case _ansiStyles$1.default.inverse.open:
          return '<inverse>';

        case _ansiStyles$1.default.dim.open:
          return '<dim>';

        case _ansiStyles$1.default.bold.open:
          return '<bold>';

        default:
          return '';
      }
    });
  };

  var test$5 = function test(val) {
    return typeof val === 'string' && !!val.match((0, _ansiRegex.default)());
  };

  ConvertAnsi.test = test$5;

  var serialize$5 = function serialize(val, config, indentation, depth, refs, printer) {
    return printer(toHumanReadableAnsi(val), config, indentation, depth, refs);
  };

  ConvertAnsi.serialize = serialize$5;
  var plugin$5 = {
    serialize: serialize$5,
    test: test$5
  };
  var _default$2j = plugin$5;
  ConvertAnsi.default = _default$2j;

  var DOMCollection$1 = {};

  Object.defineProperty(DOMCollection$1, '__esModule', {
    value: true
  });
  DOMCollection$1.test = DOMCollection$1.serialize = DOMCollection$1.default = void 0;
  var _collections$2 = collections;
  /**
   * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   */

  /* eslint-disable local/ban-types-eventually */

  var SPACE$1 = ' ';
  var OBJECT_NAMES = ['DOMStringMap', 'NamedNodeMap'];
  var ARRAY_REGEXP = /^(HTML\w*Collection|NodeList)$/;

  var testName = function testName(name) {
    return OBJECT_NAMES.indexOf(name) !== -1 || ARRAY_REGEXP.test(name);
  };

  var test$4 = function test(val) {
    return val && val.constructor && !!val.constructor.name && testName(val.constructor.name);
  };

  DOMCollection$1.test = test$4;

  var isNamedNodeMap = function isNamedNodeMap(collection) {
    return collection.constructor.name === 'NamedNodeMap';
  };

  var serialize$4 = function serialize(collection, config, indentation, depth, refs, printer) {
    var name = collection.constructor.name;

    if (++depth > config.maxDepth) {
      return '[' + name + ']';
    }

    return (config.min ? '' : name + SPACE$1) + (OBJECT_NAMES.indexOf(name) !== -1 ? '{' + (0, _collections$2.printObjectProperties)(isNamedNodeMap(collection) ? Array.from(collection).reduce(function (props, attribute) {
      props[attribute.name] = attribute.value;
      return props;
    }, {}) : _extends({}, collection), config, indentation, depth, refs, printer) + '}' : '[' + (0, _collections$2.printListItems)(Array.from(collection), config, indentation, depth, refs, printer) + ']');
  };

  DOMCollection$1.serialize = serialize$4;
  var plugin$4 = {
    serialize: serialize$4,
    test: test$4
  };
  var _default$2i = plugin$4;
  DOMCollection$1.default = _default$2i;

  var DOMElement = {};

  var markup = {};

  var escapeHTML$2 = {};

  Object.defineProperty(escapeHTML$2, '__esModule', {
    value: true
  });

  escapeHTML$2.default = escapeHTML$1;
  /**
   * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   */


  function escapeHTML$1(str) {
    return str.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  Object.defineProperty(markup, '__esModule', {
    value: true
  });
  markup.printText = markup.printProps = markup.printElementAsLeaf = markup.printElement = markup.printComment = markup.printChildren = void 0;

  var _escapeHTML = _interopRequireDefault$8(escapeHTML$2);

  function _interopRequireDefault$8(obj) {
    return obj && obj.__esModule ? obj : {
      default: obj
    };
  }
  /**
   * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   */
  // Return empty string if keys is empty.


  var printProps$1 = function printProps(keys, props, config, indentation, depth, refs, printer) {
    var indentationNext = indentation + config.indent;
    var colors = config.colors;
    return keys.map(function (key) {
      var value = props[key];
      var printed = printer(value, config, indentationNext, depth, refs);

      if (typeof value !== 'string') {
        if (printed.indexOf('\n') !== -1) {
          printed = config.spacingOuter + indentationNext + printed + config.spacingOuter + indentation;
        }

        printed = '{' + printed + '}';
      }

      return config.spacingInner + indentation + colors.prop.open + key + colors.prop.close + '=' + colors.value.open + printed + colors.value.close;
    }).join('');
  }; // Return empty string if children is empty.


  markup.printProps = printProps$1;

  var printChildren$1 = function printChildren(children, config, indentation, depth, refs, printer) {
    return children.map(function (child) {
      return config.spacingOuter + indentation + (typeof child === 'string' ? printText$1(child, config) : printer(child, config, indentation, depth, refs));
    }).join('');
  };

  markup.printChildren = printChildren$1;

  var printText$1 = function printText(text, config) {
    var contentColor = config.colors.content;
    return contentColor.open + (0, _escapeHTML.default)(text) + contentColor.close;
  };

  markup.printText = printText$1;

  var printComment$1 = function printComment(comment, config) {
    var commentColor = config.colors.comment;
    return commentColor.open + '<!--' + (0, _escapeHTML.default)(comment) + '-->' + commentColor.close;
  }; // Separate the functions to format props, children, and element,
  // so a plugin could override a particular function, if needed.
  // Too bad, so sad: the traditional (but unnecessary) space
  // in a self-closing tagColor requires a second test of printedProps.


  markup.printComment = printComment$1;

  var printElement$1 = function printElement(type, printedProps, printedChildren, config, indentation) {
    var tagColor = config.colors.tag;
    return tagColor.open + '<' + type + (printedProps && tagColor.close + printedProps + config.spacingOuter + indentation + tagColor.open) + (printedChildren ? '>' + tagColor.close + printedChildren + config.spacingOuter + indentation + tagColor.open + '</' + type : (printedProps && !config.min ? '' : ' ') + '/') + '>' + tagColor.close;
  };

  markup.printElement = printElement$1;

  var printElementAsLeaf$1 = function printElementAsLeaf(type, config) {
    var tagColor = config.colors.tag;
    return tagColor.open + '<' + type + tagColor.close + ' …' + tagColor.open + ' />' + tagColor.close;
  };

  markup.printElementAsLeaf = printElementAsLeaf$1;

  Object.defineProperty(DOMElement, '__esModule', {
    value: true
  });
  DOMElement.test = DOMElement.serialize = DOMElement.default = void 0;
  var _markup$2 = markup;
  /**
   * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   */

  var ELEMENT_NODE$2 = 1;
  var TEXT_NODE$2 = 3;
  var COMMENT_NODE$2 = 8;
  var FRAGMENT_NODE$1 = 11;
  var ELEMENT_REGEXP$1 = /^((HTML|SVG)\w*)?Element$/;

  var testHasAttribute = function testHasAttribute(val) {
    try {
      return typeof val.hasAttribute === 'function' && val.hasAttribute('is');
    } catch (_unused) {
      return false;
    }
  };

  var testNode$1 = function testNode(val) {
    var constructorName = val.constructor.name;
    var nodeType = val.nodeType,
        tagName = val.tagName;
    var isCustomElement = typeof tagName === 'string' && tagName.includes('-') || testHasAttribute(val);
    return nodeType === ELEMENT_NODE$2 && (ELEMENT_REGEXP$1.test(constructorName) || isCustomElement) || nodeType === TEXT_NODE$2 && constructorName === 'Text' || nodeType === COMMENT_NODE$2 && constructorName === 'Comment' || nodeType === FRAGMENT_NODE$1 && constructorName === 'DocumentFragment';
  };

  var test$3 = function test(val) {
    var _val$constructor;

    return (val === null || val === void 0 ? void 0 : (_val$constructor = val.constructor) === null || _val$constructor === void 0 ? void 0 : _val$constructor.name) && testNode$1(val);
  };

  DOMElement.test = test$3;

  function nodeIsText$1(node) {
    return node.nodeType === TEXT_NODE$2;
  }

  function nodeIsComment$1(node) {
    return node.nodeType === COMMENT_NODE$2;
  }

  function nodeIsFragment$1(node) {
    return node.nodeType === FRAGMENT_NODE$1;
  }

  var serialize$3 = function serialize(node, config, indentation, depth, refs, printer) {
    if (nodeIsText$1(node)) {
      return (0, _markup$2.printText)(node.data, config);
    }

    if (nodeIsComment$1(node)) {
      return (0, _markup$2.printComment)(node.data, config);
    }

    var type = nodeIsFragment$1(node) ? 'DocumentFragment' : node.tagName.toLowerCase();

    if (++depth > config.maxDepth) {
      return (0, _markup$2.printElementAsLeaf)(type, config);
    }

    return (0, _markup$2.printElement)(type, (0, _markup$2.printProps)(nodeIsFragment$1(node) ? [] : Array.from(node.attributes).map(function (attr) {
      return attr.name;
    }).sort(), nodeIsFragment$1(node) ? {} : Array.from(node.attributes).reduce(function (props, attribute) {
      props[attribute.name] = attribute.value;
      return props;
    }, {}), config, indentation + config.indent, depth, refs, printer), (0, _markup$2.printChildren)(Array.prototype.slice.call(node.childNodes || node.children), config, indentation + config.indent, depth, refs, printer), config, indentation);
  };

  DOMElement.serialize = serialize$3;
  var plugin$3 = {
    serialize: serialize$3,
    test: test$3
  };
  var _default$2h = plugin$3;
  DOMElement.default = _default$2h;

  var Immutable = {};

  Object.defineProperty(Immutable, '__esModule', {
    value: true
  });
  Immutable.test = Immutable.serialize = Immutable.default = void 0;
  var _collections$1 = collections;
  /**
   * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   */
  // SENTINEL constants are from https://github.com/facebook/immutable-js

  var IS_ITERABLE_SENTINEL = '@@__IMMUTABLE_ITERABLE__@@';
  var IS_LIST_SENTINEL = '@@__IMMUTABLE_LIST__@@';
  var IS_KEYED_SENTINEL = '@@__IMMUTABLE_KEYED__@@';
  var IS_MAP_SENTINEL = '@@__IMMUTABLE_MAP__@@';
  var IS_ORDERED_SENTINEL = '@@__IMMUTABLE_ORDERED__@@';
  var IS_RECORD_SENTINEL = '@@__IMMUTABLE_RECORD__@@'; // immutable v4

  var IS_SEQ_SENTINEL = '@@__IMMUTABLE_SEQ__@@';
  var IS_SET_SENTINEL = '@@__IMMUTABLE_SET__@@';
  var IS_STACK_SENTINEL = '@@__IMMUTABLE_STACK__@@';

  var getImmutableName = function getImmutableName(name) {
    return 'Immutable.' + name;
  };

  var printAsLeaf = function printAsLeaf(name) {
    return '[' + name + ']';
  };

  var SPACE = ' ';
  var LAZY = '…'; // Seq is lazy if it calls a method like filter

  var printImmutableEntries = function printImmutableEntries(val, config, indentation, depth, refs, printer, type) {
    return ++depth > config.maxDepth ? printAsLeaf(getImmutableName(type)) : getImmutableName(type) + SPACE + '{' + (0, _collections$1.printIteratorEntries)(val.entries(), config, indentation, depth, refs, printer) + '}';
  }; // Record has an entries method because it is a collection in immutable v3.
  // Return an iterator for Immutable Record from version v3 or v4.


  function getRecordEntries(val) {
    var i = 0;
    return {
      next: function next() {
        if (i < val._keys.length) {
          var key = val._keys[i++];
          return {
            done: false,
            value: [key, val.get(key)]
          };
        }

        return {
          done: true,
          value: undefined
        };
      }
    };
  }

  var printImmutableRecord = function printImmutableRecord(val, config, indentation, depth, refs, printer) {
    // _name property is defined only for an Immutable Record instance
    // which was constructed with a second optional descriptive name arg
    var name = getImmutableName(val._name || 'Record');
    return ++depth > config.maxDepth ? printAsLeaf(name) : name + SPACE + '{' + (0, _collections$1.printIteratorEntries)(getRecordEntries(val), config, indentation, depth, refs, printer) + '}';
  };

  var printImmutableSeq = function printImmutableSeq(val, config, indentation, depth, refs, printer) {
    var name = getImmutableName('Seq');

    if (++depth > config.maxDepth) {
      return printAsLeaf(name);
    }

    if (val[IS_KEYED_SENTINEL]) {
      return name + SPACE + '{' + ( // from Immutable collection of entries or from ECMAScript object
      val._iter || val._object ? (0, _collections$1.printIteratorEntries)(val.entries(), config, indentation, depth, refs, printer) : LAZY) + '}';
    }

    return name + SPACE + '[' + (val._iter || // from Immutable collection of values
    val._array || // from ECMAScript array
    val._collection || // from ECMAScript collection in immutable v4
    val._iterable // from ECMAScript collection in immutable v3
    ? (0, _collections$1.printIteratorValues)(val.values(), config, indentation, depth, refs, printer) : LAZY) + ']';
  };

  var printImmutableValues = function printImmutableValues(val, config, indentation, depth, refs, printer, type) {
    return ++depth > config.maxDepth ? printAsLeaf(getImmutableName(type)) : getImmutableName(type) + SPACE + '[' + (0, _collections$1.printIteratorValues)(val.values(), config, indentation, depth, refs, printer) + ']';
  };

  var serialize$2 = function serialize(val, config, indentation, depth, refs, printer) {
    if (val[IS_MAP_SENTINEL]) {
      return printImmutableEntries(val, config, indentation, depth, refs, printer, val[IS_ORDERED_SENTINEL] ? 'OrderedMap' : 'Map');
    }

    if (val[IS_LIST_SENTINEL]) {
      return printImmutableValues(val, config, indentation, depth, refs, printer, 'List');
    }

    if (val[IS_SET_SENTINEL]) {
      return printImmutableValues(val, config, indentation, depth, refs, printer, val[IS_ORDERED_SENTINEL] ? 'OrderedSet' : 'Set');
    }

    if (val[IS_STACK_SENTINEL]) {
      return printImmutableValues(val, config, indentation, depth, refs, printer, 'Stack');
    }

    if (val[IS_SEQ_SENTINEL]) {
      return printImmutableSeq(val, config, indentation, depth, refs, printer);
    } // For compatibility with immutable v3 and v4, let record be the default.


    return printImmutableRecord(val, config, indentation, depth, refs, printer);
  }; // Explicitly comparing sentinel properties to true avoids false positive
  // when mock identity-obj-proxy returns the key as the value for any key.


  Immutable.serialize = serialize$2;

  var test$2 = function test(val) {
    return val && (val[IS_ITERABLE_SENTINEL] === true || val[IS_RECORD_SENTINEL] === true);
  };

  Immutable.test = test$2;
  var plugin$2 = {
    serialize: serialize$2,
    test: test$2
  };
  var _default$2g = plugin$2;
  Immutable.default = _default$2g;

  var ReactElement = {};

  var reactIs = {exports: {}};

  /** @license React v17.0.2
   * react-is.production.min.js
   *
   * Copyright (c) Facebook, Inc. and its affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   */

  if ("function" === typeof Symbol && Symbol.for) {
    var x = Symbol.for;
    x("react.element");
    x("react.portal");
    x("react.fragment");
    x("react.strict_mode");
    x("react.profiler");
    x("react.provider");
    x("react.context");
    x("react.forward_ref");
    x("react.suspense");
    x("react.suspense_list");
    x("react.memo");
    x("react.lazy");
    x("react.block");
    x("react.server.block");
    x("react.fundamental");
    x("react.debug_trace_mode");
    x("react.legacy_hidden");
  }

  var reactIs_development = {};

  /** @license React v17.0.2
   * react-is.development.js
   *
   * Copyright (c) Facebook, Inc. and its affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   */

  {
    (function () {
      // When adding new symbols to this file,
      // Please consider also adding to 'react-devtools-shared/src/backend/ReactSymbols'
      // The Symbol used to tag the ReactElement-like types. If there is no native Symbol
      // nor polyfill, then a plain number is used for performance.

      var REACT_ELEMENT_TYPE = 0xeac7;
      var REACT_PORTAL_TYPE = 0xeaca;
      var REACT_FRAGMENT_TYPE = 0xeacb;
      var REACT_STRICT_MODE_TYPE = 0xeacc;
      var REACT_PROFILER_TYPE = 0xead2;
      var REACT_PROVIDER_TYPE = 0xeacd;
      var REACT_CONTEXT_TYPE = 0xeace;
      var REACT_FORWARD_REF_TYPE = 0xead0;
      var REACT_SUSPENSE_TYPE = 0xead1;
      var REACT_SUSPENSE_LIST_TYPE = 0xead8;
      var REACT_MEMO_TYPE = 0xead3;
      var REACT_LAZY_TYPE = 0xead4;
      var REACT_BLOCK_TYPE = 0xead9;
      var REACT_SERVER_BLOCK_TYPE = 0xeada;
      var REACT_FUNDAMENTAL_TYPE = 0xead5;
      var REACT_DEBUG_TRACING_MODE_TYPE = 0xeae1;
      var REACT_LEGACY_HIDDEN_TYPE = 0xeae3;

      if (typeof Symbol === 'function' && Symbol.for) {
        var symbolFor = Symbol.for;
        REACT_ELEMENT_TYPE = symbolFor('react.element');
        REACT_PORTAL_TYPE = symbolFor('react.portal');
        REACT_FRAGMENT_TYPE = symbolFor('react.fragment');
        REACT_STRICT_MODE_TYPE = symbolFor('react.strict_mode');
        REACT_PROFILER_TYPE = symbolFor('react.profiler');
        REACT_PROVIDER_TYPE = symbolFor('react.provider');
        REACT_CONTEXT_TYPE = symbolFor('react.context');
        REACT_FORWARD_REF_TYPE = symbolFor('react.forward_ref');
        REACT_SUSPENSE_TYPE = symbolFor('react.suspense');
        REACT_SUSPENSE_LIST_TYPE = symbolFor('react.suspense_list');
        REACT_MEMO_TYPE = symbolFor('react.memo');
        REACT_LAZY_TYPE = symbolFor('react.lazy');
        REACT_BLOCK_TYPE = symbolFor('react.block');
        REACT_SERVER_BLOCK_TYPE = symbolFor('react.server.block');
        REACT_FUNDAMENTAL_TYPE = symbolFor('react.fundamental');
        symbolFor('react.scope');
        symbolFor('react.opaque.id');
        REACT_DEBUG_TRACING_MODE_TYPE = symbolFor('react.debug_trace_mode');
        symbolFor('react.offscreen');
        REACT_LEGACY_HIDDEN_TYPE = symbolFor('react.legacy_hidden');
      } // Filter certain DOM attributes (e.g. src, href) if their values are empty strings.


      var enableScopeAPI = false; // Experimental Create Event Handle API.

      function isValidElementType(type) {
        if (typeof type === 'string' || typeof type === 'function') {
          return true;
        } // Note: typeof might be other than 'symbol' or 'number' (e.g. if it's a polyfill).


        if (type === REACT_FRAGMENT_TYPE || type === REACT_PROFILER_TYPE || type === REACT_DEBUG_TRACING_MODE_TYPE || type === REACT_STRICT_MODE_TYPE || type === REACT_SUSPENSE_TYPE || type === REACT_SUSPENSE_LIST_TYPE || type === REACT_LEGACY_HIDDEN_TYPE || enableScopeAPI) {
          return true;
        }

        if (typeof type === 'object' && type !== null) {
          if (type.$$typeof === REACT_LAZY_TYPE || type.$$typeof === REACT_MEMO_TYPE || type.$$typeof === REACT_PROVIDER_TYPE || type.$$typeof === REACT_CONTEXT_TYPE || type.$$typeof === REACT_FORWARD_REF_TYPE || type.$$typeof === REACT_FUNDAMENTAL_TYPE || type.$$typeof === REACT_BLOCK_TYPE || type[0] === REACT_SERVER_BLOCK_TYPE) {
            return true;
          }
        }

        return false;
      }

      function typeOf(object) {
        if (typeof object === 'object' && object !== null) {
          var $$typeof = object.$$typeof;

          switch ($$typeof) {
            case REACT_ELEMENT_TYPE:
              var type = object.type;

              switch (type) {
                case REACT_FRAGMENT_TYPE:
                case REACT_PROFILER_TYPE:
                case REACT_STRICT_MODE_TYPE:
                case REACT_SUSPENSE_TYPE:
                case REACT_SUSPENSE_LIST_TYPE:
                  return type;

                default:
                  var $$typeofType = type && type.$$typeof;

                  switch ($$typeofType) {
                    case REACT_CONTEXT_TYPE:
                    case REACT_FORWARD_REF_TYPE:
                    case REACT_LAZY_TYPE:
                    case REACT_MEMO_TYPE:
                    case REACT_PROVIDER_TYPE:
                      return $$typeofType;

                    default:
                      return $$typeof;
                  }

              }

            case REACT_PORTAL_TYPE:
              return $$typeof;
          }
        }

        return undefined;
      }

      var ContextConsumer = REACT_CONTEXT_TYPE;
      var ContextProvider = REACT_PROVIDER_TYPE;
      var Element = REACT_ELEMENT_TYPE;
      var ForwardRef = REACT_FORWARD_REF_TYPE;
      var Fragment = REACT_FRAGMENT_TYPE;
      var Lazy = REACT_LAZY_TYPE;
      var Memo = REACT_MEMO_TYPE;
      var Portal = REACT_PORTAL_TYPE;
      var Profiler = REACT_PROFILER_TYPE;
      var StrictMode = REACT_STRICT_MODE_TYPE;
      var Suspense = REACT_SUSPENSE_TYPE;
      var hasWarnedAboutDeprecatedIsAsyncMode = false;
      var hasWarnedAboutDeprecatedIsConcurrentMode = false; // AsyncMode should be deprecated

      function isAsyncMode(object) {
        {
          if (!hasWarnedAboutDeprecatedIsAsyncMode) {
            hasWarnedAboutDeprecatedIsAsyncMode = true; // Using console['warn'] to evade Babel and ESLint

            console['warn']('The ReactIs.isAsyncMode() alias has been deprecated, ' + 'and will be removed in React 18+.');
          }
        }
        return false;
      }

      function isConcurrentMode(object) {
        {
          if (!hasWarnedAboutDeprecatedIsConcurrentMode) {
            hasWarnedAboutDeprecatedIsConcurrentMode = true; // Using console['warn'] to evade Babel and ESLint

            console['warn']('The ReactIs.isConcurrentMode() alias has been deprecated, ' + 'and will be removed in React 18+.');
          }
        }
        return false;
      }

      function isContextConsumer(object) {
        return typeOf(object) === REACT_CONTEXT_TYPE;
      }

      function isContextProvider(object) {
        return typeOf(object) === REACT_PROVIDER_TYPE;
      }

      function isElement(object) {
        return typeof object === 'object' && object !== null && object.$$typeof === REACT_ELEMENT_TYPE;
      }

      function isForwardRef(object) {
        return typeOf(object) === REACT_FORWARD_REF_TYPE;
      }

      function isFragment(object) {
        return typeOf(object) === REACT_FRAGMENT_TYPE;
      }

      function isLazy(object) {
        return typeOf(object) === REACT_LAZY_TYPE;
      }

      function isMemo(object) {
        return typeOf(object) === REACT_MEMO_TYPE;
      }

      function isPortal(object) {
        return typeOf(object) === REACT_PORTAL_TYPE;
      }

      function isProfiler(object) {
        return typeOf(object) === REACT_PROFILER_TYPE;
      }

      function isStrictMode(object) {
        return typeOf(object) === REACT_STRICT_MODE_TYPE;
      }

      function isSuspense(object) {
        return typeOf(object) === REACT_SUSPENSE_TYPE;
      }

      reactIs_development.ContextConsumer = ContextConsumer;
      reactIs_development.ContextProvider = ContextProvider;
      reactIs_development.Element = Element;
      reactIs_development.ForwardRef = ForwardRef;
      reactIs_development.Fragment = Fragment;
      reactIs_development.Lazy = Lazy;
      reactIs_development.Memo = Memo;
      reactIs_development.Portal = Portal;
      reactIs_development.Profiler = Profiler;
      reactIs_development.StrictMode = StrictMode;
      reactIs_development.Suspense = Suspense;
      reactIs_development.isAsyncMode = isAsyncMode;
      reactIs_development.isConcurrentMode = isConcurrentMode;
      reactIs_development.isContextConsumer = isContextConsumer;
      reactIs_development.isContextProvider = isContextProvider;
      reactIs_development.isElement = isElement;
      reactIs_development.isForwardRef = isForwardRef;
      reactIs_development.isFragment = isFragment;
      reactIs_development.isLazy = isLazy;
      reactIs_development.isMemo = isMemo;
      reactIs_development.isPortal = isPortal;
      reactIs_development.isProfiler = isProfiler;
      reactIs_development.isStrictMode = isStrictMode;
      reactIs_development.isSuspense = isSuspense;
      reactIs_development.isValidElementType = isValidElementType;
      reactIs_development.typeOf = typeOf;
    })();
  }

  {
    reactIs.exports = reactIs_development;
  }

  Object.defineProperty(ReactElement, '__esModule', {
    value: true
  });
  ReactElement.test = ReactElement.serialize = ReactElement.default = void 0;

  var ReactIs = _interopRequireWildcard(reactIs.exports);

  var _markup$1 = markup;

  function _getRequireWildcardCache(nodeInterop) {
    if (typeof WeakMap !== 'function') return null;
    var cacheBabelInterop = new WeakMap();
    var cacheNodeInterop = new WeakMap();
    return (_getRequireWildcardCache = function _getRequireWildcardCache(nodeInterop) {
      return nodeInterop ? cacheNodeInterop : cacheBabelInterop;
    })(nodeInterop);
  }

  function _interopRequireWildcard(obj, nodeInterop) {
    if (!nodeInterop && obj && obj.__esModule) {
      return obj;
    }

    if (obj === null || typeof obj !== 'object' && typeof obj !== 'function') {
      return {
        default: obj
      };
    }

    var cache = _getRequireWildcardCache(nodeInterop);

    if (cache && cache.has(obj)) {
      return cache.get(obj);
    }

    var newObj = {};
    var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor;

    for (var key in obj) {
      if (key !== 'default' && Object.prototype.hasOwnProperty.call(obj, key)) {
        var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null;

        if (desc && (desc.get || desc.set)) {
          Object.defineProperty(newObj, key, desc);
        } else {
          newObj[key] = obj[key];
        }
      }
    }

    newObj.default = obj;

    if (cache) {
      cache.set(obj, newObj);
    }

    return newObj;
  }
  /**
   * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   */
  // Given element.props.children, or subtree during recursive traversal,
  // return flattened array of children.


  var getChildren = function getChildren(arg, children) {
    if (children === void 0) {
      children = [];
    }

    if (Array.isArray(arg)) {
      arg.forEach(function (item) {
        getChildren(item, children);
      });
    } else if (arg != null && arg !== false) {
      children.push(arg);
    }

    return children;
  };

  var getType = function getType(element) {
    var type = element.type;

    if (typeof type === 'string') {
      return type;
    }

    if (typeof type === 'function') {
      return type.displayName || type.name || 'Unknown';
    }

    if (ReactIs.isFragment(element)) {
      return 'React.Fragment';
    }

    if (ReactIs.isSuspense(element)) {
      return 'React.Suspense';
    }

    if (typeof type === 'object' && type !== null) {
      if (ReactIs.isContextProvider(element)) {
        return 'Context.Provider';
      }

      if (ReactIs.isContextConsumer(element)) {
        return 'Context.Consumer';
      }

      if (ReactIs.isForwardRef(element)) {
        if (type.displayName) {
          return type.displayName;
        }

        var functionName = type.render.displayName || type.render.name || '';
        return functionName !== '' ? 'ForwardRef(' + functionName + ')' : 'ForwardRef';
      }

      if (ReactIs.isMemo(element)) {
        var _functionName = type.displayName || type.type.displayName || type.type.name || '';

        return _functionName !== '' ? 'Memo(' + _functionName + ')' : 'Memo';
      }
    }

    return 'UNDEFINED';
  };

  var getPropKeys$1 = function getPropKeys(element) {
    var props = element.props;
    return Object.keys(props).filter(function (key) {
      return key !== 'children' && props[key] !== undefined;
    }).sort();
  };

  var serialize$1 = function serialize(element, config, indentation, depth, refs, printer) {
    return ++depth > config.maxDepth ? (0, _markup$1.printElementAsLeaf)(getType(element), config) : (0, _markup$1.printElement)(getType(element), (0, _markup$1.printProps)(getPropKeys$1(element), element.props, config, indentation + config.indent, depth, refs, printer), (0, _markup$1.printChildren)(getChildren(element.props.children), config, indentation + config.indent, depth, refs, printer), config, indentation);
  };

  ReactElement.serialize = serialize$1;

  var test$1 = function test(val) {
    return val != null && ReactIs.isElement(val);
  };

  ReactElement.test = test$1;
  var plugin$1 = {
    serialize: serialize$1,
    test: test$1
  };
  var _default$2f = plugin$1;
  ReactElement.default = _default$2f;

  var ReactTestComponent = {};

  Object.defineProperty(ReactTestComponent, '__esModule', {
    value: true
  });
  ReactTestComponent.test = ReactTestComponent.serialize = ReactTestComponent.default = void 0;
  var _markup = markup;

  var global$1 = function () {
    if (typeof globalThis !== 'undefined') {
      return globalThis;
    } else if (typeof global$1 !== 'undefined') {
      return global$1;
    } else if (typeof self !== 'undefined') {
      return self;
    } else if (typeof window !== 'undefined') {
      return window;
    } else {
      return Function('return this')();
    }
  }();

  var Symbol$1 = global$1['jest-symbol-do-not-touch'] || global$1.Symbol;
  var testSymbol = typeof Symbol$1 === 'function' && Symbol$1.for ? Symbol$1.for('react.test.json') : 0xea71357;

  var getPropKeys = function getPropKeys(object) {
    var props = object.props;
    return props ? Object.keys(props).filter(function (key) {
      return props[key] !== undefined;
    }).sort() : [];
  };

  var serialize = function serialize(object, config, indentation, depth, refs, printer) {
    return ++depth > config.maxDepth ? (0, _markup.printElementAsLeaf)(object.type, config) : (0, _markup.printElement)(object.type, object.props ? (0, _markup.printProps)(getPropKeys(object), object.props, config, indentation + config.indent, depth, refs, printer) : '', object.children ? (0, _markup.printChildren)(object.children, config, indentation + config.indent, depth, refs, printer) : '', config, indentation);
  };

  ReactTestComponent.serialize = serialize;

  var test = function test(val) {
    return val && val.$$typeof === testSymbol;
  };

  ReactTestComponent.test = test;
  var plugin = {
    serialize: serialize,
    test: test
  };
  var _default$2e = plugin;
  ReactTestComponent.default = _default$2e;

  Object.defineProperty(build, '__esModule', {
    value: true
  });
  var default_1 = build.default = DEFAULT_OPTIONS_1 = build.DEFAULT_OPTIONS = void 0;
  var format_1 = build.format = format;
  var plugins_1 = build.plugins = void 0;

  var _ansiStyles = _interopRequireDefault$7(ansiStyles.exports);

  var _collections = collections;

  var _AsymmetricMatcher = _interopRequireDefault$7(AsymmetricMatcher);

  var _ConvertAnsi = _interopRequireDefault$7(ConvertAnsi);

  var _DOMCollection = _interopRequireDefault$7(DOMCollection$1);

  var _DOMElement = _interopRequireDefault$7(DOMElement);

  var _Immutable = _interopRequireDefault$7(Immutable);

  var _ReactElement = _interopRequireDefault$7(ReactElement);

  var _ReactTestComponent = _interopRequireDefault$7(ReactTestComponent);

  function _interopRequireDefault$7(obj) {
    return obj && obj.__esModule ? obj : {
      default: obj
    };
  }
  /**
   * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   */

  /* eslint-disable local/ban-types-eventually */


  var toString = Object.prototype.toString;
  var toISOString = Date.prototype.toISOString;
  var errorToString = Error.prototype.toString;
  var regExpToString = RegExp.prototype.toString;
  /**
   * Explicitly comparing typeof constructor to function avoids undefined as name
   * when mock identity-obj-proxy returns the key as the value for any key.
   */

  var getConstructorName = function getConstructorName(val) {
    return typeof val.constructor === 'function' && val.constructor.name || 'Object';
  };
  /* global window */

  /** Is val is equal to global window object? Works even if it does not exist :) */


  var isWindow = function isWindow(val) {
    return typeof window !== 'undefined' && val === window;
  };

  var SYMBOL_REGEXP = /^Symbol\((.*)\)(.*)$/;
  var NEWLINE_REGEXP = /\n/gi;

  var PrettyFormatPluginError = /*#__PURE__*/function (_Error) {
    _inheritsLoose(PrettyFormatPluginError, _Error);

    function PrettyFormatPluginError(message, stack) {
      var _this;

      _this = _Error.call(this, message) || this;
      _this.stack = stack;
      _this.name = _this.constructor.name;
      return _this;
    }

    return PrettyFormatPluginError;
  }( /*#__PURE__*/_wrapNativeSuper(Error));

  function isToStringedArrayType(toStringed) {
    return toStringed === '[object Array]' || toStringed === '[object ArrayBuffer]' || toStringed === '[object DataView]' || toStringed === '[object Float32Array]' || toStringed === '[object Float64Array]' || toStringed === '[object Int8Array]' || toStringed === '[object Int16Array]' || toStringed === '[object Int32Array]' || toStringed === '[object Uint8Array]' || toStringed === '[object Uint8ClampedArray]' || toStringed === '[object Uint16Array]' || toStringed === '[object Uint32Array]';
  }

  function printNumber(val) {
    return Object.is(val, -0) ? '-0' : String(val);
  }

  function printBigInt(val) {
    return String(val + "n");
  }

  function printFunction(val, printFunctionName) {
    if (!printFunctionName) {
      return '[Function]';
    }

    return '[Function ' + (val.name || 'anonymous') + ']';
  }

  function printSymbol(val) {
    return String(val).replace(SYMBOL_REGEXP, 'Symbol($1)');
  }

  function printError(val) {
    return '[' + errorToString.call(val) + ']';
  }
  /**
   * The first port of call for printing an object, handles most of the
   * data-types in JS.
   */


  function printBasicValue(val, printFunctionName, escapeRegex, escapeString) {
    if (val === true || val === false) {
      return '' + val;
    }

    if (val === undefined) {
      return 'undefined';
    }

    if (val === null) {
      return 'null';
    }

    var typeOf = typeof val;

    if (typeOf === 'number') {
      return printNumber(val);
    }

    if (typeOf === 'bigint') {
      return printBigInt(val);
    }

    if (typeOf === 'string') {
      if (escapeString) {
        return '"' + val.replace(/"|\\/g, '\\$&') + '"';
      }

      return '"' + val + '"';
    }

    if (typeOf === 'function') {
      return printFunction(val, printFunctionName);
    }

    if (typeOf === 'symbol') {
      return printSymbol(val);
    }

    var toStringed = toString.call(val);

    if (toStringed === '[object WeakMap]') {
      return 'WeakMap {}';
    }

    if (toStringed === '[object WeakSet]') {
      return 'WeakSet {}';
    }

    if (toStringed === '[object Function]' || toStringed === '[object GeneratorFunction]') {
      return printFunction(val, printFunctionName);
    }

    if (toStringed === '[object Symbol]') {
      return printSymbol(val);
    }

    if (toStringed === '[object Date]') {
      return isNaN(+val) ? 'Date { NaN }' : toISOString.call(val);
    }

    if (toStringed === '[object Error]') {
      return printError(val);
    }

    if (toStringed === '[object RegExp]') {
      if (escapeRegex) {
        // https://github.com/benjamingr/RegExp.escape/blob/main/polyfill.js
        return regExpToString.call(val).replace(/[\\^$*+?.()|[\]{}]/g, '\\$&');
      }

      return regExpToString.call(val);
    }

    if (val instanceof Error) {
      return printError(val);
    }

    return null;
  }
  /**
   * Handles more complex objects ( such as objects with circular references.
   * maps and sets etc )
   */


  function printComplexValue(val, config, indentation, depth, refs, hasCalledToJSON) {
    if (refs.indexOf(val) !== -1) {
      return '[Circular]';
    }

    refs = refs.slice();
    refs.push(val);
    var hitMaxDepth = ++depth > config.maxDepth;
    var min = config.min;

    if (config.callToJSON && !hitMaxDepth && val.toJSON && typeof val.toJSON === 'function' && !hasCalledToJSON) {
      return printer(val.toJSON(), config, indentation, depth, refs, true);
    }

    var toStringed = toString.call(val);

    if (toStringed === '[object Arguments]') {
      return hitMaxDepth ? '[Arguments]' : (min ? '' : 'Arguments ') + '[' + (0, _collections.printListItems)(val, config, indentation, depth, refs, printer) + ']';
    }

    if (isToStringedArrayType(toStringed)) {
      return hitMaxDepth ? '[' + val.constructor.name + ']' : (min ? '' : !config.printBasicPrototype && val.constructor.name === 'Array' ? '' : val.constructor.name + ' ') + '[' + (0, _collections.printListItems)(val, config, indentation, depth, refs, printer) + ']';
    }

    if (toStringed === '[object Map]') {
      return hitMaxDepth ? '[Map]' : 'Map {' + (0, _collections.printIteratorEntries)(val.entries(), config, indentation, depth, refs, printer, ' => ') + '}';
    }

    if (toStringed === '[object Set]') {
      return hitMaxDepth ? '[Set]' : 'Set {' + (0, _collections.printIteratorValues)(val.values(), config, indentation, depth, refs, printer) + '}';
    } // Avoid failure to serialize global window object in jsdom test environment.
    // For example, not even relevant if window is prop of React element.


    return hitMaxDepth || isWindow(val) ? '[' + getConstructorName(val) + ']' : (min ? '' : !config.printBasicPrototype && getConstructorName(val) === 'Object' ? '' : getConstructorName(val) + ' ') + '{' + (0, _collections.printObjectProperties)(val, config, indentation, depth, refs, printer) + '}';
  }

  function isNewPlugin(plugin) {
    return plugin.serialize != null;
  }

  function printPlugin(plugin, val, config, indentation, depth, refs) {
    var printed;

    try {
      printed = isNewPlugin(plugin) ? plugin.serialize(val, config, indentation, depth, refs, printer) : plugin.print(val, function (valChild) {
        return printer(valChild, config, indentation, depth, refs);
      }, function (str) {
        var indentationNext = indentation + config.indent;
        return indentationNext + str.replace(NEWLINE_REGEXP, '\n' + indentationNext);
      }, {
        edgeSpacing: config.spacingOuter,
        min: config.min,
        spacing: config.spacingInner
      }, config.colors);
    } catch (error) {
      throw new PrettyFormatPluginError(error.message, error.stack);
    }

    if (typeof printed !== 'string') {
      throw new Error("pretty-format: Plugin must return type \"string\" but instead returned \"" + typeof printed + "\".");
    }

    return printed;
  }

  function findPlugin(plugins, val) {
    for (var p = 0; p < plugins.length; p++) {
      try {
        if (plugins[p].test(val)) {
          return plugins[p];
        }
      } catch (error) {
        throw new PrettyFormatPluginError(error.message, error.stack);
      }
    }

    return null;
  }

  function printer(val, config, indentation, depth, refs, hasCalledToJSON) {
    var plugin = findPlugin(config.plugins, val);

    if (plugin !== null) {
      return printPlugin(plugin, val, config, indentation, depth, refs);
    }

    var basicResult = printBasicValue(val, config.printFunctionName, config.escapeRegex, config.escapeString);

    if (basicResult !== null) {
      return basicResult;
    }

    return printComplexValue(val, config, indentation, depth, refs, hasCalledToJSON);
  }

  var DEFAULT_THEME = {
    comment: 'gray',
    content: 'reset',
    prop: 'yellow',
    tag: 'cyan',
    value: 'green'
  };
  var DEFAULT_THEME_KEYS = Object.keys(DEFAULT_THEME);
  var DEFAULT_OPTIONS = {
    callToJSON: true,
    compareKeys: undefined,
    escapeRegex: false,
    escapeString: true,
    highlight: false,
    indent: 2,
    maxDepth: Infinity,
    min: false,
    plugins: [],
    printBasicPrototype: true,
    printFunctionName: true,
    theme: DEFAULT_THEME
  };
  var DEFAULT_OPTIONS_1 = build.DEFAULT_OPTIONS = DEFAULT_OPTIONS;

  function validateOptions(options) {
    Object.keys(options).forEach(function (key) {
      if (!DEFAULT_OPTIONS.hasOwnProperty(key)) {
        throw new Error("pretty-format: Unknown option \"" + key + "\".");
      }
    });

    if (options.min && options.indent !== undefined && options.indent !== 0) {
      throw new Error('pretty-format: Options "min" and "indent" cannot be used together.');
    }

    if (options.theme !== undefined) {
      if (options.theme === null) {
        throw new Error('pretty-format: Option "theme" must not be null.');
      }

      if (typeof options.theme !== 'object') {
        throw new Error("pretty-format: Option \"theme\" must be of type \"object\" but instead received \"" + typeof options.theme + "\".");
      }
    }
  }

  var getColorsHighlight = function getColorsHighlight(options) {
    return DEFAULT_THEME_KEYS.reduce(function (colors, key) {
      var value = options.theme && options.theme[key] !== undefined ? options.theme[key] : DEFAULT_THEME[key];
      var color = value && _ansiStyles.default[value];

      if (color && typeof color.close === 'string' && typeof color.open === 'string') {
        colors[key] = color;
      } else {
        throw new Error("pretty-format: Option \"theme\" has a key \"" + key + "\" whose value \"" + value + "\" is undefined in ansi-styles.");
      }

      return colors;
    }, Object.create(null));
  };

  var getColorsEmpty = function getColorsEmpty() {
    return DEFAULT_THEME_KEYS.reduce(function (colors, key) {
      colors[key] = {
        close: '',
        open: ''
      };
      return colors;
    }, Object.create(null));
  };

  var getPrintFunctionName = function getPrintFunctionName(options) {
    return options && options.printFunctionName !== undefined ? options.printFunctionName : DEFAULT_OPTIONS.printFunctionName;
  };

  var getEscapeRegex = function getEscapeRegex(options) {
    return options && options.escapeRegex !== undefined ? options.escapeRegex : DEFAULT_OPTIONS.escapeRegex;
  };

  var getEscapeString = function getEscapeString(options) {
    return options && options.escapeString !== undefined ? options.escapeString : DEFAULT_OPTIONS.escapeString;
  };

  var getConfig$1 = function getConfig(options) {
    var _options$printBasicPr;

    return {
      callToJSON: options && options.callToJSON !== undefined ? options.callToJSON : DEFAULT_OPTIONS.callToJSON,
      colors: options && options.highlight ? getColorsHighlight(options) : getColorsEmpty(),
      compareKeys: options && typeof options.compareKeys === 'function' ? options.compareKeys : DEFAULT_OPTIONS.compareKeys,
      escapeRegex: getEscapeRegex(options),
      escapeString: getEscapeString(options),
      indent: options && options.min ? '' : createIndent(options && options.indent !== undefined ? options.indent : DEFAULT_OPTIONS.indent),
      maxDepth: options && options.maxDepth !== undefined ? options.maxDepth : DEFAULT_OPTIONS.maxDepth,
      min: options && options.min !== undefined ? options.min : DEFAULT_OPTIONS.min,
      plugins: options && options.plugins !== undefined ? options.plugins : DEFAULT_OPTIONS.plugins,
      printBasicPrototype: (_options$printBasicPr = options === null || options === void 0 ? void 0 : options.printBasicPrototype) !== null && _options$printBasicPr !== void 0 ? _options$printBasicPr : true,
      printFunctionName: getPrintFunctionName(options),
      spacingInner: options && options.min ? ' ' : '\n',
      spacingOuter: options && options.min ? '' : '\n'
    };
  };

  function createIndent(indent) {
    return new Array(indent + 1).join(' ');
  }
  /**
   * Returns a presentation string of your `val` object
   * @param val any potential JavaScript object
   * @param options Custom settings
   */


  function format(val, options) {
    if (options) {
      validateOptions(options);

      if (options.plugins) {
        var plugin = findPlugin(options.plugins, val);

        if (plugin !== null) {
          return printPlugin(plugin, val, getConfig$1(options), '', 0, []);
        }
      }
    }

    var basicResult = printBasicValue(val, getPrintFunctionName(options), getEscapeRegex(options), getEscapeString(options));

    if (basicResult !== null) {
      return basicResult;
    }

    return printComplexValue(val, getConfig$1(options), '', 0, []);
  }

  var plugins = {
    AsymmetricMatcher: _AsymmetricMatcher.default,
    ConvertAnsi: _ConvertAnsi.default,
    DOMCollection: _DOMCollection.default,
    DOMElement: _DOMElement.default,
    Immutable: _Immutable.default,
    ReactElement: _ReactElement.default,
    ReactTestComponent: _ReactTestComponent.default
  };
  plugins_1 = build.plugins = plugins;
  var _default$2d = format;
  default_1 = build.default = _default$2d;

  var index = /*#__PURE__*/_mergeNamespaces({
    __proto__: null,
    get DEFAULT_OPTIONS () { return DEFAULT_OPTIONS_1; },
    format: format_1,
    get plugins () { return plugins_1; },
    get default () { return default_1; }
  }, [build]);

  /**
   * @source {https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/from#Polyfill}
   * but without thisArg (too hard to type, no need to `this`)
   */
  var toStr = Object.prototype.toString;

  function isCallable(fn) {
    return typeof fn === "function" || toStr.call(fn) === "[object Function]";
  }

  function toInteger(value) {
    var number = Number(value);

    if (isNaN(number)) {
      return 0;
    }

    if (number === 0 || !isFinite(number)) {
      return number;
    }

    return (number > 0 ? 1 : -1) * Math.floor(Math.abs(number));
  }

  var maxSafeInteger = Math.pow(2, 53) - 1;

  function toLength(value) {
    var len = toInteger(value);
    return Math.min(Math.max(len, 0), maxSafeInteger);
  }
  /**
   * Creates an array from an iterable object.
   * @param iterable An iterable object to convert to an array.
   */

  /**
   * Creates an array from an iterable object.
   * @param iterable An iterable object to convert to an array.
   * @param mapfn A mapping function to call on every element of the array.
   * @param thisArg Value of 'this' used to invoke the mapfn.
   */


  function arrayFrom(arrayLike, mapFn) {
    // 1. Let C be the this value.
    // edit(@eps1lon): we're not calling it as Array.from
    var C = Array; // 2. Let items be ToObject(arrayLike).

    var items = Object(arrayLike); // 3. ReturnIfAbrupt(items).

    if (arrayLike == null) {
      throw new TypeError("Array.from requires an array-like object - not null or undefined");
    } // 4. If mapfn is undefined, then let mapping be false.
    // const mapFn = arguments.length > 1 ? arguments[1] : void undefined;


    if (typeof mapFn !== "undefined") {
      // 5. else
      // 5. a If IsCallable(mapfn) is false, throw a TypeError exception.
      if (!isCallable(mapFn)) {
        throw new TypeError("Array.from: when provided, the second argument must be a function");
      }
    } // 10. Let lenValue be Get(items, "length").
    // 11. Let len be ToLength(lenValue).


    var len = toLength(items.length); // 13. If IsConstructor(C) is true, then
    // 13. a. Let A be the result of calling the [[Construct]] internal method
    // of C with an argument list containing the single item len.
    // 14. a. Else, Let A be ArrayCreate(len).

    var A = isCallable(C) ? Object(new C(len)) : new Array(len); // 16. Let k be 0.

    var k = 0; // 17. Repeat, while k < len… (also steps a - h)

    var kValue;

    while (k < len) {
      kValue = items[k];

      if (mapFn) {
        A[k] = mapFn(kValue, k);
      } else {
        A[k] = kValue;
      }

      k += 1;
    } // 18. Let putStatus be Put(A, "length", len, true).


    A.length = len; // 20. Return A.

    return A;
  }

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  function _defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  function _createClass(Constructor, protoProps, staticProps) {
    if (protoProps) _defineProperties(Constructor.prototype, protoProps);
    if (staticProps) _defineProperties(Constructor, staticProps);
    Object.defineProperty(Constructor, "prototype", {
      writable: false
    });
    return Constructor;
  }

  function _defineProperty$1(obj, key, value) {
    if (key in obj) {
      Object.defineProperty(obj, key, {
        value: value,
        enumerable: true,
        configurable: true,
        writable: true
      });
    } else {
      obj[key] = value;
    }

    return obj;
  } // for environments without Set we fallback to arrays with unique members


  var SetLike = /*#__PURE__*/function () {
    function SetLike() {
      var items = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];

      _classCallCheck(this, SetLike);

      _defineProperty$1(this, "items", void 0);

      this.items = items;
    }

    _createClass(SetLike, [{
      key: "add",
      value: function add(value) {
        if (this.has(value) === false) {
          this.items.push(value);
        }

        return this;
      }
    }, {
      key: "clear",
      value: function clear() {
        this.items = [];
      }
    }, {
      key: "delete",
      value: function _delete(value) {
        var previousLength = this.items.length;
        this.items = this.items.filter(function (item) {
          return item !== value;
        });
        return previousLength !== this.items.length;
      }
    }, {
      key: "forEach",
      value: function forEach(callbackfn) {
        var _this = this;

        this.items.forEach(function (item) {
          callbackfn(item, item, _this);
        });
      }
    }, {
      key: "has",
      value: function has(value) {
        return this.items.indexOf(value) !== -1;
      }
    }, {
      key: "size",
      get: function get() {
        return this.items.length;
      }
    }]);

    return SetLike;
  }();

  var SetLike$1 = typeof Set === "undefined" ? Set : SetLike;

  // https://w3c.github.io/html-aria/#document-conformance-requirements-for-use-of-aria-attributes-in-html

  /**
   * Safe Element.localName for all supported environments
   * @param element
   */
  function getLocalName(element) {
    var _element$localName;

    return (// eslint-disable-next-line no-restricted-properties -- actual guard for environments without localName
      (_element$localName = element.localName) !== null && _element$localName !== void 0 ? _element$localName : // eslint-disable-next-line no-restricted-properties -- required for the fallback
      element.tagName.toLowerCase()
    );
  }
  var localNameToRoleMappings = {
    article: "article",
    aside: "complementary",
    button: "button",
    datalist: "listbox",
    dd: "definition",
    details: "group",
    dialog: "dialog",
    dt: "term",
    fieldset: "group",
    figure: "figure",
    // WARNING: Only with an accessible name
    form: "form",
    footer: "contentinfo",
    h1: "heading",
    h2: "heading",
    h3: "heading",
    h4: "heading",
    h5: "heading",
    h6: "heading",
    header: "banner",
    hr: "separator",
    html: "document",
    legend: "legend",
    li: "listitem",
    math: "math",
    main: "main",
    menu: "list",
    nav: "navigation",
    ol: "list",
    optgroup: "group",
    // WARNING: Only in certain context
    option: "option",
    output: "status",
    progress: "progressbar",
    // WARNING: Only with an accessible name
    section: "region",
    summary: "button",
    table: "table",
    tbody: "rowgroup",
    textarea: "textbox",
    tfoot: "rowgroup",
    // WARNING: Only in certain context
    td: "cell",
    th: "columnheader",
    thead: "rowgroup",
    tr: "row",
    ul: "list"
  };
  var prohibitedAttributes = {
    caption: new Set(["aria-label", "aria-labelledby"]),
    code: new Set(["aria-label", "aria-labelledby"]),
    deletion: new Set(["aria-label", "aria-labelledby"]),
    emphasis: new Set(["aria-label", "aria-labelledby"]),
    generic: new Set(["aria-label", "aria-labelledby", "aria-roledescription"]),
    insertion: new Set(["aria-label", "aria-labelledby"]),
    paragraph: new Set(["aria-label", "aria-labelledby"]),
    presentation: new Set(["aria-label", "aria-labelledby"]),
    strong: new Set(["aria-label", "aria-labelledby"]),
    subscript: new Set(["aria-label", "aria-labelledby"]),
    superscript: new Set(["aria-label", "aria-labelledby"])
  };
  /**
   *
   * @param element
   * @param role The role used for this element. This is specified to control whether you want to use the implicit or explicit role.
   */

  function hasGlobalAriaAttributes(element, role) {
    // https://rawgit.com/w3c/aria/stable/#global_states
    // commented attributes are deprecated
    return ["aria-atomic", "aria-busy", "aria-controls", "aria-current", "aria-describedby", "aria-details", // "disabled",
    "aria-dropeffect", // "errormessage",
    "aria-flowto", "aria-grabbed", // "haspopup",
    "aria-hidden", // "invalid",
    "aria-keyshortcuts", "aria-label", "aria-labelledby", "aria-live", "aria-owns", "aria-relevant", "aria-roledescription"].some(function (attributeName) {
      var _prohibitedAttributes;

      return element.hasAttribute(attributeName) && !((_prohibitedAttributes = prohibitedAttributes[role]) !== null && _prohibitedAttributes !== void 0 && _prohibitedAttributes.has(attributeName));
    });
  }

  function ignorePresentationalRole(element, implicitRole) {
    // https://rawgit.com/w3c/aria/stable/#conflict_resolution_presentation_none
    return hasGlobalAriaAttributes(element, implicitRole);
  }

  function getRole(element) {
    var explicitRole = getExplicitRole(element);

    if (explicitRole === null || explicitRole === "presentation") {
      var implicitRole = getImplicitRole(element);

      if (explicitRole !== "presentation" || ignorePresentationalRole(element, implicitRole || "")) {
        return implicitRole;
      }
    }

    return explicitRole;
  }

  function getImplicitRole(element) {
    var mappedByTag = localNameToRoleMappings[getLocalName(element)];

    if (mappedByTag !== undefined) {
      return mappedByTag;
    }

    switch (getLocalName(element)) {
      case "a":
      case "area":
      case "link":
        if (element.hasAttribute("href")) {
          return "link";
        }

        break;

      case "img":
        if (element.getAttribute("alt") === "" && !ignorePresentationalRole(element, "img")) {
          return "presentation";
        }

        return "img";

      case "input":
        {
          var _ref = element,
              type = _ref.type;

          switch (type) {
            case "button":
            case "image":
            case "reset":
            case "submit":
              return "button";

            case "checkbox":
            case "radio":
              return type;

            case "range":
              return "slider";

            case "email":
            case "tel":
            case "text":
            case "url":
              if (element.hasAttribute("list")) {
                return "combobox";
              }

              return "textbox";

            case "search":
              if (element.hasAttribute("list")) {
                return "combobox";
              }

              return "searchbox";

            case "number":
              return "spinbutton";

            default:
              return null;
          }
        }

      case "select":
        if (element.hasAttribute("multiple") || element.size > 1) {
          return "listbox";
        }

        return "combobox";
    }

    return null;
  }

  function getExplicitRole(element) {
    var role = element.getAttribute("role");

    if (role !== null) {
      var explicitRole = role.trim().split(" ")[0]; // String.prototype.split(sep, limit) will always return an array with at least one member
      // as long as limit is either undefined or > 0

      if (explicitRole.length > 0) {
        return explicitRole;
      }
    }

    return null;
  }

  function isElement(node) {
    return node !== null && node.nodeType === node.ELEMENT_NODE;
  }
  function isHTMLTableCaptionElement(node) {
    return isElement(node) && getLocalName(node) === "caption";
  }
  function isHTMLInputElement(node) {
    return isElement(node) && getLocalName(node) === "input";
  }
  function isHTMLOptGroupElement(node) {
    return isElement(node) && getLocalName(node) === "optgroup";
  }
  function isHTMLSelectElement(node) {
    return isElement(node) && getLocalName(node) === "select";
  }
  function isHTMLTableElement(node) {
    return isElement(node) && getLocalName(node) === "table";
  }
  function isHTMLTextAreaElement(node) {
    return isElement(node) && getLocalName(node) === "textarea";
  }
  function safeWindow(node) {
    var _ref = node.ownerDocument === null ? node : node.ownerDocument,
        defaultView = _ref.defaultView;

    if (defaultView === null) {
      throw new TypeError("no window available");
    }

    return defaultView;
  }
  function isHTMLFieldSetElement(node) {
    return isElement(node) && getLocalName(node) === "fieldset";
  }
  function isHTMLLegendElement(node) {
    return isElement(node) && getLocalName(node) === "legend";
  }
  function isHTMLSlotElement(node) {
    return isElement(node) && getLocalName(node) === "slot";
  }
  function isSVGElement(node) {
    return isElement(node) && node.ownerSVGElement !== undefined;
  }
  function isSVGSVGElement(node) {
    return isElement(node) && getLocalName(node) === "svg";
  }
  function isSVGTitleElement(node) {
    return isSVGElement(node) && getLocalName(node) === "title";
  }
  /**
   *
   * @param {Node} node -
   * @param {string} attributeName -
   * @returns {Element[]} -
   */

  function queryIdRefs(node, attributeName) {
    if (isElement(node) && node.hasAttribute(attributeName)) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- safe due to hasAttribute check
      var ids = node.getAttribute(attributeName).split(" ");
      return ids.map(function (id) {
        return node.ownerDocument.getElementById(id);
      }).filter(function (element) {
        return element !== null;
      } // TODO: why does this not narrow?
      );
    }

    return [];
  }
  function hasAnyConcreteRoles(node, roles) {
    if (isElement(node)) {
      return roles.indexOf(getRole(node)) !== -1;
    }

    return false;
  }

  /**
   * implements https://w3c.github.io/accname/
   */
  /**
   *  A string of characters where all carriage returns, newlines, tabs, and form-feeds are replaced with a single space, and multiple spaces are reduced to a single space. The string contains only character data; it does not contain any markup.
   */

  /**
   *
   * @param {string} string -
   * @returns {FlatString} -
   */

  function asFlatString(s) {
    return s.trim().replace(/\s\s+/g, " ");
  }
  /**
   *
   * @param node -
   * @param options - These are not optional to prevent accidentally calling it without options in `computeAccessibleName`
   * @returns {boolean} -
   */


  function isHidden(node, getComputedStyleImplementation) {
    if (!isElement(node)) {
      return false;
    }

    if (node.hasAttribute("hidden") || node.getAttribute("aria-hidden") === "true") {
      return true;
    }

    var style = getComputedStyleImplementation(node);
    return style.getPropertyValue("display") === "none" || style.getPropertyValue("visibility") === "hidden";
  }
  /**
   * @param {Node} node -
   * @returns {boolean} - As defined in step 2E of https://w3c.github.io/accname/#mapping_additional_nd_te
   */


  function isControl(node) {
    return hasAnyConcreteRoles(node, ["button", "combobox", "listbox", "textbox"]) || hasAbstractRole(node, "range");
  }

  function hasAbstractRole(node, role) {
    if (!isElement(node)) {
      return false;
    }

    switch (role) {
      case "range":
        return hasAnyConcreteRoles(node, ["meter", "progressbar", "scrollbar", "slider", "spinbutton"]);

      default:
        throw new TypeError("No knowledge about abstract role '".concat(role, "'. This is likely a bug :("));
    }
  }
  /**
   * element.querySelectorAll but also considers owned tree
   * @param element
   * @param selectors
   */


  function querySelectorAllSubtree(element, selectors) {
    var elements = arrayFrom(element.querySelectorAll(selectors));
    queryIdRefs(element, "aria-owns").forEach(function (root) {
      // babel transpiles this assuming an iterator
      elements.push.apply(elements, arrayFrom(root.querySelectorAll(selectors)));
    });
    return elements;
  }

  function querySelectedOptions(listbox) {
    if (isHTMLSelectElement(listbox)) {
      // IE11 polyfill
      return listbox.selectedOptions || querySelectorAllSubtree(listbox, "[selected]");
    }

    return querySelectorAllSubtree(listbox, '[aria-selected="true"]');
  }

  function isMarkedPresentational(node) {
    return hasAnyConcreteRoles(node, ["none", "presentation"]);
  }
  /**
   * Elements specifically listed in html-aam
   *
   * We don't need this for `label` or `legend` elements.
   * Their implicit roles already allow "naming from content".
   *
   * sources:
   *
   * - https://w3c.github.io/html-aam/#table-element
   */


  function isNativeHostLanguageTextAlternativeElement(node) {
    return isHTMLTableCaptionElement(node);
  }
  /**
   * https://w3c.github.io/aria/#namefromcontent
   */


  function allowsNameFromContent(node) {
    return hasAnyConcreteRoles(node, ["button", "cell", "checkbox", "columnheader", "gridcell", "heading", "label", "legend", "link", "menuitem", "menuitemcheckbox", "menuitemradio", "option", "radio", "row", "rowheader", "switch", "tab", "tooltip", "treeitem"]);
  }
  /**
   * TODO https://github.com/eps1lon/dom-accessibility-api/issues/100
   */


  function isDescendantOfNativeHostLanguageTextAlternativeElement( // eslint-disable-next-line @typescript-eslint/no-unused-vars -- not implemented yet
  node) {
    return false;
  }

  function getValueOfTextbox(element) {
    if (isHTMLInputElement(element) || isHTMLTextAreaElement(element)) {
      return element.value;
    } // https://github.com/eps1lon/dom-accessibility-api/issues/4


    return element.textContent || "";
  }

  function getTextualContent(declaration) {
    var content = declaration.getPropertyValue("content");

    if (/^["'].*["']$/.test(content)) {
      return content.slice(1, -1);
    }

    return "";
  }
  /**
   * https://html.spec.whatwg.org/multipage/forms.html#category-label
   * TODO: form-associated custom elements
   * @param element
   */


  function isLabelableElement(element) {
    var localName = getLocalName(element);
    return localName === "button" || localName === "input" && element.getAttribute("type") !== "hidden" || localName === "meter" || localName === "output" || localName === "progress" || localName === "select" || localName === "textarea";
  }
  /**
   * > [...], then the first such descendant in tree order is the label element's labeled control.
   * -- https://html.spec.whatwg.org/multipage/forms.html#labeled-control
   * @param element
   */


  function findLabelableElement(element) {
    if (isLabelableElement(element)) {
      return element;
    }

    var labelableElement = null;
    element.childNodes.forEach(function (childNode) {
      if (labelableElement === null && isElement(childNode)) {
        var descendantLabelableElement = findLabelableElement(childNode);

        if (descendantLabelableElement !== null) {
          labelableElement = descendantLabelableElement;
        }
      }
    });
    return labelableElement;
  }
  /**
   * Polyfill of HTMLLabelElement.control
   * https://html.spec.whatwg.org/multipage/forms.html#labeled-control
   * @param label
   */


  function getControlOfLabel(label) {
    if (label.control !== undefined) {
      return label.control;
    }

    var htmlFor = label.getAttribute("for");

    if (htmlFor !== null) {
      return label.ownerDocument.getElementById(htmlFor);
    }

    return findLabelableElement(label);
  }
  /**
   * Polyfill of HTMLInputElement.labels
   * https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/labels
   * @param element
   */


  function getLabels$1(element) {
    var labelsProperty = element.labels;

    if (labelsProperty === null) {
      return labelsProperty;
    }

    if (labelsProperty !== undefined) {
      return arrayFrom(labelsProperty);
    } // polyfill


    if (!isLabelableElement(element)) {
      return null;
    }

    var document = element.ownerDocument;
    return arrayFrom(document.querySelectorAll("label")).filter(function (label) {
      return getControlOfLabel(label) === element;
    });
  }
  /**
   * Gets the contents of a slot used for computing the accname
   * @param slot
   */


  function getSlotContents(slot) {
    // Computing the accessible name for elements containing slots is not
    // currently defined in the spec. This implementation reflects the
    // behavior of NVDA 2020.2/Firefox 81 and iOS VoiceOver/Safari 13.6.
    var assignedNodes = slot.assignedNodes();

    if (assignedNodes.length === 0) {
      // if no nodes are assigned to the slot, it displays the default content
      return arrayFrom(slot.childNodes);
    }

    return assignedNodes;
  }
  /**
   * implements https://w3c.github.io/accname/#mapping_additional_nd_te
   * @param root
   * @param options
   * @returns
   */


  function computeTextAlternative(root) {
    var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    var consultedNodes = new SetLike$1();
    var window = safeWindow(root);
    var _options$compute = options.compute,
        compute = _options$compute === void 0 ? "name" : _options$compute,
        _options$computedStyl = options.computedStyleSupportsPseudoElements,
        computedStyleSupportsPseudoElements = _options$computedStyl === void 0 ? options.getComputedStyle !== undefined : _options$computedStyl,
        _options$getComputedS = options.getComputedStyle,
        getComputedStyle = _options$getComputedS === void 0 ? window.getComputedStyle.bind(window) : _options$getComputedS,
        _options$hidden = options.hidden,
        hidden = _options$hidden === void 0 ? false : _options$hidden; // 2F.i

    function computeMiscTextAlternative(node, context) {
      var accumulatedText = "";

      if (isElement(node) && computedStyleSupportsPseudoElements) {
        var pseudoBefore = getComputedStyle(node, "::before");
        var beforeContent = getTextualContent(pseudoBefore);
        accumulatedText = "".concat(beforeContent, " ").concat(accumulatedText);
      } // FIXME: Including aria-owns is not defined in the spec
      // But it is required in the web-platform-test


      var childNodes = isHTMLSlotElement(node) ? getSlotContents(node) : arrayFrom(node.childNodes).concat(queryIdRefs(node, "aria-owns"));
      childNodes.forEach(function (child) {
        var result = computeTextAlternative(child, {
          isEmbeddedInLabel: context.isEmbeddedInLabel,
          isReferenced: false,
          recursion: true
        }); // TODO: Unclear why display affects delimiter
        // see https://github.com/w3c/accname/issues/3

        var display = isElement(child) ? getComputedStyle(child).getPropertyValue("display") : "inline";
        var separator = display !== "inline" ? " " : ""; // trailing separator for wpt tests

        accumulatedText += "".concat(separator).concat(result).concat(separator);
      });

      if (isElement(node) && computedStyleSupportsPseudoElements) {
        var pseudoAfter = getComputedStyle(node, "::after");
        var afterContent = getTextualContent(pseudoAfter);
        accumulatedText = "".concat(accumulatedText, " ").concat(afterContent);
      }

      return accumulatedText.trim();
    }

    function computeElementTextAlternative(node) {
      if (!isElement(node)) {
        return null;
      }
      /**
       *
       * @param element
       * @param attributeName
       * @returns A string non-empty string or `null`
       */


      function useAttribute(element, attributeName) {
        var attribute = element.getAttributeNode(attributeName);

        if (attribute !== null && !consultedNodes.has(attribute) && attribute.value.trim() !== "") {
          consultedNodes.add(attribute);
          return attribute.value;
        }

        return null;
      } // https://w3c.github.io/html-aam/#fieldset-and-legend-elements


      if (isHTMLFieldSetElement(node)) {
        consultedNodes.add(node);
        var children = arrayFrom(node.childNodes);

        for (var i = 0; i < children.length; i += 1) {
          var child = children[i];

          if (isHTMLLegendElement(child)) {
            return computeTextAlternative(child, {
              isEmbeddedInLabel: false,
              isReferenced: false,
              recursion: false
            });
          }
        }
      } else if (isHTMLTableElement(node)) {
        // https://w3c.github.io/html-aam/#table-element
        consultedNodes.add(node);

        var _children = arrayFrom(node.childNodes);

        for (var _i = 0; _i < _children.length; _i += 1) {
          var _child = _children[_i];

          if (isHTMLTableCaptionElement(_child)) {
            return computeTextAlternative(_child, {
              isEmbeddedInLabel: false,
              isReferenced: false,
              recursion: false
            });
          }
        }
      } else if (isSVGSVGElement(node)) {
        // https://www.w3.org/TR/svg-aam-1.0/
        consultedNodes.add(node);

        var _children2 = arrayFrom(node.childNodes);

        for (var _i2 = 0; _i2 < _children2.length; _i2 += 1) {
          var _child2 = _children2[_i2];

          if (isSVGTitleElement(_child2)) {
            return _child2.textContent;
          }
        }

        return null;
      } else if (getLocalName(node) === "img" || getLocalName(node) === "area") {
        // https://w3c.github.io/html-aam/#area-element
        // https://w3c.github.io/html-aam/#img-element
        var nameFromAlt = useAttribute(node, "alt");

        if (nameFromAlt !== null) {
          return nameFromAlt;
        }
      } else if (isHTMLOptGroupElement(node)) {
        var nameFromLabel = useAttribute(node, "label");

        if (nameFromLabel !== null) {
          return nameFromLabel;
        }
      }

      if (isHTMLInputElement(node) && (node.type === "button" || node.type === "submit" || node.type === "reset")) {
        // https://w3c.github.io/html-aam/#input-type-text-input-type-password-input-type-search-input-type-tel-input-type-email-input-type-url-and-textarea-element-accessible-description-computation
        var nameFromValue = useAttribute(node, "value");

        if (nameFromValue !== null) {
          return nameFromValue;
        } // TODO: l10n


        if (node.type === "submit") {
          return "Submit";
        } // TODO: l10n


        if (node.type === "reset") {
          return "Reset";
        }
      }

      var labels = getLabels$1(node);

      if (labels !== null && labels.length !== 0) {
        consultedNodes.add(node);
        return arrayFrom(labels).map(function (element) {
          return computeTextAlternative(element, {
            isEmbeddedInLabel: true,
            isReferenced: false,
            recursion: true
          });
        }).filter(function (label) {
          return label.length > 0;
        }).join(" ");
      } // https://w3c.github.io/html-aam/#input-type-image-accessible-name-computation
      // TODO: wpt test consider label elements but html-aam does not mention them
      // We follow existing implementations over spec


      if (isHTMLInputElement(node) && node.type === "image") {
        var _nameFromAlt = useAttribute(node, "alt");

        if (_nameFromAlt !== null) {
          return _nameFromAlt;
        }

        var nameFromTitle = useAttribute(node, "title");

        if (nameFromTitle !== null) {
          return nameFromTitle;
        } // TODO: l10n


        return "Submit Query";
      }

      if (hasAnyConcreteRoles(node, ["button"])) {
        // https://www.w3.org/TR/html-aam-1.0/#button-element
        var nameFromSubTree = computeMiscTextAlternative(node, {
          isEmbeddedInLabel: false,
          isReferenced: false
        });

        if (nameFromSubTree !== "") {
          return nameFromSubTree;
        }

        return useAttribute(node, "title");
      }

      return useAttribute(node, "title");
    }

    function computeTextAlternative(current, context) {
      if (consultedNodes.has(current)) {
        return "";
      } // 2A


      if (!hidden && isHidden(current, getComputedStyle) && !context.isReferenced) {
        consultedNodes.add(current);
        return "";
      } // 2B


      var labelElements = queryIdRefs(current, "aria-labelledby");

      if (compute === "name" && !context.isReferenced && labelElements.length > 0) {
        return labelElements.map(function (element) {
          return computeTextAlternative(element, {
            isEmbeddedInLabel: context.isEmbeddedInLabel,
            isReferenced: true,
            // thais isn't recursion as specified, otherwise we would skip
            // `aria-label` in
            // <input id="myself" aria-label="foo" aria-labelledby="myself"
            recursion: false
          });
        }).join(" ");
      } // 2C
      // Changed from the spec in anticipation of https://github.com/w3c/accname/issues/64
      // spec says we should only consider skipping if we have a non-empty label


      var skipToStep2E = context.recursion && isControl(current) && compute === "name";

      if (!skipToStep2E) {
        var ariaLabel = (isElement(current) && current.getAttribute("aria-label") || "").trim();

        if (ariaLabel !== "" && compute === "name") {
          consultedNodes.add(current);
          return ariaLabel;
        } // 2D


        if (!isMarkedPresentational(current)) {
          var elementTextAlternative = computeElementTextAlternative(current);

          if (elementTextAlternative !== null) {
            consultedNodes.add(current);
            return elementTextAlternative;
          }
        }
      } // special casing, cheating to make tests pass
      // https://github.com/w3c/accname/issues/67


      if (hasAnyConcreteRoles(current, ["menu"])) {
        consultedNodes.add(current);
        return "";
      } // 2E


      if (skipToStep2E || context.isEmbeddedInLabel || context.isReferenced) {
        if (hasAnyConcreteRoles(current, ["combobox", "listbox"])) {
          consultedNodes.add(current);
          var selectedOptions = querySelectedOptions(current);

          if (selectedOptions.length === 0) {
            // defined per test `name_heading_combobox`
            return isHTMLInputElement(current) ? current.value : "";
          }

          return arrayFrom(selectedOptions).map(function (selectedOption) {
            return computeTextAlternative(selectedOption, {
              isEmbeddedInLabel: context.isEmbeddedInLabel,
              isReferenced: false,
              recursion: true
            });
          }).join(" ");
        }

        if (hasAbstractRole(current, "range")) {
          consultedNodes.add(current);

          if (current.hasAttribute("aria-valuetext")) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- safe due to hasAttribute guard
            return current.getAttribute("aria-valuetext");
          }

          if (current.hasAttribute("aria-valuenow")) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- safe due to hasAttribute guard
            return current.getAttribute("aria-valuenow");
          } // Otherwise, use the value as specified by a host language attribute.


          return current.getAttribute("value") || "";
        }

        if (hasAnyConcreteRoles(current, ["textbox"])) {
          consultedNodes.add(current);
          return getValueOfTextbox(current);
        }
      } // 2F: https://w3c.github.io/accname/#step2F


      if (allowsNameFromContent(current) || isElement(current) && context.isReferenced || isNativeHostLanguageTextAlternativeElement(current) || isDescendantOfNativeHostLanguageTextAlternativeElement()) {
        consultedNodes.add(current);
        return computeMiscTextAlternative(current, {
          isEmbeddedInLabel: context.isEmbeddedInLabel,
          isReferenced: false
        });
      }

      if (current.nodeType === current.TEXT_NODE) {
        consultedNodes.add(current);
        return current.textContent || "";
      }

      if (context.recursion) {
        consultedNodes.add(current);
        return computeMiscTextAlternative(current, {
          isEmbeddedInLabel: context.isEmbeddedInLabel,
          isReferenced: false
        });
      }


      consultedNodes.add(current);
      return "";
    }

    return asFlatString(computeTextAlternative(root, {
      isEmbeddedInLabel: false,
      // by spec computeAccessibleDescription starts with the referenced elements as roots
      isReferenced: compute === "description",
      recursion: false
    }));
  }

  /**
   * https://w3c.github.io/aria/#namefromprohibited
   */

  function prohibitsNaming(node) {
    return hasAnyConcreteRoles(node, ["caption", "code", "deletion", "emphasis", "generic", "insertion", "paragraph", "presentation", "strong", "subscript", "superscript"]);
  }
  /**
   * implements https://w3c.github.io/accname/#mapping_additional_nd_name
   * @param root
   * @param options
   * @returns
   */


  function computeAccessibleName(root) {
    var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

    if (prohibitsNaming(root)) {
      return "";
    }

    return computeTextAlternative(root, options);
  }

  var lib = {};

  var ariaPropsMap$1 = {};

  Object.defineProperty(ariaPropsMap$1, "__esModule", {
    value: true
  });
  ariaPropsMap$1.default = void 0;

  function _slicedToArray$4(arr, i) {
    return _arrayWithHoles$4(arr) || _iterableToArrayLimit$4(arr, i) || _unsupportedIterableToArray$5(arr, i) || _nonIterableRest$4();
  }

  function _nonIterableRest$4() {
    throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
  }

  function _unsupportedIterableToArray$5(o, minLen) {
    if (!o) return;
    if (typeof o === "string") return _arrayLikeToArray$5(o, minLen);
    var n = Object.prototype.toString.call(o).slice(8, -1);
    if (n === "Object" && o.constructor) n = o.constructor.name;
    if (n === "Map" || n === "Set") return Array.from(o);
    if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray$5(o, minLen);
  }

  function _arrayLikeToArray$5(arr, len) {
    if (len == null || len > arr.length) len = arr.length;

    for (var i = 0, arr2 = new Array(len); i < len; i++) {
      arr2[i] = arr[i];
    }

    return arr2;
  }

  function _iterableToArrayLimit$4(arr, i) {
    var _i = arr == null ? null : typeof Symbol !== "undefined" && arr[Symbol.iterator] || arr["@@iterator"];

    if (_i == null) return;
    var _arr = [];
    var _n = true;
    var _d = false;

    var _s, _e;

    try {
      for (_i = _i.call(arr); !(_n = (_s = _i.next()).done); _n = true) {
        _arr.push(_s.value);

        if (i && _arr.length === i) break;
      }
    } catch (err) {
      _d = true;
      _e = err;
    } finally {
      try {
        if (!_n && _i["return"] != null) _i["return"]();
      } finally {
        if (_d) throw _e;
      }
    }

    return _arr;
  }

  function _arrayWithHoles$4(arr) {
    if (Array.isArray(arr)) return arr;
  }

  var properties = [['aria-activedescendant', {
    'type': 'id'
  }], ['aria-atomic', {
    'type': 'boolean'
  }], ['aria-autocomplete', {
    'type': 'token',
    'values': ['inline', 'list', 'both', 'none']
  }], ['aria-busy', {
    'type': 'boolean'
  }], ['aria-checked', {
    'type': 'tristate'
  }], ['aria-colcount', {
    type: 'integer'
  }], ['aria-colindex', {
    type: 'integer'
  }], ['aria-colspan', {
    type: 'integer'
  }], ['aria-controls', {
    'type': 'idlist'
  }], ['aria-current', {
    type: 'token',
    values: ['page', 'step', 'location', 'date', 'time', true, false]
  }], ['aria-describedby', {
    'type': 'idlist'
  }], ['aria-details', {
    'type': 'id'
  }], ['aria-disabled', {
    'type': 'boolean'
  }], ['aria-dropeffect', {
    'type': 'tokenlist',
    'values': ['copy', 'execute', 'link', 'move', 'none', 'popup']
  }], ['aria-errormessage', {
    'type': 'id'
  }], ['aria-expanded', {
    'type': 'boolean',
    'allowundefined': true
  }], ['aria-flowto', {
    'type': 'idlist'
  }], ['aria-grabbed', {
    'type': 'boolean',
    'allowundefined': true
  }], ['aria-haspopup', {
    'type': 'token',
    'values': [false, true, 'menu', 'listbox', 'tree', 'grid', 'dialog']
  }], ['aria-hidden', {
    'type': 'boolean',
    'allowundefined': true
  }], ['aria-invalid', {
    'type': 'token',
    'values': ['grammar', false, 'spelling', true]
  }], ['aria-keyshortcuts', {
    type: 'string'
  }], ['aria-label', {
    'type': 'string'
  }], ['aria-labelledby', {
    'type': 'idlist'
  }], ['aria-level', {
    'type': 'integer'
  }], ['aria-live', {
    'type': 'token',
    'values': ['assertive', 'off', 'polite']
  }], ['aria-modal', {
    type: 'boolean'
  }], ['aria-multiline', {
    'type': 'boolean'
  }], ['aria-multiselectable', {
    'type': 'boolean'
  }], ['aria-orientation', {
    'type': 'token',
    'values': ['vertical', 'undefined', 'horizontal']
  }], ['aria-owns', {
    'type': 'idlist'
  }], ['aria-placeholder', {
    type: 'string'
  }], ['aria-posinset', {
    'type': 'integer'
  }], ['aria-pressed', {
    'type': 'tristate'
  }], ['aria-readonly', {
    'type': 'boolean'
  }], ['aria-relevant', {
    'type': 'tokenlist',
    'values': ['additions', 'all', 'removals', 'text']
  }], ['aria-required', {
    'type': 'boolean'
  }], ['aria-roledescription', {
    type: 'string'
  }], ['aria-rowcount', {
    type: 'integer'
  }], ['aria-rowindex', {
    type: 'integer'
  }], ['aria-rowspan', {
    type: 'integer'
  }], ['aria-selected', {
    'type': 'boolean',
    'allowundefined': true
  }], ['aria-setsize', {
    'type': 'integer'
  }], ['aria-sort', {
    'type': 'token',
    'values': ['ascending', 'descending', 'none', 'other']
  }], ['aria-valuemax', {
    'type': 'number'
  }], ['aria-valuemin', {
    'type': 'number'
  }], ['aria-valuenow', {
    'type': 'number'
  }], ['aria-valuetext', {
    'type': 'string'
  }]];
  var ariaPropsMap = {
    entries: function entries() {
      return properties;
    },
    get: function get(key) {
      var item = properties.find(function (tuple) {
        return tuple[0] === key ? true : false;
      });
      return item && item[1];
    },
    has: function has(key) {
      return !!this.get(key);
    },
    keys: function keys() {
      return properties.map(function (_ref) {
        var _ref2 = _slicedToArray$4(_ref, 1),
            key = _ref2[0];

        return key;
      });
    },
    values: function values() {
      return properties.map(function (_ref3) {
        var _ref4 = _slicedToArray$4(_ref3, 2),
            values = _ref4[1];

        return values;
      });
    }
  };
  var _default$2c = ariaPropsMap;
  ariaPropsMap$1.default = _default$2c;

  var domMap$1 = {};

  Object.defineProperty(domMap$1, "__esModule", {
    value: true
  });
  domMap$1.default = void 0;

  function _slicedToArray$3(arr, i) {
    return _arrayWithHoles$3(arr) || _iterableToArrayLimit$3(arr, i) || _unsupportedIterableToArray$4(arr, i) || _nonIterableRest$3();
  }

  function _nonIterableRest$3() {
    throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
  }

  function _unsupportedIterableToArray$4(o, minLen) {
    if (!o) return;
    if (typeof o === "string") return _arrayLikeToArray$4(o, minLen);
    var n = Object.prototype.toString.call(o).slice(8, -1);
    if (n === "Object" && o.constructor) n = o.constructor.name;
    if (n === "Map" || n === "Set") return Array.from(o);
    if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray$4(o, minLen);
  }

  function _arrayLikeToArray$4(arr, len) {
    if (len == null || len > arr.length) len = arr.length;

    for (var i = 0, arr2 = new Array(len); i < len; i++) {
      arr2[i] = arr[i];
    }

    return arr2;
  }

  function _iterableToArrayLimit$3(arr, i) {
    var _i = arr == null ? null : typeof Symbol !== "undefined" && arr[Symbol.iterator] || arr["@@iterator"];

    if (_i == null) return;
    var _arr = [];
    var _n = true;
    var _d = false;

    var _s, _e;

    try {
      for (_i = _i.call(arr); !(_n = (_s = _i.next()).done); _n = true) {
        _arr.push(_s.value);

        if (i && _arr.length === i) break;
      }
    } catch (err) {
      _d = true;
      _e = err;
    } finally {
      try {
        if (!_n && _i["return"] != null) _i["return"]();
      } finally {
        if (_d) throw _e;
      }
    }

    return _arr;
  }

  function _arrayWithHoles$3(arr) {
    if (Array.isArray(arr)) return arr;
  }

  var dom$1 = [['a', {
    reserved: false
  }], ['abbr', {
    reserved: false
  }], ['acronym', {
    reserved: false
  }], ['address', {
    reserved: false
  }], ['applet', {
    reserved: false
  }], ['area', {
    reserved: false
  }], ['article', {
    reserved: false
  }], ['aside', {
    reserved: false
  }], ['audio', {
    reserved: false
  }], ['b', {
    reserved: false
  }], ['base', {
    reserved: true
  }], ['bdi', {
    reserved: false
  }], ['bdo', {
    reserved: false
  }], ['big', {
    reserved: false
  }], ['blink', {
    reserved: false
  }], ['blockquote', {
    reserved: false
  }], ['body', {
    reserved: false
  }], ['br', {
    reserved: false
  }], ['button', {
    reserved: false
  }], ['canvas', {
    reserved: false
  }], ['caption', {
    reserved: false
  }], ['center', {
    reserved: false
  }], ['cite', {
    reserved: false
  }], ['code', {
    reserved: false
  }], ['col', {
    reserved: true
  }], ['colgroup', {
    reserved: true
  }], ['content', {
    reserved: false
  }], ['data', {
    reserved: false
  }], ['datalist', {
    reserved: false
  }], ['dd', {
    reserved: false
  }], ['del', {
    reserved: false
  }], ['details', {
    reserved: false
  }], ['dfn', {
    reserved: false
  }], ['dialog', {
    reserved: false
  }], ['dir', {
    reserved: false
  }], ['div', {
    reserved: false
  }], ['dl', {
    reserved: false
  }], ['dt', {
    reserved: false
  }], ['em', {
    reserved: false
  }], ['embed', {
    reserved: false
  }], ['fieldset', {
    reserved: false
  }], ['figcaption', {
    reserved: false
  }], ['figure', {
    reserved: false
  }], ['font', {
    reserved: false
  }], ['footer', {
    reserved: false
  }], ['form', {
    reserved: false
  }], ['frame', {
    reserved: false
  }], ['frameset', {
    reserved: false
  }], ['h1', {
    reserved: false
  }], ['h2', {
    reserved: false
  }], ['h3', {
    reserved: false
  }], ['h4', {
    reserved: false
  }], ['h5', {
    reserved: false
  }], ['h6', {
    reserved: false
  }], ['head', {
    reserved: true
  }], ['header', {
    reserved: false
  }], ['hgroup', {
    reserved: false
  }], ['hr', {
    reserved: false
  }], ['html', {
    reserved: true
  }], ['i', {
    reserved: false
  }], ['iframe', {
    reserved: false
  }], ['img', {
    reserved: false
  }], ['input', {
    reserved: false
  }], ['ins', {
    reserved: false
  }], ['kbd', {
    reserved: false
  }], ['keygen', {
    reserved: false
  }], ['label', {
    reserved: false
  }], ['legend', {
    reserved: false
  }], ['li', {
    reserved: false
  }], ['link', {
    reserved: true
  }], ['main', {
    reserved: false
  }], ['map', {
    reserved: false
  }], ['mark', {
    reserved: false
  }], ['marquee', {
    reserved: false
  }], ['menu', {
    reserved: false
  }], ['menuitem', {
    reserved: false
  }], ['meta', {
    reserved: true
  }], ['meter', {
    reserved: false
  }], ['nav', {
    reserved: false
  }], ['noembed', {
    reserved: true
  }], ['noscript', {
    reserved: true
  }], ['object', {
    reserved: false
  }], ['ol', {
    reserved: false
  }], ['optgroup', {
    reserved: false
  }], ['option', {
    reserved: false
  }], ['output', {
    reserved: false
  }], ['p', {
    reserved: false
  }], ['param', {
    reserved: true
  }], ['picture', {
    reserved: true
  }], ['pre', {
    reserved: false
  }], ['progress', {
    reserved: false
  }], ['q', {
    reserved: false
  }], ['rp', {
    reserved: false
  }], ['rt', {
    reserved: false
  }], ['rtc', {
    reserved: false
  }], ['ruby', {
    reserved: false
  }], ['s', {
    reserved: false
  }], ['samp', {
    reserved: false
  }], ['script', {
    reserved: true
  }], ['section', {
    reserved: false
  }], ['select', {
    reserved: false
  }], ['small', {
    reserved: false
  }], ['source', {
    reserved: true
  }], ['spacer', {
    reserved: false
  }], ['span', {
    reserved: false
  }], ['strike', {
    reserved: false
  }], ['strong', {
    reserved: false
  }], ['style', {
    reserved: true
  }], ['sub', {
    reserved: false
  }], ['summary', {
    reserved: false
  }], ['sup', {
    reserved: false
  }], ['table', {
    reserved: false
  }], ['tbody', {
    reserved: false
  }], ['td', {
    reserved: false
  }], ['textarea', {
    reserved: false
  }], ['tfoot', {
    reserved: false
  }], ['th', {
    reserved: false
  }], ['thead', {
    reserved: false
  }], ['time', {
    reserved: false
  }], ['title', {
    reserved: true
  }], ['tr', {
    reserved: false
  }], ['track', {
    reserved: true
  }], ['tt', {
    reserved: false
  }], ['u', {
    reserved: false
  }], ['ul', {
    reserved: false
  }], ['var', {
    reserved: false
  }], ['video', {
    reserved: false
  }], ['wbr', {
    reserved: false
  }], ['xmp', {
    reserved: false
  }]];
  var domMap = {
    entries: function entries() {
      return dom$1;
    },
    get: function get(key) {
      var item = dom$1.find(function (tuple) {
        return tuple[0] === key ? true : false;
      });
      return item && item[1];
    },
    has: function has(key) {
      return !!this.get(key);
    },
    keys: function keys() {
      return dom$1.map(function (_ref) {
        var _ref2 = _slicedToArray$3(_ref, 1),
            key = _ref2[0];

        return key;
      });
    },
    values: function values() {
      return dom$1.map(function (_ref3) {
        var _ref4 = _slicedToArray$3(_ref3, 2),
            values = _ref4[1];

        return values;
      });
    }
  };
  var _default$2b = domMap;
  domMap$1.default = _default$2b;

  var rolesMap$1 = {};

  var ariaAbstractRoles$1 = {};

  var commandRole$1 = {};

  Object.defineProperty(commandRole$1, "__esModule", {
    value: true
  });
  commandRole$1.default = void 0;
  var commandRole = {
    abstract: true,
    accessibleNameRequired: false,
    baseConcepts: [],
    childrenPresentational: false,
    nameFrom: ['author'],
    prohibitedProps: [],
    props: {},
    relatedConcepts: [{
      concept: {
        name: 'menuitem'
      },
      module: 'HTML'
    }],
    requireContextRole: [],
    requiredContextRole: [],
    requiredOwnedElements: [],
    requiredProps: {},
    superClass: [['roletype', 'widget']]
  };
  var _default$2a = commandRole;
  commandRole$1.default = _default$2a;

  var compositeRole$1 = {};

  Object.defineProperty(compositeRole$1, "__esModule", {
    value: true
  });
  compositeRole$1.default = void 0;
  var compositeRole = {
    abstract: true,
    accessibleNameRequired: false,
    baseConcepts: [],
    childrenPresentational: false,
    nameFrom: ['author'],
    prohibitedProps: [],
    props: {
      'aria-activedescendant': null,
      'aria-disabled': null
    },
    relatedConcepts: [],
    requireContextRole: [],
    requiredContextRole: [],
    requiredOwnedElements: [],
    requiredProps: {},
    superClass: [['roletype', 'widget']]
  };
  var _default$29 = compositeRole;
  compositeRole$1.default = _default$29;

  var inputRole$1 = {};

  Object.defineProperty(inputRole$1, "__esModule", {
    value: true
  });
  inputRole$1.default = void 0;
  var inputRole = {
    abstract: true,
    accessibleNameRequired: false,
    baseConcepts: [],
    childrenPresentational: false,
    nameFrom: ['author'],
    prohibitedProps: [],
    props: {
      'aria-disabled': null
    },
    relatedConcepts: [{
      concept: {
        name: 'input'
      },
      module: 'XForms'
    }],
    requireContextRole: [],
    requiredContextRole: [],
    requiredOwnedElements: [],
    requiredProps: {},
    superClass: [['roletype', 'widget']]
  };
  var _default$28 = inputRole;
  inputRole$1.default = _default$28;

  var landmarkRole$1 = {};

  Object.defineProperty(landmarkRole$1, "__esModule", {
    value: true
  });
  landmarkRole$1.default = void 0;
  var landmarkRole = {
    abstract: true,
    accessibleNameRequired: false,
    baseConcepts: [],
    childrenPresentational: false,
    nameFrom: ['author'],
    prohibitedProps: [],
    props: {},
    relatedConcepts: [],
    requireContextRole: [],
    requiredContextRole: [],
    requiredOwnedElements: [],
    requiredProps: {},
    superClass: [['roletype', 'structure', 'section']]
  };
  var _default$27 = landmarkRole;
  landmarkRole$1.default = _default$27;

  var rangeRole$1 = {};

  Object.defineProperty(rangeRole$1, "__esModule", {
    value: true
  });
  rangeRole$1.default = void 0;
  var rangeRole = {
    abstract: true,
    accessibleNameRequired: false,
    baseConcepts: [],
    childrenPresentational: false,
    nameFrom: ['author'],
    prohibitedProps: [],
    props: {
      'aria-valuemax': null,
      'aria-valuemin': null,
      'aria-valuenow': null
    },
    relatedConcepts: [],
    requireContextRole: [],
    requiredContextRole: [],
    requiredOwnedElements: [],
    requiredProps: {},
    superClass: [['roletype', 'structure']]
  };
  var _default$26 = rangeRole;
  rangeRole$1.default = _default$26;

  var roletypeRole$1 = {};

  Object.defineProperty(roletypeRole$1, "__esModule", {
    value: true
  });
  roletypeRole$1.default = void 0;
  var roletypeRole = {
    abstract: true,
    accessibleNameRequired: false,
    baseConcepts: [],
    childrenPresentational: false,
    nameFrom: [],
    prohibitedProps: [],
    props: {
      'aria-atomic': null,
      'aria-busy': null,
      'aria-controls': null,
      'aria-current': null,
      'aria-describedby': null,
      'aria-details': null,
      'aria-dropeffect': null,
      'aria-flowto': null,
      'aria-grabbed': null,
      'aria-hidden': null,
      'aria-keyshortcuts': null,
      'aria-label': null,
      'aria-labelledby': null,
      'aria-live': null,
      'aria-owns': null,
      'aria-relevant': null,
      'aria-roledescription': null
    },
    relatedConcepts: [{
      concept: {
        name: 'rel'
      },
      module: 'HTML'
    }, {
      concept: {
        name: 'role'
      },
      module: 'XHTML'
    }, {
      concept: {
        name: 'type'
      },
      module: 'Dublin Core'
    }],
    requireContextRole: [],
    requiredContextRole: [],
    requiredOwnedElements: [],
    requiredProps: {},
    superClass: []
  };
  var _default$25 = roletypeRole;
  roletypeRole$1.default = _default$25;

  var sectionRole$1 = {};

  Object.defineProperty(sectionRole$1, "__esModule", {
    value: true
  });
  sectionRole$1.default = void 0;
  var sectionRole = {
    abstract: true,
    accessibleNameRequired: false,
    baseConcepts: [],
    childrenPresentational: false,
    nameFrom: [],
    prohibitedProps: [],
    props: {},
    relatedConcepts: [{
      concept: {
        name: 'frontmatter'
      },
      module: 'DTB'
    }, {
      concept: {
        name: 'level'
      },
      module: 'DTB'
    }, {
      concept: {
        name: 'level'
      },
      module: 'SMIL'
    }],
    requireContextRole: [],
    requiredContextRole: [],
    requiredOwnedElements: [],
    requiredProps: {},
    superClass: [['roletype', 'structure']]
  };
  var _default$24 = sectionRole;
  sectionRole$1.default = _default$24;

  var sectionheadRole$1 = {};

  Object.defineProperty(sectionheadRole$1, "__esModule", {
    value: true
  });
  sectionheadRole$1.default = void 0;
  var sectionheadRole = {
    abstract: true,
    accessibleNameRequired: false,
    baseConcepts: [],
    childrenPresentational: false,
    nameFrom: ['author', 'contents'],
    prohibitedProps: [],
    props: {},
    relatedConcepts: [],
    requireContextRole: [],
    requiredContextRole: [],
    requiredOwnedElements: [],
    requiredProps: {},
    superClass: [['roletype', 'structure']]
  };
  var _default$23 = sectionheadRole;
  sectionheadRole$1.default = _default$23;

  var selectRole$1 = {};

  Object.defineProperty(selectRole$1, "__esModule", {
    value: true
  });
  selectRole$1.default = void 0;
  var selectRole = {
    abstract: true,
    accessibleNameRequired: false,
    baseConcepts: [],
    childrenPresentational: false,
    nameFrom: ['author'],
    prohibitedProps: [],
    props: {
      'aria-orientation': null
    },
    relatedConcepts: [],
    requireContextRole: [],
    requiredContextRole: [],
    requiredOwnedElements: [],
    requiredProps: {},
    superClass: [['roletype', 'widget', 'composite'], ['roletype', 'structure', 'section', 'group']]
  };
  var _default$22 = selectRole;
  selectRole$1.default = _default$22;

  var structureRole$1 = {};

  Object.defineProperty(structureRole$1, "__esModule", {
    value: true
  });
  structureRole$1.default = void 0;
  var structureRole = {
    abstract: true,
    accessibleNameRequired: false,
    baseConcepts: [],
    childrenPresentational: false,
    nameFrom: [],
    prohibitedProps: [],
    props: {},
    relatedConcepts: [],
    requireContextRole: [],
    requiredContextRole: [],
    requiredOwnedElements: [],
    requiredProps: {},
    superClass: [['roletype']]
  };
  var _default$21 = structureRole;
  structureRole$1.default = _default$21;

  var widgetRole$1 = {};

  Object.defineProperty(widgetRole$1, "__esModule", {
    value: true
  });
  widgetRole$1.default = void 0;
  var widgetRole = {
    abstract: true,
    accessibleNameRequired: false,
    baseConcepts: [],
    childrenPresentational: false,
    nameFrom: [],
    prohibitedProps: [],
    props: {},
    relatedConcepts: [],
    requireContextRole: [],
    requiredContextRole: [],
    requiredOwnedElements: [],
    requiredProps: {},
    superClass: [['roletype']]
  };
  var _default$20 = widgetRole;
  widgetRole$1.default = _default$20;

  var windowRole$1 = {};

  Object.defineProperty(windowRole$1, "__esModule", {
    value: true
  });
  windowRole$1.default = void 0;
  var windowRole = {
    abstract: true,
    accessibleNameRequired: false,
    baseConcepts: [],
    childrenPresentational: false,
    nameFrom: ['author'],
    prohibitedProps: [],
    props: {
      'aria-modal': null
    },
    relatedConcepts: [],
    requireContextRole: [],
    requiredContextRole: [],
    requiredOwnedElements: [],
    requiredProps: {},
    superClass: [['roletype']]
  };
  var _default$1$ = windowRole;
  windowRole$1.default = _default$1$;

  Object.defineProperty(ariaAbstractRoles$1, "__esModule", {
    value: true
  });
  ariaAbstractRoles$1.default = void 0;

  var _commandRole = _interopRequireDefault$6(commandRole$1);

  var _compositeRole = _interopRequireDefault$6(compositeRole$1);

  var _inputRole = _interopRequireDefault$6(inputRole$1);

  var _landmarkRole = _interopRequireDefault$6(landmarkRole$1);

  var _rangeRole = _interopRequireDefault$6(rangeRole$1);

  var _roletypeRole = _interopRequireDefault$6(roletypeRole$1);

  var _sectionRole = _interopRequireDefault$6(sectionRole$1);

  var _sectionheadRole = _interopRequireDefault$6(sectionheadRole$1);

  var _selectRole = _interopRequireDefault$6(selectRole$1);

  var _structureRole = _interopRequireDefault$6(structureRole$1);

  var _widgetRole = _interopRequireDefault$6(widgetRole$1);

  var _windowRole = _interopRequireDefault$6(windowRole$1);

  function _interopRequireDefault$6(obj) {
    return obj && obj.__esModule ? obj : {
      default: obj
    };
  }

  var ariaAbstractRoles = [['command', _commandRole.default], ['composite', _compositeRole.default], ['input', _inputRole.default], ['landmark', _landmarkRole.default], ['range', _rangeRole.default], ['roletype', _roletypeRole.default], ['section', _sectionRole.default], ['sectionhead', _sectionheadRole.default], ['select', _selectRole.default], ['structure', _structureRole.default], ['widget', _widgetRole.default], ['window', _windowRole.default]];
  var _default$1_ = ariaAbstractRoles;
  ariaAbstractRoles$1.default = _default$1_;

  var ariaLiteralRoles$1 = {};

  var alertRole$1 = {};

  Object.defineProperty(alertRole$1, "__esModule", {
    value: true
  });
  alertRole$1.default = void 0;
  var alertRole = {
    abstract: false,
    accessibleNameRequired: false,
    baseConcepts: [],
    childrenPresentational: false,
    nameFrom: ['author'],
    prohibitedProps: [],
    props: {
      'aria-atomic': 'true',
      'aria-live': 'assertive'
    },
    relatedConcepts: [{
      concept: {
        name: 'alert'
      },
      module: 'XForms'
    }],
    requireContextRole: [],
    requiredContextRole: [],
    requiredOwnedElements: [],
    requiredProps: {},
    superClass: [['roletype', 'structure', 'section']]
  };
  var _default$1Z = alertRole;
  alertRole$1.default = _default$1Z;

  var alertdialogRole$1 = {};

  Object.defineProperty(alertdialogRole$1, "__esModule", {
    value: true
  });
  alertdialogRole$1.default = void 0;
  var alertdialogRole = {
    abstract: false,
    accessibleNameRequired: true,
    baseConcepts: [],
    childrenPresentational: false,
    nameFrom: ['author'],
    prohibitedProps: [],
    props: {},
    relatedConcepts: [{
      concept: {
        name: 'alert'
      },
      module: 'XForms'
    }],
    requireContextRole: [],
    requiredContextRole: [],
    requiredOwnedElements: [],
    requiredProps: {},
    superClass: [['roletype', 'structure', 'section', 'alert'], ['roletype', 'window', 'dialog']]
  };
  var _default$1Y = alertdialogRole;
  alertdialogRole$1.default = _default$1Y;

  var applicationRole$1 = {};

  Object.defineProperty(applicationRole$1, "__esModule", {
    value: true
  });
  applicationRole$1.default = void 0;
  var applicationRole = {
    abstract: false,
    accessibleNameRequired: true,
    baseConcepts: [],
    childrenPresentational: false,
    nameFrom: ['author'],
    prohibitedProps: [],
    props: {
      'aria-activedescendant': null,
      'aria-disabled': null,
      'aria-errormessage': null,
      'aria-expanded': null,
      'aria-haspopup': null,
      'aria-invalid': null
    },
    relatedConcepts: [{
      concept: {
        name: 'Device Independence Delivery Unit'
      }
    }],
    requireContextRole: [],
    requiredContextRole: [],
    requiredOwnedElements: [],
    requiredProps: {},
    superClass: [['roletype', 'structure']]
  };
  var _default$1X = applicationRole;
  applicationRole$1.default = _default$1X;

  var articleRole$1 = {};

  Object.defineProperty(articleRole$1, "__esModule", {
    value: true
  });
  articleRole$1.default = void 0;
  var articleRole = {
    abstract: false,
    accessibleNameRequired: false,
    baseConcepts: [],
    childrenPresentational: false,
    nameFrom: ['author'],
    prohibitedProps: [],
    props: {
      'aria-posinset': null,
      'aria-setsize': null
    },
    relatedConcepts: [{
      concept: {
        name: 'article'
      },
      module: 'HTML'
    }],
    requireContextRole: [],
    requiredContextRole: [],
    requiredOwnedElements: [],
    requiredProps: {},
    superClass: [['roletype', 'structure', 'document']]
  };
  var _default$1W = articleRole;
  articleRole$1.default = _default$1W;

  var bannerRole$1 = {};

  Object.defineProperty(bannerRole$1, "__esModule", {
    value: true
  });
  bannerRole$1.default = void 0;
  var bannerRole = {
    abstract: false,
    accessibleNameRequired: false,
    baseConcepts: [],
    childrenPresentational: false,
    nameFrom: ['author'],
    prohibitedProps: [],
    props: {},
    relatedConcepts: [{
      concept: {
        constraints: ['direct descendant of document'],
        name: 'header'
      },
      module: 'HTML'
    }],
    requireContextRole: [],
    requiredContextRole: [],
    requiredOwnedElements: [],
    requiredProps: {},
    superClass: [['roletype', 'structure', 'section', 'landmark']]
  };
  var _default$1V = bannerRole;
  bannerRole$1.default = _default$1V;

  var blockquoteRole$1 = {};

  Object.defineProperty(blockquoteRole$1, "__esModule", {
    value: true
  });
  blockquoteRole$1.default = void 0;
  var blockquoteRole = {
    abstract: false,
    accessibleNameRequired: false,
    baseConcepts: [],
    childrenPresentational: false,
    nameFrom: ['author'],
    prohibitedProps: [],
    props: {},
    relatedConcepts: [],
    requireContextRole: [],
    requiredContextRole: [],
    requiredOwnedElements: [],
    requiredProps: {},
    superClass: [['roletype', 'structure', 'section']]
  };
  var _default$1U = blockquoteRole;
  blockquoteRole$1.default = _default$1U;

  var buttonRole$1 = {};

  Object.defineProperty(buttonRole$1, "__esModule", {
    value: true
  });
  buttonRole$1.default = void 0;
  var buttonRole = {
    abstract: false,
    accessibleNameRequired: true,
    baseConcepts: [],
    childrenPresentational: true,
    nameFrom: ['author', 'contents'],
    prohibitedProps: [],
    props: {
      'aria-disabled': null,
      'aria-expanded': null,
      'aria-haspopup': null,
      'aria-pressed': null
    },
    relatedConcepts: [{
      concept: {
        attributes: [{
          constraints: ['set'],
          name: 'aria-pressed'
        }, {
          name: 'type',
          value: 'checkbox'
        }],
        name: 'input'
      },
      module: 'HTML'
    }, {
      concept: {
        attributes: [{
          name: 'aria-expanded',
          value: 'false'
        }],
        name: 'summary'
      },
      module: 'HTML'
    }, {
      concept: {
        attributes: [{
          name: 'aria-expanded',
          value: 'true'
        }],
        constraints: ['direct descendant of details element with the open attribute defined'],
        name: 'summary'
      },
      module: 'HTML'
    }, {
      concept: {
        attributes: [{
          name: 'type',
          value: 'button'
        }],
        name: 'input'
      },
      module: 'HTML'
    }, {
      concept: {
        attributes: [{
          name: 'type',
          value: 'image'
        }],
        name: 'input'
      },
      module: 'HTML'
    }, {
      concept: {
        attributes: [{
          name: 'type',
          value: 'reset'
        }],
        name: 'input'
      },
      module: 'HTML'
    }, {
      concept: {
        attributes: [{
          name: 'type',
          value: 'submit'
        }],
        name: 'input'
      },
      module: 'HTML'
    }, {
      concept: {
        name: 'button'
      },
      module: 'HTML'
    }, {
      concept: {
        name: 'trigger'
      },
      module: 'XForms'
    }],
    requireContextRole: [],
    requiredContextRole: [],
    requiredOwnedElements: [],
    requiredProps: {},
    superClass: [['roletype', 'widget', 'command']]
  };
  var _default$1T = buttonRole;
  buttonRole$1.default = _default$1T;

  var captionRole$1 = {};

  Object.defineProperty(captionRole$1, "__esModule", {
    value: true
  });
  captionRole$1.default = void 0;
  var captionRole = {
    abstract: false,
    accessibleNameRequired: false,
    baseConcepts: [],
    childrenPresentational: false,
    nameFrom: ['prohibited'],
    prohibitedProps: ['aria-label', 'aria-labelledby'],
    props: {},
    relatedConcepts: [],
    requireContextRole: ['figure', 'grid', 'table'],
    requiredContextRole: ['figure', 'grid', 'table'],
    requiredOwnedElements: [],
    requiredProps: {},
    superClass: [['roletype', 'structure', 'section']]
  };
  var _default$1S = captionRole;
  captionRole$1.default = _default$1S;

  var cellRole$1 = {};

  Object.defineProperty(cellRole$1, "__esModule", {
    value: true
  });
  cellRole$1.default = void 0;
  var cellRole = {
    abstract: false,
    accessibleNameRequired: false,
    baseConcepts: [],
    childrenPresentational: false,
    nameFrom: ['author', 'contents'],
    prohibitedProps: [],
    props: {
      'aria-colindex': null,
      'aria-colspan': null,
      'aria-rowindex': null,
      'aria-rowspan': null
    },
    relatedConcepts: [{
      concept: {
        constraints: ['descendant of table'],
        name: 'td'
      },
      module: 'HTML'
    }],
    requireContextRole: ['row'],
    requiredContextRole: ['row'],
    requiredOwnedElements: [],
    requiredProps: {},
    superClass: [['roletype', 'structure', 'section']]
  };
  var _default$1R = cellRole;
  cellRole$1.default = _default$1R;

  var checkboxRole$1 = {};

  Object.defineProperty(checkboxRole$1, "__esModule", {
    value: true
  });
  checkboxRole$1.default = void 0;
  var checkboxRole = {
    abstract: false,
    accessibleNameRequired: true,
    baseConcepts: [],
    childrenPresentational: true,
    nameFrom: ['author', 'contents'],
    prohibitedProps: [],
    props: {
      'aria-checked': null,
      'aria-errormessage': null,
      'aria-expanded': null,
      'aria-invalid': null,
      'aria-readonly': null,
      'aria-required': null
    },
    relatedConcepts: [{
      concept: {
        attributes: [{
          name: 'type',
          value: 'checkbox'
        }],
        name: 'input'
      },
      module: 'HTML'
    }, {
      concept: {
        name: 'option'
      },
      module: 'ARIA'
    }],
    requireContextRole: [],
    requiredContextRole: [],
    requiredOwnedElements: [],
    requiredProps: {
      'aria-checked': null
    },
    superClass: [['roletype', 'widget', 'input']]
  };
  var _default$1Q = checkboxRole;
  checkboxRole$1.default = _default$1Q;

  var codeRole$1 = {};

  Object.defineProperty(codeRole$1, "__esModule", {
    value: true
  });
  codeRole$1.default = void 0;
  var codeRole = {
    abstract: false,
    accessibleNameRequired: false,
    baseConcepts: [],
    childrenPresentational: false,
    nameFrom: ['prohibited'],
    prohibitedProps: ['aria-label', 'aria-labelledby'],
    props: {},
    relatedConcepts: [],
    requireContextRole: [],
    requiredContextRole: [],
    requiredOwnedElements: [],
    requiredProps: {},
    superClass: [['roletype', 'structure', 'section']]
  };
  var _default$1P = codeRole;
  codeRole$1.default = _default$1P;

  var columnheaderRole$1 = {};

  Object.defineProperty(columnheaderRole$1, "__esModule", {
    value: true
  });
  columnheaderRole$1.default = void 0;
  var columnheaderRole = {
    abstract: false,
    accessibleNameRequired: true,
    baseConcepts: [],
    childrenPresentational: false,
    nameFrom: ['author', 'contents'],
    prohibitedProps: [],
    props: {
      'aria-sort': null
    },
    relatedConcepts: [{
      attributes: [{
        name: 'scope',
        value: 'col'
      }],
      concept: {
        name: 'th'
      },
      module: 'HTML'
    }],
    requireContextRole: ['row'],
    requiredContextRole: ['row'],
    requiredOwnedElements: [],
    requiredProps: {},
    superClass: [['roletype', 'structure', 'section', 'cell'], ['roletype', 'structure', 'section', 'cell', 'gridcell'], ['roletype', 'widget', 'gridcell'], ['roletype', 'structure', 'sectionhead']]
  };
  var _default$1O = columnheaderRole;
  columnheaderRole$1.default = _default$1O;

  var comboboxRole$1 = {};

  Object.defineProperty(comboboxRole$1, "__esModule", {
    value: true
  });
  comboboxRole$1.default = void 0;
  var comboboxRole = {
    abstract: false,
    accessibleNameRequired: true,
    baseConcepts: [],
    childrenPresentational: false,
    nameFrom: ['author'],
    prohibitedProps: [],
    props: {
      'aria-activedescendant': null,
      'aria-autocomplete': null,
      'aria-errormessage': null,
      'aria-invalid': null,
      'aria-readonly': null,
      'aria-required': null,
      'aria-expanded': 'false',
      'aria-haspopup': 'listbox'
    },
    relatedConcepts: [{
      concept: {
        attributes: [{
          constraints: ['set'],
          name: 'list'
        }, {
          name: 'type',
          value: 'email'
        }],
        name: 'input'
      },
      module: 'HTML'
    }, {
      concept: {
        attributes: [{
          constraints: ['set'],
          name: 'list'
        }, {
          name: 'type',
          value: 'search'
        }],
        name: 'input'
      },
      module: 'HTML'
    }, {
      concept: {
        attributes: [{
          constraints: ['set'],
          name: 'list'
        }, {
          name: 'type',
          value: 'tel'
        }],
        name: 'input'
      },
      module: 'HTML'
    }, {
      concept: {
        attributes: [{
          constraints: ['set'],
          name: 'list'
        }, {
          name: 'type',
          value: 'text'
        }],
        name: 'input'
      },
      module: 'HTML'
    }, {
      concept: {
        attributes: [{
          constraints: ['set'],
          name: 'list'
        }, {
          name: 'type',
          value: 'url'
        }],
        name: 'input'
      },
      module: 'HTML'
    }, {
      concept: {
        attributes: [{
          constraints: ['set'],
          name: 'list'
        }, {
          name: 'type',
          value: 'url'
        }],
        name: 'input'
      },
      module: 'HTML'
    }, {
      concept: {
        attributes: [{
          constraints: ['undefined'],
          name: 'multiple'
        }, {
          constraints: ['undefined'],
          name: 'size'
        }],
        name: 'select'
      },
      module: 'HTML'
    }, {
      concept: {
        attributes: [{
          constraints: ['undefined'],
          name: 'multiple'
        }, {
          name: 'size',
          value: 1
        }],
        name: 'select'
      },
      module: 'HTML'
    }, {
      concept: {
        name: 'select'
      },
      module: 'XForms'
    }],
    requireContextRole: [],
    requiredContextRole: [],
    requiredOwnedElements: [],
    requiredProps: {
      'aria-controls': null,
      'aria-expanded': 'false'
    },
    superClass: [['roletype', 'widget', 'input']]
  };
  var _default$1N = comboboxRole;
  comboboxRole$1.default = _default$1N;

  var complementaryRole$1 = {};

  Object.defineProperty(complementaryRole$1, "__esModule", {
    value: true
  });
  complementaryRole$1.default = void 0;
  var complementaryRole = {
    abstract: false,
    accessibleNameRequired: false,
    baseConcepts: [],
    childrenPresentational: false,
    nameFrom: ['author'],
    prohibitedProps: [],
    props: {},
    relatedConcepts: [{
      concept: {
        name: 'aside'
      },
      module: 'HTML'
    }],
    requireContextRole: [],
    requiredContextRole: [],
    requiredOwnedElements: [],
    requiredProps: {},
    superClass: [['roletype', 'structure', 'section', 'landmark']]
  };
  var _default$1M = complementaryRole;
  complementaryRole$1.default = _default$1M;

  var contentinfoRole$1 = {};

  Object.defineProperty(contentinfoRole$1, "__esModule", {
    value: true
  });
  contentinfoRole$1.default = void 0;
  var contentinfoRole = {
    abstract: false,
    accessibleNameRequired: false,
    baseConcepts: [],
    childrenPresentational: false,
    nameFrom: ['author'],
    prohibitedProps: [],
    props: {},
    relatedConcepts: [{
      concept: {
        constraints: ['direct descendant of document'],
        name: 'footer'
      },
      module: 'HTML'
    }],
    requireContextRole: [],
    requiredContextRole: [],
    requiredOwnedElements: [],
    requiredProps: {},
    superClass: [['roletype', 'structure', 'section', 'landmark']]
  };
  var _default$1L = contentinfoRole;
  contentinfoRole$1.default = _default$1L;

  var definitionRole$1 = {};

  Object.defineProperty(definitionRole$1, "__esModule", {
    value: true
  });
  definitionRole$1.default = void 0;
  var definitionRole = {
    abstract: false,
    accessibleNameRequired: false,
    baseConcepts: [],
    childrenPresentational: false,
    nameFrom: ['author'],
    prohibitedProps: [],
    props: {},
    relatedConcepts: [{
      concept: {
        name: 'dd'
      },
      module: 'HTML'
    }],
    requireContextRole: [],
    requiredContextRole: [],
    requiredOwnedElements: [],
    requiredProps: {},
    superClass: [['roletype', 'structure', 'section']]
  };
  var _default$1K = definitionRole;
  definitionRole$1.default = _default$1K;

  var deletionRole$1 = {};

  Object.defineProperty(deletionRole$1, "__esModule", {
    value: true
  });
  deletionRole$1.default = void 0;
  var deletionRole = {
    abstract: false,
    accessibleNameRequired: false,
    baseConcepts: [],
    childrenPresentational: false,
    nameFrom: ['prohibited'],
    prohibitedProps: ['aria-label', 'aria-labelledby'],
    props: {},
    relatedConcepts: [],
    requireContextRole: [],
    requiredContextRole: [],
    requiredOwnedElements: [],
    requiredProps: {},
    superClass: [['roletype', 'structure', 'section']]
  };
  var _default$1J = deletionRole;
  deletionRole$1.default = _default$1J;

  var dialogRole$1 = {};

  Object.defineProperty(dialogRole$1, "__esModule", {
    value: true
  });
  dialogRole$1.default = void 0;
  var dialogRole = {
    abstract: false,
    accessibleNameRequired: true,
    baseConcepts: [],
    childrenPresentational: false,
    nameFrom: ['author'],
    prohibitedProps: [],
    props: {},
    relatedConcepts: [{
      concept: {
        name: 'dialog'
      },
      module: 'HTML'
    }],
    requireContextRole: [],
    requiredContextRole: [],
    requiredOwnedElements: [],
    requiredProps: {},
    superClass: [['roletype', 'window']]
  };
  var _default$1I = dialogRole;
  dialogRole$1.default = _default$1I;

  var directoryRole$1 = {};

  Object.defineProperty(directoryRole$1, "__esModule", {
    value: true
  });
  directoryRole$1.default = void 0;
  var directoryRole = {
    abstract: false,
    accessibleNameRequired: false,
    baseConcepts: [],
    childrenPresentational: false,
    nameFrom: ['author'],
    prohibitedProps: [],
    props: {},
    relatedConcepts: [{
      module: 'DAISY Guide'
    }],
    requireContextRole: [],
    requiredContextRole: [],
    requiredOwnedElements: [],
    requiredProps: {},
    superClass: [['roletype', 'structure', 'section', 'list']]
  };
  var _default$1H = directoryRole;
  directoryRole$1.default = _default$1H;

  var documentRole$1 = {};

  Object.defineProperty(documentRole$1, "__esModule", {
    value: true
  });
  documentRole$1.default = void 0;
  var documentRole = {
    abstract: false,
    accessibleNameRequired: false,
    baseConcepts: [],
    childrenPresentational: false,
    nameFrom: ['author'],
    prohibitedProps: [],
    props: {},
    relatedConcepts: [{
      concept: {
        name: 'Device Independence Delivery Unit'
      }
    }, {
      concept: {
        name: 'body'
      },
      module: 'HTML'
    }],
    requireContextRole: [],
    requiredContextRole: [],
    requiredOwnedElements: [],
    requiredProps: {},
    superClass: [['roletype', 'structure']]
  };
  var _default$1G = documentRole;
  documentRole$1.default = _default$1G;

  var emphasisRole$1 = {};

  Object.defineProperty(emphasisRole$1, "__esModule", {
    value: true
  });
  emphasisRole$1.default = void 0;
  var emphasisRole = {
    abstract: false,
    accessibleNameRequired: false,
    baseConcepts: [],
    childrenPresentational: false,
    nameFrom: ['prohibited'],
    prohibitedProps: ['aria-label', 'aria-labelledby'],
    props: {},
    relatedConcepts: [],
    requireContextRole: [],
    requiredContextRole: [],
    requiredOwnedElements: [],
    requiredProps: {},
    superClass: [['roletype', 'structure', 'section']]
  };
  var _default$1F = emphasisRole;
  emphasisRole$1.default = _default$1F;

  var feedRole$1 = {};

  Object.defineProperty(feedRole$1, "__esModule", {
    value: true
  });
  feedRole$1.default = void 0;
  var feedRole = {
    abstract: false,
    accessibleNameRequired: false,
    baseConcepts: [],
    childrenPresentational: false,
    nameFrom: ['author'],
    prohibitedProps: [],
    props: {},
    relatedConcepts: [],
    requireContextRole: [],
    requiredContextRole: [],
    requiredOwnedElements: [['article']],
    requiredProps: {},
    superClass: [['roletype', 'structure', 'section', 'list']]
  };
  var _default$1E = feedRole;
  feedRole$1.default = _default$1E;

  var figureRole$1 = {};

  Object.defineProperty(figureRole$1, "__esModule", {
    value: true
  });
  figureRole$1.default = void 0;
  var figureRole = {
    abstract: false,
    accessibleNameRequired: false,
    baseConcepts: [],
    childrenPresentational: false,
    nameFrom: ['author'],
    prohibitedProps: [],
    props: {},
    relatedConcepts: [{
      concept: {
        name: 'figure'
      },
      module: 'HTML'
    }],
    requireContextRole: [],
    requiredContextRole: [],
    requiredOwnedElements: [],
    requiredProps: {},
    superClass: [['roletype', 'structure', 'section']]
  };
  var _default$1D = figureRole;
  figureRole$1.default = _default$1D;

  var formRole$1 = {};

  Object.defineProperty(formRole$1, "__esModule", {
    value: true
  });
  formRole$1.default = void 0;
  var formRole = {
    abstract: false,
    accessibleNameRequired: false,
    baseConcepts: [],
    childrenPresentational: false,
    nameFrom: ['author'],
    prohibitedProps: [],
    props: {},
    relatedConcepts: [{
      concept: {
        attributes: [{
          constraints: ['set'],
          name: 'aria-label'
        }],
        name: 'form'
      },
      module: 'HTML'
    }, {
      concept: {
        attributes: [{
          constraints: ['set'],
          name: 'aria-labelledby'
        }],
        name: 'form'
      },
      module: 'HTML'
    }, {
      concept: {
        attributes: [{
          constraints: ['set'],
          name: 'name'
        }],
        name: 'form'
      },
      module: 'HTML'
    }],
    requireContextRole: [],
    requiredContextRole: [],
    requiredOwnedElements: [],
    requiredProps: {},
    superClass: [['roletype', 'structure', 'section', 'landmark']]
  };
  var _default$1C = formRole;
  formRole$1.default = _default$1C;

  var genericRole$1 = {};

  Object.defineProperty(genericRole$1, "__esModule", {
    value: true
  });
  genericRole$1.default = void 0;
  var genericRole = {
    abstract: false,
    accessibleNameRequired: false,
    baseConcepts: [],
    childrenPresentational: false,
    nameFrom: ['prohibited'],
    prohibitedProps: ['aria-label', 'aria-labelledby'],
    props: {},
    relatedConcepts: [{
      concept: {
        name: 'span'
      },
      module: 'HTML'
    }, {
      concept: {
        name: 'div'
      },
      module: 'HTML'
    }],
    requireContextRole: [],
    requiredContextRole: [],
    requiredOwnedElements: [],
    requiredProps: {},
    superClass: [['roletype', 'structure']]
  };
  var _default$1B = genericRole;
  genericRole$1.default = _default$1B;

  var gridRole$1 = {};

  Object.defineProperty(gridRole$1, "__esModule", {
    value: true
  });
  gridRole$1.default = void 0;
  var gridRole = {
    abstract: false,
    accessibleNameRequired: true,
    baseConcepts: [],
    childrenPresentational: false,
    nameFrom: ['author'],
    prohibitedProps: [],
    props: {
      'aria-multiselectable': null,
      'aria-readonly': null
    },
    relatedConcepts: [{
      concept: {
        attributes: [{
          name: 'role',
          value: 'grid'
        }],
        name: 'table'
      },
      module: 'HTML'
    }],
    requireContextRole: [],
    requiredContextRole: [],
    requiredOwnedElements: [['row'], ['row', 'rowgroup']],
    requiredProps: {},
    superClass: [['roletype', 'widget', 'composite'], ['roletype', 'structure', 'section', 'table']]
  };
  var _default$1A = gridRole;
  gridRole$1.default = _default$1A;

  var gridcellRole$1 = {};

  Object.defineProperty(gridcellRole$1, "__esModule", {
    value: true
  });
  gridcellRole$1.default = void 0;
  var gridcellRole = {
    abstract: false,
    accessibleNameRequired: false,
    baseConcepts: [],
    childrenPresentational: false,
    nameFrom: ['author', 'contents'],
    prohibitedProps: [],
    props: {
      'aria-disabled': null,
      'aria-errormessage': null,
      'aria-expanded': null,
      'aria-haspopup': null,
      'aria-invalid': null,
      'aria-readonly': null,
      'aria-required': null,
      'aria-selected': null
    },
    relatedConcepts: [{
      concept: {
        attributes: [{
          name: 'role',
          value: 'gridcell'
        }],
        name: 'td'
      },
      module: 'HTML'
    }],
    requireContextRole: ['row'],
    requiredContextRole: ['row'],
    requiredOwnedElements: [],
    requiredProps: {},
    superClass: [['roletype', 'structure', 'section', 'cell'], ['roletype', 'widget']]
  };
  var _default$1z = gridcellRole;
  gridcellRole$1.default = _default$1z;

  var groupRole$1 = {};

  Object.defineProperty(groupRole$1, "__esModule", {
    value: true
  });
  groupRole$1.default = void 0;
  var groupRole = {
    abstract: false,
    accessibleNameRequired: false,
    baseConcepts: [],
    childrenPresentational: false,
    nameFrom: ['author'],
    prohibitedProps: [],
    props: {
      'aria-activedescendant': null,
      'aria-disabled': null
    },
    relatedConcepts: [{
      concept: {
        name: 'details'
      },
      module: 'HTML'
    }, {
      concept: {
        name: 'fieldset'
      },
      module: 'HTML'
    }, {
      concept: {
        name: 'optgroup'
      },
      module: 'HTML'
    }],
    requireContextRole: [],
    requiredContextRole: [],
    requiredOwnedElements: [],
    requiredProps: {},
    superClass: [['roletype', 'structure', 'section']]
  };
  var _default$1y = groupRole;
  groupRole$1.default = _default$1y;

  var headingRole$1 = {};

  Object.defineProperty(headingRole$1, "__esModule", {
    value: true
  });
  headingRole$1.default = void 0;
  var headingRole = {
    abstract: false,
    accessibleNameRequired: true,
    baseConcepts: [],
    childrenPresentational: false,
    nameFrom: ['author', 'contents'],
    prohibitedProps: [],
    props: {
      'aria-level': '2'
    },
    relatedConcepts: [{
      concept: {
        name: 'h1'
      },
      module: 'HTML'
    }, {
      concept: {
        name: 'h2'
      },
      module: 'HTML'
    }, {
      concept: {
        name: 'h3'
      },
      module: 'HTML'
    }, {
      concept: {
        name: 'h4'
      },
      module: 'HTML'
    }, {
      concept: {
        name: 'h5'
      },
      module: 'HTML'
    }, {
      concept: {
        name: 'h6'
      },
      module: 'HTML'
    }],
    requireContextRole: [],
    requiredContextRole: [],
    requiredOwnedElements: [],
    requiredProps: {
      'aria-level': '2'
    },
    superClass: [['roletype', 'structure', 'sectionhead']]
  };
  var _default$1x = headingRole;
  headingRole$1.default = _default$1x;

  var imgRole$1 = {};

  Object.defineProperty(imgRole$1, "__esModule", {
    value: true
  });
  imgRole$1.default = void 0;
  var imgRole = {
    abstract: false,
    accessibleNameRequired: true,
    baseConcepts: [],
    childrenPresentational: true,
    nameFrom: ['author'],
    prohibitedProps: [],
    props: {},
    relatedConcepts: [{
      concept: {
        attributes: [{
          constraints: ['set'],
          name: 'alt'
        }],
        name: 'img'
      },
      module: 'HTML'
    }, {
      concept: {
        attributes: [{
          constraints: ['undefined'],
          name: 'alt'
        }],
        name: 'img'
      },
      module: 'HTML'
    }, {
      concept: {
        name: 'imggroup'
      },
      module: 'DTB'
    }],
    requireContextRole: [],
    requiredContextRole: [],
    requiredOwnedElements: [],
    requiredProps: {},
    superClass: [['roletype', 'structure', 'section']]
  };
  var _default$1w = imgRole;
  imgRole$1.default = _default$1w;

  var insertionRole$1 = {};

  Object.defineProperty(insertionRole$1, "__esModule", {
    value: true
  });
  insertionRole$1.default = void 0;
  var insertionRole = {
    abstract: false,
    accessibleNameRequired: false,
    baseConcepts: [],
    childrenPresentational: false,
    nameFrom: ['prohibited'],
    prohibitedProps: ['aria-label', 'aria-labelledby'],
    props: {},
    relatedConcepts: [],
    requireContextRole: [],
    requiredContextRole: [],
    requiredOwnedElements: [],
    requiredProps: {},
    superClass: [['roletype', 'structure', 'section']]
  };
  var _default$1v = insertionRole;
  insertionRole$1.default = _default$1v;

  var linkRole$1 = {};

  Object.defineProperty(linkRole$1, "__esModule", {
    value: true
  });
  linkRole$1.default = void 0;
  var linkRole = {
    abstract: false,
    accessibleNameRequired: true,
    baseConcepts: [],
    childrenPresentational: false,
    nameFrom: ['author', 'contents'],
    prohibitedProps: [],
    props: {
      'aria-disabled': null,
      'aria-expanded': null,
      'aria-haspopup': null
    },
    relatedConcepts: [{
      concept: {
        attributes: [{
          name: 'href'
        }],
        name: 'a'
      },
      module: 'HTML'
    }, {
      concept: {
        attributes: [{
          name: 'href'
        }],
        name: 'area'
      },
      module: 'HTML'
    }, {
      concept: {
        attributes: [{
          name: 'href'
        }],
        name: 'link'
      },
      module: 'HTML'
    }],
    requireContextRole: [],
    requiredContextRole: [],
    requiredOwnedElements: [],
    requiredProps: {},
    superClass: [['roletype', 'widget', 'command']]
  };
  var _default$1u = linkRole;
  linkRole$1.default = _default$1u;

  var listRole$1 = {};

  Object.defineProperty(listRole$1, "__esModule", {
    value: true
  });
  listRole$1.default = void 0;
  var listRole = {
    abstract: false,
    accessibleNameRequired: false,
    baseConcepts: [],
    childrenPresentational: false,
    nameFrom: ['author'],
    prohibitedProps: [],
    props: {},
    relatedConcepts: [{
      concept: {
        name: 'menu'
      },
      module: 'HTML'
    }, {
      concept: {
        name: 'ol'
      },
      module: 'HTML'
    }, {
      concept: {
        name: 'ul'
      },
      module: 'HTML'
    }],
    requireContextRole: [],
    requiredContextRole: [],
    requiredOwnedElements: [['listitem']],
    requiredProps: {},
    superClass: [['roletype', 'structure', 'section']]
  };
  var _default$1t = listRole;
  listRole$1.default = _default$1t;

  var listboxRole$1 = {};

  Object.defineProperty(listboxRole$1, "__esModule", {
    value: true
  });
  listboxRole$1.default = void 0;
  var listboxRole = {
    abstract: false,
    accessibleNameRequired: true,
    baseConcepts: [],
    childrenPresentational: false,
    nameFrom: ['author'],
    prohibitedProps: [],
    props: {
      'aria-errormessage': null,
      'aria-expanded': null,
      'aria-invalid': null,
      'aria-multiselectable': null,
      'aria-readonly': null,
      'aria-required': null,
      'aria-orientation': 'vertical'
    },
    relatedConcepts: [{
      concept: {
        attributes: [{
          constraints: ['>1'],
          name: 'size'
        }, {
          name: 'multiple'
        }],
        name: 'select'
      },
      module: 'HTML'
    }, {
      concept: {
        attributes: [{
          constraints: ['>1'],
          name: 'size'
        }],
        name: 'select'
      },
      module: 'HTML'
    }, {
      concept: {
        attributes: [{
          name: 'multiple'
        }],
        name: 'select'
      },
      module: 'HTML'
    }, {
      concept: {
        name: 'datalist'
      },
      module: 'HTML'
    }, {
      concept: {
        name: 'list'
      },
      module: 'ARIA'
    }, {
      concept: {
        name: 'select'
      },
      module: 'XForms'
    }],
    requireContextRole: [],
    requiredContextRole: [],
    requiredOwnedElements: [['option', 'group'], ['option']],
    requiredProps: {},
    superClass: [['roletype', 'widget', 'composite', 'select'], ['roletype', 'structure', 'section', 'group', 'select']]
  };
  var _default$1s = listboxRole;
  listboxRole$1.default = _default$1s;

  var listitemRole$1 = {};

  Object.defineProperty(listitemRole$1, "__esModule", {
    value: true
  });
  listitemRole$1.default = void 0;
  var listitemRole = {
    abstract: false,
    accessibleNameRequired: false,
    baseConcepts: [],
    childrenPresentational: false,
    nameFrom: ['author'],
    prohibitedProps: [],
    props: {
      'aria-level': null,
      'aria-posinset': null,
      'aria-setsize': null
    },
    relatedConcepts: [{
      concept: {
        constraints: ['direct descendant of ol, ul or menu'],
        name: 'li'
      },
      module: 'HTML'
    }, {
      concept: {
        name: 'item'
      },
      module: 'XForms'
    }],
    requireContextRole: ['directory', 'list'],
    requiredContextRole: ['directory', 'list'],
    requiredOwnedElements: [],
    requiredProps: {},
    superClass: [['roletype', 'structure', 'section']]
  };
  var _default$1r = listitemRole;
  listitemRole$1.default = _default$1r;

  var logRole$1 = {};

  Object.defineProperty(logRole$1, "__esModule", {
    value: true
  });
  logRole$1.default = void 0;
  var logRole = {
    abstract: false,
    accessibleNameRequired: false,
    baseConcepts: [],
    childrenPresentational: false,
    nameFrom: ['author'],
    prohibitedProps: [],
    props: {
      'aria-live': 'polite'
    },
    relatedConcepts: [],
    requireContextRole: [],
    requiredContextRole: [],
    requiredOwnedElements: [],
    requiredProps: {},
    superClass: [['roletype', 'structure', 'section']]
  };
  var _default$1q = logRole;
  logRole$1.default = _default$1q;

  var mainRole$1 = {};

  Object.defineProperty(mainRole$1, "__esModule", {
    value: true
  });
  mainRole$1.default = void 0;
  var mainRole = {
    abstract: false,
    accessibleNameRequired: false,
    baseConcepts: [],
    childrenPresentational: false,
    nameFrom: ['author'],
    prohibitedProps: [],
    props: {},
    relatedConcepts: [{
      concept: {
        name: 'main'
      },
      module: 'HTML'
    }],
    requireContextRole: [],
    requiredContextRole: [],
    requiredOwnedElements: [],
    requiredProps: {},
    superClass: [['roletype', 'structure', 'section', 'landmark']]
  };
  var _default$1p = mainRole;
  mainRole$1.default = _default$1p;

  var marqueeRole$1 = {};

  Object.defineProperty(marqueeRole$1, "__esModule", {
    value: true
  });
  marqueeRole$1.default = void 0;
  var marqueeRole = {
    abstract: false,
    accessibleNameRequired: true,
    baseConcepts: [],
    childrenPresentational: false,
    nameFrom: ['author'],
    prohibitedProps: [],
    props: {},
    relatedConcepts: [],
    requireContextRole: [],
    requiredContextRole: [],
    requiredOwnedElements: [],
    requiredProps: {},
    superClass: [['roletype', 'structure', 'section']]
  };
  var _default$1o = marqueeRole;
  marqueeRole$1.default = _default$1o;

  var mathRole$1 = {};

  Object.defineProperty(mathRole$1, "__esModule", {
    value: true
  });
  mathRole$1.default = void 0;
  var mathRole = {
    abstract: false,
    accessibleNameRequired: false,
    baseConcepts: [],
    childrenPresentational: false,
    nameFrom: ['author'],
    prohibitedProps: [],
    props: {},
    relatedConcepts: [{
      concept: {
        name: 'math'
      },
      module: 'HTML'
    }],
    requireContextRole: [],
    requiredContextRole: [],
    requiredOwnedElements: [],
    requiredProps: {},
    superClass: [['roletype', 'structure', 'section']]
  };
  var _default$1n = mathRole;
  mathRole$1.default = _default$1n;

  var menuRole$1 = {};

  Object.defineProperty(menuRole$1, "__esModule", {
    value: true
  });
  menuRole$1.default = void 0;
  var menuRole = {
    abstract: false,
    accessibleNameRequired: false,
    baseConcepts: [],
    childrenPresentational: false,
    nameFrom: ['author'],
    prohibitedProps: [],
    props: {
      'aria-orientation': 'vertical'
    },
    relatedConcepts: [{
      concept: {
        name: 'MENU'
      },
      module: 'JAPI'
    }, {
      concept: {
        name: 'list'
      },
      module: 'ARIA'
    }, {
      concept: {
        name: 'select'
      },
      module: 'XForms'
    }, {
      concept: {
        name: 'sidebar'
      },
      module: 'DTB'
    }],
    requireContextRole: [],
    requiredContextRole: [],
    requiredOwnedElements: [['menuitem', 'group'], ['menuitemradio', 'group'], ['menuitemcheckbox', 'group'], ['menuitem'], ['menuitemcheckbox'], ['menuitemradio']],
    requiredProps: {},
    superClass: [['roletype', 'widget', 'composite', 'select'], ['roletype', 'structure', 'section', 'group', 'select']]
  };
  var _default$1m = menuRole;
  menuRole$1.default = _default$1m;

  var menubarRole$1 = {};

  Object.defineProperty(menubarRole$1, "__esModule", {
    value: true
  });
  menubarRole$1.default = void 0;
  var menubarRole = {
    abstract: false,
    accessibleNameRequired: false,
    baseConcepts: [],
    childrenPresentational: false,
    nameFrom: ['author'],
    prohibitedProps: [],
    props: {
      'aria-orientation': 'horizontal'
    },
    relatedConcepts: [{
      concept: {
        name: 'toolbar'
      },
      module: 'ARIA'
    }],
    requireContextRole: [],
    requiredContextRole: [],
    requiredOwnedElements: [['menuitem', 'group'], ['menuitemradio', 'group'], ['menuitemcheckbox', 'group'], ['menuitem'], ['menuitemcheckbox'], ['menuitemradio']],
    requiredProps: {},
    superClass: [['roletype', 'widget', 'composite', 'select', 'menu'], ['roletype', 'structure', 'section', 'group', 'select', 'menu']]
  };
  var _default$1l = menubarRole;
  menubarRole$1.default = _default$1l;

  var menuitemRole$1 = {};

  Object.defineProperty(menuitemRole$1, "__esModule", {
    value: true
  });
  menuitemRole$1.default = void 0;
  var menuitemRole = {
    abstract: false,
    accessibleNameRequired: true,
    baseConcepts: [],
    childrenPresentational: false,
    nameFrom: ['author', 'contents'],
    prohibitedProps: [],
    props: {
      'aria-disabled': null,
      'aria-expanded': null,
      'aria-haspopup': null,
      'aria-posinset': null,
      'aria-setsize': null
    },
    relatedConcepts: [{
      concept: {
        name: 'MENU_ITEM'
      },
      module: 'JAPI'
    }, {
      concept: {
        name: 'listitem'
      },
      module: 'ARIA'
    }, {
      concept: {
        name: 'menuitem'
      },
      module: 'HTML'
    }, {
      concept: {
        name: 'option'
      },
      module: 'ARIA'
    }],
    requireContextRole: ['group', 'menu', 'menubar'],
    requiredContextRole: ['group', 'menu', 'menubar'],
    requiredOwnedElements: [],
    requiredProps: {},
    superClass: [['roletype', 'widget', 'command']]
  };
  var _default$1k = menuitemRole;
  menuitemRole$1.default = _default$1k;

  var menuitemcheckboxRole$1 = {};

  Object.defineProperty(menuitemcheckboxRole$1, "__esModule", {
    value: true
  });
  menuitemcheckboxRole$1.default = void 0;
  var menuitemcheckboxRole = {
    abstract: false,
    accessibleNameRequired: true,
    baseConcepts: [],
    childrenPresentational: true,
    nameFrom: ['author', 'contents'],
    prohibitedProps: [],
    props: {},
    relatedConcepts: [{
      concept: {
        name: 'menuitem'
      },
      module: 'ARIA'
    }],
    requireContextRole: ['group', 'menu', 'menubar'],
    requiredContextRole: ['group', 'menu', 'menubar'],
    requiredOwnedElements: [],
    requiredProps: {
      'aria-checked': null
    },
    superClass: [['roletype', 'widget', 'input', 'checkbox'], ['roletype', 'widget', 'command', 'menuitem']]
  };
  var _default$1j = menuitemcheckboxRole;
  menuitemcheckboxRole$1.default = _default$1j;

  var menuitemradioRole$1 = {};

  Object.defineProperty(menuitemradioRole$1, "__esModule", {
    value: true
  });
  menuitemradioRole$1.default = void 0;
  var menuitemradioRole = {
    abstract: false,
    accessibleNameRequired: true,
    baseConcepts: [],
    childrenPresentational: true,
    nameFrom: ['author', 'contents'],
    prohibitedProps: [],
    props: {},
    relatedConcepts: [{
      concept: {
        name: 'menuitem'
      },
      module: 'ARIA'
    }],
    requireContextRole: ['group', 'menu', 'menubar'],
    requiredContextRole: ['group', 'menu', 'menubar'],
    requiredOwnedElements: [],
    requiredProps: {
      'aria-checked': null
    },
    superClass: [['roletype', 'widget', 'input', 'checkbox', 'menuitemcheckbox'], ['roletype', 'widget', 'command', 'menuitem', 'menuitemcheckbox'], ['roletype', 'widget', 'input', 'radio']]
  };
  var _default$1i = menuitemradioRole;
  menuitemradioRole$1.default = _default$1i;

  var meterRole$1 = {};

  Object.defineProperty(meterRole$1, "__esModule", {
    value: true
  });
  meterRole$1.default = void 0;
  var meterRole = {
    abstract: false,
    accessibleNameRequired: true,
    baseConcepts: [],
    childrenPresentational: true,
    nameFrom: ['author'],
    prohibitedProps: [],
    props: {
      'aria-valuetext': null,
      'aria-valuemax': '100',
      'aria-valuemin': '0'
    },
    relatedConcepts: [],
    requireContextRole: [],
    requiredContextRole: [],
    requiredOwnedElements: [],
    requiredProps: {
      'aria-valuenow': null
    },
    superClass: [['roletype', 'structure', 'range']]
  };
  var _default$1h = meterRole;
  meterRole$1.default = _default$1h;

  var navigationRole$1 = {};

  Object.defineProperty(navigationRole$1, "__esModule", {
    value: true
  });
  navigationRole$1.default = void 0;
  var navigationRole = {
    abstract: false,
    accessibleNameRequired: false,
    baseConcepts: [],
    childrenPresentational: false,
    nameFrom: ['author'],
    prohibitedProps: [],
    props: {},
    relatedConcepts: [{
      concept: {
        name: 'nav'
      },
      module: 'HTML'
    }],
    requireContextRole: [],
    requiredContextRole: [],
    requiredOwnedElements: [],
    requiredProps: {},
    superClass: [['roletype', 'structure', 'section', 'landmark']]
  };
  var _default$1g = navigationRole;
  navigationRole$1.default = _default$1g;

  var noneRole$1 = {};

  Object.defineProperty(noneRole$1, "__esModule", {
    value: true
  });
  noneRole$1.default = void 0;
  var noneRole = {
    abstract: false,
    accessibleNameRequired: false,
    baseConcepts: [],
    childrenPresentational: false,
    nameFrom: [],
    prohibitedProps: [],
    props: {},
    relatedConcepts: [],
    requireContextRole: [],
    requiredContextRole: [],
    requiredOwnedElements: [],
    requiredProps: {},
    superClass: []
  };
  var _default$1f = noneRole;
  noneRole$1.default = _default$1f;

  var noteRole$1 = {};

  Object.defineProperty(noteRole$1, "__esModule", {
    value: true
  });
  noteRole$1.default = void 0;
  var noteRole = {
    abstract: false,
    accessibleNameRequired: false,
    baseConcepts: [],
    childrenPresentational: false,
    nameFrom: ['author'],
    prohibitedProps: [],
    props: {},
    relatedConcepts: [],
    requireContextRole: [],
    requiredContextRole: [],
    requiredOwnedElements: [],
    requiredProps: {},
    superClass: [['roletype', 'structure', 'section']]
  };
  var _default$1e = noteRole;
  noteRole$1.default = _default$1e;

  var optionRole$1 = {};

  Object.defineProperty(optionRole$1, "__esModule", {
    value: true
  });
  optionRole$1.default = void 0;
  var optionRole = {
    abstract: false,
    accessibleNameRequired: true,
    baseConcepts: [],
    childrenPresentational: true,
    nameFrom: ['author', 'contents'],
    prohibitedProps: [],
    props: {
      'aria-checked': null,
      'aria-posinset': null,
      'aria-setsize': null,
      'aria-selected': 'false'
    },
    relatedConcepts: [{
      concept: {
        name: 'item'
      },
      module: 'XForms'
    }, {
      concept: {
        name: 'listitem'
      },
      module: 'ARIA'
    }, {
      concept: {
        name: 'option'
      },
      module: 'HTML'
    }],
    requireContextRole: [],
    requiredContextRole: [],
    requiredOwnedElements: [],
    requiredProps: {
      'aria-selected': 'false'
    },
    superClass: [['roletype', 'widget', 'input']]
  };
  var _default$1d = optionRole;
  optionRole$1.default = _default$1d;

  var paragraphRole$1 = {};

  Object.defineProperty(paragraphRole$1, "__esModule", {
    value: true
  });
  paragraphRole$1.default = void 0;
  var paragraphRole = {
    abstract: false,
    accessibleNameRequired: false,
    baseConcepts: [],
    childrenPresentational: false,
    nameFrom: ['prohibited'],
    prohibitedProps: ['aria-label', 'aria-labelledby'],
    props: {},
    relatedConcepts: [],
    requireContextRole: [],
    requiredContextRole: [],
    requiredOwnedElements: [],
    requiredProps: {},
    superClass: [['roletype', 'structure', 'section']]
  };
  var _default$1c = paragraphRole;
  paragraphRole$1.default = _default$1c;

  var presentationRole$1 = {};

  Object.defineProperty(presentationRole$1, "__esModule", {
    value: true
  });
  presentationRole$1.default = void 0;
  var presentationRole = {
    abstract: false,
    accessibleNameRequired: false,
    baseConcepts: [],
    childrenPresentational: false,
    nameFrom: ['prohibited'],
    prohibitedProps: ['aria-label', 'aria-labelledby'],
    props: {},
    relatedConcepts: [],
    requireContextRole: [],
    requiredContextRole: [],
    requiredOwnedElements: [],
    requiredProps: {},
    superClass: [['roletype', 'structure']]
  };
  var _default$1b = presentationRole;
  presentationRole$1.default = _default$1b;

  var progressbarRole$1 = {};

  Object.defineProperty(progressbarRole$1, "__esModule", {
    value: true
  });
  progressbarRole$1.default = void 0;
  var progressbarRole = {
    abstract: false,
    accessibleNameRequired: true,
    baseConcepts: [],
    childrenPresentational: true,
    nameFrom: ['author'],
    prohibitedProps: [],
    props: {
      'aria-valuetext': null
    },
    relatedConcepts: [{
      concept: {
        name: 'progress'
      },
      module: 'HTML'
    }, {
      concept: {
        name: 'status'
      },
      module: 'ARIA'
    }],
    requireContextRole: [],
    requiredContextRole: [],
    requiredOwnedElements: [],
    requiredProps: {},
    superClass: [['roletype', 'structure', 'range'], ['roletype', 'widget']]
  };
  var _default$1a = progressbarRole;
  progressbarRole$1.default = _default$1a;

  var radioRole$1 = {};

  Object.defineProperty(radioRole$1, "__esModule", {
    value: true
  });
  radioRole$1.default = void 0;
  var radioRole = {
    abstract: false,
    accessibleNameRequired: true,
    baseConcepts: [],
    childrenPresentational: true,
    nameFrom: ['author', 'contents'],
    prohibitedProps: [],
    props: {
      'aria-checked': null,
      'aria-posinset': null,
      'aria-setsize': null
    },
    relatedConcepts: [{
      concept: {
        attributes: [{
          name: 'type',
          value: 'radio'
        }],
        name: 'input'
      },
      module: 'HTML'
    }],
    requireContextRole: [],
    requiredContextRole: [],
    requiredOwnedElements: [],
    requiredProps: {
      'aria-checked': null
    },
    superClass: [['roletype', 'widget', 'input']]
  };
  var _default$19 = radioRole;
  radioRole$1.default = _default$19;

  var radiogroupRole$1 = {};

  Object.defineProperty(radiogroupRole$1, "__esModule", {
    value: true
  });
  radiogroupRole$1.default = void 0;
  var radiogroupRole = {
    abstract: false,
    accessibleNameRequired: true,
    baseConcepts: [],
    childrenPresentational: false,
    nameFrom: ['author'],
    prohibitedProps: [],
    props: {
      'aria-errormessage': null,
      'aria-invalid': null,
      'aria-readonly': null,
      'aria-required': null
    },
    relatedConcepts: [{
      concept: {
        name: 'list'
      },
      module: 'ARIA'
    }],
    requireContextRole: [],
    requiredContextRole: [],
    requiredOwnedElements: [['radio']],
    requiredProps: {},
    superClass: [['roletype', 'widget', 'composite', 'select'], ['roletype', 'structure', 'section', 'group', 'select']]
  };
  var _default$18 = radiogroupRole;
  radiogroupRole$1.default = _default$18;

  var regionRole$1 = {};

  Object.defineProperty(regionRole$1, "__esModule", {
    value: true
  });
  regionRole$1.default = void 0;
  var regionRole = {
    abstract: false,
    accessibleNameRequired: true,
    baseConcepts: [],
    childrenPresentational: false,
    nameFrom: ['author'],
    prohibitedProps: [],
    props: {},
    relatedConcepts: [{
      concept: {
        attributes: [{
          constraints: ['set'],
          name: 'aria-label'
        }],
        name: 'section'
      },
      module: 'HTML'
    }, {
      concept: {
        attributes: [{
          constraints: ['set'],
          name: 'aria-labelledby'
        }],
        name: 'section'
      },
      module: 'HTML'
    }, {
      concept: {
        name: 'Device Independence Glossart perceivable unit'
      }
    }, {
      concept: {
        name: 'frame'
      },
      module: 'HTML'
    }],
    requireContextRole: [],
    requiredContextRole: [],
    requiredOwnedElements: [],
    requiredProps: {},
    superClass: [['roletype', 'structure', 'section', 'landmark']]
  };
  var _default$17 = regionRole;
  regionRole$1.default = _default$17;

  var rowRole$1 = {};

  Object.defineProperty(rowRole$1, "__esModule", {
    value: true
  });
  rowRole$1.default = void 0;
  var rowRole = {
    abstract: false,
    accessibleNameRequired: false,
    baseConcepts: [],
    childrenPresentational: false,
    nameFrom: ['author', 'contents'],
    prohibitedProps: [],
    props: {
      'aria-colindex': null,
      'aria-expanded': null,
      'aria-level': null,
      'aria-posinset': null,
      'aria-rowindex': null,
      'aria-selected': null,
      'aria-setsize': null
    },
    relatedConcepts: [{
      concept: {
        name: 'tr'
      },
      module: 'HTML'
    }],
    requireContextRole: ['grid', 'rowgroup', 'table', 'treegrid'],
    requiredContextRole: ['grid', 'rowgroup', 'table', 'treegrid'],
    requiredOwnedElements: [['cell'], ['columnheader'], ['gridcell'], ['rowheader']],
    requiredProps: {},
    superClass: [['roletype', 'structure', 'section', 'group'], ['roletype', 'widget']]
  };
  var _default$16 = rowRole;
  rowRole$1.default = _default$16;

  var rowgroupRole$1 = {};

  Object.defineProperty(rowgroupRole$1, "__esModule", {
    value: true
  });
  rowgroupRole$1.default = void 0;
  var rowgroupRole = {
    abstract: false,
    accessibleNameRequired: false,
    baseConcepts: [],
    childrenPresentational: false,
    nameFrom: ['author', 'contents'],
    prohibitedProps: [],
    props: {},
    relatedConcepts: [{
      concept: {
        name: 'tbody'
      },
      module: 'HTML'
    }, {
      concept: {
        name: 'tfoot'
      },
      module: 'HTML'
    }, {
      concept: {
        name: 'thead'
      },
      module: 'HTML'
    }],
    requireContextRole: ['grid', 'table', 'treegrid'],
    requiredContextRole: ['grid', 'table', 'treegrid'],
    requiredOwnedElements: [['row']],
    requiredProps: {},
    superClass: [['roletype', 'structure']]
  };
  var _default$15 = rowgroupRole;
  rowgroupRole$1.default = _default$15;

  var rowheaderRole$1 = {};

  Object.defineProperty(rowheaderRole$1, "__esModule", {
    value: true
  });
  rowheaderRole$1.default = void 0;
  var rowheaderRole = {
    abstract: false,
    accessibleNameRequired: true,
    baseConcepts: [],
    childrenPresentational: false,
    nameFrom: ['author', 'contents'],
    prohibitedProps: [],
    props: {
      'aria-sort': null
    },
    relatedConcepts: [{
      concept: {
        attributes: [{
          name: 'scope',
          value: 'row'
        }],
        name: 'th'
      },
      module: 'HTML'
    }],
    requireContextRole: ['row'],
    requiredContextRole: ['row'],
    requiredOwnedElements: [],
    requiredProps: {},
    superClass: [['roletype', 'structure', 'section', 'cell'], ['roletype', 'structure', 'section', 'cell', 'gridcell'], ['roletype', 'widget', 'gridcell'], ['roletype', 'structure', 'sectionhead']]
  };
  var _default$14 = rowheaderRole;
  rowheaderRole$1.default = _default$14;

  var scrollbarRole$1 = {};

  Object.defineProperty(scrollbarRole$1, "__esModule", {
    value: true
  });
  scrollbarRole$1.default = void 0;
  var scrollbarRole = {
    abstract: false,
    accessibleNameRequired: false,
    baseConcepts: [],
    childrenPresentational: true,
    nameFrom: ['author'],
    prohibitedProps: [],
    props: {
      'aria-disabled': null,
      'aria-valuetext': null,
      'aria-orientation': 'vertical',
      'aria-valuemax': '100',
      'aria-valuemin': '0'
    },
    relatedConcepts: [],
    requireContextRole: [],
    requiredContextRole: [],
    requiredOwnedElements: [],
    requiredProps: {
      'aria-controls': null,
      'aria-valuenow': null
    },
    superClass: [['roletype', 'structure', 'range'], ['roletype', 'widget']]
  };
  var _default$13 = scrollbarRole;
  scrollbarRole$1.default = _default$13;

  var searchRole$1 = {};

  Object.defineProperty(searchRole$1, "__esModule", {
    value: true
  });
  searchRole$1.default = void 0;
  var searchRole = {
    abstract: false,
    accessibleNameRequired: false,
    baseConcepts: [],
    childrenPresentational: false,
    nameFrom: ['author'],
    prohibitedProps: [],
    props: {},
    relatedConcepts: [],
    requireContextRole: [],
    requiredContextRole: [],
    requiredOwnedElements: [],
    requiredProps: {},
    superClass: [['roletype', 'structure', 'section', 'landmark']]
  };
  var _default$12 = searchRole;
  searchRole$1.default = _default$12;

  var searchboxRole$1 = {};

  Object.defineProperty(searchboxRole$1, "__esModule", {
    value: true
  });
  searchboxRole$1.default = void 0;
  var searchboxRole = {
    abstract: false,
    accessibleNameRequired: true,
    baseConcepts: [],
    childrenPresentational: false,
    nameFrom: ['author'],
    prohibitedProps: [],
    props: {},
    relatedConcepts: [{
      concept: {
        attributes: [{
          constraints: ['undefined'],
          name: 'list'
        }, {
          name: 'type',
          value: 'search'
        }],
        name: 'input'
      },
      module: 'HTML'
    }],
    requireContextRole: [],
    requiredContextRole: [],
    requiredOwnedElements: [],
    requiredProps: {},
    superClass: [['roletype', 'widget', 'input', 'textbox']]
  };
  var _default$11 = searchboxRole;
  searchboxRole$1.default = _default$11;

  var separatorRole$1 = {};

  Object.defineProperty(separatorRole$1, "__esModule", {
    value: true
  });
  separatorRole$1.default = void 0;
  var separatorRole = {
    abstract: false,
    accessibleNameRequired: false,
    baseConcepts: [],
    childrenPresentational: true,
    nameFrom: ['author'],
    prohibitedProps: [],
    props: {
      'aria-disabled': null,
      'aria-orientation': 'horizontal',
      'aria-valuemax': '100',
      'aria-valuemin': '0',
      'aria-valuenow': null,
      'aria-valuetext': null
    },
    relatedConcepts: [{
      concept: {
        name: 'hr'
      },
      module: 'HTML'
    }],
    requireContextRole: [],
    requiredContextRole: [],
    requiredOwnedElements: [],
    requiredProps: {},
    superClass: [['roletype', 'structure']]
  };
  var _default$10 = separatorRole;
  separatorRole$1.default = _default$10;

  var sliderRole$1 = {};

  Object.defineProperty(sliderRole$1, "__esModule", {
    value: true
  });
  sliderRole$1.default = void 0;
  var sliderRole = {
    abstract: false,
    accessibleNameRequired: true,
    baseConcepts: [],
    childrenPresentational: true,
    nameFrom: ['author'],
    prohibitedProps: [],
    props: {
      'aria-errormessage': null,
      'aria-haspopup': null,
      'aria-invalid': null,
      'aria-readonly': null,
      'aria-valuetext': null,
      'aria-orientation': 'horizontal',
      'aria-valuemax': '100',
      'aria-valuemin': '0'
    },
    relatedConcepts: [{
      concept: {
        attributes: [{
          name: 'type',
          value: 'range'
        }],
        name: 'input'
      },
      module: 'HTML'
    }],
    requireContextRole: [],
    requiredContextRole: [],
    requiredOwnedElements: [],
    requiredProps: {
      'aria-valuenow': null
    },
    superClass: [['roletype', 'widget', 'input'], ['roletype', 'structure', 'range']]
  };
  var _default$$ = sliderRole;
  sliderRole$1.default = _default$$;

  var spinbuttonRole$1 = {};

  Object.defineProperty(spinbuttonRole$1, "__esModule", {
    value: true
  });
  spinbuttonRole$1.default = void 0;
  var spinbuttonRole = {
    abstract: false,
    accessibleNameRequired: true,
    baseConcepts: [],
    childrenPresentational: false,
    nameFrom: ['author'],
    prohibitedProps: [],
    props: {
      'aria-errormessage': null,
      'aria-invalid': null,
      'aria-readonly': null,
      'aria-required': null,
      'aria-valuetext': null,
      'aria-valuenow': '0'
    },
    relatedConcepts: [{
      concept: {
        attributes: [{
          name: 'type',
          value: 'number'
        }],
        name: 'input'
      },
      module: 'HTML'
    }],
    requireContextRole: [],
    requiredContextRole: [],
    requiredOwnedElements: [],
    requiredProps: {},
    superClass: [['roletype', 'widget', 'composite'], ['roletype', 'widget', 'input'], ['roletype', 'structure', 'range']]
  };
  var _default$_ = spinbuttonRole;
  spinbuttonRole$1.default = _default$_;

  var statusRole$1 = {};

  Object.defineProperty(statusRole$1, "__esModule", {
    value: true
  });
  statusRole$1.default = void 0;
  var statusRole = {
    abstract: false,
    accessibleNameRequired: false,
    baseConcepts: [],
    childrenPresentational: false,
    nameFrom: ['author'],
    prohibitedProps: [],
    props: {
      'aria-atomic': 'true',
      'aria-live': 'polite'
    },
    relatedConcepts: [{
      concept: {
        name: 'output'
      },
      module: 'HTML'
    }],
    requireContextRole: [],
    requiredContextRole: [],
    requiredOwnedElements: [],
    requiredProps: {},
    superClass: [['roletype', 'structure', 'section']]
  };
  var _default$Z = statusRole;
  statusRole$1.default = _default$Z;

  var strongRole$1 = {};

  Object.defineProperty(strongRole$1, "__esModule", {
    value: true
  });
  strongRole$1.default = void 0;
  var strongRole = {
    abstract: false,
    accessibleNameRequired: false,
    baseConcepts: [],
    childrenPresentational: false,
    nameFrom: ['prohibited'],
    prohibitedProps: ['aria-label', 'aria-labelledby'],
    props: {},
    relatedConcepts: [],
    requireContextRole: [],
    requiredContextRole: [],
    requiredOwnedElements: [],
    requiredProps: {},
    superClass: [['roletype', 'structure', 'section']]
  };
  var _default$Y = strongRole;
  strongRole$1.default = _default$Y;

  var subscriptRole$1 = {};

  Object.defineProperty(subscriptRole$1, "__esModule", {
    value: true
  });
  subscriptRole$1.default = void 0;
  var subscriptRole = {
    abstract: false,
    accessibleNameRequired: false,
    baseConcepts: [],
    childrenPresentational: false,
    nameFrom: ['prohibited'],
    prohibitedProps: ['aria-label', 'aria-labelledby'],
    props: {},
    relatedConcepts: [],
    requireContextRole: [],
    requiredContextRole: [],
    requiredOwnedElements: [],
    requiredProps: {},
    superClass: [['roletype', 'structure', 'section']]
  };
  var _default$X = subscriptRole;
  subscriptRole$1.default = _default$X;

  var superscriptRole$1 = {};

  Object.defineProperty(superscriptRole$1, "__esModule", {
    value: true
  });
  superscriptRole$1.default = void 0;
  var superscriptRole = {
    abstract: false,
    accessibleNameRequired: false,
    baseConcepts: [],
    childrenPresentational: false,
    nameFrom: ['prohibited'],
    prohibitedProps: ['aria-label', 'aria-labelledby'],
    props: {},
    relatedConcepts: [],
    requireContextRole: [],
    requiredContextRole: [],
    requiredOwnedElements: [],
    requiredProps: {},
    superClass: [['roletype', 'structure', 'section']]
  };
  var _default$W = superscriptRole;
  superscriptRole$1.default = _default$W;

  var switchRole$1 = {};

  Object.defineProperty(switchRole$1, "__esModule", {
    value: true
  });
  switchRole$1.default = void 0;
  var switchRole = {
    abstract: false,
    accessibleNameRequired: true,
    baseConcepts: [],
    childrenPresentational: true,
    nameFrom: ['author', 'contents'],
    prohibitedProps: [],
    props: {},
    relatedConcepts: [{
      concept: {
        name: 'button'
      },
      module: 'ARIA'
    }],
    requireContextRole: [],
    requiredContextRole: [],
    requiredOwnedElements: [],
    requiredProps: {
      'aria-checked': null
    },
    superClass: [['roletype', 'widget', 'input', 'checkbox']]
  };
  var _default$V = switchRole;
  switchRole$1.default = _default$V;

  var tabRole$1 = {};

  Object.defineProperty(tabRole$1, "__esModule", {
    value: true
  });
  tabRole$1.default = void 0;
  var tabRole = {
    abstract: false,
    accessibleNameRequired: false,
    baseConcepts: [],
    childrenPresentational: true,
    nameFrom: ['author', 'contents'],
    prohibitedProps: [],
    props: {
      'aria-disabled': null,
      'aria-expanded': null,
      'aria-haspopup': null,
      'aria-posinset': null,
      'aria-setsize': null,
      'aria-selected': 'false'
    },
    relatedConcepts: [],
    requireContextRole: ['tablist'],
    requiredContextRole: ['tablist'],
    requiredOwnedElements: [],
    requiredProps: {},
    superClass: [['roletype', 'structure', 'sectionhead'], ['roletype', 'widget']]
  };
  var _default$U = tabRole;
  tabRole$1.default = _default$U;

  var tableRole$1 = {};

  Object.defineProperty(tableRole$1, "__esModule", {
    value: true
  });
  tableRole$1.default = void 0;
  var tableRole = {
    abstract: false,
    accessibleNameRequired: true,
    baseConcepts: [],
    childrenPresentational: false,
    nameFrom: ['author'],
    prohibitedProps: [],
    props: {
      'aria-colcount': null,
      'aria-rowcount': null
    },
    relatedConcepts: [{
      concept: {
        name: 'table'
      },
      module: 'HTML'
    }],
    requireContextRole: [],
    requiredContextRole: [],
    requiredOwnedElements: [['row'], ['row', 'rowgroup']],
    requiredProps: {},
    superClass: [['roletype', 'structure', 'section']]
  };
  var _default$T = tableRole;
  tableRole$1.default = _default$T;

  var tablistRole$1 = {};

  Object.defineProperty(tablistRole$1, "__esModule", {
    value: true
  });
  tablistRole$1.default = void 0;
  var tablistRole = {
    abstract: false,
    accessibleNameRequired: false,
    baseConcepts: [],
    childrenPresentational: false,
    nameFrom: ['author'],
    prohibitedProps: [],
    props: {
      'aria-level': null,
      'aria-multiselectable': null,
      'aria-orientation': 'horizontal'
    },
    relatedConcepts: [{
      module: 'DAISY',
      concept: {
        name: 'guide'
      }
    }],
    requireContextRole: [],
    requiredContextRole: [],
    requiredOwnedElements: [['tab']],
    requiredProps: {},
    superClass: [['roletype', 'widget', 'composite']]
  };
  var _default$S = tablistRole;
  tablistRole$1.default = _default$S;

  var tabpanelRole$1 = {};

  Object.defineProperty(tabpanelRole$1, "__esModule", {
    value: true
  });
  tabpanelRole$1.default = void 0;
  var tabpanelRole = {
    abstract: false,
    accessibleNameRequired: true,
    baseConcepts: [],
    childrenPresentational: false,
    nameFrom: ['author'],
    prohibitedProps: [],
    props: {},
    relatedConcepts: [],
    requireContextRole: [],
    requiredContextRole: [],
    requiredOwnedElements: [],
    requiredProps: {},
    superClass: [['roletype', 'structure', 'section']]
  };
  var _default$R = tabpanelRole;
  tabpanelRole$1.default = _default$R;

  var termRole$1 = {};

  Object.defineProperty(termRole$1, "__esModule", {
    value: true
  });
  termRole$1.default = void 0;
  var termRole = {
    abstract: false,
    accessibleNameRequired: false,
    baseConcepts: [],
    childrenPresentational: false,
    nameFrom: ['author'],
    prohibitedProps: [],
    props: {},
    relatedConcepts: [{
      concept: {
        name: 'dfn'
      },
      module: 'HTML'
    }, {
      concept: {
        name: 'dt'
      },
      module: 'HTML'
    }],
    requireContextRole: [],
    requiredContextRole: [],
    requiredOwnedElements: [],
    requiredProps: {},
    superClass: [['roletype', 'structure', 'section']]
  };
  var _default$Q = termRole;
  termRole$1.default = _default$Q;

  var textboxRole$1 = {};

  Object.defineProperty(textboxRole$1, "__esModule", {
    value: true
  });
  textboxRole$1.default = void 0;
  var textboxRole = {
    abstract: false,
    accessibleNameRequired: true,
    baseConcepts: [],
    childrenPresentational: false,
    nameFrom: ['author'],
    prohibitedProps: [],
    props: {
      'aria-activedescendant': null,
      'aria-autocomplete': null,
      'aria-errormessage': null,
      'aria-haspopup': null,
      'aria-invalid': null,
      'aria-multiline': null,
      'aria-placeholder': null,
      'aria-readonly': null,
      'aria-required': null
    },
    relatedConcepts: [{
      concept: {
        attributes: [{
          constraints: ['undefined'],
          name: 'type'
        }, {
          constraints: ['undefined'],
          name: 'list'
        }],
        name: 'input'
      },
      module: 'HTML'
    }, {
      concept: {
        attributes: [{
          constraints: ['undefined'],
          name: 'list'
        }, {
          name: 'type',
          value: 'email'
        }],
        name: 'input'
      },
      module: 'HTML'
    }, {
      concept: {
        attributes: [{
          constraints: ['undefined'],
          name: 'list'
        }, {
          name: 'type',
          value: 'tel'
        }],
        name: 'input'
      },
      module: 'HTML'
    }, {
      concept: {
        attributes: [{
          constraints: ['undefined'],
          name: 'list'
        }, {
          name: 'type',
          value: 'text'
        }],
        name: 'input'
      },
      module: 'HTML'
    }, {
      concept: {
        attributes: [{
          constraints: ['undefined'],
          name: 'list'
        }, {
          name: 'type',
          value: 'url'
        }],
        name: 'input'
      },
      module: 'HTML'
    }, {
      concept: {
        name: 'input'
      },
      module: 'XForms'
    }, {
      concept: {
        name: 'textarea'
      },
      module: 'HTML'
    }],
    requireContextRole: [],
    requiredContextRole: [],
    requiredOwnedElements: [],
    requiredProps: {},
    superClass: [['roletype', 'widget', 'input']]
  };
  var _default$P = textboxRole;
  textboxRole$1.default = _default$P;

  var timeRole$1 = {};

  Object.defineProperty(timeRole$1, "__esModule", {
    value: true
  });
  timeRole$1.default = void 0;
  var timeRole = {
    abstract: false,
    accessibleNameRequired: false,
    baseConcepts: [],
    childrenPresentational: false,
    nameFrom: ['author'],
    prohibitedProps: [],
    props: {},
    relatedConcepts: [],
    requireContextRole: [],
    requiredContextRole: [],
    requiredOwnedElements: [],
    requiredProps: {},
    superClass: [['roletype', 'structure', 'section']]
  };
  var _default$O = timeRole;
  timeRole$1.default = _default$O;

  var timerRole$1 = {};

  Object.defineProperty(timerRole$1, "__esModule", {
    value: true
  });
  timerRole$1.default = void 0;
  var timerRole = {
    abstract: false,
    accessibleNameRequired: false,
    baseConcepts: [],
    childrenPresentational: false,
    nameFrom: ['author'],
    prohibitedProps: [],
    props: {},
    relatedConcepts: [],
    requireContextRole: [],
    requiredContextRole: [],
    requiredOwnedElements: [],
    requiredProps: {},
    superClass: [['roletype', 'structure', 'section', 'status']]
  };
  var _default$N = timerRole;
  timerRole$1.default = _default$N;

  var toolbarRole$1 = {};

  Object.defineProperty(toolbarRole$1, "__esModule", {
    value: true
  });
  toolbarRole$1.default = void 0;
  var toolbarRole = {
    abstract: false,
    accessibleNameRequired: false,
    baseConcepts: [],
    childrenPresentational: false,
    nameFrom: ['author'],
    prohibitedProps: [],
    props: {
      'aria-orientation': 'horizontal'
    },
    relatedConcepts: [{
      concept: {
        name: 'menubar'
      },
      module: 'ARIA'
    }],
    requireContextRole: [],
    requiredContextRole: [],
    requiredOwnedElements: [],
    requiredProps: {},
    superClass: [['roletype', 'structure', 'section', 'group']]
  };
  var _default$M = toolbarRole;
  toolbarRole$1.default = _default$M;

  var tooltipRole$1 = {};

  Object.defineProperty(tooltipRole$1, "__esModule", {
    value: true
  });
  tooltipRole$1.default = void 0;
  var tooltipRole = {
    abstract: false,
    accessibleNameRequired: true,
    baseConcepts: [],
    childrenPresentational: false,
    nameFrom: ['author', 'contents'],
    prohibitedProps: [],
    props: {},
    relatedConcepts: [],
    requireContextRole: [],
    requiredContextRole: [],
    requiredOwnedElements: [],
    requiredProps: {},
    superClass: [['roletype', 'structure', 'section']]
  };
  var _default$L = tooltipRole;
  tooltipRole$1.default = _default$L;

  var treeRole$1 = {};

  Object.defineProperty(treeRole$1, "__esModule", {
    value: true
  });
  treeRole$1.default = void 0;
  var treeRole = {
    abstract: false,
    accessibleNameRequired: true,
    baseConcepts: [],
    childrenPresentational: false,
    nameFrom: ['author'],
    prohibitedProps: [],
    props: {
      'aria-errormessage': null,
      'aria-invalid': null,
      'aria-multiselectable': null,
      'aria-required': null,
      'aria-orientation': 'vertical'
    },
    relatedConcepts: [],
    requireContextRole: [],
    requiredContextRole: [],
    requiredOwnedElements: [['treeitem', 'group'], ['treeitem']],
    requiredProps: {},
    superClass: [['roletype', 'widget', 'composite', 'select'], ['roletype', 'structure', 'section', 'group', 'select']]
  };
  var _default$K = treeRole;
  treeRole$1.default = _default$K;

  var treegridRole$1 = {};

  Object.defineProperty(treegridRole$1, "__esModule", {
    value: true
  });
  treegridRole$1.default = void 0;
  var treegridRole = {
    abstract: false,
    accessibleNameRequired: true,
    baseConcepts: [],
    childrenPresentational: false,
    nameFrom: ['author'],
    prohibitedProps: [],
    props: {},
    relatedConcepts: [],
    requireContextRole: [],
    requiredContextRole: [],
    requiredOwnedElements: [['row'], ['row', 'rowgroup']],
    requiredProps: {},
    superClass: [['roletype', 'widget', 'composite', 'grid'], ['roletype', 'structure', 'section', 'table', 'grid'], ['roletype', 'widget', 'composite', 'select', 'tree'], ['roletype', 'structure', 'section', 'group', 'select', 'tree']]
  };
  var _default$J = treegridRole;
  treegridRole$1.default = _default$J;

  var treeitemRole$1 = {};

  Object.defineProperty(treeitemRole$1, "__esModule", {
    value: true
  });
  treeitemRole$1.default = void 0;
  var treeitemRole = {
    abstract: false,
    accessibleNameRequired: true,
    baseConcepts: [],
    childrenPresentational: false,
    nameFrom: ['author', 'contents'],
    prohibitedProps: [],
    props: {
      'aria-expanded': null,
      'aria-haspopup': null
    },
    relatedConcepts: [],
    requireContextRole: ['group', 'tree'],
    requiredContextRole: ['group', 'tree'],
    requiredOwnedElements: [],
    requiredProps: {
      'aria-selected': null
    },
    superClass: [['roletype', 'structure', 'section', 'listitem'], ['roletype', 'widget', 'input', 'option']]
  };
  var _default$I = treeitemRole;
  treeitemRole$1.default = _default$I;

  Object.defineProperty(ariaLiteralRoles$1, "__esModule", {
    value: true
  });
  ariaLiteralRoles$1.default = void 0;

  var _alertRole = _interopRequireDefault$5(alertRole$1);

  var _alertdialogRole = _interopRequireDefault$5(alertdialogRole$1);

  var _applicationRole = _interopRequireDefault$5(applicationRole$1);

  var _articleRole = _interopRequireDefault$5(articleRole$1);

  var _bannerRole = _interopRequireDefault$5(bannerRole$1);

  var _blockquoteRole = _interopRequireDefault$5(blockquoteRole$1);

  var _buttonRole = _interopRequireDefault$5(buttonRole$1);

  var _captionRole = _interopRequireDefault$5(captionRole$1);

  var _cellRole = _interopRequireDefault$5(cellRole$1);

  var _checkboxRole = _interopRequireDefault$5(checkboxRole$1);

  var _codeRole = _interopRequireDefault$5(codeRole$1);

  var _columnheaderRole = _interopRequireDefault$5(columnheaderRole$1);

  var _comboboxRole = _interopRequireDefault$5(comboboxRole$1);

  var _complementaryRole = _interopRequireDefault$5(complementaryRole$1);

  var _contentinfoRole = _interopRequireDefault$5(contentinfoRole$1);

  var _definitionRole = _interopRequireDefault$5(definitionRole$1);

  var _deletionRole = _interopRequireDefault$5(deletionRole$1);

  var _dialogRole = _interopRequireDefault$5(dialogRole$1);

  var _directoryRole = _interopRequireDefault$5(directoryRole$1);

  var _documentRole = _interopRequireDefault$5(documentRole$1);

  var _emphasisRole = _interopRequireDefault$5(emphasisRole$1);

  var _feedRole = _interopRequireDefault$5(feedRole$1);

  var _figureRole = _interopRequireDefault$5(figureRole$1);

  var _formRole = _interopRequireDefault$5(formRole$1);

  var _genericRole = _interopRequireDefault$5(genericRole$1);

  var _gridRole = _interopRequireDefault$5(gridRole$1);

  var _gridcellRole = _interopRequireDefault$5(gridcellRole$1);

  var _groupRole = _interopRequireDefault$5(groupRole$1);

  var _headingRole = _interopRequireDefault$5(headingRole$1);

  var _imgRole = _interopRequireDefault$5(imgRole$1);

  var _insertionRole = _interopRequireDefault$5(insertionRole$1);

  var _linkRole = _interopRequireDefault$5(linkRole$1);

  var _listRole = _interopRequireDefault$5(listRole$1);

  var _listboxRole = _interopRequireDefault$5(listboxRole$1);

  var _listitemRole = _interopRequireDefault$5(listitemRole$1);

  var _logRole = _interopRequireDefault$5(logRole$1);

  var _mainRole = _interopRequireDefault$5(mainRole$1);

  var _marqueeRole = _interopRequireDefault$5(marqueeRole$1);

  var _mathRole = _interopRequireDefault$5(mathRole$1);

  var _menuRole = _interopRequireDefault$5(menuRole$1);

  var _menubarRole = _interopRequireDefault$5(menubarRole$1);

  var _menuitemRole = _interopRequireDefault$5(menuitemRole$1);

  var _menuitemcheckboxRole = _interopRequireDefault$5(menuitemcheckboxRole$1);

  var _menuitemradioRole = _interopRequireDefault$5(menuitemradioRole$1);

  var _meterRole = _interopRequireDefault$5(meterRole$1);

  var _navigationRole = _interopRequireDefault$5(navigationRole$1);

  var _noneRole = _interopRequireDefault$5(noneRole$1);

  var _noteRole = _interopRequireDefault$5(noteRole$1);

  var _optionRole = _interopRequireDefault$5(optionRole$1);

  var _paragraphRole = _interopRequireDefault$5(paragraphRole$1);

  var _presentationRole = _interopRequireDefault$5(presentationRole$1);

  var _progressbarRole = _interopRequireDefault$5(progressbarRole$1);

  var _radioRole = _interopRequireDefault$5(radioRole$1);

  var _radiogroupRole = _interopRequireDefault$5(radiogroupRole$1);

  var _regionRole = _interopRequireDefault$5(regionRole$1);

  var _rowRole = _interopRequireDefault$5(rowRole$1);

  var _rowgroupRole = _interopRequireDefault$5(rowgroupRole$1);

  var _rowheaderRole = _interopRequireDefault$5(rowheaderRole$1);

  var _scrollbarRole = _interopRequireDefault$5(scrollbarRole$1);

  var _searchRole = _interopRequireDefault$5(searchRole$1);

  var _searchboxRole = _interopRequireDefault$5(searchboxRole$1);

  var _separatorRole = _interopRequireDefault$5(separatorRole$1);

  var _sliderRole = _interopRequireDefault$5(sliderRole$1);

  var _spinbuttonRole = _interopRequireDefault$5(spinbuttonRole$1);

  var _statusRole = _interopRequireDefault$5(statusRole$1);

  var _strongRole = _interopRequireDefault$5(strongRole$1);

  var _subscriptRole = _interopRequireDefault$5(subscriptRole$1);

  var _superscriptRole = _interopRequireDefault$5(superscriptRole$1);

  var _switchRole = _interopRequireDefault$5(switchRole$1);

  var _tabRole = _interopRequireDefault$5(tabRole$1);

  var _tableRole = _interopRequireDefault$5(tableRole$1);

  var _tablistRole = _interopRequireDefault$5(tablistRole$1);

  var _tabpanelRole = _interopRequireDefault$5(tabpanelRole$1);

  var _termRole = _interopRequireDefault$5(termRole$1);

  var _textboxRole = _interopRequireDefault$5(textboxRole$1);

  var _timeRole = _interopRequireDefault$5(timeRole$1);

  var _timerRole = _interopRequireDefault$5(timerRole$1);

  var _toolbarRole = _interopRequireDefault$5(toolbarRole$1);

  var _tooltipRole = _interopRequireDefault$5(tooltipRole$1);

  var _treeRole = _interopRequireDefault$5(treeRole$1);

  var _treegridRole = _interopRequireDefault$5(treegridRole$1);

  var _treeitemRole = _interopRequireDefault$5(treeitemRole$1);

  function _interopRequireDefault$5(obj) {
    return obj && obj.__esModule ? obj : {
      default: obj
    };
  }

  var ariaLiteralRoles = [['alert', _alertRole.default], ['alertdialog', _alertdialogRole.default], ['application', _applicationRole.default], ['article', _articleRole.default], ['banner', _bannerRole.default], ['blockquote', _blockquoteRole.default], ['button', _buttonRole.default], ['caption', _captionRole.default], ['cell', _cellRole.default], ['checkbox', _checkboxRole.default], ['code', _codeRole.default], ['columnheader', _columnheaderRole.default], ['combobox', _comboboxRole.default], ['complementary', _complementaryRole.default], ['contentinfo', _contentinfoRole.default], ['definition', _definitionRole.default], ['deletion', _deletionRole.default], ['dialog', _dialogRole.default], ['directory', _directoryRole.default], ['document', _documentRole.default], ['emphasis', _emphasisRole.default], ['feed', _feedRole.default], ['figure', _figureRole.default], ['form', _formRole.default], ['generic', _genericRole.default], ['grid', _gridRole.default], ['gridcell', _gridcellRole.default], ['group', _groupRole.default], ['heading', _headingRole.default], ['img', _imgRole.default], ['insertion', _insertionRole.default], ['link', _linkRole.default], ['list', _listRole.default], ['listbox', _listboxRole.default], ['listitem', _listitemRole.default], ['log', _logRole.default], ['main', _mainRole.default], ['marquee', _marqueeRole.default], ['math', _mathRole.default], ['menu', _menuRole.default], ['menubar', _menubarRole.default], ['menuitem', _menuitemRole.default], ['menuitemcheckbox', _menuitemcheckboxRole.default], ['menuitemradio', _menuitemradioRole.default], ['meter', _meterRole.default], ['navigation', _navigationRole.default], ['none', _noneRole.default], ['note', _noteRole.default], ['option', _optionRole.default], ['paragraph', _paragraphRole.default], ['presentation', _presentationRole.default], ['progressbar', _progressbarRole.default], ['radio', _radioRole.default], ['radiogroup', _radiogroupRole.default], ['region', _regionRole.default], ['row', _rowRole.default], ['rowgroup', _rowgroupRole.default], ['rowheader', _rowheaderRole.default], ['scrollbar', _scrollbarRole.default], ['search', _searchRole.default], ['searchbox', _searchboxRole.default], ['separator', _separatorRole.default], ['slider', _sliderRole.default], ['spinbutton', _spinbuttonRole.default], ['status', _statusRole.default], ['strong', _strongRole.default], ['subscript', _subscriptRole.default], ['superscript', _superscriptRole.default], ['switch', _switchRole.default], ['tab', _tabRole.default], ['table', _tableRole.default], ['tablist', _tablistRole.default], ['tabpanel', _tabpanelRole.default], ['term', _termRole.default], ['textbox', _textboxRole.default], ['time', _timeRole.default], ['timer', _timerRole.default], ['toolbar', _toolbarRole.default], ['tooltip', _tooltipRole.default], ['tree', _treeRole.default], ['treegrid', _treegridRole.default], ['treeitem', _treeitemRole.default]];
  var _default$H = ariaLiteralRoles;
  ariaLiteralRoles$1.default = _default$H;

  var ariaDpubRoles$1 = {};

  var docAbstractRole$1 = {};

  Object.defineProperty(docAbstractRole$1, "__esModule", {
    value: true
  });
  docAbstractRole$1.default = void 0;
  var docAbstractRole = {
    abstract: false,
    accessibleNameRequired: false,
    baseConcepts: [],
    childrenPresentational: false,
    nameFrom: ['author'],
    prohibitedProps: [],
    props: {
      'aria-disabled': null,
      'aria-errormessage': null,
      'aria-expanded': null,
      'aria-haspopup': null,
      'aria-invalid': null
    },
    relatedConcepts: [{
      concept: {
        name: 'abstract [EPUB-SSV]'
      },
      module: 'EPUB'
    }],
    requireContextRole: [],
    requiredContextRole: [],
    requiredOwnedElements: [],
    requiredProps: {},
    superClass: [['roletype', 'structure', 'section']]
  };
  var _default$G = docAbstractRole;
  docAbstractRole$1.default = _default$G;

  var docAcknowledgmentsRole$1 = {};

  Object.defineProperty(docAcknowledgmentsRole$1, "__esModule", {
    value: true
  });
  docAcknowledgmentsRole$1.default = void 0;
  var docAcknowledgmentsRole = {
    abstract: false,
    accessibleNameRequired: false,
    baseConcepts: [],
    childrenPresentational: false,
    nameFrom: ['author'],
    prohibitedProps: [],
    props: {
      'aria-disabled': null,
      'aria-errormessage': null,
      'aria-expanded': null,
      'aria-haspopup': null,
      'aria-invalid': null
    },
    relatedConcepts: [{
      concept: {
        name: 'acknowledgments [EPUB-SSV]'
      },
      module: 'EPUB'
    }],
    requireContextRole: [],
    requiredContextRole: [],
    requiredOwnedElements: [],
    requiredProps: {},
    superClass: [['roletype', 'structure', 'section', 'landmark']]
  };
  var _default$F = docAcknowledgmentsRole;
  docAcknowledgmentsRole$1.default = _default$F;

  var docAfterwordRole$1 = {};

  Object.defineProperty(docAfterwordRole$1, "__esModule", {
    value: true
  });
  docAfterwordRole$1.default = void 0;
  var docAfterwordRole = {
    abstract: false,
    accessibleNameRequired: false,
    baseConcepts: [],
    childrenPresentational: false,
    nameFrom: ['author'],
    prohibitedProps: [],
    props: {
      'aria-disabled': null,
      'aria-errormessage': null,
      'aria-expanded': null,
      'aria-haspopup': null,
      'aria-invalid': null
    },
    relatedConcepts: [{
      concept: {
        name: 'afterword [EPUB-SSV]'
      },
      module: 'EPUB'
    }],
    requireContextRole: [],
    requiredContextRole: [],
    requiredOwnedElements: [],
    requiredProps: {},
    superClass: [['roletype', 'structure', 'section', 'landmark']]
  };
  var _default$E = docAfterwordRole;
  docAfterwordRole$1.default = _default$E;

  var docAppendixRole$1 = {};

  Object.defineProperty(docAppendixRole$1, "__esModule", {
    value: true
  });
  docAppendixRole$1.default = void 0;
  var docAppendixRole = {
    abstract: false,
    accessibleNameRequired: false,
    baseConcepts: [],
    childrenPresentational: false,
    nameFrom: ['author'],
    prohibitedProps: [],
    props: {
      'aria-disabled': null,
      'aria-errormessage': null,
      'aria-expanded': null,
      'aria-haspopup': null,
      'aria-invalid': null
    },
    relatedConcepts: [{
      concept: {
        name: 'appendix [EPUB-SSV]'
      },
      module: 'EPUB'
    }],
    requireContextRole: [],
    requiredContextRole: [],
    requiredOwnedElements: [],
    requiredProps: {},
    superClass: [['roletype', 'structure', 'section', 'landmark']]
  };
  var _default$D = docAppendixRole;
  docAppendixRole$1.default = _default$D;

  var docBacklinkRole$1 = {};

  Object.defineProperty(docBacklinkRole$1, "__esModule", {
    value: true
  });
  docBacklinkRole$1.default = void 0;
  var docBacklinkRole = {
    abstract: false,
    accessibleNameRequired: true,
    baseConcepts: [],
    childrenPresentational: false,
    nameFrom: ['author', 'content'],
    prohibitedProps: [],
    props: {
      'aria-errormessage': null,
      'aria-invalid': null
    },
    relatedConcepts: [{
      concept: {
        name: 'referrer [EPUB-SSV]'
      },
      module: 'EPUB'
    }],
    requireContextRole: [],
    requiredContextRole: [],
    requiredOwnedElements: [],
    requiredProps: {},
    superClass: [['roletype', 'widget', 'command', 'link']]
  };
  var _default$C = docBacklinkRole;
  docBacklinkRole$1.default = _default$C;

  var docBiblioentryRole$1 = {};

  Object.defineProperty(docBiblioentryRole$1, "__esModule", {
    value: true
  });
  docBiblioentryRole$1.default = void 0;
  var docBiblioentryRole = {
    abstract: false,
    accessibleNameRequired: true,
    baseConcepts: [],
    childrenPresentational: false,
    nameFrom: ['author'],
    prohibitedProps: [],
    props: {
      'aria-disabled': null,
      'aria-errormessage': null,
      'aria-expanded': null,
      'aria-haspopup': null,
      'aria-invalid': null
    },
    relatedConcepts: [{
      concept: {
        name: 'EPUB biblioentry [EPUB-SSV]'
      },
      module: 'EPUB'
    }],
    requireContextRole: ['doc-bibliography'],
    requiredContextRole: ['doc-bibliography'],
    requiredOwnedElements: [],
    requiredProps: {},
    superClass: [['roletype', 'structure', 'section', 'listitem']]
  };
  var _default$B = docBiblioentryRole;
  docBiblioentryRole$1.default = _default$B;

  var docBibliographyRole$1 = {};

  Object.defineProperty(docBibliographyRole$1, "__esModule", {
    value: true
  });
  docBibliographyRole$1.default = void 0;
  var docBibliographyRole = {
    abstract: false,
    accessibleNameRequired: false,
    baseConcepts: [],
    childrenPresentational: false,
    nameFrom: ['author'],
    prohibitedProps: [],
    props: {
      'aria-disabled': null,
      'aria-errormessage': null,
      'aria-expanded': null,
      'aria-haspopup': null,
      'aria-invalid': null
    },
    relatedConcepts: [{
      concept: {
        name: 'bibliography [EPUB-SSV]'
      },
      module: 'EPUB'
    }],
    requireContextRole: [],
    requiredContextRole: [],
    requiredOwnedElements: [['doc-biblioentry']],
    requiredProps: {},
    superClass: [['roletype', 'structure', 'section', 'landmark']]
  };
  var _default$A = docBibliographyRole;
  docBibliographyRole$1.default = _default$A;

  var docBibliorefRole$1 = {};

  Object.defineProperty(docBibliorefRole$1, "__esModule", {
    value: true
  });
  docBibliorefRole$1.default = void 0;
  var docBibliorefRole = {
    abstract: false,
    accessibleNameRequired: true,
    baseConcepts: [],
    childrenPresentational: false,
    nameFrom: ['author', 'contents'],
    prohibitedProps: [],
    props: {
      'aria-errormessage': null,
      'aria-invalid': null
    },
    relatedConcepts: [{
      concept: {
        name: 'biblioref [EPUB-SSV]'
      },
      module: 'EPUB'
    }],
    requireContextRole: [],
    requiredContextRole: [],
    requiredOwnedElements: [],
    requiredProps: {},
    superClass: [['roletype', 'widget', 'command', 'link']]
  };
  var _default$z = docBibliorefRole;
  docBibliorefRole$1.default = _default$z;

  var docChapterRole$1 = {};

  Object.defineProperty(docChapterRole$1, "__esModule", {
    value: true
  });
  docChapterRole$1.default = void 0;
  var docChapterRole = {
    abstract: false,
    accessibleNameRequired: false,
    baseConcepts: [],
    childrenPresentational: false,
    nameFrom: ['author'],
    prohibitedProps: [],
    props: {
      'aria-disabled': null,
      'aria-errormessage': null,
      'aria-expanded': null,
      'aria-haspopup': null,
      'aria-invalid': null
    },
    relatedConcepts: [{
      concept: {
        name: 'chapter [EPUB-SSV]'
      },
      module: 'EPUB'
    }],
    requireContextRole: [],
    requiredContextRole: [],
    requiredOwnedElements: [],
    requiredProps: {},
    superClass: [['roletype', 'structure', 'section', 'landmark']]
  };
  var _default$y = docChapterRole;
  docChapterRole$1.default = _default$y;

  var docColophonRole$1 = {};

  Object.defineProperty(docColophonRole$1, "__esModule", {
    value: true
  });
  docColophonRole$1.default = void 0;
  var docColophonRole = {
    abstract: false,
    accessibleNameRequired: false,
    baseConcepts: [],
    childrenPresentational: false,
    nameFrom: ['author'],
    prohibitedProps: [],
    props: {
      'aria-disabled': null,
      'aria-errormessage': null,
      'aria-expanded': null,
      'aria-haspopup': null,
      'aria-invalid': null
    },
    relatedConcepts: [{
      concept: {
        name: 'colophon [EPUB-SSV]'
      },
      module: 'EPUB'
    }],
    requireContextRole: [],
    requiredContextRole: [],
    requiredOwnedElements: [],
    requiredProps: {},
    superClass: [['roletype', 'structure', 'section']]
  };
  var _default$x = docColophonRole;
  docColophonRole$1.default = _default$x;

  var docConclusionRole$1 = {};

  Object.defineProperty(docConclusionRole$1, "__esModule", {
    value: true
  });
  docConclusionRole$1.default = void 0;
  var docConclusionRole = {
    abstract: false,
    accessibleNameRequired: false,
    baseConcepts: [],
    childrenPresentational: false,
    nameFrom: ['author'],
    prohibitedProps: [],
    props: {
      'aria-disabled': null,
      'aria-errormessage': null,
      'aria-expanded': null,
      'aria-haspopup': null,
      'aria-invalid': null
    },
    relatedConcepts: [{
      concept: {
        name: 'conclusion [EPUB-SSV]'
      },
      module: 'EPUB'
    }],
    requireContextRole: [],
    requiredContextRole: [],
    requiredOwnedElements: [],
    requiredProps: {},
    superClass: [['roletype', 'structure', 'section', 'landmark']]
  };
  var _default$w = docConclusionRole;
  docConclusionRole$1.default = _default$w;

  var docCoverRole$1 = {};

  Object.defineProperty(docCoverRole$1, "__esModule", {
    value: true
  });
  docCoverRole$1.default = void 0;
  var docCoverRole = {
    abstract: false,
    accessibleNameRequired: false,
    baseConcepts: [],
    childrenPresentational: false,
    nameFrom: ['author'],
    prohibitedProps: [],
    props: {
      'aria-disabled': null,
      'aria-errormessage': null,
      'aria-expanded': null,
      'aria-haspopup': null,
      'aria-invalid': null
    },
    relatedConcepts: [{
      concept: {
        name: 'cover [EPUB-SSV]'
      },
      module: 'EPUB'
    }],
    requireContextRole: [],
    requiredContextRole: [],
    requiredOwnedElements: [],
    requiredProps: {},
    superClass: [['roletype', 'structure', 'section', 'img']]
  };
  var _default$v = docCoverRole;
  docCoverRole$1.default = _default$v;

  var docCreditRole$1 = {};

  Object.defineProperty(docCreditRole$1, "__esModule", {
    value: true
  });
  docCreditRole$1.default = void 0;
  var docCreditRole = {
    abstract: false,
    accessibleNameRequired: false,
    baseConcepts: [],
    childrenPresentational: false,
    nameFrom: ['author'],
    prohibitedProps: [],
    props: {
      'aria-disabled': null,
      'aria-errormessage': null,
      'aria-expanded': null,
      'aria-haspopup': null,
      'aria-invalid': null
    },
    relatedConcepts: [{
      concept: {
        name: 'credit [EPUB-SSV]'
      },
      module: 'EPUB'
    }],
    requireContextRole: [],
    requiredContextRole: [],
    requiredOwnedElements: [],
    requiredProps: {},
    superClass: [['roletype', 'structure', 'section']]
  };
  var _default$u = docCreditRole;
  docCreditRole$1.default = _default$u;

  var docCreditsRole$1 = {};

  Object.defineProperty(docCreditsRole$1, "__esModule", {
    value: true
  });
  docCreditsRole$1.default = void 0;
  var docCreditsRole = {
    abstract: false,
    accessibleNameRequired: false,
    baseConcepts: [],
    childrenPresentational: false,
    nameFrom: ['author'],
    prohibitedProps: [],
    props: {
      'aria-disabled': null,
      'aria-errormessage': null,
      'aria-expanded': null,
      'aria-haspopup': null,
      'aria-invalid': null
    },
    relatedConcepts: [{
      concept: {
        name: 'credits [EPUB-SSV]'
      },
      module: 'EPUB'
    }],
    requireContextRole: [],
    requiredContextRole: [],
    requiredOwnedElements: [],
    requiredProps: {},
    superClass: [['roletype', 'structure', 'section', 'landmark']]
  };
  var _default$t = docCreditsRole;
  docCreditsRole$1.default = _default$t;

  var docDedicationRole$1 = {};

  Object.defineProperty(docDedicationRole$1, "__esModule", {
    value: true
  });
  docDedicationRole$1.default = void 0;
  var docDedicationRole = {
    abstract: false,
    accessibleNameRequired: false,
    baseConcepts: [],
    childrenPresentational: false,
    nameFrom: ['author'],
    prohibitedProps: [],
    props: {
      'aria-disabled': null,
      'aria-errormessage': null,
      'aria-expanded': null,
      'aria-haspopup': null,
      'aria-invalid': null
    },
    relatedConcepts: [{
      concept: {
        name: 'dedication [EPUB-SSV]'
      },
      module: 'EPUB'
    }],
    requireContextRole: [],
    requiredContextRole: [],
    requiredOwnedElements: [],
    requiredProps: {},
    superClass: [['roletype', 'structure', 'section']]
  };
  var _default$s = docDedicationRole;
  docDedicationRole$1.default = _default$s;

  var docEndnoteRole$1 = {};

  Object.defineProperty(docEndnoteRole$1, "__esModule", {
    value: true
  });
  docEndnoteRole$1.default = void 0;
  var docEndnoteRole = {
    abstract: false,
    accessibleNameRequired: false,
    baseConcepts: [],
    childrenPresentational: false,
    nameFrom: ['author'],
    prohibitedProps: [],
    props: {
      'aria-disabled': null,
      'aria-errormessage': null,
      'aria-expanded': null,
      'aria-haspopup': null,
      'aria-invalid': null
    },
    relatedConcepts: [{
      concept: {
        name: 'rearnote [EPUB-SSV]'
      },
      module: 'EPUB'
    }],
    requireContextRole: ['doc-endnotes'],
    requiredContextRole: ['doc-endnotes'],
    requiredOwnedElements: [],
    requiredProps: {},
    superClass: [['roletype', 'structure', 'section', 'listitem']]
  };
  var _default$r = docEndnoteRole;
  docEndnoteRole$1.default = _default$r;

  var docEndnotesRole$1 = {};

  Object.defineProperty(docEndnotesRole$1, "__esModule", {
    value: true
  });
  docEndnotesRole$1.default = void 0;
  var docEndnotesRole = {
    abstract: false,
    accessibleNameRequired: false,
    baseConcepts: [],
    childrenPresentational: false,
    nameFrom: ['author'],
    prohibitedProps: [],
    props: {
      'aria-disabled': null,
      'aria-errormessage': null,
      'aria-expanded': null,
      'aria-haspopup': null,
      'aria-invalid': null
    },
    relatedConcepts: [{
      concept: {
        name: 'rearnotes [EPUB-SSV]'
      },
      module: 'EPUB'
    }],
    requireContextRole: [],
    requiredContextRole: [],
    requiredOwnedElements: [['doc-endnote']],
    requiredProps: {},
    superClass: [['roletype', 'structure', 'section', 'landmark']]
  };
  var _default$q = docEndnotesRole;
  docEndnotesRole$1.default = _default$q;

  var docEpigraphRole$1 = {};

  Object.defineProperty(docEpigraphRole$1, "__esModule", {
    value: true
  });
  docEpigraphRole$1.default = void 0;
  var docEpigraphRole = {
    abstract: false,
    accessibleNameRequired: false,
    baseConcepts: [],
    childrenPresentational: false,
    nameFrom: ['author'],
    prohibitedProps: [],
    props: {
      'aria-disabled': null,
      'aria-errormessage': null,
      'aria-expanded': null,
      'aria-haspopup': null,
      'aria-invalid': null
    },
    relatedConcepts: [{
      concept: {
        name: 'epigraph [EPUB-SSV]'
      },
      module: 'EPUB'
    }],
    requireContextRole: [],
    requiredContextRole: [],
    requiredOwnedElements: [],
    requiredProps: {},
    superClass: [['roletype', 'structure', 'section']]
  };
  var _default$p = docEpigraphRole;
  docEpigraphRole$1.default = _default$p;

  var docEpilogueRole$1 = {};

  Object.defineProperty(docEpilogueRole$1, "__esModule", {
    value: true
  });
  docEpilogueRole$1.default = void 0;
  var docEpilogueRole = {
    abstract: false,
    accessibleNameRequired: false,
    baseConcepts: [],
    childrenPresentational: false,
    nameFrom: ['author'],
    prohibitedProps: [],
    props: {
      'aria-disabled': null,
      'aria-errormessage': null,
      'aria-expanded': null,
      'aria-haspopup': null,
      'aria-invalid': null
    },
    relatedConcepts: [{
      concept: {
        name: 'epilogue [EPUB-SSV]'
      },
      module: 'EPUB'
    }],
    requireContextRole: [],
    requiredContextRole: [],
    requiredOwnedElements: [],
    requiredProps: {},
    superClass: [['roletype', 'structure', 'section', 'landmark']]
  };
  var _default$o = docEpilogueRole;
  docEpilogueRole$1.default = _default$o;

  var docErrataRole$1 = {};

  Object.defineProperty(docErrataRole$1, "__esModule", {
    value: true
  });
  docErrataRole$1.default = void 0;
  var docErrataRole = {
    abstract: false,
    accessibleNameRequired: false,
    baseConcepts: [],
    childrenPresentational: false,
    nameFrom: ['author'],
    prohibitedProps: [],
    props: {
      'aria-disabled': null,
      'aria-errormessage': null,
      'aria-expanded': null,
      'aria-haspopup': null,
      'aria-invalid': null
    },
    relatedConcepts: [{
      concept: {
        name: 'errata [EPUB-SSV]'
      },
      module: 'EPUB'
    }],
    requireContextRole: [],
    requiredContextRole: [],
    requiredOwnedElements: [],
    requiredProps: {},
    superClass: [['roletype', 'structure', 'section', 'landmark']]
  };
  var _default$n = docErrataRole;
  docErrataRole$1.default = _default$n;

  var docExampleRole$1 = {};

  Object.defineProperty(docExampleRole$1, "__esModule", {
    value: true
  });
  docExampleRole$1.default = void 0;
  var docExampleRole = {
    abstract: false,
    accessibleNameRequired: false,
    baseConcepts: [],
    childrenPresentational: false,
    nameFrom: ['author'],
    prohibitedProps: [],
    props: {
      'aria-disabled': null,
      'aria-errormessage': null,
      'aria-expanded': null,
      'aria-haspopup': null,
      'aria-invalid': null
    },
    relatedConcepts: [],
    requireContextRole: [],
    requiredContextRole: [],
    requiredOwnedElements: [],
    requiredProps: {},
    superClass: [['roletype', 'structure', 'section']]
  };
  var _default$m = docExampleRole;
  docExampleRole$1.default = _default$m;

  var docFootnoteRole$1 = {};

  Object.defineProperty(docFootnoteRole$1, "__esModule", {
    value: true
  });
  docFootnoteRole$1.default = void 0;
  var docFootnoteRole = {
    abstract: false,
    accessibleNameRequired: false,
    baseConcepts: [],
    childrenPresentational: false,
    nameFrom: ['author'],
    prohibitedProps: [],
    props: {
      'aria-disabled': null,
      'aria-errormessage': null,
      'aria-expanded': null,
      'aria-haspopup': null,
      'aria-invalid': null
    },
    relatedConcepts: [{
      concept: {
        name: 'footnote [EPUB-SSV]'
      },
      module: 'EPUB'
    }],
    requireContextRole: [],
    requiredContextRole: [],
    requiredOwnedElements: [],
    requiredProps: {},
    superClass: [['roletype', 'structure', 'section']]
  };
  var _default$l = docFootnoteRole;
  docFootnoteRole$1.default = _default$l;

  var docForewordRole$1 = {};

  Object.defineProperty(docForewordRole$1, "__esModule", {
    value: true
  });
  docForewordRole$1.default = void 0;
  var docForewordRole = {
    abstract: false,
    accessibleNameRequired: false,
    baseConcepts: [],
    childrenPresentational: false,
    nameFrom: ['author'],
    prohibitedProps: [],
    props: {
      'aria-disabled': null,
      'aria-errormessage': null,
      'aria-expanded': null,
      'aria-haspopup': null,
      'aria-invalid': null
    },
    relatedConcepts: [{
      concept: {
        name: 'foreword [EPUB-SSV]'
      },
      module: 'EPUB'
    }],
    requireContextRole: [],
    requiredContextRole: [],
    requiredOwnedElements: [],
    requiredProps: {},
    superClass: [['roletype', 'structure', 'section', 'landmark']]
  };
  var _default$k = docForewordRole;
  docForewordRole$1.default = _default$k;

  var docGlossaryRole$1 = {};

  Object.defineProperty(docGlossaryRole$1, "__esModule", {
    value: true
  });
  docGlossaryRole$1.default = void 0;
  var docGlossaryRole = {
    abstract: false,
    accessibleNameRequired: false,
    baseConcepts: [],
    childrenPresentational: false,
    nameFrom: ['author'],
    prohibitedProps: [],
    props: {
      'aria-disabled': null,
      'aria-errormessage': null,
      'aria-expanded': null,
      'aria-haspopup': null,
      'aria-invalid': null
    },
    relatedConcepts: [{
      concept: {
        name: 'glossary [EPUB-SSV]'
      },
      module: 'EPUB'
    }],
    requireContextRole: [],
    requiredContextRole: [],
    requiredOwnedElements: [['definition'], ['term']],
    requiredProps: {},
    superClass: [['roletype', 'structure', 'section', 'landmark']]
  };
  var _default$j = docGlossaryRole;
  docGlossaryRole$1.default = _default$j;

  var docGlossrefRole$1 = {};

  Object.defineProperty(docGlossrefRole$1, "__esModule", {
    value: true
  });
  docGlossrefRole$1.default = void 0;
  var docGlossrefRole = {
    abstract: false,
    accessibleNameRequired: true,
    baseConcepts: [],
    childrenPresentational: false,
    nameFrom: ['author', 'contents'],
    prohibitedProps: [],
    props: {
      'aria-errormessage': null,
      'aria-invalid': null
    },
    relatedConcepts: [{
      concept: {
        name: 'glossref [EPUB-SSV]'
      },
      module: 'EPUB'
    }],
    requireContextRole: [],
    requiredContextRole: [],
    requiredOwnedElements: [],
    requiredProps: {},
    superClass: [['roletype', 'widget', 'command', 'link']]
  };
  var _default$i = docGlossrefRole;
  docGlossrefRole$1.default = _default$i;

  var docIndexRole$1 = {};

  Object.defineProperty(docIndexRole$1, "__esModule", {
    value: true
  });
  docIndexRole$1.default = void 0;
  var docIndexRole = {
    abstract: false,
    accessibleNameRequired: false,
    baseConcepts: [],
    childrenPresentational: false,
    nameFrom: ['author'],
    prohibitedProps: [],
    props: {
      'aria-disabled': null,
      'aria-errormessage': null,
      'aria-expanded': null,
      'aria-haspopup': null,
      'aria-invalid': null
    },
    relatedConcepts: [{
      concept: {
        name: 'index [EPUB-SSV]'
      },
      module: 'EPUB'
    }],
    requireContextRole: [],
    requiredContextRole: [],
    requiredOwnedElements: [],
    requiredProps: {},
    superClass: [['roletype', 'structure', 'section', 'landmark', 'navigation']]
  };
  var _default$h = docIndexRole;
  docIndexRole$1.default = _default$h;

  var docIntroductionRole$1 = {};

  Object.defineProperty(docIntroductionRole$1, "__esModule", {
    value: true
  });
  docIntroductionRole$1.default = void 0;
  var docIntroductionRole = {
    abstract: false,
    accessibleNameRequired: false,
    baseConcepts: [],
    childrenPresentational: false,
    nameFrom: ['author'],
    prohibitedProps: [],
    props: {
      'aria-disabled': null,
      'aria-errormessage': null,
      'aria-expanded': null,
      'aria-haspopup': null,
      'aria-invalid': null
    },
    relatedConcepts: [{
      concept: {
        name: 'introduction [EPUB-SSV]'
      },
      module: 'EPUB'
    }],
    requireContextRole: [],
    requiredContextRole: [],
    requiredOwnedElements: [],
    requiredProps: {},
    superClass: [['roletype', 'structure', 'section', 'landmark']]
  };
  var _default$g = docIntroductionRole;
  docIntroductionRole$1.default = _default$g;

  var docNoterefRole$1 = {};

  Object.defineProperty(docNoterefRole$1, "__esModule", {
    value: true
  });
  docNoterefRole$1.default = void 0;
  var docNoterefRole = {
    abstract: false,
    accessibleNameRequired: true,
    baseConcepts: [],
    childrenPresentational: false,
    nameFrom: ['author', 'contents'],
    prohibitedProps: [],
    props: {
      'aria-errormessage': null,
      'aria-invalid': null
    },
    relatedConcepts: [{
      concept: {
        name: 'noteref [EPUB-SSV]'
      },
      module: 'EPUB'
    }],
    requireContextRole: [],
    requiredContextRole: [],
    requiredOwnedElements: [],
    requiredProps: {},
    superClass: [['roletype', 'widget', 'command', 'link']]
  };
  var _default$f = docNoterefRole;
  docNoterefRole$1.default = _default$f;

  var docNoticeRole$1 = {};

  Object.defineProperty(docNoticeRole$1, "__esModule", {
    value: true
  });
  docNoticeRole$1.default = void 0;
  var docNoticeRole = {
    abstract: false,
    accessibleNameRequired: false,
    baseConcepts: [],
    childrenPresentational: false,
    nameFrom: ['author'],
    prohibitedProps: [],
    props: {
      'aria-disabled': null,
      'aria-errormessage': null,
      'aria-expanded': null,
      'aria-haspopup': null,
      'aria-invalid': null
    },
    relatedConcepts: [{
      concept: {
        name: 'notice [EPUB-SSV]'
      },
      module: 'EPUB'
    }],
    requireContextRole: [],
    requiredContextRole: [],
    requiredOwnedElements: [],
    requiredProps: {},
    superClass: [['roletype', 'structure', 'section', 'note']]
  };
  var _default$e = docNoticeRole;
  docNoticeRole$1.default = _default$e;

  var docPagebreakRole$1 = {};

  Object.defineProperty(docPagebreakRole$1, "__esModule", {
    value: true
  });
  docPagebreakRole$1.default = void 0;
  var docPagebreakRole = {
    abstract: false,
    accessibleNameRequired: true,
    baseConcepts: [],
    childrenPresentational: true,
    nameFrom: ['author'],
    prohibitedProps: [],
    props: {
      'aria-errormessage': null,
      'aria-expanded': null,
      'aria-haspopup': null,
      'aria-invalid': null
    },
    relatedConcepts: [{
      concept: {
        name: 'pagebreak [EPUB-SSV]'
      },
      module: 'EPUB'
    }],
    requireContextRole: [],
    requiredContextRole: [],
    requiredOwnedElements: [],
    requiredProps: {},
    superClass: [['roletype', 'structure', 'separator']]
  };
  var _default$d = docPagebreakRole;
  docPagebreakRole$1.default = _default$d;

  var docPagelistRole$1 = {};

  Object.defineProperty(docPagelistRole$1, "__esModule", {
    value: true
  });
  docPagelistRole$1.default = void 0;
  var docPagelistRole = {
    abstract: false,
    accessibleNameRequired: false,
    baseConcepts: [],
    childrenPresentational: false,
    nameFrom: ['author'],
    prohibitedProps: [],
    props: {
      'aria-disabled': null,
      'aria-errormessage': null,
      'aria-expanded': null,
      'aria-haspopup': null,
      'aria-invalid': null
    },
    relatedConcepts: [{
      concept: {
        name: 'page-list [EPUB-SSV]'
      },
      module: 'EPUB'
    }],
    requireContextRole: [],
    requiredContextRole: [],
    requiredOwnedElements: [],
    requiredProps: {},
    superClass: [['roletype', 'structure', 'section', 'landmark', 'navigation']]
  };
  var _default$c = docPagelistRole;
  docPagelistRole$1.default = _default$c;

  var docPartRole$1 = {};

  Object.defineProperty(docPartRole$1, "__esModule", {
    value: true
  });
  docPartRole$1.default = void 0;
  var docPartRole = {
    abstract: false,
    accessibleNameRequired: true,
    baseConcepts: [],
    childrenPresentational: false,
    nameFrom: ['author'],
    prohibitedProps: [],
    props: {
      'aria-disabled': null,
      'aria-errormessage': null,
      'aria-expanded': null,
      'aria-haspopup': null,
      'aria-invalid': null
    },
    relatedConcepts: [{
      concept: {
        name: 'part [EPUB-SSV]'
      },
      module: 'EPUB'
    }],
    requireContextRole: [],
    requiredContextRole: [],
    requiredOwnedElements: [],
    requiredProps: {},
    superClass: [['roletype', 'structure', 'section', 'landmark']]
  };
  var _default$b = docPartRole;
  docPartRole$1.default = _default$b;

  var docPrefaceRole$1 = {};

  Object.defineProperty(docPrefaceRole$1, "__esModule", {
    value: true
  });
  docPrefaceRole$1.default = void 0;
  var docPrefaceRole = {
    abstract: false,
    accessibleNameRequired: false,
    baseConcepts: [],
    childrenPresentational: false,
    nameFrom: ['author'],
    prohibitedProps: [],
    props: {
      'aria-disabled': null,
      'aria-errormessage': null,
      'aria-expanded': null,
      'aria-haspopup': null,
      'aria-invalid': null
    },
    relatedConcepts: [{
      concept: {
        name: 'preface [EPUB-SSV]'
      },
      module: 'EPUB'
    }],
    requireContextRole: [],
    requiredContextRole: [],
    requiredOwnedElements: [],
    requiredProps: {},
    superClass: [['roletype', 'structure', 'section', 'landmark']]
  };
  var _default$a = docPrefaceRole;
  docPrefaceRole$1.default = _default$a;

  var docPrologueRole$1 = {};

  Object.defineProperty(docPrologueRole$1, "__esModule", {
    value: true
  });
  docPrologueRole$1.default = void 0;
  var docPrologueRole = {
    abstract: false,
    accessibleNameRequired: false,
    baseConcepts: [],
    childrenPresentational: false,
    nameFrom: ['author'],
    prohibitedProps: [],
    props: {
      'aria-disabled': null,
      'aria-errormessage': null,
      'aria-expanded': null,
      'aria-haspopup': null,
      'aria-invalid': null
    },
    relatedConcepts: [{
      concept: {
        name: 'prologue [EPUB-SSV]'
      },
      module: 'EPUB'
    }],
    requireContextRole: [],
    requiredContextRole: [],
    requiredOwnedElements: [],
    requiredProps: {},
    superClass: [['roletype', 'structure', 'section', 'landmark']]
  };
  var _default$9 = docPrologueRole;
  docPrologueRole$1.default = _default$9;

  var docPullquoteRole$1 = {};

  Object.defineProperty(docPullquoteRole$1, "__esModule", {
    value: true
  });
  docPullquoteRole$1.default = void 0;
  var docPullquoteRole = {
    abstract: false,
    accessibleNameRequired: false,
    baseConcepts: [],
    childrenPresentational: false,
    nameFrom: ['author'],
    prohibitedProps: [],
    props: {},
    relatedConcepts: [{
      concept: {
        name: 'pullquote [EPUB-SSV]'
      },
      module: 'EPUB'
    }],
    requireContextRole: [],
    requiredContextRole: [],
    requiredOwnedElements: [],
    requiredProps: {},
    superClass: [['none']]
  };
  var _default$8 = docPullquoteRole;
  docPullquoteRole$1.default = _default$8;

  var docQnaRole$1 = {};

  Object.defineProperty(docQnaRole$1, "__esModule", {
    value: true
  });
  docQnaRole$1.default = void 0;
  var docQnaRole = {
    abstract: false,
    accessibleNameRequired: false,
    baseConcepts: [],
    childrenPresentational: false,
    nameFrom: ['author'],
    prohibitedProps: [],
    props: {
      'aria-disabled': null,
      'aria-errormessage': null,
      'aria-expanded': null,
      'aria-haspopup': null,
      'aria-invalid': null
    },
    relatedConcepts: [{
      concept: {
        name: 'qna [EPUB-SSV]'
      },
      module: 'EPUB'
    }],
    requireContextRole: [],
    requiredContextRole: [],
    requiredOwnedElements: [],
    requiredProps: {},
    superClass: [['roletype', 'structure', 'section']]
  };
  var _default$7 = docQnaRole;
  docQnaRole$1.default = _default$7;

  var docSubtitleRole$1 = {};

  Object.defineProperty(docSubtitleRole$1, "__esModule", {
    value: true
  });
  docSubtitleRole$1.default = void 0;
  var docSubtitleRole = {
    abstract: false,
    accessibleNameRequired: false,
    baseConcepts: [],
    childrenPresentational: false,
    nameFrom: ['author'],
    prohibitedProps: [],
    props: {
      'aria-disabled': null,
      'aria-errormessage': null,
      'aria-expanded': null,
      'aria-haspopup': null,
      'aria-invalid': null
    },
    relatedConcepts: [{
      concept: {
        name: 'subtitle [EPUB-SSV]'
      },
      module: 'EPUB'
    }],
    requireContextRole: [],
    requiredContextRole: [],
    requiredOwnedElements: [],
    requiredProps: {},
    superClass: [['roletype', 'structure', 'sectionhead']]
  };
  var _default$6 = docSubtitleRole;
  docSubtitleRole$1.default = _default$6;

  var docTipRole$1 = {};

  Object.defineProperty(docTipRole$1, "__esModule", {
    value: true
  });
  docTipRole$1.default = void 0;
  var docTipRole = {
    abstract: false,
    accessibleNameRequired: false,
    baseConcepts: [],
    childrenPresentational: false,
    nameFrom: ['author'],
    prohibitedProps: [],
    props: {
      'aria-disabled': null,
      'aria-errormessage': null,
      'aria-expanded': null,
      'aria-haspopup': null,
      'aria-invalid': null
    },
    relatedConcepts: [{
      concept: {
        name: 'help [EPUB-SSV]'
      },
      module: 'EPUB'
    }],
    requireContextRole: [],
    requiredContextRole: [],
    requiredOwnedElements: [],
    requiredProps: {},
    superClass: [['roletype', 'structure', 'section', 'note']]
  };
  var _default$5 = docTipRole;
  docTipRole$1.default = _default$5;

  var docTocRole$1 = {};

  Object.defineProperty(docTocRole$1, "__esModule", {
    value: true
  });
  docTocRole$1.default = void 0;
  var docTocRole = {
    abstract: false,
    accessibleNameRequired: false,
    baseConcepts: [],
    childrenPresentational: false,
    nameFrom: ['author'],
    prohibitedProps: [],
    props: {
      'aria-disabled': null,
      'aria-errormessage': null,
      'aria-expanded': null,
      'aria-haspopup': null,
      'aria-invalid': null
    },
    relatedConcepts: [{
      concept: {
        name: 'toc [EPUB-SSV]'
      },
      module: 'EPUB'
    }],
    requireContextRole: [],
    requiredContextRole: [],
    requiredOwnedElements: [],
    requiredProps: {},
    superClass: [['roletype', 'structure', 'section', 'landmark', 'navigation']]
  };
  var _default$4 = docTocRole;
  docTocRole$1.default = _default$4;

  Object.defineProperty(ariaDpubRoles$1, "__esModule", {
    value: true
  });
  ariaDpubRoles$1.default = void 0;

  var _docAbstractRole = _interopRequireDefault$4(docAbstractRole$1);

  var _docAcknowledgmentsRole = _interopRequireDefault$4(docAcknowledgmentsRole$1);

  var _docAfterwordRole = _interopRequireDefault$4(docAfterwordRole$1);

  var _docAppendixRole = _interopRequireDefault$4(docAppendixRole$1);

  var _docBacklinkRole = _interopRequireDefault$4(docBacklinkRole$1);

  var _docBiblioentryRole = _interopRequireDefault$4(docBiblioentryRole$1);

  var _docBibliographyRole = _interopRequireDefault$4(docBibliographyRole$1);

  var _docBibliorefRole = _interopRequireDefault$4(docBibliorefRole$1);

  var _docChapterRole = _interopRequireDefault$4(docChapterRole$1);

  var _docColophonRole = _interopRequireDefault$4(docColophonRole$1);

  var _docConclusionRole = _interopRequireDefault$4(docConclusionRole$1);

  var _docCoverRole = _interopRequireDefault$4(docCoverRole$1);

  var _docCreditRole = _interopRequireDefault$4(docCreditRole$1);

  var _docCreditsRole = _interopRequireDefault$4(docCreditsRole$1);

  var _docDedicationRole = _interopRequireDefault$4(docDedicationRole$1);

  var _docEndnoteRole = _interopRequireDefault$4(docEndnoteRole$1);

  var _docEndnotesRole = _interopRequireDefault$4(docEndnotesRole$1);

  var _docEpigraphRole = _interopRequireDefault$4(docEpigraphRole$1);

  var _docEpilogueRole = _interopRequireDefault$4(docEpilogueRole$1);

  var _docErrataRole = _interopRequireDefault$4(docErrataRole$1);

  var _docExampleRole = _interopRequireDefault$4(docExampleRole$1);

  var _docFootnoteRole = _interopRequireDefault$4(docFootnoteRole$1);

  var _docForewordRole = _interopRequireDefault$4(docForewordRole$1);

  var _docGlossaryRole = _interopRequireDefault$4(docGlossaryRole$1);

  var _docGlossrefRole = _interopRequireDefault$4(docGlossrefRole$1);

  var _docIndexRole = _interopRequireDefault$4(docIndexRole$1);

  var _docIntroductionRole = _interopRequireDefault$4(docIntroductionRole$1);

  var _docNoterefRole = _interopRequireDefault$4(docNoterefRole$1);

  var _docNoticeRole = _interopRequireDefault$4(docNoticeRole$1);

  var _docPagebreakRole = _interopRequireDefault$4(docPagebreakRole$1);

  var _docPagelistRole = _interopRequireDefault$4(docPagelistRole$1);

  var _docPartRole = _interopRequireDefault$4(docPartRole$1);

  var _docPrefaceRole = _interopRequireDefault$4(docPrefaceRole$1);

  var _docPrologueRole = _interopRequireDefault$4(docPrologueRole$1);

  var _docPullquoteRole = _interopRequireDefault$4(docPullquoteRole$1);

  var _docQnaRole = _interopRequireDefault$4(docQnaRole$1);

  var _docSubtitleRole = _interopRequireDefault$4(docSubtitleRole$1);

  var _docTipRole = _interopRequireDefault$4(docTipRole$1);

  var _docTocRole = _interopRequireDefault$4(docTocRole$1);

  function _interopRequireDefault$4(obj) {
    return obj && obj.__esModule ? obj : {
      default: obj
    };
  }

  var ariaDpubRoles = [['doc-abstract', _docAbstractRole.default], ['doc-acknowledgments', _docAcknowledgmentsRole.default], ['doc-afterword', _docAfterwordRole.default], ['doc-appendix', _docAppendixRole.default], ['doc-backlink', _docBacklinkRole.default], ['doc-biblioentry', _docBiblioentryRole.default], ['doc-bibliography', _docBibliographyRole.default], ['doc-biblioref', _docBibliorefRole.default], ['doc-chapter', _docChapterRole.default], ['doc-colophon', _docColophonRole.default], ['doc-conclusion', _docConclusionRole.default], ['doc-cover', _docCoverRole.default], ['doc-credit', _docCreditRole.default], ['doc-credits', _docCreditsRole.default], ['doc-dedication', _docDedicationRole.default], ['doc-endnote', _docEndnoteRole.default], ['doc-endnotes', _docEndnotesRole.default], ['doc-epigraph', _docEpigraphRole.default], ['doc-epilogue', _docEpilogueRole.default], ['doc-errata', _docErrataRole.default], ['doc-example', _docExampleRole.default], ['doc-footnote', _docFootnoteRole.default], ['doc-foreword', _docForewordRole.default], ['doc-glossary', _docGlossaryRole.default], ['doc-glossref', _docGlossrefRole.default], ['doc-index', _docIndexRole.default], ['doc-introduction', _docIntroductionRole.default], ['doc-noteref', _docNoterefRole.default], ['doc-notice', _docNoticeRole.default], ['doc-pagebreak', _docPagebreakRole.default], ['doc-pagelist', _docPagelistRole.default], ['doc-part', _docPartRole.default], ['doc-preface', _docPrefaceRole.default], ['doc-prologue', _docPrologueRole.default], ['doc-pullquote', _docPullquoteRole.default], ['doc-qna', _docQnaRole.default], ['doc-subtitle', _docSubtitleRole.default], ['doc-tip', _docTipRole.default], ['doc-toc', _docTocRole.default]];
  var _default$3 = ariaDpubRoles;
  ariaDpubRoles$1.default = _default$3;

  Object.defineProperty(rolesMap$1, "__esModule", {
    value: true
  });
  rolesMap$1.default = void 0;

  var _ariaAbstractRoles = _interopRequireDefault$3(ariaAbstractRoles$1);

  var _ariaLiteralRoles = _interopRequireDefault$3(ariaLiteralRoles$1);

  var _ariaDpubRoles = _interopRequireDefault$3(ariaDpubRoles$1);

  function _interopRequireDefault$3(obj) {
    return obj && obj.__esModule ? obj : {
      default: obj
    };
  }

  function _defineProperty(obj, key, value) {
    if (key in obj) {
      Object.defineProperty(obj, key, {
        value: value,
        enumerable: true,
        configurable: true,
        writable: true
      });
    } else {
      obj[key] = value;
    }

    return obj;
  }

  function _createForOfIteratorHelper(o, allowArrayLike) {
    var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"];

    if (!it) {
      if (Array.isArray(o) || (it = _unsupportedIterableToArray$3(o)) || allowArrayLike && o && typeof o.length === "number") {
        if (it) o = it;
        var i = 0;

        var F = function F() {};

        return {
          s: F,
          n: function n() {
            if (i >= o.length) return {
              done: true
            };
            return {
              done: false,
              value: o[i++]
            };
          },
          e: function e(_e2) {
            throw _e2;
          },
          f: F
        };
      }

      throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
    }

    var normalCompletion = true,
        didErr = false,
        err;
    return {
      s: function s() {
        it = it.call(o);
      },
      n: function n() {
        var step = it.next();
        normalCompletion = step.done;
        return step;
      },
      e: function e(_e3) {
        didErr = true;
        err = _e3;
      },
      f: function f() {
        try {
          if (!normalCompletion && it.return != null) it.return();
        } finally {
          if (didErr) throw err;
        }
      }
    };
  }

  function _slicedToArray$2(arr, i) {
    return _arrayWithHoles$2(arr) || _iterableToArrayLimit$2(arr, i) || _unsupportedIterableToArray$3(arr, i) || _nonIterableRest$2();
  }

  function _nonIterableRest$2() {
    throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
  }

  function _unsupportedIterableToArray$3(o, minLen) {
    if (!o) return;
    if (typeof o === "string") return _arrayLikeToArray$3(o, minLen);
    var n = Object.prototype.toString.call(o).slice(8, -1);
    if (n === "Object" && o.constructor) n = o.constructor.name;
    if (n === "Map" || n === "Set") return Array.from(o);
    if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray$3(o, minLen);
  }

  function _arrayLikeToArray$3(arr, len) {
    if (len == null || len > arr.length) len = arr.length;

    for (var i = 0, arr2 = new Array(len); i < len; i++) {
      arr2[i] = arr[i];
    }

    return arr2;
  }

  function _iterableToArrayLimit$2(arr, i) {
    var _i = arr == null ? null : typeof Symbol !== "undefined" && arr[Symbol.iterator] || arr["@@iterator"];

    if (_i == null) return;
    var _arr = [];
    var _n = true;
    var _d = false;

    var _s, _e;

    try {
      for (_i = _i.call(arr); !(_n = (_s = _i.next()).done); _n = true) {
        _arr.push(_s.value);

        if (i && _arr.length === i) break;
      }
    } catch (err) {
      _d = true;
      _e = err;
    } finally {
      try {
        if (!_n && _i["return"] != null) _i["return"]();
      } finally {
        if (_d) throw _e;
      }
    }

    return _arr;
  }

  function _arrayWithHoles$2(arr) {
    if (Array.isArray(arr)) return arr;
  }

  var roles$1 = [].concat(_ariaAbstractRoles.default, _ariaLiteralRoles.default, _ariaDpubRoles.default);
  roles$1.forEach(function (_ref) {
    var _ref2 = _slicedToArray$2(_ref, 2),
        roleDefinition = _ref2[1]; // Conglomerate the properties


    var _iterator = _createForOfIteratorHelper(roleDefinition.superClass),
        _step;

    try {
      for (_iterator.s(); !(_step = _iterator.n()).done;) {
        var superClassIter = _step.value;

        var _iterator2 = _createForOfIteratorHelper(superClassIter),
            _step2;

        try {
          var _loop = function _loop() {
            var superClassName = _step2.value;
            var superClassRoleTuple = roles$1.find(function (_ref3) {
              var _ref4 = _slicedToArray$2(_ref3, 1),
                  name = _ref4[0];

              return name === superClassName;
            });

            if (superClassRoleTuple) {
              var superClassDefinition = superClassRoleTuple[1];

              for (var _i2 = 0, _Object$keys = Object.keys(superClassDefinition.props); _i2 < _Object$keys.length; _i2++) {
                var prop = _Object$keys[_i2];

                if ( // $FlowIssue Accessing the hasOwnProperty on the Object prototype is fine.
                !Object.prototype.hasOwnProperty.call(roleDefinition.props, prop)) {
                  Object.assign(roleDefinition.props, _defineProperty({}, prop, superClassDefinition.props[prop]));
                }
              }
            }
          };

          for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
            _loop();
          }
        } catch (err) {
          _iterator2.e(err);
        } finally {
          _iterator2.f();
        }
      }
    } catch (err) {
      _iterator.e(err);
    } finally {
      _iterator.f();
    }
  });
  var rolesMap = {
    entries: function entries() {
      return roles$1;
    },
    get: function get(key) {
      var item = roles$1.find(function (tuple) {
        return tuple[0] === key ? true : false;
      });
      return item && item[1];
    },
    has: function has(key) {
      return !!this.get(key);
    },
    keys: function keys() {
      return roles$1.map(function (_ref5) {
        var _ref6 = _slicedToArray$2(_ref5, 1),
            key = _ref6[0];

        return key;
      });
    },
    values: function values() {
      return roles$1.map(function (_ref7) {
        var _ref8 = _slicedToArray$2(_ref7, 2),
            values = _ref8[1];

        return values;
      });
    }
  };
  var _default$2 = rolesMap;
  rolesMap$1.default = _default$2;

  var elementRoleMap$1 = {};

  Object.defineProperty(elementRoleMap$1, "__esModule", {
    value: true
  });
  elementRoleMap$1.default = void 0;

  var _rolesMap$2 = _interopRequireDefault$2(rolesMap$1);

  function _interopRequireDefault$2(obj) {
    return obj && obj.__esModule ? obj : {
      default: obj
    };
  }

  function _slicedToArray$1(arr, i) {
    return _arrayWithHoles$1(arr) || _iterableToArrayLimit$1(arr, i) || _unsupportedIterableToArray$2(arr, i) || _nonIterableRest$1();
  }

  function _nonIterableRest$1() {
    throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
  }

  function _unsupportedIterableToArray$2(o, minLen) {
    if (!o) return;
    if (typeof o === "string") return _arrayLikeToArray$2(o, minLen);
    var n = Object.prototype.toString.call(o).slice(8, -1);
    if (n === "Object" && o.constructor) n = o.constructor.name;
    if (n === "Map" || n === "Set") return Array.from(o);
    if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray$2(o, minLen);
  }

  function _arrayLikeToArray$2(arr, len) {
    if (len == null || len > arr.length) len = arr.length;

    for (var i = 0, arr2 = new Array(len); i < len; i++) {
      arr2[i] = arr[i];
    }

    return arr2;
  }

  function _iterableToArrayLimit$1(arr, i) {
    var _i = arr == null ? null : typeof Symbol !== "undefined" && arr[Symbol.iterator] || arr["@@iterator"];

    if (_i == null) return;
    var _arr = [];
    var _n = true;
    var _d = false;

    var _s, _e;

    try {
      for (_i = _i.call(arr); !(_n = (_s = _i.next()).done); _n = true) {
        _arr.push(_s.value);

        if (i && _arr.length === i) break;
      }
    } catch (err) {
      _d = true;
      _e = err;
    } finally {
      try {
        if (!_n && _i["return"] != null) _i["return"]();
      } finally {
        if (_d) throw _e;
      }
    }

    return _arr;
  }

  function _arrayWithHoles$1(arr) {
    if (Array.isArray(arr)) return arr;
  }

  var elementRoles$1 = [];

  var keys$1 = _rolesMap$2.default.keys();

  for (var i$1 = 0; i$1 < keys$1.length; i$1++) {
    var _key = keys$1[i$1];

    var role = _rolesMap$2.default.get(_key);

    if (role) {
      var concepts = [].concat(role.baseConcepts, role.relatedConcepts);

      for (var k = 0; k < concepts.length; k++) {
        var relation = concepts[k];

        if (relation.module === 'HTML') {
          var concept = relation.concept;

          if (concept) {
            (function () {
              var conceptStr = JSON.stringify(concept);
              var elementRoleRelation = elementRoles$1.find(function (relation) {
                return JSON.stringify(relation[0]) === conceptStr;
              });
              var roles = void 0;

              if (elementRoleRelation) {
                roles = elementRoleRelation[1];
              } else {
                roles = [];
              }

              var isUnique = true;

              for (var _i = 0; _i < roles.length; _i++) {
                if (roles[_i] === _key) {
                  isUnique = false;
                  break;
                }
              }

              if (isUnique) {
                roles.push(_key);
              }

              elementRoles$1.push([concept, roles]);
            })();
          }
        }
      }
    }
  }

  var elementRoleMap = {
    entries: function entries() {
      return elementRoles$1;
    },
    get: function get(key) {
      var item = elementRoles$1.find(function (tuple) {
        return JSON.stringify(tuple[0]) === JSON.stringify(key) ? true : false;
      });
      return item && item[1];
    },
    has: function has(key) {
      return !!this.get(key);
    },
    keys: function keys() {
      return elementRoles$1.map(function (_ref) {
        var _ref2 = _slicedToArray$1(_ref, 1),
            key = _ref2[0];

        return key;
      });
    },
    values: function values() {
      return elementRoles$1.map(function (_ref3) {
        var _ref4 = _slicedToArray$1(_ref3, 2),
            values = _ref4[1];

        return values;
      });
    }
  };
  var _default$1 = elementRoleMap;
  elementRoleMap$1.default = _default$1;

  var roleElementMap$1 = {};

  Object.defineProperty(roleElementMap$1, "__esModule", {
    value: true
  });
  roleElementMap$1.default = void 0;

  var _rolesMap$1 = _interopRequireDefault$1(rolesMap$1);

  function _interopRequireDefault$1(obj) {
    return obj && obj.__esModule ? obj : {
      default: obj
    };
  }

  function _slicedToArray(arr, i) {
    return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray$1(arr, i) || _nonIterableRest();
  }

  function _nonIterableRest() {
    throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
  }

  function _unsupportedIterableToArray$1(o, minLen) {
    if (!o) return;
    if (typeof o === "string") return _arrayLikeToArray$1(o, minLen);
    var n = Object.prototype.toString.call(o).slice(8, -1);
    if (n === "Object" && o.constructor) n = o.constructor.name;
    if (n === "Map" || n === "Set") return Array.from(o);
    if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray$1(o, minLen);
  }

  function _arrayLikeToArray$1(arr, len) {
    if (len == null || len > arr.length) len = arr.length;

    for (var i = 0, arr2 = new Array(len); i < len; i++) {
      arr2[i] = arr[i];
    }

    return arr2;
  }

  function _iterableToArrayLimit(arr, i) {
    var _i = arr == null ? null : typeof Symbol !== "undefined" && arr[Symbol.iterator] || arr["@@iterator"];

    if (_i == null) return;
    var _arr = [];
    var _n = true;
    var _d = false;

    var _s, _e;

    try {
      for (_i = _i.call(arr); !(_n = (_s = _i.next()).done); _n = true) {
        _arr.push(_s.value);

        if (i && _arr.length === i) break;
      }
    } catch (err) {
      _d = true;
      _e = err;
    } finally {
      try {
        if (!_n && _i["return"] != null) _i["return"]();
      } finally {
        if (_d) throw _e;
      }
    }

    return _arr;
  }

  function _arrayWithHoles(arr) {
    if (Array.isArray(arr)) return arr;
  }

  var roleElement = [];

  var keys = _rolesMap$1.default.keys();

  var _loop = function _loop(i) {
    var key = keys[i];

    var role = _rolesMap$1.default.get(key);

    if (role) {
      var concepts = [].concat(role.baseConcepts, role.relatedConcepts);

      for (var k = 0; k < concepts.length; k++) {
        var relation = concepts[k];

        if (relation.module === 'HTML') {
          var concept = relation.concept;

          if (concept) {
            var roleElementRelation = roleElement.find(function (item) {
              return item[0] === key;
            });
            var relationConcepts = void 0;

            if (roleElementRelation) {
              relationConcepts = roleElementRelation[1];
            } else {
              relationConcepts = [];
            }

            relationConcepts.push(concept);
            roleElement.push([key, relationConcepts]);
          }
        }
      }
    }
  };

  for (var i = 0; i < keys.length; i++) {
    _loop(i);
  }

  var roleElementMap = {
    entries: function entries() {
      return roleElement;
    },
    get: function get(key) {
      var item = roleElement.find(function (tuple) {
        return tuple[0] === key ? true : false;
      });
      return item && item[1];
    },
    has: function has(key) {
      return !!this.get(key);
    },
    keys: function keys() {
      return roleElement.map(function (_ref) {
        var _ref2 = _slicedToArray(_ref, 1),
            key = _ref2[0];

        return key;
      });
    },
    values: function values() {
      return roleElement.map(function (_ref3) {
        var _ref4 = _slicedToArray(_ref3, 2),
            values = _ref4[1];

        return values;
      });
    }
  };
  var _default = roleElementMap;
  roleElementMap$1.default = _default;

  Object.defineProperty(lib, "__esModule", {
    value: true
  });
  var roleElements_1 = lib.roleElements = elementRoles_1 = lib.elementRoles = roles_1 = lib.roles = lib.dom = lib.aria = void 0;

  var _ariaPropsMap = _interopRequireDefault(ariaPropsMap$1);

  var _domMap = _interopRequireDefault(domMap$1);

  var _rolesMap = _interopRequireDefault(rolesMap$1);

  var _elementRoleMap = _interopRequireDefault(elementRoleMap$1);

  var _roleElementMap = _interopRequireDefault(roleElementMap$1);

  function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : {
      default: obj
    };
  }

  var aria = _ariaPropsMap.default;
  lib.aria = aria;
  var dom = _domMap.default;
  lib.dom = dom;
  var roles = _rolesMap.default;
  var roles_1 = lib.roles = roles;
  var elementRoles = _elementRoleMap.default;
  var elementRoles_1 = lib.elementRoles = elementRoles;
  var roleElements = _roleElementMap.default;
  roleElements_1 = lib.roleElements = roleElements;

  var lzString = {exports: {}};

  (function (module) {
    // Copyright (c) 2013 Pieroxy <pieroxy@pieroxy.net>
    // This work is free. You can redistribute it and/or modify it
    // under the terms of the WTFPL, Version 2
    // For more information see LICENSE.txt or http://www.wtfpl.net/
    //
    // For more information, the home page:
    // http://pieroxy.net/blog/pages/lz-string/testing.html
    //
    // LZ-based compression algorithm, version 1.4.4
    var LZString = function () {
      // private property
      var f = String.fromCharCode;
      var keyStrBase64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
      var keyStrUriSafe = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-$";
      var baseReverseDic = {};

      function getBaseValue(alphabet, character) {
        if (!baseReverseDic[alphabet]) {
          baseReverseDic[alphabet] = {};

          for (var i = 0; i < alphabet.length; i++) {
            baseReverseDic[alphabet][alphabet.charAt(i)] = i;
          }
        }

        return baseReverseDic[alphabet][character];
      }

      var LZString = {
        compressToBase64: function compressToBase64(input) {
          if (input == null) return "";

          var res = LZString._compress(input, 6, function (a) {
            return keyStrBase64.charAt(a);
          });

          switch (res.length % 4) {
            // To produce valid Base64
            default: // When could this happen ?

            case 0:
              return res;

            case 1:
              return res + "===";

            case 2:
              return res + "==";

            case 3:
              return res + "=";
          }
        },
        decompressFromBase64: function decompressFromBase64(input) {
          if (input == null) return "";
          if (input == "") return null;
          return LZString._decompress(input.length, 32, function (index) {
            return getBaseValue(keyStrBase64, input.charAt(index));
          });
        },
        compressToUTF16: function compressToUTF16(input) {
          if (input == null) return "";
          return LZString._compress(input, 15, function (a) {
            return f(a + 32);
          }) + " ";
        },
        decompressFromUTF16: function decompressFromUTF16(compressed) {
          if (compressed == null) return "";
          if (compressed == "") return null;
          return LZString._decompress(compressed.length, 16384, function (index) {
            return compressed.charCodeAt(index) - 32;
          });
        },
        //compress into uint8array (UCS-2 big endian format)
        compressToUint8Array: function compressToUint8Array(uncompressed) {
          var compressed = LZString.compress(uncompressed);
          var buf = new Uint8Array(compressed.length * 2); // 2 bytes per character

          for (var i = 0, TotalLen = compressed.length; i < TotalLen; i++) {
            var current_value = compressed.charCodeAt(i);
            buf[i * 2] = current_value >>> 8;
            buf[i * 2 + 1] = current_value % 256;
          }

          return buf;
        },
        //decompress from uint8array (UCS-2 big endian format)
        decompressFromUint8Array: function decompressFromUint8Array(compressed) {
          if (compressed === null || compressed === undefined) {
            return LZString.decompress(compressed);
          } else {
            var buf = new Array(compressed.length / 2); // 2 bytes per character

            for (var i = 0, TotalLen = buf.length; i < TotalLen; i++) {
              buf[i] = compressed[i * 2] * 256 + compressed[i * 2 + 1];
            }

            var result = [];
            buf.forEach(function (c) {
              result.push(f(c));
            });
            return LZString.decompress(result.join(''));
          }
        },
        //compress into a string that is already URI encoded
        compressToEncodedURIComponent: function compressToEncodedURIComponent(input) {
          if (input == null) return "";
          return LZString._compress(input, 6, function (a) {
            return keyStrUriSafe.charAt(a);
          });
        },
        //decompress from an output of compressToEncodedURIComponent
        decompressFromEncodedURIComponent: function decompressFromEncodedURIComponent(input) {
          if (input == null) return "";
          if (input == "") return null;
          input = input.replace(/ /g, "+");
          return LZString._decompress(input.length, 32, function (index) {
            return getBaseValue(keyStrUriSafe, input.charAt(index));
          });
        },
        compress: function compress(uncompressed) {
          return LZString._compress(uncompressed, 16, function (a) {
            return f(a);
          });
        },
        _compress: function _compress(uncompressed, bitsPerChar, getCharFromInt) {
          if (uncompressed == null) return "";
          var i,
              value,
              context_dictionary = {},
              context_dictionaryToCreate = {},
              context_c = "",
              context_wc = "",
              context_w = "",
              context_enlargeIn = 2,
              // Compensate for the first entry which should not count
          context_dictSize = 3,
              context_numBits = 2,
              context_data = [],
              context_data_val = 0,
              context_data_position = 0,
              ii;

          for (ii = 0; ii < uncompressed.length; ii += 1) {
            context_c = uncompressed.charAt(ii);

            if (!Object.prototype.hasOwnProperty.call(context_dictionary, context_c)) {
              context_dictionary[context_c] = context_dictSize++;
              context_dictionaryToCreate[context_c] = true;
            }

            context_wc = context_w + context_c;

            if (Object.prototype.hasOwnProperty.call(context_dictionary, context_wc)) {
              context_w = context_wc;
            } else {
              if (Object.prototype.hasOwnProperty.call(context_dictionaryToCreate, context_w)) {
                if (context_w.charCodeAt(0) < 256) {
                  for (i = 0; i < context_numBits; i++) {
                    context_data_val = context_data_val << 1;

                    if (context_data_position == bitsPerChar - 1) {
                      context_data_position = 0;
                      context_data.push(getCharFromInt(context_data_val));
                      context_data_val = 0;
                    } else {
                      context_data_position++;
                    }
                  }

                  value = context_w.charCodeAt(0);

                  for (i = 0; i < 8; i++) {
                    context_data_val = context_data_val << 1 | value & 1;

                    if (context_data_position == bitsPerChar - 1) {
                      context_data_position = 0;
                      context_data.push(getCharFromInt(context_data_val));
                      context_data_val = 0;
                    } else {
                      context_data_position++;
                    }

                    value = value >> 1;
                  }
                } else {
                  value = 1;

                  for (i = 0; i < context_numBits; i++) {
                    context_data_val = context_data_val << 1 | value;

                    if (context_data_position == bitsPerChar - 1) {
                      context_data_position = 0;
                      context_data.push(getCharFromInt(context_data_val));
                      context_data_val = 0;
                    } else {
                      context_data_position++;
                    }

                    value = 0;
                  }

                  value = context_w.charCodeAt(0);

                  for (i = 0; i < 16; i++) {
                    context_data_val = context_data_val << 1 | value & 1;

                    if (context_data_position == bitsPerChar - 1) {
                      context_data_position = 0;
                      context_data.push(getCharFromInt(context_data_val));
                      context_data_val = 0;
                    } else {
                      context_data_position++;
                    }

                    value = value >> 1;
                  }
                }

                context_enlargeIn--;

                if (context_enlargeIn == 0) {
                  context_enlargeIn = Math.pow(2, context_numBits);
                  context_numBits++;
                }

                delete context_dictionaryToCreate[context_w];
              } else {
                value = context_dictionary[context_w];

                for (i = 0; i < context_numBits; i++) {
                  context_data_val = context_data_val << 1 | value & 1;

                  if (context_data_position == bitsPerChar - 1) {
                    context_data_position = 0;
                    context_data.push(getCharFromInt(context_data_val));
                    context_data_val = 0;
                  } else {
                    context_data_position++;
                  }

                  value = value >> 1;
                }
              }

              context_enlargeIn--;

              if (context_enlargeIn == 0) {
                context_enlargeIn = Math.pow(2, context_numBits);
                context_numBits++;
              } // Add wc to the dictionary.


              context_dictionary[context_wc] = context_dictSize++;
              context_w = String(context_c);
            }
          } // Output the code for w.


          if (context_w !== "") {
            if (Object.prototype.hasOwnProperty.call(context_dictionaryToCreate, context_w)) {
              if (context_w.charCodeAt(0) < 256) {
                for (i = 0; i < context_numBits; i++) {
                  context_data_val = context_data_val << 1;

                  if (context_data_position == bitsPerChar - 1) {
                    context_data_position = 0;
                    context_data.push(getCharFromInt(context_data_val));
                    context_data_val = 0;
                  } else {
                    context_data_position++;
                  }
                }

                value = context_w.charCodeAt(0);

                for (i = 0; i < 8; i++) {
                  context_data_val = context_data_val << 1 | value & 1;

                  if (context_data_position == bitsPerChar - 1) {
                    context_data_position = 0;
                    context_data.push(getCharFromInt(context_data_val));
                    context_data_val = 0;
                  } else {
                    context_data_position++;
                  }

                  value = value >> 1;
                }
              } else {
                value = 1;

                for (i = 0; i < context_numBits; i++) {
                  context_data_val = context_data_val << 1 | value;

                  if (context_data_position == bitsPerChar - 1) {
                    context_data_position = 0;
                    context_data.push(getCharFromInt(context_data_val));
                    context_data_val = 0;
                  } else {
                    context_data_position++;
                  }

                  value = 0;
                }

                value = context_w.charCodeAt(0);

                for (i = 0; i < 16; i++) {
                  context_data_val = context_data_val << 1 | value & 1;

                  if (context_data_position == bitsPerChar - 1) {
                    context_data_position = 0;
                    context_data.push(getCharFromInt(context_data_val));
                    context_data_val = 0;
                  } else {
                    context_data_position++;
                  }

                  value = value >> 1;
                }
              }

              context_enlargeIn--;

              if (context_enlargeIn == 0) {
                context_enlargeIn = Math.pow(2, context_numBits);
                context_numBits++;
              }

              delete context_dictionaryToCreate[context_w];
            } else {
              value = context_dictionary[context_w];

              for (i = 0; i < context_numBits; i++) {
                context_data_val = context_data_val << 1 | value & 1;

                if (context_data_position == bitsPerChar - 1) {
                  context_data_position = 0;
                  context_data.push(getCharFromInt(context_data_val));
                  context_data_val = 0;
                } else {
                  context_data_position++;
                }

                value = value >> 1;
              }
            }

            context_enlargeIn--;

            if (context_enlargeIn == 0) {
              context_enlargeIn = Math.pow(2, context_numBits);
              context_numBits++;
            }
          } // Mark the end of the stream


          value = 2;

          for (i = 0; i < context_numBits; i++) {
            context_data_val = context_data_val << 1 | value & 1;

            if (context_data_position == bitsPerChar - 1) {
              context_data_position = 0;
              context_data.push(getCharFromInt(context_data_val));
              context_data_val = 0;
            } else {
              context_data_position++;
            }

            value = value >> 1;
          } // Flush the last char


          while (true) {
            context_data_val = context_data_val << 1;

            if (context_data_position == bitsPerChar - 1) {
              context_data.push(getCharFromInt(context_data_val));
              break;
            } else context_data_position++;
          }

          return context_data.join('');
        },
        decompress: function decompress(compressed) {
          if (compressed == null) return "";
          if (compressed == "") return null;
          return LZString._decompress(compressed.length, 32768, function (index) {
            return compressed.charCodeAt(index);
          });
        },
        _decompress: function _decompress(length, resetValue, getNextValue) {
          var dictionary = [],
              enlargeIn = 4,
              dictSize = 4,
              numBits = 3,
              entry = "",
              result = [],
              i,
              w,
              bits,
              resb,
              maxpower,
              power,
              c,
              data = {
            val: getNextValue(0),
            position: resetValue,
            index: 1
          };

          for (i = 0; i < 3; i += 1) {
            dictionary[i] = i;
          }

          bits = 0;
          maxpower = Math.pow(2, 2);
          power = 1;

          while (power != maxpower) {
            resb = data.val & data.position;
            data.position >>= 1;

            if (data.position == 0) {
              data.position = resetValue;
              data.val = getNextValue(data.index++);
            }

            bits |= (resb > 0 ? 1 : 0) * power;
            power <<= 1;
          }

          switch (bits) {
            case 0:
              bits = 0;
              maxpower = Math.pow(2, 8);
              power = 1;

              while (power != maxpower) {
                resb = data.val & data.position;
                data.position >>= 1;

                if (data.position == 0) {
                  data.position = resetValue;
                  data.val = getNextValue(data.index++);
                }

                bits |= (resb > 0 ? 1 : 0) * power;
                power <<= 1;
              }

              c = f(bits);
              break;

            case 1:
              bits = 0;
              maxpower = Math.pow(2, 16);
              power = 1;

              while (power != maxpower) {
                resb = data.val & data.position;
                data.position >>= 1;

                if (data.position == 0) {
                  data.position = resetValue;
                  data.val = getNextValue(data.index++);
                }

                bits |= (resb > 0 ? 1 : 0) * power;
                power <<= 1;
              }

              c = f(bits);
              break;

            case 2:
              return "";
          }

          dictionary[3] = c;
          w = c;
          result.push(c);

          while (true) {
            if (data.index > length) {
              return "";
            }

            bits = 0;
            maxpower = Math.pow(2, numBits);
            power = 1;

            while (power != maxpower) {
              resb = data.val & data.position;
              data.position >>= 1;

              if (data.position == 0) {
                data.position = resetValue;
                data.val = getNextValue(data.index++);
              }

              bits |= (resb > 0 ? 1 : 0) * power;
              power <<= 1;
            }

            switch (c = bits) {
              case 0:
                bits = 0;
                maxpower = Math.pow(2, 8);
                power = 1;

                while (power != maxpower) {
                  resb = data.val & data.position;
                  data.position >>= 1;

                  if (data.position == 0) {
                    data.position = resetValue;
                    data.val = getNextValue(data.index++);
                  }

                  bits |= (resb > 0 ? 1 : 0) * power;
                  power <<= 1;
                }

                dictionary[dictSize++] = f(bits);
                c = dictSize - 1;
                enlargeIn--;
                break;

              case 1:
                bits = 0;
                maxpower = Math.pow(2, 16);
                power = 1;

                while (power != maxpower) {
                  resb = data.val & data.position;
                  data.position >>= 1;

                  if (data.position == 0) {
                    data.position = resetValue;
                    data.val = getNextValue(data.index++);
                  }

                  bits |= (resb > 0 ? 1 : 0) * power;
                  power <<= 1;
                }

                dictionary[dictSize++] = f(bits);
                c = dictSize - 1;
                enlargeIn--;
                break;

              case 2:
                return result.join('');
            }

            if (enlargeIn == 0) {
              enlargeIn = Math.pow(2, numBits);
              numBits++;
            }

            if (dictionary[c]) {
              entry = dictionary[c];
            } else {
              if (c === dictSize) {
                entry = w + w.charAt(0);
              } else {
                return null;
              }
            }

            result.push(entry); // Add w+entry[0] to the dictionary.

            dictionary[dictSize++] = w + entry.charAt(0);
            enlargeIn--;
            w = entry;

            if (enlargeIn == 0) {
              enlargeIn = Math.pow(2, numBits);
              numBits++;
            }
          }
        }
      };
      return LZString;
    }();

    if (module != null) {
      module.exports = LZString;
    }
  })(lzString);

  /**
   * Source: https://github.com/facebook/jest/blob/e7bb6a1e26ffab90611b2593912df15b69315611/packages/pretty-format/src/plugins/DOMElement.ts
   */

  /* eslint-disable -- trying to stay as close to the original as possible */

  /* istanbul ignore file */

  function escapeHTML(str) {
    return str.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  } // Return empty string if keys is empty.


  var printProps = function printProps(keys, props, config, indentation, depth, refs, printer) {
    var indentationNext = indentation + config.indent;
    var colors = config.colors;
    return keys.map(function (key) {
      var value = props[key];
      var printed = printer(value, config, indentationNext, depth, refs);

      if (typeof value !== 'string') {
        if (printed.indexOf('\n') !== -1) {
          printed = config.spacingOuter + indentationNext + printed + config.spacingOuter + indentation;
        }

        printed = '{' + printed + '}';
      }

      return config.spacingInner + indentation + colors.prop.open + key + colors.prop.close + '=' + colors.value.open + printed + colors.value.close;
    }).join('');
  }; // https://developer.mozilla.org/en-US/docs/Web/API/Node/nodeType#node_type_constants


  var NodeTypeTextNode = 3; // Return empty string if children is empty.

  var printChildren = function printChildren(children, config, indentation, depth, refs, printer) {
    return children.map(function (child) {
      var printedChild = typeof child === 'string' ? printText(child, config) : printer(child, config, indentation, depth, refs);

      if (printedChild === '' && typeof child === 'object' && child !== null && child.nodeType !== NodeTypeTextNode) {
        // A plugin serialized this Node to '' meaning we should ignore it.
        return '';
      }

      return config.spacingOuter + indentation + printedChild;
    }).join('');
  };

  var printText = function printText(text, config) {
    var contentColor = config.colors.content;
    return contentColor.open + escapeHTML(text) + contentColor.close;
  };

  var printComment = function printComment(comment, config) {
    var commentColor = config.colors.comment;
    return commentColor.open + '<!--' + escapeHTML(comment) + '-->' + commentColor.close;
  }; // Separate the functions to format props, children, and element,
  // so a plugin could override a particular function, if needed.
  // Too bad, so sad: the traditional (but unnecessary) space
  // in a self-closing tagColor requires a second test of printedProps.


  var printElement = function printElement(type, printedProps, printedChildren, config, indentation) {
    var tagColor = config.colors.tag;
    return tagColor.open + '<' + type + (printedProps && tagColor.close + printedProps + config.spacingOuter + indentation + tagColor.open) + (printedChildren ? '>' + tagColor.close + printedChildren + config.spacingOuter + indentation + tagColor.open + '</' + type : (printedProps && !config.min ? '' : ' ') + '/') + '>' + tagColor.close;
  };

  var printElementAsLeaf = function printElementAsLeaf(type, config) {
    var tagColor = config.colors.tag;
    return tagColor.open + '<' + type + tagColor.close + ' …' + tagColor.open + ' />' + tagColor.close;
  };

  var ELEMENT_NODE$1 = 1;
  var TEXT_NODE$1 = 3;
  var COMMENT_NODE$1 = 8;
  var FRAGMENT_NODE = 11;
  var ELEMENT_REGEXP = /^((HTML|SVG)\w*)?Element$/;

  var testNode = function testNode(val) {
    var constructorName = val.constructor.name;
    var nodeType = val.nodeType,
        tagName = val.tagName;
    var isCustomElement = typeof tagName === 'string' && tagName.includes('-') || typeof val.hasAttribute === 'function' && val.hasAttribute('is');
    return nodeType === ELEMENT_NODE$1 && (ELEMENT_REGEXP.test(constructorName) || isCustomElement) || nodeType === TEXT_NODE$1 && constructorName === 'Text' || nodeType === COMMENT_NODE$1 && constructorName === 'Comment' || nodeType === FRAGMENT_NODE && constructorName === 'DocumentFragment';
  };

  function nodeIsText(node) {
    return node.nodeType === TEXT_NODE$1;
  }

  function nodeIsComment(node) {
    return node.nodeType === COMMENT_NODE$1;
  }

  function nodeIsFragment(node) {
    return node.nodeType === FRAGMENT_NODE;
  }

  function createDOMElementFilter(filterNode) {
    return {
      test: function test(val) {
        var _val$constructor2;

        return (val == null ? void 0 : (_val$constructor2 = val.constructor) == null ? void 0 : _val$constructor2.name) && testNode(val);
      },
      serialize: function serialize(node, config, indentation, depth, refs, printer) {
        if (nodeIsText(node)) {
          return printText(node.data, config);
        }

        if (nodeIsComment(node)) {
          return printComment(node.data, config);
        }

        var type = nodeIsFragment(node) ? "DocumentFragment" : node.tagName.toLowerCase();

        if (++depth > config.maxDepth) {
          return printElementAsLeaf(type, config);
        }

        return printElement(type, printProps(nodeIsFragment(node) ? [] : Array.from(node.attributes).map(function (attr) {
          return attr.name;
        }).sort(), nodeIsFragment(node) ? {} : Array.from(node.attributes).reduce(function (props, attribute) {
          props[attribute.name] = attribute.value;
          return props;
        }, {}), config, indentation + config.indent, depth, refs, printer), printChildren(Array.prototype.slice.call(node.childNodes || node.children).filter(filterNode), config, indentation + config.indent, depth, refs, printer), config, indentation);
      }
    };
  } // We try to load node dependencies


  var chalk = null;
  var readFileSync = null;
  var codeFrameColumns = null;

  try {
    var nodeRequire = module && module.require;
    readFileSync = nodeRequire.call(module, 'fs').readFileSync;
    codeFrameColumns = nodeRequire.call(module, '@babel/code-frame').codeFrameColumns;
    chalk = nodeRequire.call(module, 'chalk');
  } catch (_unused) {// We're in a browser environment
  } // frame has the form "at myMethod (location/to/my/file.js:10:2)"


  function getCodeFrame(frame) {
    var locationStart = frame.indexOf('(') + 1;
    var locationEnd = frame.indexOf(')');
    var frameLocation = frame.slice(locationStart, locationEnd);
    var frameLocationElements = frameLocation.split(':');
    var _ref = [frameLocationElements[0], parseInt(frameLocationElements[1], 10), parseInt(frameLocationElements[2], 10)],
        filename = _ref[0],
        line = _ref[1],
        column = _ref[2];
    var rawFileContents = '';

    try {
      rawFileContents = readFileSync(filename, 'utf-8');
    } catch (_unused2) {
      return '';
    }

    var codeFrame = codeFrameColumns(rawFileContents, {
      start: {
        line: line,
        column: column
      }
    }, {
      highlightCode: true,
      linesBelow: 0
    });
    return chalk.dim(frameLocation) + "\n" + codeFrame + "\n";
  }

  function getUserCodeFrame() {
    // If we couldn't load dependencies, we can't generate the user trace

    /* istanbul ignore next */
    if (!readFileSync || !codeFrameColumns) {
      return '';
    }

    var err = new Error();
    var firstClientCodeFrame = err.stack.split('\n').slice(1) // Remove first line which has the form "Error: TypeError"
    .find(function (frame) {
      return !frame.includes('node_modules/');
    }); // Ignore frames from 3rd party libraries

    return getCodeFrame(firstClientCodeFrame);
  } // Constant node.nodeType for text nodes, see:
  // https://developer.mozilla.org/en-US/docs/Web/API/Node/nodeType#Node_type_constants


  var TEXT_NODE = 3;

  function jestFakeTimersAreEnabled() {
    /* istanbul ignore else */
    if (typeof jest !== 'undefined' && jest !== null) {
      return (// legacy timers
        setTimeout._isMockFunction === true || // modern timers
        Object.prototype.hasOwnProperty.call(setTimeout, 'clock')
      );
    } // istanbul ignore next


    return false;
  }

  function getDocument() {
    /* istanbul ignore if */
    if (typeof window === 'undefined') {
      throw new Error('Could not find default container');
    }

    return window.document;
  }

  function getWindowFromNode(node) {
    if (node.defaultView) {
      // node is document
      return node.defaultView;
    } else if (node.ownerDocument && node.ownerDocument.defaultView) {
      // node is a DOM node
      return node.ownerDocument.defaultView;
    } else if (node.window) {
      // node is window
      return node.window;
    } else if (node.ownerDocument && node.ownerDocument.defaultView === null) {
      throw new Error("It looks like the window object is not available for the provided node.");
    } else if (node.then instanceof Function) {
      throw new Error("It looks like you passed a Promise object instead of a DOM node. Did you do something like `fireEvent.click(screen.findBy...` when you meant to use a `getBy` query `fireEvent.click(screen.getBy...`, or await the findBy query `fireEvent.click(await screen.findBy...`?");
    } else if (Array.isArray(node)) {
      throw new Error("It looks like you passed an Array instead of a DOM node. Did you do something like `fireEvent.click(screen.getAllBy...` when you meant to use a `getBy` query `fireEvent.click(screen.getBy...`?");
    } else if (typeof node.debug === 'function' && typeof node.logTestingPlaygroundURL === 'function') {
      throw new Error("It looks like you passed a `screen` object. Did you do something like `fireEvent.click(screen, ...` when you meant to use a query, e.g. `fireEvent.click(screen.getBy..., `?");
    } else {
      // The user passed something unusual to a calling function
      throw new Error("The given node is not an Element, the node type is: " + typeof node + ".");
    }
  }

  function checkContainerType(container) {
    if (!container || !(typeof container.querySelector === 'function') || !(typeof container.querySelectorAll === 'function')) {
      throw new TypeError("Expected container to be an Element, a Document or a DocumentFragment but got " + getTypeName(container) + ".");
    }

    function getTypeName(object) {
      if (typeof object === 'object') {
        return object === null ? 'null' : object.constructor.name;
      }

      return typeof object;
    }
  }

  var DEFAULT_IGNORE_TAGS = 'script, style';
  var _excluded$1 = ["filterNode"];

  var inNode = function inNode() {
    return typeof process !== 'undefined' && process.versions !== undefined && process.versions.node !== undefined;
  };

  var DOMCollection = plugins_1.DOMCollection; // https://developer.mozilla.org/en-US/docs/Web/API/Node/nodeType#node_type_constants

  var ELEMENT_NODE = 1;
  var COMMENT_NODE = 8; // https://github.com/facebook/jest/blob/615084195ae1ae61ddd56162c62bbdda17587569/packages/pretty-format/src/plugins/DOMElement.ts#L50

  function filterCommentsAndDefaultIgnoreTagsTags(value) {
    return value.nodeType !== COMMENT_NODE && ( // value.nodeType === ELEMENT_NODE => !value.matches(DEFAULT_IGNORE_TAGS)
    value.nodeType !== ELEMENT_NODE || !value.matches(DEFAULT_IGNORE_TAGS));
  }

  function prettyDOM(dom, maxLength, options) {
    if (options === void 0) {
      options = {};
    }

    if (!dom) {
      dom = getDocument().body;
    }

    if (typeof maxLength !== 'number') {
      maxLength = typeof process !== 'undefined' && undefined || 7000;
    }

    if (maxLength === 0) {
      return '';
    }

    if (dom.documentElement) {
      dom = dom.documentElement;
    }

    var domTypeName = typeof dom;

    if (domTypeName === 'object') {
      domTypeName = dom.constructor.name;
    } else {
      // To don't fall with `in` operator
      dom = {};
    }

    if (!('outerHTML' in dom)) {
      throw new TypeError("Expected an element or document but got " + domTypeName);
    }

    var _options = options,
        _options$filterNode = _options.filterNode,
        filterNode = _options$filterNode === void 0 ? filterCommentsAndDefaultIgnoreTagsTags : _options$filterNode,
        prettyFormatOptions = _objectWithoutPropertiesLoose(_options, _excluded$1);

    var debugContent = format_1(dom, _extends({
      plugins: [createDOMElementFilter(filterNode), DOMCollection],
      printFunctionName: false,
      highlight: inNode()
    }, prettyFormatOptions));
    return maxLength !== undefined && dom.outerHTML.length > maxLength ? debugContent.slice(0, maxLength) + "..." : debugContent;
  }

  var logDOM = function logDOM() {
    var userCodeFrame = getUserCodeFrame();

    if (userCodeFrame) {
      console.log(prettyDOM.apply(void 0, arguments) + "\n\n" + userCodeFrame);
    } else {
      console.log(prettyDOM.apply(void 0, arguments));
    }
  }; // It would be cleaner for this to live inside './queries', but
  // other parts of the code assume that all exports from
  // './queries' are query functions.


  var config = {
    testIdAttribute: 'data-testid',
    asyncUtilTimeout: 1000,
    // asyncWrapper and advanceTimersWrapper is to support React's async `act` function.
    // forcing react-testing-library to wrap all async functions would've been
    // a total nightmare (consider wrapping every findBy* query and then also
    // updating `within` so those would be wrapped too. Total nightmare).
    // so we have this config option that's really only intended for
    // react-testing-library to use. For that reason, this feature will remain
    // undocumented.
    asyncWrapper: function asyncWrapper(cb) {
      return cb();
    },
    unstable_advanceTimersWrapper: function unstable_advanceTimersWrapper(cb) {
      return cb();
    },
    eventWrapper: function eventWrapper(cb) {
      return cb();
    },
    // default value for the `hidden` option in `ByRole` queries
    defaultHidden: false,
    // showOriginalStackTrace flag to show the full error stack traces for async errors
    showOriginalStackTrace: false,
    // throw errors w/ suggestions for better queries. Opt in so off by default.
    throwSuggestions: false,
    // called when getBy* queries fail. (message, container) => Error
    getElementError: function getElementError(message, container) {
      var prettifiedDOM = prettyDOM(container);
      var error = new Error([message, "Ignored nodes: comments, <script />, <style />\n" + prettifiedDOM].filter(Boolean).join('\n\n'));
      error.name = 'TestingLibraryElementError';
      return error;
    },
    _disableExpensiveErrorDiagnostics: false,
    computedStyleSupportsPseudoElements: false
  };

  function runWithExpensiveErrorDiagnosticsDisabled(callback) {
    try {
      config._disableExpensiveErrorDiagnostics = true;
      return callback();
    } finally {
      config._disableExpensiveErrorDiagnostics = false;
    }
  }

  function configure(newConfig) {
    if (typeof newConfig === 'function') {
      // Pass the existing config out to the provided function
      // and accept a delta in return
      newConfig = newConfig(config);
    } // Merge the incoming config delta


    config = _extends({}, config, newConfig);
  }

  function getConfig() {
    return config;
  }

  var labelledNodeNames = ['button', 'meter', 'output', 'progress', 'select', 'textarea', 'input'];

  function getTextContent(node) {
    if (labelledNodeNames.includes(node.nodeName.toLowerCase())) {
      return '';
    }

    if (node.nodeType === TEXT_NODE) return node.textContent;
    return Array.from(node.childNodes).map(function (childNode) {
      return getTextContent(childNode);
    }).join('');
  }

  function getLabelContent(element) {
    var textContent;

    if (element.tagName.toLowerCase() === 'label') {
      textContent = getTextContent(element);
    } else {
      textContent = element.value || element.textContent;
    }

    return textContent;
  } // Based on https://github.com/eps1lon/dom-accessibility-api/pull/352


  function getRealLabels(element) {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- types are not aware of older browsers that don't implement `labels`
    if (element.labels !== undefined) {
      var _labels;

      return (_labels = element.labels) != null ? _labels : [];
    }

    if (!isLabelable(element)) return [];
    var labels = element.ownerDocument.querySelectorAll('label');
    return Array.from(labels).filter(function (label) {
      return label.control === element;
    });
  }

  function isLabelable(element) {
    return /BUTTON|METER|OUTPUT|PROGRESS|SELECT|TEXTAREA/.test(element.tagName) || element.tagName === 'INPUT' && element.getAttribute('type') !== 'hidden';
  }

  function getLabels(container, element, _temp) {
    var _ref = _temp === void 0 ? {} : _temp,
        _ref$selector = _ref.selector,
        selector = _ref$selector === void 0 ? '*' : _ref$selector;

    var ariaLabelledBy = element.getAttribute('aria-labelledby');
    var labelsId = ariaLabelledBy ? ariaLabelledBy.split(' ') : [];
    return labelsId.length ? labelsId.map(function (labelId) {
      var labellingElement = container.querySelector("[id=\"" + labelId + "\"]");
      return labellingElement ? {
        content: getLabelContent(labellingElement),
        formControl: null
      } : {
        content: '',
        formControl: null
      };
    }) : Array.from(getRealLabels(element)).map(function (label) {
      var textToMatch = getLabelContent(label);
      var formControlSelector = 'button, input, meter, output, progress, select, textarea';
      var labelledFormControl = Array.from(label.querySelectorAll(formControlSelector)).filter(function (formControlElement) {
        return formControlElement.matches(selector);
      })[0];
      return {
        content: textToMatch,
        formControl: labelledFormControl
      };
    });
  }

  function assertNotNullOrUndefined(matcher) {
    if (matcher === null || matcher === undefined) {
      throw new Error( // eslint-disable-next-line @typescript-eslint/restrict-template-expressions -- implicitly converting `T` to `string`
      "It looks like " + matcher + " was passed instead of a matcher. Did you do something like getByText(" + matcher + ")?");
    }
  }

  function fuzzyMatches(textToMatch, node, matcher, normalizer) {
    if (typeof textToMatch !== 'string') {
      return false;
    }

    assertNotNullOrUndefined(matcher);
    var normalizedText = normalizer(textToMatch);

    if (typeof matcher === 'string' || typeof matcher === 'number') {
      return normalizedText.toLowerCase().includes(matcher.toString().toLowerCase());
    } else if (typeof matcher === 'function') {
      return matcher(normalizedText, node);
    } else {
      return matchRegExp(matcher, normalizedText);
    }
  }

  function matches(textToMatch, node, matcher, normalizer) {
    if (typeof textToMatch !== 'string') {
      return false;
    }

    assertNotNullOrUndefined(matcher);
    var normalizedText = normalizer(textToMatch);

    if (matcher instanceof Function) {
      return matcher(normalizedText, node);
    } else if (matcher instanceof RegExp) {
      return matchRegExp(matcher, normalizedText);
    } else {
      return normalizedText === String(matcher);
    }
  }

  function getDefaultNormalizer(_temp) {
    var _ref = _temp === void 0 ? {} : _temp,
        _ref$trim = _ref.trim,
        trim = _ref$trim === void 0 ? true : _ref$trim,
        _ref$collapseWhitespa = _ref.collapseWhitespace,
        collapseWhitespace = _ref$collapseWhitespa === void 0 ? true : _ref$collapseWhitespa;

    return function (text) {
      var normalizedText = text;
      normalizedText = trim ? normalizedText.trim() : normalizedText;
      normalizedText = collapseWhitespace ? normalizedText.replace(/\s+/g, ' ') : normalizedText;
      return normalizedText;
    };
  }
  /**
   * Constructs a normalizer to pass to functions in matches.js
   * @param {boolean|undefined} trim The user-specified value for `trim`, without
   * any defaulting having been applied
   * @param {boolean|undefined} collapseWhitespace The user-specified value for
   * `collapseWhitespace`, without any defaulting having been applied
   * @param {Function|undefined} normalizer The user-specified normalizer
   * @returns {Function} A normalizer
   */


  function makeNormalizer(_ref2) {
    var trim = _ref2.trim,
        collapseWhitespace = _ref2.collapseWhitespace,
        normalizer = _ref2.normalizer;

    if (!normalizer) {
      // No custom normalizer specified. Just use default.
      return getDefaultNormalizer({
        trim: trim,
        collapseWhitespace: collapseWhitespace
      });
    }

    if (typeof trim !== 'undefined' || typeof collapseWhitespace !== 'undefined') {
      // They've also specified a value for trim or collapseWhitespace
      throw new Error('trim and collapseWhitespace are not supported with a normalizer. ' + 'If you want to use the default trim and collapseWhitespace logic in your normalizer, ' + 'use "getDefaultNormalizer({trim, collapseWhitespace})" and compose that into your normalizer');
    }

    return normalizer;
  }

  function matchRegExp(matcher, text) {
    var match = matcher.test(text);

    if (matcher.global && matcher.lastIndex !== 0) {
      console.warn("To match all elements we had to reset the lastIndex of the RegExp because the global flag is enabled. We encourage to remove the global flag from the RegExp.");
      matcher.lastIndex = 0;
    }

    return match;
  }

  function getNodeText(node) {
    if (node.matches('input[type=submit], input[type=button], input[type=reset]')) {
      return node.value;
    }

    return Array.from(node.childNodes).filter(function (child) {
      return child.nodeType === TEXT_NODE && Boolean(child.textContent);
    }).map(function (c) {
      return c.textContent;
    }).join('');
  }

  function _createForOfIteratorHelperLoose(o, allowArrayLike) {
    var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"];
    if (it) return (it = it.call(o)).next.bind(it);

    if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") {
      if (it) o = it;
      var i = 0;
      return function () {
        if (i >= o.length) return {
          done: true
        };
        return {
          done: false,
          value: o[i++]
        };
      };
    }

    throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
  }

  function _unsupportedIterableToArray(o, minLen) {
    if (!o) return;
    if (typeof o === "string") return _arrayLikeToArray(o, minLen);
    var n = Object.prototype.toString.call(o).slice(8, -1);
    if (n === "Object" && o.constructor) n = o.constructor.name;
    if (n === "Map" || n === "Set") return Array.from(o);
    if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen);
  }

  function _arrayLikeToArray(arr, len) {
    if (len == null || len > arr.length) len = arr.length;

    for (var i = 0, arr2 = new Array(len); i < len; i++) {
      arr2[i] = arr[i];
    }

    return arr2;
  }

  var elementRoleList = buildElementRoleList(elementRoles_1);
  /**
   * @param {Element} element -
   * @returns {boolean} - `true` if `element` and its subtree are inaccessible
   */

  function isSubtreeInaccessible(element) {
    if (element.hidden === true) {
      return true;
    }

    if (element.getAttribute('aria-hidden') === 'true') {
      return true;
    }

    var window = element.ownerDocument.defaultView;

    if (window.getComputedStyle(element).display === 'none') {
      return true;
    }

    return false;
  }
  /**
   * Partial implementation https://www.w3.org/TR/wai-aria-1.2/#tree_exclusion
   * which should only be used for elements with a non-presentational role i.e.
   * `role="none"` and `role="presentation"` will not be excluded.
   *
   * Implements aria-hidden semantics (i.e. parent overrides child)
   * Ignores "Child Presentational: True" characteristics
   *
   * @param {Element} element -
   * @param {object} [options] -
   * @param {function (element: Element): boolean} options.isSubtreeInaccessible -
   * can be used to return cached results from previous isSubtreeInaccessible calls
   * @returns {boolean} true if excluded, otherwise false
   */


  function isInaccessible(element, options) {
    if (options === void 0) {
      options = {};
    }

    var _options = options,
        _options$isSubtreeIna = _options.isSubtreeInaccessible,
        isSubtreeInaccessibleImpl = _options$isSubtreeIna === void 0 ? isSubtreeInaccessible : _options$isSubtreeIna;
    var window = element.ownerDocument.defaultView; // since visibility is inherited we can exit early

    if (window.getComputedStyle(element).visibility === 'hidden') {
      return true;
    }

    var currentElement = element;

    while (currentElement) {
      if (isSubtreeInaccessibleImpl(currentElement)) {
        return true;
      }

      currentElement = currentElement.parentElement;
    }

    return false;
  }

  function getImplicitAriaRoles(currentNode) {
    // eslint bug here:
    // eslint-disable-next-line no-unused-vars
    for (var _iterator = _createForOfIteratorHelperLoose(elementRoleList), _step; !(_step = _iterator()).done;) {
      var _step$value = _step.value,
          match = _step$value.match,
          roles = _step$value.roles;

      if (match(currentNode)) {
        return [].concat(roles);
      }
    }

    return [];
  }

  function buildElementRoleList(elementRolesMap) {
    function makeElementSelector(_ref) {
      var name = _ref.name,
          attributes = _ref.attributes;
      return "" + name + attributes.map(function (_ref2) {
        var attributeName = _ref2.name,
            value = _ref2.value,
            _ref2$constraints = _ref2.constraints,
            constraints = _ref2$constraints === void 0 ? [] : _ref2$constraints;
        var shouldNotExist = constraints.indexOf('undefined') !== -1;

        if (shouldNotExist) {
          return ":not([" + attributeName + "])";
        } else if (value) {
          return "[" + attributeName + "=\"" + value + "\"]";
        } else {
          return "[" + attributeName + "]";
        }
      }).join('');
    }

    function getSelectorSpecificity(_ref3) {
      var _ref3$attributes = _ref3.attributes,
          attributes = _ref3$attributes === void 0 ? [] : _ref3$attributes;
      return attributes.length;
    }

    function bySelectorSpecificity(_ref4, _ref5) {
      var leftSpecificity = _ref4.specificity;
      var rightSpecificity = _ref5.specificity;
      return rightSpecificity - leftSpecificity;
    }

    function match(element) {
      return function (node) {
        var _element$attributes = element.attributes,
            attributes = _element$attributes === void 0 ? [] : _element$attributes; // https://github.com/testing-library/dom-testing-library/issues/814

        var typeTextIndex = attributes.findIndex(function (attribute) {
          return attribute.value && attribute.name === 'type' && attribute.value === 'text';
        });

        if (typeTextIndex >= 0) {
          // not using splice to not mutate the attributes array
          attributes = [].concat(attributes.slice(0, typeTextIndex), attributes.slice(typeTextIndex + 1));

          if (node.type !== 'text') {
            return false;
          }
        }

        return node.matches(makeElementSelector(_extends({}, element, {
          attributes: attributes
        })));
      };
    }

    var result = []; // eslint bug here:
    // eslint-disable-next-line no-unused-vars

    for (var _iterator2 = _createForOfIteratorHelperLoose(elementRolesMap.entries()), _step2; !(_step2 = _iterator2()).done;) {
      var _step2$value = _step2.value,
          element = _step2$value[0],
          roles = _step2$value[1];
      result = [].concat(result, [{
        match: match(element),
        roles: Array.from(roles),
        specificity: getSelectorSpecificity(element)
      }]);
    }

    return result.sort(bySelectorSpecificity);
  }

  function getRoles(container, _temp) {
    var _ref6 = _temp === void 0 ? {} : _temp,
        _ref6$hidden = _ref6.hidden,
        hidden = _ref6$hidden === void 0 ? false : _ref6$hidden;

    function flattenDOM(node) {
      return [node].concat(Array.from(node.children).reduce(function (acc, child) {
        return [].concat(acc, flattenDOM(child));
      }, []));
    }

    return flattenDOM(container).filter(function (element) {
      return hidden === false ? isInaccessible(element) === false : true;
    }).reduce(function (acc, node) {
      var roles = []; // TODO: This violates html-aria which does not allow any role on every element

      if (node.hasAttribute('role')) {
        roles = node.getAttribute('role').split(' ').slice(0, 1);
      } else {
        roles = getImplicitAriaRoles(node);
      }

      return roles.reduce(function (rolesAcc, role) {
        var _extends2, _extends3;

        return Array.isArray(rolesAcc[role]) ? _extends({}, rolesAcc, (_extends2 = {}, _extends2[role] = [].concat(rolesAcc[role], [node]), _extends2)) : _extends({}, rolesAcc, (_extends3 = {}, _extends3[role] = [node], _extends3));
      }, acc);
    }, {});
  }

  function prettyRoles(dom, _ref7) {
    var hidden = _ref7.hidden;
    var roles = getRoles(dom, {
      hidden: hidden
    }); // We prefer to skip generic role, we don't recommend it

    return Object.entries(roles).filter(function (_ref8) {
      var role = _ref8[0];
      return role !== 'generic';
    }).map(function (_ref9) {
      var role = _ref9[0],
          elements = _ref9[1];
      var delimiterBar = '-'.repeat(50);
      var elementsString = elements.map(function (el) {
        var nameString = "Name \"" + computeAccessibleName(el, {
          computedStyleSupportsPseudoElements: getConfig().computedStyleSupportsPseudoElements
        }) + "\":\n";
        var domString = prettyDOM(el.cloneNode(false));
        return "" + nameString + domString;
      }).join('\n\n');
      return role + ":\n\n" + elementsString + "\n\n" + delimiterBar;
    }).join('\n');
  }

  var logRoles = function logRoles(dom, _temp2) {
    var _ref10 = _temp2 === void 0 ? {} : _temp2,
        _ref10$hidden = _ref10.hidden,
        hidden = _ref10$hidden === void 0 ? false : _ref10$hidden;

    return console.log(prettyRoles(dom, {
      hidden: hidden
    }));
  };
  /**
   * @param {Element} element -
   * @returns {boolean | undefined} - false/true if (not)selected, undefined if not selectable
   */


  function computeAriaSelected(element) {
    // implicit value from html-aam mappings: https://www.w3.org/TR/html-aam-1.0/#html-attribute-state-and-property-mappings
    // https://www.w3.org/TR/html-aam-1.0/#details-id-97
    if (element.tagName === 'OPTION') {
      return element.selected;
    } // explicit value


    return checkBooleanAttribute(element, 'aria-selected');
  }
  /**
   * @param {Element} element -
   * @returns {boolean | undefined} - false/true if (not)checked, undefined if not checked-able
   */


  function computeAriaChecked(element) {
    // implicit value from html-aam mappings: https://www.w3.org/TR/html-aam-1.0/#html-attribute-state-and-property-mappings
    // https://www.w3.org/TR/html-aam-1.0/#details-id-56
    // https://www.w3.org/TR/html-aam-1.0/#details-id-67
    if ('indeterminate' in element && element.indeterminate) {
      return undefined;
    }

    if ('checked' in element) {
      return element.checked;
    } // explicit value


    return checkBooleanAttribute(element, 'aria-checked');
  }
  /**
   * @param {Element} element -
   * @returns {boolean | undefined} - false/true if (not)pressed, undefined if not press-able
   */


  function computeAriaPressed(element) {
    // https://www.w3.org/TR/wai-aria-1.1/#aria-pressed
    return checkBooleanAttribute(element, 'aria-pressed');
  }
  /**
   * @param {Element} element -
   * @returns {boolean | string | null} -
   */


  function computeAriaCurrent(element) {
    var _ref11, _checkBooleanAttribut; // https://www.w3.org/TR/wai-aria-1.1/#aria-current


    return (_ref11 = (_checkBooleanAttribut = checkBooleanAttribute(element, 'aria-current')) != null ? _checkBooleanAttribut : element.getAttribute('aria-current')) != null ? _ref11 : false;
  }
  /**
   * @param {Element} element -
   * @returns {boolean | undefined} - false/true if (not)expanded, undefined if not expand-able
   */


  function computeAriaExpanded(element) {
    // https://www.w3.org/TR/wai-aria-1.1/#aria-expanded
    return checkBooleanAttribute(element, 'aria-expanded');
  }

  function checkBooleanAttribute(element, attribute) {
    var attributeValue = element.getAttribute(attribute);

    if (attributeValue === 'true') {
      return true;
    }

    if (attributeValue === 'false') {
      return false;
    }

    return undefined;
  }
  /**
   * @param {Element} element -
   * @returns {number | undefined} - number if implicit heading or aria-level present, otherwise undefined
   */


  function computeHeadingLevel(element) {
    // https://w3c.github.io/html-aam/#el-h1-h6
    // https://w3c.github.io/html-aam/#el-h1-h6
    var implicitHeadingLevels = {
      H1: 1,
      H2: 2,
      H3: 3,
      H4: 4,
      H5: 5,
      H6: 6
    }; // explicit aria-level value
    // https://www.w3.org/TR/wai-aria-1.2/#aria-level

    var ariaLevelAttribute = element.getAttribute('aria-level') && Number(element.getAttribute('aria-level'));
    return ariaLevelAttribute || implicitHeadingLevels[element.tagName];
  }

  var normalize = getDefaultNormalizer();

  function escapeRegExp(string) {
    return string.replace(/[.*+\-?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
  }

  function getRegExpMatcher(string) {
    return new RegExp(escapeRegExp(string.toLowerCase()), 'i');
  }

  function makeSuggestion(queryName, element, content, _ref) {
    var variant = _ref.variant,
        name = _ref.name;
    var warning = '';
    var queryOptions = {};
    var queryArgs = [['Role', 'TestId'].includes(queryName) ? content : getRegExpMatcher(content)];

    if (name) {
      queryOptions.name = getRegExpMatcher(name);
    }

    if (queryName === 'Role' && isInaccessible(element)) {
      queryOptions.hidden = true;
      warning = "Element is inaccessible. This means that the element and all its children are invisible to screen readers.\n    If you are using the aria-hidden prop, make sure this is the right choice for your case.\n    ";
    }

    if (Object.keys(queryOptions).length > 0) {
      queryArgs.push(queryOptions);
    }

    var queryMethod = variant + "By" + queryName;
    return {
      queryName: queryName,
      queryMethod: queryMethod,
      queryArgs: queryArgs,
      variant: variant,
      warning: warning,
      toString: function toString() {
        if (warning) {
          console.warn(warning);
        }

        var text = queryArgs[0],
            options = queryArgs[1];
        text = typeof text === 'string' ? "'" + text + "'" : text;
        options = options ? ", { " + Object.entries(options).map(function (_ref2) {
          var k = _ref2[0],
              v = _ref2[1];
          return k + ": " + v;
        }).join(', ') + " }" : '';
        return queryMethod + "(" + text + options + ")";
      }
    };
  }

  function canSuggest(currentMethod, requestedMethod, data) {
    return data && (!requestedMethod || requestedMethod.toLowerCase() === currentMethod.toLowerCase());
  }

  function getSuggestedQuery(element, variant, method) {
    var _element$getAttribute, _getImplicitAriaRoles;

    if (variant === void 0) {
      variant = 'get';
    } // don't create suggestions for script and style elements


    if (element.matches(DEFAULT_IGNORE_TAGS)) {
      return undefined;
    } //We prefer to suggest something else if the role is generic


    var role = (_element$getAttribute = element.getAttribute('role')) != null ? _element$getAttribute : (_getImplicitAriaRoles = getImplicitAriaRoles(element)) == null ? void 0 : _getImplicitAriaRoles[0];

    if (role !== 'generic' && canSuggest('Role', method, role)) {
      return makeSuggestion('Role', element, role, {
        variant: variant,
        name: computeAccessibleName(element, {
          computedStyleSupportsPseudoElements: getConfig().computedStyleSupportsPseudoElements
        })
      });
    }

    var labelText = getLabels(document, element).map(function (label) {
      return label.content;
    }).join(' ');

    if (canSuggest('LabelText', method, labelText)) {
      return makeSuggestion('LabelText', element, labelText, {
        variant: variant
      });
    }

    var placeholderText = element.getAttribute('placeholder');

    if (canSuggest('PlaceholderText', method, placeholderText)) {
      return makeSuggestion('PlaceholderText', element, placeholderText, {
        variant: variant
      });
    }

    var textContent = normalize(getNodeText(element));

    if (canSuggest('Text', method, textContent)) {
      return makeSuggestion('Text', element, textContent, {
        variant: variant
      });
    }

    if (canSuggest('DisplayValue', method, element.value)) {
      return makeSuggestion('DisplayValue', element, normalize(element.value), {
        variant: variant
      });
    }

    var alt = element.getAttribute('alt');

    if (canSuggest('AltText', method, alt)) {
      return makeSuggestion('AltText', element, alt, {
        variant: variant
      });
    }

    var title = element.getAttribute('title');

    if (canSuggest('Title', method, title)) {
      return makeSuggestion('Title', element, title, {
        variant: variant
      });
    }

    var testId = element.getAttribute(getConfig().testIdAttribute);

    if (canSuggest('TestId', method, testId)) {
      return makeSuggestion('TestId', element, testId, {
        variant: variant
      });
    }

    return undefined;
  } // closer to their code (because async stack traces are hard to follow).


  function copyStackTrace(target, source) {
    target.stack = source.stack.replace(source.message, target.message);
  }

  function waitFor(callback, _ref) {
    var _ref$container = _ref.container,
        container = _ref$container === void 0 ? getDocument() : _ref$container,
        _ref$timeout = _ref.timeout,
        timeout = _ref$timeout === void 0 ? getConfig().asyncUtilTimeout : _ref$timeout,
        _ref$showOriginalStac = _ref.showOriginalStackTrace,
        showOriginalStackTrace = _ref$showOriginalStac === void 0 ? getConfig().showOriginalStackTrace : _ref$showOriginalStac,
        stackTraceError = _ref.stackTraceError,
        _ref$interval = _ref.interval,
        interval = _ref$interval === void 0 ? 50 : _ref$interval,
        _ref$onTimeout = _ref.onTimeout,
        onTimeout = _ref$onTimeout === void 0 ? function (error) {
      error.message = getConfig().getElementError(error.message, container).message;
      return error;
    } : _ref$onTimeout,
        _ref$mutationObserver = _ref.mutationObserverOptions,
        mutationObserverOptions = _ref$mutationObserver === void 0 ? {
      subtree: true,
      childList: true,
      attributes: true,
      characterData: true
    } : _ref$mutationObserver;

    if (typeof callback !== 'function') {
      throw new TypeError('Received `callback` arg must be a function');
    }

    return new Promise( /*#__PURE__*/function () {
      var _ref2 = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee2(resolve, reject) {
        var lastError, intervalId, observer, finished, promiseStatus, overallTimeoutTimer, usingJestFakeTimers, _getConfig, advanceTimersWrapper, error, _getWindowFromNode, MutationObserver, onDone, checkRealTimersCallback, checkCallback, handleTimeout;

        return regenerator.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                handleTimeout = function _handleTimeout() {
                  var error;

                  if (lastError) {
                    error = lastError;

                    if (!showOriginalStackTrace && error.name === 'TestingLibraryElementError') {
                      copyStackTrace(error, stackTraceError);
                    }
                  } else {
                    error = new Error('Timed out in waitFor.');

                    if (!showOriginalStackTrace) {
                      copyStackTrace(error, stackTraceError);
                    }
                  }

                  onDone(onTimeout(error), null);
                };

                checkCallback = function _checkCallback() {
                  if (promiseStatus === 'pending') return;

                  try {
                    var result = runWithExpensiveErrorDiagnosticsDisabled(callback);

                    if (typeof (result == null ? void 0 : result.then) === 'function') {
                      promiseStatus = 'pending';
                      result.then(function (resolvedValue) {
                        promiseStatus = 'resolved';
                        onDone(null, resolvedValue);
                      }, function (rejectedValue) {
                        promiseStatus = 'rejected';
                        lastError = rejectedValue;
                      });
                    } else {
                      onDone(null, result);
                    } // If `callback` throws, wait for the next mutation, interval, or timeout.

                  } catch (error) {
                    // Save the most recent callback error to reject the promise with it in the event of a timeout
                    lastError = error;
                  }
                };

                checkRealTimersCallback = function _checkRealTimersCallb() {
                  if (jestFakeTimersAreEnabled()) {
                    var _error = new Error("Changed from using real timers to fake timers while using waitFor. This is not allowed and will result in very strange behavior. Please ensure you're awaiting all async things your test is doing before changing to fake timers. For more info, please go to https://github.com/testing-library/dom-testing-library/issues/830");

                    if (!showOriginalStackTrace) copyStackTrace(_error, stackTraceError);
                    return reject(_error);
                  } else {
                    return checkCallback();
                  }
                };

                onDone = function _onDone(error, result) {
                  finished = true;
                  clearTimeout(overallTimeoutTimer);

                  if (!usingJestFakeTimers) {
                    clearInterval(intervalId);
                    observer.disconnect();
                  }

                  if (error) {
                    reject(error);
                  } else {
                    resolve(result);
                  }
                };

                finished = false;
                promiseStatus = 'idle';
                overallTimeoutTimer = setTimeout(handleTimeout, timeout);
                usingJestFakeTimers = jestFakeTimersAreEnabled();

                if (!usingJestFakeTimers) {
                  _context2.next = 27;
                  break;
                }

                _getConfig = getConfig(), advanceTimersWrapper = _getConfig.unstable_advanceTimersWrapper;
                checkCallback();
              // this is a dangerous rule to disable because it could lead to an
              // infinite loop. However, eslint isn't smart enough to know that we're
              // setting finished inside `onDone` which will be called when we're done
              // waiting or when we've timed out.
              // eslint-disable-next-line no-unmodified-loop-condition

              case 11:
                if (finished) {
                  _context2.next = 25;
                  break;
                }

                if (jestFakeTimersAreEnabled()) {
                  _context2.next = 17;
                  break;
                }

                error = new Error("Changed from using fake timers to real timers while using waitFor. This is not allowed and will result in very strange behavior. Please ensure you're awaiting all async things your test is doing before changing to real timers. For more info, please go to https://github.com/testing-library/dom-testing-library/issues/830");
                if (!showOriginalStackTrace) copyStackTrace(error, stackTraceError);
                reject(error);
                return _context2.abrupt("return");

              case 17:
                // we *could* (maybe should?) use `advanceTimersToNextTimer` but it's
                // possible that could make this loop go on forever if someone is using
                // third party code that's setting up recursive timers so rapidly that
                // the user's timer's don't get a chance to resolve. So we'll advance
                // by an interval instead. (We have a test for this case).
                advanceTimersWrapper(function () {
                  jest.advanceTimersByTime(interval);
                }); // It's really important that checkCallback is run *before* we flush
                // in-flight promises. To be honest, I'm not sure why, and I can't quite
                // think of a way to reproduce the problem in a test, but I spent
                // an entire day banging my head against a wall on this.

                checkCallback();

                if (!finished) {
                  _context2.next = 21;
                  break;
                }

                return _context2.abrupt("break", 25);

              case 21:
                _context2.next = 23;
                return advanceTimersWrapper( /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee() {
                  return regenerator.wrap(function _callee$(_context) {
                    while (1) {
                      switch (_context.prev = _context.next) {
                        case 0:
                          _context.next = 2;
                          return new Promise(function (r) {
                            setTimeout(r, 0);
                            jest.advanceTimersByTime(0);
                          });

                        case 2:
                        case "end":
                          return _context.stop();
                      }
                    }
                  }, _callee);
                })));

              case 23:
                _context2.next = 11;
                break;

              case 25:
                _context2.next = 40;
                break;

              case 27:
                _context2.prev = 27;
                checkContainerType(container);
                _context2.next = 35;
                break;

              case 31:
                _context2.prev = 31;
                _context2.t0 = _context2["catch"](27);
                reject(_context2.t0);
                return _context2.abrupt("return");

              case 35:
                intervalId = setInterval(checkRealTimersCallback, interval);
                _getWindowFromNode = getWindowFromNode(container), MutationObserver = _getWindowFromNode.MutationObserver;
                observer = new MutationObserver(checkRealTimersCallback);
                observer.observe(container, mutationObserverOptions);
                checkCallback();

              case 40:
              case "end":
                return _context2.stop();
            }
          }
        }, _callee2, null, [[27, 31]]);
      }));

      return function (_x, _x2) {
        return _ref2.apply(this, arguments);
      };
    }());
  }

  function waitForWrapper(callback, options) {
    // create the error here so its stack trace is as close to the
    // calling code as possible
    var stackTraceError = new Error('STACK_TRACE_MESSAGE');
    return getConfig().asyncWrapper(function () {
      return waitFor(callback, _extends({
        stackTraceError: stackTraceError
      }, options));
    });
  }
  /*
  eslint
    max-lines-per-function: ["error", {"max": 200}],
  */


  function getElementError(message, container) {
    return getConfig().getElementError(message, container);
  }

  function getMultipleElementsFoundError(message, container) {
    return getElementError(message + "\n\n(If this is intentional, then use the `*AllBy*` variant of the query (like `queryAllByText`, `getAllByText`, or `findAllByText`)).", container);
  }

  function queryAllByAttribute(attribute, container, text, _temp) {
    var _ref = _temp === void 0 ? {} : _temp,
        _ref$exact = _ref.exact,
        exact = _ref$exact === void 0 ? true : _ref$exact,
        collapseWhitespace = _ref.collapseWhitespace,
        trim = _ref.trim,
        normalizer = _ref.normalizer;

    var matcher = exact ? matches : fuzzyMatches;
    var matchNormalizer = makeNormalizer({
      collapseWhitespace: collapseWhitespace,
      trim: trim,
      normalizer: normalizer
    });
    return Array.from(container.querySelectorAll("[" + attribute + "]")).filter(function (node) {
      return matcher(node.getAttribute(attribute), node, text, matchNormalizer);
    });
  }

  function queryByAttribute(attribute, container, text, options) {
    var els = queryAllByAttribute(attribute, container, text, options);

    if (els.length > 1) {
      throw getMultipleElementsFoundError("Found multiple elements by [" + attribute + "=" + text + "]", container);
    }

    return els[0] || null;
  } // this accepts a query function and returns a function which throws an error
  // if more than one elements is returned, otherwise it returns the first
  // element or null


  function makeSingleQuery(allQuery, getMultipleError) {
    return function (container) {
      for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        args[_key - 1] = arguments[_key];
      }

      var els = allQuery.apply(void 0, [container].concat(args));

      if (els.length > 1) {
        var elementStrings = els.map(function (element) {
          return getElementError(null, element).message;
        }).join('\n\n');
        throw getMultipleElementsFoundError(getMultipleError.apply(void 0, [container].concat(args)) + "\n\nHere are the matching elements:\n\n" + elementStrings, container);
      }

      return els[0] || null;
    };
  }

  function getSuggestionError(suggestion, container) {
    return getConfig().getElementError("A better query is available, try this:\n" + suggestion.toString() + "\n", container);
  } // this accepts a query function and returns a function which throws an error
  // if an empty list of elements is returned


  function makeGetAllQuery(allQuery, getMissingError) {
    return function (container) {
      for (var _len2 = arguments.length, args = new Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
        args[_key2 - 1] = arguments[_key2];
      }

      var els = allQuery.apply(void 0, [container].concat(args));

      if (!els.length) {
        throw getConfig().getElementError(getMissingError.apply(void 0, [container].concat(args)), container);
      }

      return els;
    };
  } // this accepts a getter query function and returns a function which calls
  // waitFor and passing a function which invokes the getter.


  function makeFindQuery(getter) {
    return function (container, text, options, waitForOptions) {
      return waitForWrapper(function () {
        return getter(container, text, options);
      }, _extends({
        container: container
      }, waitForOptions));
    };
  }

  var wrapSingleQueryWithSuggestion = function wrapSingleQueryWithSuggestion(query, queryAllByName, variant) {
    return function (container) {
      for (var _len3 = arguments.length, args = new Array(_len3 > 1 ? _len3 - 1 : 0), _key3 = 1; _key3 < _len3; _key3++) {
        args[_key3 - 1] = arguments[_key3];
      }

      var element = query.apply(void 0, [container].concat(args));

      var _ref2 = args.slice(-1),
          _ref2$ = _ref2[0];

      _ref2$ = _ref2$ === void 0 ? {} : _ref2$;
      var _ref2$$suggest = _ref2$.suggest,
          suggest = _ref2$$suggest === void 0 ? getConfig().throwSuggestions : _ref2$$suggest;

      if (element && suggest) {
        var suggestion = getSuggestedQuery(element, variant);

        if (suggestion && !queryAllByName.endsWith(suggestion.queryName)) {
          throw getSuggestionError(suggestion.toString(), container);
        }
      }

      return element;
    };
  };

  var wrapAllByQueryWithSuggestion = function wrapAllByQueryWithSuggestion(query, queryAllByName, variant) {
    return function (container) {
      for (var _len4 = arguments.length, args = new Array(_len4 > 1 ? _len4 - 1 : 0), _key4 = 1; _key4 < _len4; _key4++) {
        args[_key4 - 1] = arguments[_key4];
      }

      var els = query.apply(void 0, [container].concat(args));

      var _ref3 = args.slice(-1),
          _ref3$ = _ref3[0];

      _ref3$ = _ref3$ === void 0 ? {} : _ref3$;
      var _ref3$$suggest = _ref3$.suggest,
          suggest = _ref3$$suggest === void 0 ? getConfig().throwSuggestions : _ref3$$suggest;

      if (els.length && suggest) {
        // get a unique list of all suggestion messages.  We are only going to make a suggestion if
        // all the suggestions are the same
        var uniqueSuggestionMessages = [].concat(new Set(els.map(function (element) {
          var _getSuggestedQuery;

          return (_getSuggestedQuery = getSuggestedQuery(element, variant)) == null ? void 0 : _getSuggestedQuery.toString();
        })));

        if ( // only want to suggest if all the els have the same suggestion.
        uniqueSuggestionMessages.length === 1 && !queryAllByName.endsWith( // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- TODO: Can this be null at runtime?
        getSuggestedQuery(els[0], variant).queryName)) {
          throw getSuggestionError(uniqueSuggestionMessages[0], container);
        }
      }

      return els;
    };
  }; // TODO: This deviates from the published declarations
  // However, the implementation always required a dyadic (after `container`) not variadic `queryAllBy` considering the implementation of `makeFindQuery`
  // This is at least statically true and can be verified by accepting `QueryMethod<Arguments, HTMLElement[]>`


  function buildQueries(queryAllBy, getMultipleError, getMissingError) {
    var queryBy = wrapSingleQueryWithSuggestion(makeSingleQuery(queryAllBy, getMultipleError), queryAllBy.name, 'query');
    var getAllBy = makeGetAllQuery(queryAllBy, getMissingError);
    var getBy = makeSingleQuery(getAllBy, getMultipleError);
    var getByWithSuggestions = wrapSingleQueryWithSuggestion(getBy, queryAllBy.name, 'get');
    var getAllWithSuggestions = wrapAllByQueryWithSuggestion(getAllBy, queryAllBy.name.replace('query', 'get'), 'getAll');
    var findAllBy = makeFindQuery(wrapAllByQueryWithSuggestion(getAllBy, queryAllBy.name, 'findAll'));
    var findBy = makeFindQuery(wrapSingleQueryWithSuggestion(getBy, queryAllBy.name, 'find'));
    return [queryBy, getAllWithSuggestions, getByWithSuggestions, findAllBy, findBy];
  }

  var queryHelpers = /*#__PURE__*/Object.freeze({
    __proto__: null,
    getElementError: getElementError,
    wrapAllByQueryWithSuggestion: wrapAllByQueryWithSuggestion,
    wrapSingleQueryWithSuggestion: wrapSingleQueryWithSuggestion,
    getMultipleElementsFoundError: getMultipleElementsFoundError,
    queryAllByAttribute: queryAllByAttribute,
    queryByAttribute: queryByAttribute,
    makeSingleQuery: makeSingleQuery,
    makeGetAllQuery: makeGetAllQuery,
    makeFindQuery: makeFindQuery,
    buildQueries: buildQueries
  });

  function queryAllLabels(container) {
    return Array.from(container.querySelectorAll('label,input')).map(function (node) {
      return {
        node: node,
        textToMatch: getLabelContent(node)
      };
    }).filter(function (_ref) {
      var textToMatch = _ref.textToMatch;
      return textToMatch !== null;
    });
  }

  var queryAllLabelsByText = function queryAllLabelsByText(container, text, _temp) {
    var _ref2 = _temp === void 0 ? {} : _temp,
        _ref2$exact = _ref2.exact,
        exact = _ref2$exact === void 0 ? true : _ref2$exact,
        trim = _ref2.trim,
        collapseWhitespace = _ref2.collapseWhitespace,
        normalizer = _ref2.normalizer;

    var matcher = exact ? matches : fuzzyMatches;
    var matchNormalizer = makeNormalizer({
      collapseWhitespace: collapseWhitespace,
      trim: trim,
      normalizer: normalizer
    });
    var textToMatchByLabels = queryAllLabels(container);
    return textToMatchByLabels.filter(function (_ref3) {
      var node = _ref3.node,
          textToMatch = _ref3.textToMatch;
      return matcher(textToMatch, node, text, matchNormalizer);
    }).map(function (_ref4) {
      var node = _ref4.node;
      return node;
    });
  };

  var queryAllByLabelText = function queryAllByLabelText(container, text, _temp2) {
    var _ref5 = _temp2 === void 0 ? {} : _temp2,
        _ref5$selector = _ref5.selector,
        selector = _ref5$selector === void 0 ? '*' : _ref5$selector,
        _ref5$exact = _ref5.exact,
        exact = _ref5$exact === void 0 ? true : _ref5$exact,
        collapseWhitespace = _ref5.collapseWhitespace,
        trim = _ref5.trim,
        normalizer = _ref5.normalizer;

    checkContainerType(container);
    var matcher = exact ? matches : fuzzyMatches;
    var matchNormalizer = makeNormalizer({
      collapseWhitespace: collapseWhitespace,
      trim: trim,
      normalizer: normalizer
    });
    var matchingLabelledElements = Array.from(container.querySelectorAll('*')).filter(function (element) {
      return getRealLabels(element).length || element.hasAttribute('aria-labelledby');
    }).reduce(function (labelledElements, labelledElement) {
      var labelList = getLabels(container, labelledElement, {
        selector: selector
      });
      labelList.filter(function (label) {
        return Boolean(label.formControl);
      }).forEach(function (label) {
        if (matcher(label.content, label.formControl, text, matchNormalizer) && label.formControl) labelledElements.push(label.formControl);
      });
      var labelsValue = labelList.filter(function (label) {
        return Boolean(label.content);
      }).map(function (label) {
        return label.content;
      });
      if (matcher(labelsValue.join(' '), labelledElement, text, matchNormalizer)) labelledElements.push(labelledElement);

      if (labelsValue.length > 1) {
        labelsValue.forEach(function (labelValue, index) {
          if (matcher(labelValue, labelledElement, text, matchNormalizer)) labelledElements.push(labelledElement);
          var labelsFiltered = [].concat(labelsValue);
          labelsFiltered.splice(index, 1);

          if (labelsFiltered.length > 1) {
            if (matcher(labelsFiltered.join(' '), labelledElement, text, matchNormalizer)) labelledElements.push(labelledElement);
          }
        });
      }

      return labelledElements;
    }, []).concat(queryAllByAttribute('aria-label', container, text, {
      exact: exact,
      normalizer: matchNormalizer
    }));
    return Array.from(new Set(matchingLabelledElements)).filter(function (element) {
      return element.matches(selector);
    });
  }; // the getAll* query would normally look like this:
  // const getAllByLabelText = makeGetAllQuery(
  //   queryAllByLabelText,
  //   (c, text) => `Unable to find a label with the text of: ${text}`,
  // )
  // however, we can give a more helpful error message than the generic one,
  // so we're writing this one out by hand.


  var getAllByLabelText = function getAllByLabelText(container, text) {
    for (var _len = arguments.length, rest = new Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) {
      rest[_key - 2] = arguments[_key];
    }

    var els = queryAllByLabelText.apply(void 0, [container, text].concat(rest));

    if (!els.length) {
      var labels = queryAllLabelsByText.apply(void 0, [container, text].concat(rest));

      if (labels.length) {
        var tagNames = labels.map(function (label) {
          return getTagNameOfElementAssociatedWithLabelViaFor(container, label);
        }).filter(function (tagName) {
          return !!tagName;
        });

        if (tagNames.length) {
          throw getConfig().getElementError(tagNames.map(function (tagName) {
            return "Found a label with the text of: " + text + ", however the element associated with this label (<" + tagName + " />) is non-labellable [https://html.spec.whatwg.org/multipage/forms.html#category-label]. If you really need to label a <" + tagName + " />, you can use aria-label or aria-labelledby instead.";
          }).join('\n\n'), container);
        } else {
          throw getConfig().getElementError("Found a label with the text of: " + text + ", however no form control was found associated to that label. Make sure you're using the \"for\" attribute or \"aria-labelledby\" attribute correctly.", container);
        }
      } else {
        throw getConfig().getElementError("Unable to find a label with the text of: " + text, container);
      }
    }

    return els;
  };

  function getTagNameOfElementAssociatedWithLabelViaFor(container, label) {
    var htmlFor = label.getAttribute('for');

    if (!htmlFor) {
      return null;
    }

    var element = container.querySelector("[id=\"" + htmlFor + "\"]");
    return element ? element.tagName.toLowerCase() : null;
  } // the reason mentioned above is the same reason we're not using buildQueries


  var getMultipleError$7 = function getMultipleError(c, text) {
    return "Found multiple elements with the text of: " + text;
  };

  var queryByLabelText = wrapSingleQueryWithSuggestion(makeSingleQuery(queryAllByLabelText, getMultipleError$7), queryAllByLabelText.name, 'query');
  var getByLabelText = makeSingleQuery(getAllByLabelText, getMultipleError$7);
  var findAllByLabelText = makeFindQuery(wrapAllByQueryWithSuggestion(getAllByLabelText, getAllByLabelText.name, 'findAll'));
  var findByLabelText = makeFindQuery(wrapSingleQueryWithSuggestion(getByLabelText, getAllByLabelText.name, 'find'));
  var getAllByLabelTextWithSuggestions = wrapAllByQueryWithSuggestion(getAllByLabelText, getAllByLabelText.name, 'getAll');
  var getByLabelTextWithSuggestions = wrapSingleQueryWithSuggestion(getByLabelText, getAllByLabelText.name, 'get');
  var queryAllByLabelTextWithSuggestions = wrapAllByQueryWithSuggestion(queryAllByLabelText, queryAllByLabelText.name, 'queryAll');

  var queryAllByPlaceholderText = function queryAllByPlaceholderText() {
    for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    checkContainerType(args[0]);
    return queryAllByAttribute.apply(void 0, ['placeholder'].concat(args));
  };

  var getMultipleError$6 = function getMultipleError(c, text) {
    return "Found multiple elements with the placeholder text of: " + text;
  };

  var getMissingError$6 = function getMissingError(c, text) {
    return "Unable to find an element with the placeholder text of: " + text;
  };

  var queryAllByPlaceholderTextWithSuggestions = wrapAllByQueryWithSuggestion(queryAllByPlaceholderText, queryAllByPlaceholderText.name, 'queryAll');

  var _buildQueries$6 = buildQueries(queryAllByPlaceholderText, getMultipleError$6, getMissingError$6),
      queryByPlaceholderText = _buildQueries$6[0],
      getAllByPlaceholderText = _buildQueries$6[1],
      getByPlaceholderText = _buildQueries$6[2],
      findAllByPlaceholderText = _buildQueries$6[3],
      findByPlaceholderText = _buildQueries$6[4];

  var queryAllByText = function queryAllByText(container, text, _temp) {
    var _ref = _temp === void 0 ? {} : _temp,
        _ref$selector = _ref.selector,
        selector = _ref$selector === void 0 ? '*' : _ref$selector,
        _ref$exact = _ref.exact,
        exact = _ref$exact === void 0 ? true : _ref$exact,
        collapseWhitespace = _ref.collapseWhitespace,
        trim = _ref.trim,
        _ref$ignore = _ref.ignore,
        ignore = _ref$ignore === void 0 ? DEFAULT_IGNORE_TAGS : _ref$ignore,
        normalizer = _ref.normalizer;

    checkContainerType(container);
    var matcher = exact ? matches : fuzzyMatches;
    var matchNormalizer = makeNormalizer({
      collapseWhitespace: collapseWhitespace,
      trim: trim,
      normalizer: normalizer
    });
    var baseArray = [];

    if (typeof container.matches === 'function' && container.matches(selector)) {
      baseArray = [container];
    }

    return [].concat(baseArray, Array.from(container.querySelectorAll(selector))) // TODO: `matches` according lib.dom.d.ts can get only `string` but according our code it can handle also boolean :)
    .filter(function (node) {
      return !ignore || !node.matches(ignore);
    }).filter(function (node) {
      return matcher(getNodeText(node), node, text, matchNormalizer);
    });
  };

  var getMultipleError$5 = function getMultipleError(c, text) {
    return "Found multiple elements with the text: " + text;
  };

  var getMissingError$5 = function getMissingError(c, text, options) {
    if (options === void 0) {
      options = {};
    }

    var _options = options,
        collapseWhitespace = _options.collapseWhitespace,
        trim = _options.trim,
        normalizer = _options.normalizer;
    var matchNormalizer = makeNormalizer({
      collapseWhitespace: collapseWhitespace,
      trim: trim,
      normalizer: normalizer
    });
    var normalizedText = matchNormalizer(text.toString());
    var isNormalizedDifferent = normalizedText !== text.toString();
    return "Unable to find an element with the text: " + (isNormalizedDifferent ? normalizedText + " (normalized from '" + text + "')" : text) + ". This could be because the text is broken up by multiple elements. In this case, you can provide a function for your text matcher to make your matcher more flexible.";
  };

  var queryAllByTextWithSuggestions = wrapAllByQueryWithSuggestion(queryAllByText, queryAllByText.name, 'queryAll');

  var _buildQueries$5 = buildQueries(queryAllByText, getMultipleError$5, getMissingError$5),
      queryByText = _buildQueries$5[0],
      getAllByText = _buildQueries$5[1],
      getByText = _buildQueries$5[2],
      findAllByText = _buildQueries$5[3],
      findByText = _buildQueries$5[4];

  var queryAllByDisplayValue = function queryAllByDisplayValue(container, value, _temp) {
    var _ref = _temp === void 0 ? {} : _temp,
        _ref$exact = _ref.exact,
        exact = _ref$exact === void 0 ? true : _ref$exact,
        collapseWhitespace = _ref.collapseWhitespace,
        trim = _ref.trim,
        normalizer = _ref.normalizer;

    checkContainerType(container);
    var matcher = exact ? matches : fuzzyMatches;
    var matchNormalizer = makeNormalizer({
      collapseWhitespace: collapseWhitespace,
      trim: trim,
      normalizer: normalizer
    });
    return Array.from(container.querySelectorAll("input,textarea,select")).filter(function (node) {
      if (node.tagName === 'SELECT') {
        var selectedOptions = Array.from(node.options).filter(function (option) {
          return option.selected;
        });
        return selectedOptions.some(function (optionNode) {
          return matcher(getNodeText(optionNode), optionNode, value, matchNormalizer);
        });
      } else {
        return matcher(node.value, node, value, matchNormalizer);
      }
    });
  };

  var getMultipleError$4 = function getMultipleError(c, value) {
    return "Found multiple elements with the display value: " + value + ".";
  };

  var getMissingError$4 = function getMissingError(c, value) {
    return "Unable to find an element with the display value: " + value + ".";
  };

  var queryAllByDisplayValueWithSuggestions = wrapAllByQueryWithSuggestion(queryAllByDisplayValue, queryAllByDisplayValue.name, 'queryAll');

  var _buildQueries$4 = buildQueries(queryAllByDisplayValue, getMultipleError$4, getMissingError$4),
      queryByDisplayValue = _buildQueries$4[0],
      getAllByDisplayValue = _buildQueries$4[1],
      getByDisplayValue = _buildQueries$4[2],
      findAllByDisplayValue = _buildQueries$4[3],
      findByDisplayValue = _buildQueries$4[4];

  var VALID_TAG_REGEXP = /^(img|input|area|.+-.+)$/i;

  var queryAllByAltText = function queryAllByAltText(container, alt, options) {
    if (options === void 0) {
      options = {};
    }

    checkContainerType(container);
    return queryAllByAttribute('alt', container, alt, options).filter(function (node) {
      return VALID_TAG_REGEXP.test(node.tagName);
    });
  };

  var getMultipleError$3 = function getMultipleError(c, alt) {
    return "Found multiple elements with the alt text: " + alt;
  };

  var getMissingError$3 = function getMissingError(c, alt) {
    return "Unable to find an element with the alt text: " + alt;
  };

  var queryAllByAltTextWithSuggestions = wrapAllByQueryWithSuggestion(queryAllByAltText, queryAllByAltText.name, 'queryAll');

  var _buildQueries$3 = buildQueries(queryAllByAltText, getMultipleError$3, getMissingError$3),
      queryByAltText = _buildQueries$3[0],
      getAllByAltText = _buildQueries$3[1],
      getByAltText = _buildQueries$3[2],
      findAllByAltText = _buildQueries$3[3],
      findByAltText = _buildQueries$3[4];

  var isSvgTitle = function isSvgTitle(node) {
    var _node$parentElement;

    return node.tagName.toLowerCase() === 'title' && ((_node$parentElement = node.parentElement) == null ? void 0 : _node$parentElement.tagName.toLowerCase()) === 'svg';
  };

  var queryAllByTitle = function queryAllByTitle(container, text, _temp) {
    var _ref = _temp === void 0 ? {} : _temp,
        _ref$exact = _ref.exact,
        exact = _ref$exact === void 0 ? true : _ref$exact,
        collapseWhitespace = _ref.collapseWhitespace,
        trim = _ref.trim,
        normalizer = _ref.normalizer;

    checkContainerType(container);
    var matcher = exact ? matches : fuzzyMatches;
    var matchNormalizer = makeNormalizer({
      collapseWhitespace: collapseWhitespace,
      trim: trim,
      normalizer: normalizer
    });
    return Array.from(container.querySelectorAll('[title], svg > title')).filter(function (node) {
      return matcher(node.getAttribute('title'), node, text, matchNormalizer) || isSvgTitle(node) && matcher(getNodeText(node), node, text, matchNormalizer);
    });
  };

  var getMultipleError$2 = function getMultipleError(c, title) {
    return "Found multiple elements with the title: " + title + ".";
  };

  var getMissingError$2 = function getMissingError(c, title) {
    return "Unable to find an element with the title: " + title + ".";
  };

  var queryAllByTitleWithSuggestions = wrapAllByQueryWithSuggestion(queryAllByTitle, queryAllByTitle.name, 'queryAll');

  var _buildQueries$2 = buildQueries(queryAllByTitle, getMultipleError$2, getMissingError$2),
      queryByTitle = _buildQueries$2[0],
      getAllByTitle = _buildQueries$2[1],
      getByTitle = _buildQueries$2[2],
      findAllByTitle = _buildQueries$2[3],
      findByTitle = _buildQueries$2[4];

  function queryAllByRole(container, role, _temp) {
    var _ref = _temp === void 0 ? {} : _temp,
        _ref$exact = _ref.exact,
        exact = _ref$exact === void 0 ? true : _ref$exact,
        collapseWhitespace = _ref.collapseWhitespace,
        _ref$hidden = _ref.hidden,
        hidden = _ref$hidden === void 0 ? getConfig().defaultHidden : _ref$hidden,
        name = _ref.name,
        trim = _ref.trim,
        normalizer = _ref.normalizer,
        _ref$queryFallbacks = _ref.queryFallbacks,
        queryFallbacks = _ref$queryFallbacks === void 0 ? false : _ref$queryFallbacks,
        selected = _ref.selected,
        checked = _ref.checked,
        pressed = _ref.pressed,
        current = _ref.current,
        level = _ref.level,
        expanded = _ref.expanded;

    checkContainerType(container);
    var matcher = exact ? matches : fuzzyMatches;
    var matchNormalizer = makeNormalizer({
      collapseWhitespace: collapseWhitespace,
      trim: trim,
      normalizer: normalizer
    });

    if (selected !== undefined) {
      var _allRoles$get; // guard against unknown roles


      if (((_allRoles$get = roles_1.get(role)) == null ? void 0 : _allRoles$get.props['aria-selected']) === undefined) {
        throw new Error("\"aria-selected\" is not supported on role \"" + role + "\".");
      }
    }

    if (checked !== undefined) {
      var _allRoles$get2; // guard against unknown roles


      if (((_allRoles$get2 = roles_1.get(role)) == null ? void 0 : _allRoles$get2.props['aria-checked']) === undefined) {
        throw new Error("\"aria-checked\" is not supported on role \"" + role + "\".");
      }
    }

    if (pressed !== undefined) {
      var _allRoles$get3; // guard against unknown roles


      if (((_allRoles$get3 = roles_1.get(role)) == null ? void 0 : _allRoles$get3.props['aria-pressed']) === undefined) {
        throw new Error("\"aria-pressed\" is not supported on role \"" + role + "\".");
      }
    }

    if (current !== undefined) {
      var _allRoles$get4;
      /* istanbul ignore next */
      // guard against unknown roles
      // All currently released ARIA versions support `aria-current` on all roles.
      // Leaving this for symetry and forward compatibility


      if (((_allRoles$get4 = roles_1.get(role)) == null ? void 0 : _allRoles$get4.props['aria-current']) === undefined) {
        throw new Error("\"aria-current\" is not supported on role \"" + role + "\".");
      }
    }

    if (level !== undefined) {
      // guard against using `level` option with any role other than `heading`
      if (role !== 'heading') {
        throw new Error("Role \"" + role + "\" cannot have \"level\" property.");
      }
    }

    if (expanded !== undefined) {
      var _allRoles$get5; // guard against unknown roles


      if (((_allRoles$get5 = roles_1.get(role)) == null ? void 0 : _allRoles$get5.props['aria-expanded']) === undefined) {
        throw new Error("\"aria-expanded\" is not supported on role \"" + role + "\".");
      }
    }

    var subtreeIsInaccessibleCache = new WeakMap();

    function cachedIsSubtreeInaccessible(element) {
      if (!subtreeIsInaccessibleCache.has(element)) {
        subtreeIsInaccessibleCache.set(element, isSubtreeInaccessible(element));
      }

      return subtreeIsInaccessibleCache.get(element);
    }

    return Array.from(container.querySelectorAll( // Only query elements that can be matched by the following filters
    makeRoleSelector(role, exact, normalizer ? matchNormalizer : undefined))).filter(function (node) {
      var isRoleSpecifiedExplicitly = node.hasAttribute('role');

      if (isRoleSpecifiedExplicitly) {
        var roleValue = node.getAttribute('role');

        if (queryFallbacks) {
          return roleValue.split(' ').filter(Boolean).some(function (text) {
            return matcher(text, node, role, matchNormalizer);
          });
        } // if a custom normalizer is passed then let normalizer handle the role value


        if (normalizer) {
          return matcher(roleValue, node, role, matchNormalizer);
        } // other wise only send the first word to match


        var _roleValue$split = roleValue.split(' '),
            firstWord = _roleValue$split[0];

        return matcher(firstWord, node, role, matchNormalizer);
      }

      var implicitRoles = getImplicitAriaRoles(node);
      return implicitRoles.some(function (implicitRole) {
        return matcher(implicitRole, node, role, matchNormalizer);
      });
    }).filter(function (element) {
      if (selected !== undefined) {
        return selected === computeAriaSelected(element);
      }

      if (checked !== undefined) {
        return checked === computeAriaChecked(element);
      }

      if (pressed !== undefined) {
        return pressed === computeAriaPressed(element);
      }

      if (current !== undefined) {
        return current === computeAriaCurrent(element);
      }

      if (expanded !== undefined) {
        return expanded === computeAriaExpanded(element);
      }

      if (level !== undefined) {
        return level === computeHeadingLevel(element);
      } // don't care if aria attributes are unspecified


      return true;
    }).filter(function (element) {
      if (name === undefined) {
        // Don't care
        return true;
      }

      return matches(computeAccessibleName(element, {
        computedStyleSupportsPseudoElements: getConfig().computedStyleSupportsPseudoElements
      }), element, name, function (text) {
        return text;
      });
    }).filter(function (element) {
      return hidden === false ? isInaccessible(element, {
        isSubtreeInaccessible: cachedIsSubtreeInaccessible
      }) === false : true;
    });
  }

  function makeRoleSelector(role, exact, customNormalizer) {
    var _roleElements$get;

    if (typeof role !== 'string') {
      // For non-string role parameters we can not determine the implicitRoleSelectors.
      return '*';
    }

    var explicitRoleSelector = exact && !customNormalizer ? "*[role~=\"" + role + "\"]" : '*[role]';
    var roleRelations = (_roleElements$get = roleElements_1.get(role)) != null ? _roleElements$get : new Set();
    var implicitRoleSelectors = new Set(Array.from(roleRelations).map(function (_ref2) {
      var name = _ref2.name;
      return name;
    })); // Current transpilation config sometimes assumes `...` is always applied to arrays.
    // `...` is equivalent to `Array.prototype.concat` for arrays.
    // If you replace this code with `[explicitRoleSelector, ...implicitRoleSelectors]`, make sure every transpilation target retains the `...` in favor of `Array.prototype.concat`.

    return [explicitRoleSelector].concat(Array.from(implicitRoleSelectors)).join(',');
  }

  var getMultipleError$1 = function getMultipleError(c, role, _temp2) {
    var _ref3 = _temp2 === void 0 ? {} : _temp2,
        name = _ref3.name;

    var nameHint = '';

    if (name === undefined) {
      nameHint = '';
    } else if (typeof name === 'string') {
      nameHint = " and name \"" + name + "\"";
    } else {
      nameHint = " and name `" + name + "`";
    }

    return "Found multiple elements with the role \"" + role + "\"" + nameHint;
  };

  var getMissingError$1 = function getMissingError(container, role, _temp3) {
    var _ref4 = _temp3 === void 0 ? {} : _temp3,
        _ref4$hidden = _ref4.hidden,
        hidden = _ref4$hidden === void 0 ? getConfig().defaultHidden : _ref4$hidden,
        name = _ref4.name;

    if (getConfig()._disableExpensiveErrorDiagnostics) {
      return "Unable to find role=\"" + role + "\"";
    }

    var roles = '';
    Array.from(container.children).forEach(function (childElement) {
      roles += prettyRoles(childElement, {
        hidden: hidden,
        includeName: name !== undefined
      });
    });
    var roleMessage;

    if (roles.length === 0) {
      if (hidden === false) {
        roleMessage = 'There are no accessible roles. But there might be some inaccessible roles. ' + 'If you wish to access them, then set the `hidden` option to `true`. ' + 'Learn more about this here: https://testing-library.com/docs/dom-testing-library/api-queries#byrole';
      } else {
        roleMessage = 'There are no available roles.';
      }
    } else {
      roleMessage = ("\nHere are the " + (hidden === false ? 'accessible' : 'available') + " roles:\n\n  " + roles.replace(/\n/g, '\n  ').replace(/\n\s\s\n/g, '\n\n') + "\n").trim();
    }

    var nameHint = '';

    if (name === undefined) {
      nameHint = '';
    } else if (typeof name === 'string') {
      nameHint = " and name \"" + name + "\"";
    } else {
      nameHint = " and name `" + name + "`";
    }

    return ("\nUnable to find an " + (hidden === false ? 'accessible ' : '') + "element with the role \"" + role + "\"" + nameHint + "\n\n" + roleMessage).trim();
  };

  var queryAllByRoleWithSuggestions = wrapAllByQueryWithSuggestion(queryAllByRole, queryAllByRole.name, 'queryAll');

  var _buildQueries$1 = buildQueries(queryAllByRole, getMultipleError$1, getMissingError$1),
      queryByRole = _buildQueries$1[0],
      getAllByRole = _buildQueries$1[1],
      getByRole = _buildQueries$1[2],
      findAllByRole = _buildQueries$1[3],
      findByRole = _buildQueries$1[4];

  var getTestIdAttribute = function getTestIdAttribute() {
    return getConfig().testIdAttribute;
  };

  var queryAllByTestId = function queryAllByTestId() {
    for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    checkContainerType(args[0]);
    return queryAllByAttribute.apply(void 0, [getTestIdAttribute()].concat(args));
  };

  var getMultipleError = function getMultipleError(c, id) {
    return "Found multiple elements by: [" + getTestIdAttribute() + "=\"" + id + "\"]";
  };

  var getMissingError = function getMissingError(c, id) {
    return "Unable to find an element by: [" + getTestIdAttribute() + "=\"" + id + "\"]";
  };

  var queryAllByTestIdWithSuggestions = wrapAllByQueryWithSuggestion(queryAllByTestId, queryAllByTestId.name, 'queryAll');

  var _buildQueries = buildQueries(queryAllByTestId, getMultipleError, getMissingError),
      queryByTestId = _buildQueries[0],
      getAllByTestId = _buildQueries[1],
      getByTestId = _buildQueries[2],
      findAllByTestId = _buildQueries[3],
      findByTestId = _buildQueries[4];

  var queries = /*#__PURE__*/Object.freeze({
    __proto__: null,
    queryAllByLabelText: queryAllByLabelTextWithSuggestions,
    queryByLabelText: queryByLabelText,
    getAllByLabelText: getAllByLabelTextWithSuggestions,
    getByLabelText: getByLabelTextWithSuggestions,
    findAllByLabelText: findAllByLabelText,
    findByLabelText: findByLabelText,
    queryByPlaceholderText: queryByPlaceholderText,
    queryAllByPlaceholderText: queryAllByPlaceholderTextWithSuggestions,
    getByPlaceholderText: getByPlaceholderText,
    getAllByPlaceholderText: getAllByPlaceholderText,
    findAllByPlaceholderText: findAllByPlaceholderText,
    findByPlaceholderText: findByPlaceholderText,
    queryByText: queryByText,
    queryAllByText: queryAllByTextWithSuggestions,
    getByText: getByText,
    getAllByText: getAllByText,
    findAllByText: findAllByText,
    findByText: findByText,
    queryByDisplayValue: queryByDisplayValue,
    queryAllByDisplayValue: queryAllByDisplayValueWithSuggestions,
    getByDisplayValue: getByDisplayValue,
    getAllByDisplayValue: getAllByDisplayValue,
    findAllByDisplayValue: findAllByDisplayValue,
    findByDisplayValue: findByDisplayValue,
    queryByAltText: queryByAltText,
    queryAllByAltText: queryAllByAltTextWithSuggestions,
    getByAltText: getByAltText,
    getAllByAltText: getAllByAltText,
    findAllByAltText: findAllByAltText,
    findByAltText: findByAltText,
    queryByTitle: queryByTitle,
    queryAllByTitle: queryAllByTitleWithSuggestions,
    getByTitle: getByTitle,
    getAllByTitle: getAllByTitle,
    findAllByTitle: findAllByTitle,
    findByTitle: findByTitle,
    queryByRole: queryByRole,
    queryAllByRole: queryAllByRoleWithSuggestions,
    getAllByRole: getAllByRole,
    getByRole: getByRole,
    findAllByRole: findAllByRole,
    findByRole: findByRole,
    queryByTestId: queryByTestId,
    queryAllByTestId: queryAllByTestIdWithSuggestions,
    getByTestId: getByTestId,
    getAllByTestId: getAllByTestId,
    findAllByTestId: findAllByTestId,
    findByTestId: findByTestId
  });
  /**
   * @typedef {{[key: string]: Function}} FuncMap
   */

  /**
   * @param {HTMLElement} element container
   * @param {FuncMap} queries object of functions
   * @param {Object} initialValue for reducer
   * @returns {FuncMap} returns object of functions bound to container
   */

  function getQueriesForElement(element, queries$1, initialValue) {
    if (queries$1 === void 0) {
      queries$1 = queries;
    }

    if (initialValue === void 0) {
      initialValue = {};
    }

    return Object.keys(queries$1).reduce(function (helpers, key) {
      var fn = queries$1[key];
      helpers[key] = fn.bind(null, element);
      return helpers;
    }, initialValue);
  }

  var isRemoved = function isRemoved(result) {
    return !result || Array.isArray(result) && !result.length;
  }; // Check if the element is not present.
  // As the name implies, waitForElementToBeRemoved should check `present` --> `removed`


  function initialCheck(elements) {
    if (isRemoved(elements)) {
      throw new Error('The element(s) given to waitForElementToBeRemoved are already removed. waitForElementToBeRemoved requires that the element(s) exist(s) before waiting for removal.');
    }
  }

  function waitForElementToBeRemoved(_x, _x2) {
    return _waitForElementToBeRemoved.apply(this, arguments);
  }

  function _waitForElementToBeRemoved() {
    _waitForElementToBeRemoved = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee(callback, options) {
      var timeoutError, elements, getRemainingElements;
      return regenerator.wrap(function _callee$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              // created here so we get a nice stacktrace
              timeoutError = new Error('Timed out in waitForElementToBeRemoved.');

              if (typeof callback !== 'function') {
                initialCheck(callback);
                elements = Array.isArray(callback) ? callback : [callback];
                getRemainingElements = elements.map(function (element) {
                  var parent = element.parentElement;
                  if (parent === null) return function () {
                    return null;
                  };

                  while (parent.parentElement) {
                    parent = parent.parentElement;
                  }

                  return function () {
                    return parent.contains(element) ? element : null;
                  };
                });

                callback = function callback() {
                  return getRemainingElements.map(function (c) {
                    return c();
                  }).filter(Boolean);
                };
              }

              initialCheck(callback());
              return _context.abrupt("return", waitForWrapper(function () {
                var result;

                try {
                  result = callback();
                } catch (error) {
                  if (error.name === 'TestingLibraryElementError') {
                    return undefined;
                  }

                  throw error;
                }

                if (!isRemoved(result)) {
                  throw timeoutError;
                }

                return undefined;
              }, options));

            case 4:
            case "end":
              return _context.stop();
          }
        }
      }, _callee);
    }));
    return _waitForElementToBeRemoved.apply(this, arguments);
  }
  /*
  eslint
    require-await: "off"
  */


  var eventMap = {
    // Clipboard Events
    copy: {
      EventType: 'ClipboardEvent',
      defaultInit: {
        bubbles: true,
        cancelable: true,
        composed: true
      }
    },
    cut: {
      EventType: 'ClipboardEvent',
      defaultInit: {
        bubbles: true,
        cancelable: true,
        composed: true
      }
    },
    paste: {
      EventType: 'ClipboardEvent',
      defaultInit: {
        bubbles: true,
        cancelable: true,
        composed: true
      }
    },
    // Composition Events
    compositionEnd: {
      EventType: 'CompositionEvent',
      defaultInit: {
        bubbles: true,
        cancelable: true,
        composed: true
      }
    },
    compositionStart: {
      EventType: 'CompositionEvent',
      defaultInit: {
        bubbles: true,
        cancelable: true,
        composed: true
      }
    },
    compositionUpdate: {
      EventType: 'CompositionEvent',
      defaultInit: {
        bubbles: true,
        cancelable: true,
        composed: true
      }
    },
    // Keyboard Events
    keyDown: {
      EventType: 'KeyboardEvent',
      defaultInit: {
        bubbles: true,
        cancelable: true,
        charCode: 0,
        composed: true
      }
    },
    keyPress: {
      EventType: 'KeyboardEvent',
      defaultInit: {
        bubbles: true,
        cancelable: true,
        charCode: 0,
        composed: true
      }
    },
    keyUp: {
      EventType: 'KeyboardEvent',
      defaultInit: {
        bubbles: true,
        cancelable: true,
        charCode: 0,
        composed: true
      }
    },
    // Focus Events
    focus: {
      EventType: 'FocusEvent',
      defaultInit: {
        bubbles: false,
        cancelable: false,
        composed: true
      }
    },
    blur: {
      EventType: 'FocusEvent',
      defaultInit: {
        bubbles: false,
        cancelable: false,
        composed: true
      }
    },
    focusIn: {
      EventType: 'FocusEvent',
      defaultInit: {
        bubbles: true,
        cancelable: false,
        composed: true
      }
    },
    focusOut: {
      EventType: 'FocusEvent',
      defaultInit: {
        bubbles: true,
        cancelable: false,
        composed: true
      }
    },
    // Form Events
    change: {
      EventType: 'Event',
      defaultInit: {
        bubbles: true,
        cancelable: false
      }
    },
    input: {
      EventType: 'InputEvent',
      defaultInit: {
        bubbles: true,
        cancelable: false,
        composed: true
      }
    },
    invalid: {
      EventType: 'Event',
      defaultInit: {
        bubbles: false,
        cancelable: true
      }
    },
    submit: {
      EventType: 'Event',
      defaultInit: {
        bubbles: true,
        cancelable: true
      }
    },
    reset: {
      EventType: 'Event',
      defaultInit: {
        bubbles: true,
        cancelable: true
      }
    },
    // Mouse Events
    click: {
      EventType: 'MouseEvent',
      defaultInit: {
        bubbles: true,
        cancelable: true,
        button: 0,
        composed: true
      }
    },
    contextMenu: {
      EventType: 'MouseEvent',
      defaultInit: {
        bubbles: true,
        cancelable: true,
        composed: true
      }
    },
    dblClick: {
      EventType: 'MouseEvent',
      defaultInit: {
        bubbles: true,
        cancelable: true,
        composed: true
      }
    },
    drag: {
      EventType: 'DragEvent',
      defaultInit: {
        bubbles: true,
        cancelable: true,
        composed: true
      }
    },
    dragEnd: {
      EventType: 'DragEvent',
      defaultInit: {
        bubbles: true,
        cancelable: false,
        composed: true
      }
    },
    dragEnter: {
      EventType: 'DragEvent',
      defaultInit: {
        bubbles: true,
        cancelable: true,
        composed: true
      }
    },
    dragExit: {
      EventType: 'DragEvent',
      defaultInit: {
        bubbles: true,
        cancelable: false,
        composed: true
      }
    },
    dragLeave: {
      EventType: 'DragEvent',
      defaultInit: {
        bubbles: true,
        cancelable: false,
        composed: true
      }
    },
    dragOver: {
      EventType: 'DragEvent',
      defaultInit: {
        bubbles: true,
        cancelable: true,
        composed: true
      }
    },
    dragStart: {
      EventType: 'DragEvent',
      defaultInit: {
        bubbles: true,
        cancelable: true,
        composed: true
      }
    },
    drop: {
      EventType: 'DragEvent',
      defaultInit: {
        bubbles: true,
        cancelable: true,
        composed: true
      }
    },
    mouseDown: {
      EventType: 'MouseEvent',
      defaultInit: {
        bubbles: true,
        cancelable: true,
        composed: true
      }
    },
    mouseEnter: {
      EventType: 'MouseEvent',
      defaultInit: {
        bubbles: false,
        cancelable: false,
        composed: true
      }
    },
    mouseLeave: {
      EventType: 'MouseEvent',
      defaultInit: {
        bubbles: false,
        cancelable: false,
        composed: true
      }
    },
    mouseMove: {
      EventType: 'MouseEvent',
      defaultInit: {
        bubbles: true,
        cancelable: true,
        composed: true
      }
    },
    mouseOut: {
      EventType: 'MouseEvent',
      defaultInit: {
        bubbles: true,
        cancelable: true,
        composed: true
      }
    },
    mouseOver: {
      EventType: 'MouseEvent',
      defaultInit: {
        bubbles: true,
        cancelable: true,
        composed: true
      }
    },
    mouseUp: {
      EventType: 'MouseEvent',
      defaultInit: {
        bubbles: true,
        cancelable: true,
        composed: true
      }
    },
    // Selection Events
    select: {
      EventType: 'Event',
      defaultInit: {
        bubbles: true,
        cancelable: false
      }
    },
    // Touch Events
    touchCancel: {
      EventType: 'TouchEvent',
      defaultInit: {
        bubbles: true,
        cancelable: false,
        composed: true
      }
    },
    touchEnd: {
      EventType: 'TouchEvent',
      defaultInit: {
        bubbles: true,
        cancelable: true,
        composed: true
      }
    },
    touchMove: {
      EventType: 'TouchEvent',
      defaultInit: {
        bubbles: true,
        cancelable: true,
        composed: true
      }
    },
    touchStart: {
      EventType: 'TouchEvent',
      defaultInit: {
        bubbles: true,
        cancelable: true,
        composed: true
      }
    },
    // UI Events
    resize: {
      EventType: 'UIEvent',
      defaultInit: {
        bubbles: false,
        cancelable: false
      }
    },
    scroll: {
      EventType: 'UIEvent',
      defaultInit: {
        bubbles: false,
        cancelable: false
      }
    },
    // Wheel Events
    wheel: {
      EventType: 'WheelEvent',
      defaultInit: {
        bubbles: true,
        cancelable: true,
        composed: true
      }
    },
    // Media Events
    abort: {
      EventType: 'Event',
      defaultInit: {
        bubbles: false,
        cancelable: false
      }
    },
    canPlay: {
      EventType: 'Event',
      defaultInit: {
        bubbles: false,
        cancelable: false
      }
    },
    canPlayThrough: {
      EventType: 'Event',
      defaultInit: {
        bubbles: false,
        cancelable: false
      }
    },
    durationChange: {
      EventType: 'Event',
      defaultInit: {
        bubbles: false,
        cancelable: false
      }
    },
    emptied: {
      EventType: 'Event',
      defaultInit: {
        bubbles: false,
        cancelable: false
      }
    },
    encrypted: {
      EventType: 'Event',
      defaultInit: {
        bubbles: false,
        cancelable: false
      }
    },
    ended: {
      EventType: 'Event',
      defaultInit: {
        bubbles: false,
        cancelable: false
      }
    },
    loadedData: {
      EventType: 'Event',
      defaultInit: {
        bubbles: false,
        cancelable: false
      }
    },
    loadedMetadata: {
      EventType: 'Event',
      defaultInit: {
        bubbles: false,
        cancelable: false
      }
    },
    loadStart: {
      EventType: 'ProgressEvent',
      defaultInit: {
        bubbles: false,
        cancelable: false
      }
    },
    pause: {
      EventType: 'Event',
      defaultInit: {
        bubbles: false,
        cancelable: false
      }
    },
    play: {
      EventType: 'Event',
      defaultInit: {
        bubbles: false,
        cancelable: false
      }
    },
    playing: {
      EventType: 'Event',
      defaultInit: {
        bubbles: false,
        cancelable: false
      }
    },
    progress: {
      EventType: 'ProgressEvent',
      defaultInit: {
        bubbles: false,
        cancelable: false
      }
    },
    rateChange: {
      EventType: 'Event',
      defaultInit: {
        bubbles: false,
        cancelable: false
      }
    },
    seeked: {
      EventType: 'Event',
      defaultInit: {
        bubbles: false,
        cancelable: false
      }
    },
    seeking: {
      EventType: 'Event',
      defaultInit: {
        bubbles: false,
        cancelable: false
      }
    },
    stalled: {
      EventType: 'Event',
      defaultInit: {
        bubbles: false,
        cancelable: false
      }
    },
    suspend: {
      EventType: 'Event',
      defaultInit: {
        bubbles: false,
        cancelable: false
      }
    },
    timeUpdate: {
      EventType: 'Event',
      defaultInit: {
        bubbles: false,
        cancelable: false
      }
    },
    volumeChange: {
      EventType: 'Event',
      defaultInit: {
        bubbles: false,
        cancelable: false
      }
    },
    waiting: {
      EventType: 'Event',
      defaultInit: {
        bubbles: false,
        cancelable: false
      }
    },
    // Image Events
    load: {
      EventType: 'UIEvent',
      defaultInit: {
        bubbles: false,
        cancelable: false
      }
    },
    error: {
      EventType: 'Event',
      defaultInit: {
        bubbles: false,
        cancelable: false
      }
    },
    // Animation Events
    animationStart: {
      EventType: 'AnimationEvent',
      defaultInit: {
        bubbles: true,
        cancelable: false
      }
    },
    animationEnd: {
      EventType: 'AnimationEvent',
      defaultInit: {
        bubbles: true,
        cancelable: false
      }
    },
    animationIteration: {
      EventType: 'AnimationEvent',
      defaultInit: {
        bubbles: true,
        cancelable: false
      }
    },
    // Transition Events
    transitionCancel: {
      EventType: 'TransitionEvent',
      defaultInit: {
        bubbles: true,
        cancelable: false
      }
    },
    transitionEnd: {
      EventType: 'TransitionEvent',
      defaultInit: {
        bubbles: true,
        cancelable: true
      }
    },
    transitionRun: {
      EventType: 'TransitionEvent',
      defaultInit: {
        bubbles: true,
        cancelable: false
      }
    },
    transitionStart: {
      EventType: 'TransitionEvent',
      defaultInit: {
        bubbles: true,
        cancelable: false
      }
    },
    // pointer events
    pointerOver: {
      EventType: 'PointerEvent',
      defaultInit: {
        bubbles: true,
        cancelable: true,
        composed: true
      }
    },
    pointerEnter: {
      EventType: 'PointerEvent',
      defaultInit: {
        bubbles: false,
        cancelable: false
      }
    },
    pointerDown: {
      EventType: 'PointerEvent',
      defaultInit: {
        bubbles: true,
        cancelable: true,
        composed: true
      }
    },
    pointerMove: {
      EventType: 'PointerEvent',
      defaultInit: {
        bubbles: true,
        cancelable: true,
        composed: true
      }
    },
    pointerUp: {
      EventType: 'PointerEvent',
      defaultInit: {
        bubbles: true,
        cancelable: true,
        composed: true
      }
    },
    pointerCancel: {
      EventType: 'PointerEvent',
      defaultInit: {
        bubbles: true,
        cancelable: false,
        composed: true
      }
    },
    pointerOut: {
      EventType: 'PointerEvent',
      defaultInit: {
        bubbles: true,
        cancelable: true,
        composed: true
      }
    },
    pointerLeave: {
      EventType: 'PointerEvent',
      defaultInit: {
        bubbles: false,
        cancelable: false
      }
    },
    gotPointerCapture: {
      EventType: 'PointerEvent',
      defaultInit: {
        bubbles: true,
        cancelable: false,
        composed: true
      }
    },
    lostPointerCapture: {
      EventType: 'PointerEvent',
      defaultInit: {
        bubbles: true,
        cancelable: false,
        composed: true
      }
    },
    // history events
    popState: {
      EventType: 'PopStateEvent',
      defaultInit: {
        bubbles: true,
        cancelable: false
      }
    }
  };
  var eventAliasMap = {
    doubleClick: 'dblClick'
  };
  var _excluded = ["value", "files"],
      _excluded2 = ["bubbles", "cancelable", "detail"];

  function fireEvent$1(element, event) {
    return getConfig().eventWrapper(function () {
      if (!event) {
        throw new Error("Unable to fire an event - please provide an event object.");
      }

      if (!element) {
        throw new Error("Unable to fire a \"" + event.type + "\" event - please provide a DOM element.");
      }

      return element.dispatchEvent(event);
    });
  }

  function createEvent(eventName, node, init, _temp) {
    var _ref = _temp === void 0 ? {} : _temp,
        _ref$EventType = _ref.EventType,
        EventType = _ref$EventType === void 0 ? 'Event' : _ref$EventType,
        _ref$defaultInit = _ref.defaultInit,
        defaultInit = _ref$defaultInit === void 0 ? {} : _ref$defaultInit;

    if (!node) {
      throw new Error("Unable to fire a \"" + eventName + "\" event - please provide a DOM element.");
    }

    var eventInit = _extends({}, defaultInit, init);

    var _eventInit$target = eventInit.target;
    _eventInit$target = _eventInit$target === void 0 ? {} : _eventInit$target;

    var value = _eventInit$target.value,
        files = _eventInit$target.files,
        targetProperties = _objectWithoutPropertiesLoose(_eventInit$target, _excluded);

    if (value !== undefined) {
      setNativeValue(node, value);
    }

    if (files !== undefined) {
      // input.files is a read-only property so this is not allowed:
      // input.files = [file]
      // so we have to use this workaround to set the property
      Object.defineProperty(node, 'files', {
        configurable: true,
        enumerable: true,
        writable: true,
        value: files
      });
    }

    Object.assign(node, targetProperties);
    var window = getWindowFromNode(node);
    var EventConstructor = window[EventType] || window.Event;
    var event;
    /* istanbul ignore else  */

    if (typeof EventConstructor === 'function') {
      event = new EventConstructor(eventName, eventInit);
    } else {
      // IE11 polyfill from https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent/CustomEvent#Polyfill
      event = window.document.createEvent(EventType);

      var bubbles = eventInit.bubbles,
          cancelable = eventInit.cancelable,
          detail = eventInit.detail,
          otherInit = _objectWithoutPropertiesLoose(eventInit, _excluded2);

      event.initEvent(eventName, bubbles, cancelable, detail);
      Object.keys(otherInit).forEach(function (eventKey) {
        event[eventKey] = otherInit[eventKey];
      });
    } // DataTransfer is not supported in jsdom: https://github.com/jsdom/jsdom/issues/1568


    var dataTransferProperties = ['dataTransfer', 'clipboardData'];
    dataTransferProperties.forEach(function (dataTransferKey) {
      var dataTransferValue = eventInit[dataTransferKey];

      if (typeof dataTransferValue === 'object') {
        /* istanbul ignore if  */
        if (typeof window.DataTransfer === 'function') {
          Object.defineProperty(event, dataTransferKey, {
            value: Object.getOwnPropertyNames(dataTransferValue).reduce(function (acc, propName) {
              Object.defineProperty(acc, propName, {
                value: dataTransferValue[propName]
              });
              return acc;
            }, new window.DataTransfer())
          });
        } else {
          Object.defineProperty(event, dataTransferKey, {
            value: dataTransferValue
          });
        }
      }
    });
    return event;
  }

  Object.keys(eventMap).forEach(function (key) {
    var _eventMap$key = eventMap[key],
        EventType = _eventMap$key.EventType,
        defaultInit = _eventMap$key.defaultInit;
    var eventName = key.toLowerCase();

    createEvent[key] = function (node, init) {
      return createEvent(eventName, node, init, {
        EventType: EventType,
        defaultInit: defaultInit
      });
    };

    fireEvent$1[key] = function (node, init) {
      return fireEvent$1(node, createEvent[key](node, init));
    };
  }); // function written after some investigation here:
  // https://github.com/facebook/react/issues/10135#issuecomment-401496776

  function setNativeValue(element, value) {
    var _ref2 = Object.getOwnPropertyDescriptor(element, 'value') || {},
        valueSetter = _ref2.set;

    var prototype = Object.getPrototypeOf(element);

    var _ref3 = Object.getOwnPropertyDescriptor(prototype, 'value') || {},
        prototypeValueSetter = _ref3.set;

    if (prototypeValueSetter && valueSetter !== prototypeValueSetter) {
      prototypeValueSetter.call(element, value);
    } else {
      /* istanbul ignore if */
      // eslint-disable-next-line no-lonely-if -- Can't be ignored by istanbul otherwise
      if (valueSetter) {
        valueSetter.call(element, value);
      } else {
        throw new Error('The given element does not have a value setter');
      }
    }
  }

  Object.keys(eventAliasMap).forEach(function (aliasKey) {
    var key = eventAliasMap[aliasKey];

    fireEvent$1[aliasKey] = function () {
      return fireEvent$1[key].apply(fireEvent$1, arguments);
    };
  });
  /* eslint complexity:["error", 9] */

  function unindent(string) {
    // remove white spaces first, to save a few bytes.
    // testing-playground will reformat on load any ways.
    return string.replace(/[ \t]*[\n][ \t]*/g, '\n');
  }

  function encode(value) {
    return lzString.exports.compressToEncodedURIComponent(unindent(value));
  }

  function getPlaygroundUrl(markup) {
    return "https://testing-playground.com/#markup=" + encode(markup);
  }

  var debug = function debug(element, maxLength, options) {
    return Array.isArray(element) ? element.forEach(function (el) {
      return logDOM(el, maxLength, options);
    }) : logDOM(element, maxLength, options);
  };

  var logTestingPlaygroundURL = function logTestingPlaygroundURL(element) {
    if (element === void 0) {
      element = getDocument().body;
    } // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition


    if (!element || !('innerHTML' in element)) {
      console.log("The element you're providing isn't a valid DOM element.");
      return;
    } // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition


    if (!element.innerHTML) {
      console.log("The provided element doesn't have any children.");
      return;
    }

    console.log("Open this URL in your browser\n\n" + getPlaygroundUrl(element.innerHTML));
  };

  var initialValue = {
    debug: debug,
    logTestingPlaygroundURL: logTestingPlaygroundURL
  };
  var screen = typeof document !== 'undefined' && document.body // eslint-disable-line @typescript-eslint/no-unnecessary-condition
  ? getQueriesForElement(document.body, queries, initialValue) : Object.keys(queries).reduce(function (helpers, key) {
    // `key` is for all intents and purposes the type of keyof `helpers`, which itself is the type of `initialValue` plus incoming properties from `queries`
    // if `Object.keys(something)` returned Array<keyof typeof something> this explicit type assertion would not be necessary
    // see https://stackoverflow.com/questions/55012174/why-doesnt-object-keys-return-a-keyof-type-in-typescript
    helpers[key] = function () {
      throw new TypeError('For queries bound to document.body a global document has to be available... Learn more: https://testing-library.com/s/screen-global-error');
    };

    return helpers;
  }, initialValue);

  // dom-testing-library's version of fireEvent. The reason
  // we make this distinction however is because we have
  // a few extra events that work a bit differently

  var fireEvent = function fireEvent() {
    return fireEvent$1.apply(void 0, arguments);
  };

  Object.keys(fireEvent$1).forEach(function (key) {
    fireEvent[key] = function () {
      return fireEvent$1[key].apply(fireEvent$1, arguments);
    };
  }); // React event system tracks native mouseOver/mouseOut events for
  // running onMouseEnter/onMouseLeave handlers
  // @link https://github.com/facebook/react/blob/b87aabdfe1b7461e7331abb3601d9e6bb27544bc/packages/react-dom/src/events/EnterLeaveEventPlugin.js#L24-L31

  var mouseEnter = fireEvent.mouseEnter;
  var mouseLeave = fireEvent.mouseLeave;

  fireEvent.mouseEnter = function () {
    mouseEnter.apply(void 0, arguments);
    return fireEvent.mouseOver.apply(fireEvent, arguments);
  };

  fireEvent.mouseLeave = function () {
    mouseLeave.apply(void 0, arguments);
    return fireEvent.mouseOut.apply(fireEvent, arguments);
  };

  var pointerEnter = fireEvent.pointerEnter;
  var pointerLeave = fireEvent.pointerLeave;

  fireEvent.pointerEnter = function () {
    pointerEnter.apply(void 0, arguments);
    return fireEvent.pointerOver.apply(fireEvent, arguments);
  };

  fireEvent.pointerLeave = function () {
    pointerLeave.apply(void 0, arguments);
    return fireEvent.pointerOut.apply(fireEvent, arguments);
  };

  var select = fireEvent.select;

  fireEvent.select = function (node, init) {
    select(node, init); // React tracks this event only on focused inputs

    node.focus(); // React creates this event when one of the following native events happens
    // - contextMenu
    // - mouseUp
    // - dragEnd
    // - keyUp
    // - keyDown
    // so we can use any here
    // @link https://github.com/facebook/react/blob/b87aabdfe1b7461e7331abb3601d9e6bb27544bc/packages/react-dom/src/events/SelectEventPlugin.js#L203-L224

    fireEvent.keyUp(node, init);
  }; // React event system tracks native focusout/focusin events for
  // running blur/focus handlers
  // @link https://github.com/facebook/react/pull/19186


  var blur = fireEvent.blur;
  var focus = fireEvent.focus;

  fireEvent.blur = function () {
    fireEvent.focusOut.apply(fireEvent, arguments);
    return blur.apply(void 0, arguments);
  };

  fireEvent.focus = function () {
    fireEvent.focusIn.apply(fireEvent, arguments);
    return focus.apply(void 0, arguments);
  };

  configure({
    unstable_advanceTimersWrapper: function unstable_advanceTimersWrapper(cb) {
      return act(cb);
    },
    // We just want to run `waitFor` without IS_REACT_ACT_ENVIRONMENT
    // But that's not necessarily how `asyncWrapper` is used since it's a public method.
    // Let's just hope nobody else is using it.
    asyncWrapper: function () {
      var _asyncWrapper = _asyncToGenerator( /*#__PURE__*/regenerator.mark(function _callee(cb) {
        var previousActEnvironment;
        return regenerator.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                previousActEnvironment = getIsReactActEnvironment();
                setIsReactActEnvironment(false);
                _context.prev = 2;
                _context.next = 5;
                return cb();

              case 5:
                return _context.abrupt("return", _context.sent);

              case 6:
                _context.prev = 6;
                setIsReactActEnvironment(previousActEnvironment);
                return _context.finish(6);

              case 9:
              case "end":
                return _context.stop();
            }
          }
        }, _callee, null, [[2,, 6, 9]]);
      }));

      function asyncWrapper(_x) {
        return _asyncWrapper.apply(this, arguments);
      }

      return asyncWrapper;
    }(),
    eventWrapper: function eventWrapper(cb) {
      var result;
      act(function () {
        result = cb();
      });
      return result;
    }
  }); // Ideally we'd just use a WeakMap where containers are keys and roots are values.
  // We use two variables so that we can bail out in constant time when we render with a new container (most common use case)

  /**
   * @type {Set<import('react-dom').Container>}
   */

  var mountedContainers = new Set();
  /**
   * @type Array<{container: import('react-dom').Container, root: ReturnType<typeof createConcurrentRoot>}>
   */

  var mountedRootEntries = [];

  function createConcurrentRoot(container, _ref) {
    var _hydrate = _ref.hydrate,
        ui = _ref.ui,
        WrapperComponent = _ref.wrapper;
    var root;

    if (_hydrate) {
      act(function () {
        root = ReactDOMClient__namespace.hydrateRoot(container, WrapperComponent ? /*#__PURE__*/React__namespace.createElement(WrapperComponent, null, ui) : ui);
      });
    } else {
      root = ReactDOMClient__namespace.createRoot(container);
    }

    return {
      hydrate: function hydrate() {
        /* istanbul ignore if */
        if (!_hydrate) {
          throw new Error('Attempted to hydrate a non-hydrateable root. This is a bug in `@testing-library/react`.');
        } // Nothing to do since hydration happens when creating the root object.

      },
      render: function render(element) {
        root.render(element);
      },
      unmount: function unmount() {
        root.unmount();
      }
    };
  }

  function createLegacyRoot(container) {
    return {
      hydrate: function hydrate(element) {
        ReactDOM__default["default"].hydrate(element, container);
      },
      render: function render(element) {
        ReactDOM__default["default"].render(element, container);
      },
      unmount: function unmount() {
        ReactDOM__default["default"].unmountComponentAtNode(container);
      }
    };
  }

  function renderRoot(ui, _ref2) {
    var baseElement = _ref2.baseElement,
        container = _ref2.container,
        hydrate = _ref2.hydrate,
        queries = _ref2.queries,
        root = _ref2.root,
        WrapperComponent = _ref2.wrapper;

    var wrapUiIfNeeded = function wrapUiIfNeeded(innerElement) {
      return WrapperComponent ? /*#__PURE__*/React__namespace.createElement(WrapperComponent, null, innerElement) : innerElement;
    };

    act(function () {
      if (hydrate) {
        root.hydrate(wrapUiIfNeeded(ui), container);
      } else {
        root.render(wrapUiIfNeeded(ui), container);
      }
    });
    return _extends({
      container: container,
      baseElement: baseElement,
      debug: function debug(el, maxLength, options) {
        if (el === void 0) {
          el = baseElement;
        }

        return Array.isArray(el) ? // eslint-disable-next-line no-console
        el.forEach(function (e) {
          return console.log(prettyDOM(e, maxLength, options));
        }) : // eslint-disable-next-line no-console,
        console.log(prettyDOM(el, maxLength, options));
      },
      unmount: function unmount() {
        act(function () {
          root.unmount();
        });
      },
      rerender: function rerender(rerenderUi) {
        renderRoot(wrapUiIfNeeded(rerenderUi), {
          container: container,
          baseElement: baseElement,
          root: root
        }); // Intentionally do not return anything to avoid unnecessarily complicating the API.
        // folks can use all the same utilities we return in the first place that are bound to the container
      },
      asFragment: function asFragment() {
        /* istanbul ignore else (old jsdom limitation) */
        if (typeof document.createRange === 'function') {
          return document.createRange().createContextualFragment(container.innerHTML);
        } else {
          var template = document.createElement('template');
          template.innerHTML = container.innerHTML;
          return template.content;
        }
      }
    }, getQueriesForElement(baseElement, queries));
  }

  function render(ui, _temp) {
    var _ref3 = _temp === void 0 ? {} : _temp,
        container = _ref3.container,
        _ref3$baseElement = _ref3.baseElement,
        baseElement = _ref3$baseElement === void 0 ? container : _ref3$baseElement,
        _ref3$legacyRoot = _ref3.legacyRoot,
        legacyRoot = _ref3$legacyRoot === void 0 ? false : _ref3$legacyRoot,
        queries = _ref3.queries,
        _ref3$hydrate = _ref3.hydrate,
        hydrate = _ref3$hydrate === void 0 ? false : _ref3$hydrate,
        wrapper = _ref3.wrapper;

    if (!baseElement) {
      // default to document.body instead of documentElement to avoid output of potentially-large
      // head elements (such as JSS style blocks) in debug output
      baseElement = document.body;
    }

    if (!container) {
      container = baseElement.appendChild(document.createElement('div'));
    }

    var root; // eslint-disable-next-line no-negated-condition -- we want to map the evolution of this over time. The root is created first. Only later is it re-used so we don't want to read the case that happens later first.

    if (!mountedContainers.has(container)) {
      var createRootImpl = legacyRoot ? createLegacyRoot : createConcurrentRoot;
      root = createRootImpl(container, {
        hydrate: hydrate,
        ui: ui,
        wrapper: wrapper
      });
      mountedRootEntries.push({
        container: container,
        root: root
      }); // we'll add it to the mounted containers regardless of whether it's actually
      // added to document.body so the cleanup method works regardless of whether
      // they're passing us a custom container or not.

      mountedContainers.add(container);
    } else {
      mountedRootEntries.forEach(function (rootEntry) {
        // Else is unreachable since `mountedContainers` has the `container`.
        // Only reachable if one would accidentally add the container to `mountedContainers` but not the root to `mountedRootEntries`

        /* istanbul ignore else */
        if (rootEntry.container === container) {
          root = rootEntry.root;
        }
      });
    }

    return renderRoot(ui, {
      container: container,
      baseElement: baseElement,
      queries: queries,
      hydrate: hydrate,
      wrapper: wrapper,
      root: root
    });
  }

  function cleanup() {
    mountedRootEntries.forEach(function (_ref4) {
      var root = _ref4.root,
          container = _ref4.container;
      act(function () {
        root.unmount();
      });

      if (container.parentNode === document.body) {
        document.body.removeChild(container);
      }
    });
    mountedRootEntries.length = 0;
    mountedContainers.clear();
  } // just re-export everything from dom-testing-library
  /* eslint func-name-matching:0 */

  var _process$env;
  // or teardown then we'll automatically run cleanup afterEach test
  // this ensures that tests run in isolation from each other
  // if you don't like this then either import the `pure` module
  // or set the RTL_SKIP_AUTO_CLEANUP env variable to 'true'.

  if (typeof process === 'undefined' || !((_process$env = process.env) != null && _process$env.RTL_SKIP_AUTO_CLEANUP)) {
    // ignore teardown() in code coverage because Jest does not support it

    /* istanbul ignore else */
    if (typeof afterEach === 'function') {
      afterEach(function () {
        cleanup();
      });
    } else if (typeof teardown === 'function') {
      // Block is guarded by `typeof` check.
      // eslint does not support `typeof` guards.
      // eslint-disable-next-line no-undef
      teardown(function () {
        cleanup();
      });
    } // No test setup with other test runners available

    /* istanbul ignore else */


    if (typeof beforeAll === 'function' && typeof afterAll === 'function') {
      // This matches the behavior of React < 18.
      var previousIsReactActEnvironment = getIsReactActEnvironment();
      beforeAll(function () {
        previousIsReactActEnvironment = getIsReactActEnvironment();
        setIsReactActEnvironment(true);
      });
      afterAll(function () {
        setIsReactActEnvironment(previousIsReactActEnvironment);
      });
    }
  }

  exports.act = act;
  exports.buildQueries = buildQueries;
  exports.cleanup = cleanup;
  exports.configure = configure;
  exports.createEvent = createEvent;
  exports.findAllByAltText = findAllByAltText;
  exports.findAllByDisplayValue = findAllByDisplayValue;
  exports.findAllByLabelText = findAllByLabelText;
  exports.findAllByPlaceholderText = findAllByPlaceholderText;
  exports.findAllByRole = findAllByRole;
  exports.findAllByTestId = findAllByTestId;
  exports.findAllByText = findAllByText;
  exports.findAllByTitle = findAllByTitle;
  exports.findByAltText = findByAltText;
  exports.findByDisplayValue = findByDisplayValue;
  exports.findByLabelText = findByLabelText;
  exports.findByPlaceholderText = findByPlaceholderText;
  exports.findByRole = findByRole;
  exports.findByTestId = findByTestId;
  exports.findByText = findByText;
  exports.findByTitle = findByTitle;
  exports.fireEvent = fireEvent;
  exports.getAllByAltText = getAllByAltText;
  exports.getAllByDisplayValue = getAllByDisplayValue;
  exports.getAllByLabelText = getAllByLabelTextWithSuggestions;
  exports.getAllByPlaceholderText = getAllByPlaceholderText;
  exports.getAllByRole = getAllByRole;
  exports.getAllByTestId = getAllByTestId;
  exports.getAllByText = getAllByText;
  exports.getAllByTitle = getAllByTitle;
  exports.getByAltText = getByAltText;
  exports.getByDisplayValue = getByDisplayValue;
  exports.getByLabelText = getByLabelTextWithSuggestions;
  exports.getByPlaceholderText = getByPlaceholderText;
  exports.getByRole = getByRole;
  exports.getByTestId = getByTestId;
  exports.getByText = getByText;
  exports.getByTitle = getByTitle;
  exports.getConfig = getConfig;
  exports.getDefaultNormalizer = getDefaultNormalizer;
  exports.getElementError = getElementError;
  exports.getMultipleElementsFoundError = getMultipleElementsFoundError;
  exports.getNodeText = getNodeText;
  exports.getQueriesForElement = getQueriesForElement;
  exports.getRoles = getRoles;
  exports.getSuggestedQuery = getSuggestedQuery;
  exports.isInaccessible = isInaccessible;
  exports.logDOM = logDOM;
  exports.logRoles = logRoles;
  exports.makeFindQuery = makeFindQuery;
  exports.makeGetAllQuery = makeGetAllQuery;
  exports.makeSingleQuery = makeSingleQuery;
  exports.prettyDOM = prettyDOM;
  exports.prettyFormat = index;
  exports.queries = queries;
  exports.queryAllByAltText = queryAllByAltTextWithSuggestions;
  exports.queryAllByAttribute = queryAllByAttribute;
  exports.queryAllByDisplayValue = queryAllByDisplayValueWithSuggestions;
  exports.queryAllByLabelText = queryAllByLabelTextWithSuggestions;
  exports.queryAllByPlaceholderText = queryAllByPlaceholderTextWithSuggestions;
  exports.queryAllByRole = queryAllByRoleWithSuggestions;
  exports.queryAllByTestId = queryAllByTestIdWithSuggestions;
  exports.queryAllByText = queryAllByTextWithSuggestions;
  exports.queryAllByTitle = queryAllByTitleWithSuggestions;
  exports.queryByAltText = queryByAltText;
  exports.queryByAttribute = queryByAttribute;
  exports.queryByDisplayValue = queryByDisplayValue;
  exports.queryByLabelText = queryByLabelText;
  exports.queryByPlaceholderText = queryByPlaceholderText;
  exports.queryByRole = queryByRole;
  exports.queryByTestId = queryByTestId;
  exports.queryByText = queryByText;
  exports.queryByTitle = queryByTitle;
  exports.queryHelpers = queryHelpers;
  exports.render = render;
  exports.screen = screen;
  exports.waitFor = waitForWrapper;
  exports.waitForElementToBeRemoved = waitForElementToBeRemoved;
  exports.within = getQueriesForElement;
  exports.wrapAllByQueryWithSuggestion = wrapAllByQueryWithSuggestion;
  exports.wrapSingleQueryWithSuggestion = wrapSingleQueryWithSuggestion;

  Object.defineProperty(exports, '__esModule', { value: true });

}));
//# sourceMappingURL=react.umd.js.map

/*!
 * jQuery JavaScript Library v3.6.0
 * https://jquery.com/
 *
 * Includes Sizzle.js
 * https://sizzlejs.com/
 *
 * Copyright OpenJS Foundation and other contributors
 * Released under the MIT license
 * https://jquery.org/license
 *
 * Date: 2021-03-02T17:08Z
 */
( function( global, factory ) {

	"use strict";

	if ( typeof module === "object" && typeof module.exports === "object" ) {

		// For CommonJS and CommonJS-like environments where a proper `window`
		// is present, execute the factory and get jQuery.
		// For environments that do not have a `window` with a `document`
		// (such as Node.js), expose a factory as module.exports.
		// This accentuates the need for the creation of a real `window`.
		// e.g. var jQuery = require("jquery")(window);
		// See ticket #14549 for more info.
		module.exports = global.document ?
			factory( global, true ) :
			function( w ) {
				if ( !w.document ) {
					throw new Error( "jQuery requires a window with a document" );
				}
				return factory( w );
			};
	} else {
		factory( global );
	}

// Pass this if window is not defined yet
} )( typeof window !== "undefined" ? window : this, function( window, noGlobal ) {

// Edge <= 12 - 13+, Firefox <=18 - 45+, IE 10 - 11, Safari 5.1 - 9+, iOS 6 - 9.1
// throw exceptions when non-strict code (e.g., ASP.NET 4.5) accesses strict mode
// arguments.callee.caller (trac-13335). But as of jQuery 3.0 (2016), strict mode should be common
// enough that all such attempts are guarded in a try block.
"use strict";

var arr = [];

var getProto = Object.getPrototypeOf;

var slice = arr.slice;

var flat = arr.flat ? function( array ) {
	return arr.flat.call( array );
} : function( array ) {
	return arr.concat.apply( [], array );
};


var push = arr.push;

var indexOf = arr.indexOf;

var class2type = {};

var toString = class2type.toString;

var hasOwn = class2type.hasOwnProperty;

var fnToString = hasOwn.toString;

var ObjectFunctionString = fnToString.call( Object );

var support = {};

var isFunction = function isFunction( obj ) {

		// Support: Chrome <=57, Firefox <=52
		// In some browsers, typeof returns "function" for HTML <object> elements
		// (i.e., `typeof document.createElement( "object" ) === "function"`).
		// We don't want to classify *any* DOM node as a function.
		// Support: QtWeb <=3.8.5, WebKit <=534.34, wkhtmltopdf tool <=0.12.5
		// Plus for old WebKit, typeof returns "function" for HTML collections
		// (e.g., `typeof document.getElementsByTagName("div") === "function"`). (gh-4756)
		return typeof obj === "function" && typeof obj.nodeType !== "number" &&
			typeof obj.item !== "function";
	};


var isWindow = function isWindow( obj ) {
		return obj != null && obj === obj.window;
	};


var document = window.document;



	var preservedScriptAttributes = {
		type: true,
		src: true,
		nonce: true,
		noModule: true
	};

	function DOMEval( code, node, doc ) {
		doc = doc || document;

		var i, val,
			script = doc.createElement( "script" );

		script.text = code;
		if ( node ) {
			for ( i in preservedScriptAttributes ) {

				// Support: Firefox 64+, Edge 18+
				// Some browsers don't support the "nonce" property on scripts.
				// On the other hand, just using `getAttribute` is not enough as
				// the `nonce` attribute is reset to an empty string whenever it
				// becomes browsing-context connected.
				// See https://github.com/whatwg/html/issues/2369
				// See https://html.spec.whatwg.org/#nonce-attributes
				// The `node.getAttribute` check was added for the sake of
				// `jQuery.globalEval` so that it can fake a nonce-containing node
				// via an object.
				val = node[ i ] || node.getAttribute && node.getAttribute( i );
				if ( val ) {
					script.setAttribute( i, val );
				}
			}
		}
		doc.head.appendChild( script ).parentNode.removeChild( script );
	}


function toType( obj ) {
	if ( obj == null ) {
		return obj + "";
	}

	// Support: Android <=2.3 only (functionish RegExp)
	return typeof obj === "object" || typeof obj === "function" ?
		class2type[ toString.call( obj ) ] || "object" :
		typeof obj;
}
/* global Symbol */
// Defining this global in .eslintrc.json would create a danger of using the global
// unguarded in another place, it seems safer to define global only for this module



var
	version = "3.6.0",

	// Define a local copy of jQuery
	jQuery = function( selector, context ) {

		// The jQuery object is actually just the init constructor 'enhanced'
		// Need init if jQuery is called (just allow error to be thrown if not included)
		return new jQuery.fn.init( selector, context );
	};

jQuery.fn = jQuery.prototype = {

	// The current version of jQuery being used
	jquery: version,

	constructor: jQuery,

	// The default length of a jQuery object is 0
	length: 0,

	toArray: function() {
		return slice.call( this );
	},

	// Get the Nth element in the matched element set OR
	// Get the whole matched element set as a clean array
	get: function( num ) {

		// Return all the elements in a clean array
		if ( num == null ) {
			return slice.call( this );
		}

		// Return just the one element from the set
		return num < 0 ? this[ num + this.length ] : this[ num ];
	},

	// Take an array of elements and push it onto the stack
	// (returning the new matched element set)
	pushStack: function( elems ) {

		// Build a new jQuery matched element set
		var ret = jQuery.merge( this.constructor(), elems );

		// Add the old object onto the stack (as a reference)
		ret.prevObject = this;

		// Return the newly-formed element set
		return ret;
	},

	// Execute a callback for every element in the matched set.
	each: function( callback ) {
		return jQuery.each( this, callback );
	},

	map: function( callback ) {
		return this.pushStack( jQuery.map( this, function( elem, i ) {
			return callback.call( elem, i, elem );
		} ) );
	},

	slice: function() {
		return this.pushStack( slice.apply( this, arguments ) );
	},

	first: function() {
		return this.eq( 0 );
	},

	last: function() {
		return this.eq( -1 );
	},

	even: function() {
		return this.pushStack( jQuery.grep( this, function( _elem, i ) {
			return ( i + 1 ) % 2;
		} ) );
	},

	odd: function() {
		return this.pushStack( jQuery.grep( this, function( _elem, i ) {
			return i % 2;
		} ) );
	},

	eq: function( i ) {
		var len = this.length,
			j = +i + ( i < 0 ? len : 0 );
		return this.pushStack( j >= 0 && j < len ? [ this[ j ] ] : [] );
	},

	end: function() {
		return this.prevObject || this.constructor();
	},

	// For internal use only.
	// Behaves like an Array's method, not like a jQuery method.
	push: push,
	sort: arr.sort,
	splice: arr.splice
};

jQuery.extend = jQuery.fn.extend = function() {
	var options, name, src, copy, copyIsArray, clone,
		target = arguments[ 0 ] || {},
		i = 1,
		length = arguments.length,
		deep = false;

	// Handle a deep copy situation
	if ( typeof target === "boolean" ) {
		deep = target;

		// Skip the boolean and the target
		target = arguments[ i ] || {};
		i++;
	}

	// Handle case when target is a string or something (possible in deep copy)
	if ( typeof target !== "object" && !isFunction( target ) ) {
		target = {};
	}

	// Extend jQuery itself if only one argument is passed
	if ( i === length ) {
		target = this;
		i--;
	}

	for ( ; i < length; i++ ) {

		// Only deal with non-null/undefined values
		if ( ( options = arguments[ i ] ) != null ) {

			// Extend the base object
			for ( name in options ) {
				copy = options[ name ];

				// Prevent Object.prototype pollution
				// Prevent never-ending loop
				if ( name === "__proto__" || target === copy ) {
					continue;
				}

				// Recurse if we're merging plain objects or arrays
				if ( deep && copy && ( jQuery.isPlainObject( copy ) ||
					( copyIsArray = Array.isArray( copy ) ) ) ) {
					src = target[ name ];

					// Ensure proper type for the source value
					if ( copyIsArray && !Array.isArray( src ) ) {
						clone = [];
					} else if ( !copyIsArray && !jQuery.isPlainObject( src ) ) {
						clone = {};
					} else {
						clone = src;
					}
					copyIsArray = false;

					// Never move original objects, clone them
					target[ name ] = jQuery.extend( deep, clone, copy );

				// Don't bring in undefined values
				} else if ( copy !== undefined ) {
					target[ name ] = copy;
				}
			}
		}
	}

	// Return the modified object
	return target;
};

jQuery.extend( {

	// Unique for each copy of jQuery on the page
	expando: "jQuery" + ( version + Math.random() ).replace( /\D/g, "" ),

	// Assume jQuery is ready without the ready module
	isReady: true,

	error: function( msg ) {
		throw new Error( msg );
	},

	noop: function() {},

	isPlainObject: function( obj ) {
		var proto, Ctor;

		// Detect obvious negatives
		// Use toString instead of jQuery.type to catch host objects
		if ( !obj || toString.call( obj ) !== "[object Object]" ) {
			return false;
		}

		proto = getProto( obj );

		// Objects with no prototype (e.g., `Object.create( null )`) are plain
		if ( !proto ) {
			return true;
		}

		// Objects with prototype are plain iff they were constructed by a global Object function
		Ctor = hasOwn.call( proto, "constructor" ) && proto.constructor;
		return typeof Ctor === "function" && fnToString.call( Ctor ) === ObjectFunctionString;
	},

	isEmptyObject: function( obj ) {
		var name;

		for ( name in obj ) {
			return false;
		}
		return true;
	},

	// Evaluates a script in a provided context; falls back to the global one
	// if not specified.
	globalEval: function( code, options, doc ) {
		DOMEval( code, { nonce: options && options.nonce }, doc );
	},

	each: function( obj, callback ) {
		var length, i = 0;

		if ( isArrayLike( obj ) ) {
			length = obj.length;
			for ( ; i < length; i++ ) {
				if ( callback.call( obj[ i ], i, obj[ i ] ) === false ) {
					break;
				}
			}
		} else {
			for ( i in obj ) {
				if ( callback.call( obj[ i ], i, obj[ i ] ) === false ) {
					break;
				}
			}
		}

		return obj;
	},

	// results is for internal usage only
	makeArray: function( arr, results ) {
		var ret = results || [];

		if ( arr != null ) {
			if ( isArrayLike( Object( arr ) ) ) {
				jQuery.merge( ret,
					typeof arr === "string" ?
						[ arr ] : arr
				);
			} else {
				push.call( ret, arr );
			}
		}

		return ret;
	},

	inArray: function( elem, arr, i ) {
		return arr == null ? -1 : indexOf.call( arr, elem, i );
	},

	// Support: Android <=4.0 only, PhantomJS 1 only
	// push.apply(_, arraylike) throws on ancient WebKit
	merge: function( first, second ) {
		var len = +second.length,
			j = 0,
			i = first.length;

		for ( ; j < len; j++ ) {
			first[ i++ ] = second[ j ];
		}

		first.length = i;

		return first;
	},

	grep: function( elems, callback, invert ) {
		var callbackInverse,
			matches = [],
			i = 0,
			length = elems.length,
			callbackExpect = !invert;

		// Go through the array, only saving the items
		// that pass the validator function
		for ( ; i < length; i++ ) {
			callbackInverse = !callback( elems[ i ], i );
			if ( callbackInverse !== callbackExpect ) {
				matches.push( elems[ i ] );
			}
		}

		return matches;
	},

	// arg is for internal usage only
	map: function( elems, callback, arg ) {
		var length, value,
			i = 0,
			ret = [];

		// Go through the array, translating each of the items to their new values
		if ( isArrayLike( elems ) ) {
			length = elems.length;
			for ( ; i < length; i++ ) {
				value = callback( elems[ i ], i, arg );

				if ( value != null ) {
					ret.push( value );
				}
			}

		// Go through every key on the object,
		} else {
			for ( i in elems ) {
				value = callback( elems[ i ], i, arg );

				if ( value != null ) {
					ret.push( value );
				}
			}
		}

		// Flatten any nested arrays
		return flat( ret );
	},

	// A global GUID counter for objects
	guid: 1,

	// jQuery.support is not used in Core but other projects attach their
	// properties to it so it needs to exist.
	support: support
} );

if ( typeof Symbol === "function" ) {
	jQuery.fn[ Symbol.iterator ] = arr[ Symbol.iterator ];
}

// Populate the class2type map
jQuery.each( "Boolean Number String Function Array Date RegExp Object Error Symbol".split( " " ),
	function( _i, name ) {
		class2type[ "[object " + name + "]" ] = name.toLowerCase();
	} );

function isArrayLike( obj ) {

	// Support: real iOS 8.2 only (not reproducible in simulator)
	// `in` check used to prevent JIT error (gh-2145)
	// hasOwn isn't used here due to false negatives
	// regarding Nodelist length in IE
	var length = !!obj && "length" in obj && obj.length,
		type = toType( obj );

	if ( isFunction( obj ) || isWindow( obj ) ) {
		return false;
	}

	return type === "array" || length === 0 ||
		typeof length === "number" && length > 0 && ( length - 1 ) in obj;
}
var Sizzle =
/*!
 * Sizzle CSS Selector Engine v2.3.6
 * https://sizzlejs.com/
 *
 * Copyright JS Foundation and other contributors
 * Released under the MIT license
 * https://js.foundation/
 *
 * Date: 2021-02-16
 */
( function( window ) {
var i,
	support,
	Expr,
	getText,
	isXML,
	tokenize,
	compile,
	select,
	outermostContext,
	sortInput,
	hasDuplicate,

	// Local document vars
	setDocument,
	document,
	docElem,
	documentIsHTML,
	rbuggyQSA,
	rbuggyMatches,
	matches,
	contains,

	// Instance-specific data
	expando = "sizzle" + 1 * new Date(),
	preferredDoc = window.document,
	dirruns = 0,
	done = 0,
	classCache = createCache(),
	tokenCache = createCache(),
	compilerCache = createCache(),
	nonnativeSelectorCache = createCache(),
	sortOrder = function( a, b ) {
		if ( a === b ) {
			hasDuplicate = true;
		}
		return 0;
	},

	// Instance methods
	hasOwn = ( {} ).hasOwnProperty,
	arr = [],
	pop = arr.pop,
	pushNative = arr.push,
	push = arr.push,
	slice = arr.slice,

	// Use a stripped-down indexOf as it's faster than native
	// https://jsperf.com/thor-indexof-vs-for/5
	indexOf = function( list, elem ) {
		var i = 0,
			len = list.length;
		for ( ; i < len; i++ ) {
			if ( list[ i ] === elem ) {
				return i;
			}
		}
		return -1;
	},

	booleans = "checked|selected|async|autofocus|autoplay|controls|defer|disabled|hidden|" +
		"ismap|loop|multiple|open|readonly|required|scoped",

	// Regular expressions

	// http://www.w3.org/TR/css3-selectors/#whitespace
	whitespace = "[\\x20\\t\\r\\n\\f]",

	// https://www.w3.org/TR/css-syntax-3/#ident-token-diagram
	identifier = "(?:\\\\[\\da-fA-F]{1,6}" + whitespace +
		"?|\\\\[^\\r\\n\\f]|[\\w-]|[^\0-\\x7f])+",

	// Attribute selectors: http://www.w3.org/TR/selectors/#attribute-selectors
	attributes = "\\[" + whitespace + "*(" + identifier + ")(?:" + whitespace +

		// Operator (capture 2)
		"*([*^$|!~]?=)" + whitespace +

		// "Attribute values must be CSS identifiers [capture 5]
		// or strings [capture 3 or capture 4]"
		"*(?:'((?:\\\\.|[^\\\\'])*)'|\"((?:\\\\.|[^\\\\\"])*)\"|(" + identifier + "))|)" +
		whitespace + "*\\]",

	pseudos = ":(" + identifier + ")(?:\\((" +

		// To reduce the number of selectors needing tokenize in the preFilter, prefer arguments:
		// 1. quoted (capture 3; capture 4 or capture 5)
		"('((?:\\\\.|[^\\\\'])*)'|\"((?:\\\\.|[^\\\\\"])*)\")|" +

		// 2. simple (capture 6)
		"((?:\\\\.|[^\\\\()[\\]]|" + attributes + ")*)|" +

		// 3. anything else (capture 2)
		".*" +
		")\\)|)",

	// Leading and non-escaped trailing whitespace, capturing some non-whitespace characters preceding the latter
	rwhitespace = new RegExp( whitespace + "+", "g" ),
	rtrim = new RegExp( "^" + whitespace + "+|((?:^|[^\\\\])(?:\\\\.)*)" +
		whitespace + "+$", "g" ),

	rcomma = new RegExp( "^" + whitespace + "*," + whitespace + "*" ),
	rcombinators = new RegExp( "^" + whitespace + "*([>+~]|" + whitespace + ")" + whitespace +
		"*" ),
	rdescend = new RegExp( whitespace + "|>" ),

	rpseudo = new RegExp( pseudos ),
	ridentifier = new RegExp( "^" + identifier + "$" ),

	matchExpr = {
		"ID": new RegExp( "^#(" + identifier + ")" ),
		"CLASS": new RegExp( "^\\.(" + identifier + ")" ),
		"TAG": new RegExp( "^(" + identifier + "|[*])" ),
		"ATTR": new RegExp( "^" + attributes ),
		"PSEUDO": new RegExp( "^" + pseudos ),
		"CHILD": new RegExp( "^:(only|first|last|nth|nth-last)-(child|of-type)(?:\\(" +
			whitespace + "*(even|odd|(([+-]|)(\\d*)n|)" + whitespace + "*(?:([+-]|)" +
			whitespace + "*(\\d+)|))" + whitespace + "*\\)|)", "i" ),
		"bool": new RegExp( "^(?:" + booleans + ")$", "i" ),

		// For use in libraries implementing .is()
		// We use this for POS matching in `select`
		"needsContext": new RegExp( "^" + whitespace +
			"*[>+~]|:(even|odd|eq|gt|lt|nth|first|last)(?:\\(" + whitespace +
			"*((?:-\\d)?\\d*)" + whitespace + "*\\)|)(?=[^-]|$)", "i" )
	},

	rhtml = /HTML$/i,
	rinputs = /^(?:input|select|textarea|button)$/i,
	rheader = /^h\d$/i,

	rnative = /^[^{]+\{\s*\[native \w/,

	// Easily-parseable/retrievable ID or TAG or CLASS selectors
	rquickExpr = /^(?:#([\w-]+)|(\w+)|\.([\w-]+))$/,

	rsibling = /[+~]/,

	// CSS escapes
	// http://www.w3.org/TR/CSS21/syndata.html#escaped-characters
	runescape = new RegExp( "\\\\[\\da-fA-F]{1,6}" + whitespace + "?|\\\\([^\\r\\n\\f])", "g" ),
	funescape = function( escape, nonHex ) {
		var high = "0x" + escape.slice( 1 ) - 0x10000;

		return nonHex ?

			// Strip the backslash prefix from a non-hex escape sequence
			nonHex :

			// Replace a hexadecimal escape sequence with the encoded Unicode code point
			// Support: IE <=11+
			// For values outside the Basic Multilingual Plane (BMP), manually construct a
			// surrogate pair
			high < 0 ?
				String.fromCharCode( high + 0x10000 ) :
				String.fromCharCode( high >> 10 | 0xD800, high & 0x3FF | 0xDC00 );
	},

	// CSS string/identifier serialization
	// https://drafts.csswg.org/cssom/#common-serializing-idioms
	rcssescape = /([\0-\x1f\x7f]|^-?\d)|^-$|[^\0-\x1f\x7f-\uFFFF\w-]/g,
	fcssescape = function( ch, asCodePoint ) {
		if ( asCodePoint ) {

			// U+0000 NULL becomes U+FFFD REPLACEMENT CHARACTER
			if ( ch === "\0" ) {
				return "\uFFFD";
			}

			// Control characters and (dependent upon position) numbers get escaped as code points
			return ch.slice( 0, -1 ) + "\\" +
				ch.charCodeAt( ch.length - 1 ).toString( 16 ) + " ";
		}

		// Other potentially-special ASCII characters get backslash-escaped
		return "\\" + ch;
	},

	// Used for iframes
	// See setDocument()
	// Removing the function wrapper causes a "Permission Denied"
	// error in IE
	unloadHandler = function() {
		setDocument();
	},

	inDisabledFieldset = addCombinator(
		function( elem ) {
			return elem.disabled === true && elem.nodeName.toLowerCase() === "fieldset";
		},
		{ dir: "parentNode", next: "legend" }
	);

// Optimize for push.apply( _, NodeList )
try {
	push.apply(
		( arr = slice.call( preferredDoc.childNodes ) ),
		preferredDoc.childNodes
	);

	// Support: Android<4.0
	// Detect silently failing push.apply
	// eslint-disable-next-line no-unused-expressions
	arr[ preferredDoc.childNodes.length ].nodeType;
} catch ( e ) {
	push = { apply: arr.length ?

		// Leverage slice if possible
		function( target, els ) {
			pushNative.apply( target, slice.call( els ) );
		} :

		// Support: IE<9
		// Otherwise append directly
		function( target, els ) {
			var j = target.length,
				i = 0;

			// Can't trust NodeList.length
			while ( ( target[ j++ ] = els[ i++ ] ) ) {}
			target.length = j - 1;
		}
	};
}

function Sizzle( selector, context, results, seed ) {
	var m, i, elem, nid, match, groups, newSelector,
		newContext = context && context.ownerDocument,

		// nodeType defaults to 9, since context defaults to document
		nodeType = context ? context.nodeType : 9;

	results = results || [];

	// Return early from calls with invalid selector or context
	if ( typeof selector !== "string" || !selector ||
		nodeType !== 1 && nodeType !== 9 && nodeType !== 11 ) {

		return results;
	}

	// Try to shortcut find operations (as opposed to filters) in HTML documents
	if ( !seed ) {
		setDocument( context );
		context = context || document;

		if ( documentIsHTML ) {

			// If the selector is sufficiently simple, try using a "get*By*" DOM method
			// (excepting DocumentFragment context, where the methods don't exist)
			if ( nodeType !== 11 && ( match = rquickExpr.exec( selector ) ) ) {

				// ID selector
				if ( ( m = match[ 1 ] ) ) {

					// Document context
					if ( nodeType === 9 ) {
						if ( ( elem = context.getElementById( m ) ) ) {

							// Support: IE, Opera, Webkit
							// TODO: identify versions
							// getElementById can match elements by name instead of ID
							if ( elem.id === m ) {
								results.push( elem );
								return results;
							}
						} else {
							return results;
						}

					// Element context
					} else {

						// Support: IE, Opera, Webkit
						// TODO: identify versions
						// getElementById can match elements by name instead of ID
						if ( newContext && ( elem = newContext.getElementById( m ) ) &&
							contains( context, elem ) &&
							elem.id === m ) {

							results.push( elem );
							return results;
						}
					}

				// Type selector
				} else if ( match[ 2 ] ) {
					push.apply( results, context.getElementsByTagName( selector ) );
					return results;

				// Class selector
				} else if ( ( m = match[ 3 ] ) && support.getElementsByClassName &&
					context.getElementsByClassName ) {

					push.apply( results, context.getElementsByClassName( m ) );
					return results;
				}
			}

			// Take advantage of querySelectorAll
			if ( support.qsa &&
				!nonnativeSelectorCache[ selector + " " ] &&
				( !rbuggyQSA || !rbuggyQSA.test( selector ) ) &&

				// Support: IE 8 only
				// Exclude object elements
				( nodeType !== 1 || context.nodeName.toLowerCase() !== "object" ) ) {

				newSelector = selector;
				newContext = context;

				// qSA considers elements outside a scoping root when evaluating child or
				// descendant combinators, which is not what we want.
				// In such cases, we work around the behavior by prefixing every selector in the
				// list with an ID selector referencing the scope context.
				// The technique has to be used as well when a leading combinator is used
				// as such selectors are not recognized by querySelectorAll.
				// Thanks to Andrew Dupont for this technique.
				if ( nodeType === 1 &&
					( rdescend.test( selector ) || rcombinators.test( selector ) ) ) {

					// Expand context for sibling selectors
					newContext = rsibling.test( selector ) && testContext( context.parentNode ) ||
						context;

					// We can use :scope instead of the ID hack if the browser
					// supports it & if we're not changing the context.
					if ( newContext !== context || !support.scope ) {

						// Capture the context ID, setting it first if necessary
						if ( ( nid = context.getAttribute( "id" ) ) ) {
							nid = nid.replace( rcssescape, fcssescape );
						} else {
							context.setAttribute( "id", ( nid = expando ) );
						}
					}

					// Prefix every selector in the list
					groups = tokenize( selector );
					i = groups.length;
					while ( i-- ) {
						groups[ i ] = ( nid ? "#" + nid : ":scope" ) + " " +
							toSelector( groups[ i ] );
					}
					newSelector = groups.join( "," );
				}

				try {
					push.apply( results,
						newContext.querySelectorAll( newSelector )
					);
					return results;
				} catch ( qsaError ) {
					nonnativeSelectorCache( selector, true );
				} finally {
					if ( nid === expando ) {
						context.removeAttribute( "id" );
					}
				}
			}
		}
	}

	// All others
	return select( selector.replace( rtrim, "$1" ), context, results, seed );
}

/**
 * Create key-value caches of limited size
 * @returns {function(string, object)} Returns the Object data after storing it on itself with
 *	property name the (space-suffixed) string and (if the cache is larger than Expr.cacheLength)
 *	deleting the oldest entry
 */
function createCache() {
	var keys = [];

	function cache( key, value ) {

		// Use (key + " ") to avoid collision with native prototype properties (see Issue #157)
		if ( keys.push( key + " " ) > Expr.cacheLength ) {

			// Only keep the most recent entries
			delete cache[ keys.shift() ];
		}
		return ( cache[ key + " " ] = value );
	}
	return cache;
}

/**
 * Mark a function for special use by Sizzle
 * @param {Function} fn The function to mark
 */
function markFunction( fn ) {
	fn[ expando ] = true;
	return fn;
}

/**
 * Support testing using an element
 * @param {Function} fn Passed the created element and returns a boolean result
 */
function assert( fn ) {
	var el = document.createElement( "fieldset" );

	try {
		return !!fn( el );
	} catch ( e ) {
		return false;
	} finally {

		// Remove from its parent by default
		if ( el.parentNode ) {
			el.parentNode.removeChild( el );
		}

		// release memory in IE
		el = null;
	}
}

/**
 * Adds the same handler for all of the specified attrs
 * @param {String} attrs Pipe-separated list of attributes
 * @param {Function} handler The method that will be applied
 */
function addHandle( attrs, handler ) {
	var arr = attrs.split( "|" ),
		i = arr.length;

	while ( i-- ) {
		Expr.attrHandle[ arr[ i ] ] = handler;
	}
}

/**
 * Checks document order of two siblings
 * @param {Element} a
 * @param {Element} b
 * @returns {Number} Returns less than 0 if a precedes b, greater than 0 if a follows b
 */
function siblingCheck( a, b ) {
	var cur = b && a,
		diff = cur && a.nodeType === 1 && b.nodeType === 1 &&
			a.sourceIndex - b.sourceIndex;

	// Use IE sourceIndex if available on both nodes
	if ( diff ) {
		return diff;
	}

	// Check if b follows a
	if ( cur ) {
		while ( ( cur = cur.nextSibling ) ) {
			if ( cur === b ) {
				return -1;
			}
		}
	}

	return a ? 1 : -1;
}

/**
 * Returns a function to use in pseudos for input types
 * @param {String} type
 */
function createInputPseudo( type ) {
	return function( elem ) {
		var name = elem.nodeName.toLowerCase();
		return name === "input" && elem.type === type;
	};
}

/**
 * Returns a function to use in pseudos for buttons
 * @param {String} type
 */
function createButtonPseudo( type ) {
	return function( elem ) {
		var name = elem.nodeName.toLowerCase();
		return ( name === "input" || name === "button" ) && elem.type === type;
	};
}

/**
 * Returns a function to use in pseudos for :enabled/:disabled
 * @param {Boolean} disabled true for :disabled; false for :enabled
 */
function createDisabledPseudo( disabled ) {

	// Known :disabled false positives: fieldset[disabled] > legend:nth-of-type(n+2) :can-disable
	return function( elem ) {

		// Only certain elements can match :enabled or :disabled
		// https://html.spec.whatwg.org/multipage/scripting.html#selector-enabled
		// https://html.spec.whatwg.org/multipage/scripting.html#selector-disabled
		if ( "form" in elem ) {

			// Check for inherited disabledness on relevant non-disabled elements:
			// * listed form-associated elements in a disabled fieldset
			//   https://html.spec.whatwg.org/multipage/forms.html#category-listed
			//   https://html.spec.whatwg.org/multipage/forms.html#concept-fe-disabled
			// * option elements in a disabled optgroup
			//   https://html.spec.whatwg.org/multipage/forms.html#concept-option-disabled
			// All such elements have a "form" property.
			if ( elem.parentNode && elem.disabled === false ) {

				// Option elements defer to a parent optgroup if present
				if ( "label" in elem ) {
					if ( "label" in elem.parentNode ) {
						return elem.parentNode.disabled === disabled;
					} else {
						return elem.disabled === disabled;
					}
				}

				// Support: IE 6 - 11
				// Use the isDisabled shortcut property to check for disabled fieldset ancestors
				return elem.isDisabled === disabled ||

					// Where there is no isDisabled, check manually
					/* jshint -W018 */
					elem.isDisabled !== !disabled &&
					inDisabledFieldset( elem ) === disabled;
			}

			return elem.disabled === disabled;

		// Try to winnow out elements that can't be disabled before trusting the disabled property.
		// Some victims get caught in our net (label, legend, menu, track), but it shouldn't
		// even exist on them, let alone have a boolean value.
		} else if ( "label" in elem ) {
			return elem.disabled === disabled;
		}

		// Remaining elements are neither :enabled nor :disabled
		return false;
	};
}

/**
 * Returns a function to use in pseudos for positionals
 * @param {Function} fn
 */
function createPositionalPseudo( fn ) {
	return markFunction( function( argument ) {
		argument = +argument;
		return markFunction( function( seed, matches ) {
			var j,
				matchIndexes = fn( [], seed.length, argument ),
				i = matchIndexes.length;

			// Match elements found at the specified indexes
			while ( i-- ) {
				if ( seed[ ( j = matchIndexes[ i ] ) ] ) {
					seed[ j ] = !( matches[ j ] = seed[ j ] );
				}
			}
		} );
	} );
}

/**
 * Checks a node for validity as a Sizzle context
 * @param {Element|Object=} context
 * @returns {Element|Object|Boolean} The input node if acceptable, otherwise a falsy value
 */
function testContext( context ) {
	return context && typeof context.getElementsByTagName !== "undefined" && context;
}

// Expose support vars for convenience
support = Sizzle.support = {};

/**
 * Detects XML nodes
 * @param {Element|Object} elem An element or a document
 * @returns {Boolean} True iff elem is a non-HTML XML node
 */
isXML = Sizzle.isXML = function( elem ) {
	var namespace = elem && elem.namespaceURI,
		docElem = elem && ( elem.ownerDocument || elem ).documentElement;

	// Support: IE <=8
	// Assume HTML when documentElement doesn't yet exist, such as inside loading iframes
	// https://bugs.jquery.com/ticket/4833
	return !rhtml.test( namespace || docElem && docElem.nodeName || "HTML" );
};

/**
 * Sets document-related variables once based on the current document
 * @param {Element|Object} [doc] An element or document object to use to set the document
 * @returns {Object} Returns the current document
 */
setDocument = Sizzle.setDocument = function( node ) {
	var hasCompare, subWindow,
		doc = node ? node.ownerDocument || node : preferredDoc;

	// Return early if doc is invalid or already selected
	// Support: IE 11+, Edge 17 - 18+
	// IE/Edge sometimes throw a "Permission denied" error when strict-comparing
	// two documents; shallow comparisons work.
	// eslint-disable-next-line eqeqeq
	if ( doc == document || doc.nodeType !== 9 || !doc.documentElement ) {
		return document;
	}

	// Update global variables
	document = doc;
	docElem = document.documentElement;
	documentIsHTML = !isXML( document );

	// Support: IE 9 - 11+, Edge 12 - 18+
	// Accessing iframe documents after unload throws "permission denied" errors (jQuery #13936)
	// Support: IE 11+, Edge 17 - 18+
	// IE/Edge sometimes throw a "Permission denied" error when strict-comparing
	// two documents; shallow comparisons work.
	// eslint-disable-next-line eqeqeq
	if ( preferredDoc != document &&
		( subWindow = document.defaultView ) && subWindow.top !== subWindow ) {

		// Support: IE 11, Edge
		if ( subWindow.addEventListener ) {
			subWindow.addEventListener( "unload", unloadHandler, false );

		// Support: IE 9 - 10 only
		} else if ( subWindow.attachEvent ) {
			subWindow.attachEvent( "onunload", unloadHandler );
		}
	}

	// Support: IE 8 - 11+, Edge 12 - 18+, Chrome <=16 - 25 only, Firefox <=3.6 - 31 only,
	// Safari 4 - 5 only, Opera <=11.6 - 12.x only
	// IE/Edge & older browsers don't support the :scope pseudo-class.
	// Support: Safari 6.0 only
	// Safari 6.0 supports :scope but it's an alias of :root there.
	support.scope = assert( function( el ) {
		docElem.appendChild( el ).appendChild( document.createElement( "div" ) );
		return typeof el.querySelectorAll !== "undefined" &&
			!el.querySelectorAll( ":scope fieldset div" ).length;
	} );

	/* Attributes
	---------------------------------------------------------------------- */

	// Support: IE<8
	// Verify that getAttribute really returns attributes and not properties
	// (excepting IE8 booleans)
	support.attributes = assert( function( el ) {
		el.className = "i";
		return !el.getAttribute( "className" );
	} );

	/* getElement(s)By*
	---------------------------------------------------------------------- */

	// Check if getElementsByTagName("*") returns only elements
	support.getElementsByTagName = assert( function( el ) {
		el.appendChild( document.createComment( "" ) );
		return !el.getElementsByTagName( "*" ).length;
	} );

	// Support: IE<9
	support.getElementsByClassName = rnative.test( document.getElementsByClassName );

	// Support: IE<10
	// Check if getElementById returns elements by name
	// The broken getElementById methods don't pick up programmatically-set names,
	// so use a roundabout getElementsByName test
	support.getById = assert( function( el ) {
		docElem.appendChild( el ).id = expando;
		return !document.getElementsByName || !document.getElementsByName( expando ).length;
	} );

	// ID filter and find
	if ( support.getById ) {
		Expr.filter[ "ID" ] = function( id ) {
			var attrId = id.replace( runescape, funescape );
			return function( elem ) {
				return elem.getAttribute( "id" ) === attrId;
			};
		};
		Expr.find[ "ID" ] = function( id, context ) {
			if ( typeof context.getElementById !== "undefined" && documentIsHTML ) {
				var elem = context.getElementById( id );
				return elem ? [ elem ] : [];
			}
		};
	} else {
		Expr.filter[ "ID" ] =  function( id ) {
			var attrId = id.replace( runescape, funescape );
			return function( elem ) {
				var node = typeof elem.getAttributeNode !== "undefined" &&
					elem.getAttributeNode( "id" );
				return node && node.value === attrId;
			};
		};

		// Support: IE 6 - 7 only
		// getElementById is not reliable as a find shortcut
		Expr.find[ "ID" ] = function( id, context ) {
			if ( typeof context.getElementById !== "undefined" && documentIsHTML ) {
				var node, i, elems,
					elem = context.getElementById( id );

				if ( elem ) {

					// Verify the id attribute
					node = elem.getAttributeNode( "id" );
					if ( node && node.value === id ) {
						return [ elem ];
					}

					// Fall back on getElementsByName
					elems = context.getElementsByName( id );
					i = 0;
					while ( ( elem = elems[ i++ ] ) ) {
						node = elem.getAttributeNode( "id" );
						if ( node && node.value === id ) {
							return [ elem ];
						}
					}
				}

				return [];
			}
		};
	}

	// Tag
	Expr.find[ "TAG" ] = support.getElementsByTagName ?
		function( tag, context ) {
			if ( typeof context.getElementsByTagName !== "undefined" ) {
				return context.getElementsByTagName( tag );

			// DocumentFragment nodes don't have gEBTN
			} else if ( support.qsa ) {
				return context.querySelectorAll( tag );
			}
		} :

		function( tag, context ) {
			var elem,
				tmp = [],
				i = 0,

				// By happy coincidence, a (broken) gEBTN appears on DocumentFragment nodes too
				results = context.getElementsByTagName( tag );

			// Filter out possible comments
			if ( tag === "*" ) {
				while ( ( elem = results[ i++ ] ) ) {
					if ( elem.nodeType === 1 ) {
						tmp.push( elem );
					}
				}

				return tmp;
			}
			return results;
		};

	// Class
	Expr.find[ "CLASS" ] = support.getElementsByClassName && function( className, context ) {
		if ( typeof context.getElementsByClassName !== "undefined" && documentIsHTML ) {
			return context.getElementsByClassName( className );
		}
	};

	/* QSA/matchesSelector
	---------------------------------------------------------------------- */

	// QSA and matchesSelector support

	// matchesSelector(:active) reports false when true (IE9/Opera 11.5)
	rbuggyMatches = [];

	// qSa(:focus) reports false when true (Chrome 21)
	// We allow this because of a bug in IE8/9 that throws an error
	// whenever `document.activeElement` is accessed on an iframe
	// So, we allow :focus to pass through QSA all the time to avoid the IE error
	// See https://bugs.jquery.com/ticket/13378
	rbuggyQSA = [];

	if ( ( support.qsa = rnative.test( document.querySelectorAll ) ) ) {

		// Build QSA regex
		// Regex strategy adopted from Diego Perini
		assert( function( el ) {

			var input;

			// Select is set to empty string on purpose
			// This is to test IE's treatment of not explicitly
			// setting a boolean content attribute,
			// since its presence should be enough
			// https://bugs.jquery.com/ticket/12359
			docElem.appendChild( el ).innerHTML = "<a id='" + expando + "'></a>" +
				"<select id='" + expando + "-\r\\' msallowcapture=''>" +
				"<option selected=''></option></select>";

			// Support: IE8, Opera 11-12.16
			// Nothing should be selected when empty strings follow ^= or $= or *=
			// The test attribute must be unknown in Opera but "safe" for WinRT
			// https://msdn.microsoft.com/en-us/library/ie/hh465388.aspx#attribute_section
			if ( el.querySelectorAll( "[msallowcapture^='']" ).length ) {
				rbuggyQSA.push( "[*^$]=" + whitespace + "*(?:''|\"\")" );
			}

			// Support: IE8
			// Boolean attributes and "value" are not treated correctly
			if ( !el.querySelectorAll( "[selected]" ).length ) {
				rbuggyQSA.push( "\\[" + whitespace + "*(?:value|" + booleans + ")" );
			}

			// Support: Chrome<29, Android<4.4, Safari<7.0+, iOS<7.0+, PhantomJS<1.9.8+
			if ( !el.querySelectorAll( "[id~=" + expando + "-]" ).length ) {
				rbuggyQSA.push( "~=" );
			}

			// Support: IE 11+, Edge 15 - 18+
			// IE 11/Edge don't find elements on a `[name='']` query in some cases.
			// Adding a temporary attribute to the document before the selection works
			// around the issue.
			// Interestingly, IE 10 & older don't seem to have the issue.
			input = document.createElement( "input" );
			input.setAttribute( "name", "" );
			el.appendChild( input );
			if ( !el.querySelectorAll( "[name='']" ).length ) {
				rbuggyQSA.push( "\\[" + whitespace + "*name" + whitespace + "*=" +
					whitespace + "*(?:''|\"\")" );
			}

			// Webkit/Opera - :checked should return selected option elements
			// http://www.w3.org/TR/2011/REC-css3-selectors-20110929/#checked
			// IE8 throws error here and will not see later tests
			if ( !el.querySelectorAll( ":checked" ).length ) {
				rbuggyQSA.push( ":checked" );
			}

			// Support: Safari 8+, iOS 8+
			// https://bugs.webkit.org/show_bug.cgi?id=136851
			// In-page `selector#id sibling-combinator selector` fails
			if ( !el.querySelectorAll( "a#" + expando + "+*" ).length ) {
				rbuggyQSA.push( ".#.+[+~]" );
			}

			// Support: Firefox <=3.6 - 5 only
			// Old Firefox doesn't throw on a badly-escaped identifier.
			el.querySelectorAll( "\\\f" );
			rbuggyQSA.push( "[\\r\\n\\f]" );
		} );

		assert( function( el ) {
			el.innerHTML = "<a href='' disabled='disabled'></a>" +
				"<select disabled='disabled'><option/></select>";

			// Support: Windows 8 Native Apps
			// The type and name attributes are restricted during .innerHTML assignment
			var input = document.createElement( "input" );
			input.setAttribute( "type", "hidden" );
			el.appendChild( input ).setAttribute( "name", "D" );

			// Support: IE8
			// Enforce case-sensitivity of name attribute
			if ( el.querySelectorAll( "[name=d]" ).length ) {
				rbuggyQSA.push( "name" + whitespace + "*[*^$|!~]?=" );
			}

			// FF 3.5 - :enabled/:disabled and hidden elements (hidden elements are still enabled)
			// IE8 throws error here and will not see later tests
			if ( el.querySelectorAll( ":enabled" ).length !== 2 ) {
				rbuggyQSA.push( ":enabled", ":disabled" );
			}

			// Support: IE9-11+
			// IE's :disabled selector does not pick up the children of disabled fieldsets
			docElem.appendChild( el ).disabled = true;
			if ( el.querySelectorAll( ":disabled" ).length !== 2 ) {
				rbuggyQSA.push( ":enabled", ":disabled" );
			}

			// Support: Opera 10 - 11 only
			// Opera 10-11 does not throw on post-comma invalid pseudos
			el.querySelectorAll( "*,:x" );
			rbuggyQSA.push( ",.*:" );
		} );
	}

	if ( ( support.matchesSelector = rnative.test( ( matches = docElem.matches ||
		docElem.webkitMatchesSelector ||
		docElem.mozMatchesSelector ||
		docElem.oMatchesSelector ||
		docElem.msMatchesSelector ) ) ) ) {

		assert( function( el ) {

			// Check to see if it's possible to do matchesSelector
			// on a disconnected node (IE 9)
			support.disconnectedMatch = matches.call( el, "*" );

			// This should fail with an exception
			// Gecko does not error, returns false instead
			matches.call( el, "[s!='']:x" );
			rbuggyMatches.push( "!=", pseudos );
		} );
	}

	rbuggyQSA = rbuggyQSA.length && new RegExp( rbuggyQSA.join( "|" ) );
	rbuggyMatches = rbuggyMatches.length && new RegExp( rbuggyMatches.join( "|" ) );

	/* Contains
	---------------------------------------------------------------------- */
	hasCompare = rnative.test( docElem.compareDocumentPosition );

	// Element contains another
	// Purposefully self-exclusive
	// As in, an element does not contain itself
	contains = hasCompare || rnative.test( docElem.contains ) ?
		function( a, b ) {
			var adown = a.nodeType === 9 ? a.documentElement : a,
				bup = b && b.parentNode;
			return a === bup || !!( bup && bup.nodeType === 1 && (
				adown.contains ?
					adown.contains( bup ) :
					a.compareDocumentPosition && a.compareDocumentPosition( bup ) & 16
			) );
		} :
		function( a, b ) {
			if ( b ) {
				while ( ( b = b.parentNode ) ) {
					if ( b === a ) {
						return true;
					}
				}
			}
			return false;
		};

	/* Sorting
	---------------------------------------------------------------------- */

	// Document order sorting
	sortOrder = hasCompare ?
	function( a, b ) {

		// Flag for duplicate removal
		if ( a === b ) {
			hasDuplicate = true;
			return 0;
		}

		// Sort on method existence if only one input has compareDocumentPosition
		var compare = !a.compareDocumentPosition - !b.compareDocumentPosition;
		if ( compare ) {
			return compare;
		}

		// Calculate position if both inputs belong to the same document
		// Support: IE 11+, Edge 17 - 18+
		// IE/Edge sometimes throw a "Permission denied" error when strict-comparing
		// two documents; shallow comparisons work.
		// eslint-disable-next-line eqeqeq
		compare = ( a.ownerDocument || a ) == ( b.ownerDocument || b ) ?
			a.compareDocumentPosition( b ) :

			// Otherwise we know they are disconnected
			1;

		// Disconnected nodes
		if ( compare & 1 ||
			( !support.sortDetached && b.compareDocumentPosition( a ) === compare ) ) {

			// Choose the first element that is related to our preferred document
			// Support: IE 11+, Edge 17 - 18+
			// IE/Edge sometimes throw a "Permission denied" error when strict-comparing
			// two documents; shallow comparisons work.
			// eslint-disable-next-line eqeqeq
			if ( a == document || a.ownerDocument == preferredDoc &&
				contains( preferredDoc, a ) ) {
				return -1;
			}

			// Support: IE 11+, Edge 17 - 18+
			// IE/Edge sometimes throw a "Permission denied" error when strict-comparing
			// two documents; shallow comparisons work.
			// eslint-disable-next-line eqeqeq
			if ( b == document || b.ownerDocument == preferredDoc &&
				contains( preferredDoc, b ) ) {
				return 1;
			}

			// Maintain original order
			return sortInput ?
				( indexOf( sortInput, a ) - indexOf( sortInput, b ) ) :
				0;
		}

		return compare & 4 ? -1 : 1;
	} :
	function( a, b ) {

		// Exit early if the nodes are identical
		if ( a === b ) {
			hasDuplicate = true;
			return 0;
		}

		var cur,
			i = 0,
			aup = a.parentNode,
			bup = b.parentNode,
			ap = [ a ],
			bp = [ b ];

		// Parentless nodes are either documents or disconnected
		if ( !aup || !bup ) {

			// Support: IE 11+, Edge 17 - 18+
			// IE/Edge sometimes throw a "Permission denied" error when strict-comparing
			// two documents; shallow comparisons work.
			/* eslint-disable eqeqeq */
			return a == document ? -1 :
				b == document ? 1 :
				/* eslint-enable eqeqeq */
				aup ? -1 :
				bup ? 1 :
				sortInput ?
				( indexOf( sortInput, a ) - indexOf( sortInput, b ) ) :
				0;

		// If the nodes are siblings, we can do a quick check
		} else if ( aup === bup ) {
			return siblingCheck( a, b );
		}

		// Otherwise we need full lists of their ancestors for comparison
		cur = a;
		while ( ( cur = cur.parentNode ) ) {
			ap.unshift( cur );
		}
		cur = b;
		while ( ( cur = cur.parentNode ) ) {
			bp.unshift( cur );
		}

		// Walk down the tree looking for a discrepancy
		while ( ap[ i ] === bp[ i ] ) {
			i++;
		}

		return i ?

			// Do a sibling check if the nodes have a common ancestor
			siblingCheck( ap[ i ], bp[ i ] ) :

			// Otherwise nodes in our document sort first
			// Support: IE 11+, Edge 17 - 18+
			// IE/Edge sometimes throw a "Permission denied" error when strict-comparing
			// two documents; shallow comparisons work.
			/* eslint-disable eqeqeq */
			ap[ i ] == preferredDoc ? -1 :
			bp[ i ] == preferredDoc ? 1 :
			/* eslint-enable eqeqeq */
			0;
	};

	return document;
};

Sizzle.matches = function( expr, elements ) {
	return Sizzle( expr, null, null, elements );
};

Sizzle.matchesSelector = function( elem, expr ) {
	setDocument( elem );

	if ( support.matchesSelector && documentIsHTML &&
		!nonnativeSelectorCache[ expr + " " ] &&
		( !rbuggyMatches || !rbuggyMatches.test( expr ) ) &&
		( !rbuggyQSA     || !rbuggyQSA.test( expr ) ) ) {

		try {
			var ret = matches.call( elem, expr );

			// IE 9's matchesSelector returns false on disconnected nodes
			if ( ret || support.disconnectedMatch ||

				// As well, disconnected nodes are said to be in a document
				// fragment in IE 9
				elem.document && elem.document.nodeType !== 11 ) {
				return ret;
			}
		} catch ( e ) {
			nonnativeSelectorCache( expr, true );
		}
	}

	return Sizzle( expr, document, null, [ elem ] ).length > 0;
};

Sizzle.contains = function( context, elem ) {

	// Set document vars if needed
	// Support: IE 11+, Edge 17 - 18+
	// IE/Edge sometimes throw a "Permission denied" error when strict-comparing
	// two documents; shallow comparisons work.
	// eslint-disable-next-line eqeqeq
	if ( ( context.ownerDocument || context ) != document ) {
		setDocument( context );
	}
	return contains( context, elem );
};

Sizzle.attr = function( elem, name ) {

	// Set document vars if needed
	// Support: IE 11+, Edge 17 - 18+
	// IE/Edge sometimes throw a "Permission denied" error when strict-comparing
	// two documents; shallow comparisons work.
	// eslint-disable-next-line eqeqeq
	if ( ( elem.ownerDocument || elem ) != document ) {
		setDocument( elem );
	}

	var fn = Expr.attrHandle[ name.toLowerCase() ],

		// Don't get fooled by Object.prototype properties (jQuery #13807)
		val = fn && hasOwn.call( Expr.attrHandle, name.toLowerCase() ) ?
			fn( elem, name, !documentIsHTML ) :
			undefined;

	return val !== undefined ?
		val :
		support.attributes || !documentIsHTML ?
			elem.getAttribute( name ) :
			( val = elem.getAttributeNode( name ) ) && val.specified ?
				val.value :
				null;
};

Sizzle.escape = function( sel ) {
	return ( sel + "" ).replace( rcssescape, fcssescape );
};

Sizzle.error = function( msg ) {
	throw new Error( "Syntax error, unrecognized expression: " + msg );
};

/**
 * Document sorting and removing duplicates
 * @param {ArrayLike} results
 */
Sizzle.uniqueSort = function( results ) {
	var elem,
		duplicates = [],
		j = 0,
		i = 0;

	// Unless we *know* we can detect duplicates, assume their presence
	hasDuplicate = !support.detectDuplicates;
	sortInput = !support.sortStable && results.slice( 0 );
	results.sort( sortOrder );

	if ( hasDuplicate ) {
		while ( ( elem = results[ i++ ] ) ) {
			if ( elem === results[ i ] ) {
				j = duplicates.push( i );
			}
		}
		while ( j-- ) {
			results.splice( duplicates[ j ], 1 );
		}
	}

	// Clear input after sorting to release objects
	// See https://github.com/jquery/sizzle/pull/225
	sortInput = null;

	return results;
};

/**
 * Utility function for retrieving the text value of an array of DOM nodes
 * @param {Array|Element} elem
 */
getText = Sizzle.getText = function( elem ) {
	var node,
		ret = "",
		i = 0,
		nodeType = elem.nodeType;

	if ( !nodeType ) {

		// If no nodeType, this is expected to be an array
		while ( ( node = elem[ i++ ] ) ) {

			// Do not traverse comment nodes
			ret += getText( node );
		}
	} else if ( nodeType === 1 || nodeType === 9 || nodeType === 11 ) {

		// Use textContent for elements
		// innerText usage removed for consistency of new lines (jQuery #11153)
		if ( typeof elem.textContent === "string" ) {
			return elem.textContent;
		} else {

			// Traverse its children
			for ( elem = elem.firstChild; elem; elem = elem.nextSibling ) {
				ret += getText( elem );
			}
		}
	} else if ( nodeType === 3 || nodeType === 4 ) {
		return elem.nodeValue;
	}

	// Do not include comment or processing instruction nodes

	return ret;
};

Expr = Sizzle.selectors = {

	// Can be adjusted by the user
	cacheLength: 50,

	createPseudo: markFunction,

	match: matchExpr,

	attrHandle: {},

	find: {},

	relative: {
		">": { dir: "parentNode", first: true },
		" ": { dir: "parentNode" },
		"+": { dir: "previousSibling", first: true },
		"~": { dir: "previousSibling" }
	},

	preFilter: {
		"ATTR": function( match ) {
			match[ 1 ] = match[ 1 ].replace( runescape, funescape );

			// Move the given value to match[3] whether quoted or unquoted
			match[ 3 ] = ( match[ 3 ] || match[ 4 ] ||
				match[ 5 ] || "" ).replace( runescape, funescape );

			if ( match[ 2 ] === "~=" ) {
				match[ 3 ] = " " + match[ 3 ] + " ";
			}

			return match.slice( 0, 4 );
		},

		"CHILD": function( match ) {

			/* matches from matchExpr["CHILD"]
				1 type (only|nth|...)
				2 what (child|of-type)
				3 argument (even|odd|\d*|\d*n([+-]\d+)?|...)
				4 xn-component of xn+y argument ([+-]?\d*n|)
				5 sign of xn-component
				6 x of xn-component
				7 sign of y-component
				8 y of y-component
			*/
			match[ 1 ] = match[ 1 ].toLowerCase();

			if ( match[ 1 ].slice( 0, 3 ) === "nth" ) {

				// nth-* requires argument
				if ( !match[ 3 ] ) {
					Sizzle.error( match[ 0 ] );
				}

				// numeric x and y parameters for Expr.filter.CHILD
				// remember that false/true cast respectively to 0/1
				match[ 4 ] = +( match[ 4 ] ?
					match[ 5 ] + ( match[ 6 ] || 1 ) :
					2 * ( match[ 3 ] === "even" || match[ 3 ] === "odd" ) );
				match[ 5 ] = +( ( match[ 7 ] + match[ 8 ] ) || match[ 3 ] === "odd" );

				// other types prohibit arguments
			} else if ( match[ 3 ] ) {
				Sizzle.error( match[ 0 ] );
			}

			return match;
		},

		"PSEUDO": function( match ) {
			var excess,
				unquoted = !match[ 6 ] && match[ 2 ];

			if ( matchExpr[ "CHILD" ].test( match[ 0 ] ) ) {
				return null;
			}

			// Accept quoted arguments as-is
			if ( match[ 3 ] ) {
				match[ 2 ] = match[ 4 ] || match[ 5 ] || "";

			// Strip excess characters from unquoted arguments
			} else if ( unquoted && rpseudo.test( unquoted ) &&

				// Get excess from tokenize (recursively)
				( excess = tokenize( unquoted, true ) ) &&

				// advance to the next closing parenthesis
				( excess = unquoted.indexOf( ")", unquoted.length - excess ) - unquoted.length ) ) {

				// excess is a negative index
				match[ 0 ] = match[ 0 ].slice( 0, excess );
				match[ 2 ] = unquoted.slice( 0, excess );
			}

			// Return only captures needed by the pseudo filter method (type and argument)
			return match.slice( 0, 3 );
		}
	},

	filter: {

		"TAG": function( nodeNameSelector ) {
			var nodeName = nodeNameSelector.replace( runescape, funescape ).toLowerCase();
			return nodeNameSelector === "*" ?
				function() {
					return true;
				} :
				function( elem ) {
					return elem.nodeName && elem.nodeName.toLowerCase() === nodeName;
				};
		},

		"CLASS": function( className ) {
			var pattern = classCache[ className + " " ];

			return pattern ||
				( pattern = new RegExp( "(^|" + whitespace +
					")" + className + "(" + whitespace + "|$)" ) ) && classCache(
						className, function( elem ) {
							return pattern.test(
								typeof elem.className === "string" && elem.className ||
								typeof elem.getAttribute !== "undefined" &&
									elem.getAttribute( "class" ) ||
								""
							);
				} );
		},

		"ATTR": function( name, operator, check ) {
			return function( elem ) {
				var result = Sizzle.attr( elem, name );

				if ( result == null ) {
					return operator === "!=";
				}
				if ( !operator ) {
					return true;
				}

				result += "";

				/* eslint-disable max-len */

				return operator === "=" ? result === check :
					operator === "!=" ? result !== check :
					operator === "^=" ? check && result.indexOf( check ) === 0 :
					operator === "*=" ? check && result.indexOf( check ) > -1 :
					operator === "$=" ? check && result.slice( -check.length ) === check :
					operator === "~=" ? ( " " + result.replace( rwhitespace, " " ) + " " ).indexOf( check ) > -1 :
					operator === "|=" ? result === check || result.slice( 0, check.length + 1 ) === check + "-" :
					false;
				/* eslint-enable max-len */

			};
		},

		"CHILD": function( type, what, _argument, first, last ) {
			var simple = type.slice( 0, 3 ) !== "nth",
				forward = type.slice( -4 ) !== "last",
				ofType = what === "of-type";

			return first === 1 && last === 0 ?

				// Shortcut for :nth-*(n)
				function( elem ) {
					return !!elem.parentNode;
				} :

				function( elem, _context, xml ) {
					var cache, uniqueCache, outerCache, node, nodeIndex, start,
						dir = simple !== forward ? "nextSibling" : "previousSibling",
						parent = elem.parentNode,
						name = ofType && elem.nodeName.toLowerCase(),
						useCache = !xml && !ofType,
						diff = false;

					if ( parent ) {

						// :(first|last|only)-(child|of-type)
						if ( simple ) {
							while ( dir ) {
								node = elem;
								while ( ( node = node[ dir ] ) ) {
									if ( ofType ?
										node.nodeName.toLowerCase() === name :
										node.nodeType === 1 ) {

										return false;
									}
								}

								// Reverse direction for :only-* (if we haven't yet done so)
								start = dir = type === "only" && !start && "nextSibling";
							}
							return true;
						}

						start = [ forward ? parent.firstChild : parent.lastChild ];

						// non-xml :nth-child(...) stores cache data on `parent`
						if ( forward && useCache ) {

							// Seek `elem` from a previously-cached index

							// ...in a gzip-friendly way
							node = parent;
							outerCache = node[ expando ] || ( node[ expando ] = {} );

							// Support: IE <9 only
							// Defend against cloned attroperties (jQuery gh-1709)
							uniqueCache = outerCache[ node.uniqueID ] ||
								( outerCache[ node.uniqueID ] = {} );

							cache = uniqueCache[ type ] || [];
							nodeIndex = cache[ 0 ] === dirruns && cache[ 1 ];
							diff = nodeIndex && cache[ 2 ];
							node = nodeIndex && parent.childNodes[ nodeIndex ];

							while ( ( node = ++nodeIndex && node && node[ dir ] ||

								// Fallback to seeking `elem` from the start
								( diff = nodeIndex = 0 ) || start.pop() ) ) {

								// When found, cache indexes on `parent` and break
								if ( node.nodeType === 1 && ++diff && node === elem ) {
									uniqueCache[ type ] = [ dirruns, nodeIndex, diff ];
									break;
								}
							}

						} else {

							// Use previously-cached element index if available
							if ( useCache ) {

								// ...in a gzip-friendly way
								node = elem;
								outerCache = node[ expando ] || ( node[ expando ] = {} );

								// Support: IE <9 only
								// Defend against cloned attroperties (jQuery gh-1709)
								uniqueCache = outerCache[ node.uniqueID ] ||
									( outerCache[ node.uniqueID ] = {} );

								cache = uniqueCache[ type ] || [];
								nodeIndex = cache[ 0 ] === dirruns && cache[ 1 ];
								diff = nodeIndex;
							}

							// xml :nth-child(...)
							// or :nth-last-child(...) or :nth(-last)?-of-type(...)
							if ( diff === false ) {

								// Use the same loop as above to seek `elem` from the start
								while ( ( node = ++nodeIndex && node && node[ dir ] ||
									( diff = nodeIndex = 0 ) || start.pop() ) ) {

									if ( ( ofType ?
										node.nodeName.toLowerCase() === name :
										node.nodeType === 1 ) &&
										++diff ) {

										// Cache the index of each encountered element
										if ( useCache ) {
											outerCache = node[ expando ] ||
												( node[ expando ] = {} );

											// Support: IE <9 only
											// Defend against cloned attroperties (jQuery gh-1709)
											uniqueCache = outerCache[ node.uniqueID ] ||
												( outerCache[ node.uniqueID ] = {} );

											uniqueCache[ type ] = [ dirruns, diff ];
										}

										if ( node === elem ) {
											break;
										}
									}
								}
							}
						}

						// Incorporate the offset, then check against cycle size
						diff -= last;
						return diff === first || ( diff % first === 0 && diff / first >= 0 );
					}
				};
		},

		"PSEUDO": function( pseudo, argument ) {

			// pseudo-class names are case-insensitive
			// http://www.w3.org/TR/selectors/#pseudo-classes
			// Prioritize by case sensitivity in case custom pseudos are added with uppercase letters
			// Remember that setFilters inherits from pseudos
			var args,
				fn = Expr.pseudos[ pseudo ] || Expr.setFilters[ pseudo.toLowerCase() ] ||
					Sizzle.error( "unsupported pseudo: " + pseudo );

			// The user may use createPseudo to indicate that
			// arguments are needed to create the filter function
			// just as Sizzle does
			if ( fn[ expando ] ) {
				return fn( argument );
			}

			// But maintain support for old signatures
			if ( fn.length > 1 ) {
				args = [ pseudo, pseudo, "", argument ];
				return Expr.setFilters.hasOwnProperty( pseudo.toLowerCase() ) ?
					markFunction( function( seed, matches ) {
						var idx,
							matched = fn( seed, argument ),
							i = matched.length;
						while ( i-- ) {
							idx = indexOf( seed, matched[ i ] );
							seed[ idx ] = !( matches[ idx ] = matched[ i ] );
						}
					} ) :
					function( elem ) {
						return fn( elem, 0, args );
					};
			}

			return fn;
		}
	},

	pseudos: {

		// Potentially complex pseudos
		"not": markFunction( function( selector ) {

			// Trim the selector passed to compile
			// to avoid treating leading and trailing
			// spaces as combinators
			var input = [],
				results = [],
				matcher = compile( selector.replace( rtrim, "$1" ) );

			return matcher[ expando ] ?
				markFunction( function( seed, matches, _context, xml ) {
					var elem,
						unmatched = matcher( seed, null, xml, [] ),
						i = seed.length;

					// Match elements unmatched by `matcher`
					while ( i-- ) {
						if ( ( elem = unmatched[ i ] ) ) {
							seed[ i ] = !( matches[ i ] = elem );
						}
					}
				} ) :
				function( elem, _context, xml ) {
					input[ 0 ] = elem;
					matcher( input, null, xml, results );

					// Don't keep the element (issue #299)
					input[ 0 ] = null;
					return !results.pop();
				};
		} ),

		"has": markFunction( function( selector ) {
			return function( elem ) {
				return Sizzle( selector, elem ).length > 0;
			};
		} ),

		"contains": markFunction( function( text ) {
			text = text.replace( runescape, funescape );
			return function( elem ) {
				return ( elem.textContent || getText( elem ) ).indexOf( text ) > -1;
			};
		} ),

		// "Whether an element is represented by a :lang() selector
		// is based solely on the element's language value
		// being equal to the identifier C,
		// or beginning with the identifier C immediately followed by "-".
		// The matching of C against the element's language value is performed case-insensitively.
		// The identifier C does not have to be a valid language name."
		// http://www.w3.org/TR/selectors/#lang-pseudo
		"lang": markFunction( function( lang ) {

			// lang value must be a valid identifier
			if ( !ridentifier.test( lang || "" ) ) {
				Sizzle.error( "unsupported lang: " + lang );
			}
			lang = lang.replace( runescape, funescape ).toLowerCase();
			return function( elem ) {
				var elemLang;
				do {
					if ( ( elemLang = documentIsHTML ?
						elem.lang :
						elem.getAttribute( "xml:lang" ) || elem.getAttribute( "lang" ) ) ) {

						elemLang = elemLang.toLowerCase();
						return elemLang === lang || elemLang.indexOf( lang + "-" ) === 0;
					}
				} while ( ( elem = elem.parentNode ) && elem.nodeType === 1 );
				return false;
			};
		} ),

		// Miscellaneous
		"target": function( elem ) {
			var hash = window.location && window.location.hash;
			return hash && hash.slice( 1 ) === elem.id;
		},

		"root": function( elem ) {
			return elem === docElem;
		},

		"focus": function( elem ) {
			return elem === document.activeElement &&
				( !document.hasFocus || document.hasFocus() ) &&
				!!( elem.type || elem.href || ~elem.tabIndex );
		},

		// Boolean properties
		"enabled": createDisabledPseudo( false ),
		"disabled": createDisabledPseudo( true ),

		"checked": function( elem ) {

			// In CSS3, :checked should return both checked and selected elements
			// http://www.w3.org/TR/2011/REC-css3-selectors-20110929/#checked
			var nodeName = elem.nodeName.toLowerCase();
			return ( nodeName === "input" && !!elem.checked ) ||
				( nodeName === "option" && !!elem.selected );
		},

		"selected": function( elem ) {

			// Accessing this property makes selected-by-default
			// options in Safari work properly
			if ( elem.parentNode ) {
				// eslint-disable-next-line no-unused-expressions
				elem.parentNode.selectedIndex;
			}

			return elem.selected === true;
		},

		// Contents
		"empty": function( elem ) {

			// http://www.w3.org/TR/selectors/#empty-pseudo
			// :empty is negated by element (1) or content nodes (text: 3; cdata: 4; entity ref: 5),
			//   but not by others (comment: 8; processing instruction: 7; etc.)
			// nodeType < 6 works because attributes (2) do not appear as children
			for ( elem = elem.firstChild; elem; elem = elem.nextSibling ) {
				if ( elem.nodeType < 6 ) {
					return false;
				}
			}
			return true;
		},

		"parent": function( elem ) {
			return !Expr.pseudos[ "empty" ]( elem );
		},

		// Element/input types
		"header": function( elem ) {
			return rheader.test( elem.nodeName );
		},

		"input": function( elem ) {
			return rinputs.test( elem.nodeName );
		},

		"button": function( elem ) {
			var name = elem.nodeName.toLowerCase();
			return name === "input" && elem.type === "button" || name === "button";
		},

		"text": function( elem ) {
			var attr;
			return elem.nodeName.toLowerCase() === "input" &&
				elem.type === "text" &&

				// Support: IE<8
				// New HTML5 attribute values (e.g., "search") appear with elem.type === "text"
				( ( attr = elem.getAttribute( "type" ) ) == null ||
					attr.toLowerCase() === "text" );
		},

		// Position-in-collection
		"first": createPositionalPseudo( function() {
			return [ 0 ];
		} ),

		"last": createPositionalPseudo( function( _matchIndexes, length ) {
			return [ length - 1 ];
		} ),

		"eq": createPositionalPseudo( function( _matchIndexes, length, argument ) {
			return [ argument < 0 ? argument + length : argument ];
		} ),

		"even": createPositionalPseudo( function( matchIndexes, length ) {
			var i = 0;
			for ( ; i < length; i += 2 ) {
				matchIndexes.push( i );
			}
			return matchIndexes;
		} ),

		"odd": createPositionalPseudo( function( matchIndexes, length ) {
			var i = 1;
			for ( ; i < length; i += 2 ) {
				matchIndexes.push( i );
			}
			return matchIndexes;
		} ),

		"lt": createPositionalPseudo( function( matchIndexes, length, argument ) {
			var i = argument < 0 ?
				argument + length :
				argument > length ?
					length :
					argument;
			for ( ; --i >= 0; ) {
				matchIndexes.push( i );
			}
			return matchIndexes;
		} ),

		"gt": createPositionalPseudo( function( matchIndexes, length, argument ) {
			var i = argument < 0 ? argument + length : argument;
			for ( ; ++i < length; ) {
				matchIndexes.push( i );
			}
			return matchIndexes;
		} )
	}
};

Expr.pseudos[ "nth" ] = Expr.pseudos[ "eq" ];

// Add button/input type pseudos
for ( i in { radio: true, checkbox: true, file: true, password: true, image: true } ) {
	Expr.pseudos[ i ] = createInputPseudo( i );
}
for ( i in { submit: true, reset: true } ) {
	Expr.pseudos[ i ] = createButtonPseudo( i );
}

// Easy API for creating new setFilters
function setFilters() {}
setFilters.prototype = Expr.filters = Expr.pseudos;
Expr.setFilters = new setFilters();

tokenize = Sizzle.tokenize = function( selector, parseOnly ) {
	var matched, match, tokens, type,
		soFar, groups, preFilters,
		cached = tokenCache[ selector + " " ];

	if ( cached ) {
		return parseOnly ? 0 : cached.slice( 0 );
	}

	soFar = selector;
	groups = [];
	preFilters = Expr.preFilter;

	while ( soFar ) {

		// Comma and first run
		if ( !matched || ( match = rcomma.exec( soFar ) ) ) {
			if ( match ) {

				// Don't consume trailing commas as valid
				soFar = soFar.slice( match[ 0 ].length ) || soFar;
			}
			groups.push( ( tokens = [] ) );
		}

		matched = false;

		// Combinators
		if ( ( match = rcombinators.exec( soFar ) ) ) {
			matched = match.shift();
			tokens.push( {
				value: matched,

				// Cast descendant combinators to space
				type: match[ 0 ].replace( rtrim, " " )
			} );
			soFar = soFar.slice( matched.length );
		}

		// Filters
		for ( type in Expr.filter ) {
			if ( ( match = matchExpr[ type ].exec( soFar ) ) && ( !preFilters[ type ] ||
				( match = preFilters[ type ]( match ) ) ) ) {
				matched = match.shift();
				tokens.push( {
					value: matched,
					type: type,
					matches: match
				} );
				soFar = soFar.slice( matched.length );
			}
		}

		if ( !matched ) {
			break;
		}
	}

	// Return the length of the invalid excess
	// if we're just parsing
	// Otherwise, throw an error or return tokens
	return parseOnly ?
		soFar.length :
		soFar ?
			Sizzle.error( selector ) :

			// Cache the tokens
			tokenCache( selector, groups ).slice( 0 );
};

function toSelector( tokens ) {
	var i = 0,
		len = tokens.length,
		selector = "";
	for ( ; i < len; i++ ) {
		selector += tokens[ i ].value;
	}
	return selector;
}

function addCombinator( matcher, combinator, base ) {
	var dir = combinator.dir,
		skip = combinator.next,
		key = skip || dir,
		checkNonElements = base && key === "parentNode",
		doneName = done++;

	return combinator.first ?

		// Check against closest ancestor/preceding element
		function( elem, context, xml ) {
			while ( ( elem = elem[ dir ] ) ) {
				if ( elem.nodeType === 1 || checkNonElements ) {
					return matcher( elem, context, xml );
				}
			}
			return false;
		} :

		// Check against all ancestor/preceding elements
		function( elem, context, xml ) {
			var oldCache, uniqueCache, outerCache,
				newCache = [ dirruns, doneName ];

			// We can't set arbitrary data on XML nodes, so they don't benefit from combinator caching
			if ( xml ) {
				while ( ( elem = elem[ dir ] ) ) {
					if ( elem.nodeType === 1 || checkNonElements ) {
						if ( matcher( elem, context, xml ) ) {
							return true;
						}
					}
				}
			} else {
				while ( ( elem = elem[ dir ] ) ) {
					if ( elem.nodeType === 1 || checkNonElements ) {
						outerCache = elem[ expando ] || ( elem[ expando ] = {} );

						// Support: IE <9 only
						// Defend against cloned attroperties (jQuery gh-1709)
						uniqueCache = outerCache[ elem.uniqueID ] ||
							( outerCache[ elem.uniqueID ] = {} );

						if ( skip && skip === elem.nodeName.toLowerCase() ) {
							elem = elem[ dir ] || elem;
						} else if ( ( oldCache = uniqueCache[ key ] ) &&
							oldCache[ 0 ] === dirruns && oldCache[ 1 ] === doneName ) {

							// Assign to newCache so results back-propagate to previous elements
							return ( newCache[ 2 ] = oldCache[ 2 ] );
						} else {

							// Reuse newcache so results back-propagate to previous elements
							uniqueCache[ key ] = newCache;

							// A match means we're done; a fail means we have to keep checking
							if ( ( newCache[ 2 ] = matcher( elem, context, xml ) ) ) {
								return true;
							}
						}
					}
				}
			}
			return false;
		};
}

function elementMatcher( matchers ) {
	return matchers.length > 1 ?
		function( elem, context, xml ) {
			var i = matchers.length;
			while ( i-- ) {
				if ( !matchers[ i ]( elem, context, xml ) ) {
					return false;
				}
			}
			return true;
		} :
		matchers[ 0 ];
}

function multipleContexts( selector, contexts, results ) {
	var i = 0,
		len = contexts.length;
	for ( ; i < len; i++ ) {
		Sizzle( selector, contexts[ i ], results );
	}
	return results;
}

function condense( unmatched, map, filter, context, xml ) {
	var elem,
		newUnmatched = [],
		i = 0,
		len = unmatched.length,
		mapped = map != null;

	for ( ; i < len; i++ ) {
		if ( ( elem = unmatched[ i ] ) ) {
			if ( !filter || filter( elem, context, xml ) ) {
				newUnmatched.push( elem );
				if ( mapped ) {
					map.push( i );
				}
			}
		}
	}

	return newUnmatched;
}

function setMatcher( preFilter, selector, matcher, postFilter, postFinder, postSelector ) {
	if ( postFilter && !postFilter[ expando ] ) {
		postFilter = setMatcher( postFilter );
	}
	if ( postFinder && !postFinder[ expando ] ) {
		postFinder = setMatcher( postFinder, postSelector );
	}
	return markFunction( function( seed, results, context, xml ) {
		var temp, i, elem,
			preMap = [],
			postMap = [],
			preexisting = results.length,

			// Get initial elements from seed or context
			elems = seed || multipleContexts(
				selector || "*",
				context.nodeType ? [ context ] : context,
				[]
			),

			// Prefilter to get matcher input, preserving a map for seed-results synchronization
			matcherIn = preFilter && ( seed || !selector ) ?
				condense( elems, preMap, preFilter, context, xml ) :
				elems,

			matcherOut = matcher ?

				// If we have a postFinder, or filtered seed, or non-seed postFilter or preexisting results,
				postFinder || ( seed ? preFilter : preexisting || postFilter ) ?

					// ...intermediate processing is necessary
					[] :

					// ...otherwise use results directly
					results :
				matcherIn;

		// Find primary matches
		if ( matcher ) {
			matcher( matcherIn, matcherOut, context, xml );
		}

		// Apply postFilter
		if ( postFilter ) {
			temp = condense( matcherOut, postMap );
			postFilter( temp, [], context, xml );

			// Un-match failing elements by moving them back to matcherIn
			i = temp.length;
			while ( i-- ) {
				if ( ( elem = temp[ i ] ) ) {
					matcherOut[ postMap[ i ] ] = !( matcherIn[ postMap[ i ] ] = elem );
				}
			}
		}

		if ( seed ) {
			if ( postFinder || preFilter ) {
				if ( postFinder ) {

					// Get the final matcherOut by condensing this intermediate into postFinder contexts
					temp = [];
					i = matcherOut.length;
					while ( i-- ) {
						if ( ( elem = matcherOut[ i ] ) ) {

							// Restore matcherIn since elem is not yet a final match
							temp.push( ( matcherIn[ i ] = elem ) );
						}
					}
					postFinder( null, ( matcherOut = [] ), temp, xml );
				}

				// Move matched elements from seed to results to keep them synchronized
				i = matcherOut.length;
				while ( i-- ) {
					if ( ( elem = matcherOut[ i ] ) &&
						( temp = postFinder ? indexOf( seed, elem ) : preMap[ i ] ) > -1 ) {

						seed[ temp ] = !( results[ temp ] = elem );
					}
				}
			}

		// Add elements to results, through postFinder if defined
		} else {
			matcherOut = condense(
				matcherOut === results ?
					matcherOut.splice( preexisting, matcherOut.length ) :
					matcherOut
			);
			if ( postFinder ) {
				postFinder( null, results, matcherOut, xml );
			} else {
				push.apply( results, matcherOut );
			}
		}
	} );
}

function matcherFromTokens( tokens ) {
	var checkContext, matcher, j,
		len = tokens.length,
		leadingRelative = Expr.relative[ tokens[ 0 ].type ],
		implicitRelative = leadingRelative || Expr.relative[ " " ],
		i = leadingRelative ? 1 : 0,

		// The foundational matcher ensures that elements are reachable from top-level context(s)
		matchContext = addCombinator( function( elem ) {
			return elem === checkContext;
		}, implicitRelative, true ),
		matchAnyContext = addCombinator( function( elem ) {
			return indexOf( checkContext, elem ) > -1;
		}, implicitRelative, true ),
		matchers = [ function( elem, context, xml ) {
			var ret = ( !leadingRelative && ( xml || context !== outermostContext ) ) || (
				( checkContext = context ).nodeType ?
					matchContext( elem, context, xml ) :
					matchAnyContext( elem, context, xml ) );

			// Avoid hanging onto element (issue #299)
			checkContext = null;
			return ret;
		} ];

	for ( ; i < len; i++ ) {
		if ( ( matcher = Expr.relative[ tokens[ i ].type ] ) ) {
			matchers = [ addCombinator( elementMatcher( matchers ), matcher ) ];
		} else {
			matcher = Expr.filter[ tokens[ i ].type ].apply( null, tokens[ i ].matches );

			// Return special upon seeing a positional matcher
			if ( matcher[ expando ] ) {

				// Find the next relative operator (if any) for proper handling
				j = ++i;
				for ( ; j < len; j++ ) {
					if ( Expr.relative[ tokens[ j ].type ] ) {
						break;
					}
				}
				return setMatcher(
					i > 1 && elementMatcher( matchers ),
					i > 1 && toSelector(

					// If the preceding token was a descendant combinator, insert an implicit any-element `*`
					tokens
						.slice( 0, i - 1 )
						.concat( { value: tokens[ i - 2 ].type === " " ? "*" : "" } )
					).replace( rtrim, "$1" ),
					matcher,
					i < j && matcherFromTokens( tokens.slice( i, j ) ),
					j < len && matcherFromTokens( ( tokens = tokens.slice( j ) ) ),
					j < len && toSelector( tokens )
				);
			}
			matchers.push( matcher );
		}
	}

	return elementMatcher( matchers );
}

function matcherFromGroupMatchers( elementMatchers, setMatchers ) {
	var bySet = setMatchers.length > 0,
		byElement = elementMatchers.length > 0,
		superMatcher = function( seed, context, xml, results, outermost ) {
			var elem, j, matcher,
				matchedCount = 0,
				i = "0",
				unmatched = seed && [],
				setMatched = [],
				contextBackup = outermostContext,

				// We must always have either seed elements or outermost context
				elems = seed || byElement && Expr.find[ "TAG" ]( "*", outermost ),

				// Use integer dirruns iff this is the outermost matcher
				dirrunsUnique = ( dirruns += contextBackup == null ? 1 : Math.random() || 0.1 ),
				len = elems.length;

			if ( outermost ) {

				// Support: IE 11+, Edge 17 - 18+
				// IE/Edge sometimes throw a "Permission denied" error when strict-comparing
				// two documents; shallow comparisons work.
				// eslint-disable-next-line eqeqeq
				outermostContext = context == document || context || outermost;
			}

			// Add elements passing elementMatchers directly to results
			// Support: IE<9, Safari
			// Tolerate NodeList properties (IE: "length"; Safari: <number>) matching elements by id
			for ( ; i !== len && ( elem = elems[ i ] ) != null; i++ ) {
				if ( byElement && elem ) {
					j = 0;

					// Support: IE 11+, Edge 17 - 18+
					// IE/Edge sometimes throw a "Permission denied" error when strict-comparing
					// two documents; shallow comparisons work.
					// eslint-disable-next-line eqeqeq
					if ( !context && elem.ownerDocument != document ) {
						setDocument( elem );
						xml = !documentIsHTML;
					}
					while ( ( matcher = elementMatchers[ j++ ] ) ) {
						if ( matcher( elem, context || document, xml ) ) {
							results.push( elem );
							break;
						}
					}
					if ( outermost ) {
						dirruns = dirrunsUnique;
					}
				}

				// Track unmatched elements for set filters
				if ( bySet ) {

					// They will have gone through all possible matchers
					if ( ( elem = !matcher && elem ) ) {
						matchedCount--;
					}

					// Lengthen the array for every element, matched or not
					if ( seed ) {
						unmatched.push( elem );
					}
				}
			}

			// `i` is now the count of elements visited above, and adding it to `matchedCount`
			// makes the latter nonnegative.
			matchedCount += i;

			// Apply set filters to unmatched elements
			// NOTE: This can be skipped if there are no unmatched elements (i.e., `matchedCount`
			// equals `i`), unless we didn't visit _any_ elements in the above loop because we have
			// no element matchers and no seed.
			// Incrementing an initially-string "0" `i` allows `i` to remain a string only in that
			// case, which will result in a "00" `matchedCount` that differs from `i` but is also
			// numerically zero.
			if ( bySet && i !== matchedCount ) {
				j = 0;
				while ( ( matcher = setMatchers[ j++ ] ) ) {
					matcher( unmatched, setMatched, context, xml );
				}

				if ( seed ) {

					// Reintegrate element matches to eliminate the need for sorting
					if ( matchedCount > 0 ) {
						while ( i-- ) {
							if ( !( unmatched[ i ] || setMatched[ i ] ) ) {
								setMatched[ i ] = pop.call( results );
							}
						}
					}

					// Discard index placeholder values to get only actual matches
					setMatched = condense( setMatched );
				}

				// Add matches to results
				push.apply( results, setMatched );

				// Seedless set matches succeeding multiple successful matchers stipulate sorting
				if ( outermost && !seed && setMatched.length > 0 &&
					( matchedCount + setMatchers.length ) > 1 ) {

					Sizzle.uniqueSort( results );
				}
			}

			// Override manipulation of globals by nested matchers
			if ( outermost ) {
				dirruns = dirrunsUnique;
				outermostContext = contextBackup;
			}

			return unmatched;
		};

	return bySet ?
		markFunction( superMatcher ) :
		superMatcher;
}

compile = Sizzle.compile = function( selector, match /* Internal Use Only */ ) {
	var i,
		setMatchers = [],
		elementMatchers = [],
		cached = compilerCache[ selector + " " ];

	if ( !cached ) {

		// Generate a function of recursive functions that can be used to check each element
		if ( !match ) {
			match = tokenize( selector );
		}
		i = match.length;
		while ( i-- ) {
			cached = matcherFromTokens( match[ i ] );
			if ( cached[ expando ] ) {
				setMatchers.push( cached );
			} else {
				elementMatchers.push( cached );
			}
		}

		// Cache the compiled function
		cached = compilerCache(
			selector,
			matcherFromGroupMatchers( elementMatchers, setMatchers )
		);

		// Save selector and tokenization
		cached.selector = selector;
	}
	return cached;
};

/**
 * A low-level selection function that works with Sizzle's compiled
 *  selector functions
 * @param {String|Function} selector A selector or a pre-compiled
 *  selector function built with Sizzle.compile
 * @param {Element} context
 * @param {Array} [results]
 * @param {Array} [seed] A set of elements to match against
 */
select = Sizzle.select = function( selector, context, results, seed ) {
	var i, tokens, token, type, find,
		compiled = typeof selector === "function" && selector,
		match = !seed && tokenize( ( selector = compiled.selector || selector ) );

	results = results || [];

	// Try to minimize operations if there is only one selector in the list and no seed
	// (the latter of which guarantees us context)
	if ( match.length === 1 ) {

		// Reduce context if the leading compound selector is an ID
		tokens = match[ 0 ] = match[ 0 ].slice( 0 );
		if ( tokens.length > 2 && ( token = tokens[ 0 ] ).type === "ID" &&
			context.nodeType === 9 && documentIsHTML && Expr.relative[ tokens[ 1 ].type ] ) {

			context = ( Expr.find[ "ID" ]( token.matches[ 0 ]
				.replace( runescape, funescape ), context ) || [] )[ 0 ];
			if ( !context ) {
				return results;

			// Precompiled matchers will still verify ancestry, so step up a level
			} else if ( compiled ) {
				context = context.parentNode;
			}

			selector = selector.slice( tokens.shift().value.length );
		}

		// Fetch a seed set for right-to-left matching
		i = matchExpr[ "needsContext" ].test( selector ) ? 0 : tokens.length;
		while ( i-- ) {
			token = tokens[ i ];

			// Abort if we hit a combinator
			if ( Expr.relative[ ( type = token.type ) ] ) {
				break;
			}
			if ( ( find = Expr.find[ type ] ) ) {

				// Search, expanding context for leading sibling combinators
				if ( ( seed = find(
					token.matches[ 0 ].replace( runescape, funescape ),
					rsibling.test( tokens[ 0 ].type ) && testContext( context.parentNode ) ||
						context
				) ) ) {

					// If seed is empty or no tokens remain, we can return early
					tokens.splice( i, 1 );
					selector = seed.length && toSelector( tokens );
					if ( !selector ) {
						push.apply( results, seed );
						return results;
					}

					break;
				}
			}
		}
	}

	// Compile and execute a filtering function if one is not provided
	// Provide `match` to avoid retokenization if we modified the selector above
	( compiled || compile( selector, match ) )(
		seed,
		context,
		!documentIsHTML,
		results,
		!context || rsibling.test( selector ) && testContext( context.parentNode ) || context
	);
	return results;
};

// One-time assignments

// Sort stability
support.sortStable = expando.split( "" ).sort( sortOrder ).join( "" ) === expando;

// Support: Chrome 14-35+
// Always assume duplicates if they aren't passed to the comparison function
support.detectDuplicates = !!hasDuplicate;

// Initialize against the default document
setDocument();

// Support: Webkit<537.32 - Safari 6.0.3/Chrome 25 (fixed in Chrome 27)
// Detached nodes confoundingly follow *each other*
support.sortDetached = assert( function( el ) {

	// Should return 1, but returns 4 (following)
	return el.compareDocumentPosition( document.createElement( "fieldset" ) ) & 1;
} );

// Support: IE<8
// Prevent attribute/property "interpolation"
// https://msdn.microsoft.com/en-us/library/ms536429%28VS.85%29.aspx
if ( !assert( function( el ) {
	el.innerHTML = "<a href='#'></a>";
	return el.firstChild.getAttribute( "href" ) === "#";
} ) ) {
	addHandle( "type|href|height|width", function( elem, name, isXML ) {
		if ( !isXML ) {
			return elem.getAttribute( name, name.toLowerCase() === "type" ? 1 : 2 );
		}
	} );
}

// Support: IE<9
// Use defaultValue in place of getAttribute("value")
if ( !support.attributes || !assert( function( el ) {
	el.innerHTML = "<input/>";
	el.firstChild.setAttribute( "value", "" );
	return el.firstChild.getAttribute( "value" ) === "";
} ) ) {
	addHandle( "value", function( elem, _name, isXML ) {
		if ( !isXML && elem.nodeName.toLowerCase() === "input" ) {
			return elem.defaultValue;
		}
	} );
}

// Support: IE<9
// Use getAttributeNode to fetch booleans when getAttribute lies
if ( !assert( function( el ) {
	return el.getAttribute( "disabled" ) == null;
} ) ) {
	addHandle( booleans, function( elem, name, isXML ) {
		var val;
		if ( !isXML ) {
			return elem[ name ] === true ? name.toLowerCase() :
				( val = elem.getAttributeNode( name ) ) && val.specified ?
					val.value :
					null;
		}
	} );
}

return Sizzle;

} )( window );



jQuery.find = Sizzle;
jQuery.expr = Sizzle.selectors;

// Deprecated
jQuery.expr[ ":" ] = jQuery.expr.pseudos;
jQuery.uniqueSort = jQuery.unique = Sizzle.uniqueSort;
jQuery.text = Sizzle.getText;
jQuery.isXMLDoc = Sizzle.isXML;
jQuery.contains = Sizzle.contains;
jQuery.escapeSelector = Sizzle.escape;




var dir = function( elem, dir, until ) {
	var matched = [],
		truncate = until !== undefined;

	while ( ( elem = elem[ dir ] ) && elem.nodeType !== 9 ) {
		if ( elem.nodeType === 1 ) {
			if ( truncate && jQuery( elem ).is( until ) ) {
				break;
			}
			matched.push( elem );
		}
	}
	return matched;
};


var siblings = function( n, elem ) {
	var matched = [];

	for ( ; n; n = n.nextSibling ) {
		if ( n.nodeType === 1 && n !== elem ) {
			matched.push( n );
		}
	}

	return matched;
};


var rneedsContext = jQuery.expr.match.needsContext;



function nodeName( elem, name ) {

	return elem.nodeName && elem.nodeName.toLowerCase() === name.toLowerCase();

}
var rsingleTag = ( /^<([a-z][^\/\0>:\x20\t\r\n\f]*)[\x20\t\r\n\f]*\/?>(?:<\/\1>|)$/i );



// Implement the identical functionality for filter and not
function winnow( elements, qualifier, not ) {
	if ( isFunction( qualifier ) ) {
		return jQuery.grep( elements, function( elem, i ) {
			return !!qualifier.call( elem, i, elem ) !== not;
		} );
	}

	// Single element
	if ( qualifier.nodeType ) {
		return jQuery.grep( elements, function( elem ) {
			return ( elem === qualifier ) !== not;
		} );
	}

	// Arraylike of elements (jQuery, arguments, Array)
	if ( typeof qualifier !== "string" ) {
		return jQuery.grep( elements, function( elem ) {
			return ( indexOf.call( qualifier, elem ) > -1 ) !== not;
		} );
	}

	// Filtered directly for both simple and complex selectors
	return jQuery.filter( qualifier, elements, not );
}

jQuery.filter = function( expr, elems, not ) {
	var elem = elems[ 0 ];

	if ( not ) {
		expr = ":not(" + expr + ")";
	}

	if ( elems.length === 1 && elem.nodeType === 1 ) {
		return jQuery.find.matchesSelector( elem, expr ) ? [ elem ] : [];
	}

	return jQuery.find.matches( expr, jQuery.grep( elems, function( elem ) {
		return elem.nodeType === 1;
	} ) );
};

jQuery.fn.extend( {
	find: function( selector ) {
		var i, ret,
			len = this.length,
			self = this;

		if ( typeof selector !== "string" ) {
			return this.pushStack( jQuery( selector ).filter( function() {
				for ( i = 0; i < len; i++ ) {
					if ( jQuery.contains( self[ i ], this ) ) {
						return true;
					}
				}
			} ) );
		}

		ret = this.pushStack( [] );

		for ( i = 0; i < len; i++ ) {
			jQuery.find( selector, self[ i ], ret );
		}

		return len > 1 ? jQuery.uniqueSort( ret ) : ret;
	},
	filter: function( selector ) {
		return this.pushStack( winnow( this, selector || [], false ) );
	},
	not: function( selector ) {
		return this.pushStack( winnow( this, selector || [], true ) );
	},
	is: function( selector ) {
		return !!winnow(
			this,

			// If this is a positional/relative selector, check membership in the returned set
			// so $("p:first").is("p:last") won't return true for a doc with two "p".
			typeof selector === "string" && rneedsContext.test( selector ) ?
				jQuery( selector ) :
				selector || [],
			false
		).length;
	}
} );


// Initialize a jQuery object


// A central reference to the root jQuery(document)
var rootjQuery,

	// A simple way to check for HTML strings
	// Prioritize #id over <tag> to avoid XSS via location.hash (#9521)
	// Strict HTML recognition (#11290: must start with <)
	// Shortcut simple #id case for speed
	rquickExpr = /^(?:\s*(<[\w\W]+>)[^>]*|#([\w-]+))$/,

	init = jQuery.fn.init = function( selector, context, root ) {
		var match, elem;

		// HANDLE: $(""), $(null), $(undefined), $(false)
		if ( !selector ) {
			return this;
		}

		// Method init() accepts an alternate rootjQuery
		// so migrate can support jQuery.sub (gh-2101)
		root = root || rootjQuery;

		// Handle HTML strings
		if ( typeof selector === "string" ) {
			if ( selector[ 0 ] === "<" &&
				selector[ selector.length - 1 ] === ">" &&
				selector.length >= 3 ) {

				// Assume that strings that start and end with <> are HTML and skip the regex check
				match = [ null, selector, null ];

			} else {
				match = rquickExpr.exec( selector );
			}

			// Match html or make sure no context is specified for #id
			if ( match && ( match[ 1 ] || !context ) ) {

				// HANDLE: $(html) -> $(array)
				if ( match[ 1 ] ) {
					context = context instanceof jQuery ? context[ 0 ] : context;

					// Option to run scripts is true for back-compat
					// Intentionally let the error be thrown if parseHTML is not present
					jQuery.merge( this, jQuery.parseHTML(
						match[ 1 ],
						context && context.nodeType ? context.ownerDocument || context : document,
						true
					) );

					// HANDLE: $(html, props)
					if ( rsingleTag.test( match[ 1 ] ) && jQuery.isPlainObject( context ) ) {
						for ( match in context ) {

							// Properties of context are called as methods if possible
							if ( isFunction( this[ match ] ) ) {
								this[ match ]( context[ match ] );

							// ...and otherwise set as attributes
							} else {
								this.attr( match, context[ match ] );
							}
						}
					}

					return this;

				// HANDLE: $(#id)
				} else {
					elem = document.getElementById( match[ 2 ] );

					if ( elem ) {

						// Inject the element directly into the jQuery object
						this[ 0 ] = elem;
						this.length = 1;
					}
					return this;
				}

			// HANDLE: $(expr, $(...))
			} else if ( !context || context.jquery ) {
				return ( context || root ).find( selector );

			// HANDLE: $(expr, context)
			// (which is just equivalent to: $(context).find(expr)
			} else {
				return this.constructor( context ).find( selector );
			}

		// HANDLE: $(DOMElement)
		} else if ( selector.nodeType ) {
			this[ 0 ] = selector;
			this.length = 1;
			return this;

		// HANDLE: $(function)
		// Shortcut for document ready
		} else if ( isFunction( selector ) ) {
			return root.ready !== undefined ?
				root.ready( selector ) :

				// Execute immediately if ready is not present
				selector( jQuery );
		}

		return jQuery.makeArray( selector, this );
	};

// Give the init function the jQuery prototype for later instantiation
init.prototype = jQuery.fn;

// Initialize central reference
rootjQuery = jQuery( document );


var rparentsprev = /^(?:parents|prev(?:Until|All))/,

	// Methods guaranteed to produce a unique set when starting from a unique set
	guaranteedUnique = {
		children: true,
		contents: true,
		next: true,
		prev: true
	};

jQuery.fn.extend( {
	has: function( target ) {
		var targets = jQuery( target, this ),
			l = targets.length;

		return this.filter( function() {
			var i = 0;
			for ( ; i < l; i++ ) {
				if ( jQuery.contains( this, targets[ i ] ) ) {
					return true;
				}
			}
		} );
	},

	closest: function( selectors, context ) {
		var cur,
			i = 0,
			l = this.length,
			matched = [],
			targets = typeof selectors !== "string" && jQuery( selectors );

		// Positional selectors never match, since there's no _selection_ context
		if ( !rneedsContext.test( selectors ) ) {
			for ( ; i < l; i++ ) {
				for ( cur = this[ i ]; cur && cur !== context; cur = cur.parentNode ) {

					// Always skip document fragments
					if ( cur.nodeType < 11 && ( targets ?
						targets.index( cur ) > -1 :

						// Don't pass non-elements to Sizzle
						cur.nodeType === 1 &&
							jQuery.find.matchesSelector( cur, selectors ) ) ) {

						matched.push( cur );
						break;
					}
				}
			}
		}

		return this.pushStack( matched.length > 1 ? jQuery.uniqueSort( matched ) : matched );
	},

	// Determine the position of an element within the set
	index: function( elem ) {

		// No argument, return index in parent
		if ( !elem ) {
			return ( this[ 0 ] && this[ 0 ].parentNode ) ? this.first().prevAll().length : -1;
		}

		// Index in selector
		if ( typeof elem === "string" ) {
			return indexOf.call( jQuery( elem ), this[ 0 ] );
		}

		// Locate the position of the desired element
		return indexOf.call( this,

			// If it receives a jQuery object, the first element is used
			elem.jquery ? elem[ 0 ] : elem
		);
	},

	add: function( selector, context ) {
		return this.pushStack(
			jQuery.uniqueSort(
				jQuery.merge( this.get(), jQuery( selector, context ) )
			)
		);
	},

	addBack: function( selector ) {
		return this.add( selector == null ?
			this.prevObject : this.prevObject.filter( selector )
		);
	}
} );

function sibling( cur, dir ) {
	while ( ( cur = cur[ dir ] ) && cur.nodeType !== 1 ) {}
	return cur;
}

jQuery.each( {
	parent: function( elem ) {
		var parent = elem.parentNode;
		return parent && parent.nodeType !== 11 ? parent : null;
	},
	parents: function( elem ) {
		return dir( elem, "parentNode" );
	},
	parentsUntil: function( elem, _i, until ) {
		return dir( elem, "parentNode", until );
	},
	next: function( elem ) {
		return sibling( elem, "nextSibling" );
	},
	prev: function( elem ) {
		return sibling( elem, "previousSibling" );
	},
	nextAll: function( elem ) {
		return dir( elem, "nextSibling" );
	},
	prevAll: function( elem ) {
		return dir( elem, "previousSibling" );
	},
	nextUntil: function( elem, _i, until ) {
		return dir( elem, "nextSibling", until );
	},
	prevUntil: function( elem, _i, until ) {
		return dir( elem, "previousSibling", until );
	},
	siblings: function( elem ) {
		return siblings( ( elem.parentNode || {} ).firstChild, elem );
	},
	children: function( elem ) {
		return siblings( elem.firstChild );
	},
	contents: function( elem ) {
		if ( elem.contentDocument != null &&

			// Support: IE 11+
			// <object> elements with no `data` attribute has an object
			// `contentDocument` with a `null` prototype.
			getProto( elem.contentDocument ) ) {

			return elem.contentDocument;
		}

		// Support: IE 9 - 11 only, iOS 7 only, Android Browser <=4.3 only
		// Treat the template element as a regular one in browsers that
		// don't support it.
		if ( nodeName( elem, "template" ) ) {
			elem = elem.content || elem;
		}

		return jQuery.merge( [], elem.childNodes );
	}
}, function( name, fn ) {
	jQuery.fn[ name ] = function( until, selector ) {
		var matched = jQuery.map( this, fn, until );

		if ( name.slice( -5 ) !== "Until" ) {
			selector = until;
		}

		if ( selector && typeof selector === "string" ) {
			matched = jQuery.filter( selector, matched );
		}

		if ( this.length > 1 ) {

			// Remove duplicates
			if ( !guaranteedUnique[ name ] ) {
				jQuery.uniqueSort( matched );
			}

			// Reverse order for parents* and prev-derivatives
			if ( rparentsprev.test( name ) ) {
				matched.reverse();
			}
		}

		return this.pushStack( matched );
	};
} );
var rnothtmlwhite = ( /[^\x20\t\r\n\f]+/g );



// Convert String-formatted options into Object-formatted ones
function createOptions( options ) {
	var object = {};
	jQuery.each( options.match( rnothtmlwhite ) || [], function( _, flag ) {
		object[ flag ] = true;
	} );
	return object;
}

/*
 * Create a callback list using the following parameters:
 *
 *	options: an optional list of space-separated options that will change how
 *			the callback list behaves or a more traditional option object
 *
 * By default a callback list will act like an event callback list and can be
 * "fired" multiple times.
 *
 * Possible options:
 *
 *	once:			will ensure the callback list can only be fired once (like a Deferred)
 *
 *	memory:			will keep track of previous values and will call any callback added
 *					after the list has been fired right away with the latest "memorized"
 *					values (like a Deferred)
 *
 *	unique:			will ensure a callback can only be added once (no duplicate in the list)
 *
 *	stopOnFalse:	interrupt callings when a callback returns false
 *
 */
jQuery.Callbacks = function( options ) {

	// Convert options from String-formatted to Object-formatted if needed
	// (we check in cache first)
	options = typeof options === "string" ?
		createOptions( options ) :
		jQuery.extend( {}, options );

	var // Flag to know if list is currently firing
		firing,

		// Last fire value for non-forgettable lists
		memory,

		// Flag to know if list was already fired
		fired,

		// Flag to prevent firing
		locked,

		// Actual callback list
		list = [],

		// Queue of execution data for repeatable lists
		queue = [],

		// Index of currently firing callback (modified by add/remove as needed)
		firingIndex = -1,

		// Fire callbacks
		fire = function() {

			// Enforce single-firing
			locked = locked || options.once;

			// Execute callbacks for all pending executions,
			// respecting firingIndex overrides and runtime changes
			fired = firing = true;
			for ( ; queue.length; firingIndex = -1 ) {
				memory = queue.shift();
				while ( ++firingIndex < list.length ) {

					// Run callback and check for early termination
					if ( list[ firingIndex ].apply( memory[ 0 ], memory[ 1 ] ) === false &&
						options.stopOnFalse ) {

						// Jump to end and forget the data so .add doesn't re-fire
						firingIndex = list.length;
						memory = false;
					}
				}
			}

			// Forget the data if we're done with it
			if ( !options.memory ) {
				memory = false;
			}

			firing = false;

			// Clean up if we're done firing for good
			if ( locked ) {

				// Keep an empty list if we have data for future add calls
				if ( memory ) {
					list = [];

				// Otherwise, this object is spent
				} else {
					list = "";
				}
			}
		},

		// Actual Callbacks object
		self = {

			// Add a callback or a collection of callbacks to the list
			add: function() {
				if ( list ) {

					// If we have memory from a past run, we should fire after adding
					if ( memory && !firing ) {
						firingIndex = list.length - 1;
						queue.push( memory );
					}

					( function add( args ) {
						jQuery.each( args, function( _, arg ) {
							if ( isFunction( arg ) ) {
								if ( !options.unique || !self.has( arg ) ) {
									list.push( arg );
								}
							} else if ( arg && arg.length && toType( arg ) !== "string" ) {

								// Inspect recursively
								add( arg );
							}
						} );
					} )( arguments );

					if ( memory && !firing ) {
						fire();
					}
				}
				return this;
			},

			// Remove a callback from the list
			remove: function() {
				jQuery.each( arguments, function( _, arg ) {
					var index;
					while ( ( index = jQuery.inArray( arg, list, index ) ) > -1 ) {
						list.splice( index, 1 );

						// Handle firing indexes
						if ( index <= firingIndex ) {
							firingIndex--;
						}
					}
				} );
				return this;
			},

			// Check if a given callback is in the list.
			// If no argument is given, return whether or not list has callbacks attached.
			has: function( fn ) {
				return fn ?
					jQuery.inArray( fn, list ) > -1 :
					list.length > 0;
			},

			// Remove all callbacks from the list
			empty: function() {
				if ( list ) {
					list = [];
				}
				return this;
			},

			// Disable .fire and .add
			// Abort any current/pending executions
			// Clear all callbacks and values
			disable: function() {
				locked = queue = [];
				list = memory = "";
				return this;
			},
			disabled: function() {
				return !list;
			},

			// Disable .fire
			// Also disable .add unless we have memory (since it would have no effect)
			// Abort any pending executions
			lock: function() {
				locked = queue = [];
				if ( !memory && !firing ) {
					list = memory = "";
				}
				return this;
			},
			locked: function() {
				return !!locked;
			},

			// Call all callbacks with the given context and arguments
			fireWith: function( context, args ) {
				if ( !locked ) {
					args = args || [];
					args = [ context, args.slice ? args.slice() : args ];
					queue.push( args );
					if ( !firing ) {
						fire();
					}
				}
				return this;
			},

			// Call all the callbacks with the given arguments
			fire: function() {
				self.fireWith( this, arguments );
				return this;
			},

			// To know if the callbacks have already been called at least once
			fired: function() {
				return !!fired;
			}
		};

	return self;
};


function Identity( v ) {
	return v;
}
function Thrower( ex ) {
	throw ex;
}

function adoptValue( value, resolve, reject, noValue ) {
	var method;

	try {

		// Check for promise aspect first to privilege synchronous behavior
		if ( value && isFunction( ( method = value.promise ) ) ) {
			method.call( value ).done( resolve ).fail( reject );

		// Other thenables
		} else if ( value && isFunction( ( method = value.then ) ) ) {
			method.call( value, resolve, reject );

		// Other non-thenables
		} else {

			// Control `resolve` arguments by letting Array#slice cast boolean `noValue` to integer:
			// * false: [ value ].slice( 0 ) => resolve( value )
			// * true: [ value ].slice( 1 ) => resolve()
			resolve.apply( undefined, [ value ].slice( noValue ) );
		}

	// For Promises/A+, convert exceptions into rejections
	// Since jQuery.when doesn't unwrap thenables, we can skip the extra checks appearing in
	// Deferred#then to conditionally suppress rejection.
	} catch ( value ) {

		// Support: Android 4.0 only
		// Strict mode functions invoked without .call/.apply get global-object context
		reject.apply( undefined, [ value ] );
	}
}

jQuery.extend( {

	Deferred: function( func ) {
		var tuples = [

				// action, add listener, callbacks,
				// ... .then handlers, argument index, [final state]
				[ "notify", "progress", jQuery.Callbacks( "memory" ),
					jQuery.Callbacks( "memory" ), 2 ],
				[ "resolve", "done", jQuery.Callbacks( "once memory" ),
					jQuery.Callbacks( "once memory" ), 0, "resolved" ],
				[ "reject", "fail", jQuery.Callbacks( "once memory" ),
					jQuery.Callbacks( "once memory" ), 1, "rejected" ]
			],
			state = "pending",
			promise = {
				state: function() {
					return state;
				},
				always: function() {
					deferred.done( arguments ).fail( arguments );
					return this;
				},
				"catch": function( fn ) {
					return promise.then( null, fn );
				},

				// Keep pipe for back-compat
				pipe: function( /* fnDone, fnFail, fnProgress */ ) {
					var fns = arguments;

					return jQuery.Deferred( function( newDefer ) {
						jQuery.each( tuples, function( _i, tuple ) {

							// Map tuples (progress, done, fail) to arguments (done, fail, progress)
							var fn = isFunction( fns[ tuple[ 4 ] ] ) && fns[ tuple[ 4 ] ];

							// deferred.progress(function() { bind to newDefer or newDefer.notify })
							// deferred.done(function() { bind to newDefer or newDefer.resolve })
							// deferred.fail(function() { bind to newDefer or newDefer.reject })
							deferred[ tuple[ 1 ] ]( function() {
								var returned = fn && fn.apply( this, arguments );
								if ( returned && isFunction( returned.promise ) ) {
									returned.promise()
										.progress( newDefer.notify )
										.done( newDefer.resolve )
										.fail( newDefer.reject );
								} else {
									newDefer[ tuple[ 0 ] + "With" ](
										this,
										fn ? [ returned ] : arguments
									);
								}
							} );
						} );
						fns = null;
					} ).promise();
				},
				then: function( onFulfilled, onRejected, onProgress ) {
					var maxDepth = 0;
					function resolve( depth, deferred, handler, special ) {
						return function() {
							var that = this,
								args = arguments,
								mightThrow = function() {
									var returned, then;

									// Support: Promises/A+ section 2.3.3.3.3
									// https://promisesaplus.com/#point-59
									// Ignore double-resolution attempts
									if ( depth < maxDepth ) {
										return;
									}

									returned = handler.apply( that, args );

									// Support: Promises/A+ section 2.3.1
									// https://promisesaplus.com/#point-48
									if ( returned === deferred.promise() ) {
										throw new TypeError( "Thenable self-resolution" );
									}

									// Support: Promises/A+ sections 2.3.3.1, 3.5
									// https://promisesaplus.com/#point-54
									// https://promisesaplus.com/#point-75
									// Retrieve `then` only once
									then = returned &&

										// Support: Promises/A+ section 2.3.4
										// https://promisesaplus.com/#point-64
										// Only check objects and functions for thenability
										( typeof returned === "object" ||
											typeof returned === "function" ) &&
										returned.then;

									// Handle a returned thenable
									if ( isFunction( then ) ) {

										// Special processors (notify) just wait for resolution
										if ( special ) {
											then.call(
												returned,
												resolve( maxDepth, deferred, Identity, special ),
												resolve( maxDepth, deferred, Thrower, special )
											);

										// Normal processors (resolve) also hook into progress
										} else {

											// ...and disregard older resolution values
											maxDepth++;

											then.call(
												returned,
												resolve( maxDepth, deferred, Identity, special ),
												resolve( maxDepth, deferred, Thrower, special ),
												resolve( maxDepth, deferred, Identity,
													deferred.notifyWith )
											);
										}

									// Handle all other returned values
									} else {

										// Only substitute handlers pass on context
										// and multiple values (non-spec behavior)
										if ( handler !== Identity ) {
											that = undefined;
											args = [ returned ];
										}

										// Process the value(s)
										// Default process is resolve
										( special || deferred.resolveWith )( that, args );
									}
								},

								// Only normal processors (resolve) catch and reject exceptions
								process = special ?
									mightThrow :
									function() {
										try {
											mightThrow();
										} catch ( e ) {

											if ( jQuery.Deferred.exceptionHook ) {
												jQuery.Deferred.exceptionHook( e,
													process.stackTrace );
											}

											// Support: Promises/A+ section 2.3.3.3.4.1
											// https://promisesaplus.com/#point-61
											// Ignore post-resolution exceptions
											if ( depth + 1 >= maxDepth ) {

												// Only substitute handlers pass on context
												// and multiple values (non-spec behavior)
												if ( handler !== Thrower ) {
													that = undefined;
													args = [ e ];
												}

												deferred.rejectWith( that, args );
											}
										}
									};

							// Support: Promises/A+ section 2.3.3.3.1
							// https://promisesaplus.com/#point-57
							// Re-resolve promises immediately to dodge false rejection from
							// subsequent errors
							if ( depth ) {
								process();
							} else {

								// Call an optional hook to record the stack, in case of exception
								// since it's otherwise lost when execution goes async
								if ( jQuery.Deferred.getStackHook ) {
									process.stackTrace = jQuery.Deferred.getStackHook();
								}
								window.setTimeout( process );
							}
						};
					}

					return jQuery.Deferred( function( newDefer ) {

						// progress_handlers.add( ... )
						tuples[ 0 ][ 3 ].add(
							resolve(
								0,
								newDefer,
								isFunction( onProgress ) ?
									onProgress :
									Identity,
								newDefer.notifyWith
							)
						);

						// fulfilled_handlers.add( ... )
						tuples[ 1 ][ 3 ].add(
							resolve(
								0,
								newDefer,
								isFunction( onFulfilled ) ?
									onFulfilled :
									Identity
							)
						);

						// rejected_handlers.add( ... )
						tuples[ 2 ][ 3 ].add(
							resolve(
								0,
								newDefer,
								isFunction( onRejected ) ?
									onRejected :
									Thrower
							)
						);
					} ).promise();
				},

				// Get a promise for this deferred
				// If obj is provided, the promise aspect is added to the object
				promise: function( obj ) {
					return obj != null ? jQuery.extend( obj, promise ) : promise;
				}
			},
			deferred = {};

		// Add list-specific methods
		jQuery.each( tuples, function( i, tuple ) {
			var list = tuple[ 2 ],
				stateString = tuple[ 5 ];

			// promise.progress = list.add
			// promise.done = list.add
			// promise.fail = list.add
			promise[ tuple[ 1 ] ] = list.add;

			// Handle state
			if ( stateString ) {
				list.add(
					function() {

						// state = "resolved" (i.e., fulfilled)
						// state = "rejected"
						state = stateString;
					},

					// rejected_callbacks.disable
					// fulfilled_callbacks.disable
					tuples[ 3 - i ][ 2 ].disable,

					// rejected_handlers.disable
					// fulfilled_handlers.disable
					tuples[ 3 - i ][ 3 ].disable,

					// progress_callbacks.lock
					tuples[ 0 ][ 2 ].lock,

					// progress_handlers.lock
					tuples[ 0 ][ 3 ].lock
				);
			}

			// progress_handlers.fire
			// fulfilled_handlers.fire
			// rejected_handlers.fire
			list.add( tuple[ 3 ].fire );

			// deferred.notify = function() { deferred.notifyWith(...) }
			// deferred.resolve = function() { deferred.resolveWith(...) }
			// deferred.reject = function() { deferred.rejectWith(...) }
			deferred[ tuple[ 0 ] ] = function() {
				deferred[ tuple[ 0 ] + "With" ]( this === deferred ? undefined : this, arguments );
				return this;
			};

			// deferred.notifyWith = list.fireWith
			// deferred.resolveWith = list.fireWith
			// deferred.rejectWith = list.fireWith
			deferred[ tuple[ 0 ] + "With" ] = list.fireWith;
		} );

		// Make the deferred a promise
		promise.promise( deferred );

		// Call given func if any
		if ( func ) {
			func.call( deferred, deferred );
		}

		// All done!
		return deferred;
	},

	// Deferred helper
	when: function( singleValue ) {
		var

			// count of uncompleted subordinates
			remaining = arguments.length,

			// count of unprocessed arguments
			i = remaining,

			// subordinate fulfillment data
			resolveContexts = Array( i ),
			resolveValues = slice.call( arguments ),

			// the primary Deferred
			primary = jQuery.Deferred(),

			// subordinate callback factory
			updateFunc = function( i ) {
				return function( value ) {
					resolveContexts[ i ] = this;
					resolveValues[ i ] = arguments.length > 1 ? slice.call( arguments ) : value;
					if ( !( --remaining ) ) {
						primary.resolveWith( resolveContexts, resolveValues );
					}
				};
			};

		// Single- and empty arguments are adopted like Promise.resolve
		if ( remaining <= 1 ) {
			adoptValue( singleValue, primary.done( updateFunc( i ) ).resolve, primary.reject,
				!remaining );

			// Use .then() to unwrap secondary thenables (cf. gh-3000)
			if ( primary.state() === "pending" ||
				isFunction( resolveValues[ i ] && resolveValues[ i ].then ) ) {

				return primary.then();
			}
		}

		// Multiple arguments are aggregated like Promise.all array elements
		while ( i-- ) {
			adoptValue( resolveValues[ i ], updateFunc( i ), primary.reject );
		}

		return primary.promise();
	}
} );


// These usually indicate a programmer mistake during development,
// warn about them ASAP rather than swallowing them by default.
var rerrorNames = /^(Eval|Internal|Range|Reference|Syntax|Type|URI)Error$/;

jQuery.Deferred.exceptionHook = function( error, stack ) {

	// Support: IE 8 - 9 only
	// Console exists when dev tools are open, which can happen at any time
	if ( window.console && window.console.warn && error && rerrorNames.test( error.name ) ) {
		window.console.warn( "jQuery.Deferred exception: " + error.message, error.stack, stack );
	}
};




jQuery.readyException = function( error ) {
	window.setTimeout( function() {
		throw error;
	} );
};




// The deferred used on DOM ready
var readyList = jQuery.Deferred();

jQuery.fn.ready = function( fn ) {

	readyList
		.then( fn )

		// Wrap jQuery.readyException in a function so that the lookup
		// happens at the time of error handling instead of callback
		// registration.
		.catch( function( error ) {
			jQuery.readyException( error );
		} );

	return this;
};

jQuery.extend( {

	// Is the DOM ready to be used? Set to true once it occurs.
	isReady: false,

	// A counter to track how many items to wait for before
	// the ready event fires. See #6781
	readyWait: 1,

	// Handle when the DOM is ready
	ready: function( wait ) {

		// Abort if there are pending holds or we're already ready
		if ( wait === true ? --jQuery.readyWait : jQuery.isReady ) {
			return;
		}

		// Remember that the DOM is ready
		jQuery.isReady = true;

		// If a normal DOM Ready event fired, decrement, and wait if need be
		if ( wait !== true && --jQuery.readyWait > 0 ) {
			return;
		}

		// If there are functions bound, to execute
		readyList.resolveWith( document, [ jQuery ] );
	}
} );

jQuery.ready.then = readyList.then;

// The ready event handler and self cleanup method
function completed() {
	document.removeEventListener( "DOMContentLoaded", completed );
	window.removeEventListener( "load", completed );
	jQuery.ready();
}

// Catch cases where $(document).ready() is called
// after the browser event has already occurred.
// Support: IE <=9 - 10 only
// Older IE sometimes signals "interactive" too soon
if ( document.readyState === "complete" ||
	( document.readyState !== "loading" && !document.documentElement.doScroll ) ) {

	// Handle it asynchronously to allow scripts the opportunity to delay ready
	window.setTimeout( jQuery.ready );

} else {

	// Use the handy event callback
	document.addEventListener( "DOMContentLoaded", completed );

	// A fallback to window.onload, that will always work
	window.addEventListener( "load", completed );
}




// Multifunctional method to get and set values of a collection
// The value/s can optionally be executed if it's a function
var access = function( elems, fn, key, value, chainable, emptyGet, raw ) {
	var i = 0,
		len = elems.length,
		bulk = key == null;

	// Sets many values
	if ( toType( key ) === "object" ) {
		chainable = true;
		for ( i in key ) {
			access( elems, fn, i, key[ i ], true, emptyGet, raw );
		}

	// Sets one value
	} else if ( value !== undefined ) {
		chainable = true;

		if ( !isFunction( value ) ) {
			raw = true;
		}

		if ( bulk ) {

			// Bulk operations run against the entire set
			if ( raw ) {
				fn.call( elems, value );
				fn = null;

			// ...except when executing function values
			} else {
				bulk = fn;
				fn = function( elem, _key, value ) {
					return bulk.call( jQuery( elem ), value );
				};
			}
		}

		if ( fn ) {
			for ( ; i < len; i++ ) {
				fn(
					elems[ i ], key, raw ?
						value :
						value.call( elems[ i ], i, fn( elems[ i ], key ) )
				);
			}
		}
	}

	if ( chainable ) {
		return elems;
	}

	// Gets
	if ( bulk ) {
		return fn.call( elems );
	}

	return len ? fn( elems[ 0 ], key ) : emptyGet;
};


// Matches dashed string for camelizing
var rmsPrefix = /^-ms-/,
	rdashAlpha = /-([a-z])/g;

// Used by camelCase as callback to replace()
function fcamelCase( _all, letter ) {
	return letter.toUpperCase();
}

// Convert dashed to camelCase; used by the css and data modules
// Support: IE <=9 - 11, Edge 12 - 15
// Microsoft forgot to hump their vendor prefix (#9572)
function camelCase( string ) {
	return string.replace( rmsPrefix, "ms-" ).replace( rdashAlpha, fcamelCase );
}
var acceptData = function( owner ) {

	// Accepts only:
	//  - Node
	//    - Node.ELEMENT_NODE
	//    - Node.DOCUMENT_NODE
	//  - Object
	//    - Any
	return owner.nodeType === 1 || owner.nodeType === 9 || !( +owner.nodeType );
};




function Data() {
	this.expando = jQuery.expando + Data.uid++;
}

Data.uid = 1;

Data.prototype = {

	cache: function( owner ) {

		// Check if the owner object already has a cache
		var value = owner[ this.expando ];

		// If not, create one
		if ( !value ) {
			value = {};

			// We can accept data for non-element nodes in modern browsers,
			// but we should not, see #8335.
			// Always return an empty object.
			if ( acceptData( owner ) ) {

				// If it is a node unlikely to be stringify-ed or looped over
				// use plain assignment
				if ( owner.nodeType ) {
					owner[ this.expando ] = value;

				// Otherwise secure it in a non-enumerable property
				// configurable must be true to allow the property to be
				// deleted when data is removed
				} else {
					Object.defineProperty( owner, this.expando, {
						value: value,
						configurable: true
					} );
				}
			}
		}

		return value;
	},
	set: function( owner, data, value ) {
		var prop,
			cache = this.cache( owner );

		// Handle: [ owner, key, value ] args
		// Always use camelCase key (gh-2257)
		if ( typeof data === "string" ) {
			cache[ camelCase( data ) ] = value;

		// Handle: [ owner, { properties } ] args
		} else {

			// Copy the properties one-by-one to the cache object
			for ( prop in data ) {
				cache[ camelCase( prop ) ] = data[ prop ];
			}
		}
		return cache;
	},
	get: function( owner, key ) {
		return key === undefined ?
			this.cache( owner ) :

			// Always use camelCase key (gh-2257)
			owner[ this.expando ] && owner[ this.expando ][ camelCase( key ) ];
	},
	access: function( owner, key, value ) {

		// In cases where either:
		//
		//   1. No key was specified
		//   2. A string key was specified, but no value provided
		//
		// Take the "read" path and allow the get method to determine
		// which value to return, respectively either:
		//
		//   1. The entire cache object
		//   2. The data stored at the key
		//
		if ( key === undefined ||
				( ( key && typeof key === "string" ) && value === undefined ) ) {

			return this.get( owner, key );
		}

		// When the key is not a string, or both a key and value
		// are specified, set or extend (existing objects) with either:
		//
		//   1. An object of properties
		//   2. A key and value
		//
		this.set( owner, key, value );

		// Since the "set" path can have two possible entry points
		// return the expected data based on which path was taken[*]
		return value !== undefined ? value : key;
	},
	remove: function( owner, key ) {
		var i,
			cache = owner[ this.expando ];

		if ( cache === undefined ) {
			return;
		}

		if ( key !== undefined ) {

			// Support array or space separated string of keys
			if ( Array.isArray( key ) ) {

				// If key is an array of keys...
				// We always set camelCase keys, so remove that.
				key = key.map( camelCase );
			} else {
				key = camelCase( key );

				// If a key with the spaces exists, use it.
				// Otherwise, create an array by matching non-whitespace
				key = key in cache ?
					[ key ] :
					( key.match( rnothtmlwhite ) || [] );
			}

			i = key.length;

			while ( i-- ) {
				delete cache[ key[ i ] ];
			}
		}

		// Remove the expando if there's no more data
		if ( key === undefined || jQuery.isEmptyObject( cache ) ) {

			// Support: Chrome <=35 - 45
			// Webkit & Blink performance suffers when deleting properties
			// from DOM nodes, so set to undefined instead
			// https://bugs.chromium.org/p/chromium/issues/detail?id=378607 (bug restricted)
			if ( owner.nodeType ) {
				owner[ this.expando ] = undefined;
			} else {
				delete owner[ this.expando ];
			}
		}
	},
	hasData: function( owner ) {
		var cache = owner[ this.expando ];
		return cache !== undefined && !jQuery.isEmptyObject( cache );
	}
};
var dataPriv = new Data();

var dataUser = new Data();



//	Implementation Summary
//
//	1. Enforce API surface and semantic compatibility with 1.9.x branch
//	2. Improve the module's maintainability by reducing the storage
//		paths to a single mechanism.
//	3. Use the same single mechanism to support "private" and "user" data.
//	4. _Never_ expose "private" data to user code (TODO: Drop _data, _removeData)
//	5. Avoid exposing implementation details on user objects (eg. expando properties)
//	6. Provide a clear path for implementation upgrade to WeakMap in 2014

var rbrace = /^(?:\{[\w\W]*\}|\[[\w\W]*\])$/,
	rmultiDash = /[A-Z]/g;

function getData( data ) {
	if ( data === "true" ) {
		return true;
	}

	if ( data === "false" ) {
		return false;
	}

	if ( data === "null" ) {
		return null;
	}

	// Only convert to a number if it doesn't change the string
	if ( data === +data + "" ) {
		return +data;
	}

	if ( rbrace.test( data ) ) {
		return JSON.parse( data );
	}

	return data;
}

function dataAttr( elem, key, data ) {
	var name;

	// If nothing was found internally, try to fetch any
	// data from the HTML5 data-* attribute
	if ( data === undefined && elem.nodeType === 1 ) {
		name = "data-" + key.replace( rmultiDash, "-$&" ).toLowerCase();
		data = elem.getAttribute( name );

		if ( typeof data === "string" ) {
			try {
				data = getData( data );
			} catch ( e ) {}

			// Make sure we set the data so it isn't changed later
			dataUser.set( elem, key, data );
		} else {
			data = undefined;
		}
	}
	return data;
}

jQuery.extend( {
	hasData: function( elem ) {
		return dataUser.hasData( elem ) || dataPriv.hasData( elem );
	},

	data: function( elem, name, data ) {
		return dataUser.access( elem, name, data );
	},

	removeData: function( elem, name ) {
		dataUser.remove( elem, name );
	},

	// TODO: Now that all calls to _data and _removeData have been replaced
	// with direct calls to dataPriv methods, these can be deprecated.
	_data: function( elem, name, data ) {
		return dataPriv.access( elem, name, data );
	},

	_removeData: function( elem, name ) {
		dataPriv.remove( elem, name );
	}
} );

jQuery.fn.extend( {
	data: function( key, value ) {
		var i, name, data,
			elem = this[ 0 ],
			attrs = elem && elem.attributes;

		// Gets all values
		if ( key === undefined ) {
			if ( this.length ) {
				data = dataUser.get( elem );

				if ( elem.nodeType === 1 && !dataPriv.get( elem, "hasDataAttrs" ) ) {
					i = attrs.length;
					while ( i-- ) {

						// Support: IE 11 only
						// The attrs elements can be null (#14894)
						if ( attrs[ i ] ) {
							name = attrs[ i ].name;
							if ( name.indexOf( "data-" ) === 0 ) {
								name = camelCase( name.slice( 5 ) );
								dataAttr( elem, name, data[ name ] );
							}
						}
					}
					dataPriv.set( elem, "hasDataAttrs", true );
				}
			}

			return data;
		}

		// Sets multiple values
		if ( typeof key === "object" ) {
			return this.each( function() {
				dataUser.set( this, key );
			} );
		}

		return access( this, function( value ) {
			var data;

			// The calling jQuery object (element matches) is not empty
			// (and therefore has an element appears at this[ 0 ]) and the
			// `value` parameter was not undefined. An empty jQuery object
			// will result in `undefined` for elem = this[ 0 ] which will
			// throw an exception if an attempt to read a data cache is made.
			if ( elem && value === undefined ) {

				// Attempt to get data from the cache
				// The key will always be camelCased in Data
				data = dataUser.get( elem, key );
				if ( data !== undefined ) {
					return data;
				}

				// Attempt to "discover" the data in
				// HTML5 custom data-* attrs
				data = dataAttr( elem, key );
				if ( data !== undefined ) {
					return data;
				}

				// We tried really hard, but the data doesn't exist.
				return;
			}

			// Set the data...
			this.each( function() {

				// We always store the camelCased key
				dataUser.set( this, key, value );
			} );
		}, null, value, arguments.length > 1, null, true );
	},

	removeData: function( key ) {
		return this.each( function() {
			dataUser.remove( this, key );
		} );
	}
} );


jQuery.extend( {
	queue: function( elem, type, data ) {
		var queue;

		if ( elem ) {
			type = ( type || "fx" ) + "queue";
			queue = dataPriv.get( elem, type );

			// Speed up dequeue by getting out quickly if this is just a lookup
			if ( data ) {
				if ( !queue || Array.isArray( data ) ) {
					queue = dataPriv.access( elem, type, jQuery.makeArray( data ) );
				} else {
					queue.push( data );
				}
			}
			return queue || [];
		}
	},

	dequeue: function( elem, type ) {
		type = type || "fx";

		var queue = jQuery.queue( elem, type ),
			startLength = queue.length,
			fn = queue.shift(),
			hooks = jQuery._queueHooks( elem, type ),
			next = function() {
				jQuery.dequeue( elem, type );
			};

		// If the fx queue is dequeued, always remove the progress sentinel
		if ( fn === "inprogress" ) {
			fn = queue.shift();
			startLength--;
		}

		if ( fn ) {

			// Add a progress sentinel to prevent the fx queue from being
			// automatically dequeued
			if ( type === "fx" ) {
				queue.unshift( "inprogress" );
			}

			// Clear up the last queue stop function
			delete hooks.stop;
			fn.call( elem, next, hooks );
		}

		if ( !startLength && hooks ) {
			hooks.empty.fire();
		}
	},

	// Not public - generate a queueHooks object, or return the current one
	_queueHooks: function( elem, type ) {
		var key = type + "queueHooks";
		return dataPriv.get( elem, key ) || dataPriv.access( elem, key, {
			empty: jQuery.Callbacks( "once memory" ).add( function() {
				dataPriv.remove( elem, [ type + "queue", key ] );
			} )
		} );
	}
} );

jQuery.fn.extend( {
	queue: function( type, data ) {
		var setter = 2;

		if ( typeof type !== "string" ) {
			data = type;
			type = "fx";
			setter--;
		}

		if ( arguments.length < setter ) {
			return jQuery.queue( this[ 0 ], type );
		}

		return data === undefined ?
			this :
			this.each( function() {
				var queue = jQuery.queue( this, type, data );

				// Ensure a hooks for this queue
				jQuery._queueHooks( this, type );

				if ( type === "fx" && queue[ 0 ] !== "inprogress" ) {
					jQuery.dequeue( this, type );
				}
			} );
	},
	dequeue: function( type ) {
		return this.each( function() {
			jQuery.dequeue( this, type );
		} );
	},
	clearQueue: function( type ) {
		return this.queue( type || "fx", [] );
	},

	// Get a promise resolved when queues of a certain type
	// are emptied (fx is the type by default)
	promise: function( type, obj ) {
		var tmp,
			count = 1,
			defer = jQuery.Deferred(),
			elements = this,
			i = this.length,
			resolve = function() {
				if ( !( --count ) ) {
					defer.resolveWith( elements, [ elements ] );
				}
			};

		if ( typeof type !== "string" ) {
			obj = type;
			type = undefined;
		}
		type = type || "fx";

		while ( i-- ) {
			tmp = dataPriv.get( elements[ i ], type + "queueHooks" );
			if ( tmp && tmp.empty ) {
				count++;
				tmp.empty.add( resolve );
			}
		}
		resolve();
		return defer.promise( obj );
	}
} );
var pnum = ( /[+-]?(?:\d*\.|)\d+(?:[eE][+-]?\d+|)/ ).source;

var rcssNum = new RegExp( "^(?:([+-])=|)(" + pnum + ")([a-z%]*)$", "i" );


var cssExpand = [ "Top", "Right", "Bottom", "Left" ];

var documentElement = document.documentElement;



	var isAttached = function( elem ) {
			return jQuery.contains( elem.ownerDocument, elem );
		},
		composed = { composed: true };

	// Support: IE 9 - 11+, Edge 12 - 18+, iOS 10.0 - 10.2 only
	// Check attachment across shadow DOM boundaries when possible (gh-3504)
	// Support: iOS 10.0-10.2 only
	// Early iOS 10 versions support `attachShadow` but not `getRootNode`,
	// leading to errors. We need to check for `getRootNode`.
	if ( documentElement.getRootNode ) {
		isAttached = function( elem ) {
			return jQuery.contains( elem.ownerDocument, elem ) ||
				elem.getRootNode( composed ) === elem.ownerDocument;
		};
	}
var isHiddenWithinTree = function( elem, el ) {

		// isHiddenWithinTree might be called from jQuery#filter function;
		// in that case, element will be second argument
		elem = el || elem;

		// Inline style trumps all
		return elem.style.display === "none" ||
			elem.style.display === "" &&

			// Otherwise, check computed style
			// Support: Firefox <=43 - 45
			// Disconnected elements can have computed display: none, so first confirm that elem is
			// in the document.
			isAttached( elem ) &&

			jQuery.css( elem, "display" ) === "none";
	};



function adjustCSS( elem, prop, valueParts, tween ) {
	var adjusted, scale,
		maxIterations = 20,
		currentValue = tween ?
			function() {
				return tween.cur();
			} :
			function() {
				return jQuery.css( elem, prop, "" );
			},
		initial = currentValue(),
		unit = valueParts && valueParts[ 3 ] || ( jQuery.cssNumber[ prop ] ? "" : "px" ),

		// Starting value computation is required for potential unit mismatches
		initialInUnit = elem.nodeType &&
			( jQuery.cssNumber[ prop ] || unit !== "px" && +initial ) &&
			rcssNum.exec( jQuery.css( elem, prop ) );

	if ( initialInUnit && initialInUnit[ 3 ] !== unit ) {

		// Support: Firefox <=54
		// Halve the iteration target value to prevent interference from CSS upper bounds (gh-2144)
		initial = initial / 2;

		// Trust units reported by jQuery.css
		unit = unit || initialInUnit[ 3 ];

		// Iteratively approximate from a nonzero starting point
		initialInUnit = +initial || 1;

		while ( maxIterations-- ) {

			// Evaluate and update our best guess (doubling guesses that zero out).
			// Finish if the scale equals or crosses 1 (making the old*new product non-positive).
			jQuery.style( elem, prop, initialInUnit + unit );
			if ( ( 1 - scale ) * ( 1 - ( scale = currentValue() / initial || 0.5 ) ) <= 0 ) {
				maxIterations = 0;
			}
			initialInUnit = initialInUnit / scale;

		}

		initialInUnit = initialInUnit * 2;
		jQuery.style( elem, prop, initialInUnit + unit );

		// Make sure we update the tween properties later on
		valueParts = valueParts || [];
	}

	if ( valueParts ) {
		initialInUnit = +initialInUnit || +initial || 0;

		// Apply relative offset (+=/-=) if specified
		adjusted = valueParts[ 1 ] ?
			initialInUnit + ( valueParts[ 1 ] + 1 ) * valueParts[ 2 ] :
			+valueParts[ 2 ];
		if ( tween ) {
			tween.unit = unit;
			tween.start = initialInUnit;
			tween.end = adjusted;
		}
	}
	return adjusted;
}


var defaultDisplayMap = {};

function getDefaultDisplay( elem ) {
	var temp,
		doc = elem.ownerDocument,
		nodeName = elem.nodeName,
		display = defaultDisplayMap[ nodeName ];

	if ( display ) {
		return display;
	}

	temp = doc.body.appendChild( doc.createElement( nodeName ) );
	display = jQuery.css( temp, "display" );

	temp.parentNode.removeChild( temp );

	if ( display === "none" ) {
		display = "block";
	}
	defaultDisplayMap[ nodeName ] = display;

	return display;
}

function showHide( elements, show ) {
	var display, elem,
		values = [],
		index = 0,
		length = elements.length;

	// Determine new display value for elements that need to change
	for ( ; index < length; index++ ) {
		elem = elements[ index ];
		if ( !elem.style ) {
			continue;
		}

		display = elem.style.display;
		if ( show ) {

			// Since we force visibility upon cascade-hidden elements, an immediate (and slow)
			// check is required in this first loop unless we have a nonempty display value (either
			// inline or about-to-be-restored)
			if ( display === "none" ) {
				values[ index ] = dataPriv.get( elem, "display" ) || null;
				if ( !values[ index ] ) {
					elem.style.display = "";
				}
			}
			if ( elem.style.display === "" && isHiddenWithinTree( elem ) ) {
				values[ index ] = getDefaultDisplay( elem );
			}
		} else {
			if ( display !== "none" ) {
				values[ index ] = "none";

				// Remember what we're overwriting
				dataPriv.set( elem, "display", display );
			}
		}
	}

	// Set the display of the elements in a second loop to avoid constant reflow
	for ( index = 0; index < length; index++ ) {
		if ( values[ index ] != null ) {
			elements[ index ].style.display = values[ index ];
		}
	}

	return elements;
}

jQuery.fn.extend( {
	show: function() {
		return showHide( this, true );
	},
	hide: function() {
		return showHide( this );
	},
	toggle: function( state ) {
		if ( typeof state === "boolean" ) {
			return state ? this.show() : this.hide();
		}

		return this.each( function() {
			if ( isHiddenWithinTree( this ) ) {
				jQuery( this ).show();
			} else {
				jQuery( this ).hide();
			}
		} );
	}
} );
var rcheckableType = ( /^(?:checkbox|radio)$/i );

var rtagName = ( /<([a-z][^\/\0>\x20\t\r\n\f]*)/i );

var rscriptType = ( /^$|^module$|\/(?:java|ecma)script/i );



( function() {
	var fragment = document.createDocumentFragment(),
		div = fragment.appendChild( document.createElement( "div" ) ),
		input = document.createElement( "input" );

	// Support: Android 4.0 - 4.3 only
	// Check state lost if the name is set (#11217)
	// Support: Windows Web Apps (WWA)
	// `name` and `type` must use .setAttribute for WWA (#14901)
	input.setAttribute( "type", "radio" );
	input.setAttribute( "checked", "checked" );
	input.setAttribute( "name", "t" );

	div.appendChild( input );

	// Support: Android <=4.1 only
	// Older WebKit doesn't clone checked state correctly in fragments
	support.checkClone = div.cloneNode( true ).cloneNode( true ).lastChild.checked;

	// Support: IE <=11 only
	// Make sure textarea (and checkbox) defaultValue is properly cloned
	div.innerHTML = "<textarea>x</textarea>";
	support.noCloneChecked = !!div.cloneNode( true ).lastChild.defaultValue;

	// Support: IE <=9 only
	// IE <=9 replaces <option> tags with their contents when inserted outside of
	// the select element.
	div.innerHTML = "<option></option>";
	support.option = !!div.lastChild;
} )();


// We have to close these tags to support XHTML (#13200)
var wrapMap = {

	// XHTML parsers do not magically insert elements in the
	// same way that tag soup parsers do. So we cannot shorten
	// this by omitting <tbody> or other required elements.
	thead: [ 1, "<table>", "</table>" ],
	col: [ 2, "<table><colgroup>", "</colgroup></table>" ],
	tr: [ 2, "<table><tbody>", "</tbody></table>" ],
	td: [ 3, "<table><tbody><tr>", "</tr></tbody></table>" ],

	_default: [ 0, "", "" ]
};

wrapMap.tbody = wrapMap.tfoot = wrapMap.colgroup = wrapMap.caption = wrapMap.thead;
wrapMap.th = wrapMap.td;

// Support: IE <=9 only
if ( !support.option ) {
	wrapMap.optgroup = wrapMap.option = [ 1, "<select multiple='multiple'>", "</select>" ];
}


function getAll( context, tag ) {

	// Support: IE <=9 - 11 only
	// Use typeof to avoid zero-argument method invocation on host objects (#15151)
	var ret;

	if ( typeof context.getElementsByTagName !== "undefined" ) {
		ret = context.getElementsByTagName( tag || "*" );

	} else if ( typeof context.querySelectorAll !== "undefined" ) {
		ret = context.querySelectorAll( tag || "*" );

	} else {
		ret = [];
	}

	if ( tag === undefined || tag && nodeName( context, tag ) ) {
		return jQuery.merge( [ context ], ret );
	}

	return ret;
}


// Mark scripts as having already been evaluated
function setGlobalEval( elems, refElements ) {
	var i = 0,
		l = elems.length;

	for ( ; i < l; i++ ) {
		dataPriv.set(
			elems[ i ],
			"globalEval",
			!refElements || dataPriv.get( refElements[ i ], "globalEval" )
		);
	}
}


var rhtml = /<|&#?\w+;/;

function buildFragment( elems, context, scripts, selection, ignored ) {
	var elem, tmp, tag, wrap, attached, j,
		fragment = context.createDocumentFragment(),
		nodes = [],
		i = 0,
		l = elems.length;

	for ( ; i < l; i++ ) {
		elem = elems[ i ];

		if ( elem || elem === 0 ) {

			// Add nodes directly
			if ( toType( elem ) === "object" ) {

				// Support: Android <=4.0 only, PhantomJS 1 only
				// push.apply(_, arraylike) throws on ancient WebKit
				jQuery.merge( nodes, elem.nodeType ? [ elem ] : elem );

			// Convert non-html into a text node
			} else if ( !rhtml.test( elem ) ) {
				nodes.push( context.createTextNode( elem ) );

			// Convert html into DOM nodes
			} else {
				tmp = tmp || fragment.appendChild( context.createElement( "div" ) );

				// Deserialize a standard representation
				tag = ( rtagName.exec( elem ) || [ "", "" ] )[ 1 ].toLowerCase();
				wrap = wrapMap[ tag ] || wrapMap._default;
				tmp.innerHTML = wrap[ 1 ] + jQuery.htmlPrefilter( elem ) + wrap[ 2 ];

				// Descend through wrappers to the right content
				j = wrap[ 0 ];
				while ( j-- ) {
					tmp = tmp.lastChild;
				}

				// Support: Android <=4.0 only, PhantomJS 1 only
				// push.apply(_, arraylike) throws on ancient WebKit
				jQuery.merge( nodes, tmp.childNodes );

				// Remember the top-level container
				tmp = fragment.firstChild;

				// Ensure the created nodes are orphaned (#12392)
				tmp.textContent = "";
			}
		}
	}

	// Remove wrapper from fragment
	fragment.textContent = "";

	i = 0;
	while ( ( elem = nodes[ i++ ] ) ) {

		// Skip elements already in the context collection (trac-4087)
		if ( selection && jQuery.inArray( elem, selection ) > -1 ) {
			if ( ignored ) {
				ignored.push( elem );
			}
			continue;
		}

		attached = isAttached( elem );

		// Append to fragment
		tmp = getAll( fragment.appendChild( elem ), "script" );

		// Preserve script evaluation history
		if ( attached ) {
			setGlobalEval( tmp );
		}

		// Capture executables
		if ( scripts ) {
			j = 0;
			while ( ( elem = tmp[ j++ ] ) ) {
				if ( rscriptType.test( elem.type || "" ) ) {
					scripts.push( elem );
				}
			}
		}
	}

	return fragment;
}


var rtypenamespace = /^([^.]*)(?:\.(.+)|)/;

function returnTrue() {
	return true;
}

function returnFalse() {
	return false;
}

// Support: IE <=9 - 11+
// focus() and blur() are asynchronous, except when they are no-op.
// So expect focus to be synchronous when the element is already active,
// and blur to be synchronous when the element is not already active.
// (focus and blur are always synchronous in other supported browsers,
// this just defines when we can count on it).
function expectSync( elem, type ) {
	return ( elem === safeActiveElement() ) === ( type === "focus" );
}

// Support: IE <=9 only
// Accessing document.activeElement can throw unexpectedly
// https://bugs.jquery.com/ticket/13393
function safeActiveElement() {
	try {
		return document.activeElement;
	} catch ( err ) { }
}

function on( elem, types, selector, data, fn, one ) {
	var origFn, type;

	// Types can be a map of types/handlers
	if ( typeof types === "object" ) {

		// ( types-Object, selector, data )
		if ( typeof selector !== "string" ) {

			// ( types-Object, data )
			data = data || selector;
			selector = undefined;
		}
		for ( type in types ) {
			on( elem, type, selector, data, types[ type ], one );
		}
		return elem;
	}

	if ( data == null && fn == null ) {

		// ( types, fn )
		fn = selector;
		data = selector = undefined;
	} else if ( fn == null ) {
		if ( typeof selector === "string" ) {

			// ( types, selector, fn )
			fn = data;
			data = undefined;
		} else {

			// ( types, data, fn )
			fn = data;
			data = selector;
			selector = undefined;
		}
	}
	if ( fn === false ) {
		fn = returnFalse;
	} else if ( !fn ) {
		return elem;
	}

	if ( one === 1 ) {
		origFn = fn;
		fn = function( event ) {

			// Can use an empty set, since event contains the info
			jQuery().off( event );
			return origFn.apply( this, arguments );
		};

		// Use same guid so caller can remove using origFn
		fn.guid = origFn.guid || ( origFn.guid = jQuery.guid++ );
	}
	return elem.each( function() {
		jQuery.event.add( this, types, fn, data, selector );
	} );
}

/*
 * Helper functions for managing events -- not part of the public interface.
 * Props to Dean Edwards' addEvent library for many of the ideas.
 */
jQuery.event = {

	global: {},

	add: function( elem, types, handler, data, selector ) {

		var handleObjIn, eventHandle, tmp,
			events, t, handleObj,
			special, handlers, type, namespaces, origType,
			elemData = dataPriv.get( elem );

		// Only attach events to objects that accept data
		if ( !acceptData( elem ) ) {
			return;
		}

		// Caller can pass in an object of custom data in lieu of the handler
		if ( handler.handler ) {
			handleObjIn = handler;
			handler = handleObjIn.handler;
			selector = handleObjIn.selector;
		}

		// Ensure that invalid selectors throw exceptions at attach time
		// Evaluate against documentElement in case elem is a non-element node (e.g., document)
		if ( selector ) {
			jQuery.find.matchesSelector( documentElement, selector );
		}

		// Make sure that the handler has a unique ID, used to find/remove it later
		if ( !handler.guid ) {
			handler.guid = jQuery.guid++;
		}

		// Init the element's event structure and main handler, if this is the first
		if ( !( events = elemData.events ) ) {
			events = elemData.events = Object.create( null );
		}
		if ( !( eventHandle = elemData.handle ) ) {
			eventHandle = elemData.handle = function( e ) {

				// Discard the second event of a jQuery.event.trigger() and
				// when an event is called after a page has unloaded
				return typeof jQuery !== "undefined" && jQuery.event.triggered !== e.type ?
					jQuery.event.dispatch.apply( elem, arguments ) : undefined;
			};
		}

		// Handle multiple events separated by a space
		types = ( types || "" ).match( rnothtmlwhite ) || [ "" ];
		t = types.length;
		while ( t-- ) {
			tmp = rtypenamespace.exec( types[ t ] ) || [];
			type = origType = tmp[ 1 ];
			namespaces = ( tmp[ 2 ] || "" ).split( "." ).sort();

			// There *must* be a type, no attaching namespace-only handlers
			if ( !type ) {
				continue;
			}

			// If event changes its type, use the special event handlers for the changed type
			special = jQuery.event.special[ type ] || {};

			// If selector defined, determine special event api type, otherwise given type
			type = ( selector ? special.delegateType : special.bindType ) || type;

			// Update special based on newly reset type
			special = jQuery.event.special[ type ] || {};

			// handleObj is passed to all event handlers
			handleObj = jQuery.extend( {
				type: type,
				origType: origType,
				data: data,
				handler: handler,
				guid: handler.guid,
				selector: selector,
				needsContext: selector && jQuery.expr.match.needsContext.test( selector ),
				namespace: namespaces.join( "." )
			}, handleObjIn );

			// Init the event handler queue if we're the first
			if ( !( handlers = events[ type ] ) ) {
				handlers = events[ type ] = [];
				handlers.delegateCount = 0;

				// Only use addEventListener if the special events handler returns false
				if ( !special.setup ||
					special.setup.call( elem, data, namespaces, eventHandle ) === false ) {

					if ( elem.addEventListener ) {
						elem.addEventListener( type, eventHandle );
					}
				}
			}

			if ( special.add ) {
				special.add.call( elem, handleObj );

				if ( !handleObj.handler.guid ) {
					handleObj.handler.guid = handler.guid;
				}
			}

			// Add to the element's handler list, delegates in front
			if ( selector ) {
				handlers.splice( handlers.delegateCount++, 0, handleObj );
			} else {
				handlers.push( handleObj );
			}

			// Keep track of which events have ever been used, for event optimization
			jQuery.event.global[ type ] = true;
		}

	},

	// Detach an event or set of events from an element
	remove: function( elem, types, handler, selector, mappedTypes ) {

		var j, origCount, tmp,
			events, t, handleObj,
			special, handlers, type, namespaces, origType,
			elemData = dataPriv.hasData( elem ) && dataPriv.get( elem );

		if ( !elemData || !( events = elemData.events ) ) {
			return;
		}

		// Once for each type.namespace in types; type may be omitted
		types = ( types || "" ).match( rnothtmlwhite ) || [ "" ];
		t = types.length;
		while ( t-- ) {
			tmp = rtypenamespace.exec( types[ t ] ) || [];
			type = origType = tmp[ 1 ];
			namespaces = ( tmp[ 2 ] || "" ).split( "." ).sort();

			// Unbind all events (on this namespace, if provided) for the element
			if ( !type ) {
				for ( type in events ) {
					jQuery.event.remove( elem, type + types[ t ], handler, selector, true );
				}
				continue;
			}

			special = jQuery.event.special[ type ] || {};
			type = ( selector ? special.delegateType : special.bindType ) || type;
			handlers = events[ type ] || [];
			tmp = tmp[ 2 ] &&
				new RegExp( "(^|\\.)" + namespaces.join( "\\.(?:.*\\.|)" ) + "(\\.|$)" );

			// Remove matching events
			origCount = j = handlers.length;
			while ( j-- ) {
				handleObj = handlers[ j ];

				if ( ( mappedTypes || origType === handleObj.origType ) &&
					( !handler || handler.guid === handleObj.guid ) &&
					( !tmp || tmp.test( handleObj.namespace ) ) &&
					( !selector || selector === handleObj.selector ||
						selector === "**" && handleObj.selector ) ) {
					handlers.splice( j, 1 );

					if ( handleObj.selector ) {
						handlers.delegateCount--;
					}
					if ( special.remove ) {
						special.remove.call( elem, handleObj );
					}
				}
			}

			// Remove generic event handler if we removed something and no more handlers exist
			// (avoids potential for endless recursion during removal of special event handlers)
			if ( origCount && !handlers.length ) {
				if ( !special.teardown ||
					special.teardown.call( elem, namespaces, elemData.handle ) === false ) {

					jQuery.removeEvent( elem, type, elemData.handle );
				}

				delete events[ type ];
			}
		}

		// Remove data and the expando if it's no longer used
		if ( jQuery.isEmptyObject( events ) ) {
			dataPriv.remove( elem, "handle events" );
		}
	},

	dispatch: function( nativeEvent ) {

		var i, j, ret, matched, handleObj, handlerQueue,
			args = new Array( arguments.length ),

			// Make a writable jQuery.Event from the native event object
			event = jQuery.event.fix( nativeEvent ),

			handlers = (
				dataPriv.get( this, "events" ) || Object.create( null )
			)[ event.type ] || [],
			special = jQuery.event.special[ event.type ] || {};

		// Use the fix-ed jQuery.Event rather than the (read-only) native event
		args[ 0 ] = event;

		for ( i = 1; i < arguments.length; i++ ) {
			args[ i ] = arguments[ i ];
		}

		event.delegateTarget = this;

		// Call the preDispatch hook for the mapped type, and let it bail if desired
		if ( special.preDispatch && special.preDispatch.call( this, event ) === false ) {
			return;
		}

		// Determine handlers
		handlerQueue = jQuery.event.handlers.call( this, event, handlers );

		// Run delegates first; they may want to stop propagation beneath us
		i = 0;
		while ( ( matched = handlerQueue[ i++ ] ) && !event.isPropagationStopped() ) {
			event.currentTarget = matched.elem;

			j = 0;
			while ( ( handleObj = matched.handlers[ j++ ] ) &&
				!event.isImmediatePropagationStopped() ) {

				// If the event is namespaced, then each handler is only invoked if it is
				// specially universal or its namespaces are a superset of the event's.
				if ( !event.rnamespace || handleObj.namespace === false ||
					event.rnamespace.test( handleObj.namespace ) ) {

					event.handleObj = handleObj;
					event.data = handleObj.data;

					ret = ( ( jQuery.event.special[ handleObj.origType ] || {} ).handle ||
						handleObj.handler ).apply( matched.elem, args );

					if ( ret !== undefined ) {
						if ( ( event.result = ret ) === false ) {
							event.preventDefault();
							event.stopPropagation();
						}
					}
				}
			}
		}

		// Call the postDispatch hook for the mapped type
		if ( special.postDispatch ) {
			special.postDispatch.call( this, event );
		}

		return event.result;
	},

	handlers: function( event, handlers ) {
		var i, handleObj, sel, matchedHandlers, matchedSelectors,
			handlerQueue = [],
			delegateCount = handlers.delegateCount,
			cur = event.target;

		// Find delegate handlers
		if ( delegateCount &&

			// Support: IE <=9
			// Black-hole SVG <use> instance trees (trac-13180)
			cur.nodeType &&

			// Support: Firefox <=42
			// Suppress spec-violating clicks indicating a non-primary pointer button (trac-3861)
			// https://www.w3.org/TR/DOM-Level-3-Events/#event-type-click
			// Support: IE 11 only
			// ...but not arrow key "clicks" of radio inputs, which can have `button` -1 (gh-2343)
			!( event.type === "click" && event.button >= 1 ) ) {

			for ( ; cur !== this; cur = cur.parentNode || this ) {

				// Don't check non-elements (#13208)
				// Don't process clicks on disabled elements (#6911, #8165, #11382, #11764)
				if ( cur.nodeType === 1 && !( event.type === "click" && cur.disabled === true ) ) {
					matchedHandlers = [];
					matchedSelectors = {};
					for ( i = 0; i < delegateCount; i++ ) {
						handleObj = handlers[ i ];

						// Don't conflict with Object.prototype properties (#13203)
						sel = handleObj.selector + " ";

						if ( matchedSelectors[ sel ] === undefined ) {
							matchedSelectors[ sel ] = handleObj.needsContext ?
								jQuery( sel, this ).index( cur ) > -1 :
								jQuery.find( sel, this, null, [ cur ] ).length;
						}
						if ( matchedSelectors[ sel ] ) {
							matchedHandlers.push( handleObj );
						}
					}
					if ( matchedHandlers.length ) {
						handlerQueue.push( { elem: cur, handlers: matchedHandlers } );
					}
				}
			}
		}

		// Add the remaining (directly-bound) handlers
		cur = this;
		if ( delegateCount < handlers.length ) {
			handlerQueue.push( { elem: cur, handlers: handlers.slice( delegateCount ) } );
		}

		return handlerQueue;
	},

	addProp: function( name, hook ) {
		Object.defineProperty( jQuery.Event.prototype, name, {
			enumerable: true,
			configurable: true,

			get: isFunction( hook ) ?
				function() {
					if ( this.originalEvent ) {
						return hook( this.originalEvent );
					}
				} :
				function() {
					if ( this.originalEvent ) {
						return this.originalEvent[ name ];
					}
				},

			set: function( value ) {
				Object.defineProperty( this, name, {
					enumerable: true,
					configurable: true,
					writable: true,
					value: value
				} );
			}
		} );
	},

	fix: function( originalEvent ) {
		return originalEvent[ jQuery.expando ] ?
			originalEvent :
			new jQuery.Event( originalEvent );
	},

	special: {
		load: {

			// Prevent triggered image.load events from bubbling to window.load
			noBubble: true
		},
		click: {

			// Utilize native event to ensure correct state for checkable inputs
			setup: function( data ) {

				// For mutual compressibility with _default, replace `this` access with a local var.
				// `|| data` is dead code meant only to preserve the variable through minification.
				var el = this || data;

				// Claim the first handler
				if ( rcheckableType.test( el.type ) &&
					el.click && nodeName( el, "input" ) ) {

					// dataPriv.set( el, "click", ... )
					leverageNative( el, "click", returnTrue );
				}

				// Return false to allow normal processing in the caller
				return false;
			},
			trigger: function( data ) {

				// For mutual compressibility with _default, replace `this` access with a local var.
				// `|| data` is dead code meant only to preserve the variable through minification.
				var el = this || data;

				// Force setup before triggering a click
				if ( rcheckableType.test( el.type ) &&
					el.click && nodeName( el, "input" ) ) {

					leverageNative( el, "click" );
				}

				// Return non-false to allow normal event-path propagation
				return true;
			},

			// For cross-browser consistency, suppress native .click() on links
			// Also prevent it if we're currently inside a leveraged native-event stack
			_default: function( event ) {
				var target = event.target;
				return rcheckableType.test( target.type ) &&
					target.click && nodeName( target, "input" ) &&
					dataPriv.get( target, "click" ) ||
					nodeName( target, "a" );
			}
		},

		beforeunload: {
			postDispatch: function( event ) {

				// Support: Firefox 20+
				// Firefox doesn't alert if the returnValue field is not set.
				if ( event.result !== undefined && event.originalEvent ) {
					event.originalEvent.returnValue = event.result;
				}
			}
		}
	}
};

// Ensure the presence of an event listener that handles manually-triggered
// synthetic events by interrupting progress until reinvoked in response to
// *native* events that it fires directly, ensuring that state changes have
// already occurred before other listeners are invoked.
function leverageNative( el, type, expectSync ) {

	// Missing expectSync indicates a trigger call, which must force setup through jQuery.event.add
	if ( !expectSync ) {
		if ( dataPriv.get( el, type ) === undefined ) {
			jQuery.event.add( el, type, returnTrue );
		}
		return;
	}

	// Register the controller as a special universal handler for all event namespaces
	dataPriv.set( el, type, false );
	jQuery.event.add( el, type, {
		namespace: false,
		handler: function( event ) {
			var notAsync, result,
				saved = dataPriv.get( this, type );

			if ( ( event.isTrigger & 1 ) && this[ type ] ) {

				// Interrupt processing of the outer synthetic .trigger()ed event
				// Saved data should be false in such cases, but might be a leftover capture object
				// from an async native handler (gh-4350)
				if ( !saved.length ) {

					// Store arguments for use when handling the inner native event
					// There will always be at least one argument (an event object), so this array
					// will not be confused with a leftover capture object.
					saved = slice.call( arguments );
					dataPriv.set( this, type, saved );

					// Trigger the native event and capture its result
					// Support: IE <=9 - 11+
					// focus() and blur() are asynchronous
					notAsync = expectSync( this, type );
					this[ type ]();
					result = dataPriv.get( this, type );
					if ( saved !== result || notAsync ) {
						dataPriv.set( this, type, false );
					} else {
						result = {};
					}
					if ( saved !== result ) {

						// Cancel the outer synthetic event
						event.stopImmediatePropagation();
						event.preventDefault();

						// Support: Chrome 86+
						// In Chrome, if an element having a focusout handler is blurred by
						// clicking outside of it, it invokes the handler synchronously. If
						// that handler calls `.remove()` on the element, the data is cleared,
						// leaving `result` undefined. We need to guard against this.
						return result && result.value;
					}

				// If this is an inner synthetic event for an event with a bubbling surrogate
				// (focus or blur), assume that the surrogate already propagated from triggering the
				// native event and prevent that from happening again here.
				// This technically gets the ordering wrong w.r.t. to `.trigger()` (in which the
				// bubbling surrogate propagates *after* the non-bubbling base), but that seems
				// less bad than duplication.
				} else if ( ( jQuery.event.special[ type ] || {} ).delegateType ) {
					event.stopPropagation();
				}

			// If this is a native event triggered above, everything is now in order
			// Fire an inner synthetic event with the original arguments
			} else if ( saved.length ) {

				// ...and capture the result
				dataPriv.set( this, type, {
					value: jQuery.event.trigger(

						// Support: IE <=9 - 11+
						// Extend with the prototype to reset the above stopImmediatePropagation()
						jQuery.extend( saved[ 0 ], jQuery.Event.prototype ),
						saved.slice( 1 ),
						this
					)
				} );

				// Abort handling of the native event
				event.stopImmediatePropagation();
			}
		}
	} );
}

jQuery.removeEvent = function( elem, type, handle ) {

	// This "if" is needed for plain objects
	if ( elem.removeEventListener ) {
		elem.removeEventListener( type, handle );
	}
};

jQuery.Event = function( src, props ) {

	// Allow instantiation without the 'new' keyword
	if ( !( this instanceof jQuery.Event ) ) {
		return new jQuery.Event( src, props );
	}

	// Event object
	if ( src && src.type ) {
		this.originalEvent = src;
		this.type = src.type;

		// Events bubbling up the document may have been marked as prevented
		// by a handler lower down the tree; reflect the correct value.
		this.isDefaultPrevented = src.defaultPrevented ||
				src.defaultPrevented === undefined &&

				// Support: Android <=2.3 only
				src.returnValue === false ?
			returnTrue :
			returnFalse;

		// Create target properties
		// Support: Safari <=6 - 7 only
		// Target should not be a text node (#504, #13143)
		this.target = ( src.target && src.target.nodeType === 3 ) ?
			src.target.parentNode :
			src.target;

		this.currentTarget = src.currentTarget;
		this.relatedTarget = src.relatedTarget;

	// Event type
	} else {
		this.type = src;
	}

	// Put explicitly provided properties onto the event object
	if ( props ) {
		jQuery.extend( this, props );
	}

	// Create a timestamp if incoming event doesn't have one
	this.timeStamp = src && src.timeStamp || Date.now();

	// Mark it as fixed
	this[ jQuery.expando ] = true;
};

// jQuery.Event is based on DOM3 Events as specified by the ECMAScript Language Binding
// https://www.w3.org/TR/2003/WD-DOM-Level-3-Events-20030331/ecma-script-binding.html
jQuery.Event.prototype = {
	constructor: jQuery.Event,
	isDefaultPrevented: returnFalse,
	isPropagationStopped: returnFalse,
	isImmediatePropagationStopped: returnFalse,
	isSimulated: false,

	preventDefault: function() {
		var e = this.originalEvent;

		this.isDefaultPrevented = returnTrue;

		if ( e && !this.isSimulated ) {
			e.preventDefault();
		}
	},
	stopPropagation: function() {
		var e = this.originalEvent;

		this.isPropagationStopped = returnTrue;

		if ( e && !this.isSimulated ) {
			e.stopPropagation();
		}
	},
	stopImmediatePropagation: function() {
		var e = this.originalEvent;

		this.isImmediatePropagationStopped = returnTrue;

		if ( e && !this.isSimulated ) {
			e.stopImmediatePropagation();
		}

		this.stopPropagation();
	}
};

// Includes all common event props including KeyEvent and MouseEvent specific props
jQuery.each( {
	altKey: true,
	bubbles: true,
	cancelable: true,
	changedTouches: true,
	ctrlKey: true,
	detail: true,
	eventPhase: true,
	metaKey: true,
	pageX: true,
	pageY: true,
	shiftKey: true,
	view: true,
	"char": true,
	code: true,
	charCode: true,
	key: true,
	keyCode: true,
	button: true,
	buttons: true,
	clientX: true,
	clientY: true,
	offsetX: true,
	offsetY: true,
	pointerId: true,
	pointerType: true,
	screenX: true,
	screenY: true,
	targetTouches: true,
	toElement: true,
	touches: true,
	which: true
}, jQuery.event.addProp );

jQuery.each( { focus: "focusin", blur: "focusout" }, function( type, delegateType ) {
	jQuery.event.special[ type ] = {

		// Utilize native event if possible so blur/focus sequence is correct
		setup: function() {

			// Claim the first handler
			// dataPriv.set( this, "focus", ... )
			// dataPriv.set( this, "blur", ... )
			leverageNative( this, type, expectSync );

			// Return false to allow normal processing in the caller
			return false;
		},
		trigger: function() {

			// Force setup before trigger
			leverageNative( this, type );

			// Return non-false to allow normal event-path propagation
			return true;
		},

		// Suppress native focus or blur as it's already being fired
		// in leverageNative.
		_default: function() {
			return true;
		},

		delegateType: delegateType
	};
} );

// Create mouseenter/leave events using mouseover/out and event-time checks
// so that event delegation works in jQuery.
// Do the same for pointerenter/pointerleave and pointerover/pointerout
//
// Support: Safari 7 only
// Safari sends mouseenter too often; see:
// https://bugs.chromium.org/p/chromium/issues/detail?id=470258
// for the description of the bug (it existed in older Chrome versions as well).
jQuery.each( {
	mouseenter: "mouseover",
	mouseleave: "mouseout",
	pointerenter: "pointerover",
	pointerleave: "pointerout"
}, function( orig, fix ) {
	jQuery.event.special[ orig ] = {
		delegateType: fix,
		bindType: fix,

		handle: function( event ) {
			var ret,
				target = this,
				related = event.relatedTarget,
				handleObj = event.handleObj;

			// For mouseenter/leave call the handler if related is outside the target.
			// NB: No relatedTarget if the mouse left/entered the browser window
			if ( !related || ( related !== target && !jQuery.contains( target, related ) ) ) {
				event.type = handleObj.origType;
				ret = handleObj.handler.apply( this, arguments );
				event.type = fix;
			}
			return ret;
		}
	};
} );

jQuery.fn.extend( {

	on: function( types, selector, data, fn ) {
		return on( this, types, selector, data, fn );
	},
	one: function( types, selector, data, fn ) {
		return on( this, types, selector, data, fn, 1 );
	},
	off: function( types, selector, fn ) {
		var handleObj, type;
		if ( types && types.preventDefault && types.handleObj ) {

			// ( event )  dispatched jQuery.Event
			handleObj = types.handleObj;
			jQuery( types.delegateTarget ).off(
				handleObj.namespace ?
					handleObj.origType + "." + handleObj.namespace :
					handleObj.origType,
				handleObj.selector,
				handleObj.handler
			);
			return this;
		}
		if ( typeof types === "object" ) {

			// ( types-object [, selector] )
			for ( type in types ) {
				this.off( type, selector, types[ type ] );
			}
			return this;
		}
		if ( selector === false || typeof selector === "function" ) {

			// ( types [, fn] )
			fn = selector;
			selector = undefined;
		}
		if ( fn === false ) {
			fn = returnFalse;
		}
		return this.each( function() {
			jQuery.event.remove( this, types, fn, selector );
		} );
	}
} );


var

	// Support: IE <=10 - 11, Edge 12 - 13 only
	// In IE/Edge using regex groups here causes severe slowdowns.
	// See https://connect.microsoft.com/IE/feedback/details/1736512/
	rnoInnerhtml = /<script|<style|<link/i,

	// checked="checked" or checked
	rchecked = /checked\s*(?:[^=]|=\s*.checked.)/i,
	rcleanScript = /^\s*<!(?:\[CDATA\[|--)|(?:\]\]|--)>\s*$/g;

// Prefer a tbody over its parent table for containing new rows
function manipulationTarget( elem, content ) {
	if ( nodeName( elem, "table" ) &&
		nodeName( content.nodeType !== 11 ? content : content.firstChild, "tr" ) ) {

		return jQuery( elem ).children( "tbody" )[ 0 ] || elem;
	}

	return elem;
}

// Replace/restore the type attribute of script elements for safe DOM manipulation
function disableScript( elem ) {
	elem.type = ( elem.getAttribute( "type" ) !== null ) + "/" + elem.type;
	return elem;
}
function restoreScript( elem ) {
	if ( ( elem.type || "" ).slice( 0, 5 ) === "true/" ) {
		elem.type = elem.type.slice( 5 );
	} else {
		elem.removeAttribute( "type" );
	}

	return elem;
}

function cloneCopyEvent( src, dest ) {
	var i, l, type, pdataOld, udataOld, udataCur, events;

	if ( dest.nodeType !== 1 ) {
		return;
	}

	// 1. Copy private data: events, handlers, etc.
	if ( dataPriv.hasData( src ) ) {
		pdataOld = dataPriv.get( src );
		events = pdataOld.events;

		if ( events ) {
			dataPriv.remove( dest, "handle events" );

			for ( type in events ) {
				for ( i = 0, l = events[ type ].length; i < l; i++ ) {
					jQuery.event.add( dest, type, events[ type ][ i ] );
				}
			}
		}
	}

	// 2. Copy user data
	if ( dataUser.hasData( src ) ) {
		udataOld = dataUser.access( src );
		udataCur = jQuery.extend( {}, udataOld );

		dataUser.set( dest, udataCur );
	}
}

// Fix IE bugs, see support tests
function fixInput( src, dest ) {
	var nodeName = dest.nodeName.toLowerCase();

	// Fails to persist the checked state of a cloned checkbox or radio button.
	if ( nodeName === "input" && rcheckableType.test( src.type ) ) {
		dest.checked = src.checked;

	// Fails to return the selected option to the default selected state when cloning options
	} else if ( nodeName === "input" || nodeName === "textarea" ) {
		dest.defaultValue = src.defaultValue;
	}
}

function domManip( collection, args, callback, ignored ) {

	// Flatten any nested arrays
	args = flat( args );

	var fragment, first, scripts, hasScripts, node, doc,
		i = 0,
		l = collection.length,
		iNoClone = l - 1,
		value = args[ 0 ],
		valueIsFunction = isFunction( value );

	// We can't cloneNode fragments that contain checked, in WebKit
	if ( valueIsFunction ||
			( l > 1 && typeof value === "string" &&
				!support.checkClone && rchecked.test( value ) ) ) {
		return collection.each( function( index ) {
			var self = collection.eq( index );
			if ( valueIsFunction ) {
				args[ 0 ] = value.call( this, index, self.html() );
			}
			domManip( self, args, callback, ignored );
		} );
	}

	if ( l ) {
		fragment = buildFragment( args, collection[ 0 ].ownerDocument, false, collection, ignored );
		first = fragment.firstChild;

		if ( fragment.childNodes.length === 1 ) {
			fragment = first;
		}

		// Require either new content or an interest in ignored elements to invoke the callback
		if ( first || ignored ) {
			scripts = jQuery.map( getAll( fragment, "script" ), disableScript );
			hasScripts = scripts.length;

			// Use the original fragment for the last item
			// instead of the first because it can end up
			// being emptied incorrectly in certain situations (#8070).
			for ( ; i < l; i++ ) {
				node = fragment;

				if ( i !== iNoClone ) {
					node = jQuery.clone( node, true, true );

					// Keep references to cloned scripts for later restoration
					if ( hasScripts ) {

						// Support: Android <=4.0 only, PhantomJS 1 only
						// push.apply(_, arraylike) throws on ancient WebKit
						jQuery.merge( scripts, getAll( node, "script" ) );
					}
				}

				callback.call( collection[ i ], node, i );
			}

			if ( hasScripts ) {
				doc = scripts[ scripts.length - 1 ].ownerDocument;

				// Reenable scripts
				jQuery.map( scripts, restoreScript );

				// Evaluate executable scripts on first document insertion
				for ( i = 0; i < hasScripts; i++ ) {
					node = scripts[ i ];
					if ( rscriptType.test( node.type || "" ) &&
						!dataPriv.access( node, "globalEval" ) &&
						jQuery.contains( doc, node ) ) {

						if ( node.src && ( node.type || "" ).toLowerCase()  !== "module" ) {

							// Optional AJAX dependency, but won't run scripts if not present
							if ( jQuery._evalUrl && !node.noModule ) {
								jQuery._evalUrl( node.src, {
									nonce: node.nonce || node.getAttribute( "nonce" )
								}, doc );
							}
						} else {
							DOMEval( node.textContent.replace( rcleanScript, "" ), node, doc );
						}
					}
				}
			}
		}
	}

	return collection;
}

function remove( elem, selector, keepData ) {
	var node,
		nodes = selector ? jQuery.filter( selector, elem ) : elem,
		i = 0;

	for ( ; ( node = nodes[ i ] ) != null; i++ ) {
		if ( !keepData && node.nodeType === 1 ) {
			jQuery.cleanData( getAll( node ) );
		}

		if ( node.parentNode ) {
			if ( keepData && isAttached( node ) ) {
				setGlobalEval( getAll( node, "script" ) );
			}
			node.parentNode.removeChild( node );
		}
	}

	return elem;
}

jQuery.extend( {
	htmlPrefilter: function( html ) {
		return html;
	},

	clone: function( elem, dataAndEvents, deepDataAndEvents ) {
		var i, l, srcElements, destElements,
			clone = elem.cloneNode( true ),
			inPage = isAttached( elem );

		// Fix IE cloning issues
		if ( !support.noCloneChecked && ( elem.nodeType === 1 || elem.nodeType === 11 ) &&
				!jQuery.isXMLDoc( elem ) ) {

			// We eschew Sizzle here for performance reasons: https://jsperf.com/getall-vs-sizzle/2
			destElements = getAll( clone );
			srcElements = getAll( elem );

			for ( i = 0, l = srcElements.length; i < l; i++ ) {
				fixInput( srcElements[ i ], destElements[ i ] );
			}
		}

		// Copy the events from the original to the clone
		if ( dataAndEvents ) {
			if ( deepDataAndEvents ) {
				srcElements = srcElements || getAll( elem );
				destElements = destElements || getAll( clone );

				for ( i = 0, l = srcElements.length; i < l; i++ ) {
					cloneCopyEvent( srcElements[ i ], destElements[ i ] );
				}
			} else {
				cloneCopyEvent( elem, clone );
			}
		}

		// Preserve script evaluation history
		destElements = getAll( clone, "script" );
		if ( destElements.length > 0 ) {
			setGlobalEval( destElements, !inPage && getAll( elem, "script" ) );
		}

		// Return the cloned set
		return clone;
	},

	cleanData: function( elems ) {
		var data, elem, type,
			special = jQuery.event.special,
			i = 0;

		for ( ; ( elem = elems[ i ] ) !== undefined; i++ ) {
			if ( acceptData( elem ) ) {
				if ( ( data = elem[ dataPriv.expando ] ) ) {
					if ( data.events ) {
						for ( type in data.events ) {
							if ( special[ type ] ) {
								jQuery.event.remove( elem, type );

							// This is a shortcut to avoid jQuery.event.remove's overhead
							} else {
								jQuery.removeEvent( elem, type, data.handle );
							}
						}
					}

					// Support: Chrome <=35 - 45+
					// Assign undefined instead of using delete, see Data#remove
					elem[ dataPriv.expando ] = undefined;
				}
				if ( elem[ dataUser.expando ] ) {

					// Support: Chrome <=35 - 45+
					// Assign undefined instead of using delete, see Data#remove
					elem[ dataUser.expando ] = undefined;
				}
			}
		}
	}
} );

jQuery.fn.extend( {
	detach: function( selector ) {
		return remove( this, selector, true );
	},

	remove: function( selector ) {
		return remove( this, selector );
	},

	text: function( value ) {
		return access( this, function( value ) {
			return value === undefined ?
				jQuery.text( this ) :
				this.empty().each( function() {
					if ( this.nodeType === 1 || this.nodeType === 11 || this.nodeType === 9 ) {
						this.textContent = value;
					}
				} );
		}, null, value, arguments.length );
	},

	append: function() {
		return domManip( this, arguments, function( elem ) {
			if ( this.nodeType === 1 || this.nodeType === 11 || this.nodeType === 9 ) {
				var target = manipulationTarget( this, elem );
				target.appendChild( elem );
			}
		} );
	},

	prepend: function() {
		return domManip( this, arguments, function( elem ) {
			if ( this.nodeType === 1 || this.nodeType === 11 || this.nodeType === 9 ) {
				var target = manipulationTarget( this, elem );
				target.insertBefore( elem, target.firstChild );
			}
		} );
	},

	before: function() {
		return domManip( this, arguments, function( elem ) {
			if ( this.parentNode ) {
				this.parentNode.insertBefore( elem, this );
			}
		} );
	},

	after: function() {
		return domManip( this, arguments, function( elem ) {
			if ( this.parentNode ) {
				this.parentNode.insertBefore( elem, this.nextSibling );
			}
		} );
	},

	empty: function() {
		var elem,
			i = 0;

		for ( ; ( elem = this[ i ] ) != null; i++ ) {
			if ( elem.nodeType === 1 ) {

				// Prevent memory leaks
				jQuery.cleanData( getAll( elem, false ) );

				// Remove any remaining nodes
				elem.textContent = "";
			}
		}

		return this;
	},

	clone: function( dataAndEvents, deepDataAndEvents ) {
		dataAndEvents = dataAndEvents == null ? false : dataAndEvents;
		deepDataAndEvents = deepDataAndEvents == null ? dataAndEvents : deepDataAndEvents;

		return this.map( function() {
			return jQuery.clone( this, dataAndEvents, deepDataAndEvents );
		} );
	},

	html: function( value ) {
		return access( this, function( value ) {
			var elem = this[ 0 ] || {},
				i = 0,
				l = this.length;

			if ( value === undefined && elem.nodeType === 1 ) {
				return elem.innerHTML;
			}

			// See if we can take a shortcut and just use innerHTML
			if ( typeof value === "string" && !rnoInnerhtml.test( value ) &&
				!wrapMap[ ( rtagName.exec( value ) || [ "", "" ] )[ 1 ].toLowerCase() ] ) {

				value = jQuery.htmlPrefilter( value );

				try {
					for ( ; i < l; i++ ) {
						elem = this[ i ] || {};

						// Remove element nodes and prevent memory leaks
						if ( elem.nodeType === 1 ) {
							jQuery.cleanData( getAll( elem, false ) );
							elem.innerHTML = value;
						}
					}

					elem = 0;

				// If using innerHTML throws an exception, use the fallback method
				} catch ( e ) {}
			}

			if ( elem ) {
				this.empty().append( value );
			}
		}, null, value, arguments.length );
	},

	replaceWith: function() {
		var ignored = [];

		// Make the changes, replacing each non-ignored context element with the new content
		return domManip( this, arguments, function( elem ) {
			var parent = this.parentNode;

			if ( jQuery.inArray( this, ignored ) < 0 ) {
				jQuery.cleanData( getAll( this ) );
				if ( parent ) {
					parent.replaceChild( elem, this );
				}
			}

		// Force callback invocation
		}, ignored );
	}
} );

jQuery.each( {
	appendTo: "append",
	prependTo: "prepend",
	insertBefore: "before",
	insertAfter: "after",
	replaceAll: "replaceWith"
}, function( name, original ) {
	jQuery.fn[ name ] = function( selector ) {
		var elems,
			ret = [],
			insert = jQuery( selector ),
			last = insert.length - 1,
			i = 0;

		for ( ; i <= last; i++ ) {
			elems = i === last ? this : this.clone( true );
			jQuery( insert[ i ] )[ original ]( elems );

			// Support: Android <=4.0 only, PhantomJS 1 only
			// .get() because push.apply(_, arraylike) throws on ancient WebKit
			push.apply( ret, elems.get() );
		}

		return this.pushStack( ret );
	};
} );
var rnumnonpx = new RegExp( "^(" + pnum + ")(?!px)[a-z%]+$", "i" );

var getStyles = function( elem ) {

		// Support: IE <=11 only, Firefox <=30 (#15098, #14150)
		// IE throws on elements created in popups
		// FF meanwhile throws on frame elements through "defaultView.getComputedStyle"
		var view = elem.ownerDocument.defaultView;

		if ( !view || !view.opener ) {
			view = window;
		}

		return view.getComputedStyle( elem );
	};

var swap = function( elem, options, callback ) {
	var ret, name,
		old = {};

	// Remember the old values, and insert the new ones
	for ( name in options ) {
		old[ name ] = elem.style[ name ];
		elem.style[ name ] = options[ name ];
	}

	ret = callback.call( elem );

	// Revert the old values
	for ( name in options ) {
		elem.style[ name ] = old[ name ];
	}

	return ret;
};


var rboxStyle = new RegExp( cssExpand.join( "|" ), "i" );



( function() {

	// Executing both pixelPosition & boxSizingReliable tests require only one layout
	// so they're executed at the same time to save the second computation.
	function computeStyleTests() {

		// This is a singleton, we need to execute it only once
		if ( !div ) {
			return;
		}

		container.style.cssText = "position:absolute;left:-11111px;width:60px;" +
			"margin-top:1px;padding:0;border:0";
		div.style.cssText =
			"position:relative;display:block;box-sizing:border-box;overflow:scroll;" +
			"margin:auto;border:1px;padding:1px;" +
			"width:60%;top:1%";
		documentElement.appendChild( container ).appendChild( div );

		var divStyle = window.getComputedStyle( div );
		pixelPositionVal = divStyle.top !== "1%";

		// Support: Android 4.0 - 4.3 only, Firefox <=3 - 44
		reliableMarginLeftVal = roundPixelMeasures( divStyle.marginLeft ) === 12;

		// Support: Android 4.0 - 4.3 only, Safari <=9.1 - 10.1, iOS <=7.0 - 9.3
		// Some styles come back with percentage values, even though they shouldn't
		div.style.right = "60%";
		pixelBoxStylesVal = roundPixelMeasures( divStyle.right ) === 36;

		// Support: IE 9 - 11 only
		// Detect misreporting of content dimensions for box-sizing:border-box elements
		boxSizingReliableVal = roundPixelMeasures( divStyle.width ) === 36;

		// Support: IE 9 only
		// Detect overflow:scroll screwiness (gh-3699)
		// Support: Chrome <=64
		// Don't get tricked when zoom affects offsetWidth (gh-4029)
		div.style.position = "absolute";
		scrollboxSizeVal = roundPixelMeasures( div.offsetWidth / 3 ) === 12;

		documentElement.removeChild( container );

		// Nullify the div so it wouldn't be stored in the memory and
		// it will also be a sign that checks already performed
		div = null;
	}

	function roundPixelMeasures( measure ) {
		return Math.round( parseFloat( measure ) );
	}

	var pixelPositionVal, boxSizingReliableVal, scrollboxSizeVal, pixelBoxStylesVal,
		reliableTrDimensionsVal, reliableMarginLeftVal,
		container = document.createElement( "div" ),
		div = document.createElement( "div" );

	// Finish early in limited (non-browser) environments
	if ( !div.style ) {
		return;
	}

	// Support: IE <=9 - 11 only
	// Style of cloned element affects source element cloned (#8908)
	div.style.backgroundClip = "content-box";
	div.cloneNode( true ).style.backgroundClip = "";
	support.clearCloneStyle = div.style.backgroundClip === "content-box";

	jQuery.extend( support, {
		boxSizingReliable: function() {
			computeStyleTests();
			return boxSizingReliableVal;
		},
		pixelBoxStyles: function() {
			computeStyleTests();
			return pixelBoxStylesVal;
		},
		pixelPosition: function() {
			computeStyleTests();
			return pixelPositionVal;
		},
		reliableMarginLeft: function() {
			computeStyleTests();
			return reliableMarginLeftVal;
		},
		scrollboxSize: function() {
			computeStyleTests();
			return scrollboxSizeVal;
		},

		// Support: IE 9 - 11+, Edge 15 - 18+
		// IE/Edge misreport `getComputedStyle` of table rows with width/height
		// set in CSS while `offset*` properties report correct values.
		// Behavior in IE 9 is more subtle than in newer versions & it passes
		// some versions of this test; make sure not to make it pass there!
		//
		// Support: Firefox 70+
		// Only Firefox includes border widths
		// in computed dimensions. (gh-4529)
		reliableTrDimensions: function() {
			var table, tr, trChild, trStyle;
			if ( reliableTrDimensionsVal == null ) {
				table = document.createElement( "table" );
				tr = document.createElement( "tr" );
				trChild = document.createElement( "div" );

				table.style.cssText = "position:absolute;left:-11111px;border-collapse:separate";
				tr.style.cssText = "border:1px solid";

				// Support: Chrome 86+
				// Height set through cssText does not get applied.
				// Computed height then comes back as 0.
				tr.style.height = "1px";
				trChild.style.height = "9px";

				// Support: Android 8 Chrome 86+
				// In our bodyBackground.html iframe,
				// display for all div elements is set to "inline",
				// which causes a problem only in Android 8 Chrome 86.
				// Ensuring the div is display: block
				// gets around this issue.
				trChild.style.display = "block";

				documentElement
					.appendChild( table )
					.appendChild( tr )
					.appendChild( trChild );

				trStyle = window.getComputedStyle( tr );
				reliableTrDimensionsVal = ( parseInt( trStyle.height, 10 ) +
					parseInt( trStyle.borderTopWidth, 10 ) +
					parseInt( trStyle.borderBottomWidth, 10 ) ) === tr.offsetHeight;

				documentElement.removeChild( table );
			}
			return reliableTrDimensionsVal;
		}
	} );
} )();


function curCSS( elem, name, computed ) {
	var width, minWidth, maxWidth, ret,

		// Support: Firefox 51+
		// Retrieving style before computed somehow
		// fixes an issue with getting wrong values
		// on detached elements
		style = elem.style;

	computed = computed || getStyles( elem );

	// getPropertyValue is needed for:
	//   .css('filter') (IE 9 only, #12537)
	//   .css('--customProperty) (#3144)
	if ( computed ) {
		ret = computed.getPropertyValue( name ) || computed[ name ];

		if ( ret === "" && !isAttached( elem ) ) {
			ret = jQuery.style( elem, name );
		}

		// A tribute to the "awesome hack by Dean Edwards"
		// Android Browser returns percentage for some values,
		// but width seems to be reliably pixels.
		// This is against the CSSOM draft spec:
		// https://drafts.csswg.org/cssom/#resolved-values
		if ( !support.pixelBoxStyles() && rnumnonpx.test( ret ) && rboxStyle.test( name ) ) {

			// Remember the original values
			width = style.width;
			minWidth = style.minWidth;
			maxWidth = style.maxWidth;

			// Put in the new values to get a computed value out
			style.minWidth = style.maxWidth = style.width = ret;
			ret = computed.width;

			// Revert the changed values
			style.width = width;
			style.minWidth = minWidth;
			style.maxWidth = maxWidth;
		}
	}

	return ret !== undefined ?

		// Support: IE <=9 - 11 only
		// IE returns zIndex value as an integer.
		ret + "" :
		ret;
}


function addGetHookIf( conditionFn, hookFn ) {

	// Define the hook, we'll check on the first run if it's really needed.
	return {
		get: function() {
			if ( conditionFn() ) {

				// Hook not needed (or it's not possible to use it due
				// to missing dependency), remove it.
				delete this.get;
				return;
			}

			// Hook needed; redefine it so that the support test is not executed again.
			return ( this.get = hookFn ).apply( this, arguments );
		}
	};
}


var cssPrefixes = [ "Webkit", "Moz", "ms" ],
	emptyStyle = document.createElement( "div" ).style,
	vendorProps = {};

// Return a vendor-prefixed property or undefined
function vendorPropName( name ) {

	// Check for vendor prefixed names
	var capName = name[ 0 ].toUpperCase() + name.slice( 1 ),
		i = cssPrefixes.length;

	while ( i-- ) {
		name = cssPrefixes[ i ] + capName;
		if ( name in emptyStyle ) {
			return name;
		}
	}
}

// Return a potentially-mapped jQuery.cssProps or vendor prefixed property
function finalPropName( name ) {
	var final = jQuery.cssProps[ name ] || vendorProps[ name ];

	if ( final ) {
		return final;
	}
	if ( name in emptyStyle ) {
		return name;
	}
	return vendorProps[ name ] = vendorPropName( name ) || name;
}


var

	// Swappable if display is none or starts with table
	// except "table", "table-cell", or "table-caption"
	// See here for display values: https://developer.mozilla.org/en-US/docs/CSS/display
	rdisplayswap = /^(none|table(?!-c[ea]).+)/,
	rcustomProp = /^--/,
	cssShow = { position: "absolute", visibility: "hidden", display: "block" },
	cssNormalTransform = {
		letterSpacing: "0",
		fontWeight: "400"
	};

function setPositiveNumber( _elem, value, subtract ) {

	// Any relative (+/-) values have already been
	// normalized at this point
	var matches = rcssNum.exec( value );
	return matches ?

		// Guard against undefined "subtract", e.g., when used as in cssHooks
		Math.max( 0, matches[ 2 ] - ( subtract || 0 ) ) + ( matches[ 3 ] || "px" ) :
		value;
}

function boxModelAdjustment( elem, dimension, box, isBorderBox, styles, computedVal ) {
	var i = dimension === "width" ? 1 : 0,
		extra = 0,
		delta = 0;

	// Adjustment may not be necessary
	if ( box === ( isBorderBox ? "border" : "content" ) ) {
		return 0;
	}

	for ( ; i < 4; i += 2 ) {

		// Both box models exclude margin
		if ( box === "margin" ) {
			delta += jQuery.css( elem, box + cssExpand[ i ], true, styles );
		}

		// If we get here with a content-box, we're seeking "padding" or "border" or "margin"
		if ( !isBorderBox ) {

			// Add padding
			delta += jQuery.css( elem, "padding" + cssExpand[ i ], true, styles );

			// For "border" or "margin", add border
			if ( box !== "padding" ) {
				delta += jQuery.css( elem, "border" + cssExpand[ i ] + "Width", true, styles );

			// But still keep track of it otherwise
			} else {
				extra += jQuery.css( elem, "border" + cssExpand[ i ] + "Width", true, styles );
			}

		// If we get here with a border-box (content + padding + border), we're seeking "content" or
		// "padding" or "margin"
		} else {

			// For "content", subtract padding
			if ( box === "content" ) {
				delta -= jQuery.css( elem, "padding" + cssExpand[ i ], true, styles );
			}

			// For "content" or "padding", subtract border
			if ( box !== "margin" ) {
				delta -= jQuery.css( elem, "border" + cssExpand[ i ] + "Width", true, styles );
			}
		}
	}

	// Account for positive content-box scroll gutter when requested by providing computedVal
	if ( !isBorderBox && computedVal >= 0 ) {

		// offsetWidth/offsetHeight is a rounded sum of content, padding, scroll gutter, and border
		// Assuming integer scroll gutter, subtract the rest and round down
		delta += Math.max( 0, Math.ceil(
			elem[ "offset" + dimension[ 0 ].toUpperCase() + dimension.slice( 1 ) ] -
			computedVal -
			delta -
			extra -
			0.5

		// If offsetWidth/offsetHeight is unknown, then we can't determine content-box scroll gutter
		// Use an explicit zero to avoid NaN (gh-3964)
		) ) || 0;
	}

	return delta;
}

function getWidthOrHeight( elem, dimension, extra ) {

	// Start with computed style
	var styles = getStyles( elem ),

		// To avoid forcing a reflow, only fetch boxSizing if we need it (gh-4322).
		// Fake content-box until we know it's needed to know the true value.
		boxSizingNeeded = !support.boxSizingReliable() || extra,
		isBorderBox = boxSizingNeeded &&
			jQuery.css( elem, "boxSizing", false, styles ) === "border-box",
		valueIsBorderBox = isBorderBox,

		val = curCSS( elem, dimension, styles ),
		offsetProp = "offset" + dimension[ 0 ].toUpperCase() + dimension.slice( 1 );

	// Support: Firefox <=54
	// Return a confounding non-pixel value or feign ignorance, as appropriate.
	if ( rnumnonpx.test( val ) ) {
		if ( !extra ) {
			return val;
		}
		val = "auto";
	}


	// Support: IE 9 - 11 only
	// Use offsetWidth/offsetHeight for when box sizing is unreliable.
	// In those cases, the computed value can be trusted to be border-box.
	if ( ( !support.boxSizingReliable() && isBorderBox ||

		// Support: IE 10 - 11+, Edge 15 - 18+
		// IE/Edge misreport `getComputedStyle` of table rows with width/height
		// set in CSS while `offset*` properties report correct values.
		// Interestingly, in some cases IE 9 doesn't suffer from this issue.
		!support.reliableTrDimensions() && nodeName( elem, "tr" ) ||

		// Fall back to offsetWidth/offsetHeight when value is "auto"
		// This happens for inline elements with no explicit setting (gh-3571)
		val === "auto" ||

		// Support: Android <=4.1 - 4.3 only
		// Also use offsetWidth/offsetHeight for misreported inline dimensions (gh-3602)
		!parseFloat( val ) && jQuery.css( elem, "display", false, styles ) === "inline" ) &&

		// Make sure the element is visible & connected
		elem.getClientRects().length ) {

		isBorderBox = jQuery.css( elem, "boxSizing", false, styles ) === "border-box";

		// Where available, offsetWidth/offsetHeight approximate border box dimensions.
		// Where not available (e.g., SVG), assume unreliable box-sizing and interpret the
		// retrieved value as a content box dimension.
		valueIsBorderBox = offsetProp in elem;
		if ( valueIsBorderBox ) {
			val = elem[ offsetProp ];
		}
	}

	// Normalize "" and auto
	val = parseFloat( val ) || 0;

	// Adjust for the element's box model
	return ( val +
		boxModelAdjustment(
			elem,
			dimension,
			extra || ( isBorderBox ? "border" : "content" ),
			valueIsBorderBox,
			styles,

			// Provide the current computed size to request scroll gutter calculation (gh-3589)
			val
		)
	) + "px";
}

jQuery.extend( {

	// Add in style property hooks for overriding the default
	// behavior of getting and setting a style property
	cssHooks: {
		opacity: {
			get: function( elem, computed ) {
				if ( computed ) {

					// We should always get a number back from opacity
					var ret = curCSS( elem, "opacity" );
					return ret === "" ? "1" : ret;
				}
			}
		}
	},

	// Don't automatically add "px" to these possibly-unitless properties
	cssNumber: {
		"animationIterationCount": true,
		"columnCount": true,
		"fillOpacity": true,
		"flexGrow": true,
		"flexShrink": true,
		"fontWeight": true,
		"gridArea": true,
		"gridColumn": true,
		"gridColumnEnd": true,
		"gridColumnStart": true,
		"gridRow": true,
		"gridRowEnd": true,
		"gridRowStart": true,
		"lineHeight": true,
		"opacity": true,
		"order": true,
		"orphans": true,
		"widows": true,
		"zIndex": true,
		"zoom": true
	},

	// Add in properties whose names you wish to fix before
	// setting or getting the value
	cssProps: {},

	// Get and set the style property on a DOM Node
	style: function( elem, name, value, extra ) {

		// Don't set styles on text and comment nodes
		if ( !elem || elem.nodeType === 3 || elem.nodeType === 8 || !elem.style ) {
			return;
		}

		// Make sure that we're working with the right name
		var ret, type, hooks,
			origName = camelCase( name ),
			isCustomProp = rcustomProp.test( name ),
			style = elem.style;

		// Make sure that we're working with the right name. We don't
		// want to query the value if it is a CSS custom property
		// since they are user-defined.
		if ( !isCustomProp ) {
			name = finalPropName( origName );
		}

		// Gets hook for the prefixed version, then unprefixed version
		hooks = jQuery.cssHooks[ name ] || jQuery.cssHooks[ origName ];

		// Check if we're setting a value
		if ( value !== undefined ) {
			type = typeof value;

			// Convert "+=" or "-=" to relative numbers (#7345)
			if ( type === "string" && ( ret = rcssNum.exec( value ) ) && ret[ 1 ] ) {
				value = adjustCSS( elem, name, ret );

				// Fixes bug #9237
				type = "number";
			}

			// Make sure that null and NaN values aren't set (#7116)
			if ( value == null || value !== value ) {
				return;
			}

			// If a number was passed in, add the unit (except for certain CSS properties)
			// The isCustomProp check can be removed in jQuery 4.0 when we only auto-append
			// "px" to a few hardcoded values.
			if ( type === "number" && !isCustomProp ) {
				value += ret && ret[ 3 ] || ( jQuery.cssNumber[ origName ] ? "" : "px" );
			}

			// background-* props affect original clone's values
			if ( !support.clearCloneStyle && value === "" && name.indexOf( "background" ) === 0 ) {
				style[ name ] = "inherit";
			}

			// If a hook was provided, use that value, otherwise just set the specified value
			if ( !hooks || !( "set" in hooks ) ||
				( value = hooks.set( elem, value, extra ) ) !== undefined ) {

				if ( isCustomProp ) {
					style.setProperty( name, value );
				} else {
					style[ name ] = value;
				}
			}

		} else {

			// If a hook was provided get the non-computed value from there
			if ( hooks && "get" in hooks &&
				( ret = hooks.get( elem, false, extra ) ) !== undefined ) {

				return ret;
			}

			// Otherwise just get the value from the style object
			return style[ name ];
		}
	},

	css: function( elem, name, extra, styles ) {
		var val, num, hooks,
			origName = camelCase( name ),
			isCustomProp = rcustomProp.test( name );

		// Make sure that we're working with the right name. We don't
		// want to modify the value if it is a CSS custom property
		// since they are user-defined.
		if ( !isCustomProp ) {
			name = finalPropName( origName );
		}

		// Try prefixed name followed by the unprefixed name
		hooks = jQuery.cssHooks[ name ] || jQuery.cssHooks[ origName ];

		// If a hook was provided get the computed value from there
		if ( hooks && "get" in hooks ) {
			val = hooks.get( elem, true, extra );
		}

		// Otherwise, if a way to get the computed value exists, use that
		if ( val === undefined ) {
			val = curCSS( elem, name, styles );
		}

		// Convert "normal" to computed value
		if ( val === "normal" && name in cssNormalTransform ) {
			val = cssNormalTransform[ name ];
		}

		// Make numeric if forced or a qualifier was provided and val looks numeric
		if ( extra === "" || extra ) {
			num = parseFloat( val );
			return extra === true || isFinite( num ) ? num || 0 : val;
		}

		return val;
	}
} );

jQuery.each( [ "height", "width" ], function( _i, dimension ) {
	jQuery.cssHooks[ dimension ] = {
		get: function( elem, computed, extra ) {
			if ( computed ) {

				// Certain elements can have dimension info if we invisibly show them
				// but it must have a current display style that would benefit
				return rdisplayswap.test( jQuery.css( elem, "display" ) ) &&

					// Support: Safari 8+
					// Table columns in Safari have non-zero offsetWidth & zero
					// getBoundingClientRect().width unless display is changed.
					// Support: IE <=11 only
					// Running getBoundingClientRect on a disconnected node
					// in IE throws an error.
					( !elem.getClientRects().length || !elem.getBoundingClientRect().width ) ?
					swap( elem, cssShow, function() {
						return getWidthOrHeight( elem, dimension, extra );
					} ) :
					getWidthOrHeight( elem, dimension, extra );
			}
		},

		set: function( elem, value, extra ) {
			var matches,
				styles = getStyles( elem ),

				// Only read styles.position if the test has a chance to fail
				// to avoid forcing a reflow.
				scrollboxSizeBuggy = !support.scrollboxSize() &&
					styles.position === "absolute",

				// To avoid forcing a reflow, only fetch boxSizing if we need it (gh-3991)
				boxSizingNeeded = scrollboxSizeBuggy || extra,
				isBorderBox = boxSizingNeeded &&
					jQuery.css( elem, "boxSizing", false, styles ) === "border-box",
				subtract = extra ?
					boxModelAdjustment(
						elem,
						dimension,
						extra,
						isBorderBox,
						styles
					) :
					0;

			// Account for unreliable border-box dimensions by comparing offset* to computed and
			// faking a content-box to get border and padding (gh-3699)
			if ( isBorderBox && scrollboxSizeBuggy ) {
				subtract -= Math.ceil(
					elem[ "offset" + dimension[ 0 ].toUpperCase() + dimension.slice( 1 ) ] -
					parseFloat( styles[ dimension ] ) -
					boxModelAdjustment( elem, dimension, "border", false, styles ) -
					0.5
				);
			}

			// Convert to pixels if value adjustment is needed
			if ( subtract && ( matches = rcssNum.exec( value ) ) &&
				( matches[ 3 ] || "px" ) !== "px" ) {

				elem.style[ dimension ] = value;
				value = jQuery.css( elem, dimension );
			}

			return setPositiveNumber( elem, value, subtract );
		}
	};
} );

jQuery.cssHooks.marginLeft = addGetHookIf( support.reliableMarginLeft,
	function( elem, computed ) {
		if ( computed ) {
			return ( parseFloat( curCSS( elem, "marginLeft" ) ) ||
				elem.getBoundingClientRect().left -
					swap( elem, { marginLeft: 0 }, function() {
						return elem.getBoundingClientRect().left;
					} )
			) + "px";
		}
	}
);

// These hooks are used by animate to expand properties
jQuery.each( {
	margin: "",
	padding: "",
	border: "Width"
}, function( prefix, suffix ) {
	jQuery.cssHooks[ prefix + suffix ] = {
		expand: function( value ) {
			var i = 0,
				expanded = {},

				// Assumes a single number if not a string
				parts = typeof value === "string" ? value.split( " " ) : [ value ];

			for ( ; i < 4; i++ ) {
				expanded[ prefix + cssExpand[ i ] + suffix ] =
					parts[ i ] || parts[ i - 2 ] || parts[ 0 ];
			}

			return expanded;
		}
	};

	if ( prefix !== "margin" ) {
		jQuery.cssHooks[ prefix + suffix ].set = setPositiveNumber;
	}
} );

jQuery.fn.extend( {
	css: function( name, value ) {
		return access( this, function( elem, name, value ) {
			var styles, len,
				map = {},
				i = 0;

			if ( Array.isArray( name ) ) {
				styles = getStyles( elem );
				len = name.length;

				for ( ; i < len; i++ ) {
					map[ name[ i ] ] = jQuery.css( elem, name[ i ], false, styles );
				}

				return map;
			}

			return value !== undefined ?
				jQuery.style( elem, name, value ) :
				jQuery.css( elem, name );
		}, name, value, arguments.length > 1 );
	}
} );


function Tween( elem, options, prop, end, easing ) {
	return new Tween.prototype.init( elem, options, prop, end, easing );
}
jQuery.Tween = Tween;

Tween.prototype = {
	constructor: Tween,
	init: function( elem, options, prop, end, easing, unit ) {
		this.elem = elem;
		this.prop = prop;
		this.easing = easing || jQuery.easing._default;
		this.options = options;
		this.start = this.now = this.cur();
		this.end = end;
		this.unit = unit || ( jQuery.cssNumber[ prop ] ? "" : "px" );
	},
	cur: function() {
		var hooks = Tween.propHooks[ this.prop ];

		return hooks && hooks.get ?
			hooks.get( this ) :
			Tween.propHooks._default.get( this );
	},
	run: function( percent ) {
		var eased,
			hooks = Tween.propHooks[ this.prop ];

		if ( this.options.duration ) {
			this.pos = eased = jQuery.easing[ this.easing ](
				percent, this.options.duration * percent, 0, 1, this.options.duration
			);
		} else {
			this.pos = eased = percent;
		}
		this.now = ( this.end - this.start ) * eased + this.start;

		if ( this.options.step ) {
			this.options.step.call( this.elem, this.now, this );
		}

		if ( hooks && hooks.set ) {
			hooks.set( this );
		} else {
			Tween.propHooks._default.set( this );
		}
		return this;
	}
};

Tween.prototype.init.prototype = Tween.prototype;

Tween.propHooks = {
	_default: {
		get: function( tween ) {
			var result;

			// Use a property on the element directly when it is not a DOM element,
			// or when there is no matching style property that exists.
			if ( tween.elem.nodeType !== 1 ||
				tween.elem[ tween.prop ] != null && tween.elem.style[ tween.prop ] == null ) {
				return tween.elem[ tween.prop ];
			}

			// Passing an empty string as a 3rd parameter to .css will automatically
			// attempt a parseFloat and fallback to a string if the parse fails.
			// Simple values such as "10px" are parsed to Float;
			// complex values such as "rotate(1rad)" are returned as-is.
			result = jQuery.css( tween.elem, tween.prop, "" );

			// Empty strings, null, undefined and "auto" are converted to 0.
			return !result || result === "auto" ? 0 : result;
		},
		set: function( tween ) {

			// Use step hook for back compat.
			// Use cssHook if its there.
			// Use .style if available and use plain properties where available.
			if ( jQuery.fx.step[ tween.prop ] ) {
				jQuery.fx.step[ tween.prop ]( tween );
			} else if ( tween.elem.nodeType === 1 && (
				jQuery.cssHooks[ tween.prop ] ||
					tween.elem.style[ finalPropName( tween.prop ) ] != null ) ) {
				jQuery.style( tween.elem, tween.prop, tween.now + tween.unit );
			} else {
				tween.elem[ tween.prop ] = tween.now;
			}
		}
	}
};

// Support: IE <=9 only
// Panic based approach to setting things on disconnected nodes
Tween.propHooks.scrollTop = Tween.propHooks.scrollLeft = {
	set: function( tween ) {
		if ( tween.elem.nodeType && tween.elem.parentNode ) {
			tween.elem[ tween.prop ] = tween.now;
		}
	}
};

jQuery.easing = {
	linear: function( p ) {
		return p;
	},
	swing: function( p ) {
		return 0.5 - Math.cos( p * Math.PI ) / 2;
	},
	_default: "swing"
};

jQuery.fx = Tween.prototype.init;

// Back compat <1.8 extension point
jQuery.fx.step = {};




var
	fxNow, inProgress,
	rfxtypes = /^(?:toggle|show|hide)$/,
	rrun = /queueHooks$/;

function schedule() {
	if ( inProgress ) {
		if ( document.hidden === false && window.requestAnimationFrame ) {
			window.requestAnimationFrame( schedule );
		} else {
			window.setTimeout( schedule, jQuery.fx.interval );
		}

		jQuery.fx.tick();
	}
}

// Animations created synchronously will run synchronously
function createFxNow() {
	window.setTimeout( function() {
		fxNow = undefined;
	} );
	return ( fxNow = Date.now() );
}

// Generate parameters to create a standard animation
function genFx( type, includeWidth ) {
	var which,
		i = 0,
		attrs = { height: type };

	// If we include width, step value is 1 to do all cssExpand values,
	// otherwise step value is 2 to skip over Left and Right
	includeWidth = includeWidth ? 1 : 0;
	for ( ; i < 4; i += 2 - includeWidth ) {
		which = cssExpand[ i ];
		attrs[ "margin" + which ] = attrs[ "padding" + which ] = type;
	}

	if ( includeWidth ) {
		attrs.opacity = attrs.width = type;
	}

	return attrs;
}

function createTween( value, prop, animation ) {
	var tween,
		collection = ( Animation.tweeners[ prop ] || [] ).concat( Animation.tweeners[ "*" ] ),
		index = 0,
		length = collection.length;
	for ( ; index < length; index++ ) {
		if ( ( tween = collection[ index ].call( animation, prop, value ) ) ) {

			// We're done with this property
			return tween;
		}
	}
}

function defaultPrefilter( elem, props, opts ) {
	var prop, value, toggle, hooks, oldfire, propTween, restoreDisplay, display,
		isBox = "width" in props || "height" in props,
		anim = this,
		orig = {},
		style = elem.style,
		hidden = elem.nodeType && isHiddenWithinTree( elem ),
		dataShow = dataPriv.get( elem, "fxshow" );

	// Queue-skipping animations hijack the fx hooks
	if ( !opts.queue ) {
		hooks = jQuery._queueHooks( elem, "fx" );
		if ( hooks.unqueued == null ) {
			hooks.unqueued = 0;
			oldfire = hooks.empty.fire;
			hooks.empty.fire = function() {
				if ( !hooks.unqueued ) {
					oldfire();
				}
			};
		}
		hooks.unqueued++;

		anim.always( function() {

			// Ensure the complete handler is called before this completes
			anim.always( function() {
				hooks.unqueued--;
				if ( !jQuery.queue( elem, "fx" ).length ) {
					hooks.empty.fire();
				}
			} );
		} );
	}

	// Detect show/hide animations
	for ( prop in props ) {
		value = props[ prop ];
		if ( rfxtypes.test( value ) ) {
			delete props[ prop ];
			toggle = toggle || value === "toggle";
			if ( value === ( hidden ? "hide" : "show" ) ) {

				// Pretend to be hidden if this is a "show" and
				// there is still data from a stopped show/hide
				if ( value === "show" && dataShow && dataShow[ prop ] !== undefined ) {
					hidden = true;

				// Ignore all other no-op show/hide data
				} else {
					continue;
				}
			}
			orig[ prop ] = dataShow && dataShow[ prop ] || jQuery.style( elem, prop );
		}
	}

	// Bail out if this is a no-op like .hide().hide()
	propTween = !jQuery.isEmptyObject( props );
	if ( !propTween && jQuery.isEmptyObject( orig ) ) {
		return;
	}

	// Restrict "overflow" and "display" styles during box animations
	if ( isBox && elem.nodeType === 1 ) {

		// Support: IE <=9 - 11, Edge 12 - 15
		// Record all 3 overflow attributes because IE does not infer the shorthand
		// from identically-valued overflowX and overflowY and Edge just mirrors
		// the overflowX value there.
		opts.overflow = [ style.overflow, style.overflowX, style.overflowY ];

		// Identify a display type, preferring old show/hide data over the CSS cascade
		restoreDisplay = dataShow && dataShow.display;
		if ( restoreDisplay == null ) {
			restoreDisplay = dataPriv.get( elem, "display" );
		}
		display = jQuery.css( elem, "display" );
		if ( display === "none" ) {
			if ( restoreDisplay ) {
				display = restoreDisplay;
			} else {

				// Get nonempty value(s) by temporarily forcing visibility
				showHide( [ elem ], true );
				restoreDisplay = elem.style.display || restoreDisplay;
				display = jQuery.css( elem, "display" );
				showHide( [ elem ] );
			}
		}

		// Animate inline elements as inline-block
		if ( display === "inline" || display === "inline-block" && restoreDisplay != null ) {
			if ( jQuery.css( elem, "float" ) === "none" ) {

				// Restore the original display value at the end of pure show/hide animations
				if ( !propTween ) {
					anim.done( function() {
						style.display = restoreDisplay;
					} );
					if ( restoreDisplay == null ) {
						display = style.display;
						restoreDisplay = display === "none" ? "" : display;
					}
				}
				style.display = "inline-block";
			}
		}
	}

	if ( opts.overflow ) {
		style.overflow = "hidden";
		anim.always( function() {
			style.overflow = opts.overflow[ 0 ];
			style.overflowX = opts.overflow[ 1 ];
			style.overflowY = opts.overflow[ 2 ];
		} );
	}

	// Implement show/hide animations
	propTween = false;
	for ( prop in orig ) {

		// General show/hide setup for this element animation
		if ( !propTween ) {
			if ( dataShow ) {
				if ( "hidden" in dataShow ) {
					hidden = dataShow.hidden;
				}
			} else {
				dataShow = dataPriv.access( elem, "fxshow", { display: restoreDisplay } );
			}

			// Store hidden/visible for toggle so `.stop().toggle()` "reverses"
			if ( toggle ) {
				dataShow.hidden = !hidden;
			}

			// Show elements before animating them
			if ( hidden ) {
				showHide( [ elem ], true );
			}

			/* eslint-disable no-loop-func */

			anim.done( function() {

				/* eslint-enable no-loop-func */

				// The final step of a "hide" animation is actually hiding the element
				if ( !hidden ) {
					showHide( [ elem ] );
				}
				dataPriv.remove( elem, "fxshow" );
				for ( prop in orig ) {
					jQuery.style( elem, prop, orig[ prop ] );
				}
			} );
		}

		// Per-property setup
		propTween = createTween( hidden ? dataShow[ prop ] : 0, prop, anim );
		if ( !( prop in dataShow ) ) {
			dataShow[ prop ] = propTween.start;
			if ( hidden ) {
				propTween.end = propTween.start;
				propTween.start = 0;
			}
		}
	}
}

function propFilter( props, specialEasing ) {
	var index, name, easing, value, hooks;

	// camelCase, specialEasing and expand cssHook pass
	for ( index in props ) {
		name = camelCase( index );
		easing = specialEasing[ name ];
		value = props[ index ];
		if ( Array.isArray( value ) ) {
			easing = value[ 1 ];
			value = props[ index ] = value[ 0 ];
		}

		if ( index !== name ) {
			props[ name ] = value;
			delete props[ index ];
		}

		hooks = jQuery.cssHooks[ name ];
		if ( hooks && "expand" in hooks ) {
			value = hooks.expand( value );
			delete props[ name ];

			// Not quite $.extend, this won't overwrite existing keys.
			// Reusing 'index' because we have the correct "name"
			for ( index in value ) {
				if ( !( index in props ) ) {
					props[ index ] = value[ index ];
					specialEasing[ index ] = easing;
				}
			}
		} else {
			specialEasing[ name ] = easing;
		}
	}
}

function Animation( elem, properties, options ) {
	var result,
		stopped,
		index = 0,
		length = Animation.prefilters.length,
		deferred = jQuery.Deferred().always( function() {

			// Don't match elem in the :animated selector
			delete tick.elem;
		} ),
		tick = function() {
			if ( stopped ) {
				return false;
			}
			var currentTime = fxNow || createFxNow(),
				remaining = Math.max( 0, animation.startTime + animation.duration - currentTime ),

				// Support: Android 2.3 only
				// Archaic crash bug won't allow us to use `1 - ( 0.5 || 0 )` (#12497)
				temp = remaining / animation.duration || 0,
				percent = 1 - temp,
				index = 0,
				length = animation.tweens.length;

			for ( ; index < length; index++ ) {
				animation.tweens[ index ].run( percent );
			}

			deferred.notifyWith( elem, [ animation, percent, remaining ] );

			// If there's more to do, yield
			if ( percent < 1 && length ) {
				return remaining;
			}

			// If this was an empty animation, synthesize a final progress notification
			if ( !length ) {
				deferred.notifyWith( elem, [ animation, 1, 0 ] );
			}

			// Resolve the animation and report its conclusion
			deferred.resolveWith( elem, [ animation ] );
			return false;
		},
		animation = deferred.promise( {
			elem: elem,
			props: jQuery.extend( {}, properties ),
			opts: jQuery.extend( true, {
				specialEasing: {},
				easing: jQuery.easing._default
			}, options ),
			originalProperties: properties,
			originalOptions: options,
			startTime: fxNow || createFxNow(),
			duration: options.duration,
			tweens: [],
			createTween: function( prop, end ) {
				var tween = jQuery.Tween( elem, animation.opts, prop, end,
					animation.opts.specialEasing[ prop ] || animation.opts.easing );
				animation.tweens.push( tween );
				return tween;
			},
			stop: function( gotoEnd ) {
				var index = 0,

					// If we are going to the end, we want to run all the tweens
					// otherwise we skip this part
					length = gotoEnd ? animation.tweens.length : 0;
				if ( stopped ) {
					return this;
				}
				stopped = true;
				for ( ; index < length; index++ ) {
					animation.tweens[ index ].run( 1 );
				}

				// Resolve when we played the last frame; otherwise, reject
				if ( gotoEnd ) {
					deferred.notifyWith( elem, [ animation, 1, 0 ] );
					deferred.resolveWith( elem, [ animation, gotoEnd ] );
				} else {
					deferred.rejectWith( elem, [ animation, gotoEnd ] );
				}
				return this;
			}
		} ),
		props = animation.props;

	propFilter( props, animation.opts.specialEasing );

	for ( ; index < length; index++ ) {
		result = Animation.prefilters[ index ].call( animation, elem, props, animation.opts );
		if ( result ) {
			if ( isFunction( result.stop ) ) {
				jQuery._queueHooks( animation.elem, animation.opts.queue ).stop =
					result.stop.bind( result );
			}
			return result;
		}
	}

	jQuery.map( props, createTween, animation );

	if ( isFunction( animation.opts.start ) ) {
		animation.opts.start.call( elem, animation );
	}

	// Attach callbacks from options
	animation
		.progress( animation.opts.progress )
		.done( animation.opts.done, animation.opts.complete )
		.fail( animation.opts.fail )
		.always( animation.opts.always );

	jQuery.fx.timer(
		jQuery.extend( tick, {
			elem: elem,
			anim: animation,
			queue: animation.opts.queue
		} )
	);

	return animation;
}

jQuery.Animation = jQuery.extend( Animation, {

	tweeners: {
		"*": [ function( prop, value ) {
			var tween = this.createTween( prop, value );
			adjustCSS( tween.elem, prop, rcssNum.exec( value ), tween );
			return tween;
		} ]
	},

	tweener: function( props, callback ) {
		if ( isFunction( props ) ) {
			callback = props;
			props = [ "*" ];
		} else {
			props = props.match( rnothtmlwhite );
		}

		var prop,
			index = 0,
			length = props.length;

		for ( ; index < length; index++ ) {
			prop = props[ index ];
			Animation.tweeners[ prop ] = Animation.tweeners[ prop ] || [];
			Animation.tweeners[ prop ].unshift( callback );
		}
	},

	prefilters: [ defaultPrefilter ],

	prefilter: function( callback, prepend ) {
		if ( prepend ) {
			Animation.prefilters.unshift( callback );
		} else {
			Animation.prefilters.push( callback );
		}
	}
} );

jQuery.speed = function( speed, easing, fn ) {
	var opt = speed && typeof speed === "object" ? jQuery.extend( {}, speed ) : {
		complete: fn || !fn && easing ||
			isFunction( speed ) && speed,
		duration: speed,
		easing: fn && easing || easing && !isFunction( easing ) && easing
	};

	// Go to the end state if fx are off
	if ( jQuery.fx.off ) {
		opt.duration = 0;

	} else {
		if ( typeof opt.duration !== "number" ) {
			if ( opt.duration in jQuery.fx.speeds ) {
				opt.duration = jQuery.fx.speeds[ opt.duration ];

			} else {
				opt.duration = jQuery.fx.speeds._default;
			}
		}
	}

	// Normalize opt.queue - true/undefined/null -> "fx"
	if ( opt.queue == null || opt.queue === true ) {
		opt.queue = "fx";
	}

	// Queueing
	opt.old = opt.complete;

	opt.complete = function() {
		if ( isFunction( opt.old ) ) {
			opt.old.call( this );
		}

		if ( opt.queue ) {
			jQuery.dequeue( this, opt.queue );
		}
	};

	return opt;
};

jQuery.fn.extend( {
	fadeTo: function( speed, to, easing, callback ) {

		// Show any hidden elements after setting opacity to 0
		return this.filter( isHiddenWithinTree ).css( "opacity", 0 ).show()

			// Animate to the value specified
			.end().animate( { opacity: to }, speed, easing, callback );
	},
	animate: function( prop, speed, easing, callback ) {
		var empty = jQuery.isEmptyObject( prop ),
			optall = jQuery.speed( speed, easing, callback ),
			doAnimation = function() {

				// Operate on a copy of prop so per-property easing won't be lost
				var anim = Animation( this, jQuery.extend( {}, prop ), optall );

				// Empty animations, or finishing resolves immediately
				if ( empty || dataPriv.get( this, "finish" ) ) {
					anim.stop( true );
				}
			};

		doAnimation.finish = doAnimation;

		return empty || optall.queue === false ?
			this.each( doAnimation ) :
			this.queue( optall.queue, doAnimation );
	},
	stop: function( type, clearQueue, gotoEnd ) {
		var stopQueue = function( hooks ) {
			var stop = hooks.stop;
			delete hooks.stop;
			stop( gotoEnd );
		};

		if ( typeof type !== "string" ) {
			gotoEnd = clearQueue;
			clearQueue = type;
			type = undefined;
		}
		if ( clearQueue ) {
			this.queue( type || "fx", [] );
		}

		return this.each( function() {
			var dequeue = true,
				index = type != null && type + "queueHooks",
				timers = jQuery.timers,
				data = dataPriv.get( this );

			if ( index ) {
				if ( data[ index ] && data[ index ].stop ) {
					stopQueue( data[ index ] );
				}
			} else {
				for ( index in data ) {
					if ( data[ index ] && data[ index ].stop && rrun.test( index ) ) {
						stopQueue( data[ index ] );
					}
				}
			}

			for ( index = timers.length; index--; ) {
				if ( timers[ index ].elem === this &&
					( type == null || timers[ index ].queue === type ) ) {

					timers[ index ].anim.stop( gotoEnd );
					dequeue = false;
					timers.splice( index, 1 );
				}
			}

			// Start the next in the queue if the last step wasn't forced.
			// Timers currently will call their complete callbacks, which
			// will dequeue but only if they were gotoEnd.
			if ( dequeue || !gotoEnd ) {
				jQuery.dequeue( this, type );
			}
		} );
	},
	finish: function( type ) {
		if ( type !== false ) {
			type = type || "fx";
		}
		return this.each( function() {
			var index,
				data = dataPriv.get( this ),
				queue = data[ type + "queue" ],
				hooks = data[ type + "queueHooks" ],
				timers = jQuery.timers,
				length = queue ? queue.length : 0;

			// Enable finishing flag on private data
			data.finish = true;

			// Empty the queue first
			jQuery.queue( this, type, [] );

			if ( hooks && hooks.stop ) {
				hooks.stop.call( this, true );
			}

			// Look for any active animations, and finish them
			for ( index = timers.length; index--; ) {
				if ( timers[ index ].elem === this && timers[ index ].queue === type ) {
					timers[ index ].anim.stop( true );
					timers.splice( index, 1 );
				}
			}

			// Look for any animations in the old queue and finish them
			for ( index = 0; index < length; index++ ) {
				if ( queue[ index ] && queue[ index ].finish ) {
					queue[ index ].finish.call( this );
				}
			}

			// Turn off finishing flag
			delete data.finish;
		} );
	}
} );

jQuery.each( [ "toggle", "show", "hide" ], function( _i, name ) {
	var cssFn = jQuery.fn[ name ];
	jQuery.fn[ name ] = function( speed, easing, callback ) {
		return speed == null || typeof speed === "boolean" ?
			cssFn.apply( this, arguments ) :
			this.animate( genFx( name, true ), speed, easing, callback );
	};
} );

// Generate shortcuts for custom animations
jQuery.each( {
	slideDown: genFx( "show" ),
	slideUp: genFx( "hide" ),
	slideToggle: genFx( "toggle" ),
	fadeIn: { opacity: "show" },
	fadeOut: { opacity: "hide" },
	fadeToggle: { opacity: "toggle" }
}, function( name, props ) {
	jQuery.fn[ name ] = function( speed, easing, callback ) {
		return this.animate( props, speed, easing, callback );
	};
} );

jQuery.timers = [];
jQuery.fx.tick = function() {
	var timer,
		i = 0,
		timers = jQuery.timers;

	fxNow = Date.now();

	for ( ; i < timers.length; i++ ) {
		timer = timers[ i ];

		// Run the timer and safely remove it when done (allowing for external removal)
		if ( !timer() && timers[ i ] === timer ) {
			timers.splice( i--, 1 );
		}
	}

	if ( !timers.length ) {
		jQuery.fx.stop();
	}
	fxNow = undefined;
};

jQuery.fx.timer = function( timer ) {
	jQuery.timers.push( timer );
	jQuery.fx.start();
};

jQuery.fx.interval = 13;
jQuery.fx.start = function() {
	if ( inProgress ) {
		return;
	}

	inProgress = true;
	schedule();
};

jQuery.fx.stop = function() {
	inProgress = null;
};

jQuery.fx.speeds = {
	slow: 600,
	fast: 200,

	// Default speed
	_default: 400
};


// Based off of the plugin by Clint Helfers, with permission.
// https://web.archive.org/web/20100324014747/http://blindsignals.com/index.php/2009/07/jquery-delay/
jQuery.fn.delay = function( time, type ) {
	time = jQuery.fx ? jQuery.fx.speeds[ time ] || time : time;
	type = type || "fx";

	return this.queue( type, function( next, hooks ) {
		var timeout = window.setTimeout( next, time );
		hooks.stop = function() {
			window.clearTimeout( timeout );
		};
	} );
};


( function() {
	var input = document.createElement( "input" ),
		select = document.createElement( "select" ),
		opt = select.appendChild( document.createElement( "option" ) );

	input.type = "checkbox";

	// Support: Android <=4.3 only
	// Default value for a checkbox should be "on"
	support.checkOn = input.value !== "";

	// Support: IE <=11 only
	// Must access selectedIndex to make default options select
	support.optSelected = opt.selected;

	// Support: IE <=11 only
	// An input loses its value after becoming a radio
	input = document.createElement( "input" );
	input.value = "t";
	input.type = "radio";
	support.radioValue = input.value === "t";
} )();


var boolHook,
	attrHandle = jQuery.expr.attrHandle;

jQuery.fn.extend( {
	attr: function( name, value ) {
		return access( this, jQuery.attr, name, value, arguments.length > 1 );
	},

	removeAttr: function( name ) {
		return this.each( function() {
			jQuery.removeAttr( this, name );
		} );
	}
} );

jQuery.extend( {
	attr: function( elem, name, value ) {
		var ret, hooks,
			nType = elem.nodeType;

		// Don't get/set attributes on text, comment and attribute nodes
		if ( nType === 3 || nType === 8 || nType === 2 ) {
			return;
		}

		// Fallback to prop when attributes are not supported
		if ( typeof elem.getAttribute === "undefined" ) {
			return jQuery.prop( elem, name, value );
		}

		// Attribute hooks are determined by the lowercase version
		// Grab necessary hook if one is defined
		if ( nType !== 1 || !jQuery.isXMLDoc( elem ) ) {
			hooks = jQuery.attrHooks[ name.toLowerCase() ] ||
				( jQuery.expr.match.bool.test( name ) ? boolHook : undefined );
		}

		if ( value !== undefined ) {
			if ( value === null ) {
				jQuery.removeAttr( elem, name );
				return;
			}

			if ( hooks && "set" in hooks &&
				( ret = hooks.set( elem, value, name ) ) !== undefined ) {
				return ret;
			}

			elem.setAttribute( name, value + "" );
			return value;
		}

		if ( hooks && "get" in hooks && ( ret = hooks.get( elem, name ) ) !== null ) {
			return ret;
		}

		ret = jQuery.find.attr( elem, name );

		// Non-existent attributes return null, we normalize to undefined
		return ret == null ? undefined : ret;
	},

	attrHooks: {
		type: {
			set: function( elem, value ) {
				if ( !support.radioValue && value === "radio" &&
					nodeName( elem, "input" ) ) {
					var val = elem.value;
					elem.setAttribute( "type", value );
					if ( val ) {
						elem.value = val;
					}
					return value;
				}
			}
		}
	},

	removeAttr: function( elem, value ) {
		var name,
			i = 0,

			// Attribute names can contain non-HTML whitespace characters
			// https://html.spec.whatwg.org/multipage/syntax.html#attributes-2
			attrNames = value && value.match( rnothtmlwhite );

		if ( attrNames && elem.nodeType === 1 ) {
			while ( ( name = attrNames[ i++ ] ) ) {
				elem.removeAttribute( name );
			}
		}
	}
} );

// Hooks for boolean attributes
boolHook = {
	set: function( elem, value, name ) {
		if ( value === false ) {

			// Remove boolean attributes when set to false
			jQuery.removeAttr( elem, name );
		} else {
			elem.setAttribute( name, name );
		}
		return name;
	}
};

jQuery.each( jQuery.expr.match.bool.source.match( /\w+/g ), function( _i, name ) {
	var getter = attrHandle[ name ] || jQuery.find.attr;

	attrHandle[ name ] = function( elem, name, isXML ) {
		var ret, handle,
			lowercaseName = name.toLowerCase();

		if ( !isXML ) {

			// Avoid an infinite loop by temporarily removing this function from the getter
			handle = attrHandle[ lowercaseName ];
			attrHandle[ lowercaseName ] = ret;
			ret = getter( elem, name, isXML ) != null ?
				lowercaseName :
				null;
			attrHandle[ lowercaseName ] = handle;
		}
		return ret;
	};
} );




var rfocusable = /^(?:input|select|textarea|button)$/i,
	rclickable = /^(?:a|area)$/i;

jQuery.fn.extend( {
	prop: function( name, value ) {
		return access( this, jQuery.prop, name, value, arguments.length > 1 );
	},

	removeProp: function( name ) {
		return this.each( function() {
			delete this[ jQuery.propFix[ name ] || name ];
		} );
	}
} );

jQuery.extend( {
	prop: function( elem, name, value ) {
		var ret, hooks,
			nType = elem.nodeType;

		// Don't get/set properties on text, comment and attribute nodes
		if ( nType === 3 || nType === 8 || nType === 2 ) {
			return;
		}

		if ( nType !== 1 || !jQuery.isXMLDoc( elem ) ) {

			// Fix name and attach hooks
			name = jQuery.propFix[ name ] || name;
			hooks = jQuery.propHooks[ name ];
		}

		if ( value !== undefined ) {
			if ( hooks && "set" in hooks &&
				( ret = hooks.set( elem, value, name ) ) !== undefined ) {
				return ret;
			}

			return ( elem[ name ] = value );
		}

		if ( hooks && "get" in hooks && ( ret = hooks.get( elem, name ) ) !== null ) {
			return ret;
		}

		return elem[ name ];
	},

	propHooks: {
		tabIndex: {
			get: function( elem ) {

				// Support: IE <=9 - 11 only
				// elem.tabIndex doesn't always return the
				// correct value when it hasn't been explicitly set
				// https://web.archive.org/web/20141116233347/http://fluidproject.org/blog/2008/01/09/getting-setting-and-removing-tabindex-values-with-javascript/
				// Use proper attribute retrieval(#12072)
				var tabindex = jQuery.find.attr( elem, "tabindex" );

				if ( tabindex ) {
					return parseInt( tabindex, 10 );
				}

				if (
					rfocusable.test( elem.nodeName ) ||
					rclickable.test( elem.nodeName ) &&
					elem.href
				) {
					return 0;
				}

				return -1;
			}
		}
	},

	propFix: {
		"for": "htmlFor",
		"class": "className"
	}
} );

// Support: IE <=11 only
// Accessing the selectedIndex property
// forces the browser to respect setting selected
// on the option
// The getter ensures a default option is selected
// when in an optgroup
// eslint rule "no-unused-expressions" is disabled for this code
// since it considers such accessions noop
if ( !support.optSelected ) {
	jQuery.propHooks.selected = {
		get: function( elem ) {

			/* eslint no-unused-expressions: "off" */

			var parent = elem.parentNode;
			if ( parent && parent.parentNode ) {
				parent.parentNode.selectedIndex;
			}
			return null;
		},
		set: function( elem ) {

			/* eslint no-unused-expressions: "off" */

			var parent = elem.parentNode;
			if ( parent ) {
				parent.selectedIndex;

				if ( parent.parentNode ) {
					parent.parentNode.selectedIndex;
				}
			}
		}
	};
}

jQuery.each( [
	"tabIndex",
	"readOnly",
	"maxLength",
	"cellSpacing",
	"cellPadding",
	"rowSpan",
	"colSpan",
	"useMap",
	"frameBorder",
	"contentEditable"
], function() {
	jQuery.propFix[ this.toLowerCase() ] = this;
} );




	// Strip and collapse whitespace according to HTML spec
	// https://infra.spec.whatwg.org/#strip-and-collapse-ascii-whitespace
	function stripAndCollapse( value ) {
		var tokens = value.match( rnothtmlwhite ) || [];
		return tokens.join( " " );
	}


function getClass( elem ) {
	return elem.getAttribute && elem.getAttribute( "class" ) || "";
}

function classesToArray( value ) {
	if ( Array.isArray( value ) ) {
		return value;
	}
	if ( typeof value === "string" ) {
		return value.match( rnothtmlwhite ) || [];
	}
	return [];
}

jQuery.fn.extend( {
	addClass: function( value ) {
		var classes, elem, cur, curValue, clazz, j, finalValue,
			i = 0;

		if ( isFunction( value ) ) {
			return this.each( function( j ) {
				jQuery( this ).addClass( value.call( this, j, getClass( this ) ) );
			} );
		}

		classes = classesToArray( value );

		if ( classes.length ) {
			while ( ( elem = this[ i++ ] ) ) {
				curValue = getClass( elem );
				cur = elem.nodeType === 1 && ( " " + stripAndCollapse( curValue ) + " " );

				if ( cur ) {
					j = 0;
					while ( ( clazz = classes[ j++ ] ) ) {
						if ( cur.indexOf( " " + clazz + " " ) < 0 ) {
							cur += clazz + " ";
						}
					}

					// Only assign if different to avoid unneeded rendering.
					finalValue = stripAndCollapse( cur );
					if ( curValue !== finalValue ) {
						elem.setAttribute( "class", finalValue );
					}
				}
			}
		}

		return this;
	},

	removeClass: function( value ) {
		var classes, elem, cur, curValue, clazz, j, finalValue,
			i = 0;

		if ( isFunction( value ) ) {
			return this.each( function( j ) {
				jQuery( this ).removeClass( value.call( this, j, getClass( this ) ) );
			} );
		}

		if ( !arguments.length ) {
			return this.attr( "class", "" );
		}

		classes = classesToArray( value );

		if ( classes.length ) {
			while ( ( elem = this[ i++ ] ) ) {
				curValue = getClass( elem );

				// This expression is here for better compressibility (see addClass)
				cur = elem.nodeType === 1 && ( " " + stripAndCollapse( curValue ) + " " );

				if ( cur ) {
					j = 0;
					while ( ( clazz = classes[ j++ ] ) ) {

						// Remove *all* instances
						while ( cur.indexOf( " " + clazz + " " ) > -1 ) {
							cur = cur.replace( " " + clazz + " ", " " );
						}
					}

					// Only assign if different to avoid unneeded rendering.
					finalValue = stripAndCollapse( cur );
					if ( curValue !== finalValue ) {
						elem.setAttribute( "class", finalValue );
					}
				}
			}
		}

		return this;
	},

	toggleClass: function( value, stateVal ) {
		var type = typeof value,
			isValidValue = type === "string" || Array.isArray( value );

		if ( typeof stateVal === "boolean" && isValidValue ) {
			return stateVal ? this.addClass( value ) : this.removeClass( value );
		}

		if ( isFunction( value ) ) {
			return this.each( function( i ) {
				jQuery( this ).toggleClass(
					value.call( this, i, getClass( this ), stateVal ),
					stateVal
				);
			} );
		}

		return this.each( function() {
			var className, i, self, classNames;

			if ( isValidValue ) {

				// Toggle individual class names
				i = 0;
				self = jQuery( this );
				classNames = classesToArray( value );

				while ( ( className = classNames[ i++ ] ) ) {

					// Check each className given, space separated list
					if ( self.hasClass( className ) ) {
						self.removeClass( className );
					} else {
						self.addClass( className );
					}
				}

			// Toggle whole class name
			} else if ( value === undefined || type === "boolean" ) {
				className = getClass( this );
				if ( className ) {

					// Store className if set
					dataPriv.set( this, "__className__", className );
				}

				// If the element has a class name or if we're passed `false`,
				// then remove the whole classname (if there was one, the above saved it).
				// Otherwise bring back whatever was previously saved (if anything),
				// falling back to the empty string if nothing was stored.
				if ( this.setAttribute ) {
					this.setAttribute( "class",
						className || value === false ?
							"" :
							dataPriv.get( this, "__className__" ) || ""
					);
				}
			}
		} );
	},

	hasClass: function( selector ) {
		var className, elem,
			i = 0;

		className = " " + selector + " ";
		while ( ( elem = this[ i++ ] ) ) {
			if ( elem.nodeType === 1 &&
				( " " + stripAndCollapse( getClass( elem ) ) + " " ).indexOf( className ) > -1 ) {
				return true;
			}
		}

		return false;
	}
} );




var rreturn = /\r/g;

jQuery.fn.extend( {
	val: function( value ) {
		var hooks, ret, valueIsFunction,
			elem = this[ 0 ];

		if ( !arguments.length ) {
			if ( elem ) {
				hooks = jQuery.valHooks[ elem.type ] ||
					jQuery.valHooks[ elem.nodeName.toLowerCase() ];

				if ( hooks &&
					"get" in hooks &&
					( ret = hooks.get( elem, "value" ) ) !== undefined
				) {
					return ret;
				}

				ret = elem.value;

				// Handle most common string cases
				if ( typeof ret === "string" ) {
					return ret.replace( rreturn, "" );
				}

				// Handle cases where value is null/undef or number
				return ret == null ? "" : ret;
			}

			return;
		}

		valueIsFunction = isFunction( value );

		return this.each( function( i ) {
			var val;

			if ( this.nodeType !== 1 ) {
				return;
			}

			if ( valueIsFunction ) {
				val = value.call( this, i, jQuery( this ).val() );
			} else {
				val = value;
			}

			// Treat null/undefined as ""; convert numbers to string
			if ( val == null ) {
				val = "";

			} else if ( typeof val === "number" ) {
				val += "";

			} else if ( Array.isArray( val ) ) {
				val = jQuery.map( val, function( value ) {
					return value == null ? "" : value + "";
				} );
			}

			hooks = jQuery.valHooks[ this.type ] || jQuery.valHooks[ this.nodeName.toLowerCase() ];

			// If set returns undefined, fall back to normal setting
			if ( !hooks || !( "set" in hooks ) || hooks.set( this, val, "value" ) === undefined ) {
				this.value = val;
			}
		} );
	}
} );

jQuery.extend( {
	valHooks: {
		option: {
			get: function( elem ) {

				var val = jQuery.find.attr( elem, "value" );
				return val != null ?
					val :

					// Support: IE <=10 - 11 only
					// option.text throws exceptions (#14686, #14858)
					// Strip and collapse whitespace
					// https://html.spec.whatwg.org/#strip-and-collapse-whitespace
					stripAndCollapse( jQuery.text( elem ) );
			}
		},
		select: {
			get: function( elem ) {
				var value, option, i,
					options = elem.options,
					index = elem.selectedIndex,
					one = elem.type === "select-one",
					values = one ? null : [],
					max = one ? index + 1 : options.length;

				if ( index < 0 ) {
					i = max;

				} else {
					i = one ? index : 0;
				}

				// Loop through all the selected options
				for ( ; i < max; i++ ) {
					option = options[ i ];

					// Support: IE <=9 only
					// IE8-9 doesn't update selected after form reset (#2551)
					if ( ( option.selected || i === index ) &&

							// Don't return options that are disabled or in a disabled optgroup
							!option.disabled &&
							( !option.parentNode.disabled ||
								!nodeName( option.parentNode, "optgroup" ) ) ) {

						// Get the specific value for the option
						value = jQuery( option ).val();

						// We don't need an array for one selects
						if ( one ) {
							return value;
						}

						// Multi-Selects return an array
						values.push( value );
					}
				}

				return values;
			},

			set: function( elem, value ) {
				var optionSet, option,
					options = elem.options,
					values = jQuery.makeArray( value ),
					i = options.length;

				while ( i-- ) {
					option = options[ i ];

					/* eslint-disable no-cond-assign */

					if ( option.selected =
						jQuery.inArray( jQuery.valHooks.option.get( option ), values ) > -1
					) {
						optionSet = true;
					}

					/* eslint-enable no-cond-assign */
				}

				// Force browsers to behave consistently when non-matching value is set
				if ( !optionSet ) {
					elem.selectedIndex = -1;
				}
				return values;
			}
		}
	}
} );

// Radios and checkboxes getter/setter
jQuery.each( [ "radio", "checkbox" ], function() {
	jQuery.valHooks[ this ] = {
		set: function( elem, value ) {
			if ( Array.isArray( value ) ) {
				return ( elem.checked = jQuery.inArray( jQuery( elem ).val(), value ) > -1 );
			}
		}
	};
	if ( !support.checkOn ) {
		jQuery.valHooks[ this ].get = function( elem ) {
			return elem.getAttribute( "value" ) === null ? "on" : elem.value;
		};
	}
} );




// Return jQuery for attributes-only inclusion


support.focusin = "onfocusin" in window;


var rfocusMorph = /^(?:focusinfocus|focusoutblur)$/,
	stopPropagationCallback = function( e ) {
		e.stopPropagation();
	};

jQuery.extend( jQuery.event, {

	trigger: function( event, data, elem, onlyHandlers ) {

		var i, cur, tmp, bubbleType, ontype, handle, special, lastElement,
			eventPath = [ elem || document ],
			type = hasOwn.call( event, "type" ) ? event.type : event,
			namespaces = hasOwn.call( event, "namespace" ) ? event.namespace.split( "." ) : [];

		cur = lastElement = tmp = elem = elem || document;

		// Don't do events on text and comment nodes
		if ( elem.nodeType === 3 || elem.nodeType === 8 ) {
			return;
		}

		// focus/blur morphs to focusin/out; ensure we're not firing them right now
		if ( rfocusMorph.test( type + jQuery.event.triggered ) ) {
			return;
		}

		if ( type.indexOf( "." ) > -1 ) {

			// Namespaced trigger; create a regexp to match event type in handle()
			namespaces = type.split( "." );
			type = namespaces.shift();
			namespaces.sort();
		}
		ontype = type.indexOf( ":" ) < 0 && "on" + type;

		// Caller can pass in a jQuery.Event object, Object, or just an event type string
		event = event[ jQuery.expando ] ?
			event :
			new jQuery.Event( type, typeof event === "object" && event );

		// Trigger bitmask: & 1 for native handlers; & 2 for jQuery (always true)
		event.isTrigger = onlyHandlers ? 2 : 3;
		event.namespace = namespaces.join( "." );
		event.rnamespace = event.namespace ?
			new RegExp( "(^|\\.)" + namespaces.join( "\\.(?:.*\\.|)" ) + "(\\.|$)" ) :
			null;

		// Clean up the event in case it is being reused
		event.result = undefined;
		if ( !event.target ) {
			event.target = elem;
		}

		// Clone any incoming data and prepend the event, creating the handler arg list
		data = data == null ?
			[ event ] :
			jQuery.makeArray( data, [ event ] );

		// Allow special events to draw outside the lines
		special = jQuery.event.special[ type ] || {};
		if ( !onlyHandlers && special.trigger && special.trigger.apply( elem, data ) === false ) {
			return;
		}

		// Determine event propagation path in advance, per W3C events spec (#9951)
		// Bubble up to document, then to window; watch for a global ownerDocument var (#9724)
		if ( !onlyHandlers && !special.noBubble && !isWindow( elem ) ) {

			bubbleType = special.delegateType || type;
			if ( !rfocusMorph.test( bubbleType + type ) ) {
				cur = cur.parentNode;
			}
			for ( ; cur; cur = cur.parentNode ) {
				eventPath.push( cur );
				tmp = cur;
			}

			// Only add window if we got to document (e.g., not plain obj or detached DOM)
			if ( tmp === ( elem.ownerDocument || document ) ) {
				eventPath.push( tmp.defaultView || tmp.parentWindow || window );
			}
		}

		// Fire handlers on the event path
		i = 0;
		while ( ( cur = eventPath[ i++ ] ) && !event.isPropagationStopped() ) {
			lastElement = cur;
			event.type = i > 1 ?
				bubbleType :
				special.bindType || type;

			// jQuery handler
			handle = ( dataPriv.get( cur, "events" ) || Object.create( null ) )[ event.type ] &&
				dataPriv.get( cur, "handle" );
			if ( handle ) {
				handle.apply( cur, data );
			}

			// Native handler
			handle = ontype && cur[ ontype ];
			if ( handle && handle.apply && acceptData( cur ) ) {
				event.result = handle.apply( cur, data );
				if ( event.result === false ) {
					event.preventDefault();
				}
			}
		}
		event.type = type;

		// If nobody prevented the default action, do it now
		if ( !onlyHandlers && !event.isDefaultPrevented() ) {

			if ( ( !special._default ||
				special._default.apply( eventPath.pop(), data ) === false ) &&
				acceptData( elem ) ) {

				// Call a native DOM method on the target with the same name as the event.
				// Don't do default actions on window, that's where global variables be (#6170)
				if ( ontype && isFunction( elem[ type ] ) && !isWindow( elem ) ) {

					// Don't re-trigger an onFOO event when we call its FOO() method
					tmp = elem[ ontype ];

					if ( tmp ) {
						elem[ ontype ] = null;
					}

					// Prevent re-triggering of the same event, since we already bubbled it above
					jQuery.event.triggered = type;

					if ( event.isPropagationStopped() ) {
						lastElement.addEventListener( type, stopPropagationCallback );
					}

					elem[ type ]();

					if ( event.isPropagationStopped() ) {
						lastElement.removeEventListener( type, stopPropagationCallback );
					}

					jQuery.event.triggered = undefined;

					if ( tmp ) {
						elem[ ontype ] = tmp;
					}
				}
			}
		}

		return event.result;
	},

	// Piggyback on a donor event to simulate a different one
	// Used only for `focus(in | out)` events
	simulate: function( type, elem, event ) {
		var e = jQuery.extend(
			new jQuery.Event(),
			event,
			{
				type: type,
				isSimulated: true
			}
		);

		jQuery.event.trigger( e, null, elem );
	}

} );

jQuery.fn.extend( {

	trigger: function( type, data ) {
		return this.each( function() {
			jQuery.event.trigger( type, data, this );
		} );
	},
	triggerHandler: function( type, data ) {
		var elem = this[ 0 ];
		if ( elem ) {
			return jQuery.event.trigger( type, data, elem, true );
		}
	}
} );


// Support: Firefox <=44
// Firefox doesn't have focus(in | out) events
// Related ticket - https://bugzilla.mozilla.org/show_bug.cgi?id=687787
//
// Support: Chrome <=48 - 49, Safari <=9.0 - 9.1
// focus(in | out) events fire after focus & blur events,
// which is spec violation - http://www.w3.org/TR/DOM-Level-3-Events/#events-focusevent-event-order
// Related ticket - https://bugs.chromium.org/p/chromium/issues/detail?id=449857
if ( !support.focusin ) {
	jQuery.each( { focus: "focusin", blur: "focusout" }, function( orig, fix ) {

		// Attach a single capturing handler on the document while someone wants focusin/focusout
		var handler = function( event ) {
			jQuery.event.simulate( fix, event.target, jQuery.event.fix( event ) );
		};

		jQuery.event.special[ fix ] = {
			setup: function() {

				// Handle: regular nodes (via `this.ownerDocument`), window
				// (via `this.document`) & document (via `this`).
				var doc = this.ownerDocument || this.document || this,
					attaches = dataPriv.access( doc, fix );

				if ( !attaches ) {
					doc.addEventListener( orig, handler, true );
				}
				dataPriv.access( doc, fix, ( attaches || 0 ) + 1 );
			},
			teardown: function() {
				var doc = this.ownerDocument || this.document || this,
					attaches = dataPriv.access( doc, fix ) - 1;

				if ( !attaches ) {
					doc.removeEventListener( orig, handler, true );
					dataPriv.remove( doc, fix );

				} else {
					dataPriv.access( doc, fix, attaches );
				}
			}
		};
	} );
}
var location = window.location;

var nonce = { guid: Date.now() };

var rquery = ( /\?/ );



// Cross-browser xml parsing
jQuery.parseXML = function( data ) {
	var xml, parserErrorElem;
	if ( !data || typeof data !== "string" ) {
		return null;
	}

	// Support: IE 9 - 11 only
	// IE throws on parseFromString with invalid input.
	try {
		xml = ( new window.DOMParser() ).parseFromString( data, "text/xml" );
	} catch ( e ) {}

	parserErrorElem = xml && xml.getElementsByTagName( "parsererror" )[ 0 ];
	if ( !xml || parserErrorElem ) {
		jQuery.error( "Invalid XML: " + (
			parserErrorElem ?
				jQuery.map( parserErrorElem.childNodes, function( el ) {
					return el.textContent;
				} ).join( "\n" ) :
				data
		) );
	}
	return xml;
};


var
	rbracket = /\[\]$/,
	rCRLF = /\r?\n/g,
	rsubmitterTypes = /^(?:submit|button|image|reset|file)$/i,
	rsubmittable = /^(?:input|select|textarea|keygen)/i;

function buildParams( prefix, obj, traditional, add ) {
	var name;

	if ( Array.isArray( obj ) ) {

		// Serialize array item.
		jQuery.each( obj, function( i, v ) {
			if ( traditional || rbracket.test( prefix ) ) {

				// Treat each array item as a scalar.
				add( prefix, v );

			} else {

				// Item is non-scalar (array or object), encode its numeric index.
				buildParams(
					prefix + "[" + ( typeof v === "object" && v != null ? i : "" ) + "]",
					v,
					traditional,
					add
				);
			}
		} );

	} else if ( !traditional && toType( obj ) === "object" ) {

		// Serialize object item.
		for ( name in obj ) {
			buildParams( prefix + "[" + name + "]", obj[ name ], traditional, add );
		}

	} else {

		// Serialize scalar item.
		add( prefix, obj );
	}
}

// Serialize an array of form elements or a set of
// key/values into a query string
jQuery.param = function( a, traditional ) {
	var prefix,
		s = [],
		add = function( key, valueOrFunction ) {

			// If value is a function, invoke it and use its return value
			var value = isFunction( valueOrFunction ) ?
				valueOrFunction() :
				valueOrFunction;

			s[ s.length ] = encodeURIComponent( key ) + "=" +
				encodeURIComponent( value == null ? "" : value );
		};

	if ( a == null ) {
		return "";
	}

	// If an array was passed in, assume that it is an array of form elements.
	if ( Array.isArray( a ) || ( a.jquery && !jQuery.isPlainObject( a ) ) ) {

		// Serialize the form elements
		jQuery.each( a, function() {
			add( this.name, this.value );
		} );

	} else {

		// If traditional, encode the "old" way (the way 1.3.2 or older
		// did it), otherwise encode params recursively.
		for ( prefix in a ) {
			buildParams( prefix, a[ prefix ], traditional, add );
		}
	}

	// Return the resulting serialization
	return s.join( "&" );
};

jQuery.fn.extend( {
	serialize: function() {
		return jQuery.param( this.serializeArray() );
	},
	serializeArray: function() {
		return this.map( function() {

			// Can add propHook for "elements" to filter or add form elements
			var elements = jQuery.prop( this, "elements" );
			return elements ? jQuery.makeArray( elements ) : this;
		} ).filter( function() {
			var type = this.type;

			// Use .is( ":disabled" ) so that fieldset[disabled] works
			return this.name && !jQuery( this ).is( ":disabled" ) &&
				rsubmittable.test( this.nodeName ) && !rsubmitterTypes.test( type ) &&
				( this.checked || !rcheckableType.test( type ) );
		} ).map( function( _i, elem ) {
			var val = jQuery( this ).val();

			if ( val == null ) {
				return null;
			}

			if ( Array.isArray( val ) ) {
				return jQuery.map( val, function( val ) {
					return { name: elem.name, value: val.replace( rCRLF, "\r\n" ) };
				} );
			}

			return { name: elem.name, value: val.replace( rCRLF, "\r\n" ) };
		} ).get();
	}
} );


var
	r20 = /%20/g,
	rhash = /#.*$/,
	rantiCache = /([?&])_=[^&]*/,
	rheaders = /^(.*?):[ \t]*([^\r\n]*)$/mg,

	// #7653, #8125, #8152: local protocol detection
	rlocalProtocol = /^(?:about|app|app-storage|.+-extension|file|res|widget):$/,
	rnoContent = /^(?:GET|HEAD)$/,
	rprotocol = /^\/\//,

	/* Prefilters
	 * 1) They are useful to introduce custom dataTypes (see ajax/jsonp.js for an example)
	 * 2) These are called:
	 *    - BEFORE asking for a transport
	 *    - AFTER param serialization (s.data is a string if s.processData is true)
	 * 3) key is the dataType
	 * 4) the catchall symbol "*" can be used
	 * 5) execution will start with transport dataType and THEN continue down to "*" if needed
	 */
	prefilters = {},

	/* Transports bindings
	 * 1) key is the dataType
	 * 2) the catchall symbol "*" can be used
	 * 3) selection will start with transport dataType and THEN go to "*" if needed
	 */
	transports = {},

	// Avoid comment-prolog char sequence (#10098); must appease lint and evade compression
	allTypes = "*/".concat( "*" ),

	// Anchor tag for parsing the document origin
	originAnchor = document.createElement( "a" );

originAnchor.href = location.href;

// Base "constructor" for jQuery.ajaxPrefilter and jQuery.ajaxTransport
function addToPrefiltersOrTransports( structure ) {

	// dataTypeExpression is optional and defaults to "*"
	return function( dataTypeExpression, func ) {

		if ( typeof dataTypeExpression !== "string" ) {
			func = dataTypeExpression;
			dataTypeExpression = "*";
		}

		var dataType,
			i = 0,
			dataTypes = dataTypeExpression.toLowerCase().match( rnothtmlwhite ) || [];

		if ( isFunction( func ) ) {

			// For each dataType in the dataTypeExpression
			while ( ( dataType = dataTypes[ i++ ] ) ) {

				// Prepend if requested
				if ( dataType[ 0 ] === "+" ) {
					dataType = dataType.slice( 1 ) || "*";
					( structure[ dataType ] = structure[ dataType ] || [] ).unshift( func );

				// Otherwise append
				} else {
					( structure[ dataType ] = structure[ dataType ] || [] ).push( func );
				}
			}
		}
	};
}

// Base inspection function for prefilters and transports
function inspectPrefiltersOrTransports( structure, options, originalOptions, jqXHR ) {

	var inspected = {},
		seekingTransport = ( structure === transports );

	function inspect( dataType ) {
		var selected;
		inspected[ dataType ] = true;
		jQuery.each( structure[ dataType ] || [], function( _, prefilterOrFactory ) {
			var dataTypeOrTransport = prefilterOrFactory( options, originalOptions, jqXHR );
			if ( typeof dataTypeOrTransport === "string" &&
				!seekingTransport && !inspected[ dataTypeOrTransport ] ) {

				options.dataTypes.unshift( dataTypeOrTransport );
				inspect( dataTypeOrTransport );
				return false;
			} else if ( seekingTransport ) {
				return !( selected = dataTypeOrTransport );
			}
		} );
		return selected;
	}

	return inspect( options.dataTypes[ 0 ] ) || !inspected[ "*" ] && inspect( "*" );
}

// A special extend for ajax options
// that takes "flat" options (not to be deep extended)
// Fixes #9887
function ajaxExtend( target, src ) {
	var key, deep,
		flatOptions = jQuery.ajaxSettings.flatOptions || {};

	for ( key in src ) {
		if ( src[ key ] !== undefined ) {
			( flatOptions[ key ] ? target : ( deep || ( deep = {} ) ) )[ key ] = src[ key ];
		}
	}
	if ( deep ) {
		jQuery.extend( true, target, deep );
	}

	return target;
}

/* Handles responses to an ajax request:
 * - finds the right dataType (mediates between content-type and expected dataType)
 * - returns the corresponding response
 */
function ajaxHandleResponses( s, jqXHR, responses ) {

	var ct, type, finalDataType, firstDataType,
		contents = s.contents,
		dataTypes = s.dataTypes;

	// Remove auto dataType and get content-type in the process
	while ( dataTypes[ 0 ] === "*" ) {
		dataTypes.shift();
		if ( ct === undefined ) {
			ct = s.mimeType || jqXHR.getResponseHeader( "Content-Type" );
		}
	}

	// Check if we're dealing with a known content-type
	if ( ct ) {
		for ( type in contents ) {
			if ( contents[ type ] && contents[ type ].test( ct ) ) {
				dataTypes.unshift( type );
				break;
			}
		}
	}

	// Check to see if we have a response for the expected dataType
	if ( dataTypes[ 0 ] in responses ) {
		finalDataType = dataTypes[ 0 ];
	} else {

		// Try convertible dataTypes
		for ( type in responses ) {
			if ( !dataTypes[ 0 ] || s.converters[ type + " " + dataTypes[ 0 ] ] ) {
				finalDataType = type;
				break;
			}
			if ( !firstDataType ) {
				firstDataType = type;
			}
		}

		// Or just use first one
		finalDataType = finalDataType || firstDataType;
	}

	// If we found a dataType
	// We add the dataType to the list if needed
	// and return the corresponding response
	if ( finalDataType ) {
		if ( finalDataType !== dataTypes[ 0 ] ) {
			dataTypes.unshift( finalDataType );
		}
		return responses[ finalDataType ];
	}
}

/* Chain conversions given the request and the original response
 * Also sets the responseXXX fields on the jqXHR instance
 */
function ajaxConvert( s, response, jqXHR, isSuccess ) {
	var conv2, current, conv, tmp, prev,
		converters = {},

		// Work with a copy of dataTypes in case we need to modify it for conversion
		dataTypes = s.dataTypes.slice();

	// Create converters map with lowercased keys
	if ( dataTypes[ 1 ] ) {
		for ( conv in s.converters ) {
			converters[ conv.toLowerCase() ] = s.converters[ conv ];
		}
	}

	current = dataTypes.shift();

	// Convert to each sequential dataType
	while ( current ) {

		if ( s.responseFields[ current ] ) {
			jqXHR[ s.responseFields[ current ] ] = response;
		}

		// Apply the dataFilter if provided
		if ( !prev && isSuccess && s.dataFilter ) {
			response = s.dataFilter( response, s.dataType );
		}

		prev = current;
		current = dataTypes.shift();

		if ( current ) {

			// There's only work to do if current dataType is non-auto
			if ( current === "*" ) {

				current = prev;

			// Convert response if prev dataType is non-auto and differs from current
			} else if ( prev !== "*" && prev !== current ) {

				// Seek a direct converter
				conv = converters[ prev + " " + current ] || converters[ "* " + current ];

				// If none found, seek a pair
				if ( !conv ) {
					for ( conv2 in converters ) {

						// If conv2 outputs current
						tmp = conv2.split( " " );
						if ( tmp[ 1 ] === current ) {

							// If prev can be converted to accepted input
							conv = converters[ prev + " " + tmp[ 0 ] ] ||
								converters[ "* " + tmp[ 0 ] ];
							if ( conv ) {

								// Condense equivalence converters
								if ( conv === true ) {
									conv = converters[ conv2 ];

								// Otherwise, insert the intermediate dataType
								} else if ( converters[ conv2 ] !== true ) {
									current = tmp[ 0 ];
									dataTypes.unshift( tmp[ 1 ] );
								}
								break;
							}
						}
					}
				}

				// Apply converter (if not an equivalence)
				if ( conv !== true ) {

					// Unless errors are allowed to bubble, catch and return them
					if ( conv && s.throws ) {
						response = conv( response );
					} else {
						try {
							response = conv( response );
						} catch ( e ) {
							return {
								state: "parsererror",
								error: conv ? e : "No conversion from " + prev + " to " + current
							};
						}
					}
				}
			}
		}
	}

	return { state: "success", data: response };
}

jQuery.extend( {

	// Counter for holding the number of active queries
	active: 0,

	// Last-Modified header cache for next request
	lastModified: {},
	etag: {},

	ajaxSettings: {
		url: location.href,
		type: "GET",
		isLocal: rlocalProtocol.test( location.protocol ),
		global: true,
		processData: true,
		async: true,
		contentType: "application/x-www-form-urlencoded; charset=UTF-8",

		/*
		timeout: 0,
		data: null,
		dataType: null,
		username: null,
		password: null,
		cache: null,
		throws: false,
		traditional: false,
		headers: {},
		*/

		accepts: {
			"*": allTypes,
			text: "text/plain",
			html: "text/html",
			xml: "application/xml, text/xml",
			json: "application/json, text/javascript"
		},

		contents: {
			xml: /\bxml\b/,
			html: /\bhtml/,
			json: /\bjson\b/
		},

		responseFields: {
			xml: "responseXML",
			text: "responseText",
			json: "responseJSON"
		},

		// Data converters
		// Keys separate source (or catchall "*") and destination types with a single space
		converters: {

			// Convert anything to text
			"* text": String,

			// Text to html (true = no transformation)
			"text html": true,

			// Evaluate text as a json expression
			"text json": JSON.parse,

			// Parse text as xml
			"text xml": jQuery.parseXML
		},

		// For options that shouldn't be deep extended:
		// you can add your own custom options here if
		// and when you create one that shouldn't be
		// deep extended (see ajaxExtend)
		flatOptions: {
			url: true,
			context: true
		}
	},

	// Creates a full fledged settings object into target
	// with both ajaxSettings and settings fields.
	// If target is omitted, writes into ajaxSettings.
	ajaxSetup: function( target, settings ) {
		return settings ?

			// Building a settings object
			ajaxExtend( ajaxExtend( target, jQuery.ajaxSettings ), settings ) :

			// Extending ajaxSettings
			ajaxExtend( jQuery.ajaxSettings, target );
	},

	ajaxPrefilter: addToPrefiltersOrTransports( prefilters ),
	ajaxTransport: addToPrefiltersOrTransports( transports ),

	// Main method
	ajax: function( url, options ) {

		// If url is an object, simulate pre-1.5 signature
		if ( typeof url === "object" ) {
			options = url;
			url = undefined;
		}

		// Force options to be an object
		options = options || {};

		var transport,

			// URL without anti-cache param
			cacheURL,

			// Response headers
			responseHeadersString,
			responseHeaders,

			// timeout handle
			timeoutTimer,

			// Url cleanup var
			urlAnchor,

			// Request state (becomes false upon send and true upon completion)
			completed,

			// To know if global events are to be dispatched
			fireGlobals,

			// Loop variable
			i,

			// uncached part of the url
			uncached,

			// Create the final options object
			s = jQuery.ajaxSetup( {}, options ),

			// Callbacks context
			callbackContext = s.context || s,

			// Context for global events is callbackContext if it is a DOM node or jQuery collection
			globalEventContext = s.context &&
				( callbackContext.nodeType || callbackContext.jquery ) ?
				jQuery( callbackContext ) :
				jQuery.event,

			// Deferreds
			deferred = jQuery.Deferred(),
			completeDeferred = jQuery.Callbacks( "once memory" ),

			// Status-dependent callbacks
			statusCode = s.statusCode || {},

			// Headers (they are sent all at once)
			requestHeaders = {},
			requestHeadersNames = {},

			// Default abort message
			strAbort = "canceled",

			// Fake xhr
			jqXHR = {
				readyState: 0,

				// Builds headers hashtable if needed
				getResponseHeader: function( key ) {
					var match;
					if ( completed ) {
						if ( !responseHeaders ) {
							responseHeaders = {};
							while ( ( match = rheaders.exec( responseHeadersString ) ) ) {
								responseHeaders[ match[ 1 ].toLowerCase() + " " ] =
									( responseHeaders[ match[ 1 ].toLowerCase() + " " ] || [] )
										.concat( match[ 2 ] );
							}
						}
						match = responseHeaders[ key.toLowerCase() + " " ];
					}
					return match == null ? null : match.join( ", " );
				},

				// Raw string
				getAllResponseHeaders: function() {
					return completed ? responseHeadersString : null;
				},

				// Caches the header
				setRequestHeader: function( name, value ) {
					if ( completed == null ) {
						name = requestHeadersNames[ name.toLowerCase() ] =
							requestHeadersNames[ name.toLowerCase() ] || name;
						requestHeaders[ name ] = value;
					}
					return this;
				},

				// Overrides response content-type header
				overrideMimeType: function( type ) {
					if ( completed == null ) {
						s.mimeType = type;
					}
					return this;
				},

				// Status-dependent callbacks
				statusCode: function( map ) {
					var code;
					if ( map ) {
						if ( completed ) {

							// Execute the appropriate callbacks
							jqXHR.always( map[ jqXHR.status ] );
						} else {

							// Lazy-add the new callbacks in a way that preserves old ones
							for ( code in map ) {
								statusCode[ code ] = [ statusCode[ code ], map[ code ] ];
							}
						}
					}
					return this;
				},

				// Cancel the request
				abort: function( statusText ) {
					var finalText = statusText || strAbort;
					if ( transport ) {
						transport.abort( finalText );
					}
					done( 0, finalText );
					return this;
				}
			};

		// Attach deferreds
		deferred.promise( jqXHR );

		// Add protocol if not provided (prefilters might expect it)
		// Handle falsy url in the settings object (#10093: consistency with old signature)
		// We also use the url parameter if available
		s.url = ( ( url || s.url || location.href ) + "" )
			.replace( rprotocol, location.protocol + "//" );

		// Alias method option to type as per ticket #12004
		s.type = options.method || options.type || s.method || s.type;

		// Extract dataTypes list
		s.dataTypes = ( s.dataType || "*" ).toLowerCase().match( rnothtmlwhite ) || [ "" ];

		// A cross-domain request is in order when the origin doesn't match the current origin.
		if ( s.crossDomain == null ) {
			urlAnchor = document.createElement( "a" );

			// Support: IE <=8 - 11, Edge 12 - 15
			// IE throws exception on accessing the href property if url is malformed,
			// e.g. http://example.com:80x/
			try {
				urlAnchor.href = s.url;

				// Support: IE <=8 - 11 only
				// Anchor's host property isn't correctly set when s.url is relative
				urlAnchor.href = urlAnchor.href;
				s.crossDomain = originAnchor.protocol + "//" + originAnchor.host !==
					urlAnchor.protocol + "//" + urlAnchor.host;
			} catch ( e ) {

				// If there is an error parsing the URL, assume it is crossDomain,
				// it can be rejected by the transport if it is invalid
				s.crossDomain = true;
			}
		}

		// Convert data if not already a string
		if ( s.data && s.processData && typeof s.data !== "string" ) {
			s.data = jQuery.param( s.data, s.traditional );
		}

		// Apply prefilters
		inspectPrefiltersOrTransports( prefilters, s, options, jqXHR );

		// If request was aborted inside a prefilter, stop there
		if ( completed ) {
			return jqXHR;
		}

		// We can fire global events as of now if asked to
		// Don't fire events if jQuery.event is undefined in an AMD-usage scenario (#15118)
		fireGlobals = jQuery.event && s.global;

		// Watch for a new set of requests
		if ( fireGlobals && jQuery.active++ === 0 ) {
			jQuery.event.trigger( "ajaxStart" );
		}

		// Uppercase the type
		s.type = s.type.toUpperCase();

		// Determine if request has content
		s.hasContent = !rnoContent.test( s.type );

		// Save the URL in case we're toying with the If-Modified-Since
		// and/or If-None-Match header later on
		// Remove hash to simplify url manipulation
		cacheURL = s.url.replace( rhash, "" );

		// More options handling for requests with no content
		if ( !s.hasContent ) {

			// Remember the hash so we can put it back
			uncached = s.url.slice( cacheURL.length );

			// If data is available and should be processed, append data to url
			if ( s.data && ( s.processData || typeof s.data === "string" ) ) {
				cacheURL += ( rquery.test( cacheURL ) ? "&" : "?" ) + s.data;

				// #9682: remove data so that it's not used in an eventual retry
				delete s.data;
			}

			// Add or update anti-cache param if needed
			if ( s.cache === false ) {
				cacheURL = cacheURL.replace( rantiCache, "$1" );
				uncached = ( rquery.test( cacheURL ) ? "&" : "?" ) + "_=" + ( nonce.guid++ ) +
					uncached;
			}

			// Put hash and anti-cache on the URL that will be requested (gh-1732)
			s.url = cacheURL + uncached;

		// Change '%20' to '+' if this is encoded form body content (gh-2658)
		} else if ( s.data && s.processData &&
			( s.contentType || "" ).indexOf( "application/x-www-form-urlencoded" ) === 0 ) {
			s.data = s.data.replace( r20, "+" );
		}

		// Set the If-Modified-Since and/or If-None-Match header, if in ifModified mode.
		if ( s.ifModified ) {
			if ( jQuery.lastModified[ cacheURL ] ) {
				jqXHR.setRequestHeader( "If-Modified-Since", jQuery.lastModified[ cacheURL ] );
			}
			if ( jQuery.etag[ cacheURL ] ) {
				jqXHR.setRequestHeader( "If-None-Match", jQuery.etag[ cacheURL ] );
			}
		}

		// Set the correct header, if data is being sent
		if ( s.data && s.hasContent && s.contentType !== false || options.contentType ) {
			jqXHR.setRequestHeader( "Content-Type", s.contentType );
		}

		// Set the Accepts header for the server, depending on the dataType
		jqXHR.setRequestHeader(
			"Accept",
			s.dataTypes[ 0 ] && s.accepts[ s.dataTypes[ 0 ] ] ?
				s.accepts[ s.dataTypes[ 0 ] ] +
					( s.dataTypes[ 0 ] !== "*" ? ", " + allTypes + "; q=0.01" : "" ) :
				s.accepts[ "*" ]
		);

		// Check for headers option
		for ( i in s.headers ) {
			jqXHR.setRequestHeader( i, s.headers[ i ] );
		}

		// Allow custom headers/mimetypes and early abort
		if ( s.beforeSend &&
			( s.beforeSend.call( callbackContext, jqXHR, s ) === false || completed ) ) {

			// Abort if not done already and return
			return jqXHR.abort();
		}

		// Aborting is no longer a cancellation
		strAbort = "abort";

		// Install callbacks on deferreds
		completeDeferred.add( s.complete );
		jqXHR.done( s.success );
		jqXHR.fail( s.error );

		// Get transport
		transport = inspectPrefiltersOrTransports( transports, s, options, jqXHR );

		// If no transport, we auto-abort
		if ( !transport ) {
			done( -1, "No Transport" );
		} else {
			jqXHR.readyState = 1;

			// Send global event
			if ( fireGlobals ) {
				globalEventContext.trigger( "ajaxSend", [ jqXHR, s ] );
			}

			// If request was aborted inside ajaxSend, stop there
			if ( completed ) {
				return jqXHR;
			}

			// Timeout
			if ( s.async && s.timeout > 0 ) {
				timeoutTimer = window.setTimeout( function() {
					jqXHR.abort( "timeout" );
				}, s.timeout );
			}

			try {
				completed = false;
				transport.send( requestHeaders, done );
			} catch ( e ) {

				// Rethrow post-completion exceptions
				if ( completed ) {
					throw e;
				}

				// Propagate others as results
				done( -1, e );
			}
		}

		// Callback for when everything is done
		function done( status, nativeStatusText, responses, headers ) {
			var isSuccess, success, error, response, modified,
				statusText = nativeStatusText;

			// Ignore repeat invocations
			if ( completed ) {
				return;
			}

			completed = true;

			// Clear timeout if it exists
			if ( timeoutTimer ) {
				window.clearTimeout( timeoutTimer );
			}

			// Dereference transport for early garbage collection
			// (no matter how long the jqXHR object will be used)
			transport = undefined;

			// Cache response headers
			responseHeadersString = headers || "";

			// Set readyState
			jqXHR.readyState = status > 0 ? 4 : 0;

			// Determine if successful
			isSuccess = status >= 200 && status < 300 || status === 304;

			// Get response data
			if ( responses ) {
				response = ajaxHandleResponses( s, jqXHR, responses );
			}

			// Use a noop converter for missing script but not if jsonp
			if ( !isSuccess &&
				jQuery.inArray( "script", s.dataTypes ) > -1 &&
				jQuery.inArray( "json", s.dataTypes ) < 0 ) {
				s.converters[ "text script" ] = function() {};
			}

			// Convert no matter what (that way responseXXX fields are always set)
			response = ajaxConvert( s, response, jqXHR, isSuccess );

			// If successful, handle type chaining
			if ( isSuccess ) {

				// Set the If-Modified-Since and/or If-None-Match header, if in ifModified mode.
				if ( s.ifModified ) {
					modified = jqXHR.getResponseHeader( "Last-Modified" );
					if ( modified ) {
						jQuery.lastModified[ cacheURL ] = modified;
					}
					modified = jqXHR.getResponseHeader( "etag" );
					if ( modified ) {
						jQuery.etag[ cacheURL ] = modified;
					}
				}

				// if no content
				if ( status === 204 || s.type === "HEAD" ) {
					statusText = "nocontent";

				// if not modified
				} else if ( status === 304 ) {
					statusText = "notmodified";

				// If we have data, let's convert it
				} else {
					statusText = response.state;
					success = response.data;
					error = response.error;
					isSuccess = !error;
				}
			} else {

				// Extract error from statusText and normalize for non-aborts
				error = statusText;
				if ( status || !statusText ) {
					statusText = "error";
					if ( status < 0 ) {
						status = 0;
					}
				}
			}

			// Set data for the fake xhr object
			jqXHR.status = status;
			jqXHR.statusText = ( nativeStatusText || statusText ) + "";

			// Success/Error
			if ( isSuccess ) {
				deferred.resolveWith( callbackContext, [ success, statusText, jqXHR ] );
			} else {
				deferred.rejectWith( callbackContext, [ jqXHR, statusText, error ] );
			}

			// Status-dependent callbacks
			jqXHR.statusCode( statusCode );
			statusCode = undefined;

			if ( fireGlobals ) {
				globalEventContext.trigger( isSuccess ? "ajaxSuccess" : "ajaxError",
					[ jqXHR, s, isSuccess ? success : error ] );
			}

			// Complete
			completeDeferred.fireWith( callbackContext, [ jqXHR, statusText ] );

			if ( fireGlobals ) {
				globalEventContext.trigger( "ajaxComplete", [ jqXHR, s ] );

				// Handle the global AJAX counter
				if ( !( --jQuery.active ) ) {
					jQuery.event.trigger( "ajaxStop" );
				}
			}
		}

		return jqXHR;
	},

	getJSON: function( url, data, callback ) {
		return jQuery.get( url, data, callback, "json" );
	},

	getScript: function( url, callback ) {
		return jQuery.get( url, undefined, callback, "script" );
	}
} );

jQuery.each( [ "get", "post" ], function( _i, method ) {
	jQuery[ method ] = function( url, data, callback, type ) {

		// Shift arguments if data argument was omitted
		if ( isFunction( data ) ) {
			type = type || callback;
			callback = data;
			data = undefined;
		}

		// The url can be an options object (which then must have .url)
		return jQuery.ajax( jQuery.extend( {
			url: url,
			type: method,
			dataType: type,
			data: data,
			success: callback
		}, jQuery.isPlainObject( url ) && url ) );
	};
} );

jQuery.ajaxPrefilter( function( s ) {
	var i;
	for ( i in s.headers ) {
		if ( i.toLowerCase() === "content-type" ) {
			s.contentType = s.headers[ i ] || "";
		}
	}
} );


jQuery._evalUrl = function( url, options, doc ) {
	return jQuery.ajax( {
		url: url,

		// Make this explicit, since user can override this through ajaxSetup (#11264)
		type: "GET",
		dataType: "script",
		cache: true,
		async: false,
		global: false,

		// Only evaluate the response if it is successful (gh-4126)
		// dataFilter is not invoked for failure responses, so using it instead
		// of the default converter is kludgy but it works.
		converters: {
			"text script": function() {}
		},
		dataFilter: function( response ) {
			jQuery.globalEval( response, options, doc );
		}
	} );
};


jQuery.fn.extend( {
	wrapAll: function( html ) {
		var wrap;

		if ( this[ 0 ] ) {
			if ( isFunction( html ) ) {
				html = html.call( this[ 0 ] );
			}

			// The elements to wrap the target around
			wrap = jQuery( html, this[ 0 ].ownerDocument ).eq( 0 ).clone( true );

			if ( this[ 0 ].parentNode ) {
				wrap.insertBefore( this[ 0 ] );
			}

			wrap.map( function() {
				var elem = this;

				while ( elem.firstElementChild ) {
					elem = elem.firstElementChild;
				}

				return elem;
			} ).append( this );
		}

		return this;
	},

	wrapInner: function( html ) {
		if ( isFunction( html ) ) {
			return this.each( function( i ) {
				jQuery( this ).wrapInner( html.call( this, i ) );
			} );
		}

		return this.each( function() {
			var self = jQuery( this ),
				contents = self.contents();

			if ( contents.length ) {
				contents.wrapAll( html );

			} else {
				self.append( html );
			}
		} );
	},

	wrap: function( html ) {
		var htmlIsFunction = isFunction( html );

		return this.each( function( i ) {
			jQuery( this ).wrapAll( htmlIsFunction ? html.call( this, i ) : html );
		} );
	},

	unwrap: function( selector ) {
		this.parent( selector ).not( "body" ).each( function() {
			jQuery( this ).replaceWith( this.childNodes );
		} );
		return this;
	}
} );


jQuery.expr.pseudos.hidden = function( elem ) {
	return !jQuery.expr.pseudos.visible( elem );
};
jQuery.expr.pseudos.visible = function( elem ) {
	return !!( elem.offsetWidth || elem.offsetHeight || elem.getClientRects().length );
};




jQuery.ajaxSettings.xhr = function() {
	try {
		return new window.XMLHttpRequest();
	} catch ( e ) {}
};

var xhrSuccessStatus = {

		// File protocol always yields status code 0, assume 200
		0: 200,

		// Support: IE <=9 only
		// #1450: sometimes IE returns 1223 when it should be 204
		1223: 204
	},
	xhrSupported = jQuery.ajaxSettings.xhr();

support.cors = !!xhrSupported && ( "withCredentials" in xhrSupported );
support.ajax = xhrSupported = !!xhrSupported;

jQuery.ajaxTransport( function( options ) {
	var callback, errorCallback;

	// Cross domain only allowed if supported through XMLHttpRequest
	if ( support.cors || xhrSupported && !options.crossDomain ) {
		return {
			send: function( headers, complete ) {
				var i,
					xhr = options.xhr();

				xhr.open(
					options.type,
					options.url,
					options.async,
					options.username,
					options.password
				);

				// Apply custom fields if provided
				if ( options.xhrFields ) {
					for ( i in options.xhrFields ) {
						xhr[ i ] = options.xhrFields[ i ];
					}
				}

				// Override mime type if needed
				if ( options.mimeType && xhr.overrideMimeType ) {
					xhr.overrideMimeType( options.mimeType );
				}

				// X-Requested-With header
				// For cross-domain requests, seeing as conditions for a preflight are
				// akin to a jigsaw puzzle, we simply never set it to be sure.
				// (it can always be set on a per-request basis or even using ajaxSetup)
				// For same-domain requests, won't change header if already provided.
				if ( !options.crossDomain && !headers[ "X-Requested-With" ] ) {
					headers[ "X-Requested-With" ] = "XMLHttpRequest";
				}

				// Set headers
				for ( i in headers ) {
					xhr.setRequestHeader( i, headers[ i ] );
				}

				// Callback
				callback = function( type ) {
					return function() {
						if ( callback ) {
							callback = errorCallback = xhr.onload =
								xhr.onerror = xhr.onabort = xhr.ontimeout =
									xhr.onreadystatechange = null;

							if ( type === "abort" ) {
								xhr.abort();
							} else if ( type === "error" ) {

								// Support: IE <=9 only
								// On a manual native abort, IE9 throws
								// errors on any property access that is not readyState
								if ( typeof xhr.status !== "number" ) {
									complete( 0, "error" );
								} else {
									complete(

										// File: protocol always yields status 0; see #8605, #14207
										xhr.status,
										xhr.statusText
									);
								}
							} else {
								complete(
									xhrSuccessStatus[ xhr.status ] || xhr.status,
									xhr.statusText,

									// Support: IE <=9 only
									// IE9 has no XHR2 but throws on binary (trac-11426)
									// For XHR2 non-text, let the caller handle it (gh-2498)
									( xhr.responseType || "text" ) !== "text"  ||
									typeof xhr.responseText !== "string" ?
										{ binary: xhr.response } :
										{ text: xhr.responseText },
									xhr.getAllResponseHeaders()
								);
							}
						}
					};
				};

				// Listen to events
				xhr.onload = callback();
				errorCallback = xhr.onerror = xhr.ontimeout = callback( "error" );

				// Support: IE 9 only
				// Use onreadystatechange to replace onabort
				// to handle uncaught aborts
				if ( xhr.onabort !== undefined ) {
					xhr.onabort = errorCallback;
				} else {
					xhr.onreadystatechange = function() {

						// Check readyState before timeout as it changes
						if ( xhr.readyState === 4 ) {

							// Allow onerror to be called first,
							// but that will not handle a native abort
							// Also, save errorCallback to a variable
							// as xhr.onerror cannot be accessed
							window.setTimeout( function() {
								if ( callback ) {
									errorCallback();
								}
							} );
						}
					};
				}

				// Create the abort callback
				callback = callback( "abort" );

				try {

					// Do send the request (this may raise an exception)
					xhr.send( options.hasContent && options.data || null );
				} catch ( e ) {

					// #14683: Only rethrow if this hasn't been notified as an error yet
					if ( callback ) {
						throw e;
					}
				}
			},

			abort: function() {
				if ( callback ) {
					callback();
				}
			}
		};
	}
} );




// Prevent auto-execution of scripts when no explicit dataType was provided (See gh-2432)
jQuery.ajaxPrefilter( function( s ) {
	if ( s.crossDomain ) {
		s.contents.script = false;
	}
} );

// Install script dataType
jQuery.ajaxSetup( {
	accepts: {
		script: "text/javascript, application/javascript, " +
			"application/ecmascript, application/x-ecmascript"
	},
	contents: {
		script: /\b(?:java|ecma)script\b/
	},
	converters: {
		"text script": function( text ) {
			jQuery.globalEval( text );
			return text;
		}
	}
} );

// Handle cache's special case and crossDomain
jQuery.ajaxPrefilter( "script", function( s ) {
	if ( s.cache === undefined ) {
		s.cache = false;
	}
	if ( s.crossDomain ) {
		s.type = "GET";
	}
} );

// Bind script tag hack transport
jQuery.ajaxTransport( "script", function( s ) {

	// This transport only deals with cross domain or forced-by-attrs requests
	if ( s.crossDomain || s.scriptAttrs ) {
		var script, callback;
		return {
			send: function( _, complete ) {
				script = jQuery( "<script>" )
					.attr( s.scriptAttrs || {} )
					.prop( { charset: s.scriptCharset, src: s.url } )
					.on( "load error", callback = function( evt ) {
						script.remove();
						callback = null;
						if ( evt ) {
							complete( evt.type === "error" ? 404 : 200, evt.type );
						}
					} );

				// Use native DOM manipulation to avoid our domManip AJAX trickery
				document.head.appendChild( script[ 0 ] );
			},
			abort: function() {
				if ( callback ) {
					callback();
				}
			}
		};
	}
} );




var oldCallbacks = [],
	rjsonp = /(=)\?(?=&|$)|\?\?/;

// Default jsonp settings
jQuery.ajaxSetup( {
	jsonp: "callback",
	jsonpCallback: function() {
		var callback = oldCallbacks.pop() || ( jQuery.expando + "_" + ( nonce.guid++ ) );
		this[ callback ] = true;
		return callback;
	}
} );

// Detect, normalize options and install callbacks for jsonp requests
jQuery.ajaxPrefilter( "json jsonp", function( s, originalSettings, jqXHR ) {

	var callbackName, overwritten, responseContainer,
		jsonProp = s.jsonp !== false && ( rjsonp.test( s.url ) ?
			"url" :
			typeof s.data === "string" &&
				( s.contentType || "" )
					.indexOf( "application/x-www-form-urlencoded" ) === 0 &&
				rjsonp.test( s.data ) && "data"
		);

	// Handle iff the expected data type is "jsonp" or we have a parameter to set
	if ( jsonProp || s.dataTypes[ 0 ] === "jsonp" ) {

		// Get callback name, remembering preexisting value associated with it
		callbackName = s.jsonpCallback = isFunction( s.jsonpCallback ) ?
			s.jsonpCallback() :
			s.jsonpCallback;

		// Insert callback into url or form data
		if ( jsonProp ) {
			s[ jsonProp ] = s[ jsonProp ].replace( rjsonp, "$1" + callbackName );
		} else if ( s.jsonp !== false ) {
			s.url += ( rquery.test( s.url ) ? "&" : "?" ) + s.jsonp + "=" + callbackName;
		}

		// Use data converter to retrieve json after script execution
		s.converters[ "script json" ] = function() {
			if ( !responseContainer ) {
				jQuery.error( callbackName + " was not called" );
			}
			return responseContainer[ 0 ];
		};

		// Force json dataType
		s.dataTypes[ 0 ] = "json";

		// Install callback
		overwritten = window[ callbackName ];
		window[ callbackName ] = function() {
			responseContainer = arguments;
		};

		// Clean-up function (fires after converters)
		jqXHR.always( function() {

			// If previous value didn't exist - remove it
			if ( overwritten === undefined ) {
				jQuery( window ).removeProp( callbackName );

			// Otherwise restore preexisting value
			} else {
				window[ callbackName ] = overwritten;
			}

			// Save back as free
			if ( s[ callbackName ] ) {

				// Make sure that re-using the options doesn't screw things around
				s.jsonpCallback = originalSettings.jsonpCallback;

				// Save the callback name for future use
				oldCallbacks.push( callbackName );
			}

			// Call if it was a function and we have a response
			if ( responseContainer && isFunction( overwritten ) ) {
				overwritten( responseContainer[ 0 ] );
			}

			responseContainer = overwritten = undefined;
		} );

		// Delegate to script
		return "script";
	}
} );




// Support: Safari 8 only
// In Safari 8 documents created via document.implementation.createHTMLDocument
// collapse sibling forms: the second one becomes a child of the first one.
// Because of that, this security measure has to be disabled in Safari 8.
// https://bugs.webkit.org/show_bug.cgi?id=137337
support.createHTMLDocument = ( function() {
	var body = document.implementation.createHTMLDocument( "" ).body;
	body.innerHTML = "<form></form><form></form>";
	return body.childNodes.length === 2;
} )();


// Argument "data" should be string of html
// context (optional): If specified, the fragment will be created in this context,
// defaults to document
// keepScripts (optional): If true, will include scripts passed in the html string
jQuery.parseHTML = function( data, context, keepScripts ) {
	if ( typeof data !== "string" ) {
		return [];
	}
	if ( typeof context === "boolean" ) {
		keepScripts = context;
		context = false;
	}

	var base, parsed, scripts;

	if ( !context ) {

		// Stop scripts or inline event handlers from being executed immediately
		// by using document.implementation
		if ( support.createHTMLDocument ) {
			context = document.implementation.createHTMLDocument( "" );

			// Set the base href for the created document
			// so any parsed elements with URLs
			// are based on the document's URL (gh-2965)
			base = context.createElement( "base" );
			base.href = document.location.href;
			context.head.appendChild( base );
		} else {
			context = document;
		}
	}

	parsed = rsingleTag.exec( data );
	scripts = !keepScripts && [];

	// Single tag
	if ( parsed ) {
		return [ context.createElement( parsed[ 1 ] ) ];
	}

	parsed = buildFragment( [ data ], context, scripts );

	if ( scripts && scripts.length ) {
		jQuery( scripts ).remove();
	}

	return jQuery.merge( [], parsed.childNodes );
};


/**
 * Load a url into a page
 */
jQuery.fn.load = function( url, params, callback ) {
	var selector, type, response,
		self = this,
		off = url.indexOf( " " );

	if ( off > -1 ) {
		selector = stripAndCollapse( url.slice( off ) );
		url = url.slice( 0, off );
	}

	// If it's a function
	if ( isFunction( params ) ) {

		// We assume that it's the callback
		callback = params;
		params = undefined;

	// Otherwise, build a param string
	} else if ( params && typeof params === "object" ) {
		type = "POST";
	}

	// If we have elements to modify, make the request
	if ( self.length > 0 ) {
		jQuery.ajax( {
			url: url,

			// If "type" variable is undefined, then "GET" method will be used.
			// Make value of this field explicit since
			// user can override it through ajaxSetup method
			type: type || "GET",
			dataType: "html",
			data: params
		} ).done( function( responseText ) {

			// Save response for use in complete callback
			response = arguments;

			self.html( selector ?

				// If a selector was specified, locate the right elements in a dummy div
				// Exclude scripts to avoid IE 'Permission Denied' errors
				jQuery( "<div>" ).append( jQuery.parseHTML( responseText ) ).find( selector ) :

				// Otherwise use the full result
				responseText );

		// If the request succeeds, this function gets "data", "status", "jqXHR"
		// but they are ignored because response was set above.
		// If it fails, this function gets "jqXHR", "status", "error"
		} ).always( callback && function( jqXHR, status ) {
			self.each( function() {
				callback.apply( this, response || [ jqXHR.responseText, status, jqXHR ] );
			} );
		} );
	}

	return this;
};




jQuery.expr.pseudos.animated = function( elem ) {
	return jQuery.grep( jQuery.timers, function( fn ) {
		return elem === fn.elem;
	} ).length;
};




jQuery.offset = {
	setOffset: function( elem, options, i ) {
		var curPosition, curLeft, curCSSTop, curTop, curOffset, curCSSLeft, calculatePosition,
			position = jQuery.css( elem, "position" ),
			curElem = jQuery( elem ),
			props = {};

		// Set position first, in-case top/left are set even on static elem
		if ( position === "static" ) {
			elem.style.position = "relative";
		}

		curOffset = curElem.offset();
		curCSSTop = jQuery.css( elem, "top" );
		curCSSLeft = jQuery.css( elem, "left" );
		calculatePosition = ( position === "absolute" || position === "fixed" ) &&
			( curCSSTop + curCSSLeft ).indexOf( "auto" ) > -1;

		// Need to be able to calculate position if either
		// top or left is auto and position is either absolute or fixed
		if ( calculatePosition ) {
			curPosition = curElem.position();
			curTop = curPosition.top;
			curLeft = curPosition.left;

		} else {
			curTop = parseFloat( curCSSTop ) || 0;
			curLeft = parseFloat( curCSSLeft ) || 0;
		}

		if ( isFunction( options ) ) {

			// Use jQuery.extend here to allow modification of coordinates argument (gh-1848)
			options = options.call( elem, i, jQuery.extend( {}, curOffset ) );
		}

		if ( options.top != null ) {
			props.top = ( options.top - curOffset.top ) + curTop;
		}
		if ( options.left != null ) {
			props.left = ( options.left - curOffset.left ) + curLeft;
		}

		if ( "using" in options ) {
			options.using.call( elem, props );

		} else {
			curElem.css( props );
		}
	}
};

jQuery.fn.extend( {

	// offset() relates an element's border box to the document origin
	offset: function( options ) {

		// Preserve chaining for setter
		if ( arguments.length ) {
			return options === undefined ?
				this :
				this.each( function( i ) {
					jQuery.offset.setOffset( this, options, i );
				} );
		}

		var rect, win,
			elem = this[ 0 ];

		if ( !elem ) {
			return;
		}

		// Return zeros for disconnected and hidden (display: none) elements (gh-2310)
		// Support: IE <=11 only
		// Running getBoundingClientRect on a
		// disconnected node in IE throws an error
		if ( !elem.getClientRects().length ) {
			return { top: 0, left: 0 };
		}

		// Get document-relative position by adding viewport scroll to viewport-relative gBCR
		rect = elem.getBoundingClientRect();
		win = elem.ownerDocument.defaultView;
		return {
			top: rect.top + win.pageYOffset,
			left: rect.left + win.pageXOffset
		};
	},

	// position() relates an element's margin box to its offset parent's padding box
	// This corresponds to the behavior of CSS absolute positioning
	position: function() {
		if ( !this[ 0 ] ) {
			return;
		}

		var offsetParent, offset, doc,
			elem = this[ 0 ],
			parentOffset = { top: 0, left: 0 };

		// position:fixed elements are offset from the viewport, which itself always has zero offset
		if ( jQuery.css( elem, "position" ) === "fixed" ) {

			// Assume position:fixed implies availability of getBoundingClientRect
			offset = elem.getBoundingClientRect();

		} else {
			offset = this.offset();

			// Account for the *real* offset parent, which can be the document or its root element
			// when a statically positioned element is identified
			doc = elem.ownerDocument;
			offsetParent = elem.offsetParent || doc.documentElement;
			while ( offsetParent &&
				( offsetParent === doc.body || offsetParent === doc.documentElement ) &&
				jQuery.css( offsetParent, "position" ) === "static" ) {

				offsetParent = offsetParent.parentNode;
			}
			if ( offsetParent && offsetParent !== elem && offsetParent.nodeType === 1 ) {

				// Incorporate borders into its offset, since they are outside its content origin
				parentOffset = jQuery( offsetParent ).offset();
				parentOffset.top += jQuery.css( offsetParent, "borderTopWidth", true );
				parentOffset.left += jQuery.css( offsetParent, "borderLeftWidth", true );
			}
		}

		// Subtract parent offsets and element margins
		return {
			top: offset.top - parentOffset.top - jQuery.css( elem, "marginTop", true ),
			left: offset.left - parentOffset.left - jQuery.css( elem, "marginLeft", true )
		};
	},

	// This method will return documentElement in the following cases:
	// 1) For the element inside the iframe without offsetParent, this method will return
	//    documentElement of the parent window
	// 2) For the hidden or detached element
	// 3) For body or html element, i.e. in case of the html node - it will return itself
	//
	// but those exceptions were never presented as a real life use-cases
	// and might be considered as more preferable results.
	//
	// This logic, however, is not guaranteed and can change at any point in the future
	offsetParent: function() {
		return this.map( function() {
			var offsetParent = this.offsetParent;

			while ( offsetParent && jQuery.css( offsetParent, "position" ) === "static" ) {
				offsetParent = offsetParent.offsetParent;
			}

			return offsetParent || documentElement;
		} );
	}
} );

// Create scrollLeft and scrollTop methods
jQuery.each( { scrollLeft: "pageXOffset", scrollTop: "pageYOffset" }, function( method, prop ) {
	var top = "pageYOffset" === prop;

	jQuery.fn[ method ] = function( val ) {
		return access( this, function( elem, method, val ) {

			// Coalesce documents and windows
			var win;
			if ( isWindow( elem ) ) {
				win = elem;
			} else if ( elem.nodeType === 9 ) {
				win = elem.defaultView;
			}

			if ( val === undefined ) {
				return win ? win[ prop ] : elem[ method ];
			}

			if ( win ) {
				win.scrollTo(
					!top ? val : win.pageXOffset,
					top ? val : win.pageYOffset
				);

			} else {
				elem[ method ] = val;
			}
		}, method, val, arguments.length );
	};
} );

// Support: Safari <=7 - 9.1, Chrome <=37 - 49
// Add the top/left cssHooks using jQuery.fn.position
// Webkit bug: https://bugs.webkit.org/show_bug.cgi?id=29084
// Blink bug: https://bugs.chromium.org/p/chromium/issues/detail?id=589347
// getComputedStyle returns percent when specified for top/left/bottom/right;
// rather than make the css module depend on the offset module, just check for it here
jQuery.each( [ "top", "left" ], function( _i, prop ) {
	jQuery.cssHooks[ prop ] = addGetHookIf( support.pixelPosition,
		function( elem, computed ) {
			if ( computed ) {
				computed = curCSS( elem, prop );

				// If curCSS returns percentage, fallback to offset
				return rnumnonpx.test( computed ) ?
					jQuery( elem ).position()[ prop ] + "px" :
					computed;
			}
		}
	);
} );


// Create innerHeight, innerWidth, height, width, outerHeight and outerWidth methods
jQuery.each( { Height: "height", Width: "width" }, function( name, type ) {
	jQuery.each( {
		padding: "inner" + name,
		content: type,
		"": "outer" + name
	}, function( defaultExtra, funcName ) {

		// Margin is only for outerHeight, outerWidth
		jQuery.fn[ funcName ] = function( margin, value ) {
			var chainable = arguments.length && ( defaultExtra || typeof margin !== "boolean" ),
				extra = defaultExtra || ( margin === true || value === true ? "margin" : "border" );

			return access( this, function( elem, type, value ) {
				var doc;

				if ( isWindow( elem ) ) {

					// $( window ).outerWidth/Height return w/h including scrollbars (gh-1729)
					return funcName.indexOf( "outer" ) === 0 ?
						elem[ "inner" + name ] :
						elem.document.documentElement[ "client" + name ];
				}

				// Get document width or height
				if ( elem.nodeType === 9 ) {
					doc = elem.documentElement;

					// Either scroll[Width/Height] or offset[Width/Height] or client[Width/Height],
					// whichever is greatest
					return Math.max(
						elem.body[ "scroll" + name ], doc[ "scroll" + name ],
						elem.body[ "offset" + name ], doc[ "offset" + name ],
						doc[ "client" + name ]
					);
				}

				return value === undefined ?

					// Get width or height on the element, requesting but not forcing parseFloat
					jQuery.css( elem, type, extra ) :

					// Set width or height on the element
					jQuery.style( elem, type, value, extra );
			}, type, chainable ? margin : undefined, chainable );
		};
	} );
} );


jQuery.each( [
	"ajaxStart",
	"ajaxStop",
	"ajaxComplete",
	"ajaxError",
	"ajaxSuccess",
	"ajaxSend"
], function( _i, type ) {
	jQuery.fn[ type ] = function( fn ) {
		return this.on( type, fn );
	};
} );




jQuery.fn.extend( {

	bind: function( types, data, fn ) {
		return this.on( types, null, data, fn );
	},
	unbind: function( types, fn ) {
		return this.off( types, null, fn );
	},

	delegate: function( selector, types, data, fn ) {
		return this.on( types, selector, data, fn );
	},
	undelegate: function( selector, types, fn ) {

		// ( namespace ) or ( selector, types [, fn] )
		return arguments.length === 1 ?
			this.off( selector, "**" ) :
			this.off( types, selector || "**", fn );
	},

	hover: function( fnOver, fnOut ) {
		return this.mouseenter( fnOver ).mouseleave( fnOut || fnOver );
	}
} );

jQuery.each(
	( "blur focus focusin focusout resize scroll click dblclick " +
	"mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave " +
	"change select submit keydown keypress keyup contextmenu" ).split( " " ),
	function( _i, name ) {

		// Handle event binding
		jQuery.fn[ name ] = function( data, fn ) {
			return arguments.length > 0 ?
				this.on( name, null, data, fn ) :
				this.trigger( name );
		};
	}
);




// Support: Android <=4.0 only
// Make sure we trim BOM and NBSP
var rtrim = /^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g;

// Bind a function to a context, optionally partially applying any
// arguments.
// jQuery.proxy is deprecated to promote standards (specifically Function#bind)
// However, it is not slated for removal any time soon
jQuery.proxy = function( fn, context ) {
	var tmp, args, proxy;

	if ( typeof context === "string" ) {
		tmp = fn[ context ];
		context = fn;
		fn = tmp;
	}

	// Quick check to determine if target is callable, in the spec
	// this throws a TypeError, but we will just return undefined.
	if ( !isFunction( fn ) ) {
		return undefined;
	}

	// Simulated bind
	args = slice.call( arguments, 2 );
	proxy = function() {
		return fn.apply( context || this, args.concat( slice.call( arguments ) ) );
	};

	// Set the guid of unique handler to the same of original handler, so it can be removed
	proxy.guid = fn.guid = fn.guid || jQuery.guid++;

	return proxy;
};

jQuery.holdReady = function( hold ) {
	if ( hold ) {
		jQuery.readyWait++;
	} else {
		jQuery.ready( true );
	}
};
jQuery.isArray = Array.isArray;
jQuery.parseJSON = JSON.parse;
jQuery.nodeName = nodeName;
jQuery.isFunction = isFunction;
jQuery.isWindow = isWindow;
jQuery.camelCase = camelCase;
jQuery.type = toType;

jQuery.now = Date.now;

jQuery.isNumeric = function( obj ) {

	// As of jQuery 3.0, isNumeric is limited to
	// strings and numbers (primitives or objects)
	// that can be coerced to finite numbers (gh-2662)
	var type = jQuery.type( obj );
	return ( type === "number" || type === "string" ) &&

		// parseFloat NaNs numeric-cast false positives ("")
		// ...but misinterprets leading-number strings, particularly hex literals ("0x...")
		// subtraction forces infinities to NaN
		!isNaN( obj - parseFloat( obj ) );
};

jQuery.trim = function( text ) {
	return text == null ?
		"" :
		( text + "" ).replace( rtrim, "" );
};



// Register as a named AMD module, since jQuery can be concatenated with other
// files that may use define, but not via a proper concatenation script that
// understands anonymous AMD modules. A named AMD is safest and most robust
// way to register. Lowercase jquery is used because AMD module names are
// derived from file names, and jQuery is normally delivered in a lowercase
// file name. Do this after creating the global so that if an AMD module wants
// to call noConflict to hide this version of jQuery, it will work.

// Note that for maximum portability, libraries that are not jQuery should
// declare themselves as anonymous modules, and avoid setting a global if an
// AMD loader is present. jQuery is a special case. For more information, see
// https://github.com/jrburke/requirejs/wiki/Updating-existing-libraries#wiki-anon

if ( typeof define === "function" && define.amd ) {
	define( "jquery", [], function() {
		return jQuery;
	} );
}




var

	// Map over jQuery in case of overwrite
	_jQuery = window.jQuery,

	// Map over the $ in case of overwrite
	_$ = window.$;

jQuery.noConflict = function( deep ) {
	if ( window.$ === jQuery ) {
		window.$ = _$;
	}

	if ( deep && window.jQuery === jQuery ) {
		window.jQuery = _jQuery;
	}

	return jQuery;
};

// Expose jQuery and $ identifiers, even in AMD
// (#7102#comment:10, https://github.com/jquery/jquery/pull/557)
// and CommonJS for browser emulators (#13566)
if ( typeof noGlobal === "undefined" ) {
	window.jQuery = window.$ = jQuery;
}




return jQuery;
} );





function FindReact(dom, traverseUp = 0) {
    const key = Object.keys(dom).find(key=>{
        return key.startsWith("__reactFiber$") // react 17+
            || key.startsWith("__reactInternalInstance$"); // react <17
    });
    const domFiber = dom[key];
    if (domFiber == null) return null;

    // react <16
    if (domFiber._currentElement) {
        let compFiber = domFiber._currentElement._owner;
        for (let i = 0; i < traverseUp; i++) {
            compFiber = compFiber._currentElement._owner;
        }
        return compFiber._instance;
    }

    // react 16+
    const GetCompFiber = fiber=>{
        //return fiber._debugOwner; // this also works, but is __DEV__ only
        let parentFiber = fiber.return;
        while (typeof parentFiber.type == "string") {
            parentFiber = parentFiber.return;
        }
        return parentFiber;
    };
    let compFiber = GetCompFiber(domFiber);
    for (let i = 0; i < traverseUp; i++) {
        compFiber = GetCompFiber(compFiber);
    }
    return compFiber.stateNode;
}



$(function () {
    console.log("AHHelper JS Started!")



    var warpper = $("<div>").addClass("ahh-wrapper").html("疫苗助手加载成功");
    $("body").prepend(warpper);
    setInterval(function () {
        worker()
    }, 3000);


    function worker() {
        closeModalIfNeeded() ||
            selectDateAndTime() 
            // ||
            // inputUserInfo() 
            // || finalStep()
    }


    // 关闭接种弹窗
    // restart
    // false: 继续执行
    // true: 重新执行
    function closeModalIfNeeded() {

        // 无弹窗
        if ($(".modal-wrapper:visible").length == 0) {
            return false
        }

        $(".modal-wrapper:visible").each(function () {
            var text = $(this).text()
            if (text.includes("接种须知")) {
                // $(this).hide()
                $(this).find(".modal-btn-content").each(function () {
                    var btnText = $(this).text()
                    if (btnText.includes("知晓并同意")) {
                        notice("关闭接种须知弹窗")
                        $(this).click()
                    }
                })
            }
        });

        return true
    }


    // 选择接种时间
    function selectDateAndTime() {
        // 已选择日期时间
        if ($(".show-selected-time").length > 0) {
            return false
        }

        // 选择时间
        if (selectTime()) {
            // 选择时间成功，重新执行
            return true
        }
        return selectDate()
    }


    // 选择接种日期
    function selectDate() {
        notice("查找可预约接种日期")
        var days = $(".vtm-calendar-count").length

        if (days == 0) {
            notice("无可用接种日期")
            // 重新请求 等待可用日期
            return true
        }

        // 选择日期，重新运行
        $(".vtm-calendar-count").first().click()
        return true
    }
    
    // 选择接种时间
    function selectTime() {
        var success = false
        notice("查找可预约接种时间")
        $(".time-block").each(function () {
            if ($(this).text().includes("可约") && !success) {
                $(this).click()
                success = true
                notice("查找可预约接种时间成功")
                setTimeout(() => {
                    notice("可预约接种时间确认")
                    $(".time-picker-confirm-btn").click()
                }, 1000);
            }
        })

        return success
    }


    // 填写用户信息
    function inputUserInfo() {
        if ($(".vaccine-info .info-add-input").length == 0) {
            notice("无可填写接种人信息")
            return true
        }

        $(".vaccine-info .info-add-input").each(function() {
            var label = $(this).text()
            if (label.includes("姓名")) {
                $(this).find("input").first().val("文轩")
            } else if (label.includes("电话")) {
                $(this).find("input").first().val("13000000000")
            }
        })

        return false
    }

    // 兜底步骤
    function finalStep() {
        notice(new Date().toLocaleString())
        return true
    }


    // 显示消息
    function notice(msg) {
        console.log(msg)
        $(".ahh-wrapper").html(msg);
    }
});