import { Response } from 'express';
export interface ApiResponse<T = unknown> {
    success: boolean;
    message: string;
    data?: T;
    errors?: unknown;
    meta?: {
        total?: number;
        page?: number;
        limit?: number;
        totalPages?: number;
    };
}
export declare const sendSuccess: <T>(res: Response, data: T, message?: string, statusCode?: number, meta?: ApiResponse["meta"]) => void;
export declare const sendError: (res: Response, message: string, statusCode?: number, errors?: unknown) => void;
export declare const sendPaginated: <T>(res: Response, data: T[], total: number, page: number, limit: number, message?: string) => void;
//# sourceMappingURL=response.d.ts.map