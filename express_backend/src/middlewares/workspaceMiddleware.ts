import { body, validationResult } from 'express-validator';
import type { Request, Response, NextFunction } from 'express';
import { WSPermission } from '../models/profile';

export const validateWsPerms = [
    body('perm').trim().notEmpty().withMessage('El permiso del archivo es obligatorio')
    .isIn([...Object.values(WSPermission), "None"].filter( (x: String) => x != "Owner" )).withMessage('El permiso del workspace debe ser Read, Write, o Admin'),

    (req : Request, res : Response, next : NextFunction) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ errors: errors.array().map(x => x.msg) });
        } else {
            next();
        }
    }
];

export const validateProfilePerm = [
    body('profile.name').trim().notEmpty().withMessage('El nombre del perfil es obligatorio')
    .isLength({ min: 1, max: 60 }).withMessage('El nombre del workspace debe tener entre 1 y 60 caracteres'),

    body('profile.wsPerm').trim().notEmpty().withMessage('El permiso del workspace es obligatorio')
    .isIn([...Object.values(WSPermission), "None"].filter( (x: String) => x != "Owner" )).withMessage('El permiso del workspace debe ser Read, Write, o Admin'),

    (req : Request, res : Response, next : NextFunction) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ errors: errors.array().map(x => x.msg) });
        } else {
            next();
        }
    }
];

export const validateEditWsName = [
    body('workspace.name').trim().notEmpty().withMessage('El nombre del workspace es obligatorio')
    .isLength({ min: 1, max: 55 }).withMessage('El nombre del workspace debe tener entre 1 y 55 caracteres'),

    (req : Request, res : Response, next : NextFunction) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ errors: errors.array().map(x => x.msg) });
        } else {
            next();
        }
    }
];

export const validateNewWsName = [
    body('wsName').trim().notEmpty().withMessage('El nombre del workspace es obligatorio')
    .isLength({ min: 1, max: 55 }).withMessage('El nombre del workspace debe tener entre 1 y 55 caracteres'),

    (req : Request, res : Response, next : NextFunction) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ errors: errors.array().map(x => x.msg) });
        } else {
            next();
        }
    }
];