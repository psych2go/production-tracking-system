"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = require("./config/index.js");
const app_js_1 = require("./app.js");
const database_js_1 = require("./config/database.js");
async function main() {
    await database_js_1.prisma.$connect();
    console.log("Database connected.");
    app_js_1.app.listen(index_js_1.config.port, () => {
        console.log(`Server running on http://localhost:${index_js_1.config.port}`);
        console.log(`Environment: ${index_js_1.config.nodeEnv}`);
    });
}
main().catch((e) => {
    console.error("Failed to start server:", e);
    database_js_1.prisma.$disconnect();
    process.exit(1);
});
process.on("SIGINT", async () => {
    await database_js_1.prisma.$disconnect();
    process.exit(0);
});
//# sourceMappingURL=server.js.map