// Helper de teste — constrói um PNG RGBA mínimo e válido em memória, sem
// depender de nenhum arquivo fixture. Usado pelos testes de upload de ícone
// pra exercitar de verdade a checagem de dimensões/proporção (icon-validation.ts),
// que precisa de bytes de imagem reais (uma string qualquer não passa no parser).

import zlib from 'node:zlib'

function crc32(buf: Buffer): number {
  let crc = ~0
  for (const byte of buf) {
    crc ^= byte
    for (let i = 0; i < 8; i++) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1))
    }
  }
  return ~crc >>> 0
}

function chunk(type: string, data: Buffer): Buffer {
  const typeBuf = Buffer.from(type, 'ascii')
  const lengthBuf = Buffer.alloc(4)
  lengthBuf.writeUInt32BE(data.length, 0)
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([lengthBuf, typeBuf, data, crcBuf])
}

/** Constrói um PNG RGBA opaco e preto, válido, com as dimensões dadas. */
export function buildTestPng(width: number, height: number): Buffer {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type: RGBA
  ihdr[10] = 0 // compression
  ihdr[11] = 0 // filter
  ihdr[12] = 0 // interlace

  const rowSize = width * 4 + 1 // +1 byte de filtro por linha
  const raw = Buffer.alloc(rowSize * height, 0)
  for (let y = 0; y < height; y++) {
    raw[y * rowSize] = 0 // filtro "none"
  }
  const idatData = zlib.deflateSync(raw)

  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', idatData),
    chunk('IEND', Buffer.alloc(0)),
  ])
}
