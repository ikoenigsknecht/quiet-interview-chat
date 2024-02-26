import { Kafka } from "kafkajs";

import { KafkaConsumerMap, KafkaConsumerClassDefinition, InstanceOfKafkaConsumerClass } from "../../../types/kafka.types";
import { KafkaConsumerType } from "../../../types/kafka.enums";
import { BaseKafkaConsumer } from "./base/base.kafka.consumer";
import LOGGER from "../../../utilities/logger";
import { NewMessageByRoomConsumer } from "./impl/new_message_by_room.kafka.consumer";

export class KafkaConsumerContainer {
    private static defaultConsumerClasses: any[] = [];

    private constructor(
        private consumerMap: KafkaConsumerMap,
        private groupId: string,
        private client: Kafka
    ) {}

    public static async init(client: Kafka, groupId: string): Promise<KafkaConsumerContainer> {
        LOGGER.info("Initializing KafkaConsumerContainer");
        const consumerMap = await KafkaConsumerContainer.registerConsumers(client, groupId);
        return new KafkaConsumerContainer(consumerMap, groupId, client);
    }

    private static async registerConsumers(client: Kafka, groupId: string): Promise<KafkaConsumerMap> {
        const consumers: KafkaConsumerMap = {
            default: new Map(),
            rooms: new Map()
        };

        for (const consumerClass of KafkaConsumerContainer.defaultConsumerClasses) {
            LOGGER.info(`Initializing default consumer with class ${consumerClass.name}`);
            const consumer = await consumerClass.init(client, groupId);
            LOGGER.info(`Connecting consumer ${consumerClass.name}`);
            await consumer.connect();
            LOGGER.info(`Subscribing consumer ${consumerClass.name}`);
            await consumer.subscribe(true);
            LOGGER.info(`Running consumer ${consumerClass.name}`);
            await consumer.run();
            consumers.default.set(consumerClass.TYPE, consumer);
        }
        return consumers;
    }

    public async registerRoomConsumer(roomId: string): Promise<boolean> {
        try {
            if (this.consumerMap.rooms.has(roomId)) {
                LOGGER.info(`Consumer for room ${roomId} already registered!`);
                return true;
            }

            LOGGER.info(`Initializing room consumer with class ${NewMessageByRoomConsumer.name} and ID ${roomId}`);
            const consumer = await NewMessageByRoomConsumer.init(this.client, this.groupId, roomId);
            LOGGER.info(`Connecting consumer ${NewMessageByRoomConsumer.name} with ID ${roomId}`);
            await consumer.connect();
            LOGGER.info(`Subscribing consumer ${NewMessageByRoomConsumer.name} with ID ${roomId}`);
            await consumer.subscribe(false);
            LOGGER.info(`Running consumer ${NewMessageByRoomConsumer.name} with ID ${roomId}`);
            await consumer.run();
            this.consumerMap.rooms.set(roomId, consumer);
            return true;
        } catch (e) {
            LOGGER.error("Error while setting up consumer", e);
            return false;
        }
    }

    public getConsumerMap(): KafkaConsumerMap {
        return this.consumerMap;
    }

    public getDefaultConsumer<
        T extends BaseKafkaConsumer, 
        CLASS_T = KafkaConsumerClassDefinition<T>,
    >(type: KafkaConsumerType): InstanceOfKafkaConsumerClass<CLASS_T> {
        const consumer = this.consumerMap.default.get(type);
        if (!consumer) {
            throw new Error(`No default kafka consumer registered for type ${type}`);
        }

        return consumer as unknown as InstanceOfKafkaConsumerClass<CLASS_T>;
    }

    public getRoomConsumer(roomId: string): NewMessageByRoomConsumer {
        const consumer = this.consumerMap.rooms.get(roomId);
        if (!consumer) {
            throw new Error(`No message by room ID kafka consumer registered for room ID ${roomId}`);
        }

        return consumer;
    }

    public removeRoomConsumer(roomId: string) {
        const hasConsumer = this.consumerMap.rooms.has(roomId);
        if (!hasConsumer) {
            throw new Error(`No message by room ID kafka consumers registered for room ID`);
        }

        this.consumerMap.rooms.delete(roomId);
    }
}