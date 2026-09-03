import { Request, Response, NextFunction } from 'express';
export declare class VotingController {
    initiateVerification(req: Request, res: Response, next: NextFunction): Promise<void>;
    verifyOTP(req: Request, res: Response, next: NextFunction): Promise<void>;
    simulateBiometric(req: Request, res: Response, next: NextFunction): Promise<void>;
    castVote(req: Request, res: Response, next: NextFunction): Promise<void>;
    getVVPAT(req: Request, res: Response, next: NextFunction): Promise<void>;
    getBallotCandidates(req: Request, res: Response, next: NextFunction): Promise<void>;
    getPublicStations(_req: Request, res: Response, next: NextFunction): Promise<void>;
    getPublicStationById(req: Request, res: Response, next: NextFunction): Promise<void>;
}
export declare const votingController: VotingController;
//# sourceMappingURL=voting.controller.d.ts.map