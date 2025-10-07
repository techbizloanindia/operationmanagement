import { main } from './bulk-create-sales-users.js';

console.log('🚀 Starting bulk user creation...');
main().then(() => {
  console.log('✅ Bulk creation completed!');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
