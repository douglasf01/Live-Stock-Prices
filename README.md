# Live Stock Price Fetching from Yahoo Fiance Websocket

This project involves fetching live stock prices from Yahoo Finance using a websocket. 
The backend connects to the Yahoo Finance websocket, retrieves data as it is sent, and stores the data in a database using SQLITE3. 
A local websocket is also set up to connect to a React client, where a line graph is updated in real-time as new stock prices are received. By using a local websocket, we avoid the need to access the database for plotting, allowing for real-time updates.

This project can serve as a starting point for developing multiple different ideas. 
Since the database stores all the data, we could implement time series algorithms for stock price prediction in the backend. Additionally, the client could be further developed to create a more extensive dashboard.
    
**Note:** This guide is specifically for Linux/Unix systems.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Usage](#usage)

## Prerequisites
Before you begin, ensure you have met the following requirements:

- **Node.js**

## Installation
