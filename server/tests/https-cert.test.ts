import { readFileSync } from 'node:fs'
import { createServer } from 'node:https'
import type { AddressInfo } from 'node:net'
import { join } from 'node:path'
import { connect } from 'node:tls'
import { X509Certificate } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { boothCertificate } from '../services/https-cert.ts'
import { tempDir } from './helpers.ts'

describe('booth https certificate', () => {
  it('signs a certificate for the laptop addresses with its own authority', async () => {
    const dir = tempDir('rato-certs-')
    const pems = await boothCertificate(dir, ['192.168.1.15'])

    const ca = new X509Certificate(pems.caCert)
    const cert = new X509Certificate(pems.cert)
    expect(ca.ca).toBe(true)
    expect(cert.ca).toBe(false)
    expect(cert.verify(ca.publicKey)).toBe(true)
    expect(cert.checkIP('192.168.1.15')).toBe('192.168.1.15')
    expect(cert.checkIP('127.0.0.1')).toBe('127.0.0.1')
    expect(cert.checkHost('localhost')).toBe('localhost')
    // Apple devices refuse server certificates valid for more than 825 days.
    const days = (Date.parse(cert.validTo) - Date.parse(cert.validFrom)) / 86_400_000
    expect(days).toBeLessThanOrEqual(825)
  })

  it('a browser that trusts only the authority gets a secure connection', async () => {
    const pems = await boothCertificate(tempDir('rato-certs-'), ['192.168.1.15'])
    const server = createServer({ key: pems.key, cert: pems.cert }, (_req, res) => res.end('ok'))
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    const { port } = server.address() as AddressInfo
    try {
      const authorized = await new Promise<boolean>((resolve, reject) => {
        const socket = connect({ host: '127.0.0.1', port, ca: pems.caCert, servername: 'localhost' }, () => {
          resolve(socket.authorized)
          socket.end()
        })
        socket.on('error', reject)
      })
      expect(authorized).toBe(true)
    } finally {
      server.close()
    }
  })

  it('keeps the authority, and the certificate while the addresses still match', async () => {
    const dir = tempDir('rato-certs-')
    const first = await boothCertificate(dir, ['192.168.1.15'])
    const again = await boothCertificate(dir, ['192.168.1.15'])
    expect(again).toEqual(first)
    expect(readFileSync(join(dir, 'rato-booth-ca.crt'), 'utf8')).toBe(first.caCert)
  })

  it('renews only the certificate when the Wi-Fi address changes, so the iPad trust stays', async () => {
    const dir = tempDir('rato-certs-')
    const first = await boothCertificate(dir, ['192.168.1.15'])
    const moved = await boothCertificate(dir, ['10.0.0.7'])
    expect(moved.caCert).toBe(first.caCert)
    expect(moved.cert).not.toBe(first.cert)
    expect(new X509Certificate(moved.cert).checkIP('10.0.0.7')).toBe('10.0.0.7')
  })
})
