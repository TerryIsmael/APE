import type { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import User from '../schemas/userSchema';

export const validateChat = [
    body('name').trim().notEmpty().withMessage('El nombre del chat es obligatorio')
    .isLength({ min: 1, max: 60 }).withMessage('El nombre de chat debe tener entre 1 y 60 caracteres'),

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