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
        await db.run(
            `INSERT INTO tickerdata (ticker, price) VALUES (?, ?)`,
            [data.ticker, data.price]
        );
    }

    console.log("Starting the connection");
    //local websocket, server
    const wssLocal = new WebSocketServer({port: 8080});
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

    ws.on('close', function() {
        console.log("Frontend disconnected");
        clients.delete(ws);
    });

    ws.on('message', async function incoming(message){
        console.log('Received from frontend:', message);

        try {
            const query = JSON.parse(message.toString());
            //console.log("Parsed query from message ", query);
            //console.log("sql query", query.sql, " params ", query.params);
            if (query.type === 'query') {
            //const db = await openDb();
            const rows = await db.all(query.sql, query.params || []);
            console.log("Query result rows:", rows.length);
            
            //when recieving the query we can either get ascended rows (from the begning), descended rows (the latest)
            // but each new datapoint are appended at the end of the list, we need to reverse the descended rows
            const reverseRows = rows.reverse();    

            const response = JSON.stringify({ type: 'query_result', data: reverseRows });
                //console.log("sending to the graph: ",response);
                ws.send(response);

            }
        }catch (e) {
            console.error('Error getting db info ', e);
        }
    });
});


    load("tickerproto.proto", (err, root) => {
        if (err) throw err;
        const protofile = root.lookupType("tickerproto");
        
        wsYahoo.on('open', function open() 
            {console.log("Connection opened");
            
            //insert tickers
            const subscribeMessage = {'subscribe' : ["AAPL"]};
            wsYahoo.send(JSON.stringify(subscribeMessage));

        });

        wsYahoo.on('message', async function incoming(data) {
            
            console.log('Received data from the WebSocket server:', data.toString())
            let decodedData: string = Buffer.from(data.toString(), 'base64').toString('utf-8');
            console.log('Decoded data:', decodedData);

            try {
                const message = protofile.decode(Buffer.from(data.toString(), 'base64'));
                const ticker_info = protofile.toObject(message);
                console.log('Protobuf decoded');
                
                //if more data is needed this can be added here
                await insertData(db, { ticker: ticker_info.id, price: ticker_info.price})
                console.log("Data inserted in db");



                clients.forEach(client => {
                    if (client.readyState === WebSocket.OPEN) {
                        const now = new Date();
                        //convert to get same date structure as in sql db, easier when creating xaxis ticks in graph
                        const formatedDateTime = now.toISOString().slice(0, 19).replace('T', ' ');
                        client.send(JSON.stringify({ticker: ticker_info.id, price: ticker_info.price, timestamp: formatedDateTime}));
                    }
                    else {console.log("Cant send to client");}

                });
                
                } catch (e) {
                    console.error('Error decoding message:', e);
                }

        });
    });