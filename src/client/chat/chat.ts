import { Socket } from "socket.io-client";
import { DateTime } from "luxon";

import { WebsocketEvent } from "../../types/ws.enums";
import { StreamedMessages } from "../../types/persistence.types";
import LOGGER from "../../utilities/logger";
import { mean } from "lodash";

export function registerChatListeners(socket: Socket, userId: string, limit: number) {
    let delays: number[] = [];

    async function streamMessages(messages: StreamedMessages) {
        // LOGGER.info(userId, JSON.stringify(messages, null, 2));
        for (const message of messages.messages) {
            const now = DateTime.now().toMillis();
            delays.push(now - message.ts);
        }
        if (delays.length > 1000) {
            LOGGER.info(`Avg stream delay = ${mean(delays)}`);
            delays = [];
        }
    }

    socket.on(WebsocketEvent.MESSAGES_STREAM, streamMessages);
}