import { PrismaClient } from '@prisma/client'
import { readFileSync } from 'fs'

const prisma = new PrismaClient()
const sql = readFileSync('/Users/ericeric/.claude/jobs/e6842533/tmp/migration.sql', 'utf8')

// Split by statement
const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 10)

for (const stmt of statements) {
  try {
    await prisma.$executeRawUnsafe(stmt)
    const tableName = stmt.match(/CREATE TABLE IF NOT EXISTS "(\w+)"/)?.[1]
    if (tableName) console.log(`✅ ${tableName}`)
  } catch (e) {
    console.log('⚠️', e.message.slice(0, 80))
  }
}

await prisma.$disconnect()
