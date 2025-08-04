export declare const config: {
    ai: {
        anthropicApiKey: string | undefined;
        openaiApiKey: string | undefined;
    };
    server: {
        port: number;
        nodeEnv: string;
    };
    api: {
        defaultTimeout: number;
        maxPageSize: number;
    };
    rateLimit: {
        windowMs: number;
        maxRequests: number;
    };
};
export default config;
