async function fetchDataAndUpdatePlot() {
    try {
        const response = await fetch('/api/tickerdata');
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.json();
        console.log("DAta retrieved", data);
        return data;
    }
    catch (error) {
        console.error("Error retrieving from db ", error);
    }
}
setInterval(fetchDataAndUpdatePlot, 5000); // Update every 5 seconds
export {};
//# sourceMappingURL=front.js.map