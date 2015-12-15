"use strict";

var SubStructure2 = ctype.struct(
{
  sint: ctype.int32()
});
var SubStructure1 = ctype.struct(
{
  sint: ctype.int32(),
  s2  : ctype.struct(SubStructure2)
});
var UnsignedArrays = ctype.struct(
{
  uchar : ctype.uint8 (2),
  ushort: ctype.uint16(2),
  uint  : ctype.uint32(2)
});
var SignedArrays = ctype.struct(
{
  schar  : ctype.int8   (2),
  sshort : ctype.int16  (2),
  sint   : ctype.int32  (2),
  sfloat : ctype.float32(2),
  sdouble: ctype.float64(2),
});
var Structure = ctype.struct(
{
  ua: ctype.struct(UnsignedArrays, 2),
  sa: ctype.struct(SignedArrays),
  s1: ctype.struct(SubStructure1)
});


var socket = new WebSocket("ws://127.0.0.1:2015");
socket.binaryType = "arraybuffer";

socket.onopen = function(e)
{
  console.log("CONNECTED", e);
};
socket.onclose = function(e)
{
  console.log("CLOSED", e);
};
socket.onerror = function(e)
{
  console.log("ERROR", e);
};
socket.onmessage = function(e)
{
  var data = e.data;
  var mode = -1;
  var array;
  var sendData;
  var existedBuffer = new ArrayBuffer(Structure.byteLength * 2);

  switch(mode)
  {
    //from buffer
    case -1:
      var s1   = ctype.struct(Structure, 2);
      var rec1 = ctype.bufferToStruct(data, s1);
      console.log("rec1:", rec1);

      var s2   = ctype.struct(Structure);
      var rec2 = ctype.bufferToStruct(data, s2, Structure.byteLength);
      console.log("rec2:", rec2);

      var sfloatArray = ctype.float32(2);
      var offset      = UnsignedArrays.byteLength * 2 + SignedArrays.schar.byteLength * 2 + SignedArrays.sshort.byteLength * 2 + SignedArrays.byteLength * 2;
      var length      = 2 * ctype.FLOAT32_SIZE;
      var rec3        = ctype.bufferToArray(data,
                                            sfloatArray,
                                            offset,
                                            length);
      console.log("rec3:", rec3);
    break;

    //to buffer
    case 0:
      sendData = ctype.structToBuffer(rec1);
    break;

    case 1:
      sendData = ctype.structToBuffer(rec2, existedBuffer, Structure.byteLength);
    break;

    case 2:
      array = ctype.float64(10 * 10 * 10);
      array.map(function(value, index, array)
      {
        array[index] = -200.200;
      });
      sendData = ctype.arrayToBuffer(array);
      socket.send(sendData);
    break;

    case 3:
      var existedBuffer = new ArrayBuffer(1000 * ctype.FLOAT64_SIZE);
      array = ctype.float64(10 * 10 * 10);
      array.map(function(value, index, array)
      {
        if(index > 499)
        {
          array[index] = -200.200;
        }
        else
        {
          array[index] = - 100.100;
        }
      });

      ctype.arrayToBuffer(array, existedBuffer, 0, 500 * ctype.FLOAT64_SIZE);
      ctype.arrayToBuffer(array, existedBuffer, 500 * ctype.FLOAT64_SIZE, 500 * ctype.FLOAT64_SIZE);
      sendData = existedBuffer;
      socket.send(sendData);
    break;
  }
};
