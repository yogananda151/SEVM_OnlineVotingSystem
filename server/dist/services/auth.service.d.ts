export declare class AuthService {
    login(email: string, password: string, ipAddress: string, userAgent?: string): Promise<{
        accessToken: string;
        refreshToken: string;
        user: {
            id: number;
            email: string;
            role: import(".prisma/client").$Enums.UserRole;
            profile: {
                fullName: string;
                employeeId: string;
            } | undefined;
        };
    }>;
    logout(userId: number, ipAddress: string, userAgent?: string): Promise<void>;
    getProfile(userId: number): Promise<{
        email: string;
        id: number;
        passwordHash: string;
        role: import(".prisma/client").$Enums.UserRole;
        isActive: boolean;
        lastLoginAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
    }>;
}
export declare const authService: AuthService;
//# sourceMappingURL=auth.service.d.ts.map