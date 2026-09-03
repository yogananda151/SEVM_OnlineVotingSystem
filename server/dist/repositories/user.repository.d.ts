import { User } from '@prisma/client';
export declare class UserRepository {
    findByEmail(email: string): Promise<User | null>;
    findById(id: number): Promise<User | null>;
    findAllOfficers(): Promise<({
        user: {
            email: string;
            id: number;
            isActive: boolean;
            lastLoginAt: Date | null;
        };
        pollingStation: {
            code: string;
            name: string;
            id: number;
        } | null;
    } & {
        employeeId: string;
        id: number;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        userId: number;
        fullName: string;
        phone: string;
        pollingStationId: number | null;
    })[]>;
    createOfficer(data: {
        email: string;
        password: string;
        fullName: string;
        employeeId: string;
        phone: string;
        pollingStationId?: number | null;
    }): Promise<{
        officer: {
            employeeId: string;
            id: number;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
            userId: number;
            fullName: string;
            phone: string;
            pollingStationId: number | null;
        } | null;
    } & {
        email: string;
        id: number;
        passwordHash: string;
        role: import(".prisma/client").$Enums.UserRole;
        isActive: boolean;
        lastLoginAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
    }>;
    updateOfficer(id: number, data: Partial<{
        fullName: string;
        phone: string;
        pollingStationId: number | null;
    }>): Promise<{
        employeeId: string;
        id: number;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        userId: number;
        fullName: string;
        phone: string;
        pollingStationId: number | null;
    }>;
    deleteOfficer(id: number): Promise<void>;
    updateLastLogin(userId: number): Promise<void>;
    logLogin(data: {
        userId: number;
        ipAddress: string;
        userAgent?: string;
        success: boolean;
    }): Promise<void>;
}
export declare const userRepository: UserRepository;
//# sourceMappingURL=user.repository.d.ts.map