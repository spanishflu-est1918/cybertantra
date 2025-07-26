import { sql } from '@vercel/postgres';
import fs from 'fs/promises';
import path from 'path';

async function setupDatabase() {
  try {
    console.log('Setting up database schema...');
    
    // DANGER: Dropping tables disabled to prevent data loss
    // To drop tables, manually rename drop-tables.sql.DANGEROUS to drop-tables.sql
    const dropPath = path.join(__dirname, 'drop-tables.sql');
    try {
      const dropStatements = await fs.readFile(dropPath, 'utf-8');
      console.log('⚠️  WARNING: drop-tables.sql found! This will DELETE ALL DATA!');
      console.log('⚠️  Skipping drop operation. Rename file to drop-tables.sql.DANGEROUS to prevent this.');
      // Commented out to prevent accidental data loss
      // const drops = dropStatements
      //   .split(';')
      //   .map(s => s.trim())
      //   .filter(s => s.length > 0);
      // 
      // for (const statement of drops) {
      //   console.log(`Dropping: ${statement.substring(0, 50)}...`);
      //   await sql.query(statement + ';');
      // }
    } catch {
      // No drop file, continue safely
    }
    
    // Read the schema files
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = await fs.readFile(schemaPath, 'utf-8');
    
    // Read ingestion tracking schema
    const ingestionSchemaPath = path.join(__dirname, 'ingestion-tracking-schema.sql');
    let ingestionSchema = '';
    try {
      ingestionSchema = await fs.readFile(ingestionSchemaPath, 'utf-8');
    } catch {
      console.log('No ingestion tracking schema found');
    }
    
    // Read conversation history schema
    const conversationSchemaPath = path.join(__dirname, 'conversation-history-schema.sql');
    let conversationSchema = '';
    try {
      conversationSchema = await fs.readFile(conversationSchemaPath, 'utf-8');
    } catch {
      console.log('No conversation history schema found');
    }
    
    // Check for all updates file first, then individual updates
    const allUpdatesPath = path.join(__dirname, 'all-updates.sql');
    let updates = '';
    try {
      updates = await fs.readFile(allUpdatesPath, 'utf-8');
    } catch {
      // Try individual updates file
      const updatesPath = path.join(__dirname, 'schema-updates.sql');
      try {
        updates = await fs.readFile(updatesPath, 'utf-8');
      } catch {
        // No updates file
      }
    }
    
    // Split by semicolons and execute each statement
    const statements = schema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    // Execute main schema
    for (const statement of statements) {
      console.log(`Executing: ${statement.substring(0, 50)}...`);
      await sql.query(statement + ';');
    }
    
    // Execute ingestion tracking schema if available
    if (ingestionSchema) {
      const ingestionStatements = ingestionSchema
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);
      
      console.log('\nSetting up ingestion tracking tables...');
      for (const statement of ingestionStatements) {
        console.log(`Executing: ${statement.substring(0, 50)}...`);
        await sql.query(statement + ';');
      }
    }
    
    // Execute conversation history schema if available
    if (conversationSchema) {
      const conversationStatements = conversationSchema
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);
      
      console.log('\nSetting up conversation history tables...');
      for (const statement of conversationStatements) {
        console.log(`Executing: ${statement.substring(0, 50)}...`);
        await sql.query(statement + ';');
      }
    }
    
    // Execute updates if any
    if (updates) {
      const updateStatements = updates
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);
      
      console.log('\nApplying schema updates...');
      for (const statement of updateStatements) {
        console.log(`Executing: ${statement.substring(0, 50)}...`);
        await sql.query(statement + ';');
      }
    }
    
    console.log('✅ Database schema created successfully!');
    
    // Verify pgvector is installed
    const result = await sql`
      SELECT extname, extversion 
      FROM pg_extension 
      WHERE extname = 'vector'
    `;
    
    if (result.rows.length > 0) {
      console.log(`✅ pgvector ${result.rows[0].extversion} is installed`);
    } else {
      console.error('❌ pgvector extension not found');
    }
    
  } catch (error) {
    console.error('Error setting up database:', error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  setupDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export { setupDatabase };