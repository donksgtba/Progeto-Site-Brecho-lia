import postgres from 'postgres'

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error('DATABASE_URL is not set. Configure it in your Render env vars.');
}

const sql = postgres(connectionString, { ssl: "require" })

export default sql
