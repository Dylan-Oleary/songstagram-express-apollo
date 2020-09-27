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
}

export interface ICreateUserValues {
    firstName: string;
    lastName: string;
    username: string;
    email: string;
    password: string;
    confirmPassword: string;
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

export const baseUserValidation = {
    [IUserFormKeys.FirstName]: {
        isRequired: true,
        label: IUserFormLabels.FirstName,
        check: (value: string) => {
            if (value.length > 255)
                return new Error(`${IUserFormLabels.FirstName} cannot be more than 255 characters`);

            return undefined;
        }
    },
    [IUserFormKeys.LastName]: {
        isRequired: true,
        label: IUserFormLabels.LastName,
        check: (value: string) => {
            if (value.length > 255)
                return new Error(`${IUserFormLabels.LastName} cannot be more than 255 characters`);

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
        isRequired: true,
        label: IUserFormLabels.Username,
        check: (value: string) => {
            if (value.length > 30)
                return new Error(`${IUserFormLabels.Username} cannot be more than 30 characters`);
            if (!new RegExp(usernameRegExpValue).test(value))
                return new Error(`${IUserFormLabels.Username} is invalid`);

            return undefined;
        }
    },
    [IUserFormKeys.Email]: {
        isRequired: true,
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
     * @param user User information used to create a new user
     */
    async createUser(userSubmission: ICreateUserValues): Promise<IUser> {
        const createUserValidation = {
            ...baseUserValidation,
            [IUserFormKeys.Password]: {
                isRequired: true,
                label: IUserFormLabels.Password,
                check: (value: string) => {
                    if (value.length > 50)
                        return new Error(
                            `${IUserFormLabels.Password} cannot be more than 50 characters`
                        );
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

        try {
            const submissionErrors = validateSubmission(createUserValidation, userSubmission);

            if (submissionErrors) throw submissionErrors;

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
                });
        } catch (error) {
            throw error;
        }
    }

    /**
     * Fetches a user record by using `userNo` as a lookup parameter
     * @param userNo The user number used to look for the correct user
     */
    getUserByUserNo(userNo: number): Promise<IUser> {
        return this.dbConnection(this.table)
            .first("*")
            .where(this.pk, userNo)
            .then((record) => {
                if (!record)
                    throw {
                        statusCode: 404,
                        message: `A user with a ${this.pk} of ${userNo} could not be found`
                    };

                delete record.password;

                return record;
            });
    }

    /**
     * Hashes a plain text password
     * @param password Plain text password to hash
     */
    private hashPassword(password: string): Promise<string> {
        return bcrypt.hash(password, BCRYPT_HASH_SALT_ROUNDS);
    }
}

export default UserService;
export { UserService };
