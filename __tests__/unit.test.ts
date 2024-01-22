import bcrypt from "bcrypt";
import {MongoClient, ObjectId} from "mongodb";
import request from "supertest";
import config from "config";
import {makeApp} from "../src/server";

const url = config.get<string>("database.url");
// Удаление всех документов в коллекции перед каждым тестом
beforeEach(async () => {
    const db = await MongoClient.connect(url);
    const collection = db.db("test").collection("cars");
    await collection.deleteMany({});
    await db.close();
});

// Тест для проверки регистрации пользователя
test("Register user", async () => {
    const password = "password";
    const hashedPassword = bcrypt.hashSync(password, 10);
    const db = await MongoClient.connect(url);
    const collection = db.db("test").collection("users");
    await collection.insertOne({username: "testuser", password: hashedPassword});
    await db.close();

    const response = await request(makeApp).post("/register").send({
        username: "testuser",
        password: password,
    });

    // Ожидается статус код 200
    expect(response.status).toBe(200);
});

// Тест для проверки ошибки при регистрации с уже существующим именем пользователя
test("Register user with existing username", async () => {
    const password = "password";
    const hashedPassword = bcrypt.hashSync(password, 10);
    const db = await MongoClient.connect("mongodb://localhost:27017");
    const collection = db.db("test").collection("users");
    await collection.insertOne({username: "testuser", password: hashedPassword});
    await db.close();

    const response = await request(makeApp).post("/register").send({
        username: "testuser",
        password: password,
    });

    // Ожидается статус код 500
    expect(response.status).toBe(500);
});

// Тест для проверки входа пользователя
test("Login user", async () => {
    const password = "password";
    const hashedPassword = bcrypt.hashSync(password, 10);
    const db = await MongoClient.connect("mongodb://localhost:27017");
    const collection = db.db("test").collection("users");
    await collection.insertOne({username: "testuser", password: hashedPassword});
    await db.close();

    const response = await request(makeApp).post("/login").send({
        username: "testuser",
        password: password,
    });

    // Ожидается статус код 200
    expect(response.status).toBe(200);
});

// Тест для проверки ошибки при входе с неправильным паролем
test("Login user with wrong password", async () => {
    const password = "password";
    const hashedPassword = bcrypt.hashSync(password, 10);
    const db = await MongoClient.connect("mongodb://localhost:27017");
    const collection = db.db("test").collection("users");
    await collection.insertOne({username: "testuser", password: hashedPassword});
    await db.close();

    const response = await request(makeApp).post("/login").send({
        username: "testuser",
        password: "wrongpassword",
    });

    // Ожидается статус код 401 (Unauthorized)
    expect(response.status).toBe(401);
});

// Тест для проверки создания машины
test("Create car", async () => {
    const db = await MongoClient.connect(url);
    const collection = db.db("test").collection("cars");

    const response = await request(makeApp).post("/cars").send({
        brand: "BMW",
        name: "X5",
        year: 2020,
        price: 50000
    });

    // Ожидается статус код 200
    expect(response.status).toBe(200);

    const cars = await collection.find().toArray();

    // Ожидается, что коллекция будет содержать одну запись
    expect(cars.length).toBe(1);
    expect(cars[0].brand).toBe("BMW");
    expect(cars[0].name).toBe("X5");
    expect(cars[0].year).toBe(2020);
    expect(cars[0].price).toBe(50000);

    await db.close();
});

// Тест для проверки обновления машины
test("Update car", async () => {
    const db = await MongoClient.connect("mongodb://localhost:27017");
    const collection = db.db("test").collection("cars");
    const carId = new ObjectId().toHexString();
});
