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

const client = new Client({ authStrategy: new LocalAuth() });

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

  // BAL
  if (body === '/bal') {
    msg.reply(`💰 Wallet: ${data.balance}🪙`);
  }

  // BANK
  else if (body === '/bank') {
    msg.reply(`🏦 Bank: ${data.bank}🪙`);
  }

  // DEPOSIT
  else if (body.startsWith('/deposit ')) {
    const amt = parseInt(body.split(' ')[1]);
    if (isNaN(amt) || amt <= 0) return msg.reply('❌ Invalid amount!');
    if (amt > data.balance) return msg.reply('❌ Not enough in wallet!');
    data.balance -= amt;
    data.bank += amt;
    saveData(data);
    msg.reply(`✅ Deposited ${amt}🪙 to bank!\n💰 Wallet: ${data.balance}🪙\n🏦 Bank: ${data.bank}🪙`);
  }

  // WITHDRAW
  else if (body.startsWith('/withdraw ')) {
    const amt = parseInt(body.split(' ')[1]);
    if (isNaN(amt) || amt <= 0) return msg.reply('❌ Invalid amount!');
    if (amt > data.bank) return msg.reply('❌ Not enough in bank!');
    data.bank -= amt;
    data.balance += amt;
    saveData(data);
    msg.reply(`✅ Withdrew ${amt}🪙 from bank!\n💰 Wallet: ${data.balance}🪙\n🏦 Bank: ${data.bank}🪙`);
  }

  // SETBALANCE
  else if (body.startsWith('/setbalance ')) {
    const amt = parseInt(body.split(' ')
