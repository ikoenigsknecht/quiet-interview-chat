CREATE KEYSPACE IF NOT EXISTS quiet_chat WITH REPLICATION = { 'class' : 'SimpleStrategy', 'replication_factor' : '1' };
DROP TABLE IF EXISTS quiet_chat.messages;
CREATE TABLE IF NOT EXISTS quiet_chat.messages ( id UUID, "from" text, channel text, room text, ts timestamp, content text, type text, read boolean, late boolean, PRIMARY KEY(room, ts, late, read)) WITH CLUSTERING ORDER BY (ts DESC);