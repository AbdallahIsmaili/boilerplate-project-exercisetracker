const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config();
let mongoose = require('mongoose');
const bodyParser = require('body-parser');


mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

const Schema = mongoose.Schema;

const userSchema = new Schema({
  username: { type: String, required: true }
});

const User = mongoose.model('User', userSchema);


const exerciseSchema = new Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', 
    required: true
  },
  username: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  duration: {
    type: Number,
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  }
});

const Exercise = mongoose.model('Exercise', exerciseSchema);




app.post('/api/users', async (req, res) => {
  const { username } = req.body;

  if (!username) {
    return res.status(400).json({ error: "Username is required" });
  }

  try {
    const user = new User({ username });
    const savedUser = await user.save();

    res.status(201).json({
      username: savedUser.username,
      _id: savedUser._id
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save user" });
  }
});


app.get("/api/users", async (req, res) => {

  try {
    
    const usersList = await User.find();

    res.status(201).json(usersList);

  } catch (error) {
    console.error(err);
    res.status(500).json({ error: "Failed to save user" });
  }

})


// 7. You can POST to /api/users/:_id/exercises with form data description, duration, and optionally date. If no date is supplied, the current date will be used.
//8. The response returned from POST /api/users/:_id/exercises will be the user object with the exercise fields added.


app.post("/api/users/:_id/exercises", async (req, res) => {
  const userId = req.params._id;
  const { description, duration, date } = req.body;

  if (!description || !duration) {
    return res.status(400).json({ error: "Description and duration are required" });
  }

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const exercise = new Exercise({
      userId: user._id,
      username: user.username,
      description,
      duration: parseInt(duration),
      date: date ? new Date(date) : Date.now()
    });

    const savedExercise = await exercise.save();

    res.status(201).json({
      _id: savedExercise.userId,
      username: savedExercise.username,
      date: savedExercise.date.toDateString(), 
      duration: savedExercise.duration,
      description: savedExercise.description
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to save exercise" });
  }
});


// app.get("/api/users/:_id/logs", async (req, res) => {

//   const userId = req.params._id;

//   try {
    
//      const user = await User.findById(userId);
//     if (!user) return res.status(404).json({ error: "User not found" });

//     const exercises = await Exercise.find({ userId }).select("-_id -userId");

//     res.status(200).json({
//       _id: user._id,
//       username: user.username,
//       count: exercises.length,
//       log: exercises.map(ex => ({
//         description: ex.description,
//         duration: ex.duration,
//         date: ex.date.toDateString()
//       }))
//     });

//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ error: "Failed to save exercise" });
//   }

// })


app.get("/api/users/:_id/logs", async (req, res) => {
  const userId = req.params._id;
  const { from, to, limit } = req.query;

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    let dateFilter = {};
    if (from) dateFilter.$gte = new Date(from);
    if (to) dateFilter.$lte = new Date(to);

    const filter = { userId };
    if (from || to) filter.date = dateFilter;

    const exercises = await Exercise.find(filter)
      .select("-_id -userId -username")
      .limit(limit ? parseInt(limit) : 0); 

    res.status(200).json({
      _id: user._id,
      username: user.username,
      ...(from && { from: new Date(from).toDateString() }),
      ...(to && { to: new Date(to).toDateString() }),
      count: exercises.length,
      log: exercises.map(ex => ({
        description: ex.description,
        duration: ex.duration,
        date: ex.date.toDateString()
      }))
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch logs" });
  }
});



const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
