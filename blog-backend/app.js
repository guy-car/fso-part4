const express = require('express')
const mongoose = require('mongoose')
const config = require('./utils/config')
const blogsRouter = require('./controllers/blogs')

const app = express()

app.use(express.json())

const mongoUrl = config.MONGODB_URI

mongoose.connect(mongoUrl)
.then(() => console.log('Connected to MongoDB'))
.catch((error) => console.log('Error connecting to MongoDB', error.message))


app.use('/api/blogs', blogsRouter)

module.exports = app