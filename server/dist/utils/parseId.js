"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseId = parseId;
function parseId(value, label = "ID") {
    if (!value)
        throw new Error(`缺少${label}参数`);
    const raw = Array.isArray(value) ? value[0] : value;
    const id = Number(raw);
    if (!Number.isInteger(id) || id <= 0)
        throw new Error(`无效的${label}`);
    return id;
}
//# sourceMappingURL=parseId.js.map