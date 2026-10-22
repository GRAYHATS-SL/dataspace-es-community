import { MongoClient } from 'mongodb'
import { loadConfig } from '../config.js'
import { ensureSchema } from '../db/mongoSchema.js'

// Crea o actualiza la colección, su validador e índices sin arrancar el servicio
const config = loadConfig()
const mongo = new MongoClient(config.mongodbUri, { serverSelectionTimeoutMS: 5_000 })
try {
    await mongo.connect()
    await ensureSchema(mongo.db(config.mongodbDb), console.log)
} finally {
    await mongo.close()
}
