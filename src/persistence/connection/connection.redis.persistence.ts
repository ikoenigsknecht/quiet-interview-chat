import { RedisHandler } from "../redis/redis.handler";
import { EnvVars } from "../../utilities/env/env_vars";
import LOGGER from "../../utilities/logger";
import { ConnectionPersistencePrototype } from "./connection.persistence.prototype";
import { EnvVarHandler } from "../../utilities/env/env_var.handler";

const REDIS_CONN_KEY_PREFIX = "socket_conn_";

export class RedisConnectionPersistenceEngine implements ConnectionPersistencePrototype<string> {
    public static instance: RedisConnectionPersistenceEngine;

    protected constructor(private redisHandler: RedisHandler) {}

    public static async init(): Promise<RedisConnectionPersistenceEngine> {
        const db = EnvVarHandler.getInstance().getInt(EnvVars.CHAT_CONN_DB, 1);
        const redisHandler = RedisHandler.init(db!);

        return new RedisConnectionPersistenceEngine(redisHandler);
    }

    public async persistConnection(socketId: string, userId: string, serverId: string): Promise<void> {
        try {
            const key = RedisConnectionPersistenceEngine.buildRedisKey(socketId, serverId);
            await this.redisHandler.set(key, userId);
        } catch (e) {
            LOGGER.error("Error while persisting socket connection to redis", e);
        }
    }

    public async removeConnection(socketId: string, serverId: string): Promise<void> {
        try {
            const key = RedisConnectionPersistenceEngine.buildRedisKey(socketId, serverId);
            await this.redisHandler.del(key);
        } catch (e) {
            LOGGER.error("Error while removing socket connection from redis", e);
        }
    }

    public async getConnection(socketId: string, serverId: string): Promise<string | undefined> {
        try {
            const key = RedisConnectionPersistenceEngine.buildRedisKey(socketId, serverId);
            const connectionDetails = await this.redisHandler.get(key);
            if (!connectionDetails) {
                throw new Error(`No connection details found for key ${key}`);
            }
            return connectionDetails;
        } catch (e) {
            LOGGER.error("Error getting connection details from redis", e);
            return undefined;
        }
    }

    private static buildRedisKey(socketId: string, serverId: string): string {
        return `${REDIS_CONN_KEY_PREFIX}${socketId}_${serverId}`;
    }

    public static getInstance(): RedisConnectionPersistenceEngine {
        if (RedisConnectionPersistenceEngine.instance == null) {
            throw new Error("Must run init before accessing instance");
        }

        return RedisConnectionPersistenceEngine.instance;
    }
}