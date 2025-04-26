const blogsRouter = require('express').Router()
const Blog = require('../models/blog')
const middleware = require('../utils/middleware')


blogsRouter.get('/', async (request, response) => {
  const blogs = await Blog
    .find({})
    .populate('user', { username: 1, name: 1 })
  response.json(blogs)
})

blogsRouter.post('/', middleware.userExtractor,async (request, response) => {
  const body = request.body

  const user = request.user

  if (!body.title || !body.url) {
    return response.status(400).end()
  }

  const blog = new Blog({
    title: body.title,
    author: body.author,
    url: body.url,
    likes: body.likes ?? 0,
    user: user._id
  })

  const savedBlog = await blog.save()
  user.blogs = user.blogs.concat(savedBlog._id)
  await user.save()

  response.status(201).json(savedBlog)
})

blogsRouter.put('/:id', middleware.userExtractor, async (request, response) => {
  const body = request.body

  const updatedBlog = await Blog
    .findByIdAndUpdate(
      request.params.id,
      { ...body },
      { new: true })
  response.json(updatedBlog)
})

blogsRouter.delete('/:id', middleware.userExtractor, async (request, response) => {

  const blogToDelete = await Blog.findById(request.params.id)

  if (!blogToDelete) {
    return response.status(404).json({ error: 'blog not found' })
  }

  if (!blogToDelete.user.equals(request.user._id)) {
    return response.status(401).json({ error: 'unauthorized' })
  }

  const result = await Blog.findByIdAndDelete(request.params.id)
  if (result) {
    response.status(204).end()
  } else {
    response.status(404).end()
  }
})

module.exports = blogsRouter
