import { PrismaClient } from '@prisma/client';
declare const prisma: PrismaClient<{
    log: ({
        emit: "event";
        level: "query";
    } | {
        emit: "event";
        level: "error";
    } | {
        emit: "event";
        level: "warn";
    })[];
}, "error" | "query" | "warn", import("@prisma/client/runtime/library").DefaultArgs>;
export { prisma };
//# sourceMappingURL=database.d.ts.map