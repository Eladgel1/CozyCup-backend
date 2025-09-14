import mongoose from 'mongoose';

export async function resetDatabase() {
  const collections = Object.keys(mongoose.connection.collections);
  for (const name of collections) {
    await mongoose.connection.collections[name].deleteMany({});
  }
  console.log('Database cleared.');
}
