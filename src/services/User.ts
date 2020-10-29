import bcrypt from "bcrypt";
import extend from "extend";
import knex from "knex";

import {
    BaseService,
    FilterCondition,
    IColumnDefinition,
    IListQueryOptions,
    IPagination
} from "./Base";
import { IFormValidation, validateSubmission } from "../lib/validateSubmission";

export interface IUserRecord {
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

export interface IUserListRecord {
    data: IUserRecord[];
    pagination: IPagination;
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

export enum IUserColumnKeys {
    UserNo = "userNo",
    FirstName = "firstName",
    LastName = "lastName",
    Bio = "bio",
    Username = "username",
    Email = "email",
    Password = "password",
    ConfirmPassword = "confirmPassword",
    ProfilePicture = "profilePicture",
    PostCount = "postCount",
    FollowerCount = "followerCount",
    FollowingCount = "followingCount",
    IsBanned = "isBanned",
    IsDeleted = "isDeleted",
    CreatedDate = "createdDate",
    LastUpdated = "lastUpdated",
    LastLoginDate = "lastLoginDate"
}

export enum IUserColumnLabels {
    UserNo = "User Number",
    FirstName = "First Name",
    LastName = "Last Name",
    Bio = "Bio",
    Username = "Username",
    Email = "Email",
    Password = "Password",
    ConfirmPassword = "Confirm Password",
    ProfilePicture = "Profile Picture",
    PostCount = "Post Count",
    FollowerCount = "Follower Count",
    FollowingCount = "Following Count",
    IsBanned = "Is Banned",
    IsDeleted = "Is Deleted",
    CreatedDate = "Created Date",
    LastUpdated = "Last Updated",
    LastLoginDate = "Last Login Date"
}

export interface IUserColumnDefinition extends IColumnDefinition {
    key: IUserColumnKeys;
    label: IUserColumnLabels;
}

export const emailAddressRegExpValue = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
export const usernameRegExpValue = /^([A-Za-z0-9_](?:(?:[A-Za-z0-9_]|(?:.(?!.))){0,28}(?:[A-Za-z0-9_]))?)$/;

const BCRYPT_HASH_SALT_ROUNDS = 10;

/**
 * Service used to manage users
 *
 * @param dbConnection Knex connection used to read/write to the database
 */
class UserService extends BaseService {
    private readonly pk = "userNo";
    private readonly table = "users";
    private readonly tableColumns: IUserColumnDefinition[] = [
        {
            key: IUserColumnKeys.UserNo,
            isSelectable: true,
            isSearchable: false,
            isSortable: true,
            filterOptions: {
                validConditions: [
                    FilterCondition.Equal,
                    FilterCondition.GreaterThan,
                    FilterCondition.GreaterThanOrEqual,
                    FilterCondition.LessThan,
                    FilterCondition.LessThanOrEqual
                ]
            },
            isRequiredOnCreate: false,
            canEdit: false,
            label: IUserColumnLabels.UserNo
        },
        {
            key: IUserColumnKeys.FirstName,
            isSelectable: true,
            isSearchable: true,
            isSortable: true,
            filterOptions: {
                validConditions: [FilterCondition.Equal]
            },
            isRequiredOnCreate: true,
            canEdit: true,
            label: IUserColumnLabels.FirstName,
            check: (value) => {
                if (value.length > 255)
                    return new Error(
                        `${IUserColumnLabels.FirstName} cannot be more than 255 characters`
                    );

                return undefined;
            }
        },
        {
            key: IUserColumnKeys.LastName,
            isSelectable: true,
            isSearchable: false,
            isSortable: true,
            filterOptions: {
                validConditions: [FilterCondition.Equal]
            },
            isRequiredOnCreate: true,
            canEdit: true,
            label: IUserColumnLabels.LastName,
            check: (value) => {
                if (value.length > 255)
                    return new Error(
                        `${IUserColumnLabels.LastName} cannot be more than 255 characters`
                    );

                return undefined;
            }
        },
        {
            key: IUserColumnKeys.Username,
            isSelectable: true,
            isSearchable: true,
            isSortable: true,
            filterOptions: {
                validConditions: [FilterCondition.Equal]
            },
            isRequiredOnCreate: true,
            canEdit: true,
            label: IUserColumnLabels.Username,
            check: (value) => {
                if (value.length > 30)
                    return new Error(
                        `${IUserColumnLabels.Username} cannot be more than 30 characters`
                    );
                if (!new RegExp(usernameRegExpValue).test(value))
                    return new Error(`${IUserColumnLabels.Username} is invalid`);

                return undefined;
            }
        },
        {
            key: IUserColumnKeys.Email,
            isSelectable: true,
            isSearchable: false,
            isSortable: true,
            filterOptions: {
                validConditions: [FilterCondition.Equal]
            },
            isRequiredOnCreate: true,
            canEdit: true,
            label: IUserColumnLabels.Email,
            check: (value) => {
                if (value.length > 255)
                    return new Error(
                        `${IUserColumnLabels.Email} cannot be more than 255 characters`
                    );
                if (!new RegExp(emailAddressRegExpValue, "i").test(value))
                    return new Error(`${IUserColumnLabels.Email} is invalid`);

                return undefined;
            }
        },
        {
            key: IUserColumnKeys.Password,
            isSelectable: false,
            isSearchable: false,
            isSortable: false,
            isRequiredOnCreate: true,
            canEdit: false,
            label: IUserColumnLabels.Password,
            check: (value) => {
                if (value.length > 50)
                    return new Error(
                        `${IUserColumnLabels.Password} cannot be more than 50 characters`
                    );
                return undefined;
            }
        },
        {
            key: IUserColumnKeys.ConfirmPassword,
            isSelectable: false,
            isSearchable: false,
            isSortable: false,
            isRequiredOnCreate: true,
            canEdit: false,
            label: IUserColumnLabels.ConfirmPassword,
            check: (value, submission) => {
                if (value !== submission![IUserColumnKeys.Password])
                    return new Error("Passwords must match");

                return undefined;
            }
        },
        {
            key: IUserColumnKeys.Bio,
            isSelectable: true,
            isSearchable: false,
            isSortable: false,
            isRequiredOnCreate: false,
            canEdit: true,
            label: IUserColumnLabels.Bio,
            check: (value) => {
                if (value.length > 150)
                    return new Error(`${IUserColumnLabels.Bio} cannot be more than 150 characters`);

                return undefined;
            }
        },
        {
            key: IUserColumnKeys.ProfilePicture,
            isSelectable: true,
            isSearchable: false,
            isSortable: false,
            isRequiredOnCreate: false,
            canEdit: true,
            label: IUserColumnLabels.ProfilePicture,
            check: (value) => {
                if (value.length > 255)
                    return new Error(
                        `${IUserColumnLabels.ProfilePicture} cannot be more than 255 characters`
                    );

                return undefined;
            }
        },
        {
            key: IUserColumnKeys.PostCount,
            isSelectable: true,
            isSearchable: false,
            isSortable: true,
            filterOptions: {
                validConditions: [
                    FilterCondition.Equal,
                    FilterCondition.GreaterThan,
                    FilterCondition.GreaterThanOrEqual,
                    FilterCondition.LessThan,
                    FilterCondition.LessThanOrEqual
                ]
            },
            isRequiredOnCreate: false,
            canEdit: false,
            label: IUserColumnLabels.PostCount
        },
        {
            key: IUserColumnKeys.FollowerCount,
            isSelectable: true,
            isSearchable: false,
            isSortable: true,
            filterOptions: {
                validConditions: [
                    FilterCondition.Equal,
                    FilterCondition.GreaterThan,
                    FilterCondition.GreaterThanOrEqual,
                    FilterCondition.LessThan,
                    FilterCondition.LessThanOrEqual
                ]
            },
            isRequiredOnCreate: false,
            canEdit: false,
            label: IUserColumnLabels.FollowerCount
        },
        {
            key: IUserColumnKeys.FollowingCount,
            isSelectable: true,
            isSearchable: false,
            isSortable: true,
            filterOptions: {
                validConditions: [
                    FilterCondition.Equal,
                    FilterCondition.GreaterThan,
                    FilterCondition.GreaterThanOrEqual,
                    FilterCondition.LessThan,
                    FilterCondition.LessThanOrEqual
                ]
            },
            isRequiredOnCreate: false,
            canEdit: false,
            label: IUserColumnLabels.FollowingCount
        },
        {
            key: IUserColumnKeys.IsDeleted,
            isSelectable: true,
            isSearchable: false,
            isSortable: false,
            filterOptions: {
                validConditions: [FilterCondition.Equal]
            },
            isRequiredOnCreate: false,
            canEdit: false,
            label: IUserColumnLabels.IsDeleted
        },
        {
            key: IUserColumnKeys.IsBanned,
            isSelectable: true,
            isSearchable: false,
            isSortable: false,
            filterOptions: {
                validConditions: [FilterCondition.Equal]
            },
            isRequiredOnCreate: false,
            canEdit: false,
            label: IUserColumnLabels.IsBanned
        },
        {
            key: IUserColumnKeys.CreatedDate,
            isSelectable: true,
            isSearchable: false,
            isSortable: true,
            isRequiredOnCreate: false,
            canEdit: false,
            label: IUserColumnLabels.CreatedDate
        },
        {
            key: IUserColumnKeys.LastUpdated,
            isSelectable: true,
            isSearchable: false,
            isSortable: true,
            isRequiredOnCreate: false,
            canEdit: false,
            label: IUserColumnLabels.LastUpdated
        },
        {
            key: IUserColumnKeys.LastLoginDate,
            isSelectable: true,
            isSearchable: false,
            isSortable: true,
            isRequiredOnCreate: false,
            canEdit: false,
            label: IUserColumnLabels.LastLoginDate
        }
    ];

    constructor(dbConnection: knex) {
        super(dbConnection);
    }

    /**
     * Creates a new user
     *
     * @param userSubmission User information used to create a new user
     */
    async createUser(userSubmission: ICreateUserValues): Promise<IUserRecord> {
        const createUserValidation: IFormValidation = this.tableColumns
            .filter((column) => column.isRequiredOnCreate)
            .map((column) => ({ ...column, isRequired: true }));

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
                return this.getUser(record[0]);
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
                            details: [`${IUserColumnLabels.Email} is already in use`]
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
                            details: [`${IUserColumnLabels.Username} is already in use`]
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
     *
     * @param userNo The user number used to look for the correct user
     * @param submission User information used to update a user record
     */
    updateUser(userNo: number, submission: IUpdateUserValues): Promise<IUserRecord> {
        let cleanSubmission: IUpdateUserValues = {};
        const updateUserValidation: IFormValidation = this.tableColumns.filter(
            (column) => column.canEdit
        );
        const submissionErrors = validateSubmission(updateUserValidation, submission);

        if (submissionErrors) return Promise.reject(submissionErrors);

        Object.keys(submission).forEach((key) => {
            //@ts-ignore
            if (submission[key]) {
                //@ts-ignore
                cleanSubmission[key] = submission[key].trim();
            }
        });

        return this.validateUserNo(userNo).then(() => {
            return this.dbConnection(this.table)
                .update(cleanSubmission)
                .where(this.pk, userNo)
                .then(() => {
                    return this.getUser(userNo);
                })
                .catch((error) => {
                    if (
                        new RegExp("(UNIQUE constraint|Duplicate entry)", "i").test(error.message)
                    ) {
                        if (
                            new RegExp(`(UNIQUE constraint failed: ${this.table}.email)`, "i").test(
                                error.message
                            )
                        ) {
                            return Promise.reject({
                                statusCode: 409,
                                message: "Conflict Error",
                                details: [`${IUserColumnLabels.Email} is already in use`]
                            });
                        }

                        if (
                            new RegExp(
                                `(UNIQUE constraint failed: ${this.table}.username)`,
                                "i"
                            ).test(error.message)
                        ) {
                            return Promise.reject({
                                statusCode: 409,
                                message: "Conflict Error",
                                details: [`${IUserColumnLabels.Username} is already in use`]
                            });
                        }
                    }

                    return Promise.reject({
                        statusCode: error.statusCode || 500,
                        message: error.message || "Internal Server Error",
                        details: error.details || []
                    });
                });
        });
    }

    /**
     * Performs a soft delete on a user record
     *
     * @param userNo The user number used to look for the correct user
     */
    deleteUser(userNo: number): Promise<boolean> {
        return this.validateUserNo(userNo).then(() => {
            return this.getUser(userNo).then((userRecord: IUserRecord) => {
                return this.dbConnection(this.table)
                    .update({ isDeleted: true })
                    .where(this.pk, userRecord.userNo)
                    .then(() => true);
            });
        });
    }

    /**
     * Fetches a user record by using `userNo` as a lookup parameter
     *
     * @param userNo The user number used to look for the correct user
     */
    getUser(userNo: number): Promise<IUserRecord> {
        return this.validateUserNo(userNo).then(() => {
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
        });
    }

    /**
     * Fetches a list of user records
     *
     * @param queryOptions Additional filters to query by
     */
    getUserList(queryOptions: IListQueryOptions = {}): Promise<IUserListRecord> {
        const defaultOptions = {
            where: {
                isDeleted: {
                    value: 0
                },
                isBanned: {
                    value: 0
                }
            },
            itemsPerPage: 10,
            pageNo: 1,
            orderBy: {
                direction: "desc",
                column: this.pk
            }
        };
        const options = extend(true, defaultOptions, queryOptions);

        return Promise.all([
            super.getList(this.table, this.pk, this.tableColumns, options),
            super.getCount(this.table, this.pk, this.tableColumns, options.where)
        ])
            .then(([recordSet, count]) => {
                const pagination = super.buildPagination(
                    count,
                    options.pageNo,
                    options.itemsPerPage
                );

                return {
                    data: recordSet || [],
                    pagination
                };
            })
            .catch((error) => {
                return Promise.reject({
                    statusCode: error.statusCode || 500,
                    message: error.message || "Internal Server Error",
                    details: error.details || []
                });
            });
    }

    /**
     * Fetches a list of user records by search term
     *
     * @param searchTerm Search term to query users by
     * @param searchColumns Columns to search by
     */
    searchUser(
        searchTerm: string,
        searchColumns: IUserColumnKeys[] = [IUserColumnKeys.Username],
        queryOptions: IListQueryOptions = {}
    ): Promise<IUserRecord[]> {
        if (!Array.isArray(searchColumns)) {
            return Promise.reject({
                statusCode: 400,
                message: "Bad Request",
                details: ["Parameter Error: Search columns must be an array"]
            });
        }

        const defaultOptions = {
            where: {
                isDeleted: {
                    value: 0
                },
                isBanned: {
                    value: 0
                }
            },
            itemsPerPage: 10,
            pageNo: 1,
            orderBy: {
                direction: "desc",
                column: this.pk
            }
        };
        const options = extend(true, defaultOptions, queryOptions);
        const selectableColumns: string[] = this.tableColumns
            .filter((column) => column.isSelectable)
            .map((column) => column.key);
        const validSearchColumns = this.tableColumns.filter((column) => column.isSearchable);
        const validWhereClauses = [];

        let query = this.dbConnection(this.table)
            .select(selectableColumns)
            .where((query) => super.buildWhereClause(query, options.where))
            .offset((options.pageNo - 1) * options.itemsPerPage)
            .limit(options.itemsPerPage)
            .orderBy(options.orderBy.column, options.orderBy.direction);

        for (let i = 0; i < searchColumns.length; i++) {
            let validColumn = validSearchColumns.find(
                (validColumn) => validColumn.key === searchColumns[i]
            );

            if (!validColumn) {
                return Promise.reject({
                    statusCode: 400,
                    message: "Bad Request",
                    details: [`You cannot search on column: ${searchColumns[i]}`]
                });
            } else {
                validWhereClauses.push({
                    column: validColumn.key,
                    operator: "like",
                    value: `%${searchTerm}%`
                });
            }
        }

        validWhereClauses.forEach((clause, index) => {
            index === 0
                ? query.where(clause.column, clause.operator, clause.value)
                : query.orWhere(clause.column, clause.operator, clause.value);
        });

        return Promise.all([
            super.validateOrderBy(this.tableColumns, options.orderBy),
            super.validateWhereClause(this.tableColumns, options.where)
        ])
            .then(() => {
                return query;
            })
            .catch((error) => {
                return Promise.reject({
                    statusCode: error.statusCode || 500,
                    message: error.message || "Internal Server Error",
                    details: error.details || []
                });
            });
    }

    /**
     * Update a user's password
     *
     * @param userNo The user number used to look for the correct user
     * @param submission An object containing the user's current and new password information
     */
    updatePassword(userNo: number, submission: IUpdatePasswordValues): Promise<IUserRecord> {
        const { currentPassword, newPassword, confirmNewPassword } = submission;

        if (newPassword !== confirmNewPassword) {
            return Promise.reject({
                statusCode: 422,
                message: "Validation Error",
                details: ["Passwords must match"]
            });
        }

        return this.validateUserNo(userNo).then(() => {
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
        });
    }

    /**
     * Hashes a plain text password
     *
     * @param password Plain text password to hash
     */
    private hashPassword(password: string): Promise<string> {
        return bcrypt.hash(password, BCRYPT_HASH_SALT_ROUNDS);
    }

    /**
     * Confirms a match between a plain text password and an encrypted password
     *
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

    /**
     * Validates that a user number is valid
     *
     * @param userNo A user number to validate
     */
    private validateUserNo(userNo: number): Promise<Error | void> {
        return new Promise((resolve, reject) => {
            if (!userNo || typeof userNo !== "number") {
                return reject({
                    statusCode: 400,
                    message: "Bad Request",
                    details: ["Parameter Error: userNo must be a number"]
                });
            } else {
                return resolve();
            }
        });
    }
}

export default UserService;
export { UserService };
