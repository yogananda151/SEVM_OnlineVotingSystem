export declare class VoteRepository {
    castVote(data: {
        voterId: number;
        candidateId: number;
        pollingStationId: number;
    }): Promise<{
        vote: {
            voterId: number;
            id: number;
            pollingStationId: number;
            candidateId: number;
            voteHash: string;
            referenceNumber: string;
            isVerified: boolean;
            castAt: Date;
        };
        vvpat: {
            timestamp: Date;
            id: number;
            candidateId: number;
            voteHash: string;
            referenceNumber: string;
            candidateName: string;
            partyName: string;
            partySymbolUrl: string | null;
            electionName: string;
            voteId: number;
        };
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
        election: {
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
            status: import(".prisma/client").$Enums.ElectionStatus;
            isResultPublished: boolean;
        };
    }>;
    getVvpat(referenceNumber: string): Promise<({
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
        timestamp: Date;
        id: number;
        candidateId: number;
        voteHash: string;
        referenceNumber: string;
        candidateName: string;
        partyName: string;
        partySymbolUrl: string | null;
        electionName: string;
        voteId: number;
    }) | null>;
    getResults(electionId: number): Promise<({
        candidates: ({
            _count: {
                votes: number;
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
    getDashboardStats(): Promise<{
        totalElections: number;
        activeElection: {
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
            status: import(".prisma/client").$Enums.ElectionStatus;
            isResultPublished: boolean;
        } | null;
        totalStations: number;
        totalVoters: number;
        totalCandidates: number;
        totalParties: number;
        totalVotes: number;
        turnoutPercent: string;
    }>;
}
export declare const voteRepository: VoteRepository;
//# sourceMappingURL=vote.repository.d.ts.map