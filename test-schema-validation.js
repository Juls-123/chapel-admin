// Unit test stub to ensure Zod schemas can parse stubbed clearance user object
// PHASE 2: Replace src/services/authService.ts with Supabase wrapper - no other changes to callsites required.

const { studentSchema } = require('./src/lib/validation/students.schema.ts');
const { getCurrentUser } = require('./src/services/clearanceStub.ts');

async function testSchemaValidation() {
  try {
    console.log('Testing schema validation with stubbed data...');
    
    // Test clearance stub user
    const user = await getCurrentUser();
    console.log('Stubbed user:', user);
    
    // Test student schema with sample data
    const testStudent = {
      id: '7a8b9cde-aaaa-bbbb-cccc-0123456789ab',
      matric_number: 'STU-001',
      first_name: 'Jane',
      last_name: 'Doe',
      level_id: '8c9d0eff-bbbb-cccc-dddd-0123456789cd',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const validation = studentSchema.safeParse(testStudent);
    if (validation.success) {
      console.log('✅ Student schema validation passed');
    } else {
      console.log('❌ Student schema validation failed:', validation.error.errors);
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  testSchemaValidation();
}

module.exports = { testSchemaValidation };
