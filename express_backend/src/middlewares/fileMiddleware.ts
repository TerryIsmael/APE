import { ObjectId } from 'mongodb';
import { body, validationResult } from 'express-validator';
import  User  from '../schemas/userSchema.ts';
import  File  from '../schemas/fileSchema.ts';
import type { Request, Response, NextFunction } from 'express';

export const validatePerm = [
    body('username').custom(async (value) => {
        const user = await User.findOne({ username: value});
        if (!user) {
            return Promise.reject('El usuario no existe');
        }
    }),
    body('fileId').custom(async (value) => {
        const file = await File.findOne({ _id: ObjectId.createFromHexString(value)});
        if (!file) {
            return Promise.reject('El archivo no existe');
        }
    }),
    body('perm').trim().notEmpty().withMessage('El permiso del archivo es obligatorio').isIn(['none','view', 'read', 'write']).withMessage('El permiso del archivo debe ser view, read o write, o none para eliminar el permiso'),
    (req : Request, res : Response, next : NextFunction) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ errors: errors.array() });
        } else {
            next();
        }
    }
];