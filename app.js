const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');
const authMiddleware = require('./auth');



dotenv.config();

const app = express();
app.use(express.json());





// MongoDB configuration
const mongoUrl = 'mongodb://localhost:27017';
const dbName = 'machine_data';
let machineCollection;

const client = new MongoClient(mongoUrl);

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

connectMongo();

// Route to authenticate and generate JWT
app.post('/auth/login', async (req, res) => {
    const { username, password } = req.body;
    const user = { username: 'admin', password: 'somtuy69' }; // Password: 'adminpass' (hashed)
    
    if (username === user.username && await bcrypt.compare(password, user.password)) {
        const token = jwt.sign({ username: user.username }, process.env.JWT_SECRET, { expiresIn: '1h' });
        return res.json({ token });
    }

    res.status(401).send('Invalid credentials');
});

// Route to get all machine data (protected)
app.get('/machines', authMiddleware.verifyToken, async (req, res) => {
    try {
        const machines = await machineCollection.find().toArray();
        res.json(machines);
    } catch (err) {
        res.status(500).send('Error retrieving machines');
    }
});

// Route to get a specific machine by ID (protected)
app.get('/machines/:id', authMiddleware.verifyToken, async (req, res) => {
    const machineId = req.params.id;
    try {
        const machine = await machineCollection.findOne({ _id: machineId });
        if (!machine) {
            return res.status(404).send('Machine not found');
        }
        res.json(machine);
    } catch (err) {
        res.status(500).send('Error retrieving machine');
    }
});

app.post('/machines', authMiddleware.verifyToken, async (req, res) => {
    console.log("Received data:", req.body); // ดูข้อมูลที่เข้ามาใน req.body

    const newMachine = req.body;
    
    // เช็คว่าทุกฟิลด์สำคัญมีค่าใน req.body
    if (
        !newMachine["_id"] ||
        !newMachine["Energy Consumption"]?.Power ||
        !newMachine["Voltage"]?.["L1-GND"] ||
        !newMachine["Voltage"]?.["L2-GND"] ||
        !newMachine["Voltage"]?.["L3-GND"] ||
        newMachine["Pressure"] === undefined ||
        newMachine["Force"] === undefined ||
        newMachine["Cycle Count"] === undefined ||
        newMachine["Position of the Punch"] === undefined ||
        !newMachine["timestamp"]
    ) {
        return res.status(400).send('All required fields must be provided.');
    }

    try {
        const result = await machineCollection.insertOne(newMachine);
        res.status(201).json({
            message: 'Machine added successfully',
            insertedId: result.insertedId,
            data: newMachine
        });
    } catch (err) {
        console.error('Error adding machine:', err);
        res.status(500).send('Error adding machine');
    }
});








// Route to update a machine (protected)
app.put('/machines/:id', authMiddleware.verifyToken, async (req, res) => {
    const machineId = req.params.id;
    const updatedData = req.body;
    console.log(updatedData);
    try {
        // Ensure `machineId` matches the type used in MongoDB (e.g., integer or ObjectId)
        const query = { _id: machineId };  // Adjust if `_id` is not a string

        // Use `updateOne` to update the document, setting only the fields in `updatedData`
        const result = await machineCollection.updateOne(query, { $set: updatedData });

        if (result.matchedCount === 0) {
            return res.status(404).send('Machine not found');
        }

        res.send('Machine updated successfully');
    } catch (err) {
        console.error('Error updating machine:', err);
        res.status(500).send('Error updating machine');
    }
});


// Route to delete a machine (protected)
app.delete('/machines/:id', authMiddleware.verifyToken, async (req, res) => {
    const machineId = req.params.id;
    try {
        const result = await machineCollection.deleteOne({ _id: machineId });
        if (result.deletedCount === 0) {
            return res.status(404).send('Machine not found');
        }
        res.send('Machine deleted');
    } catch (err) {
        res.status(500).send('Error deleting machine');
    }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});



/*
{
  "_id": "8",
  "Energy Consumption": {
    "Power": 104.42467791329078
  },
  "Voltage": {
    "L1-GND": 229.4809449881519,
    "L2-GND": 234.43988041652776,
    "L3-GND": 226.1162236460093
  },
  "Pressure": -0.5171447314085319,
  "Force": -0.10685828723298646,
  "Cycle Count": 4294,
  "Position of the Punch": 35.87889830976672,
  "timestamp": {
    "$date": "2024-11-13T13:21:12.386Z"
  }
}*/
