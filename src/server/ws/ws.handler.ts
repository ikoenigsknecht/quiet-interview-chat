import { Server, ServerOptions, Socket } from "socket.io";
import { Server as HTTPServer } from "http";

import LOGGER from "../../utilities/logger";
import { registerDisconnectHandlers } from "./handlers/disconnect/disconnect";
import { registerChatHandlers } from "./handlers/chat/chat";
import { MessagePersistencePrototype } from "../../persistence/messages/message.persistence.prototype";
import { PersistenceType } from "../../types/persistence.enums";
import { LocalMessagePersistenceEngine } from "../../persistence/messages/message.local.persistence";
import { RedisMessagePersistenceEngine } from "../../persistence/messages/message.redis.persistence";
import { DistributionType } from "../../types/distributed.enums";
import { MessageDistributerPrototype } from "../../distributed/messages/message.distributed.prototype";
import { KafkaMessageDistributer } from "../../distributed/messages/message.kafka.distributed";
import { ConnectionPersistencePrototype } from "../../persistence/connection/connection.persistence.prototype";
import { RedisConnectionPersistenceEngine } from "../../persistence/connection/connection.redis.persistence";
import { ChatService } from "./handlers/chat/chat.service";
import { DisconnectService } from "./handlers/disconnect/disconnect.service";
import { CassandraMessagePersistenceEngine } from "../../persistence/messages/message.cassandra.persistence";

// default socket server options
const DEFAULT_SERVER_OPTIONS: Partial<ServerOptions> = {
    transports: ["websocket"],
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
};

export class WSHandler {
    public static instance: WSHandler;

    private constructor(
        private socketServer: Server, 
        private persistenceEngine: MessagePersistencePrototype, 
        private distributionEngine: MessageDistributerPrototype
    ) {}

    /**
     * Initialize a new socket.io server on our existing HTTPServer and setup connection handlers and error handlers
     * 
     * @param httpServer Existing HTTPServer we will accept WS connections on
     * @param persistenceType Type of persistence engine we should use (e.g. LOCAL)
     * @param distributionType Type of distribution engine we should use (e.g. KAFKA)
     * @param connPersistenceType Type of connection persistence engine we should use (e.g. REDIS)
     * @param options ServerOptions to configure WS server
     * @returns new WSHandler instance
     */
    public static async init(
        httpServer: HTTPServer, 
        persistenceType: PersistenceType, 
        distributionType: DistributionType,
        connPersistenceType: PersistenceType,
        options: Partial<ServerOptions> | undefined = DEFAULT_SERVER_OPTIONS
    ): Promise<WSHandler> {
        if (WSHandler.instance != null) {
            throw new Error("WSHandler.init has already been run!  This should only be run once and then accessed via getInstance");
        }

        LOGGER.info("Initializing persistence engine");
        const persistenceEngine = await WSHandler.initPersistenceEngine(persistenceType);

        LOGGER.info("Initializing connection persistence engine");
        const connPersistenceEngine = await WSHandler.initConnPersistenceEngine(connPersistenceType);

        LOGGER.info("Initializing distribution engine");
        const distributionEngine = await WSHandler.initDistributionEngine(distributionType);

        LOGGER.info("Initializing WS server");
        const socketServer: Server = new Server(httpServer, options);
        WSHandler.initConnections(socketServer, persistenceEngine, distributionEngine, connPersistenceEngine);
        WSHandler.initErrorHandling(socketServer);

        return new WSHandler(socketServer, persistenceEngine, distributionEngine);
     }
     
     /**
      * Initialize connection handler on socket.io Server
      * 
      * @param socketServer socket.io Server
      * @param persistenceEngine Persistence engine used for storing messages
      * @param distributionEngine Distribution engine used for passing messages between users
      * @param connPersistenceEngine Persistence engine used for mapping connecting details
      */
     private static initConnections(
        socketServer: Server, 
        persistenceEngine: MessagePersistencePrototype, 
        distributionEngine: MessageDistributerPrototype,
        connPersistenceEngine: ConnectionPersistencePrototype<any>
    ): void {
         LOGGER.info("Initializing WS connections");

         const chatService: ChatService = ChatService.init(persistenceEngine, distributionEngine, connPersistenceEngine);
         const disconnectService = DisconnectService.init(connPersistenceEngine);
     
         const onConnection = (socket: Socket) => {
            // register handlers
            registerChatHandlers(socketServer, socket, chatService);
            registerDisconnectHandlers(socketServer, socket, disconnectService);
     
            LOGGER.info(`New socket connection with ID ${socket.id}`);
         };
     
         socketServer.on("connection", onConnection);
     }
     
     /**
      * Initialize error handler on socket.io Server
      * 
      * @param socketServer socket.io Server
      */
     private static initErrorHandling(socketServer: Server) {
         LOGGER.info("Initializing WS error handling");
     
         socketServer.engine.on("connection_error", (err) => {
             LOGGER.info(err.req);      // the request object
             LOGGER.info(err.code);     // the error code, for example 1
             LOGGER.info(err.message);  // the error message, for example "Session ID unknown"
             // LOGGER.info(err.context);  // some additional error context
           });
     }

     /**
      * Initialize our message persistence engine based on config
      * 
      * @param persistenceType Method of persistence
      * @returns Persistence engine
      */
     private static async initPersistenceEngine(persistenceType: PersistenceType): Promise<MessagePersistencePrototype> {
        switch(persistenceType) {
            case PersistenceType.LOCAL:
                return LocalMessagePersistenceEngine.init();
            case PersistenceType.REDIS:
                return RedisMessagePersistenceEngine.init();
            case PersistenceType.CASSANDRA:
                return CassandraMessagePersistenceEngine.init();
            default:
                throw new Error(`Unknown persistence type ${persistenceType} given`);
        }
     }

     /**
      * Initialize our connection persistence engine based on config
      * 
      * @param persistenceType Method of persistence
      * @returns Persistence engine
      */
     private static async initConnPersistenceEngine(persistenceType: PersistenceType): Promise<ConnectionPersistencePrototype<any>> {
        switch(persistenceType) {
            case PersistenceType.REDIS:
                return RedisConnectionPersistenceEngine.init();
            default:
                throw new Error(`Unknown connection persistence type ${persistenceType} given`);
        }
     }

     /**
      * Initialize our distribution engine based on config
      * 
      * @param distributionType Method of distribution
      * @returns Distribution engine
      */
     private static async initDistributionEngine(distributionType: DistributionType): Promise<MessageDistributerPrototype> {
        switch(distributionType) {
            case DistributionType.KAFKA:
                return KafkaMessageDistributer.init();
            default:
                throw new Error(`Unknown distribution type ${distributionType} given`);
        }
     }

     /**
      * Return the singleton instance of WSHandler, if initialized
      * 
      * @returns Singleton instance of WSHandler
      */
     public getInstance(): WSHandler {
        if (WSHandler.instance == null) {
            throw new Error("Must run WSHandler.init() before fetching instance object!");
        }

        return WSHandler.instance;
     }

     /**
      * Return the initialized socket.io Server
      * 
      * @returns Server instance
      */
     public getSocketServer(): Server {
        return this.socketServer;
     }

     /**
      * 
      * @returns Persistence engine instance
      */
     public getPersistenceEngine(): MessagePersistencePrototype {
        return this.persistenceEngine;
     }
}