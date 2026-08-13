import { AuditAction } from '@prisma/client';
export declare class AuditRepository {
    create(data: {
        userId?: number;
        electionId?: number;
        action: AuditAction;
        module: string;
        description: string;
        ipAddress?: string;
        userAgent?: string;
        metadata?: Record<string, unknown>;
    }): Promise<{
        id: number;
        createdAt: Date;
        userId: number | null;
        ipAddress: string | null;
        userAgent: string | null;
        action: import(".prisma/client").$Enums.AuditAction;
        module: string;
        description: string;
        metadata: import("@prisma/client/runtime/library").JsonValue | null;
        electionId: number | null;
    }>;
    findAll(filters: {
        userId?: number;
        electionId?: number;
        action?: AuditAction;
        module?: string;
        page?: number;
        limit?: number;
        startDate?: Date;
        endDate?: Date;
    }): Promise<{
        data: ({
            user: {
                email: string;
                role: import(".prisma/client").$Enums.UserRole;
            } | null;
        } & {
            id: number;
            createdAt: Date;
            userId: number | null;
            ipAddress: string | null;
            userAgent: string | null;
            action: import(".prisma/client").$Enums.AuditAction;
            module: string;
            description: string;
            metadata: import("@prisma/client/runtime/library").JsonValue | null;
            electionId: number | null;
        })[];
        total: number;
    }>;
}
export declare const auditRepository: AuditRepository;
//# sourceMappingURL=audit.repository.d.ts.map