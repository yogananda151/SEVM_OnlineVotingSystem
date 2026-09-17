import { ElectionStatus } from '@prisma/client';
export declare class ElectionRepository {
    findAll(): Promise<({
        officer: {
            employeeId: string;
            id: number;
            fullName: string;
        } | null;
        _count: {
            electionConstituencies: number;
            candidates: number;
        };
        electionConstituencies: ({
            constituency: {
                name: string;
                id: number;
                _count: {
                    voters: number;
                    candidates: number;
                };
            };
        } & {
            id: number;
            createdAt: Date;
            constituencyId: number;
            electionId: number;
        })[];
    } & {
        status: import(".prisma/client").$Enums.ElectionStatus;
        officerId: number | null;
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
        isResultPublished: boolean;
    })[]>;
    findByOfficer(officerId: number, pollingStationId?: number | null): Promise<({
        officer: {
            employeeId: string;
            id: number;
            fullName: string;
            phone: string;
        } | null;
        _count: {
            electionConstituencies: number;
            candidates: number;
        };
        electionConstituencies: ({
            constituency: {
                code: string;
                name: string;
                id: number;
                _count: {
                    voters: number;
                    candidates: number;
                    pollingStations: number;
                };
            };
        } & {
            id: number;
            createdAt: Date;
            constituencyId: number;
            electionId: number;
        })[];
    } & {
        status: import(".prisma/client").$Enums.ElectionStatus;
        officerId: number | null;
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
        isResultPublished: boolean;
    })[]>;
    findById(id: number): Promise<({
        officer: ({
            user: {
                email: string;
                id: number;
                isActive: boolean;
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
        }) | null;
        electionConstituencies: ({
            constituency: {
                _count: {
                    voters: number;
                };
                region: {
                    name: string;
                    id: number;
                };
                pollingStations: {
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
                }[];
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
            id: number;
            createdAt: Date;
            constituencyId: number;
            electionId: number;
        })[];
        candidates: ({
            constituency: {
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
            electionId: number;
            partyId: number | null;
            age: number;
            qualification: string | null;
            serialNumber: number;
            isIndependent: boolean;
            photoUrl: string | null;
        })[];
    } & {
        status: import(".prisma/client").$Enums.ElectionStatus;
        officerId: number | null;
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
        isResultPublished: boolean;
    }) | null>;
    findActive(): Promise<({
        electionConstituencies: ({
            constituency: {
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
                    electionId: number;
                    partyId: number | null;
                    age: number;
                    qualification: string | null;
                    serialNumber: number;
                    isIndependent: boolean;
                    photoUrl: string | null;
                })[];
                pollingStations: ({
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
                })[];
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
            id: number;
            createdAt: Date;
            constituencyId: number;
            electionId: number;
        })[];
    } & {
        status: import(".prisma/client").$Enums.ElectionStatus;
        officerId: number | null;
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
        isResultPublished: boolean;
    }) | null>;
    create(data: {
        name: string;
        description?: string;
        electionType: string;
        scheduledDate: Date;
    }): Promise<{
        status: import(".prisma/client").$Enums.ElectionStatus;
        officerId: number | null;
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
        officerId: number | null;
    }>): Promise<{
        status: import(".prisma/client").$Enums.ElectionStatus;
        officerId: number | null;
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
        isResultPublished: boolean;
    }>;
    setOfficer(electionId: number, officerId: number | null): Promise<{
        officer: ({
            user: {
                email: string;
                id: number;
                isActive: boolean;
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
        }) | null;
    } & {
        status: import(".prisma/client").$Enums.ElectionStatus;
        officerId: number | null;
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
        isResultPublished: boolean;
    }>;
    delete(id: number): Promise<{
        status: import(".prisma/client").$Enums.ElectionStatus;
        officerId: number | null;
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
        isResultPublished: boolean;
    }>;
    getStats(electionId: number): Promise<{
        election: {
            status: import(".prisma/client").$Enums.ElectionStatus;
            officerId: number | null;
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
            isResultPublished: boolean;
        };
        totalVoters: number;
        votedCount: number;
        turnoutPercent: string;
        totalCandidates: number;
        totalStations: number;
        totalConstituencies: number;
    } | null>;
    /** Pre-publish readiness checklist */
    getReadiness(electionId: number): Promise<{
        election: {
            officer: {
                employeeId: string;
                id: number;
                fullName: string;
            } | null;
        } & {
            status: import(".prisma/client").$Enums.ElectionStatus;
            officerId: number | null;
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
            isResultPublished: boolean;
        };
        officer: {
            employeeId: string;
            id: number;
            fullName: string;
        } | null;
        totalConstituencies: number;
        totalStations: number;
        totalVoters: number;
        totalCandidates: number;
        stationsWithoutOfficer: number;
        constituenciesWithoutCandidates: number;
        hasElectionOfficer: boolean;
        issues: string[];
        isReady: boolean;
    } | null>;
}
export declare const electionRepository: ElectionRepository;
//# sourceMappingURL=election.repository.d.ts.map