import Redis, { RedisOptions } from "ioredis";

import { EnvVars } from "../../utilities/env/env_vars";
import { FtSearchSortOptions, FtsearchResult } from "../../types/redis.types";
import LOGGER from "../../utilities/logger";
import { EnvVarHandler } from "../../utilities/env/env_var.handler";
import { TupleType } from "typescript";

export class RedisHandler {
    private constructor(private client: Redis) {}

    public static init(db: number): RedisHandler {
        const envVarHandler = EnvVarHandler.getInstance();
        const clientOptions: RedisOptions = {
            db,
            host: envVarHandler.getString(EnvVars.REDIS_HOST),
            port: envVarHandler.getInt(EnvVars.REDIS_PORT),
            connectTimeout: envVarHandler.getInt(EnvVars.REDIS_CONNECT_TIMEOUT),
            autoResubscribe: envVarHandler.getBool(EnvVars.REDIS_AUTO_RESUBSCRIBE),
            password: envVarHandler.getString(EnvVars.REDIS_PASSWORD)
        }
        const client: Redis = new Redis(clientOptions);
        
        return new RedisHandler(client);
    }

    public async flush() {
        return this.client.flushdb();
    }

    public async get(key: string): Promise<string | null> {
        return this.client.get(key);
    }

    public async set(key: string, value: string): Promise<string | null> {
        return this.client.set(key, value);
    }

    public async del(key: string): Promise<number> {
        return this.client.del(key);
    }

    public async jsonSet<T>(keyPrefix: string, keySuffix: string, jsonValue: T): Promise<any> {
        const key = `${keyPrefix}:${keySuffix}`;
        return this.client.call("JSON.SET", key, "$", JSON.stringify(jsonValue));
    }

    public async jsonGet<T>(keyPrefix: string, keySuffix: string): Promise<T> {
        const key = `${keyPrefix}:${keySuffix}`;
        return JSON.parse(await this.client.call("JSON.GET", key) as string) as T; 
    }

    public async jsonMset(keyPrefix: string, keySuffixes: string[], nestedFieldString: string, value: string | number): Promise<any> {
        let setString = "";
        for (const keySuffix of keySuffixes) {
            setString += `${keyPrefix}:${keySuffix} $.${nestedFieldString} ${value}`;
        }
        return this.client.call("JSON.MSET", ...setString.split(" "));
    }

    //FT.CREATE idx:us_geo_shapes_by_id ON JSON PREFIX 1 us_geo_shapes_by_id: SCORE 1.0 SCHEMA $.id as id TEXT $.bounding_box AS bounding_box GEOSHAPE $.post_code AS post_code TEXT $.country AS country TEXT
    public async ftCreate(
        key: string,
        score: string,
        schemaString: string
    ): Promise<boolean> {
        const indexKey = `idx:${key}`;
        try {
            await this.client.call(
                "FT.CREATE", indexKey, "ON", "JSON", "PREFIX", "1", `${key}:`, "SCORE", score, "SCHEMA", ...schemaString.split(" ")
            );
            return true;
        } catch (e) {
            LOGGER.error("Error occurred while running FT.CREATE", e);
            return false;
        }
    }

    public async ftInfo(
        key: string
    ): Promise<any> {
        try {
            const indexKey = `idx:${key}`;
            const result = await this.client.call(
                "FT.INFO", indexKey
            ) as any;
            return result;
        } catch (e) {
            return undefined;
        }
    }

    // EXAMPLE: FT.SEARCH idx:us_geo_shapes_by_id "@bounding_box:[CONTAINS $user]" PARAMS 2 user "POINT(73.9931359596279 40.751045417023256)" LIMIT 0 +inf DIALECT 3
    public async ftSearch<T>(
        key: string, 
        searchString: string,
        limit: number,
        sortOptions: FtSearchSortOptions | undefined,
        processor?: ((record: any) => T) | undefined
    ): Promise<FtsearchResult<T>> {
        const indexKey = `idx:${key}`;
        const baseParams: [string, string, string, string, number] = ["FT.SEARCH", indexKey, searchString, "DIALECT", 3];
        let limitParams: [string, number, number] | undefined = undefined;
        if (limit > 0) {
            limitParams = ["LIMIT", 0, limit];
        }
        let sortParams: [string, string, string] | undefined = undefined;
        if (sortOptions) {
            sortParams = ["SORTBY", sortOptions.sortBy, sortOptions.direction];
        }

        const result = await this.client.call(
            ...baseParams, ...(limitParams || []), ...(sortParams || [])
        ) as any[];
        return RedisHandler.processFtsearchResult<T>(result, sortOptions != null, processor);
    }

    private static processFtsearchResult<T>(result: any[], sorted: boolean, processor?: ((record: any) => T) | undefined): FtsearchResult<T> {
        const count = result[0] as number;
        const processedResult: FtsearchResult<T> = { count, result: new Map() };
        if (count === 0) {
            return processedResult;
        }

        
        let i = 1;
        while(i < result.length) {
            const key = result[i];
            const valueIndex = sorted ? 3 : 1;
            const value = result[i+1][valueIndex];
            let parsedValue = JSON.parse(value)[0];
            if (processor != null) {
                parsedValue = processor(parsedValue);
            }
            processedResult.result.set(key, parsedValue as T);
            i += 2;
        }

        return processedResult
    }
}