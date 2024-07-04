const express = require('express');
const bodyParser = require('body-parser');
const TelegramBot = require('node-telegram-bot-api');
const cron = require('node-cron');
const axios = require('axios');
const User = require('./models/User');
const Task = require('./models/Task');
const connectMongoDB = require('./config/db');
require('dotenv').config();

// connecting to the db
connectMongoDB();

const token = process.env.TELEGRAM_TOKEN;
const bot = new TelegramBot(token);

const app = express();
app.use(bodyParser.json());

// Webhook route
app.post(`/bot${token}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// listener for /start command
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, 'Welcome to Task Manager Bot! Use /register to get started.');
});

// listener for /register command
bot.onText(/\/register/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const username = msg.from.username || msg.from.first_name;

  User.findOne({ userId }, (err, user) => {
    if (user) {
      bot.sendMessage(chatId, 'You are already registered.');
    } else {
      const newUser = new User({ userId, username });
      newUser.save((err) => {
        if (err) {
          bot.sendMessage(chatId, 'Registration failed. Please try again.');
        } else {
          bot.sendMessage(chatId, 'You are registered!');
        }
      });
    }
  });
});

bot.onText(/\/create_task (.+) (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const description = match[1];
  const dueDate = new Date(match[2]);

  User.findOne({ userId }, (err, user) => {
    if (user) {
      const newTask = new Task({ userId, description, dueDate, completed: false });
      newTask.save((err) => {
        if (err) {
          bot.sendMessage(chatId, 'Failed to create task. Please try again.');
        } else {
          bot.sendMessage(chatId, 'Task created successfully!');
        }
      });
    } else {
      bot.sendMessage(chatId, 'You need to register first using /register.');
    }
  });
});

bot.onText(/\/update_task (\d+) (.+) (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const taskId = match[1];
  const newDescription = match[2];
  const newDueDate = new Date(match[3]);

  Task.findByIdAndUpdate(taskId, { description: newDescription, dueDate: newDueDate }, (err, task) => {
    if (err || !task) {
      bot.sendMessage(chatId, 'Failed to update task. Please check the task ID.');
    } else {
      bot.sendMessage(chatId, 'Task updated successfully!');
    }
  });
});

bot.onText(/\/delete_task (\d+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const taskId = match[1];

  Task.findByIdAndDelete(taskId, (err) => {
    if (err) {
      bot.sendMessage(chatId, 'Failed to delete task. Please check the task ID.');
    } else {
      bot.sendMessage(chatId, 'Task deleted successfully!');
    }
  });
});

bot.onText(/\/list_tasks/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  Task.find({ userId }, (err, tasks) => {
    if (err || tasks.length === 0) {
      bot.sendMessage(chatId, 'No tasks found.');
    } else {
      let response = 'Your tasks:\n';
      tasks.forEach((task, index) => {
        response += `${index + 1}. [${task._id}] ${task.description} - Due: ${task.dueDate}\n`;
      });
      bot.sendMessage(chatId, response);
    }
  });
});

// Daily summary of pending tasks at 8:00 AM
cron.schedule('0 8 * * *', () => {
  User.find({}, (err, users) => {
    users.forEach(user => {
      Task.find({ userId: user.userId, completed: false }, (err, tasks) => {
        if (tasks.length > 0) {
          let response = 'Daily summary of your pending tasks:\n';
          tasks.forEach((task, index) => {
            response += `${index + 1}. [${task._id}] ${task.description} - Due: ${task.dueDate}\n`;
          });
          bot.sendMessage(user.userId, response);
        }
      });
    });
  });
});

// Reminder 1 hour before due date
cron.schedule('*/5 * * * *', () => {  // Check every 5 minutes for demo purposes
  const now = new Date();
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
  Task.find({ dueDate: { $gte: now, $lte: oneHourLater }, completed: false }, (err, tasks) => {
    tasks.forEach(task => {
      bot.sendMessage(task.userId, `Reminder: Your task "${task.description}" is due at ${task.dueDate}`);
    });
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Set webhook
const setWebhook = async () => {
  const url = `https://api.telegram.org/bot${token}/setWebhook`;
  const webhookUrl = `https://${process.env.NGROK_URL}/bot${token}`;

  try {
    const response = await axios.post(url, { url: webhookUrl });
    console.log('Webhook set:', response.data);
  } catch (error) {
    console.error('Error setting webhook:', error);
  }
};

setWebhook();
