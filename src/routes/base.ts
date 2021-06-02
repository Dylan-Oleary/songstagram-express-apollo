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
            statusCode: 401,
            message: "Unauthorized",
            details: ["Session does not exist"]
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
        return new AuthenticationService(req.app.get(DB_CONNECTION))
            .logoutUser(req.session!.refreshToken, req.app.get(REDIS_CLIENT))
            .then(() => {
                req.session = null;
                return res.sendStatus(200);
            })
            .catch(next);
    });

baseRouter
    .route("/refresh")
    .get(validateTokenRequestData, (req: Request, res: Response, next: NextFunction) => {
        return new AuthenticationService(req.app.get(DB_CONNECTION))
            .getNewTokenSet(req.session!.refreshToken, req.app.get(REDIS_CLIENT))
            .then(({ accessToken, refreshToken }) => {
                req.session!.refreshToken = refreshToken;

                return res.status(200).json({ accessToken });
            })
            .catch((error) => {
                if (error?.statusCode === 403) req.session = null;

                return next(error);
            });
    });

baseRouter
    .route("/token")
    .get(validateTokenRequestData, (req: Request, res: Response, next: NextFunction) => {
        return new AuthenticationService(req.app.get(DB_CONNECTION))
            .getNewAccessToken(req.session!.refreshToken, req.app.get(REDIS_CLIENT))
            .then((accessToken) => {
                return res.status(200).json({ accessToken });
            })
            .catch((error) => {
                if (error?.statusCode === 403) req.session = null;

                return next(error);
            });
    });

export default baseRouter;
export { baseRouter };
