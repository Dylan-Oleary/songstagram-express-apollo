import bcrypt from "bcrypt";
import { Request } from "express";
import jwt from "jsonwebtoken";
import knex from "knex";

import { IUserRecord, UserService } from "./User";

export interface IAuthenticationResponse {
    user: IUserRecord;
    accessToken: string;
}

export interface IUserAccessTokenValues {
    userNo: number;
    email: string;
    isDeleted: boolean;
    isBanned: boolean;
}

class AuthenticationService {
    private dbConnection: knex;
    private hashSaltRounds = 10;

    constructor(dbConnection: knex) {
        this.dbConnection = dbConnection;
    }

    /**
     * Authenticates the access token attached to the request
     *
     * @param req The request object
     */
    public authenticateAccessToken(req: Request): Promise<IUserAccessTokenValues> {
        return new Promise((resolve, reject) => {
            const authHeader = req.headers["authorization"];
            const token = authHeader?.split(" ")[1];

            if (!token) {
                reject({
                    statusCode: 401,
                    message: "Invalid Credentials",
                    details: ["No access token provided"]
                });
            } else {
                jwt.verify(token, String(process.env.ACCESS_TOKEN_SECRET), (err, user) => {
                    if (err) {
                        reject({
                            statusCode: 403,
                            message: "Forbidden",
                            details: ["Token is no longer valid"]
                        });
                    }

                    resolve(user as IUserAccessTokenValues);
                });
            }
        });
    }

    /**
     * Authenticates a user against the system
     *
     * @param email The user email
     * @param password The user password
     */
    public authenticateUser(
        email: string = "",
        password: string = ""
    ): Promise<IAuthenticationResponse> {
        const userService = new UserService(this.dbConnection);

        return userService.getUserByEmail(email).then((user) => {
            return this.dbConnection(userService.table)
                .first("*")
                .where({ [userService.pk]: user[userService.pk] })
                .then((fullUser: IUserRecord) => {
                    return this.comparePasswords(password, String(fullUser.password)).then(() => {
                        const accessToken = this.generateAccessToken({
                            userNo: user.userNo,
                            email: user.email,
                            isDeleted: user.isDeleted,
                            isBanned: user.isBanned
                        });

                        return {
                            user,
                            accessToken
                        };
                    });
                });
        });
    }

    /**
     * Confirms a match between a plain text password and an encrypted password
     *
     * @param password A password to compare against the encrypted password
     * @param encryptedPassword The user's encrypted password
     */
    public comparePasswords(password: string, encryptedPassword: string): Promise<boolean> {
        return new Promise((resolve, reject) => {
            return bcrypt.compare(password, encryptedPassword, (error, isMatch) => {
                if (error) {
                    return reject({
                        statusCode: 500,
                        message: error.message || "Internal Server Error"
                    });
                }

                return isMatch
                    ? resolve(true)
                    : reject({
                          statusCode: 401,
                          message: "Invalid Credentials",
                          details: ["Passwords do not match"]
                      });
            });
        });
    }

    /**
     * Generates an access token with the correct user information
     *
     * @param user User information to be stored in the token
     */
    private generateAccessToken(user: IUserAccessTokenValues): string {
        return jwt.sign(user, String(process.env.ACCESS_TOKEN_SECRET), {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN
                ? String(process.env.ACCESS_TOKEN_EXPIRES_IN)
                : "1m"
        });
    }

    /**
     * Hashes a plain text password
     *
     * @param password Plain text password to hash
     */
    public hashPassword(password: string): Promise<string> {
        return bcrypt.hash(password, this.hashSaltRounds);
    }
}

export default AuthenticationService;
export { AuthenticationService };
