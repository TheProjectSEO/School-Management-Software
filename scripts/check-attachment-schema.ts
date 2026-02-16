/**
 * Check lesson_attachments table schema
 * Run: npx tsx scripts/check-attachment-schema.ts
 */

import { createServiceClient } from '../lib/supabase/service'

const REQUIRED_COLUMNS = [
  { name: 'id', type: 'uuid', nullable: false },
  { name: 'lesson_id', type: 'uuid', nullable: false },
  { name: 'title', type: ['text', 'character varying'], nullable: false },
  { name: 'description', type: 'text', nullable: true },
  { name: 'file_url', type: 'text', nullable: false },
  { name: 'file_type', type: ['text', 'character varying'], nullable: true },
  { name: 'file_size_bytes', type: ['bigint', 'integer'], nullable: true },
  { name: 'order_index', type: 'integer', nullable: false },
  { name: 'download_count', type: 'integer', nullable: false },
  { name: 'created_at', type: 'timestamp without time zone', nullable: false },
  { name: 'created_by', type: 'uuid', nullable: true },
  { name: 'updated_at', type: 'timestamp without time zone', nullable: false },
]

async function checkSchema() {
  const supabase = createServiceClient()

  console.log('🔍 Checking lesson_attachments table schema...\n')

  try {
    // Query information_schema to get column information
    const { data: columns, error } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT
          column_name,
          data_type,
          is_nullable,
          column_default
        FROM
          information_schema.columns
        WHERE
          table_schema = 'public'
          AND table_name = 'lesson_attachments'
        ORDER BY
          ordinal_position;
      `
    })

    if (error) {
      // Fallback: Try direct query if RPC doesn't exist
      console.log('⚠️  RPC method not available, checking via direct query...\n')

      const { data: testData, error: testError } = await supabase
        .from('lesson_attachments')
        .select('*')
        .limit(1)
        .single()

      if (testError && testError.code === '42P01') {
        console.error('❌ Table lesson_attachments does not exist!')
        return
      }

      if (testData || testError?.code === 'PGRST116') {
        console.log('✓ Table lesson_attachments exists')
        console.log('\nℹ️  Cannot validate column schema without exec_sql RPC.')
        console.log('   Please run scripts/validate-attachment-schema.sql in Supabase SQL Editor.')
        return
      }
    }

    if (!columns || columns.length === 0) {
      console.error('❌ No columns found for lesson_attachments table')
      return
    }

    console.log('✓ Table lesson_attachments exists\n')
    console.log('📋 Columns found:\n')

    const existingColumns = new Map(
      columns.map((col: any) => [col.column_name, col])
    )

    let allValid = true

    // Check each required column
    for (const required of REQUIRED_COLUMNS) {
      const existing = existingColumns.get(required.name)

      if (!existing) {
        console.log(`  ❌ ${required.name} - MISSING`)
        allValid = false
        continue
      }

      const expectedTypes = Array.isArray(required.type) ? required.type : [required.type]
      const typeMatch = expectedTypes.some(t =>
        existing.data_type.toLowerCase().includes(t.toLowerCase())
      )

      const nullableMatch = existing.is_nullable === (required.nullable ? 'YES' : 'NO')

      const status = typeMatch && nullableMatch ? '✓' : '⚠️'

      console.log(`  ${status} ${required.name}`)
      console.log(`     Type: ${existing.data_type} ${typeMatch ? '✓' : `(expected ${expectedTypes.join(' or ')})`}`)
      console.log(`     Nullable: ${existing.is_nullable} ${nullableMatch ? '✓' : `(expected ${required.nullable ? 'YES' : 'NO'})`}`)

      if (existing.column_default) {
        console.log(`     Default: ${existing.column_default}`)
      }
      console.log()

      if (!typeMatch || !nullableMatch) {
        allValid = false
      }
    }

    // Check for extra columns
    const extraColumns = Array.from(existingColumns.keys()).filter(
      name => !REQUIRED_COLUMNS.find(req => req.name === name)
    )

    if (extraColumns.length > 0) {
      console.log('ℹ️  Extra columns (not required):')
      extraColumns.forEach(col => console.log(`     - ${col}`))
      console.log()
    }

    // Check for existing data
    const { count, error: countError } = await supabase
      .from('lesson_attachments')
      .select('*', { count: 'exact', head: true })

    if (!countError) {
      console.log(`📊 Total attachments in database: ${count || 0}`)

      // Check for missing file sizes
      const { count: missingSize } = await supabase
        .from('lesson_attachments')
        .select('*', { count: 'exact', head: true })
        .is('file_size_bytes', null)

      if (missingSize && missingSize > 0) {
        console.log(`   ⚠️  ${missingSize} attachment(s) missing file_size_bytes`)
      }
    }

    console.log()
    if (allValid) {
      console.log('✅ Schema validation passed!')
    } else {
      console.log('⚠️  Schema validation found issues.')
      console.log('   Run scripts/validate-attachment-schema.sql for detailed analysis.')
    }

  } catch (err) {
    console.error('❌ Error checking schema:', err)
    console.log('\nPlease run scripts/validate-attachment-schema.sql in Supabase SQL Editor instead.')
  }
}

checkSchema().then(() => {
  process.exit(0)
}).catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
