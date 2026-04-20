import fs from 'fs';
import path from 'path';

const CERT_PATH = path.resolve(process.cwd(), '../certs/_cert.pem');

export function loadDevCert(): { key: Buffer; cert: Buffer } | null {
  if (!fs.existsSync(CERT_PATH)) return null;
  const pem = fs.readFileSync(CERT_PATH);
  return { key: pem, cert: pem };
}

export const DEV_CERT_PATH = CERT_PATH;
