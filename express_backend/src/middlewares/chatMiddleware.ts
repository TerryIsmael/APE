import type { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import User from '../schemas/userSchema';

export const validatePrivateChat = [
    body('users').isArray().withMessage('Los usuarios deben ser un array')
    .custom((value) => value.length >= 2).withMessage('Debe haber al menos 2 usuarios')
    .custom(async (value) => {
        for (const user of value) {
            const existingUser = await User.findById(user._id);
            if (!existingUser) {
                throw new Error('Este usuario no existe');
            }
        }
    }),

    (req : Request, res : Response, next : NextFunction) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ errors: errors.array().map(x => x.msg) });
        } else {
            next();
        }
    }
];