export declare class VerificationService {
    /**
     * Simulate voter identity verification.
     * In a real system this would call a government API.
     */
    initiateVerification(data: {
        method: 'AADHAAR' | 'VOTER_ID';
        voterId?: string;
        aadhaarNumber?: string;
        pollingStationId: number;
    }): Promise<{
        voterId: number;
        voterName: string;
        maskedPhone: string;
        simulatedOtp: string;
        message: string;
    }>;
    verifyOTP(voterId: number, otp: string): Promise<{
        verified: boolean;
        voter: {
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
        };
    }>;
    simulateBiometric(voterId: number, type: 'FINGERPRINT' | 'FACE'): Promise<{
        verified: boolean;
        voter: {
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
        };
        message: string;
    }>;
}
export declare const verificationService: VerificationService;
//# sourceMappingURL=verification.service.d.ts.map