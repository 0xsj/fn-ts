import { Kysely, Transaction } from "kysely";
import { Database } from "../types";
import { AsyncLocalStorageOptions } from "async_hooks";
import {v4 as uuidv4} from 'uuid'
import { logger } from "../../../shared/utils";
import { Injectable } from "../../../core/di/decorators";

export interface TransactionContext {

}

export type IsolationLevel = 'read uncommited' | 'read commited' | 'repeatable read' | 'serializable'

@Injectable()
export class TransactionManager {
    /**
     * get current transaction
     */

    /**
     * check if we are already in a transaction
     */

    /**
     * get the current transaction context
     */

    /**
     * execute a function within a transaction
     */
}