import bcrypt from "bcrypt";
import { Request } from "express";
import { Redis } from "ioredis";
import jwt from "jsonwebtoken";
import knex from "knex";
import ms from "ms";

import { IUserColumnKeys, IUserRecord, UserService } from "./User";
import { UserPreferenceService } from "./UserPreference";

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

export interface ITokenSet {
    accessToken: string;
    refreshToken: string;
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
            const token = req?.headers["authorization"];

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
     */
    public authenticateRefreshToken(token: string): Promise<IUserRefreshTokenValues> {
        return new Promise((resolve, reject) => {
            jwt.verify(token, String(process.env.REFRESH_TOKEN_SECRET), async (err, user) => {
                if (err) {
                    reject({
                        statusCode: 403,
                        message: "Forbidden",
                        details: ["Token is no longer valid"]
                    });
                } else {
                    const refreshToken = { ...user } as IUserRefreshTokenValues;

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
        const userPreferenceService = new UserPreferenceService(this.dbConnection);

        return userService.getUserByEmail(email).then((user) => {
            return this.dbConnection(userService.table)
                .first("*")
                .where({ [userService.pk]: user[userService.pk] })
                .then((fullUser: IUserRecord) => {
                    return this.comparePasswords(password, String(fullUser.password)).then(() => {
                        return Promise.all([
                            userService.updateLastLoginDate(user.userNo),
                            userPreferenceService.getUserPreference(user.userNo)
                        ])
                            .then(([user, preferences]) => ({ ...user, preferences }))
                            .then((userRecord) => {
                                return this.generateTokenSet(userRecord, redis).then(
                                    ({ accessToken, refreshToken }) => {
                                        return {
                                            user: userRecord,
                                            accessToken,
                                            refreshToken
                                        };
                                    }
                                );
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
                : "15m"
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
     * Generates a new token set
     *
     * @param user A user record
     * @param redis An instance of Redis
     * @returns A new access and refresh token
     */
    private generateTokenSet(user: IUserRecord, redis: Redis): Promise<ITokenSet> {
        const refreshToken = this.generateRefreshToken({
            userNo: user.userNo,
            email: user.email
        });
        const accessToken = this.generateAccessToken({
            userNo: user.userNo,
            email: user.email,
            isDeleted: user.isDeleted,
            isBanned: user.isBanned
        });

        return redis
            .set(
                this.generateRedisCacheKey(user.userNo),
                refreshToken,
                "px",
                ms(
                    process.env.REFRESH_TOKEN_EXPIRES_IN
                        ? String(process.env.REFRESH_TOKEN_EXPIRES_IN)
                        : "90 days"
                )
            )
            .then(() => ({
                accessToken,
                refreshToken
            }));
    }

    /**
     * Returns a new token set
     *
     * @param token A refresh token
     * @param redis The redis cache store
     */
    public getNewTokenSet(token: string, redis: Redis): Promise<ITokenSet> {
        return this.validateRefreshToken(token, redis).then(({ userNo }) => {
            return new UserService(this.dbConnection).getUser(userNo).then((user) => {
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

                return this.generateTokenSet(user, redis);
            });
        });
    }

    /**
     * Returns a new access token
     *
     * @param refreshToken A refresh token
     * @param redis The redis cache store
     * @returns A new access token
     */
    public getNewAccessToken(refreshToken: string, redis: Redis): Promise<string> {
        return this.validateRefreshToken(refreshToken, redis).then(({ userNo }) => {
            return new UserService(this.dbConnection).getUser(userNo).then((user) => {
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
     * @param token The refresh token to clear from Redis
     * @param redis The redis cache store
     */
    public logoutUser(token: string, redis: Redis): Promise<void> {
        return this.validateRefreshToken(token, redis).then(({ userNo }) =>
            redis.del(this.generateRedisCacheKey(userNo)).then(() => {})
        );
    }

    /**
     * Validates a refresh token by authenticating against the user, Redis, & the token secret
     *
     * @param token The refresh token to validate
     * @param redis The redis cache store
     */
    private validateRefreshToken(
        token: string,
        redis: Redis
    ): Promise<{
        refreshToken: string;
        userNo: number;
    }> {
        return new Promise((resolve, reject) => {
            return this.authenticateRefreshToken(token)
                .then(({ userNo }) => {
                    redis.get(this.generateRedisCacheKey(userNo), (err, refreshToken) => {
                        if (err || !refreshToken || refreshToken !== token) {
                            reject({
                                statusCode: 403,
                                message: "Forbidden",
                                details: ["Refresh token could not be verified"]
                            });
                        }

                        resolve({
                            refreshToken: String(refreshToken),
                            userNo
                        });
                    });
                })
                .catch(reject);
        });
    }
}

export default AuthenticationService;
export { AuthenticationService };
