import { Kafka, KafkaConfig } from 'kafkajs';

import { KafkaProducerContainer } from './producers/producer.kafka.container';
import { KafkaConsumerContainer } from './consumers/consumer.kafka.container';
import LOGGER from '../../utilities/logger';
import { EnvVars } from '../../utilities/env/env_vars';
import { EnvVarHandler } from '../../utilities/env/env_var.handler';
import { generateUuidWithNoDashes } from '../../utilities/ids';


export class KafkaHandler {
    private constructor(
        private client: Kafka, 
        private consumerContainer: KafkaConsumerContainer, 
        private producerContainer: KafkaProducerContainer, 
        private clientId: string, 
        private groupId: string
    ) {}

    public static async init(customGroupId?: string): Promise<KafkaHandler> {
        LOGGER.info("Initializing KafkaHandler");
        const clientId = generateUuidWithNoDashes();
        const groupId = customGroupId || clientId;
        const envVarHandler = EnvVarHandler.getInstance();
        const kafkaConfig: KafkaConfig = { 
            brokers: envVarHandler.getString(EnvVars.KAFKA_BROKERS, "")!.split(","),
            clientId
        }
        const client = new Kafka(kafkaConfig);
        const consumerContainer = await KafkaHandler.registerConsumers(client, groupId);
        const producerContainer = await KafkaHandler.registerProducers(client);

        return new KafkaHandler(client, consumerContainer, producerContainer, clientId, groupId);
    }

    private static async registerConsumers(client: Kafka, groupId: string): Promise<KafkaConsumerContainer> {
        return KafkaConsumerContainer.init(client, groupId);
    }

    private static async registerProducers(client: Kafka): Promise<KafkaProducerContainer> {
        return KafkaProducerContainer.init(client);
    }

    public getClientId(): string {
        return this.clientId;
    }

    public getGroupId(): string {
        return this.groupId;
    }

    public getConsumerContainer(): KafkaConsumerContainer {
        return this.consumerContainer;
    }

    public getProducerContainer(): KafkaProducerContainer {
        return this.producerContainer;
    }
}
