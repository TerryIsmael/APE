import { body, validationResult } from 'express-validator';
import  { Item }  from '../schemas/itemSchema.ts';
import User from '../schemas/userSchema.ts';
import type { Request, Response, NextFunction } from 'express';
import { Permission } from '../models/profilePerms.ts';

export const validatePerm = [
    body('username').custom(async (value) => {
        const user = await User.findOne({ username: value});
        if (!user) {
            return Promise.reject('El usuario no existe');
        }
    }),
    
    body('itemId').custom(async (value) => {
        const item = await Item.findOne({ _id: value});
        if (!item) {
            return Promise.reject('El archivo no existe');
        }
    }),

    body('perm').trim().notEmpty().withMessage('El permiso del archivo es obligatorio')
    .isIn([...Object.values(Permission), "None"].filter( (x: String) => x != "Owner" )).withMessage('El permiso del archivo debe ser Read, Write, o None para eliminar el permiso'),
    
    (req : Request, res : Response, next : NextFunction) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ errors: errors.array() });
        } else {
            next();
        }
    }
];