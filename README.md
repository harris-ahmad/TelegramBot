# TelegramBot

TelegramBot is a Telegram bot that allows users to fetch cryptocurrency data and set price alerts. The bot fetches data from the CoinGecko API and notifies users about the current prices and their set alerts.

## Features

- Register with the bot
- Fetch cryptocurrency data
- Set price alerts for specific tokens
- List and remove alerts
- Receive daily summaries of active alerts
- Get notified when an alert is triggered

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)
- A Telegram bot token
- A MySQL database

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/harris-ahmad/TelegramBot.git
cd TelegramBot
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

Create a `.env` file in the root directory and add the following variables:

```plaintext
PORT=3000
TELEGRAM_TOKEN=your_telegram_bot_token
NGROK_URL=your_ngrok_url
DATABASE_URL=mysql://username:password@localhost:3306/crypto_data_bot
```

### 4. Configure MySQL Database

Update `./config/db.js` with your database connection details.

### 5. Run the Application

```bash
npm start
```

### 6. Set the Webhook (Optional)

If you prefer to use a webhook instead of polling:

```bash
node setWebhook.js
```

## Usage

### Register with the Bot

Use the `/register` command to register with the bot.

### Get Cryptocurrency Data

Use the `/get_token [token symbol]` command to fetch data for a specific token.

### Set Price Alerts

Use the `/set_alert [token symbol] [price threshold] [above/below]` command to set a price alert.

### List Alerts

Use the `/list_alerts` command to list all your active alerts.

### Remove an Alert

Use the `/remove_alert [alert ID]` command to remove a specific alert.

### Get Help

Use the `/help` command to see the list of available commands.

## Project Structure

- `index.js`: Main server file
- `models/`: Contains Sequelize models for User and Alert
- `config/db.js`: Database configuration
- `.env`: Environment variables

## Dependencies

- `express`: Fast, unopinionated, minimalist web framework for Node.js
- `body-parser`: Node.js body parsing middleware
- `node-telegram-bot-api`: Telegram Bot API for Node.js
- `node-cron`: Cron jobs for Node.js
- `axios`: Promise-based HTTP client for the browser and Node.js
- `sequelize`: Promise-based Node.js ORM for MySQL, MariaDB, SQLite, and PostgreSQL
- `dotenv`: Loads environment variables from a `.env` file

## Contributing

Contributions are welcome! Please fork the repository and submit a pull request.

## License

This project is licensed under the MIT License.

## Demo Video Link

[YouTube Video](https://www.youtube.com/watch?v=0ZMuzzs0iJA)

---

**Happy Crypto Tracking!**
