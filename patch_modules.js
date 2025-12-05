// Temporary hack to force UMD libraries (Sortable, jsPDF) to register themselves
// to 'window' instead of 'module.exports', used when running in Electron/Ferdium webviews.

if (typeof define === 'function' && define.amd) {
    window._temp_define = define;
    define = undefined;
}
if (typeof module === 'object') {
    window._temp_module = module;
    module = undefined;
}
if (typeof exports === 'object') {
    window._temp_exports = exports;
    exports = undefined;
}
