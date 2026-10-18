import { type NetworkInterfaceInfo, networkInterfaces } from 'node:os'

type Interfaces = NodeJS.Dict<NetworkInterfaceInfo[]>

// The address phones on the same Wi-Fi use to reach the booth, for share links and QR codes.
// PUBLIC_HOST overrides it when the laptop has several networks and picks the wrong one.
export function shareBaseUrl(port: number, override = '', interfaces: Interfaces = networkInterfaces()): string {
  const host = override || lanAddress(interfaces) || 'localhost'
  return `http://${host}:${port}`
}

// The laptop's own IPv4 address on a home or venue network (192.168.x, 10.x, 172.16-31.x).
export function lanAddress(interfaces: Interfaces): string | null {
  const candidates: string[] = []
  for (const addresses of Object.values(interfaces)) {
    for (const address of addresses ?? []) {
      if (address.family === 'IPv4' && !address.internal) candidates.push(address.address)
    }
  }
  return candidates.find(isPrivateAddress) ?? candidates[0] ?? null
}

function isPrivateAddress(address: string): boolean {
  const [a, b] = address.split('.').map(Number)
  return a === 10 || (a === 192 && b === 168) || (a === 172 && b >= 16 && b <= 31)
}
