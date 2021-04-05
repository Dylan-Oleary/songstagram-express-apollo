import express, { Request, Response, NextFunction } from "express";

import { DB_CONNECTION, REDIS_CLIENT } from "../config/constants";
import { AuthenticationService } from "../services";

const baseRouter = express.Router({ caseSensitive: true });

/**
 * Validates that token request data is valid before continuing with the request
 */
const validateTokenRequestData = (req: Request, res: Response, next: NextFunction) => {
    ["token", "userNo"].forEach((key) => {
        if (!req.body[key] || String(req.body[key]).trim().length === 0) {
            return next({
                statusCode: 400,
                message: "Bad Request",
                details: [`Missing request data: ${key} is required`]
            });
        }
    });

    next();
};

baseRouter.route("/login").post((req: Request, res: Response, next: NextFunction) => {
    return new AuthenticationService(req.app.get(DB_CONNECTION))
        .authenticateUser(req.body.email, req.body.password, req.app.get(REDIS_CLIENT))
        .then((response) => res.status(200).json(response))
        .catch(next);
});

baseRouter
    .route("/logout")
    .post(validateTokenRequestData, (req: Request, res: Response, next: NextFunction) => {
        const { token, userNo } = req.body;

        return new AuthenticationService(req.app.get(DB_CONNECTION))
            .logoutUser(userNo, token, req.app.get(REDIS_CLIENT))
            .then(() => res.sendStatus(200))
            .catch(next);
    });

baseRouter
    .route("/token")
    .post(validateTokenRequestData, (req: Request, res: Response, next: NextFunction) => {
        const { token, userNo } = req.body;

        return new AuthenticationService(req.app.get(DB_CONNECTION))
            .getNewAccessToken(userNo, token, req.app.get(REDIS_CLIENT))
            .then((accessToken) => res.status(200).json({ accessToken }))
            .catch(next);
    });

export default baseRouter;
export { baseRouter };
