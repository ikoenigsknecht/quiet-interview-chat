import { Socket } from "socket.io";
import { ConnectionPersistencePrototype } from "../../../../persistence/connection/connection.persistence.prototype";
import LOGGER from "../../../../utilities/logger";
import { AppContainer } from "../../../../containers/app.container";

export class DisconnectService {
    private constructor(
        private connPersistenceEngine: ConnectionPersistencePrototype<any>
    ) {}

    public static init(
        connPersistenceEngine: ConnectionPersistencePrototype<any>
    ): DisconnectService {        
        return new DisconnectService(connPersistenceEngine);
    }

    public async disconnect(reason: string, socket: Socket) {
        LOGGER.info(`Socket connection with ID ${socket.id} disconnected due to ${reason}`);
        await this.connPersistenceEngine.removeConnection(socket.id, this.getServerId())
    }

    private getServerId(): string {
        return AppContainer.getInstance().chatServer.getServerId();
    }
}