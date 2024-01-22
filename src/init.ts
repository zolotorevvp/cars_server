import {MongoClient} from "mongodb";
export const initDB = async (url: string) => {
    const client = new MongoClient(url);
    await client.connect();
    return client;
};
