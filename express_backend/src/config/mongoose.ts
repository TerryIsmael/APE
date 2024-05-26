import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();
const mongoUri: string | undefined = process.env.MONGO_URI;

if (!mongoUri) {
    throw new Error('Mongo URI is not defined');
}
const mongooseConnectDb = async () => {
    await mongoose.connect(mongoUri, { dbName: process.env.MONGO_DATABASE });
    const mongooseDb = mongoose.connection;
    mongooseDb.on('error', console.error.bind(console, 'Error de conexión a MongoDB con Mongoose:'));
}
await mongooseConnectDb();
export default mongoose;