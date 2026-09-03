export declare class VoterRepository {
    findAll(filters: {
        pollingStationId?: number;
        constituencyId?: number;
        hasVoted?: boolean;
        search?: string;
        page?: number;
        limit?: number;
    }): Promise<{
        data: ({
            pollingStation: {
                code: string;
                name: string;
                id: number;
            };
            constituency: {
                code: string;
                name: string;
                id: number;
            };
        } & {
            voterId: string;
            id: number;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
            fullName: string;
            phone: string | null;
            pollingStationId: number;
            constituencyId: number;
            address: string;
            serialNumber: number;
            dateOfBirth: Date;
            gender: string;
            hasVoted: boolean;
            photoUrl: string | null;
            aadhaarHash: string | null;
            votedAt: Date | null;
        })[];
        total: number;
    }>;
    findById(id: number): Promise<({
        pollingStation: {
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
        };
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
        vote: ({
            candidate: {
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
            };
        } & {
            voterId: number;
            id: number;
            pollingStationId: number;
            candidateId: number;
            voteHash: string;
            referenceNumber: string;
            isVerified: boolean;
            castAt: Date;
        }) | null;
    } & {
        voterId: string;
        id: number;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        fullName: string;
        phone: string | null;
        pollingStationId: number;
        constituencyId: number;
        address: string;
        serialNumber: number;
        dateOfBirth: Date;
        gender: string;
        hasVoted: boolean;
        photoUrl: string | null;
        aadhaarHash: string | null;
        votedAt: Date | null;
    }) | null>;
    findByVoterId(voterId: string): Promise<({
        pollingStation: {
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
    } & {
        voterId: string;
        id: number;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        fullName: string;
        phone: string | null;
        pollingStationId: number;
        constituencyId: number;
        address: string;
        serialNumber: number;
        dateOfBirth: Date;
        gender: string;
        hasVoted: boolean;
        photoUrl: string | null;
        aadhaarHash: string | null;
        votedAt: Date | null;
    }) | null>;
    findByAadhaarHash(aadhaarHash: string): Promise<({
        pollingStation: {
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
    } & {
        voterId: string;
        id: number;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        fullName: string;
        phone: string | null;
        pollingStationId: number;
        constituencyId: number;
        address: string;
        serialNumber: number;
        dateOfBirth: Date;
        gender: string;
        hasVoted: boolean;
        photoUrl: string | null;
        aadhaarHash: string | null;
        votedAt: Date | null;
    }) | null>;
    create(data: {
        constituencyId: number;
        pollingStationId: number;
        fullName: string;
        voterId: string;
        aadhaarHash?: string;
        dateOfBirth: Date;
        gender: string;
        address: string;
        phone?: string;
        serialNumber: number;
    }): Promise<{
        voterId: string;
        id: number;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        fullName: string;
        phone: string | null;
        pollingStationId: number;
        constituencyId: number;
        address: string;
        serialNumber: number;
        dateOfBirth: Date;
        gender: string;
        hasVoted: boolean;
        photoUrl: string | null;
        aadhaarHash: string | null;
        votedAt: Date | null;
    }>;
    update(id: number, data: Partial<{
        fullName: string;
        address: string;
        phone: string;
        photoUrl: string;
    }>): Promise<{
        voterId: string;
        id: number;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        fullName: string;
        phone: string | null;
        pollingStationId: number;
        constituencyId: number;
        address: string;
        serialNumber: number;
        dateOfBirth: Date;
        gender: string;
        hasVoted: boolean;
        photoUrl: string | null;
        aadhaarHash: string | null;
        votedAt: Date | null;
    }>;
    markVoted(id: number): Promise<void>;
    delete(id: number): Promise<void>;
    bulkCreate(voters: Array<{
        constituencyId: number;
        pollingStationId: number;
        fullName: string;
        voterId: string;
        aadhaarHash?: string;
        dateOfBirth: Date;
        gender: string;
        address: string;
        phone?: string;
        serialNumber: number;
    }>): Promise<import(".prisma/client").Prisma.BatchPayload>;
}
export declare const voterRepository: VoterRepository;
//# sourceMappingURL=voter.repository.d.ts.map