import { MessagePersistenceMappedMessage } from "./persistence.types";
import { MessageContentType } from "./ws.enums";

export type WSMessage = {
    content: string;
    type: MessageContentType;
    channel: string;
    ts: number;
}

export type ChatConnectionOptions = {
    userId: string;
    channel: string;
    limit: number;
}

export type ChatConnectionAck = {
    success: boolean,
    failureReason?: string;
    messages: MessagePersistenceMappedMessage[];
    channelSocketId: string;
    channel: string;
}

export type AcknowledgeMessagesOptions = {
    channel: string;
    messageIds: string[];
}

export type AcknowledgeMessagesAck = {
    success: boolean;
}

export type ReadMessagesOptions = {
    channel: string,
    limit: number;
    startTs?: number;
    endTs?: number;
}