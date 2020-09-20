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

export const emailAddressRegExpValue = new RegExp(
    "^[a-z][a-z0-9-_.+]{2,}[a-z0-9]@[a-z0-9-_.]{1,}.[a-z]{2,8}$",
    "i"
);
export const usernameValidation = new RegExp("^(?!.*..)(?!.*.$)[^W][w.]{0,29}$", "ig");

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
            if (!usernameValidation.test(value))
                return new Error(`${IUserFormLabels.Username} is invalid`);

            return undefined;
        }
    },
    [IUserFormKeys.Email]: {
        isRequired: true,
        label: IUserFormLabels.Email,
        check: (value: string) => {
            if (!emailAddressRegExpValue.test(value))
                return new Error(`${IUserFormLabels.Email} is invalid`);
            if (value.length > 255)
                return new Error(`${IUserFormLabels.Email} cannot be more than 255 characters`);

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
    private readonly table = "users";

    constructor(dbConnection: knex) {
        this.dbConnection = dbConnection;
    }

    /**
     * Creates a new user
     * @param user User information used to create a new user
     */
    async createUser(userSubmission: ICreateUserValues): Promise<any> {
        const createUserValidation = {
            ...baseUserValidation,
            [IUserFormKeys.Password]: {
                isRequired: true,
                label: IUserFormLabels.Password,
                check: (value: string) => {
                    if (value.length > 50)
                        return new Error(
                            `${IUserFormLabels.Password} must be less than 50 characters`
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
        const submissionErrors = validateSubmission(createUserValidation, userSubmission);

        if (submissionErrors) throw submissionErrors;

        try {
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
                .then((user) => {
                    console.log(user);
                    return user;
                });
        } catch (error) {
            throw error;
        }
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
