import mongoose from "mongoose";

/**
 * Connect to MongoDB
 */
const initializeMongo = async () =>
    await mongoose.connect(String(process.env.MONGO_URI), {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        useFindAndModify: false
    });

export default initializeMongo;
export { initializeMongo };
