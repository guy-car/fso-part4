const assert = require('node:assert')
const { test, after, beforeEach, describe } = require('node:test')
const mongoose = require('mongoose')
const supertest = require('supertest')
const app = require('../app')
const helper = require('./test_helper')
const Blog = require('../models/blog')

const api = supertest(app)

describe('When there is initially several blogs saved', () => {
    beforeEach(async () => {
        await Blog.deleteMany({})
        await Blog.insertMany(helper.severalBlogs)
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
                title: "La pittance est un mot amusant",
                author: "Dorian Lenouveau",
                url: "www.ohnon.fr",
                likes: 3,
            }
            await api
                .post('/api/blogs')
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
                title: "Le petit puceau",
                author: "Didier Lapetite",
                url: "www.ehbahoui.fr"
            }
            await api
                .post('/api/blogs')
                .send(newBlog)

            const blogsAtEnd = await helper.blogsInDb()
            const savedBlog = blogsAtEnd.find(blog => blog.title === newBlog.title)

            assert(savedBlog.likes === 0)
        })
        test('backend responds with 400 bad request if url property is missing', async () => {
            const newBlog = {
                title: "La pittance est un mot amusant",
                author: "Dorian Lenouveau",
                likes: 3,
            }
            await api
                .post('/api/blogs')
                .send(newBlog)
                .expect(400)

        })
        test('backend responds with 400 bad request if url property is empty', async () => {
            const newBlog = {
                title: "La pittance est un mot amusant",
                author: "Dorian Lenouveau",
                url: "",
                likes: 3,
            }
            await api
                .post('/api/blogs')
                .send(newBlog)
                .expect(400)

        })
        test('backend responds with 400 bad request if title property is missing', async () => {
            const newBlog = {
                author: "Dorian Lenouveau",
                url: "www.ohnon.fr",
                likes: 3,
            }
            await api
                .post('/api/blogs')
                .send(newBlog)
                .expect(400)
        })
        test('backend responds with 400 bad request if title property is empty', async () => {
            const newBlog = {
                title: "",
                author: "Dorian Lenouveau",
                url: "www.ohnon.fr",
                likes: 3,
            }
            await api
                .post('/api/blogs')
                .send(newBlog)
                .expect(400)
        })
    })
    describe('deleting a blog', () => {
        test.only('succeeds with status code 204 if id is valid', async () => {
            const blogsAtStart = await helper.blogsInDb()
            const blogToDelete = blogsAtStart[0]

            await api
                .delete(`/api/blogs/${blogToDelete.id}`)
                .expect(204)
        })
        test.only('successfully deletes the targeted blog', async () => {
            const blogsAtStart = await helper.blogsInDb()
            const blogToDelete = blogsAtStart[0]

            await api
                .delete(`/api/blogs/${blogToDelete.id}`)

            const blogsAtEnd = await helper.blogsInDb()
            const blogTitles = blogsAtEnd.map(blog => blog.title)
            assert(!blogTitles.includes(blogToDelete.title))

            assert.strictEqual(blogsAtEnd.length, helper.severalBlogs.length - 1)
        })
        test.only('fails with status code 400 if id is incorrect', async () => {
            const blogsAtStart = await helper.blogsInDb()
            const blogToDelete = blogsAtStart[0]

            await api
                .delete('/api/blogs/0555424424242422')
                .expect(400)
        })
    })
})

after(async () => {
    await mongoose.connection.close()
})