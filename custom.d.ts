import { IUserAccessTokenValues } from "./src/services";

export interface ProcessEnv {
    [key: string]: string | undefined;
}

declare global {
    namespace Express {
        interface Request {
            user: IUserAccessTokenValues;
        }
    }
}
