import extend from "extend";
import knex from "knex";

import { IFormSubmission } from "../lib/validateSubmission";

export interface IColumnDefinition {
    key: string;
    isSelectable: boolean;
    isSortable: boolean;
    isRequiredOnCreate: boolean;
    canEdit: boolean;
    label: string;
    check?: (value: string, submission?: IFormSubmission) => undefined | Error;
}

export enum OrderDirection {
    ASC = "asc",
    DESC = "desc"
}

export interface IListQueryOptions {
    where?: {
        [key: string]: any;
    };
    itemsPerPage?: number;
    pageNo?: number;
    orderBy?: IOrderBy;
}

export interface IOrderBy {
    direction: OrderDirection;
    column: string;
}

export interface IGetListRecord {
    data: any[];
    pagination: IPagination;
}

export interface IPagination {
    currentPage: number;
    itemsPerPage: number;
    nextPage: number | null;
    prevPage: number | null;
    totalPages: number;
    totalRecords: number;
}

/**
 * Base service
 *
 * @param dbConnection Knex connection used to read/write to the database
 */
class BaseService {
    protected dbConnection: knex;

    constructor(dbConnection: knex) {
        this.dbConnection = dbConnection;
    }

    /**
     * Builds a pagination object
     *
     * @param totalRecords The total amount of records available from any given query
     * @param currentPage The current page
     * @param itemsPerPage The amount of items per page
     */
    private buildPagination(totalRecords: number, currentPage: number, itemsPerPage: number) {
        const totalPages = Math.ceil(totalRecords / itemsPerPage);
        const nextPage =
            currentPage === totalPages || totalPages === 0 || currentPage > totalPages
                ? null
                : currentPage + 1;
        const prevPage =
            currentPage === 1 || totalPages === 0 || currentPage > totalPages
                ? null
                : currentPage - 1;

        return {
            currentPage,
            itemsPerPage,
            nextPage,
            prevPage,
            totalPages,
            totalRecords
        };
    }

    /**
     * Validates that `orderBy` is valid based upon the given column definitions
     *
     * @param tableColumns The table column definitions
     * @param orderBy The orderBy object passed along in the query options
     */
    private validateOrderBy(
        tableColumns: IColumnDefinition[],
        orderBy: IOrderBy
    ): Promise<Error | void> {
        return new Promise((resolve, reject) => {
            const validOrderByColumn = tableColumns.find(
                (column) => column.isSortable && orderBy.column === column.key
            );

            if (!validOrderByColumn) {
                reject({
                    statusCode: 400,
                    message: "Bad Request",
                    details: [`You cannot sort by column: ${orderBy.column}`]
                });
            }

            if (
                orderBy.direction !== OrderDirection.ASC &&
                orderBy.direction !== OrderDirection.DESC
            ) {
                reject({
                    statusCode: 400,
                    message: "Bad Request",
                    details: [`You cannot sort by direction: ${orderBy.direction}`]
                });
            }

            resolve();
        });
    }

    /**
     * Gets a list of records
     *
     * @param tableName The table to query
     * @param pk The primary key for the table
     * @param columns A list of column definitions for the table
     * @param queryOptions Additional filters to query by
     */
    protected async getList(
        tableName: string,
        pk: string,
        columns: IColumnDefinition[],
        queryOptions: IListQueryOptions = {}
    ): Promise<IGetListRecord> {
        const selectableColumns: string[] = columns
            .filter((column) => column.isSelectable)
            .map((column) => column.key);
        const defaultOptions = {
            where: {},
            itemsPerPage: 10,
            pageNo: 1,
            orderBy: {
                direction: OrderDirection.DESC,
                column: pk
            }
        };
        const options = extend(true, defaultOptions, queryOptions);

        return Promise.all([this.validateOrderBy(columns, options.orderBy)])
            .then(() => {
                return Promise.all([
                    this.dbConnection(tableName)
                        .select(selectableColumns)
                        .where(options.where)
                        .offset((options.pageNo - 1) * options.itemsPerPage)
                        .limit(options.itemsPerPage)
                        .orderBy(options.orderBy.column, options.orderBy.direction),
                    this.getCount(tableName, pk, options.where)
                ]).then(([recordSet, count]) => {
                    const pagination = this.buildPagination(
                        count,
                        options.pageNo,
                        options.itemsPerPage
                    );

                    return {
                        data: recordSet || [],
                        pagination
                    };
                });
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
     * Count the total number of records that meet the query criteria
     *
     * @param tableName The table to query
     * @param pk The primary key for the table
     * @param where Additional filters to query by
     */
    protected getCount(
        tableName: string,
        pk: string,
        where: { [key: string]: any }
    ): Promise<number> {
        return this.dbConnection(tableName)
            .count(pk)
            .where(where)
            .then(([count]) => {
                return Number(count[Object.keys(count)[0]]);
            });
    }
}

export default BaseService;
export { BaseService };
