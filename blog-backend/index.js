const app = require('./app')
const config = require('./utils/config')

app.get('/', (request, response) => {
    response.send('<h1>Hello World</h1>')
    console.log('successful GET for 3003')
}
)

app.listen(config.PORT, () => {
  console.log(`Server running on port ${config.PORT}`)
})

