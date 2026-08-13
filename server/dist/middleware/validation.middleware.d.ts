import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
export declare const validate: (schema: z.ZodTypeAny) => (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const loginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
}, {
    email: string;
    password: string;
}>;
export declare const createElectionSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    electionType: z.ZodString;
    scheduledDate: z.ZodString;
}, "strip", z.ZodTypeAny, {
    name: string;
    electionType: string;
    scheduledDate: string;
    description?: string | undefined;
}, {
    name: string;
    electionType: string;
    scheduledDate: string;
    description?: string | undefined;
}>;
export declare const updateElectionSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    electionType: z.ZodOptional<z.ZodString>;
    scheduledDate: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    description?: string | undefined;
    electionType?: string | undefined;
    scheduledDate?: string | undefined;
}, {
    name?: string | undefined;
    description?: string | undefined;
    electionType?: string | undefined;
    scheduledDate?: string | undefined;
}>;
export declare const createConstituencySchema: z.ZodObject<{
    electionId: z.ZodNumber;
    name: z.ZodString;
    code: z.ZodString;
    state: z.ZodString;
    district: z.ZodString;
    totalVoters: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    name: string;
    code: string;
    electionId: number;
    state: string;
    district: string;
    totalVoters?: number | undefined;
}, {
    name: string;
    code: string;
    electionId: number;
    state: string;
    district: string;
    totalVoters?: number | undefined;
}>;
export declare const createPollingStationSchema: z.ZodObject<{
    constituencyId: z.ZodNumber;
    name: z.ZodString;
    code: z.ZodString;
    address: z.ZodString;
    totalBooths: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    name: string;
    constituencyId: number;
    code: string;
    address: string;
    totalBooths?: number | undefined;
}, {
    name: string;
    constituencyId: number;
    code: string;
    address: string;
    totalBooths?: number | undefined;
}>;
export declare const createPartySchema: z.ZodObject<{
    name: z.ZodString;
    abbreviation: z.ZodString;
    symbol: z.ZodOptional<z.ZodString>;
    color: z.ZodOptional<z.ZodString>;
    foundedYear: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    name: string;
    abbreviation: string;
    symbol?: string | undefined;
    color?: string | undefined;
    foundedYear?: number | undefined;
}, {
    name: string;
    abbreviation: string;
    symbol?: string | undefined;
    color?: string | undefined;
    foundedYear?: number | undefined;
}>;
export declare const createCandidateSchema: z.ZodObject<{
    constituencyId: z.ZodNumber;
    partyId: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    fullName: z.ZodString;
    age: z.ZodNumber;
    qualification: z.ZodOptional<z.ZodString>;
    serialNumber: z.ZodNumber;
    isIndependent: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    fullName: string;
    constituencyId: number;
    age: number;
    serialNumber: number;
    partyId?: number | null | undefined;
    qualification?: string | undefined;
    isIndependent?: boolean | undefined;
}, {
    fullName: string;
    constituencyId: number;
    age: number;
    serialNumber: number;
    partyId?: number | null | undefined;
    qualification?: string | undefined;
    isIndependent?: boolean | undefined;
}>;
export declare const createOfficerSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
    fullName: z.ZodString;
    employeeId: z.ZodString;
    phone: z.ZodString;
    pollingStationId: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    email: string;
    fullName: string;
    employeeId: string;
    phone: string;
    password: string;
    pollingStationId?: number | null | undefined;
}, {
    email: string;
    fullName: string;
    employeeId: string;
    phone: string;
    password: string;
    pollingStationId?: number | null | undefined;
}>;
export declare const createVoterSchema: z.ZodObject<{
    constituencyId: z.ZodNumber;
    pollingStationId: z.ZodNumber;
    fullName: z.ZodString;
    voterId: z.ZodString;
    aadhaarNumber: z.ZodOptional<z.ZodString>;
    dateOfBirth: z.ZodString;
    gender: z.ZodEnum<["Male", "Female", "Other"]>;
    address: z.ZodString;
    phone: z.ZodOptional<z.ZodString>;
    serialNumber: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    fullName: string;
    pollingStationId: number;
    constituencyId: number;
    address: string;
    serialNumber: number;
    voterId: string;
    dateOfBirth: string;
    gender: "Male" | "Female" | "Other";
    phone?: string | undefined;
    aadhaarNumber?: string | undefined;
}, {
    fullName: string;
    pollingStationId: number;
    constituencyId: number;
    address: string;
    serialNumber: number;
    voterId: string;
    dateOfBirth: string;
    gender: "Male" | "Female" | "Other";
    phone?: string | undefined;
    aadhaarNumber?: string | undefined;
}>;
export declare const voterVerificationSchema: z.ZodObject<{
    method: z.ZodEnum<["AADHAAR", "VOTER_ID"]>;
    voterId: z.ZodOptional<z.ZodString>;
    aadhaarNumber: z.ZodOptional<z.ZodString>;
    pollingStationId: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    pollingStationId: number;
    method: "AADHAAR" | "VOTER_ID";
    voterId?: string | undefined;
    aadhaarNumber?: string | undefined;
}, {
    pollingStationId: number;
    method: "AADHAAR" | "VOTER_ID";
    voterId?: string | undefined;
    aadhaarNumber?: string | undefined;
}>;
export declare const otpVerifySchema: z.ZodObject<{
    voterId: z.ZodNumber;
    otp: z.ZodString;
}, "strip", z.ZodTypeAny, {
    voterId: number;
    otp: string;
}, {
    voterId: number;
    otp: string;
}>;
export declare const castVoteSchema: z.ZodObject<{
    voterId: z.ZodNumber;
    candidateId: z.ZodNumber;
    pollingStationId: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    pollingStationId: number;
    voterId: number;
    candidateId: number;
}, {
    pollingStationId: number;
    voterId: number;
    candidateId: number;
}>;
//# sourceMappingURL=validation.middleware.d.ts.map