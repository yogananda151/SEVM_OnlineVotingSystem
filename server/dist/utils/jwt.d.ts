export interface JwtPayload {
    userId: number;
    email: string;
    role: string;
    stationId?: number;
}
export declare const generateAccessToken: (payload: JwtPayload) => string;
export declare const generateRefreshToken: (payload: JwtPayload) => string;
export declare const verifyAccessToken: (token: string) => JwtPayload;
export declare const verifyRefreshToken: (token: string) => JwtPayload;
//# sourceMappingURL=jwt.d.ts.map