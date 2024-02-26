import { EnvVarHandler } from "../../../src/utilities/env/env_var.handler";

describe("EnvVarHandler", () => {
    let envVarHandler: EnvVarHandler;
    beforeAll(() => {
        process.env.STRING_ITEM="foobar";
        process.env.INT_ITEM="1234";
        process.env.BOOL_ITEM_TRUE="true";
        process.env.BOOL_ITEM_FALSE="false";
        envVarHandler = EnvVarHandler.getInstance();
    });

    test("getString returns string", () => {
        expect(envVarHandler.getString("STRING_ITEM")).toEqual("foobar");
    });

    test("getInt returns number", () => {
        expect(envVarHandler.getInt("INT_ITEM")).toEqual(1234);
    });

    test("getBool returns true when string is 'true'", () => {
        expect(envVarHandler.getBool("BOOL_ITEM_TRUE")).toEqual(true);
    });

    test("getBool returns false when string is 'false'", () => {
        expect(envVarHandler.getBool("BOOL_ITEM_FALSE")).toEqual(false);
    });
});