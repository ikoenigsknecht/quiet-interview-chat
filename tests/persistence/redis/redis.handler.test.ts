import { RedisHandler } from "../../../src/persistence/redis/redis.handler";

describe("RedisHandler", () => {
    let redisHandler: RedisHandler;
    beforeAll(() => {
        redisHandler = RedisHandler.init(0);
    });

    beforeEach(async () => {
        await redisHandler.flush();
    });

    afterEach(async () => {
        await redisHandler.flush();
    });

    test("set, get and del work", async () => {
        const key = "foo";
        const value = "bar";
        await redisHandler.set(key, value);

        let found = await redisHandler.get(key);
        expect(found).toEqual(value);

        await redisHandler.del(key);
        found = await redisHandler.get(key);
        expect(found).toBeNull();
    });

    test("json.set, json.get and json.mset work", async () => {
        const prefix = "foo_json_schema";
        const suffix = "bar";
        const value = { "id": "abc123", "someValue": 1 };
        await redisHandler.jsonSet(prefix, suffix, value);

        let found = await redisHandler.jsonGet<typeof value>(prefix, suffix);
        expect(found.id).toEqual("abc123");
        expect(found.someValue).toEqual(1);

        await redisHandler.jsonMset(prefix, [suffix], "someValue", 2);
        found = await redisHandler.jsonGet<typeof value>(prefix, suffix);
        expect(found.id).toEqual("abc123");
        expect(found.someValue).toEqual(2);
    });

    test("json.set, ft.create, ft.info and ft.search work", async () => {
        const prefix = "foo_json_schema";
        const suffix1 = "bar";
        const value1 = { "id": "abc123", "someValue": 1 };
        await redisHandler.jsonSet(prefix, suffix1, value1);

        const suffix2 = "baz";
        const value2 = { "id": "def456", "someValue": 2 };
        await redisHandler.jsonSet(prefix, suffix2, value2);

        const schemaString = "$.id as id TEXT $.someValue as someValue NUMERIC";
        await redisHandler.ftCreate(prefix, "1.0", schemaString);

        const foundIdx = await redisHandler.ftInfo(prefix);
        expect(foundIdx).toBeDefined();

        let searchString = "@someValue:[1 1]";
        let found = await redisHandler.ftSearch<typeof value1>(prefix, searchString, 10, undefined);
        expect(found.count).toEqual(1);
        let record = [...found.result.values()][0];
        expect(record.id).toEqual("abc123");
        expect(record.someValue).toEqual(1);

        searchString = "@id:def456";
        found = await redisHandler.ftSearch<typeof value1>(prefix, searchString, 10, undefined);
        expect(found.count).toEqual(1);
        record = [...found.result.values()][0];
        expect(record.id).toEqual("def456");
        expect(record.someValue).toEqual(2);
    });
});