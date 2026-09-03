import { MachineStatus } from '@prisma/client';
export declare class PollingStationRepository {
    findAll(constituencyId?: number): Promise<({
        _count: {
            voters: number;
            votes: number;
        };
        constituency: {
            code: string;
            name: string;
            id: number;
            region: {
                name: string;
                id: number;
            };
        };
        officers: ({
            user: {
                email: string;
            };
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
        })[];
    } & {
        code: string;
        name: string;
        id: number;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        constituencyId: number;
        address: string;
        capacity: number;
        totalBooths: number;
        machineStatus: import(".prisma/client").$Enums.MachineStatus;
        isPollingActive: boolean;
    })[]>;
    findById(id: number): Promise<({
        _count: {
            voters: number;
            votes: number;
        };
        constituency: {
            region: {
                code: string;
                name: string;
                id: number;
                isActive: boolean;
                createdAt: Date;
                updatedAt: Date;
                deletedAt: Date | null;
                description: string | null;
            };
        } & {
            code: string;
            name: string;
            id: number;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
            description: string | null;
            regionId: number;
        };
        officers: ({
            user: {
                email: string;
                id: number;
                passwordHash: string;
                role: import(".prisma/client").$Enums.UserRole;
                isActive: boolean;
                lastLoginAt: Date | null;
                createdAt: Date;
                updatedAt: Date;
                deletedAt: Date | null;
            };
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
        })[];
    } & {
        code: string;
        name: string;
        id: number;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        constituencyId: number;
        address: string;
        capacity: number;
        totalBooths: number;
        machineStatus: import(".prisma/client").$Enums.MachineStatus;
        isPollingActive: boolean;
    }) | null>;
    create(data: {
        constituencyId: number;
        name: string;
        code: string;
        address: string;
        capacity?: number;
        totalBooths?: number;
    }): Promise<{
        constituency: {
            region: {
                code: string;
                name: string;
                id: number;
                isActive: boolean;
                createdAt: Date;
                updatedAt: Date;
                deletedAt: Date | null;
                description: string | null;
            };
        } & {
            code: string;
            name: string;
            id: number;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
            description: string | null;
            regionId: number;
        };
    } & {
        code: string;
        name: string;
        id: number;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        constituencyId: number;
        address: string;
        capacity: number;
        totalBooths: number;
        machineStatus: import(".prisma/client").$Enums.MachineStatus;
        isPollingActive: boolean;
    }>;
    update(id: number, data: Partial<{
        name: string;
        address: string;
        capacity: number;
        totalBooths: number;
        machineStatus: MachineStatus;
        isPollingActive: boolean;
    }>): Promise<{
        code: string;
        name: string;
        id: number;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        constituencyId: number;
        address: string;
        capacity: number;
        totalBooths: number;
        machineStatus: import(".prisma/client").$Enums.MachineStatus;
        isPollingActive: boolean;
    }>;
    updateMachineStatus(id: number, machineStatus: MachineStatus, isPollingActive?: boolean): Promise<{
        code: string;
        name: string;
        id: number;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        constituencyId: number;
        address: string;
        capacity: number;
        totalBooths: number;
        machineStatus: import(".prisma/client").$Enums.MachineStatus;
        isPollingActive: boolean;
    }>;
    delete(id: number): Promise<{
        code: string;
        name: string;
        id: number;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        constituencyId: number;
        address: string;
        capacity: number;
        totalBooths: number;
        machineStatus: import(".prisma/client").$Enums.MachineStatus;
        isPollingActive: boolean;
    }>;
    getTurnout(id: number): Promise<{
        totalVoters: number;
        votedCount: number;
        remaining: number;
        turnoutPercent: string;
    }>;
}
export declare const pollingStationRepository: PollingStationRepository;
//# sourceMappingURL=polling-station.repository.d.ts.map