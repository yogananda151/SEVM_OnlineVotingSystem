"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFileUrl = exports.uploadVoterPhoto = exports.uploadPartySymbol = exports.uploadCandidatePhoto = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const config_1 = require("../config");
const error_middleware_1 = require("./error.middleware");
const createStorage = (folder) => {
    const uploadPath = path_1.default.join(config_1.config.upload.path, folder);
    if (!fs_1.default.existsSync(uploadPath)) {
        fs_1.default.mkdirSync(uploadPath, { recursive: true });
    }
    return multer_1.default.diskStorage({
        destination: (_req, _file, cb) => cb(null, uploadPath),
        filename: (_req, file, cb) => {
            const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
            cb(null, `${uniqueSuffix}${path_1.default.extname(file.originalname)}`);
        },
    });
};
const imageFilter = (_req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|svg/;
    const extname = allowedTypes.test(path_1.default.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
        cb(null, true);
    }
    else {
        cb(new error_middleware_1.AppError('Only image files are allowed.', 400));
    }
};
exports.uploadCandidatePhoto = (0, multer_1.default)({
    storage: createStorage('candidates'),
    fileFilter: imageFilter,
    limits: { fileSize: config_1.config.upload.maxFileSize },
}).single('photo');
exports.uploadPartySymbol = (0, multer_1.default)({
    storage: createStorage('parties'),
    fileFilter: imageFilter,
    limits: { fileSize: config_1.config.upload.maxFileSize },
}).single('symbol');
exports.uploadVoterPhoto = (0, multer_1.default)({
    storage: createStorage('voters'),
    fileFilter: imageFilter,
    limits: { fileSize: config_1.config.upload.maxFileSize },
}).single('photo');
const getFileUrl = (folder, filename) => {
    return `/uploads/${folder}/${filename}`;
};
exports.getFileUrl = getFileUrl;
//# sourceMappingURL=upload.middleware.js.map