import extend from "extend";
import knex from "knex";

import {
    BaseService,
    FilterCondition,
    IColumnDefinition,
    IListQueryOptions,
    IPagination
} from "./Base";
import { IUserColumnKeys, UserService } from "./User";
import { IFormValidation, validateSubmission } from "~lib/validateSubmission";

export interface IFollowRecord {
    followNo: number;
    followerUserNo: number;
    userNo: number;
    isFollowing: boolean;
    followDate: Date;
    unfollowDate: Date;
}

export interface IFollowListRecord {
    data: IFollowRecord[];
    pagination: IPagination;
}

export interface ICreateFollowValues {
    userNo: number;
    followerUserNo: number;
}

export interface IUpdateFollowValues {
    isFollowing: boolean;
}

export enum IFollowColumnKeys {
    FollowNo = "followNo",
    FollowerUserNo = "followerUserNo",
    IsFollowing = "isFollowing",
    UserNo = "userNo",
    FollowDate = "followDate",
    UnfollowDate = "unfollowDate"
}

export enum IFollowColumnLabels {
    FollowNo = "Follow Number",
    FollowerUserNo = "Follower User Number",
    IsFollowing = "Is Following",
    UserNo = "User Number",
    FollowDate = "Follow Date",
    UnfollowDate = "Unfollow Date"
}

export interface IFollowColumnDefinition extends IColumnDefinition {
    key: IFollowColumnKeys;
    label: IFollowColumnLabels;
}

class FollowService extends BaseService {
    private readonly pk = "followNo";
    private readonly table = "follows";
    private readonly tableColumns: IFollowColumnDefinition[] = [
        {
            key: IFollowColumnKeys.FollowNo,
            isSelectable: true,
            isSearchable: false,
            isSortable: true,
            isRequiredOnCreate: false,
            canEdit: false,
            label: IFollowColumnLabels.FollowNo
        },
        {
            key: IFollowColumnKeys.FollowerUserNo,
            isSelectable: true,
            isSearchable: false,
            isSortable: true,
            isRequiredOnCreate: true,
            canEdit: false,
            label: IFollowColumnLabels.FollowerUserNo
        },
        {
            key: IFollowColumnKeys.UserNo,
            isSelectable: true,
            isSearchable: false,
            isSortable: true,
            isRequiredOnCreate: true,
            canEdit: false,
            label: IFollowColumnLabels.UserNo
        },
        {
            key: IFollowColumnKeys.IsFollowing,
            isSelectable: true,
            isSearchable: false,
            isSortable: false,
            filterOptions: {
                validConditions: [FilterCondition.Equal]
            },
            isRequiredOnCreate: false,
            canEdit: true,
            label: IFollowColumnLabels.IsFollowing
        },
        {
            key: IFollowColumnKeys.FollowDate,
            isSelectable: true,
            isSearchable: false,
            isSortable: true,
            isRequiredOnCreate: false,
            canEdit: false,
            label: IFollowColumnLabels.FollowDate
        },
        {
            key: IFollowColumnKeys.UnfollowDate,
            isSelectable: true,
            isSearchable: false,
            isSortable: true,
            isRequiredOnCreate: false,
            canEdit: false,
            label: IFollowColumnLabels.UnfollowDate
        }
    ];

    constructor(dbConnection: knex) {
        super(dbConnection);
    }

    /**
     * Creates a new follow record
     *
     * @param followSubmission Follow information used to create a new follow
     */
    createFollow(followSubmission: ICreateFollowValues): Promise<IFollowRecord> {
        const createFollowValidation: IFormValidation = this.tableColumns
            .filter((column) => column.isRequiredOnCreate)
            .map((column) => ({ ...column, isRequired: true }));

        const submissionErrors = validateSubmission(createFollowValidation, followSubmission);

        if (submissionErrors) return Promise.reject(submissionErrors);

        const newFollow = {
            userNo: Number(followSubmission.userNo),
            followerUserNo: Number(followSubmission.followerUserNo)
        };

        return this.dbConnection(this.table)
            .insert(newFollow)
            .then((record) => {
                return this.getFollow(record[0]);
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
     * Edits an existing follow record
     *
     * @param followNo The follow number of the record to update
     * @param followSubmission Follow information used to edit record
     */
    updateFollow(followNo: number, followSubmission: IUpdateFollowValues): Promise<IFollowRecord> {
        let cleanSubmission = {};
        const updateFollowValidation: IFormValidation = this.tableColumns.filter(
            (column) => column.canEdit
        );
        const submissionErrors = validateSubmission(updateFollowValidation, followSubmission);

        if (submissionErrors) return Promise.reject(submissionErrors);

        if (Boolean(followSubmission.isFollowing)) {
            cleanSubmission = { isFollowing: true, followDate: this.dbConnection.fn.now() };
        } else {
            cleanSubmission = { isFollowing: false, unfollowDate: this.dbConnection.fn.now() };
        }

        return super.validateRecordNo(followNo, this.pk).then(() => {
            return this.dbConnection(this.table)
                .update({
                    ...cleanSubmission,
                    lastUpdated: this.dbConnection.fn.now()
                })
                .where(this.pk, followNo)
                .then(() => {
                    return this.getFollow(followNo);
                })
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
     * Creates or updates a follow record
     *
     * @param followerUserNo The user number of the user making the follow request
     * @param userToFollowNo The user number of the user that is being followed
     * @param shouldFollow Used to set `isFollowing`
     */
    followRequest(
        followerUserNo: number,
        userToFollowNo: number,
        shouldFollow: boolean = true
    ): Promise<IFollowRecord> {
        const userService = new UserService(this.dbConnection);

        return Promise.all([
            userService.getUser(followerUserNo),
            userService.getUser(userToFollowNo)
        ]).then(async ([follower, userToFollow]) => {
            for (let user of [follower, userToFollow]) {
                if (Boolean(user.isDeleted)) {
                    return Promise.reject({
                        statusCode: 403,
                        message: "Forbidden",
                        details: [
                            `User (userNo: ${user.userNo}) has been deleted and cannot be updated`
                        ]
                    });
                } else if (Boolean(user.isBanned)) {
                    return Promise.reject({
                        statusCode: 403,
                        message: "Forbidden",
                        details: [
                            `User (userNo: ${user.userNo}) has been banned and cannot be updated`
                        ]
                    });
                }
            }

            const followRecord = await this.getFollowList({
                where: {
                    userNo: {
                        value: userToFollow.userNo
                    },
                    followerUserNo: {
                        value: follower.userNo
                    }
                }
            }).then(({ data = [] }) => {
                if (data.length > 0) return data[0];

                return undefined;
            });

            if (followRecord) {
                return this.updateFollow(followRecord[this.pk], {
                    isFollowing: shouldFollow
                });
            } else {
                return this.createFollow({
                    userNo: userToFollow.userNo,
                    followerUserNo: follower.userNo
                });
            }
        });
    }

    /**
     * Fetches a list of follow records
     *
     * @param queryOptions Additional filters to query by
     */
    getFollowList(queryOptions: IListQueryOptions = {}): Promise<IFollowListRecord> {
        const defaultOptions = {
            where: {},
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
     * Fetches a follow record using `followNo` as a lookup parameter
     *
     * @param followNo The follow number used to look for the correct follow
     */
    getFollow(followNo: number): Promise<IFollowRecord> {
        return super.validateRecordNo(followNo, this.pk).then(() => {
            return this.dbConnection(this.table)
                .first("*")
                .where(this.pk, followNo)
                .then((record) => {
                    if (!record)
                        throw {
                            statusCode: 404,
                            message: "Not Found",
                            details: [`Follow with a ${this.pk} of ${followNo} could not be found`]
                        };

                    return record;
                });
        });
    }

    /**
     * Fetches the number of followers tied to a user
     *
     * @param userNo The user number used to fetch the follower count
     */
    getFollowerCount(userNo: number): Promise<number> {
        return super.validateRecordNo(userNo, IUserColumnKeys.UserNo).then(() => {
            return new FollowService(this.dbConnection)
                .getFollowList({
                    where: {
                        isFollowing: {
                            value: 1
                        },
                        userNo: {
                            value: userNo
                        }
                    }
                })
                .then(({ pagination }) => {
                    return pagination.totalRecords;
                });
        });
    }

    /**
     * Fetches the number of users a user is following
     *
     * @param userNo The user number used to fetch the following count
     */
    getFollowingCount(userNo: number): Promise<number> {
        return super.validateRecordNo(userNo, IUserColumnKeys.UserNo).then(() => {
            return new FollowService(this.dbConnection)
                .getFollowList({
                    where: {
                        isFollowing: {
                            value: 1
                        },
                        followerUserNo: {
                            value: userNo
                        }
                    }
                })
                .then(({ pagination }) => {
                    return pagination.totalRecords;
                });
        });
    }

    /**
     * Performs a hard delete on a follow record
     *
     * @param followNo The follow number used to find the correct record
     */
    deleteFollow(followNo: number): Promise<boolean> {
        return super.validateRecordNo(followNo, this.pk).then(() => {
            return this.getFollow(followNo).then((followRecord: IFollowRecord) => {
                return this.dbConnection(this.table)
                    .del()
                    .where(this.pk, followRecord[this.pk])
                    .then(() => true);
            });
        });
    }
}

export default FollowService;
export { FollowService };
