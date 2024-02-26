import dotenv from 'dotenv'; 
dotenv.config();  // Load environment variables from .env file

import log4js from 'log4js';
const LOGGER = log4js.getLogger();
LOGGER.level = process.env.LOG_LEVEL || "INFO";

export default LOGGER;
