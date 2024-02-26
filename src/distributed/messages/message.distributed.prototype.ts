import { MessagePersistenceMappedMessage } from "../../types/persistence.types";
import { NotImplementedError } from "../../utilities/errors";

export class MessageDistributerPrototype {
    protected constructor(...args: any[]) {}

    public static async init(...args: any[]): Promise<MessageDistributerPrototype> {
        throw new NotImplementedError("init");
    }

    public async setupListenerForUser(userId: string, roomId: string): Promise<boolean> {
        throw new NotImplementedError("setupListenerForUser")
    }

    public async teardownListenerForUser(userId: string, roomId: string) {
        throw new NotImplementedError("teardownListenerForUser")
    }

    public async distributeMessage(roomId: string, message: MessagePersistenceMappedMessage) {
        throw new NotImplementedError("distributeMessage")
    }
}