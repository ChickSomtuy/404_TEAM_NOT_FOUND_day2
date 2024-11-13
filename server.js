//receives Machine data (http://technest.ddns.net/8001) from Machine API via Web socket and write to the DB

const WebSocket = require('ws');
const { MongoClient } = require('mongodb');

// MongoDB configuration
const mongoUrl = 'mongodb://localhost:27017';
const dbName = 'machine_data';
const apiKey = 'baebd3f4515b2727d643323ee0f65a7a'; // Machine API Key

// MongoDB client and collection
const client = new MongoClient(mongoUrl);
let machineCollection;

// Function to connect to MongoDB
async function connectMongo() {
    try {
        await client.connect();
        console.log('Connected to MongoDB successfully');
        const db = client.db(dbName);
        machineCollection = db.collection('data');
    } catch (err) {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    }
}

// Function to start WebSocket connection
function startWebSocket() {
    const ws = new WebSocket("ws://technest.ddns.net:8001/ws");

    ws.on('open', () => {
        console.log('WebSocket connection opened');
        ws.send(apiKey);
    });

    ws.on('message', async (data) => {
        console.log('Data received:', data);
        try {
            const parsedData = JSON.parse(data); // แปลงข้อมูลจาก JSON
            const timestamp = new Date(); // เพิ่ม timestamp
    
            const count = await machineCollection.countDocuments({}); // Use await to get the count
            const newId = count + 1; // Increment the count for the new id

            // บันทึกข้อมูลลงใน MongoDB โดยไม่กำหนด _id
            await machineCollection.insertOne({
                
                _id:  String(newId),
                ...parsedData,
                timestamp: timestamp,
                
             //  id:db.collection('data').countDocuments({}),
            });
    
            console.log('บันทึกข้อมูลลง MongoDB สำเร็จ');
        } catch (err) {
            console.error('เกิดข้อผิดพลาดในการบันทึกข้อมูล:', err);
        }
    });
    
    

    ws.on('error', (err) => {
        console.error('WebSocket error:', err);
    });

    ws.on('close', () => {
        console.log('WebSocket connection closed');
    });
}

// Main function to start the program
(async function main() {
    await connectMongo();
    startWebSocket();
})();
