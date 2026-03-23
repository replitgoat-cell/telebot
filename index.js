const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const express = require('express');
const settings = require('./settings.json');

// ===== EXPRESS SERVER =====
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('✅ Jan Telegram Bot is Running!');
});

app.listen(PORT, () => {
  console.log(`🌐 Server running on port ${PORT}`);
});

// ===== TELEGRAM BOT =====
const token = settings.token;
const adminIds = settings.adminIds || [];

const bot = new TelegramBot(token, { polling: true });

console.log('🤖 Jan Telegram Bot Running...');

// API base URL
const API_BASE = 'https://jan-api-by-aminul-sordar.vercel.app';

// ===== Helper functions =====
async function fetchCount() {
  try {
    const res = await axios.get(`${API_BASE}/count`);
    return res.data;
  } catch (e) {
    return { questions: 0, answers: 0 };
  }
}

async function getAnswer(question) {
  try {
    const res = await axios.get(`${API_BASE}/answer/${encodeURIComponent(question)}`);
    return res.data.answer || "❌ আমি এখনো এটা শিখিনি, দয়া করে আমাকে শেখান! 👀";
  } catch (e) {
    return "❌ সার্ভার সমস্যা! পরে আবার চেষ্টা করুন!";
  }
}

async function teachMultiple(qaText) {
  try {
    const res = await axios.post(`${API_BASE}/teach`, { text: qaText });
    return res.data.message;
  } catch (e) {
    return "❌ শেখানো ব্যর্থ হয়েছে!";
  }
}

function isAdmin(userId) {
  return adminIds.includes(userId);
}

// ===== Random replies =====
const randomReplies = [
  "হ্যাঁ 😀, আমি এখানে আছি",
  "কেমন আছো?",
  "বলো জান কি করতে পারি তোমার জন্য",
  "I love you 💝",
  "ভালোবাসি তোমাকে 🤖"
];

// ===== Typing Effect =====
async function sendTyping(chatId) {
  await bot.sendChatAction(chatId, 'typing');
}

// ===== /start =====
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    "🤖 Jan AI Bot চালু হয়েছে!\n\n" +
    "📌 কমান্ড লিস্ট:\n" +
    "/jan <প্রশ্ন>\n" +
    "/jan count\n" +
    "/jan teach প্রশ্ন|উত্তর\n\n" +
    "অথবা লিখুন: jan <প্রশ্ন>"
  );
});

// ===== /help =====
bot.onText(/\/help/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    "ℹ️ Help:\n\n/jan <প্রশ্ন>\n/jan count\n/jan teach প্রশ্ন|উত্তর"
  );
});

// ===== /jan command =====
bot.onText(/\/jan(?: (.+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const input = match[1] ? match[1].trim() : '';

  if (!input) {
    return bot.sendMessage(chatId, "❌ কিছু লিখুন...\nExample: /jan তুমি কে?");
  }

  await sendTyping(chatId);

  const parts = input.split(' ');
  const cmd = parts[0].toLowerCase();

  if (cmd === 'count') {
    const count = await fetchCount();
    return bot.sendMessage(chatId,
      `📊 মোট প্রশ্ন: ${count.questions}\nমোট উত্তর: ${count.answers}`
    );
  }

  if (cmd === 'teach') {
    if (!isAdmin(userId)) {
      return bot.sendMessage(chatId, "❌ Admin only!");
    }

    const teachInput = parts.slice(1).join(' ').trim();

    if (!teachInput) {
      return bot.sendMessage(chatId,
        "❌ লিখুন:\n/jan teach প্রশ্ন|উত্তর"
      );
    }

    const result = await teachMultiple(teachInput);
    return bot.sendMessage(chatId, result);
  }

  const answer = await getAnswer(input);
  return bot.sendMessage(chatId, answer);
});

// ===== ALL MESSAGE HANDLER =====
bot.on('message', async (msg) => {
  const text = msg.text || '';
  const userId = msg.from.id;
  const chatId = msg.chat.id;

  if (text.startsWith('/')) return;

  // ✅ Reply auto AI
  if (msg.reply_to_message) {
    await sendTyping(chatId);
    const answer = await getAnswer(text.trim());
    return bot.sendMessage(chatId, answer);
  }

  // ✅ jan trigger
  if (text.toLowerCase().startsWith('jan')) {
    const rest = text.slice(3).trim();

    if (!rest) {
      const randomReply = randomReplies[Math.floor(Math.random() * randomReplies.length)];
      return bot.sendMessage(chatId, randomReply);
    }

    await sendTyping(chatId);

    const parts = rest.split(' ');
    const cmd = parts[0].toLowerCase();

    if (cmd === 'count') {
      const count = await fetchCount();
      return bot.sendMessage(chatId,
        `📊 মোট প্রশ্ন: ${count.questions}\nমোট উত্তর: ${count.answers}`
      );
    }

    if (cmd === 'teach') {
      if (!isAdmin(userId)) {
        return bot.sendMessage(chatId, "❌ Admin only!");
      }

      const teachInput = parts.slice(1).join(' ').trim();

      if (!teachInput) {
        return bot.sendMessage(chatId,
          "❌ লিখুন: jan teach প্রশ্ন|উত্তর"
        );
      }

      const result = await teachMultiple(teachInput);
      return bot.sendMessage(chatId, result);
    }

    const answer = await getAnswer(rest);
    return bot.sendMessage(chatId, answer);
  }
});

// ===== ERROR =====
bot.on('polling_error', (error) => {
  console.error('Polling error:', error.message);
});
