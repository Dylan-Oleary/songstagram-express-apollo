import knex from "knex";

import { BaseService, FilterCondition, IColumnDefinition, IError } from "./Base";
import { IFormValidation, validateSubmission } from "../lib/validateSubmission";
import UserService from "./User";

export interface IUserPreferenceRecord {
    userPreferenceNo: number;
    userNo: number;
    prefersDarkMode: boolean;
    lastUpdated: Date;
}

export interface IUserPreferences {
    prefersDarkMode?: boolean;
}

export interface ICreateUserPreferenceValues extends IUserPreferences {
    userNo: number;
}

export interface IUpdateUserPreferenceValues {
    prefersDarkMode?: boolean;
}

export enum IUserPreferenceColumnKeys {
    UserPreferenceNo = "userPreferenceNo",
    UserNo = "userNo",
    PrefersDarkMode = "prefersDarkMode",
    LastUpdated = "lastUpdated"
}

export enum IUserPreferenceColumnLabels {
    UserPreferenceNo = "User Preference Number",
    UserNo = "User Number",
    PrefersDarkMode = "Prefers Dark Mode",
    LastUpdated = "Last Updated"
}

export interface IUserPreferenceColumnDefinition extends IColumnDefinition {
    key: IUserPreferenceColumnKeys;
    label: IUserPreferenceColumnLabels;
}

/**
 * Service used to manage user preferences
 *
 * @param dbConnection Knex connection used to read/write to the database
 */
class UserPreferenceService extends BaseService {
    readonly pk = "userNo";
    readonly table = "userPreferences";
    private readonly tableColumns: IUserPreferenceColumnDefinition[] = [
        {
            key: IUserPreferenceColumnKeys.UserPreferenceNo,
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
            label: IUserPreferenceColumnLabels.UserPreferenceNo
        },
        {
            key: IUserPreferenceColumnKeys.UserNo,
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
            isRequiredOnCreate: true,
            canEdit: false,
            label: IUserPreferenceColumnLabels.UserNo,
            check: (value) => {
                if (Number(value) <= 0) {
                    return new Error(
                        `${IUserPreferenceColumnLabels.UserNo} must be greater than 0`
                    );
                }

                return undefined;
            }
        },
        {
            key: IUserPreferenceColumnKeys.PrefersDarkMode,
            isSelectable: true,
            isSearchable: false,
            isSortable: false,
            filterOptions: {
                validConditions: [FilterCondition.Equal]
            },
            isRequiredOnCreate: false,
            canEdit: true,
            label: IUserPreferenceColumnLabels.PrefersDarkMode,
            check: (value) => {
                if (typeof value !== "boolean") {
                    return new Error(
                        `${IUserPreferenceColumnLabels.PrefersDarkMode} must be a boolean value`
                    );
                }

                return undefined;
            }
        },
        {
            key: IUserPreferenceColumnKeys.LastUpdated,
            isSelectable: true,
            isSearchable: false,
            isSortable: true,
            isRequiredOnCreate: false,
            canEdit: false,
            label: IUserPreferenceColumnLabels.LastUpdated
        }
    ];

    constructor(dbConnection: knex) {
        super(dbConnection);
    }

    /**
     * Creates a new user preference record
     *
     * @param submission User preference information used to create the user preference
     */
    public async createUserPreference(
        submission: ICreateUserPreferenceValues
    ): Promise<IUserPreferenceRecord> {
        const createUserPreferenceValidation: IFormValidation = this.tableColumns
            .filter(
                (column) =>
                    column.isRequiredOnCreate ||
                    //@ts-ignore
                    submission[column.key as keyof IUserPreferenceColumnKeys] !== undefined
            )
            .map((column) => ({ ...column, isRequired: column.isRequiredOnCreate }));
        const submissionErrors = validateSubmission(createUserPreferenceValidation, submission);

        if (submissionErrors) return Promise.reject(submissionErrors);

        const user = await new UserService(this.dbConnection).getUser(submission.userNo || 0);

        if (user.isDeleted || user.isBanned) {
            return Promise.reject({
                statusCode: 403,
                message: "Forbidden",
                details: [`User (userNo: ${user.userNo}) does not have access to create a post`]
            });
        }

        const newUserPreference: ICreateUserPreferenceValues = {
            userNo: Number(submission.userNo),
            prefersDarkMode: submission.prefersDarkMode || false
        };

        return this.dbConnection(this.table)
            .insert(newUserPreference)
            .then(() => this.getUserPreference(Number(submission.userNo)))
            .catch((error) => {
                return Promise.reject({
                    statusCode: error.statusCode || 500,
                    message: error.message || "Internal Server Error",
                    details: error.details || []
                });
            });
    }

    /**
     * Updates a user preference record
     *
     * @param userNo The user number attached to the user preference record
     * @param submission User preference information used tp update a user preference record
     */
    public updateUserPreference(
        userNo: number,
        submission: IUpdateUserPreferenceValues
    ): Promise<IUserPreferenceRecord> {
        let cleanSubmission: IUpdateUserPreferenceValues = {};
        const updateUserPreferenceValidation: IFormValidation = this.tableColumns.filter(
            (column) => column.canEdit
        );

        const submissionErrors = validateSubmission(updateUserPreferenceValidation, submission);

        if (submissionErrors) return Promise.reject(submissionErrors);

        Object.keys(submission).forEach((key) => {
            //@ts-ignore
            if (submission[key] !== undefined) {
                if (
                    new RegExp("is[A-Za-z]+").test(key) ||
                    new RegExp("prefers[A-Za-z]").test(key)
                ) {
                    //@ts-ignore
                    cleanSubmission[key] = Boolean(submission[key]);
                } else {
                    //@ts-ignore
                    cleanSubmission[key] = submission[key].trim();
                }
            }
        });

        return super.validateRecordNo(userNo, IUserPreferenceColumnKeys.UserNo).then(() => {
            return this.dbConnection(this.table)
                .update({ ...cleanSubmission, lastUpdated: this.dbConnection.fn.now() })
                .where(IUserPreferenceColumnKeys.UserNo, userNo)
                .then(() => this.getUserPreference(userNo))
                .catch((error) => {
                    return Promise.reject({
                        statusCode: error.statusCode || 500,
                        message: error.message || "Internal Server Error",
                        details: error.details || []
                    });
                });
        });
    }

    /**
     * Fetches a user preference record
     *
     * @param userNo The user number attached to the user preference record
     */
    public getUserPreference(userNo: number): Promise<IUserPreferenceRecord> {
        return super.validateRecordNo(userNo, IUserPreferenceColumnKeys.UserNo).then(() => {
            return this.dbConnection(this.table)
                .first("*")
                .where({
                    [IUserPreferenceColumnKeys.UserNo]: userNo,
                    isDeleted: false
                })
                .then((record) => {
                    if (!record)
                        return Promise.reject({
                            statusCode: 404,
                            message: "Not Found",
                            details: [
                                `User preference with a ${IUserPreferenceColumnKeys.UserNo} of ${userNo} could not be found`
                            ]
                        });

                    delete record.password;

                    return super.cleanRecord<IUserPreferenceRecord>(record);
                });
        });
    }

    /**
     * Performs a soft delete on a user preference record
     *
     * @param userNo The user number attached to the user preference record
     */
    public deleteUserPreference(userNo: number): Promise<boolean> {
        return super.validateRecordNo(userNo, IUserPreferenceColumnKeys.UserNo).then(() => {
            return this.getUserPreference(userNo).then((userPreferenceRecord) => {
                return this.dbConnection(this.table)
                    .update({ isDeleted: true, lastUpdated: this.dbConnection.fn.now() })
                    .where(this.pk, userPreferenceRecord[this.pk])
                    .then(() => true);
            });
        });
    }

    /**
     * Returns valid filter conditions for the passed column
     *
     * @param key The column name
     */
    public getColumnFilters(key: IUserPreferenceColumnKeys): FilterCondition[] | Promise<IError> {
        return super.getColumnFilters(key, this.tableColumns);
    }

    /**
     * Returns an array of column names whose columns are sortable
     */
    public getSortableColumns(): IUserPreferenceColumnKeys[] {
        return this.tableColumns.filter((column) => column.isSortable).map((column) => column.key);
    }
}

export default UserPreferenceService;
export { UserPreferenceService };
