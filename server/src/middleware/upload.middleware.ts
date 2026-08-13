import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { config } from '../config';
import { AppError } from './error.middleware';

const createStorage = (folder: string) => {
  const uploadPath = path.join(config.upload.path, folder);
  if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
  }

  return multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadPath),
    filename: (_req, file, cb) => {
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
    },
  });
};

const imageFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp|svg/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new AppError('Only image files are allowed.', 400));
  }
};

export const uploadCandidatePhoto = multer({
  storage: createStorage('candidates'),
  fileFilter: imageFilter,
  limits: { fileSize: config.upload.maxFileSize },
}).single('photo');

export const uploadPartySymbol = multer({
  storage: createStorage('parties'),
  fileFilter: imageFilter,
  limits: { fileSize: config.upload.maxFileSize },
}).single('symbol');

export const uploadVoterPhoto = multer({
  storage: createStorage('voters'),
  fileFilter: imageFilter,
  limits: { fileSize: config.upload.maxFileSize },
}).single('photo');

export const getFileUrl = (folder: string, filename: string): string => {
  return `/uploads/${folder}/${filename}`;
};
