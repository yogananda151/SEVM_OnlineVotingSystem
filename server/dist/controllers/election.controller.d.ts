import { Request, Response, NextFunction } from 'express';
export declare class ElectionController {
    getAll(req: Request, res: Response, next: NextFunction): Promise<void>;
    getById(req: Request, res: Response, next: NextFunction): Promise<void>;
    getStats(req: Request, res: Response, next: NextFunction): Promise<void>;
    getDashboardStats(req: Request, res: Response, next: NextFunction): Promise<void>;
    getReadiness(req: Request, res: Response, next: NextFunction): Promise<void>;
    create(req: Request, res: Response, next: NextFunction): Promise<void>;
    update(req: Request, res: Response, next: NextFunction): Promise<void>;
    updateStatus(req: Request, res: Response, next: NextFunction): Promise<void>;
    getConstituencies(req: Request, res: Response, next: NextFunction): Promise<void>;
    setConstituencies(req: Request, res: Response, next: NextFunction): Promise<void>;
    getOfficer(req: Request, res: Response, next: NextFunction): Promise<void>;
    setOfficer(req: Request, res: Response, next: NextFunction): Promise<void>;
    publishResults(req: Request, res: Response, next: NextFunction): Promise<void>;
    getResults(req: Request, res: Response, next: NextFunction): Promise<void>;
    delete(req: Request, res: Response, next: NextFunction): Promise<void>;
}
export declare const electionController: ElectionController;
//# sourceMappingURL=election.controller.d.ts.map