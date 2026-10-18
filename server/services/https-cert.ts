import { X509Certificate } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { generate } from 'selfsigned'

export interface BoothCertificate {
  key: string
  cert: string
  // The authority an iPad installs and trusts once.
  caCert: string
}

const CA_FILE = 'rato-booth-ca.crt'
const CA_KEY_FILE = 'rato-booth-ca.key'
const CERT_FILE = 'booth.crt'
const KEY_FILE = 'booth.key'
const CA_DAYS = 3650
// Apple devices refuse server certificates valid for more than 825 days.
const CERT_DAYS = 397
// Renew a little before the end, so the booth never starts with an expiring certificate.
const RENEW_DAYS = 30

// The https certificate that lets an iPad open the booth with its camera. The laptop makes its
// own authority once (the iPad trusts it once) and signs a certificate for its current
// addresses with it, renewed when an address changes or the end date nears.
export async function boothCertificate(dir: string, addresses: string[]): Promise<BoothCertificate> {
  mkdirSync(dir, { recursive: true })
  const ca = await authority(dir)
  const certPath = join(dir, CERT_FILE)
  const keyPath = join(dir, KEY_FILE)
  if (existsSync(certPath) && existsSync(keyPath)) {
    const current = { key: readFileSync(keyPath, 'utf8'), cert: readFileSync(certPath, 'utf8'), caCert: ca.cert }
    if (stillGood(current.cert, ca.cert, addresses)) return current
  }

  const pems = await generate([{ name: 'commonName', value: 'Rato photo booth' }], {
    algorithm: 'sha256',
    notAfterDate: daysFromNow(CERT_DAYS),
    ca: { key: ca.key, cert: ca.cert },
    extensions: [
      { name: 'basicConstraints', cA: false },
      { name: 'keyUsage', digitalSignature: true, keyEncipherment: true },
      { name: 'extKeyUsage', serverAuth: true },
      {
        name: 'subjectAltName',
        altNames: [{ type: 2, value: 'localhost' }, { type: 7, ip: '127.0.0.1' }, ...addresses.map((ip) => ({ type: 7 as const, ip }))],
      },
    ],
  })
  writeFileSync(keyPath, pems.private)
  writeFileSync(certPath, pems.cert)
  return { key: pems.private, cert: pems.cert, caCert: ca.cert }
}

async function authority(dir: string): Promise<{ key: string; cert: string }> {
  const certPath = join(dir, CA_FILE)
  const keyPath = join(dir, CA_KEY_FILE)
  if (existsSync(certPath) && existsSync(keyPath)) {
    return { key: readFileSync(keyPath, 'utf8'), cert: readFileSync(certPath, 'utf8') }
  }
  const pems = await generate([{ name: 'commonName', value: 'Rato photo booth (this laptop)' }], {
    algorithm: 'sha256',
    notAfterDate: daysFromNow(CA_DAYS),
    extensions: [
      { name: 'basicConstraints', cA: true, critical: true },
      { name: 'keyUsage', keyCertSign: true, cRLSign: true, digitalSignature: true, critical: true },
    ],
  })
  writeFileSync(keyPath, pems.private)
  writeFileSync(certPath, pems.cert)
  return { key: pems.private, cert: pems.cert }
}

// Signed by this authority, covers every current address, and not near its end date.
function stillGood(certPem: string, caPem: string, addresses: string[]): boolean {
  const cert = new X509Certificate(certPem)
  if (!cert.verify(new X509Certificate(caPem).publicKey)) return false
  if (Date.parse(cert.validTo) < daysFromNow(RENEW_DAYS).getTime()) return false
  return addresses.every((ip) => cert.checkIP(ip) === ip)
}

function daysFromNow(days: number): Date {
  return new Date(Date.now() + days * 86_400_000)
}
