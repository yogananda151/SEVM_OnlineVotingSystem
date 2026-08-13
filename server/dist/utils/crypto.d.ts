export declare const hashPassword: (password: string) => Promise<string>;
export declare const comparePassword: (password: string, hash: string) => Promise<boolean>;
export declare const generateVoteHash: (data: {
    voterId: number;
    candidateId: number;
    pollingStationId: number;
    timestamp: string;
    nonce: string;
}) => string;
export declare const hashAadhaar: (aadhaar: string) => string;
export declare const generateOTP: () => string;
export declare const generateReferenceNumber: () => string;
//# sourceMappingURL=crypto.d.ts.map