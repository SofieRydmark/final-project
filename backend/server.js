import express from 'express'
import cors from 'cors'
import mongoose from 'mongoose'
import bcrypt from 'bcrypt'
import getEndpoints from 'express-list-endpoints'
import themeData from './data/themes.json'
import decorationsData from './data/decorations.json'
import drinksData from './data/drinks.json'
import activitiesData from './data/activities.json'
import foodData from './data/food.json'

const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost/final-project'
mongoose.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true })
mongoose.Promise = Promise

const crypto = require('crypto')

// ************ SCHEMAS & MODELS *************** //
const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    minlength: 8,
    required: true,
  },
  accessToken: {
    type: String,
    default: () => crypto.randomBytes(128).toString('hex'),
  },
})

const ThemeSchema = new mongoose.Schema({
  name: String,
  image: String,
  type: Array,
})

const DecorationSchema = new mongoose.Schema({
  name: String,
  image: String,
  type: Array,
  belongs_to_themes: Array,
})

const FoodSchema = new mongoose.Schema({
  name: String,
  image: String,
  type: Array,
  belongs_to_themes: Array,
})

const DrinkSchema = new mongoose.Schema({
  name: String,
  image: String,
  type: Array,
  belongs_to_themes: Array,
})

const ActivitySchema = new mongoose.Schema({
  name: String,
  image: String,
  type: Array,
  belongs_to_themes: Array,
})

const ProjectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    minlength: 5,
    maxlength: 30,
    trim: true, // remove unnecessary white spaces
  },
  userProject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  due_date: {
    type: String,
    default: 'YY-MM-DD',
  },
  createdAt: {
    type: Date,
    default: () => new Date(),
  },
  guestList: {
    type: [GuestSchema],
    guestName: String,
    phone: Number,
    default: null,
  },
  themes: { type: Array, default: null },
  decorations: { type: Array, default: null },
  food: { type: Array, default: null },
  drinks: { type: Array, default: null },
  activities: { type: Array, default: null },
})

const GuestSchema = new mongoose.Schema({
  guestName: {
    type: String,
    trim: true,
  },
  phone: {
    type: Number,
  },
})

const User = mongoose.model('User', UserSchema)
const Theme = mongoose.model('Theme', ThemeSchema)
const Decoration = mongoose.model('Decoration', DecorationSchema)
const Food = mongoose.model('Food', FoodSchema)
const Drink = mongoose.model('Drink', DrinkSchema)
const Activity = mongoose.model('Activity', ActivitySchema)
const Project = mongoose.model('Project', ProjectSchema)
const Guest = mongoose.model('Guest', GuestSchema)

// ************ RESET DB *************** //
if (process.env.RESET_DB) {
  const seedDataBase = async () => {
    await Theme.deleteMany()
    await Decoration.deleteMany()
    await Drink.deleteMany()
    await Activity.deleteMany()
    await Food.deleteMany()

    themeData.forEach((singleTheme) => {
      const newTheme = new Theme(singleTheme)
      newTheme.save()
    })
    decorationsData.forEach((singleDecor) => {
      const newDecoration = new Decoration(singleDecor)
      newDecoration.save()
    })
    drinksData.forEach((singleDrink) => {
      const newDrink = new Drink(singleDrink)
      newDrink.save()
    })
    foodData.forEach((singleFood) => {
      const newFood = new Food(singleFood)
      newFood.save()
    })
    activitiesData.forEach((singleActivity) => {
      const newActivity = new Activity(singleActivity)
      newActivity.save()
    })
  }
  seedDataBase()
}

// ************ PORT *************** //
const port = process.env.PORT || 8080
const app = express()

// ************ MIDDLEWARES *************** //
app.use(cors())
app.use(express.json())

// ************ USER AUTHENTICATION *************** //
const authenticateUser = async (req, res, next) => {
  const accessToken = req.header('Authorization')

  try {
    const user = await User.findOne({ accessToken })
    if (user) {
      next() // when user is confirmed call the next function after authentication
    } else {
      res.status(401).json({ response: 'Please log in', success: false })
    }
  } catch (error) {
    res.status(500).json({ response: error, success: false })
  }
}

// ************ ENDPOINTS *************** //
app.use((req, res, next) => {
  if (mongoose.connection.readyState === 1) {
    next()
  } else {
    res.status(503).json({
      status_code: 503,
      error: 'Server unavailable',
    })
  }
})

app.get('/', (req, res) => {
  res.send(getEndpoints(app))
})

// ************ SIGN IN/SIGN UP/UPDATE USER ENDPOINTS *************** //

app.post('/signUp', async (req, res) => {
  const { email, password } = req.body
  try {
    const salt = bcrypt.genSaltSync()
    if (password.length < 8) {
      res.status(400).json({
        response: 'Password must be minimum 8 characters',
        success: false,
      })
    } else {
      const newUser = await new User({
        email: email.toLowerCase(),
        password: bcrypt.hashSync(password, salt),
      }).save()
      res.status(201).json({
        response: {
          email: newUser.email,
          accessToken: newUser.accessToken,
          userId: newUser._id,
        },
        success: true,
      })
    }
  } catch (error) {
    const userExists = await User.findOne({ email })
    if (email === '') {
      res.status(400).json({
        response: 'Please enter an email',
        error: error,
        success: false,
      })
    } else if (userExists) {
      res.status(400).json({
        response: 'User already exists',
        success: false,
      })
    } else if (error.code === 11000 && error.keyPattern.email) {
      res.status(400).json({
        response: 'User already exists',
        error: error,
        success: false,
      })
    } else {
      res.status(400).json({
        response: error,
        success: false,
      })
    }
  }
})

app.post('/signIn', async (req, res) => {
  const { email, password } = req.body
  try {
    const user = await User.findOne({ email })
    if (user && bcrypt.compareSync(password, user.password)) {
      res.status(201).json({
        success: true,
        response: {
          userId: user._id,
          email: user.email,
          accessToken: user.accessToken,
        },
      })
    } else {
      res.status(400).json({
        success: false,
        response: 'Credentials did not match',
      })
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      response: 'oops something went wrong',
      error: error,
    })
  }
})

app.delete('/:userId/admin/delete', authenticateUser, async (req, res) => {
  const { userId } = req.params
  try {
    const user = await User.findOneAndDelete({ userId })
    if (user) {
      res.status(200).json({
        success: true,
        response: 'Account removed :(',
      })
    } else {
      res.status(400).json({
        success: false,
        response: 'User not found',
      })
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      response: error,
    })
  }
})

app.patch('/:userId/admin/change', authenticateUser, async (req, res) => {
  const { userId } = req.params
  const { password } = req.body
  const salt = bcrypt.genSaltSync()
  try {
    const user = await User.findOne({ userId })
    if (user) {
      const newPassword = bcrypt.hashSync(password, salt)
      const updateUser = await User.findByIdAndUpdate(
        { _id: userId },
        {
          $set: {
            password: newPassword,
          },
        }
      )
      res.status(200).json({
        success: true,
        data: updateUser,
        response: 'Password changed',
      })
    } else {
      res.status(400).json({
        success: false,
        response: 'User not found',
      })
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      response: error,
    })
  }
})

// ************ CATEGORY ENDPOINTS *************** //

/* --------- THEMES GET  ----------- */
app.get('/themes', authenticateUser, async (req, res) => {
  try {
    const themesCollection = await Theme.find()
    res.status(200).json({
      response: themesCollection,
      success: true,
    })
  } catch (error) {
    res.status(400).json({
      response: "Can't find any themes options right now",
      success: false,
    })
  }
})
app.get('/themes/:id', authenticateUser, async (req, res) => {
  try {
    const themeId = await Theme.findById(req.params.id)

    if (themeId) {
      res.status(200).json({
        success: true,
        theme: themeId,
      })
    } else {
      res.status(404).json({
        success: false,
        status_code: 404,
        error: `Id not found, try another`,
      })
    }
  } catch (err) {
    res.status(400).json({
      success: false,
      status_code: 400,
      error: 'Invalid id',
    })
  }
})
app.get('/themes/type/:type', authenticateUser, async (req, res) => {
  try {
    const typeOf = await Theme.find({ type: req.params.type })
    if (!typeOf) {
      res.status(400).json({
        response: 'not found',
        success: false,
      })
    } else {
      res.status(200).json({
        response: typeOf,
        success: true,
      })
    }
  } catch (error) {
    res.status(400).json({
      response: "Can't find any activities options for your type right now",
      success: false,
    })
  }
})

/* --------- DECORATIONS GET ----------- */
app.get('/decorations', authenticateUser, async (req, res) => {
  try {
    const decorationsCollection = await Decoration.find()
    res.status(200).json({
      response: decorationsCollection,
      success: true,
    })
  } catch (error) {
    res.status(400).json({
      response: "Can't find any decorations options right now",
      success: false,
    })
  }
})

app.get('/decorations/type/:type', authenticateUser, async (req, res) => {
  try {
    const typeOf = await Decoration.find({ type: req.params.type })
    if (!typeOf) {
      res.status(400).json({
        response: 'not found',
        success: false,
      })
    } else {
      res.status(200).json({
        response: typeOf,
        success: true,
      })
    }
  } catch (error) {
    res.status(400).json({
      response: "Can't find any decorations options for your type right now",
      success: false,
    })
  }
})
/* --------- DRINKS GET  ----------- */
app.get('/drinks', authenticateUser, async (req, res) => {
  try {
    const drinks = await Drink.find()
    res.status(200).json({
      response: drinks,
      success: true,
    })
  } catch (error) {
    res.status(400).json({
      response: "Can't find any drinks option right now",
      success: false,
    })
  }
})

app.get('/drinks/type/:type', authenticateUser, async (req, res) => {
  try {
    const typeOf = await Drink.find({ type: req.params.type })
    if (!typeOf) {
      res.status(400).json({
        response: 'not found',
        success: false,
      })
    } else {
      res.status(200).json({
        response: typeOf,
        success: true,
      })
    }
  } catch (error) {
    res.status(400).json({
      response: "Can't find any drinks options for your type right now",
      success: false,
    })
  }
})

/* --------- FOOD GET  ----------- */
app.get('/food', authenticateUser, async (req, res) => {
  try {
    const foodCollection = await Food.find()
    res.status(200).json({
      response: foodCollection,
      success: true,
    })
  } catch (error) {
    res.status(400).json({
      response: "Can't find any food options right now",
      success: false,
    })
  }
})

app.get('/food/type/:type', authenticateUser, async (req, res) => {
  try {
    const typeOf = await Food.find({ type: req.params.type })
    if (!typeOf) {
      res.status(400).json({
        response: 'not found',
        success: false,
      })
    } else {
      res.status(200).json({
        response: typeOf,
        success: true,
      })
    }
  } catch (error) {
    res.status(400).json({
      response: "Can't find any food options for your type right now",
      success: false,
    })
  }
})
/* --------- ACTIVITIES GET  ----------- */
app.get('/activities', authenticateUser, async (req, res) => {
  try {
    const activitiesCollection = await Activity.find()
    res.status(200).json({
      response: activitiesCollection,
      success: true,
    })
  } catch (error) {
    res.status(400).json({
      response: "Can't find any activities options right now",
      success: false,
    })
  }
})

app.get('/activities/type/:type', authenticateUser, async (req, res) => {
  try {
    const typeOf = await Activity.find({ type: req.params.type })
    if (!typeOf) {
      res.status(400).json({
        response: 'not found',
        success: false,
      })
    } else {
      res.status(200).json({
        response: typeOf,
        success: true,
      })
    }
  } catch (error) {
    res.status(400).json({
      response: "Can't find any Activity options for your type right now",
      success: false,
    })
  }
})

// ************ PROJECT ENDPOINTS *************** //
/* GET all active projects */ // WORKS PERFECT
app.get('/:userId/project-board/projects', authenticateUser, async (req, res) => {
  const { userId } = req.params
  const allProjects = await Project.find({ userProject: userId })
  try {
    if (allProjects) {
      res.status(200).json({
        response: allProjects,
        success: true,
      })
    } else if (allProjects.length === 0) {
      res.status(200).json({
        response: `Could not find any projects!`,
        success: false,
      })
    }
  } catch (error) {
    res.status(404).json({
      response: `Could not find any projects!`,
      success: false,
    })
  }
})
/* GET singleProject */ //WORKS PERFECT
app.get('/:userId/project-board/projects/:projectId', authenticateUser, async (req, res) => {
  const { userId, projectId } = req.params

  try {
    const singleProject = await Project.find({ projectId, userProject: userId })
    if (singleProject) {
      res.status(200).json({
        response: `Everything is ok`,
        success: true,
        data: singleProject,
      })
    } else {
      res.status(404).json({
        response: `Could not find project`,
        success: false,
      })
    }
  } catch (error) {
    res.status(400).json({
      response: error,
      success: false,
    })
  }
})

/* add project to the board */ //WORKS PERFECT
app.post('/:userId/project-board/projects/addProject', authenticateUser, async (req, res) => {
  const { userId } = req.params
  const { name, due_date } = req.body
  try {
    const newProject = new Project({ name, due_date, userProject: userId })
    await newProject.save()
    res.status(200).json({
      success: true,
      response: newProject,
    })
  } catch (error) {
    res.status(400).json({
      success: false,
      response: `Project failed to add`,
      error: error,
    })
  }
})

app.patch("/:userId/project-board/projects/:projectId", async (req, res) => {
  const { userId, projectId } = req.params
  const { name, due_date } = req.body
  // console.log("name", req.body.guestList)
 try{

  const projectToChange= await Project.findOne({ userId, projectId })
    if (projectToChange){
//       // const guestListupdate = req.body.guestList
//       // const nameUpdate = req.body.name

      const updatedProject = await Project.findByIdAndUpdate({ _id: projectId}, { 
         $set: {name: name, due_date: due_date} })
        res.status(200).json({
        response: "Updated",
        data: updatedProject
      })
      console.log("something", guestList)

    } else {
      res.status(500).json({
        response: "Could not update"
      });
    }
 }catch(error) {
      res.status(401).json({
        response: "Invalid credentials",
        success: false,
        error: error
 })
}
})

/* change name and due date in single project and add guests to guest list */
// app.patch(':userId/project-board/projects/:projectId', authenticateUser, async (req, res) => {
//   const { userId, projectId } = req.params
//   const { name, due_date } = req.body
//   // console.log("name", req.body.guestList)
//  try{
//   const user = await User.find({ userId })
//    const projectToChange = await Project.findOne({ projectId })
//    console.log("projectToChange", projectToChange )
//     if (projectToChange) {
//       // const guestListupdate = req.body.guestList
//       // const nameUpdate = req.body.name
//       const updatedProject = await Project.findByIdAndUpdate(
//         { _id: projectId },
//         {
//           $set: { name: name, due_date: due_date },
//         }
//       )
//       res.status(200).json({
//         response: 'Updated',
//         data: updatedProject,
//       })
//       console.log('something', guestList)
//     } else {
//       res.status(500).json({
//         response: 'Could not update',
//       })
//     }
//   } catch (error) {
//     res.status(401).json({
//       response: 'Invalid credentials',
//       success: false,
//       error: error,
//     })
//   }
// })
// Add new guest to the the guest list on project // WORKS OK
app.post("/:userId/project-board/projects/:projectId/addGuest", authenticateUser, async (req, res) => {
  const { userId, projectId } = req.params
  const { guestList, guestName, phone} = req.body
 try{
  const user = await User.find({ userId })
  const projectToChange= await Project.findOne({ projectId })
    if (projectToChange){

      const addedGuest= await Project.findByIdAndUpdate({ _id: projectId}, { $push:{
        guestList: new Guest({ guestName, phone })},
      })
        res.status(200).json({
        response: "Guest added",
        data: addedGuest
      })
      console.log("something", addedGuest)

    } else {
      res.status(500).json({
        response: "Could not update"
      });
    }
 }catch(error) {
      res.status(401).json({
        response: "Invalid credentials",
        success: false,
        error: error
 })
}
})

/* DELETE the guest from the guest list*/ 

app.delete('/:userId/project-board/projects/:projectId/delete/:guestId', authenticateUser, async (req, res) => {
  const { userId, projectId, guestId } = req.params
  const { guestList, name, guestListName } = req.body

  try {
    const user = await User.find({ userId })
    const guestToDelete = await Guest.findOneAndDelete({ projectId })
    if (user && guestToDelete) {
      res.status(200).json({
        response: `Guest has been deleted`,
        success: true,
      })
    } else {
      res.status(404).json({
        response: `Guest not found`,
        success: false,
      })
    }
  } catch (error) {
    res.status(401).json({
      response: 'Invalid credentials',
      success: false,
    })
  }
}
)


/* DELETE the project from the project board */ //WORKS PERFECT
app.delete(
  '/:userId/project-board/projects/delete/:projectId',
  authenticateUser,
  async (req, res) => {
    const { userId, projectId } = req.params
    try {
      const user = await User.find({ userId })
      const projectToDelete = await Project.findOneAndDelete({ projectId })
      if (user && projectToDelete) {
        res.status(200).json({
          response: `Project has been deleted`,
          success: true,
        })
      } else {
        res.status(404).json({
          response: `Project not found`,
          success: false,
        })
      }
    } catch (error) {
      res.status(401).json({
        response: 'Invalid credentials',
        success: false,
      })
    }
  }
)

// ************ PROJECTBOARD ENDPOINTS *************** //

/* GET user project board */ //WORKS PERFECT
app.get('/:userId/project-board', authenticateUser, async (req, res) => {
  const { userId } = req.params
  try {
    const user = await User.findOne({ userId })
    if (user)
      res.status(200).json({
        response: `Welcome back`,
        success: true,
      })
  } catch (error) {
    res.status(401).json({
      response: 'Invalid credentials',
      success: false,
    })
  }
})

// ************ START SERVER *************** //
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`)
})
