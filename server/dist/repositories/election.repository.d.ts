import { ElectionStatus } from '@prisma/client';
export declare class ElectionRepository {
    findAll(): Promise<({
        _count: {
            constituencies: number;
        };
        constituencies: {
            name: string;
            id: number;
            _count: {
                voters: number;
                candidates: number;
            };
        }[];
    } & {
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
    })[]>;
    findById(id: number): Promise<({
        constituencies: ({
            pollingStations: {
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
            }[];
            candidates: ({
                party: {
                    symbol: string | null;
                    name: string;
                    id: number;
                    isActive: boolean;
                    createdAt: Date;
                    updatedAt: Date;
                    deletedAt: Date | null;
                    abbreviation: string;
                    color: string;
                    foundedYear: number | null;
                    symbolUrl: string | null;
                } | null;
            } & {
                id: number;
                isActive: boolean;
                createdAt: Date;
                updatedAt: Date;
                deletedAt: Date | null;
                fullName: string;
                constituencyId: number;
                partyId: number | null;
                age: number;
                qualification: string | null;
                serialNumber: number;
                isIndependent: boolean;
                photoUrl: string | null;
            })[];
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
        })[];
    } & {
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
    }) | null>;
    findActive(): Promise<({
        constituencies: ({
            pollingStations: ({
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
            })[];
            candidates: ({
                party: {
                    symbol: string | null;
                    name: string;
                    id: number;
                    isActive: boolean;
                    createdAt: Date;
                    updatedAt: Date;
                    deletedAt: Date | null;
                    abbreviation: string;
                    color: string;
                    foundedYear: number | null;
                    symbolUrl: string | null;
                } | null;
            } & {
                id: number;
                isActive: boolean;
                createdAt: Date;
                updatedAt: Date;
                deletedAt: Date | null;
                fullName: string;
                constituencyId: number;
                partyId: number | null;
                age: number;
                qualification: string | null;
                serialNumber: number;
                isIndependent: boolean;
                photoUrl: string | null;
            })[];
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
        })[];
    } & {
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
    }) | null>;
    create(data: {
        name: string;
        description?: string;
        electionType: string;
        scheduledDate: Date;
    }): Promise<{
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
    }>;
    update(id: number, data: Partial<{
        name: string;
        description: string;
        electionType: string;
        scheduledDate: Date;
        status: ElectionStatus;
        startTime: Date;
        endTime: Date;
        isResultPublished: boolean;
    }>): Promise<{
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
    }>;
    delete(id: number): Promise<{
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
    }>;
    getStats(electionId: number): Promise<{
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
        totalVoters: number;
        votedCount: number;
        turnoutPercent: string;
        totalCandidates: number;
        totalStations: number;
        totalConstituencies: number;
    } | null>;
}
export declare const electionRepository: ElectionRepository;
//# sourceMappingURL=election.repository.d.ts.map