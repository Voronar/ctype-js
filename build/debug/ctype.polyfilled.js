(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

/*
 Copyright (c) 2010, Linden Research, Inc.
 Copyright (c) 2014, Joshua Bell

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
 $/LicenseInfo$
 */

// Original can be found at:
//   https://bitbucket.org/lindenlab/llsd
// Modifications by Joshua Bell inexorabletash@gmail.com
//   https://github.com/inexorabletash/polyfill

// ES3/ES5 implementation of the Krhonos Typed Array Specification
//   Ref: http://www.khronos.org/registry/typedarray/specs/latest/
//   Date: 2011-02-01
//
// Variations:
//  * Allows typed_array.get/set() as alias for subscripts (typed_array[])
//  * Gradually migrating structure from Khronos spec to ES6 spec
(function (global) {
  'use strict';

  var undefined = void 0; // Paranoia

  // Beyond this value, index getters/setters (i.e. array[0], array[1]) are so slow to
  // create, and consume so much memory, that the browser appears frozen.
  var MAX_ARRAY_LENGTH = 1e5;

  // Approximations of internal ECMAScript conversion functions
  function Type(v) {
    switch (typeof v) {
      case 'undefined':
        return 'undefined';
      case 'boolean':
        return 'boolean';
      case 'number':
        return 'number';
      case 'string':
        return 'string';
      default:
        return v === null ? 'null' : 'object';
    }
  }

  // Class returns internal [[Class]] property, used to avoid cross-frame instanceof issues:
  function Class(v) {
    return Object.prototype.toString.call(v).replace(/^\[object *|\]$/g, '');
  }
  function IsCallable(o) {
    return typeof o === 'function';
  }
  function ToObject(v) {
    if (v === null || v === undefined) throw TypeError();
    return Object(v);
  }
  function ToInt32(v) {
    return v >> 0;
  }
  function ToUint32(v) {
    return v >>> 0;
  }

  // Snapshot intrinsics
  var LN2 = Math.LN2,
      abs = Math.abs,
      floor = Math.floor,
      log = Math.log,
      max = Math.max,
      min = Math.min,
      pow = Math.pow,
      round = Math.round;

  // emulate ES5 getter/setter API using legacy APIs
  // http://blogs.msdn.com/b/ie/archive/2010/09/07/transitioning-existing-code-to-the-es5-getter-setter-apis.aspx
  // (second clause tests for Object.defineProperty() in IE<9 that only supports extending DOM prototypes, but
  // note that IE<9 does not support __defineGetter__ or __defineSetter__ so it just renders the method harmless)

  (function () {
    var orig = Object.defineProperty;
    var dom_only = !(function () {
      try {
        return Object.defineProperty({}, 'x', {});
      } catch (_) {
        return false;
      }
    })();

    if (!orig || dom_only) {
      Object.defineProperty = function (o, prop, desc) {
        // In IE8 try built-in implementation for defining properties on DOM prototypes.
        if (orig) try {
          return orig(o, prop, desc);
        } catch (_) {}
        if (o !== Object(o)) throw TypeError('Object.defineProperty called on non-object');
        if (Object.prototype.__defineGetter__ && 'get' in desc) Object.prototype.__defineGetter__.call(o, prop, desc.get);
        if (Object.prototype.__defineSetter__ && 'set' in desc) Object.prototype.__defineSetter__.call(o, prop, desc.set);
        if ('value' in desc) o[prop] = desc.value;
        return o;
      };
    }
  })();

  // ES5: Make obj[index] an alias for obj._getter(index)/obj._setter(index, value)
  // for index in 0 ... obj.length
  function makeArrayAccessors(obj) {
    if (obj.length > MAX_ARRAY_LENGTH) throw RangeError('Array too large for polyfill');

    function makeArrayAccessor(index) {
      Object.defineProperty(obj, index, {
        'get': function () {
          return obj._getter(index);
        },
        'set': function (v) {
          obj._setter(index, v);
        },
        enumerable: true,
        configurable: false
      });
    }

    var i;
    for (i = 0; i < obj.length; i += 1) {
      makeArrayAccessor(i);
    }
  }

  // Internal conversion functions:
  //    pack<Type>()   - take a number (interpreted as Type), output a byte array
  //    unpack<Type>() - take a byte array, output a Type-like number

  function as_signed(value, bits) {
    var s = 32 - bits;return value << s >> s;
  }
  function as_unsigned(value, bits) {
    var s = 32 - bits;return value << s >>> s;
  }

  function packI8(n) {
    return [n & 0xff];
  }
  function unpackI8(bytes) {
    return as_signed(bytes[0], 8);
  }

  function packU8(n) {
    return [n & 0xff];
  }
  function unpackU8(bytes) {
    return as_unsigned(bytes[0], 8);
  }

  function packU8Clamped(n) {
    n = round(Number(n));return [n < 0 ? 0 : n > 0xff ? 0xff : n & 0xff];
  }

  function packI16(n) {
    return [n & 0xff, n >> 8 & 0xff];
  }
  function unpackI16(bytes) {
    return as_signed(bytes[1] << 8 | bytes[0], 16);
  }

  function packU16(n) {
    return [n & 0xff, n >> 8 & 0xff];
  }
  function unpackU16(bytes) {
    return as_unsigned(bytes[1] << 8 | bytes[0], 16);
  }

  function packI32(n) {
    return [n & 0xff, n >> 8 & 0xff, n >> 16 & 0xff, n >> 24 & 0xff];
  }
  function unpackI32(bytes) {
    return as_signed(bytes[3] << 24 | bytes[2] << 16 | bytes[1] << 8 | bytes[0], 32);
  }

  function packU32(n) {
    return [n & 0xff, n >> 8 & 0xff, n >> 16 & 0xff, n >> 24 & 0xff];
  }
  function unpackU32(bytes) {
    return as_unsigned(bytes[3] << 24 | bytes[2] << 16 | bytes[1] << 8 | bytes[0], 32);
  }

  function packIEEE754(v, ebits, fbits) {

    var bias = (1 << ebits - 1) - 1,
        s,
        e,
        f,
        ln,
        i,
        bits,
        str,
        bytes;

    function roundToEven(n) {
      var w = floor(n),
          f = n - w;
      if (f < 0.5) return w;
      if (f > 0.5) return w + 1;
      return w % 2 ? w + 1 : w;
    }

    // Compute sign, exponent, fraction
    if (v !== v) {
      // NaN
      // http://dev.w3.org/2006/webapi/WebIDL/#es-type-mapping
      e = (1 << ebits) - 1;f = pow(2, fbits - 1);s = 0;
    } else if (v === Infinity || v === -Infinity) {
      e = (1 << ebits) - 1;f = 0;s = v < 0 ? 1 : 0;
    } else if (v === 0) {
      e = 0;f = 0;s = 1 / v === -Infinity ? 1 : 0;
    } else {
      s = v < 0;
      v = abs(v);

      if (v >= pow(2, 1 - bias)) {
        e = min(floor(log(v) / LN2), 1023);
        var significand = v / pow(2, e);
        if (significand < 1) {
          e -= 1;
          significand *= 2;
        }
        if (significand >= 2) {
          e += 1;
          significand /= 2;
        }
        f = roundToEven(significand * pow(2, fbits));
        if (f / pow(2, fbits) >= 2) {
          e = e + 1;
          f = pow(2, fbits);
        }
        if (e > bias) {
          // Overflow
          e = (1 << ebits) - 1;
          f = 0;
        } else {
          // Normalized
          e = e + bias;
          f = f - pow(2, fbits);
        }
      } else {
        // Denormalized
        e = 0;
        f = roundToEven(v / pow(2, 1 - bias - fbits));
      }
    }

    // Pack sign, exponent, fraction
    bits = [];
    for (i = fbits; i; i -= 1) {
      bits.push(f % 2 ? 1 : 0);f = floor(f / 2);
    }
    for (i = ebits; i; i -= 1) {
      bits.push(e % 2 ? 1 : 0);e = floor(e / 2);
    }
    bits.push(s ? 1 : 0);
    bits.reverse();
    str = bits.join('');

    // Bits to bytes
    bytes = [];
    while (str.length) {
      bytes.unshift(parseInt(str.substring(0, 8), 2));
      str = str.substring(8);
    }
    return bytes;
  }

  function unpackIEEE754(bytes, ebits, fbits) {
    // Bytes to bits
    var bits = [],
        i,
        j,
        b,
        str,
        bias,
        s,
        e,
        f;

    for (i = 0; i < bytes.length; ++i) {
      b = bytes[i];
      for (j = 8; j; j -= 1) {
        bits.push(b % 2 ? 1 : 0);b = b >> 1;
      }
    }
    bits.reverse();
    str = bits.join('');

    // Unpack sign, exponent, fraction
    bias = (1 << ebits - 1) - 1;
    s = parseInt(str.substring(0, 1), 2) ? -1 : 1;
    e = parseInt(str.substring(1, 1 + ebits), 2);
    f = parseInt(str.substring(1 + ebits), 2);

    // Produce number
    if (e === (1 << ebits) - 1) {
      return f !== 0 ? NaN : s * Infinity;
    } else if (e > 0) {
      // Normalized
      return s * pow(2, e - bias) * (1 + f / pow(2, fbits));
    } else if (f !== 0) {
      // Denormalized
      return s * pow(2, -(bias - 1)) * (f / pow(2, fbits));
    } else {
      return s < 0 ? -0 : 0;
    }
  }

  function unpackF64(b) {
    return unpackIEEE754(b, 11, 52);
  }
  function packF64(v) {
    return packIEEE754(v, 11, 52);
  }
  function unpackF32(b) {
    return unpackIEEE754(b, 8, 23);
  }
  function packF32(v) {
    return packIEEE754(v, 8, 23);
  }

  //
  // 3 The ArrayBuffer Type
  //

  (function () {

    function ArrayBuffer(length) {
      length = ToInt32(length);
      if (length < 0) throw RangeError('ArrayBuffer size is not a small enough positive integer.');
      Object.defineProperty(this, 'byteLength', { value: length });
      Object.defineProperty(this, '_bytes', { value: Array(length) });

      for (var i = 0; i < length; i += 1) {
        this._bytes[i] = 0;
      }
    }

    global.ArrayBuffer = global.ArrayBuffer || ArrayBuffer;

    //
    // 5 The Typed Array View Types
    //

    function $TypedArray$() {

      // %TypedArray% ( length )
      if (!arguments.length || typeof arguments[0] !== 'object') {
        return (function (length) {
          length = ToInt32(length);
          if (length < 0) throw RangeError('length is not a small enough positive integer.');
          Object.defineProperty(this, 'length', { value: length });
          Object.defineProperty(this, 'byteLength', { value: length * this.BYTES_PER_ELEMENT });
          Object.defineProperty(this, 'buffer', { value: new ArrayBuffer(this.byteLength) });
          Object.defineProperty(this, 'byteOffset', { value: 0 });
        }).apply(this, arguments);
      }

      // %TypedArray% ( typedArray )
      if (arguments.length >= 1 && Type(arguments[0]) === 'object' && arguments[0] instanceof $TypedArray$) {
        return (function (typedArray) {
          if (this.constructor !== typedArray.constructor) throw TypeError();

          var byteLength = typedArray.length * this.BYTES_PER_ELEMENT;
          Object.defineProperty(this, 'buffer', { value: new ArrayBuffer(byteLength) });
          Object.defineProperty(this, 'byteLength', { value: byteLength });
          Object.defineProperty(this, 'byteOffset', { value: 0 });
          Object.defineProperty(this, 'length', { value: typedArray.length });

          for (var i = 0; i < this.length; i += 1) {
            this._setter(i, typedArray._getter(i));
          }
        }).apply(this, arguments);
      }

      // %TypedArray% ( array )
      if (arguments.length >= 1 && Type(arguments[0]) === 'object' && !(arguments[0] instanceof $TypedArray$) && !(arguments[0] instanceof ArrayBuffer || Class(arguments[0]) === 'ArrayBuffer')) {
        return (function (array) {

          var byteLength = array.length * this.BYTES_PER_ELEMENT;
          Object.defineProperty(this, 'buffer', { value: new ArrayBuffer(byteLength) });
          Object.defineProperty(this, 'byteLength', { value: byteLength });
          Object.defineProperty(this, 'byteOffset', { value: 0 });
          Object.defineProperty(this, 'length', { value: array.length });

          for (var i = 0; i < this.length; i += 1) {
            var s = array[i];
            this._setter(i, Number(s));
          }
        }).apply(this, arguments);
      }

      // %TypedArray% ( buffer, byteOffset=0, length=undefined )
      if (arguments.length >= 1 && Type(arguments[0]) === 'object' && (arguments[0] instanceof ArrayBuffer || Class(arguments[0]) === 'ArrayBuffer')) {
        return (function (buffer, byteOffset, length) {

          byteOffset = ToUint32(byteOffset);
          if (byteOffset > buffer.byteLength) throw RangeError('byteOffset out of range');

          // The given byteOffset must be a multiple of the element
          // size of the specific type, otherwise an exception is raised.
          if (byteOffset % this.BYTES_PER_ELEMENT) throw RangeError('buffer length minus the byteOffset is not a multiple of the element size.');

          if (length === undefined) {
            var byteLength = buffer.byteLength - byteOffset;
            if (byteLength % this.BYTES_PER_ELEMENT) throw RangeError('length of buffer minus byteOffset not a multiple of the element size');
            length = byteLength / this.BYTES_PER_ELEMENT;
          } else {
            length = ToUint32(length);
            byteLength = length * this.BYTES_PER_ELEMENT;
          }

          if (byteOffset + byteLength > buffer.byteLength) throw RangeError('byteOffset and length reference an area beyond the end of the buffer');

          Object.defineProperty(this, 'buffer', { value: buffer });
          Object.defineProperty(this, 'byteLength', { value: byteLength });
          Object.defineProperty(this, 'byteOffset', { value: byteOffset });
          Object.defineProperty(this, 'length', { value: length });
        }).apply(this, arguments);
      }

      // %TypedArray% ( all other argument combinations )
      throw TypeError();
    }

    // Properties of the %TypedArray Instrinsic Object

    // %TypedArray%.from ( source , mapfn=undefined, thisArg=undefined )
    Object.defineProperty($TypedArray$, 'from', { value: function (iterable) {
        return new this(iterable);
      } });

    // %TypedArray%.of ( ...items )
    Object.defineProperty($TypedArray$, 'of', { value: function () /*...items*/{
        return new this(arguments);
      } });

    // %TypedArray%.prototype
    var $TypedArrayPrototype$ = {};
    $TypedArray$.prototype = $TypedArrayPrototype$;

    // WebIDL: getter type (unsigned long index);
    Object.defineProperty($TypedArray$.prototype, '_getter', { value: function (index) {
        if (arguments.length < 1) throw SyntaxError('Not enough arguments');

        index = ToUint32(index);
        if (index >= this.length) return undefined;

        var bytes = [],
            i,
            o;
        for (i = 0, o = this.byteOffset + index * this.BYTES_PER_ELEMENT; i < this.BYTES_PER_ELEMENT; i += 1, o += 1) {
          bytes.push(this.buffer._bytes[o]);
        }
        return this._unpack(bytes);
      } });

    // NONSTANDARD: convenience alias for getter: type get(unsigned long index);
    Object.defineProperty($TypedArray$.prototype, 'get', { value: $TypedArray$.prototype._getter });

    // WebIDL: setter void (unsigned long index, type value);
    Object.defineProperty($TypedArray$.prototype, '_setter', { value: function (index, value) {
        if (arguments.length < 2) throw SyntaxError('Not enough arguments');

        index = ToUint32(index);
        if (index >= this.length) return;

        var bytes = this._pack(value),
            i,
            o;
        for (i = 0, o = this.byteOffset + index * this.BYTES_PER_ELEMENT; i < this.BYTES_PER_ELEMENT; i += 1, o += 1) {
          this.buffer._bytes[o] = bytes[i];
        }
      } });

    // get %TypedArray%.prototype.buffer
    // get %TypedArray%.prototype.byteLength
    // get %TypedArray%.prototype.byteOffset
    // -- applied directly to the object in the constructor

    // %TypedArray%.prototype.constructor
    Object.defineProperty($TypedArray$.prototype, 'constructor', { value: $TypedArray$ });

    // %TypedArray%.prototype.copyWithin (target, start, end = this.length )
    Object.defineProperty($TypedArray$.prototype, 'copyWithin', { value: function (target, start) {
        var end = arguments[2];

        var o = ToObject(this);
        var lenVal = o.length;
        var len = ToUint32(lenVal);
        len = max(len, 0);
        var relativeTarget = ToInt32(target);
        var to;
        if (relativeTarget < 0) to = max(len + relativeTarget, 0);else to = min(relativeTarget, len);
        var relativeStart = ToInt32(start);
        var from;
        if (relativeStart < 0) from = max(len + relativeStart, 0);else from = min(relativeStart, len);
        var relativeEnd;
        if (end === undefined) relativeEnd = len;else relativeEnd = ToInt32(end);
        var final;
        if (relativeEnd < 0) final = max(len + relativeEnd, 0);else final = min(relativeEnd, len);
        var count = min(final - from, len - to);
        var direction;
        if (from < to && to < from + count) {
          direction = -1;
          from = from + count - 1;
          to = to + count - 1;
        } else {
          direction = 1;
        }
        while (count > 0) {
          o._setter(to, o._getter(from));
          from = from + direction;
          to = to + direction;
          count = count - 1;
        }
        return o;
      } });

    // %TypedArray%.prototype.entries ( )
    // -- defined in es6.js to shim browsers w/ native TypedArrays

    // %TypedArray%.prototype.every ( callbackfn, thisArg = undefined )
    Object.defineProperty($TypedArray$.prototype, 'every', { value: function (callbackfn) {
        if (this === undefined || this === null) throw TypeError();
        var t = Object(this);
        var len = ToUint32(t.length);
        if (!IsCallable(callbackfn)) throw TypeError();
        var thisArg = arguments[1];
        for (var i = 0; i < len; i++) {
          if (!callbackfn.call(thisArg, t._getter(i), i, t)) return false;
        }
        return true;
      } });

    // %TypedArray%.prototype.fill (value, start = 0, end = this.length )
    Object.defineProperty($TypedArray$.prototype, 'fill', { value: function (value) {
        var start = arguments[1],
            end = arguments[2];

        var o = ToObject(this);
        var lenVal = o.length;
        var len = ToUint32(lenVal);
        len = max(len, 0);
        var relativeStart = ToInt32(start);
        var k;
        if (relativeStart < 0) k = max(len + relativeStart, 0);else k = min(relativeStart, len);
        var relativeEnd;
        if (end === undefined) relativeEnd = len;else relativeEnd = ToInt32(end);
        var final;
        if (relativeEnd < 0) final = max(len + relativeEnd, 0);else final = min(relativeEnd, len);
        while (k < final) {
          o._setter(k, value);
          k += 1;
        }
        return o;
      } });

    // %TypedArray%.prototype.filter ( callbackfn, thisArg = undefined )
    Object.defineProperty($TypedArray$.prototype, 'filter', { value: function (callbackfn) {
        if (this === undefined || this === null) throw TypeError();
        var t = Object(this);
        var len = ToUint32(t.length);
        if (!IsCallable(callbackfn)) throw TypeError();
        var res = [];
        var thisp = arguments[1];
        for (var i = 0; i < len; i++) {
          var val = t._getter(i); // in case fun mutates this
          if (callbackfn.call(thisp, val, i, t)) res.push(val);
        }
        return new this.constructor(res);
      } });

    // %TypedArray%.prototype.find (predicate, thisArg = undefined)
    Object.defineProperty($TypedArray$.prototype, 'find', { value: function (predicate) {
        var o = ToObject(this);
        var lenValue = o.length;
        var len = ToUint32(lenValue);
        if (!IsCallable(predicate)) throw TypeError();
        var t = arguments.length > 1 ? arguments[1] : undefined;
        var k = 0;
        while (k < len) {
          var kValue = o._getter(k);
          var testResult = predicate.call(t, kValue, k, o);
          if (Boolean(testResult)) return kValue;
          ++k;
        }
        return undefined;
      } });

    // %TypedArray%.prototype.findIndex ( predicate, thisArg = undefined )
    Object.defineProperty($TypedArray$.prototype, 'findIndex', { value: function (predicate) {
        var o = ToObject(this);
        var lenValue = o.length;
        var len = ToUint32(lenValue);
        if (!IsCallable(predicate)) throw TypeError();
        var t = arguments.length > 1 ? arguments[1] : undefined;
        var k = 0;
        while (k < len) {
          var kValue = o._getter(k);
          var testResult = predicate.call(t, kValue, k, o);
          if (Boolean(testResult)) return k;
          ++k;
        }
        return -1;
      } });

    // %TypedArray%.prototype.forEach ( callbackfn, thisArg = undefined )
    Object.defineProperty($TypedArray$.prototype, 'forEach', { value: function (callbackfn) {
        if (this === undefined || this === null) throw TypeError();
        var t = Object(this);
        var len = ToUint32(t.length);
        if (!IsCallable(callbackfn)) throw TypeError();
        var thisp = arguments[1];
        for (var i = 0; i < len; i++) {
          callbackfn.call(thisp, t._getter(i), i, t);
        }
      } });

    // %TypedArray%.prototype.indexOf (searchElement, fromIndex = 0 )
    Object.defineProperty($TypedArray$.prototype, 'indexOf', { value: function (searchElement) {
        if (this === undefined || this === null) throw TypeError();
        var t = Object(this);
        var len = ToUint32(t.length);
        if (len === 0) return -1;
        var n = 0;
        if (arguments.length > 0) {
          n = Number(arguments[1]);
          if (n !== n) {
            n = 0;
          } else if (n !== 0 && n !== 1 / 0 && n !== -(1 / 0)) {
            n = (n > 0 || -1) * floor(abs(n));
          }
        }
        if (n >= len) return -1;
        var k = n >= 0 ? n : max(len - abs(n), 0);
        for (; k < len; k++) {
          if (t._getter(k) === searchElement) {
            return k;
          }
        }
        return -1;
      } });

    // %TypedArray%.prototype.join ( separator )
    Object.defineProperty($TypedArray$.prototype, 'join', { value: function (separator) {
        if (this === undefined || this === null) throw TypeError();
        var t = Object(this);
        var len = ToUint32(t.length);
        var tmp = Array(len);
        for (var i = 0; i < len; ++i) {
          tmp[i] = t._getter(i);
        }return tmp.join(separator === undefined ? ',' : separator); // Hack for IE7
      } });

    // %TypedArray%.prototype.keys ( )
    // -- defined in es6.js to shim browsers w/ native TypedArrays

    // %TypedArray%.prototype.lastIndexOf ( searchElement, fromIndex = this.length-1 )
    Object.defineProperty($TypedArray$.prototype, 'lastIndexOf', { value: function (searchElement) {
        if (this === undefined || this === null) throw TypeError();
        var t = Object(this);
        var len = ToUint32(t.length);
        if (len === 0) return -1;
        var n = len;
        if (arguments.length > 1) {
          n = Number(arguments[1]);
          if (n !== n) {
            n = 0;
          } else if (n !== 0 && n !== 1 / 0 && n !== -(1 / 0)) {
            n = (n > 0 || -1) * floor(abs(n));
          }
        }
        var k = n >= 0 ? min(n, len - 1) : len - abs(n);
        for (; k >= 0; k--) {
          if (t._getter(k) === searchElement) return k;
        }
        return -1;
      } });

    // get %TypedArray%.prototype.length
    // -- applied directly to the object in the constructor

    // %TypedArray%.prototype.map ( callbackfn, thisArg = undefined )
    Object.defineProperty($TypedArray$.prototype, 'map', { value: function (callbackfn) {
        if (this === undefined || this === null) throw TypeError();
        var t = Object(this);
        var len = ToUint32(t.length);
        if (!IsCallable(callbackfn)) throw TypeError();
        var res = [];res.length = len;
        var thisp = arguments[1];
        for (var i = 0; i < len; i++) {
          res[i] = callbackfn.call(thisp, t._getter(i), i, t);
        }return new this.constructor(res);
      } });

    // %TypedArray%.prototype.reduce ( callbackfn [, initialValue] )
    Object.defineProperty($TypedArray$.prototype, 'reduce', { value: function (callbackfn) {
        if (this === undefined || this === null) throw TypeError();
        var t = Object(this);
        var len = ToUint32(t.length);
        if (!IsCallable(callbackfn)) throw TypeError();
        // no value to return if no initial value and an empty array
        if (len === 0 && arguments.length === 1) throw TypeError();
        var k = 0;
        var accumulator;
        if (arguments.length >= 2) {
          accumulator = arguments[1];
        } else {
          accumulator = t._getter(k++);
        }
        while (k < len) {
          accumulator = callbackfn.call(undefined, accumulator, t._getter(k), k, t);
          k++;
        }
        return accumulator;
      } });

    // %TypedArray%.prototype.reduceRight ( callbackfn [, initialValue] )
    Object.defineProperty($TypedArray$.prototype, 'reduceRight', { value: function (callbackfn) {
        if (this === undefined || this === null) throw TypeError();
        var t = Object(this);
        var len = ToUint32(t.length);
        if (!IsCallable(callbackfn)) throw TypeError();
        // no value to return if no initial value, empty array
        if (len === 0 && arguments.length === 1) throw TypeError();
        var k = len - 1;
        var accumulator;
        if (arguments.length >= 2) {
          accumulator = arguments[1];
        } else {
          accumulator = t._getter(k--);
        }
        while (k >= 0) {
          accumulator = callbackfn.call(undefined, accumulator, t._getter(k), k, t);
          k--;
        }
        return accumulator;
      } });

    // %TypedArray%.prototype.reverse ( )
    Object.defineProperty($TypedArray$.prototype, 'reverse', { value: function () {
        if (this === undefined || this === null) throw TypeError();
        var t = Object(this);
        var len = ToUint32(t.length);
        var half = floor(len / 2);
        for (var i = 0, j = len - 1; i < half; ++i, --j) {
          var tmp = t._getter(i);
          t._setter(i, t._getter(j));
          t._setter(j, tmp);
        }
        return t;
      } });

    // %TypedArray%.prototype.set(array, offset = 0 )
    // %TypedArray%.prototype.set(typedArray, offset = 0 )
    // WebIDL: void set(TypedArray array, optional unsigned long offset);
    // WebIDL: void set(sequence<type> array, optional unsigned long offset);
    Object.defineProperty($TypedArray$.prototype, 'set', { value: function (index, value) {
        if (arguments.length < 1) throw SyntaxError('Not enough arguments');
        var array, sequence, offset, len, i, s, d, byteOffset, byteLength, tmp;

        if (typeof arguments[0] === 'object' && arguments[0].constructor === this.constructor) {
          // void set(TypedArray array, optional unsigned long offset);
          array = arguments[0];
          offset = ToUint32(arguments[1]);

          if (offset + array.length > this.length) {
            throw RangeError('Offset plus length of array is out of range');
          }

          byteOffset = this.byteOffset + offset * this.BYTES_PER_ELEMENT;
          byteLength = array.length * this.BYTES_PER_ELEMENT;

          if (array.buffer === this.buffer) {
            tmp = [];
            for (i = 0, s = array.byteOffset; i < byteLength; i += 1, s += 1) {
              tmp[i] = array.buffer._bytes[s];
            }
            for (i = 0, d = byteOffset; i < byteLength; i += 1, d += 1) {
              this.buffer._bytes[d] = tmp[i];
            }
          } else {
            for (i = 0, s = array.byteOffset, d = byteOffset; i < byteLength; i += 1, s += 1, d += 1) {
              this.buffer._bytes[d] = array.buffer._bytes[s];
            }
          }
        } else if (typeof arguments[0] === 'object' && typeof arguments[0].length !== 'undefined') {
          // void set(sequence<type> array, optional unsigned long offset);
          sequence = arguments[0];
          len = ToUint32(sequence.length);
          offset = ToUint32(arguments[1]);

          if (offset + len > this.length) {
            throw RangeError('Offset plus length of array is out of range');
          }

          for (i = 0; i < len; i += 1) {
            s = sequence[i];
            this._setter(offset + i, Number(s));
          }
        } else {
          throw TypeError('Unexpected argument type(s)');
        }
      } });

    // %TypedArray%.prototype.slice ( start, end )
    Object.defineProperty($TypedArray$.prototype, 'slice', { value: function (start, end) {
        var o = ToObject(this);
        var lenVal = o.length;
        var len = ToUint32(lenVal);
        var relativeStart = ToInt32(start);
        var k = relativeStart < 0 ? max(len + relativeStart, 0) : min(relativeStart, len);
        var relativeEnd = end === undefined ? len : ToInt32(end);
        var final = relativeEnd < 0 ? max(len + relativeEnd, 0) : min(relativeEnd, len);
        var count = final - k;
        var c = o.constructor;
        var a = new c(count);
        var n = 0;
        while (k < final) {
          var kValue = o._getter(k);
          a._setter(n, kValue);
          ++k;
          ++n;
        }
        return a;
      } });

    // %TypedArray%.prototype.some ( callbackfn, thisArg = undefined )
    Object.defineProperty($TypedArray$.prototype, 'some', { value: function (callbackfn) {
        if (this === undefined || this === null) throw TypeError();
        var t = Object(this);
        var len = ToUint32(t.length);
        if (!IsCallable(callbackfn)) throw TypeError();
        var thisp = arguments[1];
        for (var i = 0; i < len; i++) {
          if (callbackfn.call(thisp, t._getter(i), i, t)) {
            return true;
          }
        }
        return false;
      } });

    // %TypedArray%.prototype.sort ( comparefn )
    Object.defineProperty($TypedArray$.prototype, 'sort', { value: function (comparefn) {
        if (this === undefined || this === null) throw TypeError();
        var t = Object(this);
        var len = ToUint32(t.length);
        var tmp = Array(len);
        for (var i = 0; i < len; ++i) {
          tmp[i] = t._getter(i);
        }if (comparefn) tmp.sort(comparefn);else tmp.sort(); // Hack for IE8/9
        for (i = 0; i < len; ++i) {
          t._setter(i, tmp[i]);
        }return t;
      } });

    // %TypedArray%.prototype.subarray(begin = 0, end = this.length )
    // WebIDL: TypedArray subarray(long begin, optional long end);
    Object.defineProperty($TypedArray$.prototype, 'subarray', { value: function (start, end) {
        function clamp(v, min, max) {
          return v < min ? min : v > max ? max : v;
        }

        start = ToInt32(start);
        end = ToInt32(end);

        if (arguments.length < 1) {
          start = 0;
        }
        if (arguments.length < 2) {
          end = this.length;
        }

        if (start < 0) {
          start = this.length + start;
        }
        if (end < 0) {
          end = this.length + end;
        }

        start = clamp(start, 0, this.length);
        end = clamp(end, 0, this.length);

        var len = end - start;
        if (len < 0) {
          len = 0;
        }

        return new this.constructor(this.buffer, this.byteOffset + start * this.BYTES_PER_ELEMENT, len);
      } });

    // %TypedArray%.prototype.toLocaleString ( )
    // %TypedArray%.prototype.toString ( )
    // %TypedArray%.prototype.values ( )
    // %TypedArray%.prototype [ @@iterator ] ( )
    // get %TypedArray%.prototype [ @@toStringTag ]
    // -- defined in es6.js to shim browsers w/ native TypedArrays

    function makeTypedArray(elementSize, pack, unpack) {
      // Each TypedArray type requires a distinct constructor instance with
      // identical logic, which this produces.
      var TypedArray = function () {
        Object.defineProperty(this, 'constructor', { value: TypedArray });
        $TypedArray$.apply(this, arguments);
        makeArrayAccessors(this);
      };
      if ('__proto__' in TypedArray) {
        TypedArray.__proto__ = $TypedArray$;
      } else {
        TypedArray.from = $TypedArray$.from;
        TypedArray.of = $TypedArray$.of;
      }

      TypedArray.BYTES_PER_ELEMENT = elementSize;

      var TypedArrayPrototype = function () {};
      TypedArrayPrototype.prototype = $TypedArrayPrototype$;

      TypedArray.prototype = new TypedArrayPrototype();

      Object.defineProperty(TypedArray.prototype, 'BYTES_PER_ELEMENT', { value: elementSize });
      Object.defineProperty(TypedArray.prototype, '_pack', { value: pack });
      Object.defineProperty(TypedArray.prototype, '_unpack', { value: unpack });

      return TypedArray;
    }

    var Int8Array = makeTypedArray(1, packI8, unpackI8);
    var Uint8Array = makeTypedArray(1, packU8, unpackU8);
    var Uint8ClampedArray = makeTypedArray(1, packU8Clamped, unpackU8);
    var Int16Array = makeTypedArray(2, packI16, unpackI16);
    var Uint16Array = makeTypedArray(2, packU16, unpackU16);
    var Int32Array = makeTypedArray(4, packI32, unpackI32);
    var Uint32Array = makeTypedArray(4, packU32, unpackU32);
    var Float32Array = makeTypedArray(4, packF32, unpackF32);
    var Float64Array = makeTypedArray(8, packF64, unpackF64);

    global.Int8Array = global.Int8Array || Int8Array;
    global.Uint8Array = global.Uint8Array || Uint8Array;
    global.Uint8ClampedArray = global.Uint8ClampedArray || Uint8ClampedArray;
    global.Int16Array = global.Int16Array || Int16Array;
    global.Uint16Array = global.Uint16Array || Uint16Array;
    global.Int32Array = global.Int32Array || Int32Array;
    global.Uint32Array = global.Uint32Array || Uint32Array;
    global.Float32Array = global.Float32Array || Float32Array;
    global.Float64Array = global.Float64Array || Float64Array;
  })();

  //
  // 6 The DataView View Type
  //

  (function () {
    function r(array, index) {
      return IsCallable(array.get) ? array.get(index) : array[index];
    }

    var IS_BIG_ENDIAN = (function () {
      var u16array = new Uint16Array([0x1234]),
          u8array = new Uint8Array(u16array.buffer);
      return r(u8array, 0) === 0x12;
    })();

    // DataView(buffer, byteOffset=0, byteLength=undefined)
    // WebIDL: Constructor(ArrayBuffer buffer,
    //                     optional unsigned long byteOffset,
    //                     optional unsigned long byteLength)
    function DataView(buffer, byteOffset, byteLength) {
      if (!(buffer instanceof ArrayBuffer || Class(buffer) === 'ArrayBuffer')) throw TypeError();

      byteOffset = ToUint32(byteOffset);
      if (byteOffset > buffer.byteLength) throw RangeError('byteOffset out of range');

      if (byteLength === undefined) byteLength = buffer.byteLength - byteOffset;else byteLength = ToUint32(byteLength);

      if (byteOffset + byteLength > buffer.byteLength) throw RangeError('byteOffset and length reference an area beyond the end of the buffer');

      Object.defineProperty(this, 'buffer', { value: buffer });
      Object.defineProperty(this, 'byteLength', { value: byteLength });
      Object.defineProperty(this, 'byteOffset', { value: byteOffset });
    };

    // get DataView.prototype.buffer
    // get DataView.prototype.byteLength
    // get DataView.prototype.byteOffset
    // -- applied directly to instances by the constructor

    function makeGetter(arrayType) {
      return function GetViewValue(byteOffset, littleEndian) {
        byteOffset = ToUint32(byteOffset);

        if (byteOffset + arrayType.BYTES_PER_ELEMENT > this.byteLength) throw RangeError('Array index out of range');

        byteOffset += this.byteOffset;

        var uint8Array = new Uint8Array(this.buffer, byteOffset, arrayType.BYTES_PER_ELEMENT),
            bytes = [];
        for (var i = 0; i < arrayType.BYTES_PER_ELEMENT; i += 1) {
          bytes.push(r(uint8Array, i));
        }if (Boolean(littleEndian) === Boolean(IS_BIG_ENDIAN)) bytes.reverse();

        return r(new arrayType(new Uint8Array(bytes).buffer), 0);
      };
    }

    Object.defineProperty(DataView.prototype, 'getUint8', { value: makeGetter(Uint8Array) });
    Object.defineProperty(DataView.prototype, 'getInt8', { value: makeGetter(Int8Array) });
    Object.defineProperty(DataView.prototype, 'getUint16', { value: makeGetter(Uint16Array) });
    Object.defineProperty(DataView.prototype, 'getInt16', { value: makeGetter(Int16Array) });
    Object.defineProperty(DataView.prototype, 'getUint32', { value: makeGetter(Uint32Array) });
    Object.defineProperty(DataView.prototype, 'getInt32', { value: makeGetter(Int32Array) });
    Object.defineProperty(DataView.prototype, 'getFloat32', { value: makeGetter(Float32Array) });
    Object.defineProperty(DataView.prototype, 'getFloat64', { value: makeGetter(Float64Array) });

    function makeSetter(arrayType) {
      return function SetViewValue(byteOffset, value, littleEndian) {
        byteOffset = ToUint32(byteOffset);
        if (byteOffset + arrayType.BYTES_PER_ELEMENT > this.byteLength) throw RangeError('Array index out of range');

        // Get bytes
        var typeArray = new arrayType([value]),
            byteArray = new Uint8Array(typeArray.buffer),
            bytes = [],
            i,
            byteView;

        for (i = 0; i < arrayType.BYTES_PER_ELEMENT; i += 1) {
          bytes.push(r(byteArray, i));
        } // Flip if necessary
        if (Boolean(littleEndian) === Boolean(IS_BIG_ENDIAN)) bytes.reverse();

        // Write them
        byteView = new Uint8Array(this.buffer, byteOffset, arrayType.BYTES_PER_ELEMENT);
        byteView.set(bytes);
      };
    }

    Object.defineProperty(DataView.prototype, 'setUint8', { value: makeSetter(Uint8Array) });
    Object.defineProperty(DataView.prototype, 'setInt8', { value: makeSetter(Int8Array) });
    Object.defineProperty(DataView.prototype, 'setUint16', { value: makeSetter(Uint16Array) });
    Object.defineProperty(DataView.prototype, 'setInt16', { value: makeSetter(Int16Array) });
    Object.defineProperty(DataView.prototype, 'setUint32', { value: makeSetter(Uint32Array) });
    Object.defineProperty(DataView.prototype, 'setInt32', { value: makeSetter(Int32Array) });
    Object.defineProperty(DataView.prototype, 'setFloat32', { value: makeSetter(Float32Array) });
    Object.defineProperty(DataView.prototype, 'setFloat64', { value: makeSetter(Float64Array) });

    global.DataView = global.DataView || DataView;
  })();
})(window);

},{}],2:[function(require,module,exports){
/**
 * @file src/ctype.js
 * @module ctype
 */

"use strict";
/**
 * Tests an variable is being an JavaScript object type
 * @param  {Object} object Testing object value
 * @return {Boolean}      Is a variable a JavaScript object
 */

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.uint8 = uint8;
exports.uint16 = uint16;
exports.uint32 = uint32;
exports.int8 = int8;
exports.int16 = int16;
exports.int32 = int32;
exports.float32 = float32;
exports.float64 = float64;
exports.struct = struct;
exports.bufferToStruct = bufferToStruct;
exports.structToBuffer = structToBuffer;
exports.bufferToArray = bufferToArray;
exports.arrayToBuffer = arrayToBuffer;
function isObject(object) {
  return typeof object === "object";
}
/**
 * Does deep copy of an object
 * @param {Object} destObj Destination object
 * @param {Object} srcObj  Source object
 */
function copyObject(destObj, srcObj) {
  if (destObj) {
    if (!isObject(destObj) || destObj === null) {
      throw new Error("[CType] 'copyObject' function: " + "a destination object '" + destObj.toString() + "' must have an object type");
    }

    for (var it in srcObj) {
      if (!isObject(srcObj[it]) || srcObj[it] === null) {
        destObj[it] = srcObj[it];
      }
      if (isObject(srcObj[it]) && srcObj[it] !== null && srcObj[it].length !== undefined) {
        destObj[it] = new window[srcObj[it].constructor.name](srcObj[it].length);
        allocateArray(destObj[it], srcObj[it]);
        continue;
      }
      if (isObject(srcObj[it]) && srcObj[it] !== null) {
        destObj[it] = {};
        copyObject(destObj[it], srcObj[it]);
      }
    }
  } else {
    throw new Error("[CType] 'copyObject' function: set a non-empty parameter: [object]");
  }
}

function allocateArray(destArr, srcArr) {
  var l = srcArr.length;

  if (destArr) {
    if (!isObject(destArr) || destArr.length === undefined || destArr === null) {
      throw new Error("[CType] 'allocateArray' function: " + "a destination object '" + destArr.toString() + "' must have an array type");
    }

    for (var it = 0; it < l; ++it) {
      if (isObject(srcArr[it]) && srcArr[it] !== null && srcArr[it].length !== undefined) {
        destArr[it] = new window[srcArr[it].constructor.name](srcArr[it].length);
        allocateArray(destArr[it], srcArr[it]);
        continue;
      }
      if (isObject(srcArr[it]) && srcArr[it] !== null) {
        destArr[it] = {};
        copyObject(destArr[it], srcArr[it]);
      }
    }
  } else {
    throw new Error("[CType] 'allocateArray' function: set a non-empty parameter: [array]");
  }
}

/**
 * Gets a size of source structure
 * @param  {Object} srcStruct Source structure
 * @param  {Number} totalSize Total size in bytes
 */
function getStructSize(srcStruct, totalSize) {
  var isEmpty = false;

  for (var field in srcStruct) {
    var fieldValue = srcStruct[field];
    isEmpty = false;

    if (!isObject(fieldValue) && !fieldValue.BYTES_PER_ELEMENT && !srcStruct.byteLength) {
      throw new Error("[ctype] 'struct' function: invalid structure field '" + field + ":" + fieldValue + "'");
    }

    if (!fieldValue.BYTES_PER_ELEMENT) {
      if (fieldValue.length) {
        for (var i = 0; i < fieldValue.length; ++i) {
          if (isObject(fieldValue[i])) {
            getStructSize(fieldValue[i], totalSize);
          }
        }
      } else {
        if (isObject(fieldValue)) {
          getStructSize(fieldValue, totalSize);
        }
      }
    } else {
      totalSize.value += fieldValue.byteLength;
    }
  }

  if (isEmpty) {
    throw new Error("[ctype] 'struct' function: invalid structure field - an empty object");
  }
}
/**
 * uint8(Uint8Array) type byte length
 * @type {Number}
 */
var UINT8_SIZE = exports.UINT8_SIZE = Uint8Array.BYTES_PER_ELEMENT;
/**
 * uint16(Uint16Array) type byte length
 * @type {Number}
 */
var UINT16_SIZE = exports.UINT16_SIZE = Uint16Array.BYTES_PER_ELEMENT;
/**
 * uint32(Uint32Array) type byte length
 * @type {Number}
 */
var UINT32_SIZE = exports.UINT32_SIZE = Uint32Array.BYTES_PER_ELEMENT;
/**
 * int8(Int8Array) type byte length
 * @type {Number}
 */
var INT8_SIZE = exports.INT8_SIZE = Int8Array.BYTES_PER_ELEMENT;
/**
 * int16(Int16Array) type byte length
 * @type {Number}
 */
var INT16_SIZE = exports.INT16_SIZE = Int16Array.BYTES_PER_ELEMENT;
/**
 * int32(Uint32Array) type byte length
 * @type {Number}
 */
var INT32_SIZE = exports.INT32_SIZE = Int32Array.BYTES_PER_ELEMENT;
/**
 * float32(Float32Array) type byte length
 * @type {Number}
 */
var FLOAT32_SIZE = exports.FLOAT32_SIZE = Float32Array.BYTES_PER_ELEMENT;
/**
 * float64(Float64Array) type byte length
 * @type {Number}
 */
var FLOAT64_SIZE = exports.FLOAT64_SIZE = Float64Array.BYTES_PER_ELEMENT;
/**
 * Returns new 'unsigned char array[size]' C equivalent
 * @param  {Number} size=1 Array length
 * @return {Uint8Array}      Unsigned 8-byte integer array
 */
function uint8() {
  var size = arguments.length <= 0 || arguments[0] === undefined ? 1 : arguments[0];

  var ctype = new Uint8Array(size);
  return ctype;
}
/**
 * Returns new 'unsigned short array[size]' C equivalent
 * @param  {Number} size=1 Array length
 * @return {Uint16Array}     Unsigned 16-byte integer array
 */
function uint16() {
  var size = arguments.length <= 0 || arguments[0] === undefined ? 1 : arguments[0];

  var ctype = new Uint16Array(size);
  return ctype;
}
/**
 * Returns new 'unsigned int array[size]' C equivalent
 * @param  {Number} size=1 Array length
 * @return {Uint32Array}     Unsigned 32-byte integer array
 */
function uint32() {
  var size = arguments.length <= 0 || arguments[0] === undefined ? 1 : arguments[0];

  var ctype = new Uint32Array(size);
  return ctype;
}
/**
 * Returns new 'char array[size]' C equivalent
 * @param  {Number} size=1 Array length
 * @return {Int8Array}       Signed 8-byte integer array
 */
function int8() {
  var size = arguments.length <= 0 || arguments[0] === undefined ? 1 : arguments[0];

  var ctype = new Int8Array(size);
  return ctype;
}
/**
 * Returns new 'short array[size]' C equivalent
 * @param  {Number} size=1 Array length
 * @return {Int16Array}      Signed 16-byte integer array
 */
function int16() {
  var size = arguments.length <= 0 || arguments[0] === undefined ? 1 : arguments[0];

  var ctype = new Int16Array(size);
  return ctype;
}
/**
 * Returns new 'int array[size]' C equivalent
 * @param  {Number} size=1 Array length
 * @return {Int32Array}      Signed 32-byte integer array
 */
function int32() {
  var size = arguments.length <= 0 || arguments[0] === undefined ? 1 : arguments[0];

  var ctype = new Int32Array(size);
  return ctype;
}
/**
 * Returns new 'float array[size]' C equivalent
 * @param  {Number} size=1 Array length
 * @return {Float32Array}    Signed 32-byte floating point array
 */
function float32() {
  var size = arguments.length <= 0 || arguments[0] === undefined ? 1 : arguments[0];

  var ctype = new Float32Array(size);
  return ctype;
}
/**
 * Returns new 'double array[size]' C equivalent
 * @param  {Number} size=1 Array length
 * @return {Float64Array}    Signed 64-byte floating point array
 */
function float64() {
  var size = arguments.length <= 0 || arguments[0] === undefined ? 1 : arguments[0];

  var ctype = new Float64Array(size);
  return ctype;
}
/**
 * Returns new 'struct s[size]' C equivalent with 'byteLength' field is a total size of structure
 * @param  {Object} srcStruct Empty source object
 * @param  {Number} size=1    Array length
 * @return {Object}           Object structure with typed fields
 */
function struct(srcStruct) {
  var size = arguments.length <= 1 || arguments[1] === undefined ? 1 : arguments[1];

  if (!isObject(srcStruct) || typeof size !== "number") {
    throw new Error("[ctype] 'struct' function: invalid arguments (Object srcStruct, Number size)");
  }

  var totalSize = { value: 0 };

  getStructSize(srcStruct, totalSize);

  if (size > 1) {
    var dstStructs = [];
    for (var i = 0; i < size; ++i) {
      dstStructs[i] = {};
      copyObject(dstStructs[i], srcStruct);

      Object.defineProperty(dstStructs[i], "byteLength", {
        value: totalSize.value,
        writable: false,
        enumerable: true,
        configurable: false
      });
    }
    return dstStructs;
  } else {
    var dstStruct = {};
    copyObject(dstStruct, srcStruct);

    Object.defineProperty(dstStruct, "byteLength", {
      value: totalSize.value,
      writable: false,
      enumerable: true,
      configurable: false
    });

    return dstStruct;
  }

  return null;
}
/**
 * Sets data from a source buffer to a destination structure
 * @param {Object}      dstStruct    Destination structure
 * @param {ArrayBuffer} srcBuffer    Source buffer
 * @param {Number}      totalOffset  Total offset in bytes
 * @param {Boolean}     littleEndian Little-endian bytes order flag
 */
function setBufferToStruct(dstStruct, srcBuffer, totalOffset, littleEndian) {
  for (var field in dstStruct) {
    var fieldValue = dstStruct[field];

    if (fieldValue.constructor.name === "Array") {
      var l = fieldValue.length;

      for (var i = 0; i < l; ++i) {
        setBufferToStruct(fieldValue[i], srcBuffer, totalOffset, littleEndian);
      }
    } else {
      if (fieldValue.constructor.name === "Object") {
        setBufferToStruct(fieldValue, srcBuffer, totalOffset, littleEndian);
      } else {
        var l = fieldValue.length;

        switch (fieldValue.constructor.name) {
          case "Uint8Array":
            for (var i = 0; i < l; ++i) {
              fieldValue[i] = srcBuffer.getUint8(totalOffset.value, littleEndian && true);
              totalOffset.value += fieldValue.BYTES_PER_ELEMENT;
            }
            break;

          case "Uint16Array":
            for (var i = 0; i < l; ++i) {
              fieldValue[i] = srcBuffer.getUint16(totalOffset.value, littleEndian && true);
              totalOffset.value += fieldValue.BYTES_PER_ELEMENT;
            }
            break;

          case "Uint32Array":
            for (var i = 0; i < l; ++i) {
              fieldValue[i] = srcBuffer.getUint32(totalOffset.value, littleEndian && true);
              totalOffset.value += fieldValue.BYTES_PER_ELEMENT;
            }
            break;

          case "Int8Array":
            for (var i = 0; i < l; ++i) {
              fieldValue[i] = srcBuffer.getInt8(totalOffset.value, littleEndian && true);
              totalOffset.value += fieldValue.BYTES_PER_ELEMENT;
            }
            break;

          case "Int16Array":
            for (var i = 0; i < l; ++i) {
              fieldValue[i] = srcBuffer.getInt16(totalOffset.value, littleEndian && true);
              totalOffset.value += fieldValue.BYTES_PER_ELEMENT;
            }
            break;

          case "Int32Array":
            for (var i = 0; i < l; ++i) {
              fieldValue[i] = srcBuffer.getInt32(totalOffset.value, littleEndian && true);
              totalOffset.value += fieldValue.BYTES_PER_ELEMENT;
            }
            break;

          case "Float32Array":
            for (var i = 0; i < l; ++i) {
              fieldValue[i] = srcBuffer.getFloat32(totalOffset.value, littleEndian && true);
              totalOffset.value += fieldValue.BYTES_PER_ELEMENT;
            }
            break;

          case "Float64Array":
            for (var i = 0; i < l; ++i) {
              fieldValue[i] = srcBuffer.getFloat64(totalOffset.value, littleEndian && true);
              totalOffset.value += fieldValue.BYTES_PER_ELEMENT;
            }
            break;
        }
      }
    }
  }
}
/**
 * Sets data from source structure to destination buffer
 * @param  {ArrayBuffer} dstBuffer    Destination buffer
 * @param  {Object}      srcStruct    Source structure
 * @param  {Number}      totalOffset  Total offset in bytes
 * @param  {Boolean}     littleEndian Little-endian bytes order flag
 */
function setStructToBuffer(dstBuffer, srcStruct, totalOffset, littleEndian) {
  for (var field in srcStruct) {
    var fieldValue = srcStruct[field];

    if (fieldValue.constructor.name === "Array") {
      var l = fieldValue.length;

      for (var i = 0; i < l; ++i) {
        setStructToBuffer(dstBuffer, fieldValue[i], totalOffset, littleEndian);
      }
    } else {
      if (fieldValue.constructor.name === "Object") {
        setStructToBuffer(dstBuffer, fieldValue, totalOffset, littleEndian);
      } else {
        var l = fieldValue.length;

        switch (fieldValue.constructor.name) {
          case "Uint8Array":
            for (var i = 0; i < l; ++i) {
              dstBuffer.setUint8(totalOffset.value, fieldValue[i], littleEndian && true);
              totalOffset.value += fieldValue.BYTES_PER_ELEMENT;
            }
            break;

          case "Uint16Array":
            for (var i = 0; i < l; ++i) {
              dstBuffer.setUint16(totalOffset.value, fieldValue[i], littleEndian && true);
              totalOffset.value += fieldValue.BYTES_PER_ELEMENT;
            }
            break;

          case "Uint32Array":
            for (var i = 0; i < l; ++i) {
              dstBuffer.setUint32(totalOffset.value, fieldValue[i], littleEndian && true);
              totalOffset.value += fieldValue.BYTES_PER_ELEMENT;
            }
            break;

          case "Int8Array":
            for (var i = 0; i < l; ++i) {
              dstBuffer.setInt8(totalOffset.value, fieldValue[i], littleEndian && true);
              totalOffset.value += fieldValue.BYTES_PER_ELEMENT;
            }
            break;

          case "Int16Array":
            for (var i = 0; i < l; ++i) {
              dstBuffer.setInt16(totalOffset.value, fieldValue[i], littleEndian && true);
              totalOffset.value += fieldValue.BYTES_PER_ELEMENT;
            }
            break;

          case "Int32Array":
            for (var i = 0; i < l; ++i) {
              dstBuffer.setInt32(totalOffset.value, fieldValue[i], littleEndian && true);
              totalOffset.value += fieldValue.BYTES_PER_ELEMENT;
            }
            break;

          case "Float32Array":
            for (var i = 0; i < l; ++i) {
              dstBuffer.setFloat32(totalOffset.value, fieldValue[i], littleEndian && true);
              totalOffset.value += fieldValue.BYTES_PER_ELEMENT;
            }
            break;

          case "Float64Array":
            for (var i = 0; i < l; ++i) {
              dstBuffer.setFloat64(totalOffset.value, fieldValue[i], littleEndian && true);
              totalOffset.value += fieldValue.BYTES_PER_ELEMENT;
            }
            break;
        }
      }
    }
  }
}
/**
 * Copies a source buffer to a destination structure
 * @param  {ArrayBuffer}     srcBuffer         Source buffer
 * @param  {Object|Object[]} dstStruct         Destination structure or array of structures
 * @param  {Number}          byteOffset=0      Byte offset from a start of a source buffer
 * @param  {Boolean}         littleEndian=true Little-endian bytes order flag
 * @return {Object}                            Destination structure reference
 */
function bufferToStruct(srcBuffer, dstStruct) {
  var byteOffset = arguments.length <= 2 || arguments[2] === undefined ? 0 : arguments[2];
  var littleEndian = arguments.length <= 3 || arguments[3] === undefined ? true : arguments[3];

  if (!isObject(dstStruct) || !(srcBuffer instanceof ArrayBuffer) || typeof byteOffset !== "number" || typeof littleEndian !== "boolean") {
    throw new Error("[ctype] 'bufferToStruct' function: invalid arguments in the signature (ArrayBuffer srcBuffer, Object dstStruct, Number byteOffset = 0, Boolean littleEndian = true)");
  }

  var srcBuf = undefined;

  try {
    srcBuf = new DataView(srcBuffer, byteOffset);
  } catch (e) {
    console.log(e);
    return;
  }

  var totalOffset = { value: 0 };

  setBufferToStruct(dstStruct, srcBuf, totalOffset, littleEndian);

  return dstStruct;
}
/**
 * Copies a source structure to a destination buffer
 * @param  {Object|Object[]} srcStruct      Source structure or array of structures
 * @param  {ArrayBuffer} existedBuffer=null Existed buffer
 * @param  {Number} byteOffset=0            Byte offset from a start of a source buffer
 * @param  {Number} littleEndian=true       Little-endian bytes order flag
 * @return {ArrayBuffer}                    Destination buffer reference
 */
function structToBuffer(srcStruct) {
  var existedBuffer = arguments.length <= 1 || arguments[1] === undefined ? null : arguments[1];
  var byteOffset = arguments.length <= 2 || arguments[2] === undefined ? 0 : arguments[2];
  var littleEndian = arguments.length <= 3 || arguments[3] === undefined ? true : arguments[3];

  if (!isObject(srcStruct) || !(existedBuffer instanceof ArrayBuffer) && existedBuffer !== null || typeof byteOffset !== "number" || typeof littleEndian !== "boolean") {
    throw new Error("[ctype] 'structToBuffer' function: invalid arguments in the signature (Object srcStruct, ArrayBuffer existedBuffer = null, Number byteOffset = 0, Boolean littleEndian = true)");
  }

  var totalOffset = { value: 0 };
  var arrayBuffer = undefined,
      dstBuffer = undefined;

  if (existedBuffer === null) {
    if (srcStruct instanceof Array) {
      var l = srcStruct.length;

      arrayBuffer = new ArrayBuffer(srcStruct[0].byteLength * l);
      dstBuffer = new DataView(arrayBuffer);
    } else {
      arrayBuffer = new ArrayBuffer(srcStruct.byteLength);
      dstBuffer = new DataView(arrayBuffer);
    }

    setStructToBuffer(dstBuffer, srcStruct, totalOffset, littleEndian);
  } else {
    dstBuffer = new DataView(existedBuffer, byteOffset);

    setStructToBuffer(dstBuffer, srcStruct, totalOffset, littleEndian);
  }

  return dstBuffer.buffer;
}
/**
 * Sets data from a source typed array to a destination buffer
 * @param {Array} srcArray        Source typed array
 * @param {ArrayBuffer} dstBuffer Destination buffer
 * @param {Number} length         Byte length for copying from a source typed array
 * @param {Number} byteOffset     Byte offset from a start of a source typed array
 * @param {Number} totalOffset    Total offset in bytes
 * @param {Boolean} littleEndian  Little-endian bytes order flag
 */
function setArrayToBuffer(srcArray, dstBuffer, length, totalOffset, littleEndian) {
  var l = undefined;
  var i = totalOffset.value / srcArray.BYTES_PER_ELEMENT;

  if (isNaN(length)) {
    if (dstBuffer.byteLength > srcArray.byteLength || dstBuffer.byteLength === srcArray.byteLength) {
      l = srcArray.length;
    } else {
      l = dstBuffer.byteLength / srcArray.BYTES_PER_ELEMENT;
    }
  } else {
    l = length / srcArray.BYTES_PER_ELEMENT + totalOffset.value / srcArray.BYTES_PER_ELEMENT;
  }

  switch (srcArray.constructor.name) {
    case "Uint8Array":
      for (; i < l; ++i) {
        dstBuffer.setUint8(totalOffset.value, srcArray[i], littleEndian && true);
        totalOffset.value += srcArray.BYTES_PER_ELEMENT;
      }
      break;

    case "Uint16Array":
      for (; i < l; ++i) {
        dstBuffer.setUint16(totalOffset.value, srcArray[i], littleEndian && true);
        totalOffset.value += srcArray.BYTES_PER_ELEMENT;
      }
      break;

    case "Uint32Array":
      for (; i < l; ++i) {
        dstBuffer.setUint32(totalOffset.value, srcArray[i], littleEndian && true);
        totalOffset.value += srcArray.BYTES_PER_ELEMENT;
      }
      break;

    case "Int8Array":
      for (; i < l; ++i) {
        dstBuffer.setInt8(totalOffset.value, srcArray[i], littleEndian && true);
        totalOffset.value += srcArray.BYTES_PER_ELEMENT;
      }
      break;

    case "Int16Array":
      for (; i < l; ++i) {
        dstBuffer.setInt16(totalOffset.value, srcArray[i], littleEndian && true);
        totalOffset.value += srcArray.BYTES_PER_ELEMENT;
      }
      break;

    case "Int32Array":
      for (; i < l; ++i) {
        dstBuffer.setInt32(totalOffset.value, srcArray[i], littleEndian && true);
        totalOffset.value += srcArray.BYTES_PER_ELEMENT;
      }
      break;

    case "Float32Array":
      for (; i < l; ++i) {
        dstBuffer.setFloat32(totalOffset.value, srcArray[i], littleEndian && true);
        totalOffset.value += srcArray.BYTES_PER_ELEMENT;
      }
      break;

    case "Float64Array":
      for (; i < l; ++i) {
        dstBuffer.setFloat64(totalOffset.value, srcArray[i], littleEndian && true);
        totalOffset.value += srcArray.BYTES_PER_ELEMENT;
      }
      break;
  }
}
/**
 * Sets data from a source buffer array to a destination typed array
 * @param {ArrayBuffer} srcBuffer Sorce buffer
 * @param {Array} dstArray        Destination typed array
 * @param {Number} length         Byte length for copying from a source buffer
 * @param {Number} totalOffset    Total offset in bytes
 * @param {Boolean} littleEndian  Little-endian bytes order flag
 */
function setBufferToArray(srcBuffer, dstArray, length, totalOffset, littleEndian) {
  var l = undefined;

  if (isNaN(length)) {
    if (srcBuffer.byteLength > dstArray.byteLength || srcBuffer.byteLength === dstArray.byteLength) {
      l = dstArray.length;
    } else {
      l = srcBuffer.byteLength / dstArray.BYTES_PER_ELEMENT;
    }
  } else {
    l = length / dstArray.BYTES_PER_ELEMENT;
  }

  switch (dstArray.constructor.name) {
    case "Uint8Array":
      for (var i = 0; i < l; ++i) {
        dstArray[i] = srcBuffer.getUint8(totalOffset.value, littleEndian && true);
        totalOffset.value += dstArray.BYTES_PER_ELEMENT;
      }
      break;

    case "Uint16Array":
      for (var i = 0; i < l; ++i) {
        dstArray[i] = srcBuffer.getUint16(totalOffset.value, littleEndian && true);
        totalOffset.value += dstArray.BYTES_PER_ELEMENT;
      }
      break;

    case "Uint32Array":
      for (var i = 0; i < l; ++i) {
        dstArray[i] = srcBuffer.getUint32(totalOffset.value, littleEndian && true);
        totalOffset.value += dstArray.BYTES_PER_ELEMENT;
      }
      break;

    case "Int8Array":
      for (var i = 0; i < l; ++i) {
        dstArray[i] = srcBuffer.getInt8(totalOffset.value, littleEndian && true);
        totalOffset.value += dstArray.BYTES_PER_ELEMENT;
      }
      break;

    case "Int16Array":
      for (var i = 0; i < l; ++i) {
        dstArray[i] = srcBuffer.getInt16(totalOffset.value, littleEndian && true);
        totalOffset.value += dstArray.BYTES_PER_ELEMENT;
      }
      break;

    case "Int32Array":
      for (var i = 0; i < l; ++i) {
        dstArray[i] = srcBuffer.getInt32(totalOffset.value, littleEndian && true);
        totalOffset.value += dstArray.BYTES_PER_ELEMENT;
      }
      break;

    case "Float32Array":
      for (var i = 0; i < l; ++i) {
        dstArray[i] = srcBuffer.getFloat32(totalOffset.value, littleEndian && true);
        totalOffset.value += dstArray.BYTES_PER_ELEMENT;
      }
      break;

    case "Float64Array":
      for (var i = 0; i < l; ++i) {
        dstArray[i] = srcBuffer.getFloat64(totalOffset.value, littleEndian && true);
        totalOffset.value += dstArray.BYTES_PER_ELEMENT;
      }
      break;
  }
}
/**
 * Copies a source buffer to a destination typed array
 * @param  {ArrayBuffer} srcBuffer         Source buffer
 * @param  {Array}       dstArray          Destination typed array
 * @param  {Number}      byteOffset=0      Byte offset from a start of a source buffer
 * @param  {Number}      length=NaN        Byte length for copying from a source buffer
 * @param  {Boolean}     littleEndian=true Little-endian bytes order flag
 * @return {Array}                         Destination array reference
 */
function bufferToArray(srcBuffer, dstArray) {
  var byteOffset = arguments.length <= 2 || arguments[2] === undefined ? 0 : arguments[2];
  var length = arguments.length <= 3 || arguments[3] === undefined ? NaN : arguments[3];
  var littleEndian = arguments.length <= 4 || arguments[4] === undefined ? true : arguments[4];

  if (!dstArray.BYTES_PER_ELEMENT || !(srcBuffer instanceof ArrayBuffer) || typeof length !== "number" && !isNaN(length) || typeof byteOffset !== "number" || typeof littleEndian !== "boolean") {
    throw new Error("[ctype] 'bufferToArray' function: invalid arguments in the signature (ArrayBuffer srcBuffer, TypedArray dstArray, Number length = NaN, NumberNumber offset = 0, Boolean littleEndian = true)");
  }

  if (length < 0) {
    throw new Error("[ctype] 'bufferToArray' function: the copying byte length must be a positive value");
  }

  var srcBuf = new DataView(srcBuffer, byteOffset);
  var totalOffset = { value: 0 };

  setBufferToArray(srcBuf, dstArray, length, totalOffset, littleEndian);

  return dstArray;
}
/**
 * Copies a source typed array to a destination buffer
 * @param  {Array} srcArray                 Source typed array
 * @param  {ArrayBuffer} existedBuffer=null DesExisted buffer
 * @param  {Number} byteOffset=0            Byte offset from a start of a source typed array
 * @param  {Number} length=NaN              Byte length for copying from a source typed array
 * @param  {Boolean} littleEndian=true      Little-endian bytes order flag
 * @return {ArrayBuffer}                    Destination buffer reference
 */
function arrayToBuffer(srcArray) {
  var existedBuffer = arguments.length <= 1 || arguments[1] === undefined ? null : arguments[1];
  var byteOffset = arguments.length <= 2 || arguments[2] === undefined ? 0 : arguments[2];
  var length = arguments.length <= 3 || arguments[3] === undefined ? NaN : arguments[3];
  var littleEndian = arguments.length <= 4 || arguments[4] === undefined ? true : arguments[4];

  if (!srcArray.BYTES_PER_ELEMENT || !(existedBuffer instanceof ArrayBuffer) && existedBuffer !== null || typeof length !== "number" || typeof byteOffset !== "number" || typeof littleEndian !== "boolean") {
    throw new Error("[ctype] 'arrayToBuffer' function: invalid arguments in the signature (TypedArray srcArray, ArrayBuffer existedBuffer = null, Number length = NaN, Number byteOffset = 0, Boolean littleEndian = true)");
  }

  if (length < 0) {
    throw new Error("[ctype] 'arrayToBuffer' function: the copying byte length must be a positive value");
  }

  var totalOffset = { value: byteOffset };
  var arrayBuffer = undefined,
      dstBuffer = undefined;

  if (existedBuffer === null) {
    arrayBuffer = new ArrayBuffer(srcArray.byteLength);
    dstBuffer = new DataView(arrayBuffer);

    setArrayToBuffer(srcArray, dstBuffer, length, totalOffset, littleEndian);
  } else {
    dstBuffer = new DataView(existedBuffer);

    setArrayToBuffer(srcArray, dstBuffer, length, totalOffset, littleEndian);
  }

  return dstBuffer.buffer;
}

},{}],3:[function(require,module,exports){
/**
 * @file src/export.js
 * Exporting script
 */

"use strict";

var _ctype = require("./ctype");

var ctype = _interopRequireWildcard(_ctype);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

if (!window.ctype) {
  //window.ctype = ctype;
  Object.defineProperty(window, "ctype", {
    value: ctype,
    writable: false,
    enumerable: false,
    configurable: false
  });
} else {
  //window.libctypejs = ctype;
  Object.defineProperty(window, "libctypejs", {
    value: ctype,
    writable: false,
    enumerable: false,
    configurable: false
  });
  console.warn("[CTypeJS] library exporting: 'ctype' name is already reserved. Library was renamed to 'libctypejs'.");
}

},{"./ctype":2}]},{},[1,3])


//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJwb2x5ZmlsbHMvdHlwZWRhcnJheS5qcyIsInNyYy9jdHlwZS5qcyIsInNyYy9leHBvcnQuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQ29DQSxBQUFDLENBQUEsVUFBUyxNQUFNLEVBQUU7QUFDaEIsY0FBWSxDQUFDOztBQUNiLE1BQUksU0FBUyxHQUFJLEtBQUssQ0FBQyxBQUFDOzs7O0FBQUMsQUFJekIsTUFBSSxnQkFBZ0IsR0FBRyxHQUFHOzs7QUFBQyxBQUczQixXQUFTLElBQUksQ0FBQyxDQUFDLEVBQUU7QUFDZixZQUFPLE9BQU8sQ0FBQztBQUNmLFdBQUssV0FBVztBQUFFLGVBQU8sV0FBVyxDQUFDO0FBQUEsQUFDckMsV0FBSyxTQUFTO0FBQUUsZUFBTyxTQUFTLENBQUM7QUFBQSxBQUNqQyxXQUFLLFFBQVE7QUFBRSxlQUFPLFFBQVEsQ0FBQztBQUFBLEFBQy9CLFdBQUssUUFBUTtBQUFFLGVBQU8sUUFBUSxDQUFDO0FBQUEsQUFDL0I7QUFBUyxlQUFPLENBQUMsS0FBSyxJQUFJLEdBQUcsTUFBTSxHQUFHLFFBQVEsQ0FBQztBQUFBLEtBQzlDO0dBQ0Y7OztBQUFBLEFBR0QsV0FBUyxLQUFLLENBQUMsQ0FBQyxFQUFFO0FBQUUsV0FBTyxNQUFNLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLGtCQUFrQixFQUFFLEVBQUUsQ0FBQyxDQUFDO0dBQUU7QUFDL0YsV0FBUyxVQUFVLENBQUMsQ0FBQyxFQUFFO0FBQUUsV0FBTyxPQUFPLENBQUMsS0FBSyxVQUFVLENBQUM7R0FBRTtBQUMxRCxXQUFTLFFBQVEsQ0FBQyxDQUFDLEVBQUU7QUFDbkIsUUFBSSxDQUFDLEtBQUssSUFBSSxJQUFJLENBQUMsS0FBSyxTQUFTLEVBQUUsTUFB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QUFDLE9BQU8sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsSUFBSSxHQUFHLElBQUksR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUM7R0FBRTs7QUFFcEcsV0FBUyxPQUFPLENBQUMsQ0FBQyxFQUFFO0FBQUUsV0FBTyxDQUFDLENBQUMsR0FBRyxJQUFJLEVBQUUsQUFBQyxDQUFDLElBQUksQ0FBQyxHQUFJLElBQUksQ0FBQyxDQUFDO0dBQUU7QUFDM0QsV0FBUyxTQUFTLENBQUMsS0FBSyxFQUFFO0FBQUUsV0FBTyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7R0FBRTs7QUFFN0UsV0FBUyxPQUFPLENBQUMsQ0FBQyxFQUFFO0FBQUUsV0FBTyxDQUFDLENBQUMsR0FBRyxJQUFJLEVBQUUsQUFBQyxDQUFDLElBQUksQ0FBQyxHQUFJLElBQUksQ0FBQyxDQUFDO0dBQUU7QUFDM0QsV0FBUyxTQUFTLENBQUMsS0FBSyxFQUFFO0FBQUUsV0FBTyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7R0FBRTs7QUFFL0UsV0FBUyxPQUFPLENBQUMsQ0FBQyxFQUFFO0FBQUUsV0FBTyxDQUFDLENBQUMsR0FBRyxJQUFJLEVBQUUsQUFBQyxDQUFDLElBQUksQ0FBQyxHQUFJLElBQUksRUFBRSxBQUFDLENBQUMsSUFBSSxFQUFFLEdBQUksSUFBSSxFQUFFLEFBQUMsQ0FBQyxJQUFJLEVBQUUsR0FBSSxJQUFJLENBQUMsQ0FBQztHQUFFO0FBQy9GLFdBQVMsU0FBUyxDQUFDLEtBQUssRUFBRTtBQUFFLFdBQU8sU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztHQUFFOztBQUUvRyxXQUFTLE9BQU8sQ0FBQyxDQUFDLEVBQUU7QUFBRSxXQUFPLENBQUMsQ0FBQyxHQUFHLElBQUksRUFBRSxBQUFDLENBQUMsSUFBSSxDQUFDLEdBQUksSUFBSSxFQUFFLEFBQUMsQ0FBQyxJQUFJLEVBQUUsR0FBSSxJQUFJLEVBQUUsQUFBQyxDQUFDLElBQUksRUFBRSxHQUFJLElBQUksQ0FBQyxDQUFDO0dBQUU7QUFDL0YsV0FBUyxTQUFTLENBQUMsS0FBSyxFQUFFO0FBQUUsV0FBTyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0dBQUU7O0FBRWpILFdBQVMsV0FBVyxDQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFOztBQUVwQyxRQUFJLElBQUksR0FBRyxDQUFDLENBQUMsSUFBSyxLQUFLLEdBQUcsQ0FBQyxDQUFDLEdBQUksQ0FBQztRQUM3QixDQUFDO1FBQUUsQ0FBQztRQUFFLENBQUM7UUFBRSxFQUFFO1FBQ1gsQ0FBQztRQUFFLElBQUk7UUFBRSxHQUFHO1FBQUUsS0FBSyxDQUFDOztBQUV4QixhQUFTLFdBQVcsQ0FBQyxDQUFDLEVBQUU7QUFDdEIsVUFBSSxDQUFDLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQztVQUFFLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQzVCLFVBQUksQ0FBQyxHQUFHLEdBQUcsRUFDVCxPQUFPLENBQUMsQ0FBQztBQUNYLFVBQUksQ0FBQyxHQUFHLEdBQUcsRUFDVCxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDZixhQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7S0FDMUI7OztBQUFBLEFBR0QsUUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFOzs7QUFHWCxPQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksS0FBSyxDQUFBLEdBQUksQ0FBQyxDQUFDLEFBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEVBQUUsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDLEFBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztLQUNwRCxNQUFNLElBQUksQ0FBQyxLQUFLLFFBQVEsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUU7QUFDNUMsT0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLEtBQUssQ0FBQSxHQUFJLENBQUMsQ0FBQyxBQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQUFBQyxDQUFDLEdBQUcsQUFBQyxDQUFDLEdBQUcsQ0FBQyxHQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7S0FDbEQsTUFBTSxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUU7QUFDbEIsT0FBQyxHQUFHLENBQUMsQ0FBQyxBQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQUFBQyxDQUFDLEdBQUcsQUFBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsUUFBUSxHQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7S0FDakQsTUFBTTtBQUNMLE9BQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQ1YsT0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQzs7QUFFWCxVQUFJLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsRUFBRTtBQUN6QixTQUFDLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7QUFDbkMsWUFBSSxXQUFXLEdBQUcsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFDaEMsWUFBSSxXQUFXLEdBQUcsQ0FBQyxFQUFFO0FBQ25CLFdBQUMsSUFBSSxDQUFDLENBQUM7QUFDUCxxQkFBVyxJQUFJLENBQUMsQ0FBQztTQUNsQjtBQUNELFlBQUksV0FBVyxJQUFJLENBQUMsRUFBRTtBQUNwQixXQUFDLElBQUksQ0FBQyxDQUFDO0FBQ1AscUJBQVcsSUFBSSxDQUFDLENBQUM7U0FDbEI7QUFDRCxTQUFDLEdBQUcsV0FBVyxDQUFDLFdBQVcsR0FBRyxHQUFHLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7QUFDN0MsWUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUU7QUFDMUIsV0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDVixXQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztTQUNuQjtBQUNELFlBQUksQ0FBQyxHQUFHLElBQUksRUFBRTs7QUFFWixXQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksS0FBSyxDQUFBLEdBQUksQ0FBQyxDQUFDO0FBQ3JCLFdBQUMsR0FBRyxDQUFDLENBQUM7U0FDUCxNQUFNOztBQUVMLFdBQUMsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDO0FBQ2IsV0FBQyxHQUFHLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO1NBQ3ZCO09BQ0YsTUFBTTs7QUFFTCxTQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQ04sU0FBQyxHQUFHLFdBQVcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUM7T0FDL0M7S0FDRjs7O0FBQUEsQUFHRCxRQUFJLEdBQUcsRUFBRSxDQUFDO0FBQ1YsU0FBSyxDQUFDLEdBQUcsS0FBSyxFQUFFLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFO0FBQUUsVUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxBQUFDLENBQUMsR0FBRyxLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0tBQUU7QUFDMUUsU0FBSyxDQUFDLEdBQUcsS0FBSyxFQUFFLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFO0FBQUUsVUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxBQUFDLENBQUMsR0FBRyxLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0tBQUU7QUFDMUUsUUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0FBQ3JCLFFBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztBQUNmLE9BQUcsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQzs7O0FBQUMsQUFHcEIsU0FBSyxHQUFHLEVBQUUsQ0FBQztBQUNYLFdBQU8sR0FBRyxDQUFDLE1BQU0sRUFBRTtBQUNqQixXQUFLLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2hELFNBQUcsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO0tBQ3hCO0FBQ0QsV0FBTyxLQUFLLENBQUM7R0FDZDs7QUFFRCxXQUFTLGFBQWEsQ0FBQyxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRTs7QUFFMUMsUUFBSSxJQUFJLEdBQUcsRUFBRTtRQUFFLENBQUM7UUFBRSxDQUFDO1FBQUUsQ0FBQztRQUFFLEdBQUc7UUFDdkIsSUFBSTtRQUFFLENBQUM7UUFBRSxDQUFDO1FBQUUsQ0FBQyxDQUFDOztBQUVsQixTQUFLLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEtBQUssQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLEVBQUU7QUFDakMsT0FBQyxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNiLFdBQUssQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRTtBQUNyQixZQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEFBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7T0FDdEM7S0FDRjtBQUNELFFBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztBQUNmLE9BQUcsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQzs7O0FBQUMsQUFHcEIsUUFBSSxHQUFHLENBQUMsQ0FBQyxJQUFLLEtBQUssR0FBRyxDQUFDLENBQUMsR0FBSSxDQUFDLENBQUM7QUFDOUIsS0FBQyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDOUMsS0FBQyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFDN0MsS0FBQyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsR0FBRyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUM7OztBQUFDLEFBRzFDLFFBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLEtBQUssQ0FBQSxHQUFJLENBQUMsRUFBRTtBQUMxQixhQUFPLENBQUMsS0FBSyxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUMsR0FBRyxRQUFRLENBQUM7S0FDckMsTUFBTSxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUU7O0FBRWhCLGFBQU8sQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsR0FB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QUFNLEVBQUUsT0FBTyxFQUNyQztBQUNFLFNBQUssRUFBUyxLQUFLO0FBQ25CLFlBQVEsRUFBTSxLQUFLO0FBQ25CLGNBQVUsRUFBSSxLQUFLO0FBQ25CLGdCQUFZLEVBQUUsS0FBSztHQUNwQixDQUFDLENBQUM7Q0FDSixNQUVEOztBQUVFLFFBQU0sQ0FBQyxjQUFjLENBQUMsTUFBTSxFQUFFLFlBQVksRUFDMUM7QUFDRSxTQUFLLEVBQVMsS0FBSztBQUNuQixZQUFRLEVBQU0sS0FBSztBQUNuQixjQUFVLEVBQUksS0FBSztBQUNuQixnQkFBWSxFQUFFLEtBQUs7R0FDcEIsQ0FBQyxDQUFDO0FBQ0gsU0FBTyxDQUFDLElBQUksQ0FBQyxxR0FBcUcsQ0FBQyxDQUFDO0NBQ3JIIiwiZmlsZSI6ImN0eXBlLnBvbHlmaWxsZWQuanMiLCJzb3VyY2VSb290IjoiL3NvdXJjZS8iLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8qXG4gQ29weXJpZ2h0IChjKSAyMDEwLCBMaW5kZW4gUmVzZWFyY2gsIEluYy5cbiBDb3B5cmlnaHQgKGMpIDIwMTQsIEpvc2h1YSBCZWxsXG5cbiBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XG4gb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbFxuIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHNcbiB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsXG4gY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzXG4gZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcblxuIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluXG4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG5cbiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4gSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4gRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4gQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG4gT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTlxuIFRIRSBTT0ZUV0FSRS5cbiAkL0xpY2Vuc2VJbmZvJFxuICovXG5cbi8vIE9yaWdpbmFsIGNhbiBiZSBmb3VuZCBhdDpcbi8vICAgaHR0cHM6Ly9iaXRidWNrZXQub3JnL2xpbmRlbmxhYi9sbHNkXG4vLyBNb2RpZmljYXRpb25zIGJ5IEpvc2h1YSBCZWxsIGluZXhvcmFibGV0YXNoQGdtYWlsLmNvbVxuLy8gICBodHRwczovL2dpdGh1Yi5jb20vaW5leG9yYWJsZXRhc2gvcG9seWZpbGxcblxuLy8gRVMzL0VTNSBpbXBsZW1lbnRhdGlvbiBvZiB0aGUgS3Job25vcyBUeXBlZCBBcnJheSBTcGVjaWZpY2F0aW9uXG4vLyAgIFJlZjogaHR0cDovL3d3dy5raHJvbm9zLm9yZy9yZWdpc3RyeS90eXBlZGFycmF5L3NwZWNzL2xhdGVzdC9cbi8vICAgRGF0ZTogMjAxMS0wMi0wMVxuLy9cbi8vIFZhcmlhdGlvbnM6XG4vLyAgKiBBbGxvd3MgdHlwZWRfYXJyYXkuZ2V0L3NldCgpIGFzIGFsaWFzIGZvciBzdWJzY3JpcHRzICh0eXBlZF9hcnJheVtdKVxuLy8gICogR3JhZHVhbGx5IG1pZ3JhdGluZyBzdHJ1Y3R1cmUgZnJvbSBLaHJvbm9zIHNwZWMgdG8gRVM2IHNwZWNcbihmdW5jdGlvbihnbG9iYWwpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuICB2YXIgdW5kZWZpbmVkID0gKHZvaWQgMCk7IC8vIFBhcmFub2lhXG5cbiAgLy8gQmV5b25kIHRoaXMgdmFsdWUsIGluZGV4IGdldHRlcnMvc2V0dGVycyAoaS5lLiBhcnJheVswXSwgYXJyYXlbMV0pIGFyZSBzbyBzbG93IHRvXG4gIC8vIGNyZWF0ZSwgYW5kIGNvbnN1bWUgc28gbXVjaCBtZW1vcnksIHRoYXQgdGhlIGJyb3dzZXIgYXBwZWFycyBmcm96ZW4uXG4gIHZhciBNQVhfQVJSQVlfTEVOR1RIID0gMWU1O1xuXG4gIC8vIEFwcHJveGltYXRpb25zIG9mIGludGVybmFsIEVDTUFTY3JpcHQgY29udmVyc2lvbiBmdW5jdGlvbnNcbiAgZnVuY3Rpb24gVHlwZSh2KSB7XG4gICAgc3dpdGNoKHR5cGVvZiB2KSB7XG4gICAgY2FzZSAndW5kZWZpbmVkJzogcmV0dXJuICd1bmRlZmluZWQnO1xuICAgIGNhc2UgJ2Jvb2xlYW4nOiByZXR1cm4gJ2Jvb2xlYW4nO1xuICAgIGNhc2UgJ251bWJlcic6IHJldHVybiAnbnVtYmVyJztcbiAgICBjYXNlICdzdHJpbmcnOiByZXR1cm4gJ3N0cmluZyc7XG4gICAgZGVmYXVsdDogcmV0dXJuIHYgPT09IG51bGwgPyAnbnVsbCcgOiAnb2JqZWN0JztcbiAgICB9XG4gIH1cblxuICAvLyBDbGFzcyByZXR1cm5zIGludGVybmFsIFtbQ2xhc3NdXSBwcm9wZXJ0eSwgdXNlZCB0byBhdm9pZCBjcm9zcy1mcmFtZSBpbnN0YW5jZW9mIGlzc3VlczpcbiAgZnVuY3Rpb24gQ2xhc3ModikgeyByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHYpLnJlcGxhY2UoL15cXFtvYmplY3QgKnxcXF0kL2csICcnKTsgfVxuICBmdW5jdGlvbiBJc0NhbGxhYmxlKG8pIHsgcmV0dXJuIHR5cGVvZiBvID09PSAnZnVuY3Rpb24nOyB9XG4gIGZ1bmN0aW9uIFRvT2JqZWN0KHYpIHtcbiAgICBpZiAodiA9PT0gbnVsbCB8fCB2ID09PSB1bmRlZmluZWQpIHRocm93IFR5cGVFcnJvcigpO1xuICAgIHJldHVybiBPYmplY3Qodik7XG4gIH1cbiAgZnVuY3Rpb24gVG9JbnQzMih2KSB7IHJldHVybiB2ID4+IDA7IH1cbiAgZnVuY3Rpb24gVG9VaW50MzIodikgeyByZXR1cm4gdiA+Pj4gMDsgfVxuXG4gIC8vIFNuYXBzaG90IGludHJpbnNpY3NcbiAgdmFyIExOMiA9IE1hdGguTE4yLFxuICAgICAgYWJzID0gTWF0aC5hYnMsXG4gICAgICBmbG9vciA9IE1hdGguZmxvb3IsXG4gICAgICBsb2cgPSBNYXRoLmxvZyxcbiAgICAgIG1heCA9IE1hdGgubWF4LFxuICAgICAgbWluID0gTWF0aC5taW4sXG4gICAgICBwb3cgPSBNYXRoLnBvdyxcbiAgICAgIHJvdW5kID0gTWF0aC5yb3VuZDtcblxuICAvLyBlbXVsYXRlIEVTNSBnZXR0ZXIvc2V0dGVyIEFQSSB1c2luZyBsZWdhY3kgQVBJc1xuICAvLyBodHRwOi8vYmxvZ3MubXNkbi5jb20vYi9pZS9hcmNoaXZlLzIwMTAvMDkvMDcvdHJhbnNpdGlvbmluZy1leGlzdGluZy1jb2RlLXRvLXRoZS1lczUtZ2V0dGVyLXNldHRlci1hcGlzLmFzcHhcbiAgLy8gKHNlY29uZCBjbGF1c2UgdGVzdHMgZm9yIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSgpIGluIElFPDkgdGhhdCBvbmx5IHN1cHBvcnRzIGV4dGVuZGluZyBET00gcHJvdG90eXBlcywgYnV0XG4gIC8vIG5vdGUgdGhhdCBJRTw5IGRvZXMgbm90IHN1cHBvcnQgX19kZWZpbmVHZXR0ZXJfXyBvciBfX2RlZmluZVNldHRlcl9fIHNvIGl0IGp1c3QgcmVuZGVycyB0aGUgbWV0aG9kIGhhcm1sZXNzKVxuXG4gIChmdW5jdGlvbigpIHtcbiAgICB2YXIgb3JpZyA9IE9iamVjdC5kZWZpbmVQcm9wZXJ0eTtcbiAgICB2YXIgZG9tX29ubHkgPSAhKGZ1bmN0aW9uKCl7dHJ5e3JldHVybiBPYmplY3QuZGVmaW5lUHJvcGVydHkoe30sJ3gnLHt9KTt9Y2F0Y2goXyl7cmV0dXJuIGZhbHNlO319KCkpO1xuXG4gICAgaWYgKCFvcmlnIHx8IGRvbV9vbmx5KSB7XG4gICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkgPSBmdW5jdGlvbiAobywgcHJvcCwgZGVzYykge1xuICAgICAgICAvLyBJbiBJRTggdHJ5IGJ1aWx0LWluIGltcGxlbWVudGF0aW9uIGZvciBkZWZpbmluZyBwcm9wZXJ0aWVzIG9uIERPTSBwcm90b3R5cGVzLlxuICAgICAgICBpZiAob3JpZylcbiAgICAgICAgICB0cnkgeyByZXR1cm4gb3JpZyhvLCBwcm9wLCBkZXNjKTsgfSBjYXRjaCAoXykge31cbiAgICAgICAgaWYgKG8gIT09IE9iamVjdChvKSlcbiAgICAgICAgICB0aHJvdyBUeXBlRXJyb3IoJ09iamVjdC5kZWZpbmVQcm9wZXJ0eSBjYWxsZWQgb24gbm9uLW9iamVjdCcpO1xuICAgICAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS5fX2RlZmluZUdldHRlcl9fICYmICgnZ2V0JyBpbiBkZXNjKSlcbiAgICAgICAgICBPYmplY3QucHJvdG90eXBlLl9fZGVmaW5lR2V0dGVyX18uY2FsbChvLCBwcm9wLCBkZXNjLmdldCk7XG4gICAgICAgIGlmIChPYmplY3QucHJvdG90eXBlLl9fZGVmaW5lU2V0dGVyX18gJiYgKCdzZXQnIGluIGRlc2MpKVxuICAgICAgICAgIE9iamVjdC5wcm90b3R5cGUuX19kZWZpbmVTZXR0ZXJfXy5jYWxsKG8sIHByb3AsIGRlc2Muc2V0KTtcbiAgICAgICAgaWYgKCd2YWx1ZScgaW4gZGVzYylcbiAgICAgICAgICBvW3Byb3BdID0gZGVzYy52YWx1ZTtcbiAgICAgICAgcmV0dXJuIG87XG4gICAgICB9O1xuICAgIH1cbiAgfSgpKTtcblxuICAvLyBFUzU6IE1ha2Ugb2JqW2luZGV4XSBhbiBhbGlhcyBmb3Igb2JqLl9nZXR0ZXIoaW5kZXgpL29iai5fc2V0dGVyKGluZGV4LCB2YWx1ZSlcbiAgLy8gZm9yIGluZGV4IGluIDAgLi4uIG9iai5sZW5ndGhcbiAgZnVuY3Rpb24gbWFrZUFycmF5QWNjZXNzb3JzKG9iaikge1xuICAgIGlmIChvYmoubGVuZ3RoID4gTUFYX0FSUkFZX0xFTkdUSCkgdGhyb3cgUmFuZ2VFcnJvcignQXJyYXkgdG9vIGxhcmdlIGZvciBwb2x5ZmlsbCcpO1xuXG4gICAgZnVuY3Rpb24gbWFrZUFycmF5QWNjZXNzb3IoaW5kZXgpIHtcbiAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvYmosIGluZGV4LCB7XG4gICAgICAgICdnZXQnOiBmdW5jdGlvbigpIHsgcmV0dXJuIG9iai5fZ2V0dGVyKGluZGV4KTsgfSxcbiAgICAgICAgJ3NldCc6IGZ1bmN0aW9uKHYpIHsgb2JqLl9zZXR0ZXIoaW5kZXgsIHYpOyB9LFxuICAgICAgICBlbnVtZXJhYmxlOiB0cnVlLFxuICAgICAgICBjb25maWd1cmFibGU6IGZhbHNlXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICB2YXIgaTtcbiAgICBmb3IgKGkgPSAwOyBpIDwgb2JqLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICBtYWtlQXJyYXlBY2Nlc3NvcihpKTtcbiAgICB9XG4gIH1cblxuICAvLyBJbnRlcm5hbCBjb252ZXJzaW9uIGZ1bmN0aW9uczpcbiAgLy8gICAgcGFjazxUeXBlPigpICAgLSB0YWtlIGEgbnVtYmVyIChpbnRlcnByZXRlZCBhcyBUeXBlKSwgb3V0cHV0IGEgYnl0ZSBhcnJheVxuICAvLyAgICB1bnBhY2s8VHlwZT4oKSAtIHRha2UgYSBieXRlIGFycmF5LCBvdXRwdXQgYSBUeXBlLWxpa2UgbnVtYmVyXG5cbiAgZnVuY3Rpb24gYXNfc2lnbmVkKHZhbHVlLCBiaXRzKSB7IHZhciBzID0gMzIgLSBiaXRzOyByZXR1cm4gKHZhbHVlIDw8IHMpID4+IHM7IH1cbiAgZnVuY3Rpb24gYXNfdW5zaWduZWQodmFsdWUsIGJpdHMpIHsgdmFyIHMgPSAzMiAtIGJpdHM7IHJldHVybiAodmFsdWUgPDwgcykgPj4+IHM7IH1cblxuICBmdW5jdGlvbiBwYWNrSTgobikgeyByZXR1cm4gW24gJiAweGZmXTsgfVxuICBmdW5jdGlvbiB1bnBhY2tJOChieXRlcykgeyByZXR1cm4gYXNfc2lnbmVkKGJ5dGVzWzBdLCA4KTsgfVxuXG4gIGZ1bmN0aW9uIHBhY2tVOChuKSB7IHJldHVybiBbbiAmIDB4ZmZdOyB9XG4gIGZ1bmN0aW9uIHVucGFja1U4KGJ5dGVzKSB7IHJldHVybiBhc191bnNpZ25lZChieXRlc1swXSwgOCk7IH1cblxuICBmdW5jdGlvbiBwYWNrVThDbGFtcGVkKG4pIHsgbiA9IHJvdW5kKE51bWJlcihuKSk7IHJldHVybiBbbiA8IDAgPyAwIDogbiA+IDB4ZmYgPyAweGZmIDogbiAmIDB4ZmZdOyB9XG5cbiAgZnVuY3Rpb24gcGFja0kxNihuKSB7IHJldHVybiBbbiAmIDB4ZmYsIChuID4+IDgpICYgMHhmZl07IH1cbiAgZnVuY3Rpb24gdW5wYWNrSTE2KGJ5dGVzKSB7IHJldHVybiBhc19zaWduZWQoYnl0ZXNbMV0gPDwgOCB8IGJ5dGVzWzBdLCAxNik7IH1cblxuICBmdW5jdGlvbiBwYWNrVTE2KG4pIHsgcmV0dXJuIFtuICYgMHhmZiwgKG4gPj4gOCkgJiAweGZmXTsgfVxuICBmdW5jdGlvbiB1bnBhY2tVMTYoYnl0ZXMpIHsgcmV0dXJuIGFzX3Vuc2lnbmVkKGJ5dGVzWzFdIDw8IDggfCBieXRlc1swXSwgMTYpOyB9XG5cbiAgZnVuY3Rpb24gcGFja0kzMihuKSB7IHJldHVybiBbbiAmIDB4ZmYsIChuID4+IDgpICYgMHhmZiwgKG4gPj4gMTYpICYgMHhmZiwgKG4gPj4gMjQpICYgMHhmZl07IH1cbiAgZnVuY3Rpb24gdW5wYWNrSTMyKGJ5dGVzKSB7IHJldHVybiBhc19zaWduZWQoYnl0ZXNbM10gPDwgMjQgfCBieXRlc1syXSA8PCAxNiB8IGJ5dGVzWzFdIDw8IDggfCBieXRlc1swXSwgMzIpOyB9XG5cbiAgZnVuY3Rpb24gcGFja1UzMihuKSB7IHJldHVybiBbbiAmIDB4ZmYsIChuID4+IDgpICYgMHhmZiwgKG4gPj4gMTYpICYgMHhmZiwgKG4gPj4gMjQpICYgMHhmZl07IH1cbiAgZnVuY3Rpb24gdW5wYWNrVTMyKGJ5dGVzKSB7IHJldHVybiBhc191bnNpZ25lZChieXRlc1szXSA8PCAyNCB8IGJ5dGVzWzJdIDw8IDE2IHwgYnl0ZXNbMV0gPDwgOCB8IGJ5dGVzWzBdLCAzMik7IH1cblxuICBmdW5jdGlvbiBwYWNrSUVFRTc1NCh2LCBlYml0cywgZmJpdHMpIHtcblxuICAgIHZhciBiaWFzID0gKDEgPDwgKGViaXRzIC0gMSkpIC0gMSxcbiAgICAgICAgcywgZSwgZiwgbG4sXG4gICAgICAgIGksIGJpdHMsIHN0ciwgYnl0ZXM7XG5cbiAgICBmdW5jdGlvbiByb3VuZFRvRXZlbihuKSB7XG4gICAgICB2YXIgdyA9IGZsb29yKG4pLCBmID0gbiAtIHc7XG4gICAgICBpZiAoZiA8IDAuNSlcbiAgICAgICAgcmV0dXJuIHc7XG4gICAgICBpZiAoZiA+IDAuNSlcbiAgICAgICAgcmV0dXJuIHcgKyAxO1xuICAgICAgcmV0dXJuIHcgJSAyID8gdyArIDEgOiB3O1xuICAgIH1cblxuICAgIC8vIENvbXB1dGUgc2lnbiwgZXhwb25lbnQsIGZyYWN0aW9uXG4gICAgaWYgKHYgIT09IHYpIHtcbiAgICAgIC8vIE5hTlxuICAgICAgLy8gaHR0cDovL2Rldi53My5vcmcvMjAwNi93ZWJhcGkvV2ViSURMLyNlcy10eXBlLW1hcHBpbmdcbiAgICAgIGUgPSAoMSA8PCBlYml0cykgLSAxOyBmID0gcG93KDIsIGZiaXRzIC0gMSk7IHMgPSAwO1xuICAgIH0gZWxzZSBpZiAodiA9PT0gSW5maW5pdHkgfHwgdiA9PT0gLUluZmluaXR5KSB7XG4gICAgICBlID0gKDEgPDwgZWJpdHMpIC0gMTsgZiA9IDA7IHMgPSAodiA8IDApID8gMSA6IDA7XG4gICAgfSBlbHNlIGlmICh2ID09PSAwKSB7XG4gICAgICBlID0gMDsgZiA9IDA7IHMgPSAoMSAvIHYgPT09IC1JbmZpbml0eSkgPyAxIDogMDtcbiAgICB9IGVsc2Uge1xuICAgICAgcyA9IHYgPCAwO1xuICAgICAgdiA9IGFicyh2KTtcblxuICAgICAgaWYgKHYgPj0gcG93KDIsIDEgLSBiaWFzKSkge1xuICAgICAgICBlID0gbWluKGZsb29yKGxvZyh2KSAvIExOMiksIDEwMjMpO1xuICAgICAgICB2YXIgc2lnbmlmaWNhbmQgPSB2IC8gcG93KDIsIGUpO1xuICAgICAgICBpZiAoc2lnbmlmaWNhbmQgPCAxKSB7XG4gICAgICAgICAgZSAtPSAxO1xuICAgICAgICAgIHNpZ25pZmljYW5kICo9IDI7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHNpZ25pZmljYW5kID49IDIpIHtcbiAgICAgICAgICBlICs9IDE7XG4gICAgICAgICAgc2lnbmlmaWNhbmQgLz0gMjtcbiAgICAgICAgfVxuICAgICAgICBmID0gcm91bmRUb0V2ZW4oc2lnbmlmaWNhbmQgKiBwb3coMiwgZmJpdHMpKTtcbiAgICAgICAgaWYgKGYgLyBwb3coMiwgZmJpdHMpID49IDIpIHtcbiAgICAgICAgICBlID0gZSArIDE7XG4gICAgICAgICAgZiA9IHBvdygyLCBmYml0cyk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGUgPiBiaWFzKSB7XG4gICAgICAgICAgLy8gT3ZlcmZsb3dcbiAgICAgICAgICBlID0gKDEgPDwgZWJpdHMpIC0gMTtcbiAgICAgICAgICBmID0gMDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBOb3JtYWxpemVkXG4gICAgICAgICAgZSA9IGUgKyBiaWFzO1xuICAgICAgICAgIGYgPSBmIC0gcG93KDIsIGZiaXRzKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gRGVub3JtYWxpemVkXG4gICAgICAgIGUgPSAwO1xuICAgICAgICBmID0gcm91bmRUb0V2ZW4odiAvIHBvdygyLCAxIC0gYmlhcyAtIGZiaXRzKSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gUGFjayBzaWduLCBleHBvbmVudCwgZnJhY3Rpb25cbiAgICBiaXRzID0gW107XG4gICAgZm9yIChpID0gZmJpdHM7IGk7IGkgLT0gMSkgeyBiaXRzLnB1c2goZiAlIDIgPyAxIDogMCk7IGYgPSBmbG9vcihmIC8gMik7IH1cbiAgICBmb3IgKGkgPSBlYml0czsgaTsgaSAtPSAxKSB7IGJpdHMucHVzaChlICUgMiA/IDEgOiAwKTsgZSA9IGZsb29yKGUgLyAyKTsgfVxuICAgIGJpdHMucHVzaChzID8gMSA6IDApO1xuICAgIGJpdHMucmV2ZXJzZSgpO1xuICAgIHN0ciA9IGJpdHMuam9pbignJyk7XG5cbiAgICAvLyBCaXRzIHRvIGJ5dGVzXG4gICAgYnl0ZXMgPSBbXTtcbiAgICB3aGlsZSAoc3RyLmxlbmd0aCkge1xuICAgICAgYnl0ZXMudW5zaGlmdChwYXJzZUludChzdHIuc3Vic3RyaW5nKDAsIDgpLCAyKSk7XG4gICAgICBzdHIgPSBzdHIuc3Vic3RyaW5nKDgpO1xuICAgIH1cbiAgICByZXR1cm4gYnl0ZXM7XG4gIH1cblxuICBmdW5jdGlvbiB1bnBhY2tJRUVFNzU0KGJ5dGVzLCBlYml0cywgZmJpdHMpIHtcbiAgICAvLyBCeXRlcyB0byBiaXRzXG4gICAgdmFyIGJpdHMgPSBbXSwgaSwgaiwgYiwgc3RyLFxuICAgICAgICBiaWFzLCBzLCBlLCBmO1xuXG4gICAgZm9yIChpID0gMDsgaSA8IGJ5dGVzLmxlbmd0aDsgKytpKSB7XG4gICAgICBiID0gYnl0ZXNbaV07XG4gICAgICBmb3IgKGogPSA4OyBqOyBqIC09IDEpIHtcbiAgICAgICAgYml0cy5wdXNoKGIgJSAyID8gMSA6IDApOyBiID0gYiA+PiAxO1xuICAgICAgfVxuICAgIH1cbiAgICBiaXRzLnJldmVyc2UoKTtcbiAgICBzdHIgPSBiaXRzLmpvaW4oJycpO1xuXG4gICAgLy8gVW5wYWNrIHNpZ24sIGV4cG9uZW50LCBmcmFjdGlvblxuICAgIGJpYXMgPSAoMSA8PCAoZWJpdHMgLSAxKSkgLSAxO1xuICAgIHMgPSBwYXJzZUludChzdHIuc3Vic3RyaW5nKDAsIDEpLCAyKSA/IC0xIDogMTtcbiAgICBlID0gcGFyc2VJbnQoc3RyLnN1YnN0cmluZygxLCAxICsgZWJpdHMpLCAyKTtcbiAgICBmID0gcGFyc2VJbnQoc3RyLnN1YnN0cmluZygxICsgZWJpdHMpLCAyKTtcblxuICAgIC8vIFByb2R1Y2UgbnVtYmVyXG4gICAgaWYgKGUgPT09ICgxIDw8IGViaXRzKSAtIDEpIHtcbiAgICAgIHJldHVybiBmICE9PSAwID8gTmFOIDogcyAqIEluZmluaXR5O1xuICAgIH0gZWxzZSBpZiAoZSA+IDApIHtcbiAgICAgIC8vIE5vcm1hbGl6ZWRcbiAgICAgIHJldHVybiBzICogcG93KDIsIGUgLSBiaWFzKSAqICgxICsgZiAvIHBvdygyLCBmYml0cykpO1xuICAgIH0gZWxzZSBpZiAoZiAhPT0gMCkge1xuICAgICAgLy8gRGVub3JtYWxpemVkXG4gICAgICByZXR1cm4gcyAqIHBvdygyLCAtKGJpYXMgLSAxKSkgKiAoZiAvIHBvdygyLCBmYml0cykpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gcyA8IDAgPyAtMCA6IDA7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gdW5wYWNrRjY0KGIpIHsgcmV0dXJuIHVucGFja0lFRUU3NTQoYiwgMTEsIDUyKTsgfVxuICBmdW5jdGlvbiBwYWNrRjY0KHYpIHsgcmV0dXJuIHBhY2tJRUVFNzU0KHYsIDExLCA1Mik7IH1cbiAgZnVuY3Rpb24gdW5wYWNrRjMyKGIpIHsgcmV0dXJuIHVucGFja0lFRUU3NTQoYiwgOCwgMjMpOyB9XG4gIGZ1bmN0aW9uIHBhY2tGMzIodikgeyByZXR1cm4gcGFja0lFRUU3NTQodiwgOCwgMjMpOyB9XG5cbiAgLy9cbiAgLy8gMyBUaGUgQXJyYXlCdWZmZXIgVHlwZVxuICAvL1xuXG4gIChmdW5jdGlvbigpIHtcblxuICAgIGZ1bmN0aW9uIEFycmF5QnVmZmVyKGxlbmd0aCkge1xuICAgICAgbGVuZ3RoID0gVG9JbnQzMihsZW5ndGgpO1xuICAgICAgaWYgKGxlbmd0aCA8IDApIHRocm93IFJhbmdlRXJyb3IoJ0FycmF5QnVmZmVyIHNpemUgaXMgbm90IGEgc21hbGwgZW5vdWdoIHBvc2l0aXZlIGludGVnZXIuJyk7XG4gICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ2J5dGVMZW5ndGgnLCB7dmFsdWU6IGxlbmd0aH0pO1xuICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdfYnl0ZXMnLCB7dmFsdWU6IEFycmF5KGxlbmd0aCl9KTtcblxuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkgKz0gMSlcbiAgICAgICAgdGhpcy5fYnl0ZXNbaV0gPSAwO1xuICAgIH1cblxuICAgIGdsb2JhbC5BcnJheUJ1ZmZlciA9IGdsb2JhbC5BcnJheUJ1ZmZlciB8fCBBcnJheUJ1ZmZlcjtcblxuICAgIC8vXG4gICAgLy8gNSBUaGUgVHlwZWQgQXJyYXkgVmlldyBUeXBlc1xuICAgIC8vXG5cbiAgICBmdW5jdGlvbiAkVHlwZWRBcnJheSQoKSB7XG5cbiAgICAgIC8vICVUeXBlZEFycmF5JSAoIGxlbmd0aCApXG4gICAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGggfHwgdHlwZW9mIGFyZ3VtZW50c1swXSAhPT0gJ29iamVjdCcpIHtcbiAgICAgICAgcmV0dXJuIChmdW5jdGlvbihsZW5ndGgpIHtcbiAgICAgICAgICBsZW5ndGggPSBUb0ludDMyKGxlbmd0aCk7XG4gICAgICAgICAgaWYgKGxlbmd0aCA8IDApIHRocm93IFJhbmdlRXJyb3IoJ2xlbmd0aCBpcyBub3QgYSBzbWFsbCBlbm91Z2ggcG9zaXRpdmUgaW50ZWdlci4nKTtcbiAgICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ2xlbmd0aCcsIHt2YWx1ZTogbGVuZ3RofSk7XG4gICAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdieXRlTGVuZ3RoJywge3ZhbHVlOiBsZW5ndGggKiB0aGlzLkJZVEVTX1BFUl9FTEVNRU5UfSk7XG4gICAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdidWZmZXInLCB7dmFsdWU6IG5ldyBBcnJheUJ1ZmZlcih0aGlzLmJ5dGVMZW5ndGgpfSk7XG4gICAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdieXRlT2Zmc2V0Jywge3ZhbHVlOiAwfSk7XG5cbiAgICAgICAgIH0pLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICB9XG5cbiAgICAgIC8vICVUeXBlZEFycmF5JSAoIHR5cGVkQXJyYXkgKVxuICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPj0gMSAmJlxuICAgICAgICAgIFR5cGUoYXJndW1lbnRzWzBdKSA9PT0gJ29iamVjdCcgJiZcbiAgICAgICAgICBhcmd1bWVudHNbMF0gaW5zdGFuY2VvZiAkVHlwZWRBcnJheSQpIHtcbiAgICAgICAgcmV0dXJuIChmdW5jdGlvbih0eXBlZEFycmF5KXtcbiAgICAgICAgICBpZiAodGhpcy5jb25zdHJ1Y3RvciAhPT0gdHlwZWRBcnJheS5jb25zdHJ1Y3RvcikgdGhyb3cgVHlwZUVycm9yKCk7XG5cbiAgICAgICAgICB2YXIgYnl0ZUxlbmd0aCA9IHR5cGVkQXJyYXkubGVuZ3RoICogdGhpcy5CWVRFU19QRVJfRUxFTUVOVDtcbiAgICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ2J1ZmZlcicsIHt2YWx1ZTogbmV3IEFycmF5QnVmZmVyKGJ5dGVMZW5ndGgpfSk7XG4gICAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdieXRlTGVuZ3RoJywge3ZhbHVlOiBieXRlTGVuZ3RofSk7XG4gICAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdieXRlT2Zmc2V0Jywge3ZhbHVlOiAwfSk7XG4gICAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdsZW5ndGgnLCB7dmFsdWU6IHR5cGVkQXJyYXkubGVuZ3RofSk7XG5cbiAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMubGVuZ3RoOyBpICs9IDEpXG4gICAgICAgICAgICB0aGlzLl9zZXR0ZXIoaSwgdHlwZWRBcnJheS5fZ2V0dGVyKGkpKTtcblxuICAgICAgICB9KS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgfVxuXG4gICAgICAvLyAlVHlwZWRBcnJheSUgKCBhcnJheSApXG4gICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+PSAxICYmXG4gICAgICAgICAgVHlwZShhcmd1bWVudHNbMF0pID09PSAnb2JqZWN0JyAmJlxuICAgICAgICAgICEoYXJndW1lbnRzWzBdIGluc3RhbmNlb2YgJFR5cGVkQXJyYXkkKSAmJlxuICAgICAgICAgICEoYXJndW1lbnRzWzBdIGluc3RhbmNlb2YgQXJyYXlCdWZmZXIgfHwgQ2xhc3MoYXJndW1lbnRzWzBdKSA9PT0gJ0FycmF5QnVmZmVyJykpIHtcbiAgICAgICAgcmV0dXJuIChmdW5jdGlvbihhcnJheSkge1xuXG4gICAgICAgICAgdmFyIGJ5dGVMZW5ndGggPSBhcnJheS5sZW5ndGggKiB0aGlzLkJZVEVTX1BFUl9FTEVNRU5UO1xuICAgICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnYnVmZmVyJywge3ZhbHVlOiBuZXcgQXJyYXlCdWZmZXIoYnl0ZUxlbmd0aCl9KTtcbiAgICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ2J5dGVMZW5ndGgnLCB7dmFsdWU6IGJ5dGVMZW5ndGh9KTtcbiAgICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ2J5dGVPZmZzZXQnLCB7dmFsdWU6IDB9KTtcbiAgICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ2xlbmd0aCcsIHt2YWx1ZTogYXJyYXkubGVuZ3RofSk7XG5cbiAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgICAgICAgIHZhciBzID0gYXJyYXlbaV07XG4gICAgICAgICAgICB0aGlzLl9zZXR0ZXIoaSwgTnVtYmVyKHMpKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICB9XG5cbiAgICAgIC8vICVUeXBlZEFycmF5JSAoIGJ1ZmZlciwgYnl0ZU9mZnNldD0wLCBsZW5ndGg9dW5kZWZpbmVkIClcbiAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID49IDEgJiZcbiAgICAgICAgICBUeXBlKGFyZ3VtZW50c1swXSkgPT09ICdvYmplY3QnICYmXG4gICAgICAgICAgKGFyZ3VtZW50c1swXSBpbnN0YW5jZW9mIEFycmF5QnVmZmVyIHx8IENsYXNzKGFyZ3VtZW50c1swXSkgPT09ICdBcnJheUJ1ZmZlcicpKSB7XG4gICAgICAgIHJldHVybiAoZnVuY3Rpb24oYnVmZmVyLCBieXRlT2Zmc2V0LCBsZW5ndGgpIHtcblxuICAgICAgICAgIGJ5dGVPZmZzZXQgPSBUb1VpbnQzMihieXRlT2Zmc2V0KTtcbiAgICAgICAgICBpZiAoYnl0ZU9mZnNldCA+IGJ1ZmZlci5ieXRlTGVuZ3RoKVxuICAgICAgICAgICAgdGhyb3cgUmFuZ2VFcnJvcignYnl0ZU9mZnNldCBvdXQgb2YgcmFuZ2UnKTtcblxuICAgICAgICAgIC8vIFRoZSBnaXZlbiBieXRlT2Zmc2V0IG11c3QgYmUgYSBtdWx0aXBsZSBvZiB0aGUgZWxlbWVudFxuICAgICAgICAgIC8vIHNpemUgb2YgdGhlIHNwZWNpZmljIHR5cGUsIG90aGVyd2lzZSBhbiBleGNlcHRpb24gaXMgcmFpc2VkLlxuICAgICAgICAgIGlmIChieXRlT2Zmc2V0ICUgdGhpcy5CWVRFU19QRVJfRUxFTUVOVClcbiAgICAgICAgICAgIHRocm93IFJhbmdlRXJyb3IoJ2J1ZmZlciBsZW5ndGggbWludXMgdGhlIGJ5dGVPZmZzZXQgaXMgbm90IGEgbXVsdGlwbGUgb2YgdGhlIGVsZW1lbnQgc2l6ZS4nKTtcblxuICAgICAgICAgIGlmIChsZW5ndGggPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgdmFyIGJ5dGVMZW5ndGggPSBidWZmZXIuYnl0ZUxlbmd0aCAtIGJ5dGVPZmZzZXQ7XG4gICAgICAgICAgICBpZiAoYnl0ZUxlbmd0aCAlIHRoaXMuQllURVNfUEVSX0VMRU1FTlQpXG4gICAgICAgICAgICAgIHRocm93IFJhbmdlRXJyb3IoJ2xlbmd0aCBvZiBidWZmZXIgbWludXMgYnl0ZU9mZnNldCBub3QgYSBtdWx0aXBsZSBvZiB0aGUgZWxlbWVudCBzaXplJyk7XG4gICAgICAgICAgICBsZW5ndGggPSBieXRlTGVuZ3RoIC8gdGhpcy5CWVRFU19QRVJfRUxFTUVOVDtcblxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBsZW5ndGggPSBUb1VpbnQzMihsZW5ndGgpO1xuICAgICAgICAgICAgYnl0ZUxlbmd0aCA9IGxlbmd0aCAqIHRoaXMuQllURVNfUEVSX0VMRU1FTlQ7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKChieXRlT2Zmc2V0ICsgYnl0ZUxlbmd0aCkgPiBidWZmZXIuYnl0ZUxlbmd0aClcbiAgICAgICAgICAgIHRocm93IFJhbmdlRXJyb3IoJ2J5dGVPZmZzZXQgYW5kIGxlbmd0aCByZWZlcmVuY2UgYW4gYXJlYSBiZXlvbmQgdGhlIGVuZCBvZiB0aGUgYnVmZmVyJyk7XG5cbiAgICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ2J1ZmZlcicsIHt2YWx1ZTogYnVmZmVyfSk7XG4gICAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdieXRlTGVuZ3RoJywge3ZhbHVlOiBieXRlTGVuZ3RofSk7XG4gICAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdieXRlT2Zmc2V0Jywge3ZhbHVlOiBieXRlT2Zmc2V0fSk7XG4gICAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdsZW5ndGgnLCB7dmFsdWU6IGxlbmd0aH0pO1xuXG4gICAgICAgIH0pLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICB9XG5cbiAgICAgIC8vICVUeXBlZEFycmF5JSAoIGFsbCBvdGhlciBhcmd1bWVudCBjb21iaW5hdGlvbnMgKVxuICAgICAgdGhyb3cgVHlwZUVycm9yKCk7XG4gICAgfVxuXG4gICAgLy8gUHJvcGVydGllcyBvZiB0aGUgJVR5cGVkQXJyYXkgSW5zdHJpbnNpYyBPYmplY3RcblxuICAgIC8vICVUeXBlZEFycmF5JS5mcm9tICggc291cmNlICwgbWFwZm49dW5kZWZpbmVkLCB0aGlzQXJnPXVuZGVmaW5lZCApXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KCRUeXBlZEFycmF5JCwgJ2Zyb20nLCB7dmFsdWU6IGZ1bmN0aW9uKGl0ZXJhYmxlKSB7XG4gICAgICByZXR1cm4gbmV3IHRoaXMoaXRlcmFibGUpO1xuICAgIH19KTtcblxuICAgIC8vICVUeXBlZEFycmF5JS5vZiAoIC4uLml0ZW1zIClcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoJFR5cGVkQXJyYXkkLCAnb2YnLCB7dmFsdWU6IGZ1bmN0aW9uKC8qLi4uaXRlbXMqLykge1xuICAgICAgcmV0dXJuIG5ldyB0aGlzKGFyZ3VtZW50cyk7XG4gICAgfX0pO1xuXG4gICAgLy8gJVR5cGVkQXJyYXklLnByb3RvdHlwZVxuICAgIHZhciAkVHlwZWRBcnJheVByb3RvdHlwZSQgPSB7fTtcbiAgICAkVHlwZWRBcnJheSQucHJvdG90eXBlID0gJFR5cGVkQXJyYXlQcm90b3R5cGUkO1xuXG4gICAgLy8gV2ViSURMOiBnZXR0ZXIgdHlwZSAodW5zaWduZWQgbG9uZyBpbmRleCk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KCRUeXBlZEFycmF5JC5wcm90b3R5cGUsICdfZ2V0dGVyJywge3ZhbHVlOiBmdW5jdGlvbihpbmRleCkge1xuICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPCAxKSB0aHJvdyBTeW50YXhFcnJvcignTm90IGVub3VnaCBhcmd1bWVudHMnKTtcblxuICAgICAgaW5kZXggPSBUb1VpbnQzMihpbmRleCk7XG4gICAgICBpZiAoaW5kZXggPj0gdGhpcy5sZW5ndGgpXG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG5cbiAgICAgIHZhciBieXRlcyA9IFtdLCBpLCBvO1xuICAgICAgZm9yIChpID0gMCwgbyA9IHRoaXMuYnl0ZU9mZnNldCArIGluZGV4ICogdGhpcy5CWVRFU19QRVJfRUxFTUVOVDtcbiAgICAgICAgICAgaSA8IHRoaXMuQllURVNfUEVSX0VMRU1FTlQ7XG4gICAgICAgICAgIGkgKz0gMSwgbyArPSAxKSB7XG4gICAgICAgIGJ5dGVzLnB1c2godGhpcy5idWZmZXIuX2J5dGVzW29dKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0aGlzLl91bnBhY2soYnl0ZXMpO1xuICAgIH19KTtcblxuICAgIC8vIE5PTlNUQU5EQVJEOiBjb252ZW5pZW5jZSBhbGlhcyBmb3IgZ2V0dGVyOiB0eXBlIGdldCh1bnNpZ25lZCBsb25nIGluZGV4KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoJFR5cGVkQXJyYXkkLnByb3RvdHlwZSwgJ2dldCcsIHt2YWx1ZTogJFR5cGVkQXJyYXkkLnByb3RvdHlwZS5fZ2V0dGVyfSk7XG5cbiAgICAvLyBXZWJJREw6IHNldHRlciB2b2lkICh1bnNpZ25lZCBsb25nIGluZGV4LCB0eXBlIHZhbHVlKTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoJFR5cGVkQXJyYXkkLnByb3RvdHlwZSwgJ19zZXR0ZXInLCB7dmFsdWU6IGZ1bmN0aW9uKGluZGV4LCB2YWx1ZSkge1xuICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPCAyKSB0aHJvdyBTeW50YXhFcnJvcignTm90IGVub3VnaCBhcmd1bWVudHMnKTtcblxuICAgICAgaW5kZXggPSBUb1VpbnQzMihpbmRleCk7XG4gICAgICBpZiAoaW5kZXggPj0gdGhpcy5sZW5ndGgpXG4gICAgICAgIHJldHVybjtcblxuICAgICAgdmFyIGJ5dGVzID0gdGhpcy5fcGFjayh2YWx1ZSksIGksIG87XG4gICAgICBmb3IgKGkgPSAwLCBvID0gdGhpcy5ieXRlT2Zmc2V0ICsgaW5kZXggKiB0aGlzLkJZVEVTX1BFUl9FTEVNRU5UO1xuICAgICAgICAgICBpIDwgdGhpcy5CWVRFU19QRVJfRUxFTUVOVDtcbiAgICAgICAgICAgaSArPSAxLCBvICs9IDEpIHtcbiAgICAgICAgdGhpcy5idWZmZXIuX2J5dGVzW29dID0gYnl0ZXNbaV07XG4gICAgICB9XG4gICAgfX0pO1xuXG4gICAgLy8gZ2V0ICVUeXBlZEFycmF5JS5wcm90b3R5cGUuYnVmZmVyXG4gICAgLy8gZ2V0ICVUeXBlZEFycmF5JS5wcm90b3R5cGUuYnl0ZUxlbmd0aFxuICAgIC8vIGdldCAlVHlwZWRBcnJheSUucHJvdG90eXBlLmJ5dGVPZmZzZXRcbiAgICAvLyAtLSBhcHBsaWVkIGRpcmVjdGx5IHRvIHRoZSBvYmplY3QgaW4gdGhlIGNvbnN0cnVjdG9yXG5cbiAgICAvLyAlVHlwZWRBcnJheSUucHJvdG90eXBlLmNvbnN0cnVjdG9yXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KCRUeXBlZEFycmF5JC5wcm90b3R5cGUsICdjb25zdHJ1Y3RvcicsIHt2YWx1ZTogJFR5cGVkQXJyYXkkfSk7XG5cbiAgICAvLyAlVHlwZWRBcnJheSUucHJvdG90eXBlLmNvcHlXaXRoaW4gKHRhcmdldCwgc3RhcnQsIGVuZCA9IHRoaXMubGVuZ3RoIClcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoJFR5cGVkQXJyYXkkLnByb3RvdHlwZSwgJ2NvcHlXaXRoaW4nLCB7dmFsdWU6IGZ1bmN0aW9uKHRhcmdldCwgc3RhcnQpIHtcbiAgICAgIHZhciBlbmQgPSBhcmd1bWVudHNbMl07XG5cbiAgICAgIHZhciBvID0gVG9PYmplY3QodGhpcyk7XG4gICAgICB2YXIgbGVuVmFsID0gby5sZW5ndGg7XG4gICAgICB2YXIgbGVuID0gVG9VaW50MzIobGVuVmFsKTtcbiAgICAgIGxlbiA9IG1heChsZW4sIDApO1xuICAgICAgdmFyIHJlbGF0aXZlVGFyZ2V0ID0gVG9JbnQzMih0YXJnZXQpO1xuICAgICAgdmFyIHRvO1xuICAgICAgaWYgKHJlbGF0aXZlVGFyZ2V0IDwgMClcbiAgICAgICAgdG8gPSBtYXgobGVuICsgcmVsYXRpdmVUYXJnZXQsIDApO1xuICAgICAgZWxzZVxuICAgICAgICB0byA9IG1pbihyZWxhdGl2ZVRhcmdldCwgbGVuKTtcbiAgICAgIHZhciByZWxhdGl2ZVN0YXJ0ID0gVG9JbnQzMihzdGFydCk7XG4gICAgICB2YXIgZnJvbTtcbiAgICAgIGlmIChyZWxhdGl2ZVN0YXJ0IDwgMClcbiAgICAgICAgZnJvbSA9IG1heChsZW4gKyByZWxhdGl2ZVN0YXJ0LCAwKTtcbiAgICAgIGVsc2VcbiAgICAgICAgZnJvbSA9IG1pbihyZWxhdGl2ZVN0YXJ0LCBsZW4pO1xuICAgICAgdmFyIHJlbGF0aXZlRW5kO1xuICAgICAgaWYgKGVuZCA9PT0gdW5kZWZpbmVkKVxuICAgICAgICByZWxhdGl2ZUVuZCA9IGxlbjtcbiAgICAgIGVsc2VcbiAgICAgICAgcmVsYXRpdmVFbmQgPSBUb0ludDMyKGVuZCk7XG4gICAgICB2YXIgZmluYWw7XG4gICAgICBpZiAocmVsYXRpdmVFbmQgPCAwKVxuICAgICAgICBmaW5hbCA9IG1heChsZW4gKyByZWxhdGl2ZUVuZCwgMCk7XG4gICAgICBlbHNlXG4gICAgICAgIGZpbmFsID0gbWluKHJlbGF0aXZlRW5kLCBsZW4pO1xuICAgICAgdmFyIGNvdW50ID0gbWluKGZpbmFsIC0gZnJvbSwgbGVuIC0gdG8pO1xuICAgICAgdmFyIGRpcmVjdGlvbjtcbiAgICAgIGlmIChmcm9tIDwgdG8gJiYgdG8gPCBmcm9tICsgY291bnQpIHtcbiAgICAgICAgZGlyZWN0aW9uID0gLTE7XG4gICAgICAgIGZyb20gPSBmcm9tICsgY291bnQgLSAxO1xuICAgICAgICB0byA9IHRvICsgY291bnQgLSAxO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZGlyZWN0aW9uID0gMTtcbiAgICAgIH1cbiAgICAgIHdoaWxlIChjb3VudCA+IDApIHtcbiAgICAgICAgby5fc2V0dGVyKHRvLCBvLl9nZXR0ZXIoZnJvbSkpO1xuICAgICAgICBmcm9tID0gZnJvbSArIGRpcmVjdGlvbjtcbiAgICAgICAgdG8gPSB0byArIGRpcmVjdGlvbjtcbiAgICAgICAgY291bnQgPSBjb3VudCAtIDE7XG4gICAgICB9XG4gICAgICByZXR1cm4gbztcbiAgICB9fSk7XG5cbiAgICAvLyAlVHlwZWRBcnJheSUucHJvdG90eXBlLmVudHJpZXMgKCApXG4gICAgLy8gLS0gZGVmaW5lZCBpbiBlczYuanMgdG8gc2hpbSBicm93c2VycyB3LyBuYXRpdmUgVHlwZWRBcnJheXNcblxuICAgIC8vICVUeXBlZEFycmF5JS5wcm90b3R5cGUuZXZlcnkgKCBjYWxsYmFja2ZuLCB0aGlzQXJnID0gdW5kZWZpbmVkIClcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoJFR5cGVkQXJyYXkkLnByb3RvdHlwZSwgJ2V2ZXJ5Jywge3ZhbHVlOiBmdW5jdGlvbihjYWxsYmFja2ZuKSB7XG4gICAgICBpZiAodGhpcyA9PT0gdW5kZWZpbmVkIHx8IHRoaXMgPT09IG51bGwpIHRocm93IFR5cGVFcnJvcigpO1xuICAgICAgdmFyIHQgPSBPYmplY3QodGhpcyk7XG4gICAgICB2YXIgbGVuID0gVG9VaW50MzIodC5sZW5ndGgpO1xuICAgICAgaWYgKCFJc0NhbGxhYmxlKGNhbGxiYWNrZm4pKSB0aHJvdyBUeXBlRXJyb3IoKTtcbiAgICAgIHZhciB0aGlzQXJnID0gYXJndW1lbnRzWzFdO1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgICAgICBpZiAoIWNhbGxiYWNrZm4uY2FsbCh0aGlzQXJnLCB0Ll9nZXR0ZXIoaSksIGksIHQpKVxuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH19KTtcblxuICAgIC8vICVUeXBlZEFycmF5JS5wcm90b3R5cGUuZmlsbCAodmFsdWUsIHN0YXJ0ID0gMCwgZW5kID0gdGhpcy5sZW5ndGggKVxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSgkVHlwZWRBcnJheSQucHJvdG90eXBlLCAnZmlsbCcsIHt2YWx1ZTogZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgIHZhciBzdGFydCA9IGFyZ3VtZW50c1sxXSxcbiAgICAgICAgICBlbmQgPSBhcmd1bWVudHNbMl07XG5cbiAgICAgIHZhciBvID0gVG9PYmplY3QodGhpcyk7XG4gICAgICB2YXIgbGVuVmFsID0gby5sZW5ndGg7XG4gICAgICB2YXIgbGVuID0gVG9VaW50MzIobGVuVmFsKTtcbiAgICAgIGxlbiA9IG1heChsZW4sIDApO1xuICAgICAgdmFyIHJlbGF0aXZlU3RhcnQgPSBUb0ludDMyKHN0YXJ0KTtcbiAgICAgIHZhciBrO1xuICAgICAgaWYgKHJlbGF0aXZlU3RhcnQgPCAwKVxuICAgICAgICBrID0gbWF4KChsZW4gKyByZWxhdGl2ZVN0YXJ0KSwgMCk7XG4gICAgICBlbHNlXG4gICAgICAgIGsgPSBtaW4ocmVsYXRpdmVTdGFydCwgbGVuKTtcbiAgICAgIHZhciByZWxhdGl2ZUVuZDtcbiAgICAgIGlmIChlbmQgPT09IHVuZGVmaW5lZClcbiAgICAgICAgcmVsYXRpdmVFbmQgPSBsZW47XG4gICAgICBlbHNlXG4gICAgICAgIHJlbGF0aXZlRW5kID0gVG9JbnQzMihlbmQpO1xuICAgICAgdmFyIGZpbmFsO1xuICAgICAgaWYgKHJlbGF0aXZlRW5kIDwgMClcbiAgICAgICAgZmluYWwgPSBtYXgoKGxlbiArIHJlbGF0aXZlRW5kKSwgMCk7XG4gICAgICBlbHNlXG4gICAgICAgIGZpbmFsID0gbWluKHJlbGF0aXZlRW5kLCBsZW4pO1xuICAgICAgd2hpbGUgKGsgPCBmaW5hbCkge1xuICAgICAgICBvLl9zZXR0ZXIoaywgdmFsdWUpO1xuICAgICAgICBrICs9IDE7XG4gICAgICB9XG4gICAgICByZXR1cm4gbztcbiAgICB9fSk7XG5cbiAgICAvLyAlVHlwZWRBcnJheSUucHJvdG90eXBlLmZpbHRlciAoIGNhbGxiYWNrZm4sIHRoaXNBcmcgPSB1bmRlZmluZWQgKVxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSgkVHlwZWRBcnJheSQucHJvdG90eXBlLCAnZmlsdGVyJywge3ZhbHVlOiBmdW5jdGlvbihjYWxsYmFja2ZuKSB7XG4gICAgICBpZiAodGhpcyA9PT0gdW5kZWZpbmVkIHx8IHRoaXMgPT09IG51bGwpIHRocm93IFR5cGVFcnJvcigpO1xuICAgICAgdmFyIHQgPSBPYmplY3QodGhpcyk7XG4gICAgICB2YXIgbGVuID0gVG9VaW50MzIodC5sZW5ndGgpO1xuICAgICAgaWYgKCFJc0NhbGxhYmxlKGNhbGxiYWNrZm4pKSB0aHJvdyBUeXBlRXJyb3IoKTtcbiAgICAgIHZhciByZXMgPSBbXTtcbiAgICAgIHZhciB0aGlzcCA9IGFyZ3VtZW50c1sxXTtcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgdmFyIHZhbCA9IHQuX2dldHRlcihpKTsgLy8gaW4gY2FzZSBmdW4gbXV0YXRlcyB0aGlzXG4gICAgICAgIGlmIChjYWxsYmFja2ZuLmNhbGwodGhpc3AsIHZhbCwgaSwgdCkpXG4gICAgICAgICAgcmVzLnB1c2godmFsKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBuZXcgdGhpcy5jb25zdHJ1Y3RvcihyZXMpO1xuICAgIH19KTtcblxuICAgIC8vICVUeXBlZEFycmF5JS5wcm90b3R5cGUuZmluZCAocHJlZGljYXRlLCB0aGlzQXJnID0gdW5kZWZpbmVkKVxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSgkVHlwZWRBcnJheSQucHJvdG90eXBlLCAnZmluZCcsIHt2YWx1ZTogZnVuY3Rpb24ocHJlZGljYXRlKSB7XG4gICAgICB2YXIgbyA9IFRvT2JqZWN0KHRoaXMpO1xuICAgICAgdmFyIGxlblZhbHVlID0gby5sZW5ndGg7XG4gICAgICB2YXIgbGVuID0gVG9VaW50MzIobGVuVmFsdWUpO1xuICAgICAgaWYgKCFJc0NhbGxhYmxlKHByZWRpY2F0ZSkpIHRocm93IFR5cGVFcnJvcigpO1xuICAgICAgdmFyIHQgPSBhcmd1bWVudHMubGVuZ3RoID4gMSA/IGFyZ3VtZW50c1sxXSA6IHVuZGVmaW5lZDtcbiAgICAgIHZhciBrID0gMDtcbiAgICAgIHdoaWxlIChrIDwgbGVuKSB7XG4gICAgICAgIHZhciBrVmFsdWUgPSBvLl9nZXR0ZXIoayk7XG4gICAgICAgIHZhciB0ZXN0UmVzdWx0ID0gcHJlZGljYXRlLmNhbGwodCwga1ZhbHVlLCBrLCBvKTtcbiAgICAgICAgaWYgKEJvb2xlYW4odGVzdFJlc3VsdCkpXG4gICAgICAgICAgcmV0dXJuIGtWYWx1ZTtcbiAgICAgICAgKytrO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9fSk7XG5cbiAgICAvLyAlVHlwZWRBcnJheSUucHJvdG90eXBlLmZpbmRJbmRleCAoIHByZWRpY2F0ZSwgdGhpc0FyZyA9IHVuZGVmaW5lZCApXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KCRUeXBlZEFycmF5JC5wcm90b3R5cGUsICdmaW5kSW5kZXgnLCB7dmFsdWU6IGZ1bmN0aW9uKHByZWRpY2F0ZSkge1xuICAgICAgdmFyIG8gPSBUb09iamVjdCh0aGlzKTtcbiAgICAgIHZhciBsZW5WYWx1ZSA9IG8ubGVuZ3RoO1xuICAgICAgdmFyIGxlbiA9IFRvVWludDMyKGxlblZhbHVlKTtcbiAgICAgIGlmICghSXNDYWxsYWJsZShwcmVkaWNhdGUpKSB0aHJvdyBUeXBlRXJyb3IoKTtcbiAgICAgIHZhciB0ID0gYXJndW1lbnRzLmxlbmd0aCA+IDEgPyBhcmd1bWVudHNbMV0gOiB1bmRlZmluZWQ7XG4gICAgICB2YXIgayA9IDA7XG4gICAgICB3aGlsZSAoayA8IGxlbikge1xuICAgICAgICB2YXIga1ZhbHVlID0gby5fZ2V0dGVyKGspO1xuICAgICAgICB2YXIgdGVzdFJlc3VsdCA9IHByZWRpY2F0ZS5jYWxsKHQsIGtWYWx1ZSwgaywgbyk7XG4gICAgICAgIGlmIChCb29sZWFuKHRlc3RSZXN1bHQpKVxuICAgICAgICAgIHJldHVybiBrO1xuICAgICAgICArK2s7XG4gICAgICB9XG4gICAgICByZXR1cm4gLTE7XG4gICAgfX0pO1xuXG4gICAgLy8gJVR5cGVkQXJyYXklLnByb3RvdHlwZS5mb3JFYWNoICggY2FsbGJhY2tmbiwgdGhpc0FyZyA9IHVuZGVmaW5lZCApXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KCRUeXBlZEFycmF5JC5wcm90b3R5cGUsICdmb3JFYWNoJywge3ZhbHVlOiBmdW5jdGlvbihjYWxsYmFja2ZuKSB7XG4gICAgICBpZiAodGhpcyA9PT0gdW5kZWZpbmVkIHx8IHRoaXMgPT09IG51bGwpIHRocm93IFR5cGVFcnJvcigpO1xuICAgICAgdmFyIHQgPSBPYmplY3QodGhpcyk7XG4gICAgICB2YXIgbGVuID0gVG9VaW50MzIodC5sZW5ndGgpO1xuICAgICAgaWYgKCFJc0NhbGxhYmxlKGNhbGxiYWNrZm4pKSB0aHJvdyBUeXBlRXJyb3IoKTtcbiAgICAgIHZhciB0aGlzcCA9IGFyZ3VtZW50c1sxXTtcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpKyspXG4gICAgICAgIGNhbGxiYWNrZm4uY2FsbCh0aGlzcCwgdC5fZ2V0dGVyKGkpLCBpLCB0KTtcbiAgICB9fSk7XG5cbiAgICAvLyAlVHlwZWRBcnJheSUucHJvdG90eXBlLmluZGV4T2YgKHNlYXJjaEVsZW1lbnQsIGZyb21JbmRleCA9IDAgKVxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSgkVHlwZWRBcnJheSQucHJvdG90eXBlLCAnaW5kZXhPZicsIHt2YWx1ZTogZnVuY3Rpb24oc2VhcmNoRWxlbWVudCkge1xuICAgICAgaWYgKHRoaXMgPT09IHVuZGVmaW5lZCB8fCB0aGlzID09PSBudWxsKSB0aHJvdyBUeXBlRXJyb3IoKTtcbiAgICAgIHZhciB0ID0gT2JqZWN0KHRoaXMpO1xuICAgICAgdmFyIGxlbiA9IFRvVWludDMyKHQubGVuZ3RoKTtcbiAgICAgIGlmIChsZW4gPT09IDApIHJldHVybiAtMTtcbiAgICAgIHZhciBuID0gMDtcbiAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMCkge1xuICAgICAgICBuID0gTnVtYmVyKGFyZ3VtZW50c1sxXSk7XG4gICAgICAgIGlmIChuICE9PSBuKSB7XG4gICAgICAgICAgbiA9IDA7XG4gICAgICAgIH0gZWxzZSBpZiAobiAhPT0gMCAmJiBuICE9PSAoMSAvIDApICYmIG4gIT09IC0oMSAvIDApKSB7XG4gICAgICAgICAgbiA9IChuID4gMCB8fCAtMSkgKiBmbG9vcihhYnMobikpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAobiA+PSBsZW4pIHJldHVybiAtMTtcbiAgICAgIHZhciBrID0gbiA+PSAwID8gbiA6IG1heChsZW4gLSBhYnMobiksIDApO1xuICAgICAgZm9yICg7IGsgPCBsZW47IGsrKykge1xuICAgICAgICBpZiAodC5fZ2V0dGVyKGspID09PSBzZWFyY2hFbGVtZW50KSB7XG4gICAgICAgICAgcmV0dXJuIGs7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiAtMTtcbiAgICB9fSk7XG5cbiAgICAvLyAlVHlwZWRBcnJheSUucHJvdG90eXBlLmpvaW4gKCBzZXBhcmF0b3IgKVxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSgkVHlwZWRBcnJheSQucHJvdG90eXBlLCAnam9pbicsIHt2YWx1ZTogZnVuY3Rpb24oc2VwYXJhdG9yKSB7XG4gICAgICBpZiAodGhpcyA9PT0gdW5kZWZpbmVkIHx8IHRoaXMgPT09IG51bGwpIHRocm93IFR5cGVFcnJvcigpO1xuICAgICAgdmFyIHQgPSBPYmplY3QodGhpcyk7XG4gICAgICB2YXIgbGVuID0gVG9VaW50MzIodC5sZW5ndGgpO1xuICAgICAgdmFyIHRtcCA9IEFycmF5KGxlbik7XG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgKytpKVxuICAgICAgICB0bXBbaV0gPSB0Ll9nZXR0ZXIoaSk7XG4gICAgICByZXR1cm4gdG1wLmpvaW4oc2VwYXJhdG9yID09PSB1bmRlZmluZWQgPyAnLCcgOiBzZXBhcmF0b3IpOyAvLyBIYWNrIGZvciBJRTdcbiAgICB9fSk7XG5cbiAgICAvLyAlVHlwZWRBcnJheSUucHJvdG90eXBlLmtleXMgKCApXG4gICAgLy8gLS0gZGVmaW5lZCBpbiBlczYuanMgdG8gc2hpbSBicm93c2VycyB3LyBuYXRpdmUgVHlwZWRBcnJheXNcblxuICAgIC8vICVUeXBlZEFycmF5JS5wcm90b3R5cGUubGFzdEluZGV4T2YgKCBzZWFyY2hFbGVtZW50LCBmcm9tSW5kZXggPSB0aGlzLmxlbmd0aC0xIClcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoJFR5cGVkQXJyYXkkLnByb3RvdHlwZSwgJ2xhc3RJbmRleE9mJywge3ZhbHVlOiBmdW5jdGlvbihzZWFyY2hFbGVtZW50KSB7XG4gICAgICBpZiAodGhpcyA9PT0gdW5kZWZpbmVkIHx8IHRoaXMgPT09IG51bGwpIHRocm93IFR5cGVFcnJvcigpO1xuICAgICAgdmFyIHQgPSBPYmplY3QodGhpcyk7XG4gICAgICB2YXIgbGVuID0gVG9VaW50MzIodC5sZW5ndGgpO1xuICAgICAgaWYgKGxlbiA9PT0gMCkgcmV0dXJuIC0xO1xuICAgICAgdmFyIG4gPSBsZW47XG4gICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgbiA9IE51bWJlcihhcmd1bWVudHNbMV0pO1xuICAgICAgICBpZiAobiAhPT0gbikge1xuICAgICAgICAgIG4gPSAwO1xuICAgICAgICB9IGVsc2UgaWYgKG4gIT09IDAgJiYgbiAhPT0gKDEgLyAwKSAmJiBuICE9PSAtKDEgLyAwKSkge1xuICAgICAgICAgIG4gPSAobiA+IDAgfHwgLTEpICogZmxvb3IoYWJzKG4pKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgdmFyIGsgPSBuID49IDAgPyBtaW4obiwgbGVuIC0gMSkgOiBsZW4gLSBhYnMobik7XG4gICAgICBmb3IgKDsgayA+PSAwOyBrLS0pIHtcbiAgICAgICAgaWYgKHQuX2dldHRlcihrKSA9PT0gc2VhcmNoRWxlbWVudClcbiAgICAgICAgICByZXR1cm4gaztcbiAgICAgIH1cbiAgICAgIHJldHVybiAtMTtcbiAgICB9fSk7XG5cbiAgICAvLyBnZXQgJVR5cGVkQXJyYXklLnByb3RvdHlwZS5sZW5ndGhcbiAgICAvLyAtLSBhcHBsaWVkIGRpcmVjdGx5IHRvIHRoZSBvYmplY3QgaW4gdGhlIGNvbnN0cnVjdG9yXG5cbiAgICAvLyAlVHlwZWRBcnJheSUucHJvdG90eXBlLm1hcCAoIGNhbGxiYWNrZm4sIHRoaXNBcmcgPSB1bmRlZmluZWQgKVxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSgkVHlwZWRBcnJheSQucHJvdG90eXBlLCAnbWFwJywge3ZhbHVlOiBmdW5jdGlvbihjYWxsYmFja2ZuKSB7XG4gICAgICBpZiAodGhpcyA9PT0gdW5kZWZpbmVkIHx8IHRoaXMgPT09IG51bGwpIHRocm93IFR5cGVFcnJvcigpO1xuICAgICAgdmFyIHQgPSBPYmplY3QodGhpcyk7XG4gICAgICB2YXIgbGVuID0gVG9VaW50MzIodC5sZW5ndGgpO1xuICAgICAgaWYgKCFJc0NhbGxhYmxlKGNhbGxiYWNrZm4pKSB0aHJvdyBUeXBlRXJyb3IoKTtcbiAgICAgIHZhciByZXMgPSBbXTsgcmVzLmxlbmd0aCA9IGxlbjtcbiAgICAgIHZhciB0aGlzcCA9IGFyZ3VtZW50c1sxXTtcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpKyspXG4gICAgICAgIHJlc1tpXSA9IGNhbGxiYWNrZm4uY2FsbCh0aGlzcCwgdC5fZ2V0dGVyKGkpLCBpLCB0KTtcbiAgICAgIHJldHVybiBuZXcgdGhpcy5jb25zdHJ1Y3RvcihyZXMpO1xuICAgIH19KTtcblxuICAgIC8vICVUeXBlZEFycmF5JS5wcm90b3R5cGUucmVkdWNlICggY2FsbGJhY2tmbiBbLCBpbml0aWFsVmFsdWVdIClcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoJFR5cGVkQXJyYXkkLnByb3RvdHlwZSwgJ3JlZHVjZScsIHt2YWx1ZTogZnVuY3Rpb24oY2FsbGJhY2tmbikge1xuICAgICAgaWYgKHRoaXMgPT09IHVuZGVmaW5lZCB8fCB0aGlzID09PSBudWxsKSB0aHJvdyBUeXBlRXJyb3IoKTtcbiAgICAgIHZhciB0ID0gT2JqZWN0KHRoaXMpO1xuICAgICAgdmFyIGxlbiA9IFRvVWludDMyKHQubGVuZ3RoKTtcbiAgICAgIGlmICghSXNDYWxsYWJsZShjYWxsYmFja2ZuKSkgdGhyb3cgVHlwZUVycm9yKCk7XG4gICAgICAvLyBubyB2YWx1ZSB0byByZXR1cm4gaWYgbm8gaW5pdGlhbCB2YWx1ZSBhbmQgYW4gZW1wdHkgYXJyYXlcbiAgICAgIGlmIChsZW4gPT09IDAgJiYgYXJndW1lbnRzLmxlbmd0aCA9PT0gMSkgdGhyb3cgVHlwZUVycm9yKCk7XG4gICAgICB2YXIgayA9IDA7XG4gICAgICB2YXIgYWNjdW11bGF0b3I7XG4gICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+PSAyKSB7XG4gICAgICAgIGFjY3VtdWxhdG9yID0gYXJndW1lbnRzWzFdO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYWNjdW11bGF0b3IgPSB0Ll9nZXR0ZXIoaysrKTtcbiAgICAgIH1cbiAgICAgIHdoaWxlIChrIDwgbGVuKSB7XG4gICAgICAgIGFjY3VtdWxhdG9yID0gY2FsbGJhY2tmbi5jYWxsKHVuZGVmaW5lZCwgYWNjdW11bGF0b3IsIHQuX2dldHRlcihrKSwgaywgdCk7XG4gICAgICAgIGsrKztcbiAgICAgIH1cbiAgICAgIHJldHVybiBhY2N1bXVsYXRvcjtcbiAgICB9fSk7XG5cbiAgICAvLyAlVHlwZWRBcnJheSUucHJvdG90eXBlLnJlZHVjZVJpZ2h0ICggY2FsbGJhY2tmbiBbLCBpbml0aWFsVmFsdWVdIClcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoJFR5cGVkQXJyYXkkLnByb3RvdHlwZSwgJ3JlZHVjZVJpZ2h0Jywge3ZhbHVlOiBmdW5jdGlvbihjYWxsYmFja2ZuKSB7XG4gICAgICBpZiAodGhpcyA9PT0gdW5kZWZpbmVkIHx8IHRoaXMgPT09IG51bGwpIHRocm93IFR5cGVFcnJvcigpO1xuICAgICAgdmFyIHQgPSBPYmplY3QodGhpcyk7XG4gICAgICB2YXIgbGVuID0gVG9VaW50MzIodC5sZW5ndGgpO1xuICAgICAgaWYgKCFJc0NhbGxhYmxlKGNhbGxiYWNrZm4pKSB0aHJvdyBUeXBlRXJyb3IoKTtcbiAgICAgIC8vIG5vIHZhbHVlIHRvIHJldHVybiBpZiBubyBpbml0aWFsIHZhbHVlLCBlbXB0eSBhcnJheVxuICAgICAgaWYgKGxlbiA9PT0gMCAmJiBhcmd1bWVudHMubGVuZ3RoID09PSAxKSB0aHJvdyBUeXBlRXJyb3IoKTtcbiAgICAgIHZhciBrID0gbGVuIC0gMTtcbiAgICAgIHZhciBhY2N1bXVsYXRvcjtcbiAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID49IDIpIHtcbiAgICAgICAgYWNjdW11bGF0b3IgPSBhcmd1bWVudHNbMV07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBhY2N1bXVsYXRvciA9IHQuX2dldHRlcihrLS0pO1xuICAgICAgfVxuICAgICAgd2hpbGUgKGsgPj0gMCkge1xuICAgICAgICBhY2N1bXVsYXRvciA9IGNhbGxiYWNrZm4uY2FsbCh1bmRlZmluZWQsIGFjY3VtdWxhdG9yLCB0Ll9nZXR0ZXIoayksIGssIHQpO1xuICAgICAgICBrLS07XG4gICAgICB9XG4gICAgICByZXR1cm4gYWNjdW11bGF0b3I7XG4gICAgfX0pO1xuXG4gICAgLy8gJVR5cGVkQXJyYXklLnByb3RvdHlwZS5yZXZlcnNlICggKVxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSgkVHlwZWRBcnJheSQucHJvdG90eXBlLCAncmV2ZXJzZScsIHt2YWx1ZTogZnVuY3Rpb24oKSB7XG4gICAgICBpZiAodGhpcyA9PT0gdW5kZWZpbmVkIHx8IHRoaXMgPT09IG51bGwpIHRocm93IFR5cGVFcnJvcigpO1xuICAgICAgdmFyIHQgPSBPYmplY3QodGhpcyk7XG4gICAgICB2YXIgbGVuID0gVG9VaW50MzIodC5sZW5ndGgpO1xuICAgICAgdmFyIGhhbGYgPSBmbG9vcihsZW4gLyAyKTtcbiAgICAgIGZvciAodmFyIGkgPSAwLCBqID0gbGVuIC0gMTsgaSA8IGhhbGY7ICsraSwgLS1qKSB7XG4gICAgICAgIHZhciB0bXAgPSB0Ll9nZXR0ZXIoaSk7XG4gICAgICAgIHQuX3NldHRlcihpLCB0Ll9nZXR0ZXIoaikpO1xuICAgICAgICB0Ll9zZXR0ZXIoaiwgdG1wKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0O1xuICAgIH19KTtcblxuICAgIC8vICVUeXBlZEFycmF5JS5wcm90b3R5cGUuc2V0KGFycmF5LCBvZmZzZXQgPSAwIClcbiAgICAvLyAlVHlwZWRBcnJheSUucHJvdG90eXBlLnNldCh0eXBlZEFycmF5LCBvZmZzZXQgPSAwIClcbiAgICAvLyBXZWJJREw6IHZvaWQgc2V0KFR5cGVkQXJyYXkgYXJyYXksIG9wdGlvbmFsIHVuc2lnbmVkIGxvbmcgb2Zmc2V0KTtcbiAgICAvLyBXZWJJREw6IHZvaWQgc2V0KHNlcXVlbmNlPHR5cGU+IGFycmF5LCBvcHRpb25hbCB1bnNpZ25lZCBsb25nIG9mZnNldCk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KCRUeXBlZEFycmF5JC5wcm90b3R5cGUsICdzZXQnLCB7dmFsdWU6IGZ1bmN0aW9uKGluZGV4LCB2YWx1ZSkge1xuICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPCAxKSB0aHJvdyBTeW50YXhFcnJvcignTm90IGVub3VnaCBhcmd1bWVudHMnKTtcbiAgICAgIHZhciBhcnJheSwgc2VxdWVuY2UsIG9mZnNldCwgbGVuLFxuICAgICAgICAgIGksIHMsIGQsXG4gICAgICAgICAgYnl0ZU9mZnNldCwgYnl0ZUxlbmd0aCwgdG1wO1xuXG4gICAgICBpZiAodHlwZW9mIGFyZ3VtZW50c1swXSA9PT0gJ29iamVjdCcgJiYgYXJndW1lbnRzWzBdLmNvbnN0cnVjdG9yID09PSB0aGlzLmNvbnN0cnVjdG9yKSB7XG4gICAgICAgIC8vIHZvaWQgc2V0KFR5cGVkQXJyYXkgYXJyYXksIG9wdGlvbmFsIHVuc2lnbmVkIGxvbmcgb2Zmc2V0KTtcbiAgICAgICAgYXJyYXkgPSBhcmd1bWVudHNbMF07XG4gICAgICAgIG9mZnNldCA9IFRvVWludDMyKGFyZ3VtZW50c1sxXSk7XG5cbiAgICAgICAgaWYgKG9mZnNldCArIGFycmF5Lmxlbmd0aCA+IHRoaXMubGVuZ3RoKSB7XG4gICAgICAgICAgdGhyb3cgUmFuZ2VFcnJvcignT2Zmc2V0IHBsdXMgbGVuZ3RoIG9mIGFycmF5IGlzIG91dCBvZiByYW5nZScpO1xuICAgICAgICB9XG5cbiAgICAgICAgYnl0ZU9mZnNldCA9IHRoaXMuYnl0ZU9mZnNldCArIG9mZnNldCAqIHRoaXMuQllURVNfUEVSX0VMRU1FTlQ7XG4gICAgICAgIGJ5dGVMZW5ndGggPSBhcnJheS5sZW5ndGggKiB0aGlzLkJZVEVTX1BFUl9FTEVNRU5UO1xuXG4gICAgICAgIGlmIChhcnJheS5idWZmZXIgPT09IHRoaXMuYnVmZmVyKSB7XG4gICAgICAgICAgdG1wID0gW107XG4gICAgICAgICAgZm9yIChpID0gMCwgcyA9IGFycmF5LmJ5dGVPZmZzZXQ7IGkgPCBieXRlTGVuZ3RoOyBpICs9IDEsIHMgKz0gMSkge1xuICAgICAgICAgICAgdG1wW2ldID0gYXJyYXkuYnVmZmVyLl9ieXRlc1tzXTtcbiAgICAgICAgICB9XG4gICAgICAgICAgZm9yIChpID0gMCwgZCA9IGJ5dGVPZmZzZXQ7IGkgPCBieXRlTGVuZ3RoOyBpICs9IDEsIGQgKz0gMSkge1xuICAgICAgICAgICAgdGhpcy5idWZmZXIuX2J5dGVzW2RdID0gdG1wW2ldO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBmb3IgKGkgPSAwLCBzID0gYXJyYXkuYnl0ZU9mZnNldCwgZCA9IGJ5dGVPZmZzZXQ7XG4gICAgICAgICAgICAgICBpIDwgYnl0ZUxlbmd0aDsgaSArPSAxLCBzICs9IDEsIGQgKz0gMSkge1xuICAgICAgICAgICAgdGhpcy5idWZmZXIuX2J5dGVzW2RdID0gYXJyYXkuYnVmZmVyLl9ieXRlc1tzXTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGFyZ3VtZW50c1swXSA9PT0gJ29iamVjdCcgJiYgdHlwZW9mIGFyZ3VtZW50c1swXS5sZW5ndGggIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIC8vIHZvaWQgc2V0KHNlcXVlbmNlPHR5cGU+IGFycmF5LCBvcHRpb25hbCB1bnNpZ25lZCBsb25nIG9mZnNldCk7XG4gICAgICAgIHNlcXVlbmNlID0gYXJndW1lbnRzWzBdO1xuICAgICAgICBsZW4gPSBUb1VpbnQzMihzZXF1ZW5jZS5sZW5ndGgpO1xuICAgICAgICBvZmZzZXQgPSBUb1VpbnQzMihhcmd1bWVudHNbMV0pO1xuXG4gICAgICAgIGlmIChvZmZzZXQgKyBsZW4gPiB0aGlzLmxlbmd0aCkge1xuICAgICAgICAgIHRocm93IFJhbmdlRXJyb3IoJ09mZnNldCBwbHVzIGxlbmd0aCBvZiBhcnJheSBpcyBvdXQgb2YgcmFuZ2UnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBsZW47IGkgKz0gMSkge1xuICAgICAgICAgIHMgPSBzZXF1ZW5jZVtpXTtcbiAgICAgICAgICB0aGlzLl9zZXR0ZXIob2Zmc2V0ICsgaSwgTnVtYmVyKHMpKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgVHlwZUVycm9yKCdVbmV4cGVjdGVkIGFyZ3VtZW50IHR5cGUocyknKTtcbiAgICAgIH1cbiAgICB9fSk7XG5cbiAgICAvLyAlVHlwZWRBcnJheSUucHJvdG90eXBlLnNsaWNlICggc3RhcnQsIGVuZCApXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KCRUeXBlZEFycmF5JC5wcm90b3R5cGUsICdzbGljZScsIHt2YWx1ZTogZnVuY3Rpb24oc3RhcnQsIGVuZCkge1xuICAgICAgdmFyIG8gPSBUb09iamVjdCh0aGlzKTtcbiAgICAgIHZhciBsZW5WYWwgPSBvLmxlbmd0aDtcbiAgICAgIHZhciBsZW4gPSBUb1VpbnQzMihsZW5WYWwpO1xuICAgICAgdmFyIHJlbGF0aXZlU3RhcnQgPSBUb0ludDMyKHN0YXJ0KTtcbiAgICAgIHZhciBrID0gKHJlbGF0aXZlU3RhcnQgPCAwKSA/IG1heChsZW4gKyByZWxhdGl2ZVN0YXJ0LCAwKSA6IG1pbihyZWxhdGl2ZVN0YXJ0LCBsZW4pO1xuICAgICAgdmFyIHJlbGF0aXZlRW5kID0gKGVuZCA9PT0gdW5kZWZpbmVkKSA/IGxlbiA6IFRvSW50MzIoZW5kKTtcbiAgICAgIHZhciBmaW5hbCA9IChyZWxhdGl2ZUVuZCA8IDApID8gbWF4KGxlbiArIHJlbGF0aXZlRW5kLCAwKSA6IG1pbihyZWxhdGl2ZUVuZCwgbGVuKTtcbiAgICAgIHZhciBjb3VudCA9IGZpbmFsIC0gaztcbiAgICAgIHZhciBjID0gby5jb25zdHJ1Y3RvcjtcbiAgICAgIHZhciBhID0gbmV3IGMoY291bnQpO1xuICAgICAgdmFyIG4gPSAwO1xuICAgICAgd2hpbGUgKGsgPCBmaW5hbCkge1xuICAgICAgICB2YXIga1ZhbHVlID0gby5fZ2V0dGVyKGspO1xuICAgICAgICBhLl9zZXR0ZXIobiwga1ZhbHVlKTtcbiAgICAgICAgKytrO1xuICAgICAgICArK247XG4gICAgICB9XG4gICAgICByZXR1cm4gYTtcbiAgICB9fSk7XG5cbiAgICAvLyAlVHlwZWRBcnJheSUucHJvdG90eXBlLnNvbWUgKCBjYWxsYmFja2ZuLCB0aGlzQXJnID0gdW5kZWZpbmVkIClcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoJFR5cGVkQXJyYXkkLnByb3RvdHlwZSwgJ3NvbWUnLCB7dmFsdWU6IGZ1bmN0aW9uKGNhbGxiYWNrZm4pIHtcbiAgICAgIGlmICh0aGlzID09PSB1bmRlZmluZWQgfHwgdGhpcyA9PT0gbnVsbCkgdGhyb3cgVHlwZUVycm9yKCk7XG4gICAgICB2YXIgdCA9IE9iamVjdCh0aGlzKTtcbiAgICAgIHZhciBsZW4gPSBUb1VpbnQzMih0Lmxlbmd0aCk7XG4gICAgICBpZiAoIUlzQ2FsbGFibGUoY2FsbGJhY2tmbikpIHRocm93IFR5cGVFcnJvcigpO1xuICAgICAgdmFyIHRoaXNwID0gYXJndW1lbnRzWzFdO1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgICAgICBpZiAoY2FsbGJhY2tmbi5jYWxsKHRoaXNwLCB0Ll9nZXR0ZXIoaSksIGksIHQpKSB7XG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9fSk7XG5cbiAgICAvLyAlVHlwZWRBcnJheSUucHJvdG90eXBlLnNvcnQgKCBjb21wYXJlZm4gKVxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSgkVHlwZWRBcnJheSQucHJvdG90eXBlLCAnc29ydCcsIHt2YWx1ZTogZnVuY3Rpb24oY29tcGFyZWZuKSB7XG4gICAgICBpZiAodGhpcyA9PT0gdW5kZWZpbmVkIHx8IHRoaXMgPT09IG51bGwpIHRocm93IFR5cGVFcnJvcigpO1xuICAgICAgdmFyIHQgPSBPYmplY3QodGhpcyk7XG4gICAgICB2YXIgbGVuID0gVG9VaW50MzIodC5sZW5ndGgpO1xuICAgICAgdmFyIHRtcCA9IEFycmF5KGxlbik7XG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgKytpKVxuICAgICAgICB0bXBbaV0gPSB0Ll9nZXR0ZXIoaSk7XG4gICAgICBpZiAoY29tcGFyZWZuKSB0bXAuc29ydChjb21wYXJlZm4pOyBlbHNlIHRtcC5zb3J0KCk7IC8vIEhhY2sgZm9yIElFOC85XG4gICAgICBmb3IgKGkgPSAwOyBpIDwgbGVuOyArK2kpXG4gICAgICAgIHQuX3NldHRlcihpLCB0bXBbaV0pO1xuICAgICAgcmV0dXJuIHQ7XG4gICAgfX0pO1xuXG4gICAgLy8gJVR5cGVkQXJyYXklLnByb3RvdHlwZS5zdWJhcnJheShiZWdpbiA9IDAsIGVuZCA9IHRoaXMubGVuZ3RoIClcbiAgICAvLyBXZWJJREw6IFR5cGVkQXJyYXkgc3ViYXJyYXkobG9uZyBiZWdpbiwgb3B0aW9uYWwgbG9uZyBlbmQpO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSgkVHlwZWRBcnJheSQucHJvdG90eXBlLCAnc3ViYXJyYXknLCB7dmFsdWU6IGZ1bmN0aW9uKHN0YXJ0LCBlbmQpIHtcbiAgICAgIGZ1bmN0aW9uIGNsYW1wKHYsIG1pbiwgbWF4KSB7IHJldHVybiB2IDwgbWluID8gbWluIDogdiA+IG1heCA/IG1heCA6IHY7IH1cblxuICAgICAgc3RhcnQgPSBUb0ludDMyKHN0YXJ0KTtcbiAgICAgIGVuZCA9IFRvSW50MzIoZW5kKTtcblxuICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPCAxKSB7IHN0YXJ0ID0gMDsgfVxuICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPCAyKSB7IGVuZCA9IHRoaXMubGVuZ3RoOyB9XG5cbiAgICAgIGlmIChzdGFydCA8IDApIHsgc3RhcnQgPSB0aGlzLmxlbmd0aCArIHN0YXJ0OyB9XG4gICAgICBpZiAoZW5kIDwgMCkgeyBlbmQgPSB0aGlzLmxlbmd0aCArIGVuZDsgfVxuXG4gICAgICBzdGFydCA9IGNsYW1wKHN0YXJ0LCAwLCB0aGlzLmxlbmd0aCk7XG4gICAgICBlbmQgPSBjbGFtcChlbmQsIDAsIHRoaXMubGVuZ3RoKTtcblxuICAgICAgdmFyIGxlbiA9IGVuZCAtIHN0YXJ0O1xuICAgICAgaWYgKGxlbiA8IDApIHtcbiAgICAgICAgbGVuID0gMDtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIG5ldyB0aGlzLmNvbnN0cnVjdG9yKFxuICAgICAgICB0aGlzLmJ1ZmZlciwgdGhpcy5ieXRlT2Zmc2V0ICsgc3RhcnQgKiB0aGlzLkJZVEVTX1BFUl9FTEVNRU5ULCBsZW4pO1xuICAgIH19KTtcblxuICAgIC8vICVUeXBlZEFycmF5JS5wcm90b3R5cGUudG9Mb2NhbGVTdHJpbmcgKCApXG4gICAgLy8gJVR5cGVkQXJyYXklLnByb3RvdHlwZS50b1N0cmluZyAoIClcbiAgICAvLyAlVHlwZWRBcnJheSUucHJvdG90eXBlLnZhbHVlcyAoIClcbiAgICAvLyAlVHlwZWRBcnJheSUucHJvdG90eXBlIFsgQEBpdGVyYXRvciBdICggKVxuICAgIC8vIGdldCAlVHlwZWRBcnJheSUucHJvdG90eXBlIFsgQEB0b1N0cmluZ1RhZyBdXG4gICAgLy8gLS0gZGVmaW5lZCBpbiBlczYuanMgdG8gc2hpbSBicm93c2VycyB3LyBuYXRpdmUgVHlwZWRBcnJheXNcblxuICAgIGZ1bmN0aW9uIG1ha2VUeXBlZEFycmF5KGVsZW1lbnRTaXplLCBwYWNrLCB1bnBhY2spIHtcbiAgICAgIC8vIEVhY2ggVHlwZWRBcnJheSB0eXBlIHJlcXVpcmVzIGEgZGlzdGluY3QgY29uc3RydWN0b3IgaW5zdGFuY2Ugd2l0aFxuICAgICAgLy8gaWRlbnRpY2FsIGxvZ2ljLCB3aGljaCB0aGlzIHByb2R1Y2VzLlxuICAgICAgdmFyIFR5cGVkQXJyYXkgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdjb25zdHJ1Y3RvcicsIHt2YWx1ZTogVHlwZWRBcnJheX0pO1xuICAgICAgICAkVHlwZWRBcnJheSQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgICAgbWFrZUFycmF5QWNjZXNzb3JzKHRoaXMpO1xuICAgICAgfTtcbiAgICAgIGlmICgnX19wcm90b19fJyBpbiBUeXBlZEFycmF5KSB7XG4gICAgICAgIFR5cGVkQXJyYXkuX19wcm90b19fID0gJFR5cGVkQXJyYXkkO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgVHlwZWRBcnJheS5mcm9tID0gJFR5cGVkQXJyYXkkLmZyb207XG4gICAgICAgIFR5cGVkQXJyYXkub2YgPSAkVHlwZWRBcnJheSQub2Y7XG4gICAgICB9XG5cbiAgICAgIFR5cGVkQXJyYXkuQllURVNfUEVSX0VMRU1FTlQgPSBlbGVtZW50U2l6ZTtcblxuICAgICAgdmFyIFR5cGVkQXJyYXlQcm90b3R5cGUgPSBmdW5jdGlvbigpIHt9O1xuICAgICAgVHlwZWRBcnJheVByb3RvdHlwZS5wcm90b3R5cGUgPSAkVHlwZWRBcnJheVByb3RvdHlwZSQ7XG5cbiAgICAgIFR5cGVkQXJyYXkucHJvdG90eXBlID0gbmV3IFR5cGVkQXJyYXlQcm90b3R5cGUoKTtcblxuICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KFR5cGVkQXJyYXkucHJvdG90eXBlLCAnQllURVNfUEVSX0VMRU1FTlQnLCB7dmFsdWU6IGVsZW1lbnRTaXplfSk7XG4gICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoVHlwZWRBcnJheS5wcm90b3R5cGUsICdfcGFjaycsIHt2YWx1ZTogcGFja30pO1xuICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KFR5cGVkQXJyYXkucHJvdG90eXBlLCAnX3VucGFjaycsIHt2YWx1ZTogdW5wYWNrfSk7XG5cbiAgICAgIHJldHVybiBUeXBlZEFycmF5O1xuICAgIH1cblxuICAgIHZhciBJbnQ4QXJyYXkgPSBtYWtlVHlwZWRBcnJheSgxLCBwYWNrSTgsIHVucGFja0k4KTtcbiAgICB2YXIgVWludDhBcnJheSA9IG1ha2VUeXBlZEFycmF5KDEsIHBhY2tVOCwgdW5wYWNrVTgpO1xuICAgIHZhciBVaW50OENsYW1wZWRBcnJheSA9IG1ha2VUeXBlZEFycmF5KDEsIHBhY2tVOENsYW1wZWQsIHVucGFja1U4KTtcbiAgICB2YXIgSW50MTZBcnJheSA9IG1ha2VUeXBlZEFycmF5KDIsIHBhY2tJMTYsIHVucGFja0kxNik7XG4gICAgdmFyIFVpbnQxNkFycmF5ID0gbWFrZVR5cGVkQXJyYXkoMiwgcGFja1UxNiwgdW5wYWNrVTE2KTtcbiAgICB2YXIgSW50MzJBcnJheSA9IG1ha2VUeXBlZEFycmF5KDQsIHBhY2tJMzIsIHVucGFja0kzMik7XG4gICAgdmFyIFVpbnQzMkFycmF5ID0gbWFrZVR5cGVkQXJyYXkoNCwgcGFja1UzMiwgdW5wYWNrVTMyKTtcbiAgICB2YXIgRmxvYXQzMkFycmF5ID0gbWFrZVR5cGVkQXJyYXkoNCwgcGFja0YzMiwgdW5wYWNrRjMyKTtcbiAgICB2YXIgRmxvYXQ2NEFycmF5ID0gbWFrZVR5cGVkQXJyYXkoOCwgcGFja0Y2NCwgdW5wYWNrRjY0KTtcblxuICAgIGdsb2JhbC5JbnQ4QXJyYXkgPSBnbG9iYWwuSW50OEFycmF5IHx8IEludDhBcnJheTtcbiAgICBnbG9iYWwuVWludDhBcnJheSA9IGdsb2JhbC5VaW50OEFycmF5IHx8IFVpbnQ4QXJyYXk7XG4gICAgZ2xvYmFsLlVpbnQ4Q2xhbXBlZEFycmF5ID0gZ2xvYmFsLlVpbnQ4Q2xhbXBlZEFycmF5IHx8IFVpbnQ4Q2xhbXBlZEFycmF5O1xuICAgIGdsb2JhbC5JbnQxNkFycmF5ID0gZ2xvYmFsLkludDE2QXJyYXkgfHwgSW50MTZBcnJheTtcbiAgICBnbG9iYWwuVWludDE2QXJyYXkgPSBnbG9iYWwuVWludDE2QXJyYXkgfHwgVWludDE2QXJyYXk7XG4gICAgZ2xvYmFsLkludDMyQXJyYXkgPSBnbG9iYWwuSW50MzJBcnJheSB8fCBJbnQzMkFycmF5O1xuICAgIGdsb2JhbC5VaW50MzJBcnJheSA9IGdsb2JhbC5VaW50MzJBcnJheSB8fCBVaW50MzJBcnJheTtcbiAgICBnbG9iYWwuRmxvYXQzMkFycmF5ID0gZ2xvYmFsLkZsb2F0MzJBcnJheSB8fCBGbG9hdDMyQXJyYXk7XG4gICAgZ2xvYmFsLkZsb2F0NjRBcnJheSA9IGdsb2JhbC5GbG9hdDY0QXJyYXkgfHwgRmxvYXQ2NEFycmF5O1xuICB9KCkpO1xuXG4gIC8vXG4gIC8vIDYgVGhlIERhdGFWaWV3IFZpZXcgVHlwZVxuICAvL1xuXG4gIChmdW5jdGlvbigpIHtcbiAgICBmdW5jdGlvbiByKGFycmF5LCBpbmRleCkge1xuICAgICAgcmV0dXJuIElzQ2FsbGFibGUoYXJyYXkuZ2V0KSA/IGFycmF5LmdldChpbmRleCkgOiBhcnJheVtpbmRleF07XG4gICAgfVxuXG4gICAgdmFyIElTX0JJR19FTkRJQU4gPSAoZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgdTE2YXJyYXkgPSBuZXcgVWludDE2QXJyYXkoWzB4MTIzNF0pLFxuICAgICAgICAgIHU4YXJyYXkgPSBuZXcgVWludDhBcnJheSh1MTZhcnJheS5idWZmZXIpO1xuICAgICAgcmV0dXJuIHIodThhcnJheSwgMCkgPT09IDB4MTI7XG4gICAgfSgpKTtcblxuICAgIC8vIERhdGFWaWV3KGJ1ZmZlciwgYnl0ZU9mZnNldD0wLCBieXRlTGVuZ3RoPXVuZGVmaW5lZClcbiAgICAvLyBXZWJJREw6IENvbnN0cnVjdG9yKEFycmF5QnVmZmVyIGJ1ZmZlcixcbiAgICAvLyAgICAgICAgICAgICAgICAgICAgIG9wdGlvbmFsIHVuc2lnbmVkIGxvbmcgYnl0ZU9mZnNldCxcbiAgICAvLyAgICAgICAgICAgICAgICAgICAgIG9wdGlvbmFsIHVuc2lnbmVkIGxvbmcgYnl0ZUxlbmd0aClcbiAgICBmdW5jdGlvbiBEYXRhVmlldyhidWZmZXIsIGJ5dGVPZmZzZXQsIGJ5dGVMZW5ndGgpIHtcbiAgICAgIGlmICghKGJ1ZmZlciBpbnN0YW5jZW9mIEFycmF5QnVmZmVyIHx8IENsYXNzKGJ1ZmZlcikgPT09ICdBcnJheUJ1ZmZlcicpKSB0aHJvdyBUeXBlRXJyb3IoKTtcblxuICAgICAgYnl0ZU9mZnNldCA9IFRvVWludDMyKGJ5dGVPZmZzZXQpO1xuICAgICAgaWYgKGJ5dGVPZmZzZXQgPiBidWZmZXIuYnl0ZUxlbmd0aClcbiAgICAgICAgdGhyb3cgUmFuZ2VFcnJvcignYnl0ZU9mZnNldCBvdXQgb2YgcmFuZ2UnKTtcblxuICAgICAgaWYgKGJ5dGVMZW5ndGggPT09IHVuZGVmaW5lZClcbiAgICAgICAgYnl0ZUxlbmd0aCA9IGJ1ZmZlci5ieXRlTGVuZ3RoIC0gYnl0ZU9mZnNldDtcbiAgICAgIGVsc2VcbiAgICAgICAgYnl0ZUxlbmd0aCA9IFRvVWludDMyKGJ5dGVMZW5ndGgpO1xuXG4gICAgICBpZiAoKGJ5dGVPZmZzZXQgKyBieXRlTGVuZ3RoKSA+IGJ1ZmZlci5ieXRlTGVuZ3RoKVxuICAgICAgICB0aHJvdyBSYW5nZUVycm9yKCdieXRlT2Zmc2V0IGFuZCBsZW5ndGggcmVmZXJlbmNlIGFuIGFyZWEgYmV5b25kIHRoZSBlbmQgb2YgdGhlIGJ1ZmZlcicpO1xuXG4gICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ2J1ZmZlcicsIHt2YWx1ZTogYnVmZmVyfSk7XG4gICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ2J5dGVMZW5ndGgnLCB7dmFsdWU6IGJ5dGVMZW5ndGh9KTtcbiAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnYnl0ZU9mZnNldCcsIHt2YWx1ZTogYnl0ZU9mZnNldH0pO1xuICAgIH07XG5cbiAgICAvLyBnZXQgRGF0YVZpZXcucHJvdG90eXBlLmJ1ZmZlclxuICAgIC8vIGdldCBEYXRhVmlldy5wcm90b3R5cGUuYnl0ZUxlbmd0aFxuICAgIC8vIGdldCBEYXRhVmlldy5wcm90b3R5cGUuYnl0ZU9mZnNldFxuICAgIC8vIC0tIGFwcGxpZWQgZGlyZWN0bHkgdG8gaW5zdGFuY2VzIGJ5IHRoZSBjb25zdHJ1Y3RvclxuXG4gICAgZnVuY3Rpb24gbWFrZUdldHRlcihhcnJheVR5cGUpIHtcbiAgICAgIHJldHVybiBmdW5jdGlvbiBHZXRWaWV3VmFsdWUoYnl0ZU9mZnNldCwgbGl0dGxlRW5kaWFuKSB7XG4gICAgICAgIGJ5dGVPZmZzZXQgPSBUb1VpbnQzMihieXRlT2Zmc2V0KTtcblxuICAgICAgICBpZiAoYnl0ZU9mZnNldCArIGFycmF5VHlwZS5CWVRFU19QRVJfRUxFTUVOVCA+IHRoaXMuYnl0ZUxlbmd0aClcbiAgICAgICAgICB0aHJvdyBSYW5nZUVycm9yKCdBcnJheSBpbmRleCBvdXQgb2YgcmFuZ2UnKTtcblxuICAgICAgICBieXRlT2Zmc2V0ICs9IHRoaXMuYnl0ZU9mZnNldDtcblxuICAgICAgICB2YXIgdWludDhBcnJheSA9IG5ldyBVaW50OEFycmF5KHRoaXMuYnVmZmVyLCBieXRlT2Zmc2V0LCBhcnJheVR5cGUuQllURVNfUEVSX0VMRU1FTlQpLFxuICAgICAgICAgICAgYnl0ZXMgPSBbXTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcnJheVR5cGUuQllURVNfUEVSX0VMRU1FTlQ7IGkgKz0gMSlcbiAgICAgICAgICBieXRlcy5wdXNoKHIodWludDhBcnJheSwgaSkpO1xuXG4gICAgICAgIGlmIChCb29sZWFuKGxpdHRsZUVuZGlhbikgPT09IEJvb2xlYW4oSVNfQklHX0VORElBTikpXG4gICAgICAgICAgYnl0ZXMucmV2ZXJzZSgpO1xuXG4gICAgICAgIHJldHVybiByKG5ldyBhcnJheVR5cGUobmV3IFVpbnQ4QXJyYXkoYnl0ZXMpLmJ1ZmZlciksIDApO1xuICAgICAgfTtcbiAgICB9XG5cbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoRGF0YVZpZXcucHJvdG90eXBlLCAnZ2V0VWludDgnLCB7dmFsdWU6IG1ha2VHZXR0ZXIoVWludDhBcnJheSl9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoRGF0YVZpZXcucHJvdG90eXBlLCAnZ2V0SW50OCcsIHt2YWx1ZTogbWFrZUdldHRlcihJbnQ4QXJyYXkpfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KERhdGFWaWV3LnByb3RvdHlwZSwgJ2dldFVpbnQxNicsIHt2YWx1ZTogbWFrZUdldHRlcihVaW50MTZBcnJheSl9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoRGF0YVZpZXcucHJvdG90eXBlLCAnZ2V0SW50MTYnLCB7dmFsdWU6IG1ha2VHZXR0ZXIoSW50MTZBcnJheSl9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoRGF0YVZpZXcucHJvdG90eXBlLCAnZ2V0VWludDMyJywge3ZhbHVlOiBtYWtlR2V0dGVyKFVpbnQzMkFycmF5KX0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShEYXRhVmlldy5wcm90b3R5cGUsICdnZXRJbnQzMicsIHt2YWx1ZTogbWFrZUdldHRlcihJbnQzMkFycmF5KX0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShEYXRhVmlldy5wcm90b3R5cGUsICdnZXRGbG9hdDMyJywge3ZhbHVlOiBtYWtlR2V0dGVyKEZsb2F0MzJBcnJheSl9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoRGF0YVZpZXcucHJvdG90eXBlLCAnZ2V0RmxvYXQ2NCcsIHt2YWx1ZTogbWFrZUdldHRlcihGbG9hdDY0QXJyYXkpfSk7XG5cbiAgICBmdW5jdGlvbiBtYWtlU2V0dGVyKGFycmF5VHlwZSkge1xuICAgICAgcmV0dXJuIGZ1bmN0aW9uIFNldFZpZXdWYWx1ZShieXRlT2Zmc2V0LCB2YWx1ZSwgbGl0dGxlRW5kaWFuKSB7XG4gICAgICAgIGJ5dGVPZmZzZXQgPSBUb1VpbnQzMihieXRlT2Zmc2V0KTtcbiAgICAgICAgaWYgKGJ5dGVPZmZzZXQgKyBhcnJheVR5cGUuQllURVNfUEVSX0VMRU1FTlQgPiB0aGlzLmJ5dGVMZW5ndGgpXG4gICAgICAgICAgdGhyb3cgUmFuZ2VFcnJvcignQXJyYXkgaW5kZXggb3V0IG9mIHJhbmdlJyk7XG5cbiAgICAgICAgLy8gR2V0IGJ5dGVzXG4gICAgICAgIHZhciB0eXBlQXJyYXkgPSBuZXcgYXJyYXlUeXBlKFt2YWx1ZV0pLFxuICAgICAgICAgICAgYnl0ZUFycmF5ID0gbmV3IFVpbnQ4QXJyYXkodHlwZUFycmF5LmJ1ZmZlciksXG4gICAgICAgICAgICBieXRlcyA9IFtdLCBpLCBieXRlVmlldztcblxuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgYXJyYXlUeXBlLkJZVEVTX1BFUl9FTEVNRU5UOyBpICs9IDEpXG4gICAgICAgICAgYnl0ZXMucHVzaChyKGJ5dGVBcnJheSwgaSkpO1xuXG4gICAgICAgIC8vIEZsaXAgaWYgbmVjZXNzYXJ5XG4gICAgICAgIGlmIChCb29sZWFuKGxpdHRsZUVuZGlhbikgPT09IEJvb2xlYW4oSVNfQklHX0VORElBTikpXG4gICAgICAgICAgYnl0ZXMucmV2ZXJzZSgpO1xuXG4gICAgICAgIC8vIFdyaXRlIHRoZW1cbiAgICAgICAgYnl0ZVZpZXcgPSBuZXcgVWludDhBcnJheSh0aGlzLmJ1ZmZlciwgYnl0ZU9mZnNldCwgYXJyYXlUeXBlLkJZVEVTX1BFUl9FTEVNRU5UKTtcbiAgICAgICAgYnl0ZVZpZXcuc2V0KGJ5dGVzKTtcbiAgICAgIH07XG4gICAgfVxuXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KERhdGFWaWV3LnByb3RvdHlwZSwgJ3NldFVpbnQ4Jywge3ZhbHVlOiBtYWtlU2V0dGVyKFVpbnQ4QXJyYXkpfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KERhdGFWaWV3LnByb3RvdHlwZSwgJ3NldEludDgnLCB7dmFsdWU6IG1ha2VTZXR0ZXIoSW50OEFycmF5KX0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShEYXRhVmlldy5wcm90b3R5cGUsICdzZXRVaW50MTYnLCB7dmFsdWU6IG1ha2VTZXR0ZXIoVWludDE2QXJyYXkpfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KERhdGFWaWV3LnByb3RvdHlwZSwgJ3NldEludDE2Jywge3ZhbHVlOiBtYWtlU2V0dGVyKEludDE2QXJyYXkpfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KERhdGFWaWV3LnByb3RvdHlwZSwgJ3NldFVpbnQzMicsIHt2YWx1ZTogbWFrZVNldHRlcihVaW50MzJBcnJheSl9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoRGF0YVZpZXcucHJvdG90eXBlLCAnc2V0SW50MzInLCB7dmFsdWU6IG1ha2VTZXR0ZXIoSW50MzJBcnJheSl9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoRGF0YVZpZXcucHJvdG90eXBlLCAnc2V0RmxvYXQzMicsIHt2YWx1ZTogbWFrZVNldHRlcihGbG9hdDMyQXJyYXkpfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KERhdGFWaWV3LnByb3RvdHlwZSwgJ3NldEZsb2F0NjQnLCB7dmFsdWU6IG1ha2VTZXR0ZXIoRmxvYXQ2NEFycmF5KX0pO1xuXG4gICAgZ2xvYmFsLkRhdGFWaWV3ID0gZ2xvYmFsLkRhdGFWaWV3IHx8IERhdGFWaWV3O1xuXG4gIH0oKSk7XG5cbn0od2luZG93KSk7XG4iLCIvKipcbiAqIEBmaWxlIHNyYy9jdHlwZS5qc1xuICogQG1vZHVsZSBjdHlwZVxuICovXG5cblwidXNlIHN0cmljdFwiO1xuLyoqXG4gKiBUZXN0cyBhbiB2YXJpYWJsZSBpcyBiZWluZyBhbiBKYXZhU2NyaXB0IG9iamVjdCB0eXBlXG4gKiBAcGFyYW0gIHtPYmplY3R9IG9iamVjdCBUZXN0aW5nIG9iamVjdCB2YWx1ZVxuICogQHJldHVybiB7Qm9vbGVhbn0gICAgICBJcyBhIHZhcmlhYmxlIGEgSmF2YVNjcmlwdCBvYmplY3RcbiAqL1xuZnVuY3Rpb24gaXNPYmplY3Qob2JqZWN0KVxue1xuICByZXR1cm4gKHR5cGVvZiBvYmplY3QgPT09IFwib2JqZWN0XCIpO1xufVxuLyoqXG4gKiBEb2VzIGRlZXAgY29weSBvZiBhbiBvYmplY3RcbiAqIEBwYXJhbSB7T2JqZWN0fSBkZXN0T2JqIERlc3RpbmF0aW9uIG9iamVjdFxuICogQHBhcmFtIHtPYmplY3R9IHNyY09iaiAgU291cmNlIG9iamVjdFxuICovXG5mdW5jdGlvbiBjb3B5T2JqZWN0KGRlc3RPYmosIHNyY09iailcbntcbiAgaWYoZGVzdE9iailcbiAge1xuICAgIGlmKCFpc09iamVjdChkZXN0T2JqKSB8fCBkZXN0T2JqID09PSBudWxsKVxuICAgIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIltDVHlwZV0gJ2NvcHlPYmplY3QnIGZ1bmN0aW9uOiBcIiArIFwiYSBkZXN0aW5hdGlvbiBvYmplY3QgJ1wiICsgZGVzdE9iai50b1N0cmluZygpICsgXCInIG11c3QgaGF2ZSBhbiBvYmplY3QgdHlwZVwiKTtcbiAgICB9XG5cbiAgICBmb3IobGV0IGl0IGluIHNyY09iailcbiAgICB7XG4gICAgICBpZighaXNPYmplY3Qoc3JjT2JqW2l0XSkgfHwgc3JjT2JqW2l0XSA9PT0gbnVsbClcbiAgICAgIHtcbiAgICAgICAgZGVzdE9ialtpdF0gPSBzcmNPYmpbaXRdO1xuICAgICAgfVxuICAgICAgaWYoaXNPYmplY3Qoc3JjT2JqW2l0XSkgJiYgc3JjT2JqW2l0XSAhPT0gbnVsbCAmJiBzcmNPYmpbaXRdLmxlbmd0aCAhPT0gdW5kZWZpbmVkKVxuICAgICAge1xuICAgICAgICBkZXN0T2JqW2l0XSA9IG5ldyB3aW5kb3dbc3JjT2JqW2l0XS5jb25zdHJ1Y3Rvci5uYW1lXShzcmNPYmpbaXRdLmxlbmd0aCk7XG4gICAgICAgIGFsbG9jYXRlQXJyYXkoZGVzdE9ialtpdF0sIHNyY09ialtpdF0pO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGlmKGlzT2JqZWN0KHNyY09ialtpdF0pICYmIHNyY09ialtpdF0gIT09IG51bGwpXG4gICAgICB7XG4gICAgICAgIGRlc3RPYmpbaXRdID0ge307XG4gICAgICAgIGNvcHlPYmplY3QoZGVzdE9ialtpdF0sIHNyY09ialtpdF0pO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICBlbHNlXG4gIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJbQ1R5cGVdICdjb3B5T2JqZWN0JyBmdW5jdGlvbjogc2V0IGEgbm9uLWVtcHR5IHBhcmFtZXRlcjogW29iamVjdF1cIik7XG4gIH1cbn1cblxuZnVuY3Rpb24gYWxsb2NhdGVBcnJheShkZXN0QXJyLCBzcmNBcnIpXG57XG4gIGxldCBsID0gc3JjQXJyLmxlbmd0aDtcblxuICBpZihkZXN0QXJyKVxuICB7XG4gICAgaWYoIWlzT2JqZWN0KGRlc3RBcnIpIHx8IGRlc3RBcnIubGVuZ3RoID09PSB1bmRlZmluZWQgfHwgZGVzdEFyciA9PT0gbnVsbClcbiAgICB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJbQ1R5cGVdICdhbGxvY2F0ZUFycmF5JyBmdW5jdGlvbjogXCIgKyBcImEgZGVzdGluYXRpb24gb2JqZWN0ICdcIiArIGRlc3RBcnIudG9TdHJpbmcoKSArIFwiJyBtdXN0IGhhdmUgYW4gYXJyYXkgdHlwZVwiKTtcbiAgICB9XG5cbiAgICBmb3IobGV0IGl0ID0gMDsgaXQgPCBsOyArK2l0KVxuICAgIHtcbiAgICAgIGlmKGlzT2JqZWN0KHNyY0FycltpdF0pICYmIHNyY0FycltpdF0gIT09IG51bGwgJiYgc3JjQXJyW2l0XS5sZW5ndGggIT09IHVuZGVmaW5lZClcbiAgICAgIHtcbiAgICAgICAgZGVzdEFycltpdF0gPSBuZXcgd2luZG93W3NyY0FycltpdF0uY29uc3RydWN0b3IubmFtZV0oc3JjQXJyW2l0XS5sZW5ndGgpO1xuICAgICAgICBhbGxvY2F0ZUFycmF5KGRlc3RBcnJbaXRdLCBzcmNBcnJbaXRdKTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBpZihpc09iamVjdChzcmNBcnJbaXRdKSAmJiBzcmNBcnJbaXRdICE9PSBudWxsKVxuICAgICAge1xuICAgICAgICBkZXN0QXJyW2l0XSA9IHt9O1xuICAgICAgICBjb3B5T2JqZWN0KGRlc3RBcnJbaXRdLCBzcmNBcnJbaXRdKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgZWxzZVxuICB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiW0NUeXBlXSAnYWxsb2NhdGVBcnJheScgZnVuY3Rpb246IHNldCBhIG5vbi1lbXB0eSBwYXJhbWV0ZXI6IFthcnJheV1cIik7XG4gIH1cbn1cblxuLyoqXG4gKiBHZXRzIGEgc2l6ZSBvZiBzb3VyY2Ugc3RydWN0dXJlXG4gKiBAcGFyYW0gIHtPYmplY3R9IHNyY1N0cnVjdCBTb3VyY2Ugc3RydWN0dXJlXG4gKiBAcGFyYW0gIHtOdW1iZXJ9IHRvdGFsU2l6ZSBUb3RhbCBzaXplIGluIGJ5dGVzXG4gKi9cbmZ1bmN0aW9uIGdldFN0cnVjdFNpemUoc3JjU3RydWN0LCB0b3RhbFNpemUpXG57XG4gIGxldCBpc0VtcHR5ID0gZmFsc2U7XG5cbiAgZm9yKGxldCBmaWVsZCBpbiBzcmNTdHJ1Y3QpXG4gIHtcbiAgICBsZXQgZmllbGRWYWx1ZSA9IHNyY1N0cnVjdFtmaWVsZF07XG4gICAgaXNFbXB0eSAgICAgICAgPSBmYWxzZTtcblxuICAgIGlmKCFpc09iamVjdChmaWVsZFZhbHVlKSAmJiAhZmllbGRWYWx1ZS5CWVRFU19QRVJfRUxFTUVOVCAmJiAhc3JjU3RydWN0LmJ5dGVMZW5ndGgpXG4gICAge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiW2N0eXBlXSAnc3RydWN0JyBmdW5jdGlvbjogaW52YWxpZCBzdHJ1Y3R1cmUgZmllbGQgJ1wiICsgZmllbGQgKyBcIjpcIiArIGZpZWxkVmFsdWUgKyBcIidcIik7XG4gICAgfVxuXG4gICAgaWYoIWZpZWxkVmFsdWUuQllURVNfUEVSX0VMRU1FTlQpXG4gICAge1xuICAgICAgaWYoZmllbGRWYWx1ZS5sZW5ndGgpXG4gICAgICB7XG4gICAgICAgIGZvcihsZXQgaSA9IDA7IGkgPCBmaWVsZFZhbHVlLmxlbmd0aDsgKytpKVxuICAgICAgICB7XG4gICAgICAgICAgaWYoaXNPYmplY3QoZmllbGRWYWx1ZVtpXSkpXG4gICAgICAgICAge1xuICAgICAgICAgICAgZ2V0U3RydWN0U2l6ZShmaWVsZFZhbHVlW2ldLCB0b3RhbFNpemUpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgZWxzZVxuICAgICAge1xuICAgICAgICBpZihpc09iamVjdChmaWVsZFZhbHVlKSlcbiAgICAgICAge1xuICAgICAgICAgIGdldFN0cnVjdFNpemUoZmllbGRWYWx1ZSwgdG90YWxTaXplKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICBlbHNlXG4gICAge1xuICAgICAgdG90YWxTaXplLnZhbHVlICs9IGZpZWxkVmFsdWUuYnl0ZUxlbmd0aDtcbiAgICB9XG4gIH1cblxuICBpZihpc0VtcHR5KVxuICB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiW2N0eXBlXSAnc3RydWN0JyBmdW5jdGlvbjogaW52YWxpZCBzdHJ1Y3R1cmUgZmllbGQgLSBhbiBlbXB0eSBvYmplY3RcIik7XG4gIH1cbn1cbi8qKlxuICogdWludDgoVWludDhBcnJheSkgdHlwZSBieXRlIGxlbmd0aFxuICogQHR5cGUge051bWJlcn1cbiAqL1xuZXhwb3J0IGNvbnN0IFVJTlQ4X1NJWkUgID0gVWludDhBcnJheS5CWVRFU19QRVJfRUxFTUVOVDtcbi8qKlxuICogdWludDE2KFVpbnQxNkFycmF5KSB0eXBlIGJ5dGUgbGVuZ3RoXG4gKiBAdHlwZSB7TnVtYmVyfVxuICovXG5leHBvcnQgY29uc3QgVUlOVDE2X1NJWkUgPSBVaW50MTZBcnJheS5CWVRFU19QRVJfRUxFTUVOVDtcbi8qKlxuICogdWludDMyKFVpbnQzMkFycmF5KSB0eXBlIGJ5dGUgbGVuZ3RoXG4gKiBAdHlwZSB7TnVtYmVyfVxuICovXG5leHBvcnQgY29uc3QgVUlOVDMyX1NJWkUgICA9IFVpbnQzMkFycmF5LkJZVEVTX1BFUl9FTEVNRU5UO1xuLyoqXG4gKiBpbnQ4KEludDhBcnJheSkgdHlwZSBieXRlIGxlbmd0aFxuICogQHR5cGUge051bWJlcn1cbiAqL1xuZXhwb3J0IGNvbnN0IElOVDhfU0laRSAgID0gSW50OEFycmF5LkJZVEVTX1BFUl9FTEVNRU5UO1xuLyoqXG4gKiBpbnQxNihJbnQxNkFycmF5KSB0eXBlIGJ5dGUgbGVuZ3RoXG4gKiBAdHlwZSB7TnVtYmVyfVxuICovXG5leHBvcnQgY29uc3QgSU5UMTZfU0laRSAgPSBJbnQxNkFycmF5LkJZVEVTX1BFUl9FTEVNRU5UO1xuLyoqXG4gKiBpbnQzMihVaW50MzJBcnJheSkgdHlwZSBieXRlIGxlbmd0aFxuICogQHR5cGUge051bWJlcn1cbiAqL1xuZXhwb3J0IGNvbnN0IElOVDMyX1NJWkUgICAgPSBJbnQzMkFycmF5LkJZVEVTX1BFUl9FTEVNRU5UO1xuLyoqXG4gKiBmbG9hdDMyKEZsb2F0MzJBcnJheSkgdHlwZSBieXRlIGxlbmd0aFxuICogQHR5cGUge051bWJlcn1cbiAqL1xuZXhwb3J0IGNvbnN0IEZMT0FUMzJfU0laRSAgPSBGbG9hdDMyQXJyYXkuQllURVNfUEVSX0VMRU1FTlQ7XG4vKipcbiAqIGZsb2F0NjQoRmxvYXQ2NEFycmF5KSB0eXBlIGJ5dGUgbGVuZ3RoXG4gKiBAdHlwZSB7TnVtYmVyfVxuICovXG5leHBvcnQgY29uc3QgRkxPQVQ2NF9TSVpFID0gRmxvYXQ2NEFycmF5LkJZVEVTX1BFUl9FTEVNRU5UO1xuLyoqXG4gKiBSZXR1cm5zIG5ldyAndW5zaWduZWQgY2hhciBhcnJheVtzaXplXScgQyBlcXVpdmFsZW50XG4gKiBAcGFyYW0gIHtOdW1iZXJ9IHNpemU9MSBBcnJheSBsZW5ndGhcbiAqIEByZXR1cm4ge1VpbnQ4QXJyYXl9ICAgICAgVW5zaWduZWQgOC1ieXRlIGludGVnZXIgYXJyYXlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHVpbnQ4KHNpemUgPSAxKVxue1xuICBsZXQgY3R5cGUgPSBuZXcgVWludDhBcnJheShzaXplKTtcbiAgcmV0dXJuIGN0eXBlO1xufVxuLyoqXG4gKiBSZXR1cm5zIG5ldyAndW5zaWduZWQgc2hvcnQgYXJyYXlbc2l6ZV0nIEMgZXF1aXZhbGVudFxuICogQHBhcmFtICB7TnVtYmVyfSBzaXplPTEgQXJyYXkgbGVuZ3RoXG4gKiBAcmV0dXJuIHtVaW50MTZBcnJheX0gICAgIFVuc2lnbmVkIDE2LWJ5dGUgaW50ZWdlciBhcnJheVxuICovXG5leHBvcnQgZnVuY3Rpb24gdWludDE2KHNpemUgPSAxKVxue1xuICBsZXQgY3R5cGUgPSBuZXcgVWludDE2QXJyYXkoc2l6ZSk7XG4gIHJldHVybiBjdHlwZTtcbn1cbi8qKlxuICogUmV0dXJucyBuZXcgJ3Vuc2lnbmVkIGludCBhcnJheVtzaXplXScgQyBlcXVpdmFsZW50XG4gKiBAcGFyYW0gIHtOdW1iZXJ9IHNpemU9MSBBcnJheSBsZW5ndGhcbiAqIEByZXR1cm4ge1VpbnQzMkFycmF5fSAgICAgVW5zaWduZWQgMzItYnl0ZSBpbnRlZ2VyIGFycmF5XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB1aW50MzIoc2l6ZSA9IDEpXG57XG4gIGxldCBjdHlwZSA9IG5ldyBVaW50MzJBcnJheShzaXplKTtcbiAgcmV0dXJuIGN0eXBlO1xufVxuLyoqXG4gKiBSZXR1cm5zIG5ldyAnY2hhciBhcnJheVtzaXplXScgQyBlcXVpdmFsZW50XG4gKiBAcGFyYW0gIHtOdW1iZXJ9IHNpemU9MSBBcnJheSBsZW5ndGhcbiAqIEByZXR1cm4ge0ludDhBcnJheX0gICAgICAgU2lnbmVkIDgtYnl0ZSBpbnRlZ2VyIGFycmF5XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpbnQ4KHNpemUgPSAxKVxue1xuICBsZXQgY3R5cGUgPSBuZXcgSW50OEFycmF5KHNpemUpO1xuICByZXR1cm4gY3R5cGU7XG59XG4vKipcbiAqIFJldHVybnMgbmV3ICdzaG9ydCBhcnJheVtzaXplXScgQyBlcXVpdmFsZW50XG4gKiBAcGFyYW0gIHtOdW1iZXJ9IHNpemU9MSBBcnJheSBsZW5ndGhcbiAqIEByZXR1cm4ge0ludDE2QXJyYXl9ICAgICAgU2lnbmVkIDE2LWJ5dGUgaW50ZWdlciBhcnJheVxuICovXG5leHBvcnQgZnVuY3Rpb24gaW50MTYoc2l6ZSA9IDEpXG57XG4gIGxldCBjdHlwZSA9IG5ldyBJbnQxNkFycmF5KHNpemUpO1xuICByZXR1cm4gY3R5cGU7XG59XG4vKipcbiAqIFJldHVybnMgbmV3ICdpbnQgYXJyYXlbc2l6ZV0nIEMgZXF1aXZhbGVudFxuICogQHBhcmFtICB7TnVtYmVyfSBzaXplPTEgQXJyYXkgbGVuZ3RoXG4gKiBAcmV0dXJuIHtJbnQzMkFycmF5fSAgICAgIFNpZ25lZCAzMi1ieXRlIGludGVnZXIgYXJyYXlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGludDMyKHNpemUgPSAxKVxue1xuICBsZXQgY3R5cGUgPSBuZXcgSW50MzJBcnJheShzaXplKTtcbiAgcmV0dXJuIGN0eXBlO1xufVxuLyoqXG4gKiBSZXR1cm5zIG5ldyAnZmxvYXQgYXJyYXlbc2l6ZV0nIEMgZXF1aXZhbGVudFxuICogQHBhcmFtICB7TnVtYmVyfSBzaXplPTEgQXJyYXkgbGVuZ3RoXG4gKiBAcmV0dXJuIHtGbG9hdDMyQXJyYXl9ICAgIFNpZ25lZCAzMi1ieXRlIGZsb2F0aW5nIHBvaW50IGFycmF5XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBmbG9hdDMyKHNpemUgPSAxKVxue1xuICBsZXQgY3R5cGUgPSBuZXcgRmxvYXQzMkFycmF5KHNpemUpO1xuICByZXR1cm4gY3R5cGU7XG59XG4vKipcbiAqIFJldHVybnMgbmV3ICdkb3VibGUgYXJyYXlbc2l6ZV0nIEMgZXF1aXZhbGVudFxuICogQHBhcmFtICB7TnVtYmVyfSBzaXplPTEgQXJyYXkgbGVuZ3RoXG4gKiBAcmV0dXJuIHtGbG9hdDY0QXJyYXl9ICAgIFNpZ25lZCA2NC1ieXRlIGZsb2F0aW5nIHBvaW50IGFycmF5XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBmbG9hdDY0KHNpemUgPSAxKVxue1xuICBsZXQgY3R5cGUgPSBuZXcgRmxvYXQ2NEFycmF5KHNpemUpO1xuICByZXR1cm4gY3R5cGU7XG59XG4vKipcbiAqIFJldHVybnMgbmV3ICdzdHJ1Y3Qgc1tzaXplXScgQyBlcXVpdmFsZW50IHdpdGggJ2J5dGVMZW5ndGgnIGZpZWxkIGlzIGEgdG90YWwgc2l6ZSBvZiBzdHJ1Y3R1cmVcbiAqIEBwYXJhbSAge09iamVjdH0gc3JjU3RydWN0IEVtcHR5IHNvdXJjZSBvYmplY3RcbiAqIEBwYXJhbSAge051bWJlcn0gc2l6ZT0xICAgIEFycmF5IGxlbmd0aFxuICogQHJldHVybiB7T2JqZWN0fSAgICAgICAgICAgT2JqZWN0IHN0cnVjdHVyZSB3aXRoIHR5cGVkIGZpZWxkc1xuICovXG5leHBvcnQgZnVuY3Rpb24gc3RydWN0KHNyY1N0cnVjdCwgc2l6ZSA9IDEpXG57XG4gIGlmKCFpc09iamVjdChzcmNTdHJ1Y3QpIHx8ICh0eXBlb2Ygc2l6ZSAhPT0gXCJudW1iZXJcIikpXG4gIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJbY3R5cGVdICdzdHJ1Y3QnIGZ1bmN0aW9uOiBpbnZhbGlkIGFyZ3VtZW50cyAoT2JqZWN0IHNyY1N0cnVjdCwgTnVtYmVyIHNpemUpXCIpO1xuICB9XG5cbiAgbGV0IHRvdGFsU2l6ZSA9IHsgdmFsdWU6IDAgfTtcblxuICBnZXRTdHJ1Y3RTaXplKHNyY1N0cnVjdCwgdG90YWxTaXplKTtcblxuICBpZihzaXplID4gMSlcbiAge1xuICAgIGxldCBkc3RTdHJ1Y3RzID0gW107XG4gICAgZm9yKGxldCBpID0gMDsgaSA8IHNpemU7ICsraSlcbiAgICB7XG4gICAgICBkc3RTdHJ1Y3RzW2ldID0ge307XG4gICAgICBjb3B5T2JqZWN0KGRzdFN0cnVjdHNbaV0sIHNyY1N0cnVjdCk7XG5cbiAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShkc3RTdHJ1Y3RzW2ldLCBcImJ5dGVMZW5ndGhcIixcbiAgICAgIHtcbiAgICAgICAgdmFsdWUgICAgICAgOiB0b3RhbFNpemUudmFsdWUsXG4gICAgICAgIHdyaXRhYmxlICAgIDogZmFsc2UsXG4gICAgICAgIGVudW1lcmFibGUgIDogdHJ1ZSxcbiAgICAgICAgY29uZmlndXJhYmxlOiBmYWxzZVxuICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiBkc3RTdHJ1Y3RzO1xuICB9XG4gIGVsc2VcbiAge1xuICAgIGxldCBkc3RTdHJ1Y3QgPSB7fTtcbiAgICBjb3B5T2JqZWN0KGRzdFN0cnVjdCwgc3JjU3RydWN0KTtcblxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShkc3RTdHJ1Y3QsIFwiYnl0ZUxlbmd0aFwiLFxuICAgIHtcbiAgICAgIHZhbHVlICAgICAgIDogdG90YWxTaXplLnZhbHVlLFxuICAgICAgd3JpdGFibGUgICAgOiBmYWxzZSxcbiAgICAgIGVudW1lcmFibGUgIDogdHJ1ZSxcbiAgICAgIGNvbmZpZ3VyYWJsZTogZmFsc2VcbiAgICB9KTtcblxuICAgIHJldHVybiBkc3RTdHJ1Y3Q7XG4gIH1cblxuICByZXR1cm4gbnVsbDtcbn1cbi8qKlxuICogU2V0cyBkYXRhIGZyb20gYSBzb3VyY2UgYnVmZmVyIHRvIGEgZGVzdGluYXRpb24gc3RydWN0dXJlXG4gKiBAcGFyYW0ge09iamVjdH0gICAgICBkc3RTdHJ1Y3QgICAgRGVzdGluYXRpb24gc3RydWN0dXJlXG4gKiBAcGFyYW0ge0FycmF5QnVmZmVyfSBzcmNCdWZmZXIgICAgU291cmNlIGJ1ZmZlclxuICogQHBhcmFtIHtOdW1iZXJ9ICAgICAgdG90YWxPZmZzZXQgIFRvdGFsIG9mZnNldCBpbiBieXRlc1xuICogQHBhcmFtIHtCb29sZWFufSAgICAgbGl0dGxlRW5kaWFuIExpdHRsZS1lbmRpYW4gYnl0ZXMgb3JkZXIgZmxhZ1xuICovXG5mdW5jdGlvbiBzZXRCdWZmZXJUb1N0cnVjdChkc3RTdHJ1Y3QsIHNyY0J1ZmZlciwgdG90YWxPZmZzZXQsIGxpdHRsZUVuZGlhbilcbntcbiAgZm9yKGxldCBmaWVsZCBpbiBkc3RTdHJ1Y3QpXG4gIHtcbiAgICBsZXQgZmllbGRWYWx1ZSA9IGRzdFN0cnVjdFtmaWVsZF07XG5cbiAgICBpZihmaWVsZFZhbHVlLmNvbnN0cnVjdG9yLm5hbWUgPT09IFwiQXJyYXlcIilcbiAgICB7XG4gICAgICBsZXQgbCA9IGZpZWxkVmFsdWUubGVuZ3RoO1xuXG4gICAgICBmb3IobGV0IGkgPSAwOyBpIDwgbDsgKytpKVxuICAgICAge1xuICAgICAgICBzZXRCdWZmZXJUb1N0cnVjdChmaWVsZFZhbHVlW2ldLCBzcmNCdWZmZXIsIHRvdGFsT2Zmc2V0LCBsaXR0bGVFbmRpYW4pO1xuICAgICAgfVxuICAgIH1cbiAgICBlbHNlXG4gICAge1xuICAgICAgaWYoZmllbGRWYWx1ZS5jb25zdHJ1Y3Rvci5uYW1lID09PSBcIk9iamVjdFwiKVxuICAgICAge1xuICAgICAgICBzZXRCdWZmZXJUb1N0cnVjdChmaWVsZFZhbHVlLCBzcmNCdWZmZXIsIHRvdGFsT2Zmc2V0LCBsaXR0bGVFbmRpYW4pO1xuICAgICAgfVxuICAgICAgZWxzZVxuICAgICAge1xuICAgICAgICBsZXQgbCA9IGZpZWxkVmFsdWUubGVuZ3RoO1xuXG4gICAgICAgIHN3aXRjaChmaWVsZFZhbHVlLmNvbnN0cnVjdG9yLm5hbWUpXG4gICAgICAgIHtcbiAgICAgICAgICBjYXNlIFwiVWludDhBcnJheVwiOlxuICAgICAgICAgICAgZm9yKGxldCBpID0gMDsgaSA8IGw7ICsraSlcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgZmllbGRWYWx1ZVtpXSA9IHNyY0J1ZmZlci5nZXRVaW50OCh0b3RhbE9mZnNldC52YWx1ZSwgbGl0dGxlRW5kaWFuICYmIHRydWUpO1xuICAgICAgICAgICAgICB0b3RhbE9mZnNldC52YWx1ZSArPSBmaWVsZFZhbHVlLkJZVEVTX1BFUl9FTEVNRU5UO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgY2FzZSBcIlVpbnQxNkFycmF5XCI6XG4gICAgICAgICAgICBmb3IobGV0IGkgPSAwOyBpIDwgbDsgKytpKVxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBmaWVsZFZhbHVlW2ldID0gc3JjQnVmZmVyLmdldFVpbnQxNih0b3RhbE9mZnNldC52YWx1ZSwgbGl0dGxlRW5kaWFuICYmIHRydWUpO1xuICAgICAgICAgICAgICB0b3RhbE9mZnNldC52YWx1ZSArPSBmaWVsZFZhbHVlLkJZVEVTX1BFUl9FTEVNRU5UO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgY2FzZSBcIlVpbnQzMkFycmF5XCI6XG4gICAgICAgICAgICBmb3IobGV0IGkgPSAwOyBpIDwgbDsgKytpKVxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBmaWVsZFZhbHVlW2ldID0gc3JjQnVmZmVyLmdldFVpbnQzMih0b3RhbE9mZnNldC52YWx1ZSwgbGl0dGxlRW5kaWFuICYmIHRydWUpO1xuICAgICAgICAgICAgICB0b3RhbE9mZnNldC52YWx1ZSArPSBmaWVsZFZhbHVlLkJZVEVTX1BFUl9FTEVNRU5UO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgY2FzZSBcIkludDhBcnJheVwiOlxuICAgICAgICAgICAgZm9yKGxldCBpID0gMDsgaSA8IGw7ICsraSlcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgZmllbGRWYWx1ZVtpXSA9IHNyY0J1ZmZlci5nZXRJbnQ4KHRvdGFsT2Zmc2V0LnZhbHVlLCBsaXR0bGVFbmRpYW4gJiYgdHJ1ZSk7XG4gICAgICAgICAgICAgIHRvdGFsT2Zmc2V0LnZhbHVlICs9IGZpZWxkVmFsdWUuQllURVNfUEVSX0VMRU1FTlQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICBjYXNlIFwiSW50MTZBcnJheVwiOlxuICAgICAgICAgICAgZm9yKGxldCBpID0gMDsgaSA8IGw7ICsraSlcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgZmllbGRWYWx1ZVtpXSA9IHNyY0J1ZmZlci5nZXRJbnQxNih0b3RhbE9mZnNldC52YWx1ZSwgbGl0dGxlRW5kaWFuICYmIHRydWUpO1xuICAgICAgICAgICAgICB0b3RhbE9mZnNldC52YWx1ZSArPSBmaWVsZFZhbHVlLkJZVEVTX1BFUl9FTEVNRU5UO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgY2FzZSBcIkludDMyQXJyYXlcIjpcbiAgICAgICAgICAgIGZvcihsZXQgaSA9IDA7IGkgPCBsOyArK2kpXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIGZpZWxkVmFsdWVbaV0gPSBzcmNCdWZmZXIuZ2V0SW50MzIodG90YWxPZmZzZXQudmFsdWUsIGxpdHRsZUVuZGlhbiAmJiB0cnVlKTtcbiAgICAgICAgICAgICAgdG90YWxPZmZzZXQudmFsdWUgKz0gZmllbGRWYWx1ZS5CWVRFU19QRVJfRUxFTUVOVDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICBicmVhaztcblxuICAgICAgICAgIGNhc2UgXCJGbG9hdDMyQXJyYXlcIjpcbiAgICAgICAgICAgIGZvcihsZXQgaSA9IDA7IGkgPCBsOyArK2kpXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIGZpZWxkVmFsdWVbaV0gPSBzcmNCdWZmZXIuZ2V0RmxvYXQzMih0b3RhbE9mZnNldC52YWx1ZSwgbGl0dGxlRW5kaWFuICYmIHRydWUpO1xuICAgICAgICAgICAgICB0b3RhbE9mZnNldC52YWx1ZSArPSBmaWVsZFZhbHVlLkJZVEVTX1BFUl9FTEVNRU5UO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgY2FzZSBcIkZsb2F0NjRBcnJheVwiOlxuICAgICAgICAgICAgZm9yKGxldCBpID0gMDsgaSA8IGw7ICsraSlcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgZmllbGRWYWx1ZVtpXSA9IHNyY0J1ZmZlci5nZXRGbG9hdDY0KHRvdGFsT2Zmc2V0LnZhbHVlLCBsaXR0bGVFbmRpYW4gJiYgdHJ1ZSk7XG4gICAgICAgICAgICAgIHRvdGFsT2Zmc2V0LnZhbHVlICs9IGZpZWxkVmFsdWUuQllURVNfUEVSX0VMRU1FTlQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cbi8qKlxuICogU2V0cyBkYXRhIGZyb20gc291cmNlIHN0cnVjdHVyZSB0byBkZXN0aW5hdGlvbiBidWZmZXJcbiAqIEBwYXJhbSAge0FycmF5QnVmZmVyfSBkc3RCdWZmZXIgICAgRGVzdGluYXRpb24gYnVmZmVyXG4gKiBAcGFyYW0gIHtPYmplY3R9ICAgICAgc3JjU3RydWN0ICAgIFNvdXJjZSBzdHJ1Y3R1cmVcbiAqIEBwYXJhbSAge051bWJlcn0gICAgICB0b3RhbE9mZnNldCAgVG90YWwgb2Zmc2V0IGluIGJ5dGVzXG4gKiBAcGFyYW0gIHtCb29sZWFufSAgICAgbGl0dGxlRW5kaWFuIExpdHRsZS1lbmRpYW4gYnl0ZXMgb3JkZXIgZmxhZ1xuICovXG5mdW5jdGlvbiBzZXRTdHJ1Y3RUb0J1ZmZlcihkc3RCdWZmZXIsIHNyY1N0cnVjdCwgdG90YWxPZmZzZXQsIGxpdHRsZUVuZGlhbilcbntcbiAgZm9yKGxldCBmaWVsZCBpbiBzcmNTdHJ1Y3QpXG4gIHtcbiAgICBsZXQgZmllbGRWYWx1ZSA9IHNyY1N0cnVjdFtmaWVsZF07XG5cbiAgICBpZihmaWVsZFZhbHVlLmNvbnN0cnVjdG9yLm5hbWUgPT09IFwiQXJyYXlcIilcbiAgICB7XG4gICAgICBsZXQgbCA9IGZpZWxkVmFsdWUubGVuZ3RoO1xuXG4gICAgICBmb3IobGV0IGkgPSAwOyBpIDwgbDsgKytpKVxuICAgICAge1xuICAgICAgICBzZXRTdHJ1Y3RUb0J1ZmZlcihkc3RCdWZmZXIsIGZpZWxkVmFsdWVbaV0sIHRvdGFsT2Zmc2V0LCBsaXR0bGVFbmRpYW4pO1xuICAgICAgfVxuICAgIH1cbiAgICBlbHNlXG4gICAge1xuICAgICAgaWYoZmllbGRWYWx1ZS5jb25zdHJ1Y3Rvci5uYW1lID09PSBcIk9iamVjdFwiKVxuICAgICAge1xuICAgICAgICBzZXRTdHJ1Y3RUb0J1ZmZlcihkc3RCdWZmZXIsIGZpZWxkVmFsdWUsIHRvdGFsT2Zmc2V0LCBsaXR0bGVFbmRpYW4pO1xuICAgICAgfVxuICAgICAgZWxzZVxuICAgICAge1xuICAgICAgICBsZXQgbCA9IGZpZWxkVmFsdWUubGVuZ3RoO1xuXG4gICAgICAgIHN3aXRjaChmaWVsZFZhbHVlLmNvbnN0cnVjdG9yLm5hbWUpXG4gICAgICAgIHtcbiAgICAgICAgICBjYXNlIFwiVWludDhBcnJheVwiOlxuICAgICAgICAgICAgZm9yKGxldCBpID0gMDsgaSA8IGw7ICsraSlcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgZHN0QnVmZmVyLnNldFVpbnQ4KHRvdGFsT2Zmc2V0LnZhbHVlLCBmaWVsZFZhbHVlW2ldLCBsaXR0bGVFbmRpYW4gJiYgdHJ1ZSk7XG4gICAgICAgICAgICAgIHRvdGFsT2Zmc2V0LnZhbHVlICs9IGZpZWxkVmFsdWUuQllURVNfUEVSX0VMRU1FTlQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICBjYXNlIFwiVWludDE2QXJyYXlcIjpcbiAgICAgICAgICAgIGZvcihsZXQgaSA9IDA7IGkgPCBsOyArK2kpXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIGRzdEJ1ZmZlci5zZXRVaW50MTYodG90YWxPZmZzZXQudmFsdWUsIGZpZWxkVmFsdWVbaV0sIGxpdHRsZUVuZGlhbiAmJiB0cnVlKTtcbiAgICAgICAgICAgICAgdG90YWxPZmZzZXQudmFsdWUgKz0gZmllbGRWYWx1ZS5CWVRFU19QRVJfRUxFTUVOVDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICBicmVhaztcblxuICAgICAgICAgIGNhc2UgXCJVaW50MzJBcnJheVwiOlxuICAgICAgICAgICAgZm9yKGxldCBpID0gMDsgaSA8IGw7ICsraSlcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgZHN0QnVmZmVyLnNldFVpbnQzMih0b3RhbE9mZnNldC52YWx1ZSwgZmllbGRWYWx1ZVtpXSwgbGl0dGxlRW5kaWFuICYmIHRydWUpO1xuICAgICAgICAgICAgICB0b3RhbE9mZnNldC52YWx1ZSArPSBmaWVsZFZhbHVlLkJZVEVTX1BFUl9FTEVNRU5UO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgY2FzZSBcIkludDhBcnJheVwiOlxuICAgICAgICAgICAgZm9yKGxldCBpID0gMDsgaSA8IGw7ICsraSlcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgZHN0QnVmZmVyLnNldEludDgodG90YWxPZmZzZXQudmFsdWUsIGZpZWxkVmFsdWVbaV0sIGxpdHRsZUVuZGlhbiAmJiB0cnVlKTtcbiAgICAgICAgICAgICAgdG90YWxPZmZzZXQudmFsdWUgKz0gZmllbGRWYWx1ZS5CWVRFU19QRVJfRUxFTUVOVDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICBicmVhaztcblxuICAgICAgICAgIGNhc2UgXCJJbnQxNkFycmF5XCI6XG4gICAgICAgICAgICBmb3IobGV0IGkgPSAwOyBpIDwgbDsgKytpKVxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBkc3RCdWZmZXIuc2V0SW50MTYodG90YWxPZmZzZXQudmFsdWUsIGZpZWxkVmFsdWVbaV0sIGxpdHRsZUVuZGlhbiAmJiB0cnVlKTtcbiAgICAgICAgICAgICAgdG90YWxPZmZzZXQudmFsdWUgKz0gZmllbGRWYWx1ZS5CWVRFU19QRVJfRUxFTUVOVDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICBicmVhaztcblxuICAgICAgICAgIGNhc2UgXCJJbnQzMkFycmF5XCI6XG4gICAgICAgICAgICBmb3IobGV0IGkgPSAwOyBpIDwgbDsgKytpKVxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBkc3RCdWZmZXIuc2V0SW50MzIodG90YWxPZmZzZXQudmFsdWUsIGZpZWxkVmFsdWVbaV0sIGxpdHRsZUVuZGlhbiAmJiB0cnVlKTtcbiAgICAgICAgICAgICAgdG90YWxPZmZzZXQudmFsdWUgKz0gZmllbGRWYWx1ZS5CWVRFU19QRVJfRUxFTUVOVDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICBicmVhaztcblxuICAgICAgICAgIGNhc2UgXCJGbG9hdDMyQXJyYXlcIjpcbiAgICAgICAgICAgIGZvcihsZXQgaSA9IDA7IGkgPCBsOyArK2kpXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIGRzdEJ1ZmZlci5zZXRGbG9hdDMyKHRvdGFsT2Zmc2V0LnZhbHVlLCBmaWVsZFZhbHVlW2ldLCBsaXR0bGVFbmRpYW4gJiYgdHJ1ZSk7XG4gICAgICAgICAgICAgIHRvdGFsT2Zmc2V0LnZhbHVlICs9IGZpZWxkVmFsdWUuQllURVNfUEVSX0VMRU1FTlQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICBjYXNlIFwiRmxvYXQ2NEFycmF5XCI6XG4gICAgICAgICAgICBmb3IobGV0IGkgPSAwOyBpIDwgbDsgKytpKVxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBkc3RCdWZmZXIuc2V0RmxvYXQ2NCh0b3RhbE9mZnNldC52YWx1ZSwgZmllbGRWYWx1ZVtpXSwgbGl0dGxlRW5kaWFuICYmIHRydWUpO1xuICAgICAgICAgICAgICB0b3RhbE9mZnNldC52YWx1ZSArPSBmaWVsZFZhbHVlLkJZVEVTX1BFUl9FTEVNRU5UO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG59XG4vKipcbiAqIENvcGllcyBhIHNvdXJjZSBidWZmZXIgdG8gYSBkZXN0aW5hdGlvbiBzdHJ1Y3R1cmVcbiAqIEBwYXJhbSAge0FycmF5QnVmZmVyfSAgICAgc3JjQnVmZmVyICAgICAgICAgU291cmNlIGJ1ZmZlclxuICogQHBhcmFtICB7T2JqZWN0fE9iamVjdFtdfSBkc3RTdHJ1Y3QgICAgICAgICBEZXN0aW5hdGlvbiBzdHJ1Y3R1cmUgb3IgYXJyYXkgb2Ygc3RydWN0dXJlc1xuICogQHBhcmFtICB7TnVtYmVyfSAgICAgICAgICBieXRlT2Zmc2V0PTAgICAgICBCeXRlIG9mZnNldCBmcm9tIGEgc3RhcnQgb2YgYSBzb3VyY2UgYnVmZmVyXG4gKiBAcGFyYW0gIHtCb29sZWFufSAgICAgICAgIGxpdHRsZUVuZGlhbj10cnVlIExpdHRsZS1lbmRpYW4gYnl0ZXMgb3JkZXIgZmxhZ1xuICogQHJldHVybiB7T2JqZWN0fSAgICAgICAgICAgICAgICAgICAgICAgICAgICBEZXN0aW5hdGlvbiBzdHJ1Y3R1cmUgcmVmZXJlbmNlXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBidWZmZXJUb1N0cnVjdChzcmNCdWZmZXIsIGRzdFN0cnVjdCwgYnl0ZU9mZnNldCA9IDAsIGxpdHRsZUVuZGlhbiA9IHRydWUpXG57XG4gIGlmKCFpc09iamVjdChkc3RTdHJ1Y3QpIHx8ICEoc3JjQnVmZmVyIGluc3RhbmNlb2YgQXJyYXlCdWZmZXIpIHx8ICh0eXBlb2YgYnl0ZU9mZnNldCAhPT0gXCJudW1iZXJcIikgfHwgKHR5cGVvZiBsaXR0bGVFbmRpYW4gIT09IFwiYm9vbGVhblwiKSlcbiAge1xuICAgIHRocm93IG5ldyBFcnJvcihcIltjdHlwZV0gJ2J1ZmZlclRvU3RydWN0JyBmdW5jdGlvbjogaW52YWxpZCBhcmd1bWVudHMgaW4gdGhlIHNpZ25hdHVyZSAoQXJyYXlCdWZmZXIgc3JjQnVmZmVyLCBPYmplY3QgZHN0U3RydWN0LCBOdW1iZXIgYnl0ZU9mZnNldCA9IDAsIEJvb2xlYW4gbGl0dGxlRW5kaWFuID0gdHJ1ZSlcIik7XG4gIH1cblxuICBsZXQgc3JjQnVmO1xuXG4gIHRyeVxuICB7XG4gICAgc3JjQnVmID0gbmV3IERhdGFWaWV3KHNyY0J1ZmZlciwgYnl0ZU9mZnNldCk7XG4gIH1cbiAgY2F0Y2goZSlcbiAge1xuICAgIGNvbnNvbGUubG9nKGUpO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGxldCB0b3RhbE9mZnNldCAgPSB7IHZhbHVlOiAwIH07XG5cbiAgc2V0QnVmZmVyVG9TdHJ1Y3QoZHN0U3RydWN0LCBzcmNCdWYsIHRvdGFsT2Zmc2V0LCBsaXR0bGVFbmRpYW4pO1xuXG4gIHJldHVybiBkc3RTdHJ1Y3Q7XG59XG4vKipcbiAqIENvcGllcyBhIHNvdXJjZSBzdHJ1Y3R1cmUgdG8gYSBkZXN0aW5hdGlvbiBidWZmZXJcbiAqIEBwYXJhbSAge09iamVjdHxPYmplY3RbXX0gc3JjU3RydWN0ICAgICAgU291cmNlIHN0cnVjdHVyZSBvciBhcnJheSBvZiBzdHJ1Y3R1cmVzXG4gKiBAcGFyYW0gIHtBcnJheUJ1ZmZlcn0gZXhpc3RlZEJ1ZmZlcj1udWxsIEV4aXN0ZWQgYnVmZmVyXG4gKiBAcGFyYW0gIHtOdW1iZXJ9IGJ5dGVPZmZzZXQ9MCAgICAgICAgICAgIEJ5dGUgb2Zmc2V0IGZyb20gYSBzdGFydCBvZiBhIHNvdXJjZSBidWZmZXJcbiAqIEBwYXJhbSAge051bWJlcn0gbGl0dGxlRW5kaWFuPXRydWUgICAgICAgTGl0dGxlLWVuZGlhbiBieXRlcyBvcmRlciBmbGFnXG4gKiBAcmV0dXJuIHtBcnJheUJ1ZmZlcn0gICAgICAgICAgICAgICAgICAgIERlc3RpbmF0aW9uIGJ1ZmZlciByZWZlcmVuY2VcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHN0cnVjdFRvQnVmZmVyKHNyY1N0cnVjdCwgZXhpc3RlZEJ1ZmZlciA9IG51bGwsIGJ5dGVPZmZzZXQgPSAwLCBsaXR0bGVFbmRpYW4gPSB0cnVlKVxue1xuICBpZighaXNPYmplY3Qoc3JjU3RydWN0KSB8fFxuICAgICAoIShleGlzdGVkQnVmZmVyIGluc3RhbmNlb2YgQXJyYXlCdWZmZXIpICYmIGV4aXN0ZWRCdWZmZXIgIT09IG51bGwpIHx8XG4gICAgICh0eXBlb2YgYnl0ZU9mZnNldCAhPT0gXCJudW1iZXJcIikgfHxcbiAgICAgKHR5cGVvZiBsaXR0bGVFbmRpYW4gIT09IFwiYm9vbGVhblwiKSlcbiAge1xuICAgIHRocm93IG5ldyBFcnJvcihcIltjdHlwZV0gJ3N0cnVjdFRvQnVmZmVyJyBmdW5jdGlvbjogaW52YWxpZCBhcmd1bWVudHMgaW4gdGhlIHNpZ25hdHVyZSAoT2JqZWN0IHNyY1N0cnVjdCwgQXJyYXlCdWZmZXIgZXhpc3RlZEJ1ZmZlciA9IG51bGwsIE51bWJlciBieXRlT2Zmc2V0ID0gMCwgQm9vbGVhbiBsaXR0bGVFbmRpYW4gPSB0cnVlKVwiKTtcbiAgfVxuXG4gIGxldCB0b3RhbE9mZnNldCA9IHsgdmFsdWU6IDAgfTtcbiAgbGV0IGFycmF5QnVmZmVyLCBkc3RCdWZmZXI7XG5cbiAgaWYoZXhpc3RlZEJ1ZmZlciA9PT0gbnVsbClcbiAge1xuICAgIGlmKHNyY1N0cnVjdCBpbnN0YW5jZW9mIEFycmF5KVxuICAgIHtcbiAgICAgIGxldCBsID0gc3JjU3RydWN0Lmxlbmd0aDtcblxuICAgICAgYXJyYXlCdWZmZXIgPSBuZXcgQXJyYXlCdWZmZXIoc3JjU3RydWN0WzBdLmJ5dGVMZW5ndGggKiBsKTtcbiAgICAgIGRzdEJ1ZmZlciAgID0gbmV3IERhdGFWaWV3ICAgKGFycmF5QnVmZmVyKTtcbiAgICB9XG4gICAgZWxzZVxuICAgIHtcbiAgICAgIGFycmF5QnVmZmVyID0gbmV3IEFycmF5QnVmZmVyKHNyY1N0cnVjdC5ieXRlTGVuZ3RoKTtcbiAgICAgIGRzdEJ1ZmZlciAgID0gbmV3IERhdGFWaWV3ICAgKGFycmF5QnVmZmVyKTtcbiAgICB9XG5cbiAgICBzZXRTdHJ1Y3RUb0J1ZmZlcihkc3RCdWZmZXIsIHNyY1N0cnVjdCwgdG90YWxPZmZzZXQsIGxpdHRsZUVuZGlhbik7XG4gIH1cbiAgZWxzZVxuICB7XG4gICAgZHN0QnVmZmVyID0gbmV3IERhdGFWaWV3KGV4aXN0ZWRCdWZmZXIsIGJ5dGVPZmZzZXQpO1xuXG4gICAgc2V0U3RydWN0VG9CdWZmZXIoZHN0QnVmZmVyLCBzcmNTdHJ1Y3QsIHRvdGFsT2Zmc2V0LCBsaXR0bGVFbmRpYW4pO1xuICB9XG5cbiAgcmV0dXJuIGRzdEJ1ZmZlci5idWZmZXI7XG59XG4vKipcbiAqIFNldHMgZGF0YSBmcm9tIGEgc291cmNlIHR5cGVkIGFycmF5IHRvIGEgZGVzdGluYXRpb24gYnVmZmVyXG4gKiBAcGFyYW0ge0FycmF5fSBzcmNBcnJheSAgICAgICAgU291cmNlIHR5cGVkIGFycmF5XG4gKiBAcGFyYW0ge0FycmF5QnVmZmVyfSBkc3RCdWZmZXIgRGVzdGluYXRpb24gYnVmZmVyXG4gKiBAcGFyYW0ge051bWJlcn0gbGVuZ3RoICAgICAgICAgQnl0ZSBsZW5ndGggZm9yIGNvcHlpbmcgZnJvbSBhIHNvdXJjZSB0eXBlZCBhcnJheVxuICogQHBhcmFtIHtOdW1iZXJ9IGJ5dGVPZmZzZXQgICAgIEJ5dGUgb2Zmc2V0IGZyb20gYSBzdGFydCBvZiBhIHNvdXJjZSB0eXBlZCBhcnJheVxuICogQHBhcmFtIHtOdW1iZXJ9IHRvdGFsT2Zmc2V0ICAgIFRvdGFsIG9mZnNldCBpbiBieXRlc1xuICogQHBhcmFtIHtCb29sZWFufSBsaXR0bGVFbmRpYW4gIExpdHRsZS1lbmRpYW4gYnl0ZXMgb3JkZXIgZmxhZ1xuICovXG5mdW5jdGlvbiBzZXRBcnJheVRvQnVmZmVyKHNyY0FycmF5LCBkc3RCdWZmZXIsIGxlbmd0aCwgdG90YWxPZmZzZXQsIGxpdHRsZUVuZGlhbilcbntcbiAgbGV0IGw7XG4gIGxldCBpID0gdG90YWxPZmZzZXQudmFsdWUgLyBzcmNBcnJheS5CWVRFU19QRVJfRUxFTUVOVDtcblxuICBpZihpc05hTihsZW5ndGgpKVxuICB7XG4gICAgaWYoZHN0QnVmZmVyLmJ5dGVMZW5ndGggPiBzcmNBcnJheS5ieXRlTGVuZ3RoIHx8XG4gICAgICAgZHN0QnVmZmVyLmJ5dGVMZW5ndGggPT09IHNyY0FycmF5LmJ5dGVMZW5ndGgpXG4gICAge1xuICAgICAgbCA9IHNyY0FycmF5Lmxlbmd0aDtcbiAgICB9XG4gICAgZWxzZVxuICAgIHtcbiAgICAgIGwgPSBkc3RCdWZmZXIuYnl0ZUxlbmd0aCAvIHNyY0FycmF5LkJZVEVTX1BFUl9FTEVNRU5UO1xuICAgIH1cbiAgfVxuICBlbHNlXG4gIHtcbiAgICBsID0gbGVuZ3RoIC8gc3JjQXJyYXkuQllURVNfUEVSX0VMRU1FTlQgKyB0b3RhbE9mZnNldC52YWx1ZSAvIHNyY0FycmF5LkJZVEVTX1BFUl9FTEVNRU5UO1xuICB9XG5cbiAgc3dpdGNoKHNyY0FycmF5LmNvbnN0cnVjdG9yLm5hbWUpXG4gIHtcbiAgICBjYXNlIFwiVWludDhBcnJheVwiOlxuICAgICAgZm9yKDsgaSA8IGw7ICsraSlcbiAgICAgIHtcbiAgICAgICAgZHN0QnVmZmVyLnNldFVpbnQ4KHRvdGFsT2Zmc2V0LnZhbHVlLCBzcmNBcnJheVtpXSwgbGl0dGxlRW5kaWFuICYmIHRydWUpO1xuICAgICAgICB0b3RhbE9mZnNldC52YWx1ZSArPSBzcmNBcnJheS5CWVRFU19QRVJfRUxFTUVOVDtcbiAgICAgIH1cbiAgICBicmVhaztcblxuICAgIGNhc2UgXCJVaW50MTZBcnJheVwiOlxuICAgICAgZm9yKDsgaSA8IGw7ICsraSlcbiAgICAgIHtcbiAgICAgICAgZHN0QnVmZmVyLnNldFVpbnQxNih0b3RhbE9mZnNldC52YWx1ZSwgc3JjQXJyYXlbaV0sIGxpdHRsZUVuZGlhbiAmJiB0cnVlKTtcbiAgICAgICAgdG90YWxPZmZzZXQudmFsdWUgKz0gc3JjQXJyYXkuQllURVNfUEVSX0VMRU1FTlQ7XG4gICAgICB9XG4gICAgYnJlYWs7XG5cbiAgICBjYXNlIFwiVWludDMyQXJyYXlcIjpcbiAgICAgIGZvcig7IGkgPCBsOyArK2kpXG4gICAgICB7XG4gICAgICAgIGRzdEJ1ZmZlci5zZXRVaW50MzIodG90YWxPZmZzZXQudmFsdWUsIHNyY0FycmF5W2ldLCBsaXR0bGVFbmRpYW4gJiYgdHJ1ZSk7XG4gICAgICAgIHRvdGFsT2Zmc2V0LnZhbHVlICs9IHNyY0FycmF5LkJZVEVTX1BFUl9FTEVNRU5UO1xuICAgICAgfVxuICAgIGJyZWFrO1xuXG4gICAgY2FzZSBcIkludDhBcnJheVwiOlxuICAgICAgZm9yKDsgaSA8IGw7ICsraSlcbiAgICAgIHtcbiAgICAgICAgZHN0QnVmZmVyLnNldEludDgodG90YWxPZmZzZXQudmFsdWUsIHNyY0FycmF5W2ldLCBsaXR0bGVFbmRpYW4gJiYgdHJ1ZSk7XG4gICAgICAgIHRvdGFsT2Zmc2V0LnZhbHVlICs9IHNyY0FycmF5LkJZVEVTX1BFUl9FTEVNRU5UO1xuICAgICAgfVxuICAgIGJyZWFrO1xuXG4gICAgY2FzZSBcIkludDE2QXJyYXlcIjpcbiAgICAgIGZvcig7IGkgPCBsOyArK2kpXG4gICAgICB7XG4gICAgICAgIGRzdEJ1ZmZlci5zZXRJbnQxNih0b3RhbE9mZnNldC52YWx1ZSwgc3JjQXJyYXlbaV0sIGxpdHRsZUVuZGlhbiAmJiB0cnVlKTtcbiAgICAgICAgdG90YWxPZmZzZXQudmFsdWUgKz0gc3JjQXJyYXkuQllURVNfUEVSX0VMRU1FTlQ7XG4gICAgICB9XG4gICAgYnJlYWs7XG5cbiAgICBjYXNlIFwiSW50MzJBcnJheVwiOlxuICAgICAgZm9yKDsgaSA8IGw7ICsraSlcbiAgICAgIHtcbiAgICAgICAgZHN0QnVmZmVyLnNldEludDMyKHRvdGFsT2Zmc2V0LnZhbHVlLCBzcmNBcnJheVtpXSwgbGl0dGxlRW5kaWFuICYmIHRydWUpO1xuICAgICAgICB0b3RhbE9mZnNldC52YWx1ZSArPSBzcmNBcnJheS5CWVRFU19QRVJfRUxFTUVOVDtcbiAgICAgIH1cbiAgICBicmVhaztcblxuICAgIGNhc2UgXCJGbG9hdDMyQXJyYXlcIjpcbiAgICAgIGZvcig7IGkgPCBsOyArK2kpXG4gICAgICB7XG4gICAgICAgIGRzdEJ1ZmZlci5zZXRGbG9hdDMyKHRvdGFsT2Zmc2V0LnZhbHVlLCBzcmNBcnJheVtpXSwgbGl0dGxlRW5kaWFuICYmIHRydWUpO1xuICAgICAgICB0b3RhbE9mZnNldC52YWx1ZSArPSBzcmNBcnJheS5CWVRFU19QRVJfRUxFTUVOVDtcbiAgICAgIH1cbiAgICBicmVhaztcblxuICAgIGNhc2UgXCJGbG9hdDY0QXJyYXlcIjpcbiAgICAgIGZvcig7IGkgPCBsOyArK2kpXG4gICAgICB7XG4gICAgICAgIGRzdEJ1ZmZlci5zZXRGbG9hdDY0KHRvdGFsT2Zmc2V0LnZhbHVlLCBzcmNBcnJheVtpXSwgbGl0dGxlRW5kaWFuICYmIHRydWUpO1xuICAgICAgICB0b3RhbE9mZnNldC52YWx1ZSArPSBzcmNBcnJheS5CWVRFU19QRVJfRUxFTUVOVDtcbiAgICAgIH1cbiAgICBicmVhaztcbiAgfVxufVxuLyoqXG4gKiBTZXRzIGRhdGEgZnJvbSBhIHNvdXJjZSBidWZmZXIgYXJyYXkgdG8gYSBkZXN0aW5hdGlvbiB0eXBlZCBhcnJheVxuICogQHBhcmFtIHtBcnJheUJ1ZmZlcn0gc3JjQnVmZmVyIFNvcmNlIGJ1ZmZlclxuICogQHBhcmFtIHtBcnJheX0gZHN0QXJyYXkgICAgICAgIERlc3RpbmF0aW9uIHR5cGVkIGFycmF5XG4gKiBAcGFyYW0ge051bWJlcn0gbGVuZ3RoICAgICAgICAgQnl0ZSBsZW5ndGggZm9yIGNvcHlpbmcgZnJvbSBhIHNvdXJjZSBidWZmZXJcbiAqIEBwYXJhbSB7TnVtYmVyfSB0b3RhbE9mZnNldCAgICBUb3RhbCBvZmZzZXQgaW4gYnl0ZXNcbiAqIEBwYXJhbSB7Qm9vbGVhbn0gbGl0dGxlRW5kaWFuICBMaXR0bGUtZW5kaWFuIGJ5dGVzIG9yZGVyIGZsYWdcbiAqL1xuZnVuY3Rpb24gc2V0QnVmZmVyVG9BcnJheShzcmNCdWZmZXIsIGRzdEFycmF5LCBsZW5ndGgsIHRvdGFsT2Zmc2V0LCBsaXR0bGVFbmRpYW4pXG57XG4gIGxldCBsO1xuXG4gIGlmKGlzTmFOKGxlbmd0aCkpXG4gIHtcbiAgICBpZihzcmNCdWZmZXIuYnl0ZUxlbmd0aCA+IGRzdEFycmF5LmJ5dGVMZW5ndGggfHxcbiAgICAgICBzcmNCdWZmZXIuYnl0ZUxlbmd0aCA9PT0gZHN0QXJyYXkuYnl0ZUxlbmd0aClcbiAgICB7XG4gICAgICBsID0gZHN0QXJyYXkubGVuZ3RoO1xuICAgIH1cbiAgICBlbHNlXG4gICAge1xuICAgICAgbCA9IHNyY0J1ZmZlci5ieXRlTGVuZ3RoIC8gZHN0QXJyYXkuQllURVNfUEVSX0VMRU1FTlQ7XG4gICAgfVxuICB9XG4gIGVsc2VcbiAge1xuICAgIGwgPSBsZW5ndGggLyBkc3RBcnJheS5CWVRFU19QRVJfRUxFTUVOVDtcbiAgfVxuXG4gIHN3aXRjaChkc3RBcnJheS5jb25zdHJ1Y3Rvci5uYW1lKVxuICB7XG4gICAgY2FzZSBcIlVpbnQ4QXJyYXlcIjpcbiAgICAgIGZvcihsZXQgaSA9IDA7IGkgPCBsOyArK2kpXG4gICAgICB7XG4gICAgICAgIGRzdEFycmF5W2ldID0gc3JjQnVmZmVyLmdldFVpbnQ4KHRvdGFsT2Zmc2V0LnZhbHVlLCBsaXR0bGVFbmRpYW4gJiYgdHJ1ZSk7XG4gICAgICAgIHRvdGFsT2Zmc2V0LnZhbHVlICs9IGRzdEFycmF5LkJZVEVTX1BFUl9FTEVNRU5UO1xuICAgICAgfVxuICAgIGJyZWFrO1xuXG4gICAgY2FzZSBcIlVpbnQxNkFycmF5XCI6XG4gICAgICBmb3IobGV0IGkgPSAwOyBpIDwgbDsgKytpKVxuICAgICAge1xuICAgICAgICBkc3RBcnJheVtpXSA9IHNyY0J1ZmZlci5nZXRVaW50MTYodG90YWxPZmZzZXQudmFsdWUsIGxpdHRsZUVuZGlhbiAmJiB0cnVlKTtcbiAgICAgICAgdG90YWxPZmZzZXQudmFsdWUgKz0gZHN0QXJyYXkuQllURVNfUEVSX0VMRU1FTlQ7XG4gICAgICB9XG4gICAgYnJlYWs7XG5cbiAgICBjYXNlIFwiVWludDMyQXJyYXlcIjpcbiAgICAgIGZvcihsZXQgaSA9IDA7IGkgPCBsOyArK2kpXG4gICAgICB7XG4gICAgICAgIGRzdEFycmF5W2ldID0gc3JjQnVmZmVyLmdldFVpbnQzMih0b3RhbE9mZnNldC52YWx1ZSwgbGl0dGxlRW5kaWFuICYmIHRydWUpO1xuICAgICAgICB0b3RhbE9mZnNldC52YWx1ZSArPSBkc3RBcnJheS5CWVRFU19QRVJfRUxFTUVOVDtcbiAgICAgIH1cbiAgICBicmVhaztcblxuICAgIGNhc2UgXCJJbnQ4QXJyYXlcIjpcbiAgICAgIGZvcihsZXQgaSA9IDA7IGkgPCBsOyArK2kpXG4gICAgICB7XG4gICAgICAgIGRzdEFycmF5W2ldID0gc3JjQnVmZmVyLmdldEludDgodG90YWxPZmZzZXQudmFsdWUsIGxpdHRsZUVuZGlhbiAmJiB0cnVlKTtcbiAgICAgICAgdG90YWxPZmZzZXQudmFsdWUgKz0gZHN0QXJyYXkuQllURVNfUEVSX0VMRU1FTlQ7XG4gICAgICB9XG4gICAgYnJlYWs7XG5cbiAgICBjYXNlIFwiSW50MTZBcnJheVwiOlxuICAgICAgZm9yKGxldCBpID0gMDsgaSA8IGw7ICsraSlcbiAgICAgIHtcbiAgICAgICAgZHN0QXJyYXlbaV0gPSBzcmNCdWZmZXIuZ2V0SW50MTYodG90YWxPZmZzZXQudmFsdWUsIGxpdHRsZUVuZGlhbiAmJiB0cnVlKTtcbiAgICAgICAgdG90YWxPZmZzZXQudmFsdWUgKz0gZHN0QXJyYXkuQllURVNfUEVSX0VMRU1FTlQ7XG4gICAgICB9XG4gICAgYnJlYWs7XG5cbiAgICBjYXNlIFwiSW50MzJBcnJheVwiOlxuICAgICAgZm9yKGxldCBpID0gMDsgaSA8IGw7ICsraSlcbiAgICAgIHtcbiAgICAgICAgZHN0QXJyYXlbaV0gPSBzcmNCdWZmZXIuZ2V0SW50MzIodG90YWxPZmZzZXQudmFsdWUsIGxpdHRsZUVuZGlhbiAmJiB0cnVlKTtcbiAgICAgICAgdG90YWxPZmZzZXQudmFsdWUgKz0gZHN0QXJyYXkuQllURVNfUEVSX0VMRU1FTlQ7XG4gICAgICB9XG4gICAgYnJlYWs7XG5cbiAgICBjYXNlIFwiRmxvYXQzMkFycmF5XCI6XG4gICAgICBmb3IobGV0IGkgPSAwOyBpIDwgbDsgKytpKVxuICAgICAge1xuICAgICAgICBkc3RBcnJheVtpXSA9IHNyY0J1ZmZlci5nZXRGbG9hdDMyKHRvdGFsT2Zmc2V0LnZhbHVlLCBsaXR0bGVFbmRpYW4gJiYgdHJ1ZSk7XG4gICAgICAgIHRvdGFsT2Zmc2V0LnZhbHVlICs9IGRzdEFycmF5LkJZVEVTX1BFUl9FTEVNRU5UO1xuICAgICAgfVxuICAgIGJyZWFrO1xuXG4gICAgY2FzZSBcIkZsb2F0NjRBcnJheVwiOlxuICAgICAgZm9yKGxldCBpID0gMDsgaSA8IGw7ICsraSlcbiAgICAgIHtcbiAgICAgICAgZHN0QXJyYXlbaV0gPSBzcmNCdWZmZXIuZ2V0RmxvYXQ2NCh0b3RhbE9mZnNldC52YWx1ZSwgbGl0dGxlRW5kaWFuICYmIHRydWUpO1xuICAgICAgICB0b3RhbE9mZnNldC52YWx1ZSArPSBkc3RBcnJheS5CWVRFU19QRVJfRUxFTUVOVDtcbiAgICAgIH1cbiAgICBicmVhaztcbiAgfVxufVxuLyoqXG4gKiBDb3BpZXMgYSBzb3VyY2UgYnVmZmVyIHRvIGEgZGVzdGluYXRpb24gdHlwZWQgYXJyYXlcbiAqIEBwYXJhbSAge0FycmF5QnVmZmVyfSBzcmNCdWZmZXIgICAgICAgICBTb3VyY2UgYnVmZmVyXG4gKiBAcGFyYW0gIHtBcnJheX0gICAgICAgZHN0QXJyYXkgICAgICAgICAgRGVzdGluYXRpb24gdHlwZWQgYXJyYXlcbiAqIEBwYXJhbSAge051bWJlcn0gICAgICBieXRlT2Zmc2V0PTAgICAgICBCeXRlIG9mZnNldCBmcm9tIGEgc3RhcnQgb2YgYSBzb3VyY2UgYnVmZmVyXG4gKiBAcGFyYW0gIHtOdW1iZXJ9ICAgICAgbGVuZ3RoPU5hTiAgICAgICAgQnl0ZSBsZW5ndGggZm9yIGNvcHlpbmcgZnJvbSBhIHNvdXJjZSBidWZmZXJcbiAqIEBwYXJhbSAge0Jvb2xlYW59ICAgICBsaXR0bGVFbmRpYW49dHJ1ZSBMaXR0bGUtZW5kaWFuIGJ5dGVzIG9yZGVyIGZsYWdcbiAqIEByZXR1cm4ge0FycmF5fSAgICAgICAgICAgICAgICAgICAgICAgICBEZXN0aW5hdGlvbiBhcnJheSByZWZlcmVuY2VcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJ1ZmZlclRvQXJyYXkoc3JjQnVmZmVyLCBkc3RBcnJheSwgYnl0ZU9mZnNldCA9IDAsIGxlbmd0aCA9IE5hTiwgbGl0dGxlRW5kaWFuID0gdHJ1ZSlcbntcbiAgaWYoIWRzdEFycmF5LkJZVEVTX1BFUl9FTEVNRU5UIHx8ICEoc3JjQnVmZmVyIGluc3RhbmNlb2YgQXJyYXlCdWZmZXIpIHx8XG4gICAgICh0eXBlb2YgbGVuZ3RoICE9PSBcIm51bWJlclwiICYmICFpc05hTihsZW5ndGgpKSB8fFxuICAgICAodHlwZW9mIGJ5dGVPZmZzZXQgIT09IFwibnVtYmVyXCIpIHx8ICh0eXBlb2YgbGl0dGxlRW5kaWFuICE9PSBcImJvb2xlYW5cIikpXG4gIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJbY3R5cGVdICdidWZmZXJUb0FycmF5JyBmdW5jdGlvbjogaW52YWxpZCBhcmd1bWVudHMgaW4gdGhlIHNpZ25hdHVyZSAoQXJyYXlCdWZmZXIgc3JjQnVmZmVyLCBUeXBlZEFycmF5IGRzdEFycmF5LCBOdW1iZXIgbGVuZ3RoID0gTmFOLCBOdW1iZXJOdW1iZXIgb2Zmc2V0ID0gMCwgQm9vbGVhbiBsaXR0bGVFbmRpYW4gPSB0cnVlKVwiKTtcbiAgfVxuXG4gIGlmKGxlbmd0aCA8IDApXG4gIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJbY3R5cGVdICdidWZmZXJUb0FycmF5JyBmdW5jdGlvbjogdGhlIGNvcHlpbmcgYnl0ZSBsZW5ndGggbXVzdCBiZSBhIHBvc2l0aXZlIHZhbHVlXCIpO1xuICB9XG5cbiAgbGV0IHNyY0J1ZiAgICAgID0gbmV3IERhdGFWaWV3KHNyY0J1ZmZlciwgYnl0ZU9mZnNldCk7XG4gIGxldCB0b3RhbE9mZnNldCA9IHsgdmFsdWU6IDAgfTtcblxuICBzZXRCdWZmZXJUb0FycmF5KHNyY0J1ZiwgZHN0QXJyYXksIGxlbmd0aCwgdG90YWxPZmZzZXQsIGxpdHRsZUVuZGlhbik7XG5cbiAgcmV0dXJuIGRzdEFycmF5O1xufVxuLyoqXG4gKiBDb3BpZXMgYSBzb3VyY2UgdHlwZWQgYXJyYXkgdG8gYSBkZXN0aW5hdGlvbiBidWZmZXJcbiAqIEBwYXJhbSAge0FycmF5fSBzcmNBcnJheSAgICAgICAgICAgICAgICAgU291cmNlIHR5cGVkIGFycmF5XG4gKiBAcGFyYW0gIHtBcnJheUJ1ZmZlcn0gZXhpc3RlZEJ1ZmZlcj1udWxsIERlc0V4aXN0ZWQgYnVmZmVyXG4gKiBAcGFyYW0gIHtOdW1iZXJ9IGJ5dGVPZmZzZXQ9MCAgICAgICAgICAgIEJ5dGUgb2Zmc2V0IGZyb20gYSBzdGFydCBvZiBhIHNvdXJjZSB0eXBlZCBhcnJheVxuICogQHBhcmFtICB7TnVtYmVyfSBsZW5ndGg9TmFOICAgICAgICAgICAgICBCeXRlIGxlbmd0aCBmb3IgY29weWluZyBmcm9tIGEgc291cmNlIHR5cGVkIGFycmF5XG4gKiBAcGFyYW0gIHtCb29sZWFufSBsaXR0bGVFbmRpYW49dHJ1ZSAgICAgIExpdHRsZS1lbmRpYW4gYnl0ZXMgb3JkZXIgZmxhZ1xuICogQHJldHVybiB7QXJyYXlCdWZmZXJ9ICAgICAgICAgICAgICAgICAgICBEZXN0aW5hdGlvbiBidWZmZXIgcmVmZXJlbmNlXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBhcnJheVRvQnVmZmVyKHNyY0FycmF5LCBleGlzdGVkQnVmZmVyID0gbnVsbCwgYnl0ZU9mZnNldCA9IDAsIGxlbmd0aCA9IE5hTiwgbGl0dGxlRW5kaWFuID0gdHJ1ZSlcbntcbiAgaWYoIXNyY0FycmF5LkJZVEVTX1BFUl9FTEVNRU5UIHx8XG4gICAgICghKGV4aXN0ZWRCdWZmZXIgaW5zdGFuY2VvZiBBcnJheUJ1ZmZlcikgJiYgZXhpc3RlZEJ1ZmZlciAhPT0gbnVsbCkgfHxcbiAgICAgKHR5cGVvZiBsZW5ndGggIT09IFwibnVtYmVyXCIpIHx8XG4gICAgICh0eXBlb2YgYnl0ZU9mZnNldCAhPT0gXCJudW1iZXJcIikgfHxcbiAgICAgKHR5cGVvZiBsaXR0bGVFbmRpYW4gIT09IFwiYm9vbGVhblwiKSlcbiAge1xuICAgIHRocm93IG5ldyBFcnJvcihcIltjdHlwZV0gJ2FycmF5VG9CdWZmZXInIGZ1bmN0aW9uOiBpbnZhbGlkIGFyZ3VtZW50cyBpbiB0aGUgc2lnbmF0dXJlIChUeXBlZEFycmF5IHNyY0FycmF5LCBBcnJheUJ1ZmZlciBleGlzdGVkQnVmZmVyID0gbnVsbCwgTnVtYmVyIGxlbmd0aCA9IE5hTiwgTnVtYmVyIGJ5dGVPZmZzZXQgPSAwLCBCb29sZWFuIGxpdHRsZUVuZGlhbiA9IHRydWUpXCIpO1xuICB9XG5cbiAgaWYobGVuZ3RoIDwgMClcbiAge1xuICAgIHRocm93IG5ldyBFcnJvcihcIltjdHlwZV0gJ2FycmF5VG9CdWZmZXInIGZ1bmN0aW9uOiB0aGUgY29weWluZyBieXRlIGxlbmd0aCBtdXN0IGJlIGEgcG9zaXRpdmUgdmFsdWVcIik7XG4gIH1cblxuICBsZXQgdG90YWxPZmZzZXQgPSB7IHZhbHVlOiBieXRlT2Zmc2V0IH07XG4gIGxldCBhcnJheUJ1ZmZlciwgZHN0QnVmZmVyO1xuXG4gIGlmKGV4aXN0ZWRCdWZmZXIgPT09IG51bGwpXG4gIHtcbiAgICBhcnJheUJ1ZmZlciA9IG5ldyBBcnJheUJ1ZmZlcihzcmNBcnJheS5ieXRlTGVuZ3RoKTtcbiAgICBkc3RCdWZmZXIgICA9IG5ldyBEYXRhVmlldyAgIChhcnJheUJ1ZmZlcik7XG5cbiAgICBzZXRBcnJheVRvQnVmZmVyKHNyY0FycmF5LCBkc3RCdWZmZXIsIGxlbmd0aCwgdG90YWxPZmZzZXQsIGxpdHRsZUVuZGlhbik7XG4gIH1cbiAgZWxzZVxuICB7XG4gICAgZHN0QnVmZmVyID0gbmV3IERhdGFWaWV3KGV4aXN0ZWRCdWZmZXIpO1xuXG4gICAgc2V0QXJyYXlUb0J1ZmZlcihzcmNBcnJheSwgZHN0QnVmZmVyLCBsZW5ndGgsIHRvdGFsT2Zmc2V0LCBsaXR0bGVFbmRpYW4pO1xuICB9XG5cbiAgcmV0dXJuIGRzdEJ1ZmZlci5idWZmZXI7XG59XG4iLCIvKipcbiAqIEBmaWxlIHNyYy9leHBvcnQuanNcbiAqIEV4cG9ydGluZyBzY3JpcHRcbiAqL1xuXG5cInVzZSBzdHJpY3RcIjtcblxuaW1wb3J0ICogYXMgY3R5cGUgZnJvbSBcIi4vY3R5cGVcIjtcbmlmKCF3aW5kb3cuY3R5cGUpXG57XG4gIC8vd2luZG93LmN0eXBlID0gY3R5cGU7XG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh3aW5kb3csIFwiY3R5cGVcIixcbiAge1xuICAgIHZhbHVlICAgICAgIDogY3R5cGUsXG4gICAgd3JpdGFibGUgICAgOiBmYWxzZSxcbiAgICBlbnVtZXJhYmxlICA6IGZhbHNlLFxuICAgIGNvbmZpZ3VyYWJsZTogZmFsc2VcbiAgfSk7XG59XG5lbHNlXG57XG4gIC8vd2luZG93LmxpYmN0eXBlanMgPSBjdHlwZTtcbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHdpbmRvdywgXCJsaWJjdHlwZWpzXCIsXG4gIHtcbiAgICB2YWx1ZSAgICAgICA6IGN0eXBlLFxuICAgIHdyaXRhYmxlICAgIDogZmFsc2UsXG4gICAgZW51bWVyYWJsZSAgOiBmYWxzZSxcbiAgICBjb25maWd1cmFibGU6IGZhbHNlXG4gIH0pO1xuICBjb25zb2xlLndhcm4oXCJbQ1R5cGVKU10gbGlicmFyeSBleHBvcnRpbmc6ICdjdHlwZScgbmFtZSBpcyBhbHJlYWR5IHJlc2VydmVkLiBMaWJyYXJ5IHdhcyByZW5hbWVkIHRvICdsaWJjdHlwZWpzJy5cIik7XG59XG4iXX0=
