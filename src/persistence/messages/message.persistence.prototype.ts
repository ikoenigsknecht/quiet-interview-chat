import { MessagePersistenceMappedMessage, MessagePersistencePersistAck, MessagePersistenceStreamByTsOptions, MessagePersistenceStreambyIdsOptions, StreamedMessages } from "../../types/persistence.types";
import { WSMessage } from "../../types/ws.types";
import { NotImplementedError } from "../../utilities/errors";

export class MessagePersistencePrototype {
    public static instance: MessagePersistencePrototype;

    protected constructor() {}

    public static init(...args: any[]): MessagePersistencePrototype {
        throw new NotImplementedError("init");
    }

    public async initializeMessagePersistenceForRoom(roomId: string): Promise<boolean> {
        throw new NotImplementedError("initializeMessagePersistenceForRoom");
    }

    public async persistMessage(userId: string, roomId: string, message: WSMessage): Promise<MessagePersistenceMappedMessage | undefined> {
        throw new NotImplementedError("persistMessage");
    }

    public async streamMessagesByTs(userId: string, roomId: string, options?: MessagePersistenceStreamByTsOptions): Promise<StreamedMessages> {
        throw new NotImplementedError("streamMessagesByTs");
    }

    public async streamMessagesById(userId: string, roomId: string, options: MessagePersistenceStreambyIdsOptions): Promise<StreamedMessages> {
        throw new NotImplementedError("streamMessagesById");
    }

    public async updateReadOnMessages(userId: string, roomId: string, messageIds: string[]): Promise<boolean> {
        throw new NotImplementedError("updateReadOnMessages");
    }

    public static getInstance<T>(): MessagePersistencePrototype {
        if (!MessagePersistencePrototype.instance) {
            throw new Error("Must initialize message persistence engine using init before fetching instance");
        }

        return MessagePersistencePrototype.instance;
    }
}