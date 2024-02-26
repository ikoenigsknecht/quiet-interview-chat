import { MessagePersistenceMappedMessage, LocalMessagePersistenceMessageMap, MessagePersistencePersistAck, MessagePersistenceStreamByTsOptions, StreamedMessages, MessagePersistenceStreambyIdsOptions } from "../../types/persistence.types";
import { WSMessage } from "../../types/ws.types";
import { NotImplementedError } from "../../utilities/errors";
import { generateUuidWithNoDashes } from "../../utilities/ids";
import LOGGER from "../../utilities/logger";
import { MessagePersistencePrototype } from "./message.persistence.prototype";

export class LocalMessagePersistenceEngine implements MessagePersistencePrototype {
    public static instance: LocalMessagePersistenceEngine;

    protected constructor(private messages: LocalMessagePersistenceMessageMap) {}

    public static init(): LocalMessagePersistenceEngine {
        return new LocalMessagePersistenceEngine(new Map());
    }

    // nothing to do here locally
    public async initializeMessagePersistenceForRoom(roomId: string): Promise<boolean> {
        return true;
    }

    public async persistMessage(userId: string, roomId: string, message: WSMessage): Promise<MessagePersistenceMappedMessage | undefined> {
        const currentMessagesForRoom = this.messages.get(roomId) || [];
        const maxTs = Math.max(...currentMessagesForRoom.map(msg => msg.ts));
        const mappedMessage: MessagePersistenceMappedMessage = {
            id: generateUuidWithNoDashes(),
            ts: message.ts,
            channel: message.channel,
            from: userId,
            read: false,
            late: message.ts < maxTs,
            message: {
                content: message.content,
                type: message.type
            }
        };

        currentMessagesForRoom.push(mappedMessage);
        this.messages.set(roomId, currentMessagesForRoom);
        return mappedMessage;
    }

    public async streamMessagesByTs(userId: string, roomId: string, options?: MessagePersistenceStreamByTsOptions | undefined): Promise<StreamedMessages> {
        const currentMessagesForRoom = this.messages.get(roomId) || [];
        if (!options || currentMessagesForRoom.length == 0) {
            return {
                success: true,
                messages: Array.from(currentMessagesForRoom.values())
            };
        }

        const start = options.startTs || 0;
        const end = options.endTs || Number.MAX_SAFE_INTEGER;
        const messagesForTs = currentMessagesForRoom.filter((mappedMessage: MessagePersistenceMappedMessage) => {
            if (mappedMessage.ts >= start && mappedMessage.ts <= end) {
                    return mappedMessage;
            }
        }).sort((a, b) => a.ts - b.ts).slice(currentMessagesForRoom.length - (options.limit || 0));
        const lateMessages = currentMessagesForRoom.filter((mappedMessage: MessagePersistenceMappedMessage) => {
            if (mappedMessage.late && !mappedMessage.read && mappedMessage.from != userId) {
                return mappedMessage;
            }
        });
        const agg = [...messagesForTs, ...lateMessages];
        return {
            success: true,
            messages: agg
        };
    }

    public async streamMessagesById(userId: string, roomId: string, options: MessagePersistenceStreambyIdsOptions): Promise<StreamedMessages> {
        throw new NotImplementedError("streamMessagesById");
    }

    public async updateReadOnMessages(userId: string, roomId: string, messageIds: string[]): Promise<boolean> {
        const messagesForRoom = this.messages.get(roomId) || [];
        if (messagesForRoom.length == 0) {
            return false;
        }

        for (const messageId of messageIds) {
            const messageIndex = messagesForRoom.findIndex((mappedMessage: MessagePersistenceMappedMessage, index: number) => {
                if (mappedMessage.id === messageId && mappedMessage.channel === userId) {
                    return index;
                }
            });

            if (messageIndex != -1) {
                messagesForRoom[messageIndex].read = true;
            }
        }

        return true;
    }

    public static getInstance(): LocalMessagePersistenceEngine {
        if (LocalMessagePersistenceEngine.instance == null) {
            throw new Error("Must run init before accessing instance");
        }

        return LocalMessagePersistenceEngine.instance;
    }
}