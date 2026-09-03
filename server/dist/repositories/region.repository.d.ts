export declare class RegionRepository {
    findAll(): Promise<({
        _count: {
            constituencies: number;
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
    })[]>;
    findById(id: number): Promise<({
        _count: {
            constituencies: number;
        };
        constituencies: ({
            _count: {
                voters: number;
                pollingStations: number;
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
    }) | null>;
    findActive(): Promise<{
        code: string;
        name: string;
        id: number;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        description: string | null;
    }[]>;
    create(data: {
        name: string;
        code: string;
        description?: string;
    }): Promise<{
        code: string;
        name: string;
        id: number;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        description: string | null;
    }>;
    update(id: number, data: Partial<{
        name: string;
        code: string;
        description: string;
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
    }>;
}
export declare const regionRepository: RegionRepository;
//# sourceMappingURL=region.repository.d.ts.map