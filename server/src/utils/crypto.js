import crypto from 'node:crypto';

export function randomToken(length = 12) {
  return crypto.randomBytes(length).toString('hex').slice(0, length);
}

export function randomPin(length = 6) {
  let pin = '';
  for (let i = 0; i < length; i++) pin += crypto.randomInt(0, 10);
  return pin;
}

export function sha256(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

export function toIsoString(value) {
  return value instanceof Date ? value.toISOString() : value;
}