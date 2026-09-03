import { Request, Response, NextFunction } from 'express';
export declare class ConstituencyController {
    getAll(req: Request, res: Response, next: NextFunction): Promise<void>;
    getActive(req: Request, res: Response, next: NextFunction): Promise<void>;
    getById(req: Request, res: Response, next: NextFunction): Promise<void>;
    create(req: Request, res: Response, next: NextFunction): Promise<void>;
    update(req: Request, res: Response, next: NextFunction): Promise<void>;
    delete(req: Request, res: Response, next: NextFunction): Promise<void>;
}
export declare const constituencyController: ConstituencyController;
export declare class PollingStationController {
    getAll(req: Request, res: Response, next: NextFunction): Promise<void>;
    getById(req: Request, res: Response, next: NextFunction): Promise<void>;
    create(req: Request, res: Response, next: NextFunction): Promise<void>;
    update(req: Request, res: Response, next: NextFunction): Promise<void>;
    updateMachineStatus(req: Request, res: Response, next: NextFunction): Promise<void>;
    getTurnout(req: Request, res: Response, next: NextFunction): Promise<void>;
    delete(req: Request, res: Response, next: NextFunction): Promise<void>;
}
export declare const pollingStationController: PollingStationController;
//# sourceMappingURL=location.controller.d.ts.map