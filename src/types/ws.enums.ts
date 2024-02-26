export enum WebsocketEvent {
    DISCONNECT="disconnect",
    CHAT_CONNECT="chat-connect",
    CHAT_CONNECT_ACK="chat-connect-ack",
    NEW_MESSAGE="new-message",
    NEW_MESSAGE_ACK="new-message-ack",
    ACKNOWLEDGE_MESSAGES="acknowledge-messages",
    ACKNOWLEDGE_MESSAGES_ACK="acknowledge-messages-ack",
    READ_MESSAGES="read-messages",
    READ_MESSAGES_ACK="read-messages-ack",
    MESSAGES_STREAM="messages-stream"
}

export enum MessageContentType {
    TEXT="TEXT",
    IMAGE="IMAGE",
    VIDEO="VIDEO"
}