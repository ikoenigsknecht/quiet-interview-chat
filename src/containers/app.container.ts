import { ChatServer } from "../server/chat_server";
import { EnvVarHandler } from "../utilities/env/env_var.handler";
import LOGGER from "../utilities/logger";
import { EnvVars } from "../utilities/env/env_vars";

export class AppContainer {
    private static instance: AppContainer;

    public chatServer!: ChatServer;

    private constructor(
        public readonly envVarHandler: EnvVarHandler
    ) {}

    public static init(): AppContainer {
        if (AppContainer.instance != null) {
            throw new Error("AppContainer.init has already been run!  This should only be run once and then accessed via getInstance");
        }

        // initialize environment variable handler and hash handler
        LOGGER.info("Initializing the AppContainer instance");
        const envVarHandler = EnvVarHandler.getInstance();
        AppContainer.instance = new AppContainer(envVarHandler);
        return AppContainer.instance;
    }

    public async initHandlers(): Promise<AppContainer> {
        LOGGER.info("Initializing additional AppContainer handlers");
        this.chatServer = await ChatServer.init(this.envVarHandler.getInt(EnvVars.LISTEN_PORT));

        return this;
    }

    public static getInstance(): AppContainer {
        if (AppContainer.instance == null) {
            throw new Error("Must run AppContainer.init() before fetching instance object!");
        }

        return AppContainer.instance;
    }

    public async start() {
        this.chatServer.start();
    }
}