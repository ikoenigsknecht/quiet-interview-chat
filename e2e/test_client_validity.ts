import { DateTime } from "luxon";

import { WSClient } from "../src/client/client";
import { MessageContentType } from "../src/types/ws.enums";
import { generateUuidWithNoDashes } from "../src/utilities/ids";
import LOGGER from "../src/utilities/logger";
import _, { sortBy } from "lodash";
import { deepEqual } from "assert";
import { StreamedMessages } from "../src/types/persistence.types";

const clientIds: string[] = [];
const clients: Map<string, WSClient> = new Map();
const pairs: string[][] = [];

async function initClients(numClients: number = 2) {
    if (numClients < 2 || numClients % 2 != 0) {
        throw new Error("numClients must be >= 2 and even to ensure valid pairing");
    }

    for (let i = 0; i < numClients; i++) {
        const userId = generateUuidWithNoDashes();
        const client = await WSClient.init(userId, 10);
        clientIds.push(client.getId());
        clients.set(client.getId(), client);
    }
}

function pairClients() {
    for (let i = 0; i < clientIds.length - 1; i++) {
        pairs.push([clientIds[i], clientIds[i+1]]);
    }
}

async function connectPairs() {
    pairClients();
    for (const pair of pairs) {
        const client1 = clients.get(pair[0]);
        const client2 = clients.get(pair[1]);
        await Promise.all([
            client1!.connect(client2!.getId()),
            client2!.connect(client1!.getId())
        ]);
    }
}

async function disconnect() {
    for (const client of clients.values()) {
        await client.close();
    }
}

async function readMessagesValidated(limit: number): Promise<number[]> {
    function validate(clientName: string, response: StreamedMessages, client1: WSClient, client2: WSClient) {
        LOGGER.info(`${clientName} message length:`, response.messages.length >= limit);
        LOGGER.info(`${clientName} message success:`, response.success);
        
        LOGGER.info(`Validating ${clientName} Messages`);
        let timestamps: number[] = []
        for (const message of response.messages) {
            timestamps.push(message.ts);

            LOGGER.info("ID valid:", message.id != null);
            LOGGER.info("From valid:", message.from === client1?.getId() || message.from === client2?.getId());
            LOGGER.info("Channel valid:", message.channel === client1?.getId() || message.channel === client2?.getId());
            LOGGER.info("Content valid:", message.message.content != null);
            LOGGER.info("Type valid:", message.message.type === MessageContentType.TEXT);
        }
        LOGGER.info("Timestamps in desc order:", _.isEqual(timestamps, [...timestamps].sort((a, b) => b-a)));
    }
    const promises: Promise<number>[] = [];
    for (const pair of pairs) {
        const client1 = clients.get(pair[0]);
        const client2 = clients.get(pair[1]);
        const messages1 = await client1!.readMessages({ channel: client2!.getId(), limit });
        const messages2 = await client2!.readMessages({ channel: client1!.getId(), limit });

        validate("Client 1", messages1, client1!, client2!);
        validate("Client 2", messages2, client1!, client2!);
    }
    return Promise.all(promises);
}

async function sendMessages(messageCount: number) {
    let promises: Promise<any>[] = [];
    for (let i = 0; i < messageCount; i++) {
        for (const pair of pairs) {
            const client1 = clients.get(pair[0]);
            const client2 = clients.get(pair[1]);
            let ts1 = DateTime.now().toMillis();
            let ts2 = DateTime.now().toMillis();
            if (i % 3 === 0) {
                ts1 -= 5000;
                ts2 -= 10000;
            }
            
            promises.push(client1!.sendMessage({
                channel: client2!.getId(),
                ts: ts1,
                content: Buffer.from((generateUuidWithNoDashes() + generateUuidWithNoDashes())).toString("hex"),
                type: MessageContentType.TEXT
            }));
            promises.push(client2!.sendMessage({
                channel: client1!.getId(),
                ts: ts2,
                content: Buffer.from((generateUuidWithNoDashes() + generateUuidWithNoDashes())).toString("hex"),
                type: MessageContentType.TEXT
            }));
        }
        if (promises.length > 1000) {
            await Promise.all(promises);
            promises = [];
        }
    }
    return Promise.all(promises);
}

async function main() {
    await initClients(2);
    await connectPairs();
    // preload persistent storage and distributer
    await sendMessages(1000);
    // read a list of messages and validate contents
    await readMessagesValidated(30);

    // close the connections
    await disconnect();
    process.exit(0);
}

main()