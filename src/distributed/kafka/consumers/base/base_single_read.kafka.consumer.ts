import { EachMessagePayload } from "kafkajs";
import { BaseKafkaConsumer } from "./base.kafka.consumer";
import { NotImplementedError } from "../../../../utilities/errors";

export class BaseSingleReadKafkaConsumer extends BaseKafkaConsumer {
    public async run() {
        const eachMessage = this.handleEachMessage.bind(this);
        await this.consumer.run({
            eachMessage,
        });
    }

    protected async handleEachMessage({topic, partition, message}: EachMessagePayload): Promise<void> {
        throw new NotImplementedError("handleEachMessage");
    }
}