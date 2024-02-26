import { Kafka, Producer, ProducerBatch, ProducerConfig, ProducerRecord, RecordMetadata } from "kafkajs";
import { NotImplementedError } from "../../../../utilities/errors";

export class BaseKafkaProducer {
    protected constructor(protected producer: Producer,  protected client: Kafka) {}

    public static async init(client: Kafka, config: ProducerConfig = {}): Promise<BaseKafkaProducer> {
        throw new NotImplementedError("init");
    }

    public async connect(): Promise<BaseKafkaProducer> {
        await this.producer.connect();
        return this;
    }

    public async send(record: ProducerRecord): Promise<RecordMetadata[]> {
        const metadata = await this.producer.send(record);
        return metadata;
    }

    public async sendBatch(batch: ProducerBatch): Promise<RecordMetadata[]> {
        const metadata = await this.producer.sendBatch(batch);
        return metadata;
    }
}