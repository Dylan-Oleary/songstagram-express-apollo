import express, { Request, Response, NextFunction } from "express";

import { DB_CONNECTION } from "../config/constants";
import { AuthenticationService } from "../services";

const baseRouter = express.Router({ caseSensitive: true });

baseRouter.route("/login").post((req: Request, res: Response, next: NextFunction) => {
    const dbConnection = req.app.get(DB_CONNECTION);
    const authenticationService = new AuthenticationService(dbConnection);

    return authenticationService
        .authenticateUser(req.body.email, req.body.password)
        .then((response) => res.status(200).json(response))
        .catch(next);
});

export default baseRouter;
export { baseRouter };
