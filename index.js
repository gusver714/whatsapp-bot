const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');

const DATA_FILE = 'data.json';

function loadData() {
  if (fs.existsSync(DATA_FILE)) {
    return JSON.parse(fs.readFileSync(DATA_FILE));
  }
  return {
    balance: 1000,
    bank: 0,
    streak: 0,
    lastDaily: null,
    lastWeekly: null,
    lastAllin: null,
    downCommands: []
  };
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data));
}

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-gpu'
    ],
  }
});

client.on('qr', qr => {
  qrcode.generate(qr, { small: true });
  console.log('Scan the QR code above with WhatsApp!');
});

client.on('ready', () => {
  console.log('Bot is ready!');
});

client.on('message', async msg => {
  const body = msg.body.trim();
  const data = loadData();

  if (data.downCommands.some(cmd => body.startsWith(cmd))) {
    msg.reply('This command is under maintenance.');
    return;
  }

  if (body === '/bal') {
    msg.reply(`💰 Wallet: ${data.balance}🪙`);
  } else if (body === '/bank') {
    msg.reply(`🏦 Bank: ${data.bank}🪙`);
  } else if (body.startsWith('/deposit ')) {
    const amt = parseInt(body.split(' ')[1]);
    if (isNaN(amt) || amt <= 0) return msg.reply('❌ Invalid amount!');
    if (amt > data.balance) return msg.reply('❌ Not enough in wallet!');
    data.balance -= amt; data.bank += amt; saveData(data);
    msg.reply(`✅ Deposited ${amt}🪙!\n💰 Wallet: ${data.balance}🪙\n🏦 Bank: ${data.bank}🪙`);
  } else if (body.startsWith('/withdraw ')) {
    const amt = parseInt(body.split(' ')[1]);
    if (isNaN(amt) || amt <= 0) return msg.reply('❌ Invalid amount!');
    if (amt > data.bank) return msg.reply('❌ Not enough in bank!');
    data.bank -= amt; data.balance += amt; saveData(data);
    msg.reply(`✅ Withdrew ${amt}🪙!\n💰 Wallet: ${data.balance}🪙\n🏦 Bank: ${data.bank}🪙`);
  } else if (body.startsWith('/setbalance ')) {
    const amt = parseInt(body.split(' ')[1]);
    if (isNaN(amt)) return msg.reply('❌ Invalid amount!');
    data.balance = amt; saveData(data);
    msg.reply(`✅ Balance set to ${amt}🪙`);
  } else if (body === '/daily') {
    const now = new Date();
    const last = data.lastDaily ? new Date(data.lastDaily) : null;
    if (last && now - last < 86400000) return msg.reply('❌ Already claimed daily! Come back tomorrow.');
    data.streak = (data.streak || 0) + 1;
    const streakBonus = data.streak * 100;
    data.balance += 1000 + streakBonus;
    data.lastDaily = now.toISOString(); saveData(data);
    msg.reply(`✅ Daily claimed!\n+1000🪙\n+${streakBonus}🪙 Day ${data.streak} streak!\n\n💰 Balance: ${data.balance}🪙`);
  } else if (body === '/weekly') {
    const now = new Date();
    const last = data.lastWeekly ? new Date(data.lastWeekly) : null;
    if (last && now - last < 604800000) return msg.reply('❌ Already claimed weekly! Come back next week.');
    data.balance += 2000; data.lastWeekly = now.toISOString(); saveData(data);
    msg.reply(`✅ Weekly claimed! +2000🪙\n\n💰 Balance: ${data.balance}🪙`);
  } else if (body === '/reset') {
    data.lastAllin = null; data.lastDaily = null; data.lastWeekly = null; saveData(data);
    msg.reply('✅ All cooldowns reset!');
  } else if (body === '/allin') {
    const now = new Date();
    const last = data.lastAllin ? new Date(data.lastAllin) : null;
    if (last && now - last < 60000) {
      const secs = Math.ceil((60000 - (now - last)) / 1000);
      return msg.reply(`⏳ /allin on cooldown, wait ${secs} seconds!`);
    }
    const win = Math.random() < 0.5;
    const bet = data.balance;
    data.balance = win ? data.balance * 2 : 0;
    data.lastAllin = now.toISOString(); saveData(data);
    msg.reply(`🎲 ALL IN — ${bet}🪙\n\n${win ? '🪙 Heads! You won! 🎉' : '🪙 Tails! You lost 😬'}\n\n💰 Balance: ${data.balance}🪙\n\nWait 1 minute before allining again.`);
  } else if (body.startsWith('/coinflip ')) {
    const parts = body.split(' ');
    const choice = parts[1]?.toLowerCase();
    const bet = parseInt(parts[2]);
    if (!['h', 't'].includes(choice)) return msg.reply('❌ Use /coinflip h [bet] or /coinflip t [bet]');
    if (isNaN(bet) || bet <= 0 || bet > data.balance) return msg.reply('❌ Invalid bet!');
    const result = Math.random() < 0.5 ? 'h' : 't';
    const win = choice === result;
    data.balance += win ? bet : -bet; saveData(data);
    msg.reply(`🪙 ${result === 'h' ? 'Heads' : 'Tails'}!\n\n${win ? `✅ You win! +${bet}🪙` : `❌ You lose! -${bet}🪙`}\n\n💰 Balance: ${data.balance}🪙`);
  } else if (body.startsWith('/dice ')) {
    const bet = parseInt(body.split(' ')[1]);
    if (isNaN(bet) || bet <= 0 || bet > data.balance) return msg.reply('❌ Invalid bet!');
    const p = Math.floor(Math.random() * 10) + 1;
    const b = Math.floor(Math.random() * 10) + 1;
    const win = p > b;
    data.balance += win ? bet : -bet; saveData(data);
    msg.reply(`🎲 You: ${p} | Bot: ${b}\n\n${win ? `✅ You win! +${bet}🪙` : `❌ You lose! -${bet}🪙`}\n\n💰 Balance: ${data.balance}🪙`);
  } else if (body.startsWith('/down/remove ')) {
    const cmd = body.split(' ')[1];
    data.downCommands = data.downCommands.filter(c => c !== cmd); saveData(data);
    msg.reply(`✅ ${cmd} restored!`);
  } else if (body === '/down/list') {
    msg.reply(data.downCommands.length === 0 ? '✅ No commands under maintenance.' : `🔧 Under maintenance:\n${data.downCommands.join('\n')}`);
  } else if (body.startsWith('/down ')) {
    const cmd = body.split(' ')[1];
    if (!data.downCommands.includes(cmd)) { data.downCommands.push(cmd); saveData(data); }
    msg.reply(`🔧 ${cmd} is now under maintenance.`);
  } else if (body === '/commands') {
    msg.reply(`🎮 *Games*\n/trivia /wordle /hangman /tictactoe /rps /riddle /guess /math\n\n💰 *Economy*\n/bal /bank /deposit /withdraw /setbalance /daily /weekly\n\n🎲 *Gambling*\n/coinflip /dice /blackjack /slots /allin /war /scratch /roulette /highlow /highcard /rocketride\n\n🛠 *Maintenance*\n/down /down/remove /down/list\n\n📊 *Other*\n/reset /stats`);
  } else {
    msg.reply('❌ Unknown command. Type */commands* to see all commands.');
  }
});

client.initialize();
