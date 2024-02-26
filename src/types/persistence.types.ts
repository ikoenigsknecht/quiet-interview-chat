import { MessageContentType } from "./ws.enums";
import { WSMessage } from "./ws.types";

export type MessagePersistencePersistAck = {
    success: boolean;
    failureReason?: string;
    id?: string;
};

export type MessagePersistenceBaseStreamByOptions = {
    limit?: number;
};

export type MessagePersistenceStreamByTsOptions = {
    startTs?: number;
    endTs?: number;
} & MessagePersistenceBaseStreamByOptions;

export type MessagePersistenceStreambyIdsOptions = {
    messageIds: string[];
} & MessagePersistenceBaseStreamByOptions;

export type MessagePersistenceMappedMessage = {
    id: string;
    ts: number;
    read: boolean;
    late: boolean;
    channel: string;
    from: string;
    message: {
        content: string;
        type: MessageContentType;
    };
}

export type StreamedMessages = {
    success: boolean;
    failureReason?: string;
    messages: MessagePersistenceMappedMessage[];
}

export type LocalMessagePersistenceMessageMap = Map<string, MessagePersistenceMappedMessage[]>;