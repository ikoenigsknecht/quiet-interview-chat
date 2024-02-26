import cassandra from "cassandra-driver";

import { MessagePersistenceMappedMessage, MessagePersistenceStreamByTsOptions, StreamedMessages, MessagePersistenceStreambyIdsOptions } from "../../types/persistence.types";
import { WSMessage } from "../../types/ws.types";
import { MessagePersistencePrototype } from "./message.persistence.prototype";
import { EnvVarHandler } from "../../utilities/env/env_var.handler";
import { EnvVars } from "../../utilities/env/env_vars";
import { randomUUID } from "crypto";
import { DateTime } from "luxon";
import LOGGER from "../../utilities/logger";
import { extractErrorMessage } from "../../utilities/errors";

export class CassandraMessagePersistenceEngine implements MessagePersistencePrototype {
    protected constructor(private client: cassandra.Client) {}

    public static async init(): Promise<CassandraMessagePersistenceEngine> {
        const client = new cassandra.Client({
            contactPoints: EnvVarHandler.getInstance().getString(EnvVars.CASSANDRA_HOSTS)!.split(","),
            keyspace: EnvVarHandler.getInstance().getString(EnvVars.CASSANDRA_KEYSPACE, "quiet_chat")!,
            localDataCenter: "datacenter1",
            policies: {
                retry: cassandra.policies.defaultRetryPolicy(),
                reconnection: cassandra.policies.defaultReconnectionPolicy()
            }
        });
        await client.connect()
        return new CassandraMessagePersistenceEngine(client);
    }

    public async initializeMessagePersistenceForRoom(roomId: string): Promise<boolean> {
        return true;
    }

    public async persistMessage(userId: string, roomId: string, message: WSMessage): Promise<MessagePersistenceMappedMessage | undefined> {
        try {
            const maxTsQuery = 'SELECT max(ts) FROM messages WHERE room = ?';
            const result = await this.client.execute(maxTsQuery, [roomId]);
            let late = false;
            if (result.first().length > 0) {
                late = message.ts < Number.parseInt(result.first()[0]);
            }

            const mappedMessage: MessagePersistenceMappedMessage = {
                id: randomUUID(),
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

            const persistQuery = 'INSERT INTO messages (id, ts, read, late, channel, "from", room, content, type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
            const params = [mappedMessage.id, DateTime.fromMillis(mappedMessage.ts).toUTC().toISO(), mappedMessage.read, mappedMessage.late, mappedMessage.channel, mappedMessage.from, roomId, mappedMessage.message.content, mappedMessage.message.type];
            await this.client.execute(persistQuery, params, { prepare : true });

            return mappedMessage;
        } catch (e) {
            LOGGER.error("Error while writing to cassandra", e)
            return undefined;
        }
    }

    public async streamMessagesByTs(userId: string, roomId: string, options?: MessagePersistenceStreamByTsOptions | undefined): Promise<StreamedMessages> {
        try {
            const start = DateTime.fromMillis(options != null && options.startTs ? options.startTs : 0).toUTC().toISO();
            const end = DateTime.fromMillis(options != null && options.endTs ? options.endTs : 4075808567000).toUTC().toISO();
            const query = `SELECT * FROM messages WHERE room = ? AND ts >= ? AND ts <= ? LIMIT 30`;
            const params = [roomId, start, end];
            const result = await this.client.execute(query, params, { prepare : true });
            const messages = result.rows.map((row: cassandra.types.Row) => {
                return {
                    id: row.get("id"),
                    ts: DateTime.fromJSDate(row.get("ts")).toMillis(),
                    read: row.get("read"),
                    late: row.get("late"),
                    channel: row.get("channel"),
                    from: row.get("from"),
                    message: {
                        content: row.get("content"),
                        type: row.get("type")
                    }
                } as MessagePersistenceMappedMessage
            });
            return {
                messages,
                success: true
            };
        } catch (e) {
            LOGGER.error("Error while reading from cassandra", e)
            return {
                messages: [],
                success: false,
                failureReason: extractErrorMessage(e)
            }
        }
    }

    public async streamMessagesById(userId: string, roomId: string, options: MessagePersistenceStreambyIdsOptions): Promise<StreamedMessages> {
        try {
            const query = `SELECT * FROM messages WHERE room = ? AND id IN ?`;
            const params = [roomId, options.messageIds];
            const result = await this.client.execute(query, params, { prepare : true });
            const messages = result.rows.map((row: cassandra.types.Row) => {
                return {
                    id: row.get("id"),
                    ts: DateTime.fromJSDate(row.get("ts")).toMillis(),
                    read: row.get("read"),
                    late: row.get("late"),
                    channel: row.get("channel"),
                    from: row.get("from"),
                    message: {
                        content: row.get("content"),
                        type: row.get("type")
                    }
                } as MessagePersistenceMappedMessage
            });
            return {
                success: true,
                messages
            }
        } catch (e) {
            return {
                success: false,
                messages: []
            };
        }
    }

    public async updateReadOnMessages(userId: string, roomId: string, messageIds: string[]): Promise<boolean> {
        throw new Error("Method not implemented.");
    }

}