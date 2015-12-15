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
function isObject(object)
{
  return (typeof object === "object");
}
/**
 * Does deep copy of an object
 * @param {Object} destObj Destination object
 * @param {Object} srcObj  Source object
 */
function copyObject(destObj, srcObj)
{
  if(destObj)
  {
    if(!isObject(destObj) || destObj === null)
    {
      throw new Error("[CType] 'copyObject' function: " + "a destination object '" + destObj.toString() + "' must have an object type");
    }

    for(let it in srcObj)
    {
      if(!isObject(srcObj[it]) || srcObj[it] === null)
      {
        destObj[it] = srcObj[it];
      }
      if(isObject(srcObj[it]) && srcObj[it] !== null && srcObj[it].length !== undefined)
      {
        destObj[it] = new window[srcObj[it].constructor.name](srcObj[it].length);
        allocateArray(destObj[it], srcObj[it]);
        continue;
      }
      if(isObject(srcObj[it]) && srcObj[it] !== null)
      {
        destObj[it] = {};
        copyObject(destObj[it], srcObj[it]);
      }
    }
  }
  else
  {
    throw new Error("[CType] 'copyObject' function: set a non-empty parameter: [object]");
  }
}

function allocateArray(destArr, srcArr)
{
  let l = srcArr.length;

  if(destArr)
  {
    if(!isObject(destArr) || destArr.length === undefined || destArr === null)
    {
      throw new Error("[CType] 'allocateArray' function: " + "a destination object '" + destArr.toString() + "' must have an array type");
    }

    for(let it = 0; it < l; ++it)
    {
      if(isObject(srcArr[it]) && srcArr[it] !== null && srcArr[it].length !== undefined)
      {
        destArr[it] = new window[srcArr[it].constructor.name](srcArr[it].length);
        allocateArray(destArr[it], srcArr[it]);
        continue;
      }
      if(isObject(srcArr[it]) && srcArr[it] !== null)
      {
        destArr[it] = {};
        copyObject(destArr[it], srcArr[it]);
      }
    }
  }
  else
  {
    throw new Error("[CType] 'allocateArray' function: set a non-empty parameter: [array]");
  }
}

/**
 * Gets a size of source structure
 * @param  {Object} srcStruct Source structure
 * @param  {Number} totalSize Total size in bytes
 */
function getStructSize(srcStruct, totalSize)
{
  let isEmpty = false;

  for(let field in srcStruct)
  {
    let fieldValue = srcStruct[field];
    isEmpty        = false;

    if(!isObject(fieldValue) && !fieldValue.BYTES_PER_ELEMENT && !srcStruct.byteLength)
    {
      throw new Error("[ctype] 'struct' function: invalid structure field '" + field + ":" + fieldValue + "'");
    }

    if(!fieldValue.BYTES_PER_ELEMENT)
    {
      if(fieldValue.length)
      {
        for(let i = 0; i < fieldValue.length; ++i)
        {
          if(isObject(fieldValue[i]))
          {
            getStructSize(fieldValue[i], totalSize);
          }
        }
      }
      else
      {
        if(isObject(fieldValue))
        {
          getStructSize(fieldValue, totalSize);
        }
      }
    }
    else
    {
      totalSize.value += fieldValue.byteLength;
    }
  }

  if(isEmpty)
  {
    throw new Error("[ctype] 'struct' function: invalid structure field - an empty object");
  }
}
/**
 * uint8(Uint8Array) type byte length
 * @type {Number}
 */
export const UINT8_SIZE  = Uint8Array.BYTES_PER_ELEMENT;
/**
 * uint16(Uint16Array) type byte length
 * @type {Number}
 */
export const UINT16_SIZE = Uint16Array.BYTES_PER_ELEMENT;
/**
 * uint32(Uint32Array) type byte length
 * @type {Number}
 */
export const UINT32_SIZE   = Uint32Array.BYTES_PER_ELEMENT;
/**
 * int8(Int8Array) type byte length
 * @type {Number}
 */
export const INT8_SIZE   = Int8Array.BYTES_PER_ELEMENT;
/**
 * int16(Int16Array) type byte length
 * @type {Number}
 */
export const INT16_SIZE  = Int16Array.BYTES_PER_ELEMENT;
/**
 * int32(Uint32Array) type byte length
 * @type {Number}
 */
export const INT32_SIZE    = Int32Array.BYTES_PER_ELEMENT;
/**
 * float32(Float32Array) type byte length
 * @type {Number}
 */
export const FLOAT32_SIZE  = Float32Array.BYTES_PER_ELEMENT;
/**
 * float64(Float64Array) type byte length
 * @type {Number}
 */
export const FLOAT64_SIZE = Float64Array.BYTES_PER_ELEMENT;
/**
 * Returns new 'unsigned char array[size]' C equivalent
 * @param  {Number} size=1 Array length
 * @return {Uint8Array}      Unsigned 8-byte integer array
 */
export function uint8(size = 1)
{
  let ctype = new Uint8Array(size);
  return ctype;
}
/**
 * Returns new 'unsigned short array[size]' C equivalent
 * @param  {Number} size=1 Array length
 * @return {Uint16Array}     Unsigned 16-byte integer array
 */
export function uint16(size = 1)
{
  let ctype = new Uint16Array(size);
  return ctype;
}
/**
 * Returns new 'unsigned int array[size]' C equivalent
 * @param  {Number} size=1 Array length
 * @return {Uint32Array}     Unsigned 32-byte integer array
 */
export function uint32(size = 1)
{
  let ctype = new Uint32Array(size);
  return ctype;
}
/**
 * Returns new 'char array[size]' C equivalent
 * @param  {Number} size=1 Array length
 * @return {Int8Array}       Signed 8-byte integer array
 */
export function int8(size = 1)
{
  let ctype = new Int8Array(size);
  return ctype;
}
/**
 * Returns new 'short array[size]' C equivalent
 * @param  {Number} size=1 Array length
 * @return {Int16Array}      Signed 16-byte integer array
 */
export function int16(size = 1)
{
  let ctype = new Int16Array(size);
  return ctype;
}
/**
 * Returns new 'int array[size]' C equivalent
 * @param  {Number} size=1 Array length
 * @return {Int32Array}      Signed 32-byte integer array
 */
export function int32(size = 1)
{
  let ctype = new Int32Array(size);
  return ctype;
}
/**
 * Returns new 'float array[size]' C equivalent
 * @param  {Number} size=1 Array length
 * @return {Float32Array}    Signed 32-byte floating point array
 */
export function float32(size = 1)
{
  let ctype = new Float32Array(size);
  return ctype;
}
/**
 * Returns new 'double array[size]' C equivalent
 * @param  {Number} size=1 Array length
 * @return {Float64Array}    Signed 64-byte floating point array
 */
export function float64(size = 1)
{
  let ctype = new Float64Array(size);
  return ctype;
}
/**
 * Returns new 'struct s[size]' C equivalent with 'byteLength' field is a total size of structure
 * @param  {Object} srcStruct Empty source object
 * @param  {Number} size=1    Array length
 * @return {Object}           Object structure with typed fields
 */
export function struct(srcStruct, size = 1)
{
  if(!isObject(srcStruct) || (typeof size !== "number"))
  {
    throw new Error("[ctype] 'struct' function: invalid arguments (Object srcStruct, Number size)");
  }

  let totalSize = { value: 0 };

  getStructSize(srcStruct, totalSize);

  if(size > 1)
  {
    let dstStructs = [];
    for(let i = 0; i < size; ++i)
    {
      dstStructs[i] = {};
      copyObject(dstStructs[i], srcStruct);

      Object.defineProperty(dstStructs[i], "byteLength",
      {
        value       : totalSize.value,
        writable    : false,
        enumerable  : true,
        configurable: false
      });
    }
    return dstStructs;
  }
  else
  {
    let dstStruct = {};
    copyObject(dstStruct, srcStruct);

    Object.defineProperty(dstStruct, "byteLength",
    {
      value       : totalSize.value,
      writable    : false,
      enumerable  : true,
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
function setBufferToStruct(dstStruct, srcBuffer, totalOffset, littleEndian)
{
  for(let field in dstStruct)
  {
    let fieldValue = dstStruct[field];

    if(fieldValue.constructor.name === "Array")
    {
      let l = fieldValue.length;

      for(let i = 0; i < l; ++i)
      {
        setBufferToStruct(fieldValue[i], srcBuffer, totalOffset, littleEndian);
      }
    }
    else
    {
      if(fieldValue.constructor.name === "Object")
      {
        setBufferToStruct(fieldValue, srcBuffer, totalOffset, littleEndian);
      }
      else
      {
        let l = fieldValue.length;

        switch(fieldValue.constructor.name)
        {
          case "Uint8Array":
            for(let i = 0; i < l; ++i)
            {
              fieldValue[i] = srcBuffer.getUint8(totalOffset.value, littleEndian && true);
              totalOffset.value += fieldValue.BYTES_PER_ELEMENT;
            }
          break;

          case "Uint16Array":
            for(let i = 0; i < l; ++i)
            {
              fieldValue[i] = srcBuffer.getUint16(totalOffset.value, littleEndian && true);
              totalOffset.value += fieldValue.BYTES_PER_ELEMENT;
            }
          break;

          case "Uint32Array":
            for(let i = 0; i < l; ++i)
            {
              fieldValue[i] = srcBuffer.getUint32(totalOffset.value, littleEndian && true);
              totalOffset.value += fieldValue.BYTES_PER_ELEMENT;
            }
          break;

          case "Int8Array":
            for(let i = 0; i < l; ++i)
            {
              fieldValue[i] = srcBuffer.getInt8(totalOffset.value, littleEndian && true);
              totalOffset.value += fieldValue.BYTES_PER_ELEMENT;
            }
          break;

          case "Int16Array":
            for(let i = 0; i < l; ++i)
            {
              fieldValue[i] = srcBuffer.getInt16(totalOffset.value, littleEndian && true);
              totalOffset.value += fieldValue.BYTES_PER_ELEMENT;
            }
          break;

          case "Int32Array":
            for(let i = 0; i < l; ++i)
            {
              fieldValue[i] = srcBuffer.getInt32(totalOffset.value, littleEndian && true);
              totalOffset.value += fieldValue.BYTES_PER_ELEMENT;
            }
          break;

          case "Float32Array":
            for(let i = 0; i < l; ++i)
            {
              fieldValue[i] = srcBuffer.getFloat32(totalOffset.value, littleEndian && true);
              totalOffset.value += fieldValue.BYTES_PER_ELEMENT;
            }
          break;

          case "Float64Array":
            for(let i = 0; i < l; ++i)
            {
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
function setStructToBuffer(dstBuffer, srcStruct, totalOffset, littleEndian)
{
  for(let field in srcStruct)
  {
    let fieldValue = srcStruct[field];

    if(fieldValue.constructor.name === "Array")
    {
      let l = fieldValue.length;

      for(let i = 0; i < l; ++i)
      {
        setStructToBuffer(dstBuffer, fieldValue[i], totalOffset, littleEndian);
      }
    }
    else
    {
      if(fieldValue.constructor.name === "Object")
      {
        setStructToBuffer(dstBuffer, fieldValue, totalOffset, littleEndian);
      }
      else
      {
        let l = fieldValue.length;

        switch(fieldValue.constructor.name)
        {
          case "Uint8Array":
            for(let i = 0; i < l; ++i)
            {
              dstBuffer.setUint8(totalOffset.value, fieldValue[i], littleEndian && true);
              totalOffset.value += fieldValue.BYTES_PER_ELEMENT;
            }
          break;

          case "Uint16Array":
            for(let i = 0; i < l; ++i)
            {
              dstBuffer.setUint16(totalOffset.value, fieldValue[i], littleEndian && true);
              totalOffset.value += fieldValue.BYTES_PER_ELEMENT;
            }
          break;

          case "Uint32Array":
            for(let i = 0; i < l; ++i)
            {
              dstBuffer.setUint32(totalOffset.value, fieldValue[i], littleEndian && true);
              totalOffset.value += fieldValue.BYTES_PER_ELEMENT;
            }
          break;

          case "Int8Array":
            for(let i = 0; i < l; ++i)
            {
              dstBuffer.setInt8(totalOffset.value, fieldValue[i], littleEndian && true);
              totalOffset.value += fieldValue.BYTES_PER_ELEMENT;
            }
          break;

          case "Int16Array":
            for(let i = 0; i < l; ++i)
            {
              dstBuffer.setInt16(totalOffset.value, fieldValue[i], littleEndian && true);
              totalOffset.value += fieldValue.BYTES_PER_ELEMENT;
            }
          break;

          case "Int32Array":
            for(let i = 0; i < l; ++i)
            {
              dstBuffer.setInt32(totalOffset.value, fieldValue[i], littleEndian && true);
              totalOffset.value += fieldValue.BYTES_PER_ELEMENT;
            }
          break;

          case "Float32Array":
            for(let i = 0; i < l; ++i)
            {
              dstBuffer.setFloat32(totalOffset.value, fieldValue[i], littleEndian && true);
              totalOffset.value += fieldValue.BYTES_PER_ELEMENT;
            }
          break;

          case "Float64Array":
            for(let i = 0; i < l; ++i)
            {
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
export function bufferToStruct(srcBuffer, dstStruct, byteOffset = 0, littleEndian = true)
{
  if(!isObject(dstStruct) || !(srcBuffer instanceof ArrayBuffer) || (typeof byteOffset !== "number") || (typeof littleEndian !== "boolean"))
  {
    throw new Error("[ctype] 'bufferToStruct' function: invalid arguments in the signature (ArrayBuffer srcBuffer, Object dstStruct, Number byteOffset = 0, Boolean littleEndian = true)");
  }

  let srcBuf;

  try
  {
    srcBuf = new DataView(srcBuffer, byteOffset);
  }
  catch(e)
  {
    console.log(e);
    return;
  }

  let totalOffset  = { value: 0 };

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
export function structToBuffer(srcStruct, existedBuffer = null, byteOffset = 0, littleEndian = true)
{
  if(!isObject(srcStruct) ||
     (!(existedBuffer instanceof ArrayBuffer) && existedBuffer !== null) ||
     (typeof byteOffset !== "number") ||
     (typeof littleEndian !== "boolean"))
  {
    throw new Error("[ctype] 'structToBuffer' function: invalid arguments in the signature (Object srcStruct, ArrayBuffer existedBuffer = null, Number byteOffset = 0, Boolean littleEndian = true)");
  }

  let totalOffset = { value: 0 };
  let arrayBuffer, dstBuffer;

  if(existedBuffer === null)
  {
    if(srcStruct instanceof Array)
    {
      let l = srcStruct.length;

      arrayBuffer = new ArrayBuffer(srcStruct[0].byteLength * l);
      dstBuffer   = new DataView   (arrayBuffer);
    }
    else
    {
      arrayBuffer = new ArrayBuffer(srcStruct.byteLength);
      dstBuffer   = new DataView   (arrayBuffer);
    }

    setStructToBuffer(dstBuffer, srcStruct, totalOffset, littleEndian);
  }
  else
  {
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
function setArrayToBuffer(srcArray, dstBuffer, length, totalOffset, littleEndian)
{
  let l;
  let i = totalOffset.value / srcArray.BYTES_PER_ELEMENT;

  if(isNaN(length))
  {
    if(dstBuffer.byteLength > srcArray.byteLength ||
       dstBuffer.byteLength === srcArray.byteLength)
    {
      l = srcArray.length;
    }
    else
    {
      l = dstBuffer.byteLength / srcArray.BYTES_PER_ELEMENT;
    }
  }
  else
  {
    l = length / srcArray.BYTES_PER_ELEMENT + totalOffset.value / srcArray.BYTES_PER_ELEMENT;
  }

  switch(srcArray.constructor.name)
  {
    case "Uint8Array":
      for(; i < l; ++i)
      {
        dstBuffer.setUint8(totalOffset.value, srcArray[i], littleEndian && true);
        totalOffset.value += srcArray.BYTES_PER_ELEMENT;
      }
    break;

    case "Uint16Array":
      for(; i < l; ++i)
      {
        dstBuffer.setUint16(totalOffset.value, srcArray[i], littleEndian && true);
        totalOffset.value += srcArray.BYTES_PER_ELEMENT;
      }
    break;

    case "Uint32Array":
      for(; i < l; ++i)
      {
        dstBuffer.setUint32(totalOffset.value, srcArray[i], littleEndian && true);
        totalOffset.value += srcArray.BYTES_PER_ELEMENT;
      }
    break;

    case "Int8Array":
      for(; i < l; ++i)
      {
        dstBuffer.setInt8(totalOffset.value, srcArray[i], littleEndian && true);
        totalOffset.value += srcArray.BYTES_PER_ELEMENT;
      }
    break;

    case "Int16Array":
      for(; i < l; ++i)
      {
        dstBuffer.setInt16(totalOffset.value, srcArray[i], littleEndian && true);
        totalOffset.value += srcArray.BYTES_PER_ELEMENT;
      }
    break;

    case "Int32Array":
      for(; i < l; ++i)
      {
        dstBuffer.setInt32(totalOffset.value, srcArray[i], littleEndian && true);
        totalOffset.value += srcArray.BYTES_PER_ELEMENT;
      }
    break;

    case "Float32Array":
      for(; i < l; ++i)
      {
        dstBuffer.setFloat32(totalOffset.value, srcArray[i], littleEndian && true);
        totalOffset.value += srcArray.BYTES_PER_ELEMENT;
      }
    break;

    case "Float64Array":
      for(; i < l; ++i)
      {
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
function setBufferToArray(srcBuffer, dstArray, length, totalOffset, littleEndian)
{
  let l;

  if(isNaN(length))
  {
    if(srcBuffer.byteLength > dstArray.byteLength ||
       srcBuffer.byteLength === dstArray.byteLength)
    {
      l = dstArray.length;
    }
    else
    {
      l = srcBuffer.byteLength / dstArray.BYTES_PER_ELEMENT;
    }
  }
  else
  {
    l = length / dstArray.BYTES_PER_ELEMENT;
  }

  switch(dstArray.constructor.name)
  {
    case "Uint8Array":
      for(let i = 0; i < l; ++i)
      {
        dstArray[i] = srcBuffer.getUint8(totalOffset.value, littleEndian && true);
        totalOffset.value += dstArray.BYTES_PER_ELEMENT;
      }
    break;

    case "Uint16Array":
      for(let i = 0; i < l; ++i)
      {
        dstArray[i] = srcBuffer.getUint16(totalOffset.value, littleEndian && true);
        totalOffset.value += dstArray.BYTES_PER_ELEMENT;
      }
    break;

    case "Uint32Array":
      for(let i = 0; i < l; ++i)
      {
        dstArray[i] = srcBuffer.getUint32(totalOffset.value, littleEndian && true);
        totalOffset.value += dstArray.BYTES_PER_ELEMENT;
      }
    break;

    case "Int8Array":
      for(let i = 0; i < l; ++i)
      {
        dstArray[i] = srcBuffer.getInt8(totalOffset.value, littleEndian && true);
        totalOffset.value += dstArray.BYTES_PER_ELEMENT;
      }
    break;

    case "Int16Array":
      for(let i = 0; i < l; ++i)
      {
        dstArray[i] = srcBuffer.getInt16(totalOffset.value, littleEndian && true);
        totalOffset.value += dstArray.BYTES_PER_ELEMENT;
      }
    break;

    case "Int32Array":
      for(let i = 0; i < l; ++i)
      {
        dstArray[i] = srcBuffer.getInt32(totalOffset.value, littleEndian && true);
        totalOffset.value += dstArray.BYTES_PER_ELEMENT;
      }
    break;

    case "Float32Array":
      for(let i = 0; i < l; ++i)
      {
        dstArray[i] = srcBuffer.getFloat32(totalOffset.value, littleEndian && true);
        totalOffset.value += dstArray.BYTES_PER_ELEMENT;
      }
    break;

    case "Float64Array":
      for(let i = 0; i < l; ++i)
      {
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
export function bufferToArray(srcBuffer, dstArray, byteOffset = 0, length = NaN, littleEndian = true)
{
  if(!dstArray.BYTES_PER_ELEMENT || !(srcBuffer instanceof ArrayBuffer) ||
     (typeof length !== "number" && !isNaN(length)) ||
     (typeof byteOffset !== "number") || (typeof littleEndian !== "boolean"))
  {
    throw new Error("[ctype] 'bufferToArray' function: invalid arguments in the signature (ArrayBuffer srcBuffer, TypedArray dstArray, Number length = NaN, NumberNumber offset = 0, Boolean littleEndian = true)");
  }

  if(length < 0)
  {
    throw new Error("[ctype] 'bufferToArray' function: the copying byte length must be a positive value");
  }

  let srcBuf      = new DataView(srcBuffer, byteOffset);
  let totalOffset = { value: 0 };

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
export function arrayToBuffer(srcArray, existedBuffer = null, byteOffset = 0, length = NaN, littleEndian = true)
{
  if(!srcArray.BYTES_PER_ELEMENT ||
     (!(existedBuffer instanceof ArrayBuffer) && existedBuffer !== null) ||
     (typeof length !== "number") ||
     (typeof byteOffset !== "number") ||
     (typeof littleEndian !== "boolean"))
  {
    throw new Error("[ctype] 'arrayToBuffer' function: invalid arguments in the signature (TypedArray srcArray, ArrayBuffer existedBuffer = null, Number length = NaN, Number byteOffset = 0, Boolean littleEndian = true)");
  }

  if(length < 0)
  {
    throw new Error("[ctype] 'arrayToBuffer' function: the copying byte length must be a positive value");
  }

  let totalOffset = { value: byteOffset };
  let arrayBuffer, dstBuffer;

  if(existedBuffer === null)
  {
    arrayBuffer = new ArrayBuffer(srcArray.byteLength);
    dstBuffer   = new DataView   (arrayBuffer);

    setArrayToBuffer(srcArray, dstBuffer, length, totalOffset, littleEndian);
  }
  else
  {
    dstBuffer = new DataView(existedBuffer);

    setArrayToBuffer(srcArray, dstBuffer, length, totalOffset, littleEndian);
  }

  return dstBuffer.buffer;
}
