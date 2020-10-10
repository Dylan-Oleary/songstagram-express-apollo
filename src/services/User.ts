//@ts-nocheck

import bcrypt from "bcrypt";
import knex from "knex";

import {
    IFormSubmission,
    IFormValidationObject,
    validateSubmission
} from "../lib/validateSubmission";

export interface IUser {
    userNo: number;
    firstName: string;
    lastName: string;
    bio: string;
    username: string;
    email: string;
    profilePicture: string;
    postCount: number;
    followerCount: number;
    followingCount: number;
    isDeleted: boolean;
    isBanned: boolean;
    createdDate: Date;
    lastUpdated: Date;
    lastLoginDate?: Date;
    password?: string;
}

export interface ICreateUserValues {
    firstName: string;
    lastName: string;
    username: string;
    email: string;
    password: string;
    confirmPassword: string;
}

export interface IUpdateUserValues {
    firstName?: string;
    lastName?: string;
    username?: string;
    email?: string;
    bio?: string;
    profilePicture?: string;
}

export interface IUpdatePasswordValues {
    currentPassword: string;
    newPassword: string;
    confirmNewPassword: string;
}

export enum IUserFormKeys {
    FirstName = "firstName",
    LastName = "lastName",
    Bio = "bio",
    Username = "username",
    Email = "email",
    Password = "password",
    ConfirmPassword = "confirmPassword",
    ProfilePicture = "profilePicture"
}

export enum IUserFormLabels {
    FirstName = "First Name",
    LastName = "Last Name",
    Bio = "Bio",
    Username = "Username",
    Email = "Email",
    Password = "Password",
    ConfirmPassword = "Confirm Password",
    ProfilePicture = "Profile Picture"
}

export const emailAddressRegExpValue = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
export const usernameRegExpValue = /^([A-Za-z0-9_](?:(?:[A-Za-z0-9_]|(?:.(?!.))){0,28}(?:[A-Za-z0-9_]))?)$/;

/**
 * Builds a user validation object used to validate submissions for creating and updating a user
 * @param required Set the base user fields to be required
 */
export const baseUserValidation: (required: boolean) => IFormValidationObject = (required = true) =>
    ({
        [IUserFormKeys.FirstName]: {
            isRequired: required,
            label: IUserFormLabels.FirstName,
            check: (value: string) => {
                if (value.length > 255)
                    return new Error(
                        `${IUserFormLabels.FirstName} cannot be more than 255 characters`
                    );

                return undefined;
            }
        },
        [IUserFormKeys.LastName]: {
            isRequired: required,
            label: IUserFormLabels.LastName,
            check: (value: string) => {
                if (value.length > 255)
                    return new Error(
                        `${IUserFormLabels.LastName} cannot be more than 255 characters`
                    );

                return undefined;
            }
        },
        [IUserFormKeys.Bio]: {
            isRequired: false,
            label: IUserFormLabels.Bio,
            check: (value: string) => {
                if (value.length > 150)
                    return new Error(`${IUserFormLabels.Bio} cannot be more than 150 characters`);

                return undefined;
            }
        },
        [IUserFormKeys.Username]: {
            isRequired: required,
            label: IUserFormLabels.Username,
            check: (value: string) => {
                if (value.length > 30)
                    return new Error(
                        `${IUserFormLabels.Username} cannot be more than 30 characters`
                    );
                if (!new RegExp(usernameRegExpValue).test(value))
                    return new Error(`${IUserFormLabels.Username} is invalid`);

                return undefined;
            }
        },
        [IUserFormKeys.Email]: {
            isRequired: required,
            label: IUserFormLabels.Email,
            check: (value: string) => {
                if (value.length > 255)
                    return new Error(`${IUserFormLabels.Email} cannot be more than 255 characters`);
                if (!new RegExp(emailAddressRegExpValue, "i").test(value))
                    return new Error(`${IUserFormLabels.Email} is invalid`);

                return undefined;
            }
        },
        [IUserFormKeys.ProfilePicture]: {
            isRequired: false,
            label: IUserFormLabels.ProfilePicture,
            check: (value: string) => {
                if (value.length > 255)
                    return new Error(`${IUserFormLabels.ProfilePicture} is invalid`);

                return undefined;
            }
        }
    } as IFormValidationObject);

const passwordValidation = {
    [IUserFormKeys.Password]: {
        isRequired: true,
        label: IUserFormLabels.Password,
        check: (value: string) => {
            if (value.length > 50)
                return new Error(`${IUserFormLabels.Password} cannot be more than 50 characters`);
            return undefined;
        }
    },
    [IUserFormKeys.ConfirmPassword]: {
        isRequired: true,
        label: IUserFormLabels.ConfirmPassword,
        check: (value: string, submission: IFormSubmission) => {
            if (value !== submission[IUserFormKeys.Password])
                return new Error("Passwords must match");

            return undefined;
        }
    }
} as IFormValidationObject;

const BCRYPT_HASH_SALT_ROUNDS = 10;

/**
 * Service used to manage users
 * @param dbConnection Knex connection used to read/write to the database
 */
class UserService {
    private dbConnection: knex;
    private readonly pk = "userNo";
    private readonly table = "users";

    constructor(dbConnection: knex) {
        this.dbConnection = dbConnection;
    }

    /**
     * Creates a new user
     * @param userSubmission User information used to create a new user
     */
    async createUser(userSubmission: ICreateUserValues): Promise<IUser> {
        const createUserValidation: IFormValidationObject = {
            ...baseUserValidation(true),
            ...passwordValidation
        };

        const submissionErrors = validateSubmission(createUserValidation, userSubmission);

        if (submissionErrors) return Promise.reject(submissionErrors);

        const hashedPassword = await this.hashPassword(userSubmission.password);
        const newUser = {
            firstName: userSubmission.firstName.trim(),
            lastName: userSubmission.lastName.trim(),
            username: userSubmission.username.trim(),
            email: userSubmission.email.trim(),
            password: hashedPassword
        };

        return this.dbConnection(this.table)
            .insert(newUser)
            .then((record) => {
                return this.getUserByUserNo(record[0]);
            })
            .catch((error) => {
                if (new RegExp("(UNIQUE constraint|Duplicate entry)", "i").test(error.message)) {
                    if (
                        new RegExp(`(UNIQUE constraint failed: ${this.table}.email)`, "i").test(
                            error.message
                        )
                    ) {
                        return Promise.reject({
                            statusCode: 409,
                            message: "Conflict Error",
                            details: [`${IUserFormLabels.Email} is already in use`]
                        });
                    }

                    if (
                        new RegExp(`(UNIQUE constraint failed: ${this.table}.username)`, "i").test(
                            error.message
                        )
                    ) {
                        return Promise.reject({
                            statusCode: 409,
                            message: "Conflict Error",
                            details: [`${IUserFormLabels.Username} is already in use`]
                        });
                    }
                }

                return Promise.reject({
                    statusCode: error.statusCode || 500,
                    message: error.message || "Internal Server Error",
                    details: error.details || []
                });
            });
    }

    /**
     * Updates a user record
     * @param userNo The user number used to look for the correct user
     * @param submission User information used to update a user record
     */
    updateUser(userNo: number, submission: IUpdateUserValues): Promise<IUser> {
        const updateUserValidation: IFormValidationObject = baseUserValidation(false);
        const submissionErrors = validateSubmission(updateUserValidation, submission);
        let cleanSubmission: IUpdateUserValues = {};

        if (submissionErrors) return Promise.reject(submissionErrors);

        Object.keys(submission).forEach((key) => {
            if (submission[key]) {
                cleanSubmission[key] = submission[key].trim();
            }
        });

        return this.dbConnection(this.table)
            .update(cleanSubmission)
            .where(this.pk, userNo)
            .then(() => {
                return this.getUserByUserNo(userNo);
            })
            .catch((error) => {
                if (new RegExp("(UNIQUE constraint|Duplicate entry)", "i").test(error.message)) {
                    if (
                        new RegExp(`(UNIQUE constraint failed: ${this.table}.email)`, "i").test(
                            error.message
                        )
                    ) {
                        return Promise.reject({
                            statusCode: 409,
                            message: "Conflict Error",
                            details: [`${IUserFormLabels.Email} is already in use`]
                        });
                    }

                    if (
                        new RegExp(`(UNIQUE constraint failed: ${this.table}.username)`, "i").test(
                            error.message
                        )
                    ) {
                        return Promise.reject({
                            statusCode: 409,
                            message: "Conflict Error",
                            details: [`${IUserFormLabels.Username} is already in use`]
                        });
                    }
                }

                return Promise.reject({
                    statusCode: error.statusCode || 500,
                    message: error.message || "Internal Server Error",
                    details: error.details || []
                });
            });
    }

    /**
     * Performs a soft delete on a user record
     * @param userNo The user number used to look for the correct user
     */
    deleteUser(userNo: number): Promise<boolean> {
        if (!userNo || typeof userNo !== "number") {
            return Promise.reject({
                statusCode: 400,
                message: "Bad Request",
                details: ["Parameter Error: userNo must be a number"]
            });
        }

        return this.getUserByUserNo(userNo).then((userRecord: IUser) => {
            return this.dbConnection(this.table)
                .update({ isDeleted: true })
                .where(this.pk, userRecord.userNo)
                .then(() => true);
        });
    }

    /**
     * Fetches a user record by using `userNo` as a lookup parameter
     * @param userNo The user number used to look for the correct user
     */
    getUserByUserNo(userNo: number): Promise<IUser> {
        if (!userNo || typeof userNo !== "number") {
            return Promise.reject({
                statusCode: 400,
                message: "Bad Request",
                details: ["Parameter Error: userNo must be a number"]
            });
        }

        return this.dbConnection(this.table)
            .first("*")
            .where(this.pk, userNo)
            .then((record) => {
                if (!record)
                    throw {
                        statusCode: 404,
                        message: "Not Found",
                        details: [`User with a ${this.pk} of ${userNo} could not be found`]
                    };

                delete record.password;

                return record;
            });
    }

    /**
     * Update a user's password
     * @param userNo The user number used to look for the correct user
     * @param submission An object containing the user's current and new password information
     */
    updatePassword(userNo: number, submission: IUpdatePasswordValues): Promise<IUser> {
        const { currentPassword, newPassword, confirmNewPassword } = submission;

        if (!userNo || typeof userNo !== "number") {
            return Promise.reject({
                statusCode: 400,
                message: "Bad Request",
                details: ["Parameter Error: userNo must be a number"]
            });
        }

        if (newPassword !== confirmNewPassword) {
            return Promise.reject({
                statusCode: 422,
                message: "Validation Error",
                details: ["Passwords must match"]
            });
        }

        return this.dbConnection(this.table)
            .first("*")
            .where(this.pk, userNo)
            .then((userRecord) => {
                if (!userRecord)
                    throw {
                        statusCode: 404,
                        message: "Not Found",
                        details: [`User with a ${this.pk} of ${userNo} could not be found`]
                    };

                return this.comparePasswords(currentPassword, userRecord.password!).then(
                    async () => {
                        const hashedPassword = await this.hashPassword(newPassword);

                        return this.dbConnection(this.table)
                            .first("*")
                            .where(this.pk, userNo)
                            .update({ password: hashedPassword });
                    }
                );
            });
    }

    /**
     * Hashes a plain text password
     * @param password Plain text password to hash
     */
    private hashPassword(password: string): Promise<string> {
        return bcrypt.hash(password, BCRYPT_HASH_SALT_ROUNDS);
    }

    /**
     * Confirms a match between a plain text password and an encrypted password
     * @param password A password to compare against the encrypted password
     * @param encryptedPassword The user's encrypted password
     */
    private comparePasswords(password: string, encryptedPassword: string): Promise<boolean> {
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
                          details: ["Password does not match hashed password"]
                      });
            });
        });
    }
}

export default UserService;
export { UserService };
