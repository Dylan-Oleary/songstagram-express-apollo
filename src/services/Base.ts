import extend from "extend";
import knex, { QueryBuilder } from "knex";

import { IFormSubmission } from "../lib/validateSubmission";

export interface IColumnDefinition {
    key: string;
    isSelectable: boolean;
    isSearchable: boolean;
    isSortable: boolean;
    isRequiredOnCreate: boolean;
    canEdit: boolean;
    label: string;
    filterOptions?: IColumnFilterOptions;
    check?: (value: string, submission?: IFormSubmission) => undefined | Error;
}

export interface IColumnFilterOptions {
    validConditions: FilterCondition[];
}

export interface IWhereClause {
    [key: string]: {
        condition?: FilterCondition;
        value: string | number | boolean;
    };
}

export enum FilterCondition {
    Equal = "eq",
    LessThan = "lt",
    LessThanOrEqual = "lte",
    GreaterThan = "gt",
    GreaterThanOrEqual = "gte"
}

export enum OrderDirection {
    ASC = "asc",
    DESC = "desc"
}

export interface IListQueryOptions {
    where?: IWhereClause;
    itemsPerPage?: number;
    pageNo?: number;
    orderBy?: IOrderBy;
}

export interface IOrderBy {
    direction: OrderDirection;
    column: string;
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
    protected buildPagination(totalRecords: number, currentPage: number, itemsPerPage: number) {
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
     * Adds where clauses to the knex query based upon provided query options
     *
     * @param query An instance of the knex `QueryBuilder`
     * @param where Query options to be added to knex query
     */
    protected buildWhereClause(query: QueryBuilder, where: IWhereClause) {
        const whereKeys = Object.keys(where) || [];
        const whereClauses: {
            column: string;
            operator: string;
            value: number | string | boolean;
        }[] = [];

        whereKeys.forEach((key) => {
            let filterOption = { ...where[key] };
            let filterCondition = filterOption.condition;
            let knexFilterCondition: string;

            switch (filterCondition) {
                case FilterCondition.Equal:
                    knexFilterCondition = "=";
                    break;
                case FilterCondition.GreaterThan:
                    knexFilterCondition = ">";
                    break;
                case FilterCondition.GreaterThanOrEqual:
                    knexFilterCondition = ">=";
                    break;
                case FilterCondition.LessThan:
                    knexFilterCondition = "<";
                    break;
                case FilterCondition.LessThanOrEqual:
                    knexFilterCondition = "<=";
                    break;
                default:
                    knexFilterCondition = "=";
                    break;
            }

            whereClauses.push({
                column: key,
                operator: knexFilterCondition,
                value: filterOption.value
            });
        });

        whereClauses.forEach((clause, index) => {
            index === 0
                ? query.where(clause.column, clause.operator, clause.value)
                : query.andWhere(clause.column, clause.operator, clause.value);
        });

        return query;
    }

    /**
     * Validates that a where clause is valid before making a filterable query to the database
     *
     * @param tableColumns The table column definitions
     * @param where Query options to validate based upon column definitions
     */
    protected validateWhereClause(tableColumns: IColumnDefinition[], where: IWhereClause) {
        return new Promise((resolve, reject) => {
            if (Object.keys(where).length > 0) {
                const filterableColumns = tableColumns.filter((column) => column.filterOptions);

                for (let columnKey of Object.keys(where)) {
                    const validColumn = filterableColumns.find(
                        (column) => column.key === columnKey
                    );

                    if (!validColumn) {
                        return reject({
                            statusCode: 400,
                            message: "Bad Request",
                            details: [`You cannot filter by column: ${columnKey}`]
                        });
                    }

                    if (where[columnKey].condition) {
                        if (
                            //@ts-ignore
                            Object.values(FilterCondition).indexOf(where[columnKey].condition) ===
                            -1
                        ) {
                            return reject({
                                statusCode: 400,
                                message: "Bad Request",
                                details: [
                                    `You cannot filter column ${columnKey} on condition: ${where[columnKey].condition}`
                                ]
                            });
                        }
                    }

                    if (where[columnKey].value === undefined || where[columnKey].value === null) {
                        return reject({
                            statusCode: 400,
                            message: "Bad Request",
                            details: [
                                `You must pass a valid value to filter on column: ${columnKey}`
                            ]
                        });
                    }
                }
            }

            resolve();
        });
    }

    /**
     * Validates that `orderBy` is valid based upon the given column definitions
     *
     * @param tableColumns The table column definitions
     * @param orderBy The orderBy object passed along in the query options
     */
    protected validateOrderBy(
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
    protected getList(
        tableName: string,
        pk: string,
        columns: IColumnDefinition[],
        queryOptions: IListQueryOptions = {}
    ): Promise<any[]> {
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

        return Promise.all([
            this.validateOrderBy(columns, options.orderBy),
            this.validateWhereClause(columns, options.where)
        ])
            .then(() => {
                return this.dbConnection(tableName)
                    .select(selectableColumns)
                    .where((query) => this.buildWhereClause(query, options.where))
                    .offset((options.pageNo - 1) * options.itemsPerPage)
                    .limit(options.itemsPerPage)
                    .orderBy(options.orderBy.column, options.orderBy.direction)
                    .then((recordSet) => {
                        return recordSet || [];
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
     * @param columns A list of column definitions for the table
     * @param where Additional filters to query by
     */
    protected getCount(
        tableName: string,
        pk: string,
        columns: IColumnDefinition[],
        where: IWhereClause
    ): Promise<number> {
        return this.validateWhereClause(columns, where)
            .then(() => {
                return this.dbConnection(tableName)
                    .count(pk)
                    .where((query) => this.buildWhereClause(query, where))
                    .then(([count]) => {
                        return Number(count[Object.keys(count)[0]]);
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
}

export default BaseService;
export { BaseService };
