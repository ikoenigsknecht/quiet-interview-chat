import { EachBatchPayload } from "kafkajs";
import { BaseKafkaConsumer } from "./base.kafka.consumer";
import { NotImplementedError } from "../../../../utilities/errors";

export class BaseBatchKafkaConsumer extends BaseKafkaConsumer {
    public async run() {
        const eachBatch = this.handleBatch.bind(this);
        await this.consumer.run({
            eachBatch,
        });
    }

    protected async handleBatch({
        batch: {
            topic,
            partition,
            messages
        }
    }: EachBatchPayload): Promise<void> {
        throw new NotImplementedError("handleBatch");
    }
}