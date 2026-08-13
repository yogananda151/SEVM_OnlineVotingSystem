export declare class ConstituencyRepository {
    findAll(electionId?: number): Promise<({
        _count: {
            voters: number;
            pollingStations: number;
            candidates: number;
        };
        election: {
            name: string;
            id: number;
            status: import(".prisma/client").$Enums.ElectionStatus;
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
    })[]>;
    findById(id: number): Promise<({
        _count: {
            voters: number;
        };
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
    }) | null>;
    create(data: {
        electionId: number;
        name: string;
        code: string;
        state: string;
        district: string;
        totalVoters?: number;
    }): Promise<{
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
    }>;
    update(id: number, data: Partial<{
        name: string;
        code: string;
        state: string;
        district: string;
        totalVoters: number;
    }>): Promise<{
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
    }>;
    delete(id: number): Promise<{
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
    }>;
}
export declare const constituencyRepository: ConstituencyRepository;
//# sourceMappingURL=constituency.repository.d.ts.map