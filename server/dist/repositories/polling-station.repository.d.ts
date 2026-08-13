import { MachineStatus } from '@prisma/client';
export declare class PollingStationRepository {
    findAll(constituencyId?: number): Promise<({
        _count: {
            voters: number;
            votes: number;
        };
        constituency: {
            name: string;
            id: number;
            code: string;
            election: {
                name: string;
                id: number;
                status: import(".prisma/client").$Enums.ElectionStatus;
            };
        };
        officers: ({
            user: {
                email: string;
            };
        } & {
            id: number;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
            userId: number;
            fullName: string;
            employeeId: string;
            phone: string;
            pollingStationId: number | null;
        })[];
    } & {
        name: string;
        id: number;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        constituencyId: number;
        code: string;
        address: string;
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
            election: {
                name: string;
                id: number;
                createdAt: Date;
                updatedAt: Date;
                deletedAt: Date | null;
                description: string | null;
                electionType: string;
                scheduledDate: Date;
                startTime: Date | null;
                endTime: Date | null;
                status: import(".prisma/client").$Enums.ElectionStatus;
                isResultPublished: boolean;
            };
        } & {
            name: string;
            id: number;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
            code: string;
            electionId: number;
            state: string;
            district: string;
            totalVoters: number;
        };
        officers: ({
            user: {
                id: number;
                email: string;
                passwordHash: string;
                role: import(".prisma/client").$Enums.UserRole;
                isActive: boolean;
                lastLoginAt: Date | null;
                createdAt: Date;
                updatedAt: Date;
                deletedAt: Date | null;
            };
        } & {
            id: number;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
            userId: number;
            fullName: string;
            employeeId: string;
            phone: string;
            pollingStationId: number | null;
        })[];
    } & {
        name: string;
        id: number;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        constituencyId: number;
        code: string;
        address: string;
        totalBooths: number;
        machineStatus: import(".prisma/client").$Enums.MachineStatus;
        isPollingActive: boolean;
    }) | null>;
    create(data: {
        constituencyId: number;
        name: string;
        code: string;
        address: string;
        totalBooths?: number;
    }): Promise<{
        constituency: {
            name: string;
            id: number;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
            code: string;
            electionId: number;
            state: string;
            district: string;
            totalVoters: number;
        };
    } & {
        name: string;
        id: number;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        constituencyId: number;
        code: string;
        address: string;
        totalBooths: number;
        machineStatus: import(".prisma/client").$Enums.MachineStatus;
        isPollingActive: boolean;
    }>;
    update(id: number, data: Partial<{
        name: string;
        address: string;
        totalBooths: number;
        machineStatus: MachineStatus;
        isPollingActive: boolean;
    }>): Promise<{
        name: string;
        id: number;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        constituencyId: number;
        code: string;
        address: string;
        totalBooths: number;
        machineStatus: import(".prisma/client").$Enums.MachineStatus;
        isPollingActive: boolean;
    }>;
    updateMachineStatus(id: number, machineStatus: MachineStatus, isPollingActive?: boolean): Promise<{
        name: string;
        id: number;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        constituencyId: number;
        code: string;
        address: string;
        totalBooths: number;
        machineStatus: import(".prisma/client").$Enums.MachineStatus;
        isPollingActive: boolean;
    }>;
    delete(id: number): Promise<{
        name: string;
        id: number;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        constituencyId: number;
        code: string;
        address: string;
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