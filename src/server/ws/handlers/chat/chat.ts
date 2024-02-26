import { Server, Socket } from "socket.io";

import LOGGER from '../../../../utilities/logger';
import { ChatService } from "./chat.service";
import { ChatConnectionOptions, AcknowledgeMessagesOptions, WSMessage, ReadMessagesOptions } from "../../../../types/ws.types";
import { WebsocketEvent } from "../../../../types/ws.enums";

export async function registerChatHandlers(
    socketServer: Server, 
    socket: Socket, 
    chatService: ChatService,
): Promise<void> {
    LOGGER.info("registering chat events");

    async function connectWithUser(message: ChatConnectionOptions, callback: (...args: any[]) => void) {
        await chatService.connectWithUser(message, socket, callback);
    }

    async function newMessage(message: WSMessage, callback: (...args: any[]) => void) {
        await chatService.newMessage(message, socket, callback);
    }

    async function readMessages(message: ReadMessagesOptions, callback: (...args: any[]) => void) {
        await chatService.readMessages(message, socket, callback);
    }

    async function acknowledgeMessages(message: AcknowledgeMessagesOptions, callback: (...args: any[]) => void) {
        await chatService.acknowledgeMessages(message, socket, callback);
    }
  
    // register event handlers
    socket.on(WebsocketEvent.CHAT_CONNECT, connectWithUser);
    socket.on(WebsocketEvent.NEW_MESSAGE, newMessage);
    socket.on(WebsocketEvent.READ_MESSAGES, readMessages);
    socket.on(WebsocketEvent.ACKNOWLEDGE_MESSAGES, acknowledgeMessages);
}