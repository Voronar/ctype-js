# ctype
JavaScript library for easy working with C data types like primitive type arrays and structures.

> **Exported library(ES5) requirements:**
> - typed arrays, ```ArrayBuffer```, ```DataView```

> **Native library(ES6) requirements:**
> - typed arrays, ```ArrayBuffer```, ```DataView```
> - modules
> - default function parameters
> - block scoping

### Features
- extracts C-structures and primitive type arrays to JavaScript objects and typed arrays
- extracts JavaScript structures(objects) and typed arrays to C-structures and primitive type arrays

> **Limitations:**
- C-structures with primitive type fields only(```char```, ```int```, etc.)
- Fixed length C-arrays only(```char a[n]```, ```int a[n]```, etc.)
- No pointers, no methods, no bit fields

### API Documentation: [voronar.github.io/ctype-js-docs](https://voronar.github.io/ctype-js-docs)

### Installation
**ES5 version(global variable)**

ES5 version of the library consists two versions: native(with a native typed arrays compability) and polyfilled(without a native typed arrays compability).<br>
For native version just include ```build/release/ctype.js``` script to your HTML-file and ```build/release/ctype.polyfilled.js``` for polyfilled one. And then use ```ctype``` global object.
> **Library name conflict:**
> This version of the library exports ```ctype``` CommonJS module to a global scope(```window``` object). In case of existed ```ctype``` name the library will be renamed to ```libctypejs```.

**ES6 version(module)**

ES6 version of the library is exported module. Just import module(```src/ctype.js```) and use it.
``` js
import * as ctype from "./ctype";

let structure = ctype.struct(
{
  field: ctype.int32(100)
});

let s = ctype.bufferToStruct(buffer, structure);
```

### Examples

> **Note:**
> In all examples I working with a little-endian binary buffer order.
In case of a big-endian binary buffer order using you need to set it in all used extracting function. Just set last argument of extraction function to 'false' value.<br>
> See function signatures in the [documentation](https://voronar.github.io/ctype-js-docs).

**Extracts C-structure to JavaScript object**

For extracting data from C to JavaScript firstable we need to convert C structure or an array to a byte array(```char*``` or ```unsigned char*```) for data transmission via web-socket.
In this example I use Qt web-socket protocol implementation.
> **Warning:**
> C-structures must be 1-byte aligned.

Server side(C++):
``` cpp
// Qt C++
// Web-socket server implementation - QWebSocket(Qt websockets module)
#pragma pack(push, 1)
 struct SubStructure2
 {
   int sint;
 };
 struct SubStructure1
 {
   int sint;
   SubStructure2 s2;
 };
 struct UnsignedArrays
 {
   unsigned char  uchar [2]; //UInt8Array
   unsigned short ushort[2]; //UInt16Array
   unsigned int   uint  [2]; //UInt32Array
 };
 struct SignedArrays
 {
   char   schar  [2]; //Int8Array
   short  sshort [2]; //Int16Array
   int    sint   [2]; //Int32Array
   float  sfloat [2]; //Float32Array
   double sdouble[2]; //Float64Array
 };
 struct Structure
 {
   UnsignedArrays ua[2];
   SignedArrays   sa;
   SubStructure1  s1;
 };
 #pragma pack(pop)

 Structure s[2];
 s[0].s1.s2.sint = 2015;

 QByteArray raw = QByteArray((char*)&s, sizeof(Structure) * 2);

 webSocket->sendBinaryMessage(raw);
```
> **Web-socket test application:**
> See testing Qt web-socket application sources in ```src/qt-websocket```.

Client side(JavaScript):

``` js
let SubStructure2 = ctype.struct(
{
  sint: ctype.int32()
});

let SubStructure1 = ctype.struct(
{
  sint: ctype.int32(),
  s2  : ctype.struct(SubStructure2)
});

let UnsignedArrays = ctype.struct(
{
  uchar : ctype.uint8 (2),
  ushort: ctype.uint16(2),
  uint  : ctype.uint32(2)
});

let SignedArrays = ctype.struct(
{
  schar  : ctype.int8   (2),
  sshort : ctype.int16  (2),
  sint   : ctype.int32  (2),
  sfloat : ctype.float32(2),
  sdouble: ctype.float64(2),
});

let Structure = ctype.struct(
{
  ua: ctype.struct(UnsignedArrays, 2),
  sa: ctype.struct(SignedArrays),
  s1: ctype.struct(SubStructure1)
});

webSocket.onmessage = function(e)
{
  let data = e.data;

  let s1   = ctype.struct(Structure, 2);
  let rec1 = ctype.bufferToStruct(data,//source binary buffer
                                  s1); //destination structure or array of structures

  console.log(rec1[0].s1.s2.sint[0]); //2015
}
```
> **Variables and arrays:**
> C-structure single field like ```int i;``` equals to ```i: int32(1)``` typed array in JavaScript.

**Extracts C-structure to JavaScript object with an offset from a source binary buffer**

In this example we extract a second structure from array of two structures.
``` js
//data preparation...
let s2   = ctype.struct(Structure);
let rec2 = ctype.bufferToStruct(data,                 //source binary buffer
                                s2,                   //destination structure
                                Structure.byteLength);//byte offset
```
> **JavaScript structure feature:**
> All ```struct``` structures has ```byteLength``` field is a total byte length of the structure.
> Then you dynamically add structure property you need to repack the updated structure in order to update ```byteLength``` property.<br>
>``` js
>let structure = ctype.struct(
>{
>  field1: ctype.int32(100)
>});
>
>structure.field2 = ctype.float32(10); //Invalid 'byteLength' value. Structure need to be updated.
>let updatedStructure = ctype.struct(structure);
```

**Extracts C-array to JavaScript typed array**

In this example we extract C-array to JavaScript typed array with an offset from a source binary buffer and with a specified byte length value of a source binary buffer.
``` js
//data preparation...
let sfloatArray = ctype.float32(2);
let offset      = UnsignedArrays.byteLength * 2 + SignedArrays.schar.byteLength * 2 + SignedArrays.sshort.byteLength * 2 + SignedArrays.byteLength * 2;
let length      = 2 * ctype.FLOAT32_SIZE;
let rec3        = ctype.bufferToArray(data,       //source binary buffer
                                      sfloatArray,//destination array
                                      offset,     //byte offset
                                      length);    //byte length
```
>**'bufferToArray' function using:**
>We can extract an array without specified offset and length.
In this case the offset value will be equal to zero and the length will be automatically calculated by a special algorithm.<br>
>If a source buffer byte length more than a destination array byte length or equal to it then the byte length value will be equal to the destination array byte length.<br>
>Else the byte length value will be equal to the source buffer byte length.

>**JavaScript typed array limitation:**
>When we use multidimensional C-arrays(```int array[x][y][z];```) we can't use the same array accessing notation with JavaScript typed arrays.
```console.log(array[0][0][0]);``` will not work correctly.<br>
>In this case we can manually calculate a required array index or use some libraries like [ndarray](https://github.com/scijs/ndarray).

**Extracts JavaScript structure to C-structure(without an existed binary buffer)**

Client side(JavaScript):
``` js
//data preparation...
let s             = ctype.struct(Structure, 2);
s[1].sa.sfloat[0] = 3.1415;
let sendData      = ctype.structToBuffer(s/*source structure*/);
webSocket.send(sendData);
```
Server side(C++):
``` cpp
void MainWindow::processBinaryMessage(QByteArray message)
{
  QWebSocket *pClient = qobject_cast<QWebSocket*>(sender());

  Structure s[2];

  memcpy(&s, message.constData(), sizeof(Structure) * 2);
  qDebug() << s1[1].sa.sfloat[0]; //3.1415
}
```
**Extracts JavaScript structure to C-structure(with an existed binary buffer)**
``` js
//data preparation...
let existedBuffer = new ArrayBuffer(Structure.byteLength * 2);

let sendData = ctype.structToBuffer(rec2,                 //source structure or array of structures
                                    existedBuffer,        //existed binary buffer
                                    Structure.byteLength);//byte offset from an existed binary buffer

webSocket.send(sendData);
```
**Extracts JavaScript typed array to C-array(without an existed binary buffer)**

Client side(JavaScript):
``` js
let array = ctype.float64(10 * 10 * 10);
array.map(function(value, index, array)
{
  array[index] = -200.200;
});
let sendData = ctype.arrayToBuffer(array/*source array*/);
webSocket.send(sendData);
```
Server side(C++):
``` cpp
void MainWindow::processBinaryMessage(QByteArray message)
{
  QWebSocket *pClient = qobject_cast<QWebSocket*>(sender());

  double array[10][10][10];

  memcpy(array, message.constData(), sizeof(array));
  qDebug() << array[9][9][9]; //-200.200
}
```
**Extracts JavaScript typed array to C-array(with an existed binary buffer)**

In this example we extract JavaScript typed array to C-array with an offset from a source typed array and with a specified byte length value of a source JavaScript typed array.

Client side(JavaScript):
``` js
let existedBuffer = new ArrayBuffer(1000 * ctype.FLOAT64_SIZE);
let array = ctype.float64(1000);
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

ctype.arrayToBuffer(array,                     //source array
                    existedBuffer,             //existed binary buffer
                    0,                         //byte offset
                    500 * ctype.FLOAT64_SIZE);//byte length

ctype.arrayToBuffer(array, existedBuffer, 500 * ctype.FLOAT64_SIZE, 500 * ctype.FLOAT64_SIZE);
let sendData = existedBuffer;
socket.send(sendData);
```
>**'arrayToBuffer' function using:**
>We can extract an array without specified offset and length.
In this case the offset value will be equal to zero and the length will be automatically calculated by a special algorithm.<br>
>If a source array byte length more than a destination buffer byte length or equal to it then the byte length value will be equal to the destination buffer byte length.<br>
>Else the byte length value will be equal to the source array byte length.

Server side(C++):
``` cpp
void MainWindow::processBinaryMessage(QByteArray message)
{
  QWebSocket *pClient = qobject_cast<QWebSocket*>(sender());

  double array[1000];

  memcpy(array, message.constData(), sizeof(array));
  qDebug() << array[0];   //-100.100
  qDebug() << array[500]; //-200.200
}
```
### Have a nice code!
