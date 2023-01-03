const redis = require('redis');
const redisClient = process.env.NODE_ENV === 'local' ? redis.createClient({database: parseInt(process.env.REDIS_DB)}) : redis.createClient({database: parseInt(process.env.REDIS_DB), url: `redis://${process.env.REDIS_URL}`});
redisClient.on('error', (err) => console.log('Redis Client Error', err));

module.exports = redisClient;