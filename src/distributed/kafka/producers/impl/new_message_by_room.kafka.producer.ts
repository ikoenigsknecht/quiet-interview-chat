import { Kafka, Message, RecordMetadata } from "kafkajs";

import { BaseKafkaProducer } from "../base/base.kafka.producer";
import { KafkaTopics, KafkaProducerType } from "../../../../types/kafka.enums";
import { NewMessageByRoomKafkaMessage } from "../../../../types/kafka.types";
import LOGGER from "../../../../utilities/logger";

export class NewMessageByRoomProducer extends BaseKafkaProducer {
    public static TYPE: KafkaProducerType = KafkaProducerType.NEW_MESSAGES;
    
    public static async init(client: Kafka): Promise<NewMessageByRoomProducer> {
        const producer = client.producer({
            allowAutoTopicCreation: true,
            transactionTimeout: 30000
        });
        return new NewMessageByRoomProducer(producer, client);
    }

    public async sendNewMessageForRoom(key: string, roomId: string, wsMessages: NewMessageByRoomKafkaMessage[]): Promise<RecordMetadata[]> {
        LOGGER.info(`Sending message to kafka with key ${key} for room ${roomId}`);
        return this.send({
            topic: KafkaTopics.NEW_MESSAGES_BY_ROOM+roomId,
            messages: NewMessageByRoomProducer.normalizeMessages(key, wsMessages)
        });
    }

    private static normalizeMessages(key: string, wsMessages: NewMessageByRoomKafkaMessage[]): Message[] {
        return wsMessages.map(wsMessage => {
            return { key, value: JSON.stringify(wsMessage) };
        })
    }
}