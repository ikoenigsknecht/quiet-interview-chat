import { Server as HTTPServer, createServer } from "http";
import Application from "koa";
import bodyParser from "koa-bodyparser";
import KoaLogger from "koa-logger";

import LOGGER from "../utilities/logger";
import { WSHandler } from "./ws/ws.handler";
import { EnvVars } from "../utilities/env/env_vars";
import { PersistenceType } from "../types/persistence.enums";
import { DistributionType } from "../types/distributed.enums";
import { EnvVarHandler } from "../utilities/env/env_var.handler";
import { generateUuidWithNoDashes } from "../utilities/ids";

/**
 * ChatServer manages all of our HTTP/Socket initialization
 */
export class ChatServer {
    public static instance: ChatServer;

    private constructor(private app: Application, private httpServer: HTTPServer, private wsHandler: WSHandler, private listenPort: number, private serverId: string) {}

    /**
     * Initialize all necessary logic for listening for REST/WS messages
     * 
     * @param listenPort Port the server will accept requests on
     * @returns New ChatServer Instance
     */
    public static async init(listenPort: number = 3000): Promise<ChatServer> {
        if (ChatServer.instance != null) {
            throw new Error("ChatServer.init has already been run!  This should only be run once and then accessed via getInstance");
        }

        // init Koa app
        const app = ChatServer.initApp();

        // init http server
        const httpServer = ChatServer.initHttpServer(app); 

        const envVarHandler = EnvVarHandler.getInstance();

        // init socket server
        const wsHandler = await WSHandler.init(
            httpServer, 
            envVarHandler.getString(EnvVars.WS_MESSAGE_PERSISTENCE_ENGINE) as PersistenceType,
            envVarHandler.getString(EnvVars.WS_MESSAGE_DISTRIBUTION_ENGINE) as DistributionType,
            envVarHandler.getString(EnvVars.WS_CONN_PERSISTENCE_ENGINE) as PersistenceType,
        );

        ChatServer.instance = new ChatServer(app, httpServer, wsHandler, listenPort, generateUuidWithNoDashes());
        return ChatServer.instance;
    }

    // http stuff

    /**
     * Create a new instance of HTTPServer using an existing Koa Application instance
     * 
     * @param app Koa Application instance
     * @returns New HTTPServer
     */
    private static initHttpServer(app: Application): HTTPServer {
        LOGGER.info("Initializing HTTP server");
        const httpServer: HTTPServer = createServer(app.callback());
        return httpServer;
    }

    /**
     * Initialize a new Koa Application instance and associated middleware
     * 
     * @returns New Application
     */
    private static initApp(): Application {
        LOGGER.info("Initializing Application");
        const app = new Application();
        return ChatServer.addMiddleware(app);
    }

    /**
     * Configure middleware on a Koa Application
     * 
     * @param app Koa Application instance to add middleware onto
     * @returns Application
     */
    private static addMiddleware(app: Application): Application {
        LOGGER.info("Initializing middleware");
        app.use(KoaLogger());
        app.use(bodyParser());
        
        return app;
    }

    // getters
    
    /**
      * Return the singleton instance of ChatServer, if initialized
      * 
      * @returns Singleton instance of ChatServer
      */
    public static getInstance(): ChatServer {
        if (ChatServer.instance == null) {
            throw new Error("Must run ChatServer.init() before fetching instance object!");
        }

        return ChatServer.instance;
    }

    /**
     * Return the initialized Koa Application instance
     * 
     * @returns Koa Application
     */
    public getApp(): Application {
        return this.app;
    }

    /**
     * Return the initialized HTTPServer instance
     * 
     * @returns HTTPServer
     */
    public getHttpServer(): HTTPServer {
        return this.httpServer;
    }

    /**
     * Return the initialized WSHandler instance
     * 
     * @returns WSHandler
     */
    public getWsHandler(): WSHandler {
        return this.wsHandler;
    }

    /**
     * 
     * @returns Server ID
     */
    public getServerId(): string {
        return this.serverId;
    }

    // execution

    /**
     * Start the HTTPServer on the configured listen port
     */
    public async start() {
        LOGGER.info(`Starting ChatServer on port ${this.listenPort}`);
        this.httpServer.listen(this.listenPort, () => {
            LOGGER.info(`ChatServer listening on port ${this.listenPort}`);
        });
    }
}