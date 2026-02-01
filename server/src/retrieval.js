//general notes: node.js for backend, server side js execution
import WebSocket, { WebSocketServer } from 'ws';
import protobufjs from 'protobufjs';
const { load } = protobufjs;
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
//TODO
// fix ticker placement, i.e input tickets
async function openDb() {
    return open({
        filename: './tickerdata.db',
        driver: sqlite3.Database
    });
}
async function initializeDb() {
    const db = await openDb();
    await db.exec(`
            CREATE TABLE IF NOT EXISTS tickerdata (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ticker TEXT,
                price REAL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
    return db;
}
async function insertData(db, data) {
    await db.run(`INSERT INTO tickerdata (ticker, price) VALUES (?, ?)`, [data.ticker, data.price]);
}
console.log("Starting the connection");
//local websocket, server
const wssLocal = new WebSocketServer({ port: 8080 });
const clients = new Set();
//let decodedData;
//websocket to yahoo, client
const wsYahoo = new WebSocket('wss://streamer.finance.yahoo.com/');
//websocket to yahoo, client
//ws and wss is the protocol for http and https respectively
//const wsLocalClient = new WebSocket('ws://localhost:8080');
//init for sql db
const db = await initializeDb();
//listens from client?
wssLocal.on('connection', function connection(ws) {
    console.log("Frontend connected");
    clients.add(ws);
    ws.on('close', function () {
        console.log("Frontend disconnected");
        clients.delete(ws);
    });
    ws.on('message', function incoming(message) {
        console.log('Received from frontend:', message);
    });
});
load("tickerproto.proto", (err, root) => {
    if (err)
        throw err;
    const protofile = root.lookupType("tickerproto");
    wsYahoo.on('open', function open() {
        console.log("Connection opened");
        //insert tickers
        const subscribeMessage = { 'subscribe': ["BTC-USD"] };
        wsYahoo.send(JSON.stringify(subscribeMessage));
    });
    wsYahoo.on('message', async function incoming(data) {
        console.log('Received data from the WebSocket server:', data.toString());
        let decodedData = Buffer.from(data.toString(), 'base64').toString('utf-8');
        console.log('Decoded data:', decodedData);
        try {
            const message = protofile.decode(Buffer.from(data.toString(), 'base64'));
            const ticker_info = protofile.toObject(message);
            console.log('Decoded protobuf message:', ticker_info);
            //if more data is needed this can be added here
            await insertData(db, { ticker: ticker_info.id, price: ticker_info.price });
            console.log("Data inserted in db");
            clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify(ticker_info));
                }
                else {
                    console.log("Cant send to client");
                }
            });
        }
        catch (e) {
            console.error('Error decoding message:', e);
        }
    });
});
//# sourceMappingURL=retrieval.js.map