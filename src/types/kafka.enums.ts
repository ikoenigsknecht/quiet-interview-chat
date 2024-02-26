export enum KafkaTopics {
    NEW_MESSAGES_BY_ROOM="new-messages-room-",
    NEW_MESSAGES_BY_ROOM_PATTERN="/new-messages\-room\-.*/"
}

export enum KafkaProducerType {
    BASE="BASE",
    NEW_MESSAGES="NEW_MESSAGES"
}

export enum KafkaConsumerType {
    BASE="BASE",
    NEW_MESSAGES_BY_ROOM="NEW_MESSAGES_BY_ROOM"
}