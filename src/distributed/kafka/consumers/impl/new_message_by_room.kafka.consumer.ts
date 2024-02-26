import { Consumer, EachMessagePayload, Kafka } from "kafkajs";


import { KafkaConsumerType, KafkaTopics } from "../../../../types/kafka.enums";
import { WSHandler } from "../../../../server/ws/ws.handler";
import { AppContainer } from "../../../../containers/app.container";
import LOGGER from "../../../../utilities/logger";
import { NewMessageByRoomKafkaMessage } from "../../../../types/kafka.types";
import { WebsocketEvent } from "../../../../types/ws.enums";
import { BaseSingleReadKafkaConsumer } from "../base/base_single_read.kafka.consumer";

export class NewMessageByRoomConsumer extends BaseSingleReadKafkaConsumer {
    public static TYPE: KafkaConsumerType = KafkaConsumerType.NEW_MESSAGES_BY_ROOM;
    public static ROOM_ID: string = "UNSET";

    private wsHandler: WSHandler;

    protected constructor(protected consumer: Consumer, protected groupId: string, protected topic: string, protected client: Kafka) {
        super(consumer, [topic], groupId, client);
        this.wsHandler = AppContainer.getInstance().chatServer.getWsHandler();
    }

    public static async init(client: Kafka, groupId: string, roomId: string): Promise<NewMessageByRoomConsumer> {
        const consumer = client.consumer({ groupId, allowAutoTopicCreation: true });
        NewMessageByRoomConsumer.ROOM_ID = roomId;
        const topic = KafkaTopics.NEW_MESSAGES_BY_ROOM+roomId;
        return new NewMessageByRoomConsumer(consumer, groupId, topic, client);
    }

    protected async handleEachMessage(payload: EachMessagePayload): Promise<void> {
        if (payload.topic.startsWith(KafkaTopics.NEW_MESSAGES_BY_ROOM)) {
            await this.handleNewMessagesByRoom(payload);
        } else {
            LOGGER.error(`No handler for topic ${payload.topic}`);
        }
    }

    protected async handleNewMessagesByRoom({topic, partition, message}: EachMessagePayload): Promise<void> {
        LOGGER.info({
            topic,
            partition,
            key: message.key?.toString(),
        });

        if (message.value == null) {
            LOGGER.warn("No messages seen in kafka consumer read");
            return;
        }

        const parsedMessage = JSON.parse(message.value!.toString()) as NewMessageByRoomKafkaMessage;
        const roomId = parsedMessage.roomId;
        const messagesForSocket = await this.wsHandler.getPersistenceEngine().streamMessagesById(
            "", roomId, { messageIds: [parsedMessage.id], limit: 10 }
        );
        

        LOGGER.info(`Emitting new messages to room with ID ${roomId}`);
        this.wsHandler.getSocketServer().to(roomId).emit(WebsocketEvent.MESSAGES_STREAM, messagesForSocket);
    }
}