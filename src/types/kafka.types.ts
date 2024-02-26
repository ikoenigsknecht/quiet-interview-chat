import { BaseKafkaConsumer } from "../distributed/kafka/consumers/base/base.kafka.consumer";
import { NewMessageByRoomConsumer } from "../distributed/kafka/consumers/impl/new_message_by_room.kafka.consumer";
import { BaseKafkaProducer } from "../distributed/kafka/producers/base/base.kafka.producer";
import { KafkaConsumerType, KafkaProducerType } from "./kafka.enums";

export type KafkaProducerMap = Map<KafkaProducerType, BaseKafkaProducer>;
export type KafkaProducerClassDefinition<T extends BaseKafkaProducer> = { prototype: T };
export type InstanceOfKafkaProducerClass<T> = T extends { prototype: infer R } ? R : never;

export type KafkaConsumerMap = {
    default: Map<KafkaConsumerType, BaseKafkaConsumer>,
    rooms: Map<string, NewMessageByRoomConsumer>
};
export type KafkaConsumerClassDefinition<T extends BaseKafkaConsumer> = { prototype: T };
export type InstanceOfKafkaConsumerClass<T> = T extends { prototype: infer R } ? R : never;

export type NewMessageByRoomKafkaMessage = {
    ts: number;
    id: string;
    roomId: string;
}