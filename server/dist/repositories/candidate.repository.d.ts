export declare class CandidateRepository {
    findAll(constituencyId?: number): Promise<({
        _count: {
            votes: number;
        };
        constituency: {
            name: string;
            id: number;
            code: string;
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
        partyId: number | null;
        age: number;
        qualification: string | null;
        serialNumber: number;
        isIndependent: boolean;
        photoUrl: string | null;
    })[]>;
    findById(id: number): Promise<({
        _count: {
            votes: number;
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
    }) | null>;
    create(data: {
        constituencyId: number;
        partyId?: number | null;
        fullName: string;
        age: number;
        qualification?: string;
        serialNumber: number;
        isIndependent?: boolean;
    }): Promise<{
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
    }>;
    update(id: number, data: Partial<{
        fullName: string;
        age: number;
        qualification: string;
        photoUrl: string;
        partyId: number | null;
        isIndependent: boolean;
    }>): Promise<{
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
    }>;
    delete(id: number): Promise<{
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
    }>;
}
export declare const candidateRepository: CandidateRepository;
//# sourceMappingURL=candidate.repository.d.ts.map