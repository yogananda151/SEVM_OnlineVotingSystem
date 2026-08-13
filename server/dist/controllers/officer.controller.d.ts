import { Request, Response, NextFunction } from 'express';
export declare class OfficerController {
    getAll(_req: Request, res: Response, next: NextFunction): Promise<void>;
    create(req: Request, res: Response, next: NextFunction): Promise<void>;
    update(req: Request, res: Response, next: NextFunction): Promise<void>;
    delete(req: Request, res: Response, next: NextFunction): Promise<void>;
}
export declare const officerController: OfficerController;
//# sourceMappingURL=officer.controller.d.ts.map