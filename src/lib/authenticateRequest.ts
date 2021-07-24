import { Request, Response, NextFunction } from "express";

import { DB_CONNECTION } from "../config/constants";
import { AuthenticationService, IUserAccessTokenValues } from "../services";

/**
 * Authenticates the current request's access token and passes along the request, or rejects the request
 *
 * @param req The request object
 * @param res The response object
 * @param next The next function
 */
const authenticateRequest: (req: Request, res: Response, next: NextFunction) => void = (
    req,
    res,
    next
) => {
    const authenticationService = new AuthenticationService(req.app.get(DB_CONNECTION));

    return authenticationService
        .authenticateAccessToken(req)
        .then((user) => {
            req.user = user;

            next();
        })
        .catch(next);
};

/**
 * Verifies that the user number used in data submission matches the user stored in the access token
 *
 * @param user The decoded user stored in the access token
 * @param submissionUserNo The user number attached to the submission
 */
const authenticateUserSubmission: (
    user: IUserAccessTokenValues,
    submissionUserNo: number
) => Promise<void> = (user, submissionUserNo) => {
    return new Promise((resolve, reject) => {
        if (!user) {
            return reject({
                statusCode: 401,
                message: "Unauthorized",
                details: ["Invalid credentials"]
            });
        }

        if (
            !submissionUserNo ||
            String(user?.userNo) !== String(submissionUserNo) ||
            user.isBanned ||
            user.isDeleted
        ) {
            return reject({
                statusCode: 403,
                message: "Forbidden",
                details: ["You do not have permission to perform this action"]
            });
        }

        return resolve();
    });
};

export default authenticateRequest;
export { authenticateRequest, authenticateUserSubmission };
