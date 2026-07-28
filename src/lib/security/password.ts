import crypto from 'node:crypto';

const SALT_LENGTH = 16;
const KEY_LENGTH = 64;

export async function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(SALT_LENGTH).toString('hex');
    crypto.scrypt(password, salt, KEY_LENGTH, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(`${salt}:${derivedKey.toString('hex')}`);
    });
  });
}

export async function verifyPassword(
  password: string,
  combinedHash: string
): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const [salt, keyHex] = combinedHash.split(':');
    if (!salt || !keyHex) return resolve(false);

    crypto.scrypt(password, salt, KEY_LENGTH, (err, derivedKey) => {
      if (err) return reject(err);
      const keyBuffer = Buffer.from(keyHex, 'hex');
      resolve(crypto.timingSafeEqual(derivedKey, keyBuffer));
    });
  });
}
