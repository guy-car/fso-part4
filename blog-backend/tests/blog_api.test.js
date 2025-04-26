const assert = require('node:assert')
const { test, after, beforeEach, describe } = require('node:test')
const mongoose = require('mongoose')
const supertest = require('supertest')
const app = require('../app')
const helper = require('./test_helper')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const User = require('../models/user')
const Blog = require('../models/blog')

const api = supertest(app)

describe('When there is initially several blogs saved by logged user', () => {
  let token
  beforeEach(async () => {
    await Blog.deleteMany({})
    await User.deleteMany({})

    const passwordHash = await bcrypt.hash('testpassword', 10)
    const user = new User({ username: 'testuser', passwordHash })
    const savedUser = await user.save()

    const userForToken = {
      username: savedUser.username,
      id: savedUser._id,
    }
    token = jwt.sign(userForToken, process.env.SECRET)

    const blogsWithUser = helper.severalBlogs.map(blog => ({
      ...blog,
      user: savedUser._id
    }))

    await Blog.insertMany(blogsWithUser)
  })
  test('creating a new blog fails with status code 401 if token is not provided', async () => {
    const newBlog = {
      title: 'This should not be added',
      author: 'No Token User',
      url: 'www.notoken.com',
      likes: 0,
    }

    await api
      .post('/api/blogs')
      .send(newBlog)
      .expect(401)

    const blogsAtEnd = await helper.blogsInDb()
    assert.strictEqual(blogsAtEnd.length, helper.severalBlogs.length)
  })
  test('blogs are returned as json', async () => {
    await api
      .get('/api/blogs')
      .expect(200)
      .expect('Content-Type', /application\/json/)
  })
  test('the correct amount of blogs is returned', async () => {
    const blogs = await helper.blogsInDb()

    assert.strictEqual(blogs.length, helper.severalBlogs.length)
  })
  test('the unique identifier property of each blog is named id', async () => {
    const blogs = await helper.blogsInDb()
    const idCheck = blogs.every(blog => {
      return blog.id !== undefined && blog._id === undefined
    })
    assert.equal(idCheck, true)

  })

  describe('creating a new blog', () => {
    test('succeeds with valid data', async () => {
      const newBlog = {
        title: 'La pittance est un mot amusant',
        author: 'Dorian Lenouveau',
        url: 'www.ohnon.fr',
        likes: 3,
      }
      await api
        .post('/api/blogs')
        .set('Authorization', `Bearer ${token}`)
        .send(newBlog)
        .expect(201)
        .expect('Content-Type', /application\/json/)

      const blogsAtEnd = await helper.blogsInDb()
      assert.strictEqual(blogsAtEnd.length, helper.severalBlogs.length + 1)

      const savedBlog = blogsAtEnd.find(blog => blog.title === newBlog.title)

      assert(savedBlog.title === newBlog.title)
      assert(savedBlog.author === newBlog.author)
      assert(savedBlog.url === newBlog.url)
      assert(savedBlog.likes === newBlog.likes)
    })
    test('defaults to 0 likes when the likes property is missing', async () => {
      const newBlog = {
        title: 'Le petit puceau',
        author: 'Didier Lapetite',
        url: 'www.ehbahoui.fr'
      }
      await api
        .post('/api/blogs')
        .set('Authorization', `Bearer ${token}`)
        .send(newBlog)

      const blogsAtEnd = await helper.blogsInDb()
      const savedBlog = blogsAtEnd.find(blog => blog.title === newBlog.title)

      assert(savedBlog.likes === 0)
    })
    test('backend responds with 400 bad request if url property is missing', async () => {
      const newBlog = {
        title: 'La pittance est un mot amusant',
        author: 'Dorian Lenouveau',
        likes: 3,
      }
      await api
        .post('/api/blogs')
        .set('Authorization', `Bearer ${token}`)
        .send(newBlog)
        .expect(400)

    })
    test('backend responds with 400 bad request if url property is empty', async () => {
      const newBlog = {
        title: 'La pittance est un mot amusant',
        author: 'Dorian Lenouveau',
        url: '',
        likes: 3,
      }
      await api
        .post('/api/blogs')
        .set('Authorization', `Bearer ${token}`)
        .send(newBlog)
        .expect(400)

    })
    test('backend responds with 400 bad request if title property is missing', async () => {
      const newBlog = {
        author: 'Dorian Lenouveau',
        url: 'www.ohnon.fr',
        likes: 3,
      }
      await api
        .post('/api/blogs')
        .set('Authorization', `Bearer ${token}`)
        .send(newBlog)
        .expect(400)
    })
    test('backend responds with 400 bad request if title property is empty', async () => {
      const newBlog = {
        title: '',
        author: 'Dorian Lenouveau',
        url: 'www.ohnon.fr',
        likes: 3,
      }
      await api
        .post('/api/blogs')
        .set('Authorization', `Bearer ${token}`)
        .send(newBlog)
        .expect(400)
    })
  })
  describe('deleting a blog', () => {
    test('succeeds with status code 204 if id is valid', async () => {
      const blogsAtStart = await helper.blogsInDb()
      const blogToDelete = blogsAtStart[0]

      await api
        .delete(`/api/blogs/${blogToDelete.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(204)
    })
    test('successfully deletes the targeted blog', async () => {
      const blogsAtStart = await helper.blogsInDb()
      const blogToDelete = blogsAtStart[0]

      await api
        .delete(`/api/blogs/${blogToDelete.id}`)
        .set('Authorization', `Bearer ${token}`)

      const blogsAtEnd = await helper.blogsInDb()
      const blogTitles = blogsAtEnd.map(blog => blog.title)
      assert(!blogTitles.includes(blogToDelete.title))

      assert.strictEqual(blogsAtEnd.length, helper.severalBlogs.length - 1)
    })
    test('fails with status code 400 if id is incorrect', async () => {
      const blogsAtStart = await helper.blogsInDb()
      // eslint-disable-next-line no-unused-vars
      const blogToDelete = blogsAtStart[0]

      await api
        .delete('/api/blogs/0555424424242422')
        .set('Authorization', `Bearer ${token}`)
        .expect(400)
    })
  })
  describe('updating a blog', () => {
    test('successfully updates the number of likes', async () => {
      const blogsAtStart = await helper.blogsInDb()
      const blogToUpdate = blogsAtStart[0]
      const updatedBlog = { ...blogToUpdate, likes: 199 }

      await api
        .put(`/api/blogs/${blogToUpdate.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send(updatedBlog)
        .expect(200)

      const blogsAtEnd = await helper.blogsInDb()
      const updatedBlogInDb = blogsAtEnd.find(blog => blog.id === blogToUpdate.id)
      assert(updatedBlogInDb.likes === 199)
    })
  })
})
describe('when there is initially one user in db', () => {
  beforeEach(async () => {
    await User.deleteMany({})

    const passwordHash = await bcrypt.hash('sekret', 10)
    const user = new User({ username: 'root', passwordHash })

    await user.save()
  })

  test('creation succeeds with a fresh username', async () => {
    const usersAtStart = await helper.usersInDb()

    const newUser = {
      username: 'mluukkai',
      name: 'Matti Luukkainen',
      password: 'salainen',
    }

    await api
      .post('/api/users')
      .send(newUser)
      .expect(201)
      .expect('Content-Type', /application\/json/)

    const usersAtEnd = await helper.usersInDb()
    assert.strictEqual(usersAtEnd.length, usersAtStart.length + 1)

    const usernames = usersAtEnd.map(u => u.username)
    assert(usernames.includes(newUser.username))
  })
  test('creation fails with proper statuscode and message if username already taken', async () => {
    const usersAtStart = await helper.usersInDb()

    const newUser = {
      username: 'root',
      name: 'Superuser',
      password: 'salainen',
    }

    const result = await api
      .post('/api/users')
      .send(newUser)
      .expect(400)
      .expect('Content-Type', /application\/json/)

    const usersAtEnd = await helper.usersInDb()
    assert(result.body.error.includes('expected `username` to be unique'))

    assert.strictEqual(usersAtEnd.length, usersAtStart.length)
  })
  test('creation fails with proper statuscode and message if username is less than 3 characters long', async () => {
    await helper.usersInDb()

    const newUser = {
      username: 'ro',
      name: 'Superuser',
      password: 'salainen',
    }

    const result = await api
      .post('/api/users')
      .send(newUser)
      .expect(400)
      .expect('Content-Type', /application\/json/)

    assert(result.body.error.includes('username must be at least 3 characters long'))

  })
  test('creation fails with proper statuscode and message if password is less than 3 characters long', async () => {
    await helper.usersInDb()

    const newUser = {
      username: 'root',
      name: 'Superuser',
      password: 'sa',
    }

    const result = await api
      .post('/api/users')
      .send(newUser)
      .expect(400)
      .expect('Content-Type', /application\/json/)

    assert(result.body.error.includes('password must be at least 3 characters long'))

  })
  test('creation fails with proper statuscode and message if password is missing', async () => {
    await helper.usersInDb()

    const newUser = {
      username: 'root',
      name: 'Superuser',
    }

    const result = await api
      .post('/api/users')
      .send(newUser)
      .expect(400)
      .expect('Content-Type', /application\/json/)

    assert(result.body.error.includes('password and username are required'))

  })
  test('creation fails with proper statuscode and message if username is missing', async () => {
    await helper.usersInDb()

    const newUser = {
      name: 'Superuser',
      password: 'sa',
    }

    const result = await api
      .post('/api/users')
      .send(newUser)
      .expect(400)
      .expect('Content-Type', /application\/json/)

    assert(result.body.error.includes('password and username are required'))

  })
})
after(async () => {
  await mongoose.connection.close()
})

