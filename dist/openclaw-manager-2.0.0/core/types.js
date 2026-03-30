"use strict";
/**
 * OpenClaw Manager - Type Definitions
 * Unified types for all frontends (CLI, Web, VS Code, Electron)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.InstanceStatus = void 0;
// ==================== Instance Status ====================
var InstanceStatus;
(function (InstanceStatus) {
    InstanceStatus["Stopped"] = "stopped";
    InstanceStatus["Starting"] = "starting";
    InstanceStatus["Running"] = "running";
    InstanceStatus["Stopping"] = "stopping";
    InstanceStatus["Error"] = "error";
})(InstanceStatus || (exports.InstanceStatus = InstanceStatus = {}));
//# sourceMappingURL=types.js.map