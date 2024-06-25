import type { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';

export function isLogged(req: Request & { isAuthenticated: () => boolean }, res: Response, next: NextFunction) {
    if (req.isAuthenticated()) {
        return next();
    } else {
        res.status(401).json({ error: 'No estás autenticado' });
    }
}

export const validatePassword = [
   body('password').trim().isLength({ min: 12 }).withMessage('La contraseña debe tener al menos 12 caracteres no vacíos')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])/).withMessage('La contraseña debe tener al menos una letra minúscula, una letra mayúscula, un número y un carácter especial')
    .custom((value) => !/\s/.test(value)).withMessage('La contraseña no puede contener espacios'),

    (req : Request, res : Response, next : NextFunction) => {
        console.log(req.originalUrl);
        if(req.originalUrl === '/register' || req.body.password) {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                res.status(400).json({ errors: errors.array().map(x => x.msg) });
            } else {
                next();
            }
        } else {
            next();
        }
    }
];