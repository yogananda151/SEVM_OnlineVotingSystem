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
                name: string;
                id: number;
                code: string;
            };
            constituency: {
                name: string;
                id: number;
                code: string;
            };
        } & {
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
            voterId: string;
            dateOfBirth: Date;
            gender: string;
            hasVoted: boolean;
            aadhaarHash: string | null;
            photoUrl: string | null;
            votedAt: Date | null;
        })[];
        total: number;
    }>;
    findById(id: number): Promise<({
        pollingStation: {
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
        };
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
                partyId: number | null;
                age: number;
                qualification: string | null;
                serialNumber: number;
                isIndependent: boolean;
                photoUrl: string | null;
            };
        } & {
            id: number;
            pollingStationId: number;
            voterId: number;
            candidateId: number;
            voteHash: string;
            referenceNumber: string;
            isVerified: boolean;
            castAt: Date;
        }) | null;
    } & {
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
        voterId: string;
        dateOfBirth: Date;
        gender: string;
        hasVoted: boolean;
        aadhaarHash: string | null;
        photoUrl: string | null;
        votedAt: Date | null;
    }) | null>;
    findByVoterId(voterId: string): Promise<({
        pollingStation: {
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
    } & {
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
        voterId: string;
        dateOfBirth: Date;
        gender: string;
        hasVoted: boolean;
        aadhaarHash: string | null;
        photoUrl: string | null;
        votedAt: Date | null;
    }) | null>;
    findByAadhaarHash(aadhaarHash: string): Promise<({
        pollingStation: {
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
    } & {
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
        voterId: string;
        dateOfBirth: Date;
        gender: string;
        hasVoted: boolean;
        aadhaarHash: string | null;
        photoUrl: string | null;
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
        voterId: string;
        dateOfBirth: Date;
        gender: string;
        hasVoted: boolean;
        aadhaarHash: string | null;
        photoUrl: string | null;
        votedAt: Date | null;
    }>;
    update(id: number, data: Partial<{
        fullName: string;
        address: string;
        phone: string;
        photoUrl: string;
    }>): Promise<{
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
        voterId: string;
        dateOfBirth: Date;
        gender: string;
        hasVoted: boolean;
        aadhaarHash: string | null;
        photoUrl: string | null;
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