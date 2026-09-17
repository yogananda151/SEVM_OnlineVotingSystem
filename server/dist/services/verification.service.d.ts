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
                code: string;
                name: string;
                id: number;
                isActive: boolean;
                createdAt: Date;
                updatedAt: Date;
                deletedAt: Date | null;
                constituencyId: number;
                address: string;
                capacity: number;
                totalBooths: number;
                machineStatus: import(".prisma/client").$Enums.MachineStatus;
                isPollingActive: boolean;
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
            votes: ({
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
                voterId: number;
                id: number;
                pollingStationId: number;
                electionId: number;
                candidateId: number;
                voteHash: string;
                referenceNumber: string;
                isVerified: boolean;
                castAt: Date;
            })[];
            electionStatuses: {
                voterId: number;
                id: number;
                electionId: number;
                hasVoted: boolean;
                votedAt: Date | null;
            }[];
        } & {
            voterId: string;
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
            dateOfBirth: Date;
            gender: string;
            photoUrl: string | null;
            aadhaarHash: string | null;
        };
    }>;
    simulateBiometric(voterId: number, type: 'FINGERPRINT' | 'FACE'): Promise<{
        verified: boolean;
        voter: {
            pollingStation: {
                code: string;
                name: string;
                id: number;
                isActive: boolean;
                createdAt: Date;
                updatedAt: Date;
                deletedAt: Date | null;
                constituencyId: number;
                address: string;
                capacity: number;
                totalBooths: number;
                machineStatus: import(".prisma/client").$Enums.MachineStatus;
                isPollingActive: boolean;
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
            votes: ({
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
                voterId: number;
                id: number;
                pollingStationId: number;
                electionId: number;
                candidateId: number;
                voteHash: string;
                referenceNumber: string;
                isVerified: boolean;
                castAt: Date;
            })[];
            electionStatuses: {
                voterId: number;
                id: number;
                electionId: number;
                hasVoted: boolean;
                votedAt: Date | null;
            }[];
        } & {
            voterId: string;
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
            dateOfBirth: Date;
            gender: string;
            photoUrl: string | null;
            aadhaarHash: string | null;
        };
        message: string;
    }>;
}
export declare const verificationService: VerificationService;
//# sourceMappingURL=verification.service.d.ts.map