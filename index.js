"use strict";
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, "__esModule", { value: true });
var locale_1 = require("./services/locale");
var di_1 = require("./lib/di");
function initI18N(inject) {
    Object.assign(di_1.container, inject);
    return locale_1.checkLocale();
}
exports.initI18N = initI18N;
__export(require("./services/locale"));
__export(require("./lib/utils"));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7OztBQUFBLDRDQUE2QztBQUM3QywrQkFBa0M7QUFFbEMsU0FBZ0IsUUFBUSxDQUFDLE1BQWM7SUFDbkMsTUFBTSxDQUFDLE1BQU0sQ0FDVCxjQUFTLEVBQ1QsTUFBTSxDQUNULENBQUM7SUFFRixPQUFPLG9CQUFXLEVBQUUsQ0FBQTtBQUN4QixDQUFDO0FBUEQsNEJBT0M7QUFFRCx1Q0FBaUM7QUFDakMsaUNBQTJCIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtjaGVja0xvY2FsZX0gZnJvbSBcIi4vc2VydmljZXMvbG9jYWxlXCJcbmltcG9ydCB7Y29udGFpbmVyfSBmcm9tIFwiLi9saWIvZGlcIlxuXG5leHBvcnQgZnVuY3Rpb24gaW5pdEkxOE4oaW5qZWN0OiBvYmplY3QpIHtcbiAgICBPYmplY3QuYXNzaWduKFxuICAgICAgICBjb250YWluZXIsXG4gICAgICAgIGluamVjdCxcbiAgICApO1xuXG4gICAgcmV0dXJuIGNoZWNrTG9jYWxlKClcbn1cblxuZXhwb3J0ICogZnJvbSBcIi4vc2VydmljZXMvbG9jYWxlXCJcbmV4cG9ydCAqIGZyb20gXCIuL2xpYi91dGlsc1wiIl19