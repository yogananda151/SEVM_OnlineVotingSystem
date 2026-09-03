export declare class ElectionConstituencyRepository {
    findByElection(electionId: number): Promise<({
        constituency: {
            _count: {
                voters: number;
                pollingStations: number;
            };
            region: {
                name: string;
                id: number;
            };
            pollingStations: ({
                _count: {
                    voters: number;
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
    })[]>;
    setConstituencies(electionId: number, constituencyIds: number[]): Promise<({
        constituency: {
            _count: {
                voters: number;
                pollingStations: number;
            };
            region: {
                name: string;
                id: number;
            };
            pollingStations: ({
                _count: {
                    voters: number;
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
    })[]>;
    addConstituency(electionId: number, constituencyId: number): Promise<{
        id: number;
        createdAt: Date;
        constituencyId: number;
        electionId: number;
    }>;
    removeConstituency(electionId: number, constituencyId: number): Promise<import(".prisma/client").Prisma.BatchPayload>;
    getConstituencyIds(electionId: number): Promise<number[]>;
}
export declare const electionConstituencyRepository: ElectionConstituencyRepository;
//# sourceMappingURL=election-constituency.repository.d.ts.map