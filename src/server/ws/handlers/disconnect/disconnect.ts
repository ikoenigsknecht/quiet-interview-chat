import { Server, Socket } from "socket.io";

import LOGGER from '../../../../utilities/logger';
import { WebsocketEvent } from "../../../../types/ws.enums";
import { DisconnectService } from "./disconnect.service";

export function registerDisconnectHandlers(
    socketServer: Server, 
    socket: Socket, 
    disconnectService: DisconnectService
): void {
    LOGGER.info("Registering disconnect events");

    async function disconnect(reason: string) {
        await disconnectService.disconnect(reason, socket);
    }

    socket.on(WebsocketEvent.DISCONNECT, disconnect);
}