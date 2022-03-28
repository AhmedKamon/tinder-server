const PORT = 8000;
const express = require('express');
const { MongoClient } = require('mongodb');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const uri =
  'mongodb+srv://kamonAhmed1:kamonAhmed@cluster0.tobhk.mongodb.net/tinder?retryWrites=true&w=majority';

const app = express();
app.use(cors());
app.use(express.json());

// sing up api
app.post('/signup', async (req, res) => {
  const client = new MongoClient(uri);
  const { email, password } = req.body;
  const generatedUserId = uuidv4();
  const hashedPassword = await bcrypt.hash(password, 10);
  try {
    await client.connect();
    const database = client.db('tinder');
    const users = database.collection('users');
    const existUser = await users.findOne({ email });
    if (existUser) {
      return res.status(409).send('User alredy exists, Please login');
    } else {
      const sanitizedEmail = email.toLowerCase();
      const data = {
        user_id: generatedUserId,
        hashed_password: hashedPassword,
        email: sanitizedEmail,
      };
      const insertedUser = await users.insertOne(data);
      const token = jwt.sign(insertedUser, sanitizedEmail, {
        expiresIn: 60 * 24,
      });
      res
        .status(201)
        .json({ token, userId: generatedUserId, email: sanitizedEmail });
    }
  } catch (error) {
    console.log(error);
  }
});

// login api
app.use('/login', async (req, res) => {
  const client = new MongoClient(uri);
  const { email, password } = req.body;

  try {
    await client.connect();
    const database = client.db('tinder');
    const users = database.collection('users');

    const user = await users.findOne({ email });
    const correctPassword = await bcrypt.compare(
      password,
      user.hashed_password
    );
    if (user && correctPassword) {
      const token = jwt.sign(user, email, { expiresIn: 60 * 24 });
      res.status(201).json({ token, userId: user.user_id, email });
    } else {
      res.status(400).json('invalid credentials');
    }
  } catch (error) {
    console.log(error);
  }
});

// get all urerd api || get  singel user
app.get('/genderedUsers', async (req, res) => {
  const client = new MongoClient(uri);
  const gender = req.query.gender;
  console.log(gender);
  try {
    await client.connect();
    const database = client.db('tinder');
    const users = database.collection('users');
    const query = { gender_identity: { $eq: gender } };
    const foundUsers = await users.find(query).toArray();
    res.send(foundUsers);
  } finally {
    await client.close();
  }
});

//updating user document
app.put('/user', async (req, res) => {
  const client = new MongoClient(uri);
  const formData = await req.body.formData;
  console.log(formData);

  try {
    await client.connect();
    const database = client.db('tinder');
    const users = database.collection('users');

    const quary = { user_id: formData.user_id };
    const updateDocument = {
      $set: {
        first_name: formData.first_name,
        dob_day: formData.dob_day,
        dob_month: formData.dob_month,
        dob_year: formData.dob_year,
        show_gender: formData.show_gender,
        gender_identity: formData.gender_identity,
        gender_interest: formData.gender_interest,
        url: formData.url,
        about: formData.about,
        matches: formData.matches,
      },
    };
    const insertedUser = await users.updateOne(quary, updateDocument);
    res.status(200).json(insertedUser);
  } catch (error) {
    console.log(error);
  }
});

//dashboard
app.get('/user', async (req, res) => {
  const client = new MongoClient(uri);
  const userId = req.query.UserId;

  try {
    await client.connect();
    const database = client.db('tinder');
    const users = database.collection('users');
    const quary = { user_id: userId };
    const user = await users.findOne(quary);
    const { hashed_password, ...otherData } = user;
    res.status(200).send(otherData);
  } catch (error) {
    await client.close();
    console.log(error);
  }
});

//add match
app.put('/addmatch', async (req, res) => {
  const client = new MongoClient(uri);
  const { UserId, matchedUserId } = req.body;
  try {
    await client.connect();
    const database = client.db('tinder');
    const users = database.collection('users');
    const quary = { user_id: UserId };
    const updateDocument = {
      $push: { matches: { user_id: matchedUserId } },
    };
    const user = await users.updateOne(quary, updateDocument);
    res.send(user);
  } catch (error) {
    await client.close();
    console.log(error);
  }
});

// get matched users
app.get('/users', async (req, res) => {
  const client = new MongoClient(uri);
  const userIds = await JSON.parse(req.query.userIds);

  try {
    await client.connect();
    const database = client.db('tinder');
    const users = database.collection('users');

    const pipeLine = [{ $match: { user_id: { $in: userIds } } }];
    const foundUsers = await users.aggregate(pipeLine).toArray();
    console.log(foundUsers, 'users');
    res.send(foundUsers);
    await client.close();
  } catch (error) {
    console.log(error);
    await client.close();
  }
});
// messages
app.get('/messages', async (req, res) => {
  const client = new MongoClient(uri);
  const { userId, correspondingUserId } = req.query;
  console.log(userId, correspondingUserId);
  try {
    await client.connect();
    const database = client.db('tinder');
    const messages = database.collection('messages');
    const quary = {
      to_user_id: correspondingUserId,
      from_user_id: userId,
    };
    const foundMessages = await messages.find(quary).toArray();
    console.log(foundMessages, 'users message');
    res.send(foundMessages);
  } catch (error) {
    console.log(error);
  }
});
// message post
app.get('/message', async (req, res) => {
  const client = new MongoClient(uri);
  const message = req.body.message;
  try {
    await client.connect();
    const database = client.db('tinder');
    const messages = database.collection('messages');
    const insertedMessage = await messages.insertOne(message);
    res.send(insertedMessage);
  } catch (error) {
    console.log(error);
  }
});
app.listen(PORT, () => console.log(`server running on port  ${PORT} now`));
