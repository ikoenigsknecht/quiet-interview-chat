import { KafkaProducerType } from "../../types/kafka.enums";
import { KafkaHandler } from "../kafka/kafka.handler";
import { NewMessageByRoomProducer } from "../kafka/producers/impl/new_message_by_room.kafka.producer";
import { MessageDistributerPrototype } from "./message.distributed.prototype";
import { NewMessageByRoomKafkaMessage } from "../../types/kafka.types";
import LOGGER from "../../utilities/logger";
import { MessagePersistenceMappedMessage } from "../../types/persistence.types";
import { ChatService } from "../../server/ws/handlers/chat/chat.service";

export class KafkaMessageDistributer implements MessageDistributerPrototype {
    protected constructor(private kafkaHandler: KafkaHandler, private newMessageProducer: NewMessageByRoomProducer) {}

    public static async init(): Promise<KafkaMessageDistributer> {
        const kafkaHandler = await KafkaHandler.init();
        const producer = kafkaHandler.getProducerContainer().getProducer<NewMessageByRoomProducer>(KafkaProducerType.NEW_MESSAGES);
        return new KafkaMessageDistributer(kafkaHandler, producer);
    }

    public async setupListenerForUser(userId: string, roomId: string): Promise<boolean> {
        return this.kafkaHandler.getConsumerContainer().registerRoomConsumer(roomId);
    }

    public async teardownListenerForUser(userId: string, roomId: string) {
        this.kafkaHandler.getConsumerContainer().removeRoomConsumer(roomId);
    }

    public async distributeMessage(roomId: string, message: MessagePersistenceMappedMessage) {
        LOGGER.info(`Distributing message with ID ${message.id} to kafka topic for room ${roomId}`);
        try {
            const key = message.id;
            const kafkaMessages = await KafkaMessageDistributer.messagesToKafkaMessages([message]);
            await this.newMessageProducer.sendNewMessageForRoom(key, roomId, kafkaMessages)
        } catch (e) {
            LOGGER.error("Error while distributing message to Kafka", e);
        }
    }

    private static async messagesToKafkaMessages(messages: MessagePersistenceMappedMessage[]): Promise<NewMessageByRoomKafkaMessage[]> {
        return Promise.all(messages.map(async (message: MessagePersistenceMappedMessage) => {
            const roomId = await ChatService.generateChatRoomId(message.from, message.channel);
            return {
                id: message.id,
                roomId: roomId,
                ts: message.ts
            }
        }));
    }
}