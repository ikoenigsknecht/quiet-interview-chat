import { NotImplementedError } from "../../utilities/errors";

export class ConnectionPersistencePrototype<T> {
    protected constructor(...args: any[]) {}

    public static async init<T>(...args: any[]): Promise<ConnectionPersistencePrototype<T>> {
        throw new NotImplementedError("init");
    }

    public async persistConnection(socketId: string, userId: string, serverId: string) {
        throw new NotImplementedError("persistConnection");
    }

    public async removeConnection(socketId: string, serverId: string) {
        throw new NotImplementedError("removeConnection");
    }

    public async getConnection(socketId: string, serverId: string): Promise<T | undefined> {
        throw new NotImplementedError("getConnection")
    }
}