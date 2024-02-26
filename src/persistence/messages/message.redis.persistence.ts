import { MessagePersistenceMappedMessage, MessagePersistenceStreamByTsOptions, MessagePersistenceStreambyIdsOptions, StreamedMessages } from "../../types/persistence.types";
import { WSMessage } from "../../types/ws.types";
import { MessagePersistencePrototype } from "./message.persistence.prototype";
import { RedisHandler } from "../redis/redis.handler";
import { EnvVars } from "../../utilities/env/env_vars";
import LOGGER from "../../utilities/logger";
import { EnvVarHandler } from "../../utilities/env/env_var.handler";
import { generateUuidWithNoDashes } from "../../utilities/ids";
import { SortDirection } from "../../types/redis.enums";
import { extractErrorMessage } from "../../utilities/errors";

const REDIS_MESSAGES_KEY_BASE_PREFIX = "messages_for_room_";

export class RedisMessagePersistenceEngine implements MessagePersistencePrototype {
    public static instance: RedisMessagePersistenceEngine;

    protected constructor(private msgRedisHandler: RedisHandler) {}

    public static init(): RedisMessagePersistenceEngine {
        const msgDb = EnvVarHandler.getInstance().getInt(EnvVars.CHAT_MESSAGES_DB, 0);
        const msgRedisHandler = RedisHandler.init(msgDb!);

        return new RedisMessagePersistenceEngine(msgRedisHandler);
    }

    public async initializeMessagePersistenceForRoom(roomId: string): Promise<boolean> {
        const key = RedisMessagePersistenceEngine.buildRedisKeyPrefix(REDIS_MESSAGES_KEY_BASE_PREFIX, roomId);
        const idxInfo = await this.msgRedisHandler.ftInfo(key);
        if (!idxInfo) {
            const schemaString = "$.read as read TEXT $.late as late TEXT $.ts as ts NUMERIC SORTABLE $.id as id TEXT $.channel as channel TEXT $.from as from TEXT $.message.content as message_content TEXT $.message.type as message_type TEXT";
            const scoreString = "1.0";
            try {
                return this.msgRedisHandler.ftCreate(
                    key,
                    scoreString,
                    schemaString
                )
            } catch (e) {
                if (extractErrorMessage(e) === "Index already exists") {
                    LOGGER.warn("Tried to recreate existing redis index, continuing anyway...");
                    return true;
                }
                LOGGER.error("Error occurred while creating redis index", e);
                return false;
            }
        }
        return true;
    }

    public async persistMessage(userId: string, roomId: string, message: WSMessage): Promise<MessagePersistenceMappedMessage | undefined> {
        try {
            const maxTskey = `${roomId}-maxTs`;
            const maxTs = await this.msgRedisHandler.get(maxTskey);
            const late = maxTs != null && message.ts < Number.parseInt(maxTs);
            const mappedMessage: MessagePersistenceMappedMessage = {
                id: generateUuidWithNoDashes(),
                ts: message.ts,
                read: false,
                late,
                channel: message.channel,
                from: userId,
                message: {
                    content: message.content,
                    type: message.type
                }
            };
            const prefix = RedisMessagePersistenceEngine.buildRedisKeyPrefix(REDIS_MESSAGES_KEY_BASE_PREFIX, roomId);
            const formattedMessage = {
                ...mappedMessage,
                read: `${mappedMessage.read}`,
                late: `${mappedMessage.late}`,
            };
            await this.msgRedisHandler.jsonSet(prefix, mappedMessage.id, formattedMessage);
            await this.msgRedisHandler.set(maxTskey, `${message.ts}`);
            
            return mappedMessage;
        } catch (e) {
            LOGGER.error("Error occurred while persisting message to Redis", e);
            return undefined;
        }
    }

    public async streamMessagesByTs(userId: string, roomId: string, options?: MessagePersistenceStreamByTsOptions | undefined): Promise<StreamedMessages> {
        try {
            const start = options != null && options.startTs ? options.startTs : "-inf";
            const end = options != null && options.endTs ? options.endTs : "+inf";
            let searchString = `@ts:[${start} ${end}]`;
            const key = RedisMessagePersistenceEngine.buildRedisKeyPrefix(REDIS_MESSAGES_KEY_BASE_PREFIX, roomId);
            const tsOutput = await this.msgRedisHandler.ftSearch<MessagePersistenceMappedMessage>(
                key,
                searchString,
                options?.limit || 10,
                { sortBy: "ts", direction: SortDirection.DESC},
                (record: any) => {
                    return {
                        ...record,
                        late: record.late === "true",
                        read: record.read === "true"
                    }
                }
            );

            // TODO: Fix this so it works with groups too
            searchString = `(@late:\"true\" @read:\"false\" @channel:\"${userId}\")`;
            const lateOutput = await this.msgRedisHandler.ftSearch<MessagePersistenceMappedMessage>(
                key,
                searchString,
                -1,
                undefined,
                (record: any) => {
                    return {
                        ...record,
                        late: record.late === "true",
                        read: record.read === "true"
                    }
                }
            );
            return {
                success: true,
                messages: [...tsOutput.result.values(), ...lateOutput.result.values()]
            }
        } catch (e) {
            LOGGER.error("Error occurred while streaming messages by timestamp", e);
            return {
                success: false,
                failureReason: "error",
                messages: []
            }
        }
    }

    public async streamMessagesById(userId: string, roomId: string, options: MessagePersistenceStreambyIdsOptions): Promise<StreamedMessages> {
        try {
            if (options.messageIds.length === 0) {
                return {
                    success: true,
                    messages: []
                };
            }

            const searchString = `@id:(${options.messageIds.reduce((valueString, id, index) => {
                if (index != 0) {
                    valueString += " ";
                }
                valueString += id;
                return valueString;
            }, "")})`;
            const key = RedisMessagePersistenceEngine.buildRedisKeyPrefix(REDIS_MESSAGES_KEY_BASE_PREFIX, roomId);
            const output = await this.msgRedisHandler.ftSearch<MessagePersistenceMappedMessage>(
                key,
                searchString,
                -1,
                undefined,
                (record: any) => {
                    return {
                        ...record,
                        late: record.late === "true",
                        read: record.read === "true"
                    }
                }
            );
            return {
                success: true,
                messages: [...output.result.values()]
            }
        } catch (e) {
            LOGGER.error("Error occurred while streaming messages by ID", e);
            return {
                success: false,
                failureReason: "error",
                messages: []
            }
        }
    }

    public async updateReadOnMessages(userId: string, roomId: string, messageIds: string[]): Promise<boolean> {  
        try {
            const prefix = RedisMessagePersistenceEngine.buildRedisKeyPrefix(REDIS_MESSAGES_KEY_BASE_PREFIX, roomId);
            await this.msgRedisHandler.jsonMset(prefix, messageIds, "read", "\"true\"")
            return true;
        } catch (e) {
            LOGGER.error("Error occurred while updating the read status of messages", e);
            return false;
        }
    }

    private static buildRedisKeyPrefix(basePrefix: string, dynamicPrefix: string): string {
        return `${basePrefix}${dynamicPrefix}`;
    }

    public static getInstance(): RedisMessagePersistenceEngine {
        if (RedisMessagePersistenceEngine.instance == null) {
            throw new Error("Must run init before accessing instance");
        }

        return RedisMessagePersistenceEngine.instance;
    }
}