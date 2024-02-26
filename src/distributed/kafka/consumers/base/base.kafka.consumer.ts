import { Consumer, Kafka } from "kafkajs";

import { KafkaConsumerType } from "../../../../types/kafka.enums";
import { NotImplementedError } from "../../../../utilities/errors";
import LOGGER from "../../../../utilities/logger";

export class BaseKafkaConsumer {
    public static TYPE: KafkaConsumerType = KafkaConsumerType.BASE;

    protected constructor(protected consumer: Consumer, protected topics: string[], protected groupId: string, protected client: Kafka) {}

    public static async init(client: Kafka, groupId: string, ...params: any[]): Promise<BaseKafkaConsumer> {
        throw new NotImplementedError("init");
    }

    public async connect(): Promise<BaseKafkaConsumer> {
        await this.consumer.connect();
        return this;
    }

    public async subscribe(fromBeginning: boolean = true) {
        LOGGER.info(`Subscribing to topics ${this.topics}`);
        await this.consumer.subscribe({ topics: this.topics, fromBeginning });
    }

    public async run() {
        throw new NotImplementedError("run");
    }
}