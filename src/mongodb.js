import { MongoClient } from "mongodb";

const uri =
  "mongodb+srv://maxim17shiglov08:lLDb1yPR4bmz5gpR@greeterbot.tqfnspa.mongodb.net/?retryWrites=true&w=majority";

const dbClient = new MongoClient(uri);

export async function connectToDatabase() {
  try {
    await dbClient.connect();
    console.log("Connected to the database");
  } catch (err) {
    console.error("Error connecting to the database:", err);
  }
}

export async function addUserToWhitelist(userId) {
  try {
    const database = dbClient.db("allowerd_users");
    const whitelistCollection = database.collection("whitelist");

    // Проверяем, есть ли пользователь уже в вайтлисте
    const existingUser = await whitelistCollection.findOne({ userId });

    if (!existingUser) {
      // Если пользователя нет, добавляем его в вайтлист
      await whitelistCollection.insertOne({ userId });
      console.log(`User ${userId} added to the whitelist.`);
    } else {
      console.log(`User ${userId} is already in the whitelist.`);
    }
  } catch (err) {
    console.error("Error adding user to the whitelist:", err);
  }
}

export async function removeUserFromWhitelist(userId) {
  try {
    const database = dbClient.db("allowerd_users");
    const whitelistCollection = database.collection("whitelist");
    const result = await whitelistCollection.deleteOne({ userId });

    if (result.deletedCount > 0) {
      console.log(`User ${userId} removed from the whitelist.`);
    } else {
      console.log(`User ${userId} was not found in the whitelist.`);
    }
  } catch (error) {
    console.error("Error removing user from the whitelist:", error);
  }
}
export async function isUserWhitelisted(userId) {
  const database = dbClient.db("allowerd_users");
  const whitelistCollection = database.collection("whitelist");
  const user = await whitelistCollection.findOne({ userId });
  return user !== null;
}
