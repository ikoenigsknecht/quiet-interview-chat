import { Kafka } from "kafkajs";


import { KafkaProducerMap, KafkaProducerClassDefinition, InstanceOfKafkaProducerClass } from "../../../types/kafka.types";
import { KafkaProducerType } from "../../../types/kafka.enums";
import { BaseKafkaProducer } from "./base/base.kafka.producer";
import LOGGER from "../../../utilities/logger";
import { NewMessageByRoomProducer } from "./impl/new_message_by_room.kafka.producer";

export class KafkaProducerContainer {
    private constructor(
        private producerMap: KafkaProducerMap
    ) {}

    public static async init(client: Kafka): Promise<KafkaProducerContainer> {
        LOGGER.info("Initializing KafkaProducerContainer");
        const producerMap = await KafkaProducerContainer.registerProducers(client);
        return new KafkaProducerContainer(producerMap);
    }

    private static async registerProducers(client: Kafka): Promise<KafkaProducerMap> {
        const producers: KafkaProducerMap = new Map();
        const producerClasses = [
            NewMessageByRoomProducer
        ];

        for (const producerClass of producerClasses) {
            LOGGER.info(`Initializing producer with class ${producerClass.name}`);
            const producer = await producerClass.init(client);
            await producer.connect();
            producers.set(producerClass.TYPE, producer);
        }
        return producers;
    }

    public getProducerMap(): KafkaProducerMap {
        return this.producerMap;
    }

    public getProducer<
        T extends BaseKafkaProducer, 
        CLASS_T = KafkaProducerClassDefinition<T>,
    >(type: KafkaProducerType): InstanceOfKafkaProducerClass<CLASS_T> {
        const producer = this.producerMap.get(type);
        if (!producer) {
            throw new Error(`No kafka producer registered for type ${type}`);
        }

        return producer as unknown as InstanceOfKafkaProducerClass<CLASS_T>;
    }
}