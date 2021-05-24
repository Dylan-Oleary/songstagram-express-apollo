import express, { Request, Response, NextFunction } from "express";

import { DB_CONNECTION, REDIS_CLIENT } from "../config/constants";
import { AuthenticationService } from "../services";

const baseRouter = express.Router({ caseSensitive: true });

/**
 * Validates that token request data is valid before continuing with the request
 */
const validateTokenRequestData = (req: Request, res: Response, next: NextFunction) => {
    if (!req.session!.refreshToken) {
        req.session = null;

        return next({
            statusCode: 400,
            message: "Bad Request",
            details: ["Session does not exist"]
        });
    }

    if (!req.body["userNo"] || String(req.body["userNo"]).trim().length === 0) {
        return next({
            statusCode: 400,
            message: "Bad Request",
            details: [`Missing request data: userNo is required`]
        });
    }

    next();
};

baseRouter.route("/login").post((req: Request, res: Response, next: NextFunction) => {
    return new AuthenticationService(req.app.get(DB_CONNECTION))
        .authenticateUser(req.body.email, req.body.password, req.app.get(REDIS_CLIENT))
        .then((response) => {
            req.session!.refreshToken = response.refreshToken;

            return res.status(200).json({
                user: response.user,
                accessToken: response.accessToken
            });
        })
        .catch(next);
});

baseRouter
    .route("/logout")
    .post(validateTokenRequestData, (req: Request, res: Response, next: NextFunction) => {
        const { userNo } = req.body;

        return new AuthenticationService(req.app.get(DB_CONNECTION))
            .logoutUser(userNo, req.session!.refreshToken, req.app.get(REDIS_CLIENT))
            .then(() => {
                req.session = null;
                return res.sendStatus(200);
            })
            .catch(next);
    });

baseRouter
    .route("/token")
    .post(validateTokenRequestData, (req: Request, res: Response, next: NextFunction) => {
        const { userNo } = req.body;

        return new AuthenticationService(req.app.get(DB_CONNECTION))
            .getNewTokenSet(userNo, req.session!.refreshToken, req.app.get(REDIS_CLIENT))
            .then(({ accessToken, refreshToken }) => {
                req.session!.refreshToken = refreshToken;

                return res.status(200).json({ accessToken });
            })
            .catch((error) => {
                if (error?.statusCode === 403) req.session = null;

                return next(error);
            });
    });

export default baseRouter;
export { baseRouter };
