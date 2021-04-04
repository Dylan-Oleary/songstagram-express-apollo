import { Request, Response, NextFunction } from "express";

import { DB_CONNECTION } from "../config/constants";
import { AuthenticationService } from "../services";

const authenticateRequest: (req: Request, res: Response, next: NextFunction) => void = (
    req,
    res,
    next
) => {
    const dbConnection = req.app.get(DB_CONNECTION);
    const authenticationService = new AuthenticationService(dbConnection);

    return authenticationService
        .authenticateAccessToken(req)
        .then((user) => {
            req.user = user;

            next();
        })
        .catch(next);
};

export default authenticateRequest;
export { authenticateRequest };
