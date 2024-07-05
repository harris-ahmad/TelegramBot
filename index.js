const express = require('express');
const bodyParser = require('body-parser');
const TelegramBot = require('node-telegram-bot-api');
const cron = require('node-cron');
const axios = require('axios');
const User = require('./models/User');
const Alert = require('./models/Alert');
const { sequelize, connectSQL } = require('./config/db');
require('dotenv').config();

// Initialize Express app
const app = express();
app.use(bodyParser.json());

// Initialize Telegram bot
const token = process.env.TELEGRAM_TOKEN;
const bot = new TelegramBot(token, { polling: true });

// Set webhook URL (optional if using polling)
const url = `https://api.telegram.org/bot${token}/setWebhook?url=${process.env.NGROK_URL}`

// Connect to SQL database
connectSQL().then(() => {
  console.log('Connected to SQL database');
}).catch((error) => {
  console.error('Error connecting to SQL database:', error);
});

// Sync database
sequelize.sync({ alter: true }).then(() => {
  console.log('Database synced');
}).catch(err => {
  console.error('Error syncing database:', err);
});

// Helper function to fetch crypto data from CoinGecko
const getCryptoData = async (tokenSymbol) => {
  try {
    const response = await axios.get(`https://api.coingecko.com/api/v3/coins/markets`, {
      params: {
        vs_currency: 'usd',
        ids: tokenSymbol,
      },
      headers: {
        'X-CoinAPI-Key': 'CG-x5aaceWAZijWCJ8Ba2cgXUz3' //
      }
    });
    return response.data[0];
  } catch (error) {
    console.error('Error fetching cryptocurrency data:', error);
    return null;
  }
};

// Listener for /help command
bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;
  const response = 'Commands:\n/register - Register with the bot\n/get_token [token symbol] - Get cryptocurrency data\n/set_alert [token symbol] [price threshold] [above/below] - Set a price alert\n/list_alerts - List all alerts\n/remove_alert [alert ID] - Remove an alert';
  bot.sendMessage(chatId, response);
});

// Listener for /start command
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, 'Welcome to Crypto Data Bot! Use /register to get started.');
});

// Listener for /register command
bot.onText(/\/register/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id.toString();  // Convert userId to string
  const username = msg.from.username || msg.from.first_name;

  try {
    const [user, created] = await User.findOrCreate({
      where: { userId },
      defaults: { username }
    });

    if (created) {
      bot.sendMessage(chatId, 'You are now registered!');
    } else {
      bot.sendMessage(chatId, 'You are already registered.');
    }
  } catch (error) {
    bot.sendMessage(chatId, 'Failed to register. Please try again.');
  }

  bot.sendMessage(userId, `Welcome to Crypto Data Bot, ${username}! Use /help to see the list of available commands.`);
});


// Listener for /get_token command
bot.onText(/\/get_token (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const tokenSymbol = match[1].toLowerCase();

  const data = await getCryptoData(tokenSymbol);
  if (data) {
    const message = `
      Symbol: ${data.symbol.toUpperCase()}
      Current Price: $${data.current_price}
      Market Cap: $${data.market_cap}
      Number of Holders: ${data.circulating_supply}
      24h Trading Volume: $${data.total_volume}
      Price Change (24h): ${data.price_change_percentage_24h}%
    `;
    bot.sendMessage(chatId, message);
  } else {
    bot.sendMessage(chatId, "Failed to fetch data. Please check the token symbol and try again.");
  }
});

// Listener for /set_alert command
bot.onText(/\/set_alert (.+) (.+) (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id.toString();
  const tokenSymbol = match[1].toLowerCase();
  const priceThreshold = parseFloat(match[2]);
  const condition = match[3].toLowerCase();

  try {
    const user = await User.findByPk(userId);
    if (!user) {
      bot.sendMessage(chatId, 'You need to register first using /register.');
      return;
    }

    const newAlert = await Alert.create({ userId, tokenSymbol, priceThreshold, condition });
    bot.sendMessage(chatId, 'Alert set successfully!');
  } catch (error) {
    console.log("Error setting alert:", error.message)
    bot.sendMessage(chatId, 'Failed to set alert. Please try again.');
  }
});

// Listener for /list_alerts command
bot.onText(/\/list_alerts/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id.toString();

  try {
    const alerts = await Alert.findAll({ where: { userId } });

    if (alerts.length === 0) {
      bot.sendMessage(chatId, 'No active alerts found.');
    } else {
      let response = 'Your active alerts:\n';
      alerts.forEach((alert, index) => {
        response += `${index + 1}. [${alert.id}] ${alert.tokenSymbol.toUpperCase()} - ${alert.condition} $${alert.priceThreshold}\n`;
      });
      bot.sendMessage(chatId, response);
    }
  } catch (error) {
    bot.sendMessage(chatId, 'Failed to list alerts. Please try again.');
  }
});

// Listener for /remove_alert command
bot.onText(/\/remove_alert (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const alertId = match[1];

  try {
    const alert = await Alert.findByPk(alertId);
    if (!alert) {
      bot.sendMessage(chatId, 'Alert not found. Please check the alert ID.');
      return;
    }

    await alert.destroy();
    bot.sendMessage(chatId, 'Alert removed successfully!');
  } catch (error) {
    bot.sendMessage(chatId, 'Failed to remove alert. Please try again.');
  }
});

// Daily summary of alerts at 8:00 AM
cron.schedule('0 8 * * *', async () => {
  try {
    const users = await User.findAll();

    for (const user of users) {
      const alerts = await Alert.findAll({ where: { userId: user.userId } });

      if (alerts.length > 0) {
        let response = 'Daily summary of your active alerts:\n';
        alerts.forEach((alert, index) => {
          response += `${index + 1}. [${alert.id}] ${alert.tokenSymbol.toUpperCase()} - ${alert.condition} $${alert.priceThreshold}\n`;
        });
        bot.sendMessage(user.userId, response);
      }
    }
  } catch (error) {
    console.error('Failed to send daily summary:', error);
  }
});

// Reminder 1 hour before alert is triggered
cron.schedule('*/5 * * * *', async () => {
  try {
    const alerts = await Alert.findAll();

    for (const alert of alerts) {
      const data = await getCryptoData(alert.tokenSymbol);
      if (data) {
        const currentPrice = data.current_price;
        let alertTriggered = false;

        if (alert.condition === 'above' && currentPrice > alert.priceThreshold) {
          alertTriggered = true;
        } else if (alert.condition === 'below' && currentPrice < alert.priceThreshold) {
          alertTriggered = true;
        }

        if (alertTriggered) {
          bot.sendMessage(alert.userId, `Alert triggered: ${alert.tokenSymbol.toUpperCase()} is ${alert.condition} $${alert.priceThreshold}. Current price: $${currentPrice}`);
        }
      }
    }
  } catch (error) {
    console.error('Failed to check alerts:', error);
  }
});

// Express server setup
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Set webhook (optional if using polling)
const setWebhook = async () => {
  try {
    const response = await axios.get(url);
    console.log('Webhook set:', response.data);
  } catch (error) {
    console.error('Error setting webhook:', error);
  }
};

setWebhook();
