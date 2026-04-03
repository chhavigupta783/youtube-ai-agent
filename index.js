// ============================================================
// index.js — Main Entry Point (RESEND VERSION)
// ============================================================

require('dotenv').config();

const { fetchTopVideos } = require('./services/youtube');
const { sendEmail } = require('./services/mail');

// ── ASCII Banner ─────────────────────────────────────────────
function printBanner() {
  console.log('\n');
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║      🤖  YouTube AI Monitoring Agent         ║');
  console.log('║      Daily Report — Top 10 AI Videos         ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log(`  ⏰  Started at: ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })} IST`);
  console.log('');
}

// ── Validate required env vars ────────────────────────────────
function validateEnv() {
  const required = ['YOUTUBE_API_KEY', 'RESEND_API_KEY', 'RECIPIENT_EMAIL'];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach((key) => console.error(`   - ${key}`));
    console.error('\n👉 Please fill in your .env file and try again.\n');
    process.exit(1);
  }
}

// ── Main Function ─────────────────────────────────────────────
async function main() {
  printBanner();
  validateEnv();

  try {
    // ── Step 1: Fetch videos ────────────────────────────────
    console.log('🔍 STEP 1: Fetching top AI videos from YouTube...');
    const topVideos = await fetchTopVideos();

    if (!topVideos || topVideos.length === 0) {
      console.warn('\n⚠️ No videos found.');
      process.exit(0);
    }

    console.log(`\n✅ STEP 1 COMPLETE: Found ${topVideos.length} videos.\n`);

    // ── Step 2: Send email ─────────────────────────────────
    console.log('📧 STEP 2: Sending email...');
    await sendEmail(topVideos);

    // ── Success ────────────────────────────────────────────
    console.log('\n');
    console.log('╔══════════════════════════════════════════════╗');
    console.log('║   ✅ Agent completed successfully!            ║');
    console.log('╚══════════════════════════════════════════════╝');
    console.log(`  📬 Report sent to: ${process.env.RECIPIENT_EMAIL}`);
    console.log(`  ⏰ Finished at: ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })} IST`);
    console.log('\n');

  } catch (error) {
    console.error('\n');
    console.error('╔══════════════════════════════════════════════╗');
    console.error('║   ❌ Agent encountered an error!              ║');
    console.error('╚══════════════════════════════════════════════╝');
    console.error(`\n  Error: ${error.message}\n`);

    process.exit(1);
  }
}

// ── Run ───────────────────────────────────────────────────────
main();