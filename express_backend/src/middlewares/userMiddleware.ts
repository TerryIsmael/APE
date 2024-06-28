import type { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';

export function isLogged(req: Request & { isAuthenticated: () => boolean }, res: Response, next: NextFunction) {
    if (req.isAuthenticated()) {
        return next();
    } else {
        res.status(401).json({ error: 'No estás autenticado' });
    }
};

export const validatePassword = [
    body('password').trim().isLength({ min: 12 }).withMessage('La contraseña debe tener al menos 12 caracteres no vacíos')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])/).withMessage('La contraseña debe tener al menos una letra minúscula, una letra mayúscula, un número y un carácter especial'),
    
        (req : Request, res : Response, next : NextFunction) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ errors: errors.array().map(x => x.msg) });
        } else {
            next();
        }
    }
];

export const validateEditPassword = [
    body('user.password')
     .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])/).withMessage('La contraseña debe tener al menos una letra minúscula, una letra mayúscula, un número y un carácter especial')
     .custom((value) => value.trim().length >= 12).withMessage('La contraseña debe tener al menos 12 caracteres no vacíos'),

     (req : Request, res : Response, next : NextFunction) => {
        if (!req.body.user) {
            return res.status(400).json({ error: "No se ha proporcionado el objeto user" });
        }
        if (req.body.user.password) {
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