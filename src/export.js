/**
 * @file src/export.js
 * Exporting script
 */

"use strict";

import * as ctype from "./ctype";
if(!window.ctype)
{
  //window.ctype = ctype;
  Object.defineProperty(window, "ctype",
  {
    value       : ctype,
    writable    : false,
    enumerable  : false,
    configurable: false
  });
}
else
{
  //window.libctypejs = ctype;
  Object.defineProperty(window, "libctypejs",
  {
    value       : ctype,
    writable    : false,
    enumerable  : false,
    configurable: false
  });
  console.warn("[CTypeJS] library exporting: 'ctype' name is already reserved. Library was renamed to 'libctypejs'.");
}
