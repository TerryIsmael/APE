import type { Request, Response, NextFunction } from 'express';

export function isLogged(req: Request & { isAuthenticated: () => boolean }, res: Response, next: NextFunction) {
    if (req.isAuthenticated()) {
        return next();
    } else {
        res.status(401).json({ message: 'No estás autenticado' });
    }
}