import { DateTime } from "luxon";

import { WSClient } from "../src/client/client";
import { MessageContentType } from "../src/types/ws.enums";
import { generateUuidWithNoDashes } from "../src/utilities/ids";
import LOGGER from "../src/utilities/logger";
import { mean } from "lodash";

const clientIds: string[] = [];
const clients: Map<string, WSClient> = new Map();
const pairs: string[][] = [];

async function initClients(numClients: number = 2) {
    if (numClients < 2 || numClients % 2 != 0) {
        throw new Error("numClients must be >= 2 and even to ensure valid pairing");
    }

    for (let i = 0; i < numClients; i++) {
        const userId = generateUuidWithNoDashes();
        console.log(userId);
        const client = await WSClient.init(userId, 10);
        clientIds.push(client.getId());
        clients.set(client.getId(), client);
    }
}

function pairClients() {
    for (let i = 0; i < clientIds.length - 1; i++) {
        pairs.push([clientIds[i], clientIds[i+1]]);
    }
    LOGGER.info(pairs);
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

async function readMessagesTimed(limit: number): Promise<number[]> {
    async function readTimed(client1: WSClient, client2: WSClient): Promise<number> {
        const start = DateTime.now().toMillis();
        const result = await client1!.readMessages({ channel: client2!.getId(), limit });
        const end = DateTime.now().toMillis();

        return end-start;
    }

    const promises: Promise<number>[] = [];
    for (const pair of pairs) {
        const client1 = clients.get(pair[0]);
        const client2 = clients.get(pair[1]);
        promises.push(readTimed(client1!, client2!), readTimed(client2!, client1!))
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

async function sendAndReadTimed(total: number, chunkSize: number, readlimit: number) {
    let sent = 0;
    let sentForPair = 0;
    while (sent < total) {
        await sendMessages(chunkSize);
        const timings = await readMessagesTimed(readlimit);
        const pairChunk = chunkSize*2;
        sentForPair += pairChunk;
        sent += pairChunk*pairs.length;
        LOGGER.info(`Total Sent = ${sent}, Total Sent Per Pair = ${sentForPair}, Chunk size = ${chunkSize}, readLimit = ${readlimit}`);
        LOGGER.info(`Avg read delay = ${mean(timings)}, Delays = ${timings}`);
    }
}

async function main() {
    await initClients(4);
    await connectPairs();
    // preload persistent storage and distributer
    await sendMessages(20);
    // read a list of messages
    await readMessagesTimed(30);

    // send the barrage
    const chunkSize = 500;
    const total = chunkSize * 10000;
    const readLimit = 30;
    // time reading messages as number of messages increases
    await sendAndReadTimed(total, chunkSize, readLimit);

    // close the connections
    await disconnect();
    process.exit(0);
}

main()