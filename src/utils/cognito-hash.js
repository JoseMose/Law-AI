import { createHmac } from 'crypto-js/hmac-sha256';
import { enc } from 'crypto-js';

export const calculateSecretHash = (username, clientId, clientSecret) => {
  const message = username + clientId;
  const hash = createHmac(message, clientSecret);
  return hash.toString(enc.Base64);
};