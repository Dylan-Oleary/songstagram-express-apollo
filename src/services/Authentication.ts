import bcrypt from "bcrypt";
import { Request } from "express";
import { Redis } from "ioredis";
import jwt from "jsonwebtoken";
import knex from "knex";
import ms from "ms";

import { IUserColumnKeys, IUserRecord, UserService } from "./User";

export interface IAuthenticationResponse {
    user: IUserRecord;
    accessToken: string;
    refreshToken: string;
}

export interface IUserRefreshTokenValues {
    userNo: number;
    email: string;
}

export interface IUserAccessTokenValues extends IUserRefreshTokenValues {
    isDeleted: boolean;
    isBanned: boolean;
}

/**
 * Authentication service
 */
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
            const authHeader = req?.headers["authorization"];
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
     * Authenticates the refresh token against the refresh token secret and the passed user number
     *
     * @param token The refresh token
     * @param userNo The user number of the user making the request
     * @param redis An instance of redis
     */
    public authenticateRefreshToken(
        token: string,
        userNo: number,
        redis: Redis
    ): Promise<IUserRefreshTokenValues> {
        return new Promise((resolve, reject) => {
            jwt.verify(token, String(process.env.REFRESH_TOKEN_SECRET), async (err, user) => {
                if (err) {
                    await redis.del(this.generateRedisCacheKey(userNo)).catch(reject);

                    reject({
                        statusCode: 403,
                        message: "Forbidden",
                        details: ["Token is no longer valid"]
                    });
                } else {
                    const refreshToken = { ...user } as IUserRefreshTokenValues;

                    if (Number(refreshToken.userNo) !== Number(userNo)) {
                        reject({
                            statusCode: 403,
                            message: "Forbidden",
                            details: ["Token is invalid"]
                        });
                    }

                    resolve({
                        userNo: Number(refreshToken.userNo),
                        email: refreshToken.email
                    });
                }
            });
        });
    }

    /**
     * Authenticates a user against the system
     *
     * @param email The user email
     * @param password The user password
     * @param redis The redis cache store
     */
    public authenticateUser(
        email: string = "",
        password: string = "",
        redis: Redis
    ): Promise<IAuthenticationResponse> {
        const userService = new UserService(this.dbConnection);

        return userService.getUserByEmail(email).then((user) => {
            [IUserColumnKeys.IsBanned, IUserColumnKeys.IsDeleted].forEach((key) => {
                //@ts-ignore
                if (user[key]) {
                    throw {
                        statusCode: 403,
                        message: "Forbidden",
                        details: [`User is forbidden. Reason: ${key}`]
                    };
                }
            });

            return this.dbConnection(userService.table)
                .first("*")
                .where({ [userService.pk]: user[userService.pk] })
                .then((fullUser: IUserRecord) => {
                    return this.comparePasswords(password, String(fullUser.password)).then(() => {
                        return userService.updateLastLoginDate(user.userNo).then((userRecord) => {
                            const accessToken = this.generateAccessToken({
                                userNo: userRecord.userNo,
                                email: userRecord.email,
                                isDeleted: userRecord.isDeleted,
                                isBanned: userRecord.isBanned
                            });
                            const refreshToken = this.generateRefreshToken({
                                userNo: userRecord.userNo,
                                email: userRecord.email
                            });

                            redis.set(
                                this.generateRedisCacheKey(userRecord.userNo),
                                refreshToken,
                                "px",
                                ms(
                                    process.env.REFRESH_TOKEN_EXPIRES_IN
                                        ? String(process.env.REFRESH_TOKEN_EXPIRES_IN)
                                        : "90 days"
                                )
                            );

                            return {
                                user: userRecord,
                                accessToken,
                                refreshToken
                            };
                        });
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
     * Generates a cache key used for redis token storage
     *
     * @param userNo The user number of the user to cache
     */
    private generateRedisCacheKey(userNo: number): string {
        return `${userNo}-token`;
    }

    /**
     * Generates a refresh token with the correct user information
     *
     * @param user User information to be stored in the token
     */
    private generateRefreshToken(user: IUserRefreshTokenValues): string {
        return jwt.sign(user, String(process.env.REFRESH_TOKEN_SECRET), {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN
                ? String(process.env.REFRESH_TOKEN_EXPIRES_IN)
                : "90 days"
        });
    }

    /**
     * Returns a valid access token
     *
     * @param userNo the user number of the user making the request
     * @param token A refresh token
     * @param redis The redis cache store
     */
    public getNewAccessToken(userNo: number, token: string, redis: Redis): Promise<string> {
        return new UserService(this.dbConnection).getUser(Number(userNo)).then((user) => {
            [IUserColumnKeys.IsBanned, IUserColumnKeys.IsDeleted].forEach((key) => {
                //@ts-ignore
                if (user[key]) {
                    throw {
                        statusCode: 403,
                        message: "Forbidden",
                        details: [`User is forbidden. Reason: ${key}`]
                    };
                }
            });

            return this.validateRefreshToken(userNo, token, redis).then(() => {
                return this.generateAccessToken({
                    userNo: user.userNo,
                    email: user.email,
                    isDeleted: user.isDeleted,
                    isBanned: user.isBanned
                });
            });
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

    /**
     * Logs the user out & removes the passed refresh token from the Redis cache
     *
     * @param userNo The user number of the user to log out
     * @param token The refresh token to clear from Redis
     * @param redis The redis cache store
     */
    public logoutUser(userNo: number, token: string, redis: Redis): Promise<void> {
        return this.validateRefreshToken(Number(userNo), token, redis).then(() =>
            redis.del(this.generateRedisCacheKey(userNo)).then(() => {})
        );
    }

    /**
     * Validates a refresh token by authenticating against the user, Redis, & the token secret
     *
     * @param userNo The user number of the user making the request
     * @param token The refresh token to validate
     * @param redis The redis cache store
     */
    private validateRefreshToken(userNo: number, token: string, redis: Redis): Promise<string> {
        return new Promise((resolve, reject) => {
            return this.authenticateRefreshToken(token, userNo, redis)
                .then(() => {
                    redis.get(this.generateRedisCacheKey(userNo), (err, refreshToken) => {
                        if (err || !refreshToken || refreshToken !== token) {
                            reject({
                                statusCode: 403,
                                message: "Forbidden",
                                details: ["Refresh token could not be verified"]
                            });
                        }

                        resolve(String(refreshToken));
                    });
                })
                .catch(reject);
        });
    }
}

export default AuthenticationService;
export { AuthenticationService };
