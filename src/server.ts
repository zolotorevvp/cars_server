import express from "express";
import bcrypt from "bcrypt";
import bodyParser from "body-parser";
import {MongoClient, ObjectId} from "mongodb";
import config from "config";
import {initDB} from "./init.js";
import CancellationToken from "cancellationtoken";

const {token, cancel} = CancellationToken.create();

const runInit = async () => {
    const url = config.get<string>("database.url");
    await runApp(await initDB(url));
};

export const makeApp = () => {
    const app = express();
    app.use(bodyParser.json());
    return app;
};

export const runApp = async (client: MongoClient) => {
    const app = makeApp();
    const port = config.get("server.port");
    const saltRounds = config.get<number>("bcrypt.saltRounds");
    const dbName = config.get<string>("database.dbName");
    const db = client.db(dbName);


    app.post('/register', async (req, res) => {
        try {
            const {username, password} = req.body;
            const hashedPassword = await bcrypt.hash(password, saltRounds);
            const collection = db.collection('users');
            await collection.insertOne({username, password: hashedPassword});
            res.sendStatus(200);
        } catch (error) {
            res.status(500).send(error);
        }
    });

    app.post('/login', async (req, res) => {
        try {
            const {username, password} = req.body;
            const collection = db.collection('users');
            const user = await collection.findOne({username});
            if (!user) {
                res.sendStatus(401);
            }

            const match = await bcrypt.compare(password, user!.password);
            if (!match) {
                res.sendStatus(401);
            }

            res.sendStatus(200);
        } catch (error) {
            res.status(500).send(error);
        }
    });

    app.get('/cars', async (_req, res) => {
        try {
            const collection = db.collection('cars');
            const cars = await collection.find().toArray();
            res.send(cars.sort((a, b) => a.brand.localeCompare(b.brand)));
        } catch (error) {
            res.status(500).send(error);
        }
    });

    app.post('/cars', async (req, res) => {
        try {
            const {brand, name, year, price} = req.body;
            const collection = db.collection('cars');
            await collection.insertOne({brand, name, year, price});
            res.sendStatus(200);
        } catch (error) {
            res.status(500).send(error);
        }
    });

    app.put('/cars/:id', async (req, res) => {
        try {
            const {id} = req.params;
            const {brand, name, year, price} = req.body;
            const collection = db.collection('cars');
            await collection.updateOne({_id: new ObjectId(id)}, {$set: {brand, name, year, price}});
            res.sendStatus(200);
        } catch (error) {
            res.status(500).send(error);
        }
    });

    app.delete('/cars/:id', async (req, res) => {
        try {
            const {id} = req.params;
            const collection = db.collection('cars');
            await collection.deleteOne({_id: new ObjectId(id)});
            res.sendStatus(200);
        } catch (error) {
            res.status(500).send(error);
        }
    });
    return new Promise<void>((resolve, reject) => {
        const server = app.listen(port, () => {
            console.log(`[init] Server is running on port ${port}`);
        });
        server.on("error", reject);
        server.on("close", resolve);
        token.onCancelled(() => {
            client.close();
            server.close();
        });
    });
};

process.on("SIGINT", cancel);
process.on("SIGTERM", cancel);

Promise.all([
    runInit()
]).catch(console.error);
