import { Socket } from "socket.io";

import { MessagePersistencePrototype } from "../../../../persistence/messages/message.persistence.prototype";
import { ChatConnectionAck, ChatConnectionOptions, AcknowledgeMessagesOptions, WSMessage, ReadMessagesOptions, AcknowledgeMessagesAck } from "../../../../types/ws.types";
import LOGGER from "../../../../utilities/logger";
import { MessageDistributerPrototype } from "../../../../distributed/messages/message.distributed.prototype";
import { ConnectionPersistencePrototype } from "../../../../persistence/connection/connection.persistence.prototype";
import { AppContainer } from "../../../../containers/app.container";
import { MessagePersistencePersistAck, StreamedMessages } from "../../../../types/persistence.types";
import * as crypto from 'crypto';

export class ChatService {
    private constructor(
        private persistenceEngine: MessagePersistencePrototype, 
        private distributionEngine: MessageDistributerPrototype, 
        private connPersistenceEngine: ConnectionPersistencePrototype<any>
    ) {}

    public static init(
        persistenceEngine: MessagePersistencePrototype, 
        distributionEngine: MessageDistributerPrototype, 
        connPersistenceEngine: ConnectionPersistencePrototype<any>
    ): ChatService {        
        return new ChatService(persistenceEngine, distributionEngine, connPersistenceEngine);
    }

    public async connectWithUser(connectionOptions: ChatConnectionOptions, socket: Socket, callback: (...args: any[]) => void) {
        LOGGER.info(`New chat connection between ${connectionOptions.userId} and ${connectionOptions.channel}`);
        
        const roomId = await ChatService.generateChatRoomId(connectionOptions.userId, connectionOptions.channel);
        LOGGER.info(`Connecting ${connectionOptions.userId} to room ${roomId}`);
        socket.join(roomId);

        LOGGER.info(`Persisting connection information for socket ${socket.id}`);
        await this.connPersistenceEngine.persistConnection(socket.id, connectionOptions.userId, this.getServerId());

        LOGGER.info(`Ensuring persistence is intialized for room ${roomId}`);
        await this.persistenceEngine.initializeMessagePersistenceForRoom(roomId);

        LOGGER.info(`Ensuring distributer is initialized for user on room ${roomId}`);
        const consumerSuccess = await this.distributionEngine.setupListenerForUser(connectionOptions.userId, roomId);
        if (!consumerSuccess) {
            const ack: ChatConnectionAck = {
                success: false,
                failureReason: "Distributer failure",
                channelSocketId: roomId,
                channel: connectionOptions.channel,
                messages: []
            };
            socket.leave(roomId);
            callback(ack);
            return;
        }

        LOGGER.info(`Getting latest ${connectionOptions.limit} messages and unread late messages for ${roomId}`);
        const output = await this.persistenceEngine.streamMessagesByTs(connectionOptions.userId, roomId, { limit: connectionOptions.limit });

        LOGGER.info(`Sending chat connect ack to ${connectionOptions.userId}`);
        const ack: ChatConnectionAck = {
            ...output,
            channelSocketId: roomId,
            channel: connectionOptions.channel
        };

        callback(ack);
    }

    public async acknowledgeMessages(message: AcknowledgeMessagesOptions, socket: Socket, callback: (...args: any[]) => void) {
        const userId = await this.getPersistedUserId(socket);
        const roomId = await ChatService.generateChatRoomId(userId, message.channel);
        LOGGER.info(`Messages read by ${userId} on room ID ${roomId}`);
        const success = await this.persistenceEngine.updateReadOnMessages(
            userId, 
            roomId, 
            message.messageIds
        );
        callback({ success } as AcknowledgeMessagesAck);
    }

    public async newMessage(message: WSMessage, socket: Socket, callback: (...args: any[]) => void) {
        const userId = await this.getPersistedUserId(socket);
        const roomId = await ChatService.generateChatRoomId(userId, message.channel);
        LOGGER.info(`New message from ${userId} to ${message.channel} on room ID ${roomId}`);
        const persistedMessage = await this.persistenceEngine.persistMessage(userId, roomId, message);
        if (!persistedMessage) {
            callback({ success: false } as MessagePersistencePersistAck);
            return;
        }

        await this.distributionEngine.distributeMessage(roomId, persistedMessage);
        callback({ success: true, id: persistedMessage.id } as MessagePersistencePersistAck);
    }

    public async readMessages(message: ReadMessagesOptions, socket: Socket, callback: (...args: any[]) => void) {
        const userId = await this.getPersistedUserId(socket);
        const roomId = await ChatService.generateChatRoomId(userId, message.channel);
        LOGGER.info(`User ${userId} wants to read ${message.limit} messages on room ID ${roomId}`);
        const output = await this.persistenceEngine.streamMessagesByTs(userId, roomId, {
            startTs: message.startTs,
            endTs: message.endTs,
            limit: message.limit
        });
        callback(output as StreamedMessages);
    }
    
    public static async generateChatRoomId(from: string, channel: string): Promise<string> {
        const pair = [from, channel].sort().toString();
        return crypto.createHash("md5").update(pair).digest("hex");
    }

    private getServerId(): string {
        return AppContainer.getInstance().chatServer.getServerId();
    }
    
    public async getPersistedUserId(socket: Socket): Promise<string> {
        return this.connPersistenceEngine.getConnection(socket.id, this.getServerId());
    }
}