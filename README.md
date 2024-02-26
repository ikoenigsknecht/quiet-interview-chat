# Overview

This API is meant to serve as an example backend for a chat application.

# Setup

## Dependencies

1. Ensure you have `node` installed
2. Ensure you have `yarn` installed globally (if not and you have `npm` installed you can run `npm install --global yarn`)
3. Ensure you have `docker` installed and running
4. Ensure you have `nvm` installed

## Installing

1. Run `nvm use` inside the project directory to pick up the correct `node` version stored in `.nvmrc`
2. Run `yarn` to install package dependencies
3. Run `yarn init:env` to configure all of the containers (e.g. redis, kafka) and init databases (_NOTE: This will clear out the cassandra db_)

# Running

To run the application locally against docker you can run `yarn start:dev`.  This will ensure that docker is configured and running and then start the application via `ts-node`.

_NOTE: I have three persistence engines (mostly) implemented: local, redis and cassandra.  Redis is the most fleshed out but is slower than Cassandra.  You can switch between them by setting WS_MESSAGE_PERSISTENCE_ENGINE in .env to LOCAL, REDIS or CASSANDRA, respectively._

# Unit Tests

Unit tests are written with Jest and can be run like `yarn test`.

# E2E Tests

I have written some basic E2E tests that test some functionality with "real" clients performing operations over the API. 

## Performance

The first test loads a certain number of clients, connects clients in pairs and does cycles of sending chunks of messages over the socket and reading messages.  Reading and writing are timed.

### Running

`yarn init:env && yarn script:test-paired-clients`

## Validity

The second test loads a certain number of clients, connects clients in pairs, sends messages and then validates the messages read over the socket.

### Running

`yarn init:env && yarn script:test-client-validity`

# Known Issues/TODOs

* I originally wanted to try using Riak for persistence but found that the libraries for Node are very old (last updated 8+ years ago) and would be interested in trying that if more recent libraries are available.
* I decided on Redis as the original persistence engine because I have a lot of experience with it and had high hopes for the performance but found the performance was less than desirable as the message volume grows.  It does not scale well, at least with a single instance.
* Redis writes stay pretty stable in terms of perfromance but read time grows pretty linearly with some big spikes as volume increases.
* Cassandra persistence is much faster and scales well, generally but my docker config needs work and the implementation is lacking.  It works, for the most part, but needs to be fleshed out.  One issue in particular in my Cassandra implementation is the lack of support for reading late messages outside of the start-end range requested (e.g. "give me the latest 10 messages plus any unread late messages").  I also am not handling read updates to avoid always reading late messages in the future.
* Cassandra persistence has an issue with connections going dead which seems to be related to Java GC operations.  I didn't have the time to debug/fix this problem.
* Cassandra reads stay pretty stable in terms of performance but writes seem to have some wobble at higher volumes.  This may be an issue with my config or the cluster size of 1 but haven't had a chance to debug.
* The Cassandra engine runs everything directly in the engine file, I would like to split the underlying framework logic into a separate handler file like I did with Redis but the Cassandra logic was pretty slapped together.
* I am having issues with Kafka causing issues with initial connection (I have to create a consumer for each user<->user/user<->channel pairing to distribute messages across socket.io sockets/servers) and distribution.  I was able to work around that with connection message retries on my client but its still undesirable. This is also introducing intermittent issues with distribution causing sockets to receive realtime message updates.  I think this mostly comes down to my local Kafka config but I didn't have time to debug fully.
* My unit tests are sparse.  I wanted to spend more time on this but didn't get the chance.
* E2E tests are janky.  I would want to modify them to use a real framework and have true assertions but this was good enough to understand how things were operating for the time.
