/**
 * Test login API
 */

async function main() {
  const credentials = [
    { email: 'admin.demo@msu.edu.ph', password: 'Demo123!@#', role: 'admin' },
    { email: 'teacher.demo@msu.edu.ph', password: 'Demo123!@#', role: 'teacher' },
    { email: 'student.demo@msu.edu.ph', password: 'Demo123!@#', role: 'student' },
  ];

  console.log('Testing login API at http://localhost:3002/api/auth/login\n');

  for (const cred of credentials) {
    console.log(`Testing ${cred.role}: ${cred.email}`);

    try {
      const response = await fetch('http://localhost:3002/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: cred.email,
          password: cred.password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        console.log(`  ✅ SUCCESS - Role: ${data.user?.role}, Redirect: ${data.redirectTo}`);
      } else {
        console.log(`  ❌ FAILED - ${response.status}: ${data.error}`);
      }
    } catch (error) {
      console.log(`  ❌ ERROR - ${error}`);
    }

    console.log('');
  }
}

main();
