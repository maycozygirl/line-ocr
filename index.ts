import * as line from '@line/bot-sdk'
import express from 'express'
import 'dotenv/config'
import { PrismaClient } from '@prisma/client';

// create Prisma client
const prisma = new PrismaClient();

// create LINE SDK config from env variables
const config: line.MiddlewareConfig = {
  channelSecret: process.env.CHANNEL_SECRET || '',
};

// create LINE SDK client
const channelAccessToken = process.env.CHANNEL_ACCESS_TOKEN || '';
const client = new line.messagingApi.MessagingApiClient({
  channelAccessToken
});

// create Express app
// about Express itself: https://expressjs.com/
const app = express();

// register a webhook handler with middleware
// about the middleware, please refer to doc
app.post('/webhook', line.middleware(config), (req, res) => {
  Promise
    .all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error(err);
      res.status(500).end();
    });
});

// event handler
async function handleEvent(event: line.MessageEvent) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    // ignore non-text-message event
    return Promise.resolve(null);
  }

  // create an echoing text message
  const echo = { type: 'text', text: event.message.text };

  // save message to database
  try {
    console.log('Saving message to database:', {
      content: event.message.text,
      userId: event.source.userId ?? '',
    });

    await prisma.message.create({
      data: {
        content: event.message.text,
        userId: event.source.userId ?? '',
      }
    });

    console.log('Message saved successfully');
  } catch (error) {
    console.error('Error saving message to database:', error);
  }

  console.log(event);

  // use reply API
  return client.replyMessage({
    replyToken: event.replyToken,
    messages: [echo],
  });
}

// listen on port
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`listening on ${port}`);
});