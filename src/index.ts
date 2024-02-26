import dotenv from "dotenv";
dotenv.config();

import LOGGER from "./utilities/logger";
import { AppContainer } from "./containers/app.container";

async function main() {
    LOGGER.info("Initializing application");

    // initialize the container
    const appContainer = await AppContainer.init().initHandlers();

    // start the application
    LOGGER.info("Starting application");
    appContainer.start();
}

main();