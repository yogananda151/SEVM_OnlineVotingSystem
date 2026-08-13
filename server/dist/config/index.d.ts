export declare const config: {
    env: string;
    port: number;
    jwt: {
        secret: string;
        expiresIn: string;
        refreshSecret: string;
        refreshExpiresIn: string;
    };
    client: {
        url: string;
    };
    upload: {
        path: string;
        maxFileSize: number;
    };
    bcrypt: {
        rounds: number;
    };
    rateLimit: {
        windowMs: number;
        max: number;
    };
    logging: {
        level: string;
        file: string;
    };
};
//# sourceMappingURL=index.d.ts.map