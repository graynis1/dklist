// Firefox Compatibility Polyfills

// Polyfill for Object.assign (IE11 and older browsers)
if (typeof Object.assign !== 'function') {
  Object.assign = function(target, varArgs) {
    'use strict';
    if (target === null || target === undefined) {
      throw new TypeError('Cannot convert undefined or null to object');
    }

    var to = Object(target);

    for (var index = 1; index < arguments.length; index++) {
      var nextSource = arguments[index];

      if (nextSource !== null && nextSource !== undefined) {
        for (var nextKey in nextSource) {
          if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
            to[nextKey] = nextSource[nextKey];
          }
        }
      }
    }
    return to;
  };
}

// Polyfill for Array.find
if (!Array.prototype.find) {
  Object.defineProperty(Array.prototype, 'find', {
    value: function(predicate) {
      if (this == null) {
        throw new TypeError('"this" is null or not defined');
      }

      var o = Object(this);
      var len = parseInt(o.length) || 0;
      if (typeof predicate !== 'function') {
        throw new TypeError('predicate must be a function');
      }

      var thisArg = arguments[1];
      var k = 0;

      while (k < len) {
        var kValue = o[k];
        if (predicate.call(thisArg, kValue, k, o)) {
          return kValue;
        }
        k++;
      }

      return undefined;
    },
    configurable: true,
    writable: true
  });
}

// Polyfill for Array.includes
if (!Array.prototype.includes) {
  Object.defineProperty(Array.prototype, 'includes', {
    value: function(searchElement, fromIndex) {
      if (this == null) {
        throw new TypeError('"this" is null or not defined');
      }

      var o = Object(this);
      var len = parseInt(o.length) || 0;
      if (len === 0) {
        return false;
      }

      var n = parseInt(fromIndex) || 0;
      var k;
      if (n >= 0) {
        k = n;
      } else {
        k = len + n;
        if (k < 0) {
          k = 0;
        }
      }

      function sameValueZero(x, y) {
        return x === y || (typeof x === 'number' && typeof y === 'number' && isNaN(x) && isNaN(y));
      }

      while (k < len) {
        if (sameValueZero(o[k], searchElement)) {
          return true;
        }
        k++;
      }

      return false;
    },
    configurable: true,
    writable: true
  });
}

// Polyfill for String.includes
if (!String.prototype.includes) {
  String.prototype.includes = function(search, start) {
    if (typeof start !== 'number') {
      start = 0;
    }
    
    if (start + search.length > this.length) {
      return false;
    } else {
      return this.indexOf(search, start) !== -1;
    }
  };
}

// Element.closest polyfill
if (!Element.prototype.closest) {
  Element.prototype.closest = function(s) {
    var el = this;
    do {
      if (Element.prototype.matches.call(el, s)) return el;
      el = el.parentElement || el.parentNode;
    } while (el !== null && el.nodeType === 1);
    return null;
  };
}

// Element.matches polyfill
if (!Element.prototype.matches) {
  Element.prototype.matches = Element.prototype.matchesSelector ||
    Element.prototype.mozMatchesSelector ||
    Element.prototype.msMatchesSelector ||
    Element.prototype.oMatchesSelector ||
    Element.prototype.webkitMatchesSelector ||
    function(s) {
      var matches = (this.document || this.ownerDocument).querySelectorAll(s);
      var i = matches.length;
      while (--i >= 0 && matches.item(i) !== this) {}
      return i > -1;
    };
}

// NodeList.forEach polyfill
if (window.NodeList && !NodeList.prototype.forEach) {
  NodeList.prototype.forEach = Array.prototype.forEach;
}

console.log('Firefox polyfills loaded successfully');
if (typeof Object.assign !== 'function') {
  Object.assign = function(target, varArgs) {
    'use strict';
    if (target === null || target === undefined) {
      throw new TypeError('Cannot convert undefined or null to object');
    }

    var to = Object(target);

    for (var index = 1; index < arguments.length; index++) {
      var nextSource = arguments[index];

      if (nextSource !== null && nextSource !== undefined) {
        for (var nextKey in nextSource) {
          if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
            to[nextKey] = nextSource[nextKey];
          }
        }
      }
    }
    return to;
  };
}

// Polyfill for Array.from
if (!Array.from) {
  Array.from = (function () {
    var toStr = Object.prototype.toString;
    var isCallable = function (fn) {
      return typeof fn === 'function' || toStr.call(fn) === '[object Function]';
    };
    var toInteger = function (value) {
      var number = Number(value);
      if (isNaN(number)) { return 0; }
      if (number === 0 || !isFinite(number)) { return number; }
      return (number > 0 ? 1 : -1) * Math.floor(Math.abs(number));
    };
    var maxSafeInteger = Math.pow(2, 53) - 1;
    var toLength = function (value) {
      var len = toInteger(value);
      return Math.min(Math.max(len, 0), maxSafeInteger);
    };

    return function from(arrayLike/*, mapFn, thisArg */) {
      var C = this;
      var items = Object(arrayLike);
      if (arrayLike == null) {
        throw new TypeError('Array.from requires an array-like object - not null or undefined');
      }
      var mapFn = arguments.length > 1 ? arguments[1] : void undefined;
      var T;
      if (typeof mapFn !== 'undefined') {
        if (!isCallable(mapFn)) {
          throw new TypeError('Array.from: when provided, the second argument must be a function');
        }
        if (arguments.length > 2) {
          T = arguments[2];
        }
      }
      var len = toLength(items.length);
      var A = isCallable(C) ? Object(new C(len)) : new Array(len);
      var k = 0;
      var kValue;
      while (k < len) {
        kValue = items[k];
        if (mapFn) {
          A[k] = typeof T === 'undefined' ? mapFn(kValue, k) : mapFn.call(T, kValue, k);
        } else {
          A[k] = kValue;
        }
        k += 1;
      }
      A.length = len;
      return A;
    };
  }());
}

// Polyfill for Array.find
if (!Array.prototype.find) {
  Object.defineProperty(Array.prototype, 'find', {
    value: function(predicate) {
      if (this == null) {
        throw new TypeError('"this" is null or not defined');
      }

      var o = Object(this);
      var len = parseInt(o.length) || 0;
      if (typeof predicate !== 'function') {
        throw new TypeError('predicate must be a function');
      }

      var thisArg = arguments[1];
      var k = 0;

      while (k < len) {
        var kValue = o[k];
        if (predicate.call(thisArg, kValue, k, o)) {
          return kValue;
        }
        k++;
      }

      return undefined;
    },
    configurable: true,
    writable: true
  });
}

// Polyfill for Array.findIndex
if (!Array.prototype.findIndex) {
  Object.defineProperty(Array.prototype, 'findIndex', {
    value: function(predicate) {
      if (this == null) {
        throw new TypeError('"this" is null or not defined');
      }

      var o = Object(this);
      var len = parseInt(o.length) || 0;
      if (typeof predicate !== 'function') {
        throw new TypeError('predicate must be a function');
      }

      var thisArg = arguments[1];
      var k = 0;

      while (k < len) {
        var kValue = o[k];
        if (predicate.call(thisArg, kValue, k, o)) {
          return k;
        }
        k++;
      }

      return -1;
    },
    configurable: true,
    writable: true
  });
}

// Polyfill for Array.includes
if (!Array.prototype.includes) {
  Object.defineProperty(Array.prototype, 'includes', {
    value: function(searchElement, fromIndex) {
      if (this == null) {
        throw new TypeError('"this" is null or not defined');
      }

      var o = Object(this);
      var len = parseInt(o.length) || 0;
      if (len === 0) {
        return false;
      }

      var n = parseInt(fromIndex) || 0;
      var k;
      if (n >= 0) {
        k = n;
      } else {
        k = len + n;
        if (k < 0) {
          k = 0;
        }
      }

      function sameValueZero(x, y) {
        return x === y || (typeof x === 'number' && typeof y === 'number' && isNaN(x) && isNaN(y));
      }

      while (k < len) {
        if (sameValueZero(o[k], searchElement)) {
          return true;
        }
        k++;
      }

      return false;
    },
    configurable: true,
    writable: true
  });
}

// Polyfill for String.includes
if (!String.prototype.includes) {
  String.prototype.includes = function(search, start) {
    if (typeof start !== 'number') {
      start = 0;
    }
    
    if (start + search.length > this.length) {
      return false;
    } else {
      return this.indexOf(search, start) !== -1;
    }
  };
}

// Polyfill for String.startsWith
if (!String.prototype.startsWith) {
  Object.defineProperty(String.prototype, 'startsWith', {
    value: function(search, pos) {
      return this.substr(!pos || pos < 0 ? 0 : +pos, search.length) === search;
    },
    configurable: true,
    writable: true
  });
}

// Polyfill for String.endsWith
if (!String.prototype.endsWith) {
  String.prototype.endsWith = function(search, this_len) {
    if (this_len === undefined || this_len > this.length) {
      this_len = this.length;
    }
    return this.substring(this_len - search.length, this_len) === search;
  };
}

// Polyfill for Promise (for older browsers)
if (typeof Promise === 'undefined') {
  window.Promise = function(executor) {
    var self = this;
    self.state = 'pending';
    self.value = undefined;
    self.handlers = [];

    function resolve(result) {
      if (self.state === 'pending') {
        self.state = 'fulfilled';
        self.value = result;
        self.handlers.forEach(handle);
        self.handlers = null;
      }
    }

    function reject(error) {
      if (self.state === 'pending') {
        self.state = 'rejected';
        self.value = error;
        self.handlers.forEach(handle);
        self.handlers = null;
      }
    }

    function handle(handler) {
      if (self.state === 'pending') {
        self.handlers.push(handler);
      } else {
        if (self.state === 'fulfilled' && typeof handler.onFulfilled === 'function') {
          handler.onFulfilled(self.value);
        }
        if (self.state === 'rejected' && typeof handler.onRejected === 'function') {
          handler.onRejected(self.value);
        }
      }
    }

    this.then = function(onFulfilled, onRejected) {
      return new Promise(function(resolve, reject) {
        handle({
          onFulfilled: function(result) {
            try {
              resolve(onFulfilled ? onFulfilled(result) : result);
            } catch (ex) {
              reject(ex);
            }
          },
          onRejected: function(error) {
            try {
              resolve(onRejected ? onRejected(error) : error);
            } catch (ex) {
              reject(ex);
            }
          }
        });
      });
    };

    this.catch = function(onRejected) {
      return this.then(null, onRejected);
    };

    executor(resolve, reject);
  };
}

// Polyfill for fetch API
if (!window.fetch) {
  window.fetch = function(url, options) {
    return new Promise(function(resolve, reject) {
      var request = new XMLHttpRequest();
      var method = (options && options.method) || 'GET';
      var data = (options && options.body) || null;
      var headers = (options && options.headers) || {};

      request.open(method, url, true);

      for (var key in headers) {
        request.setRequestHeader(key, headers[key]);
      }

      request.onload = function() {
        var response = {
          ok: request.status >= 200 && request.status < 300,
          status: request.status,
          statusText: request.statusText,
          url: request.responseURL,
          text: function() {
            return Promise.resolve(request.responseText);
          },
          json: function() {
            return Promise.resolve(JSON.parse(request.responseText));
          }
        };
        resolve(response);
      };

      request.onerror = function() {
        reject(new TypeError('Network request failed'));
      };

      request.send(data);
    });
  };
}

// Polyfill for Element.closest
if (!Element.prototype.closest) {
  Element.prototype.closest = function(s) {
    var el = this;
    do {
      if (Element.prototype.matches.call(el, s)) return el;
      el = el.parentElement || el.parentNode;
    } while (el !== null && el.nodeType === 1);
    return null;
  };
}

// Polyfill for Element.matches
if (!Element.prototype.matches) {
  Element.prototype.matches = Element.prototype.matchesSelector ||
    Element.prototype.mozMatchesSelector ||
    Element.prototype.msMatchesSelector ||
    Element.prototype.oMatchesSelector ||
    Element.prototype.webkitMatchesSelector ||
    function(s) {
      var matches = (this.document || this.ownerDocument).querySelectorAll(s);
      var i = matches.length;
      while (--i >= 0 && matches.item(i) !== this) {}
      return i > -1;
    };
}

// Polyfill for NodeList.forEach
if (window.NodeList && !NodeList.prototype.forEach) {
  NodeList.prototype.forEach = Array.prototype.forEach;
}

// Polyfill for CustomEvent
if (typeof window.CustomEvent !== 'function') {
  function CustomEvent(event, params) {
    params = params || { bubbles: false, cancelable: false, detail: undefined };
    var evt = document.createEvent('CustomEvent');
    evt.initCustomEvent(event, params.bubbles, params.cancelable, params.detail);
    return evt;
  }

  CustomEvent.prototype = window.Event.prototype;
  window.CustomEvent = CustomEvent;
}

// Firefox focus-visible polyfill
(function() {
  'use strict';

  var hadKeyboardEvent = true;
  var hadFocusVisibleRecently = false;
  var hadFocusVisibleRecentlyTimeout = null;

  var inputTypesWhitelist = {
    input: true,
    select: true,
    textarea: true,
    button: true
  };

  function onPointerDown() {
    hadKeyboardEvent = false;
  }

  function onKeyDown(e) {
    if (e.metaKey || e.altKey || e.ctrlKey) {
      return;
    }
    hadKeyboardEvent = true;
  }

  function onFocus(e) {
    if (hadKeyboardEvent || focusTriggeredByMouse(e)) {
      addClass(e.target, 'focus-visible');
      hadFocusVisibleRecently = true;
      window.clearTimeout(hadFocusVisibleRecentlyTimeout);
      hadFocusVisibleRecentlyTimeout = window.setTimeout(function() {
        hadFocusVisibleRecently = false;
      }, 100);
    }
  }

  function onBlur(e) {
    removeClass(e.target, 'focus-visible');
  }

  function focusTriggeredByMouse(e) {
    return inputTypesWhitelist[e.target.tagName.toLowerCase()] || e.target.isContentEditable;
  }

  function addClass(el, className) {
    if (el.classList) {
      el.classList.add(className);
    } else {
      el.className += ' ' + className;
    }
  }

  function removeClass(el, className) {
    if (el.classList) {
      el.classList.remove(className);
    } else {
      el.className = el.className.replace(new RegExp('(^|\\b)' + className.split(' ').join('|') + '(\\b|$)', 'gi'), ' ');
    }
  }

  document.addEventListener('keydown', onKeyDown, true);
  document.addEventListener('mousedown', onPointerDown, true);
  document.addEventListener('pointerdown', onPointerDown, true);
  document.addEventListener('touchstart', onPointerDown, true);
  document.addEventListener('focus', onFocus, true);
  document.addEventListener('blur', onBlur, true);

  document.body.classList.add('js-focus-visible');
})();

// Firefox smooth scroll polyfill
if (!('scrollBehavior' in document.documentElement.style)) {
  var smoothScrollPolyfill = function() {
    var element = this;
    var startTime = Date.now();
    var startPos = element.scrollTop;
    var endPos = arguments[0];
    var maxScroll = element.scrollHeight - element.clientHeight;
    var scrollEndValue = endPos > maxScroll ? maxScroll : endPos;
    var distance = scrollEndValue - startPos;
    var duration = arguments[1] || Math.min(Math.abs(distance), 300);

    function scroll() {
      var now = Date.now();
      var time = Math.min(1, ((now - startTime) / duration));
      var timeFunction = 0.5 * (1 - Math.cos(Math.PI * time));
      element.scrollTop = Math.ceil((timeFunction * distance) + startPos);

      if (element.scrollTop === scrollEndValue) {
        return;
      }
      requestAnimationFrame(scroll);
    }
    scroll();
  };

  Element.prototype.smoothScrollTo = smoothScrollPolyfill;
}

// IntersectionObserver polyfill for lazy loading
if (!('IntersectionObserver' in window)) {
  window.IntersectionObserver = function(callback, options) {
    this.callback = callback;
    this.options = options || {};
    this.observed = [];
  };

  window.IntersectionObserver.prototype.observe = function(target) {
    this.observed.push(target);
    // Simple fallback - just trigger callback immediately
    setTimeout(() => {
      this.callback([{
        target: target,
        isIntersecting: true,
        intersectionRatio: 1
      }]);
    }, 100);
  };

  window.IntersectionObserver.prototype.unobserve = function(target) {
    this.observed = this.observed.filter(el => el !== target);
  };

  window.IntersectionObserver.prototype.disconnect = function() {
    this.observed = [];
  };
}

// Console polyfill for older browsers
if (!window.console) {
  window.console = {
    log: function() {},
    warn: function() {},
    error: function() {},
    info: function() {},
    debug: function() {}
  };
}

console.log('Firefox polyfills loaded successfully'); 