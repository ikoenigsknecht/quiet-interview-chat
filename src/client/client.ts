import { Socket, io } from "socket.io-client";
import LOGGER from "../utilities/logger";
import { registerChatListeners } from "./chat/chat";
import { WebsocketEvent } from "../types/ws.enums";
import { ChatConnectionAck, ChatConnectionOptions, ReadMessagesOptions, WSMessage } from "../types/ws.types";
import { delay } from "../utilities/misc";
import { StreamedMessages } from "../types/persistence.types";

export class WSClient {
    private static roomMap = new Map<string, string>();

    private constructor(private socket: Socket, private userId: string, private limit: number) {}

    public static async init(userId: string, limit: number): Promise<WSClient> {
        const socket = io("ws://localhost:8080/", {
            reconnectionDelayMax: 10000,
            transports: ["websocket"]
        });
        WSClient.initListeners(socket, userId, limit);
        return new WSClient(socket, userId, limit);
    }

    private static initListeners(socket: Socket, userId: string, limit: number): void {
         LOGGER.info("Initializing WS listeners");
         registerChatListeners(socket, userId, limit);
     }

    public static updateRoomMap(channel: string, roomId: string) {
        this.roomMap.set(channel, roomId);
    }

    public async connect(channel: string): Promise<ChatConnectionAck> {
        const options: ChatConnectionOptions = {
            userId: this.userId,
            channel,
            limit: this.limit
        }
        let tries = 0;
        let ack: ChatConnectionAck | undefined;
        while (tries < 3) {
            ack = await this.socket.timeout(20000).emitWithAck(WebsocketEvent.CHAT_CONNECT, options) as ChatConnectionAck;
            if (ack.success) {
                WSClient.updateRoomMap(ack.channel, ack.channelSocketId);
                LOGGER.info(JSON.stringify(ack, null, 2));
                return ack;
            } else {
                const retryMs = 2500;
                LOGGER.info(`Retrying connect in ${retryMs}ms...`);
                await delay(retryMs);
            }
            tries++;
        }
        return ack!;
    }

    public async sendMessage(message: WSMessage) {
       const ack = await this.socket.emitWithAck(WebsocketEvent.NEW_MESSAGE, message)
    //    LOGGER.info(JSON.stringify(ack, null, 2));
    }

    public async readMessages(options: ReadMessagesOptions): Promise<StreamedMessages> {
        const ack = await this.socket.emitWithAck(WebsocketEvent.READ_MESSAGES, options);
        // LOGGER.info(JSON.stringify(ack, null, 2));
        return ack
    }

    public async close() {
        this.socket.disconnect();
    }

    public getId(): string {
        return this.userId;
    }
}