import { Request, Response, NextFunction } from 'express';
export declare class VoterController {
    getAll(req: Request, res: Response, next: NextFunction): Promise<void>;
    getById(req: Request, res: Response, next: NextFunction): Promise<void>;
    create(req: Request, res: Response, next: NextFunction): Promise<void>;
    update(req: Request, res: Response, next: NextFunction): Promise<void>;
    uploadPhoto(req: Request, res: Response, next: NextFunction): Promise<void>;
    delete(req: Request, res: Response, next: NextFunction): Promise<void>;
    bulkCreate(req: Request, res: Response, next: NextFunction): Promise<void>;
}
export declare const voterController: VoterController;
//# sourceMappingURL=voter.controller.d.ts.map