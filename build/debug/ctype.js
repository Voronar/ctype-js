(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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

},{}],2:[function(require,module,exports){
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

},{"./ctype":1}]},{},[2])


//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvY3R5cGUuanMiLCJzcmMvZXhwb3J0LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7QUNLQSxZQUFZOzs7Ozs7QUFBQzs7OztRQWdMRyxLQUFLLEdBQUwsS0FBSztRQVVMLE1BQU0sR0FBTixNQUFNO1FBVU4sTUFBTSxHQUFOLE1BQU07UUFVTixJQUFJLEdBQUosSUFBSTtRQVVKLEtBQUssR0FBTCxLQUFLO1FBVUwsS0FBSyxHQUFMLEtBQUs7UUFVTCxPQUFPLEdBQVAsT0FBTztRQVVQLE9BQU8sR0FBUCxPQUFPO1FBV1AsTUFBTSxHQUFOLE1BQU07UUFtUU4sY0FBYyxHQUFkLGNBQWM7UUFpQ2QsY0FBYyxHQUFkLGNBQWM7UUFrUGQsYUFBYSxHQUFiLGFBQWE7UUE4QmIsYUFBYSxHQUFiLGFBQWE7QUEveUI3QixTQUFTLFFBQVEsQ0FBQyxNQUFNLEVBQ3hCO0FBQ0UsU0FBUSxPQUFPLE1BQU0sS0FBSyxRQUFRLENBQUU7Q0FDckM7Ozs7OztBQUFBLEFBTUQsU0FBUyxVQUFVLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFDbkM7QUFDRSxNQUFHLE9BQU8sRUFDVjtBQUNFLFFBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLElBQUksT0FBTyxLQUFLLElBQUksRUFDekM7QUFDRSxZQUFNLElBQUksS0FBSyxDQUFDLGlDQUFpQyxHQUFHLHdCQUF3QixHQUFHLE9BQU8sQ0FBQyxRQUFRLEVBQUUsR0FBRyw0QkFBNEIsQ0FBQyxDQUFDO0tBQ25JOztBQUVELFNBQUksSUFBSSxFQUFFLElBQUksTUFBTSxFQUNwQjtBQUNFLFVBQUcsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksTUFBTSxDQUFDLEVBQUUsQ0FBQyxLQUFLLElBQUksRUFDL0M7QUFDRSxlQUFPLENBQUMsRUFBRSxDQUFDLEdBQUcsTUFBTSxDQUFDLEVBQUUsQ0FBQyxD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dXJjZVJvb3QiOiIvc291cmNlLyIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLyoqXG4gKiBAZmlsZSBzcmMvY3R5cGUuanNcbiAqIEBtb2R1bGUgY3R5cGVcbiAqL1xuXG5cInVzZSBzdHJpY3RcIjtcbi8qKlxuICogVGVzdHMgYW4gdmFyaWFibGUgaXMgYmVpbmcgYW4gSmF2YVNjcmlwdCBvYmplY3QgdHlwZVxuICogQHBhcmFtICB7T2JqZWN0fSBvYmplY3QgVGVzdGluZyBvYmplY3QgdmFsdWVcbiAqIEByZXR1cm4ge0Jvb2xlYW59ICAgICAgSXMgYSB2YXJpYWJsZSBhIEphdmFTY3JpcHQgb2JqZWN0XG4gKi9cbmZ1bmN0aW9uIGlzT2JqZWN0KG9iamVjdClcbntcbiAgcmV0dXJuICh0eXBlb2Ygb2JqZWN0ID09PSBcIm9iamVjdFwiKTtcbn1cbi8qKlxuICogRG9lcyBkZWVwIGNvcHkgb2YgYW4gb2JqZWN0XG4gKiBAcGFyYW0ge09iamVjdH0gZGVzdE9iaiBEZXN0aW5hdGlvbiBvYmplY3RcbiAqIEBwYXJhbSB7T2JqZWN0fSBzcmNPYmogIFNvdXJjZSBvYmplY3RcbiAqL1xuZnVuY3Rpb24gY29weU9iamVjdChkZXN0T2JqLCBzcmNPYmopXG57XG4gIGlmKGRlc3RPYmopXG4gIHtcbiAgICBpZighaXNPYmplY3QoZGVzdE9iaikgfHwgZGVzdE9iaiA9PT0gbnVsbClcbiAgICB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJbQ1R5cGVdICdjb3B5T2JqZWN0JyBmdW5jdGlvbjogXCIgKyBcImEgZGVzdGluYXRpb24gb2JqZWN0ICdcIiArIGRlc3RPYmoudG9TdHJpbmcoKSArIFwiJyBtdXN0IGhhdmUgYW4gb2JqZWN0IHR5cGVcIik7XG4gICAgfVxuXG4gICAgZm9yKGxldCBpdCBpbiBzcmNPYmopXG4gICAge1xuICAgICAgaWYoIWlzT2JqZWN0KHNyY09ialtpdF0pIHx8IHNyY09ialtpdF0gPT09IG51bGwpXG4gICAgICB7XG4gICAgICAgIGRlc3RPYmpbaXRdID0gc3JjT2JqW2l0XTtcbiAgICAgIH1cbiAgICAgIGlmKGlzT2JqZWN0KHNyY09ialtpdF0pICYmIHNyY09ialtpdF0gIT09IG51bGwgJiYgc3JjT2JqW2l0XS5sZW5ndGggIT09IHVuZGVmaW5lZClcbiAgICAgIHtcbiAgICAgICAgZGVzdE9ialtpdF0gPSBuZXcgd2luZG93W3NyY09ialtpdF0uY29uc3RydWN0b3IubmFtZV0oc3JjT2JqW2l0XS5sZW5ndGgpO1xuICAgICAgICBhbGxvY2F0ZUFycmF5KGRlc3RPYmpbaXRdLCBzcmNPYmpbaXRdKTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBpZihpc09iamVjdChzcmNPYmpbaXRdKSAmJiBzcmNPYmpbaXRdICE9PSBudWxsKVxuICAgICAge1xuICAgICAgICBkZXN0T2JqW2l0XSA9IHt9O1xuICAgICAgICBjb3B5T2JqZWN0KGRlc3RPYmpbaXRdLCBzcmNPYmpbaXRdKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgZWxzZVxuICB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiW0NUeXBlXSAnY29weU9iamVjdCcgZnVuY3Rpb246IHNldCBhIG5vbi1lbXB0eSBwYXJhbWV0ZXI6IFtvYmplY3RdXCIpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGFsbG9jYXRlQXJyYXkoZGVzdEFyciwgc3JjQXJyKVxue1xuICBsZXQgbCA9IHNyY0Fyci5sZW5ndGg7XG5cbiAgaWYoZGVzdEFycilcbiAge1xuICAgIGlmKCFpc09iamVjdChkZXN0QXJyKSB8fCBkZXN0QXJyLmxlbmd0aCA9PT0gdW5kZWZpbmVkIHx8IGRlc3RBcnIgPT09IG51bGwpXG4gICAge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiW0NUeXBlXSAnYWxsb2NhdGVBcnJheScgZnVuY3Rpb246IFwiICsgXCJhIGRlc3RpbmF0aW9uIG9iamVjdCAnXCIgKyBkZXN0QXJyLnRvU3RyaW5nKCkgKyBcIicgbXVzdCBoYXZlIGFuIGFycmF5IHR5cGVcIik7XG4gICAgfVxuXG4gICAgZm9yKGxldCBpdCA9IDA7IGl0IDwgbDsgKytpdClcbiAgICB7XG4gICAgICBpZihpc09iamVjdChzcmNBcnJbaXRdKSAmJiBzcmNBcnJbaXRdICE9PSBudWxsICYmIHNyY0FycltpdF0ubGVuZ3RoICE9PSB1bmRlZmluZWQpXG4gICAgICB7XG4gICAgICAgIGRlc3RBcnJbaXRdID0gbmV3IHdpbmRvd1tzcmNBcnJbaXRdLmNvbnN0cnVjdG9yLm5hbWVdKHNyY0FycltpdF0ubGVuZ3RoKTtcbiAgICAgICAgYWxsb2NhdGVBcnJheShkZXN0QXJyW2l0XSwgc3JjQXJyW2l0XSk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgaWYoaXNPYmplY3Qoc3JjQXJyW2l0XSkgJiYgc3JjQXJyW2l0XSAhPT0gbnVsbClcbiAgICAgIHtcbiAgICAgICAgZGVzdEFycltpdF0gPSB7fTtcbiAgICAgICAgY29weU9iamVjdChkZXN0QXJyW2l0XSwgc3JjQXJyW2l0XSk7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIGVsc2VcbiAge1xuICAgIHRocm93IG5ldyBFcnJvcihcIltDVHlwZV0gJ2FsbG9jYXRlQXJyYXknIGZ1bmN0aW9uOiBzZXQgYSBub24tZW1wdHkgcGFyYW1ldGVyOiBbYXJyYXldXCIpO1xuICB9XG59XG5cbi8qKlxuICogR2V0cyBhIHNpemUgb2Ygc291cmNlIHN0cnVjdHVyZVxuICogQHBhcmFtICB7T2JqZWN0fSBzcmNTdHJ1Y3QgU291cmNlIHN0cnVjdHVyZVxuICogQHBhcmFtICB7TnVtYmVyfSB0b3RhbFNpemUgVG90YWwgc2l6ZSBpbiBieXRlc1xuICovXG5mdW5jdGlvbiBnZXRTdHJ1Y3RTaXplKHNyY1N0cnVjdCwgdG90YWxTaXplKVxue1xuICBsZXQgaXNFbXB0eSA9IGZhbHNlO1xuXG4gIGZvcihsZXQgZmllbGQgaW4gc3JjU3RydWN0KVxuICB7XG4gICAgbGV0IGZpZWxkVmFsdWUgPSBzcmNTdHJ1Y3RbZmllbGRdO1xuICAgIGlzRW1wdHkgICAgICAgID0gZmFsc2U7XG5cbiAgICBpZighaXNPYmplY3QoZmllbGRWYWx1ZSkgJiYgIWZpZWxkVmFsdWUuQllURVNfUEVSX0VMRU1FTlQgJiYgIXNyY1N0cnVjdC5ieXRlTGVuZ3RoKVxuICAgIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIltjdHlwZV0gJ3N0cnVjdCcgZnVuY3Rpb246IGludmFsaWQgc3RydWN0dXJlIGZpZWxkICdcIiArIGZpZWxkICsgXCI6XCIgKyBmaWVsZFZhbHVlICsgXCInXCIpO1xuICAgIH1cblxuICAgIGlmKCFmaWVsZFZhbHVlLkJZVEVTX1BFUl9FTEVNRU5UKVxuICAgIHtcbiAgICAgIGlmKGZpZWxkVmFsdWUubGVuZ3RoKVxuICAgICAge1xuICAgICAgICBmb3IobGV0IGkgPSAwOyBpIDwgZmllbGRWYWx1ZS5sZW5ndGg7ICsraSlcbiAgICAgICAge1xuICAgICAgICAgIGlmKGlzT2JqZWN0KGZpZWxkVmFsdWVbaV0pKVxuICAgICAgICAgIHtcbiAgICAgICAgICAgIGdldFN0cnVjdFNpemUoZmllbGRWYWx1ZVtpXSwgdG90YWxTaXplKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGVsc2VcbiAgICAgIHtcbiAgICAgICAgaWYoaXNPYmplY3QoZmllbGRWYWx1ZSkpXG4gICAgICAgIHtcbiAgICAgICAgICBnZXRTdHJ1Y3RTaXplKGZpZWxkVmFsdWUsIHRvdGFsU2l6ZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgZWxzZVxuICAgIHtcbiAgICAgIHRvdGFsU2l6ZS52YWx1ZSArPSBmaWVsZFZhbHVlLmJ5dGVMZW5ndGg7XG4gICAgfVxuICB9XG5cbiAgaWYoaXNFbXB0eSlcbiAge1xuICAgIHRocm93IG5ldyBFcnJvcihcIltjdHlwZV0gJ3N0cnVjdCcgZnVuY3Rpb246IGludmFsaWQgc3RydWN0dXJlIGZpZWxkIC0gYW4gZW1wdHkgb2JqZWN0XCIpO1xuICB9XG59XG4vKipcbiAqIHVpbnQ4KFVpbnQ4QXJyYXkpIHR5cGUgYnl0ZSBsZW5ndGhcbiAqIEB0eXBlIHtOdW1iZXJ9XG4gKi9cbmV4cG9ydCBjb25zdCBVSU5UOF9TSVpFICA9IFVpbnQ4QXJyYXkuQllURVNfUEVSX0VMRU1FTlQ7XG4vKipcbiAqIHVpbnQxNihVaW50MTZBcnJheSkgdHlwZSBieXRlIGxlbmd0aFxuICogQHR5cGUge051bWJlcn1cbiAqL1xuZXhwb3J0IGNvbnN0IFVJTlQxNl9TSVpFID0gVWludDE2QXJyYXkuQllURVNfUEVSX0VMRU1FTlQ7XG4vKipcbiAqIHVpbnQzMihVaW50MzJBcnJheSkgdHlwZSBieXRlIGxlbmd0aFxuICogQHR5cGUge051bWJlcn1cbiAqL1xuZXhwb3J0IGNvbnN0IFVJTlQzMl9TSVpFICAgPSBVaW50MzJBcnJheS5CWVRFU19QRVJfRUxFTUVOVDtcbi8qKlxuICogaW50OChJbnQ4QXJyYXkpIHR5cGUgYnl0ZSBsZW5ndGhcbiAqIEB0eXBlIHtOdW1iZXJ9XG4gKi9cbmV4cG9ydCBjb25zdCBJTlQ4X1NJWkUgICA9IEludDhBcnJheS5CWVRFU19QRVJfRUxFTUVOVDtcbi8qKlxuICogaW50MTYoSW50MTZBcnJheSkgdHlwZSBieXRlIGxlbmd0aFxuICogQHR5cGUge051bWJlcn1cbiAqL1xuZXhwb3J0IGNvbnN0IElOVDE2X1NJWkUgID0gSW50MTZBcnJheS5CWVRFU19QRVJfRUxFTUVOVDtcbi8qKlxuICogaW50MzIoVWludDMyQXJyYXkpIHR5cGUgYnl0ZSBsZW5ndGhcbiAqIEB0eXBlIHtOdW1iZXJ9XG4gKi9cbmV4cG9ydCBjb25zdCBJTlQzMl9TSVpFICAgID0gSW50MzJBcnJheS5CWVRFU19QRVJfRUxFTUVOVDtcbi8qKlxuICogZmxvYXQzMihGbG9hdDMyQXJyYXkpIHR5cGUgYnl0ZSBsZW5ndGhcbiAqIEB0eXBlIHtOdW1iZXJ9XG4gKi9cbmV4cG9ydCBjb25zdCBGTE9BVDMyX1NJWkUgID0gRmxvYXQzMkFycmF5LkJZVEVTX1BFUl9FTEVNRU5UO1xuLyoqXG4gKiBmbG9hdDY0KEZsb2F0NjRBcnJheSkgdHlwZSBieXRlIGxlbmd0aFxuICogQHR5cGUge051bWJlcn1cbiAqL1xuZXhwb3J0IGNvbnN0IEZMT0FUNjRfU0laRSA9IEZsb2F0NjRBcnJheS5CWVRFU19QRVJfRUxFTUVOVDtcbi8qKlxuICogUmV0dXJucyBuZXcgJ3Vuc2lnbmVkIGNoYXIgYXJyYXlbc2l6ZV0nIEMgZXF1aXZhbGVudFxuICogQHBhcmFtICB7TnVtYmVyfSBzaXplPTEgQXJyYXkgbGVuZ3RoXG4gKiBAcmV0dXJuIHtVaW50OEFycmF5fSAgICAgIFVuc2lnbmVkIDgtYnl0ZSBpbnRlZ2VyIGFycmF5XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB1aW50OChzaXplID0gMSlcbntcbiAgbGV0IGN0eXBlID0gbmV3IFVpbnQ4QXJyYXkoc2l6ZSk7XG4gIHJldHVybiBjdHlwZTtcbn1cbi8qKlxuICogUmV0dXJucyBuZXcgJ3Vuc2lnbmVkIHNob3J0IGFycmF5W3NpemVdJyBDIGVxdWl2YWxlbnRcbiAqIEBwYXJhbSAge051bWJlcn0gc2l6ZT0xIEFycmF5IGxlbmd0aFxuICogQHJldHVybiB7VWludDE2QXJyYXl9ICAgICBVbnNpZ25lZCAxNi1ieXRlIGludGVnZXIgYXJyYXlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHVpbnQxNihzaXplID0gMSlcbntcbiAgbGV0IGN0eXBlID0gbmV3IFVpbnQxNkFycmF5KHNpemUpO1xuICByZXR1cm4gY3R5cGU7XG59XG4vKipcbiAqIFJldHVybnMgbmV3ICd1bnNpZ25lZCBpbnQgYXJyYXlbc2l6ZV0nIEMgZXF1aXZhbGVudFxuICogQHBhcmFtICB7TnVtYmVyfSBzaXplPTEgQXJyYXkgbGVuZ3RoXG4gKiBAcmV0dXJuIHtVaW50MzJBcnJheX0gICAgIFVuc2lnbmVkIDMyLWJ5dGUgaW50ZWdlciBhcnJheVxuICovXG5leHBvcnQgZnVuY3Rpb24gdWludDMyKHNpemUgPSAxKVxue1xuICBsZXQgY3R5cGUgPSBuZXcgVWludDMyQXJyYXkoc2l6ZSk7XG4gIHJldHVybiBjdHlwZTtcbn1cbi8qKlxuICogUmV0dXJucyBuZXcgJ2NoYXIgYXJyYXlbc2l6ZV0nIEMgZXF1aXZhbGVudFxuICogQHBhcmFtICB7TnVtYmVyfSBzaXplPTEgQXJyYXkgbGVuZ3RoXG4gKiBAcmV0dXJuIHtJbnQ4QXJyYXl9ICAgICAgIFNpZ25lZCA4LWJ5dGUgaW50ZWdlciBhcnJheVxuICovXG5leHBvcnQgZnVuY3Rpb24gaW50OChzaXplID0gMSlcbntcbiAgbGV0IGN0eXBlID0gbmV3IEludDhBcnJheShzaXplKTtcbiAgcmV0dXJuIGN0eXBlO1xufVxuLyoqXG4gKiBSZXR1cm5zIG5ldyAnc2hvcnQgYXJyYXlbc2l6ZV0nIEMgZXF1aXZhbGVudFxuICogQHBhcmFtICB7TnVtYmVyfSBzaXplPTEgQXJyYXkgbGVuZ3RoXG4gKiBAcmV0dXJuIHtJbnQxNkFycmF5fSAgICAgIFNpZ25lZCAxNi1ieXRlIGludGVnZXIgYXJyYXlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGludDE2KHNpemUgPSAxKVxue1xuICBsZXQgY3R5cGUgPSBuZXcgSW50MTZBcnJheShzaXplKTtcbiAgcmV0dXJuIGN0eXBlO1xufVxuLyoqXG4gKiBSZXR1cm5zIG5ldyAnaW50IGFycmF5W3NpemVdJyBDIGVxdWl2YWxlbnRcbiAqIEBwYXJhbSAge051bWJlcn0gc2l6ZT0xIEFycmF5IGxlbmd0aFxuICogQHJldHVybiB7SW50MzJBcnJheX0gICAgICBTaWduZWQgMzItYnl0ZSBpbnRlZ2VyIGFycmF5XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpbnQzMihzaXplID0gMSlcbntcbiAgbGV0IGN0eXBlID0gbmV3IEludDMyQXJyYXkoc2l6ZSk7XG4gIHJldHVybiBjdHlwZTtcbn1cbi8qKlxuICogUmV0dXJucyBuZXcgJ2Zsb2F0IGFycmF5W3NpemVdJyBDIGVxdWl2YWxlbnRcbiAqIEBwYXJhbSAge051bWJlcn0gc2l6ZT0xIEFycmF5IGxlbmd0aFxuICogQHJldHVybiB7RmxvYXQzMkFycmF5fSAgICBTaWduZWQgMzItYnl0ZSBmbG9hdGluZyBwb2ludCBhcnJheVxuICovXG5leHBvcnQgZnVuY3Rpb24gZmxvYXQzMihzaXplID0gMSlcbntcbiAgbGV0IGN0eXBlID0gbmV3IEZsb2F0MzJBcnJheShzaXplKTtcbiAgcmV0dXJuIGN0eXBlO1xufVxuLyoqXG4gKiBSZXR1cm5zIG5ldyAnZG91YmxlIGFycmF5W3NpemVdJyBDIGVxdWl2YWxlbnRcbiAqIEBwYXJhbSAge051bWJlcn0gc2l6ZT0xIEFycmF5IGxlbmd0aFxuICogQHJldHVybiB7RmxvYXQ2NEFycmF5fSAgICBTaWduZWQgNjQtYnl0ZSBmbG9hdGluZyBwb2ludCBhcnJheVxuICovXG5leHBvcnQgZnVuY3Rpb24gZmxvYXQ2NChzaXplID0gMSlcbntcbiAgbGV0IGN0eXBlID0gbmV3IEZsb2F0NjRBcnJheShzaXplKTtcbiAgcmV0dXJuIGN0eXBlO1xufVxuLyoqXG4gKiBSZXR1cm5zIG5ldyAnc3RydWN0IHNbc2l6ZV0nIEMgZXF1aXZhbGVudCB3aXRoICdieXRlTGVuZ3RoJyBmaWVsZCBpcyBhIHRvdGFsIHNpemUgb2Ygc3RydWN0dXJlXG4gKiBAcGFyYW0gIHtPYmplY3R9IHNyY1N0cnVjdCBFbXB0eSBzb3VyY2Ugb2JqZWN0XG4gKiBAcGFyYW0gIHtOdW1iZXJ9IHNpemU9MSAgICBBcnJheSBsZW5ndGhcbiAqIEByZXR1cm4ge09iamVjdH0gICAgICAgICAgIE9iamVjdCBzdHJ1Y3R1cmUgd2l0aCB0eXBlZCBmaWVsZHNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHN0cnVjdChzcmNTdHJ1Y3QsIHNpemUgPSAxKVxue1xuICBpZighaXNPYmplY3Qoc3JjU3RydWN0KSB8fCAodHlwZW9mIHNpemUgIT09IFwibnVtYmVyXCIpKVxuICB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiW2N0eXBlXSAnc3RydWN0JyBmdW5jdGlvbjogaW52YWxpZCBhcmd1bWVudHMgKE9iamVjdCBzcmNTdHJ1Y3QsIE51bWJlciBzaXplKVwiKTtcbiAgfVxuXG4gIGxldCB0b3RhbFNpemUgPSB7IHZhbHVlOiAwIH07XG5cbiAgZ2V0U3RydWN0U2l6ZShzcmNTdHJ1Y3QsIHRvdGFsU2l6ZSk7XG5cbiAgaWYoc2l6ZSA+IDEpXG4gIHtcbiAgICBsZXQgZHN0U3RydWN0cyA9IFtdO1xuICAgIGZvcihsZXQgaSA9IDA7IGkgPCBzaXplOyArK2kpXG4gICAge1xuICAgICAgZHN0U3RydWN0c1tpXSA9IHt9O1xuICAgICAgY29weU9iamVjdChkc3RTdHJ1Y3RzW2ldLCBzcmNTdHJ1Y3QpO1xuXG4gICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoZHN0U3RydWN0c1tpXSwgXCJieXRlTGVuZ3RoXCIsXG4gICAgICB7XG4gICAgICAgIHZhbHVlICAgICAgIDogdG90YWxTaXplLnZhbHVlLFxuICAgICAgICB3cml0YWJsZSAgICA6IGZhbHNlLFxuICAgICAgICBlbnVtZXJhYmxlICA6IHRydWUsXG4gICAgICAgIGNvbmZpZ3VyYWJsZTogZmFsc2VcbiAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gZHN0U3RydWN0cztcbiAgfVxuICBlbHNlXG4gIHtcbiAgICBsZXQgZHN0U3RydWN0ID0ge307XG4gICAgY29weU9iamVjdChkc3RTdHJ1Y3QsIHNyY1N0cnVjdCk7XG5cbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoZHN0U3RydWN0LCBcImJ5dGVMZW5ndGhcIixcbiAgICB7XG4gICAgICB2YWx1ZSAgICAgICA6IHRvdGFsU2l6ZS52YWx1ZSxcbiAgICAgIHdyaXRhYmxlICAgIDogZmFsc2UsXG4gICAgICBlbnVtZXJhYmxlICA6IHRydWUsXG4gICAgICBjb25maWd1cmFibGU6IGZhbHNlXG4gICAgfSk7XG5cbiAgICByZXR1cm4gZHN0U3RydWN0O1xuICB9XG5cbiAgcmV0dXJuIG51bGw7XG59XG4vKipcbiAqIFNldHMgZGF0YSBmcm9tIGEgc291cmNlIGJ1ZmZlciB0byBhIGRlc3RpbmF0aW9uIHN0cnVjdHVyZVxuICogQHBhcmFtIHtPYmplY3R9ICAgICAgZHN0U3RydWN0ICAgIERlc3RpbmF0aW9uIHN0cnVjdHVyZVxuICogQHBhcmFtIHtBcnJheUJ1ZmZlcn0gc3JjQnVmZmVyICAgIFNvdXJjZSBidWZmZXJcbiAqIEBwYXJhbSB7TnVtYmVyfSAgICAgIHRvdGFsT2Zmc2V0ICBUb3RhbCBvZmZzZXQgaW4gYnl0ZXNcbiAqIEBwYXJhbSB7Qm9vbGVhbn0gICAgIGxpdHRsZUVuZGlhbiBMaXR0bGUtZW5kaWFuIGJ5dGVzIG9yZGVyIGZsYWdcbiAqL1xuZnVuY3Rpb24gc2V0QnVmZmVyVG9TdHJ1Y3QoZHN0U3RydWN0LCBzcmNCdWZmZXIsIHRvdGFsT2Zmc2V0LCBsaXR0bGVFbmRpYW4pXG57XG4gIGZvcihsZXQgZmllbGQgaW4gZHN0U3RydWN0KVxuICB7XG4gICAgbGV0IGZpZWxkVmFsdWUgPSBkc3RTdHJ1Y3RbZmllbGRdO1xuXG4gICAgaWYoZmllbGRWYWx1ZS5jb25zdHJ1Y3Rvci5uYW1lID09PSBcIkFycmF5XCIpXG4gICAge1xuICAgICAgbGV0IGwgPSBmaWVsZFZhbHVlLmxlbmd0aDtcblxuICAgICAgZm9yKGxldCBpID0gMDsgaSA8IGw7ICsraSlcbiAgICAgIHtcbiAgICAgICAgc2V0QnVmZmVyVG9TdHJ1Y3QoZmllbGRWYWx1ZVtpXSwgc3JjQnVmZmVyLCB0b3RhbE9mZnNldCwgbGl0dGxlRW5kaWFuKTtcbiAgICAgIH1cbiAgICB9XG4gICAgZWxzZVxuICAgIHtcbiAgICAgIGlmKGZpZWxkVmFsdWUuY29uc3RydWN0b3IubmFtZSA9PT0gXCJPYmplY3RcIilcbiAgICAgIHtcbiAgICAgICAgc2V0QnVmZmVyVG9TdHJ1Y3QoZmllbGRWYWx1ZSwgc3JjQnVmZmVyLCB0b3RhbE9mZnNldCwgbGl0dGxlRW5kaWFuKTtcbiAgICAgIH1cbiAgICAgIGVsc2VcbiAgICAgIHtcbiAgICAgICAgbGV0IGwgPSBmaWVsZFZhbHVlLmxlbmd0aDtcblxuICAgICAgICBzd2l0Y2goZmllbGRWYWx1ZS5jb25zdHJ1Y3Rvci5uYW1lKVxuICAgICAgICB7XG4gICAgICAgICAgY2FzZSBcIlVpbnQ4QXJyYXlcIjpcbiAgICAgICAgICAgIGZvcihsZXQgaSA9IDA7IGkgPCBsOyArK2kpXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIGZpZWxkVmFsdWVbaV0gPSBzcmNCdWZmZXIuZ2V0VWludDgodG90YWxPZmZzZXQudmFsdWUsIGxpdHRsZUVuZGlhbiAmJiB0cnVlKTtcbiAgICAgICAgICAgICAgdG90YWxPZmZzZXQudmFsdWUgKz0gZmllbGRWYWx1ZS5CWVRFU19QRVJfRUxFTUVOVDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICBicmVhaztcblxuICAgICAgICAgIGNhc2UgXCJVaW50MTZBcnJheVwiOlxuICAgICAgICAgICAgZm9yKGxldCBpID0gMDsgaSA8IGw7ICsraSlcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgZmllbGRWYWx1ZVtpXSA9IHNyY0J1ZmZlci5nZXRVaW50MTYodG90YWxPZmZzZXQudmFsdWUsIGxpdHRsZUVuZGlhbiAmJiB0cnVlKTtcbiAgICAgICAgICAgICAgdG90YWxPZmZzZXQudmFsdWUgKz0gZmllbGRWYWx1ZS5CWVRFU19QRVJfRUxFTUVOVDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICBicmVhaztcblxuICAgICAgICAgIGNhc2UgXCJVaW50MzJBcnJheVwiOlxuICAgICAgICAgICAgZm9yKGxldCBpID0gMDsgaSA8IGw7ICsraSlcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgZmllbGRWYWx1ZVtpXSA9IHNyY0J1ZmZlci5nZXRVaW50MzIodG90YWxPZmZzZXQudmFsdWUsIGxpdHRsZUVuZGlhbiAmJiB0cnVlKTtcbiAgICAgICAgICAgICAgdG90YWxPZmZzZXQudmFsdWUgKz0gZmllbGRWYWx1ZS5CWVRFU19QRVJfRUxFTUVOVDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICBicmVhaztcblxuICAgICAgICAgIGNhc2UgXCJJbnQ4QXJyYXlcIjpcbiAgICAgICAgICAgIGZvcihsZXQgaSA9IDA7IGkgPCBsOyArK2kpXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIGZpZWxkVmFsdWVbaV0gPSBzcmNCdWZmZXIuZ2V0SW50OCh0b3RhbE9mZnNldC52YWx1ZSwgbGl0dGxlRW5kaWFuICYmIHRydWUpO1xuICAgICAgICAgICAgICB0b3RhbE9mZnNldC52YWx1ZSArPSBmaWVsZFZhbHVlLkJZVEVTX1BFUl9FTEVNRU5UO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgY2FzZSBcIkludDE2QXJyYXlcIjpcbiAgICAgICAgICAgIGZvcihsZXQgaSA9IDA7IGkgPCBsOyArK2kpXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIGZpZWxkVmFsdWVbaV0gPSBzcmNCdWZmZXIuZ2V0SW50MTYodG90YWxPZmZzZXQudmFsdWUsIGxpdHRsZUVuZGlhbiAmJiB0cnVlKTtcbiAgICAgICAgICAgICAgdG90YWxPZmZzZXQudmFsdWUgKz0gZmllbGRWYWx1ZS5CWVRFU19QRVJfRUxFTUVOVDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICBicmVhaztcblxuICAgICAgICAgIGNhc2UgXCJJbnQzMkFycmF5XCI6XG4gICAgICAgICAgICBmb3IobGV0IGkgPSAwOyBpIDwgbDsgKytpKVxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBmaWVsZFZhbHVlW2ldID0gc3JjQnVmZmVyLmdldEludDMyKHRvdGFsT2Zmc2V0LnZhbHVlLCBsaXR0bGVFbmRpYW4gJiYgdHJ1ZSk7XG4gICAgICAgICAgICAgIHRvdGFsT2Zmc2V0LnZhbHVlICs9IGZpZWxkVmFsdWUuQllURVNfUEVSX0VMRU1FTlQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICBjYXNlIFwiRmxvYXQzMkFycmF5XCI6XG4gICAgICAgICAgICBmb3IobGV0IGkgPSAwOyBpIDwgbDsgKytpKVxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBmaWVsZFZhbHVlW2ldID0gc3JjQnVmZmVyLmdldEZsb2F0MzIodG90YWxPZmZzZXQudmFsdWUsIGxpdHRsZUVuZGlhbiAmJiB0cnVlKTtcbiAgICAgICAgICAgICAgdG90YWxPZmZzZXQudmFsdWUgKz0gZmllbGRWYWx1ZS5CWVRFU19QRVJfRUxFTUVOVDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICBicmVhaztcblxuICAgICAgICAgIGNhc2UgXCJGbG9hdDY0QXJyYXlcIjpcbiAgICAgICAgICAgIGZvcihsZXQgaSA9IDA7IGkgPCBsOyArK2kpXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIGZpZWxkVmFsdWVbaV0gPSBzcmNCdWZmZXIuZ2V0RmxvYXQ2NCh0b3RhbE9mZnNldC52YWx1ZSwgbGl0dGxlRW5kaWFuICYmIHRydWUpO1xuICAgICAgICAgICAgICB0b3RhbE9mZnNldC52YWx1ZSArPSBmaWVsZFZhbHVlLkJZVEVTX1BFUl9FTEVNRU5UO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG59XG4vKipcbiAqIFNldHMgZGF0YSBmcm9tIHNvdXJjZSBzdHJ1Y3R1cmUgdG8gZGVzdGluYXRpb24gYnVmZmVyXG4gKiBAcGFyYW0gIHtBcnJheUJ1ZmZlcn0gZHN0QnVmZmVyICAgIERlc3RpbmF0aW9uIGJ1ZmZlclxuICogQHBhcmFtICB7T2JqZWN0fSAgICAgIHNyY1N0cnVjdCAgICBTb3VyY2Ugc3RydWN0dXJlXG4gKiBAcGFyYW0gIHtOdW1iZXJ9ICAgICAgdG90YWxPZmZzZXQgIFRvdGFsIG9mZnNldCBpbiBieXRlc1xuICogQHBhcmFtICB7Qm9vbGVhbn0gICAgIGxpdHRsZUVuZGlhbiBMaXR0bGUtZW5kaWFuIGJ5dGVzIG9yZGVyIGZsYWdcbiAqL1xuZnVuY3Rpb24gc2V0U3RydWN0VG9CdWZmZXIoZHN0QnVmZmVyLCBzcmNTdHJ1Y3QsIHRvdGFsT2Zmc2V0LCBsaXR0bGVFbmRpYW4pXG57XG4gIGZvcihsZXQgZmllbGQgaW4gc3JjU3RydWN0KVxuICB7XG4gICAgbGV0IGZpZWxkVmFsdWUgPSBzcmNTdHJ1Y3RbZmllbGRdO1xuXG4gICAgaWYoZmllbGRWYWx1ZS5jb25zdHJ1Y3Rvci5uYW1lID09PSBcIkFycmF5XCIpXG4gICAge1xuICAgICAgbGV0IGwgPSBmaWVsZFZhbHVlLmxlbmd0aDtcblxuICAgICAgZm9yKGxldCBpID0gMDsgaSA8IGw7ICsraSlcbiAgICAgIHtcbiAgICAgICAgc2V0U3RydWN0VG9CdWZmZXIoZHN0QnVmZmVyLCBmaWVsZFZhbHVlW2ldLCB0b3RhbE9mZnNldCwgbGl0dGxlRW5kaWFuKTtcbiAgICAgIH1cbiAgICB9XG4gICAgZWxzZVxuICAgIHtcbiAgICAgIGlmKGZpZWxkVmFsdWUuY29uc3RydWN0b3IubmFtZSA9PT0gXCJPYmplY3RcIilcbiAgICAgIHtcbiAgICAgICAgc2V0U3RydWN0VG9CdWZmZXIoZHN0QnVmZmVyLCBmaWVsZFZhbHVlLCB0b3RhbE9mZnNldCwgbGl0dGxlRW5kaWFuKTtcbiAgICAgIH1cbiAgICAgIGVsc2VcbiAgICAgIHtcbiAgICAgICAgbGV0IGwgPSBmaWVsZFZhbHVlLmxlbmd0aDtcblxuICAgICAgICBzd2l0Y2goZmllbGRWYWx1ZS5jb25zdHJ1Y3Rvci5uYW1lKVxuICAgICAgICB7XG4gICAgICAgICAgY2FzZSBcIlVpbnQ4QXJyYXlcIjpcbiAgICAgICAgICAgIGZvcihsZXQgaSA9IDA7IGkgPCBsOyArK2kpXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIGRzdEJ1ZmZlci5zZXRVaW50OCh0b3RhbE9mZnNldC52YWx1ZSwgZmllbGRWYWx1ZVtpXSwgbGl0dGxlRW5kaWFuICYmIHRydWUpO1xuICAgICAgICAgICAgICB0b3RhbE9mZnNldC52YWx1ZSArPSBmaWVsZFZhbHVlLkJZVEVTX1BFUl9FTEVNRU5UO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgY2FzZSBcIlVpbnQxNkFycmF5XCI6XG4gICAgICAgICAgICBmb3IobGV0IGkgPSAwOyBpIDwgbDsgKytpKVxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBkc3RCdWZmZXIuc2V0VWludDE2KHRvdGFsT2Zmc2V0LnZhbHVlLCBmaWVsZFZhbHVlW2ldLCBsaXR0bGVFbmRpYW4gJiYgdHJ1ZSk7XG4gICAgICAgICAgICAgIHRvdGFsT2Zmc2V0LnZhbHVlICs9IGZpZWxkVmFsdWUuQllURVNfUEVSX0VMRU1FTlQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICBjYXNlIFwiVWludDMyQXJyYXlcIjpcbiAgICAgICAgICAgIGZvcihsZXQgaSA9IDA7IGkgPCBsOyArK2kpXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIGRzdEJ1ZmZlci5zZXRVaW50MzIodG90YWxPZmZzZXQudmFsdWUsIGZpZWxkVmFsdWVbaV0sIGxpdHRsZUVuZGlhbiAmJiB0cnVlKTtcbiAgICAgICAgICAgICAgdG90YWxPZmZzZXQudmFsdWUgKz0gZmllbGRWYWx1ZS5CWVRFU19QRVJfRUxFTUVOVDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICBicmVhaztcblxuICAgICAgICAgIGNhc2UgXCJJbnQ4QXJyYXlcIjpcbiAgICAgICAgICAgIGZvcihsZXQgaSA9IDA7IGkgPCBsOyArK2kpXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIGRzdEJ1ZmZlci5zZXRJbnQ4KHRvdGFsT2Zmc2V0LnZhbHVlLCBmaWVsZFZhbHVlW2ldLCBsaXR0bGVFbmRpYW4gJiYgdHJ1ZSk7XG4gICAgICAgICAgICAgIHRvdGFsT2Zmc2V0LnZhbHVlICs9IGZpZWxkVmFsdWUuQllURVNfUEVSX0VMRU1FTlQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICBjYXNlIFwiSW50MTZBcnJheVwiOlxuICAgICAgICAgICAgZm9yKGxldCBpID0gMDsgaSA8IGw7ICsraSlcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgZHN0QnVmZmVyLnNldEludDE2KHRvdGFsT2Zmc2V0LnZhbHVlLCBmaWVsZFZhbHVlW2ldLCBsaXR0bGVFbmRpYW4gJiYgdHJ1ZSk7XG4gICAgICAgICAgICAgIHRvdGFsT2Zmc2V0LnZhbHVlICs9IGZpZWxkVmFsdWUuQllURVNfUEVSX0VMRU1FTlQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICBjYXNlIFwiSW50MzJBcnJheVwiOlxuICAgICAgICAgICAgZm9yKGxldCBpID0gMDsgaSA8IGw7ICsraSlcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgZHN0QnVmZmVyLnNldEludDMyKHRvdGFsT2Zmc2V0LnZhbHVlLCBmaWVsZFZhbHVlW2ldLCBsaXR0bGVFbmRpYW4gJiYgdHJ1ZSk7XG4gICAgICAgICAgICAgIHRvdGFsT2Zmc2V0LnZhbHVlICs9IGZpZWxkVmFsdWUuQllURVNfUEVSX0VMRU1FTlQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICBjYXNlIFwiRmxvYXQzMkFycmF5XCI6XG4gICAgICAgICAgICBmb3IobGV0IGkgPSAwOyBpIDwgbDsgKytpKVxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBkc3RCdWZmZXIuc2V0RmxvYXQzMih0b3RhbE9mZnNldC52YWx1ZSwgZmllbGRWYWx1ZVtpXSwgbGl0dGxlRW5kaWFuICYmIHRydWUpO1xuICAgICAgICAgICAgICB0b3RhbE9mZnNldC52YWx1ZSArPSBmaWVsZFZhbHVlLkJZVEVTX1BFUl9FTEVNRU5UO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgY2FzZSBcIkZsb2F0NjRBcnJheVwiOlxuICAgICAgICAgICAgZm9yKGxldCBpID0gMDsgaSA8IGw7ICsraSlcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgZHN0QnVmZmVyLnNldEZsb2F0NjQodG90YWxPZmZzZXQudmFsdWUsIGZpZWxkVmFsdWVbaV0sIGxpdHRsZUVuZGlhbiAmJiB0cnVlKTtcbiAgICAgICAgICAgICAgdG90YWxPZmZzZXQudmFsdWUgKz0gZmllbGRWYWx1ZS5CWVRFU19QRVJfRUxFTUVOVDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxufVxuLyoqXG4gKiBDb3BpZXMgYSBzb3VyY2UgYnVmZmVyIHRvIGEgZGVzdGluYXRpb24gc3RydWN0dXJlXG4gKiBAcGFyYW0gIHtBcnJheUJ1ZmZlcn0gICAgIHNyY0J1ZmZlciAgICAgICAgIFNvdXJjZSBidWZmZXJcbiAqIEBwYXJhbSAge09iamVjdHxPYmplY3RbXX0gZHN0U3RydWN0ICAgICAgICAgRGVzdGluYXRpb24gc3RydWN0dXJlIG9yIGFycmF5IG9mIHN0cnVjdHVyZXNcbiAqIEBwYXJhbSAge051bWJlcn0gICAgICAgICAgYnl0ZU9mZnNldD0wICAgICAgQnl0ZSBvZmZzZXQgZnJvbSBhIHN0YXJ0IG9mIGEgc291cmNlIGJ1ZmZlclxuICogQHBhcmFtICB7Qm9vbGVhbn0gICAgICAgICBsaXR0bGVFbmRpYW49dHJ1ZSBMaXR0bGUtZW5kaWFuIGJ5dGVzIG9yZGVyIGZsYWdcbiAqIEByZXR1cm4ge09iamVjdH0gICAgICAgICAgICAgICAgICAgICAgICAgICAgRGVzdGluYXRpb24gc3RydWN0dXJlIHJlZmVyZW5jZVxuICovXG5leHBvcnQgZnVuY3Rpb24gYnVmZmVyVG9TdHJ1Y3Qoc3JjQnVmZmVyLCBkc3RTdHJ1Y3QsIGJ5dGVPZmZzZXQgPSAwLCBsaXR0bGVFbmRpYW4gPSB0cnVlKVxue1xuICBpZighaXNPYmplY3QoZHN0U3RydWN0KSB8fCAhKHNyY0J1ZmZlciBpbnN0YW5jZW9mIEFycmF5QnVmZmVyKSB8fCAodHlwZW9mIGJ5dGVPZmZzZXQgIT09IFwibnVtYmVyXCIpIHx8ICh0eXBlb2YgbGl0dGxlRW5kaWFuICE9PSBcImJvb2xlYW5cIikpXG4gIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJbY3R5cGVdICdidWZmZXJUb1N0cnVjdCcgZnVuY3Rpb246IGludmFsaWQgYXJndW1lbnRzIGluIHRoZSBzaWduYXR1cmUgKEFycmF5QnVmZmVyIHNyY0J1ZmZlciwgT2JqZWN0IGRzdFN0cnVjdCwgTnVtYmVyIGJ5dGVPZmZzZXQgPSAwLCBCb29sZWFuIGxpdHRsZUVuZGlhbiA9IHRydWUpXCIpO1xuICB9XG5cbiAgbGV0IHNyY0J1ZjtcblxuICB0cnlcbiAge1xuICAgIHNyY0J1ZiA9IG5ldyBEYXRhVmlldyhzcmNCdWZmZXIsIGJ5dGVPZmZzZXQpO1xuICB9XG4gIGNhdGNoKGUpXG4gIHtcbiAgICBjb25zb2xlLmxvZyhlKTtcbiAgICByZXR1cm47XG4gIH1cblxuICBsZXQgdG90YWxPZmZzZXQgID0geyB2YWx1ZTogMCB9O1xuXG4gIHNldEJ1ZmZlclRvU3RydWN0KGRzdFN0cnVjdCwgc3JjQnVmLCB0b3RhbE9mZnNldCwgbGl0dGxlRW5kaWFuKTtcblxuICByZXR1cm4gZHN0U3RydWN0O1xufVxuLyoqXG4gKiBDb3BpZXMgYSBzb3VyY2Ugc3RydWN0dXJlIHRvIGEgZGVzdGluYXRpb24gYnVmZmVyXG4gKiBAcGFyYW0gIHtPYmplY3R8T2JqZWN0W119IHNyY1N0cnVjdCAgICAgIFNvdXJjZSBzdHJ1Y3R1cmUgb3IgYXJyYXkgb2Ygc3RydWN0dXJlc1xuICogQHBhcmFtICB7QXJyYXlCdWZmZXJ9IGV4aXN0ZWRCdWZmZXI9bnVsbCBFeGlzdGVkIGJ1ZmZlclxuICogQHBhcmFtICB7TnVtYmVyfSBieXRlT2Zmc2V0PTAgICAgICAgICAgICBCeXRlIG9mZnNldCBmcm9tIGEgc3RhcnQgb2YgYSBzb3VyY2UgYnVmZmVyXG4gKiBAcGFyYW0gIHtOdW1iZXJ9IGxpdHRsZUVuZGlhbj10cnVlICAgICAgIExpdHRsZS1lbmRpYW4gYnl0ZXMgb3JkZXIgZmxhZ1xuICogQHJldHVybiB7QXJyYXlCdWZmZXJ9ICAgICAgICAgICAgICAgICAgICBEZXN0aW5hdGlvbiBidWZmZXIgcmVmZXJlbmNlXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzdHJ1Y3RUb0J1ZmZlcihzcmNTdHJ1Y3QsIGV4aXN0ZWRCdWZmZXIgPSBudWxsLCBieXRlT2Zmc2V0ID0gMCwgbGl0dGxlRW5kaWFuID0gdHJ1ZSlcbntcbiAgaWYoIWlzT2JqZWN0KHNyY1N0cnVjdCkgfHxcbiAgICAgKCEoZXhpc3RlZEJ1ZmZlciBpbnN0YW5jZW9mIEFycmF5QnVmZmVyKSAmJiBleGlzdGVkQnVmZmVyICE9PSBudWxsKSB8fFxuICAgICAodHlwZW9mIGJ5dGVPZmZzZXQgIT09IFwibnVtYmVyXCIpIHx8XG4gICAgICh0eXBlb2YgbGl0dGxlRW5kaWFuICE9PSBcImJvb2xlYW5cIikpXG4gIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJbY3R5cGVdICdzdHJ1Y3RUb0J1ZmZlcicgZnVuY3Rpb246IGludmFsaWQgYXJndW1lbnRzIGluIHRoZSBzaWduYXR1cmUgKE9iamVjdCBzcmNTdHJ1Y3QsIEFycmF5QnVmZmVyIGV4aXN0ZWRCdWZmZXIgPSBudWxsLCBOdW1iZXIgYnl0ZU9mZnNldCA9IDAsIEJvb2xlYW4gbGl0dGxlRW5kaWFuID0gdHJ1ZSlcIik7XG4gIH1cblxuICBsZXQgdG90YWxPZmZzZXQgPSB7IHZhbHVlOiAwIH07XG4gIGxldCBhcnJheUJ1ZmZlciwgZHN0QnVmZmVyO1xuXG4gIGlmKGV4aXN0ZWRCdWZmZXIgPT09IG51bGwpXG4gIHtcbiAgICBpZihzcmNTdHJ1Y3QgaW5zdGFuY2VvZiBBcnJheSlcbiAgICB7XG4gICAgICBsZXQgbCA9IHNyY1N0cnVjdC5sZW5ndGg7XG5cbiAgICAgIGFycmF5QnVmZmVyID0gbmV3IEFycmF5QnVmZmVyKHNyY1N0cnVjdFswXS5ieXRlTGVuZ3RoICogbCk7XG4gICAgICBkc3RCdWZmZXIgICA9IG5ldyBEYXRhVmlldyAgIChhcnJheUJ1ZmZlcik7XG4gICAgfVxuICAgIGVsc2VcbiAgICB7XG4gICAgICBhcnJheUJ1ZmZlciA9IG5ldyBBcnJheUJ1ZmZlcihzcmNTdHJ1Y3QuYnl0ZUxlbmd0aCk7XG4gICAgICBkc3RCdWZmZXIgICA9IG5ldyBEYXRhVmlldyAgIChhcnJheUJ1ZmZlcik7XG4gICAgfVxuXG4gICAgc2V0U3RydWN0VG9CdWZmZXIoZHN0QnVmZmVyLCBzcmNTdHJ1Y3QsIHRvdGFsT2Zmc2V0LCBsaXR0bGVFbmRpYW4pO1xuICB9XG4gIGVsc2VcbiAge1xuICAgIGRzdEJ1ZmZlciA9IG5ldyBEYXRhVmlldyhleGlzdGVkQnVmZmVyLCBieXRlT2Zmc2V0KTtcblxuICAgIHNldFN0cnVjdFRvQnVmZmVyKGRzdEJ1ZmZlciwgc3JjU3RydWN0LCB0b3RhbE9mZnNldCwgbGl0dGxlRW5kaWFuKTtcbiAgfVxuXG4gIHJldHVybiBkc3RCdWZmZXIuYnVmZmVyO1xufVxuLyoqXG4gKiBTZXRzIGRhdGEgZnJvbSBhIHNvdXJjZSB0eXBlZCBhcnJheSB0byBhIGRlc3RpbmF0aW9uIGJ1ZmZlclxuICogQHBhcmFtIHtBcnJheX0gc3JjQXJyYXkgICAgICAgIFNvdXJjZSB0eXBlZCBhcnJheVxuICogQHBhcmFtIHtBcnJheUJ1ZmZlcn0gZHN0QnVmZmVyIERlc3RpbmF0aW9uIGJ1ZmZlclxuICogQHBhcmFtIHtOdW1iZXJ9IGxlbmd0aCAgICAgICAgIEJ5dGUgbGVuZ3RoIGZvciBjb3B5aW5nIGZyb20gYSBzb3VyY2UgdHlwZWQgYXJyYXlcbiAqIEBwYXJhbSB7TnVtYmVyfSBieXRlT2Zmc2V0ICAgICBCeXRlIG9mZnNldCBmcm9tIGEgc3RhcnQgb2YgYSBzb3VyY2UgdHlwZWQgYXJyYXlcbiAqIEBwYXJhbSB7TnVtYmVyfSB0b3RhbE9mZnNldCAgICBUb3RhbCBvZmZzZXQgaW4gYnl0ZXNcbiAqIEBwYXJhbSB7Qm9vbGVhbn0gbGl0dGxlRW5kaWFuICBMaXR0bGUtZW5kaWFuIGJ5dGVzIG9yZGVyIGZsYWdcbiAqL1xuZnVuY3Rpb24gc2V0QXJyYXlUb0J1ZmZlcihzcmNBcnJheSwgZHN0QnVmZmVyLCBsZW5ndGgsIHRvdGFsT2Zmc2V0LCBsaXR0bGVFbmRpYW4pXG57XG4gIGxldCBsO1xuICBsZXQgaSA9IHRvdGFsT2Zmc2V0LnZhbHVlIC8gc3JjQXJyYXkuQllURVNfUEVSX0VMRU1FTlQ7XG5cbiAgaWYoaXNOYU4obGVuZ3RoKSlcbiAge1xuICAgIGlmKGRzdEJ1ZmZlci5ieXRlTGVuZ3RoID4gc3JjQXJyYXkuYnl0ZUxlbmd0aCB8fFxuICAgICAgIGRzdEJ1ZmZlci5ieXRlTGVuZ3RoID09PSBzcmNBcnJheS5ieXRlTGVuZ3RoKVxuICAgIHtcbiAgICAgIGwgPSBzcmNBcnJheS5sZW5ndGg7XG4gICAgfVxuICAgIGVsc2VcbiAgICB7XG4gICAgICBsID0gZHN0QnVmZmVyLmJ5dGVMZW5ndGggLyBzcmNBcnJheS5CWVRFU19QRVJfRUxFTUVOVDtcbiAgICB9XG4gIH1cbiAgZWxzZVxuICB7XG4gICAgbCA9IGxlbmd0aCAvIHNyY0FycmF5LkJZVEVTX1BFUl9FTEVNRU5UICsgdG90YWxPZmZzZXQudmFsdWUgLyBzcmNBcnJheS5CWVRFU19QRVJfRUxFTUVOVDtcbiAgfVxuXG4gIHN3aXRjaChzcmNBcnJheS5jb25zdHJ1Y3Rvci5uYW1lKVxuICB7XG4gICAgY2FzZSBcIlVpbnQ4QXJyYXlcIjpcbiAgICAgIGZvcig7IGkgPCBsOyArK2kpXG4gICAgICB7XG4gICAgICAgIGRzdEJ1ZmZlci5zZXRVaW50OCh0b3RhbE9mZnNldC52YWx1ZSwgc3JjQXJyYXlbaV0sIGxpdHRsZUVuZGlhbiAmJiB0cnVlKTtcbiAgICAgICAgdG90YWxPZmZzZXQudmFsdWUgKz0gc3JjQXJyYXkuQllURVNfUEVSX0VMRU1FTlQ7XG4gICAgICB9XG4gICAgYnJlYWs7XG5cbiAgICBjYXNlIFwiVWludDE2QXJyYXlcIjpcbiAgICAgIGZvcig7IGkgPCBsOyArK2kpXG4gICAgICB7XG4gICAgICAgIGRzdEJ1ZmZlci5zZXRVaW50MTYodG90YWxPZmZzZXQudmFsdWUsIHNyY0FycmF5W2ldLCBsaXR0bGVFbmRpYW4gJiYgdHJ1ZSk7XG4gICAgICAgIHRvdGFsT2Zmc2V0LnZhbHVlICs9IHNyY0FycmF5LkJZVEVTX1BFUl9FTEVNRU5UO1xuICAgICAgfVxuICAgIGJyZWFrO1xuXG4gICAgY2FzZSBcIlVpbnQzMkFycmF5XCI6XG4gICAgICBmb3IoOyBpIDwgbDsgKytpKVxuICAgICAge1xuICAgICAgICBkc3RCdWZmZXIuc2V0VWludDMyKHRvdGFsT2Zmc2V0LnZhbHVlLCBzcmNBcnJheVtpXSwgbGl0dGxlRW5kaWFuICYmIHRydWUpO1xuICAgICAgICB0b3RhbE9mZnNldC52YWx1ZSArPSBzcmNBcnJheS5CWVRFU19QRVJfRUxFTUVOVDtcbiAgICAgIH1cbiAgICBicmVhaztcblxuICAgIGNhc2UgXCJJbnQ4QXJyYXlcIjpcbiAgICAgIGZvcig7IGkgPCBsOyArK2kpXG4gICAgICB7XG4gICAgICAgIGRzdEJ1ZmZlci5zZXRJbnQ4KHRvdGFsT2Zmc2V0LnZhbHVlLCBzcmNBcnJheVtpXSwgbGl0dGxlRW5kaWFuICYmIHRydWUpO1xuICAgICAgICB0b3RhbE9mZnNldC52YWx1ZSArPSBzcmNBcnJheS5CWVRFU19QRVJfRUxFTUVOVDtcbiAgICAgIH1cbiAgICBicmVhaztcblxuICAgIGNhc2UgXCJJbnQxNkFycmF5XCI6XG4gICAgICBmb3IoOyBpIDwgbDsgKytpKVxuICAgICAge1xuICAgICAgICBkc3RCdWZmZXIuc2V0SW50MTYodG90YWxPZmZzZXQudmFsdWUsIHNyY0FycmF5W2ldLCBsaXR0bGVFbmRpYW4gJiYgdHJ1ZSk7XG4gICAgICAgIHRvdGFsT2Zmc2V0LnZhbHVlICs9IHNyY0FycmF5LkJZVEVTX1BFUl9FTEVNRU5UO1xuICAgICAgfVxuICAgIGJyZWFrO1xuXG4gICAgY2FzZSBcIkludDMyQXJyYXlcIjpcbiAgICAgIGZvcig7IGkgPCBsOyArK2kpXG4gICAgICB7XG4gICAgICAgIGRzdEJ1ZmZlci5zZXRJbnQzMih0b3RhbE9mZnNldC52YWx1ZSwgc3JjQXJyYXlbaV0sIGxpdHRsZUVuZGlhbiAmJiB0cnVlKTtcbiAgICAgICAgdG90YWxPZmZzZXQudmFsdWUgKz0gc3JjQXJyYXkuQllURVNfUEVSX0VMRU1FTlQ7XG4gICAgICB9XG4gICAgYnJlYWs7XG5cbiAgICBjYXNlIFwiRmxvYXQzMkFycmF5XCI6XG4gICAgICBmb3IoOyBpIDwgbDsgKytpKVxuICAgICAge1xuICAgICAgICBkc3RCdWZmZXIuc2V0RmxvYXQzMih0b3RhbE9mZnNldC52YWx1ZSwgc3JjQXJyYXlbaV0sIGxpdHRsZUVuZGlhbiAmJiB0cnVlKTtcbiAgICAgICAgdG90YWxPZmZzZXQudmFsdWUgKz0gc3JjQXJyYXkuQllURVNfUEVSX0VMRU1FTlQ7XG4gICAgICB9XG4gICAgYnJlYWs7XG5cbiAgICBjYXNlIFwiRmxvYXQ2NEFycmF5XCI6XG4gICAgICBmb3IoOyBpIDwgbDsgKytpKVxuICAgICAge1xuICAgICAgICBkc3RCdWZmZXIuc2V0RmxvYXQ2NCh0b3RhbE9mZnNldC52YWx1ZSwgc3JjQXJyYXlbaV0sIGxpdHRsZUVuZGlhbiAmJiB0cnVlKTtcbiAgICAgICAgdG90YWxPZmZzZXQudmFsdWUgKz0gc3JjQXJyYXkuQllURVNfUEVSX0VMRU1FTlQ7XG4gICAgICB9XG4gICAgYnJlYWs7XG4gIH1cbn1cbi8qKlxuICogU2V0cyBkYXRhIGZyb20gYSBzb3VyY2UgYnVmZmVyIGFycmF5IHRvIGEgZGVzdGluYXRpb24gdHlwZWQgYXJyYXlcbiAqIEBwYXJhbSB7QXJyYXlCdWZmZXJ9IHNyY0J1ZmZlciBTb3JjZSBidWZmZXJcbiAqIEBwYXJhbSB7QXJyYXl9IGRzdEFycmF5ICAgICAgICBEZXN0aW5hdGlvbiB0eXBlZCBhcnJheVxuICogQHBhcmFtIHtOdW1iZXJ9IGxlbmd0aCAgICAgICAgIEJ5dGUgbGVuZ3RoIGZvciBjb3B5aW5nIGZyb20gYSBzb3VyY2UgYnVmZmVyXG4gKiBAcGFyYW0ge051bWJlcn0gdG90YWxPZmZzZXQgICAgVG90YWwgb2Zmc2V0IGluIGJ5dGVzXG4gKiBAcGFyYW0ge0Jvb2xlYW59IGxpdHRsZUVuZGlhbiAgTGl0dGxlLWVuZGlhbiBieXRlcyBvcmRlciBmbGFnXG4gKi9cbmZ1bmN0aW9uIHNldEJ1ZmZlclRvQXJyYXkoc3JjQnVmZmVyLCBkc3RBcnJheSwgbGVuZ3RoLCB0b3RhbE9mZnNldCwgbGl0dGxlRW5kaWFuKVxue1xuICBsZXQgbDtcblxuICBpZihpc05hTihsZW5ndGgpKVxuICB7XG4gICAgaWYoc3JjQnVmZmVyLmJ5dGVMZW5ndGggPiBkc3RBcnJheS5ieXRlTGVuZ3RoIHx8XG4gICAgICAgc3JjQnVmZmVyLmJ5dGVMZW5ndGggPT09IGRzdEFycmF5LmJ5dGVMZW5ndGgpXG4gICAge1xuICAgICAgbCA9IGRzdEFycmF5Lmxlbmd0aDtcbiAgICB9XG4gICAgZWxzZVxuICAgIHtcbiAgICAgIGwgPSBzcmNCdWZmZXIuYnl0ZUxlbmd0aCAvIGRzdEFycmF5LkJZVEVTX1BFUl9FTEVNRU5UO1xuICAgIH1cbiAgfVxuICBlbHNlXG4gIHtcbiAgICBsID0gbGVuZ3RoIC8gZHN0QXJyYXkuQllURVNfUEVSX0VMRU1FTlQ7XG4gIH1cblxuICBzd2l0Y2goZHN0QXJyYXkuY29uc3RydWN0b3IubmFtZSlcbiAge1xuICAgIGNhc2UgXCJVaW50OEFycmF5XCI6XG4gICAgICBmb3IobGV0IGkgPSAwOyBpIDwgbDsgKytpKVxuICAgICAge1xuICAgICAgICBkc3RBcnJheVtpXSA9IHNyY0J1ZmZlci5nZXRVaW50OCh0b3RhbE9mZnNldC52YWx1ZSwgbGl0dGxlRW5kaWFuICYmIHRydWUpO1xuICAgICAgICB0b3RhbE9mZnNldC52YWx1ZSArPSBkc3RBcnJheS5CWVRFU19QRVJfRUxFTUVOVDtcbiAgICAgIH1cbiAgICBicmVhaztcblxuICAgIGNhc2UgXCJVaW50MTZBcnJheVwiOlxuICAgICAgZm9yKGxldCBpID0gMDsgaSA8IGw7ICsraSlcbiAgICAgIHtcbiAgICAgICAgZHN0QXJyYXlbaV0gPSBzcmNCdWZmZXIuZ2V0VWludDE2KHRvdGFsT2Zmc2V0LnZhbHVlLCBsaXR0bGVFbmRpYW4gJiYgdHJ1ZSk7XG4gICAgICAgIHRvdGFsT2Zmc2V0LnZhbHVlICs9IGRzdEFycmF5LkJZVEVTX1BFUl9FTEVNRU5UO1xuICAgICAgfVxuICAgIGJyZWFrO1xuXG4gICAgY2FzZSBcIlVpbnQzMkFycmF5XCI6XG4gICAgICBmb3IobGV0IGkgPSAwOyBpIDwgbDsgKytpKVxuICAgICAge1xuICAgICAgICBkc3RBcnJheVtpXSA9IHNyY0J1ZmZlci5nZXRVaW50MzIodG90YWxPZmZzZXQudmFsdWUsIGxpdHRsZUVuZGlhbiAmJiB0cnVlKTtcbiAgICAgICAgdG90YWxPZmZzZXQudmFsdWUgKz0gZHN0QXJyYXkuQllURVNfUEVSX0VMRU1FTlQ7XG4gICAgICB9XG4gICAgYnJlYWs7XG5cbiAgICBjYXNlIFwiSW50OEFycmF5XCI6XG4gICAgICBmb3IobGV0IGkgPSAwOyBpIDwgbDsgKytpKVxuICAgICAge1xuICAgICAgICBkc3RBcnJheVtpXSA9IHNyY0J1ZmZlci5nZXRJbnQ4KHRvdGFsT2Zmc2V0LnZhbHVlLCBsaXR0bGVFbmRpYW4gJiYgdHJ1ZSk7XG4gICAgICAgIHRvdGFsT2Zmc2V0LnZhbHVlICs9IGRzdEFycmF5LkJZVEVTX1BFUl9FTEVNRU5UO1xuICAgICAgfVxuICAgIGJyZWFrO1xuXG4gICAgY2FzZSBcIkludDE2QXJyYXlcIjpcbiAgICAgIGZvcihsZXQgaSA9IDA7IGkgPCBsOyArK2kpXG4gICAgICB7XG4gICAgICAgIGRzdEFycmF5W2ldID0gc3JjQnVmZmVyLmdldEludDE2KHRvdGFsT2Zmc2V0LnZhbHVlLCBsaXR0bGVFbmRpYW4gJiYgdHJ1ZSk7XG4gICAgICAgIHRvdGFsT2Zmc2V0LnZhbHVlICs9IGRzdEFycmF5LkJZVEVTX1BFUl9FTEVNRU5UO1xuICAgICAgfVxuICAgIGJyZWFrO1xuXG4gICAgY2FzZSBcIkludDMyQXJyYXlcIjpcbiAgICAgIGZvcihsZXQgaSA9IDA7IGkgPCBsOyArK2kpXG4gICAgICB7XG4gICAgICAgIGRzdEFycmF5W2ldID0gc3JjQnVmZmVyLmdldEludDMyKHRvdGFsT2Zmc2V0LnZhbHVlLCBsaXR0bGVFbmRpYW4gJiYgdHJ1ZSk7XG4gICAgICAgIHRvdGFsT2Zmc2V0LnZhbHVlICs9IGRzdEFycmF5LkJZVEVTX1BFUl9FTEVNRU5UO1xuICAgICAgfVxuICAgIGJyZWFrO1xuXG4gICAgY2FzZSBcIkZsb2F0MzJBcnJheVwiOlxuICAgICAgZm9yKGxldCBpID0gMDsgaSA8IGw7ICsraSlcbiAgICAgIHtcbiAgICAgICAgZHN0QXJyYXlbaV0gPSBzcmNCdWZmZXIuZ2V0RmxvYXQzMih0b3RhbE9mZnNldC52YWx1ZSwgbGl0dGxlRW5kaWFuICYmIHRydWUpO1xuICAgICAgICB0b3RhbE9mZnNldC52YWx1ZSArPSBkc3RBcnJheS5CWVRFU19QRVJfRUxFTUVOVDtcbiAgICAgIH1cbiAgICBicmVhaztcblxuICAgIGNhc2UgXCJGbG9hdDY0QXJyYXlcIjpcbiAgICAgIGZvcihsZXQgaSA9IDA7IGkgPCBsOyArK2kpXG4gICAgICB7XG4gICAgICAgIGRzdEFycmF5W2ldID0gc3JjQnVmZmVyLmdldEZsb2F0NjQodG90YWxPZmZzZXQudmFsdWUsIGxpdHRsZUVuZGlhbiAmJiB0cnVlKTtcbiAgICAgICAgdG90YWxPZmZzZXQudmFsdWUgKz0gZHN0QXJyYXkuQllURVNfUEVSX0VMRU1FTlQ7XG4gICAgICB9XG4gICAgYnJlYWs7XG4gIH1cbn1cbi8qKlxuICogQ29waWVzIGEgc291cmNlIGJ1ZmZlciB0byBhIGRlc3RpbmF0aW9uIHR5cGVkIGFycmF5XG4gKiBAcGFyYW0gIHtBcnJheUJ1ZmZlcn0gc3JjQnVmZmVyICAgICAgICAgU291cmNlIGJ1ZmZlclxuICogQHBhcmFtICB7QXJyYXl9ICAgICAgIGRzdEFycmF5ICAgICAgICAgIERlc3RpbmF0aW9uIHR5cGVkIGFycmF5XG4gKiBAcGFyYW0gIHtOdW1iZXJ9ICAgICAgYnl0ZU9mZnNldD0wICAgICAgQnl0ZSBvZmZzZXQgZnJvbSBhIHN0YXJ0IG9mIGEgc291cmNlIGJ1ZmZlclxuICogQHBhcmFtICB7TnVtYmVyfSAgICAgIGxlbmd0aD1OYU4gICAgICAgIEJ5dGUgbGVuZ3RoIGZvciBjb3B5aW5nIGZyb20gYSBzb3VyY2UgYnVmZmVyXG4gKiBAcGFyYW0gIHtCb29sZWFufSAgICAgbGl0dGxlRW5kaWFuPXRydWUgTGl0dGxlLWVuZGlhbiBieXRlcyBvcmRlciBmbGFnXG4gKiBAcmV0dXJuIHtBcnJheX0gICAgICAgICAgICAgICAgICAgICAgICAgRGVzdGluYXRpb24gYXJyYXkgcmVmZXJlbmNlXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBidWZmZXJUb0FycmF5KHNyY0J1ZmZlciwgZHN0QXJyYXksIGJ5dGVPZmZzZXQgPSAwLCBsZW5ndGggPSBOYU4sIGxpdHRsZUVuZGlhbiA9IHRydWUpXG57XG4gIGlmKCFkc3RBcnJheS5CWVRFU19QRVJfRUxFTUVOVCB8fCAhKHNyY0J1ZmZlciBpbnN0YW5jZW9mIEFycmF5QnVmZmVyKSB8fFxuICAgICAodHlwZW9mIGxlbmd0aCAhPT0gXCJudW1iZXJcIiAmJiAhaXNOYU4obGVuZ3RoKSkgfHxcbiAgICAgKHR5cGVvZiBieXRlT2Zmc2V0ICE9PSBcIm51bWJlclwiKSB8fCAodHlwZW9mIGxpdHRsZUVuZGlhbiAhPT0gXCJib29sZWFuXCIpKVxuICB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiW2N0eXBlXSAnYnVmZmVyVG9BcnJheScgZnVuY3Rpb246IGludmFsaWQgYXJndW1lbnRzIGluIHRoZSBzaWduYXR1cmUgKEFycmF5QnVmZmVyIHNyY0J1ZmZlciwgVHlwZWRBcnJheSBkc3RBcnJheSwgTnVtYmVyIGxlbmd0aCA9IE5hTiwgTnVtYmVyTnVtYmVyIG9mZnNldCA9IDAsIEJvb2xlYW4gbGl0dGxlRW5kaWFuID0gdHJ1ZSlcIik7XG4gIH1cblxuICBpZihsZW5ndGggPCAwKVxuICB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiW2N0eXBlXSAnYnVmZmVyVG9BcnJheScgZnVuY3Rpb246IHRoZSBjb3B5aW5nIGJ5dGUgbGVuZ3RoIG11c3QgYmUgYSBwb3NpdGl2ZSB2YWx1ZVwiKTtcbiAgfVxuXG4gIGxldCBzcmNCdWYgICAgICA9IG5ldyBEYXRhVmlldyhzcmNCdWZmZXIsIGJ5dGVPZmZzZXQpO1xuICBsZXQgdG90YWxPZmZzZXQgPSB7IHZhbHVlOiAwIH07XG5cbiAgc2V0QnVmZmVyVG9BcnJheShzcmNCdWYsIGRzdEFycmF5LCBsZW5ndGgsIHRvdGFsT2Zmc2V0LCBsaXR0bGVFbmRpYW4pO1xuXG4gIHJldHVybiBkc3RBcnJheTtcbn1cbi8qKlxuICogQ29waWVzIGEgc291cmNlIHR5cGVkIGFycmF5IHRvIGEgZGVzdGluYXRpb24gYnVmZmVyXG4gKiBAcGFyYW0gIHtBcnJheX0gc3JjQXJyYXkgICAgICAgICAgICAgICAgIFNvdXJjZSB0eXBlZCBhcnJheVxuICogQHBhcmFtICB7QXJyYXlCdWZmZXJ9IGV4aXN0ZWRCdWZmZXI9bnVsbCBEZXNFeGlzdGVkIGJ1ZmZlclxuICogQHBhcmFtICB7TnVtYmVyfSBieXRlT2Zmc2V0PTAgICAgICAgICAgICBCeXRlIG9mZnNldCBmcm9tIGEgc3RhcnQgb2YgYSBzb3VyY2UgdHlwZWQgYXJyYXlcbiAqIEBwYXJhbSAge051bWJlcn0gbGVuZ3RoPU5hTiAgICAgICAgICAgICAgQnl0ZSBsZW5ndGggZm9yIGNvcHlpbmcgZnJvbSBhIHNvdXJjZSB0eXBlZCBhcnJheVxuICogQHBhcmFtICB7Qm9vbGVhbn0gbGl0dGxlRW5kaWFuPXRydWUgICAgICBMaXR0bGUtZW5kaWFuIGJ5dGVzIG9yZGVyIGZsYWdcbiAqIEByZXR1cm4ge0FycmF5QnVmZmVyfSAgICAgICAgICAgICAgICAgICAgRGVzdGluYXRpb24gYnVmZmVyIHJlZmVyZW5jZVxuICovXG5leHBvcnQgZnVuY3Rpb24gYXJyYXlUb0J1ZmZlcihzcmNBcnJheSwgZXhpc3RlZEJ1ZmZlciA9IG51bGwsIGJ5dGVPZmZzZXQgPSAwLCBsZW5ndGggPSBOYU4sIGxpdHRsZUVuZGlhbiA9IHRydWUpXG57XG4gIGlmKCFzcmNBcnJheS5CWVRFU19QRVJfRUxFTUVOVCB8fFxuICAgICAoIShleGlzdGVkQnVmZmVyIGluc3RhbmNlb2YgQXJyYXlCdWZmZXIpICYmIGV4aXN0ZWRCdWZmZXIgIT09IG51bGwpIHx8XG4gICAgICh0eXBlb2YgbGVuZ3RoICE9PSBcIm51bWJlclwiKSB8fFxuICAgICAodHlwZW9mIGJ5dGVPZmZzZXQgIT09IFwibnVtYmVyXCIpIHx8XG4gICAgICh0eXBlb2YgbGl0dGxlRW5kaWFuICE9PSBcImJvb2xlYW5cIikpXG4gIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJbY3R5cGVdICdhcnJheVRvQnVmZmVyJyBmdW5jdGlvbjogaW52YWxpZCBhcmd1bWVudHMgaW4gdGhlIHNpZ25hdHVyZSAoVHlwZWRBcnJheSBzcmNBcnJheSwgQXJyYXlCdWZmZXIgZXhpc3RlZEJ1ZmZlciA9IG51bGwsIE51bWJlciBsZW5ndGggPSBOYU4sIE51bWJlciBieXRlT2Zmc2V0ID0gMCwgQm9vbGVhbiBsaXR0bGVFbmRpYW4gPSB0cnVlKVwiKTtcbiAgfVxuXG4gIGlmKGxlbmd0aCA8IDApXG4gIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJbY3R5cGVdICdhcnJheVRvQnVmZmVyJyBmdW5jdGlvbjogdGhlIGNvcHlpbmcgYnl0ZSBsZW5ndGggbXVzdCBiZSBhIHBvc2l0aXZlIHZhbHVlXCIpO1xuICB9XG5cbiAgbGV0IHRvdGFsT2Zmc2V0ID0geyB2YWx1ZTogYnl0ZU9mZnNldCB9O1xuICBsZXQgYXJyYXlCdWZmZXIsIGRzdEJ1ZmZlcjtcblxuICBpZihleGlzdGVkQnVmZmVyID09PSBudWxsKVxuICB7XG4gICAgYXJyYXlCdWZmZXIgPSBuZXcgQXJyYXlCdWZmZXIoc3JjQXJyYXkuYnl0ZUxlbmd0aCk7XG4gICAgZHN0QnVmZmVyICAgPSBuZXcgRGF0YVZpZXcgICAoYXJyYXlCdWZmZXIpO1xuXG4gICAgc2V0QXJyYXlUb0J1ZmZlcihzcmNBcnJheSwgZHN0QnVmZmVyLCBsZW5ndGgsIHRvdGFsT2Zmc2V0LCBsaXR0bGVFbmRpYW4pO1xuICB9XG4gIGVsc2VcbiAge1xuICAgIGRzdEJ1ZmZlciA9IG5ldyBEYXRhVmlldyhleGlzdGVkQnVmZmVyKTtcblxuICAgIHNldEFycmF5VG9CdWZmZXIoc3JjQXJyYXksIGRzdEJ1ZmZlciwgbGVuZ3RoLCB0b3RhbE9mZnNldCwgbGl0dGxlRW5kaWFuKTtcbiAgfVxuXG4gIHJldHVybiBkc3RCdWZmZXIuYnVmZmVyO1xufVxuIiwiLyoqXG4gKiBAZmlsZSBzcmMvZXhwb3J0LmpzXG4gKiBFeHBvcnRpbmcgc2NyaXB0XG4gKi9cblxuXCJ1c2Ugc3RyaWN0XCI7XG5cbmltcG9ydCAqIGFzIGN0eXBlIGZyb20gXCIuL2N0eXBlXCI7XG5pZighd2luZG93LmN0eXBlKVxue1xuICAvL3dpbmRvdy5jdHlwZSA9IGN0eXBlO1xuICBPYmplY3QuZGVmaW5lUHJvcGVydHkod2luZG93LCBcImN0eXBlXCIsXG4gIHtcbiAgICB2YWx1ZSAgICAgICA6IGN0eXBlLFxuICAgIHdyaXRhYmxlICAgIDogZmFsc2UsXG4gICAgZW51bWVyYWJsZSAgOiBmYWxzZSxcbiAgICBjb25maWd1cmFibGU6IGZhbHNlXG4gIH0pO1xufVxuZWxzZVxue1xuICAvL3dpbmRvdy5saWJjdHlwZWpzID0gY3R5cGU7XG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh3aW5kb3csIFwibGliY3R5cGVqc1wiLFxuICB7XG4gICAgdmFsdWUgICAgICAgOiBjdHlwZSxcbiAgICB3cml0YWJsZSAgICA6IGZhbHNlLFxuICAgIGVudW1lcmFibGUgIDogZmFsc2UsXG4gICAgY29uZmlndXJhYmxlOiBmYWxzZVxuICB9KTtcbiAgY29uc29sZS53YXJuKFwiW0NUeXBlSlNdIGxpYnJhcnkgZXhwb3J0aW5nOiAnY3R5cGUnIG5hbWUgaXMgYWxyZWFkeSByZXNlcnZlZC4gTGlicmFyeSB3YXMgcmVuYW1lZCB0byAnbGliY3R5cGVqcycuXCIpO1xufVxuIl19
