export declare class PartyRepository {
    findAll(): Promise<({
        _count: {
            candidates: number;
        };
    } & {
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
    })[]>;
    findById(id: number): Promise<({
        candidates: ({
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
    }) | null>;
    create(data: {
        name: string;
        abbreviation: string;
        symbol?: string;
        color?: string;
        foundedYear?: number;
    }): Promise<{
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
    }>;
    update(id: number, data: Partial<{
        name: string;
        abbreviation: string;
        symbol: string;
        symbolUrl: string;
        color: string;
        foundedYear: number;
        isActive: boolean;
    }>): Promise<{
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
    }>;
    delete(id: number): Promise<{
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
    }>;
}
export declare const partyRepository: PartyRepository;
//# sourceMappingURL=party.repository.d.ts.map