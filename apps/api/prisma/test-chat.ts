import * as dotenv from 'dotenv';
dotenv.config();

const API_URL = 'http://localhost:4000/api/v1';
const SITE_KEY = 'ezypharma-pos';

async function main() {
  console.log('\n🧪 Testing Chat API\n');

  const message = 'How do I manage inventory?';
  console.log(`Site Key: ${SITE_KEY}`);
  console.log(`Message: "${message}"`);
  console.log('='.repeat(60));

  try {
    const response = await fetch(`${API_URL}/widget/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        siteKey: SITE_KEY,
        message,
        visitorId: 'test-visitor-123',
      }),
    });

    console.log(`\nStatus: ${response.status}`);
    
    const data = await response.json();
    console.log('\nResponse:');
    console.log(JSON.stringify(data, null, 2));

    if (data.data?.citations) {
      console.log('\n📚 Citations:');
      for (const citation of data.data.citations) {
        console.log(`   - ${citation.title}: ${citation.url}`);
      }
    }

    console.log('\n💬 AI Response:');
    console.log(data.data?.content || data.message || 'No content');

  } catch (error) {
    console.error('Error:', error);
  }
}

main();

