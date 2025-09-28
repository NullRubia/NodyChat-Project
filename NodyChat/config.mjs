import dotenv from "dotenv";

dotenv.config();

function required(key, defaultValue = undefined) {
  const value = process.env[key] || defaultValue;
  if (value == null) {
    throw new Error(`키 ${key}를 찾을 수 없습니다.`);
  }
  return value;
}

export const config = {
  jwt: {
    secretKey: required("JWT_SECRET"),
    expiresInSec: parseInt(required("JWT_EXPIRES_SEC")),
  },
  bcrypt: {
    saltRounds: parseInt(required("BCRYPT_SALT_ROUNDS")),
  },
  host: {
    port: parseInt(required("HOST_PORT")),
  },
  db: {
    host: required("DB_HOST"),
  },
  coolsms: {
    apiKey: required("SMS_API_KEY"),
    apiSecret: required("SMS_API_SECRET"),
    sender: required("SMS_SENDER"),
  },
  youtue: {
    apiKey: required("YOUTUBE_API_KEY"),
  },
  CAPTCHA: {
    apiKey: required("CAPTCHA_API_KEY"),
  },
  weather: {
    apiKey: required("OpenWeather_API_KEY"),
  },
};
