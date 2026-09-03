export declare class ConstituencyRepository {
    findAll(regionId?: number): Promise<({
        _count: {
            voters: number;
            pollingStations: number;
        };
        region: {
            code: string;
            name: string;
            id: number;
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
    })[]>;
    findActive(regionId?: number): Promise<({
        _count: {
            voters: number;
            pollingStations: number;
        };
        region: {
            code: string;
            name: string;
            id: number;
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
    })[]>;
    findById(id: number): Promise<({
        _count: {
            voters: number;
        };
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
        pollingStations: ({
            _count: {
                voters: number;
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
    }) | null>;
    create(data: {
        regionId: number;
        name: string;
        code: string;
        description?: string;
    }): Promise<{
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
    }>;
    update(id: number, data: Partial<{
        name: string;
        code: string;
        description: string;
        regionId: number;
        isActive: boolean;
    }>): Promise<{
        code: string;
        name: string;
        id: number;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        description: string | null;
        regionId: number;
    }>;
    delete(id: number): Promise<{
        code: string;
        name: string;
        id: number;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        description: string | null;
        regionId: number;
    }>;
}
export declare const constituencyRepository: ConstituencyRepository;
//# sourceMappingURL=constituency.repository.d.ts.map