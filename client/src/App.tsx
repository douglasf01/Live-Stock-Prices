import React, { useState, useEffect } from 'react';
import {Graphs} from './graphs'; 
import './App.css';


const App = () => {
  
  const [messages, setMessages] = useState<string[]>([]);

  const removeFirstItem = () => {
        const newMessages = messages.slice(1);
        setMessages(newMessages);
      };
  
  useEffect(() => { 
    const wsLocalClient = new WebSocket('ws://localhost:8080');

    wsLocalClient.onmessage = function(event) {
      const data = JSON.parse(event.data);
      //const plotData = data.map(item => ({
        //price: item.price
      //}))
      if (data.type === 'query_result') {
            console.log('Query result:', data.data);
            setMessages(data.data);

      }else {console.log('Ticker from server:', data.ticker);
      console.log('Price from server:', data.price);
      setMessages(prevMessages => [...prevMessages, data]);


      console.log('All messages: ', messages)}
    };

    wsLocalClient.onopen = function() {
      console.log('Connected to the WebSocket server');
      const query = {
        type: 'query',
        sql: 'SELECT * FROM tickerdata ORDER BY timestamp DESC LIMIT 20'
      };
      console.log("Sending query to fill db")
      wsLocalClient.send(JSON.stringify(query));
    };

    wsLocalClient.onerror = function(error) {
      console.error('WebSocket error:', error);
    };

    return () => {
      wsLocalClient.close();

    };
  }, []);
/*
  useEffect(() => {
    console.log('All messages: ', messages);
  }, [messages]);
*/
  useEffect(() => {
    console.log('All messages: ', messages);
    if (messages.length > 21) {
      removeFirstItem();

    }
  }, [messages]);


  return (
    <div className="App-header">
      <h1>Live Stock Pricing</h1>
      <Graphs data={messages} />
    </div>
  
  );
};

export default App;
