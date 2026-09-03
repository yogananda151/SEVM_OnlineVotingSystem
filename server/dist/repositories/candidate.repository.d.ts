export declare class CandidateRepository {
    findAll(electionId?: number, constituencyId?: number): Promise<({
        _count: {
            votes: number;
        };
        constituency: {
            code: string;
            name: string;
            id: number;
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
    })[]>;
    findById(id: number): Promise<({
        _count: {
            votes: number;
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
    }) | null>;
    create(data: {
        electionId: number;
        constituencyId: number;
        partyId?: number | null;
        fullName: string;
        age: number;
        qualification?: string;
        serialNumber: number;
        isIndependent?: boolean;
    }): Promise<{
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
    }>;
    update(id: number, data: Partial<{
        fullName: string;
        age: number;
        qualification: string;
        serialNumber: number;
        partyId: number | null;
        isIndependent: boolean;
        photoUrl: string;
    }>): Promise<{
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
    }>;
    delete(id: number): Promise<{
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
    }>;
}
export declare const candidateRepository: CandidateRepository;
//# sourceMappingURL=candidate.repository.d.ts.map