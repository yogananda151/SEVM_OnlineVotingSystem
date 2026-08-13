"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const morgan_1 = __importDefault(require("morgan"));
const path_1 = __importDefault(require("path"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const config_1 = require("./config");
const logger_1 = require("./utils/logger");
const error_middleware_1 = require("./middleware/error.middleware");
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const election_routes_1 = __importDefault(require("./routes/election.routes"));
const management_routes_1 = __importDefault(require("./routes/management.routes"));
const voter_routes_1 = __importDefault(require("./routes/voter.routes"));
const voting_routes_1 = __importDefault(require("./routes/voting.routes"));
const report_routes_1 = __importDefault(require("./routes/report.routes"));
const app = (0, express_1.default)();
exports.app = app;
// ── Security ──────────────────────────────────────────────────────
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // allow serving uploaded images
}));
// ── CORS ──────────────────────────────────────────────────────────
app.use((0, cors_1.default)({
    origin: config_1.config.client.url,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
// ── Rate limiting ─────────────────────────────────────────────────
app.use('/api', (0, express_rate_limit_1.default)({
    windowMs: config_1.config.rateLimit.windowMs,
    max: config_1.config.rateLimit.max,
    message: { success: false, message: 'Too many requests. Please try again later.' },
}));
// ── Parsing & Compression ─────────────────────────────────────────
app.use((0, compression_1.default)());
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// ── Logging ───────────────────────────────────────────────────────
app.use((0, morgan_1.default)('combined', {
    stream: { write: (message) => logger_1.logger.info(message.trim()) },
}));
// ── Static file serving for uploads ──────────────────────────────
app.use('/uploads', express_1.default.static(path_1.default.join(process.cwd(), config_1.config.upload.path)));
// ── Health check ──────────────────────────────────────────────────
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString(), env: config_1.config.env });
});
// ── API Routes ────────────────────────────────────────────────────
app.use('/api/auth', auth_routes_1.default);
app.use('/api/elections', election_routes_1.default);
app.use('/api', management_routes_1.default);
app.use('/api/voters', voter_routes_1.default);
app.use('/api/voting', voting_routes_1.default);
app.use('/api', report_routes_1.default);
// ── 404 & Error handlers ──────────────────────────────────────────
app.use(error_middleware_1.notFoundHandler);
app.use(error_middleware_1.errorHandler);
//# sourceMappingURL=app.js.map